/**
 * TDD Tests for Business Case Validation (Grok Recommendation G4.1)
 *
 * Validates business justification exists (PRINCE2 PID)
 */

import { describe, it, expect } from 'vitest';

import {
  BUSINESS_CASE_SCHEMA,
  validateBusinessCase,
  detectBusinessCase,
  createBusinessCaseSummary
} from '../utils/business-case.js';

describe('Business Case Validation (G4.1)', () => {

  // ============================================
  // BUSINESS_CASE_SCHEMA Constants Tests
  // ============================================

  describe('BUSINESS_CASE_SCHEMA', () => {
    it('should require executive_summary', () => {
      expect(BUSINESS_CASE_SCHEMA.required).toContain('executive_summary');
    });

    it('should require reasons', () => {
      expect(BUSINESS_CASE_SCHEMA.required).toContain('reasons');
    });

    it('should require business_options', () => {
      expect(BUSINESS_CASE_SCHEMA.required).toContain('business_options');
    });

    it('should require expected_benefits', () => {
      expect(BUSINESS_CASE_SCHEMA.required).toContain('expected_benefits');
    });

    it('should require expected_costs', () => {
      expect(BUSINESS_CASE_SCHEMA.required).toContain('expected_costs');
    });

    it('should require risks', () => {
      expect(BUSINESS_CASE_SCHEMA.required).toContain('risks');
    });

    it('should have timescale as optional', () => {
      expect(BUSINESS_CASE_SCHEMA.optional).toContain('timescale');
    });

    it('should have investment_appraisal as optional', () => {
      expect(BUSINESS_CASE_SCHEMA.optional).toContain('investment_appraisal');
    });
  });

  // ============================================
  // validateBusinessCase Tests
  // ============================================

  describe('validateBusinessCase', () => {
    const validBusinessCase = {
      executive_summary: 'Build feature X to increase revenue',
      reasons: 'Market demand and competitive pressure',
      business_options: ['Build in-house', 'Buy solution', 'Partnership'],
      expected_benefits: 50000,
      expected_costs: 20000,
      risks: ['Technical complexity', 'Resource availability']
    };

    it('should validate complete business case', () => {
      const result = validateBusinessCase(validBusinessCase);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when missing executive_summary', () => {
      const incomplete = { ...validBusinessCase };
      delete incomplete.executive_summary;

      const result = validateBusinessCase(incomplete);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: executive_summary');
    });

    it('should fail when missing reasons', () => {
      const incomplete = { ...validBusinessCase };
      delete incomplete.reasons;

      const result = validateBusinessCase(incomplete);

      expect(result.valid).toBe(false);
    });

    it('should fail when missing expected_benefits', () => {
      const incomplete = { ...validBusinessCase };
      delete incomplete.expected_benefits;

      const result = validateBusinessCase(incomplete);

      expect(result.valid).toBe(false);
    });

    it('should warn when missing optional timescale', () => {
      const result = validateBusinessCase(validBusinessCase);

      expect(result.warnings.some(w => w.includes('timescale'))).toBe(true);
    });

    it('should warn when ROI < 1', () => {
      const lowROI = {
        ...validBusinessCase,
        expected_benefits: 10000,
        expected_costs: 50000
      };

      const result = validateBusinessCase(lowROI);

      expect(result.warnings.some(w => w.includes('ROI'))).toBe(true);
    });

    it('should not warn about ROI when ROI >= 1', () => {
      const result = validateBusinessCase(validBusinessCase);

      // ROI is 50000/20000 = 2.5, should not warn
      expect(result.warnings.some(w => w.includes('ROI') && w.includes('<'))).toBe(false);
    });

    it('should include all errors in result', () => {
      const result = validateBusinessCase({});

      expect(result.errors.length).toBeGreaterThanOrEqual(6);
    });
  });

  // ============================================
  // detectBusinessCase Tests
  // ============================================

  describe('detectBusinessCase', () => {
    it('should return object with found property', () => {
      const result = detectBusinessCase('/fake/path');

      expect(result).toHaveProperty('found');
    });

    it('should return object with path property', () => {
      const result = detectBusinessCase('/fake/path');

      expect(result).toHaveProperty('path');
    });

    it('should return found=false for non-existent path', () => {
      const result = detectBusinessCase('/non/existent/path');

      expect(result.found).toBe(false);
    });
  });

  // ============================================
  // createBusinessCaseSummary Tests
  // ============================================

  describe('createBusinessCaseSummary', () => {
    const validBusinessCase = {
      executive_summary: 'Build feature X to increase revenue',
      reasons: 'Market demand',
      business_options: ['Build', 'Buy'],
      expected_benefits: 50000,
      expected_costs: 20000,
      risks: ['Risk 1', 'Risk 2']
    };

    it('should create summary with project name', () => {
      const summary = createBusinessCaseSummary('Test Project', validBusinessCase);

      expect(summary.projectName).toBe('Test Project');
    });

    it('should calculate ROI', () => {
      const summary = createBusinessCaseSummary('Test Project', validBusinessCase);

      expect(summary.roi).toBe(2.5);
    });

    it('should count risks', () => {
      const summary = createBusinessCaseSummary('Test Project', validBusinessCase);

      expect(summary.riskCount).toBe(2);
    });

    it('should include validation status', () => {
      const summary = createBusinessCaseSummary('Test Project', validBusinessCase);

      expect(summary.isValid).toBe(true);
    });
  });
});
