/**
 * PRD Detection Module (Launch Sequence)
 *
 * Phase 3, Step 3.1: PRD Detection Function
 *
 * Detects and parses Product Requirements Documents (PRD) in a project.
 */

import { access, readdir, readFile, stat } from 'fs/promises';
import path from 'path';

// ============================================
// Constants
// ============================================

/**
 * Regex patterns for matching PRD files
 */
export const PRD_FILE_PATTERNS = [
  /^PRD\.md$/i,                           // PRD.md
  /^prd\.md$/i,                           // prd.md
  /PRD[-_]?v?\d*\.md$/i,                  // PRD-v2.md, PRD_v1.md
  /product[-_]?requirements?\.md$/i,       // Product-Requirements.md
  /[-_]PRD\.md$/i,                        // MyApp-PRD.md
  /^requirements\.md$/i                    // requirements.md
];

/**
 * Locations to search for PRD files
 */
export const PRD_SEARCH_LOCATIONS = [
  '.',
  'docs',
  'documentation',
  'doc',
  '.claudecode'
];

// ============================================
// Detection Functions
// ============================================

/**
 * Check if a filename matches PRD patterns
 * @param {string} filename - Filename to check
 * @returns {boolean} True if matches PRD pattern
 */
function isPRDFile(filename) {
  return PRD_FILE_PATTERNS.some(pattern => pattern.test(filename));
}

/**
 * @typedef {Object} PRDFile
 * @property {string} name - Filename
 * @property {string} path - Full path
 * @property {number} size - File size in bytes
 * @property {string} location - Search location where found
 */

/**
 * @typedef {Object} PRDDetectionResult
 * @property {boolean} found - Whether a PRD was found
 * @property {PRDFile[]} files - Array of found PRD files
 * @property {string} [error] - Error message if detection failed
 */

/**
 * Detect PRD files in a project
 * @param {string} projectRoot - Path to project root
 * @returns {Promise<PRDDetectionResult>}
 */
export async function detectPRD(projectRoot) {
  // Validate input
  if (!projectRoot || typeof projectRoot !== 'string' || projectRoot.trim() === '') {
    return {
      found: false,
      files: [],
      error: 'Invalid project path'
    };
  }

  const foundFiles = [];

  // Search each location
  for (const location of PRD_SEARCH_LOCATIONS) {
    const searchPath = location === '.'
      ? projectRoot
      : path.join(projectRoot, location);

    try {
      // Check if directory exists
      await access(searchPath);

      // Read directory contents
      const entries = await readdir(searchPath, { withFileTypes: true });

      // Filter for PRD files
      for (const entry of entries) {
        if (entry.isFile() && isPRDFile(entry.name)) {
          const filePath = path.join(searchPath, entry.name);

          try {
            const fileStat = await stat(filePath);
            foundFiles.push({
              name: entry.name,
              path: filePath,
              size: fileStat.size,
              location
            });
          } catch {
            // Skip files we can't stat
          }
        }
      }
    } catch {
      // Directory doesn't exist or not accessible, continue
    }
  }

  return {
    found: foundFiles.length > 0,
    files: foundFiles
  };
}

// ============================================
// Parsing Functions
// ============================================

/**
 * @typedef {Object} PRDFeature
 * @property {string} name - Feature name
 * @property {string} description - Feature description
 */

/**
 * @typedef {Object} PRDEpic
 * @property {string} name - Epic name
 * @property {PRDFeature[]} features - Features in this epic
 */

/**
 * @typedef {Object} PRDStructure
 * @property {string} title - Document title
 * @property {string[]} sections - Section headings found
 * @property {PRDEpic[]} epics - Epics defined
 * @property {number} featureCount - Total feature count
 * @property {boolean} valid - Whether structure is valid
 * @property {string} [error] - Error message if parsing failed
 */

/**
 * Parse PRD structure from a markdown file
 * @param {string} filePath - Path to PRD file
 * @returns {Promise<PRDStructure>}
 */
export async function parsePRDStructure(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');

    if (!content || content.trim() === '') {
      return {
        title: '',
        sections: [],
        epics: [],
        featureCount: 0,
        valid: false
      };
    }

    // Extract title (first H1)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract all H2 sections
    const sectionMatches = content.matchAll(/^##\s+(.+)$/gm);
    const sections = [];
    for (const match of sectionMatches) {
      sections.push(match[1].trim());
    }

    // Extract epics (H2 headers containing "Epic")
    const epics = [];
    const epicMatches = content.matchAll(/^##\s+(Epic\s*\d*:?\s*.+)$/gm);

    for (const match of epicMatches) {
      const epicName = match[1].trim();

      // Find features under this epic (H3 headers after epic until next H2)
      const epicIndex = content.indexOf(match[0]);
      const nextH2Index = content.indexOf('\n## ', epicIndex + 1);
      const epicSection = nextH2Index > -1
        ? content.slice(epicIndex, nextH2Index)
        : content.slice(epicIndex);

      const featureMatches = epicSection.matchAll(/^###\s+(Feature\s*[\d.]*:?\s*.+|.+)$/gm);
      const features = [];

      for (const featureMatch of featureMatches) {
        features.push({
          name: featureMatch[1].trim(),
          description: ''
        });
      }

      epics.push({
        name: epicName,
        features
      });
    }

    // Count total features
    const featureCount = epics.reduce((sum, epic) => sum + epic.features.length, 0);

    // Determine validity
    const valid = title !== '' && epics.length > 0;

    return {
      title,
      sections,
      epics,
      featureCount,
      valid
    };
  } catch (err) {
    return {
      title: '',
      sections: [],
      epics: [],
      featureCount: 0,
      valid: false,
      error: err.message
    };
  }
}

export default detectPRD;
