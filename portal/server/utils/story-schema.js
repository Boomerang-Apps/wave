/**
 * Story Schema Validator Module (Launch Sequence)
 *
 * Phase 3, Step 3.2: Story Schema Validator
 *
 * Defines and validates AI story files against a schema.
 */

import { access, readdir, readFile } from 'fs/promises';
import path from 'path';

// ============================================
// Constants
// ============================================

/**
 * Valid story statuses
 */
export const VALID_STORY_STATUSES = [
  'draft',
  'ready',
  'in-progress',
  'completed',
  'blocked'
];

/**
 * Valid story priorities
 */
export const VALID_STORY_PRIORITIES = [
  'high',
  'medium',
  'low'
];

/**
 * Valid agent types
 */
export const VALID_AGENT_TYPES = [
  'fe-dev',
  'be-dev',
  'qa',
  'devops',
  'fullstack'
];

/**
 * Story schema definition
 */
export const STORY_SCHEMA = {
  id: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 50
  },
  title: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 200
  },
  description: {
    type: 'string',
    required: true,
    minLength: 1
  },
  status: {
    type: 'string',
    required: false,
    enum: VALID_STORY_STATUSES
  },
  priority: {
    type: 'string',
    required: false,
    enum: VALID_STORY_PRIORITIES
  },
  assignedAgent: {
    type: 'string',
    required: false,
    enum: VALID_AGENT_TYPES
  },
  acceptanceCriteria: {
    type: 'array',
    required: false,
    items: { type: 'string' }
  },
  dependencies: {
    type: 'array',
    required: false,
    items: { type: 'string' }
  },
  epicId: {
    type: 'string',
    required: false
  },
  estimatedHours: {
    type: 'number',
    required: false
  },
  mockupRef: {
    type: 'string',
    required: false
  }
};

/**
 * Required story fields
 */
export const REQUIRED_STORY_FIELDS = Object.entries(STORY_SCHEMA)
  .filter(([_, def]) => def.required)
  .map(([field]) => field);

// ============================================
// Story search locations
// ============================================

const STORY_SEARCH_LOCATIONS = [
  'stories',
  '.claudecode/stories',
  'docs/stories'
];

// ============================================
// Validation Functions
// ============================================

/**
 * @typedef {Object} FieldValidationResult
 * @property {boolean} valid - Whether the field is valid
 * @property {string} [error] - Error message if invalid
 */

/**
 * Validate a single story field
 * @param {string} fieldName - Name of the field
 * @param {*} value - Value to validate
 * @param {Object} schema - Schema definition for the field
 * @returns {FieldValidationResult}
 */
export function validateStoryField(fieldName, value, schema) {
  // Check required
  if (schema.required && (value === undefined || value === null)) {
    return { valid: false, error: `${fieldName} is required` };
  }

  // Skip validation if optional and undefined
  if (!schema.required && (value === undefined || value === null)) {
    return { valid: true };
  }

  // Check type
  if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      return { valid: false, error: `${fieldName} must be an array` };
    }
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') {
      return { valid: false, error: `${fieldName} must be of type ${schema.type}` };
    }
  } else if (schema.type === 'number') {
    if (typeof value !== 'number') {
      return { valid: false, error: `${fieldName} must be of type ${schema.type}` };
    }
  }

  // Check enum
  if (schema.enum && !schema.enum.includes(value)) {
    return { valid: false, error: `${fieldName} must be one of: ${schema.enum.join(', ')}` };
  }

  // Check minLength
  if (schema.minLength !== undefined && typeof value === 'string') {
    if (value.length < schema.minLength) {
      return { valid: false, error: `${fieldName} must be at least ${schema.minLength} characters` };
    }
  }

  // Check maxLength
  if (schema.maxLength !== undefined && typeof value === 'string') {
    if (value.length > schema.maxLength) {
      return { valid: false, error: `${fieldName} must be at most ${schema.maxLength} characters` };
    }
  }

  return { valid: true };
}

/**
 * @typedef {Object} StoryValidationError
 * @property {string} field - Field name
 * @property {string} error - Error message
 */

/**
 * @typedef {Object} StoryValidationResult
 * @property {boolean} valid - Whether the story is valid
 * @property {string} [storyId] - Story ID if available
 * @property {StoryValidationError[]} errors - Validation errors
 * @property {string} [error] - General error message
 */

/**
 * Validate a story object against the schema
 * @param {Object} story - Story object to validate
 * @returns {StoryValidationResult}
 */
export function validateStory(story) {
  // Check if story is an object
  if (!story || typeof story !== 'object' || Array.isArray(story)) {
    return {
      valid: false,
      errors: [],
      error: 'Story must be an object'
    };
  }

  const errors = [];
  const storyId = story.id || 'unknown';

  // Validate each field in schema
  for (const [fieldName, fieldSchema] of Object.entries(STORY_SCHEMA)) {
    const result = validateStoryField(fieldName, story[fieldName], fieldSchema);
    if (!result.valid) {
      errors.push({
        field: fieldName,
        error: result.error
      });
    }
  }

  return {
    valid: errors.length === 0,
    storyId,
    errors
  };
}

// ============================================
// Detection Functions
// ============================================

/**
 * @typedef {Object} StoryFile
 * @property {string} name - Filename
 * @property {string} path - Full path
 */

/**
 * @typedef {Object} StoryDetectionResult
 * @property {boolean} found - Whether stories were found
 * @property {StoryFile[]} files - Array of found story files
 * @property {string} [error] - Error message if detection failed
 */

/**
 * Detect story files in a project
 * @param {string} projectRoot - Path to project root
 * @returns {Promise<StoryDetectionResult>}
 */
export async function detectStories(projectRoot) {
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
  for (const location of STORY_SEARCH_LOCATIONS) {
    const searchPath = path.join(projectRoot, location);

    try {
      await access(searchPath);

      const entries = await readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          foundFiles.push({
            name: entry.name,
            path: path.join(searchPath, entry.name)
          });
        }
      }
    } catch {
      // Directory doesn't exist, continue
    }
  }

  return {
    found: foundFiles.length > 0,
    files: foundFiles
  };
}

// ============================================
// Batch Validation
// ============================================

/**
 * @typedef {Object} StoryValidationDetail
 * @property {string} filename - Story filename
 * @property {boolean} valid - Whether story is valid
 * @property {string} [storyId] - Story ID
 * @property {StoryValidationError[]} [errors] - Validation errors
 * @property {string} [error] - Parse/read error
 */

/**
 * @typedef {Object} AllStoriesValidationResult
 * @property {boolean} valid - Whether all stories are valid
 * @property {number} totalCount - Total number of stories
 * @property {number} validCount - Number of valid stories
 * @property {number} invalidCount - Number of invalid stories
 * @property {StoryValidationDetail[]} stories - Validation details for each story
 */

/**
 * Validate all story files in a project
 * @param {string} projectRoot - Path to project root
 * @returns {Promise<AllStoriesValidationResult>}
 */
export async function validateAllStories(projectRoot) {
  const detection = await detectStories(projectRoot);

  if (!detection.found) {
    return {
      valid: true,
      totalCount: 0,
      validCount: 0,
      invalidCount: 0,
      stories: []
    };
  }

  const stories = [];
  let validCount = 0;
  let invalidCount = 0;

  for (const file of detection.files) {
    try {
      const content = await readFile(file.path, 'utf-8');
      let storyData;

      try {
        storyData = JSON.parse(content);
      } catch (parseErr) {
        stories.push({
          filename: file.name,
          valid: false,
          error: `JSON parse error: ${parseErr.message}`
        });
        invalidCount++;
        continue;
      }

      const validation = validateStory(storyData);
      stories.push({
        filename: file.name,
        valid: validation.valid,
        storyId: validation.storyId,
        errors: validation.errors
      });

      if (validation.valid) {
        validCount++;
      } else {
        invalidCount++;
      }
    } catch (readErr) {
      stories.push({
        filename: file.name,
        valid: false,
        error: `Read error: ${readErr.message}`
      });
      invalidCount++;
    }
  }

  return {
    valid: invalidCount === 0,
    totalCount: detection.files.length,
    validCount,
    invalidCount,
    stories
  };
}

export default validateStory;
