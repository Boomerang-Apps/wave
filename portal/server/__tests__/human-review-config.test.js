/**
 * TDD Tests for Human Review Config (Grok Recommendation G2.1)
 *
 * Defines which gates require independent human verification
 */

import { describe, it, expect } from 'vitest';

import {
  HUMAN_REVIEW_GATES,
  REVIEWER_ROLES,
  requiresHumanReview,
  getReviewerForStep,
  canBypassReview,
  getReviewConfig
} from '../utils/human-review-config.js';

describe('Human Review Config (G2.1)', () => {

  // ============================================
  // HUMAN_REVIEW_GATES Constants Tests
  // ============================================

  describe('HUMAN_REVIEW_GATES', () => {
    it('should require human review for mockup-design', () => {
      expect(HUMAN_REVIEW_GATES['mockup-design']).toBeDefined();
      expect(HUMAN_REVIEW_GATES['mockup-design'].required).toBe(true);
    });

    it('should require human review for execution-plan', () => {
      expect(HUMAN_REVIEW_GATES['execution-plan']).toBeDefined();
      expect(HUMAN_REVIEW_GATES['execution-plan'].required).toBe(true);
    });

    it('should require human review for compliance-safety', () => {
      expect(HUMAN_REVIEW_GATES['compliance-safety']).toBeDefined();
      expect(HUMAN_REVIEW_GATES['compliance-safety'].required).toBe(true);
    });

    it('should require human review for agent-dispatch', () => {
      expect(HUMAN_REVIEW_GATES['agent-dispatch']).toBeDefined();
      expect(HUMAN_REVIEW_GATES['agent-dispatch'].required).toBe(true);
    });

    it('should have reviewer assigned for each gate', () => {
      for (const [stepId, config] of Object.entries(HUMAN_REVIEW_GATES)) {
        expect(config.reviewer).toBeDefined();
      }
    });

    it('should have description for each gate', () => {
      for (const [stepId, config] of Object.entries(HUMAN_REVIEW_GATES)) {
        expect(config.description).toBeDefined();
      }
    });

    it('should mark mockup-design as non-bypassable', () => {
      expect(HUMAN_REVIEW_GATES['mockup-design'].bypassable).toBe(false);
    });

    it('should mark execution-plan as bypassable', () => {
      expect(HUMAN_REVIEW_GATES['execution-plan'].bypassable).toBe(true);
    });

    it('should mark agent-dispatch as non-bypassable', () => {
      expect(HUMAN_REVIEW_GATES['agent-dispatch'].bypassable).toBe(false);
    });

    it('should require all previous green for agent-dispatch', () => {
      expect(HUMAN_REVIEW_GATES['agent-dispatch'].requiresAllPreviousGreen).toBe(true);
    });
  });

  // ============================================
  // REVIEWER_ROLES Constants Tests
  // ============================================

  describe('REVIEWER_ROLES', () => {
    it('should have product_owner role', () => {
      expect(REVIEWER_ROLES.product_owner).toBeDefined();
    });

    it('should have tech_lead role', () => {
      expect(REVIEWER_ROLES.tech_lead).toBeDefined();
    });

    it('should have safety_officer role', () => {
      expect(REVIEWER_ROLES.safety_officer).toBeDefined();
    });

    it('should have cto role', () => {
      expect(REVIEWER_ROLES.cto).toBeDefined();
    });

    it('should have level for each role', () => {
      for (const [role, config] of Object.entries(REVIEWER_ROLES)) {
        expect(typeof config.level).toBe('number');
      }
    });

    it('should order roles by level (cto highest)', () => {
      expect(REVIEWER_ROLES.cto.level).toBeGreaterThan(REVIEWER_ROLES.tech_lead.level);
      expect(REVIEWER_ROLES.tech_lead.level).toBeGreaterThan(REVIEWER_ROLES.product_owner.level);
    });

    it('should define canBypass for each role', () => {
      for (const [role, config] of Object.entries(REVIEWER_ROLES)) {
        expect(Array.isArray(config.canBypass)).toBe(true);
      }
    });

    it('should allow cto to bypass tech_lead and product_owner', () => {
      expect(REVIEWER_ROLES.cto.canBypass).toContain('tech_lead');
      expect(REVIEWER_ROLES.cto.canBypass).toContain('product_owner');
    });
  });

  // ============================================
  // requiresHumanReview Tests
  // ============================================

  describe('requiresHumanReview', () => {
    it('should return true for mockup-design', () => {
      expect(requiresHumanReview('mockup-design')).toBe(true);
    });

    it('should return true for agent-dispatch', () => {
      expect(requiresHumanReview('agent-dispatch')).toBe(true);
    });

    it('should return false for steps not requiring review', () => {
      expect(requiresHumanReview('system-config')).toBe(false);
    });

    it('should return false for unknown steps', () => {
      expect(requiresHumanReview('unknown-step')).toBe(false);
    });
  });

  // ============================================
  // getReviewerForStep Tests
  // ============================================

  describe('getReviewerForStep', () => {
    it('should return product_owner for mockup-design', () => {
      expect(getReviewerForStep('mockup-design')).toBe('product_owner');
    });

    it('should return tech_lead for execution-plan', () => {
      expect(getReviewerForStep('execution-plan')).toBe('tech_lead');
    });

    it('should return safety_officer for compliance-safety', () => {
      expect(getReviewerForStep('compliance-safety')).toBe('safety_officer');
    });

    it('should return cto for agent-dispatch', () => {
      expect(getReviewerForStep('agent-dispatch')).toBe('cto');
    });

    it('should return null for steps without review requirement', () => {
      expect(getReviewerForStep('system-config')).toBeNull();
    });
  });

  // ============================================
  // canBypassReview Tests
  // ============================================

  describe('canBypassReview', () => {
    it('should return false for non-bypassable gates', () => {
      expect(canBypassReview('mockup-design', 'cto')).toBe(false);
    });

    it('should return true for bypassable gates with authorized role', () => {
      expect(canBypassReview('execution-plan', 'cto')).toBe(true);
    });

    it('should return false for bypassable gates with unauthorized role', () => {
      expect(canBypassReview('execution-plan', 'product_owner')).toBe(false);
    });

    it('should return false for unknown gates', () => {
      expect(canBypassReview('unknown-gate', 'cto')).toBe(false);
    });
  });

  // ============================================
  // getReviewConfig Tests
  // ============================================

  describe('getReviewConfig', () => {
    it('should return full config for configured steps', () => {
      const config = getReviewConfig('mockup-design');

      expect(config.required).toBe(true);
      expect(config.reviewer).toBe('product_owner');
      expect(config.description).toBeDefined();
    });

    it('should return null for unconfigured steps', () => {
      expect(getReviewConfig('unknown-step')).toBeNull();
    });

    it('should include bypassApprover when applicable', () => {
      const config = getReviewConfig('execution-plan');

      expect(config.bypassApprover).toBe('cto');
    });
  });
});
