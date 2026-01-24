/**
 * Git Validator Tests (CQ-009)
 *
 * TDD tests for git repository validation before operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import {
  isGitRepository,
  getGitRoot,
  getCurrentBranch,
  hasUncommittedChanges,
  hasStagedChanges,
  hasUntrackedFiles,
  isClean,
  getBranchStatus,
  validateGitRepo,
  GIT_VALIDATION_ERRORS
} from '../utils/git-validator.js';

describe('Git Validator (CQ-009)', () => {
  let testDir;
  let gitDir;
  let nonGitDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-validator-test-'));

    // Create a git repository
    gitDir = path.join(testDir, 'git-repo');
    fs.mkdirSync(gitDir);
    execSync('git init', { cwd: gitDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: gitDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: gitDir, stdio: 'pipe' });

    // Create initial commit
    fs.writeFileSync(path.join(gitDir, 'README.md'), '# Test');
    execSync('git add .', { cwd: gitDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: gitDir, stdio: 'pipe' });

    // Create a non-git directory
    nonGitDir = path.join(testDir, 'non-git');
    fs.mkdirSync(nonGitDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // isGitRepository
  // ─────────────────────────────────────────────────────────────────────────────

  describe('isGitRepository', () => {
    it('should return true for git repository', async () => {
      const result = await isGitRepository(gitDir);
      expect(result).toBe(true);
    });

    it('should return false for non-git directory', async () => {
      const result = await isGitRepository(nonGitDir);
      expect(result).toBe(false);
    });

    it('should return false for non-existent directory', async () => {
      const result = await isGitRepository('/nonexistent/path');
      expect(result).toBe(false);
    });

    it('should work from subdirectory', async () => {
      const subDir = path.join(gitDir, 'subdir');
      fs.mkdirSync(subDir);

      const result = await isGitRepository(subDir);
      expect(result).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getGitRoot
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getGitRoot', () => {
    it('should return git root from repo directory', async () => {
      const result = await getGitRoot(gitDir);
      // Handle macOS symlink (/var -> /private/var)
      const expectedPath = fs.realpathSync(gitDir);
      expect(result).toBe(expectedPath);
    });

    it('should return git root from subdirectory', async () => {
      const subDir = path.join(gitDir, 'subdir', 'nested');
      fs.mkdirSync(subDir, { recursive: true });

      const result = await getGitRoot(subDir);
      // Handle macOS symlink (/var -> /private/var)
      const expectedPath = fs.realpathSync(gitDir);
      expect(result).toBe(expectedPath);
    });

    it('should return null for non-git directory', async () => {
      const result = await getGitRoot(nonGitDir);
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getCurrentBranch
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      const result = await getCurrentBranch(gitDir);
      // Default branch could be main or master depending on git config
      expect(['main', 'master']).toContain(result);
    });

    it('should return new branch name after checkout', async () => {
      execSync('git checkout -b feature-branch', { cwd: gitDir, stdio: 'pipe' });

      const result = await getCurrentBranch(gitDir);
      expect(result).toBe('feature-branch');
    });

    it('should return null for non-git directory', async () => {
      const result = await getCurrentBranch(nonGitDir);
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // hasUncommittedChanges
  // ─────────────────────────────────────────────────────────────────────────────

  describe('hasUncommittedChanges', () => {
    it('should return false for clean repo', async () => {
      const result = await hasUncommittedChanges(gitDir);
      expect(result).toBe(false);
    });

    it('should return true for modified file', async () => {
      fs.writeFileSync(path.join(gitDir, 'README.md'), '# Modified');

      const result = await hasUncommittedChanges(gitDir);
      expect(result).toBe(true);
    });

    it('should return true for staged changes', async () => {
      fs.writeFileSync(path.join(gitDir, 'new.txt'), 'new file');
      execSync('git add new.txt', { cwd: gitDir, stdio: 'pipe' });

      const result = await hasUncommittedChanges(gitDir);
      expect(result).toBe(true);
    });

    it('should return false for non-git directory', async () => {
      const result = await hasUncommittedChanges(nonGitDir);
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // hasStagedChanges
  // ─────────────────────────────────────────────────────────────────────────────

  describe('hasStagedChanges', () => {
    it('should return false for clean repo', async () => {
      const result = await hasStagedChanges(gitDir);
      expect(result).toBe(false);
    });

    it('should return false for unstaged changes', async () => {
      fs.writeFileSync(path.join(gitDir, 'README.md'), '# Modified');

      const result = await hasStagedChanges(gitDir);
      expect(result).toBe(false);
    });

    it('should return true for staged changes', async () => {
      fs.writeFileSync(path.join(gitDir, 'new.txt'), 'new file');
      execSync('git add new.txt', { cwd: gitDir, stdio: 'pipe' });

      const result = await hasStagedChanges(gitDir);
      expect(result).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // hasUntrackedFiles
  // ─────────────────────────────────────────────────────────────────────────────

  describe('hasUntrackedFiles', () => {
    it('should return false for clean repo', async () => {
      const result = await hasUntrackedFiles(gitDir);
      expect(result).toBe(false);
    });

    it('should return true for untracked file', async () => {
      fs.writeFileSync(path.join(gitDir, 'untracked.txt'), 'content');

      const result = await hasUntrackedFiles(gitDir);
      expect(result).toBe(true);
    });

    it('should return false for staged file', async () => {
      fs.writeFileSync(path.join(gitDir, 'staged.txt'), 'content');
      execSync('git add staged.txt', { cwd: gitDir, stdio: 'pipe' });

      const result = await hasUntrackedFiles(gitDir);
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // isClean
  // ─────────────────────────────────────────────────────────────────────────────

  describe('isClean', () => {
    it('should return true for clean repo', async () => {
      const result = await isClean(gitDir);
      expect(result).toBe(true);
    });

    it('should return false for modified file', async () => {
      fs.writeFileSync(path.join(gitDir, 'README.md'), '# Modified');

      const result = await isClean(gitDir);
      expect(result).toBe(false);
    });

    it('should return false for untracked file', async () => {
      fs.writeFileSync(path.join(gitDir, 'untracked.txt'), 'content');

      const result = await isClean(gitDir);
      expect(result).toBe(false);
    });

    it('should return false for staged changes', async () => {
      fs.writeFileSync(path.join(gitDir, 'new.txt'), 'new');
      execSync('git add new.txt', { cwd: gitDir, stdio: 'pipe' });

      const result = await isClean(gitDir);
      expect(result).toBe(false);
    });

    it('should return true for non-git directory', async () => {
      // Non-git directories are considered "clean" (no git state)
      const result = await isClean(nonGitDir);
      expect(result).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getBranchStatus
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getBranchStatus', () => {
    it('should return comprehensive status', async () => {
      const result = await getBranchStatus(gitDir);

      expect(result.isGitRepo).toBe(true);
      expect(result.branch).toBeDefined();
      expect(result.isClean).toBe(true);
      expect(result.hasUncommittedChanges).toBe(false);
      expect(result.hasStagedChanges).toBe(false);
      expect(result.hasUntrackedFiles).toBe(false);
    });

    it('should reflect dirty state', async () => {
      fs.writeFileSync(path.join(gitDir, 'README.md'), '# Modified');
      fs.writeFileSync(path.join(gitDir, 'untracked.txt'), 'content');

      const result = await getBranchStatus(gitDir);

      expect(result.isClean).toBe(false);
      expect(result.hasUncommittedChanges).toBe(true);
      expect(result.hasUntrackedFiles).toBe(true);
    });

    it('should return non-repo status', async () => {
      const result = await getBranchStatus(nonGitDir);

      expect(result.isGitRepo).toBe(false);
      expect(result.branch).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // validateGitRepo
  // ─────────────────────────────────────────────────────────────────────────────

  describe('validateGitRepo', () => {
    it('should pass for valid clean repo', async () => {
      const result = await validateGitRepo(gitDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for non-git directory', async () => {
      const result = await validateGitRepo(nonGitDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(GIT_VALIDATION_ERRORS.NOT_A_GIT_REPO);
    });

    it('should fail for dirty repo when requireClean', async () => {
      fs.writeFileSync(path.join(gitDir, 'README.md'), '# Modified');

      const result = await validateGitRepo(gitDir, { requireClean: true });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(GIT_VALIDATION_ERRORS.HAS_UNCOMMITTED_CHANGES);
    });

    it('should pass for dirty repo when not requireClean', async () => {
      fs.writeFileSync(path.join(gitDir, 'README.md'), '# Modified');

      const result = await validateGitRepo(gitDir, { requireClean: false });

      expect(result.valid).toBe(true);
    });

    it('should fail for wrong branch when required', async () => {
      const result = await validateGitRepo(gitDir, { requireBranch: 'feature-xyz' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(GIT_VALIDATION_ERRORS.WRONG_BRANCH);
    });

    it('should pass for correct branch when required', async () => {
      execSync('git checkout -b required-branch', { cwd: gitDir, stdio: 'pipe' });

      const result = await validateGitRepo(gitDir, { requireBranch: 'required-branch' });

      expect(result.valid).toBe(true);
    });

    it('should fail when staged changes not allowed', async () => {
      fs.writeFileSync(path.join(gitDir, 'new.txt'), 'new');
      execSync('git add new.txt', { cwd: gitDir, stdio: 'pipe' });

      const result = await validateGitRepo(gitDir, { allowStagedChanges: false });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(GIT_VALIDATION_ERRORS.HAS_STAGED_CHANGES);
    });

    it('should fail when untracked files not allowed', async () => {
      fs.writeFileSync(path.join(gitDir, 'untracked.txt'), 'content');

      const result = await validateGitRepo(gitDir, { allowUntrackedFiles: false });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(GIT_VALIDATION_ERRORS.HAS_UNTRACKED_FILES);
    });

    it('should include status in result', async () => {
      const result = await validateGitRepo(gitDir);

      expect(result.status).toBeDefined();
      expect(result.status.isGitRepo).toBe(true);
      expect(result.status.branch).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle directory with spaces', async () => {
      const spaceDir = path.join(testDir, 'path with spaces');
      fs.mkdirSync(spaceDir);
      execSync('git init', { cwd: spaceDir, stdio: 'pipe' });

      const result = await isGitRepository(spaceDir);
      expect(result).toBe(true);
    });

    it('should handle special characters in path', async () => {
      const specialDir = path.join(testDir, "special-'chars'");
      fs.mkdirSync(specialDir);
      execSync('git init', { cwd: specialDir, stdio: 'pipe' });

      const result = await isGitRepository(specialDir);
      expect(result).toBe(true);
    });
  });
});
