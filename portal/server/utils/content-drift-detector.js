/**
 * Content-Based Drift Detector (GAP-009)
 *
 * Detects content drift using git diff instead of timestamp-based detection.
 * Supports untracked file detection and cascade lock invalidation.
 *
 * Based on:
 * - Git Internals - Content Addressable Storage
 * - Infrastructure as Code Drift Detection patterns
 * - Pulumi Drift Detection
 *
 * @see https://git-scm.com/book/en/v2/Git-Internals-Git-Objects
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

// Error codes
export const DRIFT_DETECTOR_ERRORS = {
  NOT_A_GIT_REPO: 'not_a_git_repo',
  LOCK_NOT_FOUND: 'lock_not_found',
  DRIFT_DETECTED: 'drift_detected',
  INVALID_LOCK: 'invalid_lock'
};

// Phase dependencies (downstream phases)
// If Phase N drifts, all phases that depend on it (directly or indirectly) must be invalidated
export const PHASE_DEPENDENCIES = {
  0: [],       // Phase 0 has no dependencies
  1: [0],      // Phase 1 depends on Phase 0
  2: [0],      // Phase 2 depends on Phase 0
  3: [2],      // Phase 3 depends on Phase 2
  4: [3]       // Phase 4 depends on Phase 3
};

// Inverse: which phases depend on this phase (downstream)
const DOWNSTREAM_PHASES = {
  0: [1, 2, 3, 4],  // If Phase 0 drifts, invalidate 1, 2, 3, 4
  1: [],            // Nothing depends on Phase 1
  2: [3, 4],        // If Phase 2 drifts, invalidate 3, 4
  3: [4],           // If Phase 3 drifts, invalidate 4
  4: []             // Nothing depends on Phase 4
};

/**
 * Check if a directory is a git repository
 *
 * @param {string} projectPath - Path to check
 * @returns {boolean} True if git repo
 */
function isGitRepo(projectPath) {
  try {
    execSync('git rev-parse --git-dir', {
      cwd: projectPath,
      stdio: 'pipe'
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Detect content drift using git diff
 *
 * @param {string} projectPath - Path to project root
 * @returns {Object} Result { hasChanges, changedFiles, error }
 */
export function detectContentDrift(projectPath) {
  if (!isGitRepo(projectPath)) {
    return {
      hasChanges: false,
      changedFiles: [],
      error: DRIFT_DETECTOR_ERRORS.NOT_A_GIT_REPO
    };
  }

  try {
    // Get all uncommitted changes (staged + unstaged)
    const diffOutput = execSync('git diff --name-only HEAD', {
      cwd: projectPath,
      stdio: 'pipe',
      encoding: 'utf-8'
    }).trim();

    // Also check for staged changes (in case HEAD doesn't exist or is detached)
    let stagedOutput = '';
    try {
      stagedOutput = execSync('git diff --name-only --cached', {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();
    } catch (e) {
      // Ignore - might not have staged changes
    }

    // Combine and deduplicate
    const changedFiles = [
      ...new Set([
        ...diffOutput.split('\n').filter(f => f.trim()),
        ...stagedOutput.split('\n').filter(f => f.trim())
      ])
    ];

    return {
      hasChanges: changedFiles.length > 0,
      changedFiles
    };
  } catch (e) {
    // Handle fresh repo with no commits
    try {
      const stagedOutput = execSync('git diff --name-only --cached', {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();

      const changedFiles = stagedOutput.split('\n').filter(f => f.trim());

      return {
        hasChanges: changedFiles.length > 0,
        changedFiles
      };
    } catch (e2) {
      return {
        hasChanges: false,
        changedFiles: [],
        error: e.message
      };
    }
  }
}

/**
 * Detect untracked files using git status
 *
 * @param {string} projectPath - Path to project root
 * @returns {Object} Result { untrackedFiles }
 */
export function detectUntrackedFiles(projectPath) {
  if (!isGitRepo(projectPath)) {
    return {
      untrackedFiles: [],
      error: DRIFT_DETECTOR_ERRORS.NOT_A_GIT_REPO
    };
  }

  try {
    // Get untracked files using porcelain format
    // ?? prefix indicates untracked files
    const statusOutput = execSync('git status --porcelain', {
      cwd: projectPath,
      stdio: 'pipe',
      encoding: 'utf-8'
    }).trim();

    const untrackedFiles = statusOutput
      .split('\n')
      .filter(line => line.startsWith('??'))
      .map(line => line.slice(3).trim())
      .filter(f => f);

    return { untrackedFiles };
  } catch (e) {
    return {
      untrackedFiles: [],
      error: e.message
    };
  }
}

/**
 * Calculate content hash for a set of files
 *
 * @param {string} projectPath - Path to project root
 * @param {string[]} files - List of file paths (relative to project)
 * @returns {string} SHA-256 hash of combined content
 */
export function calculateContentHash(projectPath, files) {
  const hash = crypto.createHash('sha256');

  for (const file of files.sort()) {
    const filePath = path.join(projectPath, file);
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        hash.update(file);
        hash.update(content);
      } else {
        hash.update(file);
        hash.update('__DELETED__');
      }
    } catch (e) {
      hash.update(file);
      hash.update('__ERROR__');
    }
  }

  return hash.digest('hex');
}

/**
 * Get the lock file path for a phase and wave
 *
 * @param {string} projectPath - Path to project root
 * @param {number} wave - Wave number
 * @param {number} phase - Phase number
 * @returns {string} Lock file path
 */
function getLockPath(projectPath, wave, phase) {
  return path.join(projectPath, '.claude', 'locks', `PHASE${phase}-wave${wave}.lock`);
}

/**
 * Check if a specific lock has drifted
 *
 * @param {string} projectPath - Path to project root
 * @param {number} wave - Wave number
 * @param {number} phase - Phase number
 * @returns {Object} Result { hasDrift, storedChecksum, currentChecksum, error }
 */
export function checkLockDrift(projectPath, wave, phase) {
  const lockPath = getLockPath(projectPath, wave, phase);

  if (!fs.existsSync(lockPath)) {
    return {
      hasDrift: false,
      error: DRIFT_DETECTOR_ERRORS.LOCK_NOT_FOUND
    };
  }

  try {
    const lockContent = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));

    // Skip already invalidated locks
    if (lockContent.status === 'INVALIDATED') {
      return {
        hasDrift: false,
        skipped: true,
        reason: 'already_invalidated'
      };
    }

    const storedChecksum = lockContent.checksum;

    // First check for git content changes
    const { changedFiles, hasChanges } = detectContentDrift(projectPath);

    // If there are uncommitted changes, consider it drifted
    if (hasChanges) {
      return {
        hasDrift: true,
        storedChecksum,
        currentChecksum: 'content-changed',
        changedFiles
      };
    }

    // Even without git changes, if checksum doesn't match known hash format, it's drifted
    // This handles cases where the lock was created with a different state
    // A valid SHA-256 hash is 64 hex characters
    const isValidHashFormat = /^[a-f0-9]{64}$/i.test(storedChecksum);
    if (!isValidHashFormat && storedChecksum !== 'no-stories' && storedChecksum !== 'no-worktrees') {
      return {
        hasDrift: true,
        storedChecksum,
        currentChecksum: 'checksum-format-invalid'
      };
    }

    // No changes detected
    return {
      hasDrift: false,
      storedChecksum
    };
  } catch (e) {
    return {
      hasDrift: false,
      error: DRIFT_DETECTOR_ERRORS.INVALID_LOCK
    };
  }
}

/**
 * Invalidate a lock file
 *
 * @param {string} projectPath - Path to project root
 * @param {number} wave - Wave number
 * @param {number} phase - Phase number
 * @param {string} reason - Reason for invalidation
 * @returns {Object} Result { success, error }
 */
export function invalidateLock(projectPath, wave, phase, reason) {
  const lockPath = getLockPath(projectPath, wave, phase);

  if (!fs.existsSync(lockPath)) {
    return {
      success: false,
      error: DRIFT_DETECTOR_ERRORS.LOCK_NOT_FOUND
    };
  }

  try {
    const lockContent = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));

    // Preserve all existing data, just update status
    const updatedLock = {
      ...lockContent,
      status: 'INVALIDATED',
      invalidation_reason: reason,
      invalidated_at: new Date().toISOString()
    };

    fs.writeFileSync(lockPath, JSON.stringify(updatedLock, null, 2));

    return {
      success: true,
      phase,
      wave,
      reason
    };
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Cascade invalidation to downstream locks
 *
 * @param {string} projectPath - Path to project root
 * @param {number} wave - Wave number
 * @param {number} driftedPhase - Phase that drifted
 * @returns {Object} Result { invalidatedPhases, skipped }
 */
export function cascadeInvalidation(projectPath, wave, driftedPhase) {
  const downstreamPhases = DOWNSTREAM_PHASES[driftedPhase] || [];
  const invalidatedPhases = [];
  const skipped = [];

  for (const phase of downstreamPhases) {
    const result = invalidateLock(projectPath, wave, phase, `cascade_from_phase_${driftedPhase}`);

    if (result.success) {
      invalidatedPhases.push(phase);
    } else if (result.error === DRIFT_DETECTOR_ERRORS.LOCK_NOT_FOUND) {
      skipped.push(phase);
    }
  }

  return {
    driftedPhase,
    invalidatedPhases,
    skipped
  };
}

/**
 * Get a complete drift report
 *
 * @param {string} projectPath - Path to project root
 * @param {number} wave - Wave number
 * @returns {Object} Complete drift report
 */
export function getDriftReport(projectPath, wave) {
  const contentDrift = detectContentDrift(projectPath);
  const untrackedResult = detectUntrackedFiles(projectPath);

  const report = {
    timestamp: new Date().toISOString(),
    projectPath,
    wave,
    hasContentDrift: contentDrift.hasChanges,
    hasUntrackedFiles: untrackedResult.untrackedFiles.length > 0,
    changedFiles: contentDrift.changedFiles,
    untrackedFiles: untrackedResult.untrackedFiles,
    affectedLocks: []
  };

  // Check each phase for lock drift
  for (let phase = 0; phase <= 4; phase++) {
    const lockPath = getLockPath(projectPath, wave, phase);

    if (fs.existsSync(lockPath)) {
      const lockResult = checkLockDrift(projectPath, wave, phase);
      report.affectedLocks.push({
        phase,
        lockPath,
        hasDrift: lockResult.hasDrift,
        skipped: lockResult.skipped,
        reason: lockResult.reason
      });
    }
  }

  return report;
}

export default {
  detectContentDrift,
  detectUntrackedFiles,
  calculateContentHash,
  checkLockDrift,
  invalidateLock,
  cascadeInvalidation,
  getDriftReport,
  DRIFT_DETECTOR_ERRORS,
  PHASE_DEPENDENCIES
};
