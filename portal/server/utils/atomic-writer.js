// ═══════════════════════════════════════════════════════════════════════════════
// ATOMIC WRITER - RELIABLE FILE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════
// IMP-004: Atomic file writing for signal files
//
// Pattern: temp-file → fsync → rename
//
// Sources:
// - https://www.npmjs.com/package/write-file-atomic
// - https://github.com/fabiospampinato/atomically
// - https://lwn.net/Articles/789600/
// - https://nodejs.org/api/fs.html
//
// Key guarantees:
// - No partial files at destination on failure
// - Content is fsynced to disk before rename
// - Rename is atomic on POSIX systems
// - Temp files are always cleaned up
// ═══════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const ATOMIC_WRITE_OPTIONS = {
  fsync: true,
  mode: 0o644,
  encoding: 'utf8'
};

// ─────────────────────────────────────────────────────────────────────────────
// AtomicWriter Class
// ─────────────────────────────────────────────────────────────────────────────

export class AtomicWriter {
  constructor(options = {}) {
    this.options = {
      fsync: options.fsync ?? ATOMIC_WRITE_OPTIONS.fsync,
      mode: options.mode ?? ATOMIC_WRITE_OPTIONS.mode,
      encoding: options.encoding ?? ATOMIC_WRITE_OPTIONS.encoding,
      createDir: options.createDir ?? false
    };
  }

  /**
   * Generate a unique temp file path
   * @param {string} targetPath - Final destination path
   * @returns {string} Temporary file path
   */
  getTempPath(targetPath) {
    const dir = path.dirname(targetPath);
    const base = path.basename(targetPath);
    const uniqueId = crypto.randomUUID().slice(0, 8);
    return path.join(dir, `.${base}.${uniqueId}.tmp`);
  }

  /**
   * Write content atomically to a file
   * @param {string} targetPath - Final destination path
   * @param {string} content - Content to write
   * @returns {Promise<void>}
   */
  async write(targetPath, content) {
    const tempPath = this.getTempPath(targetPath);
    let fd = null;

    try {
      // Create parent directory if needed
      if (this.options.createDir) {
        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
      }

      // Write to temp file
      await fs.promises.writeFile(tempPath, content, {
        encoding: this.options.encoding,
        mode: this.options.mode
      });

      // fsync if enabled
      if (this.options.fsync) {
        fd = await fs.promises.open(tempPath, 'r');
        await new Promise((resolve, reject) => {
          fs.fsync(fd.fd, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        await fd.close();
        fd = null;
      }

      // Atomic rename
      await fs.promises.rename(tempPath, targetPath);

    } catch (error) {
      // Cleanup temp file on error
      await this._cleanup(tempPath);

      // Close fd if still open
      if (fd !== null) {
        try {
          await fd.close();
        } catch {
          // Ignore close errors during cleanup
        }
      }

      throw error;
    }
  }

  /**
   * Clean up temp file
   * @param {string} tempPath - Temp file path to remove
   */
  async _cleanup(tempPath) {
    try {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
    } catch {
      // Ignore cleanup errors - best effort
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Write string content atomically
 * @param {string} targetPath - File path
 * @param {string} content - String content
 * @param {Object} options - Write options
 * @returns {Promise<void>}
 */
export async function atomicWriteFile(targetPath, content, options = {}) {
  const writer = new AtomicWriter(options);
  return writer.write(targetPath, content);
}

/**
 * Write JSON object atomically
 * @param {string} targetPath - File path
 * @param {Object} data - Object to serialize as JSON
 * @param {Object} options - Write options
 * @returns {Promise<void>}
 */
export async function atomicWriteJson(targetPath, data, options = {}) {
  const compact = options.compact ?? false;
  const content = compact
    ? JSON.stringify(data)
    : JSON.stringify(data, null, 2);

  const writer = new AtomicWriter(options);
  return writer.write(targetPath, content);
}

/**
 * Write a signal file atomically
 * @param {string} targetPath - Signal file path
 * @param {Object} signalData - Signal data object
 * @param {Object} options - Write options
 * @returns {Promise<void>}
 */
export async function writeSignalFile(targetPath, signalData, options = {}) {
  return atomicWriteJson(targetPath, signalData, {
    fsync: true,
    createDir: true,
    ...options
  });
}

export default AtomicWriter;
