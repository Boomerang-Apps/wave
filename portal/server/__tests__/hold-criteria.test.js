/**
 * TDD Tests for Hold Criteria (Grok Recommendation G1.3)
 *
 * Defines when to pause (HOLD) a gate for more information
 * Based on Stage-Gate methodology
 */

import { describe, it, expect } from 'vitest';

import {
  HOLD_REASONS,
  shouldHold,
  getHoldReason,
  canResumeFromHold,
  createHoldContext
} from '../utils/hold-criteria.js';

describe('Hold Criteria (G1.3)', () => {

  // ============================================
  // HOLD_REASONS Constants Tests
  // ============================================

  describe('HOLD_REASONS', () => {
    it('should include AWAITING_HUMAN_INPUT', () => {
      expect(HOLD_REASONS.AWAITING_HUMAN_INPUT).toBe('awaiting_human_input');
    });

    it('should include AWAITING_EXTERNAL_DATA', () => {
      expect(HOLD_REASONS.AWAITING_EXTERNAL_DATA).toBe('awaiting_external_data');
    });

    it('should include DEPENDENCY_NOT_READY', () => {
      expect(HOLD_REASONS.DEPENDENCY_NOT_READY).toBe('dependency_not_ready');
    });

    it('should include BUDGET_REVIEW_NEEDED', () => {
      expect(HOLD_REASONS.BUDGET_REVIEW_NEEDED).toBe('budget_review_needed');
    });

    it('should include RISK_ASSESSMENT_NEEDED', () => {
      expect(HOLD_REASONS.RISK_ASSESSMENT_NEEDED).toBe('risk_assessment_needed');
    });

    it('should include CLARIFICATION_NEEDED', () => {
      expect(HOLD_REASONS.CLARIFICATION_NEEDED).toBe('clarification_needed');
    });

    it('should have at least 6 hold reasons', () => {
      expect(Object.keys(HOLD_REASONS).length).toBeGreaterThanOrEqual(6);
    });
  });

  // ============================================
  // shouldHold Tests
  // ============================================

  describe('shouldHold', () => {
    it('should return hold=true when human decision required but not provided', () => {
      const context = {
        requiresHumanDecision: true,
        humanDecisionProvided: false
      };

      const result = shouldHold('mockup', context);

      expect(result.hold).toBe(true);
      expect(result.conditions.length).toBeGreaterThan(0);
    });

    it('should return hold=false when human decision provided', () => {
      const context = {
        requiresHumanDecision: true,
        humanDecisionProvided: true
      };

      const result = shouldHold('mockup', context);

      expect(result.hold).toBe(false);
    });

    it('should return hold=true when budget approaching limit', () => {
      const context = {
        estimatedCost: 90,
        budgetThreshold: 100
      };

      const result = shouldHold('execution-plan', context);

      expect(result.hold).toBe(true);
      expect(result.conditions.some(c => c.reason === HOLD_REASONS.BUDGET_REVIEW_NEEDED)).toBe(true);
    });

    it('should return hold=false when budget well within limit', () => {
      const context = {
        estimatedCost: 50,
        budgetThreshold: 100
      };

      const result = shouldHold('execution-plan', context);

      // Should not hold for budget alone
      expect(result.conditions.some(c => c.reason === HOLD_REASONS.BUDGET_REVIEW_NEEDED)).toBe(false);
    });

    it('should return hold=true when risk score is high', () => {
      const context = {
        riskScore: 0.85
      };

      const result = shouldHold('compliance-safety', context);

      expect(result.hold).toBe(true);
      expect(result.conditions.some(c => c.reason === HOLD_REASONS.RISK_ASSESSMENT_NEEDED)).toBe(true);
    });

    it('should return hold=false when risk score is low', () => {
      const context = {
        riskScore: 0.3
      };

      const result = shouldHold('compliance-safety', context);

      expect(result.conditions.some(c => c.reason === HOLD_REASONS.RISK_ASSESSMENT_NEEDED)).toBe(false);
    });

    it('should return multiple hold conditions when applicable', () => {
      const context = {
        requiresHumanDecision: true,
        humanDecisionProvided: false,
        riskScore: 0.9
      };

      const result = shouldHold('compliance-safety', context);

      expect(result.hold).toBe(true);
      expect(result.conditions.length).toBeGreaterThanOrEqual(2);
    });

    it('should return hold=false when no conditions apply', () => {
      const context = {
        requiresHumanDecision: false,
        estimatedCost: 10,
        budgetThreshold: 100,
        riskScore: 0.1
      };

      const result = shouldHold('mockup', context);

      expect(result.hold).toBe(false);
      expect(result.conditions).toHaveLength(0);
    });

    it('should include message in each condition', () => {
      const context = {
        requiresHumanDecision: true,
        humanDecisionProvided: false
      };

      const result = shouldHold('mockup', context);

      expect(result.conditions[0].message).toBeDefined();
    });
  });

  // ============================================
  // getHoldReason Tests
  // ============================================

  describe('getHoldReason', () => {
    it('should return human-friendly reason for AWAITING_HUMAN_INPUT', () => {
      const reason = getHoldReason(HOLD_REASONS.AWAITING_HUMAN_INPUT);

      expect(reason).toContain('human');
    });

    it('should return human-friendly reason for BUDGET_REVIEW_NEEDED', () => {
      const reason = getHoldReason(HOLD_REASONS.BUDGET_REVIEW_NEEDED);

      expect(reason.toLowerCase()).toContain('budget');
    });

    it('should return human-friendly reason for RISK_ASSESSMENT_NEEDED', () => {
      const reason = getHoldReason(HOLD_REASONS.RISK_ASSESSMENT_NEEDED);

      expect(reason).toContain('risk');
    });

    it('should return generic reason for unknown code', () => {
      const reason = getHoldReason('unknown');

      expect(reason).toBeDefined();
    });
  });

  // ============================================
  // canResumeFromHold Tests
  // ============================================

  describe('canResumeFromHold', () => {
    it('should return true when human input provided', () => {
      const holdConditions = [
        { reason: HOLD_REASONS.AWAITING_HUMAN_INPUT }
      ];
      const context = {
        humanDecisionProvided: true
      };

      const result = canResumeFromHold(holdConditions, context);

      expect(result.canResume).toBe(true);
    });

    it('should return false when human input still missing', () => {
      const holdConditions = [
        { reason: HOLD_REASONS.AWAITING_HUMAN_INPUT }
      ];
      const context = {
        humanDecisionProvided: false
      };

      const result = canResumeFromHold(holdConditions, context);

      expect(result.canResume).toBe(false);
    });

    it('should return true when budget approved', () => {
      const holdConditions = [
        { reason: HOLD_REASONS.BUDGET_REVIEW_NEEDED }
      ];
      const context = {
        budgetApproved: true
      };

      const result = canResumeFromHold(holdConditions, context);

      expect(result.canResume).toBe(true);
    });

    it('should return false when not all conditions resolved', () => {
      const holdConditions = [
        { reason: HOLD_REASONS.AWAITING_HUMAN_INPUT },
        { reason: HOLD_REASONS.BUDGET_REVIEW_NEEDED }
      ];
      const context = {
        humanDecisionProvided: true,
        budgetApproved: false
      };

      const result = canResumeFromHold(holdConditions, context);

      expect(result.canResume).toBe(false);
    });

    it('should return remaining blockers when cannot resume', () => {
      const holdConditions = [
        { reason: HOLD_REASONS.AWAITING_HUMAN_INPUT }
      ];
      const context = {
        humanDecisionProvided: false
      };

      const result = canResumeFromHold(holdConditions, context);

      expect(result.remainingBlockers).toHaveLength(1);
    });
  });

  // ============================================
  // createHoldContext Tests
  // ============================================

  describe('createHoldContext', () => {
    it('should create hold context with step ID', () => {
      const context = createHoldContext('mockup', [
        { reason: HOLD_REASONS.AWAITING_HUMAN_INPUT, message: 'Test' }
      ]);

      expect(context.stepId).toBe('mockup');
    });

    it('should include conditions in context', () => {
      const conditions = [
        { reason: HOLD_REASONS.AWAITING_HUMAN_INPUT, message: 'Test' }
      ];
      const context = createHoldContext('mockup', conditions);

      expect(context.conditions).toEqual(conditions);
    });

    it('should include timestamp', () => {
      const context = createHoldContext('mockup', []);

      expect(context.heldAt).toBeDefined();
    });

    it('should calculate expected resolution time', () => {
      const context = createHoldContext('mockup', [
        { reason: HOLD_REASONS.AWAITING_HUMAN_INPUT, message: 'Test' }
      ]);

      expect(context.expectedResolutionHours).toBeGreaterThan(0);
    });

    it('should include status as hold', () => {
      const context = createHoldContext('mockup', []);

      expect(context.status).toBe('hold');
    });
  });
});
