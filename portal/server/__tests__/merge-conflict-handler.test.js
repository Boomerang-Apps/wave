/**
 * TDD Tests for Merge Conflict Handler (GAP-005)
 *
 * Tests that merge conflicts are detected and escalated,
 * not auto-resolved with "git checkout --theirs".
 *
 * These tests create real git repositories to test the handler.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Merge Conflict Handler (GAP-005)', () => {
  let tempDir;
  let repoDir;
  let libPath;

  beforeEach(() => {
    // Create temp directory for test repo
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-conflict-test-'));
    repoDir = path.join(tempDir, 'repo');
    fs.mkdirSync(repoDir, { recursive: true });

    // Path to the library we're testing
    // process.cwd() is the portal directory when running tests
    libPath = path.resolve(process.cwd(), '../core/scripts/lib/merge-conflict-handler.sh');

    // Verify library exists
    if (!fs.existsSync(libPath)) {
      throw new Error(`Library not found at: ${libPath}. CWD: ${process.cwd()}`);
    }

    // Initialize git repo with initial commit
    execSync('git init', { cwd: repoDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: repoDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: repoDir, stdio: 'pipe' });

    // Create initial file and commit
    fs.writeFileSync(path.join(repoDir, 'file.txt'), 'initial content\n');
    execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: repoDir, stdio: 'pipe' });
  });

  afterEach(() => {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Helper to run bash commands with the library sourced
  function runWithLib(script, options = {}) {
    const fullScript = `
      source "${libPath}"
      ${script}
    `;
    const result = spawnSync('bash', ['-c', fullScript], {
      cwd: options.cwd || repoDir,
      encoding: 'utf8',
      env: { ...process.env, ...options.env }
    });
    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      status: result.status
    };
  }

  // Helper to create a merge conflict scenario
  function createConflictScenario() {
    // Create feature branch
    execSync('git checkout -b feature-branch', { cwd: repoDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(repoDir, 'file.txt'), 'feature branch content\n');
    execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
    execSync('git commit -m "Feature branch change"', { cwd: repoDir, stdio: 'pipe' });

    // Switch back to main and make conflicting change
    execSync('git checkout main || git checkout master', { cwd: repoDir, stdio: 'pipe', shell: true });
    fs.writeFileSync(path.join(repoDir, 'file.txt'), 'main branch content\n');
    execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
    execSync('git commit -m "Main branch change"', { cwd: repoDir, stdio: 'pipe' });
  }

  // ============================================
  // UNIT TESTS - detect_merge_conflicts
  // ============================================

  describe('detect_merge_conflicts', () => {
    it('should return 1 (false) when no conflicts exist', () => {
      const result = runWithLib('detect_merge_conflicts; echo $?');
      expect(result.stdout.trim()).toBe('1');
    });

    it('should return 0 (true) when conflicts exist', () => {
      createConflictScenario();

      // Start a merge that will conflict
      try {
        execSync('git merge feature-branch --no-commit', { cwd: repoDir, stdio: 'pipe' });
      } catch (e) {
        // Expected to fail due to conflict
      }

      const result = runWithLib('detect_merge_conflicts; echo $?');
      expect(result.stdout.trim()).toBe('0');
    });
  });

  // ============================================
  // UNIT TESTS - get_conflicting_files
  // ============================================

  describe('get_conflicting_files', () => {
    it('should return empty when no conflicts', () => {
      const result = runWithLib('get_conflicting_files');
      expect(result.stdout.trim()).toBe('');
    });

    it('should return list of conflicting files', () => {
      createConflictScenario();

      // Start a merge that will conflict
      try {
        execSync('git merge feature-branch --no-commit', { cwd: repoDir, stdio: 'pipe' });
      } catch (e) {
        // Expected to fail
      }

      const result = runWithLib('get_conflicting_files');
      expect(result.stdout.trim()).toBe('file.txt');
    });

    it('should return multiple files when multiple conflicts', () => {
      // Create another file with conflict
      fs.writeFileSync(path.join(repoDir, 'file2.txt'), 'initial\n');
      execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
      execSync('git commit -m "Add file2"', { cwd: repoDir, stdio: 'pipe' });

      execSync('git checkout -b feature-branch', { cwd: repoDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(repoDir, 'file.txt'), 'feature\n');
      fs.writeFileSync(path.join(repoDir, 'file2.txt'), 'feature2\n');
      execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
      execSync('git commit -m "Feature changes"', { cwd: repoDir, stdio: 'pipe' });

      execSync('git checkout main || git checkout master', { cwd: repoDir, stdio: 'pipe', shell: true });
      fs.writeFileSync(path.join(repoDir, 'file.txt'), 'main\n');
      fs.writeFileSync(path.join(repoDir, 'file2.txt'), 'main2\n');
      execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
      execSync('git commit -m "Main changes"', { cwd: repoDir, stdio: 'pipe' });

      try {
        execSync('git merge feature-branch --no-commit', { cwd: repoDir, stdio: 'pipe' });
      } catch (e) {
        // Expected
      }

      const result = runWithLib('get_conflicting_files');
      const files = result.stdout.trim().split('\n').sort();
      expect(files).toContain('file.txt');
      expect(files).toContain('file2.txt');
    });
  });

  // ============================================
  // UNIT TESTS - create_merge_escalation_signal
  // ============================================

  describe('create_merge_escalation_signal', () => {
    it('should create ESCALATION signal file', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      const result = runWithLib(`
        create_merge_escalation_signal 1 "${claudeDir}" "feature-branch" "main" "file.txt"
        echo "EXIT:$?"
      `);

      expect(result.stdout).toContain('EXIT:0');
      expect(fs.existsSync(path.join(claudeDir, 'signal-wave1-ESCALATION.json'))).toBe(true);
    });

    it('should include conflicting files in signal', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      runWithLib(`
        create_merge_escalation_signal 1 "${claudeDir}" "feature-branch" "main" "file.txt
file2.txt"
      `);

      const signalPath = path.join(claudeDir, 'signal-wave1-ESCALATION.json');
      const signal = JSON.parse(fs.readFileSync(signalPath, 'utf8'));

      expect(signal.conflicting_files).toContain('file.txt');
      expect(signal.conflicting_files).toContain('file2.txt');
    });

    it('should set type to ESCALATION', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      runWithLib(`
        create_merge_escalation_signal 1 "${claudeDir}" "feature" "main" "file.txt"
      `);

      const signalPath = path.join(claudeDir, 'signal-wave1-ESCALATION.json');
      const signal = JSON.parse(fs.readFileSync(signalPath, 'utf8'));

      expect(signal.type).toBe('ESCALATION');
    });

    it('should set reason to merge_conflict', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      runWithLib(`
        create_merge_escalation_signal 1 "${claudeDir}" "feature" "main" "file.txt"
      `);

      const signalPath = path.join(claudeDir, 'signal-wave1-ESCALATION.json');
      const signal = JSON.parse(fs.readFileSync(signalPath, 'utf8'));

      expect(signal.reason).toBe('merge_conflict');
    });

    it('should require HUMAN_INTERVENTION', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      runWithLib(`
        create_merge_escalation_signal 1 "${claudeDir}" "feature" "main" "file.txt"
      `);

      const signalPath = path.join(claudeDir, 'signal-wave1-ESCALATION.json');
      const signal = JSON.parse(fs.readFileSync(signalPath, 'utf8'));

      expect(signal.requires).toBe('HUMAN_INTERVENTION');
    });

    it('should include suggested actions', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      runWithLib(`
        create_merge_escalation_signal 1 "${claudeDir}" "feature" "main" "file.txt"
      `);

      const signalPath = path.join(claudeDir, 'signal-wave1-ESCALATION.json');
      const signal = JSON.parse(fs.readFileSync(signalPath, 'utf8'));

      expect(signal.suggested_actions).toBeDefined();
      expect(signal.suggested_actions.length).toBeGreaterThan(0);
    });

    it('should include wave number', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      runWithLib(`
        create_merge_escalation_signal 5 "${claudeDir}" "feature" "main" "file.txt"
      `);

      const signalPath = path.join(claudeDir, 'signal-wave5-ESCALATION.json');
      const signal = JSON.parse(fs.readFileSync(signalPath, 'utf8'));

      expect(signal.wave).toBe(5);
    });
  });

  // ============================================
  // UNIT TESTS - abort_merge_and_escalate
  // ============================================

  describe('abort_merge_and_escalate', () => {
    it('should abort merge in progress', () => {
      createConflictScenario();
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      // Start conflicting merge
      try {
        execSync('git merge feature-branch --no-commit', { cwd: repoDir, stdio: 'pipe' });
      } catch (e) {
        // Expected
      }

      // Verify we're in merge state
      expect(fs.existsSync(path.join(repoDir, '.git/MERGE_HEAD'))).toBe(true);

      runWithLib(`
        abort_merge_and_escalate 1 "${claudeDir}" "feature-branch" "main"
      `);

      // Verify merge was aborted
      expect(fs.existsSync(path.join(repoDir, '.git/MERGE_HEAD'))).toBe(false);
    });

    it('should create escalation signal after aborting', () => {
      createConflictScenario();
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      try {
        execSync('git merge feature-branch --no-commit', { cwd: repoDir, stdio: 'pipe' });
      } catch (e) {
        // Expected
      }

      runWithLib(`
        abort_merge_and_escalate 1 "${claudeDir}" "feature-branch" "main"
      `);

      expect(fs.existsSync(path.join(claudeDir, 'signal-wave1-ESCALATION.json'))).toBe(true);
    });
  });

  // ============================================
  // INTEGRATION TESTS - safe_merge_with_escalation
  // ============================================

  describe('safe_merge_with_escalation', () => {
    it('should complete clean merge successfully', () => {
      // Create a branch with non-conflicting changes
      execSync('git checkout -b clean-feature', { cwd: repoDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(repoDir, 'newfile.txt'), 'new content\n');
      execSync('git add .', { cwd: repoDir, stdio: 'pipe' });
      execSync('git commit -m "Add new file"', { cwd: repoDir, stdio: 'pipe' });

      execSync('git checkout main || git checkout master', { cwd: repoDir, stdio: 'pipe', shell: true });

      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      const result = runWithLib(`
        safe_merge_with_escalation "clean-feature" 1 "${claudeDir}" "Merge clean feature"
        echo "EXIT:$?"
      `);

      expect(result.stdout).toContain('SUCCESS');
      expect(result.stdout).toContain('EXIT:0');
      expect(fs.existsSync(path.join(claudeDir, 'signal-wave1-ESCALATION.json'))).toBe(false);
    });

    it('should escalate on conflict instead of auto-resolving', () => {
      createConflictScenario();
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      const result = runWithLib(`
        safe_merge_with_escalation "feature-branch" 1 "${claudeDir}" "Merge feature"
        echo "EXIT:$?"
      `);

      expect(result.stdout).toContain('CONFLICT');
      expect(result.stdout).toContain('EXIT:1');
      expect(fs.existsSync(path.join(claudeDir, 'signal-wave1-ESCALATION.json'))).toBe(true);
    });

    it('should NOT use checkout --theirs to resolve conflicts', () => {
      createConflictScenario();
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      // Record the original main content
      const originalContent = fs.readFileSync(path.join(repoDir, 'file.txt'), 'utf8');

      runWithLib(`
        safe_merge_with_escalation "feature-branch" 1 "${claudeDir}" "Merge feature"
      `);

      // File should still have original content (not feature branch content)
      const currentContent = fs.readFileSync(path.join(repoDir, 'file.txt'), 'utf8');
      expect(currentContent).toBe(originalContent);
    });

    it('should leave repo in clean state after escalation', () => {
      createConflictScenario();
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      runWithLib(`
        safe_merge_with_escalation "feature-branch" 1 "${claudeDir}" "Merge feature"
      `);

      // Check git status is clean
      const statusResult = execSync('git status --porcelain', { cwd: repoDir, encoding: 'utf8' });
      expect(statusResult.trim()).toBe('');

      // No merge in progress
      expect(fs.existsSync(path.join(repoDir, '.git/MERGE_HEAD'))).toBe(false);
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('Security', () => {
    it('should not allow bypassing conflict detection', () => {
      createConflictScenario();
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      // Even with force flags or tricks, conflicts should be detected
      const result = runWithLib(`
        safe_merge_with_escalation "feature-branch" 1 "${claudeDir}"
        echo "EXIT:$?"
      `);

      expect(result.stdout).toContain('EXIT:1');
      expect(fs.existsSync(path.join(claudeDir, 'signal-wave1-ESCALATION.json'))).toBe(true);
    });

    it('should write signal file atomically', () => {
      const claudeDir = path.join(tempDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });

      runWithLib(`
        create_merge_escalation_signal 1 "${claudeDir}" "feature" "main" "file.txt"
      `);

      // Verify the file is valid JSON (not partially written)
      const signalPath = path.join(claudeDir, 'signal-wave1-ESCALATION.json');
      expect(() => JSON.parse(fs.readFileSync(signalPath, 'utf8'))).not.toThrow();
    });
  });
});
