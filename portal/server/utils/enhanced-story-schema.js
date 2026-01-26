/**
 * Enhanced Story Schema Module
 *
 * Extends the base story-schema.js with:
 * - Given/When/Then (GWT) format for agent execution
 * - Domain categorization for routing
 * - User Story structure (As a/I want/So that)
 * - Technical notes for implementation guidance
 * - Detail scoring for executability assessment
 *
 * Based on: docs/enhanced-story-schema/SPECIFICATION.md
 * Date: 2026-01-26
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

/**
 * Valid story domains for categorization and agent routing
 */
export const VALID_DOMAINS = [
  'authentication',     // Login, logout, session management
  'authorization',      // Permissions, roles, access control
  'database',          // Schema, migrations, queries
  'api',               // REST/GraphQL endpoints
  'ui-components',     // Reusable UI components
  'forms',             // Form handling, validation
  'navigation',        // Routing, menus, breadcrumbs
  'state-management',  // Redux, Context, stores
  'integrations',      // Third-party service integration
  'payments',          // Payment processing
  'notifications',     // Email, push, in-app notifications
  'search',            // Search functionality
  'media',             // Images, videos, file uploads
  'analytics',         // Tracking, reporting
  'admin',             // Admin panel features
  'settings',          // User/app settings
  'infrastructure'     // DevOps, deployment, config
];

/**
 * Valid priority levels
 */
export const VALID_PRIORITIES = [
  'critical',  // Blocking other work, must be done first
  'high',      // Important, should be done soon
  'medium',    // Standard priority
  'low'        // Nice to have, can be deferred
];

/**
 * Valid risk levels for safety assessment
 */
export const VALID_RISK_LEVELS = [
  'critical',  // Could cause data loss, security breach, or system failure
  'high',      // Significant impact if something goes wrong
  'medium',    // Moderate impact, recoverable
  'low'        // Minimal impact
];

/**
 * Valid story statuses
 */
export const VALID_STATUSES = [
  'draft',        // Being written, not ready for implementation
  'ready',        // Approved and ready for agent execution
  'in-progress',  // Currently being implemented
  'completed',    // Implementation finished
  'blocked'       // Cannot proceed due to dependency or issue
];

/**
 * Valid agent types
 */
export const VALID_AGENTS = [
  'fe-dev',      // Frontend developer agent
  'be-dev',      // Backend developer agent
  'qa',          // QA/testing agent
  'devops',      // DevOps/infrastructure agent
  'fullstack',   // Full-stack developer agent
  'unassigned'   // Not yet assigned
];

/**
 * UI-related domains that require mockup references
 */
export const UI_DOMAINS = [
  'ui-components',
  'forms',
  'navigation'
];

/**
 * Detail score thresholds
 */
export const DETAIL_SCORE_THRESHOLDS = {
  excellent: 95,    // Green - Agent can execute immediately
  good: 85,         // Green - Minor clarifications possible
  acceptable: 70,   // Yellow - Needs some improvement
  minimum: 60,      // Orange - Below this is blocked
  failing: 0        // Red - Story incomplete
};

// ============================================
// SCHEMA DEFINITION
// ============================================

/**
 * Enhanced story schema with all field definitions
 */
export const ENHANCED_STORY_SCHEMA = {
  // Identification (Required)
  id: {
    type: 'string',
    required: true,
    pattern: /^[A-Z]+-\d+-[A-Z]+-\d+$/,
    minLength: 8,
    maxLength: 50,
    description: 'Unique story identifier: PROJECT-WAVE-DOMAIN-NUMBER'
  },

  title: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 100,
    description: 'Concise story title describing the feature'
  },

  epic: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 100,
    description: 'Parent epic name'
  },

  domain: {
    type: 'string',
    required: true,
    enum: VALID_DOMAINS,
    description: 'Functional domain for agent routing'
  },

  priority: {
    type: 'string',
    required: true,
    enum: VALID_PRIORITIES,
    description: 'Story priority level'
  },

  // User Story Format (Required)
  userStory: {
    type: 'object',
    required: true,
    properties: {
      asA: { type: 'string', required: true, minLength: 3 },
      iWant: { type: 'string', required: true, minLength: 10 },
      soThat: { type: 'string', required: true, minLength: 10 }
    }
  },

  // Given/When/Then (Required)
  gwt: {
    type: 'object',
    required: true,
    properties: {
      given: { type: 'string', required: true, minLength: 20 },
      when: { type: 'string', required: true, minLength: 20 },
      then: { type: 'string', required: true, minLength: 20 }
    }
  },

  // Acceptance Criteria (Required, min 3)
  acceptanceCriteria: {
    type: 'array',
    required: true,
    minItems: 3,
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true, pattern: /^AC-\d+$/ },
        description: { type: 'string', required: true, minLength: 10 },
        testable: { type: 'boolean', required: true }
      }
    }
  },

  // Mockup References (Required for UI domains)
  mockupRefs: {
    type: 'array',
    required: false,
    conditionalRequired: {
      field: 'domain',
      values: UI_DOMAINS
    },
    items: {
      type: 'object',
      properties: {
        file: { type: 'string', required: true },
        elements: { type: 'array', required: false, items: { type: 'string' } }
      }
    }
  },

  // Technical Notes (Required)
  technicalNotes: {
    type: 'object',
    required: true,
    properties: {
      suggestedApproach: { type: 'string', required: false },
      filesLikelyModified: { type: 'array', required: false, items: { type: 'string' } },
      apiEndpoints: { type: 'array', required: false, items: { type: 'string' } },
      databaseTables: { type: 'array', required: false, items: { type: 'string' } },
      externalServices: { type: 'array', required: false, items: { type: 'string' } }
    }
  },

  // Safety & Risk (Optional)
  safety: {
    type: 'object',
    required: false,
    properties: {
      riskLevel: { type: 'string', enum: VALID_RISK_LEVELS },
      requiresApproval: { type: 'boolean' },
      approver: { type: 'string' },
      safetyTags: { type: 'array', items: { type: 'string' } }
    }
  },

  // Dependencies (Required)
  dependencies: {
    type: 'array',
    required: true,
    items: { type: 'string' }
  },

  // Metadata
  status: {
    type: 'string',
    required: false,
    enum: VALID_STATUSES,
    default: 'draft'
  },

  assignedAgent: {
    type: 'string',
    required: false,
    enum: VALID_AGENTS
  },

  estimatedTokens: {
    type: 'number',
    required: false,
    min: 0
  },

  estimatedHours: {
    type: 'number',
    required: false,
    min: 0
  },

  wave: {
    type: 'number',
    required: false,
    min: 1
  },

  createdAt: {
    type: 'string',
    required: false,
    format: 'date-time'
  },

  updatedAt: {
    type: 'string',
    required: false,
    format: 'date-time'
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if a domain is UI-related (requires mockups)
 * @param {string} domain - Domain to check
 * @returns {boolean}
 */
export function isUIRelatedDomain(domain) {
  if (!domain) return false;
  return UI_DOMAINS.includes(domain);
}

/**
 * Get required fields for a specific domain
 * @param {string} domain - Domain name
 * @returns {string[]} Array of required field names
 */
export function getRequiredFieldsForDomain(domain) {
  const baseRequired = [
    'id',
    'title',
    'epic',
    'domain',
    'priority',
    'userStory',
    'gwt',
    'acceptanceCriteria',
    'technicalNotes',
    'dependencies'
  ];

  if (isUIRelatedDomain(domain)) {
    return [...baseRequired, 'mockupRefs'];
  }

  return baseRequired;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate GWT (Given/When/Then) structure
 * @param {object} gwt - GWT object to validate
 * @returns {object} Validation result
 */
export function validateGWT(gwt) {
  const errors = [];

  if (!gwt || typeof gwt !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'gwt', error: 'GWT must be an object', code: 'MISSING_GWT' }]
    };
  }

  // Check given
  if (!gwt.given) {
    errors.push({ field: 'given', error: 'Given is required', code: 'MISSING_GIVEN' });
  } else if (typeof gwt.given !== 'string' || gwt.given.length < 20) {
    errors.push({ field: 'given', error: 'Given must be at least 20 characters', code: 'GWT_TOO_SHORT' });
  }

  // Check when
  if (!gwt.when) {
    errors.push({ field: 'when', error: 'When is required', code: 'MISSING_WHEN' });
  } else if (typeof gwt.when !== 'string' || gwt.when.length < 20) {
    errors.push({ field: 'when', error: 'When must be at least 20 characters', code: 'GWT_TOO_SHORT' });
  }

  // Check then
  if (!gwt.then) {
    errors.push({ field: 'then', error: 'Then is required', code: 'MISSING_THEN' });
  } else if (typeof gwt.then !== 'string' || gwt.then.length < 20) {
    errors.push({ field: 'then', error: 'Then must be at least 20 characters', code: 'GWT_TOO_SHORT' });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate acceptance criteria array
 * @param {array} criteria - Acceptance criteria array
 * @returns {object} Validation result
 */
export function validateAcceptanceCriteria(criteria) {
  const errors = [];

  if (!criteria || !Array.isArray(criteria)) {
    return {
      valid: false,
      errors: [{ field: 'acceptanceCriteria', error: 'Acceptance criteria must be an array', code: 'INVALID_AC_TYPE' }]
    };
  }

  if (criteria.length < 3) {
    errors.push({
      field: 'acceptanceCriteria',
      error: 'At least 3 acceptance criteria are required',
      code: 'INSUFFICIENT_AC'
    });
  }

  const acIdPattern = /^AC-\d+$/;

  criteria.forEach((ac, index) => {
    if (!ac || typeof ac !== 'object') {
      errors.push({
        field: `acceptanceCriteria[${index}]`,
        error: 'Acceptance criterion must be an object',
        code: 'INVALID_AC_ITEM'
      });
      return;
    }

    if (!ac.id) {
      errors.push({
        field: `acceptanceCriteria[${index}].id`,
        error: 'Acceptance criterion id is required',
        code: 'MISSING_AC_ID'
      });
    } else if (!acIdPattern.test(ac.id)) {
      errors.push({
        field: `acceptanceCriteria[${index}].id`,
        error: 'Acceptance criterion id must match pattern AC-XXX',
        code: 'INVALID_AC_ID_FORMAT'
      });
    }

    if (!ac.description) {
      errors.push({
        field: `acceptanceCriteria[${index}].description`,
        error: 'Acceptance criterion description is required',
        code: 'MISSING_AC_DESCRIPTION'
      });
    } else if (typeof ac.description !== 'string' || ac.description.length < 10) {
      errors.push({
        field: `acceptanceCriteria[${index}].description`,
        error: 'Acceptance criterion description must be at least 10 characters',
        code: 'AC_DESCRIPTION_TOO_SHORT'
      });
    }

    if (ac.testable === undefined || ac.testable === null) {
      errors.push({
        field: `acceptanceCriteria[${index}].testable`,
        error: 'Acceptance criterion testable flag is required',
        code: 'MISSING_AC_TESTABLE'
      });
    } else if (typeof ac.testable !== 'boolean') {
      errors.push({
        field: `acceptanceCriteria[${index}].testable`,
        error: 'Acceptance criterion testable must be a boolean',
        code: 'INVALID_AC_TESTABLE'
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a single enhanced story field
 * @param {string} fieldName - Field name
 * @param {any} value - Field value
 * @param {object} schema - Field schema definition
 * @returns {object} Validation result
 */
export function validateEnhancedStoryField(fieldName, value, schema) {
  // Check required
  if (schema.required && (value === undefined || value === null)) {
    return { valid: false, error: `${fieldName} is required`, code: 'MISSING_REQUIRED' };
  }

  // Skip validation if optional and undefined
  if (!schema.required && (value === undefined || value === null)) {
    return { valid: true };
  }

  // Type checking
  if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      return { valid: false, error: `${fieldName} must be an array`, code: 'INVALID_TYPE' };
    }
  } else if (schema.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { valid: false, error: `${fieldName} must be an object`, code: 'INVALID_TYPE' };
    }
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') {
      return { valid: false, error: `${fieldName} must be a string`, code: 'INVALID_TYPE' };
    }
  } else if (schema.type === 'number') {
    if (typeof value !== 'number') {
      return { valid: false, error: `${fieldName} must be a number`, code: 'INVALID_TYPE' };
    }
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') {
      return { valid: false, error: `${fieldName} must be a boolean`, code: 'INVALID_TYPE' };
    }
  }

  // Enum check
  if (schema.enum && Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return { valid: false, error: `${fieldName} must be one of: ${schema.enum.join(', ')}`, code: 'INVALID_ENUM' };
  }

  // Pattern check
  if (schema.pattern && typeof value === 'string' && !schema.pattern.test(value)) {
    return { valid: false, error: `${fieldName} does not match required pattern`, code: 'INVALID_PATTERN' };
  }

  // MinLength check
  if (schema.minLength !== undefined && typeof value === 'string' && value.length < schema.minLength) {
    return { valid: false, error: `${fieldName} must be at least ${schema.minLength} characters`, code: 'MIN_LENGTH' };
  }

  // MaxLength check
  if (schema.maxLength !== undefined && typeof value === 'string' && value.length > schema.maxLength) {
    return { valid: false, error: `${fieldName} must be at most ${schema.maxLength} characters`, code: 'MAX_LENGTH' };
  }

  // MinItems check for arrays
  if (schema.minItems !== undefined && Array.isArray(value) && value.length < schema.minItems) {
    return { valid: false, error: `${fieldName} must have at least ${schema.minItems} items`, code: 'MIN_ITEMS' };
  }

  return { valid: true };
}

/**
 * Validate a complete enhanced story
 * @param {object} story - Story object to validate
 * @returns {object} Validation result with errors, warnings, and detail score
 */
export function validateEnhancedStory(story) {
  // Handle null/non-object
  if (!story || typeof story !== 'object' || Array.isArray(story)) {
    return {
      valid: false,
      storyId: 'unknown',
      errors: [{ field: 'story', error: 'Story must be an object', code: 'INVALID_STORY' }],
      warnings: [],
      detailScore: 0
    };
  }

  const errors = [];
  const warnings = [];
  const storyId = story.id || 'unknown';

  // Validate required fields
  const requiredFields = ['id', 'title', 'epic', 'domain', 'priority', 'userStory', 'gwt', 'acceptanceCriteria', 'technicalNotes', 'dependencies'];

  for (const fieldName of requiredFields) {
    const schema = ENHANCED_STORY_SCHEMA[fieldName];
    const value = story[fieldName];

    // Skip nested object validation here (handled separately)
    if (['userStory', 'gwt', 'acceptanceCriteria'].includes(fieldName)) {
      continue;
    }

    const result = validateEnhancedStoryField(fieldName, value, schema);
    if (!result.valid) {
      errors.push({
        field: fieldName,
        error: result.error,
        code: result.code
      });
    }
  }

  // Validate id format
  if (story.id && typeof story.id === 'string') {
    const idPattern = /^[A-Z]+-\d+-[A-Z]+-\d+$/;
    if (!idPattern.test(story.id)) {
      errors.push({
        field: 'id',
        error: 'ID must match pattern PROJECT-WAVE-DOMAIN-NUMBER (e.g., WAVE-001-AUTH-001)',
        code: 'INVALID_ID_FORMAT'
      });
    }
  }

  // Validate title length
  if (story.title && typeof story.title === 'string' && story.title.length < 10) {
    errors.push({
      field: 'title',
      error: 'Title must be at least 10 characters',
      code: 'TITLE_TOO_SHORT'
    });
  }

  // Validate domain enum
  if (story.domain && !VALID_DOMAINS.includes(story.domain)) {
    errors.push({
      field: 'domain',
      error: `Domain must be one of: ${VALID_DOMAINS.join(', ')}`,
      code: 'INVALID_DOMAIN'
    });
  }

  // Validate priority enum
  if (story.priority && !VALID_PRIORITIES.includes(story.priority)) {
    errors.push({
      field: 'priority',
      error: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
      code: 'INVALID_PRIORITY'
    });
  }

  // Validate userStory
  if (!story.userStory || typeof story.userStory !== 'object') {
    errors.push({
      field: 'userStory',
      error: 'User story is required',
      code: 'MISSING_USER_STORY'
    });
  } else {
    const { asA, iWant, soThat } = story.userStory;
    if (!asA || !iWant || !soThat) {
      errors.push({
        field: 'userStory',
        error: 'User story must have asA, iWant, and soThat fields',
        code: 'INCOMPLETE_USER_STORY'
      });
    }
  }

  // Validate GWT
  if (!story.gwt || typeof story.gwt !== 'object') {
    errors.push({
      field: 'gwt',
      error: 'GWT (Given/When/Then) is required',
      code: 'MISSING_GWT'
    });
  } else {
    const gwtResult = validateGWT(story.gwt);
    if (!gwtResult.valid) {
      gwtResult.errors.forEach(err => {
        errors.push({
          field: `gwt.${err.field}`,
          error: err.error,
          code: err.code
        });
      });
    }
  }

  // Validate acceptanceCriteria
  if (!story.acceptanceCriteria) {
    errors.push({
      field: 'acceptanceCriteria',
      error: 'Acceptance criteria are required',
      code: 'MISSING_AC'
    });
  } else {
    const acResult = validateAcceptanceCriteria(story.acceptanceCriteria);
    if (!acResult.valid) {
      acResult.errors.forEach(err => {
        errors.push({
          field: err.field,
          error: err.error,
          code: err.code
        });
      });
    }
  }

  // Validate technicalNotes
  if (!story.technicalNotes || typeof story.technicalNotes !== 'object') {
    errors.push({
      field: 'technicalNotes',
      error: 'Technical notes object is required (can be empty)',
      code: 'MISSING_TECH_NOTES'
    });
  }

  // Validate dependencies
  if (!story.dependencies || !Array.isArray(story.dependencies)) {
    errors.push({
      field: 'dependencies',
      error: 'Dependencies array is required (can be empty)',
      code: 'MISSING_DEPENDENCIES'
    });
  }

  // Validate mockupRefs for UI domains
  if (isUIRelatedDomain(story.domain) && (!story.mockupRefs || !Array.isArray(story.mockupRefs) || story.mockupRefs.length === 0)) {
    errors.push({
      field: 'mockupRefs',
      error: 'Mockup references are required for UI-related domains',
      code: 'MISSING_MOCKUP_REFS'
    });
  }

  // Validate status if present
  if (story.status && !VALID_STATUSES.includes(story.status)) {
    errors.push({
      field: 'status',
      error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      code: 'INVALID_STATUS'
    });
  }

  // Validate assignedAgent if present
  if (story.assignedAgent && !VALID_AGENTS.includes(story.assignedAgent)) {
    errors.push({
      field: 'assignedAgent',
      error: `Assigned agent must be one of: ${VALID_AGENTS.join(', ')}`,
      code: 'INVALID_AGENT'
    });
  }

  // Calculate detail score
  const detailScore = scoreStoryDetail(story);

  return {
    valid: errors.length === 0,
    storyId,
    errors,
    warnings,
    detailScore
  };
}

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Calculate detail score for a story (0-100)
 * @param {object} story - Story to score
 * @returns {number} Score 0-100
 */
export function scoreStoryDetail(story) {
  if (!story || typeof story !== 'object') {
    return 0;
  }

  let score = 0;

  // Identification (20 points)
  // id: 5 points
  if (story.id && typeof story.id === 'string' && /^[A-Z]+-\d+-[A-Z]+-\d+$/.test(story.id)) {
    score += 5;
  }
  // title: 5 points
  if (story.title && typeof story.title === 'string' && story.title.length >= 10) {
    score += 5;
  }
  // epic: 5 points
  if (story.epic && typeof story.epic === 'string' && story.epic.length >= 3) {
    score += 5;
  }
  // domain: 5 points
  if (story.domain && VALID_DOMAINS.includes(story.domain)) {
    score += 5;
  }

  // User Story (10 points)
  if (story.userStory && typeof story.userStory === 'object') {
    const { asA, iWant, soThat } = story.userStory;
    if (asA && typeof asA === 'string' && asA.length >= 3) score += 3;
    if (iWant && typeof iWant === 'string' && iWant.length >= 10) score += 4;
    if (soThat && typeof soThat === 'string' && soThat.length >= 10) score += 3;
  }

  // GWT (20 points)
  if (story.gwt && typeof story.gwt === 'object') {
    const { given, when, then: thenVal } = story.gwt;
    if (given && typeof given === 'string' && given.length >= 20) score += 7;
    if (when && typeof when === 'string' && when.length >= 20) score += 6;
    if (thenVal && typeof thenVal === 'string' && thenVal.length >= 20) score += 7;
  }

  // Acceptance Criteria (25 points)
  if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
    const acCount = story.acceptanceCriteria.length;
    // 3+ criteria: 15 points
    if (acCount >= 3) {
      score += 15;
    } else if (acCount > 0) {
      score += acCount * 5;
    }
    // All testable: up to 10 points
    const testableCount = story.acceptanceCriteria.filter(ac => ac && ac.testable === true).length;
    score += Math.min(10, testableCount * 2);
  }

  // Technical Notes (15 points)
  if (story.technicalNotes && typeof story.technicalNotes === 'object') {
    if (story.technicalNotes.suggestedApproach) score += 5;
    if (story.technicalNotes.filesLikelyModified && story.technicalNotes.filesLikelyModified.length > 0) score += 5;
    if ((story.technicalNotes.apiEndpoints && story.technicalNotes.apiEndpoints.length > 0) ||
        (story.technicalNotes.databaseTables && story.technicalNotes.databaseTables.length > 0)) {
      score += 5;
    }
  }

  // Mockup Refs (5 points)
  // Only score if domain is set
  if (story.domain && VALID_DOMAINS.includes(story.domain)) {
    const isUI = isUIRelatedDomain(story.domain);
    if (isUI) {
      if (story.mockupRefs && Array.isArray(story.mockupRefs) && story.mockupRefs.length > 0) {
        score += 5;
      }
    } else {
      // Non-UI domains get full points
      score += 5;
    }
  }

  // Metadata (5 points)
  if (Array.isArray(story.dependencies)) score += 2;
  if (story.status && VALID_STATUSES.includes(story.status)) score += 1;
  if (story.estimatedHours || story.estimatedTokens) score += 2;

  return Math.min(100, Math.round(score));
}

/**
 * Get detailed breakdown of story score
 * @param {object} story - Story to analyze
 * @returns {object} Score breakdown by category
 */
export function getDetailScoreBreakdown(story) {
  const breakdown = {
    total: 0,
    identification: { score: 0, max: 20, details: [] },
    userStory: { score: 0, max: 10, details: [] },
    gwt: { score: 0, max: 20, details: [] },
    acceptanceCriteria: { score: 0, max: 25, details: [] },
    technicalNotes: { score: 0, max: 15, details: [] },
    mockupRefs: { score: 0, max: 5, details: [] },
    metadata: { score: 0, max: 5, details: [] }
  };

  if (!story || typeof story !== 'object') {
    return breakdown;
  }

  // Identification (20 points)
  if (story.id && typeof story.id === 'string' && /^[A-Z]+-\d+-[A-Z]+-\d+$/.test(story.id)) {
    breakdown.identification.score += 5;
    breakdown.identification.details.push('Valid ID format (+5)');
  }
  if (story.title && typeof story.title === 'string' && story.title.length >= 10) {
    breakdown.identification.score += 5;
    breakdown.identification.details.push('Valid title (+5)');
  }
  if (story.epic && typeof story.epic === 'string' && story.epic.length >= 3) {
    breakdown.identification.score += 5;
    breakdown.identification.details.push('Epic defined (+5)');
  }
  if (story.domain && VALID_DOMAINS.includes(story.domain)) {
    breakdown.identification.score += 5;
    breakdown.identification.details.push('Valid domain (+5)');
  }

  // User Story (10 points)
  if (story.userStory && typeof story.userStory === 'object') {
    const { asA, iWant, soThat } = story.userStory;
    if (asA && typeof asA === 'string' && asA.length >= 3) {
      breakdown.userStory.score += 3;
      breakdown.userStory.details.push('As a... (+3)');
    }
    if (iWant && typeof iWant === 'string' && iWant.length >= 10) {
      breakdown.userStory.score += 4;
      breakdown.userStory.details.push('I want... (+4)');
    }
    if (soThat && typeof soThat === 'string' && soThat.length >= 10) {
      breakdown.userStory.score += 3;
      breakdown.userStory.details.push('So that... (+3)');
    }
  }

  // GWT (20 points)
  if (story.gwt && typeof story.gwt === 'object') {
    const { given, when, then: thenVal } = story.gwt;
    if (given && typeof given === 'string' && given.length >= 20) {
      breakdown.gwt.score += 7;
      breakdown.gwt.details.push('Given valid (+7)');
    }
    if (when && typeof when === 'string' && when.length >= 20) {
      breakdown.gwt.score += 6;
      breakdown.gwt.details.push('When valid (+6)');
    }
    if (thenVal && typeof thenVal === 'string' && thenVal.length >= 20) {
      breakdown.gwt.score += 7;
      breakdown.gwt.details.push('Then valid (+7)');
    }
  }

  // Acceptance Criteria (25 points)
  if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
    const acCount = story.acceptanceCriteria.length;
    if (acCount >= 3) {
      breakdown.acceptanceCriteria.score += 15;
      breakdown.acceptanceCriteria.details.push(`${acCount} criteria (+15)`);
    } else if (acCount > 0) {
      breakdown.acceptanceCriteria.score += acCount * 5;
      breakdown.acceptanceCriteria.details.push(`${acCount} criteria (+${acCount * 5})`);
    }
    const testableCount = story.acceptanceCriteria.filter(ac => ac && ac.testable === true).length;
    const testablePoints = Math.min(10, testableCount * 2);
    breakdown.acceptanceCriteria.score += testablePoints;
    if (testablePoints > 0) {
      breakdown.acceptanceCriteria.details.push(`${testableCount} testable (+${testablePoints})`);
    }
  }

  // Technical Notes (15 points)
  if (story.technicalNotes && typeof story.technicalNotes === 'object') {
    if (story.technicalNotes.suggestedApproach) {
      breakdown.technicalNotes.score += 5;
      breakdown.technicalNotes.details.push('Approach (+5)');
    }
    if (story.technicalNotes.filesLikelyModified && story.technicalNotes.filesLikelyModified.length > 0) {
      breakdown.technicalNotes.score += 5;
      breakdown.technicalNotes.details.push('Files (+5)');
    }
    if ((story.technicalNotes.apiEndpoints && story.technicalNotes.apiEndpoints.length > 0) ||
        (story.technicalNotes.databaseTables && story.technicalNotes.databaseTables.length > 0)) {
      breakdown.technicalNotes.score += 5;
      breakdown.technicalNotes.details.push('APIs/DB (+5)');
    }
  }

  // Mockup Refs (5 points)
  // Only score if domain is set
  if (story.domain && VALID_DOMAINS.includes(story.domain)) {
    const isUI = isUIRelatedDomain(story.domain);
    if (isUI) {
      if (story.mockupRefs && Array.isArray(story.mockupRefs) && story.mockupRefs.length > 0) {
        breakdown.mockupRefs.score += 5;
        breakdown.mockupRefs.details.push('Mockups linked (+5)');
      }
    } else {
      breakdown.mockupRefs.score += 5;
      breakdown.mockupRefs.details.push('Non-UI domain (+5)');
    }
  }

  // Metadata (5 points)
  if (Array.isArray(story.dependencies)) {
    breakdown.metadata.score += 2;
    breakdown.metadata.details.push('Dependencies (+2)');
  }
  if (story.status && VALID_STATUSES.includes(story.status)) {
    breakdown.metadata.score += 1;
    breakdown.metadata.details.push('Status (+1)');
  }
  if (story.estimatedHours || story.estimatedTokens) {
    breakdown.metadata.score += 2;
    breakdown.metadata.details.push('Estimates (+2)');
  }

  // Calculate total
  breakdown.total =
    breakdown.identification.score +
    breakdown.userStory.score +
    breakdown.gwt.score +
    breakdown.acceptanceCriteria.score +
    breakdown.technicalNotes.score +
    breakdown.mockupRefs.score +
    breakdown.metadata.score;

  return breakdown;
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default validateEnhancedStory;
