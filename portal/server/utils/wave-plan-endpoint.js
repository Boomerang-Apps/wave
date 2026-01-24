/**
 * Wave Plan Endpoint Module (Launch Sequence)
 *
 * Phase 4, Step 4.5: Wave Plan Endpoint
 *
 * Creates and persists wave execution plans.
 */

import { createWavePlan, validateWavePlan, getWaveStats } from './wave-batching.js';

// ============================================
// Request Creation
// ============================================

/**
 * @typedef {Object} WavePlanRequest
 * @property {string} projectPath - Path to project root
 * @property {string} projectId - Project ID
 * @property {string} timestamp - Request timestamp
 * @property {Object} options - Additional options
 */

/**
 * Create a wave plan request object
 * @param {string} projectPath - Path to project root
 * @param {string} projectId - Project ID
 * @param {Object} [options] - Additional options
 * @returns {WavePlanRequest}
 */
export function createWavePlanRequest(projectPath, projectId, options = {}) {
  return {
    projectPath,
    projectId,
    timestamp: new Date().toISOString(),
    options
  };
}

// ============================================
// Wave Plan Generation
// ============================================

/**
 * @typedef {Object} WavePlanResult
 * @property {'ready'|'blocked'} status - Plan status
 * @property {Object} plan - The wave plan
 * @property {Object} stats - Plan statistics
 * @property {string[]} errors - Any errors
 */

/**
 * Generate a wave plan from stories
 * @param {Object[]} stories - Array of story objects
 * @param {string} projectId - Project ID
 * @param {Object} [options] - Generation options
 * @returns {Promise<WavePlanResult>}
 */
export async function generateWavePlan(stories, projectId, options = {}) {
  // Create the wave plan
  const plan = createWavePlan(stories, projectId);

  // Validate the plan
  const validation = validateWavePlan(plan);

  // Get statistics
  const stats = getWaveStats(plan.waves);

  // Determine status
  const status = plan.valid && validation.valid ? 'ready' : 'blocked';

  // Collect all errors
  const errors = [
    ...(plan.errors || []),
    ...(validation.errors || [])
  ];

  return {
    status,
    plan,
    stats,
    errors
  };
}

// ============================================
// Wave Plan Persistence
// ============================================

/**
 * @typedef {Object} WavePlanPersistence
 * @property {string} projectId - Project ID
 * @property {string} validationKey - Database key
 * @property {'ready'|'blocked'} status - Plan status
 * @property {Object} summary - Plan summary
 * @property {Object} domainBreakdown - Stories per domain
 * @property {string} last_checked - Timestamp
 */

/**
 * Prepare wave plan for persistence
 * @param {Object} plan - Wave plan
 * @returns {Promise<WavePlanPersistence>}
 */
export async function persistWavePlan(plan) {
  const status = plan.valid ? 'ready' : 'blocked';

  return {
    projectId: plan.projectId,
    validationKey: '_wavePlan',
    status,
    summary: {
      totalWaves: plan.totalWaves || plan.waves?.length || 0,
      totalStories: plan.totalStories || 0
    },
    domainBreakdown: plan.domainBreakdown || {},
    agentWorkload: plan.agentWorkload || {},
    errors: plan.errors || [],
    last_checked: new Date().toISOString()
  };
}

// ============================================
// Wave Plan Status
// ============================================

/**
 * Get wave plan status from config
 * @param {Object} config - Project config object
 * @param {Object} [options] - Status options
 * @param {number} [options.maxAge] - Max age in milliseconds
 * @returns {'idle'|'ready'|'blocked'|'stale'}
 */
export function getWavePlanStatus(config, options = {}) {
  const { maxAge } = options;
  const wavePlan = config._wavePlan;

  if (!wavePlan) {
    return 'idle';
  }

  // Check if stale
  if (maxAge && wavePlan.last_checked) {
    const lastChecked = new Date(wavePlan.last_checked).getTime();
    const now = Date.now();

    if (now - lastChecked > maxAge) {
      return 'stale';
    }
  }

  return wavePlan.status || 'idle';
}

export default generateWavePlan;
