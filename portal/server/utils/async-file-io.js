/**
 * Async File I/O (CQ-008)
 *
 * Provides standardized async file operations to replace inconsistent
 * sync/async patterns throughout the codebase.
 *
 * All functions return Promises and use fs.promises internally.
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// READ OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read file contents
 * @param {string} filePath - Path to file
 * @param {Object} [options] - Options
 * @param {string|null} [options.encoding='utf8'] - Encoding (null for Buffer)
 * @returns {Promise<string|Buffer>}
 */
export async function readFile(filePath, options = {}) {
  const encoding = options.encoding !== undefined ? options.encoding : 'utf8';
  return fsPromises.readFile(filePath, encoding);
}

/**
 * Read directory contents
 * @param {string} dirPath - Path to directory
 * @param {Object} [options] - Options
 * @param {boolean} [options.withFileTypes=false] - Return Dirent objects
 * @returns {Promise<string[]|fs.Dirent[]>}
 */
export async function readdir(dirPath, options = {}) {
  return fsPromises.readdir(dirPath, options);
}

/**
 * Read and parse JSON file
 * @param {string} filePath - Path to JSON file
 * @param {Object} [options] - Options
 * @param {*} [options.default] - Default value if file doesn't exist
 * @returns {Promise<*>}
 */
export async function readJson(filePath, options = {}) {
  try {
    const content = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT' && 'default' in options) {
      return options.default;
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Write file contents
 * @param {string} filePath - Path to file
 * @param {string|Buffer} data - Data to write
 * @param {Object} [options] - Options
 * @param {boolean} [options.recursive=false] - Create parent directories
 * @param {string} [options.encoding='utf8'] - Encoding
 * @returns {Promise<void>}
 */
export async function writeFile(filePath, data, options = {}) {
  if (options.recursive) {
    const dir = path.dirname(filePath);
    await ensureDir(dir);
  }

  return fsPromises.writeFile(filePath, data, options.encoding || 'utf8');
}

/**
 * Write JSON to file
 * @param {string} filePath - Path to file
 * @param {*} data - Data to serialize
 * @param {Object} [options] - Options
 * @param {number} [options.spaces=0] - Indentation spaces
 * @returns {Promise<void>}
 */
export async function writeJson(filePath, data, options = {}) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const json = JSON.stringify(data, null, options.spaces || 0);
  return fsPromises.writeFile(filePath, json, 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// EXISTENCE CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if path exists
 * @param {string} targetPath - Path to check
 * @returns {Promise<boolean>}
 */
export async function exists(targetPath) {
  try {
    await fsPromises.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Alias for exists (fs-extra compatibility)
 */
export const pathExists = exists;

// ─────────────────────────────────────────────────────────────────────────────
// DIRECTORY OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create directory
 * @param {string} dirPath - Path to directory
 * @param {Object} [options] - Options
 * @param {boolean} [options.recursive=false] - Create parent directories
 * @returns {Promise<string|undefined>}
 */
export async function mkdir(dirPath, options = {}) {
  return fsPromises.mkdir(dirPath, options);
}

/**
 * Ensure directory exists (create if not)
 * @param {string} dirPath - Path to directory
 * @returns {Promise<void>}
 */
export async function ensureDir(dirPath) {
  try {
    await fsPromises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Ignore if already exists
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get file/directory stats
 * @param {string} targetPath - Path to check
 * @returns {Promise<fs.Stats>}
 */
export async function stat(targetPath) {
  return fsPromises.stat(targetPath);
}

/**
 * Get file/directory stats, returning null instead of throwing
 * @param {string} targetPath - Path to check
 * @returns {Promise<fs.Stats|null>}
 */
export async function statSafe(targetPath) {
  try {
    return await fsPromises.stat(targetPath);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete file
 * @param {string} filePath - Path to file
 * @returns {Promise<void>}
 */
export async function unlink(filePath) {
  return fsPromises.unlink(filePath);
}

/**
 * Delete empty directory
 * @param {string} dirPath - Path to directory
 * @returns {Promise<void>}
 */
export async function rmdir(dirPath) {
  return fsPromises.rmdir(dirPath);
}

/**
 * Remove file or directory recursively
 * @param {string} targetPath - Path to remove
 * @returns {Promise<void>}
 */
export async function remove(targetPath) {
  try {
    await fsPromises.rm(targetPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore if doesn't exist
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COPY AND RENAME
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Copy file
 * @param {string} srcPath - Source path
 * @param {string} destPath - Destination path
 * @returns {Promise<void>}
 */
export async function copyFile(srcPath, destPath) {
  return fsPromises.copyFile(srcPath, destPath);
}

/**
 * Rename/move file or directory
 * @param {string} srcPath - Source path
 * @param {string} destPath - Destination path
 * @returns {Promise<void>}
 */
export async function rename(srcPath, destPath) {
  return fsPromises.rename(srcPath, destPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  // Read
  readFile,
  readdir,
  readJson,

  // Write
  writeFile,
  writeJson,

  // Existence
  exists,
  pathExists,

  // Directories
  mkdir,
  ensureDir,

  // Stats
  stat,
  statSafe,

  // Delete
  unlink,
  rmdir,
  remove,

  // Copy/Rename
  copyFile,
  rename
};
