/**
 * Human Review Config (Grok Recommendation G2.1)
 *
 * Defines which gates require independent human verification
 *
 * Based on Stage-Gate methodology - human gatekeepers at critical points
 */

// ============================================
// Human Review Gate Configuration
// ============================================

/**
 * Configuration for which gates require human review
 */
export const HUMAN_REVIEW_GATES = {
  // Step 0: Mockup Design - Human locks mockups
  'mockup-design': {
    required: true,
    reviewer: 'product_owner',
    description: 'Lock mockups before development',
    bypassable: false
  },

  // Step 2: Wave Plan - Human approves agent assignments
  'execution-plan': {
    required: true,
    reviewer: 'tech_lead',
    description: 'Approve wave plan and agent assignments',
    bypassable: true,
    bypassApprover: 'cto'
  },

  // Step 5: Safety Protocol - Independent safety review
  'compliance-safety': {
    required: true,
    reviewer: 'safety_officer',
    description: 'Verify safety guardrails active',
    bypassable: false
  },

  // Step 9: Launch - Final human authorization
  'agent-dispatch': {
    required: true,
    reviewer: 'cto',
    description: 'Authorize autonomous agent launch',
    bypassable: false,
    requiresAllPreviousGreen: true
  }
};

/**
 * Reviewer role hierarchy and permissions
 */
export const REVIEWER_ROLES = {
  product_owner: {
    level: 1,
    canBypass: []
  },
  tech_lead: {
    level: 2,
    canBypass: ['product_owner']
  },
  safety_officer: {
    level: 3,
    canBypass: []
  },
  cto: {
    level: 4,
    canBypass: ['product_owner', 'tech_lead']
  }
};

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a step requires human review
 * @param {string} stepId - Step identifier
 * @returns {boolean}
 */
export function requiresHumanReview(stepId) {
  const config = HUMAN_REVIEW_GATES[stepId];
  return config?.required === true;
}

/**
 * Get the required reviewer role for a step
 * @param {string} stepId - Step identifier
 * @returns {string|null}
 */
export function getReviewerForStep(stepId) {
  const config = HUMAN_REVIEW_GATES[stepId];
  return config?.reviewer || null;
}

/**
 * Check if a review can be bypassed by a given role
 * @param {string} stepId - Step identifier
 * @param {string} role - Role attempting bypass
 * @returns {boolean}
 */
export function canBypassReview(stepId, role) {
  const config = HUMAN_REVIEW_GATES[stepId];

  // Gate must exist and be bypassable
  if (!config || !config.bypassable) {
    return false;
  }

  // Check if role can bypass
  const roleConfig = REVIEWER_ROLES[role];
  if (!roleConfig) {
    return false;
  }

  // CTO can bypass if it's the designated bypassApprover
  if (config.bypassApprover === role) {
    return true;
  }

  // Check if role can bypass the required reviewer
  return roleConfig.canBypass.includes(config.reviewer);
}

/**
 * Get full review configuration for a step
 * @param {string} stepId - Step identifier
 * @returns {Object|null}
 */
export function getReviewConfig(stepId) {
  return HUMAN_REVIEW_GATES[stepId] || null;
}

export default HUMAN_REVIEW_GATES;
