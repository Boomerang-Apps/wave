/**
 * Signal Schema Validator (GAP-014)
 *
 * Validates WAVE signal file content against JSON schemas.
 * Ensures all required fields, token_usage, and type constraints are met.
 *
 * Based on:
 * - Ajv JSON Schema Validator (https://ajv.js.org/)
 * - WAVE Signal Schemas (.claudecode/signals/SCHEMAS.md)
 *
 * @see https://ajv.js.org/guide/getting-started.html
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

// Schema version
export const SCHEMA_VERSION = '1.0.0';

// Signal types supported
export const SIGNAL_TYPES = [
  'gate3-complete',
  'gate4-approved',
  'gate4-rejected',
  'gate4.5-retry',
  'gate4.5-fixed',
  'gate7-merge-approved',
  'escalation'
];

// Initialize Ajv with all errors mode
const ajv = new Ajv({
  allErrors: true,
  strict: true,
  strictTypes: true,
  strictRequired: true
});
addFormats(ajv);

// ============================================
// Common Schema Definitions
// ============================================

const tokenUsageSchema = {
  type: 'object',
  required: ['input_tokens', 'output_tokens', 'total_tokens', 'estimated_cost_usd', 'model'],
  properties: {
    input_tokens: { type: 'integer', minimum: 0 },
    output_tokens: { type: 'integer', minimum: 0 },
    total_tokens: { type: 'integer', minimum: 0 },
    estimated_cost_usd: { type: 'number', minimum: 0 },
    model: { type: 'string', minLength: 1 }
  },
  additionalProperties: false
};

// ============================================
// Signal Type Schemas
// ============================================

const schemas = {
  'gate3-complete': {
    type: 'object',
    required: ['wave', 'gate', 'agent', 'story_id', 'status', 'files_created', 'files_modified', 'tests_passed', 'token_usage', 'timestamp'],
    properties: {
      wave: { type: 'integer', minimum: 1 },
      gate: { type: 'integer', const: 3 },
      agent: { type: 'string', minLength: 1 },
      story_id: { type: 'string', minLength: 1 },
      status: { type: 'string', enum: ['COMPLETE'] },
      files_created: { type: 'array', items: { type: 'string' } },
      files_modified: { type: 'array', items: { type: 'string' } },
      tests_passed: { type: 'boolean' },
      token_usage: tokenUsageSchema,
      timestamp: { type: 'string', format: 'date-time' }
    },
    additionalProperties: true
  },

  'gate4-approved': {
    type: 'object',
    required: ['wave', 'gate', 'decision', 'rejection_count', 'validations', 'token_usage', 'agent', 'timestamp'],
    properties: {
      wave: { type: 'integer', minimum: 1 },
      gate: { type: 'integer', const: 4 },
      decision: { type: 'string', enum: ['APPROVED'] },
      rejection_count: { type: 'integer', minimum: 0 },
      validations: { type: 'object' },
      acceptance_criteria: { type: 'object' },
      token_usage: tokenUsageSchema,
      agent: { type: 'string', minLength: 1 },
      timestamp: { type: 'string', format: 'date-time' }
    },
    additionalProperties: true
  },

  'gate4-rejected': {
    type: 'object',
    required: ['wave', 'gate', 'decision', 'rejection_count', 'max_retries', 'validations', 'issues', 'return_to_gate', 'token_usage', 'agent', 'timestamp'],
    properties: {
      wave: { type: 'integer', minimum: 1 },
      gate: { type: 'integer', const: 4 },
      decision: { type: 'string', enum: ['REJECTED'] },
      rejection_count: { type: 'integer', minimum: 1 },
      max_retries: { type: 'integer', minimum: 1 },
      validations: { type: 'object' },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'severity', 'description'],
          properties: {
            id: { type: 'string' },
            severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
            category: { type: 'string' },
            file: { type: 'string' },
            line: { type: 'integer' },
            description: { type: 'string' },
            error_message: { type: 'string' },
            suggested_fix: { type: 'string' }
          }
        }
      },
      return_to_gate: { type: 'integer' },
      token_usage: tokenUsageSchema,
      agent: { type: 'string', minLength: 1 },
      timestamp: { type: 'string', format: 'date-time' }
    },
    additionalProperties: true
  },

  'gate4.5-retry': {
    type: 'object',
    required: ['wave', 'gate', 'action', 'retry_count', 'max_retries', 'issues_file', 'trigger', 'timestamp'],
    properties: {
      wave: { type: 'integer', minimum: 1 },
      gate: { type: 'string', const: '4.5' },
      action: { type: 'string', enum: ['DEV_FIX'] },
      retry_count: { type: 'integer', minimum: 1 },
      max_retries: { type: 'integer', minimum: 1 },
      issues_file: { type: 'string', minLength: 1 },
      trigger: { type: 'string', minLength: 1 },
      timestamp: { type: 'string', format: 'date-time' }
    },
    additionalProperties: true
  },

  'gate4.5-fixed': {
    type: 'object',
    required: ['wave', 'gate', 'status', 'retry_count', 'issues_fixed', 'issues_remaining', 'changes_made', 'tests_passed', 'build_passed', 'token_usage', 'agent', 'timestamp'],
    properties: {
      wave: { type: 'integer', minimum: 1 },
      gate: { type: 'string', const: '4.5' },
      status: { type: 'string', enum: ['FIXED'] },
      retry_count: { type: 'integer', minimum: 1 },
      issues_fixed: { type: 'array', items: { type: 'string' } },
      issues_remaining: { type: 'array', items: { type: 'string' } },
      changes_made: {
        type: 'array',
        items: {
          type: 'object',
          required: ['file', 'action', 'description'],
          properties: {
            file: { type: 'string' },
            action: { type: 'string' },
            description: { type: 'string' }
          }
        }
      },
      tests_passed: { type: 'boolean' },
      build_passed: { type: 'boolean' },
      token_usage: tokenUsageSchema,
      agent: { type: 'string', minLength: 1 },
      timestamp: { type: 'string', format: 'date-time' }
    },
    additionalProperties: true
  },

  'gate7-merge-approved': {
    type: 'object',
    required: ['wave', 'gate', 'status', 'approver', 'stories_included', 'total_cost', 'timestamp'],
    properties: {
      wave: { type: 'integer', minimum: 1 },
      gate: { type: 'integer', const: 7 },
      status: { type: 'string', enum: ['APPROVED'] },
      approver: { type: 'string', minLength: 1 },
      stories_included: { type: 'array', items: { type: 'string' }, minItems: 1 },
      total_cost: { type: 'number', minimum: 0 },
      timestamp: { type: 'string', format: 'date-time' }
    },
    additionalProperties: true
  },

  'escalation': {
    type: 'object',
    required: ['wave', 'type', 'reason', 'requires', 'timestamp'],
    properties: {
      wave: { type: 'integer', minimum: 1 },
      type: { type: 'string', enum: ['ESCALATION'] },
      reason: { type: 'string', minLength: 1 },
      rejection_count: { type: 'integer', minimum: 0 },
      max_retries: { type: 'integer', minimum: 1 },
      history: {
        type: 'array',
        items: {
          type: 'object',
          required: ['attempt', 'timestamp', 'issues'],
          properties: {
            attempt: { type: 'integer' },
            timestamp: { type: 'string' },
            issues: { type: 'integer' }
          }
        }
      },
      unresolved_issues: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'severity', 'description'],
          properties: {
            id: { type: 'string' },
            severity: { type: 'string' },
            description: { type: 'string' }
          }
        }
      },
      requires: { type: 'string', enum: ['HUMAN_INTERVENTION'] },
      suggested_actions: { type: 'array', items: { type: 'string' } },
      timestamp: { type: 'string', format: 'date-time' }
    },
    additionalProperties: true
  }
};

// Compile all schemas
const compiledSchemas = {};
for (const [type, schema] of Object.entries(schemas)) {
  compiledSchemas[type] = ajv.compile(schema);
}

// ============================================
// Signal Type Detection
// ============================================

// Filename patterns for signal type detection
const signalPatterns = [
  { pattern: /^signal-wave\d+-gate3-(fe|be)-complete\.json$/, type: 'gate3-complete' },
  { pattern: /^signal-wave\d+-gate4-approved\.json$/, type: 'gate4-approved' },
  { pattern: /^signal-wave\d+-gate4-rejected\.json$/, type: 'gate4-rejected' },
  { pattern: /^signal-wave\d+-gate4\.5-retry\.json$/, type: 'gate4.5-retry' },
  { pattern: /^signal-wave\d+-gate4\.5-fixed\.json$/, type: 'gate4.5-fixed' },
  { pattern: /^signal-wave\d+-gate7-merge-approved\.json$/, type: 'gate7-merge-approved' },
  { pattern: /^signal-wave\d+-ESCALATION\.json$/, type: 'escalation' }
];

/**
 * Detect signal type from filename
 *
 * @param {string} filename - Signal filename
 * @returns {string|null} Signal type or null
 */
export function getSignalType(filename) {
  const basename = path.basename(filename);

  for (const { pattern, type } of signalPatterns) {
    if (pattern.test(basename)) {
      return type;
    }
  }

  return null;
}

/**
 * Get compiled schema for a signal type
 *
 * @param {string} signalType - Signal type
 * @returns {Function|null} Compiled validator or null
 */
export function getSchema(signalType) {
  return compiledSchemas[signalType] || null;
}

// ============================================
// Validation Functions
// ============================================

/**
 * Format Ajv errors into a structured array
 *
 * @param {Array} errors - Ajv error objects
 * @returns {Array} Formatted errors
 */
function formatErrors(errors) {
  if (!errors) return [];

  return errors.map(err => {
    let field;

    if (err.keyword === 'required' && err.params?.missingProperty) {
      // For missing required properties, combine path with property name
      const basePath = err.instancePath ? err.instancePath.replace(/^\//, '').replace(/\//g, '.') : '';
      field = basePath ? `${basePath}.${err.params.missingProperty}` : err.params.missingProperty;
    } else {
      // For other errors, use instancePath
      field = err.instancePath ? err.instancePath.replace(/^\//, '').replace(/\//g, '.') : 'root';
    }

    return {
      field: field || 'unknown',
      message: err.message,
      keyword: err.keyword,
      params: err.params
    };
  });
}

/**
 * Validate a signal object against its schema
 *
 * @param {Object} signal - Signal data
 * @param {string} signalType - Signal type
 * @returns {Object} Validation result { valid, errors, schemaVersion }
 */
export function validateSignal(signal, signalType) {
  const validate = compiledSchemas[signalType];

  if (!validate) {
    return {
      valid: false,
      errors: [{ field: 'signalType', message: `Unknown signal type: ${signalType}` }],
      schemaVersion: SCHEMA_VERSION
    };
  }

  const valid = validate(signal);

  return {
    valid,
    errors: valid ? [] : formatErrors(validate.errors),
    schemaVersion: SCHEMA_VERSION
  };
}

/**
 * Validate a signal file
 *
 * @param {string} filepath - Path to signal file
 * @returns {Object} Validation result
 */
export function validateSignalFile(filepath) {
  // Check file exists
  if (!fs.existsSync(filepath)) {
    return {
      valid: false,
      error: `File not found: ${filepath}`,
      schemaVersion: SCHEMA_VERSION
    };
  }

  // Detect signal type from filename
  const signalType = getSignalType(filepath);
  if (!signalType) {
    return {
      valid: false,
      error: `Unknown signal type for file: ${path.basename(filepath)}`,
      schemaVersion: SCHEMA_VERSION
    };
  }

  // Read and parse file
  let signal;
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    signal = JSON.parse(content);
  } catch (e) {
    return {
      valid: false,
      error: `Failed to parse JSON: ${e.message}`,
      schemaVersion: SCHEMA_VERSION
    };
  }

  // Validate
  const result = validateSignal(signal, signalType);

  return {
    ...result,
    filepath,
    signalType
  };
}

/**
 * Validate all signals in a directory
 *
 * @param {string} dirPath - Path to .claude directory
 * @returns {Object} Validation results
 */
export function validateAllSignals(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return {
      valid: false,
      error: `Directory not found: ${dirPath}`,
      results: []
    };
  }

  const files = fs.readdirSync(dirPath).filter(f => f.startsWith('signal-') && f.endsWith('.json'));
  const results = [];
  let allValid = true;

  for (const file of files) {
    const filepath = path.join(dirPath, file);
    const result = validateSignalFile(filepath);
    results.push(result);

    if (!result.valid) {
      allValid = false;
    }
  }

  return {
    valid: allValid,
    total: files.length,
    passed: results.filter(r => r.valid).length,
    failed: results.filter(r => !r.valid).length,
    results,
    schemaVersion: SCHEMA_VERSION
  };
}

export default {
  validateSignal,
  validateSignalFile,
  validateAllSignals,
  getSignalType,
  getSchema,
  SCHEMA_VERSION,
  SIGNAL_TYPES
};
