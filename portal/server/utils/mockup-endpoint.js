/**
 * Mockup Validation Endpoint Module (Launch Sequence)
 *
 * Phase 2, Step 2.4: Mockup Validation Endpoint
 *
 * Handles the POST /api/validate-mockups endpoint that validates
 * mockup files and persists results to the database.
 */

import { detectMockups } from './mockup-detection.js';
import { analyzeMockup } from './mockup-analysis.js';
import { createMockupCheck } from './mockup-types.js';

// ============================================
// Request Validation
// ============================================

/**
 * @typedef {Object} MockupValidationRequest
 * @property {string} projectPath - Path to the project root
 * @property {string} projectId - Project ID for database storage
 * @property {boolean} isValid - Whether the request is valid
 * @property {string[]} errors - Validation errors
 */

/**
 * Create and validate a mockup validation request
 * @param {string} projectPath - Path to the project root
 * @param {string} projectId - Project ID for database storage
 * @returns {MockupValidationRequest}
 */
export function createMockupValidationRequest(projectPath, projectId) {
  const errors = [];

  if (!projectPath || typeof projectPath !== 'string' || projectPath.trim() === '') {
    errors.push('Project path is required');
  }

  if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
    errors.push('Project ID is required');
  }

  return {
    projectPath: projectPath || '',
    projectId: projectId || '',
    isValid: errors.length === 0,
    errors
  };
}

// ============================================
// Main Validation Function
// ============================================

/**
 * @typedef {Object} ValidationResponse
 * @property {number} status - HTTP status code
 * @property {Object} [data] - Response data if successful
 * @property {string} [error] - Error message if failed
 */

/**
 * Validate mockups for a project
 * @param {string} projectPath - Path to the project root
 * @param {string} projectId - Project ID for database storage
 * @returns {Promise<ValidationResponse>}
 */
export async function validateMockups(projectPath, projectId) {
  // Validate request
  const request = createMockupValidationRequest(projectPath, projectId);
  if (!request.isValid) {
    return {
      status: 400,
      error: request.errors.join(', ')
    };
  }

  try {
    // Detect mockups
    const detection = await detectMockups(projectPath);

    const checks = [];
    const screens = [];

    // Check 1: Folder existence
    const folderCheck = createMockupCheck(
      'Mockup Folder',
      detection.folderExists ? 'pass' : 'fail',
      detection.folderExists
        ? 'design_mockups folder found'
        : 'design_mockups folder not found'
    );
    checks.push(folderCheck);

    // Check 2: HTML files presence
    const filesCheck = createMockupCheck(
      'HTML Files',
      detection.found ? 'pass' : 'fail',
      detection.found
        ? `Found ${detection.files.length} HTML mockup(s)`
        : 'No HTML mockups found'
    );
    checks.push(filesCheck);

    // Analyze each mockup file
    if (detection.found && detection.files.length > 0) {
      for (const file of detection.files) {
        const analysis = await analyzeMockup(file.path);

        // Add to screens list
        screens.push({
          path: file.path,
          name: file.name,
          title: analysis.title,
          summary: analysis.summary
        });

        // Add analysis check
        const analysisCheck = createMockupCheck(
          file.name,
          analysis.valid ? 'pass' : 'warn',
          analysis.valid ? analysis.summary : analysis.error || 'Analysis failed',
          {
            forms: analysis.forms.length,
            navLinks: analysis.navigation.links.length,
            buttons: analysis.interactiveElements.buttons.length
          }
        );
        checks.push(analysisCheck);
      }
    }

    // Determine overall status
    const hasFailure = checks.some(c => c.status === 'fail');
    const status = hasFailure ? 'blocked' : 'ready';

    // Build validation result
    const validationData = {
      status,
      checks,
      screens,
      timestamp: new Date().toISOString()
    };

    return {
      status: 200,
      data: validationData
    };

  } catch (err) {
    return {
      status: 500,
      error: err.message
    };
  }
}

export default validateMockups;
