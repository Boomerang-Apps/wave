/**
 * TDD Tests for Kill Criteria (Grok Recommendation G1.2)
 *
 * Defines when to abandon (KILL) a gate/story
 * Based on Stage-Gate methodology
 */

import { describe, it, expect } from 'vitest';

import {
  KILL_CRITERIA,
  shouldKill,
  getKillCriteriaForStep,
  evaluateKillCondition,
  getMaxRetries
} from '../utils/kill-criteria.js';

describe('Kill Criteria (G1.2)', () => {

  // ============================================
  // KILL_CRITERIA Constants Tests
  // ============================================

  describe('KILL_CRITERIA', () => {
    it('should have criteria for mockup step', () => {
      expect(KILL_CRITERIA.mockup).toBeDefined();
      expect(KILL_CRITERIA.mockup.maxRetries).toBeDefined();
    });

    it('should have criteria for stories step', () => {
      expect(KILL_CRITERIA.stories).toBeDefined();
      expect(KILL_CRITERIA.stories.maxRetries).toBeDefined();
    });

    it('should have criteria for wavePlan step', () => {
      expect(KILL_CRITERIA.wavePlan).toBeDefined();
    });

    it('should have global kill criteria', () => {
      expect(KILL_CRITERIA.global).toBeDefined();
      expect(KILL_CRITERIA.global.budgetExceeded).toBe(true);
    });

    it('should have timeout in global criteria', () => {
      expect(KILL_CRITERIA.global.timeoutHours).toBeGreaterThan(0);
    });

    it('should have human escalation timeout', () => {
      expect(KILL_CRITERIA.global.humanEscalationIgnored).toBeGreaterThan(0);
    });
  });

  // ============================================
  // shouldKill Tests
  // ============================================

  describe('shouldKill', () => {
    it('should return kill=true when max retries exceeded', () => {
      const result = shouldKill('mockup', 4, []);

      expect(result.kill).toBe(true);
      expect(result.reason).toContain('retries');
    });

    it('should return kill=false when retries within limit', () => {
      const result = shouldKill('mockup', 1, []);

      expect(result.kill).toBe(false);
    });

    it('should return kill=true for matching kill condition', () => {
      const conditions = ['No mockups after 3 validation attempts'];
      const result = shouldKill('mockup', 0, conditions);

      expect(result.kill).toBe(true);
    });

    it('should return kill=false for non-matching conditions', () => {
      const conditions = ['Some other error'];
      const result = shouldKill('mockup', 0, conditions);

      expect(result.kill).toBe(false);
    });

    it('should use default max retries for unknown step', () => {
      const result = shouldKill('unknown', 4, []);

      expect(result.kill).toBe(true);
    });

    it('should include reason when killing', () => {
      const result = shouldKill('mockup', 5, []);

      expect(result.reason).toBeDefined();
      expect(typeof result.reason).toBe('string');
    });

    it('should check multiple conditions', () => {
      const conditions = [
        'Random error',
        'Alignment score < 25% after fixes'
      ];
      const result = shouldKill('stories', 0, conditions);

      expect(result.kill).toBe(true);
    });

    it('should handle human explicit kill', () => {
      const conditions = ['Human explicitly marks as abandoned'];
      const result = shouldKill('mockup', 0, conditions);

      expect(result.kill).toBe(true);
    });
  });

  // ============================================
  // getKillCriteriaForStep Tests
  // ============================================

  describe('getKillCriteriaForStep', () => {
    it('should return criteria for mockup step', () => {
      const criteria = getKillCriteriaForStep('mockup');

      expect(criteria).toBeDefined();
      expect(criteria.maxRetries).toBeGreaterThan(0);
    });

    it('should return criteria for stories step', () => {
      const criteria = getKillCriteriaForStep('stories');

      expect(criteria).toBeDefined();
      expect(criteria.killConditions).toBeDefined();
    });

    it('should return default criteria for unknown step', () => {
      const criteria = getKillCriteriaForStep('unknown');

      expect(criteria).toBeDefined();
      expect(criteria.maxRetries).toBe(3); // Default
    });

    it('should include kill conditions list', () => {
      const criteria = getKillCriteriaForStep('mockup');

      expect(Array.isArray(criteria.killConditions)).toBe(true);
    });
  });

  // ============================================
  // evaluateKillCondition Tests
  // ============================================

  describe('evaluateKillCondition', () => {
    it('should return true for budget exceeded', () => {
      const context = { budgetExceeded: true };

      const result = evaluateKillCondition('global', 'budgetExceeded', context);

      expect(result).toBe(true);
    });

    it('should return true for timeout exceeded', () => {
      const context = {
        startedAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString() // 50 hours ago
      };

      const result = evaluateKillCondition('global', 'timeout', context);

      expect(result).toBe(true);
    });

    it('should return false for timeout not exceeded', () => {
      const context = {
        startedAt: new Date().toISOString() // Just started
      };

      const result = evaluateKillCondition('global', 'timeout', context);

      expect(result).toBe(false);
    });

    it('should return true for ignored human escalation', () => {
      const context = {
        humanEscalationAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      };

      const result = evaluateKillCondition('global', 'humanEscalationIgnored', context);

      expect(result).toBe(true);
    });

    it('should return false for recent human escalation', () => {
      const context = {
        humanEscalationAt: new Date().toISOString()
      };

      const result = evaluateKillCondition('global', 'humanEscalationIgnored', context);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // getMaxRetries Tests
  // ============================================

  describe('getMaxRetries', () => {
    it('should return 3 for mockup step', () => {
      expect(getMaxRetries('mockup')).toBe(3);
    });

    it('should return 3 for stories step', () => {
      expect(getMaxRetries('stories')).toBe(3);
    });

    it('should return default 3 for unknown step', () => {
      expect(getMaxRetries('unknown')).toBe(3);
    });

    it('should handle null step', () => {
      expect(getMaxRetries(null)).toBe(3);
    });
  });
});
