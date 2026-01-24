/**
 * Retry Count Tracker Tests (GAP-016)
 *
 * TDD tests for durable retry count persistence with backup redundancy.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_MAX_RETRIES,
  RetryCountTracker
} from '../utils/retry-count-tracker.js';

// Test directory for retry count files
const TEST_CLAUDE_DIR = '/tmp/test-retry-count-tracker';
const PRIMARY_DIR = path.join(TEST_CLAUDE_DIR, 'retry-counts');
const BACKUP_DIR = path.join(TEST_CLAUDE_DIR, 'backup', 'retry-counts');

describe('Retry Count Tracker (GAP-016)', () => {
  let tracker;

  beforeEach(() => {
    // Create test directories
    fs.mkdirSync(PRIMARY_DIR, { recursive: true });
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    // Create tracker with test directory
    tracker = new RetryCountTracker({
      claudeDir: TEST_CLAUDE_DIR
    });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_CLAUDE_DIR)) {
      fs.rmSync(TEST_CLAUDE_DIR, { recursive: true, force: true });
    }
  });

  // =========================================================================
  // Constants Tests
  // =========================================================================

  describe('Constants', () => {
    it('should have DEFAULT_MAX_RETRIES of 3', () => {
      expect(DEFAULT_MAX_RETRIES).toBe(3);
    });
  });

  // =========================================================================
  // incrementRetryCount Tests
  // =========================================================================

  describe('incrementRetryCount()', () => {
    it('should create primary file', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'QA rejection');

      const primaryFile = path.join(PRIMARY_DIR, 'STORY-001.json');
      expect(fs.existsSync(primaryFile)).toBe(true);
    });

    it('should create backup file', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'QA rejection');

      const backupFile = path.join(BACKUP_DIR, 'STORY-001.json');
      expect(fs.existsSync(backupFile)).toBe(true);
    });

    it('should use atomic write (temp file exists briefly)', async () => {
      // We can't directly test temp file, but we can verify the result is valid JSON
      await tracker.incrementRetryCount('STORY-001', 1, 'QA rejection');

      const primaryFile = path.join(PRIMARY_DIR, 'STORY-001.json');
      const content = fs.readFileSync(primaryFile, 'utf8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should increment existing count', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'First rejection');
      await tracker.incrementRetryCount('STORY-001', 1, 'Second rejection');

      const count = await tracker.getRetryCount('STORY-001');
      expect(count).toBe(2);
    });

    it('should record history entry', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'QA rejection');

      const history = await tracker.getRetryHistory('STORY-001');
      expect(history.length).toBe(1);
      expect(history[0].reason).toBe('QA rejection');
      expect(history[0].count).toBe(1);
    });

    it('should return the new count', async () => {
      const count1 = await tracker.incrementRetryCount('STORY-001', 1, 'First');
      const count2 = await tracker.incrementRetryCount('STORY-001', 1, 'Second');

      expect(count1).toBe(1);
      expect(count2).toBe(2);
    });

    it('should store wave context', async () => {
      await tracker.incrementRetryCount('STORY-001', 2, 'QA rejection');

      const primaryFile = path.join(PRIMARY_DIR, 'STORY-001.json');
      const data = JSON.parse(fs.readFileSync(primaryFile, 'utf8'));
      expect(data.wave).toBe(2);
    });
  });

  // =========================================================================
  // getRetryCount Tests
  // =========================================================================

  describe('getRetryCount()', () => {
    it('should return count from primary', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      const count = await tracker.getRetryCount('STORY-001');
      expect(count).toBe(2);
    });

    it('should return count from backup if primary missing', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      // Delete primary
      const primaryFile = path.join(PRIMARY_DIR, 'STORY-001.json');
      fs.unlinkSync(primaryFile);

      const count = await tracker.getRetryCount('STORY-001');
      expect(count).toBe(2);
    });

    it('should return highest of primary/backup (deletion protection)', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      // Corrupt primary to have lower count
      const primaryFile = path.join(PRIMARY_DIR, 'STORY-001.json');
      const data = JSON.parse(fs.readFileSync(primaryFile, 'utf8'));
      data.count = 1; // Set lower than actual
      fs.writeFileSync(primaryFile, JSON.stringify(data), 'utf8');

      // Should return backup's higher count
      const count = await tracker.getRetryCount('STORY-001');
      expect(count).toBe(3);
    });

    it('should return 0 for unknown story', async () => {
      const count = await tracker.getRetryCount('UNKNOWN-STORY');
      expect(count).toBe(0);
    });
  });

  // =========================================================================
  // isMaxRetriesExceeded Tests
  // =========================================================================

  describe('isMaxRetriesExceeded()', () => {
    it('should return false below limit', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      const exceeded = await tracker.isMaxRetriesExceeded('STORY-001');
      expect(exceeded).toBe(false);
    });

    it('should return true at limit', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      const exceeded = await tracker.isMaxRetriesExceeded('STORY-001');
      expect(exceeded).toBe(true);
    });

    it('should check all sources (deletion protection)', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      // Delete primary file (attack simulation)
      const primaryFile = path.join(PRIMARY_DIR, 'STORY-001.json');
      fs.unlinkSync(primaryFile);

      // Should still detect max retries from backup
      const exceeded = await tracker.isMaxRetriesExceeded('STORY-001');
      expect(exceeded).toBe(true);
    });

    it('should return false for unknown story', async () => {
      const exceeded = await tracker.isMaxRetriesExceeded('UNKNOWN-STORY');
      expect(exceeded).toBe(false);
    });
  });

  // =========================================================================
  // getRetryHistory Tests
  // =========================================================================

  describe('getRetryHistory()', () => {
    it('should return all increments', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'First');
      await tracker.incrementRetryCount('STORY-001', 1, 'Second');
      await tracker.incrementRetryCount('STORY-001', 1, 'Third');

      const history = await tracker.getRetryHistory('STORY-001');
      expect(history.length).toBe(3);
    });

    it('should include timestamps', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      const history = await tracker.getRetryHistory('STORY-001');
      expect(history[0]).toHaveProperty('timestamp');
      expect(typeof history[0].timestamp).toBe('string');
    });

    it('should return empty array for unknown story', async () => {
      const history = await tracker.getRetryHistory('UNKNOWN-STORY');
      expect(history).toEqual([]);
    });
  });

  // =========================================================================
  // resetRetryCount Tests
  // =========================================================================

  describe('resetRetryCount()', () => {
    it('should require confirmation', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      await expect(tracker.resetRetryCount('STORY-001'))
        .rejects.toThrow('Confirmation required');
    });

    it('should remove primary file', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      const primaryFile = path.join(PRIMARY_DIR, 'STORY-001.json');
      expect(fs.existsSync(primaryFile)).toBe(true);

      await tracker.resetRetryCount('STORY-001', { confirm: true });

      expect(fs.existsSync(primaryFile)).toBe(false);
    });

    it('should remove backup file', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      const backupFile = path.join(BACKUP_DIR, 'STORY-001.json');
      expect(fs.existsSync(backupFile)).toBe(true);

      await tracker.resetRetryCount('STORY-001', { confirm: true });

      expect(fs.existsSync(backupFile)).toBe(false);
    });

    it('should record reset in audit log', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.resetRetryCount('STORY-001', { confirm: true, reason: 'Manual reset' });

      const auditLog = tracker.getAuditLog();
      const resetEntry = auditLog.find(e => e.action === 'reset' && e.storyId === 'STORY-001');
      expect(resetEntry).toBeDefined();
      expect(resetEntry.reason).toBe('Manual reset');
    });
  });

  // =========================================================================
  // getAllRetryCounts Tests
  // =========================================================================

  describe('getAllRetryCounts()', () => {
    it('should return all tracked stories', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-002', 1, 'Test');
      await tracker.incrementRetryCount('STORY-003', 2, 'Test');

      const all = await tracker.getAllRetryCounts();
      expect(Object.keys(all).length).toBe(3);
      expect(all['STORY-001']).toBeDefined();
      expect(all['STORY-002']).toBeDefined();
      expect(all['STORY-003']).toBeDefined();
    });

    it('should return empty object when no stories', async () => {
      const all = await tracker.getAllRetryCounts();
      expect(all).toEqual({});
    });
  });

  // =========================================================================
  // setMaxRetries Tests
  // =========================================================================

  describe('setMaxRetries()', () => {
    it('should configure limit per story', async () => {
      tracker.setMaxRetries('STORY-001', 5);

      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      // Default max is 3, but we set it to 5
      const exceeded = await tracker.isMaxRetriesExceeded('STORY-001');
      expect(exceeded).toBe(false);

      await tracker.incrementRetryCount('STORY-001', 1, 'Test');
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      // Now at 5, should be exceeded
      const exceeded2 = await tracker.isMaxRetriesExceeded('STORY-001');
      expect(exceeded2).toBe(true);
    });

    it('should reject negative values', () => {
      expect(() => tracker.setMaxRetries('STORY-001', -1))
        .toThrow('Max retries must be positive');
    });
  });

  // =========================================================================
  // cleanup Tests
  // =========================================================================

  describe('cleanup()', () => {
    it('should remove expired counts', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      // Manually set old timestamp
      const primaryFile = path.join(PRIMARY_DIR, 'STORY-001.json');
      const data = JSON.parse(fs.readFileSync(primaryFile, 'utf8'));
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31); // 31 days ago
      data.updatedAt = oldDate.toISOString();
      fs.writeFileSync(primaryFile, JSON.stringify(data), 'utf8');

      // Also update backup
      const backupFile = path.join(BACKUP_DIR, 'STORY-001.json');
      fs.writeFileSync(backupFile, JSON.stringify(data), 'utf8');

      await tracker.cleanup({ maxAgeDays: 30 });

      expect(fs.existsSync(primaryFile)).toBe(false);
      expect(fs.existsSync(backupFile)).toBe(false);
    });

    it('should keep recent counts', async () => {
      await tracker.incrementRetryCount('STORY-001', 1, 'Test');

      await tracker.cleanup({ maxAgeDays: 30 });

      const primaryFile = path.join(PRIMARY_DIR, 'STORY-001.json');
      expect(fs.existsSync(primaryFile)).toBe(true);
    });
  });

  // =========================================================================
  // Security Tests
  // =========================================================================

  describe('Security', () => {
    it('should reject invalid story ID', async () => {
      await expect(tracker.incrementRetryCount('../../../etc/passwd', 1, 'Test'))
        .rejects.toThrow('Invalid story ID');
    });

    it('should reject empty story ID', async () => {
      await expect(tracker.incrementRetryCount('', 1, 'Test'))
        .rejects.toThrow('Invalid story ID');
    });

    it('should reject negative wave number', async () => {
      await expect(tracker.incrementRetryCount('STORY-001', -1, 'Test'))
        .rejects.toThrow('Invalid wave number');
    });
  });
});
