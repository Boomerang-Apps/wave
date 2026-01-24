/**
 * User Testing Gate (Grok Recommendation G3.2)
 *
 * Optional but recommended gate between mockups and development
 * Based on Design Sprint Day 5 methodology
 *
 * Reference: https://www.gv.com/sprint/
 */

// ============================================
// User Testing Gate Configuration
// ============================================

/**
 * User testing gate configuration
 */
export const USER_TESTING_GATE = {
  id: 'user-testing',
  step: 1.5, // Between Step 1 and Step 2
  label: 'User Testing',
  required: false, // Optional

  recommendedFor: [
    'new_product',
    'major_redesign',
    'user_facing_features'
  ],

  canSkip: true,
  skipRequires: 'tech_lead_approval',
  skipReason: null
};

/**
 * Roles authorized to approve skipping user testing
 */
const SKIP_AUTHORIZED_ROLES = ['tech_lead', 'cto'];

// ============================================
// Gate Decision Functions
// ============================================

/**
 * Determine if user testing should be required for a project
 * @param {Object} projectContext - Project context
 * @returns {{ required: boolean, reason: string }}
 */
export function shouldRequireUserTesting(projectContext) {
  const { projectType, hasUserFacing, isRedesign } = projectContext;

  // Check if project type is in recommended list
  if (USER_TESTING_GATE.recommendedFor.includes(projectType)) {
    return {
      required: true,
      reason: `Recommended for ${projectType}`
    };
  }

  // User-facing redesigns benefit from testing
  if (hasUserFacing && isRedesign) {
    return {
      required: true,
      reason: 'User-facing redesign benefits from testing'
    };
  }

  return {
    required: false,
    reason: 'Optional for this project type'
  };
}

/**
 * Check if user testing can be skipped with given approver role
 * @param {string} approverRole - Role of the approver
 * @returns {{ canSkip: boolean, reason?: string }}
 */
export function canSkipUserTesting(approverRole) {
  if (SKIP_AUTHORIZED_ROLES.includes(approverRole)) {
    return { canSkip: true };
  }

  return {
    canSkip: false,
    reason: `Requires ${USER_TESTING_GATE.skipRequires} to skip user testing`
  };
}

/**
 * Record the reason for skipping user testing
 * @param {string} approver - Approver identifier
 * @param {string} reason - Reason for skipping
 * @returns {Object} Skip record
 */
export function recordSkipReason(approver, reason) {
  return {
    approver,
    reason,
    skipped: true,
    skippedAt: new Date().toISOString()
  };
}

export default USER_TESTING_GATE;
