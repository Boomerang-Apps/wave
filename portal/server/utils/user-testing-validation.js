/**
 * User Testing Validation (Grok Recommendation G3.1)
 *
 * Validates mockups/stories with real user feedback
 * Based on Design Sprint Day 5 methodology
 *
 * Reference: https://www.gv.com/sprint/
 */

// ============================================
// User Testing Configuration
// ============================================

/**
 * User testing configuration and thresholds
 */
export const USER_TESTING_CONFIG = {
  // Minimum requirements
  minTesters: 3,
  minFeedbackScore: 3.5, // out of 5

  requiredQuestions: [
    'usability',
    'clarity',
    'completeness'
  ],

  // Optional but recommended
  recommended: {
    testers: 5,
    includeAccessibility: true,
    includePerformanceExpectations: true
  }
};

// ============================================
// Session Management
// ============================================

/**
 * Create a user testing session
 * @param {Array<{ id: string, name: string }>} mockups - Mockups to test
 * @param {Array<{ id: string, title: string }>} stories - Stories to test
 * @returns {Object} Testing session
 */
export function createUserTestingSession(mockups, stories) {
  return {
    id: `ut-${Date.now()}`,
    status: 'pending',
    mockups: mockups.map(m => ({
      id: m.id,
      name: m.name,
      feedbackCollected: false
    })),
    stories: stories.map(s => ({
      id: s.id,
      title: s.title,
      feedbackCollected: false
    })),
    testers: [],
    createdAt: new Date().toISOString()
  };
}

// ============================================
// Feedback Recording
// ============================================

/**
 * Record user feedback for a session
 * @param {string} sessionId - Session ID
 * @param {string} testerId - Tester identifier
 * @param {Object} feedback - Feedback data
 * @returns {Object} Feedback record
 */
export function recordUserFeedback(sessionId, testerId, feedback) {
  return {
    sessionId,
    testerId,
    feedback: {
      usability: feedback.usability,       // 1-5
      clarity: feedback.clarity,           // 1-5
      completeness: feedback.completeness, // 1-5
      comments: feedback.comments,
      suggestions: feedback.suggestions,
      blockers: feedback.blockers || []
    },
    recordedAt: new Date().toISOString()
  };
}

// ============================================
// Evaluation
// ============================================

/**
 * Evaluate user testing results
 * @param {Object} session - Testing session with tester feedback
 * @returns {Object} Evaluation result
 */
export function evaluateUserTesting(session) {
  const { testers } = session;

  // Check minimum tester count
  if (testers.length < USER_TESTING_CONFIG.minTesters) {
    return {
      passed: false,
      status: 'insufficient_testers',
      message: `Need ${USER_TESTING_CONFIG.minTesters} testers, have ${testers.length}`
    };
  }

  // Calculate average scores
  const scores = calculateAverageScores(testers);

  // Check for blockers
  const blockers = testers.flatMap(t => t.feedback.blockers);

  if (blockers.length > 0) {
    return {
      passed: false,
      status: 'blockers_found',
      blockers,
      scores
    };
  }

  // Check minimum score
  if (scores.overallScore < USER_TESTING_CONFIG.minFeedbackScore) {
    return {
      passed: false,
      status: 'low_score',
      message: `Score ${scores.overallScore.toFixed(2)} below minimum ${USER_TESTING_CONFIG.minFeedbackScore}`,
      scores
    };
  }

  return {
    passed: true,
    status: 'approved',
    scores,
    testerCount: testers.length
  };
}

/**
 * Calculate average scores from tester feedback
 * @param {Array<{ feedback: Object }>} testers - Testers with feedback
 * @returns {Object} Average scores
 */
export function calculateAverageScores(testers) {
  const avgUsability = average(testers.map(t => t.feedback.usability));
  const avgClarity = average(testers.map(t => t.feedback.clarity));
  const avgCompleteness = average(testers.map(t => t.feedback.completeness));
  const overallScore = (avgUsability + avgClarity + avgCompleteness) / 3;

  return {
    avgUsability,
    avgClarity,
    avgCompleteness,
    overallScore
  };
}

/**
 * Calculate average of array
 * @param {number[]} arr - Numbers to average
 * @returns {number}
 */
function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export default evaluateUserTesting;
