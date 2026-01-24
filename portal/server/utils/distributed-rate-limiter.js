/**
 * Distributed Rate Limiter (SEC-003)
 *
 * Provides a rate limiting abstraction that supports both in-memory
 * and distributed (Redis) backends for horizontal scaling.
 *
 * Sources:
 * - https://redis.io/commands/incr/#pattern-rate-limiter-1
 * - https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
 */

// ─────────────────────────────────────────────────────────────────────────────
// STORE INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base interface for rate limit stores
 * @interface RateLimitStore
 */

/**
 * In-memory rate limit store
 * Suitable for single-instance deployments
 */
export class MemoryStore {
  constructor() {
    this.store = new Map();
    this.cleanupInterval = null;
  }

  /**
   * Increment counter for a key
   * @param {string} key - Rate limit key
   * @param {number} windowMs - Window duration in milliseconds
   * @returns {Promise<{ count: number, resetTime: number }>}
   */
  async increment(key, windowMs) {
    const now = Date.now();
    let record = this.store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    record.count++;
    this.store.set(key, record);

    return {
      count: record.count,
      resetTime: record.resetTime
    };
  }

  /**
   * Get current count for a key
   * @param {string} key - Rate limit key
   * @returns {Promise<{ count: number, resetTime: number } | null>}
   */
  async get(key) {
    const record = this.store.get(key);
    if (!record) return null;

    const now = Date.now();
    if (now > record.resetTime) {
      this.store.delete(key);
      return null;
    }

    return {
      count: record.count,
      resetTime: record.resetTime
    };
  }

  /**
   * Decrement counter for a key
   * @param {string} key - Rate limit key
   * @returns {Promise<void>}
   */
  async decrement(key) {
    const record = this.store.get(key);
    if (record && record.count > 0) {
      record.count--;
      this.store.set(key, record);
    }
  }

  /**
   * Reset counter for a key
   * @param {string} key - Rate limit key
   * @returns {Promise<void>}
   */
  async reset(key) {
    this.store.delete(key);
  }

  /**
   * Start periodic cleanup of expired entries
   * @param {number} intervalMs - Cleanup interval
   */
  startCleanup(intervalMs = 60000) {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store) {
        if (now > record.resetTime) {
          this.store.delete(key);
        }
      }
    }, intervalMs);

    // Don't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all entries
   * @returns {Promise<void>}
   */
  async clear() {
    this.store.clear();
  }

  /**
   * Get store size
   * @returns {number}
   */
  get size() {
    return this.store.size;
  }
}

/**
 * Redis rate limit store
 * Suitable for distributed/multi-instance deployments
 *
 * Note: Requires ioredis client to be passed in
 */
export class RedisStore {
  /**
   * @param {Object} options
   * @param {Object} options.client - Redis client (ioredis)
   * @param {string} [options.prefix='ratelimit:'] - Key prefix
   */
  constructor(options = {}) {
    if (!options.client) {
      throw new Error('Redis client is required');
    }
    this.client = options.client;
    this.prefix = options.prefix || 'ratelimit:';
  }

  /**
   * Generate prefixed key
   * @private
   */
  _key(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Increment counter for a key using Redis INCR with expiry
   * @param {string} key - Rate limit key
   * @param {number} windowMs - Window duration in milliseconds
   * @returns {Promise<{ count: number, resetTime: number }>}
   */
  async increment(key, windowMs) {
    const redisKey = this._key(key);
    const windowSec = Math.ceil(windowMs / 1000);

    // Use MULTI for atomic increment + expire
    const results = await this.client
      .multi()
      .incr(redisKey)
      .pttl(redisKey)
      .exec();

    const count = results[0][1];
    let ttl = results[1][1];

    // Set expiry if this is a new key (ttl = -1 means no expiry)
    if (ttl === -1 || ttl === -2) {
      await this.client.pexpire(redisKey, windowMs);
      ttl = windowMs;
    }

    return {
      count,
      resetTime: Date.now() + ttl
    };
  }

  /**
   * Get current count for a key
   * @param {string} key - Rate limit key
   * @returns {Promise<{ count: number, resetTime: number } | null>}
   */
  async get(key) {
    const redisKey = this._key(key);

    const [count, ttl] = await Promise.all([
      this.client.get(redisKey),
      this.client.pttl(redisKey)
    ]);

    if (count === null || ttl <= 0) {
      return null;
    }

    return {
      count: parseInt(count, 10),
      resetTime: Date.now() + ttl
    };
  }

  /**
   * Decrement counter for a key
   * @param {string} key - Rate limit key
   * @returns {Promise<void>}
   */
  async decrement(key) {
    const redisKey = this._key(key);
    const count = await this.client.get(redisKey);
    if (count && parseInt(count, 10) > 0) {
      await this.client.decr(redisKey);
    }
  }

  /**
   * Reset counter for a key
   * @param {string} key - Rate limit key
   * @returns {Promise<void>}
   */
  async reset(key) {
    await this.client.del(this._key(key));
  }

  /**
   * Clear all rate limit keys
   * Warning: Uses SCAN, may be slow on large datasets
   * @returns {Promise<void>}
   */
  async clear() {
    const pattern = `${this.prefix}*`;
    let cursor = '0';

    do {
      const [newCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;

      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== '0');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DISTRIBUTED RATE LIMITER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Distributed Rate Limiter
 * Uses a pluggable store for rate limit tracking
 */
export class DistributedRateLimiter {
  /**
   * @param {Object} options
   * @param {Object} options.store - Rate limit store (MemoryStore or RedisStore)
   * @param {number} options.windowMs - Window duration in milliseconds
   * @param {number} options.maxRequests - Maximum requests per window
   * @param {Function} [options.keyGenerator] - Function to generate key from request
   * @param {string} [options.message] - Error message
   * @param {Function} [options.skip] - Function to skip rate limiting
   * @param {boolean} [options.skipSuccessfulRequests] - Don't count successful requests
   * @param {Function} [options.onLimit] - Callback when limit exceeded
   */
  constructor(options = {}) {
    if (!options.store) {
      throw new Error('Store is required');
    }
    if (!options.windowMs || options.windowMs <= 0) {
      throw new Error('windowMs must be a positive number');
    }
    if (!options.maxRequests || options.maxRequests <= 0) {
      throw new Error('maxRequests must be a positive number');
    }

    this.store = options.store;
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.keyGenerator = options.keyGenerator || ((req) => req.ip || 'unknown');
    this.message = options.message || 'Too many requests, please try again later';
    this.skip = options.skip || (() => false);
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.onLimit = options.onLimit || null;
  }

  /**
   * Check if request is rate limited
   * @param {string} key - Rate limit key
   * @returns {Promise<{ limited: boolean, count: number, remaining: number, resetTime: number }>}
   */
  async check(key) {
    const result = await this.store.increment(key, this.windowMs);

    return {
      limited: result.count > this.maxRequests,
      count: result.count,
      remaining: Math.max(0, this.maxRequests - result.count),
      resetTime: result.resetTime
    };
  }

  /**
   * Express middleware
   * @returns {Function}
   */
  middleware() {
    return async (req, res, next) => {
      // Check skip condition
      if (this.skip(req)) {
        return next();
      }

      const key = this.keyGenerator(req);

      try {
        const result = await this.check(key);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

        if (result.limited) {
          const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
          res.setHeader('Retry-After', retryAfter);

          // Call onLimit callback
          if (this.onLimit) {
            this.onLimit(req, result);
          }

          return res.status(429).json({
            error: this.message,
            retryAfter
          });
        }

        // Handle skipSuccessfulRequests
        if (this.skipSuccessfulRequests) {
          res.on('finish', async () => {
            if (res.statusCode < 400) {
              await this.store.decrement(key);
            }
          });
        }

        next();
      } catch (error) {
        // On store error, allow request (fail open)
        console.error('[RateLimiter] Store error:', error.message);
        next();
      }
    };
  }

  /**
   * Reset rate limit for a key
   * @param {string} key - Rate limit key
   * @returns {Promise<void>}
   */
  async reset(key) {
    await this.store.reset(key);
  }

  /**
   * Get current status for a key
   * @param {string} key - Rate limit key
   * @returns {Promise<{ count: number, remaining: number, resetTime: number } | null>}
   */
  async getStatus(key) {
    const record = await this.store.get(key);
    if (!record) return null;

    return {
      count: record.count,
      remaining: Math.max(0, this.maxRequests - record.count),
      resetTime: record.resetTime
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a rate limiter with in-memory store
 * @param {Object} options - Rate limiter options (windowMs, maxRequests, etc.)
 * @returns {DistributedRateLimiter}
 */
export function createMemoryRateLimiter(options = {}) {
  const store = new MemoryStore();
  store.startCleanup(options.cleanupInterval || 60000);

  return new DistributedRateLimiter({
    store,
    windowMs: options.windowMs || 60000,
    maxRequests: options.maxRequests || 100,
    ...options
  });
}

/**
 * Create a rate limiter with Redis store
 * @param {Object} options - Rate limiter options
 * @param {Object} options.redisClient - Redis client (ioredis)
 * @param {string} [options.keyPrefix] - Redis key prefix
 * @returns {DistributedRateLimiter}
 */
export function createRedisRateLimiter(options = {}) {
  if (!options.redisClient) {
    throw new Error('Redis client is required');
  }

  const store = new RedisStore({
    client: options.redisClient,
    prefix: options.keyPrefix || 'ratelimit:'
  });

  return new DistributedRateLimiter({
    store,
    windowMs: options.windowMs || 60000,
    maxRequests: options.maxRequests || 100,
    ...options
  });
}

export default {
  MemoryStore,
  RedisStore,
  DistributedRateLimiter,
  createMemoryRateLimiter,
  createRedisRateLimiter
};
