// ═══════════════════════════════════════════════════════════════════════════════
// RETRY MANAGER WITH EXPONENTIAL BACKOFF
// ═══════════════════════════════════════════════════════════════════════════════
// Validated: AWS Builders Library - https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
// Validated: Better Stack Guide - https://betterstack.com/community/guides/monitoring/exponential-backoff/
//
// Key patterns implemented:
// - Exponential backoff with full jitter (AWS recommended)
// - Configurable retry conditions
// - Circuit breaker support (optional)
// - Detailed error tracking for observability
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default configuration based on AWS Builders Library recommendations
 */
const DEFAULT_CONFIG = {
  maxRetries: 5,           // AWS recommended
  baseDelayMs: 1000,       // Better Stack recommended
  maxDelayMs: 30000,       // Better Stack recommended (30 seconds)
  factor: 2,               // Industry standard
  jitter: 'full'           // AWS recommended: 'full', 'equal', or 'none'
};

/**
 * Calculate delay with exponential backoff and jitter
 * VALIDATED: AWS Builders Library "Exponential Backoff And Jitter"
 *
 * Full Jitter Formula: sleep = random_between(0, min(cap, base * 2 ^ attempt))
 * Equal Jitter Formula: sleep = min(cap, base * 2 ^ attempt) / 2 + random_between(0, min(cap, base * 2 ^ attempt) / 2)
 *
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {Object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
function calculateDelay(attempt, config) {
  const { baseDelayMs, maxDelayMs, factor, jitter } = config;

  // Calculate exponential delay
  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(factor, attempt));

  // Apply jitter
  switch (jitter) {
    case 'full':
      // VALIDATED: AWS recommends full jitter for best performance
      // "Full jitter provides lower total completion times"
      return Math.random() * exponentialDelay;

    case 'equal':
      // Equal jitter: half exponential + half random
      return exponentialDelay / 2 + Math.random() * (exponentialDelay / 2);

    case 'none':
    default:
      // No jitter (not recommended but supported)
      return exponentialDelay;
  }
}

/**
 * Retry Manager with Exponential Backoff
 * VALIDATED: AWS Builders Library pattern
 */
export class RetryManager {
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };

    // Optional: circuit breaker state
    this.failures = 0;
    this.circuitOpen = false;
    this.circuitOpenUntil = 0;
    this.circuitThreshold = options.circuitThreshold || 10;
    this.circuitResetMs = options.circuitResetMs || 60000;
  }

  /**
   * Execute an async function with retry logic
   * @param {Function} fn - Async function to execute
   * @param {Object} options - Per-call options
   * @returns {Promise<Object>} Result with metadata
   */
  async execute(fn, options = {}) {
    const config = { ...this.config, ...options };
    const startTime = Date.now();
    let lastError = null;
    let attempts = 0;

    // Check circuit breaker
    if (this.circuitOpen && Date.now() < this.circuitOpenUntil) {
      return {
        success: false,
        error: 'Circuit breaker open',
        circuitOpen: true,
        attempts: 0,
        durationMs: 0
      };
    }

    // Reset circuit if timeout passed
    if (this.circuitOpen && Date.now() >= this.circuitOpenUntil) {
      this.circuitOpen = false;
      this.failures = 0;
    }

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      attempts = attempt + 1;

      try {
        const result = await fn();

        // Success - reset failure counter
        this.failures = 0;

        return {
          success: true,
          result,
          attempts,
          durationMs: Date.now() - startTime
        };
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!this.isRetryable(error, config)) {
          return {
            success: false,
            error: error.message,
            code: error.code,
            attempts,
            durationMs: Date.now() - startTime,
            retryable: false
          };
        }

        // Don't wait after last attempt
        if (attempt < config.maxRetries) {
          const delay = calculateDelay(attempt, config);
          console.log(`[RetryManager] Attempt ${attempt + 1}/${config.maxRetries + 1} failed, retrying in ${Math.round(delay)}ms`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    this.failures++;

    // Open circuit breaker if threshold reached
    if (this.failures >= this.circuitThreshold) {
      this.circuitOpen = true;
      this.circuitOpenUntil = Date.now() + this.circuitResetMs;
      console.warn(`[RetryManager] Circuit breaker opened after ${this.failures} failures`);
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      code: lastError?.code,
      attempts,
      durationMs: Date.now() - startTime,
      exhausted: true
    };
  }

  /**
   * Determine if an error is retryable
   * VALIDATED: Common patterns for Slack API errors
   *
   * @param {Error} error - The error to check
   * @param {Object} config - Configuration with optional shouldRetry function
   * @returns {boolean} Whether to retry
   */
  isRetryable(error, config) {
    // Custom retry logic if provided
    if (config.shouldRetry) {
      return config.shouldRetry(error);
    }

    // Default retryable conditions
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN'
    ];

    // Network errors
    if (retryableCodes.includes(error.code)) {
      return true;
    }

    // HTTP status codes that indicate transient failures
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    if (error.status && retryableStatuses.includes(error.status)) {
      return true;
    }

    // Slack-specific: rate_limited error
    if (error.data?.error === 'rate_limited') {
      return true;
    }

    // Not retryable (permanent failures)
    const permanentErrors = [
      'invalid_auth',
      'account_inactive',
      'token_revoked',
      'channel_not_found',
      'not_in_channel'
    ];

    if (permanentErrors.includes(error.data?.error)) {
      return false;
    }

    // Default: retry unknown errors
    return true;
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current circuit breaker status
   * @returns {Object} Circuit breaker state
   */
  getCircuitStatus() {
    return {
      open: this.circuitOpen,
      failures: this.failures,
      threshold: this.circuitThreshold,
      resetAt: this.circuitOpenUntil > Date.now()
        ? new Date(this.circuitOpenUntil).toISOString()
        : null
    };
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuit() {
    this.circuitOpen = false;
    this.failures = 0;
    this.circuitOpenUntil = 0;
  }
}

/**
 * Convenience function for one-off retries
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @returns {Promise<Object>} Result with metadata
 */
export async function withRetry(fn, options = {}) {
  const manager = new RetryManager(options);
  return manager.execute(fn, options);
}

/**
 * Create a retry-wrapped version of an async function
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Retry options
 * @returns {Function} Wrapped function
 */
export function retryable(fn, options = {}) {
  const manager = new RetryManager(options);
  return async (...args) => {
    const result = await manager.execute(() => fn(...args), options);
    if (result.success) {
      return result.result;
    }
    const error = new Error(result.error);
    error.attempts = result.attempts;
    error.exhausted = result.exhausted;
    throw error;
  };
}

export default RetryManager;
