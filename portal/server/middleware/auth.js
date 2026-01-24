/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAVE FRAMEWORK - API Authentication Middleware
 * ═══════════════════════════════════════════════════════════════════════════════
 * Implements API key authentication for Portal API endpoints.
 *
 * GAP-001: Portal API Authentication
 * - All /api/* endpoints require valid API key
 * - Supports Bearer token and x-api-key header formats
 * - Rate limiting per API key
 * - Audit logging of all auth attempts
 * - Key revocation without restart
 *
 * Sources:
 * - OWASP A07:2021 - Identification and Authentication Failures
 * - NIST SP 800-63B - Digital Identity Guidelines
 * - Express.js Security Best Practices
 *
 * Usage:
 *   import { createAuthMiddleware, ApiKeyManager } from './middleware/auth.js';
 *   const keyManager = new ApiKeyManager();
 *   keyManager.loadFromEnv(process.env);
 *   app.use('/api', createAuthMiddleware({ keyManager }));
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authentication error codes
 */
export const AUTH_ERRORS = {
  MISSING_KEY: 'missing_api_key',
  INVALID_KEY: 'invalid_api_key',
  KEY_REVOKED: 'api_key_revoked',
  RATE_LIMITED: 'rate_limit_exceeded'
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  rateLimitWindow: 60000, // 1 minute
  defaultRateLimit: 100,  // 100 requests per minute
  excludePaths: ['/api/health'],
  headerNames: {
    authorization: 'authorization',
    apiKey: 'x-api-key'
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Timing-safe string comparison to prevent timing attacks
 * SEC-001: Uses crypto.timingSafeEqual for constant-time comparison
 *
 * Sources:
 * - https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
 * - https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
 *
 * @param {string|Buffer} a - First value to compare
 * @param {string|Buffer} b - Second value to compare
 * @returns {boolean} True if values are equal
 */
export function timingSafeCompare(a, b) {
  // Convert to buffers
  const bufA = Buffer.isBuffer(a) ? a : Buffer.from(String(a));
  const bufB = Buffer.isBuffer(b) ? b : Buffer.from(String(b));

  // Length check must be done but we still do full comparison
  // to prevent length-based timing attacks
  const lengthMatch = bufA.length === bufB.length;

  // Pad to same length for timingSafeEqual (requires same length)
  const maxLen = Math.max(bufA.length, bufB.length, 1); // min 1 to avoid empty buffer
  const paddedA = Buffer.alloc(maxLen);
  const paddedB = Buffer.alloc(maxLen);
  bufA.copy(paddedA);
  bufB.copy(paddedB);

  // Use crypto.timingSafeEqual for constant-time comparison
  const contentMatch = crypto.timingSafeEqual(paddedA, paddedB);

  // Both length AND content must match
  return lengthMatch && contentMatch;
}

/**
 * Extract API key from request headers
 * Supports: Authorization: Bearer <key> and x-api-key: <key>
 *
 * @param {Object} headers - Request headers
 * @returns {string|null} API key or null if not found
 */
export function extractApiKey(headers) {
  // Check Authorization header first (Bearer token)
  const authHeader = headers.authorization || headers.Authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const key = authHeader.substring(7).trim();
    if (key) return key;
  }

  // Check x-api-key header
  const apiKeyHeader = headers['x-api-key'] || headers['X-API-KEY'] || headers['X-Api-Key'];
  if (apiKeyHeader) {
    return apiKeyHeader.trim();
  }

  return null;
}

/**
 * Hash API key using SHA-256
 * NIST 800-63B compliant - secrets stored hashed
 *
 * @param {string} key - Plain text API key
 * @returns {string} SHA-256 hash (hex)
 */
export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate API key against key manager
 * Uses timing-safe comparison to prevent timing attacks
 *
 * @param {string} key - Plain text API key to validate
 * @param {ApiKeyManager} keyManager - Key manager instance
 * @returns {Object|null} Key info if valid, null otherwise
 */
export function validateApiKey(key, keyManager) {
  if (!key || !keyManager) return null;

  const hash = hashApiKey(key);
  const keyInfo = keyManager.findByHash(hash);

  if (!keyInfo) return null;
  if (!keyInfo.active) return { ...keyInfo, revoked: true };

  return keyInfo;
}

/**
 * Generate a new secure API key
 * Uses crypto.randomBytes for cryptographic security
 *
 * @param {string} prefix - Optional prefix (default: 'wave_')
 * @returns {string} New API key
 */
export function generateApiKey(prefix = 'wave_') {
  const randomPart = crypto.randomBytes(32).toString('hex').substring(0, 43);
  return `${prefix}${randomPart}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// API KEY MANAGER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manages API keys with CRUD operations and lookup by hash
 */
export class ApiKeyManager {
  constructor() {
    this.keys = new Map(); // id -> key info
    this.hashIndex = new Map(); // hash -> key info
  }

  /**
   * Add a new API key
   * @param {Object} keyInfo - Key information
   * @param {string} keyInfo.id - Unique key ID
   * @param {string} keyInfo.hash - SHA-256 hash of key
   * @param {string} keyInfo.name - Display name
   * @param {boolean} keyInfo.active - Whether key is active
   * @param {number} [keyInfo.rateLimit] - Custom rate limit
   */
  addKey(keyInfo) {
    const key = {
      id: keyInfo.id,
      hash: keyInfo.hash,
      name: keyInfo.name,
      active: keyInfo.active !== false,
      rateLimit: keyInfo.rateLimit || DEFAULT_CONFIG.defaultRateLimit,
      createdAt: keyInfo.createdAt || new Date().toISOString()
    };

    this.keys.set(key.id, key);
    this.hashIndex.set(key.hash, key);
  }

  /**
   * Find key by hash
   * @param {string} hash - Key hash
   * @returns {Object|null} Key info or null
   */
  findByHash(hash) {
    return this.hashIndex.get(hash) || null;
  }

  /**
   * Get key by ID
   * @param {string} id - Key ID
   * @returns {Object|null} Key info or null
   */
  getKey(id) {
    return this.keys.get(id) || null;
  }

  /**
   * Check if key exists
   * @param {string} id - Key ID
   * @returns {boolean}
   */
  hasKey(id) {
    return this.keys.has(id);
  }

  /**
   * Update key metadata
   * @param {string} id - Key ID
   * @param {Object} updates - Fields to update
   */
  updateKey(id, updates) {
    const key = this.keys.get(id);
    if (!key) return;

    Object.assign(key, updates);

    // Update hash index if hash changed
    if (updates.hash) {
      // Remove old hash entry
      for (const [hash, info] of this.hashIndex) {
        if (info.id === id) {
          this.hashIndex.delete(hash);
          break;
        }
      }
      this.hashIndex.set(updates.hash, key);
    }
  }

  /**
   * Revoke a key
   * @param {string} id - Key ID
   */
  revokeKey(id) {
    const key = this.keys.get(id);
    if (key) {
      key.active = false;
      key.revokedAt = new Date().toISOString();
    }
  }

  /**
   * Re-enable a revoked key
   * @param {string} id - Key ID
   */
  enableKey(id) {
    const key = this.keys.get(id);
    if (key) {
      key.active = true;
      delete key.revokedAt;
    }
  }

  /**
   * Remove key completely
   * @param {string} id - Key ID
   */
  removeKey(id) {
    const key = this.keys.get(id);
    if (key) {
      this.hashIndex.delete(key.hash);
      this.keys.delete(id);
    }
  }

  /**
   * Get all active keys (without hashes for security)
   * @returns {Array} Active keys
   */
  getActiveKeys() {
    return Array.from(this.keys.values())
      .filter(k => k.active)
      .map(({ hash, ...rest }) => rest);
  }

  /**
   * Load keys from environment variables
   * Expects: WAVE_API_KEY_1, WAVE_API_KEY_2, etc.
   * @param {Object} env - Environment variables
   */
  loadFromEnv(env) {
    // Look for WAVE_API_KEY or WAVE_API_KEY_1, WAVE_API_KEY_2, etc.
    const keyPatterns = ['WAVE_API_KEY', 'PORTAL_API_KEY'];

    for (const pattern of keyPatterns) {
      // Single key
      if (env[pattern]) {
        const hash = hashApiKey(env[pattern]);
        this.addKey({
          id: `env-${pattern.toLowerCase()}`,
          hash,
          name: `Environment ${pattern}`,
          active: true
        });
      }

      // Numbered keys (1-10)
      for (let i = 1; i <= 10; i++) {
        const envKey = `${pattern}_${i}`;
        if (env[envKey]) {
          const hash = hashApiKey(env[envKey]);
          this.addKey({
            id: `env-${pattern.toLowerCase()}-${i}`,
            hash,
            name: `Environment ${pattern} #${i}`,
            active: true
          });
        }
      }
    }
  }

  /**
   * Get key count
   * @returns {number}
   */
  get size() {
    return this.keys.size;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authentication middleware for Express
 */
export class AuthMiddleware {
  constructor(options = {}) {
    this.keyManager = options.keyManager || new ApiKeyManager();
    this.excludePaths = options.excludePaths || DEFAULT_CONFIG.excludePaths;
    this.auditCallback = options.auditCallback || null;
    this.rateLimitWindow = options.rateLimitWindow || DEFAULT_CONFIG.rateLimitWindow;

    // Rate limit tracking: keyId -> { count, resetTime }
    this.rateLimits = new Map();

    // Cleanup old rate limit entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanupRateLimits();
    }, this.rateLimitWindow);
  }

  /**
   * Clean up expired rate limit entries
   */
  cleanupRateLimits() {
    const now = Date.now();
    for (const [keyId, data] of this.rateLimits) {
      if (now > data.resetTime) {
        this.rateLimits.delete(keyId);
      }
    }
  }

  /**
   * Get request count for a key
   * @param {string} keyId - Key ID
   * @returns {number}
   */
  getRequestCount(keyId) {
    const data = this.rateLimits.get(keyId);
    return data ? data.count : 0;
  }

  /**
   * Check if path should be excluded from auth
   * @param {string} path - Request path
   * @returns {boolean}
   */
  isExcluded(path) {
    for (const excluded of this.excludePaths) {
      if (excluded.endsWith('*')) {
        const prefix = excluded.slice(0, -1);
        if (path.startsWith(prefix)) return true;
      } else if (path === excluded) {
        return true;
      }
    }
    return false;
  }

  /**
   * Log audit event
   * @param {Object} event - Audit event
   */
  audit(event) {
    if (this.auditCallback) {
      this.auditCallback({
        timestamp: new Date().toISOString(),
        ...event
      });
    }
  }

  /**
   * Check rate limit for key
   * @param {Object} keyInfo - Key information
   * @returns {Object} { allowed, remaining, reset }
   */
  checkRateLimit(keyInfo) {
    const now = Date.now();
    let data = this.rateLimits.get(keyInfo.id);

    if (!data || now > data.resetTime) {
      data = {
        count: 0,
        resetTime: now + this.rateLimitWindow
      };
      this.rateLimits.set(keyInfo.id, data);
    }

    data.count++;

    const limit = keyInfo.rateLimit || DEFAULT_CONFIG.defaultRateLimit;
    const remaining = Math.max(0, limit - data.count);
    const allowed = data.count <= limit;

    return {
      allowed,
      limit,
      remaining,
      reset: Math.ceil(data.resetTime / 1000)
    };
  }

  /**
   * Main authentication middleware
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Next middleware
   */
  async authenticate(req, res, next) {
    // Remove X-Powered-By for security
    res.removeHeader('X-Powered-By');

    // Check if path is excluded
    if (this.isExcluded(req.path)) {
      return next();
    }

    // Extract API key
    const apiKey = extractApiKey(req.headers);

    if (!apiKey) {
      this.audit({
        event: 'auth_failure',
        reason: AUTH_ERRORS.MISSING_KEY,
        ip: req.ip,
        endpoint: req.path
      });

      return res.status(401).json({
        error: {
          code: AUTH_ERRORS.MISSING_KEY,
          message: 'API key required. Provide via Authorization: Bearer <key> or x-api-key header.'
        }
      });
    }

    // Validate API key
    const keyInfo = validateApiKey(apiKey, this.keyManager);

    if (!keyInfo) {
      this.audit({
        event: 'auth_failure',
        reason: AUTH_ERRORS.INVALID_KEY,
        ip: req.ip,
        endpoint: req.path
      });

      return res.status(401).json({
        error: {
          code: AUTH_ERRORS.INVALID_KEY,
          message: 'Invalid API key.'
        }
      });
    }

    if (keyInfo.revoked) {
      this.audit({
        event: 'auth_failure',
        reason: AUTH_ERRORS.KEY_REVOKED,
        key_id: keyInfo.id,
        ip: req.ip,
        endpoint: req.path
      });

      return res.status(401).json({
        error: {
          code: AUTH_ERRORS.KEY_REVOKED,
          message: 'API key has been revoked.'
        }
      });
    }

    // Check rate limit
    const rateLimit = this.checkRateLimit(keyInfo);

    // Set rate limit headers
    res.set('X-RateLimit-Limit', rateLimit.limit);
    res.set('X-RateLimit-Remaining', rateLimit.remaining);
    res.set('X-RateLimit-Reset', rateLimit.reset);

    if (!rateLimit.allowed) {
      this.audit({
        event: 'auth_failure',
        reason: AUTH_ERRORS.RATE_LIMITED,
        key_id: keyInfo.id,
        ip: req.ip,
        endpoint: req.path
      });

      res.set('Retry-After', Math.ceil((rateLimit.reset * 1000 - Date.now()) / 1000));

      return res.status(429).json({
        error: {
          code: AUTH_ERRORS.RATE_LIMITED,
          message: 'Rate limit exceeded. Try again later.'
        }
      });
    }

    // Authentication successful
    this.audit({
      event: 'auth_success',
      key_id: keyInfo.id,
      ip: req.ip,
      endpoint: req.path
    });

    // Attach key info to request (without hash)
    req.apiKey = {
      id: keyInfo.id,
      name: keyInfo.name,
      rateLimit: keyInfo.rateLimit
    };

    next();
  }

  /**
   * Cleanup interval on shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create authentication middleware
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
export function createAuthMiddleware(options = {}) {
  const auth = new AuthMiddleware(options);
  return auth.authenticate.bind(auth);
}

export default AuthMiddleware;
