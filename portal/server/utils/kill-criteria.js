/**
 * Kill Criteria (Grok Recommendation G1.2)
 *
 * Defines when to abandon (KILL) a gate/story
 * Based on Stage-Gate methodology
 *
 * Reference: https://www.stage-gate.com/blog/the-stage-gate-model-an-overview
 */

// ============================================
// Kill Criteria Definitions
// ============================================

/**
 * Kill criteria per step
 */
export const KILL_CRITERIA = {
  // Step 0: Mockup Design
  mockup: {
    maxRetries: 3,
    killConditions: [
      'No mockups after 3 validation attempts',
      'Mockups fail accessibility audit 3 times',
      'Human explicitly marks as abandoned'
    ]
  },

  // Step 1: PRD & Stories
  stories: {
    maxRetries: 3,
    killConditions: [
      'No PRD found after 3 attempts',
      'Story schema validation fails 3 times',
      'Alignment score < 25% after fixes',
      'Human explicitly marks as abandoned'
    ]
  },

  // Step 2: Wave Plan
  wavePlan: {
    maxRetries: 3,
    killConditions: [
      'Circular dependencies cannot be resolved',
      'No valid execution order possible',
      'Human explicitly marks as abandoned'
    ]
  },

  // Step 3: Configuration
  config: {
    maxRetries: 5, // More retries for config issues
    killConditions: [
      'Required API keys unavailable',
      'Human explicitly marks as abandoned'
    ]
  },

  // Step 4: Infrastructure
  infrastructure: {
    maxRetries: 3,
    killConditions: [
      'Critical infrastructure unavailable',
      'Human explicitly marks as abandoned'
    ]
  },

  // Step 5: Safety Protocol
  safety: {
    maxRetries: 2, // Fewer retries for safety
    killConditions: [
      'Safety scripts cannot be installed',
      'Critical guardrails missing',
      'Human explicitly marks as abandoned'
    ]
  },

  // Global kill criteria (apply to all steps)
  global: {
    budgetExceeded: true,
    timeoutHours: 48,
    humanEscalationIgnored: 24 // hours
  }
};

/**
 * Default criteria for unknown steps
 */
const DEFAULT_CRITERIA = {
  maxRetries: 3,
  killConditions: [
    'Human explicitly marks as abandoned'
  ]
};

// ============================================
// Kill Decision Functions
// ============================================

/**
 * Determine if a step should be killed
 * @param {string} stepId - Step identifier
 * @param {number} retryCount - Current retry count
 * @param {string[]} conditions - Current error conditions
 * @returns {{ kill: boolean, reason?: string }}
 */
export function shouldKill(stepId, retryCount, conditions) {
  const criteria = KILL_CRITERIA[stepId] || DEFAULT_CRITERIA;
  const maxRetries = criteria.maxRetries || 3;

  // Check retry limit
  if (retryCount >= maxRetries) {
    return {
      kill: true,
      reason: `Max retries (${maxRetries}) exceeded`
    };
  }

  // Check kill conditions
  for (const condition of conditions) {
    if (criteria.killConditions?.includes(condition)) {
      return {
        kill: true,
        reason: condition
      };
    }
  }

  return { kill: false };
}

/**
 * Get kill criteria for a specific step
 * @param {string} stepId - Step identifier
 * @returns {{ maxRetries: number, killConditions: string[] }}
 */
export function getKillCriteriaForStep(stepId) {
  return KILL_CRITERIA[stepId] || DEFAULT_CRITERIA;
}

/**
 * Evaluate a specific kill condition
 * @param {string} category - Criteria category (e.g., 'global')
 * @param {string} condition - Condition to evaluate
 * @param {Object} context - Current context
 * @returns {boolean}
 */
export function evaluateKillCondition(category, condition, context) {
  if (category === 'global') {
    switch (condition) {
      case 'budgetExceeded':
        return context.budgetExceeded === true;

      case 'timeout':
        if (!context.startedAt) return false;
        const startTime = new Date(context.startedAt).getTime();
        const elapsed = Date.now() - startTime;
        const timeoutMs = KILL_CRITERIA.global.timeoutHours * 60 * 60 * 1000;
        return elapsed > timeoutMs;

      case 'humanEscalationIgnored':
        if (!context.humanEscalationAt) return false;
        const escalationTime = new Date(context.humanEscalationAt).getTime();
        const escalationElapsed = Date.now() - escalationTime;
        const escalationTimeoutMs = KILL_CRITERIA.global.humanEscalationIgnored * 60 * 60 * 1000;
        return escalationElapsed > escalationTimeoutMs;

      default:
        return false;
    }
  }

  return false;
}

/**
 * Get max retries for a step
 * @param {string} stepId - Step identifier
 * @returns {number}
 */
export function getMaxRetries(stepId) {
  if (!stepId) return 3;
  const criteria = KILL_CRITERIA[stepId];
  return criteria?.maxRetries || 3;
}

export default shouldKill;
