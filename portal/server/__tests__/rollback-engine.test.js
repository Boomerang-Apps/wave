/**
 * TDD Tests for Rollback Engine (Grok Recommendation G6.2)
 *
 * Handles reverting gate status when failures occur
 */

import { describe, it, expect } from 'vitest';

import {
  ROLLBACK_TRIGGERS,
  canRollback,
  createRollbackRequest,
  executeRollback,
  getAffectedSteps
} from '../utils/rollback-engine.js';

describe('Rollback Engine (G6.2)', () => {

  // ============================================
  // ROLLBACK_TRIGGERS Constants Tests
  // ============================================

  describe('ROLLBACK_TRIGGERS', () => {
    it('should have VALIDATION_FAILURE_AFTER_PASS', () => {
      expect(ROLLBACK_TRIGGERS.VALIDATION_FAILURE_AFTER_PASS).toBe('validation_failure_after_pass');
    });

    it('should have DEPENDENT_GATE_FAILED', () => {
      expect(ROLLBACK_TRIGGERS.DEPENDENT_GATE_FAILED).toBe('dependent_gate_failed');
    });

    it('should have HUMAN_REQUESTED', () => {
      expect(ROLLBACK_TRIGGERS.HUMAN_REQUESTED).toBe('human_requested');
    });

    it('should have SECURITY_VIOLATION', () => {
      expect(ROLLBACK_TRIGGERS.SECURITY_VIOLATION).toBe('security_violation');
    });

    it('should have BUDGET_EXCEEDED', () => {
      expect(ROLLBACK_TRIGGERS.BUDGET_EXCEEDED).toBe('budget_exceeded');
    });
  });

  // ============================================
  // canRollback Tests
  // ============================================

  describe('canRollback', () => {
    it('should return true for ready status', () => {
      expect(canRollback('mockup-design', 'ready')).toBe(true);
    });

    it('should return true for hold status', () => {
      expect(canRollback('mockup-design', 'hold')).toBe(true);
    });

    it('should return true for pending_human_review status', () => {
      expect(canRollback('mockup-design', 'pending_human_review')).toBe(true);
    });

    it('should return false for killed status', () => {
      expect(canRollback('mockup-design', 'killed')).toBe(false);
    });

    it('should return false for idle status', () => {
      expect(canRollback('mockup-design', 'idle')).toBe(false);
    });
  });

  // ============================================
  // createRollbackRequest Tests
  // ============================================

  describe('createRollbackRequest', () => {
    const context = {
      currentStatus: 'ready',
      requestedBy: 'admin',
      reason: 'Validation failed after passing'
    };

    it('should create request with unique ID', () => {
      const request = createRollbackRequest(
        'mockup-design',
        ROLLBACK_TRIGGERS.VALIDATION_FAILURE_AFTER_PASS,
        context
      );

      expect(request.id).toBeDefined();
      expect(request.id).toContain('rb-');
    });

    it('should include stepId', () => {
      const request = createRollbackRequest(
        'mockup-design',
        ROLLBACK_TRIGGERS.HUMAN_REQUESTED,
        context
      );

      expect(request.stepId).toBe('mockup-design');
    });

    it('should include trigger', () => {
      const request = createRollbackRequest(
        'mockup-design',
        ROLLBACK_TRIGGERS.HUMAN_REQUESTED,
        context
      );

      expect(request.trigger).toBe(ROLLBACK_TRIGGERS.HUMAN_REQUESTED);
    });

    it('should include fromStatus', () => {
      const request = createRollbackRequest(
        'mockup-design',
        ROLLBACK_TRIGGERS.HUMAN_REQUESTED,
        context
      );

      expect(request.fromStatus).toBe('ready');
    });

    it('should set toStatus to idle', () => {
      const request = createRollbackRequest(
        'mockup-design',
        ROLLBACK_TRIGGERS.HUMAN_REQUESTED,
        context
      );

      expect(request.toStatus).toBe('idle');
    });

    it('should include requestedBy', () => {
      const request = createRollbackRequest(
        'mockup-design',
        ROLLBACK_TRIGGERS.HUMAN_REQUESTED,
        context
      );

      expect(request.requestedBy).toBe('admin');
    });

    it('should include requestedAt timestamp', () => {
      const request = createRollbackRequest(
        'mockup-design',
        ROLLBACK_TRIGGERS.HUMAN_REQUESTED,
        context
      );

      expect(request.requestedAt).toBeDefined();
    });

    it('should include reason', () => {
      const request = createRollbackRequest(
        'mockup-design',
        ROLLBACK_TRIGGERS.HUMAN_REQUESTED,
        context
      );

      expect(request.reason).toBe('Validation failed after passing');
    });

    it('should include affected steps', () => {
      const request = createRollbackRequest(
        'mockup-design',
        ROLLBACK_TRIGGERS.HUMAN_REQUESTED,
        context
      );

      expect(request.affectedSteps).toBeDefined();
      expect(Array.isArray(request.affectedSteps)).toBe(true);
    });
  });

  // ============================================
  // executeRollback Tests
  // ============================================

  describe('executeRollback', () => {
    it('should return rollbackId', () => {
      const request = {
        id: 'rb-123',
        stepId: 'mockup-design',
        affectedSteps: ['project-overview']
      };

      const result = executeRollback(request);

      expect(result.rollbackId).toBe('rb-123');
    });

    it('should include results array', () => {
      const request = {
        id: 'rb-123',
        stepId: 'mockup-design',
        affectedSteps: []
      };

      const result = executeRollback(request);

      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should include completedAt timestamp', () => {
      const request = {
        id: 'rb-123',
        stepId: 'mockup-design',
        affectedSteps: []
      };

      const result = executeRollback(request);

      expect(result.completedAt).toBeDefined();
    });

    it('should rollback the main step to idle', () => {
      const request = {
        id: 'rb-123',
        stepId: 'mockup-design',
        affectedSteps: []
      };

      const result = executeRollback(request);

      expect(result.results[0].stepId).toBe('mockup-design');
      expect(result.results[0].newStatus).toBe('idle');
    });

    it('should cascade rollback to affected steps', () => {
      const request = {
        id: 'rb-123',
        stepId: 'mockup-design',
        affectedSteps: ['project-overview', 'execution-plan']
      };

      const result = executeRollback(request);

      expect(result.results.length).toBe(3);
    });

    it('should set affected steps to blocked', () => {
      const request = {
        id: 'rb-123',
        stepId: 'mockup-design',
        affectedSteps: ['project-overview']
      };

      const result = executeRollback(request);

      const cascaded = result.results.find(r => r.stepId === 'project-overview');
      expect(cascaded.newStatus).toBe('blocked');
      expect(cascaded.action).toBe('cascade_rollback');
    });
  });

  // ============================================
  // getAffectedSteps Tests
  // ============================================

  describe('getAffectedSteps', () => {
    it('should return dependent steps for mockup-design', () => {
      const affected = getAffectedSteps('mockup-design');

      expect(affected).toContain('project-overview');
      expect(affected).toContain('execution-plan');
    });

    it('should return dependent steps for project-overview', () => {
      const affected = getAffectedSteps('project-overview');

      expect(affected).toContain('execution-plan');
    });

    it('should return empty array for unknown step', () => {
      const affected = getAffectedSteps('unknown-step');

      expect(affected).toEqual([]);
    });

    it('should return empty array for last step', () => {
      const affected = getAffectedSteps('agent-dispatch');

      expect(affected).toEqual([]);
    });
  });
});
