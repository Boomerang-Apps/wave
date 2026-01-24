/**
 * Rate Limit Configuration (CQ-006)
 *
 * Provides configurable rate limiting with environment variable overrides.
 * Supports different presets for various endpoint types.
 *
 * Sources:
 * - https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
 */

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT CONFIGURATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default rate limit configurations by preset name
 */
const DEFAULTS = {
  // Standard API endpoints
  api: {
    windowMs: 60000,      // 1 minute
    maxRequests: 100      // 100 requests per minute
  },

  // Authentication endpoints (stricter)
  auth: {
    windowMs: 900000,     // 15 minutes
    maxRequests: 5        // 5 attempts per 15 minutes
  },

  // File upload endpoints
  upload: {
    windowMs: 3600000,    // 1 hour
    maxRequests: 50       // 50 uploads per hour
  },

  // Webhook endpoints (more permissive)
  webhook: {
    windowMs: 60000,      // 1 minute
    maxRequests: 500      // 500 requests per minute
  },

  // Heavy operations (strict)
  heavy: {
    windowMs: 60000,      // 1 minute
    maxRequests: 10       // 10 requests per minute
  },

  // Health check endpoints (exempt or very permissive)
  health: {
    windowMs: 1000,       // 1 second
    maxRequests: 100      // Effectively no limit for health checks
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT VARIABLE PARSING
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
 * Parse a boolean from environment variable with fallback
 * @param {string} envKey - Environment variable name
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean}
 */
function parseEnvBool(envKey, defaultValue) {
  const value = process.env[envKey];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get rate limit configuration for a preset
 * Merges defaults with environment variable overrides
 *
 * Environment variables (uppercase preset name):
 * - RATE_LIMIT_{PRESET}_WINDOW_MS: Window duration in milliseconds
 * - RATE_LIMIT_{PRESET}_MAX_REQUESTS: Max requests per window
 * - RATE_LIMIT_{PRESET}_ENABLED: Enable/disable rate limiting for preset
 *
 * @param {string} preset - Preset name (api, auth, upload, webhook, heavy, health)
 * @param {Object} [overrides] - Additional overrides (highest priority)
 * @returns {Object} Rate limit configuration
 *
 * @example
 * // Use auth preset with defaults
 * const authConfig = getRateLimitConfig('auth');
 *
 * @example
 * // Override via environment variables
 * // RATE_LIMIT_AUTH_MAX_REQUESTS=10
 * const authConfig = getRateLimitConfig('auth');
 *
 * @example
 * // Override programmatically
 * const authConfig = getRateLimitConfig('auth', { maxRequests: 3 });
 */
export function getRateLimitConfig(preset, overrides = {}) {
  const defaults = DEFAULTS[preset];

  if (!defaults) {
    throw new Error(`Unknown rate limit preset: ${preset}. Valid presets: ${Object.keys(DEFAULTS).join(', ')}`);
  }

  const envPrefix = `RATE_LIMIT_${preset.toUpperCase()}`;

  // Check if rate limiting is disabled for this preset
  const enabled = parseEnvBool(`${envPrefix}_ENABLED`, true);
  if (!enabled) {
    return { enabled: false };
  }

  // Build configuration with priority: overrides > env vars > defaults
  return {
    enabled: true,
    windowMs: overrides.windowMs ?? parseEnvInt(`${envPrefix}_WINDOW_MS`, defaults.windowMs),
    maxRequests: overrides.maxRequests ?? parseEnvInt(`${envPrefix}_MAX_REQUESTS`, defaults.maxRequests),
    message: overrides.message ?? `Too many requests. Please try again later.`,
    keyGenerator: overrides.keyGenerator ?? ((req) => req.ip || req.connection?.remoteAddress || 'unknown'),
    skip: overrides.skip ?? (() => false),
    skipSuccessfulRequests: overrides.skipSuccessfulRequests ?? false
  };
}

/**
 * Get all rate limit configurations
 * @returns {Object} Map of preset name to configuration
 */
export function getAllRateLimitConfigs() {
  const configs = {};
  for (const preset of Object.keys(DEFAULTS)) {
    configs[preset] = getRateLimitConfig(preset);
  }
  return configs;
}

/**
 * Create custom rate limit configuration
 * @param {Object} config - Custom configuration
 * @param {number} config.windowMs - Window duration in milliseconds
 * @param {number} config.maxRequests - Max requests per window
 * @param {string} [config.message] - Error message
 * @param {Function} [config.keyGenerator] - Key generator function
 * @param {Function} [config.skip] - Skip function
 * @param {boolean} [config.skipSuccessfulRequests] - Skip successful requests
 * @returns {Object} Rate limit configuration
 */
export function createRateLimitConfig(config) {
  if (!config.windowMs || typeof config.windowMs !== 'number' || config.windowMs <= 0) {
    throw new Error('windowMs must be a positive number');
  }
  if (!config.maxRequests || typeof config.maxRequests !== 'number' || config.maxRequests <= 0) {
    throw new Error('maxRequests must be a positive number');
  }

  return {
    enabled: true,
    windowMs: config.windowMs,
    maxRequests: config.maxRequests,
    message: config.message ?? 'Too many requests. Please try again later.',
    keyGenerator: config.keyGenerator ?? ((req) => req.ip || 'unknown'),
    skip: config.skip ?? (() => false),
    skipSuccessfulRequests: config.skipSuccessfulRequests ?? false
  };
}

/**
 * Get list of available presets
 * @returns {string[]}
 */
export function getAvailablePresets() {
  return Object.keys(DEFAULTS);
}

/**
 * Get default values for a preset (without env overrides)
 * @param {string} preset - Preset name
 * @returns {Object}
 */
export function getPresetDefaults(preset) {
  const defaults = DEFAULTS[preset];
  if (!defaults) {
    throw new Error(`Unknown rate limit preset: ${preset}`);
  }
  return { ...defaults };
}

export default {
  getRateLimitConfig,
  getAllRateLimitConfigs,
  createRateLimitConfig,
  getAvailablePresets,
  getPresetDefaults
};
