/**
 * TDD Tests for Independent Verification (Grok Recommendation G2.3)
 *
 * Ensures critical checks are verified by someone other than creator
 */

import { describe, it, expect } from 'vitest';

import {
  INDEPENDENT_VERIFICATION_STEPS,
  requiresIndependentVerification,
  validateIndependentReviewer,
  getVerificationRequirements,
  createVerificationRecord
} from '../utils/independent-verification.js';

describe('Independent Verification (G2.3)', () => {

  // ============================================
  // INDEPENDENT_VERIFICATION_STEPS Constants Tests
  // ============================================

  describe('INDEPENDENT_VERIFICATION_STEPS', () => {
    it('should include compliance-safety', () => {
      expect(INDEPENDENT_VERIFICATION_STEPS).toContain('compliance-safety');
    });

    it('should include agent-dispatch', () => {
      expect(INDEPENDENT_VERIFICATION_STEPS).toContain('agent-dispatch');
    });

    it('should have at least 2 steps requiring independent verification', () => {
      expect(INDEPENDENT_VERIFICATION_STEPS.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // requiresIndependentVerification Tests
  // ============================================

  describe('requiresIndependentVerification', () => {
    it('should return true for compliance-safety', () => {
      expect(requiresIndependentVerification('compliance-safety')).toBe(true);
    });

    it('should return true for agent-dispatch', () => {
      expect(requiresIndependentVerification('agent-dispatch')).toBe(true);
    });

    it('should return false for mockup-design', () => {
      expect(requiresIndependentVerification('mockup-design')).toBe(false);
    });

    it('should return false for system-config', () => {
      expect(requiresIndependentVerification('system-config')).toBe(false);
    });

    it('should return false for unknown steps', () => {
      expect(requiresIndependentVerification('unknown-step')).toBe(false);
    });
  });

  // ============================================
  // validateIndependentReviewer Tests
  // ============================================

  describe('validateIndependentReviewer', () => {
    it('should return valid=false when reviewer same as author', () => {
      const result = validateIndependentReviewer(
        'compliance-safety',
        'john@example.com',
        'john@example.com'
      );

      expect(result.valid).toBe(false);
    });

    it('should include error message when invalid', () => {
      const result = validateIndependentReviewer(
        'compliance-safety',
        'john@example.com',
        'john@example.com'
      );

      expect(result.error).toContain('different reviewer');
    });

    it('should return valid=true when reviewer different from author', () => {
      const result = validateIndependentReviewer(
        'compliance-safety',
        'john@example.com',
        'jane@example.com'
      );

      expect(result.valid).toBe(true);
    });

    it('should not have error when valid', () => {
      const result = validateIndependentReviewer(
        'compliance-safety',
        'john@example.com',
        'jane@example.com'
      );

      expect(result.error).toBeUndefined();
    });

    it('should be case-insensitive for email comparison', () => {
      const result = validateIndependentReviewer(
        'compliance-safety',
        'John@Example.com',
        'john@example.com'
      );

      expect(result.valid).toBe(false);
    });

    it('should return valid=true for steps not requiring independent verification', () => {
      const result = validateIndependentReviewer(
        'mockup-design',
        'john@example.com',
        'john@example.com'
      );

      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // getVerificationRequirements Tests
  // ============================================

  describe('getVerificationRequirements', () => {
    it('should return requirements for compliance-safety', () => {
      const req = getVerificationRequirements('compliance-safety');

      expect(req).not.toBeNull();
      expect(req.requiresIndependentReviewer).toBe(true);
    });

    it('should return requirements for agent-dispatch', () => {
      const req = getVerificationRequirements('agent-dispatch');

      expect(req).not.toBeNull();
      expect(req.requiresIndependentReviewer).toBe(true);
    });

    it('should return null for steps not requiring independent verification', () => {
      const req = getVerificationRequirements('mockup-design');

      expect(req).toBeNull();
    });

    it('should include description when applicable', () => {
      const req = getVerificationRequirements('compliance-safety');

      expect(req.description).toBeDefined();
    });
  });

  // ============================================
  // createVerificationRecord Tests
  // ============================================

  describe('createVerificationRecord', () => {
    it('should create record with stepId', () => {
      const record = createVerificationRecord(
        'compliance-safety',
        'john@example.com',
        'jane@example.com'
      );

      expect(record.stepId).toBe('compliance-safety');
    });

    it('should include original author', () => {
      const record = createVerificationRecord(
        'compliance-safety',
        'john@example.com',
        'jane@example.com'
      );

      expect(record.originalAuthor).toBe('john@example.com');
    });

    it('should include verifier', () => {
      const record = createVerificationRecord(
        'compliance-safety',
        'john@example.com',
        'jane@example.com'
      );

      expect(record.verifier).toBe('jane@example.com');
    });

    it('should include verification timestamp', () => {
      const record = createVerificationRecord(
        'compliance-safety',
        'john@example.com',
        'jane@example.com'
      );

      expect(record.verifiedAt).toBeDefined();
    });

    it('should mark as independently verified', () => {
      const record = createVerificationRecord(
        'compliance-safety',
        'john@example.com',
        'jane@example.com'
      );

      expect(record.independentlyVerified).toBe(true);
    });

    it('should mark as not independently verified when same reviewer', () => {
      const record = createVerificationRecord(
        'compliance-safety',
        'john@example.com',
        'john@example.com'
      );

      expect(record.independentlyVerified).toBe(false);
    });
  });
});
