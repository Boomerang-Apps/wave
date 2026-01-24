/**
 * TDD Tests for Risk Register (Grok Recommendation G4.2)
 *
 * Tracks and validates project risks (PRINCE2)
 */

import { describe, it, expect } from 'vitest';

import {
  RISK_CATEGORIES,
  RISK_LEVELS,
  RISK_SCHEMA,
  validateRiskRegister,
  createRisk,
  calculateRiskScore
} from '../utils/risk-register.js';

describe('Risk Register (G4.2)', () => {

  // ============================================
  // RISK_CATEGORIES Constants Tests
  // ============================================

  describe('RISK_CATEGORIES', () => {
    it('should have TECHNICAL category', () => {
      expect(RISK_CATEGORIES.TECHNICAL).toBe('technical');
    });

    it('should have SCHEDULE category', () => {
      expect(RISK_CATEGORIES.SCHEDULE).toBe('schedule');
    });

    it('should have BUDGET category', () => {
      expect(RISK_CATEGORIES.BUDGET).toBe('budget');
    });

    it('should have RESOURCE category', () => {
      expect(RISK_CATEGORIES.RESOURCE).toBe('resource');
    });

    it('should have SECURITY category', () => {
      expect(RISK_CATEGORIES.SECURITY).toBe('security');
    });

    it('should have COMPLIANCE category', () => {
      expect(RISK_CATEGORIES.COMPLIANCE).toBe('compliance');
    });
  });

  // ============================================
  // RISK_LEVELS Constants Tests
  // ============================================

  describe('RISK_LEVELS', () => {
    it('should have LOW level', () => {
      expect(RISK_LEVELS.LOW).toBeDefined();
      expect(RISK_LEVELS.LOW.value).toBe(1);
    });

    it('should have MEDIUM level', () => {
      expect(RISK_LEVELS.MEDIUM).toBeDefined();
      expect(RISK_LEVELS.MEDIUM.value).toBe(2);
    });

    it('should have HIGH level', () => {
      expect(RISK_LEVELS.HIGH).toBeDefined();
      expect(RISK_LEVELS.HIGH.value).toBe(3);
    });

    it('should have CRITICAL level', () => {
      expect(RISK_LEVELS.CRITICAL).toBeDefined();
      expect(RISK_LEVELS.CRITICAL.value).toBe(4);
    });

    it('should have color for each level', () => {
      expect(RISK_LEVELS.LOW.color).toBe('green');
      expect(RISK_LEVELS.CRITICAL.color).toBe('red');
    });
  });

  // ============================================
  // RISK_SCHEMA Tests
  // ============================================

  describe('RISK_SCHEMA', () => {
    it('should require id', () => {
      expect(RISK_SCHEMA.id.required).toBe(true);
    });

    it('should require category', () => {
      expect(RISK_SCHEMA.category.required).toBe(true);
    });

    it('should require description', () => {
      expect(RISK_SCHEMA.description.required).toBe(true);
    });

    it('should require probability', () => {
      expect(RISK_SCHEMA.probability.required).toBe(true);
    });

    it('should require mitigation', () => {
      expect(RISK_SCHEMA.mitigation.required).toBe(true);
    });

    it('should require owner', () => {
      expect(RISK_SCHEMA.owner.required).toBe(true);
    });

    it('should require status', () => {
      expect(RISK_SCHEMA.status.required).toBe(true);
    });
  });

  // ============================================
  // validateRiskRegister Tests
  // ============================================

  describe('validateRiskRegister', () => {
    const validRisk = {
      id: 'RISK-001',
      category: 'technical',
      description: 'API may be unavailable',
      probability: 0.3,
      impact: 'MEDIUM',
      mitigation: 'Implement retry logic and fallback',
      owner: 'tech_lead',
      status: 'open'
    };

    it('should validate risk register with valid risks', () => {
      const result = validateRiskRegister([validRisk]);

      expect(result.valid).toBe(true);
    });

    it('should fail when register is empty', () => {
      const result = validateRiskRegister([]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Risk register must contain at least one risk');
    });

    it('should fail when register is not array', () => {
      const result = validateRiskRegister(null);

      expect(result.valid).toBe(false);
    });

    it('should fail when risk missing id', () => {
      const incomplete = { ...validRisk };
      delete incomplete.id;

      const result = validateRiskRegister([incomplete]);

      expect(result.valid).toBe(false);
    });

    it('should fail when risk missing category', () => {
      const incomplete = { ...validRisk };
      delete incomplete.category;

      const result = validateRiskRegister([incomplete]);

      expect(result.valid).toBe(false);
    });

    it('should fail when risk missing mitigation', () => {
      const incomplete = { ...validRisk };
      delete incomplete.mitigation;

      const result = validateRiskRegister([incomplete]);

      expect(result.valid).toBe(false);
    });

    it('should fail when high risk has no mitigation and is open', () => {
      const highRiskNoMitigation = {
        ...validRisk,
        impact: 'HIGH',
        mitigation: '',
        status: 'open'
      };

      const result = validateRiskRegister([highRiskNoMitigation]);

      expect(result.valid).toBe(false);
    });

    it('should include summary in result', () => {
      const result = validateRiskRegister([validRisk]);

      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(1);
    });

    it('should group risks by category', () => {
      const result = validateRiskRegister([validRisk]);

      expect(result.summary.byCategory).toBeDefined();
    });

    it('should group risks by status', () => {
      const result = validateRiskRegister([validRisk]);

      expect(result.summary.byStatus).toBeDefined();
    });

    it('should count high risks', () => {
      const highRisk = { ...validRisk, impact: 'HIGH' };

      const result = validateRiskRegister([highRisk]);

      expect(result.summary.highRiskCount).toBe(1);
    });
  });

  // ============================================
  // createRisk Tests
  // ============================================

  describe('createRisk', () => {
    it('should create risk with generated ID', () => {
      const risk = createRisk({
        category: 'technical',
        description: 'Test risk',
        probability: 0.5,
        impact: 'MEDIUM',
        mitigation: 'Test mitigation',
        owner: 'test_owner'
      });

      expect(risk.id).toBeDefined();
      expect(risk.id).toContain('RISK-');
    });

    it('should set status to open by default', () => {
      const risk = createRisk({
        category: 'technical',
        description: 'Test risk',
        probability: 0.5,
        impact: 'MEDIUM',
        mitigation: 'Test mitigation',
        owner: 'test_owner'
      });

      expect(risk.status).toBe('open');
    });

    it('should include createdAt timestamp', () => {
      const risk = createRisk({
        category: 'technical',
        description: 'Test risk',
        probability: 0.5,
        impact: 'MEDIUM',
        mitigation: 'Test mitigation',
        owner: 'test_owner'
      });

      expect(risk.createdAt).toBeDefined();
    });
  });

  // ============================================
  // calculateRiskScore Tests
  // ============================================

  describe('calculateRiskScore', () => {
    it('should calculate score as probability * impact', () => {
      const score = calculateRiskScore(0.5, 'MEDIUM');

      expect(score).toBe(1); // 0.5 * 2
    });

    it('should return higher score for CRITICAL impact', () => {
      const criticalScore = calculateRiskScore(0.5, 'CRITICAL');
      const lowScore = calculateRiskScore(0.5, 'LOW');

      expect(criticalScore).toBeGreaterThan(lowScore);
    });

    it('should return 0 for 0 probability', () => {
      const score = calculateRiskScore(0, 'CRITICAL');

      expect(score).toBe(0);
    });

    it('should cap at maximum score', () => {
      const score = calculateRiskScore(1, 'CRITICAL');

      expect(score).toBe(4);
    });
  });
});
