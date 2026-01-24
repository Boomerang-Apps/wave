/**
 * TDD Tests for User Testing Gate (Grok Recommendation G3.2)
 *
 * Optional but recommended gate between mockups and development
 * Based on Design Sprint Day 5 methodology
 */

import { describe, it, expect } from 'vitest';

import {
  USER_TESTING_GATE,
  shouldRequireUserTesting,
  canSkipUserTesting,
  recordSkipReason
} from '../utils/user-testing-gate.js';

describe('User Testing Gate (G3.2)', () => {

  // ============================================
  // USER_TESTING_GATE Constants Tests
  // ============================================

  describe('USER_TESTING_GATE', () => {
    it('should have id defined', () => {
      expect(USER_TESTING_GATE.id).toBe('user-testing');
    });

    it('should be positioned between step 1 and 2', () => {
      expect(USER_TESTING_GATE.step).toBe(1.5);
    });

    it('should have label', () => {
      expect(USER_TESTING_GATE.label).toBe('User Testing');
    });

    it('should not be required by default', () => {
      expect(USER_TESTING_GATE.required).toBe(false);
    });

    it('should be recommended for new_product', () => {
      expect(USER_TESTING_GATE.recommendedFor).toContain('new_product');
    });

    it('should be recommended for major_redesign', () => {
      expect(USER_TESTING_GATE.recommendedFor).toContain('major_redesign');
    });

    it('should be recommended for user_facing_features', () => {
      expect(USER_TESTING_GATE.recommendedFor).toContain('user_facing_features');
    });

    it('should be skippable', () => {
      expect(USER_TESTING_GATE.canSkip).toBe(true);
    });

    it('should require tech_lead_approval to skip', () => {
      expect(USER_TESTING_GATE.skipRequires).toBe('tech_lead_approval');
    });
  });

  // ============================================
  // shouldRequireUserTesting Tests
  // ============================================

  describe('shouldRequireUserTesting', () => {
    it('should require testing for new_product', () => {
      const context = { projectType: 'new_product' };

      const result = shouldRequireUserTesting(context);

      expect(result.required).toBe(true);
    });

    it('should include reason for new_product', () => {
      const context = { projectType: 'new_product' };

      const result = shouldRequireUserTesting(context);

      expect(result.reason).toContain('new_product');
    });

    it('should require testing for major_redesign', () => {
      const context = { projectType: 'major_redesign' };

      const result = shouldRequireUserTesting(context);

      expect(result.required).toBe(true);
    });

    it('should require testing for user-facing redesign', () => {
      const context = {
        projectType: 'maintenance',
        hasUserFacing: true,
        isRedesign: true
      };

      const result = shouldRequireUserTesting(context);

      expect(result.required).toBe(true);
    });

    it('should not require testing for backend-only changes', () => {
      const context = {
        projectType: 'backend_update',
        hasUserFacing: false,
        isRedesign: false
      };

      const result = shouldRequireUserTesting(context);

      expect(result.required).toBe(false);
    });

    it('should include reason when not required', () => {
      const context = {
        projectType: 'backend_update',
        hasUserFacing: false
      };

      const result = shouldRequireUserTesting(context);

      expect(result.reason).toBeDefined();
    });
  });

  // ============================================
  // canSkipUserTesting Tests
  // ============================================

  describe('canSkipUserTesting', () => {
    it('should allow skip with tech_lead approval', () => {
      const result = canSkipUserTesting('tech_lead');

      expect(result.canSkip).toBe(true);
    });

    it('should allow skip with cto approval', () => {
      const result = canSkipUserTesting('cto');

      expect(result.canSkip).toBe(true);
    });

    it('should not allow skip with product_owner only', () => {
      const result = canSkipUserTesting('product_owner');

      expect(result.canSkip).toBe(false);
    });

    it('should include reason when cannot skip', () => {
      const result = canSkipUserTesting('product_owner');

      expect(result.reason).toBeDefined();
    });
  });

  // ============================================
  // recordSkipReason Tests
  // ============================================

  describe('recordSkipReason', () => {
    it('should record skip with approver', () => {
      const record = recordSkipReason('tech_lead', 'Time constraints');

      expect(record.approver).toBe('tech_lead');
    });

    it('should include reason', () => {
      const record = recordSkipReason('tech_lead', 'Time constraints');

      expect(record.reason).toBe('Time constraints');
    });

    it('should include timestamp', () => {
      const record = recordSkipReason('tech_lead', 'Time constraints');

      expect(record.skippedAt).toBeDefined();
    });

    it('should mark as skipped', () => {
      const record = recordSkipReason('tech_lead', 'Time constraints');

      expect(record.skipped).toBe(true);
    });
  });
});
