/**
 * Deep Freeze Tests (CQ-013)
 *
 * TDD tests for deep freezing utility to prevent mutable config returns.
 */

import { describe, it, expect } from 'vitest';
import { deepFreeze, deepClone } from '../utils/deep-freeze.js';

describe('Deep Freeze (CQ-013)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // deepFreeze
  // ─────────────────────────────────────────────────────────────────────────────

  describe('deepFreeze', () => {
    it('should freeze top-level object', () => {
      const obj = { a: 1, b: 2 };
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
    });

    it('should freeze nested objects', () => {
      const obj = { a: { b: { c: 1 } } };
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.a)).toBe(true);
      expect(Object.isFrozen(frozen.a.b)).toBe(true);
    });

    it('should freeze arrays', () => {
      const obj = { items: [1, 2, 3] };
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen.items)).toBe(true);
    });

    it('should freeze objects inside arrays', () => {
      const obj = { items: [{ a: 1 }, { b: 2 }] };
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen.items[0])).toBe(true);
      expect(Object.isFrozen(frozen.items[1])).toBe(true);
    });

    it('should handle null values', () => {
      const obj = { a: null, b: 1 };
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen.a).toBeNull();
    });

    it('should handle undefined values', () => {
      const obj = { a: undefined, b: 1 };
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
    });

    it('should return primitives as-is', () => {
      expect(deepFreeze(123)).toBe(123);
      expect(deepFreeze('string')).toBe('string');
      expect(deepFreeze(null)).toBeNull();
      expect(deepFreeze(undefined)).toBeUndefined();
    });

    it('should prevent mutations', () => {
      const obj = { a: { b: 1 } };
      const frozen = deepFreeze(obj);

      expect(() => {
        frozen.a.b = 2;
      }).toThrow();
    });

    it('should handle circular references gracefully', () => {
      const obj = { a: 1 };
      obj.self = obj;

      // Should not throw (handles circular refs)
      expect(() => deepFreeze(obj)).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // deepClone
  // ─────────────────────────────────────────────────────────────────────────────

  describe('deepClone', () => {
    it('should create independent copy of object', () => {
      const original = { a: { b: 1 } };
      const clone = deepClone(original);

      clone.a.b = 2;

      expect(original.a.b).toBe(1);
      expect(clone.a.b).toBe(2);
    });

    it('should clone arrays', () => {
      const original = { items: [1, 2, 3] };
      const clone = deepClone(original);

      clone.items.push(4);

      expect(original.items).toEqual([1, 2, 3]);
      expect(clone.items).toEqual([1, 2, 3, 4]);
    });

    it('should clone nested objects in arrays', () => {
      const original = { items: [{ a: 1 }] };
      const clone = deepClone(original);

      clone.items[0].a = 2;

      expect(original.items[0].a).toBe(1);
    });

    it('should handle null and undefined', () => {
      expect(deepClone(null)).toBeNull();
      expect(deepClone(undefined)).toBeUndefined();
    });

    it('should handle primitives', () => {
      expect(deepClone(123)).toBe(123);
      expect(deepClone('str')).toBe('str');
      expect(deepClone(true)).toBe(true);
    });

    it('should handle Date objects', () => {
      const original = { date: new Date('2025-01-01') };
      const clone = deepClone(original);

      expect(clone.date).toEqual(original.date);
      expect(clone.date).not.toBe(original.date);
    });
  });
});
