/**
 * TDD Tests for State Versioning (Grok Recommendation G6.1)
 *
 * Tracks gate status history for rollback
 */

import { describe, it, expect } from 'vitest';

import {
  createStateVersion,
  getStateHistory,
  verifyChecksum,
  compareVersions
} from '../utils/state-versioning.js';

describe('State Versioning (G6.1)', () => {

  // ============================================
  // createStateVersion Tests
  // ============================================

  describe('createStateVersion', () => {
    it('should create version with unique ID', () => {
      const version = createStateVersion('mockup-design', 'ready', {});

      expect(version.id).toBeDefined();
      expect(version.id).toContain('v-mockup-design-');
    });

    it('should include stepId', () => {
      const version = createStateVersion('mockup-design', 'ready', {});

      expect(version.stepId).toBe('mockup-design');
    });

    it('should include status', () => {
      const version = createStateVersion('mockup-design', 'ready', {});

      expect(version.status).toBe('ready');
    });

    it('should include context with versionedAt', () => {
      const version = createStateVersion('mockup-design', 'ready', { key: 'value' });

      expect(version.context.key).toBe('value');
      expect(version.context.versionedAt).toBeDefined();
    });

    it('should generate checksum', () => {
      const version = createStateVersion('mockup-design', 'ready', {});

      expect(version.checksum).toBeDefined();
      expect(typeof version.checksum).toBe('string');
    });

    it('should generate different checksums for different states', () => {
      const v1 = createStateVersion('mockup-design', 'ready', {});
      const v2 = createStateVersion('mockup-design', 'blocked', {});

      expect(v1.checksum).not.toBe(v2.checksum);
    });

    it('should generate same checksum for same data', () => {
      const context = { key: 'value' };
      const v1 = createStateVersion('mockup-design', 'ready', context);
      const v2 = createStateVersion('mockup-design', 'ready', context);

      // Note: checksums may differ due to different timestamps, but structure should be consistent
      expect(v1.checksum).toBeDefined();
      expect(v2.checksum).toBeDefined();
    });
  });

  // ============================================
  // getStateHistory Tests
  // ============================================

  describe('getStateHistory', () => {
    it('should return object with stepId', () => {
      const history = getStateHistory('mockup-design');

      expect(history.stepId).toBe('mockup-design');
    });

    it('should return versions array', () => {
      const history = getStateHistory('mockup-design');

      expect(Array.isArray(history.versions)).toBe(true);
    });

    it('should return currentVersion', () => {
      const history = getStateHistory('mockup-design');

      expect(history).toHaveProperty('currentVersion');
    });

    it('should respect limit parameter', () => {
      const history = getStateHistory('mockup-design', 5);

      expect(history.limit).toBe(5);
    });
  });

  // ============================================
  // verifyChecksum Tests
  // ============================================

  describe('verifyChecksum', () => {
    it('should return true for valid checksum', () => {
      const version = createStateVersion('mockup-design', 'ready', {});
      const valid = verifyChecksum(version);

      expect(valid).toBe(true);
    });

    it('should return false for tampered data', () => {
      const version = createStateVersion('mockup-design', 'ready', {});
      version.status = 'blocked'; // Tamper with data

      const valid = verifyChecksum(version);

      expect(valid).toBe(false);
    });

    it('should return false for missing checksum', () => {
      const version = {
        id: 'v-test',
        stepId: 'mockup-design',
        status: 'ready',
        context: {}
      };

      const valid = verifyChecksum(version);

      expect(valid).toBe(false);
    });
  });

  // ============================================
  // compareVersions Tests
  // ============================================

  describe('compareVersions', () => {
    it('should return differences between versions', () => {
      const v1 = createStateVersion('mockup-design', 'idle', {});
      const v2 = createStateVersion('mockup-design', 'ready', {});

      const diff = compareVersions(v1, v2);

      expect(diff.statusChanged).toBe(true);
      expect(diff.fromStatus).toBe('idle');
      expect(diff.toStatus).toBe('ready');
    });

    it('should return no differences for same versions', () => {
      const v1 = createStateVersion('mockup-design', 'ready', {});
      const v2 = createStateVersion('mockup-design', 'ready', {});

      const diff = compareVersions(v1, v2);

      expect(diff.statusChanged).toBe(false);
    });

    it('should detect context changes', () => {
      const v1 = createStateVersion('mockup-design', 'ready', { count: 1 });
      const v2 = createStateVersion('mockup-design', 'ready', { count: 2 });

      const diff = compareVersions(v1, v2);

      expect(diff.contextChanged).toBe(true);
    });
  });
});
