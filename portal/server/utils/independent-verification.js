/**
 * Independent Verification (Grok Recommendation G2.3)
 *
 * Ensures critical checks are verified by someone other than creator
 *
 * Based on aerospace/safety-critical practices - independent verification
 */

// ============================================
// Independent Verification Configuration
// ============================================

/**
 * Steps that require independent verification
 * (Different person must verify than the one who created)
 */
export const INDEPENDENT_VERIFICATION_STEPS = [
  'compliance-safety',  // Safety must be independently verified
  'agent-dispatch'      // Launch must be independently verified
];

/**
 * Verification requirements per step
 */
const VERIFICATION_REQUIREMENTS = {
  'compliance-safety': {
    requiresIndependentReviewer: true,
    description: 'Safety protocol requires independent verification'
  },
  'agent-dispatch': {
    requiresIndependentReviewer: true,
    description: 'Launch authorization requires independent verification'
  }
};

// ============================================
// Verification Functions
// ============================================

/**
 * Check if a step requires independent verification
 * @param {string} stepId - Step identifier
 * @returns {boolean}
 */
export function requiresIndependentVerification(stepId) {
  return INDEPENDENT_VERIFICATION_STEPS.includes(stepId);
}

/**
 * Validate that reviewer is different from original author
 * @param {string} stepId - Step identifier
 * @param {string} originalAuthor - Original author identifier
 * @param {string} reviewer - Proposed reviewer identifier
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateIndependentReviewer(stepId, originalAuthor, reviewer) {
  // If step doesn't require independent verification, always valid
  if (!requiresIndependentVerification(stepId)) {
    return { valid: true };
  }

  // Compare case-insensitively for emails
  const authorNormalized = originalAuthor.toLowerCase();
  const reviewerNormalized = reviewer.toLowerCase();

  if (authorNormalized === reviewerNormalized) {
    return {
      valid: false,
      error: 'Independent verification requires different reviewer than original author'
    };
  }

  return { valid: true };
}

/**
 * Get verification requirements for a step
 * @param {string} stepId - Step identifier
 * @returns {Object|null}
 */
export function getVerificationRequirements(stepId) {
  return VERIFICATION_REQUIREMENTS[stepId] || null;
}

/**
 * Create a verification record
 * @param {string} stepId - Step identifier
 * @param {string} originalAuthor - Original author identifier
 * @param {string} verifier - Verifier identifier
 * @returns {Object}
 */
export function createVerificationRecord(stepId, originalAuthor, verifier) {
  const validation = validateIndependentReviewer(stepId, originalAuthor, verifier);

  return {
    stepId,
    originalAuthor,
    verifier,
    verifiedAt: new Date().toISOString(),
    independentlyVerified: validation.valid
  };
}

export default requiresIndependentVerification;
