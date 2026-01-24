/**
 * Pattern Matcher Tests (CQ-010)
 *
 * TDD tests for centralized pattern matching logic.
 */

import { describe, it, expect } from 'vitest';
import {
  PatternMatcher,
  GlobMatcher,
  RegexMatcher,
  createMatcher
} from '../utils/pattern-matcher.js';

describe('Pattern Matcher (CQ-010)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // PatternMatcher Base Class
  // ─────────────────────────────────────────────────────────────────────────────

  describe('PatternMatcher', () => {
    it('should match exact string', () => {
      const matcher = new PatternMatcher('hello');

      expect(matcher.test('hello')).toBe(true);
      expect(matcher.test('world')).toBe(false);
      expect(matcher.test('hello world')).toBe(false);
    });

    it('should match with array of patterns', () => {
      const matcher = new PatternMatcher(['foo', 'bar', 'baz']);

      expect(matcher.test('foo')).toBe(true);
      expect(matcher.test('bar')).toBe(true);
      expect(matcher.test('baz')).toBe(true);
      expect(matcher.test('qux')).toBe(false);
    });

    it('should support case-insensitive matching', () => {
      const matcher = new PatternMatcher('Hello', { ignoreCase: true });

      expect(matcher.test('hello')).toBe(true);
      expect(matcher.test('HELLO')).toBe(true);
      expect(matcher.test('Hello')).toBe(true);
    });

    it('should filter array of values', () => {
      const matcher = new PatternMatcher(['a', 'b']);
      const input = ['a', 'b', 'c', 'd'];

      const result = matcher.filter(input);

      expect(result).toEqual(['a', 'b']);
    });

    it('should find first match', () => {
      const matcher = new PatternMatcher(['foo', 'bar']);
      const input = ['baz', 'bar', 'foo', 'qux'];

      const result = matcher.find(input);

      expect(result).toBe('bar');
    });

    it('should return undefined when no match found', () => {
      const matcher = new PatternMatcher(['foo']);
      const input = ['bar', 'baz'];

      const result = matcher.find(input);

      expect(result).toBeUndefined();
    });

    it('should count matches', () => {
      const matcher = new PatternMatcher(['a', 'b']);
      const input = ['a', 'b', 'a', 'c', 'b', 'b'];

      const result = matcher.count(input);

      expect(result).toBe(5);
    });

    it('should check if any match exists', () => {
      const matcher = new PatternMatcher(['x']);

      expect(matcher.some(['a', 'b', 'x'])).toBe(true);
      expect(matcher.some(['a', 'b', 'c'])).toBe(false);
    });

    it('should check if all match', () => {
      const matcher = new PatternMatcher(['a', 'b', 'c']);

      expect(matcher.every(['a', 'b'])).toBe(true);
      expect(matcher.every(['a', 'b', 'x'])).toBe(false);
    });

    it('should handle empty patterns', () => {
      const matcher = new PatternMatcher([]);

      expect(matcher.test('anything')).toBe(false);
      expect(matcher.filter(['a', 'b'])).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GlobMatcher
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GlobMatcher', () => {
    it('should match * wildcard', () => {
      const matcher = new GlobMatcher('*.js');

      expect(matcher.test('file.js')).toBe(true);
      expect(matcher.test('module.js')).toBe(true);
      expect(matcher.test('file.ts')).toBe(false);
    });

    it('should match ** recursive wildcard', () => {
      const matcher = new GlobMatcher('src/**/*.js');

      expect(matcher.test('src/file.js')).toBe(true);
      expect(matcher.test('src/utils/helper.js')).toBe(true);
      expect(matcher.test('src/deep/nested/module.js')).toBe(true);
      expect(matcher.test('dist/file.js')).toBe(false);
    });

    it('should match ? single character', () => {
      const matcher = new GlobMatcher('file?.txt');

      expect(matcher.test('file1.txt')).toBe(true);
      expect(matcher.test('fileA.txt')).toBe(true);
      expect(matcher.test('file.txt')).toBe(false);
      expect(matcher.test('file12.txt')).toBe(false);
    });

    it('should match [abc] character classes', () => {
      const matcher = new GlobMatcher('file[123].txt');

      expect(matcher.test('file1.txt')).toBe(true);
      expect(matcher.test('file2.txt')).toBe(true);
      expect(matcher.test('file3.txt')).toBe(true);
      expect(matcher.test('file4.txt')).toBe(false);
    });

    it('should match {a,b,c} alternation', () => {
      const matcher = new GlobMatcher('*.{js,ts,jsx,tsx}');

      expect(matcher.test('file.js')).toBe(true);
      expect(matcher.test('file.ts')).toBe(true);
      expect(matcher.test('file.jsx')).toBe(true);
      expect(matcher.test('file.tsx')).toBe(true);
      expect(matcher.test('file.css')).toBe(false);
    });

    it('should handle multiple patterns', () => {
      const matcher = new GlobMatcher(['*.js', '*.ts']);

      expect(matcher.test('file.js')).toBe(true);
      expect(matcher.test('file.ts')).toBe(true);
      expect(matcher.test('file.css')).toBe(false);
    });

    it('should match exact paths', () => {
      const matcher = new GlobMatcher('package.json');

      expect(matcher.test('package.json')).toBe(true);
      expect(matcher.test('package-lock.json')).toBe(false);
    });

    it('should handle negation patterns', () => {
      const matcher = new GlobMatcher(['*.js', '!*.min.js']);

      expect(matcher.test('file.js')).toBe(true);
      expect(matcher.test('file.min.js')).toBe(false);
    });

    it('should be case-sensitive by default', () => {
      const matcher = new GlobMatcher('*.JS');

      expect(matcher.test('file.JS')).toBe(true);
      expect(matcher.test('file.js')).toBe(false);
    });

    it('should support case-insensitive matching', () => {
      const matcher = new GlobMatcher('*.JS', { ignoreCase: true });

      expect(matcher.test('file.JS')).toBe(true);
      expect(matcher.test('file.js')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RegexMatcher
  // ─────────────────────────────────────────────────────────────────────────────

  describe('RegexMatcher', () => {
    it('should match regex pattern', () => {
      const matcher = new RegexMatcher(/^test-\d+$/);

      expect(matcher.test('test-123')).toBe(true);
      expect(matcher.test('test-1')).toBe(true);
      expect(matcher.test('test-abc')).toBe(false);
    });

    it('should match string regex', () => {
      const matcher = new RegexMatcher('^hello');

      expect(matcher.test('hello world')).toBe(true);
      expect(matcher.test('say hello')).toBe(false);
    });

    it('should support regex flags', () => {
      const matcher = new RegexMatcher('hello', { flags: 'i' });

      expect(matcher.test('Hello')).toBe(true);
      expect(matcher.test('HELLO')).toBe(true);
    });

    it('should handle multiple patterns', () => {
      const matcher = new RegexMatcher([/^foo/, /bar$/]);

      expect(matcher.test('foobar')).toBe(true);
      expect(matcher.test('foo')).toBe(true);
      expect(matcher.test('bar')).toBe(true);
      expect(matcher.test('baz')).toBe(false);
    });

    it('should extract capture groups', () => {
      const matcher = new RegexMatcher(/^(\w+)-(\d+)$/);

      const result = matcher.match('test-123');

      expect(result).not.toBeNull();
      expect(result[1]).toBe('test');
      expect(result[2]).toBe('123');
    });

    it('should return null for no match', () => {
      const matcher = new RegexMatcher(/^test$/);

      const result = matcher.match('other');

      expect(result).toBeNull();
    });

    it('should extract all matches', () => {
      const matcher = new RegexMatcher(/\d+/g);

      const result = matcher.matchAll('a1b2c3');

      expect(result).toEqual(['1', '2', '3']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // createMatcher Factory
  // ─────────────────────────────────────────────────────────────────────────────

  describe('createMatcher', () => {
    it('should create PatternMatcher for exact strings', () => {
      const matcher = createMatcher('exact');

      expect(matcher).toBeInstanceOf(PatternMatcher);
      expect(matcher.test('exact')).toBe(true);
    });

    it('should create GlobMatcher for glob patterns', () => {
      const matcher = createMatcher('*.js', { type: 'glob' });

      expect(matcher).toBeInstanceOf(GlobMatcher);
      expect(matcher.test('file.js')).toBe(true);
    });

    it('should create RegexMatcher for regex', () => {
      const matcher = createMatcher(/test/, { type: 'regex' });

      expect(matcher).toBeInstanceOf(RegexMatcher);
      expect(matcher.test('test')).toBe(true);
    });

    it('should auto-detect glob patterns', () => {
      const matcher = createMatcher('**/*.js');

      expect(matcher).toBeInstanceOf(GlobMatcher);
    });

    it('should auto-detect regex patterns', () => {
      const matcher = createMatcher(/pattern/);

      expect(matcher).toBeInstanceOf(RegexMatcher);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle empty string pattern', () => {
      const matcher = new PatternMatcher('');

      expect(matcher.test('')).toBe(true);
      expect(matcher.test('x')).toBe(false);
    });

    it('should handle special regex characters in exact match', () => {
      const matcher = new PatternMatcher('file.js');

      expect(matcher.test('file.js')).toBe(true);
      expect(matcher.test('filexjs')).toBe(false);
    });

    it('should handle null/undefined inputs', () => {
      const matcher = new PatternMatcher('test');

      expect(matcher.test(null)).toBe(false);
      expect(matcher.test(undefined)).toBe(false);
    });

    it('should convert non-string inputs', () => {
      const matcher = new PatternMatcher('123');

      expect(matcher.test(123)).toBe(true);
    });

    it('should handle very long patterns', () => {
      const longPattern = 'a'.repeat(1000);
      const matcher = new PatternMatcher(longPattern);

      expect(matcher.test(longPattern)).toBe(true);
      expect(matcher.test('a'.repeat(999))).toBe(false);
    });
  });
});
