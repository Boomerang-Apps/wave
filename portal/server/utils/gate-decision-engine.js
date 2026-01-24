/**
 * Gate Decision Engine (Grok Recommendation G1.4)
 *
 * Makes Go/Kill/Hold/Recycle decisions at each gate
 * Based on Stage-Gate methodology
 *
 * Reference: https://www.stage-gate.com/blog/the-stage-gate-model-an-overview
 */

import { GATE_STATUSES, GATE_DECISIONS } from './gate-status-types.js';
import { shouldKill, getMaxRetries } from './kill-criteria.js';
import { shouldHold } from './hold-criteria.js';

// ============================================
// Decision Engine
// ============================================

/**
 * Make a gate decision based on validation result and context
 * @param {string} stepId - Step identifier
 * @param {Object} validationResult - Validation result
 * @param {boolean} validationResult.passed - Whether validation passed
 * @param {string[]} validationResult.errors - Error messages
 * @param {string[]} validationResult.warnings - Warning messages
 * @param {number} validationResult.retryCount - Current retry count
 * @param {boolean} [validationResult.requiresRework] - Whether rework is required
 * @param {string} [validationResult.recycleTarget] - Target step for recycle
 * @param {Object} context - Additional context
 * @returns {Object} Decision result
 */
export function makeGateDecision(stepId, validationResult, context) {
  const timestamp = new Date().toISOString();
  const maxRetries = getMaxRetries(stepId);

  // Priority 1: Check for GO (validation passed)
  if (validationResult.passed) {
    // But first check if human review is required
    if (context.requiresHumanReview) {
      return {
        decision: null,
        status: GATE_STATUSES.PENDING_HUMAN_REVIEW,
        timestamp,
        requiresHumanReview: true
      };
    }

    return {
      decision: GATE_DECISIONS.GO,
      status: GATE_STATUSES.READY,
      timestamp
    };
  }

  // Priority 2: Check for KILL conditions
  const killCheck = shouldKill(stepId, validationResult.retryCount, validationResult.errors);
  if (killCheck.kill) {
    return {
      decision: GATE_DECISIONS.KILL,
      status: GATE_STATUSES.KILLED,
      reason: killCheck.reason,
      timestamp
    };
  }

  // Priority 3: Check for HOLD conditions
  const holdCheck = shouldHold(stepId, context);
  if (holdCheck.hold) {
    return {
      decision: GATE_DECISIONS.HOLD,
      status: GATE_STATUSES.HOLD,
      reasons: holdCheck.conditions.map(c => c.message),
      timestamp
    };
  }

  // Priority 4: Check for RECYCLE (rework required)
  if (validationResult.requiresRework && validationResult.recycleTarget) {
    return {
      decision: GATE_DECISIONS.RECYCLE,
      status: GATE_STATUSES.RECYCLE,
      recycleToStep: validationResult.recycleTarget,
      timestamp
    };
  }

  // Priority 5: BLOCKED (can retry)
  const canRetry = validationResult.retryCount < maxRetries;
  return {
    decision: null,
    status: GATE_STATUSES.BLOCKED,
    errors: validationResult.errors,
    canRetry,
    retriesRemaining: maxRetries - validationResult.retryCount,
    timestamp
  };
}

/**
 * Apply a decision to a step
 * @param {string} stepId - Step identifier
 * @param {Object} decision - Decision to apply
 * @returns {Object} Applied result
 */
export function applyDecision(stepId, decision) {
  const appliedAt = new Date().toISOString();

  return {
    stepId,
    status: decision.status,
    decision: decision.decision,
    reason: decision.reason,
    applied: true,
    appliedAt
  };
}

/**
 * Get decision history for a step
 * @param {string} stepId - Step identifier
 * @param {Object} state - State containing decision history
 * @returns {Array} Array of decisions
 */
export function getDecisionHistory(stepId, state) {
  if (!state || !state.decisionHistory || !state.decisionHistory[stepId]) {
    return [];
  }

  return state.decisionHistory[stepId];
}

/**
 * Validate a decision object
 * @param {Object} decision - Decision to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateDecision(decision) {
  const errors = [];

  // Check required fields
  if (!decision.decision && decision.status !== GATE_STATUSES.BLOCKED &&
      decision.status !== GATE_STATUSES.PENDING_HUMAN_REVIEW) {
    errors.push('Missing decision field');
  }

  if (!decision.timestamp) {
    errors.push('Missing timestamp field');
  }

  // Check decision-status consistency
  if (decision.decision && decision.status) {
    const validCombinations = {
      [GATE_DECISIONS.GO]: GATE_STATUSES.READY,
      [GATE_DECISIONS.KILL]: GATE_STATUSES.KILLED,
      [GATE_DECISIONS.HOLD]: GATE_STATUSES.HOLD,
      [GATE_DECISIONS.RECYCLE]: GATE_STATUSES.RECYCLE
    };

    const expectedStatus = validCombinations[decision.decision];
    if (expectedStatus && decision.status !== expectedStatus) {
      errors.push(`Decision ${decision.decision} should have status ${expectedStatus}, got ${decision.status}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default makeGateDecision;
