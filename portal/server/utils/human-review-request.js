/**
 * Human Review Request System (Grok Recommendation G2.2)
 *
 * Creates and tracks human review requests
 *
 * Based on Stage-Gate methodology - formal gate reviews
 */

import { HUMAN_REVIEW_GATES } from './human-review-config.js';

// ============================================
// Review Decision Constants
// ============================================

/**
 * Possible review decisions
 */
export const REVIEW_DECISIONS = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  BYPASSED: 'bypassed'
};

// ============================================
// Review Request Functions
// ============================================

/**
 * Create a human review request
 * @param {string} stepId - Step identifier
 * @param {Object} validationResult - Validation result
 * @param {Object} context - Project context
 * @returns {Object|null} Review request or null if not required
 */
export function createHumanReviewRequest(stepId, validationResult, context) {
  const config = HUMAN_REVIEW_GATES[stepId];

  // Return null if step doesn't require human review
  if (!config?.required) {
    return null;
  }

  return {
    id: `hr-${stepId}-${Date.now()}`,
    stepId,
    reviewer: config.reviewer,
    description: config.description,
    status: 'pending',
    validationSummary: {
      passed: validationResult.passed,
      warnings: validationResult.warnings?.length || 0,
      errors: validationResult.errors?.length || 0
    },
    context: {
      projectId: context.projectId,
      projectName: context.projectName,
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    bypassable: config.bypassable || false,
    bypassApprover: config.bypassApprover || null
  };
}

/**
 * Resolve a human review
 * @param {string} reviewId - Review ID
 * @param {string} decision - Decision (approved/rejected/bypassed)
 * @param {string} reviewer - Reviewer identifier
 * @param {string} [notes] - Optional notes
 * @returns {Object} Resolution result
 */
export function resolveHumanReview(reviewId, decision, reviewer, notes = null) {
  return {
    reviewId,
    decision,
    reviewer,
    resolvedAt: new Date().toISOString(),
    notes
  };
}

/**
 * Get the current status of a review
 * @param {Object} review - Review object
 * @returns {string} Status
 */
export function getReviewStatus(review) {
  // Check if expired first
  if (review.status === 'pending' && isReviewExpired(review)) {
    return 'expired';
  }

  // If resolved, return the decision
  if (review.status === 'resolved' && review.resolution) {
    return review.resolution.decision;
  }

  return review.status;
}

/**
 * Check if a review has expired
 * @param {Object} review - Review object
 * @returns {boolean}
 */
export function isReviewExpired(review) {
  const expiresAt = review.context?.expiresAt;

  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() < Date.now();
}

export default createHumanReviewRequest;
