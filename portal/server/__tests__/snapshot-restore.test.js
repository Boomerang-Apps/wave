/**
 * TDD Tests for RLM Snapshot Restoration (GAP-012)
 *
 * Tests that P.json can be restored from snapshots with integrity
 * verification, pre-restore backup, and audit logging.
 *
 * Based on:
 * - AWS RDS Snapshot Restore Patterns
 * - Database Rollback Strategies
 * - Git Restore Best Practices
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import the module we're testing
import {
  listSnapshots,
  findSnapshot,
  verifySnapshotIntegrity,
  restoreFromSnapshot,
  getLatestSnapshot,
  createPreRestoreBackup,
  SNAPSHOT_RESTORE_ERRORS,
  VALID_CHECKPOINTS
} from '../utils/snapshot-restore.js';

describe('RLM Snapshot Restoration (GAP-012)', () => {
  let tempDir;
  let snapshotDir;
  let claudeDir;

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-restore-test-'));
    claudeDir = path.join(tempDir, '.claude');
    snapshotDir = path.join(claudeDir, 'rlm-snapshots');
    fs.mkdirSync(snapshotDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Helper to create a snapshot file
  function createSnapshot(wave, checkpoint, timestamp, data = {}) {
    const filename = `P-wave${wave}-${checkpoint}-${timestamp}.json`;
    const filepath = path.join(snapshotDir, filename);

    const snapshotData = {
      project_name: data.project_name || 'test-project',
      wave_number: wave,
      stories: data.stories || [],
      _snapshot: {
        checkpoint,
        timestamp,
        wave,
        original_file: 'P.json'
      },
      ...data
    };

    fs.writeFileSync(filepath, JSON.stringify(snapshotData, null, 2));
    return filepath;
  }

  // Helper to create current P.json
  function createPJson(data = {}) {
    const pPath = path.join(claudeDir, 'P.json');
    const pData = {
      project_name: 'current-project',
      wave_number: 1,
      stories: [],
      ...data
    };
    fs.writeFileSync(pPath, JSON.stringify(pData, null, 2));
    return pPath;
  }

  // ============================================
  // UNIT TESTS - Constants
  // ============================================

  describe('constants', () => {
    it('should define VALID_CHECKPOINTS', () => {
      expect(VALID_CHECKPOINTS).toBeDefined();
      expect(VALID_CHECKPOINTS).toContain('startup');
      expect(VALID_CHECKPOINTS).toContain('pre-sync');
      expect(VALID_CHECKPOINTS).toContain('post-qa');
    });

    it('should define SNAPSHOT_RESTORE_ERRORS', () => {
      expect(SNAPSHOT_RESTORE_ERRORS).toBeDefined();
      expect(SNAPSHOT_RESTORE_ERRORS.SNAPSHOT_NOT_FOUND).toBeDefined();
      expect(SNAPSHOT_RESTORE_ERRORS.INTEGRITY_FAILED).toBeDefined();
    });
  });

  // ============================================
  // UNIT TESTS - listSnapshots
  // ============================================

  describe('listSnapshots', () => {
    it('should return empty array when no snapshots', () => {
      const snapshots = listSnapshots(tempDir, 1);
      expect(snapshots).toEqual([]);
    });

    it('should return sorted list of snapshots', () => {
      createSnapshot(1, 'pre-sync', '20260124-080000');
      createSnapshot(1, 'post-sync', '20260124-090000');
      createSnapshot(1, 'pre-qa', '20260124-100000');

      const snapshots = listSnapshots(tempDir, 1);

      expect(snapshots.length).toBe(3);
      // Should be sorted newest first
      expect(snapshots[0].checkpoint).toBe('pre-qa');
      expect(snapshots[2].checkpoint).toBe('pre-sync');
    });

    it('should filter by wave number', () => {
      createSnapshot(1, 'pre-sync', '20260124-080000');
      createSnapshot(2, 'pre-sync', '20260124-090000');
      createSnapshot(1, 'post-sync', '20260124-100000');

      const wave1Snapshots = listSnapshots(tempDir, 1);
      const wave2Snapshots = listSnapshots(tempDir, 2);

      expect(wave1Snapshots.length).toBe(2);
      expect(wave2Snapshots.length).toBe(1);
    });

    it('should include metadata in results', () => {
      createSnapshot(1, 'pre-qa', '20260124-100000');

      const snapshots = listSnapshots(tempDir, 1);

      expect(snapshots[0].filename).toContain('P-wave1-pre-qa');
      expect(snapshots[0].checkpoint).toBe('pre-qa');
      expect(snapshots[0].timestamp).toBe('20260124-100000');
      expect(snapshots[0].wave).toBe(1);
    });

    it('should handle missing snapshot directory', () => {
      fs.rmSync(snapshotDir, { recursive: true });

      const snapshots = listSnapshots(tempDir, 1);
      expect(snapshots).toEqual([]);
    });
  });

  // ============================================
  // UNIT TESTS - findSnapshot
  // ============================================

  describe('findSnapshot', () => {
    it('should locate by checkpoint name', () => {
      createSnapshot(1, 'pre-qa', '20260124-100000');
      createSnapshot(1, 'post-qa', '20260124-110000');

      const snapshot = findSnapshot(tempDir, 1, { checkpoint: 'pre-qa' });

      expect(snapshot).not.toBeNull();
      expect(snapshot.checkpoint).toBe('pre-qa');
    });

    it('should locate by timestamp', () => {
      createSnapshot(1, 'pre-sync', '20260124-080000');
      createSnapshot(1, 'post-sync', '20260124-090000');

      const snapshot = findSnapshot(tempDir, 1, { timestamp: '20260124-080000' });

      expect(snapshot).not.toBeNull();
      expect(snapshot.timestamp).toBe('20260124-080000');
    });

    it('should return null when not found', () => {
      createSnapshot(1, 'pre-sync', '20260124-080000');

      const snapshot = findSnapshot(tempDir, 1, { checkpoint: 'non-existent' });

      expect(snapshot).toBeNull();
    });

    it('should return latest matching checkpoint', () => {
      createSnapshot(1, 'pre-qa', '20260124-100000');
      createSnapshot(1, 'pre-qa', '20260124-110000');

      const snapshot = findSnapshot(tempDir, 1, { checkpoint: 'pre-qa' });

      expect(snapshot.timestamp).toBe('20260124-110000');
    });
  });

  // ============================================
  // UNIT TESTS - verifySnapshotIntegrity
  // ============================================

  describe('verifySnapshotIntegrity', () => {
    it('should validate JSON structure', () => {
      const snapshotPath = createSnapshot(1, 'pre-qa', '20260124-100000');

      const result = verifySnapshotIntegrity(snapshotPath);

      expect(result.valid).toBe(true);
    });

    it('should detect corrupted files', () => {
      const filepath = path.join(snapshotDir, 'P-wave1-corrupt-20260124-100000.json');
      fs.writeFileSync(filepath, 'invalid json {{{');

      const result = verifySnapshotIntegrity(filepath);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(SNAPSHOT_RESTORE_ERRORS.INVALID_JSON);
    });

    it('should validate required fields', () => {
      const filepath = path.join(snapshotDir, 'P-wave1-missing-20260124-100000.json');
      fs.writeFileSync(filepath, JSON.stringify({ incomplete: true }));

      const result = verifySnapshotIntegrity(filepath);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(SNAPSHOT_RESTORE_ERRORS.MISSING_FIELDS);
    });

    it('should validate _snapshot metadata exists', () => {
      const filepath = path.join(snapshotDir, 'P-wave1-nometa-20260124-100000.json');
      fs.writeFileSync(filepath, JSON.stringify({
        project_name: 'test',
        wave_number: 1
        // Missing _snapshot
      }));

      const result = verifySnapshotIntegrity(filepath);

      expect(result.valid).toBe(false);
    });

    it('should return checksum for valid snapshot', () => {
      const snapshotPath = createSnapshot(1, 'pre-qa', '20260124-100000');

      const result = verifySnapshotIntegrity(snapshotPath);

      expect(result.checksum).toBeDefined();
      expect(result.checksum.length).toBe(64); // SHA-256 hex
    });
  });

  // ============================================
  // UNIT TESTS - createPreRestoreBackup
  // ============================================

  describe('createPreRestoreBackup', () => {
    it('should create backup of current P.json', () => {
      createPJson({ project_name: 'my-project' });

      const result = createPreRestoreBackup(tempDir, 1);

      expect(result.success).toBe(true);
      expect(result.backupPath).toContain('pre-restore');
      expect(fs.existsSync(result.backupPath)).toBe(true);
    });

    it('should include timestamp in backup name', () => {
      createPJson();

      const result = createPreRestoreBackup(tempDir, 1);

      expect(result.backupPath).toMatch(/pre-restore-\d{8}-\d{6}/);
    });

    it('should handle missing P.json', () => {
      // No P.json created

      const result = createPreRestoreBackup(tempDir, 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe(SNAPSHOT_RESTORE_ERRORS.NO_CURRENT_STATE);
    });
  });

  // ============================================
  // UNIT TESTS - restoreFromSnapshot
  // ============================================

  describe('restoreFromSnapshot', () => {
    it('should create pre-restore backup', () => {
      createPJson({ project_name: 'original' });
      const snapshotPath = createSnapshot(1, 'pre-qa', '20260124-100000', { project_name: 'restored' });

      const result = restoreFromSnapshot(tempDir, 1, snapshotPath);

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(fs.existsSync(result.backupPath)).toBe(true);
    });

    it('should copy snapshot to P.json', () => {
      createPJson({ project_name: 'original' });
      const snapshotPath = createSnapshot(1, 'pre-qa', '20260124-100000', { project_name: 'restored' });

      restoreFromSnapshot(tempDir, 1, snapshotPath);

      const pPath = path.join(claudeDir, 'P.json');
      const restored = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
      expect(restored.project_name).toBe('restored');
    });

    it('should remove _snapshot metadata from restored file', () => {
      createPJson();
      const snapshotPath = createSnapshot(1, 'pre-qa', '20260124-100000');

      restoreFromSnapshot(tempDir, 1, snapshotPath);

      const pPath = path.join(claudeDir, 'P.json');
      const restored = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
      expect(restored._snapshot).toBeUndefined();
    });

    it('should fail if integrity check fails', () => {
      createPJson();
      const filepath = path.join(snapshotDir, 'P-wave1-corrupt-20260124-100000.json');
      fs.writeFileSync(filepath, 'invalid json');

      const result = restoreFromSnapshot(tempDir, 1, filepath);

      expect(result.success).toBe(false);
      expect(result.error).toBe(SNAPSHOT_RESTORE_ERRORS.INTEGRITY_FAILED);
    });

    it('should return restoration details', () => {
      createPJson();
      const snapshotPath = createSnapshot(1, 'pre-qa', '20260124-100000');

      const result = restoreFromSnapshot(tempDir, 1, snapshotPath);

      expect(result.success).toBe(true);
      expect(result.restoredFrom).toBe(snapshotPath);
      expect(result.checkpoint).toBe('pre-qa');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle snapshot not found', () => {
      createPJson();

      // Use a path inside the snapshot directory that doesn't exist
      const nonExistentPath = path.join(snapshotDir, 'P-wave1-nonexistent-20260124-999999.json');
      const result = restoreFromSnapshot(tempDir, 1, nonExistentPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe(SNAPSHOT_RESTORE_ERRORS.SNAPSHOT_NOT_FOUND);
    });

    it('should support skipBackup option', () => {
      createPJson();
      const snapshotPath = createSnapshot(1, 'pre-qa', '20260124-100000');

      const result = restoreFromSnapshot(tempDir, 1, snapshotPath, { skipBackup: true });

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeUndefined();
    });
  });

  // ============================================
  // UNIT TESTS - getLatestSnapshot
  // ============================================

  describe('getLatestSnapshot', () => {
    it('should return most recent snapshot', () => {
      createSnapshot(1, 'pre-sync', '20260124-080000');
      createSnapshot(1, 'post-sync', '20260124-090000');
      createSnapshot(1, 'pre-qa', '20260124-100000');

      const latest = getLatestSnapshot(tempDir, 1);

      expect(latest).not.toBeNull();
      expect(latest.checkpoint).toBe('pre-qa');
    });

    it('should filter by checkpoint', () => {
      createSnapshot(1, 'pre-sync', '20260124-080000');
      createSnapshot(1, 'pre-sync', '20260124-090000');
      createSnapshot(1, 'pre-qa', '20260124-100000');

      const latest = getLatestSnapshot(tempDir, 1, { checkpoint: 'pre-sync' });

      expect(latest.checkpoint).toBe('pre-sync');
      expect(latest.timestamp).toBe('20260124-090000');
    });

    it('should return null when no snapshots', () => {
      const latest = getLatestSnapshot(tempDir, 1);

      expect(latest).toBeNull();
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('integration', () => {
    it('should complete full restore workflow', () => {
      // Setup: Create P.json and multiple snapshots
      createPJson({ project_name: 'current', status: 'in_progress' });
      createSnapshot(1, 'startup', '20260124-070000', { project_name: 'snapshot1' });
      createSnapshot(1, 'pre-sync', '20260124-080000', { project_name: 'snapshot2' });
      createSnapshot(1, 'post-sync', '20260124-090000', { project_name: 'snapshot3' });

      // Find the pre-sync snapshot
      const snapshot = findSnapshot(tempDir, 1, { checkpoint: 'pre-sync' });
      expect(snapshot).not.toBeNull();

      // Verify integrity
      const integrity = verifySnapshotIntegrity(snapshot.path);
      expect(integrity.valid).toBe(true);

      // Restore
      const result = restoreFromSnapshot(tempDir, 1, snapshot.path);
      expect(result.success).toBe(true);

      // Verify restoration
      const pPath = path.join(claudeDir, 'P.json');
      const restored = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
      expect(restored.project_name).toBe('snapshot2');

      // Verify backup was created
      expect(fs.existsSync(result.backupPath)).toBe(true);
    });

    it('should handle restore after sync failure', () => {
      // Initial state
      createPJson({ project_name: 'good-state', sync_status: 'complete' });
      createSnapshot(1, 'post-sync', '20260124-090000', { project_name: 'good-state', sync_status: 'complete' });

      // Simulate sync failure - P.json gets corrupted
      const pPath = path.join(claudeDir, 'P.json');
      fs.writeFileSync(pPath, JSON.stringify({ project_name: 'bad-state', sync_status: 'failed', error: 'sync crash' }));

      // Restore from last good snapshot
      const latest = getLatestSnapshot(tempDir, 1, { checkpoint: 'post-sync' });
      const result = restoreFromSnapshot(tempDir, 1, latest.path);

      expect(result.success).toBe(true);
      const restored = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
      expect(restored.sync_status).toBe('complete');
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('security', () => {
    it('should reject path traversal attempts', () => {
      const maliciousPath = path.join(tempDir, '..', '..', 'etc', 'passwd');

      const result = restoreFromSnapshot(tempDir, 1, maliciousPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe(SNAPSHOT_RESTORE_ERRORS.INVALID_PATH);
    });

    it('should only restore from rlm-snapshots directory', () => {
      // Create a file outside the snapshots directory
      const outsidePath = path.join(claudeDir, 'malicious.json');
      fs.writeFileSync(outsidePath, JSON.stringify({ malicious: true }));

      const result = restoreFromSnapshot(tempDir, 1, outsidePath);

      expect(result.success).toBe(false);
    });
  });
});
