/**
 * Rollback Engine (Grok Recommendation G6.2)
 *
 * Handles reverting gate status when failures occur
 */

// ============================================
// Rollback Constants
// ============================================

/**
 * Triggers that can initiate a rollback
 */
export const ROLLBACK_TRIGGERS = {
  VALIDATION_FAILURE_AFTER_PASS: 'validation_failure_after_pass',
  DEPENDENT_GATE_FAILED: 'dependent_gate_failed',
  HUMAN_REQUESTED: 'human_requested',
  SECURITY_VIOLATION: 'security_violation',
  BUDGET_EXCEEDED: 'budget_exceeded'
};

/**
 * States that can be rolled back from
 */
const ROLLBACKABLE_STATES = ['ready', 'hold', 'pending_human_review'];

/**
 * Step dependency map for cascade rollbacks
 */
const STEP_DEPENDENCIES = {
  'mockup-design': [
    'project-overview', 'execution-plan', 'system-config', 'infrastructure',
    'compliance-safety', 'rlm-protocol', 'notifications', 'build-qa', 'agent-dispatch'
  ],
  'project-overview': [
    'execution-plan', 'system-config', 'infrastructure',
    'compliance-safety', 'rlm-protocol', 'notifications', 'build-qa', 'agent-dispatch'
  ],
  'execution-plan': [
    'system-config', 'infrastructure', 'compliance-safety',
    'rlm-protocol', 'notifications', 'build-qa', 'agent-dispatch'
  ],
  'system-config': [
    'infrastructure', 'compliance-safety', 'rlm-protocol',
    'notifications', 'build-qa', 'agent-dispatch'
  ],
  'infrastructure': [
    'compliance-safety', 'rlm-protocol', 'notifications', 'build-qa', 'agent-dispatch'
  ],
  'compliance-safety': [
    'rlm-protocol', 'notifications', 'build-qa', 'agent-dispatch'
  ],
  'rlm-protocol': [
    'notifications', 'build-qa', 'agent-dispatch'
  ],
  'notifications': [
    'build-qa', 'agent-dispatch'
  ],
  'build-qa': [
    'agent-dispatch'
  ],
  'agent-dispatch': []
};

// ============================================
// Rollback Functions
// ============================================

/**
 * Check if a step can be rolled back
 * @param {string} stepId - Step identifier
 * @param {string} currentStatus - Current status
 * @returns {boolean}
 */
export function canRollback(stepId, currentStatus) {
  return ROLLBACKABLE_STATES.includes(currentStatus);
}

/**
 * Create a rollback request
 * @param {string} stepId - Step to rollback
 * @param {string} trigger - Rollback trigger
 * @param {Object} context - Context
 * @returns {Object} Rollback request
 */
export function createRollbackRequest(stepId, trigger, context) {
  return {
    id: `rb-${stepId}-${Date.now()}`,
    stepId,
    trigger,
    fromStatus: context.currentStatus,
    toStatus: 'idle',
    requestedBy: context.requestedBy,
    requestedAt: new Date().toISOString(),
    reason: context.reason,
    affectedSteps: getAffectedSteps(stepId)
  };
}

/**
 * Execute a rollback
 * @param {Object} rollbackRequest - Rollback request
 * @returns {Object} Rollback result
 */
export function executeRollback(rollbackRequest) {
  const { stepId, affectedSteps } = rollbackRequest;
  const results = [];

  // Rollback the requested step
  results.push({
    stepId,
    action: 'rollback',
    newStatus: 'idle',
    success: true
  });

  // Cascade rollback to affected steps
  for (const affectedStep of affectedSteps) {
    results.push({
      stepId: affectedStep,
      action: 'cascade_rollback',
      newStatus: 'blocked',
      success: true,
      reason: `Dependency ${stepId} rolled back`
    });
  }

  return {
    rollbackId: rollbackRequest.id,
    results,
    completedAt: new Date().toISOString()
  };
}

/**
 * Get steps affected by rolling back a step
 * @param {string} stepId - Step being rolled back
 * @returns {string[]} Affected step IDs
 */
export function getAffectedSteps(stepId) {
  return STEP_DEPENDENCIES[stepId] || [];
}

export default executeRollback;
