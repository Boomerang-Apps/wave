/**
 * Stories Validation Endpoint Module (Launch Sequence)
 *
 * Phase 3, Step 3.5: Stories Validation Endpoint
 *
 * Handles the POST /api/validate-stories endpoint that validates
 * story files against schema and checks mockup alignment.
 */

import { validateAllStories } from './story-schema.js';
import { detectMockups } from './mockup-detection.js';
import { checkMockupStoryAlignment } from './mockup-alignment.js';
import { saveValidation } from './validation-persistence.js';
import { createMockupCheck } from './mockup-types.js';

// ============================================
// Request Validation
// ============================================

/**
 * @typedef {Object} StoriesValidationRequest
 * @property {string} projectPath - Path to the project root
 * @property {string} projectId - Project ID for database storage
 * @property {boolean} isValid - Whether the request is valid
 * @property {string[]} errors - Validation errors
 */

/**
 * Create and validate a stories validation request
 * @param {string} projectPath - Path to the project root
 * @param {string} projectId - Project ID for database storage
 * @returns {StoriesValidationRequest}
 */
export function createStoriesValidationRequest(projectPath, projectId) {
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
 * Validate stories for a project
 * @param {string} projectPath - Path to the project root
 * @param {string} projectId - Project ID for database storage
 * @returns {Promise<ValidationResponse>}
 */
export async function validateStories(projectPath, projectId) {
  // Validate request
  const request = createStoriesValidationRequest(projectPath, projectId);
  if (!request.isValid) {
    return {
      status: 400,
      error: request.errors.join(', ')
    };
  }

  try {
    // Validate all stories
    const storyValidation = await validateAllStories(projectPath);

    const checks = [];

    // Check 1: Story files exist
    const storiesCheck = createMockupCheck(
      'Story Files',
      storyValidation.totalCount > 0 ? 'pass' : 'fail',
      storyValidation.totalCount > 0
        ? `Found ${storyValidation.totalCount} story file(s)`
        : 'No story files found'
    );
    checks.push(storiesCheck);

    // Check 2: Schema validation
    if (storyValidation.totalCount > 0) {
      const schemaCheck = createMockupCheck(
        'Schema Validation',
        storyValidation.valid ? 'pass' : 'fail',
        storyValidation.valid
          ? `All ${storyValidation.validCount} stories valid`
          : `${storyValidation.invalidCount} of ${storyValidation.totalCount} stories have errors`
      );
      checks.push(schemaCheck);
    }

    // Detect mockups for alignment check
    const mockupDetection = await detectMockups(projectPath);

    // Build story data for alignment (extract mockupRef from validated stories)
    const storyData = storyValidation.stories
      .filter(s => s.valid && s.storyId)
      .map(s => ({
        id: s.storyId,
        mockupRef: s.mockupRef || undefined,
        title: s.title || undefined
      }));

    // Check 3: Mockup alignment
    let alignment = null;
    if (mockupDetection.found) {
      alignment = checkMockupStoryAlignment(mockupDetection.files, storyData);

      // Alignment failures are warnings unless coverage is very low (< 50%)
      const alignmentStatus = alignment.aligned
        ? 'pass'
        : alignment.coveragePercent < 50
          ? 'fail'
          : 'warn';

      const alignmentCheck = createMockupCheck(
        'Mockup Alignment',
        alignmentStatus,
        alignment.aligned
          ? `${alignment.coveragePercent}% coverage`
          : `${alignment.unmappedMockups.length} mockup(s) need stories`
      );
      checks.push(alignmentCheck);
    }

    // Determine overall status
    const hasFailure = checks.some(c => c.status === 'fail');
    const status = hasFailure ? 'blocked' : 'ready';

    // Collect invalid stories for response
    const invalidStories = storyValidation.stories
      .filter(s => !s.valid)
      .map(s => ({
        filename: s.filename,
        errors: s.errors || [],
        error: s.error
      }));

    // Build validation result
    const validationData = {
      status,
      checks,
      storyCount: storyValidation.totalCount,
      validCount: storyValidation.validCount,
      invalidCount: storyValidation.invalidCount,
      alignment: alignment ? {
        aligned: alignment.aligned,
        coveragePercent: alignment.coveragePercent,
        unmappedMockups: alignment.unmappedMockups,
        orphanedStories: alignment.orphanedStories
      } : null,
      invalidStories: invalidStories.length > 0 ? invalidStories : undefined,
      timestamp: new Date().toISOString()
    };

    // Persist to database
    let persistError = null;
    try {
      await saveValidation(projectId, '_stories', validationData);
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

export default validateStories;
