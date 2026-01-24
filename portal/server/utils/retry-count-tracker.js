/**
 * Retry Count Tracker (GAP-016)
 *
 * Provides durable retry count persistence with backup redundancy.
 * Prevents bypassing escalation by file deletion through dual-storage
 * and always returning the highest count from any source.
 *
 * Features:
 * - Atomic persistence (temp file + rename)
 * - Backup redundancy (primary + backup locations)
 * - Deletion protection (uses highest count)
 * - Cross-session persistence
 * - Audit trail of all increments
 *
 * Based on:
 * - Idempotency Key Patterns (Stripe)
 * - State Machine Design (Martin Fowler)
 * - Distributed Counter Patterns (Redis)
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const renameAsync = promisify(fs.rename);
const readdirAsync = promisify(fs.readdir);

// ============================================
// Constants
// ============================================

export const DEFAULT_MAX_RETRIES = 3;

// Valid story ID pattern: alphanumeric, hyphens, underscores
const VALID_STORY_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

// ============================================
// Retry Count Tracker Class
// ============================================

export class RetryCountTracker {
  constructor(options = {}) {
    this.claudeDir = options.claudeDir || '.claude';
    this.primaryDir = path.join(this.claudeDir, 'retry-counts');
    this.backupDir = path.join(this.claudeDir, 'backup', 'retry-counts');
    this.maxRetriesMap = new Map(); // storyId -> maxRetries
    this.auditLog = []; // In-memory audit log
  }

  /**
   * Validate story ID to prevent path traversal attacks
   * @param {string} storyId - Story ID to validate
   */
  _validateStoryId(storyId) {
    if (!storyId || typeof storyId !== 'string' || storyId.trim() === '') {
      throw new Error('Invalid story ID: empty or not a string');
    }

    if (!VALID_STORY_ID_PATTERN.test(storyId)) {
      throw new Error('Invalid story ID: contains invalid characters');
    }
  }

  /**
   * Validate wave number
   * @param {number} wave - Wave number to validate
   */
  _validateWave(wave) {
    if (typeof wave !== 'number' || wave < 0) {
      throw new Error('Invalid wave number: must be non-negative integer');
    }
  }

  /**
   * Ensure directories exist
   */
  _ensureDirectories() {
    if (!fs.existsSync(this.primaryDir)) {
      fs.mkdirSync(this.primaryDir, { recursive: true });
    }
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Get file paths for a story
   * @param {string} storyId - Story ID
   * @returns {Object} Primary and backup file paths
   */
  _getFilePaths(storyId) {
    return {
      primary: path.join(this.primaryDir, `${storyId}.json`),
      backup: path.join(this.backupDir, `${storyId}.json`)
    };
  }

  /**
   * Read retry data from a file
   * @param {string} filepath - File path
   * @returns {Object|null} Retry data or null
   */
  async _readRetryData(filepath) {
    try {
      if (!fs.existsSync(filepath)) {
        return null;
      }
      const content = await readFileAsync(filepath, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      console.error(`[RetryCountTracker] Failed to read ${filepath}:`, err.message);
      return null;
    }
  }

  /**
   * Write retry data atomically (temp file + rename)
   * @param {string} filepath - Target file path
   * @param {Object} data - Data to write
   */
  async _writeRetryDataAtomic(filepath, data) {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tmpFile = `${filepath}.tmp.${Date.now()}`;
    await writeFileAsync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    await renameAsync(tmpFile, filepath);
  }

  /**
   * Increment retry count for a story
   * @param {string} storyId - Story ID
   * @param {number} wave - Wave number
   * @param {string} reason - Reason for retry
   * @returns {number} New count
   */
  async incrementRetryCount(storyId, wave, reason) {
    this._validateStoryId(storyId);
    this._validateWave(wave);
    this._ensureDirectories();

    const { primary, backup } = this._getFilePaths(storyId);

    // Read existing data (use highest count for protection)
    const primaryData = await this._readRetryData(primary);
    const backupData = await this._readRetryData(backup);

    const existingCount = Math.max(
      primaryData?.count || 0,
      backupData?.count || 0
    );

    const newCount = existingCount + 1;
    const timestamp = new Date().toISOString();

    // Build history
    const existingHistory = primaryData?.history || backupData?.history || [];
    const newHistory = [
      ...existingHistory,
      {
        timestamp,
        count: newCount,
        reason: reason || 'No reason provided'
      }
    ];

    // Build new data
    const newData = {
      storyId,
      wave,
      count: newCount,
      maxRetries: this.maxRetriesMap.get(storyId) || DEFAULT_MAX_RETRIES,
      history: newHistory,
      createdAt: primaryData?.createdAt || backupData?.createdAt || timestamp,
      updatedAt: timestamp
    };

    // Write to both locations atomically
    await this._writeRetryDataAtomic(primary, newData);
    await this._writeRetryDataAtomic(backup, newData);

    // Record in audit log
    this.auditLog.push({
      action: 'increment',
      storyId,
      wave,
      count: newCount,
      reason,
      timestamp
    });

    return newCount;
  }

  /**
   * Get current retry count for a story
   * Uses highest count from primary/backup for deletion protection
   * @param {string} storyId - Story ID
   * @returns {number} Current count (0 if not found)
   */
  async getRetryCount(storyId) {
    this._validateStoryId(storyId);

    const { primary, backup } = this._getFilePaths(storyId);

    const primaryData = await this._readRetryData(primary);
    const backupData = await this._readRetryData(backup);

    // Return highest count for deletion protection
    return Math.max(
      primaryData?.count || 0,
      backupData?.count || 0
    );
  }

  /**
   * Check if max retries exceeded for a story
   * @param {string} storyId - Story ID
   * @returns {boolean} True if exceeded
   */
  async isMaxRetriesExceeded(storyId) {
    const count = await this.getRetryCount(storyId);
    const maxRetries = this.maxRetriesMap.get(storyId) || DEFAULT_MAX_RETRIES;
    return count >= maxRetries;
  }

  /**
   * Get retry history for a story
   * @param {string} storyId - Story ID
   * @returns {Array} History entries
   */
  async getRetryHistory(storyId) {
    this._validateStoryId(storyId);

    const { primary, backup } = this._getFilePaths(storyId);

    const primaryData = await this._readRetryData(primary);
    const backupData = await this._readRetryData(backup);

    // Return history from whichever has more entries
    const primaryHistory = primaryData?.history || [];
    const backupHistory = backupData?.history || [];

    return primaryHistory.length >= backupHistory.length
      ? primaryHistory
      : backupHistory;
  }

  /**
   * Reset retry count for a story
   * @param {string} storyId - Story ID
   * @param {Object} options - Options with confirm: true required
   */
  async resetRetryCount(storyId, options = {}) {
    if (!options.confirm) {
      throw new Error('Confirmation required to reset retry count. Pass { confirm: true }');
    }

    this._validateStoryId(storyId);

    const { primary, backup } = this._getFilePaths(storyId);

    // Remove both files
    if (fs.existsSync(primary)) {
      await unlinkAsync(primary);
    }
    if (fs.existsSync(backup)) {
      await unlinkAsync(backup);
    }

    // Record in audit log
    this.auditLog.push({
      action: 'reset',
      storyId,
      reason: options.reason || 'No reason provided',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get all retry counts
   * @returns {Object} Map of storyId -> count info
   */
  async getAllRetryCounts() {
    this._ensureDirectories();

    const result = {};

    // Read from primary directory
    if (fs.existsSync(this.primaryDir)) {
      const files = await readdirAsync(this.primaryDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const storyId = file.replace('.json', '');
          const count = await this.getRetryCount(storyId);
          const { primary } = this._getFilePaths(storyId);
          const data = await this._readRetryData(primary);

          result[storyId] = {
            count,
            wave: data?.wave,
            maxRetries: this.maxRetriesMap.get(storyId) || DEFAULT_MAX_RETRIES,
            exceeded: count >= (this.maxRetriesMap.get(storyId) || DEFAULT_MAX_RETRIES),
            updatedAt: data?.updatedAt
          };
        }
      }
    }

    // Also check backup directory for files not in primary
    if (fs.existsSync(this.backupDir)) {
      const backupFiles = await readdirAsync(this.backupDir);

      for (const file of backupFiles) {
        if (file.endsWith('.json')) {
          const storyId = file.replace('.json', '');
          if (!result[storyId]) {
            const count = await this.getRetryCount(storyId);
            const { backup } = this._getFilePaths(storyId);
            const data = await this._readRetryData(backup);

            result[storyId] = {
              count,
              wave: data?.wave,
              maxRetries: this.maxRetriesMap.get(storyId) || DEFAULT_MAX_RETRIES,
              exceeded: count >= (this.maxRetriesMap.get(storyId) || DEFAULT_MAX_RETRIES),
              updatedAt: data?.updatedAt
            };
          }
        }
      }
    }

    return result;
  }

  /**
   * Set max retries for a specific story
   * @param {string} storyId - Story ID
   * @param {number} maxRetries - Max retries limit
   */
  setMaxRetries(storyId, maxRetries) {
    if (typeof maxRetries !== 'number' || maxRetries < 1) {
      throw new Error('Max retries must be positive integer');
    }
    this.maxRetriesMap.set(storyId, maxRetries);
  }

  /**
   * Get audit log
   * @returns {Array} Audit log entries
   */
  getAuditLog() {
    return [...this.auditLog];
  }

  /**
   * Cleanup expired retry counts
   * @param {Object} options - Options with maxAgeDays
   */
  async cleanup(options = {}) {
    const maxAgeDays = options.maxAgeDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    this._ensureDirectories();

    // Check primary directory
    if (fs.existsSync(this.primaryDir)) {
      const files = await readdirAsync(this.primaryDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(this.primaryDir, file);
          const data = await this._readRetryData(filepath);

          if (data?.updatedAt) {
            const updatedAt = new Date(data.updatedAt);
            if (updatedAt < cutoffDate) {
              await unlinkAsync(filepath);

              // Also remove backup
              const storyId = file.replace('.json', '');
              const { backup } = this._getFilePaths(storyId);
              if (fs.existsSync(backup)) {
                await unlinkAsync(backup);
              }
            }
          }
        }
      }
    }
  }
}

export default RetryCountTracker;
