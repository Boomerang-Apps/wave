// ═══════════════════════════════════════════════════════════════════════════════
// PER-AGENT RATE LIMITER (GAP-004)
// ═══════════════════════════════════════════════════════════════════════════════
// Enforces rate limits on a per-agent basis to prevent runaway workloads
// Based on: https://www.truefoundry.com/blog/llm-cost-tracking-solution
//
// GAP-016: Configurable rate limits via environment variables and config file
// Environment variables: AGENT_RATE_LIMIT_{AGENT_TYPE}_{LIMIT_NAME}
// Config file: .claude/rate-limits-config.json
// ═══════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { createLogger } from './logger.js';

const logger = createLogger({ prefix: '[RateLimiter]' });

/**
 * Default rate limits per agent type
 */
const DEFAULT_AGENT_LIMITS = {
  'fe-dev': {
    requests_per_minute: 30,
    tokens_per_minute: 50000,
    max_tokens_per_request: 8000,
    budget_usd: 0.50
  },
  'be-dev': {
    requests_per_minute: 30,
    tokens_per_minute: 50000,
    max_tokens_per_request: 8000,
    budget_usd: 0.50
  },
  'qa': {
    requests_per_minute: 20,
    tokens_per_minute: 30000,
    max_tokens_per_request: 4000,
    budget_usd: 0.25
  },
  'dev-fix': {
    requests_per_minute: 40,
    tokens_per_minute: 60000,
    max_tokens_per_request: 10000,
    budget_usd: 0.75
  },
  'code-review': {
    requests_per_minute: 15,
    tokens_per_minute: 40000,
    max_tokens_per_request: 8000,
    budget_usd: 0.30
  },
  'pm': {
    requests_per_minute: 10,
    tokens_per_minute: 20000,
    max_tokens_per_request: 4000,
    budget_usd: 0.15
  },
  'default': {
    requests_per_minute: 20,
    tokens_per_minute: 40000,
    max_tokens_per_request: 8000,
    budget_usd: 0.50
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GAP-016: Environment Variable Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse an integer from environment variable with fallback
 * @param {string} envKey - Environment variable name
 * @param {number} defaultValue - Default value if not set or invalid
 * @returns {number}
 */
function parseEnvInt(envKey, defaultValue) {
  const value = process.env[envKey];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse a float from environment variable with fallback
 * @param {string} envKey - Environment variable name
 * @param {number} defaultValue - Default value if not set or invalid
 * @returns {number}
 */
function parseEnvFloat(envKey, defaultValue) {
  const value = process.env[envKey];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get limits for an agent type with environment variable overrides
 * @param {string} agentType - Agent type (e.g., 'fe-dev', 'be-dev')
 * @param {Object} defaults - Default limits for this agent type
 * @returns {Object} Limits with env overrides applied
 */
function getEnvOverrides(agentType, defaults) {
  // Convert agent type to uppercase for env var (fe-dev -> FE_DEV)
  const envPrefix = `AGENT_RATE_LIMIT_${agentType.toUpperCase().replace(/-/g, '_')}`;

  return {
    requests_per_minute: parseEnvInt(`${envPrefix}_REQUESTS_PER_MINUTE`, defaults.requests_per_minute),
    tokens_per_minute: parseEnvInt(`${envPrefix}_TOKENS_PER_MINUTE`, defaults.tokens_per_minute),
    max_tokens_per_request: parseEnvInt(`${envPrefix}_MAX_TOKENS_PER_REQUEST`, defaults.max_tokens_per_request),
    budget_usd: parseEnvFloat(`${envPrefix}_BUDGET_USD`, defaults.budget_usd)
  };
}

/**
 * Load limits from config file
 * @param {string} projectPath - Project path
 * @returns {Object|null} Config file contents or null
 */
function loadConfigFile(projectPath) {
  if (!projectPath) return null;

  const configPath = path.join(projectPath, '.claude', 'rate-limits-config.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    // Ignore config file errors, use defaults
  }
  return null;
}

/**
 * Per-Agent Rate Limiter
 * Tracks and enforces rate limits using a sliding window approach
 *
 * GAP-016: Supports configurable limits via:
 * 1. Constructor options (highest priority)
 * 2. Environment variables (AGENT_RATE_LIMIT_{AGENT_TYPE}_{LIMIT_NAME})
 * 3. Config file (.claude/rate-limits-config.json)
 * 4. Default values (lowest priority)
 */
class AgentRateLimiter {
  constructor(options = {}) {
    this.windowSize = options.windowSize || 60000; // 1 minute default
    this.agentWindows = new Map(); // agent -> { requests: [], tokens: [] }
    this.projectPath = options.projectPath;
    this.persistFile = options.projectPath
      ? path.join(options.projectPath, '.claude', 'rate-limits.json')
      : null;

    // GAP-016: Load config file first
    this.configFileLimits = loadConfigFile(options.projectPath);

    // Build limits with priority: options.limits > env vars > config file > defaults
    this.limits = this._buildLimits(options.limits);

    // Load persisted state if available
    this.loadState();
  }

  /**
   * GAP-016: Build limits with proper priority
   * @private
   */
  _buildLimits(overrides = {}) {
    const result = {};

    for (const agentType of Object.keys(DEFAULT_AGENT_LIMITS)) {
      // Start with defaults
      let limits = { ...DEFAULT_AGENT_LIMITS[agentType] };

      // Apply config file overrides
      if (this.configFileLimits && this.configFileLimits[agentType]) {
        limits = { ...limits, ...this.configFileLimits[agentType] };
      }

      // Apply environment variable overrides
      limits = getEnvOverrides(agentType, limits);

      // Apply constructor overrides (highest priority)
      if (overrides[agentType]) {
        limits = { ...limits, ...overrides[agentType] };
      }

      result[agentType] = limits;
    }

    return result;
  }

  /**
   * Set project path dynamically
   */
  setProjectPath(projectPath) {
    this.projectPath = projectPath;
    this.persistFile = path.join(projectPath, '.claude', 'rate-limits.json');
    this.loadState();
  }

  /**
   * Load persisted state from file
   */
  loadState() {
    if (!this.persistFile) return;

    try {
      if (fs.existsSync(this.persistFile)) {
        const data = JSON.parse(fs.readFileSync(this.persistFile, 'utf8'));
        // Convert arrays back to Map
        if (data.agentWindows) {
          this.agentWindows = new Map(Object.entries(data.agentWindows));
        }
        if (data.limits) {
          this.limits = { ...DEFAULT_AGENT_LIMITS, ...data.limits };
        }
      }
    } catch (err) {
      logger.warn('Failed to load state:', err.message);
    }
  }

  /**
   * Save state to file
   */
  saveState() {
    if (!this.persistFile) return;

    try {
      const dir = path.dirname(this.persistFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        agentWindows: Object.fromEntries(this.agentWindows),
        limits: this.limits,
        savedAt: new Date().toISOString()
      };

      fs.writeFileSync(this.persistFile, JSON.stringify(data, null, 2));
    } catch (err) {
      logger.warn('Failed to save state:', err.message);
    }
  }

  /**
   * Get or initialize agent window
   */
  getAgentWindow(agentId) {
    if (!this.agentWindows.has(agentId)) {
      this.agentWindows.set(agentId, {
        requests: [],
        tokens: []
      });
    }
    return this.agentWindows.get(agentId);
  }

  /**
   * Clean old entries from sliding window
   */
  cleanWindow(window, now) {
    const cutoff = now - this.windowSize;
    window.requests = window.requests.filter(ts => ts > cutoff);
    window.tokens = window.tokens.filter(entry => entry.ts > cutoff);
  }

  /**
   * Get limits for an agent type
   */
  getLimits(agentId) {
    // Extract agent type from ID (e.g., "fe-dev-1" -> "fe-dev")
    const agentType = agentId.replace(/-\d+$/, '');
    return this.limits[agentType] || this.limits.default;
  }

  /**
   * Check if a request would exceed rate limits
   * @param {string} agentId - Agent identifier
   * @param {number} estimatedTokens - Estimated tokens for this request
   * @returns {Object} { allowed: boolean, reason?: string, retryAfter?: number }
   */
  checkLimit(agentId, estimatedTokens = 0) {
    const now = Date.now();
    const window = this.getAgentWindow(agentId);
    const limits = this.getLimits(agentId);

    // Clean old entries
    this.cleanWindow(window, now);

    // Check request rate
    if (window.requests.length >= limits.requests_per_minute) {
      const oldestRequest = Math.min(...window.requests);
      const retryAfter = Math.ceil((oldestRequest + this.windowSize - now) / 1000);
      return {
        allowed: false,
        reason: 'request_rate_exceeded',
        message: `Request rate limit exceeded (${limits.requests_per_minute}/min). Retry in ${retryAfter}s.`,
        retryAfter,
        current: window.requests.length,
        limit: limits.requests_per_minute
      };
    }

    // Check per-request token limit
    if (estimatedTokens > limits.max_tokens_per_request) {
      return {
        allowed: false,
        reason: 'tokens_per_request_exceeded',
        message: `Request exceeds max tokens (${estimatedTokens} > ${limits.max_tokens_per_request})`,
        current: estimatedTokens,
        limit: limits.max_tokens_per_request
      };
    }

    // Check token rate
    const tokensInWindow = window.tokens.reduce((sum, entry) => sum + entry.tokens, 0);
    if (tokensInWindow + estimatedTokens > limits.tokens_per_minute) {
      const oldestToken = window.tokens.length > 0 ? Math.min(...window.tokens.map(e => e.ts)) : now;
      const retryAfter = Math.ceil((oldestToken + this.windowSize - now) / 1000);
      return {
        allowed: false,
        reason: 'token_rate_exceeded',
        message: `Token rate limit exceeded (${tokensInWindow + estimatedTokens} > ${limits.tokens_per_minute}/min). Retry in ${retryAfter}s.`,
        retryAfter,
        current: tokensInWindow,
        limit: limits.tokens_per_minute
      };
    }

    return {
      allowed: true,
      remaining: {
        requests: limits.requests_per_minute - window.requests.length - 1,
        tokens: limits.tokens_per_minute - tokensInWindow - estimatedTokens
      }
    };
  }

  /**
   * Record a request (call after successful request)
   * @param {string} agentId - Agent identifier
   * @param {number} tokensUsed - Actual tokens used
   */
  recordRequest(agentId, tokensUsed = 0) {
    const now = Date.now();
    const window = this.getAgentWindow(agentId);

    // Clean old entries
    this.cleanWindow(window, now);

    // Record request
    window.requests.push(now);

    // Record tokens
    if (tokensUsed > 0) {
      window.tokens.push({ ts: now, tokens: tokensUsed });
    }

    // Persist state
    this.saveState();

    return {
      recorded: true,
      requests: window.requests.length,
      tokens: window.tokens.reduce((sum, e) => sum + e.tokens, 0)
    };
  }

  /**
   * Get current usage for an agent
   */
  getUsage(agentId) {
    const now = Date.now();
    const window = this.getAgentWindow(agentId);
    const limits = this.getLimits(agentId);

    // Clean old entries
    this.cleanWindow(window, now);

    const requestCount = window.requests.length;
    const tokenCount = window.tokens.reduce((sum, e) => sum + e.tokens, 0);

    return {
      agentId,
      window_ms: this.windowSize,
      requests: {
        used: requestCount,
        limit: limits.requests_per_minute,
        remaining: limits.requests_per_minute - requestCount,
        percent: (requestCount / limits.requests_per_minute) * 100
      },
      tokens: {
        used: tokenCount,
        limit: limits.tokens_per_minute,
        remaining: limits.tokens_per_minute - tokenCount,
        percent: (tokenCount / limits.tokens_per_minute) * 100
      },
      limits
    };
  }

  /**
   * Get usage for all agents
   */
  getAllUsage() {
    const result = {};
    for (const agentId of this.agentWindows.keys()) {
      result[agentId] = this.getUsage(agentId);
    }
    return result;
  }

  /**
   * Update limits for an agent type
   */
  updateLimits(agentType, newLimits) {
    this.limits[agentType] = {
      ...this.limits[agentType],
      ...newLimits
    };
    this.saveState();
  }

  /**
   * Reset usage for an agent
   */
  resetAgent(agentId) {
    this.agentWindows.delete(agentId);
    this.saveState();
  }

  /**
   * Reset all usage
   */
  resetAll() {
    this.agentWindows.clear();
    this.saveState();
  }

  /**
   * Get rate limit headers for HTTP response
   */
  getHeaders(agentId) {
    const usage = this.getUsage(agentId);
    return {
      'X-RateLimit-Limit': usage.requests.limit,
      'X-RateLimit-Remaining': Math.max(0, usage.requests.remaining),
      'X-RateLimit-Reset': Math.ceil((Date.now() + this.windowSize) / 1000),
      'X-TokenLimit-Limit': usage.tokens.limit,
      'X-TokenLimit-Remaining': Math.max(0, usage.tokens.remaining)
    };
  }
}

// Export
export { AgentRateLimiter, DEFAULT_AGENT_LIMITS };
export default AgentRateLimiter;
