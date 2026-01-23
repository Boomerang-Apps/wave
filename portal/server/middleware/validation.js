/**
 * Input Validation Middleware (GAP-003)
 *
 * Provides comprehensive schema validation for API endpoints:
 * - Type validation (string, number, boolean, array, object)
 * - Length/range constraints (minLength, maxLength, minimum, maximum)
 * - Enum validation
 * - Pattern validation (regex)
 * - Strict mode (reject unexpected fields)
 * - Nested object/array validation
 * - Security patterns (SQL injection, XSS, path traversal)
 *
 * Based on OWASP Input Validation Cheat Sheet
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 */

// Validation error codes
export const VALIDATION_ERRORS = {
  REQUIRED: 'required',
  INVALID_TYPE: 'invalid_type',
  MIN_LENGTH: 'min_length',
  MAX_LENGTH: 'max_length',
  MINIMUM: 'minimum',
  MAXIMUM: 'maximum',
  EXCLUSIVE_MINIMUM: 'exclusive_minimum',
  EXCLUSIVE_MAXIMUM: 'exclusive_maximum',
  ENUM: 'enum',
  PATTERN: 'pattern',
  ADDITIONAL_PROPERTY: 'additional_property',
  MIN_ITEMS: 'min_items',
  MAX_ITEMS: 'max_items',
  UNIQUE_ITEMS: 'unique_items',
  INJECTION_DETECTED: 'injection_detected',
  XSS_DETECTED: 'xss_detected',
  PATH_TRAVERSAL_DETECTED: 'path_traversal_detected',
  MAX_DEPTH_EXCEEDED: 'max_depth_exceeded'
};

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\s|^)(union|select|insert|update|delete|drop|truncate|exec|execute)(\s|$)/i,
  /(\s|^)(or|and)\s+[\d'"]+=[\d'"]/i,
  /['"]\s*(;|--)/i,
  /\b(waitfor|benchmark|sleep)\s*\(/i
];

// XSS patterns
const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on(load|error|click|mouse|focus|blur|change|submit)\s*=/i,
  /<(iframe|object|embed|applet|form|meta|link|style|base)/i,
  /<svg[^>]*onload/i
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /\.\.%2f/i,
  /\.\.%5c/i,
  /%2e%2e%2f/i,
  /%2e%2e%5c/i,
  /^\/etc\//i,
  /^\/var\//i,
  /^c:\\windows/i
];

/**
 * ValidationError class for structured error reporting
 */
export class ValidationError {
  constructor(field, code, message, extra = {}) {
    this.field = field;
    this.code = code;
    this.message = message;
    Object.assign(this, extra);
  }

  toJSON() {
    const result = {
      field: this.field,
      code: this.code,
      message: this.message
    };

    // Include extra properties
    for (const key of Object.keys(this)) {
      if (!['field', 'code', 'message'].includes(key)) {
        result[key] = this[key];
      }
    }

    return result;
  }
}

/**
 * Get the type of a value (with array distinction)
 */
function getType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Check if value matches expected type
 */
function checkType(value, expectedType) {
  const actualType = getType(value);

  switch (expectedType) {
    case 'string':
      return actualType === 'string';
    case 'number':
      return actualType === 'number' && !isNaN(value) && isFinite(value);
    case 'integer':
      return actualType === 'number' && !isNaN(value) && isFinite(value) && Number.isInteger(value);
    case 'boolean':
      return actualType === 'boolean';
    case 'array':
      return actualType === 'array';
    case 'object':
      return actualType === 'object' && !Array.isArray(value) && value !== null;
    default:
      return true;
  }
}

/**
 * Check for SQL injection patterns
 */
function detectSQLInjection(value) {
  if (typeof value !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Check for XSS patterns
 */
function detectXSS(value) {
  if (typeof value !== 'string') return false;
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Check for path traversal patterns
 */
function detectPathTraversal(value) {
  if (typeof value !== 'string') return false;
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Calculate the depth of nested structures
 */
function calculateDepth(value, currentDepth = 0) {
  if (currentDepth > 100) return currentDepth; // Safety limit

  if (Array.isArray(value)) {
    let maxChildDepth = currentDepth;
    for (const item of value) {
      const childDepth = calculateDepth(item, currentDepth + 1);
      if (childDepth > maxChildDepth) maxChildDepth = childDepth;
    }
    return maxChildDepth;
  }

  if (typeof value === 'object' && value !== null) {
    let maxChildDepth = currentDepth;
    for (const key of Object.keys(value)) {
      const childDepth = calculateDepth(value[key], currentDepth + 1);
      if (childDepth > maxChildDepth) maxChildDepth = childDepth;
    }
    return maxChildDepth;
  }

  return currentDepth;
}

/**
 * Validate a value against a schema
 *
 * @param {any} data - The data to validate
 * @param {Object} schema - The validation schema
 * @param {Object} options - Validation options
 * @param {string} path - Current field path (for nested validation)
 * @returns {Object} { valid: boolean, errors: ValidationError[] }
 */
export function validateSchema(data, schema, options = {}, path = '') {
  const errors = [];

  const {
    detectInjection = false,
    detectXSS: checkXSS = false,
    detectPathTraversal: checkPathTraversal = false,
    maxDepth = 20
  } = options;

  // Check max depth for arrays/objects
  if (maxDepth && (Array.isArray(data) || (typeof data === 'object' && data !== null))) {
    const depth = calculateDepth(data);
    if (depth > maxDepth) {
      errors.push(new ValidationError(
        path || 'root',
        VALIDATION_ERRORS.MAX_DEPTH_EXCEEDED,
        `Nesting depth ${depth} exceeds maximum of ${maxDepth}`,
        { maxDepth, actualDepth: depth }
      ));
      return { valid: false, errors };
    }
  }

  // Handle object validation
  if (schema.type === 'object') {
    // Check if data is an object
    if (!checkType(data, 'object')) {
      errors.push(new ValidationError(
        path || 'root',
        VALIDATION_ERRORS.INVALID_TYPE,
        `Expected object but received ${getType(data)}`,
        { expected: 'object', received: getType(data) }
      ));
      return { valid: false, errors };
    }

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (data[field] === undefined || data[field] === null) {
          const fieldPath = path ? `${path}.${field}` : field;
          errors.push(new ValidationError(
            fieldPath,
            VALIDATION_ERRORS.REQUIRED,
            `Field '${field}' is required`
          ));
        }
      }
    }

    // Check for additional properties (strict mode)
    if (schema.additionalProperties === false && schema.properties) {
      const allowedFields = new Set(Object.keys(schema.properties));
      for (const field of Object.keys(data)) {
        if (!allowedFields.has(field)) {
          const fieldPath = path ? `${path}.${field}` : field;
          errors.push(new ValidationError(
            fieldPath,
            VALIDATION_ERRORS.ADDITIONAL_PROPERTY,
            `Unexpected field '${field}'`,
            { field }
          ));
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        const fieldPath = path ? `${path}.${field}` : field;
        const value = data[field];

        // Skip undefined optional fields
        if (value === undefined) continue;

        // Validate the field
        const fieldResult = validateField(value, fieldSchema, options, fieldPath);
        errors.push(...fieldResult.errors);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a single field against its schema
 */
function validateField(value, schema, options, path) {
  const errors = [];

  const {
    detectInjection = false,
    detectXSS: checkXSS = false,
    detectPathTraversal: checkPathTraversal = false
  } = options;

  // Handle null/undefined
  if (value === null || value === undefined) {
    // Already handled by required check
    return { valid: true, errors };
  }

  // Type validation
  if (schema.type) {
    if (!checkType(value, schema.type)) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.INVALID_TYPE,
        `Expected ${schema.type} but received ${getType(value)}`,
        { expected: schema.type, received: getType(value) }
      ));
      return { valid: false, errors };
    }
  }

  // String validations
  if (schema.type === 'string' && typeof value === 'string') {
    // Security checks
    if (detectInjection && detectSQLInjection(value)) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.INJECTION_DETECTED,
        'Potential SQL injection detected',
        { value: value.substring(0, 50) }
      ));
    }

    if (checkXSS && detectXSS(value)) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.XSS_DETECTED,
        'Potential XSS pattern detected',
        { value: value.substring(0, 50) }
      ));
    }

    if (checkPathTraversal && detectPathTraversal(value)) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.PATH_TRAVERSAL_DETECTED,
        'Potential path traversal detected',
        { value: value.substring(0, 50) }
      ));
    }

    // minLength
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.MIN_LENGTH,
        `String length ${value.length} is less than minimum ${schema.minLength}`,
        { minLength: schema.minLength, actualLength: value.length }
      ));
    }

    // maxLength
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.MAX_LENGTH,
        `String length ${value.length} exceeds maximum ${schema.maxLength}`,
        { maxLength: schema.maxLength, actualLength: value.length }
      ));
    }

    // pattern
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push(new ValidationError(
          path,
          VALIDATION_ERRORS.PATTERN,
          `Value does not match pattern ${schema.pattern}`,
          { pattern: schema.pattern }
        ));
      }
    }

    // enum
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.ENUM,
        `Value '${value}' is not in allowed values`,
        { allowed: schema.enum, received: value }
      ));
    }
  }

  // Number validations
  if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
    // minimum
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.MINIMUM,
        `Value ${value} is less than minimum ${schema.minimum}`,
        { minimum: schema.minimum, received: value }
      ));
    }

    // maximum
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.MAXIMUM,
        `Value ${value} exceeds maximum ${schema.maximum}`,
        { maximum: schema.maximum, received: value }
      ));
    }

    // exclusiveMinimum
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.EXCLUSIVE_MINIMUM,
        `Value ${value} must be greater than ${schema.exclusiveMinimum}`,
        { exclusiveMinimum: schema.exclusiveMinimum, received: value }
      ));
    }

    // exclusiveMaximum
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.EXCLUSIVE_MAXIMUM,
        `Value ${value} must be less than ${schema.exclusiveMaximum}`,
        { exclusiveMaximum: schema.exclusiveMaximum, received: value }
      ));
    }

    // enum for numbers
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.ENUM,
        `Value ${value} is not in allowed values`,
        { allowed: schema.enum, received: value }
      ));
    }
  }

  // Array validations
  if (schema.type === 'array' && Array.isArray(value)) {
    // minItems
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.MIN_ITEMS,
        `Array length ${value.length} is less than minimum ${schema.minItems}`,
        { minItems: schema.minItems, actualItems: value.length }
      ));
    }

    // maxItems
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(new ValidationError(
        path,
        VALIDATION_ERRORS.MAX_ITEMS,
        `Array length ${value.length} exceeds maximum ${schema.maxItems}`,
        { maxItems: schema.maxItems, actualItems: value.length }
      ));
    }

    // uniqueItems
    if (schema.uniqueItems) {
      const seen = new Set();
      let hasDuplicates = false;
      for (const item of value) {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          hasDuplicates = true;
          break;
        }
        seen.add(key);
      }
      if (hasDuplicates) {
        errors.push(new ValidationError(
          path,
          VALIDATION_ERRORS.UNIQUE_ITEMS,
          'Array contains duplicate items',
          {}
        ));
      }
    }

    // items validation
    if (schema.items) {
      value.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        const itemResult = validateField(item, schema.items, options, itemPath);
        errors.push(...itemResult.errors);
      });
    }
  }

  // Nested object validation
  if (schema.type === 'object' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const nestedResult = validateSchema(value, schema, options, path);
    errors.push(...nestedResult.errors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create validation middleware for Express
 *
 * @param {Object} schema - The validation schema
 * @param {Object} options - Middleware options
 * @returns {Function} Express middleware
 */
export function createValidator(schema, options = {}) {
  const {
    source = 'body', // 'body', 'query', or 'params'
    coerce = false,   // Coerce query param types
    detectInjection = true,
    detectXSS = true,
    detectPathTraversal = true
  } = options;

  return (req, res, next) => {
    let data = req[source];

    // Coerce query parameter types if enabled
    if (coerce && source === 'query' && schema.properties) {
      data = coerceQueryParams(data, schema);
      req[source] = data;
    }

    const result = validateSchema(data, schema, {
      detectInjection,
      detectXSS,
      detectPathTraversal
    });

    if (!result.valid) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Input validation failed',
        details: result.errors.map(e => e.toJSON())
      });
    }

    next();
  };
}

/**
 * Coerce query parameter strings to their expected types
 */
function coerceQueryParams(query, schema) {
  if (!schema.properties) return query;

  const coerced = { ...query };

  for (const [field, fieldSchema] of Object.entries(schema.properties)) {
    if (coerced[field] === undefined) continue;

    const value = coerced[field];

    switch (fieldSchema.type) {
      case 'number':
      case 'integer':
        const num = Number(value);
        if (!isNaN(num)) {
          coerced[field] = num;
        }
        break;

      case 'boolean':
        if (value === 'true') coerced[field] = true;
        else if (value === 'false') coerced[field] = false;
        break;

      case 'array':
        if (typeof value === 'string') {
          coerced[field] = value.split(',');
        }
        break;
    }
  }

  return coerced;
}

export default {
  validateSchema,
  createValidator,
  ValidationError,
  VALIDATION_ERRORS
};
