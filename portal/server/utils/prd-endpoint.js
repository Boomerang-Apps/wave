/**
 * PRD Validation Endpoint Module (Launch Sequence)
 *
 * Phase 3, Step 3.4: PRD Validation Endpoint
 *
 * Handles the POST /api/validate-prd endpoint that validates
 * PRD files and persists results to the database.
 */

import { detectPRD, parsePRDStructure } from './prd-detection.js';
import { saveValidation } from './validation-persistence.js';
import { createMockupCheck } from './mockup-types.js';

// ============================================
// Request Validation
// ============================================

/**
 * @typedef {Object} PRDValidationRequest
 * @property {string} projectPath - Path to the project root
 * @property {string} projectId - Project ID for database storage
 * @property {boolean} isValid - Whether the request is valid
 * @property {string[]} errors - Validation errors
 */

/**
 * Create and validate a PRD validation request
 * @param {string} projectPath - Path to the project root
 * @param {string} projectId - Project ID for database storage
 * @returns {PRDValidationRequest}
 */
export function createPRDValidationRequest(projectPath, projectId) {
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
 * Validate PRD for a project
 * @param {string} projectPath - Path to the project root
 * @param {string} projectId - Project ID for database storage
 * @returns {Promise<ValidationResponse>}
 */
export async function validatePRD(projectPath, projectId) {
  // Validate request
  const request = createPRDValidationRequest(projectPath, projectId);
  if (!request.isValid) {
    return {
      status: 400,
      error: request.errors.join(', ')
    };
  }

  try {
    // Detect PRD files
    const detection = await detectPRD(projectPath);

    const checks = [];
    let prdFile = null;
    let structure = null;

    // Check 1: PRD Document exists
    const prdCheck = createMockupCheck(
      'PRD Document',
      detection.found ? 'pass' : 'fail',
      detection.found
        ? `Found: ${detection.files[0].name}`
        : 'No PRD document found'
    );
    checks.push(prdCheck);

    // If PRD found, parse its structure
    if (detection.found && detection.files.length > 0) {
      prdFile = detection.files[0];

      try {
        const parsed = await parsePRDStructure(prdFile.path);

        // Check 2: PRD has title
        const titleCheck = createMockupCheck(
          'PRD Title',
          parsed.title ? 'pass' : 'fail',
          parsed.title || 'No title found'
        );
        checks.push(titleCheck);

        // Check 3: Epics defined
        const epicsCheck = createMockupCheck(
          'Epics Defined',
          parsed.epics.length > 0 ? 'pass' : 'fail',
          parsed.epics.length > 0
            ? `${parsed.epics.length} epic(s) defined`
            : 'No epics found'
        );
        checks.push(epicsCheck);

        // Check 4: Features defined
        if (parsed.epics.length > 0) {
          const featuresCheck = createMockupCheck(
            'Features Defined',
            parsed.featureCount > 0 ? 'pass' : 'warn',
            parsed.featureCount > 0
              ? `${parsed.featureCount} feature(s) defined`
              : 'No features found in epics'
          );
          checks.push(featuresCheck);
        }

        structure = {
          title: parsed.title,
          epicCount: parsed.epics.length,
          featureCount: parsed.featureCount,
          sections: parsed.sections
        };

      } catch (parseErr) {
        const parseCheck = createMockupCheck(
          'PRD Structure',
          'fail',
          `Parse error: ${parseErr.message}`
        );
        checks.push(parseCheck);
      }
    }

    // Determine overall status
    const hasFailure = checks.some(c => c.status === 'fail');
    const status = hasFailure ? 'blocked' : 'ready';

    // Build validation result
    const validationData = {
      status,
      checks,
      prdFile,
      structure,
      timestamp: new Date().toISOString()
    };

    // Persist to database
    let persistError = null;
    try {
      await saveValidation(projectId, '_prd', validationData);
    } catch (err) {
      persistError = err.message;
    }

    return {
      status: 200,
      data: {
        ...validationData,
        ...(persistError && { persistError })
      }
    };

  } catch (err) {
    return {
      status: 500,
      error: err.message
    };
  }
}

export default validatePRD;
