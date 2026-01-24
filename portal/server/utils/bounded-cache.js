/**
 * Bounded Cache (CQ-004/CQ-005)
 *
 * LRU Cache with max size and TTL support to prevent unbounded memory growth.
 * Prevents memory leaks in signal-deduplicator, run-tracker, and similar caches.
 *
 * Sources:
 * - https://github.com/isaacs/node-lru-cache
 * - https://www.npmjs.com/package/lru-cache
 * - https://yomguithereal.github.io/posts/lru-cache/
 * - https://en.wikipedia.org/wiki/Cache_replacement_policies#LRU
 */

/**
 * LRU Cache with max size and TTL support
 *
 * @example
 * const cache = new BoundedCache({ max: 1000, ttl: 60000 });
 * cache.set('key', 'value');
 * const value = cache.get('key');
 */
export class BoundedCache {
  /**
   * Create a new bounded cache
   * @param {Object} options - Configuration options
   * @param {number} options.max - Maximum number of entries (default: 1000)
   * @param {number} options.ttl - Time-to-live in milliseconds (default: 300000 / 5 minutes)
   */
  constructor(options = {}) {
    this.max = options.max || 1000;
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this._cache = new Map();
  }

  /**
   * Get value from cache
   * Returns undefined if not found or expired
   * Updates LRU order on access
   *
   * @param {*} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const entry = this._cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this._cache.delete(key);
      return undefined;
    }

    // Update LRU order (move to end)
    this._cache.delete(key);
    this._cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set value in cache
   * Evicts oldest entry if at max capacity
   *
   * @param {*} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Per-item options
   * @param {number} options.ttl - Override TTL for this item
   */
  set(key, value, options = {}) {
    // Remove existing entry if present (to update position)
    if (this._cache.has(key)) {
      this._cache.delete(key);
    }

    // Evict oldest entry if at max capacity
    if (this._cache.size >= this.max) {
      const oldestKey = this._cache.keys().next().value;
      this._cache.delete(oldestKey);
    }

    const ttl = options.ttl !== undefined ? options.ttl : this.ttl;

    this._cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  /**
   * Check if key exists and is not expired
   *
   * @param {*} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    const entry = this._cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this._cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete entry from cache
   *
   * @param {*} key - Cache key
   * @returns {boolean} True if entry was deleted
   */
  delete(key) {
    return this._cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear() {
    this._cache.clear();
  }

  /**
   * Get number of entries
   * @returns {number} Number of entries
   */
  get size() {
    return this._cache.size;
  }

  /**
   * Prune expired entries
   * Call periodically to clean up memory
   */
  prune() {
    const now = Date.now();

    for (const [key, entry] of this._cache) {
      if (now > entry.expiry) {
        this._cache.delete(key);
      }
    }
  }

  /**
   * Iterate over entries
   * @returns {Iterator} Iterator of [key, value] pairs
   */
  *entries() {
    const now = Date.now();

    for (const [key, entry] of this._cache) {
      if (now <= entry.expiry) {
        yield [key, entry.value];
      }
    }
  }

  /**
   * Iterate over keys
   * @returns {Iterator} Iterator of keys
   */
  *keys() {
    const now = Date.now();

    for (const [key, entry] of this._cache) {
      if (now <= entry.expiry) {
        yield key;
      }
    }
  }

  /**
   * Iterate over values
   * @returns {Iterator} Iterator of values
   */
  *values() {
    const now = Date.now();

    for (const [, entry] of this._cache) {
      if (now <= entry.expiry) {
        yield entry.value;
      }
    }
  }
}

export default BoundedCache;
