/**
 * Safe JSON Parse Tests (CQ-001)
 *
 * TDD tests for safe JSON parsing utility to prevent crashes on invalid JSON.
 *
 * Sources:
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
 * - https://www.geeksforgeeks.org/how-to-catch-json-parse-error-in-javascript/
 */

import { describe, it, expect, vi } from 'vitest';
import { safeJsonParse, safeJsonStringify } from '../utils/safe-json.js';

describe('Safe JSON Parse (CQ-001)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Basic Functionality
  // ─────────────────────────────────────────────────────────────────────────────

  describe('safeJsonParse - Basic Functionality', () => {
    it('should parse valid JSON successfully', () => {
      const result = safeJsonParse('{"name": "test", "value": 123}');

      expect(result.data).toEqual({ name: 'test', value: 123 });
      expect(result.error).toBeNull();
    });

    it('should parse valid JSON arrays', () => {
      const result = safeJsonParse('[1, 2, 3]');

      expect(result.data).toEqual([1, 2, 3]);
      expect(result.error).toBeNull();
    });

    it('should parse valid JSON primitives', () => {
      expect(safeJsonParse('123').data).toBe(123);
      expect(safeJsonParse('"hello"').data).toBe('hello');
      expect(safeJsonParse('true').data).toBe(true);
      expect(safeJsonParse('null').data).toBeNull();
    });

    it('should return fallback for invalid JSON', () => {
      const result = safeJsonParse('{ invalid json }');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should return custom fallback for invalid JSON', () => {
      const result = safeJsonParse('{ invalid }', { fallback: {} });

      expect(result.data).toEqual({});
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should return fallback for empty string', () => {
      const result = safeJsonParse('');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should return fallback for null input', () => {
      const result = safeJsonParse(null);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should return fallback for undefined input', () => {
      const result = safeJsonParse(undefined);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should return fallback for non-string input', () => {
      const result = safeJsonParse(123);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Information
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Error Information', () => {
    it('should include error details in result', () => {
      const result = safeJsonParse('{ not valid }');

      expect(result.error).not.toBeNull();
      expect(result.error.message).toBeDefined();
    });

    it('should not throw on malformed JSON', () => {
      expect(() => safeJsonParse('{ bad }')).not.toThrow();
      expect(() => safeJsonParse('undefined')).not.toThrow();
      expect(() => safeJsonParse("{'single': 'quotes'}")).not.toThrow();
    });

    it('should log parsing errors when logger provided', () => {
      const logger = vi.fn();
      safeJsonParse('{ invalid }', { logger });

      expect(logger).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle JSON with trailing commas', () => {
      const result = safeJsonParse('{"a": 1,}');

      expect(result.error).toBeInstanceOf(Error);
      expect(result.data).toBeNull();
    });

    it('should handle JSON with single quotes', () => {
      const result = safeJsonParse("{'key': 'value'}");

      expect(result.error).toBeInstanceOf(Error);
      expect(result.data).toBeNull();
    });

    it('should handle truncated JSON', () => {
      const result = safeJsonParse('{"key": "val');

      expect(result.error).toBeInstanceOf(Error);
      expect(result.data).toBeNull();
    });

    it('should handle very large JSON', () => {
      const largeObj = { data: 'x'.repeat(10000) };
      const result = safeJsonParse(JSON.stringify(largeObj));

      expect(result.data).toEqual(largeObj);
      expect(result.error).toBeNull();
    });

    it('should handle deeply nested JSON', () => {
      const deepObj = { a: { b: { c: { d: { e: 'deep' } } } } };
      const result = safeJsonParse(JSON.stringify(deepObj));

      expect(result.data).toEqual(deepObj);
      expect(result.error).toBeNull();
    });

    it('should handle unicode in JSON', () => {
      const result = safeJsonParse('{"emoji": "🎉", "text": "日本語"}');

      expect(result.data).toEqual({ emoji: '🎉', text: '日本語' });
      expect(result.error).toBeNull();
    });

    it('should handle whitespace-only input', () => {
      const result = safeJsonParse('   \n\t  ');

      expect(result.error).toBeInstanceOf(Error);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // safeJsonStringify
  // ─────────────────────────────────────────────────────────────────────────────

  describe('safeJsonStringify', () => {
    it('should stringify valid objects', () => {
      const result = safeJsonStringify({ name: 'test' });

      expect(result.data).toBe('{"name":"test"}');
      expect(result.error).toBeNull();
    });

    it('should handle circular references gracefully', () => {
      const obj = { name: 'test' };
      obj.self = obj;

      const result = safeJsonStringify(obj);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should support pretty printing', () => {
      const result = safeJsonStringify({ a: 1 }, { pretty: true });

      expect(result.data).toContain('\n');
      expect(result.error).toBeNull();
    });

    it('should support custom indentation', () => {
      const result = safeJsonStringify({ a: 1 }, { indent: 4 });

      expect(result.data).toBe('{\n    "a": 1\n}');
    });
  });
});
