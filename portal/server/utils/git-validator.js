/**
 * Git Validator (CQ-009)
 *
 * Provides git repository validation before operations to prevent
 * issues with uncommitted changes, wrong branches, etc.
 *
 * Sources:
 * - https://git-scm.com/docs/git-status
 * - https://git-scm.com/docs/git-rev-parse
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CODES
// ─────────────────────────────────────────────────────────────────────────────

export const GIT_VALIDATION_ERRORS = {
  NOT_A_GIT_REPO: 'not_a_git_repo',
  HAS_UNCOMMITTED_CHANGES: 'has_uncommitted_changes',
  HAS_STAGED_CHANGES: 'has_staged_changes',
  HAS_UNTRACKED_FILES: 'has_untracked_files',
  WRONG_BRANCH: 'wrong_branch'
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a git command in a directory
 * @param {string} dir - Directory to run command in
 * @param {string} command - Git command (without 'git' prefix)
 * @returns {Promise<string>} Command output
 */
async function gitCommand(dir, command) {
  try {
    const { stdout } = await execAsync(`git ${command}`, {
      cwd: dir,
      encoding: 'utf8'
    });
    return stdout.trim();
  } catch (error) {
    // Git commands can fail (e.g., not a repo)
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BASIC CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if directory is inside a git repository
 * @param {string} dir - Directory to check
 * @returns {Promise<boolean>}
 */
export async function isGitRepository(dir) {
  const result = await gitCommand(dir, 'rev-parse --is-inside-work-tree');
  return result === 'true';
}

/**
 * Get the root directory of the git repository
 * @param {string} dir - Directory to check
 * @returns {Promise<string|null>}
 */
export async function getGitRoot(dir) {
  const result = await gitCommand(dir, 'rev-parse --show-toplevel');
  return result;
}

/**
 * Get current branch name
 * @param {string} dir - Directory to check
 * @returns {Promise<string|null>}
 */
export async function getCurrentBranch(dir) {
  const result = await gitCommand(dir, 'rev-parse --abbrev-ref HEAD');
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if there are uncommitted changes (modified or staged)
 * @param {string} dir - Directory to check
 * @returns {Promise<boolean>}
 */
export async function hasUncommittedChanges(dir) {
  const result = await gitCommand(dir, 'status --porcelain');
  if (result === null) return false;

  // Check for modified files (not just untracked)
  const lines = result.split('\n').filter(line => line.length > 0);
  return lines.some(line => !line.startsWith('??'));
}

/**
 * Check if there are staged changes
 * @param {string} dir - Directory to check
 * @returns {Promise<boolean>}
 */
export async function hasStagedChanges(dir) {
  const result = await gitCommand(dir, 'diff --cached --quiet');
  // diff --quiet returns null on error OR when there are differences
  // We need to check differently
  const diffOutput = await gitCommand(dir, 'diff --cached --name-only');
  return diffOutput !== null && diffOutput.length > 0;
}

/**
 * Check if there are untracked files
 * @param {string} dir - Directory to check
 * @returns {Promise<boolean>}
 */
export async function hasUntrackedFiles(dir) {
  const result = await gitCommand(dir, 'ls-files --others --exclude-standard');
  return result !== null && result.length > 0;
}

/**
 * Check if the repository is clean (no changes, no untracked files)
 * @param {string} dir - Directory to check
 * @returns {Promise<boolean>}
 */
export async function isClean(dir) {
  const result = await gitCommand(dir, 'status --porcelain');
  if (result === null) return true; // Not a repo is considered "clean"
  return result.length === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE STATUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get comprehensive branch/repository status
 * @param {string} dir - Directory to check
 * @returns {Promise<Object>}
 */
export async function getBranchStatus(dir) {
  const isRepo = await isGitRepository(dir);

  if (!isRepo) {
    return {
      isGitRepo: false,
      branch: null,
      isClean: true,
      hasUncommittedChanges: false,
      hasStagedChanges: false,
      hasUntrackedFiles: false
    };
  }

  const [branch, uncommitted, staged, untracked] = await Promise.all([
    getCurrentBranch(dir),
    hasUncommittedChanges(dir),
    hasStagedChanges(dir),
    hasUntrackedFiles(dir)
  ]);

  return {
    isGitRepo: true,
    branch,
    isClean: !uncommitted && !staged && !untracked,
    hasUncommittedChanges: uncommitted,
    hasStagedChanges: staged,
    hasUntrackedFiles: untracked
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate git repository state before operations
 * @param {string} dir - Directory to validate
 * @param {Object} [options] - Validation options
 * @param {boolean} [options.requireClean=false] - Require no uncommitted changes
 * @param {string} [options.requireBranch] - Require specific branch
 * @param {boolean} [options.allowStagedChanges=true] - Allow staged changes
 * @param {boolean} [options.allowUntrackedFiles=true] - Allow untracked files
 * @returns {Promise<{ valid: boolean, errors: string[], status: Object }>}
 */
export async function validateGitRepo(dir, options = {}) {
  const {
    requireClean = false,
    requireBranch = null,
    allowStagedChanges = true,
    allowUntrackedFiles = true
  } = options;

  const status = await getBranchStatus(dir);
  const errors = [];

  // Check if it's a git repository
  if (!status.isGitRepo) {
    errors.push(GIT_VALIDATION_ERRORS.NOT_A_GIT_REPO);
    return { valid: false, errors, status };
  }

  // Check branch requirement
  if (requireBranch && status.branch !== requireBranch) {
    errors.push(GIT_VALIDATION_ERRORS.WRONG_BRANCH);
  }

  // Check clean requirement
  if (requireClean && status.hasUncommittedChanges) {
    errors.push(GIT_VALIDATION_ERRORS.HAS_UNCOMMITTED_CHANGES);
  }

  // Check staged changes
  if (!allowStagedChanges && status.hasStagedChanges) {
    errors.push(GIT_VALIDATION_ERRORS.HAS_STAGED_CHANGES);
  }

  // Check untracked files
  if (!allowUntrackedFiles && status.hasUntrackedFiles) {
    errors.push(GIT_VALIDATION_ERRORS.HAS_UNTRACKED_FILES);
  }

  return {
    valid: errors.length === 0,
    errors,
    status
  };
}

export default {
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
};
