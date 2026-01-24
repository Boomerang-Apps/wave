/**
 * TDD Tests for Gate Dependencies (Launch Sequence)
 *
 * Phase 1, Step 1.1: Gate Dependencies Data Structure
 *
 * Tests the GATE_DEPENDENCIES constant that defines the 10-step
 * sequential workflow for launching AI agents.
 */

import { describe, it, expect } from 'vitest';

import {
  GATE_DEPENDENCIES,
  GATE_STEP_IDS,
  getGateByStepNumber,
  getGateByValidationKey,
  validateGateDependencies
} from '../utils/gate-dependencies.js';

describe('GATE_DEPENDENCIES', () => {

  // ============================================
  // Structure Tests
  // ============================================

  describe('structure', () => {
    it('should define exactly 10 steps (0-9)', () => {
      const stepNumbers = Object.values(GATE_DEPENDENCIES).map(g => g.step);
      expect(stepNumbers).toHaveLength(10);
      expect(stepNumbers.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should have all required fields for each step', () => {
      const requiredFields = ['step', 'label', 'requiredSteps', 'validationKey'];

      for (const [stepId, gate] of Object.entries(GATE_DEPENDENCIES)) {
        for (const field of requiredFields) {
          expect(gate).toHaveProperty(field);
          expect(gate[field]).toBeDefined();
        }
      }
    });

    it('should have unique step numbers', () => {
      const stepNumbers = Object.values(GATE_DEPENDENCIES).map(g => g.step);
      const uniqueSteps = new Set(stepNumbers);
      expect(uniqueSteps.size).toBe(10);
    });

    it('should have unique validation keys', () => {
      const validationKeys = Object.values(GATE_DEPENDENCIES).map(g => g.validationKey);
      const uniqueKeys = new Set(validationKeys);
      expect(uniqueKeys.size).toBe(10);
    });

    it('should have unique labels', () => {
      const labels = Object.values(GATE_DEPENDENCIES).map(g => g.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(10);
    });
  });

  // ============================================
  // Step 0: Mockup Design
  // ============================================

  describe('step 0 - mockup-design', () => {
    it('should exist with step number 0', () => {
      expect(GATE_DEPENDENCIES['mockup-design']).toBeDefined();
      expect(GATE_DEPENDENCIES['mockup-design'].step).toBe(0);
    });

    it('should have no required steps (first in sequence)', () => {
      expect(GATE_DEPENDENCIES['mockup-design'].requiredSteps).toEqual([]);
    });

    it('should have validation key _mockup', () => {
      expect(GATE_DEPENDENCIES['mockup-design'].validationKey).toBe('_mockup');
    });

    it('should have label "Mockup Design"', () => {
      expect(GATE_DEPENDENCIES['mockup-design'].label).toBe('Mockup Design');
    });
  });

  // ============================================
  // Sequential Dependency Chain
  // ============================================

  describe('sequential dependencies', () => {
    it('should have step 1 require step 0', () => {
      expect(GATE_DEPENDENCIES['project-overview'].requiredSteps).toContain('mockup-design');
    });

    it('should have step 2 require step 1', () => {
      expect(GATE_DEPENDENCIES['execution-plan'].requiredSteps).toContain('project-overview');
    });

    it('should have step 3 require step 2', () => {
      expect(GATE_DEPENDENCIES['system-config'].requiredSteps).toContain('execution-plan');
    });

    it('should have step 4 require step 3', () => {
      expect(GATE_DEPENDENCIES['infrastructure'].requiredSteps).toContain('system-config');
    });

    it('should have step 5 require step 4', () => {
      expect(GATE_DEPENDENCIES['compliance-safety'].requiredSteps).toContain('infrastructure');
    });

    it('should have step 6 require step 5', () => {
      expect(GATE_DEPENDENCIES['rlm-protocol'].requiredSteps).toContain('compliance-safety');
    });

    it('should have step 7 require step 6', () => {
      expect(GATE_DEPENDENCIES['notifications'].requiredSteps).toContain('rlm-protocol');
    });

    it('should have step 8 require step 7', () => {
      expect(GATE_DEPENDENCIES['build-qa'].requiredSteps).toContain('notifications');
    });

    it('should have step 9 require step 8', () => {
      expect(GATE_DEPENDENCIES['agent-dispatch'].requiredSteps).toContain('build-qa');
    });

    it('should form a complete chain where each step N requires step N-1', () => {
      const sortedSteps = Object.entries(GATE_DEPENDENCIES)
        .sort((a, b) => a[1].step - b[1].step);

      for (let i = 1; i < sortedSteps.length; i++) {
        const currentStep = sortedSteps[i];
        const previousStep = sortedSteps[i - 1];

        expect(currentStep[1].requiredSteps).toContain(previousStep[0]);
      }
    });
  });

  // ============================================
  // Validation Keys
  // ============================================

  describe('validation keys', () => {
    it('should all start with underscore', () => {
      for (const gate of Object.values(GATE_DEPENDENCIES)) {
        expect(gate.validationKey.startsWith('_')).toBe(true);
      }
    });

    it('should have correct validation keys for each step', () => {
      expect(GATE_DEPENDENCIES['mockup-design'].validationKey).toBe('_mockup');
      expect(GATE_DEPENDENCIES['project-overview'].validationKey).toBe('_stories');
      expect(GATE_DEPENDENCIES['execution-plan'].validationKey).toBe('_wavePlan');
      expect(GATE_DEPENDENCIES['system-config'].validationKey).toBe('_config');
      expect(GATE_DEPENDENCIES['infrastructure'].validationKey).toBe('_foundation');
      expect(GATE_DEPENDENCIES['compliance-safety'].validationKey).toBe('_safety');
      expect(GATE_DEPENDENCIES['rlm-protocol'].validationKey).toBe('_rlm');
      expect(GATE_DEPENDENCIES['notifications'].validationKey).toBe('_slack');
      expect(GATE_DEPENDENCIES['build-qa'].validationKey).toBe('_buildQa');
      expect(GATE_DEPENDENCIES['agent-dispatch'].validationKey).toBe('_dispatch');
    });
  });

  // ============================================
  // GATE_STEP_IDS Array
  // ============================================

  describe('GATE_STEP_IDS', () => {
    it('should be an array of 10 step IDs', () => {
      expect(Array.isArray(GATE_STEP_IDS)).toBe(true);
      expect(GATE_STEP_IDS).toHaveLength(10);
    });

    it('should be in order from step 0 to step 9', () => {
      expect(GATE_STEP_IDS[0]).toBe('mockup-design');
      expect(GATE_STEP_IDS[9]).toBe('agent-dispatch');
    });

    it('should contain all step IDs from GATE_DEPENDENCIES', () => {
      const allStepIds = Object.keys(GATE_DEPENDENCIES);
      for (const stepId of allStepIds) {
        expect(GATE_STEP_IDS).toContain(stepId);
      }
    });
  });

  // ============================================
  // Helper Functions
  // ============================================

  describe('getGateByStepNumber', () => {
    it('should return gate for step 0', () => {
      const gate = getGateByStepNumber(0);
      expect(gate).toBeDefined();
      expect(gate.id).toBe('mockup-design');
      expect(gate.step).toBe(0);
    });

    it('should return gate for step 9', () => {
      const gate = getGateByStepNumber(9);
      expect(gate).toBeDefined();
      expect(gate.id).toBe('agent-dispatch');
      expect(gate.step).toBe(9);
    });

    it('should return null for invalid step number', () => {
      expect(getGateByStepNumber(-1)).toBeNull();
      expect(getGateByStepNumber(10)).toBeNull();
      expect(getGateByStepNumber(100)).toBeNull();
    });
  });

  describe('getGateByValidationKey', () => {
    it('should return gate for _mockup key', () => {
      const gate = getGateByValidationKey('_mockup');
      expect(gate).toBeDefined();
      expect(gate.id).toBe('mockup-design');
    });

    it('should return gate for _foundation key', () => {
      const gate = getGateByValidationKey('_foundation');
      expect(gate).toBeDefined();
      expect(gate.id).toBe('infrastructure');
    });

    it('should return null for invalid key', () => {
      expect(getGateByValidationKey('invalid')).toBeNull();
      expect(getGateByValidationKey('_unknown')).toBeNull();
    });
  });

  describe('validateGateDependencies', () => {
    it('should return valid for correctly structured dependencies', () => {
      const result = validateGateDependencies();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should not have circular dependencies', () => {
      // Check that no step requires itself or a later step
      for (const [stepId, gate] of Object.entries(GATE_DEPENDENCIES)) {
        for (const requiredStep of gate.requiredSteps) {
          const requiredGate = GATE_DEPENDENCIES[requiredStep];
          expect(requiredGate.step).toBeLessThan(gate.step);
        }
      }
    });

    it('should only reference existing step IDs in requiredSteps', () => {
      const allStepIds = Object.keys(GATE_DEPENDENCIES);

      for (const gate of Object.values(GATE_DEPENDENCIES)) {
        for (const requiredStep of gate.requiredSteps) {
          expect(allStepIds).toContain(requiredStep);
        }
      }
    });
  });
});
