/**
 * Pattern Matcher (CQ-010)
 *
 * Centralized pattern matching logic to replace duplicate implementations
 * across the codebase. Supports exact matching, glob patterns, and regex.
 *
 * Sources:
 * - https://github.com/micromatch/picomatch
 * - https://en.wikipedia.org/wiki/Glob_(programming)
 */

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN MATCHER (Exact Match)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base pattern matcher for exact string matching
 */
export class PatternMatcher {
  /**
   * @param {string|string[]} patterns - Pattern(s) to match
   * @param {Object} [options] - Options
   * @param {boolean} [options.ignoreCase=false] - Case-insensitive matching
   */
  constructor(patterns, options = {}) {
    this.patterns = Array.isArray(patterns) ? patterns : [patterns];
    this.ignoreCase = options.ignoreCase || false;

    if (this.ignoreCase) {
      this.patterns = this.patterns.map(p => String(p).toLowerCase());
    }
  }

  /**
   * Test if a value matches any pattern
   * @param {*} value - Value to test
   * @returns {boolean}
   */
  test(value) {
    if (value === null || value === undefined) {
      return false;
    }

    let str = String(value);
    if (this.ignoreCase) {
      str = str.toLowerCase();
    }

    return this.patterns.some(pattern => str === pattern);
  }

  /**
   * Filter array to only matching values
   * @param {Array} values - Values to filter
   * @returns {Array}
   */
  filter(values) {
    return values.filter(v => this.test(v));
  }

  /**
   * Find first matching value
   * @param {Array} values - Values to search
   * @returns {*}
   */
  find(values) {
    return values.find(v => this.test(v));
  }

  /**
   * Count matching values
   * @param {Array} values - Values to count
   * @returns {number}
   */
  count(values) {
    return values.filter(v => this.test(v)).length;
  }

  /**
   * Check if any value matches
   * @param {Array} values - Values to check
   * @returns {boolean}
   */
  some(values) {
    return values.some(v => this.test(v));
  }

  /**
   * Check if all values match
   * @param {Array} values - Values to check
   * @returns {boolean}
   */
  every(values) {
    return values.every(v => this.test(v));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOB MATCHER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Glob pattern matcher supporting *, **, ?, [abc], {a,b}
 */
export class GlobMatcher extends PatternMatcher {
  constructor(patterns, options = {}) {
    super(patterns, options);

    // Separate positive and negative patterns
    this.positivePatterns = [];
    this.negativePatterns = [];

    for (const pattern of this.patterns) {
      if (pattern.startsWith('!')) {
        this.negativePatterns.push(this._globToRegex(pattern.slice(1)));
      } else {
        this.positivePatterns.push(this._globToRegex(pattern));
      }
    }
  }

  /**
   * Convert glob pattern to regex
   * @private
   */
  _globToRegex(glob) {
    // Use placeholders to avoid replacement conflicts
    const STAR_STAR_SLASH = '\x00STARSTARSLASH\x00';
    const STAR_STAR = '\x00STARSTAR\x00';
    const STAR = '\x00STAR\x00';
    const QUESTION = '\x00QUESTION\x00';
    const BRACKET_OPEN = '\x00BRACKETOPEN\x00';
    const BRACKET_CLOSE = '\x00BRACKETCLOSE\x00';
    const BRACE_OPEN = '\x00BRACEOPEN\x00';
    const BRACE_CLOSE = '\x00BRACECLOSE\x00';

    let regex = glob
      // Replace glob patterns with placeholders first
      // Handle **/ specially (matches zero or more directories)
      .replace(/\*\*\//g, STAR_STAR_SLASH)
      .replace(/\*\*/g, STAR_STAR)
      .replace(/\*/g, STAR)
      .replace(/\?/g, QUESTION)
      .replace(/\[/g, BRACKET_OPEN)
      .replace(/\]/g, BRACKET_CLOSE)
      .replace(/\{/g, BRACE_OPEN)
      .replace(/\}/g, BRACE_CLOSE)
      // Now escape regex special chars
      .replace(/[.+^$()|\\/]/g, '\\$&')
      // Restore glob patterns as regex equivalents
      // **/ matches zero or more path segments
      .replace(new RegExp(STAR_STAR_SLASH, 'g'), '(?:.*/)?')
      .replace(new RegExp(STAR_STAR, 'g'), '.*')
      .replace(new RegExp(STAR, 'g'), '[^/]*')
      .replace(new RegExp(QUESTION, 'g'), '[^/]');

    // Handle {a,b,c} alternation
    regex = regex.replace(
      new RegExp(`${BRACE_OPEN}([^${BRACE_CLOSE}]+)${BRACE_CLOSE}`, 'g'),
      (_, contents) => {
        const options = contents.split(',');
        return `(${options.join('|')})`;
      }
    );

    // Handle [abc] character classes
    regex = regex
      .replace(new RegExp(BRACKET_OPEN, 'g'), '[')
      .replace(new RegExp(BRACKET_CLOSE, 'g'), ']');

    const flags = this.ignoreCase ? 'i' : '';
    return new RegExp(`^${regex}$`, flags);
  }

  /**
   * Test if a value matches glob pattern
   * @param {*} value - Value to test
   * @returns {boolean}
   */
  test(value) {
    if (value === null || value === undefined) {
      return false;
    }

    const str = String(value);

    // Must match at least one positive pattern
    const matchesPositive = this.positivePatterns.length === 0
      ? false
      : this.positivePatterns.some(re => re.test(str));

    if (!matchesPositive) {
      return false;
    }

    // Must not match any negative pattern
    const matchesNegative = this.negativePatterns.some(re => re.test(str));

    return !matchesNegative;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGEX MATCHER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Regex pattern matcher
 */
export class RegexMatcher extends PatternMatcher {
  /**
   * @param {RegExp|string|Array} patterns - Pattern(s) to match
   * @param {Object} [options] - Options
   * @param {string} [options.flags=''] - Regex flags for string patterns
   */
  constructor(patterns, options = {}) {
    super(patterns, options);

    this.regexes = this.patterns.map(p => {
      if (p instanceof RegExp) {
        return p;
      }
      const flags = options.flags || '';
      return new RegExp(p, flags);
    });
  }

  /**
   * Test if a value matches any regex
   * @param {*} value - Value to test
   * @returns {boolean}
   */
  test(value) {
    if (value === null || value === undefined) {
      return false;
    }

    const str = String(value);
    return this.regexes.some(re => re.test(str));
  }

  /**
   * Get match result for first matching regex
   * @param {string} value - Value to match
   * @returns {RegExpMatchArray|null}
   */
  match(value) {
    if (value === null || value === undefined) {
      return null;
    }

    const str = String(value);

    for (const re of this.regexes) {
      const match = str.match(re);
      if (match) {
        return match;
      }
    }

    return null;
  }

  /**
   * Get all matches (for global regex)
   * @param {string} value - Value to match
   * @returns {string[]}
   */
  matchAll(value) {
    if (value === null || value === undefined) {
      return [];
    }

    const str = String(value);
    const results = [];

    for (const re of this.regexes) {
      if (re.global) {
        const matches = str.match(re);
        if (matches) {
          results.push(...matches);
        }
      }
    }

    return results;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create appropriate matcher based on pattern type
 * @param {string|RegExp|Array} pattern - Pattern(s)
 * @param {Object} [options] - Options
 * @param {string} [options.type] - Force type: 'exact', 'glob', 'regex'
 * @returns {PatternMatcher|GlobMatcher|RegexMatcher}
 */
export function createMatcher(pattern, options = {}) {
  // Explicit type
  if (options.type === 'glob') {
    return new GlobMatcher(pattern, options);
  }
  if (options.type === 'regex') {
    return new RegexMatcher(pattern, options);
  }
  if (options.type === 'exact') {
    return new PatternMatcher(pattern, options);
  }

  // Auto-detect
  if (pattern instanceof RegExp) {
    return new RegexMatcher(pattern, options);
  }

  if (typeof pattern === 'string') {
    // Check for glob wildcards
    if (/[*?[\]{}]/.test(pattern)) {
      return new GlobMatcher(pattern, options);
    }
  }

  if (Array.isArray(pattern)) {
    // Check if any pattern has glob wildcards
    const hasGlob = pattern.some(p => typeof p === 'string' && /[*?[\]{}]/.test(p));
    const hasRegex = pattern.some(p => p instanceof RegExp);

    if (hasRegex) {
      return new RegexMatcher(pattern, options);
    }
    if (hasGlob) {
      return new GlobMatcher(pattern, options);
    }
  }

  // Default to exact matching
  return new PatternMatcher(pattern, options);
}

export default {
  PatternMatcher,
  GlobMatcher,
  RegexMatcher,
  createMatcher
};
