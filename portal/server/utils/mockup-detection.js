/**
 * Mockup Detection Module (Launch Sequence)
 *
 * Phase 2, Step 2.2: Mockup Detection Function
 *
 * Detects HTML mockup files in the design_mockups folder
 * for Step 0 of the launch sequence.
 */

import { readdir, access } from 'fs/promises';
import path from 'path';

// ============================================
// Constants
// ============================================

/**
 * File extensions to recognize as mockup files
 * @type {readonly string[]}
 */
export const MOCKUP_FILE_PATTERNS = Object.freeze(['.html', '.htm']);

/**
 * Name of the mockups folder
 */
const MOCKUP_FOLDER_NAME = 'design_mockups';

// ============================================
// Path Helpers
// ============================================

/**
 * Get the path to the design_mockups folder for a project
 * @param {string} projectRoot - Root path of the project
 * @returns {string} Path to the mockups folder
 */
export function getMockupFolderPath(projectRoot) {
  // Normalize the path and remove trailing slash
  const normalizedRoot = projectRoot.replace(/[/\\]+$/, '');
  return path.join(normalizedRoot, MOCKUP_FOLDER_NAME);
}

// ============================================
// Natural Sort Helper
// ============================================

/**
 * Natural sort comparator for file names
 * Handles numeric prefixes correctly (1, 2, 10 instead of 1, 10, 2)
 * @param {string} a - First file name
 * @param {string} b - Second file name
 * @returns {number} Comparison result
 */
function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// ============================================
// Detection Function
// ============================================

/**
 * @typedef {Object} MockupFile
 * @property {string} name - File name
 * @property {string} path - Full path to the file
 */

/**
 * @typedef {Object} MockupDetectionResult
 * @property {boolean} found - Whether any mockups were found
 * @property {boolean} folderExists - Whether the design_mockups folder exists
 * @property {MockupFile[]} files - Array of detected mockup files
 * @property {string} [error] - Error message if detection failed
 */

/**
 * Detect HTML mockup files in a project's design_mockups folder
 * @param {string | null | undefined} projectRoot - Root path of the project
 * @returns {Promise<MockupDetectionResult>}
 */
export async function detectMockups(projectRoot) {
  // Handle invalid input
  if (!projectRoot || typeof projectRoot !== 'string') {
    return {
      found: false,
      folderExists: false,
      files: [],
      error: 'Invalid project path'
    };
  }

  const mockupFolder = getMockupFolderPath(projectRoot);

  // Check if folder exists
  try {
    await access(mockupFolder);
  } catch {
    return {
      found: false,
      folderExists: false,
      files: []
    };
  }

  // Read folder contents
  try {
    const entries = await readdir(mockupFolder, { withFileTypes: true });

    // Filter for HTML files only
    const htmlFiles = entries
      .filter(entry => {
        if (!entry.isFile()) return false;

        const ext = path.extname(entry.name).toLowerCase();
        return MOCKUP_FILE_PATTERNS.includes(ext);
      })
      .map(entry => ({
        name: entry.name,
        path: path.join(mockupFolder, entry.name)
      }))
      .sort((a, b) => naturalSort(a.name, b.name));

    return {
      found: htmlFiles.length > 0,
      folderExists: true,
      files: htmlFiles
    };
  } catch (err) {
    return {
      found: false,
      folderExists: true,
      files: [],
      error: err.message
    };
  }
}

export default detectMockups;
