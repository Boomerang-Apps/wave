/**
 * TDD Tests for Mockup Validation Types (Launch Sequence)
 *
 * Phase 2, Step 2.1: Mockup Validation Types
 *
 * Tests the type definitions and validation helpers for
 * mockup validation in Step 0 of the launch sequence.
 */

import { describe, it, expect } from 'vitest';

import {
  MockupCheckStatus,
  createMockupCheck,
  createMockupValidationResult,
  isValidMockupCheck,
  isValidMockupValidationResult,
  MOCKUP_CHECK_STATUSES,
  MOCKUP_VALIDATION_STATUSES
} from '../utils/mockup-types.js';

describe('Mockup Validation Types', () => {

  // ============================================
  // MockupCheck Type Tests
  // ============================================

  describe('MockupCheck', () => {
    it('should have required fields: name, status, message', () => {
      const check = createMockupCheck('Test Check', 'pass', 'All good');

      expect(check).toHaveProperty('name');
      expect(check).toHaveProperty('status');
      expect(check).toHaveProperty('message');
    });

    it('should accept valid status values: pass, fail, warn', () => {
      const passCheck = createMockupCheck('Check 1', 'pass', 'OK');
      const failCheck = createMockupCheck('Check 2', 'fail', 'Error');
      const warnCheck = createMockupCheck('Check 3', 'warn', 'Warning');

      expect(passCheck.status).toBe('pass');
      expect(failCheck.status).toBe('fail');
      expect(warnCheck.status).toBe('warn');
    });

    it('should store name correctly', () => {
      const check = createMockupCheck('Mockup Folder', 'pass', 'Found');

      expect(check.name).toBe('Mockup Folder');
    });

    it('should store message correctly', () => {
      const check = createMockupCheck('Test', 'pass', 'Found 5 HTML mockups');

      expect(check.message).toBe('Found 5 HTML mockups');
    });

    it('should optionally include details', () => {
      const check = createMockupCheck('Test', 'pass', 'OK', {
        fileCount: 5,
        files: ['a.html', 'b.html']
      });

      expect(check.details).toBeDefined();
      expect(check.details.fileCount).toBe(5);
    });
  });

  // ============================================
  // isValidMockupCheck Tests
  // ============================================

  describe('isValidMockupCheck', () => {
    it('should return true for valid check object', () => {
      const check = {
        name: 'Test',
        status: 'pass',
        message: 'OK'
      };

      expect(isValidMockupCheck(check)).toBe(true);
    });

    it('should return false for missing name', () => {
      const check = {
        status: 'pass',
        message: 'OK'
      };

      expect(isValidMockupCheck(check)).toBe(false);
    });

    it('should return false for missing status', () => {
      const check = {
        name: 'Test',
        message: 'OK'
      };

      expect(isValidMockupCheck(check)).toBe(false);
    });

    it('should return false for missing message', () => {
      const check = {
        name: 'Test',
        status: 'pass'
      };

      expect(isValidMockupCheck(check)).toBe(false);
    });

    it('should return false for invalid status value', () => {
      const check = {
        name: 'Test',
        status: 'invalid',
        message: 'OK'
      };

      expect(isValidMockupCheck(check)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidMockupCheck(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidMockupCheck(undefined)).toBe(false);
    });
  });

  // ============================================
  // MockupValidationResult Type Tests
  // ============================================

  describe('MockupValidationResult', () => {
    it('should have required fields: status, checks, screens, timestamp', () => {
      const result = createMockupValidationResult('ready', [], []);

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('screens');
      expect(result).toHaveProperty('timestamp');
    });

    it('should accept valid status values: idle, ready, blocked', () => {
      const idleResult = createMockupValidationResult('idle', [], []);
      const readyResult = createMockupValidationResult('ready', [], []);
      const blockedResult = createMockupValidationResult('blocked', [], []);

      expect(idleResult.status).toBe('idle');
      expect(readyResult.status).toBe('ready');
      expect(blockedResult.status).toBe('blocked');
    });

    it('should store checks array correctly', () => {
      const checks = [
        createMockupCheck('Check 1', 'pass', 'OK'),
        createMockupCheck('Check 2', 'fail', 'Error')
      ];
      const result = createMockupValidationResult('blocked', checks, []);

      expect(result.checks).toHaveLength(2);
      expect(result.checks[0].name).toBe('Check 1');
    });

    it('should store screens array correctly', () => {
      const screens = [
        { path: '/mockups/home.html', name: 'home.html' },
        { path: '/mockups/about.html', name: 'about.html' }
      ];
      const result = createMockupValidationResult('ready', [], screens);

      expect(result.screens).toHaveLength(2);
      expect(result.screens[0].name).toBe('home.html');
    });

    it('should include timestamp as ISO string', () => {
      const result = createMockupValidationResult('ready', [], []);

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      // Should be valid ISO date string
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  // ============================================
  // isValidMockupValidationResult Tests
  // ============================================

  describe('isValidMockupValidationResult', () => {
    it('should return true for valid result object', () => {
      const result = {
        status: 'ready',
        checks: [],
        screens: [],
        timestamp: new Date().toISOString()
      };

      expect(isValidMockupValidationResult(result)).toBe(true);
    });

    it('should return false for missing status', () => {
      const result = {
        checks: [],
        screens: [],
        timestamp: new Date().toISOString()
      };

      expect(isValidMockupValidationResult(result)).toBe(false);
    });

    it('should return false for invalid status value', () => {
      const result = {
        status: 'invalid',
        checks: [],
        screens: [],
        timestamp: new Date().toISOString()
      };

      expect(isValidMockupValidationResult(result)).toBe(false);
    });

    it('should return false for missing checks', () => {
      const result = {
        status: 'ready',
        screens: [],
        timestamp: new Date().toISOString()
      };

      expect(isValidMockupValidationResult(result)).toBe(false);
    });

    it('should return false for non-array checks', () => {
      const result = {
        status: 'ready',
        checks: 'not an array',
        screens: [],
        timestamp: new Date().toISOString()
      };

      expect(isValidMockupValidationResult(result)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidMockupValidationResult(null)).toBe(false);
    });
  });

  // ============================================
  // Status Constants Tests
  // ============================================

  describe('status constants', () => {
    it('should define MOCKUP_CHECK_STATUSES as pass, fail, warn', () => {
      expect(MOCKUP_CHECK_STATUSES).toContain('pass');
      expect(MOCKUP_CHECK_STATUSES).toContain('fail');
      expect(MOCKUP_CHECK_STATUSES).toContain('warn');
      expect(MOCKUP_CHECK_STATUSES).toHaveLength(3);
    });

    it('should define MOCKUP_VALIDATION_STATUSES as idle, ready, blocked', () => {
      expect(MOCKUP_VALIDATION_STATUSES).toContain('idle');
      expect(MOCKUP_VALIDATION_STATUSES).toContain('ready');
      expect(MOCKUP_VALIDATION_STATUSES).toContain('blocked');
      expect(MOCKUP_VALIDATION_STATUSES).toHaveLength(3);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should handle empty strings in check fields', () => {
      const check = createMockupCheck('', 'pass', '');

      expect(check.name).toBe('');
      expect(check.message).toBe('');
    });

    it('should handle special characters in messages', () => {
      const check = createMockupCheck('Test', 'pass', 'Found <html> & "quotes"');

      expect(check.message).toBe('Found <html> & "quotes"');
    });

    it('should handle large checks array', () => {
      const checks = Array.from({ length: 100 }, (_, i) =>
        createMockupCheck(`Check ${i}`, 'pass', `Message ${i}`)
      );
      const result = createMockupValidationResult('ready', checks, []);

      expect(result.checks).toHaveLength(100);
    });
  });
});
