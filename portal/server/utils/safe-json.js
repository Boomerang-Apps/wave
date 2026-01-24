/**
 * Safe JSON Utilities (CQ-001)
 *
 * Provides safe JSON parsing and stringification that never throws.
 * Prevents application crashes from malformed JSON input.
 *
 * Sources:
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
 * - https://www.geeksforgeeks.org/how-to-catch-json-parse-error-in-javascript/
 * - https://github.com/goldbergyoni/nodebestpractices
 */

/**
 * Safely parse JSON string without throwing
 *
 * @param {string} jsonString - JSON string to parse
 * @param {Object} options - Configuration options
 * @param {*} options.fallback - Value to return on error (default: null)
 * @param {Function} options.logger - Optional logger function for errors
 * @returns {{ data: *, error: Error|null }} Parse result with data and error
 *
 * @example
 * const { data, error } = safeJsonParse('{"key": "value"}');
 * if (error) {
 *   console.error('Parse failed:', error.message);
 * }
 */
export function safeJsonParse(jsonString, options = {}) {
  const { fallback = null, logger = null } = options;

  // Validate input type
  if (typeof jsonString !== 'string') {
    const error = new Error(`Input must be a string, received ${typeof jsonString}`);
    if (logger) logger(error.message);
    return { data: fallback, error };
  }

  // Handle empty input
  if (jsonString.trim() === '') {
    const error = new Error('Input is empty');
    if (logger) logger(error.message);
    return { data: fallback, error };
  }

  try {
    const data = JSON.parse(jsonString);
    return { data, error: null };
  } catch (parseError) {
    if (logger) {
      logger(`JSON parse error: ${parseError.message}`);
    }
    return { data: fallback, error: parseError };
  }
}

/**
 * Safely stringify object to JSON without throwing
 *
 * @param {*} value - Value to stringify
 * @param {Object} options - Configuration options
 * @param {boolean} options.pretty - Pretty print with 2-space indent
 * @param {number} options.indent - Custom indentation spaces
 * @param {Function} options.logger - Optional logger function for errors
 * @returns {{ data: string|null, error: Error|null }} Stringify result
 *
 * @example
 * const { data, error } = safeJsonStringify({ key: 'value' });
 * if (error) {
 *   console.error('Stringify failed:', error.message);
 * }
 */
export function safeJsonStringify(value, options = {}) {
  const { pretty = false, indent = 2, logger = null } = options;

  try {
    const space = pretty || indent !== 2 ? indent : undefined;
    const data = JSON.stringify(value, null, space);
    return { data, error: null };
  } catch (stringifyError) {
    if (logger) {
      logger(`JSON stringify error: ${stringifyError.message}`);
    }
    return { data: null, error: stringifyError };
  }
}

export default { safeJsonParse, safeJsonStringify };
