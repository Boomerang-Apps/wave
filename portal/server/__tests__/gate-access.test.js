/**
 * TDD Tests for Gate Access Validator (Launch Sequence)
 *
 * Phase 1, Step 1.2: Gate Access Validator Function
 *
 * Tests the canAccessStep() function that determines whether
 * a user can access a specific step based on prior step completion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  canAccessStep,
  setStepValidationStatus,
  resetAllValidations,
  getStepValidationStatus
} from '../utils/gate-access.js';

describe('canAccessStep', () => {

  beforeEach(() => {
    // Reset all validation statuses before each test
    resetAllValidations();
  });

  // ============================================
  // Return Type Tests
  // ============================================

  describe('return type', () => {
    it('should return an object with allowed and blockedBy properties', () => {
      const result = canAccessStep('mockup-design');

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('blockedBy');
      expect(typeof result.allowed).toBe('boolean');
      expect(Array.isArray(result.blockedBy)).toBe(true);
    });
  });

  // ============================================
  // Step 0: Always Accessible
  // ============================================

  describe('step 0 (mockup-design)', () => {
    it('should always allow access to step 0', () => {
      const result = canAccessStep('mockup-design');

      expect(result.allowed).toBe(true);
      expect(result.blockedBy).toHaveLength(0);
    });

    it('should allow step 0 even when validation status is idle', () => {
      setStepValidationStatus('_mockup', 'idle');
      const result = canAccessStep('mockup-design');

      expect(result.allowed).toBe(true);
    });
  });

  // ============================================
  // Step 1: Requires Step 0
  // ============================================

  describe('step 1 (project-overview)', () => {
    it('should block step 1 when step 0 is idle', () => {
      setStepValidationStatus('_mockup', 'idle');
      const result = canAccessStep('project-overview');

      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toContain('Mockup Design');
    });

    it('should block step 1 when step 0 is blocked', () => {
      setStepValidationStatus('_mockup', 'blocked');
      const result = canAccessStep('project-overview');

      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toContain('Mockup Design');
    });

    it('should allow step 1 when step 0 is ready', () => {
      setStepValidationStatus('_mockup', 'ready');
      const result = canAccessStep('project-overview');

      expect(result.allowed).toBe(true);
      expect(result.blockedBy).toHaveLength(0);
    });
  });

  // ============================================
  // Middle Steps
  // ============================================

  describe('step 4 (infrastructure)', () => {
    it('should block step 4 when step 3 is not ready', () => {
      setStepValidationStatus('_mockup', 'ready');
      setStepValidationStatus('_stories', 'ready');
      setStepValidationStatus('_wavePlan', 'ready');
      setStepValidationStatus('_config', 'idle'); // Step 3 not ready

      const result = canAccessStep('infrastructure');

      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toContain('Configuration');
    });

    it('should allow step 4 when all prior steps are ready', () => {
      setStepValidationStatus('_mockup', 'ready');
      setStepValidationStatus('_stories', 'ready');
      setStepValidationStatus('_wavePlan', 'ready');
      setStepValidationStatus('_config', 'ready');

      const result = canAccessStep('infrastructure');

      expect(result.allowed).toBe(true);
      expect(result.blockedBy).toHaveLength(0);
    });
  });

  // ============================================
  // Step 9: Final Step (Launch)
  // ============================================

  describe('step 9 (agent-dispatch)', () => {
    it('should block step 9 when any prior step is not ready', () => {
      // Set all steps ready except step 5
      setStepValidationStatus('_mockup', 'ready');
      setStepValidationStatus('_stories', 'ready');
      setStepValidationStatus('_wavePlan', 'ready');
      setStepValidationStatus('_config', 'ready');
      setStepValidationStatus('_foundation', 'ready');
      setStepValidationStatus('_safety', 'idle'); // Step 5 not ready
      setStepValidationStatus('_rlm', 'ready');
      setStepValidationStatus('_slack', 'ready');
      setStepValidationStatus('_buildQa', 'ready');

      const result = canAccessStep('agent-dispatch');

      expect(result.allowed).toBe(false);
    });

    it('should allow step 9 when all prior steps (0-8) are ready', () => {
      setStepValidationStatus('_mockup', 'ready');
      setStepValidationStatus('_stories', 'ready');
      setStepValidationStatus('_wavePlan', 'ready');
      setStepValidationStatus('_config', 'ready');
      setStepValidationStatus('_foundation', 'ready');
      setStepValidationStatus('_safety', 'ready');
      setStepValidationStatus('_rlm', 'ready');
      setStepValidationStatus('_slack', 'ready');
      setStepValidationStatus('_buildQa', 'ready');

      const result = canAccessStep('agent-dispatch');

      expect(result.allowed).toBe(true);
      expect(result.blockedBy).toHaveLength(0);
    });
  });

  // ============================================
  // blockedBy Array Content
  // ============================================

  describe('blockedBy array', () => {
    it('should contain human-readable step labels', () => {
      setStepValidationStatus('_mockup', 'idle');
      const result = canAccessStep('project-overview');

      expect(result.blockedBy[0]).toBe('Mockup Design');
      expect(result.blockedBy[0]).not.toBe('mockup-design');
      expect(result.blockedBy[0]).not.toBe('_mockup');
    });

    it('should list multiple blockers when multiple steps are not ready', () => {
      // All steps idle - trying to access step 4
      const result = canAccessStep('infrastructure');

      expect(result.blockedBy.length).toBeGreaterThan(0);
    });

    it('should list blockers in step order (earlier steps first)', () => {
      setStepValidationStatus('_mockup', 'idle');
      setStepValidationStatus('_stories', 'idle');

      const result = canAccessStep('execution-plan');

      // Both step 0 and step 1 are blocking step 2
      expect(result.blockedBy.indexOf('Mockup Design')).toBeLessThan(
        result.blockedBy.indexOf('PRD & Stories')
      );
    });
  });

  // ============================================
  // Invalid Step IDs
  // ============================================

  describe('invalid step IDs', () => {
    it('should return allowed=true for unknown step ID', () => {
      const result = canAccessStep('unknown-step');

      expect(result.allowed).toBe(true);
      expect(result.blockedBy).toHaveLength(0);
    });

    it('should return allowed=true for null step ID', () => {
      const result = canAccessStep(null);

      expect(result.allowed).toBe(true);
    });

    it('should return allowed=true for undefined step ID', () => {
      const result = canAccessStep(undefined);

      expect(result.allowed).toBe(true);
    });
  });

  // ============================================
  // Validation Status Helpers
  // ============================================

  describe('setStepValidationStatus', () => {
    it('should set validation status for a step', () => {
      setStepValidationStatus('_mockup', 'ready');
      expect(getStepValidationStatus('_mockup')).toBe('ready');
    });

    it('should update existing status', () => {
      setStepValidationStatus('_mockup', 'idle');
      setStepValidationStatus('_mockup', 'ready');
      expect(getStepValidationStatus('_mockup')).toBe('ready');
    });
  });

  describe('getStepValidationStatus', () => {
    it('should return idle for unset validation', () => {
      expect(getStepValidationStatus('_mockup')).toBe('idle');
    });

    it('should return the set status', () => {
      setStepValidationStatus('_mockup', 'blocked');
      expect(getStepValidationStatus('_mockup')).toBe('blocked');
    });
  });

  describe('resetAllValidations', () => {
    it('should reset all validations to idle', () => {
      setStepValidationStatus('_mockup', 'ready');
      setStepValidationStatus('_stories', 'ready');

      resetAllValidations();

      expect(getStepValidationStatus('_mockup')).toBe('idle');
      expect(getStepValidationStatus('_stories')).toBe('idle');
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should handle rapid status changes', () => {
      setStepValidationStatus('_mockup', 'idle');
      setStepValidationStatus('_mockup', 'ready');
      setStepValidationStatus('_mockup', 'blocked');
      setStepValidationStatus('_mockup', 'ready');

      const result = canAccessStep('project-overview');
      expect(result.allowed).toBe(true);
    });

    it('should be case-sensitive for step IDs', () => {
      const result1 = canAccessStep('mockup-design');
      const result2 = canAccessStep('MOCKUP-DESIGN');

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true); // Unknown step defaults to allowed
    });
  });
});
