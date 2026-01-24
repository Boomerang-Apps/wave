/**
 * Deep Freeze Utilities (CQ-013)
 *
 * Provides utilities for creating immutable copies of configuration objects.
 * Prevents external code from modifying internal state.
 *
 * Sources:
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
 */

/**
 * Recursively freeze an object and all nested objects
 *
 * @param {*} obj - Object to freeze
 * @param {WeakSet} [seen] - Set of already-processed objects (for circular refs)
 * @returns {*} Frozen object (same reference)
 *
 * @example
 * const config = deepFreeze({ api: { key: 'secret' } });
 * config.api.key = 'new'; // Throws in strict mode
 */
export function deepFreeze(obj, seen = new WeakSet()) {
  // Handle primitives and null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return obj;
  }
  seen.add(obj);

  // Freeze arrays and their contents
  if (Array.isArray(obj)) {
    for (const item of obj) {
      deepFreeze(item, seen);
    }
    return Object.freeze(obj);
  }

  // Freeze object and all its properties
  for (const value of Object.values(obj)) {
    if (value !== null && typeof value === 'object') {
      deepFreeze(value, seen);
    }
  }

  return Object.freeze(obj);
}

/**
 * Create a deep clone of an object
 *
 * @param {*} obj - Object to clone
 * @returns {*} Deep cloned copy
 *
 * @example
 * const original = { nested: { value: 1 } };
 * const copy = deepClone(original);
 * copy.nested.value = 2; // original.nested.value still 1
 */
export function deepClone(obj) {
  // Handle primitives and null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }

  // Handle Object
  const cloned = {};
  for (const [key, value] of Object.entries(obj)) {
    cloned[key] = deepClone(value);
  }
  return cloned;
}

/**
 * Create an immutable copy of an object (clone + freeze)
 *
 * @param {*} obj - Object to make immutable copy of
 * @returns {*} Frozen deep clone
 */
export function immutableCopy(obj) {
  return deepFreeze(deepClone(obj));
}

export default {
  deepFreeze,
  deepClone,
  immutableCopy
};
