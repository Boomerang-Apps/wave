/**
 * File Rate Limit Store (SEC-006)
 *
 * Provides file-based persistence for rate limits so they survive restarts.
 * Compatible with DistributedRateLimiter store interface.
 *
 * Sources:
 * - https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
 */

import fs from 'fs';
import path from 'path';

/**
 * File-based rate limit store
 * Persists rate limits to disk for restart survival
 */
export class FileStore {
  /**
   * @param {Object} options
   * @param {string} options.filePath - Path to persistence file
   * @param {boolean} [options.autoLoad=false] - Load existing data on construction
   * @param {number} [options.autoSaveInterval=30000] - Auto-save interval (0 to disable)
   */
  constructor(options = {}) {
    if (!options.filePath) {
      throw new Error('filePath is required');
    }

    this.filePath = options.filePath;
    this.store = new Map();
    this.autoSaveInterval = null;
    this.dirty = false;

    // Auto-load existing data
    if (options.autoLoad) {
      this.loadSync();
    }

    // Start auto-save if interval provided
    const interval = options.autoSaveInterval !== undefined
      ? options.autoSaveInterval
      : 30000;

    if (interval > 0) {
      this.startAutoSave(interval);
    }
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
    this.dirty = true;

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
      this.dirty = true;
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
      this.dirty = true;
    }
  }

  /**
   * Reset counter for a key
   * @param {string} key - Rate limit key
   * @returns {Promise<void>}
   */
  async reset(key) {
    if (this.store.has(key)) {
      this.store.delete(key);
      this.dirty = true;
    }
  }

  /**
   * Clear all entries
   * @returns {Promise<void>}
   */
  async clear() {
    this.store.clear();
    this.dirty = true;
  }

  /**
   * Get store size
   * @returns {number}
   */
  get size() {
    return this.store.size;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store) {
      if (now > record.resetTime) {
        this.store.delete(key);
        this.dirty = true;
      }
    }
  }

  /**
   * Save to file
   * @returns {Promise<void>}
   */
  async save() {
    // Cleanup expired entries before saving
    this.cleanup();

    // Convert Map to object for JSON serialization
    const data = {};
    for (const [key, record] of this.store) {
      data[key] = record;
    }

    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write atomically (write to temp, then rename)
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    fs.renameSync(tempPath, this.filePath);

    this.dirty = false;
  }

  /**
   * Load from file
   * @returns {Promise<void>}
   */
  async load() {
    this.loadSync();
  }

  /**
   * Load from file synchronously
   */
  loadSync() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }

      const content = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(content);
      const now = Date.now();

      // Load non-expired entries
      for (const [key, record] of Object.entries(data)) {
        if (record.resetTime > now) {
          this.store.set(key, record);
        }
      }
    } catch (error) {
      // On error (corrupted file, etc.), start fresh
      console.error('[FileStore] Failed to load:', error.message);
      this.store.clear();
    }
  }

  /**
   * Start auto-save interval
   * @param {number} intervalMs - Save interval
   */
  startAutoSave(intervalMs) {
    if (this.autoSaveInterval) {
      return;
    }

    this.autoSaveInterval = setInterval(() => {
      if (this.dirty) {
        this.save().catch(err => {
          console.error('[FileStore] Auto-save failed:', err.message);
        });
      }
    }, intervalMs);

    // Don't prevent process exit
    if (this.autoSaveInterval.unref) {
      this.autoSaveInterval.unref();
    }
  }

  /**
   * Stop auto-save interval
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
}

/**
 * Create a file-based rate limiter
 * @param {Object} options
 * @param {string} options.filePath - Path to persistence file
 * @param {number} [options.windowMs=60000] - Window duration
 * @param {number} [options.maxRequests=100] - Max requests per window
 * @returns {Object} Rate limiter with file store
 */
export function createFileRateLimiter(options = {}) {
  // Dynamic import to avoid circular dependency
  const { DistributedRateLimiter } = require('./distributed-rate-limiter.js');

  const store = new FileStore({
    filePath: options.filePath,
    autoLoad: true,
    autoSaveInterval: options.autoSaveInterval || 30000
  });

  return new DistributedRateLimiter({
    store,
    windowMs: options.windowMs || 60000,
    maxRequests: options.maxRequests || 100,
    ...options
  });
}

export default {
  FileStore,
  createFileRateLimiter
};
