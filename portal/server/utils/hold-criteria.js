/**
 * Hold Criteria (Grok Recommendation G1.3)
 *
 * Defines when to pause (HOLD) a gate for more information
 * Based on Stage-Gate methodology
 *
 * Reference: https://www.stage-gate.com/blog/the-stage-gate-model-an-overview
 */

// ============================================
// Hold Reason Constants
// ============================================

/**
 * Hold reason codes
 */
export const HOLD_REASONS = {
  AWAITING_HUMAN_INPUT: 'awaiting_human_input',
  AWAITING_EXTERNAL_DATA: 'awaiting_external_data',
  DEPENDENCY_NOT_READY: 'dependency_not_ready',
  BUDGET_REVIEW_NEEDED: 'budget_review_needed',
  RISK_ASSESSMENT_NEEDED: 'risk_assessment_needed',
  CLARIFICATION_NEEDED: 'clarification_needed'
};

/**
 * Human-readable descriptions for hold reasons
 */
const HOLD_REASON_DESCRIPTIONS = {
  [HOLD_REASONS.AWAITING_HUMAN_INPUT]: 'Waiting for human decision or input',
  [HOLD_REASONS.AWAITING_EXTERNAL_DATA]: 'Waiting for external data or API response',
  [HOLD_REASONS.DEPENDENCY_NOT_READY]: 'Waiting for dependent step to complete',
  [HOLD_REASONS.BUDGET_REVIEW_NEEDED]: 'Budget review required before proceeding',
  [HOLD_REASONS.RISK_ASSESSMENT_NEEDED]: 'High risk score requires assessment',
  [HOLD_REASONS.CLARIFICATION_NEEDED]: 'Requirements need clarification'
};

/**
 * Expected resolution time per reason (hours)
 */
const EXPECTED_RESOLUTION_HOURS = {
  [HOLD_REASONS.AWAITING_HUMAN_INPUT]: 4,
  [HOLD_REASONS.AWAITING_EXTERNAL_DATA]: 2,
  [HOLD_REASONS.DEPENDENCY_NOT_READY]: 8,
  [HOLD_REASONS.BUDGET_REVIEW_NEEDED]: 24,
  [HOLD_REASONS.RISK_ASSESSMENT_NEEDED]: 24,
  [HOLD_REASONS.CLARIFICATION_NEEDED]: 4
};

// ============================================
// Hold Decision Functions
// ============================================

/**
 * Determine if a step should be held
 * @param {string} stepId - Step identifier
 * @param {Object} context - Current context
 * @returns {{ hold: boolean, conditions: Array<{ reason: string, message: string }> }}
 */
export function shouldHold(stepId, context) {
  const holdConditions = [];

  // Check for missing human input
  if (context.requiresHumanDecision && !context.humanDecisionProvided) {
    holdConditions.push({
      reason: HOLD_REASONS.AWAITING_HUMAN_INPUT,
      message: 'Waiting for human decision on ambiguous requirement'
    });
  }

  // Check for budget concerns (>80% of threshold)
  if (context.estimatedCost && context.budgetThreshold) {
    if (context.estimatedCost > context.budgetThreshold * 0.8) {
      holdConditions.push({
        reason: HOLD_REASONS.BUDGET_REVIEW_NEEDED,
        message: `Estimated cost (${context.estimatedCost}) approaching budget limit`
      });
    }
  }

  // Check for high-risk items (>0.7 score)
  if (context.riskScore !== undefined && context.riskScore > 0.7) {
    holdConditions.push({
      reason: HOLD_REASONS.RISK_ASSESSMENT_NEEDED,
      message: `High risk score (${context.riskScore}) requires review`
    });
  }

  // Check for external data dependency
  if (context.awaitingExternalData) {
    holdConditions.push({
      reason: HOLD_REASONS.AWAITING_EXTERNAL_DATA,
      message: 'Waiting for external data or API response'
    });
  }

  // Check for dependency not ready
  if (context.dependencyBlocked) {
    holdConditions.push({
      reason: HOLD_REASONS.DEPENDENCY_NOT_READY,
      message: `Waiting for ${context.blockedDependency || 'dependency'} to complete`
    });
  }

  // Check for clarification needed
  if (context.requiresClarification) {
    holdConditions.push({
      reason: HOLD_REASONS.CLARIFICATION_NEEDED,
      message: 'Requirements need clarification before proceeding'
    });
  }

  return {
    hold: holdConditions.length > 0,
    conditions: holdConditions
  };
}

/**
 * Get human-readable description for a hold reason
 * @param {string} reasonCode - Hold reason code
 * @returns {string}
 */
export function getHoldReason(reasonCode) {
  return HOLD_REASON_DESCRIPTIONS[reasonCode] || 'On hold for review';
}

/**
 * Check if hold can be resumed
 * @param {Array<{ reason: string }>} holdConditions - Current hold conditions
 * @param {Object} context - Updated context
 * @returns {{ canResume: boolean, remainingBlockers: Array }}
 */
export function canResumeFromHold(holdConditions, context) {
  const remainingBlockers = [];

  for (const condition of holdConditions) {
    let resolved = false;

    switch (condition.reason) {
      case HOLD_REASONS.AWAITING_HUMAN_INPUT:
        resolved = context.humanDecisionProvided === true;
        break;

      case HOLD_REASONS.AWAITING_EXTERNAL_DATA:
        resolved = context.externalDataReceived === true;
        break;

      case HOLD_REASONS.DEPENDENCY_NOT_READY:
        resolved = context.dependencyReady === true;
        break;

      case HOLD_REASONS.BUDGET_REVIEW_NEEDED:
        resolved = context.budgetApproved === true;
        break;

      case HOLD_REASONS.RISK_ASSESSMENT_NEEDED:
        resolved = context.riskAssessed === true;
        break;

      case HOLD_REASONS.CLARIFICATION_NEEDED:
        resolved = context.clarificationProvided === true;
        break;

      default:
        resolved = false;
    }

    if (!resolved) {
      remainingBlockers.push(condition);
    }
  }

  return {
    canResume: remainingBlockers.length === 0,
    remainingBlockers
  };
}

/**
 * Create a hold context object
 * @param {string} stepId - Step identifier
 * @param {Array<{ reason: string, message: string }>} conditions - Hold conditions
 * @returns {Object}
 */
export function createHoldContext(stepId, conditions) {
  // Calculate expected resolution time
  let maxResolutionHours = 0;
  for (const condition of conditions) {
    const hours = EXPECTED_RESOLUTION_HOURS[condition.reason] || 4;
    if (hours > maxResolutionHours) {
      maxResolutionHours = hours;
    }
  }

  return {
    stepId,
    status: 'hold',
    conditions,
    heldAt: new Date().toISOString(),
    expectedResolutionHours: maxResolutionHours || 4
  };
}

export default shouldHold;
