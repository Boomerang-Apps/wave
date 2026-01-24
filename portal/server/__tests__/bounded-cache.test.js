/**
 * Bounded Cache Tests (CQ-004/CQ-005)
 *
 * TDD tests for LRU cache with max size and TTL support.
 * Prevents unbounded memory growth in signal-deduplicator and run-tracker.
 *
 * Sources:
 * - https://github.com/isaacs/node-lru-cache
 * - https://www.npmjs.com/package/lru-cache
 * - https://yomguithereal.github.io/posts/lru-cache/
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BoundedCache } from '../utils/bounded-cache.js';

describe('Bounded Cache (CQ-004/CQ-005)', () => {
  let cache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new BoundedCache({ max: 5, ttl: 1000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Size Limiting
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Size Limiting', () => {
    it('should enforce maximum entry count', () => {
      cache = new BoundedCache({ max: 3 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'

      expect(cache.size).toBe(3);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('d')).toBe(true);
    });

    it('should evict least recently used when full', () => {
      cache = new BoundedCache({ max: 3 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to make it recently used
      cache.get('a');

      // Add new item - should evict 'b' (least recently used)
      cache.set('d', 4);

      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('should not exceed maxSize', () => {
      cache = new BoundedCache({ max: 100 });

      for (let i = 0; i < 200; i++) {
        cache.set(`key-${i}`, i);
      }

      expect(cache.size).toBe(100);
    });

    it('should handle max of 1', () => {
      cache = new BoundedCache({ max: 1 });

      cache.set('a', 1);
      cache.set('b', 2);

      expect(cache.size).toBe(1);
      expect(cache.has('b')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TTL Support
  // ─────────────────────────────────────────────────────────────────────────────

  describe('TTL Support', () => {
    it('should expire entries after TTL', () => {
      cache = new BoundedCache({ ttl: 1000 });

      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      expect(cache.get('a')).toBeUndefined();
    });

    it('should return undefined for expired entries', () => {
      cache = new BoundedCache({ ttl: 500 });

      cache.set('a', 1);

      vi.advanceTimersByTime(600);

      expect(cache.get('a')).toBeUndefined();
      expect(cache.has('a')).toBe(false);
    });

    it('should keep non-expired entries', () => {
      cache = new BoundedCache({ ttl: 1000 });

      cache.set('a', 1);

      vi.advanceTimersByTime(500);

      expect(cache.get('a')).toBe(1);
    });

    it('should support per-item TTL override', () => {
      cache = new BoundedCache({ ttl: 10000 }); // Long default

      cache.set('a', 1, { ttl: 500 }); // Short override

      vi.advanceTimersByTime(600);

      expect(cache.get('a')).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LRU Behavior
  // ─────────────────────────────────────────────────────────────────────────────

  describe('LRU Behavior', () => {
    it('should update access time on get', () => {
      cache = new BoundedCache({ max: 3 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' multiple times
      cache.get('a');
      cache.get('a');

      // Add new items - 'b' should be evicted first
      cache.set('d', 4);

      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
    });

    it('should evict oldest unused entry', () => {
      cache = new BoundedCache({ max: 2 });

      cache.set('old', 1);
      vi.advanceTimersByTime(100);
      cache.set('new', 2);

      cache.set('newest', 3); // Evicts 'old'

      expect(cache.has('old')).toBe(false);
      expect(cache.has('new')).toBe(true);
      expect(cache.has('newest')).toBe(true);
    });

    it('should keep recently accessed entries', () => {
      cache = new BoundedCache({ max: 2 });

      cache.set('a', 1);
      cache.set('b', 2);

      cache.get('a'); // Make 'a' recently used

      cache.set('c', 3); // Should evict 'b'

      expect(cache.get('a')).toBe(1);
      expect(cache.has('b')).toBe(false);
      expect(cache.get('c')).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Basic Operations
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');
    });

    it('should check if key exists with has()', () => {
      cache.set('exists', true);

      expect(cache.has('exists')).toBe(true);
      expect(cache.has('missing')).toBe(false);
    });

    it('should delete entries', () => {
      cache.set('key', 'value');
      expect(cache.delete('key')).toBe(true);
      expect(cache.get('key')).toBeUndefined();
    });

    it('should clear all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.has('a')).toBe(false);
    });

    it('should return correct size', () => {
      expect(cache.size).toBe(0);

      cache.set('a', 1);
      expect(cache.size).toBe(1);

      cache.set('b', 2);
      expect(cache.size).toBe(2);

      cache.delete('a');
      expect(cache.size).toBe(1);
    });

    it('should update value on duplicate key', () => {
      cache.set('key', 'old');
      cache.set('key', 'new');

      expect(cache.get('key')).toBe('new');
      expect(cache.size).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Pruning
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Pruning', () => {
    it('should prune expired entries', () => {
      cache = new BoundedCache({ ttl: 1000 });

      cache.set('a', 1);
      cache.set('b', 2);

      vi.advanceTimersByTime(1100);

      cache.set('c', 3); // Still valid

      cache.prune();

      // Only 'c' should remain (others expired before prune)
      expect(cache.size).toBe(1);
      expect(cache.has('c')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle undefined values', () => {
      cache.set('key', undefined);
      expect(cache.get('key')).toBeUndefined();
      expect(cache.has('key')).toBe(true);
    });

    it('should handle null values', () => {
      cache.set('key', null);
      expect(cache.get('key')).toBeNull();
      expect(cache.has('key')).toBe(true);
    });

    it('should handle object values', () => {
      const obj = { nested: { data: true } };
      cache.set('obj', obj);

      expect(cache.get('obj')).toBe(obj);
    });

    it('should handle numeric keys', () => {
      cache.set(123, 'value');
      expect(cache.get(123)).toBe('value');
    });

    it('should use default options when not provided', () => {
      cache = new BoundedCache();

      expect(cache.max).toBe(1000); // Default max
      expect(cache.ttl).toBe(300000); // Default TTL (5 minutes)
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Memory Stability
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Memory Stability', () => {
    it('should stabilize memory usage under load', () => {
      cache = new BoundedCache({ max: 100 });

      // Add many more items than max
      for (let i = 0; i < 10000; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }

      expect(cache.size).toBe(100);
    });

    it('should not grow indefinitely', () => {
      cache = new BoundedCache({ max: 10, ttl: 100 });

      // Simulate continuous additions
      for (let i = 0; i < 1000; i++) {
        cache.set(`key-${i}`, i);
        vi.advanceTimersByTime(10);
      }

      expect(cache.size).toBeLessThanOrEqual(10);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Iteration
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Iteration', () => {
    it('should support entries() iteration', () => {
      cache.set('a', 1);
      cache.set('b', 2);

      const entries = [...cache.entries()];

      expect(entries).toHaveLength(2);
      expect(entries.some(([k, v]) => k === 'a' && v === 1)).toBe(true);
      expect(entries.some(([k, v]) => k === 'b' && v === 2)).toBe(true);
    });

    it('should support keys() iteration', () => {
      cache.set('a', 1);
      cache.set('b', 2);

      const keys = [...cache.keys()];

      expect(keys).toContain('a');
      expect(keys).toContain('b');
    });

    it('should support values() iteration', () => {
      cache.set('a', 1);
      cache.set('b', 2);

      const values = [...cache.values()];

      expect(values).toContain(1);
      expect(values).toContain(2);
    });
  });
});
