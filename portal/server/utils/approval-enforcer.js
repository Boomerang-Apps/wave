/**
 * Approval Enforcer Utility (GAP-008)
 *
 * Enforces approval levels (L0-L5) for operations in the WAVE framework.
 * Operations requiring human approval (L1), CTO approval (L2), PM approval (L3),
 * or QA review (L4) are blocked until appropriate approval signals exist.
 *
 * Based on:
 * - NIST SP 800-53 Access Control (AC-2, AC-3, AC-5, AC-6)
 * - RBAC Best Practices
 * - WAVE APPROVAL-LEVELS.md Specification
 *
 * @see https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
 */

import fs from 'fs';
import path from 'path';

// Approval levels
export const APPROVAL_LEVELS = {
  L0: 'FORBIDDEN',
  L1: 'HUMAN_ONLY',
  L2: 'CTO_APPROVAL',
  L3: 'PM_APPROVAL',
  L4: 'QA_REVIEW',
  L5: 'AUTO_ALLOWED'
};

// Error codes
export const APPROVAL_ENFORCER_ERRORS = {
  APPROVAL_REQUIRED: 'approval_required',
  APPROVAL_EXPIRED: 'approval_expired',
  FORBIDDEN_OPERATION: 'forbidden_operation',
  SEPARATION_OF_DUTIES_VIOLATION: 'separation_of_duties_violation',
  INVALID_APPROVAL: 'invalid_approval'
};

// Operation classifications by approval level
const L0_OPERATIONS = new Set([
  'DROP_DATABASE',
  'rm_rf_root',
  'git_push_force_main',
  'sudo',
  'shutdown',
  'npm_publish',
  'delete_all_data',
  'expose_secrets'
]);

const L1_OPERATIONS = new Set([
  'merge_to_main',
  'database_migration',
  'create_api_endpoint',
  'add_dependency',
  'modify_security_config',
  'update_production_env',
  'create_cloud_resources',
  'delete_production_data',
  'modify_cicd_pipeline',
  'update_ssl_certificates'
]);

const L2_OPERATIONS = new Set([
  'create_module',
  'modify_shared_interface',
  'add_database_table',
  'change_api_response_format',
  'introduce_new_pattern',
  'add_tech_stack_component',
  'resolve_escalation'
]);

const L3_OPERATIONS = new Set([
  'assign_story',
  'approve_gate_transition',
  'approve_merge_readiness',
  'reassign_blocked_story',
  'approve_retry_allocation',
  'coordinate_cross_domain',
  'approve_story_completion',
  'request_wave_status_change'
]);

const L4_OPERATIONS = new Set([
  'approve_code_review',
  'run_test_suite',
  'check_lint_compliance',
  'verify_acceptance_criteria',
  'approve_minor_changes',
  'verify_bug_fixes'
]);

const L5_OPERATIONS = new Set([
  'read_file',
  'write_file_in_domain',
  'run_npm_install',
  'run_npm_build',
  'run_npm_test',
  'run_npm_lint',
  'git_commit_feature_branch',
  'git_push_feature_branch',
  'create_signal_file',
  'log_to_console',
  'create_tests'
]);

/**
 * Get the approval level required for an operation
 *
 * @param {string} operation - Operation name
 * @returns {string} Approval level (L0-L5)
 */
export function getApprovalLevel(operation) {
  if (!operation || typeof operation !== 'string') {
    return APPROVAL_LEVELS.L1; // Safe default
  }

  const normalizedOp = operation.toLowerCase();

  // Check L0 first (forbidden)
  if (L0_OPERATIONS.has(operation) || L0_OPERATIONS.has(normalizedOp)) {
    return APPROVAL_LEVELS.L0;
  }

  // Check L5 (auto-allowed)
  if (L5_OPERATIONS.has(operation) || L5_OPERATIONS.has(normalizedOp)) {
    return APPROVAL_LEVELS.L5;
  }

  // Check L4 (QA review)
  if (L4_OPERATIONS.has(operation) || L4_OPERATIONS.has(normalizedOp)) {
    return APPROVAL_LEVELS.L4;
  }

  // Check L3 (PM approval)
  if (L3_OPERATIONS.has(operation) || L3_OPERATIONS.has(normalizedOp)) {
    return APPROVAL_LEVELS.L3;
  }

  // Check L2 (CTO approval)
  if (L2_OPERATIONS.has(operation) || L2_OPERATIONS.has(normalizedOp)) {
    return APPROVAL_LEVELS.L2;
  }

  // Check L1 (human approval)
  if (L1_OPERATIONS.has(operation) || L1_OPERATIONS.has(normalizedOp)) {
    return APPROVAL_LEVELS.L1;
  }

  // Default: Unknown operations require human approval (safe default)
  return APPROVAL_LEVELS.L1;
}

/**
 * Get the signal file pattern for an approval level
 *
 * @param {number} wave - Wave number
 * @param {string} level - Approval level
 * @returns {string} Signal file pattern
 */
function getApprovalSignalPattern(wave, level) {
  switch (level) {
    case APPROVAL_LEVELS.L1:
      return `signal-wave${wave}-L1-APPROVED.json`;
    case APPROVAL_LEVELS.L2:
      return `signal-wave${wave}-L2-CTO-APPROVED.json`;
    case APPROVAL_LEVELS.L3:
      return `signal-wave${wave}-L3-PM-APPROVED.json`;
    case APPROVAL_LEVELS.L4:
      return `signal-wave${wave}-gate4-approved.json`;
    default:
      return null;
  }
}

/**
 * Check if an approval signal exists
 *
 * @param {string} signalDir - Directory containing signal files
 * @param {number} wave - Wave number
 * @param {string} level - Approval level
 * @param {string} operation - Operation name
 * @returns {Object} Result { exists, signalPath, content }
 */
export function checkApprovalExists(signalDir, wave, level, operation) {
  // L5 operations are auto-allowed
  if (level === APPROVAL_LEVELS.L5) {
    return { exists: true, autoAllowed: true };
  }

  // L0 operations are never allowed
  if (level === APPROVAL_LEVELS.L0) {
    return { exists: false, forbidden: true };
  }

  const signalPattern = getApprovalSignalPattern(wave, level);
  if (!signalPattern) {
    return { exists: false };
  }

  const signalPath = path.join(signalDir, signalPattern);

  if (!fs.existsSync(signalPath)) {
    return { exists: false, signalPath };
  }

  try {
    const content = JSON.parse(fs.readFileSync(signalPath, 'utf-8'));
    return { exists: true, signalPath, content };
  } catch (e) {
    return { exists: false, error: 'invalid_signal_format' };
  }
}

/**
 * Validate an approval signal content
 *
 * @param {Object} content - Signal content
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateApprovalContent(content, options = {}) {
  const { timeoutHours = 24, strictOperationMatch = false, expectedOperation = null } = options;

  // Must have approver
  if (!content.approver) {
    return { valid: false, error: 'missing_approver' };
  }

  // Must have timestamp
  if (!content.timestamp) {
    return { valid: false, error: 'missing_timestamp' };
  }

  // Check expiration
  const approvalTime = new Date(content.timestamp).getTime();
  const now = Date.now();
  const timeoutMs = timeoutHours * 60 * 60 * 1000;

  if (now - approvalTime > timeoutMs) {
    return { valid: false, error: APPROVAL_ENFORCER_ERRORS.APPROVAL_EXPIRED };
  }

  // Check operation match if strict
  if (strictOperationMatch && expectedOperation && content.operation !== expectedOperation) {
    return { valid: false, error: 'operation_mismatch' };
  }

  return { valid: true };
}

/**
 * Require approval for an operation
 *
 * @param {string} signalDir - Directory containing signal files
 * @param {number} wave - Wave number
 * @param {string} operation - Operation name
 * @param {Object} options - Options
 * @returns {Object} Result { approved, level, error, message }
 */
export function requireApproval(signalDir, wave, operation, options = {}) {
  const level = getApprovalLevel(operation);

  // L0 operations are always forbidden
  if (level === APPROVAL_LEVELS.L0) {
    return {
      approved: false,
      level,
      error: APPROVAL_ENFORCER_ERRORS.FORBIDDEN_OPERATION,
      message: `Operation '${operation}' is forbidden and cannot be approved`
    };
  }

  // L5 operations are auto-allowed
  if (level === APPROVAL_LEVELS.L5) {
    return {
      approved: true,
      level,
      message: 'Auto-allowed operation'
    };
  }

  // Check for approval signal
  const approvalCheck = checkApprovalExists(signalDir, wave, level, operation);

  if (!approvalCheck.exists) {
    return {
      approved: false,
      level,
      error: APPROVAL_ENFORCER_ERRORS.APPROVAL_REQUIRED,
      message: `Operation '${operation}' requires ${level} approval`
    };
  }

  // Validate approval content
  if (approvalCheck.content) {
    const validation = validateApprovalContent(approvalCheck.content, {
      ...options,
      expectedOperation: operation
    });

    if (!validation.valid) {
      return {
        approved: false,
        level,
        error: validation.error === APPROVAL_ENFORCER_ERRORS.APPROVAL_EXPIRED
          ? APPROVAL_ENFORCER_ERRORS.APPROVAL_EXPIRED
          : APPROVAL_ENFORCER_ERRORS.APPROVAL_REQUIRED,
        message: `Invalid approval: ${validation.error}`
      };
    }
  }

  return {
    approved: true,
    level,
    approver: approvalCheck.content?.approver,
    approvedAt: approvalCheck.content?.timestamp
  };
}

/**
 * Validate a complete approval chain
 *
 * @param {string} signalDir - Directory containing signal files
 * @param {number} wave - Wave number
 * @param {Array} operations - Array of { operation, level } objects
 * @param {Object} options - Validation options
 * @returns {Object} Result { valid, missing, error }
 */
export function validateApprovalChain(signalDir, wave, operations, options = {}) {
  const { enforceSoD = false } = options;
  const missing = [];
  const approvals = [];

  for (const { operation, level } of operations) {
    const approvalCheck = checkApprovalExists(signalDir, wave, level, operation);

    if (!approvalCheck.exists) {
      missing.push(operation);
      continue;
    }

    // Check separation of duties if enabled
    if (enforceSoD && approvalCheck.content) {
      const { approver, requester } = approvalCheck.content;
      if (approver && requester && approver === requester) {
        return {
          valid: false,
          missing: [],
          error: APPROVAL_ENFORCER_ERRORS.SEPARATION_OF_DUTIES_VIOLATION,
          message: `Separation of duties violation: ${requester} cannot approve own request`
        };
      }
    }

    approvals.push({
      operation,
      level,
      approver: approvalCheck.content?.approver,
      timestamp: approvalCheck.content?.timestamp
    });
  }

  return {
    valid: missing.length === 0,
    missing,
    approvals
  };
}

/**
 * Create an approval request signal
 *
 * @param {Object} config - Request configuration
 * @returns {Object} Result { created, signalPath }
 */
export function createApprovalRequest(config) {
  const {
    wave,
    level,
    operation,
    requester,
    description,
    riskLevel = 'medium',
    signalDir
  } = config;

  // Determine signal type based on level
  let signalType;
  let signalFilename;

  switch (level) {
    case APPROVAL_LEVELS.L1:
      signalType = 'L1-APPROVAL-NEEDED';
      signalFilename = `signal-wave${wave}-L1-APPROVAL-NEEDED.json`;
      break;
    case APPROVAL_LEVELS.L2:
      signalType = 'L2-CTO-APPROVAL-NEEDED';
      signalFilename = `signal-wave${wave}-L2-CTO-APPROVAL-NEEDED.json`;
      break;
    case APPROVAL_LEVELS.L3:
      signalType = 'L3-PM-APPROVAL-NEEDED';
      signalFilename = `signal-wave${wave}-L3-PM-APPROVAL-NEEDED.json`;
      break;
    default:
      return { created: false, error: 'invalid_level' };
  }

  const signalContent = {
    signal_type: signalType,
    wave,
    operation,
    description,
    risk_level: riskLevel,
    requester,
    timestamp: new Date().toISOString()
  };

  const signalPath = path.join(signalDir, signalFilename);

  try {
    fs.writeFileSync(signalPath, JSON.stringify(signalContent, null, 2));
    return { created: true, signalPath, content: signalContent };
  } catch (e) {
    return { created: false, error: e.message };
  }
}

/**
 * Create Express middleware for approval enforcement
 *
 * @param {Object} config - Middleware configuration
 * @returns {Function} Express middleware
 */
export function createApprovalEnforcerMiddleware(config = {}) {
  const {
    signalDir,
    addResultToRequest = false,
    onApprovalCheck = null
  } = config;

  return (req, res, next) => {
    const operation = req.body?.operation;
    const wave = req.body?.wave || 1;
    const effectiveSignalDir = req.signalDir || signalDir;

    if (!operation) {
      return next();
    }

    const result = requireApproval(effectiveSignalDir, wave, operation);

    // Add result to request if configured
    if (addResultToRequest) {
      req.approvalResult = result;
    }

    // Call audit callback if provided
    if (onApprovalCheck && typeof onApprovalCheck === 'function') {
      onApprovalCheck({
        operation,
        level: result.level,
        approved: result.approved,
        wave,
        timestamp: new Date().toISOString()
      });
    }

    // If not approved, return error
    if (!result.approved) {
      const statusCode = result.error === APPROVAL_ENFORCER_ERRORS.FORBIDDEN_OPERATION ? 403 : 403;

      return res.status(statusCode).json({
        error: result.error,
        message: result.message,
        level: result.level,
        operation
      });
    }

    next();
  };
}

export default {
  getApprovalLevel,
  requireApproval,
  validateApprovalChain,
  createApprovalRequest,
  checkApprovalExists,
  createApprovalEnforcerMiddleware,
  APPROVAL_LEVELS,
  APPROVAL_ENFORCER_ERRORS
};
