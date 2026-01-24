/**
 * TDD Tests for Step Status Getter (Launch Sequence)
 *
 * Phase 1, Step 1.3: Step Status Getter Function
 *
 * Tests the getStepStatus() function that returns the validation
 * status of a step given its step ID.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  getStepStatus,
  setStepStatus,
  resetAllStepStatuses,
  getAllStepStatuses
} from '../utils/step-status.js';

describe('getStepStatus', () => {

  beforeEach(() => {
    // Reset all step statuses before each test
    resetAllStepStatuses();
  });

  // ============================================
  // Return Type Tests
  // ============================================

  describe('return type', () => {
    it('should return a string status value', () => {
      const status = getStepStatus('mockup-design');

      expect(typeof status).toBe('string');
    });

    it('should return one of: idle, ready, or blocked', () => {
      const validStatuses = ['idle', 'ready', 'blocked'];
      const status = getStepStatus('mockup-design');

      expect(validStatuses).toContain(status);
    });
  });

  // ============================================
  // Default Status Tests
  // ============================================

  describe('default status', () => {
    it('should return idle for unknown step ID', () => {
      const status = getStepStatus('unknown-step');

      expect(status).toBe('idle');
    });

    it('should return idle for null step ID', () => {
      const status = getStepStatus(null);

      expect(status).toBe('idle');
    });

    it('should return idle for undefined step ID', () => {
      const status = getStepStatus(undefined);

      expect(status).toBe('idle');
    });

    it('should return idle when no validation exists for step', () => {
      // Fresh state - no validations set
      const status = getStepStatus('mockup-design');

      expect(status).toBe('idle');
    });
  });

  // ============================================
  // Status Retrieval Tests
  // ============================================

  describe('status retrieval', () => {
    it('should return ready when step validation status is ready', () => {
      setStepStatus('mockup-design', 'ready');
      const status = getStepStatus('mockup-design');

      expect(status).toBe('ready');
    });

    it('should return blocked when step validation status is blocked', () => {
      setStepStatus('mockup-design', 'blocked');
      const status = getStepStatus('mockup-design');

      expect(status).toBe('blocked');
    });

    it('should return idle when step validation status is idle', () => {
      setStepStatus('mockup-design', 'idle');
      const status = getStepStatus('mockup-design');

      expect(status).toBe('idle');
    });

    it('should return correct status for different steps', () => {
      setStepStatus('mockup-design', 'ready');
      setStepStatus('project-overview', 'blocked');
      setStepStatus('execution-plan', 'idle');

      expect(getStepStatus('mockup-design')).toBe('ready');
      expect(getStepStatus('project-overview')).toBe('blocked');
      expect(getStepStatus('execution-plan')).toBe('idle');
    });
  });

  // ============================================
  // setStepStatus Tests
  // ============================================

  describe('setStepStatus', () => {
    it('should set status for a step', () => {
      setStepStatus('mockup-design', 'ready');

      expect(getStepStatus('mockup-design')).toBe('ready');
    });

    it('should update existing status', () => {
      setStepStatus('mockup-design', 'idle');
      setStepStatus('mockup-design', 'ready');

      expect(getStepStatus('mockup-design')).toBe('ready');
    });

    it('should handle status transitions', () => {
      setStepStatus('mockup-design', 'idle');
      expect(getStepStatus('mockup-design')).toBe('idle');

      setStepStatus('mockup-design', 'blocked');
      expect(getStepStatus('mockup-design')).toBe('blocked');

      setStepStatus('mockup-design', 'ready');
      expect(getStepStatus('mockup-design')).toBe('ready');
    });
  });

  // ============================================
  // resetAllStepStatuses Tests
  // ============================================

  describe('resetAllStepStatuses', () => {
    it('should reset all statuses to idle', () => {
      setStepStatus('mockup-design', 'ready');
      setStepStatus('project-overview', 'blocked');
      setStepStatus('execution-plan', 'ready');

      resetAllStepStatuses();

      expect(getStepStatus('mockup-design')).toBe('idle');
      expect(getStepStatus('project-overview')).toBe('idle');
      expect(getStepStatus('execution-plan')).toBe('idle');
    });
  });

  // ============================================
  // getAllStepStatuses Tests
  // ============================================

  describe('getAllStepStatuses', () => {
    it('should return all 10 step statuses', () => {
      const statuses = getAllStepStatuses();

      expect(Object.keys(statuses)).toHaveLength(10);
    });

    it('should include all step IDs', () => {
      const statuses = getAllStepStatuses();

      expect(statuses).toHaveProperty('mockup-design');
      expect(statuses).toHaveProperty('project-overview');
      expect(statuses).toHaveProperty('execution-plan');
      expect(statuses).toHaveProperty('system-config');
      expect(statuses).toHaveProperty('infrastructure');
      expect(statuses).toHaveProperty('compliance-safety');
      expect(statuses).toHaveProperty('rlm-protocol');
      expect(statuses).toHaveProperty('notifications');
      expect(statuses).toHaveProperty('build-qa');
      expect(statuses).toHaveProperty('agent-dispatch');
    });

    it('should return current statuses for each step', () => {
      setStepStatus('mockup-design', 'ready');
      setStepStatus('project-overview', 'blocked');

      const statuses = getAllStepStatuses();

      expect(statuses['mockup-design']).toBe('ready');
      expect(statuses['project-overview']).toBe('blocked');
      expect(statuses['execution-plan']).toBe('idle');
    });

    it('should return idle for all steps when none are set', () => {
      resetAllStepStatuses();
      const statuses = getAllStepStatuses();

      for (const status of Object.values(statuses)) {
        expect(status).toBe('idle');
      }
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should be case-sensitive for step IDs', () => {
      setStepStatus('mockup-design', 'ready');

      expect(getStepStatus('mockup-design')).toBe('ready');
      expect(getStepStatus('MOCKUP-DESIGN')).toBe('idle'); // Unknown = idle
    });

    it('should handle rapid status changes', () => {
      for (let i = 0; i < 10; i++) {
        setStepStatus('mockup-design', i % 2 === 0 ? 'ready' : 'blocked');
      }

      expect(getStepStatus('mockup-design')).toBe('blocked'); // Last set was i=9 (odd)
    });

    it('should handle empty string step ID', () => {
      expect(getStepStatus('')).toBe('idle');
    });
  });
});
