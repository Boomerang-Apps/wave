/**
 * Mockup Validation Types Module (Launch Sequence)
 *
 * Phase 2, Step 2.1: Mockup Validation Types
 *
 * Type definitions and validation helpers for mockup validation
 * in Step 0 of the launch sequence.
 */

// ============================================
// Status Constants
// ============================================

/**
 * Valid statuses for individual mockup checks
 * @type {readonly ['pass', 'fail', 'warn']}
 */
export const MOCKUP_CHECK_STATUSES = Object.freeze(['pass', 'fail', 'warn']);

/**
 * Valid statuses for overall mockup validation
 * @type {readonly ['idle', 'ready', 'blocked']}
 */
export const MOCKUP_VALIDATION_STATUSES = Object.freeze(['idle', 'ready', 'blocked']);

// ============================================
// Type Definitions (JSDoc)
// ============================================

/**
 * @typedef {'pass' | 'fail' | 'warn'} MockupCheckStatus
 */

/**
 * @typedef {'idle' | 'ready' | 'blocked'} MockupValidationStatus
 */

/**
 * @typedef {Object} MockupCheck
 * @property {string} name - Name of the check
 * @property {MockupCheckStatus} status - Check result status
 * @property {string} message - Human-readable result message
 * @property {Object} [details] - Optional additional details
 */

/**
 * @typedef {Object} MockupScreen
 * @property {string} path - Full path to the mockup file
 * @property {string} name - File name
 */

/**
 * @typedef {Object} MockupValidationResult
 * @property {MockupValidationStatus} status - Overall validation status
 * @property {MockupCheck[]} checks - Array of individual checks
 * @property {MockupScreen[]} screens - Array of detected screens
 * @property {string} timestamp - ISO timestamp of validation
 */

// ============================================
// Factory Functions
// ============================================

/**
 * Create a MockupCheck object
 * @param {string} name - Name of the check
 * @param {MockupCheckStatus} status - Check result status
 * @param {string} message - Human-readable result message
 * @param {Object} [details] - Optional additional details
 * @returns {MockupCheck}
 */
export function createMockupCheck(name, status, message, details = undefined) {
  const check = {
    name,
    status,
    message
  };

  if (details !== undefined) {
    check.details = details;
  }

  return check;
}

/**
 * Create a MockupValidationResult object
 * @param {MockupValidationStatus} status - Overall validation status
 * @param {MockupCheck[]} checks - Array of individual checks
 * @param {MockupScreen[]} screens - Array of detected screens
 * @returns {MockupValidationResult}
 */
export function createMockupValidationResult(status, checks, screens) {
  return {
    status,
    checks,
    screens,
    timestamp: new Date().toISOString()
  };
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a MockupCheck object
 * @param {unknown} obj - Object to validate
 * @returns {boolean} True if valid MockupCheck
 */
export function isValidMockupCheck(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return false;
  }

  const check = obj;

  // Check required fields
  if (typeof check.name !== 'string') {
    return false;
  }
  if (typeof check.status !== 'string') {
    return false;
  }
  if (typeof check.message !== 'string') {
    return false;
  }

  // Validate status value
  if (!MOCKUP_CHECK_STATUSES.includes(check.status)) {
    return false;
  }

  return true;
}

/**
 * Validate a MockupValidationResult object
 * @param {unknown} obj - Object to validate
 * @returns {boolean} True if valid MockupValidationResult
 */
export function isValidMockupValidationResult(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return false;
  }

  const result = obj;

  // Check required fields
  if (typeof result.status !== 'string') {
    return false;
  }
  if (!MOCKUP_VALIDATION_STATUSES.includes(result.status)) {
    return false;
  }
  if (!Array.isArray(result.checks)) {
    return false;
  }
  if (!Array.isArray(result.screens)) {
    return false;
  }

  return true;
}

export default {
  MOCKUP_CHECK_STATUSES,
  MOCKUP_VALIDATION_STATUSES,
  createMockupCheck,
  createMockupValidationResult,
  isValidMockupCheck,
  isValidMockupValidationResult
};
