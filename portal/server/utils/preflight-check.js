/**
 * Pre-Flight Check Module (Launch Sequence)
 *
 * Phase 1, Step 1.4: Pre-Flight Check Function
 *
 * Validates all 10 steps are ready before allowing
 * agent dispatch (launch).
 */

import { GATE_DEPENDENCIES, GATE_STEP_IDS } from './gate-dependencies.js';
import { getStepStatus } from './step-status.js';

// ============================================
// Pre-Flight Check
// ============================================

/**
 * Run pre-flight check to validate all steps are ready for launch
 * @returns {{ ready: boolean, blockers: string[] }}
 */
export function runPreFlightCheck() {
  const blockers = [];

  // Check all 10 steps in order
  for (const stepId of GATE_STEP_IDS) {
    const gate = GATE_DEPENDENCIES[stepId];
    const status = getStepStatus(stepId);

    if (status !== 'ready') {
      blockers.push(`Step ${gate.step}: ${gate.label}`);
    }
  }

  return {
    ready: blockers.length === 0,
    blockers
  };
}

// ============================================
// Pre-Flight Summary
// ============================================

/**
 * Get a summary of the pre-flight check status
 * @returns {{
 *   readyCount: number,
 *   totalCount: number,
 *   percentComplete: number,
 *   steps: Array<{ stepId: string, step: number, label: string, status: string }>
 * }}
 */
export function getPreFlightSummary() {
  const steps = [];
  let readyCount = 0;
  const totalCount = GATE_STEP_IDS.length;

  for (const stepId of GATE_STEP_IDS) {
    const gate = GATE_DEPENDENCIES[stepId];
    const status = getStepStatus(stepId);

    if (status === 'ready') {
      readyCount++;
    }

    steps.push({
      stepId,
      step: gate.step,
      label: gate.label,
      status
    });
  }

  return {
    readyCount,
    totalCount,
    percentComplete: Math.round((readyCount / totalCount) * 100),
    steps
  };
}

export default runPreFlightCheck;
