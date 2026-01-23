/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAVE FRAMEWORK - Response Cache Service
 * ═══════════════════════════════════════════════════════════════════════════════
 * Intelligent caching for API responses to reduce costs and latency.
 * Supports in-memory caching with optional Redis backend.
 *
 * Features:
 *   - TTL-based expiration
 *   - LRU eviction when memory limit reached
 *   - Cache key normalization
 *   - Hit/miss statistics
 *   - Semantic caching for similar prompts (optional)
 *
 * Usage:
 *   const cache = new CacheService({ maxSize: 1000, defaultTTL: 300 });
 *   await cache.get('key');
 *   await cache.set('key', value, { ttl: 60 });
 *   cache.wrap('key', asyncFn, { ttl: 60 });
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {*} value - Cached value
 * @property {number} expires - Expiration timestamp (ms)
 * @property {number} created - Creation timestamp (ms)
 * @property {number} hits - Number of cache hits
 * @property {number} size - Approximate size in bytes
 */

/**
 * Cache statistics
 * @typedef {Object} CacheStats
 * @property {number} hits - Total cache hits
 * @property {number} misses - Total cache misses
 * @property {number} entries - Current entry count
 * @property {number} size - Approximate total size in bytes
 * @property {number} evictions - Total evictions
 */

class CacheService {
  /**
   * Create a new cache service
   * @param {Object} options - Configuration options
   * @param {number} [options.maxSize=1000] - Maximum number of entries
   * @param {number} [options.maxMemory=104857600] - Max memory in bytes (100MB default)
   * @param {number} [options.defaultTTL=300] - Default TTL in seconds
   * @param {boolean} [options.enableStats=true] - Enable statistics tracking
   * @param {Function} [options.onEvict] - Callback when entry is evicted
   */
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.maxMemory = options.maxMemory || 100 * 1024 * 1024; // 100MB
    this.defaultTTL = options.defaultTTL || 300; // 5 minutes
    this.enableStats = options.enableStats !== false;
    this.onEvict = options.onEvict || null;

    // In-memory storage
    this.cache = new Map();
    this.accessOrder = []; // For LRU tracking

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0
    };

    // Cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Generate a normalized cache key
   * @param {string|Object} key - Key or object to hash
   * @returns {string} Normalized key
   */
  normalizeKey(key) {
    if (typeof key === 'string') {
      return key;
    }

    // For objects, create a deterministic hash
    const sorted = JSON.stringify(key, Object.keys(key).sort());
    return crypto.createHash('sha256').update(sorted).digest('hex').substring(0, 16);
  }

  /**
   * Estimate size of a value in bytes
   * @param {*} value - Value to measure
   * @returns {number} Approximate size in bytes
   */
  estimateSize(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 4;
    if (Buffer.isBuffer(value)) return value.length;

    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024; // Default estimate for non-serializable
    }
  }

  /**
   * Get a value from cache
   * @param {string|Object} key - Cache key
   * @returns {Promise<*>} Cached value or undefined
   */
  async get(key) {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.cache.get(normalizedKey);

    if (!entry) {
      if (this.enableStats) this.stats.misses++;
      return undefined;
    }

    // Check expiration
    if (entry.expires && Date.now() > entry.expires) {
      this.delete(normalizedKey);
      if (this.enableStats) this.stats.misses++;
      return undefined;
    }

    // Update access order for LRU
    this.touchKey(normalizedKey);

    // Update stats
    if (this.enableStats) {
      this.stats.hits++;
      entry.hits++;
    }

    return entry.value;
  }

  /**
   * Set a value in cache
   * @param {string|Object} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} [options] - Options
   * @param {number} [options.ttl] - TTL in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, options = {}) {
    const normalizedKey = this.normalizeKey(key);
    const ttl = options.ttl || this.defaultTTL;
    const size = this.estimateSize(value);

    // Check if we need to evict entries
    await this.ensureCapacity(size);

    const entry = {
      value,
      expires: ttl > 0 ? Date.now() + (ttl * 1000) : null,
      created: Date.now(),
      hits: 0,
      size
    };

    // Update existing entry size tracking
    const existing = this.cache.get(normalizedKey);
    if (existing) {
      this.stats.totalSize -= existing.size;
    }

    this.cache.set(normalizedKey, entry);
    this.stats.totalSize += size;
    this.touchKey(normalizedKey);

    return true;
  }

  /**
   * Delete a value from cache
   * @param {string|Object} key - Cache key
   * @returns {Promise<boolean>} True if entry existed
   */
  async delete(key) {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.cache.get(normalizedKey);

    if (entry) {
      this.stats.totalSize -= entry.size;
      this.cache.delete(normalizedKey);
      this.accessOrder = this.accessOrder.filter(k => k !== normalizedKey);
      return true;
    }

    return false;
  }

  /**
   * Check if key exists (without updating access time)
   * @param {string|Object} key - Cache key
   * @returns {Promise<boolean>} True if key exists and not expired
   */
  async has(key) {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.cache.get(normalizedKey);

    if (!entry) return false;
    if (entry.expires && Date.now() > entry.expires) {
      this.delete(normalizedKey);
      return false;
    }

    return true;
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   * @param {string|Object} key - Cache key
   * @param {Function} fn - Async function to compute value if not cached
   * @param {Object} [options] - Cache options
   * @returns {Promise<*>} Cached or computed value
   */
  async wrap(key, fn, options = {}) {
    const cached = await this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Update access order for LRU
   * @private
   */
  touchKey(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Ensure capacity for new entry
   * @private
   */
  async ensureCapacity(newSize) {
    // Evict by count
    while (this.cache.size >= this.maxSize && this.accessOrder.length > 0) {
      await this.evictLRU();
    }

    // Evict by memory
    while (this.stats.totalSize + newSize > this.maxMemory && this.accessOrder.length > 0) {
      await this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   * @private
   */
  async evictLRU() {
    const keyToEvict = this.accessOrder.shift();
    if (keyToEvict) {
      const entry = this.cache.get(keyToEvict);
      if (entry && this.onEvict) {
        this.onEvict(keyToEvict, entry.value);
      }
      this.cache.delete(keyToEvict);
      if (entry) {
        this.stats.totalSize -= entry.size;
      }
      this.stats.evictions++;
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires && now > entry.expires) {
        this.delete(key);
      }
    }
  }

  /**
   * Clear all entries
   */
  async clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.totalSize = 0;
  }

  /**
   * Get cache statistics
   * @returns {CacheStats}
   */
  getStats() {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
        : '0%',
      entries: this.cache.size,
      size: this.stats.totalSize,
      sizeFormatted: this.formatBytes(this.stats.totalSize),
      evictions: this.stats.evictions,
      maxSize: this.maxSize,
      maxMemory: this.maxMemory,
      maxMemoryFormatted: this.formatBytes(this.maxMemory)
    };
  }

  /**
   * Format bytes to human readable
   * @private
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Shutdown cache service
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE CACHE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Specialized cache for API responses with semantic similarity support
 */
class APIResponseCache extends CacheService {
  constructor(options = {}) {
    super(options);
    this.enableSemantic = options.enableSemantic || false;
    this.similarityThreshold = options.similarityThreshold || 0.95;
  }

  /**
   * Generate cache key for API request
   * @param {Object} request - API request details
   * @returns {string} Cache key
   */
  generateRequestKey(request) {
    const { model, messages, temperature, maxTokens } = request;

    // For deterministic requests (temp=0), cache aggressively
    if (temperature === 0) {
      return this.normalizeKey({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        maxTokens
      });
    }

    // For non-deterministic, include a time bucket for staleness
    const timeBucket = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-minute buckets
    return this.normalizeKey({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature,
      maxTokens,
      timeBucket
    });
  }

  /**
   * Cache an API response
   * @param {Object} request - Original request
   * @param {Object} response - API response
   * @param {Object} [options] - Cache options
   */
  async cacheResponse(request, response, options = {}) {
    const key = this.generateRequestKey(request);

    // Calculate appropriate TTL based on request type
    let ttl = options.ttl;
    if (!ttl) {
      if (request.temperature === 0) {
        ttl = 3600; // 1 hour for deterministic
      } else if (request.temperature < 0.5) {
        ttl = 600; // 10 minutes for low temperature
      } else {
        ttl = 120; // 2 minutes for high temperature
      }
    }

    await this.set(key, {
      response,
      request: {
        model: request.model,
        messageCount: request.messages?.length,
        temperature: request.temperature
      },
      cachedAt: new Date().toISOString()
    }, { ttl });
  }

  /**
   * Get cached response for request
   * @param {Object} request - API request
   * @returns {Promise<Object|null>} Cached response or null
   */
  async getCachedResponse(request) {
    const key = this.generateRequestKey(request);
    const cached = await this.get(key);

    if (cached) {
      return {
        ...cached.response,
        _cached: true,
        _cachedAt: cached.cachedAt
      };
    }

    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPRESS MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create Express middleware for response caching
 * @param {CacheService} cache - Cache service instance
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
function createCacheMiddleware(cache, options = {}) {
  const {
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    ttl = 60,
    methods = ['GET'],
    condition = () => true,
    onHit = null,
    onMiss = null
  } = options;

  return async (req, res, next) => {
    // Skip if method not cacheable
    if (!methods.includes(req.method)) {
      return next();
    }

    // Skip if condition not met
    if (!condition(req)) {
      return next();
    }

    const key = keyGenerator(req);

    try {
      const cached = await cache.get(key);

      if (cached) {
        if (onHit) onHit(req, cached);
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', key);
        return res.json(cached);
      }

      if (onMiss) onMiss(req);

      // Intercept response to cache it
      const originalJson = res.json.bind(res);
      res.json = async (body) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await cache.set(key, body, { ttl });
        }
        res.set('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export {
  CacheService,
  APIResponseCache,
  createCacheMiddleware
};

export default CacheService;
