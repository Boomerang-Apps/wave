/**
 * LLM Client Wrapper - Multi-Model Support
 *
 * Provides unified interface for calling multiple LLM providers:
 * - Claude (Anthropic) - Creative refactoring, code quality
 * - Grok (xAI) - Security analysis, truthful assessment
 * - OpenAI GPT-4 - General code review (fallback)
 *
 * Includes:
 * - Token estimation
 * - Cost tracking
 * - Safety filtering
 * - Response caching
 * - Database API key retrieval (fallback)
 */

import crypto from 'crypto';
import { createLogger } from './logger.js';

const logger = createLogger({ prefix: '[LLMClient]' });

// =============================================================================
// DATABASE API KEY RETRIEVAL
// =============================================================================

// Cache for API keys fetched from database
const apiKeyCache = new Map();
const API_KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch API keys from maf_project_config table
 * Falls back to env vars if database lookup fails
 */
async function getApiKeyFromDatabase(keyName, projectId = null) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  // Check cache first
  const cacheKey = `${keyName}:${projectId || 'global'}`;
  const cached = apiKeyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < API_KEY_CACHE_TTL) {
    return cached.value;
  }

  try {
    // If projectId provided, try to get project-specific config first
    if (projectId) {
      const projectResponse = await fetch(
        `${supabaseUrl}/rest/v1/wave_project_config?project_id=eq.${encodeURIComponent(projectId)}&select=config`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        if (projectData.length > 0 && projectData[0].config && projectData[0].config[keyName]) {
          const value = projectData[0].config[keyName];
          apiKeyCache.set(cacheKey, { value, timestamp: Date.now() });
          return value;
        }
      }
    }

    // Fallback: Try to get global/default config (first config entry)
    const globalResponse = await fetch(
      `${supabaseUrl}/rest/v1/wave_project_config?select=config&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (globalResponse.ok) {
      const globalData = await globalResponse.json();
      if (globalData.length > 0 && globalData[0].config && globalData[0].config[keyName]) {
        const value = globalData[0].config[keyName];
        apiKeyCache.set(cacheKey, { value, timestamp: Date.now() });
        return value;
      }
    }

    return null;
  } catch (error) {
    logger.error(`Failed to fetch API key from database: ${error.message}`);
    return null;
  }
}

/**
 * Get API key with fallback chain: env -> database
 */
async function getApiKey(envVarName, dbKeyName, projectId = null) {
  // First check environment variable
  const envKey = process.env[envVarName];
  if (envKey) {
    return envKey;
  }

  // Fallback to database
  const dbKey = await getApiKeyFromDatabase(dbKeyName, projectId);
  return dbKey;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const LLM_CONFIG = {
  claude: {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  grok: {
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-2-latest',
    maxTokens: 4096,
    costPer1kInput: 0.002,
    costPer1kOutput: 0.010,
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo-preview',
    maxTokens: 4096,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
  }
};

// Simple in-memory cache
const responseCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// =============================================================================
// TOKEN ESTIMATION
// =============================================================================

/**
 * Estimate token count (rough approximation: ~4 chars per token)
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost for a request
 */
export function estimateCost(inputText, provider = 'claude', estimatedOutputTokens = 1000) {
  const config = LLM_CONFIG[provider];
  if (!config) return { error: 'Unknown provider' };

  const inputTokens = estimateTokens(inputText);
  const inputCost = (inputTokens / 1000) * config.costPer1kInput;
  const outputCost = (estimatedOutputTokens / 1000) * config.costPer1kOutput;

  return {
    provider,
    model: config.model,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens,
    estimatedCost: inputCost + outputCost,
    breakdown: {
      inputCost: inputCost.toFixed(4),
      outputCost: outputCost.toFixed(4),
    }
  };
}

// =============================================================================
// SAFETY FILTERING
// =============================================================================

const BLOCKED_PATTERNS = [
  /password\s*[:=]\s*["'][^"']+["']/gi,  // Hardcoded passwords
  /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi, // API keys
  /secret\s*[:=]\s*["'][^"']+["']/gi,     // Secrets
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi, // Private keys
];

/**
 * Sanitize code before sending to LLM
 */
export function sanitizeCodeForLLM(code) {
  let sanitized = code;

  for (const pattern of BLOCKED_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SENSITIVE]');
  }

  return sanitized;
}

/**
 * Check if prompt is safe to send
 */
export function isPromptSafe(prompt) {
  // Check for prompt injection attempts
  const injectionPatterns = [
    /ignore\s+(previous|all)\s+instructions/i,
    /disregard\s+(your|the)\s+rules/i,
    /you\s+are\s+now\s+/i,
    /pretend\s+to\s+be/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(prompt)) {
      return { safe: false, reason: 'Potential prompt injection detected' };
    }
  }

  return { safe: true };
}

// =============================================================================
// CACHING
// =============================================================================

function getCacheKey(provider, prompt) {
  return crypto.createHash('sha256').update(`${provider}:${prompt}`).digest('hex');
}

function getCached(provider, prompt) {
  const key = getCacheKey(provider, prompt);
  const cached = responseCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.response, fromCache: true };
  }

  return null;
}

function setCache(provider, prompt, response) {
  const key = getCacheKey(provider, prompt);
  responseCache.set(key, { response, timestamp: Date.now() });

  // Cleanup old entries
  if (responseCache.size > 50) {
    const now = Date.now();
    for (const [k, v] of responseCache) {
      if (now - v.timestamp > CACHE_TTL) {
        responseCache.delete(k);
      }
    }
  }
}

// =============================================================================
// LLM CALLERS
// =============================================================================

/**
 * Call Claude (Anthropic)
 */
export async function callClaude(prompt, options = {}) {
  // Try env first, then database
  const apiKey = await getApiKey('ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY', options.projectId);
  if (!apiKey) {
    return { error: 'ANTHROPIC_API_KEY not configured (check .env or database)', provider: 'claude' };
  }

  // Check cache
  const cached = getCached('claude', prompt);
  if (cached) return cached;

  // Safety check
  const safetyCheck = isPromptSafe(prompt);
  if (!safetyCheck.safe) {
    return { error: safetyCheck.reason, blocked: true, provider: 'claude' };
  }

  const config = LLM_CONFIG.claude;

  try {
    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model || config.model,
        max_tokens: options.maxTokens || config.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `Claude API error: ${response.status}`, details: error, provider: 'claude' };
    }

    const data = await response.json();
    const result = {
      provider: 'claude',
      model: data.model,
      content: data.content[0]?.text || '',
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
      cost: ((data.usage?.input_tokens || 0) / 1000 * config.costPer1kInput) +
            ((data.usage?.output_tokens || 0) / 1000 * config.costPer1kOutput),
    };

    setCache('claude', prompt, result);
    return result;

  } catch (error) {
    return { error: error.message, provider: 'claude' };
  }
}

/**
 * Call Grok (xAI)
 */
export async function callGrok(prompt, options = {}) {
  // Try env first, then database
  let apiKey = await getApiKey('XAI_API_KEY', 'XAI_API_KEY', options.projectId);
  if (!apiKey) {
    apiKey = await getApiKey('GROK_API_KEY', 'GROK_API_KEY', options.projectId);
  }
  if (!apiKey) {
    return { error: 'XAI_API_KEY not configured (check .env or database)', provider: 'grok' };
  }

  // Check cache
  const cached = getCached('grok', prompt);
  if (cached) return cached;

  // Safety check
  const safetyCheck = isPromptSafe(prompt);
  if (!safetyCheck.safe) {
    return { error: safetyCheck.reason, blocked: true, provider: 'grok' };
  }

  const config = LLM_CONFIG.grok;

  try {
    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || config.model,
        max_tokens: options.maxTokens || config.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `Grok API error: ${response.status}`, details: error, provider: 'grok' };
    }

    const data = await response.json();
    const result = {
      provider: 'grok',
      model: data.model,
      content: data.choices[0]?.message?.content || '',
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
      cost: ((data.usage?.prompt_tokens || 0) / 1000 * config.costPer1kInput) +
            ((data.usage?.completion_tokens || 0) / 1000 * config.costPer1kOutput),
    };

    setCache('grok', prompt, result);
    return result;

  } catch (error) {
    return { error: error.message, provider: 'grok' };
  }
}

/**
 * Call OpenAI GPT-4 (fallback)
 */
export async function callOpenAI(prompt, options = {}) {
  // Try env first, then database
  const apiKey = await getApiKey('OPENAI_API_KEY', 'OPENAI_API_KEY', options.projectId);
  if (!apiKey) {
    return { error: 'OPENAI_API_KEY not configured (check .env or database)', provider: 'openai' };
  }

  // Check cache
  const cached = getCached('openai', prompt);
  if (cached) return cached;

  // Safety check
  const safetyCheck = isPromptSafe(prompt);
  if (!safetyCheck.safe) {
    return { error: safetyCheck.reason, blocked: true, provider: 'openai' };
  }

  const config = LLM_CONFIG.openai;

  try {
    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || config.model,
        max_tokens: options.maxTokens || config.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `OpenAI API error: ${response.status}`, details: error, provider: 'openai' };
    }

    const data = await response.json();
    const result = {
      provider: 'openai',
      model: data.model,
      content: data.choices[0]?.message?.content || '',
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
      cost: ((data.usage?.prompt_tokens || 0) / 1000 * config.costPer1kInput) +
            ((data.usage?.completion_tokens || 0) / 1000 * config.costPer1kOutput),
    };

    setCache('openai', prompt, result);
    return result;

  } catch (error) {
    return { error: error.message, provider: 'openai' };
  }
}

/**
 * Call best available LLM (with fallback chain)
 */
export async function callBestAvailable(prompt, options = {}) {
  // Try Claude first (best for code)
  let result = await callClaude(prompt, options);
  if (!result.error) return result;

  // Fallback to Grok
  result = await callGrok(prompt, options);
  if (!result.error) return result;

  // Final fallback to OpenAI
  return callOpenAI(prompt, options);
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export getApiKey for external use
export { getApiKey };

export default {
  callClaude,
  callGrok,
  callOpenAI,
  callBestAvailable,
  estimateTokens,
  estimateCost,
  sanitizeCodeForLLM,
  isPromptSafe,
  getApiKey,
  LLM_CONFIG,
};
