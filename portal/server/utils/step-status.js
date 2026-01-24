/**
 * Step Status Module (Launch Sequence)
 *
 * Phase 1, Step 1.3: Step Status Getter Function
 *
 * Provides functions to get and set step validation statuses
 * using step IDs (e.g., 'mockup-design' instead of validation keys).
 */

import { GATE_DEPENDENCIES, GATE_STEP_IDS } from './gate-dependencies.js';

// ============================================
// In-Memory Step Status Store
// ============================================

/**
 * In-memory store for step statuses
 * Maps step IDs (e.g., 'mockup-design') to status ('idle' | 'ready' | 'blocked')
 * @type {Map<string, string>}
 */
const stepStatuses = new Map();

// ============================================
// Step Status Functions
// ============================================

/**
 * Get the status of a step by its step ID
 * @param {string | null | undefined} stepId - The step ID (e.g., 'mockup-design')
 * @returns {'idle' | 'ready' | 'blocked'} The current status (defaults to 'idle')
 */
export function getStepStatus(stepId) {
  // Handle invalid/unknown step IDs
  if (!stepId || !GATE_DEPENDENCIES[stepId]) {
    return 'idle';
  }

  return stepStatuses.get(stepId) || 'idle';
}

/**
 * Set the status for a step by its step ID
 * @param {string} stepId - The step ID (e.g., 'mockup-design')
 * @param {'idle' | 'ready' | 'blocked'} status - The status to set
 */
export function setStepStatus(stepId, status) {
  stepStatuses.set(stepId, status);
}

/**
 * Reset all step statuses to idle
 */
export function resetAllStepStatuses() {
  stepStatuses.clear();
}

/**
 * Get all step statuses as an object
 * @returns {Record<string, 'idle' | 'ready' | 'blocked'>}
 */
export function getAllStepStatuses() {
  const statuses = {};

  for (const stepId of GATE_STEP_IDS) {
    statuses[stepId] = getStepStatus(stepId);
  }

  return statuses;
}

export default getStepStatus;
