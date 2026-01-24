/**
 * Integration Tests for Launch Sequence Gating Flow
 *
 * End-to-end tests that verify:
 * 1. Sequential step access (no skipping)
 * 2. Step completion unlocks next step
 * 3. Pre-flight check blocks launch until all ready
 * 4. State persistence and restoration
 * 5. Gate decision engine integration
 *
 * Based on NASA Pre-Flight Validation and Stage-Gate methodology.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Gate Access
import {
  canAccessStep,
  setStepValidationStatus,
  resetAllValidations,
  getStepValidationStatus
} from '../utils/gate-access.js';

// Step Status
import {
  setStepStatus,
  getStepStatus,
  resetAllStepStatuses,
  getAllStepStatuses
} from '../utils/step-status.js';

// Pre-flight Check
import {
  runPreFlightCheck,
  getPreFlightSummary
} from '../utils/preflight-check.js';

// Gate Dependencies
import { GATE_DEPENDENCIES } from '../utils/gate-dependencies.js';

// Gate Status Types
import { GATE_DECISIONS, GATE_STATUSES } from '../utils/gate-status-types.js';

// Gate Decision Engine
import { makeGateDecision } from '../utils/gate-decision-engine.js';

// ============================================
// Test Constants
// ============================================

const STEP_IDS = [
  'mockup-design',
  'project-overview',
  'execution-plan',
  'system-config',
  'infrastructure',
  'compliance-safety',
  'rlm-protocol',
  'notifications',
  'build-qa',
  'agent-dispatch'
];

const VALIDATION_KEYS = [
  '_mockup',
  '_stories',
  '_wavePlan',
  '_config',
  '_foundation',
  '_safety',
  '_rlm',
  '_slack',
  '_buildQa',
  '_dispatch'
];

// ============================================
// Integration Test Suite
// ============================================

describe('Launch Sequence Integration', () => {

  beforeEach(() => {
    // Reset all state before each test
    resetAllValidations();
    resetAllStepStatuses();
  });

  // ============================================
  // Sequential Access Tests
  // ============================================

  describe('Sequential Step Access (No Skipping)', () => {

    it('should only allow Step 0 when starting fresh', () => {
      // Fresh state - only step 0 should be accessible
      const step0 = canAccessStep('mockup-design');
      const step1 = canAccessStep('project-overview');
      const step5 = canAccessStep('compliance-safety');
      const step9 = canAccessStep('agent-dispatch');

      expect(step0.allowed).toBe(true);
      expect(step1.allowed).toBe(false);
      expect(step5.allowed).toBe(false);
      expect(step9.allowed).toBe(false);
    });

    it('should enforce sequential progression through all 10 steps', () => {
      // Verify each step unlocks only the next step
      for (let i = 0; i < STEP_IDS.length - 1; i++) {
        const currentStep = STEP_IDS[i];
        const nextStep = STEP_IDS[i + 1];
        const validationKey = VALIDATION_KEYS[i];

        // Before marking current step ready - next step blocked
        const beforeAccess = canAccessStep(nextStep);
        expect(beforeAccess.allowed).toBe(false);

        // Mark current step as ready
        setStepValidationStatus(validationKey, 'ready');

        // After marking current step ready - next step accessible
        const afterAccess = canAccessStep(nextStep);
        expect(afterAccess.allowed).toBe(true);
      }
    });

    it('should block all future steps even if one middle step is not ready', () => {
      // Set steps 0-3 as ready, but step 4 blocked
      setStepValidationStatus('_mockup', 'ready');
      setStepValidationStatus('_stories', 'ready');
      setStepValidationStatus('_wavePlan', 'ready');
      setStepValidationStatus('_config', 'ready');
      setStepValidationStatus('_foundation', 'blocked'); // Step 4 blocked

      // Steps 0-4 should be accessible (can view blocked step)
      expect(canAccessStep('mockup-design').allowed).toBe(true);
      expect(canAccessStep('project-overview').allowed).toBe(true);
      expect(canAccessStep('execution-plan').allowed).toBe(true);
      expect(canAccessStep('system-config').allowed).toBe(true);
      expect(canAccessStep('infrastructure').allowed).toBe(true);

      // Steps 5-9 should be blocked
      expect(canAccessStep('compliance-safety').allowed).toBe(false);
      expect(canAccessStep('rlm-protocol').allowed).toBe(false);
      expect(canAccessStep('notifications').allowed).toBe(false);
      expect(canAccessStep('build-qa').allowed).toBe(false);
      expect(canAccessStep('agent-dispatch').allowed).toBe(false);
    });

    it('should provide correct blockedBy information', () => {
      // Try to access step 3 with steps 0-1 ready but step 2 not ready
      setStepValidationStatus('_mockup', 'ready');
      setStepValidationStatus('_stories', 'ready');
      setStepValidationStatus('_wavePlan', 'idle'); // Step 2 not ready

      const access = canAccessStep('system-config');

      expect(access.allowed).toBe(false);
      expect(access.blockedBy).toContain('Wave Plan');
    });
  });

  // ============================================
  // Step Completion Flow Tests
  // ============================================

  describe('Step Completion Flow', () => {

    it('should track completion progress correctly', () => {
      // Complete steps one by one and verify progress
      let summary = getPreFlightSummary();
      expect(summary.readyCount).toBe(0);
      expect(summary.percentComplete).toBe(0);

      // Complete first 5 steps
      for (let i = 0; i < 5; i++) {
        setStepStatus(STEP_IDS[i], 'ready');
      }

      summary = getPreFlightSummary();
      expect(summary.readyCount).toBe(5);
      expect(summary.percentComplete).toBe(50);

      // Complete all steps
      for (let i = 5; i < 10; i++) {
        setStepStatus(STEP_IDS[i], 'ready');
      }

      summary = getPreFlightSummary();
      expect(summary.readyCount).toBe(10);
      expect(summary.percentComplete).toBe(100);
    });

    it('should allow re-validation of completed steps', () => {
      // Complete step 0
      setStepValidationStatus('_mockup', 'ready');
      expect(canAccessStep('project-overview').allowed).toBe(true);

      // Re-validate step 0 (change back to idle)
      setStepValidationStatus('_mockup', 'idle');
      expect(canAccessStep('project-overview').allowed).toBe(false);

      // Complete step 0 again
      setStepValidationStatus('_mockup', 'ready');
      expect(canAccessStep('project-overview').allowed).toBe(true);
    });

    it('should maintain step status independently of validation status', () => {
      // setStepStatus is for display/tracking
      // setStepValidationStatus is for gating
      setStepStatus('mockup-design', 'ready');
      setStepValidationStatus('_mockup', 'idle');

      // Step status shows ready
      expect(getStepStatus('mockup-design')).toBe('ready');
      // But gating should still block next step
      expect(canAccessStep('project-overview').allowed).toBe(false);
    });
  });

  // ============================================
  // Pre-Flight Check Tests
  // ============================================

  describe('Pre-Flight Check (Launch Gate)', () => {

    it('should block launch when any step is not ready', () => {
      // Set 9 steps ready, 1 not ready
      STEP_IDS.forEach((stepId, index) => {
        if (index !== 5) {
          setStepStatus(stepId, 'ready');
        }
      });

      const preflight = runPreFlightCheck();

      expect(preflight.ready).toBe(false);
      expect(preflight.blockers.length).toBeGreaterThan(0);
      expect(preflight.blockers.some(b => b.includes('Safety Protocol'))).toBe(true);
    });

    it('should allow launch when all 10 steps are ready', () => {
      // Set all steps ready
      STEP_IDS.forEach(stepId => {
        setStepStatus(stepId, 'ready');
      });

      const preflight = runPreFlightCheck();

      expect(preflight.ready).toBe(true);
      expect(preflight.blockers).toHaveLength(0);
    });

    it('should report all blockers in order', () => {
      // No steps ready
      const preflight = runPreFlightCheck();

      expect(preflight.blockers).toHaveLength(10);
      expect(preflight.blockers[0]).toContain('Step 0');
      expect(preflight.blockers[9]).toContain('Step 9');
    });

    it('should distinguish between idle and blocked status', () => {
      setStepStatus('mockup-design', 'idle');
      setStepStatus('project-overview', 'blocked');

      const summary = getPreFlightSummary();
      const step0 = summary.steps.find(s => s.stepId === 'mockup-design');
      const step1 = summary.steps.find(s => s.stepId === 'project-overview');

      expect(step0.status).toBe('idle');
      expect(step1.status).toBe('blocked');

      // Both should block launch
      const preflight = runPreFlightCheck();
      expect(preflight.ready).toBe(false);
    });
  });

  // ============================================
  // Gate Decision Engine Integration
  // ============================================

  describe('Gate Decision Engine Integration', () => {

    it('should return GO decision when validation passes', () => {
      const validationResult = {
        passed: true,
        errors: [],
        warnings: [],
        retryCount: 0
      };

      const decision = makeGateDecision('mockup-design', validationResult, {});

      expect(decision.decision).toBe(GATE_DECISIONS.GO);
      expect(decision.status).toBe(GATE_STATUSES.READY);
    });

    it('should return KILL decision when max retries exceeded', () => {
      const validationResult = {
        passed: false,
        errors: ['Some error'],
        warnings: [],
        retryCount: 5 // Exceeds max retries
      };

      const decision = makeGateDecision('execution-plan', validationResult, {});

      expect(decision.decision).toBe(GATE_DECISIONS.KILL);
      expect(decision.status).toBe(GATE_STATUSES.KILLED);
    });

    it('should return HOLD decision when human decision required', () => {
      const validationResult = {
        passed: false,
        errors: [],
        warnings: [],
        retryCount: 0
      };

      const context = {
        requiresHumanDecision: true,
        humanDecisionProvided: false
      };

      const decision = makeGateDecision('infrastructure', validationResult, context);

      expect(decision.decision).toBe(GATE_DECISIONS.HOLD);
      expect(decision.status).toBe(GATE_STATUSES.HOLD);
    });

    it('should return RECYCLE decision when rework required', () => {
      const validationResult = {
        passed: false,
        errors: [],
        warnings: [],
        retryCount: 0,
        requiresRework: true,
        recycleTarget: 'mockup-design'
      };

      const decision = makeGateDecision('build-qa', validationResult, {});

      expect(decision.decision).toBe(GATE_DECISIONS.RECYCLE);
      expect(decision.status).toBe(GATE_STATUSES.RECYCLE);
    });

    it('should require human review when configured', () => {
      const validationResult = {
        passed: true,
        errors: [],
        warnings: [],
        retryCount: 0
      };

      const context = {
        requiresHumanReview: true
      };

      const decision = makeGateDecision('compliance-safety', validationResult, context);

      expect(decision.decision).toBe(null);
      expect(decision.status).toBe(GATE_STATUSES.PENDING_HUMAN_REVIEW);
    });
  });

  // ============================================
  // State Persistence Tests
  // ============================================

  describe('State Persistence', () => {

    it('should maintain step statuses across multiple queries', () => {
      // Set initial state
      setStepStatus('mockup-design', 'ready');
      setStepStatus('project-overview', 'blocked');
      setStepStatus('execution-plan', 'idle');

      // Query multiple times
      for (let i = 0; i < 3; i++) {
        expect(getStepStatus('mockup-design')).toBe('ready');
        expect(getStepStatus('project-overview')).toBe('blocked');
        expect(getStepStatus('execution-plan')).toBe('idle');
      }
    });

    it('should maintain validation statuses across multiple queries', () => {
      // Set initial state
      setStepValidationStatus('_mockup', 'ready');
      setStepValidationStatus('_stories', 'blocked');

      // Query multiple times
      for (let i = 0; i < 3; i++) {
        expect(getStepValidationStatus('_mockup')).toBe('ready');
        expect(getStepValidationStatus('_stories')).toBe('blocked');
      }
    });

    it('should preserve order of step completion', () => {
      // Complete steps in specific order
      const completionOrder = [0, 2, 1, 4, 3]; // Non-sequential

      completionOrder.forEach(index => {
        setStepStatus(STEP_IDS[index], 'ready');
      });

      // Verify all completed steps are tracked
      const summary = getPreFlightSummary();
      expect(summary.readyCount).toBe(5);

      // Verify specific steps are ready
      completionOrder.forEach(index => {
        const step = summary.steps.find(s => s.stepId === STEP_IDS[index]);
        expect(step.status).toBe('ready');
      });
    });
  });

  // ============================================
  // Gate Dependencies Tests
  // ============================================

  describe('Gate Dependencies', () => {

    it('should define all 10 steps with correct dependencies', () => {
      expect(Object.keys(GATE_DEPENDENCIES)).toHaveLength(10);

      // Step 0 has no dependencies
      expect(GATE_DEPENDENCIES['mockup-design'].requiredSteps).toHaveLength(0);

      // Each subsequent step depends on the previous step
      expect(GATE_DEPENDENCIES['project-overview'].requiredSteps).toContain('mockup-design');
      expect(GATE_DEPENDENCIES['execution-plan'].requiredSteps).toContain('project-overview');
      expect(GATE_DEPENDENCIES['system-config'].requiredSteps).toContain('execution-plan');
    });

    it('should provide correct step numbers', () => {
      STEP_IDS.forEach((stepId, index) => {
        const gate = GATE_DEPENDENCIES[stepId];
        expect(gate.step).toBe(index);
      });
    });

    it('should have correct validation keys for each step', () => {
      const expectedKeys = {
        'mockup-design': '_mockup',
        'project-overview': '_stories',
        'execution-plan': '_wavePlan',
        'system-config': '_config',
        'infrastructure': '_foundation',
        'compliance-safety': '_safety',
        'rlm-protocol': '_rlm',
        'notifications': '_slack',
        'build-qa': '_buildQa',
        'agent-dispatch': '_dispatch'
      };

      Object.entries(expectedKeys).forEach(([stepId, key]) => {
        const gate = GATE_DEPENDENCIES[stepId];
        expect(gate.validationKey).toBe(key);
      });
    });
  });

  // ============================================
  // Full Workflow Simulation
  // ============================================

  describe('Full Workflow Simulation', () => {

    it('should simulate complete launch sequence workflow', () => {
      // === Phase 1: Fresh Start ===
      let preflight = runPreFlightCheck();
      expect(preflight.ready).toBe(false);
      expect(preflight.blockers).toHaveLength(10);

      // Only step 0 accessible
      expect(canAccessStep('mockup-design').allowed).toBe(true);
      expect(canAccessStep('project-overview').allowed).toBe(false);

      // === Phase 2: Complete Steps Sequentially ===
      for (let i = 0; i < 10; i++) {
        const stepId = STEP_IDS[i];
        const validationKey = VALIDATION_KEYS[i];

        // Step should be accessible
        expect(canAccessStep(stepId).allowed).toBe(true);

        // Complete the step
        setStepStatus(stepId, 'ready');
        setStepValidationStatus(validationKey, 'ready');

        // Verify progress
        const summary = getPreFlightSummary();
        expect(summary.readyCount).toBe(i + 1);
        expect(summary.percentComplete).toBe((i + 1) * 10);

        // Next step should now be accessible (if not last step)
        if (i < 9) {
          expect(canAccessStep(STEP_IDS[i + 1]).allowed).toBe(true);
        }
      }

      // === Phase 3: All Complete ===
      preflight = runPreFlightCheck();
      expect(preflight.ready).toBe(true);
      expect(preflight.blockers).toHaveLength(0);

      // Summary shows 100%
      const finalSummary = getPreFlightSummary();
      expect(finalSummary.readyCount).toBe(10);
      expect(finalSummary.percentComplete).toBe(100);
    });

    it('should handle step failure and recovery', () => {
      // Complete first 5 steps
      for (let i = 0; i < 5; i++) {
        setStepStatus(STEP_IDS[i], 'ready');
        setStepValidationStatus(VALIDATION_KEYS[i], 'ready');
      }

      // Step 5 fails
      setStepStatus(STEP_IDS[5], 'blocked');
      setStepValidationStatus(VALIDATION_KEYS[5], 'blocked');

      // Steps 6-9 should be blocked
      expect(canAccessStep('rlm-protocol').allowed).toBe(false);
      expect(canAccessStep('agent-dispatch').allowed).toBe(false);

      // Pre-flight should fail
      let preflight = runPreFlightCheck();
      expect(preflight.ready).toBe(false);

      // Fix step 5
      setStepStatus(STEP_IDS[5], 'ready');
      setStepValidationStatus(VALIDATION_KEYS[5], 'ready');

      // Steps 6-9 should now be accessible (with proper validation)
      expect(canAccessStep('rlm-protocol').allowed).toBe(true);

      // Complete remaining steps
      for (let i = 6; i < 10; i++) {
        setStepStatus(STEP_IDS[i], 'ready');
        setStepValidationStatus(VALIDATION_KEYS[i], 'ready');
      }

      // Pre-flight should now pass
      preflight = runPreFlightCheck();
      expect(preflight.ready).toBe(true);
    });

    it('should handle non-sequential step attempts gracefully', () => {
      // Try to complete step 5 without completing steps 0-4
      setStepStatus('compliance-safety', 'ready');

      // Step 5 status is ready but gating should still block
      expect(getStepStatus('compliance-safety')).toBe('ready');
      expect(canAccessStep('compliance-safety').allowed).toBe(false);

      // Blockers should show steps 0-4
      const access = canAccessStep('compliance-safety');
      expect(access.blockedBy).toContain('Mockup Design');
      expect(access.blockedBy).toContain('PRD & Stories');
      expect(access.blockedBy).toContain('Wave Plan');
      expect(access.blockedBy).toContain('Configuration');
      expect(access.blockedBy).toContain('Infrastructure');
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {

    it('should handle rapid state transitions', () => {
      // Rapidly toggle states
      for (let i = 0; i < 10; i++) {
        setStepValidationStatus('_mockup', 'idle');
        setStepValidationStatus('_mockup', 'ready');
        setStepValidationStatus('_mockup', 'blocked');
        setStepValidationStatus('_mockup', 'ready');
      }

      // Final state should be ready
      expect(getStepValidationStatus('_mockup')).toBe('ready');
      expect(canAccessStep('project-overview').allowed).toBe(true);
    });

    it('should handle concurrent status queries', () => {
      // Set all steps ready
      STEP_IDS.forEach((stepId, i) => {
        setStepStatus(stepId, 'ready');
        setStepValidationStatus(VALIDATION_KEYS[i], 'ready');
      });

      // Query everything concurrently (simulate)
      const results = STEP_IDS.map(stepId => canAccessStep(stepId));
      const preflight = runPreFlightCheck();
      const summary = getPreFlightSummary();

      // All should be consistent
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
      expect(preflight.ready).toBe(true);
      expect(summary.readyCount).toBe(10);
    });

    it('should handle reset during workflow', () => {
      // Complete some steps
      for (let i = 0; i < 5; i++) {
        setStepStatus(STEP_IDS[i], 'ready');
        setStepValidationStatus(VALIDATION_KEYS[i], 'ready');
      }

      // Reset everything
      resetAllStepStatuses();
      resetAllValidations();

      // Should be back to initial state
      const summary = getPreFlightSummary();
      expect(summary.readyCount).toBe(0);

      const preflight = runPreFlightCheck();
      expect(preflight.ready).toBe(false);
      expect(preflight.blockers).toHaveLength(10);

      // Only step 0 accessible
      expect(canAccessStep('mockup-design').allowed).toBe(true);
      expect(canAccessStep('project-overview').allowed).toBe(false);
    });
  });
});
