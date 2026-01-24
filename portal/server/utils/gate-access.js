/**
 * Gate Access Validator Module (Launch Sequence)
 *
 * Phase 1, Step 1.2: Gate Access Validator Function
 *
 * Determines whether a user can access a specific step based on
 * prior step completion status.
 */

import { GATE_DEPENDENCIES, GATE_STEP_IDS } from './gate-dependencies.js';

// ============================================
// In-Memory Validation Status Store
// ============================================

/**
 * In-memory store for validation statuses
 * Maps validation keys (e.g., '_mockup') to status ('idle' | 'ready' | 'blocked')
 * @type {Map<string, string>}
 */
const validationStatuses = new Map();

// ============================================
// Validation Status Helpers
// ============================================

/**
 * Set the validation status for a step
 * @param {string} validationKey - The validation key (e.g., '_mockup')
 * @param {'idle' | 'ready' | 'blocked'} status - The status to set
 */
export function setStepValidationStatus(validationKey, status) {
  validationStatuses.set(validationKey, status);
}

/**
 * Get the validation status for a step
 * @param {string} validationKey - The validation key (e.g., '_mockup')
 * @returns {'idle' | 'ready' | 'blocked'} The current status (defaults to 'idle')
 */
export function getStepValidationStatus(validationKey) {
  return validationStatuses.get(validationKey) || 'idle';
}

/**
 * Reset all validation statuses to idle
 */
export function resetAllValidations() {
  validationStatuses.clear();
}

// ============================================
// Gate Access Validator
// ============================================

/**
 * Check if a user can access a specific step
 * @param {string | null | undefined} stepId - The step ID to check (e.g., 'mockup-design')
 * @returns {{ allowed: boolean, blockedBy: string[] }}
 */
export function canAccessStep(stepId) {
  // Handle invalid/unknown step IDs - allow access by default
  if (!stepId || !GATE_DEPENDENCIES[stepId]) {
    return { allowed: true, blockedBy: [] };
  }

  const gate = GATE_DEPENDENCIES[stepId];

  // Step 0 is always accessible
  if (gate.step === 0) {
    return { allowed: true, blockedBy: [] };
  }

  // Check all prior steps (not just direct dependencies)
  // Each step requires ALL previous steps to be ready
  const blockedBy = [];

  for (const priorStepId of GATE_STEP_IDS) {
    const priorGate = GATE_DEPENDENCIES[priorStepId];

    // Only check steps before the current step
    if (priorGate.step >= gate.step) {
      break;
    }

    // Check if the prior step is ready
    const status = getStepValidationStatus(priorGate.validationKey);
    if (status !== 'ready') {
      blockedBy.push(priorGate.label);
    }
  }

  return {
    allowed: blockedBy.length === 0,
    blockedBy
  };
}

export default canAccessStep;
