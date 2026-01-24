/**
 * TDD Tests for Content-Based Drift Detector (GAP-009)
 *
 * Tests that content drift is detected using git diff instead of
 * timestamp-based detection. Includes untracked file detection
 * and cascade lock invalidation.
 *
 * Based on:
 * - Git Internals - Content Addressable Storage
 * - Infrastructure as Code Drift Detection patterns
 * - Pulumi Drift Detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

// Import the module we're testing
import {
  detectContentDrift,
  detectUntrackedFiles,
  checkLockDrift,
  invalidateLock,
  cascadeInvalidation,
  getDriftReport,
  calculateContentHash,
  DRIFT_DETECTOR_ERRORS,
  PHASE_DEPENDENCIES
} from '../utils/content-drift-detector.js';

describe('Content-Based Drift Detector (GAP-009)', () => {
  let tempDir;
  let claudeDir;
  let locksDir;

  beforeEach(() => {
    // Create temp directory with git repo
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-detector-test-'));
    claudeDir = path.join(tempDir, '.claude');
    locksDir = path.join(claudeDir, 'locks');

    fs.mkdirSync(locksDir, { recursive: true });

    // Initialize git repo
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });

    // Create initial file and commit
    fs.writeFileSync(path.join(tempDir, 'test.txt'), 'initial content');
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: 'pipe' });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Helper to create lock files
  function createLockFile(phase, wave, checksum, status = 'LOCKED') {
    const lockPath = path.join(locksDir, `PHASE${phase}-wave${wave}.lock`);
    fs.writeFileSync(lockPath, JSON.stringify({
      phase,
      wave,
      status,
      checksum,
      created_at: new Date().toISOString()
    }, null, 2));
    return lockPath;
  }

  // ============================================
  // CONSTANTS TESTS
  // ============================================

  describe('PHASE_DEPENDENCIES constants', () => {
    it('should define Phase 0 with no dependencies', () => {
      expect(PHASE_DEPENDENCIES[0]).toEqual([]);
    });

    it('should define Phase 1 depends on Phase 0', () => {
      expect(PHASE_DEPENDENCIES[1]).toContain(0);
    });

    it('should define Phase 2 depends on Phase 0', () => {
      expect(PHASE_DEPENDENCIES[2]).toContain(0);
    });

    it('should define Phase 3 depends on Phase 2', () => {
      expect(PHASE_DEPENDENCIES[3]).toContain(2);
    });

    it('should define Phase 4 depends on Phase 3', () => {
      expect(PHASE_DEPENDENCIES[4]).toContain(3);
    });
  });

  describe('DRIFT_DETECTOR_ERRORS constants', () => {
    it('should define NOT_A_GIT_REPO error', () => {
      expect(DRIFT_DETECTOR_ERRORS.NOT_A_GIT_REPO).toBe('not_a_git_repo');
    });

    it('should define LOCK_NOT_FOUND error', () => {
      expect(DRIFT_DETECTOR_ERRORS.LOCK_NOT_FOUND).toBe('lock_not_found');
    });

    it('should define DRIFT_DETECTED error', () => {
      expect(DRIFT_DETECTOR_ERRORS.DRIFT_DETECTED).toBe('drift_detected');
    });
  });

  // ============================================
  // UNIT TESTS - detectContentDrift
  // ============================================

  describe('detectContentDrift', () => {
    it('should return empty array when no changes', () => {
      const result = detectContentDrift(tempDir);

      expect(result.hasChanges).toBe(false);
      expect(result.changedFiles).toHaveLength(0);
    });

    it('should detect modified file', () => {
      // Modify a tracked file
      fs.writeFileSync(path.join(tempDir, 'test.txt'), 'modified content');

      const result = detectContentDrift(tempDir);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFiles).toContain('test.txt');
    });

    it('should detect deleted file', () => {
      // Delete a tracked file
      fs.unlinkSync(path.join(tempDir, 'test.txt'));

      const result = detectContentDrift(tempDir);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFiles).toContain('test.txt');
    });

    it('should detect staged changes', () => {
      // Create and stage a new file
      fs.writeFileSync(path.join(tempDir, 'staged.txt'), 'staged content');
      execSync('git add staged.txt', { cwd: tempDir, stdio: 'pipe' });

      const result = detectContentDrift(tempDir);

      expect(result.hasChanges).toBe(true);
      expect(result.changedFiles).toContain('staged.txt');
    });

    it('should return error for non-git directory', () => {
      const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'non-git-'));

      const result = detectContentDrift(nonGitDir);

      expect(result.error).toBe(DRIFT_DETECTOR_ERRORS.NOT_A_GIT_REPO);

      fs.rmSync(nonGitDir, { recursive: true, force: true });
    });
  });

  // ============================================
  // UNIT TESTS - detectUntrackedFiles
  // ============================================

  describe('detectUntrackedFiles', () => {
    it('should return empty array when no untracked files', () => {
      const result = detectUntrackedFiles(tempDir);

      expect(result.untrackedFiles).toHaveLength(0);
    });

    it('should detect untracked file', () => {
      // Create an untracked file
      fs.writeFileSync(path.join(tempDir, 'untracked.txt'), 'untracked content');

      const result = detectUntrackedFiles(tempDir);

      expect(result.untrackedFiles).toContain('untracked.txt');
    });

    it('should detect multiple untracked files', () => {
      fs.writeFileSync(path.join(tempDir, 'untracked1.txt'), 'content 1');
      fs.writeFileSync(path.join(tempDir, 'untracked2.txt'), 'content 2');

      const result = detectUntrackedFiles(tempDir);

      expect(result.untrackedFiles).toHaveLength(2);
      expect(result.untrackedFiles).toContain('untracked1.txt');
      expect(result.untrackedFiles).toContain('untracked2.txt');
    });

    it('should not include gitignored files', () => {
      // Create gitignore
      fs.writeFileSync(path.join(tempDir, '.gitignore'), '*.log');
      fs.writeFileSync(path.join(tempDir, 'ignored.log'), 'log content');
      fs.writeFileSync(path.join(tempDir, 'notignored.txt'), 'content');

      const result = detectUntrackedFiles(tempDir);

      expect(result.untrackedFiles).not.toContain('ignored.log');
      expect(result.untrackedFiles).toContain('notignored.txt');
    });
  });

  // ============================================
  // UNIT TESTS - calculateContentHash
  // ============================================

  describe('calculateContentHash', () => {
    it('should return consistent hash for same content', () => {
      const hash1 = calculateContentHash(tempDir, ['test.txt']);
      const hash2 = calculateContentHash(tempDir, ['test.txt']);

      expect(hash1).toBe(hash2);
    });

    it('should return different hash when content changes', () => {
      const hash1 = calculateContentHash(tempDir, ['test.txt']);

      fs.writeFileSync(path.join(tempDir, 'test.txt'), 'modified content');

      const hash2 = calculateContentHash(tempDir, ['test.txt']);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle non-existent files', () => {
      const hash = calculateContentHash(tempDir, ['nonexistent.txt']);

      expect(hash).toBeDefined();
    });
  });

  // ============================================
  // UNIT TESTS - checkLockDrift
  // ============================================

  describe('checkLockDrift', () => {
    it('should return no drift when checksums match', () => {
      const currentHash = calculateContentHash(tempDir, ['test.txt']);
      createLockFile(2, 1, currentHash);

      const result = checkLockDrift(tempDir, 1, 2);

      expect(result.hasDrift).toBe(false);
    });

    it('should detect drift when checksums differ', () => {
      createLockFile(2, 1, 'old-checksum-that-wont-match');

      const result = checkLockDrift(tempDir, 1, 2);

      expect(result.hasDrift).toBe(true);
      expect(result.storedChecksum).toBe('old-checksum-that-wont-match');
    });

    it('should return error when lock file not found', () => {
      const result = checkLockDrift(tempDir, 1, 2);

      expect(result.error).toBe(DRIFT_DETECTOR_ERRORS.LOCK_NOT_FOUND);
    });

    it('should skip invalidated locks', () => {
      createLockFile(2, 1, 'some-checksum', 'INVALIDATED');

      const result = checkLockDrift(tempDir, 1, 2);

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('already_invalidated');
    });
  });

  // ============================================
  // UNIT TESTS - invalidateLock
  // ============================================

  describe('invalidateLock', () => {
    it('should update lock status to INVALIDATED', () => {
      createLockFile(2, 1, 'some-checksum');

      const result = invalidateLock(tempDir, 1, 2, 'content_drift');

      expect(result.success).toBe(true);

      // Verify file was updated
      const lockContent = JSON.parse(
        fs.readFileSync(path.join(locksDir, 'PHASE2-wave1.lock'), 'utf-8')
      );
      expect(lockContent.status).toBe('INVALIDATED');
      expect(lockContent.invalidation_reason).toBe('content_drift');
    });

    it('should preserve original lock data', () => {
      createLockFile(2, 1, 'original-checksum');

      invalidateLock(tempDir, 1, 2, 'cascade');

      const lockContent = JSON.parse(
        fs.readFileSync(path.join(locksDir, 'PHASE2-wave1.lock'), 'utf-8')
      );
      expect(lockContent.checksum).toBe('original-checksum');
    });

    it('should add invalidation timestamp', () => {
      createLockFile(2, 1, 'some-checksum');

      invalidateLock(tempDir, 1, 2, 'content_drift');

      const lockContent = JSON.parse(
        fs.readFileSync(path.join(locksDir, 'PHASE2-wave1.lock'), 'utf-8')
      );
      expect(lockContent.invalidated_at).toBeDefined();
    });

    it('should return error for missing lock', () => {
      const result = invalidateLock(tempDir, 1, 2, 'content_drift');

      expect(result.success).toBe(false);
      expect(result.error).toBe(DRIFT_DETECTOR_ERRORS.LOCK_NOT_FOUND);
    });
  });

  // ============================================
  // UNIT TESTS - cascadeInvalidation
  // ============================================

  describe('cascadeInvalidation', () => {
    it('should invalidate downstream locks when Phase 0 drifts', () => {
      // Create locks for all phases
      createLockFile(0, 1, 'hash0');
      createLockFile(1, 1, 'hash1');
      createLockFile(2, 1, 'hash2');
      createLockFile(3, 1, 'hash3');
      createLockFile(4, 1, 'hash4');

      const result = cascadeInvalidation(tempDir, 1, 0);

      // Phase 0 drift should invalidate 1, 2, 3, 4
      expect(result.invalidatedPhases).toContain(1);
      expect(result.invalidatedPhases).toContain(2);
      expect(result.invalidatedPhases).toContain(3);
      expect(result.invalidatedPhases).toContain(4);
    });

    it('should invalidate downstream locks when Phase 2 drifts', () => {
      createLockFile(2, 1, 'hash2');
      createLockFile(3, 1, 'hash3');
      createLockFile(4, 1, 'hash4');

      const result = cascadeInvalidation(tempDir, 1, 2);

      // Phase 2 drift should invalidate 3, 4
      expect(result.invalidatedPhases).toContain(3);
      expect(result.invalidatedPhases).toContain(4);
      expect(result.invalidatedPhases).not.toContain(0);
      expect(result.invalidatedPhases).not.toContain(1);
    });

    it('should not invalidate upstream locks', () => {
      createLockFile(0, 1, 'hash0');
      createLockFile(1, 1, 'hash1');
      createLockFile(2, 1, 'hash2');
      createLockFile(3, 1, 'hash3');
      createLockFile(4, 1, 'hash4'); // Phase 4 must exist to be invalidated

      const result = cascadeInvalidation(tempDir, 1, 3);

      // Phase 3 drift should only invalidate 4
      expect(result.invalidatedPhases).toContain(4);
      expect(result.invalidatedPhases).not.toContain(0);
      expect(result.invalidatedPhases).not.toContain(1);
      expect(result.invalidatedPhases).not.toContain(2);
    });

    it('should handle missing downstream locks gracefully', () => {
      createLockFile(2, 1, 'hash2');
      // Phase 3 and 4 locks don't exist

      const result = cascadeInvalidation(tempDir, 1, 2);

      // Should not throw, just report what was invalidated
      expect(result.skipped).toContain(3);
      expect(result.skipped).toContain(4);
    });
  });

  // ============================================
  // UNIT TESTS - getDriftReport
  // ============================================

  describe('getDriftReport', () => {
    it('should return complete drift report', () => {
      // Create a scenario with drift
      fs.writeFileSync(path.join(tempDir, 'test.txt'), 'modified content');
      fs.writeFileSync(path.join(tempDir, 'untracked.txt'), 'untracked');
      createLockFile(2, 1, 'old-hash');

      const report = getDriftReport(tempDir, 1);

      expect(report.hasContentDrift).toBe(true);
      expect(report.hasUntrackedFiles).toBe(true);
      expect(report.changedFiles).toContain('test.txt');
      expect(report.untrackedFiles).toContain('untracked.txt');
    });

    it('should report no drift when repo is clean', () => {
      // Add .claude to gitignore so lock files aren't counted as untracked
      fs.writeFileSync(path.join(tempDir, '.gitignore'), '.claude/\n');
      execSync('git add .gitignore && git commit -m "Add gitignore"', { cwd: tempDir, stdio: 'pipe' });

      createLockFile(2, 1, calculateContentHash(tempDir, ['test.txt']));

      const report = getDriftReport(tempDir, 1);

      expect(report.hasContentDrift).toBe(false);
      expect(report.hasUntrackedFiles).toBe(false);
    });

    it('should include timestamp in report', () => {
      const report = getDriftReport(tempDir, 1);

      expect(report.timestamp).toBeDefined();
    });

    it('should include affected locks in report', () => {
      createLockFile(2, 1, 'old-hash');
      fs.writeFileSync(path.join(tempDir, 'test.txt'), 'modified');

      const report = getDriftReport(tempDir, 1);

      expect(report.affectedLocks).toBeDefined();
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration - Full Drift Detection Flow', () => {
    it('should detect and cascade on content change', () => {
      // Set up locks
      const originalHash = calculateContentHash(tempDir, ['test.txt']);
      createLockFile(2, 1, originalHash);
      createLockFile(3, 1, 'hash3');
      createLockFile(4, 1, 'hash4');

      // Make a change
      fs.writeFileSync(path.join(tempDir, 'test.txt'), 'changed content');

      // Get drift report
      const report = getDriftReport(tempDir, 1);

      expect(report.hasContentDrift).toBe(true);
    });

    it('should handle complex multi-file changes', () => {
      // Create multiple tracked files
      fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(tempDir, 'file2.txt'), 'content2');
      execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
      execSync('git commit -m "Add files"', { cwd: tempDir, stdio: 'pipe' });

      // Modify one, delete one, add untracked
      fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'modified');
      fs.unlinkSync(path.join(tempDir, 'file2.txt'));
      fs.writeFileSync(path.join(tempDir, 'file3.txt'), 'untracked');

      const contentDrift = detectContentDrift(tempDir);
      const untrackedFiles = detectUntrackedFiles(tempDir);

      expect(contentDrift.changedFiles).toContain('file1.txt');
      expect(contentDrift.changedFiles).toContain('file2.txt');
      expect(untrackedFiles.untrackedFiles).toContain('file3.txt');
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('Security - Lock Integrity', () => {
    it('should not corrupt lock file on drift check', () => {
      const originalContent = {
        phase: 2,
        wave: 1,
        status: 'LOCKED',
        checksum: 'original-hash',
        created_at: '2026-01-24T00:00:00Z',
        custom_field: 'should_be_preserved'
      };

      const lockPath = path.join(locksDir, 'PHASE2-wave1.lock');
      fs.writeFileSync(lockPath, JSON.stringify(originalContent, null, 2));

      // Run drift check (read-only)
      checkLockDrift(tempDir, 1, 2);

      // Verify file wasn't modified
      const afterContent = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      expect(afterContent.custom_field).toBe('should_be_preserved');
      expect(afterContent.status).toBe('LOCKED');
    });

    it('should preserve lock data when invalidating', () => {
      const originalContent = {
        phase: 2,
        wave: 1,
        status: 'LOCKED',
        checksum: 'original-hash',
        created_at: '2026-01-24T00:00:00Z',
        agent: 'fe-dev-1',
        story_id: 'STORY-001'
      };

      const lockPath = path.join(locksDir, 'PHASE2-wave1.lock');
      fs.writeFileSync(lockPath, JSON.stringify(originalContent, null, 2));

      invalidateLock(tempDir, 1, 2, 'content_drift');

      const afterContent = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      expect(afterContent.agent).toBe('fe-dev-1');
      expect(afterContent.story_id).toBe('STORY-001');
      expect(afterContent.checksum).toBe('original-hash');
    });
  });
});
