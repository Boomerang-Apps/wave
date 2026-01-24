/**
 * RLM Snapshot Restoration (GAP-012)
 *
 * Restores P.json from snapshots with integrity verification,
 * pre-restore backup, and audit logging.
 *
 * Based on:
 * - AWS RDS Snapshot Restore Patterns
 * - Database Rollback Strategies
 * - Git Restore Best Practices
 *
 * @see https://aws.amazon.com/blogs/database/amazon-rds-snapshot-restore-and-recovery-demystified/
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Error codes
export const SNAPSHOT_RESTORE_ERRORS = {
  SNAPSHOT_NOT_FOUND: 'snapshot_not_found',
  INTEGRITY_FAILED: 'integrity_failed',
  INVALID_JSON: 'invalid_json',
  MISSING_FIELDS: 'missing_fields',
  NO_CURRENT_STATE: 'no_current_state',
  INVALID_PATH: 'invalid_path',
  RESTORE_FAILED: 'restore_failed'
};

// Valid checkpoint names (matches snapshot-variable.sh)
export const VALID_CHECKPOINTS = [
  'startup',
  'pre-sync',
  'post-sync',
  'pre-qa',
  'post-qa',
  'pre-retry',
  'complete',
  'pre-restore',
  'custom'
];

// Required fields for a valid P.json
const REQUIRED_FIELDS = ['project_name', 'wave_number'];

/**
 * Get the snapshot directory path
 *
 * @param {string} projectPath - Path to project root
 * @returns {string} Snapshot directory path
 */
function getSnapshotDir(projectPath) {
  return path.join(projectPath, '.claude', 'rlm-snapshots');
}

/**
 * Get the P.json path
 *
 * @param {string} projectPath - Path to project root
 * @returns {string} P.json path
 */
function getPJsonPath(projectPath) {
  return path.join(projectPath, '.claude', 'P.json');
}

/**
 * Parse snapshot filename to extract metadata
 *
 * @param {string} filename - Snapshot filename
 * @returns {Object|null} Parsed metadata or null if invalid
 */
function parseSnapshotFilename(filename) {
  // Format: P-wave{N}-{checkpoint}-{YYYYMMDD-HHMMSS}.json
  const match = filename.match(/^P-wave(\d+)-([a-z-]+)-(\d{8}-\d{6})\.json$/);

  if (!match) {
    return null;
  }

  return {
    wave: parseInt(match[1], 10),
    checkpoint: match[2],
    timestamp: match[3]
  };
}

/**
 * Calculate SHA-256 checksum of file content
 *
 * @param {string} filepath - Path to file
 * @returns {string} Hex checksum
 */
function calculateChecksum(filepath) {
  const content = fs.readFileSync(filepath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Get current timestamp in snapshot format
 *
 * @returns {string} Timestamp (YYYYMMDD-HHMMSS)
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * List all snapshots for a wave
 *
 * @param {string} projectPath - Path to project root
 * @param {number} wave - Wave number
 * @returns {Array} List of snapshot metadata
 */
export function listSnapshots(projectPath, wave) {
  const snapshotDir = getSnapshotDir(projectPath);

  if (!fs.existsSync(snapshotDir)) {
    return [];
  }

  const files = fs.readdirSync(snapshotDir)
    .filter(f => f.startsWith(`P-wave${wave}-`) && f.endsWith('.json'));

  const snapshots = files
    .map(filename => {
      const metadata = parseSnapshotFilename(filename);
      if (!metadata || metadata.wave !== wave) {
        return null;
      }

      return {
        filename,
        path: path.join(snapshotDir, filename),
        ...metadata
      };
    })
    .filter(Boolean);

  // Sort by timestamp descending (newest first)
  snapshots.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return snapshots;
}

/**
 * Find a specific snapshot by checkpoint or timestamp
 *
 * @param {string} projectPath - Path to project root
 * @param {number} wave - Wave number
 * @param {Object} criteria - Search criteria { checkpoint, timestamp }
 * @returns {Object|null} Snapshot metadata or null
 */
export function findSnapshot(projectPath, wave, criteria = {}) {
  const { checkpoint, timestamp } = criteria;
  const snapshots = listSnapshots(projectPath, wave);

  if (timestamp) {
    return snapshots.find(s => s.timestamp === timestamp) || null;
  }

  if (checkpoint) {
    // Return the latest matching checkpoint
    return snapshots.find(s => s.checkpoint === checkpoint) || null;
  }

  return null;
}

/**
 * Verify snapshot integrity
 *
 * @param {string} snapshotPath - Path to snapshot file
 * @returns {Object} Result { valid, error, checksum }
 */
export function verifySnapshotIntegrity(snapshotPath) {
  if (!fs.existsSync(snapshotPath)) {
    return { valid: false, error: SNAPSHOT_RESTORE_ERRORS.SNAPSHOT_NOT_FOUND };
  }

  // Try to parse JSON
  let data;
  try {
    const content = fs.readFileSync(snapshotPath, 'utf-8');
    data = JSON.parse(content);
  } catch (e) {
    return { valid: false, error: SNAPSHOT_RESTORE_ERRORS.INVALID_JSON };
  }

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined) {
      return { valid: false, error: SNAPSHOT_RESTORE_ERRORS.MISSING_FIELDS, missingField: field };
    }
  }

  // Check for _snapshot metadata
  if (!data._snapshot) {
    return { valid: false, error: SNAPSHOT_RESTORE_ERRORS.MISSING_FIELDS, missingField: '_snapshot' };
  }

  // Calculate checksum
  const checksum = calculateChecksum(snapshotPath);

  return { valid: true, checksum, data };
}

/**
 * Create a pre-restore backup of current P.json
 *
 * @param {string} projectPath - Path to project root
 * @param {number} wave - Wave number
 * @returns {Object} Result { success, backupPath, error }
 */
export function createPreRestoreBackup(projectPath, wave) {
  const pPath = getPJsonPath(projectPath);

  if (!fs.existsSync(pPath)) {
    return { success: false, error: SNAPSHOT_RESTORE_ERRORS.NO_CURRENT_STATE };
  }

  const snapshotDir = getSnapshotDir(projectPath);
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const timestamp = getTimestamp();
  const backupFilename = `P-wave${wave}-pre-restore-${timestamp}.json`;
  const backupPath = path.join(snapshotDir, backupFilename);

  try {
    // Read current P.json
    const content = fs.readFileSync(pPath, 'utf-8');
    const data = JSON.parse(content);

    // Add snapshot metadata
    data._snapshot = {
      checkpoint: 'pre-restore',
      timestamp,
      wave,
      original_file: 'P.json'
    };

    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

    return { success: true, backupPath };
  } catch (e) {
    return { success: false, error: SNAPSHOT_RESTORE_ERRORS.RESTORE_FAILED, message: e.message };
  }
}

/**
 * Restore P.json from a snapshot
 *
 * @param {string} projectPath - Path to project root
 * @param {number} wave - Wave number
 * @param {string} snapshotPath - Path to snapshot file
 * @param {Object} options - Options { skipBackup }
 * @returns {Object} Result { success, backupPath, restoredFrom, error }
 */
export function restoreFromSnapshot(projectPath, wave, snapshotPath, options = {}) {
  const { skipBackup = false } = options;

  // Security: Validate path is within project
  const snapshotDir = getSnapshotDir(projectPath);
  const resolvedPath = path.resolve(snapshotPath);
  const resolvedSnapshotDir = path.resolve(snapshotDir);

  if (!resolvedPath.startsWith(resolvedSnapshotDir)) {
    return { success: false, error: SNAPSHOT_RESTORE_ERRORS.INVALID_PATH };
  }

  // Check snapshot exists
  if (!fs.existsSync(snapshotPath)) {
    return { success: false, error: SNAPSHOT_RESTORE_ERRORS.SNAPSHOT_NOT_FOUND };
  }

  // Verify integrity
  const integrity = verifySnapshotIntegrity(snapshotPath);
  if (!integrity.valid) {
    return { success: false, error: SNAPSHOT_RESTORE_ERRORS.INTEGRITY_FAILED, details: integrity.error };
  }

  // Create pre-restore backup
  let backupResult = null;
  if (!skipBackup) {
    const pPath = getPJsonPath(projectPath);
    if (fs.existsSync(pPath)) {
      backupResult = createPreRestoreBackup(projectPath, wave);
      if (!backupResult.success) {
        return { success: false, error: backupResult.error };
      }
    }
  }

  // Restore: Copy snapshot to P.json, removing _snapshot metadata
  try {
    const restoredData = { ...integrity.data };
    delete restoredData._snapshot; // Remove snapshot metadata from restored file

    const pPath = getPJsonPath(projectPath);
    fs.writeFileSync(pPath, JSON.stringify(restoredData, null, 2));

    // Extract checkpoint from snapshot metadata
    const checkpoint = integrity.data._snapshot?.checkpoint || 'unknown';

    return {
      success: true,
      backupPath: backupResult?.backupPath,
      restoredFrom: snapshotPath,
      checkpoint,
      timestamp: new Date().toISOString(),
      checksum: integrity.checksum
    };
  } catch (e) {
    return { success: false, error: SNAPSHOT_RESTORE_ERRORS.RESTORE_FAILED, message: e.message };
  }
}

/**
 * Get the latest snapshot, optionally filtered by checkpoint
 *
 * @param {string} projectPath - Path to project root
 * @param {number} wave - Wave number
 * @param {Object} options - Options { checkpoint }
 * @returns {Object|null} Latest snapshot or null
 */
export function getLatestSnapshot(projectPath, wave, options = {}) {
  const { checkpoint } = options;
  const snapshots = listSnapshots(projectPath, wave);

  if (snapshots.length === 0) {
    return null;
  }

  if (checkpoint) {
    return snapshots.find(s => s.checkpoint === checkpoint) || null;
  }

  // Already sorted newest first
  return snapshots[0];
}

export default {
  listSnapshots,
  findSnapshot,
  verifySnapshotIntegrity,
  restoreFromSnapshot,
  getLatestSnapshot,
  createPreRestoreBackup,
  SNAPSHOT_RESTORE_ERRORS,
  VALID_CHECKPOINTS
};
