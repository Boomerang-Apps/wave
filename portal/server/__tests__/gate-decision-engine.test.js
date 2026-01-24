/**
 * TDD Tests for Gate Decision Engine (Grok Recommendation G1.4)
 *
 * Makes Go/Kill/Hold/Recycle decisions at each gate
 * Based on Stage-Gate methodology
 */

import { describe, it, expect } from 'vitest';

import {
  makeGateDecision,
  applyDecision,
  getDecisionHistory,
  validateDecision
} from '../utils/gate-decision-engine.js';

import { GATE_STATUSES, GATE_DECISIONS } from '../utils/gate-status-types.js';

describe('Gate Decision Engine (G1.4)', () => {

  // ============================================
  // makeGateDecision Tests
  // ============================================

  describe('makeGateDecision', () => {

    // GO decisions
    describe('GO decisions', () => {
      it('should return GO when validation passes', () => {
        const validationResult = {
          passed: true,
          errors: [],
          warnings: [],
          retryCount: 0
        };
        const context = {};

        const result = makeGateDecision('mockup', validationResult, context);

        expect(result.decision).toBe(GATE_DECISIONS.GO);
        expect(result.status).toBe(GATE_STATUSES.READY);
      });

      it('should include timestamp in decision', () => {
        const validationResult = { passed: true, errors: [], warnings: [], retryCount: 0 };
        const context = {};

        const result = makeGateDecision('mockup', validationResult, context);

        expect(result.timestamp).toBeDefined();
      });
    });

    // KILL decisions
    describe('KILL decisions', () => {
      it('should return KILL when max retries exceeded', () => {
        const validationResult = {
          passed: false,
          errors: ['Some error'],
          warnings: [],
          retryCount: 4
        };
        const context = {};

        const result = makeGateDecision('mockup', validationResult, context);

        expect(result.decision).toBe(GATE_DECISIONS.KILL);
        expect(result.status).toBe(GATE_STATUSES.KILLED);
      });

      it('should return KILL for matching kill condition', () => {
        const validationResult = {
          passed: false,
          errors: ['Human explicitly marks as abandoned'],
          warnings: [],
          retryCount: 0
        };
        const context = {};

        const result = makeGateDecision('mockup', validationResult, context);

        expect(result.decision).toBe(GATE_DECISIONS.KILL);
      });

      it('should include kill reason', () => {
        const validationResult = {
          passed: false,
          errors: [],
          warnings: [],
          retryCount: 5
        };
        const context = {};

        const result = makeGateDecision('mockup', validationResult, context);

        expect(result.reason).toBeDefined();
      });
    });

    // HOLD decisions
    describe('HOLD decisions', () => {
      it('should return HOLD when human decision required', () => {
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

        const result = makeGateDecision('mockup', validationResult, context);

        expect(result.decision).toBe(GATE_DECISIONS.HOLD);
        expect(result.status).toBe(GATE_STATUSES.HOLD);
      });

      it('should return HOLD when budget approaching limit', () => {
        const validationResult = {
          passed: false,
          errors: [],
          warnings: [],
          retryCount: 0
        };
        const context = {
          estimatedCost: 90,
          budgetThreshold: 100
        };

        const result = makeGateDecision('execution-plan', validationResult, context);

        expect(result.decision).toBe(GATE_DECISIONS.HOLD);
      });

      it('should include hold reasons', () => {
        const validationResult = {
          passed: false,
          errors: [],
          warnings: [],
          retryCount: 0
        };
        const context = {
          riskScore: 0.9
        };

        const result = makeGateDecision('compliance-safety', validationResult, context);

        expect(result.reasons).toBeDefined();
        expect(result.reasons.length).toBeGreaterThan(0);
      });
    });

    // RECYCLE decisions
    describe('RECYCLE decisions', () => {
      it('should return RECYCLE when rework required', () => {
        const validationResult = {
          passed: false,
          errors: ['Alignment mismatch'],
          warnings: [],
          retryCount: 1,
          requiresRework: true,
          recycleTarget: 'mockup-design'
        };
        const context = {};

        const result = makeGateDecision('project-overview', validationResult, context);

        expect(result.decision).toBe(GATE_DECISIONS.RECYCLE);
        expect(result.status).toBe(GATE_STATUSES.RECYCLE);
      });

      it('should include recycle target step', () => {
        const validationResult = {
          passed: false,
          errors: [],
          warnings: [],
          retryCount: 1,
          requiresRework: true,
          recycleTarget: 'mockup-design'
        };
        const context = {};

        const result = makeGateDecision('project-overview', validationResult, context);

        expect(result.recycleToStep).toBe('mockup-design');
      });
    });

    // BLOCKED decisions
    describe('BLOCKED decisions', () => {
      it('should return BLOCKED when validation fails but can retry', () => {
        const validationResult = {
          passed: false,
          errors: ['Some error'],
          warnings: [],
          retryCount: 1
        };
        const context = {};

        const result = makeGateDecision('mockup', validationResult, context);

        expect(result.decision).toBeNull();
        expect(result.status).toBe(GATE_STATUSES.BLOCKED);
      });

      it('should indicate can retry when retries remain', () => {
        const validationResult = {
          passed: false,
          errors: ['Error'],
          warnings: [],
          retryCount: 1
        };
        const context = {};

        const result = makeGateDecision('mockup', validationResult, context);

        expect(result.canRetry).toBe(true);
      });

      it('should include errors in blocked result', () => {
        const validationResult = {
          passed: false,
          errors: ['Error 1', 'Error 2'],
          warnings: [],
          retryCount: 0
        };
        const context = {};

        const result = makeGateDecision('mockup', validationResult, context);

        expect(result.errors).toEqual(['Error 1', 'Error 2']);
      });
    });

    // Human review required
    describe('Human review required', () => {
      it('should return PENDING_HUMAN_REVIEW when required', () => {
        const validationResult = {
          passed: true,
          errors: [],
          warnings: [],
          retryCount: 0
        };
        const context = {
          requiresHumanReview: true
        };

        const result = makeGateDecision('agent-dispatch', validationResult, context);

        expect(result.decision).toBeNull();
        expect(result.status).toBe(GATE_STATUSES.PENDING_HUMAN_REVIEW);
      });
    });

    // Priority order
    describe('Decision priority', () => {
      it('should prioritize KILL over HOLD', () => {
        const validationResult = {
          passed: false,
          errors: ['Human explicitly marks as abandoned'],
          warnings: [],
          retryCount: 0
        };
        const context = {
          requiresHumanDecision: true,
          humanDecisionProvided: false
        };

        const result = makeGateDecision('mockup', validationResult, context);

        expect(result.decision).toBe(GATE_DECISIONS.KILL);
      });

      it('should prioritize HOLD over RECYCLE', () => {
        const validationResult = {
          passed: false,
          errors: [],
          warnings: [],
          retryCount: 1,
          requiresRework: true,
          recycleTarget: 'mockup-design'
        };
        const context = {
          riskScore: 0.9
        };

        const result = makeGateDecision('project-overview', validationResult, context);

        expect(result.decision).toBe(GATE_DECISIONS.HOLD);
      });
    });
  });

  // ============================================
  // applyDecision Tests
  // ============================================

  describe('applyDecision', () => {
    it('should apply GO decision', () => {
      const decision = {
        decision: GATE_DECISIONS.GO,
        status: GATE_STATUSES.READY,
        timestamp: new Date().toISOString()
      };

      const result = applyDecision('mockup', decision);

      expect(result.stepId).toBe('mockup');
      expect(result.status).toBe(GATE_STATUSES.READY);
      expect(result.applied).toBe(true);
    });

    it('should apply KILL decision', () => {
      const decision = {
        decision: GATE_DECISIONS.KILL,
        status: GATE_STATUSES.KILLED,
        reason: 'Max retries exceeded',
        timestamp: new Date().toISOString()
      };

      const result = applyDecision('mockup', decision);

      expect(result.status).toBe(GATE_STATUSES.KILLED);
      expect(result.reason).toBe('Max retries exceeded');
    });

    it('should include appliedAt timestamp', () => {
      const decision = {
        decision: GATE_DECISIONS.GO,
        status: GATE_STATUSES.READY,
        timestamp: new Date().toISOString()
      };

      const result = applyDecision('mockup', decision);

      expect(result.appliedAt).toBeDefined();
    });
  });

  // ============================================
  // getDecisionHistory Tests
  // ============================================

  describe('getDecisionHistory', () => {
    it('should return empty array for no history', () => {
      const history = getDecisionHistory('mockup', {});

      expect(history).toEqual([]);
    });

    it('should return array of decisions', () => {
      const state = {
        decisionHistory: {
          mockup: [
            { decision: GATE_DECISIONS.GO, timestamp: '2026-01-24T00:00:00Z' }
          ]
        }
      };

      const history = getDecisionHistory('mockup', state);

      expect(history).toHaveLength(1);
    });

    it('should return decisions in chronological order', () => {
      const state = {
        decisionHistory: {
          mockup: [
            { decision: GATE_DECISIONS.HOLD, timestamp: '2026-01-24T01:00:00Z' },
            { decision: GATE_DECISIONS.GO, timestamp: '2026-01-24T02:00:00Z' }
          ]
        }
      };

      const history = getDecisionHistory('mockup', state);

      expect(history[0].decision).toBe(GATE_DECISIONS.HOLD);
      expect(history[1].decision).toBe(GATE_DECISIONS.GO);
    });
  });

  // ============================================
  // validateDecision Tests
  // ============================================

  describe('validateDecision', () => {
    it('should return valid for correct GO decision', () => {
      const decision = {
        decision: GATE_DECISIONS.GO,
        status: GATE_STATUSES.READY,
        timestamp: new Date().toISOString()
      };

      const result = validateDecision(decision);

      expect(result.valid).toBe(true);
    });

    it('should return invalid for missing decision', () => {
      const decision = {
        status: GATE_STATUSES.READY,
        timestamp: new Date().toISOString()
      };

      const result = validateDecision(decision);

      expect(result.valid).toBe(false);
    });

    it('should return invalid for mismatched status', () => {
      const decision = {
        decision: GATE_DECISIONS.GO,
        status: GATE_STATUSES.BLOCKED, // Mismatch
        timestamp: new Date().toISOString()
      };

      const result = validateDecision(decision);

      expect(result.valid).toBe(false);
    });

    it('should return invalid for missing timestamp', () => {
      const decision = {
        decision: GATE_DECISIONS.GO,
        status: GATE_STATUSES.READY
      };

      const result = validateDecision(decision);

      expect(result.valid).toBe(false);
    });

    it('should include errors for invalid decision', () => {
      const decision = {
        decision: GATE_DECISIONS.GO,
        status: GATE_STATUSES.BLOCKED
      };

      const result = validateDecision(decision);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
