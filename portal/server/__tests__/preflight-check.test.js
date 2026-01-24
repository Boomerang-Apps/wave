/**
 * TDD Tests for Pre-Flight Check (Launch Sequence)
 *
 * Phase 1, Step 1.4: Pre-Flight Check Function
 *
 * Tests the runPreFlightCheck() function that validates all 10 steps
 * are ready before allowing agent dispatch (launch).
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  runPreFlightCheck,
  getPreFlightSummary
} from '../utils/preflight-check.js';

import { setStepStatus, resetAllStepStatuses } from '../utils/step-status.js';

describe('runPreFlightCheck', () => {

  beforeEach(() => {
    // Reset all step statuses before each test
    resetAllStepStatuses();
  });

  // ============================================
  // Return Type Tests
  // ============================================

  describe('return type', () => {
    it('should return an object with ready and blockers properties', () => {
      const result = runPreFlightCheck();

      expect(result).toHaveProperty('ready');
      expect(result).toHaveProperty('blockers');
      expect(typeof result.ready).toBe('boolean');
      expect(Array.isArray(result.blockers)).toBe(true);
    });
  });

  // ============================================
  // All Steps Ready
  // ============================================

  describe('all steps ready', () => {
    it('should return ready=true when all 10 steps are ready', () => {
      // Set all steps to ready
      setStepStatus('mockup-design', 'ready');
      setStepStatus('project-overview', 'ready');
      setStepStatus('execution-plan', 'ready');
      setStepStatus('system-config', 'ready');
      setStepStatus('infrastructure', 'ready');
      setStepStatus('compliance-safety', 'ready');
      setStepStatus('rlm-protocol', 'ready');
      setStepStatus('notifications', 'ready');
      setStepStatus('build-qa', 'ready');
      setStepStatus('agent-dispatch', 'ready');

      const result = runPreFlightCheck();

      expect(result.ready).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });
  });

  // ============================================
  // Steps Not Ready
  // ============================================

  describe('steps not ready', () => {
    it('should return ready=false when step 0 is not ready', () => {
      // All steps ready except step 0
      setStepStatus('mockup-design', 'idle');
      setStepStatus('project-overview', 'ready');
      setStepStatus('execution-plan', 'ready');
      setStepStatus('system-config', 'ready');
      setStepStatus('infrastructure', 'ready');
      setStepStatus('compliance-safety', 'ready');
      setStepStatus('rlm-protocol', 'ready');
      setStepStatus('notifications', 'ready');
      setStepStatus('build-qa', 'ready');
      setStepStatus('agent-dispatch', 'ready');

      const result = runPreFlightCheck();

      expect(result.ready).toBe(false);
    });

    it('should return ready=false when step 5 is not ready', () => {
      // All steps ready except step 5
      setStepStatus('mockup-design', 'ready');
      setStepStatus('project-overview', 'ready');
      setStepStatus('execution-plan', 'ready');
      setStepStatus('system-config', 'ready');
      setStepStatus('infrastructure', 'ready');
      setStepStatus('compliance-safety', 'blocked');
      setStepStatus('rlm-protocol', 'ready');
      setStepStatus('notifications', 'ready');
      setStepStatus('build-qa', 'ready');
      setStepStatus('agent-dispatch', 'ready');

      const result = runPreFlightCheck();

      expect(result.ready).toBe(false);
    });

    it('should return ready=false when multiple steps are not ready', () => {
      // Only first 3 steps ready
      setStepStatus('mockup-design', 'ready');
      setStepStatus('project-overview', 'ready');
      setStepStatus('execution-plan', 'ready');
      // Rest are idle (default)

      const result = runPreFlightCheck();

      expect(result.ready).toBe(false);
    });

    it('should return ready=false when all steps are idle', () => {
      // All steps are idle by default (no setup)
      const result = runPreFlightCheck();

      expect(result.ready).toBe(false);
    });
  });

  // ============================================
  // Blockers Array
  // ============================================

  describe('blockers array', () => {
    it('should list blockers with step number and label', () => {
      setStepStatus('mockup-design', 'idle');

      const result = runPreFlightCheck();

      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.blockers[0]).toContain('Step 0');
      expect(result.blockers[0]).toContain('Mockup Design');
    });

    it('should list all blockers when multiple steps fail', () => {
      // No steps set - all idle
      const result = runPreFlightCheck();

      // Should have 10 blockers (all steps)
      expect(result.blockers).toHaveLength(10);
    });

    it('should list blockers in step order (step 0 first, step 9 last)', () => {
      // No steps set - all idle
      const result = runPreFlightCheck();

      // First blocker should be step 0
      expect(result.blockers[0]).toContain('Step 0');

      // Last blocker should be step 9
      expect(result.blockers[9]).toContain('Step 9');
    });

    it('should only include non-ready steps in blockers', () => {
      setStepStatus('mockup-design', 'ready');
      setStepStatus('project-overview', 'ready');
      setStepStatus('execution-plan', 'idle');
      setStepStatus('system-config', 'ready');
      // Rest are idle

      const result = runPreFlightCheck();

      // Should NOT include ready steps
      const blockerText = result.blockers.join(' ');
      expect(blockerText).not.toContain('Mockup Design');
      expect(blockerText).not.toContain('PRD & Stories');
      expect(blockerText).not.toContain('Configuration');

      // Should include non-ready steps
      expect(blockerText).toContain('Wave Plan');
    });

    it('should include blocked status steps in blockers', () => {
      setStepStatus('mockup-design', 'blocked');

      const result = runPreFlightCheck();

      expect(result.blockers[0]).toContain('Mockup Design');
    });
  });

  // ============================================
  // getPreFlightSummary
  // ============================================

  describe('getPreFlightSummary', () => {
    it('should return summary with readyCount and totalCount', () => {
      const summary = getPreFlightSummary();

      expect(summary).toHaveProperty('readyCount');
      expect(summary).toHaveProperty('totalCount');
      expect(typeof summary.readyCount).toBe('number');
      expect(summary.totalCount).toBe(10);
    });

    it('should count ready steps correctly', () => {
      setStepStatus('mockup-design', 'ready');
      setStepStatus('project-overview', 'ready');
      setStepStatus('execution-plan', 'ready');

      const summary = getPreFlightSummary();

      expect(summary.readyCount).toBe(3);
    });

    it('should return percentage complete', () => {
      setStepStatus('mockup-design', 'ready');
      setStepStatus('project-overview', 'ready');

      const summary = getPreFlightSummary();

      expect(summary).toHaveProperty('percentComplete');
      expect(summary.percentComplete).toBe(20); // 2/10 = 20%
    });

    it('should include steps array with status', () => {
      setStepStatus('mockup-design', 'ready');
      setStepStatus('project-overview', 'blocked');

      const summary = getPreFlightSummary();

      expect(summary).toHaveProperty('steps');
      expect(Array.isArray(summary.steps)).toBe(true);
      expect(summary.steps).toHaveLength(10);

      const step0 = summary.steps.find(s => s.stepId === 'mockup-design');
      expect(step0.status).toBe('ready');

      const step1 = summary.steps.find(s => s.stepId === 'project-overview');
      expect(step1.status).toBe('blocked');
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should handle rapid status changes before check', () => {
      setStepStatus('mockup-design', 'idle');
      setStepStatus('mockup-design', 'blocked');
      setStepStatus('mockup-design', 'ready');

      // Set rest to ready
      setStepStatus('project-overview', 'ready');
      setStepStatus('execution-plan', 'ready');
      setStepStatus('system-config', 'ready');
      setStepStatus('infrastructure', 'ready');
      setStepStatus('compliance-safety', 'ready');
      setStepStatus('rlm-protocol', 'ready');
      setStepStatus('notifications', 'ready');
      setStepStatus('build-qa', 'ready');
      setStepStatus('agent-dispatch', 'ready');

      const result = runPreFlightCheck();

      expect(result.ready).toBe(true);
    });

    it('should be idempotent (multiple calls return same result)', () => {
      setStepStatus('mockup-design', 'ready');

      const result1 = runPreFlightCheck();
      const result2 = runPreFlightCheck();

      expect(result1.ready).toBe(result2.ready);
      expect(result1.blockers).toEqual(result2.blockers);
    });
  });
});
