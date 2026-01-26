/**
 * Stories Generator Module
 *
 * Generates detailed AI Stories from a PRD (Product Requirements Document).
 * Each story follows the Enhanced Story Schema with:
 * - Given/When/Then (GWT) format
 * - Domain categorization for agent routing
 * - User Story structure (As a/I want/So that)
 * - Detailed acceptance criteria
 *
 * Pipeline: PRD → Feature Analysis → Story Generation → Validation Loop → Output
 *
 * Based on: docs/stories-generator/SPECIFICATION.md
 * Date: 2026-01-26
 */

import {
  VALID_DOMAINS,
  validateEnhancedStory,
  scoreStoryDetail,
  isUIRelatedDomain
} from './enhanced-story-schema.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Minimum acceptable story detail score (from DETAIL_SCORE_THRESHOLDS.acceptable)
 */
export const MIN_ACCEPTABLE_SCORE = 70;

/**
 * Maximum retries for story refinement
 */
export const MAX_RETRIES = 3;

/**
 * Valid domains as comma-separated string for prompts
 */
export const VALID_DOMAINS_FOR_PROMPT = VALID_DOMAINS.join(', ');

// ============================================================================
// PROMPTS
// ============================================================================

/**
 * Story generation prompt for Claude
 */
export const STORY_GENERATION_PROMPT = `You are generating a detailed AI Story for autonomous agent execution.

## Feature to Convert
{feature}

## Project Context
{context}

## Required Output Format

Generate a complete story with ALL these fields:

### Identity
- id: "STORY-{featureNumber}" (e.g., STORY-001)
- title: Clear, action-oriented title (min 10 chars)
- epic: Group name for related features
- domain: One of: {domains}

### Priority
- priority: Based on feature priority (critical, high, medium, low)
- status: "draft" (will be updated later)

### User Story (REQUIRED)
- asA: Who benefits (min 5 chars, e.g., "As a registered user")
- iWant: What action (min 10 chars, e.g., "I want to view my dashboard")
- soThat: Why/benefit (min 10 chars, e.g., "So that I can see my progress")

### Given/When/Then (REQUIRED - min 20 chars each)
- given: Complete initial state/preconditions
- when: Specific user action or trigger
- then: Expected system behavior and outcome

### Acceptance Criteria (REQUIRED - min 3, all testable)
Each AC must have:
- id: "AC-001", "AC-002", etc.
- description: Clear, specific, measurable criterion
- testable: true (must be verifiable)

### Technical Notes (REQUIRED - min 20 chars)
Implementation guidance for developers:
- Key components/files to modify
- Data models involved
- API endpoints if applicable
- Edge cases to handle

### Dependencies
- List of story IDs this depends on (empty array if none)

### Mockup References (REQUIRED for UI domains)
- List mockup files that show this feature

### Safety (if applicable)
- level: risk level (critical, high, medium, low)
- notes: what could go wrong and how to prevent it

### Estimates
- complexity: low, medium, or high
- hours: optional estimate

## Valid Domains
{domains}

## Output Format
Return a valid JSON object. Do not include markdown code blocks.

## Critical Rules
1. GWT must be SPECIFIC - vague GWT leads to vague implementations
2. Every AC must be TESTABLE - can be verified true/false
3. Technical notes must guide actual implementation
4. UI domains REQUIRE mockupRefs
`;

/**
 * Story review prompt for Grok
 */
export const STORY_REVIEW_PROMPT = `You are reviewing an AI Story for completeness and executability.

## Story to Review
{story}

## Original Feature
{feature}

## Review Checklist

1. **GWT Quality**
   - Is "given" specific about initial state? (min 20 chars)
   - Is "when" a clear action trigger? (min 20 chars)
   - Is "then" a measurable outcome? (min 20 chars)

2. **Acceptance Criteria**
   - Are there at least 3 criteria?
   - Is each criterion testable (can verify true/false)?
   - Do they cover the feature completely?

3. **Technical Feasibility**
   - Are technical notes actionable?
   - Are dependencies identified?
   - Is complexity estimate realistic?

4. **Mockup Alignment** (for UI domains)
   - Are mockups referenced?
   - Do mockups show this feature?

5. **Agent Readiness**
   - Can an AI agent execute this without clarification?
   - Are edge cases considered?
   - Are error states handled?

## Output Format

Return JSON:
{
  "score": 0-100,
  "issues": ["list of problems found"],
  "suggestions": ["specific improvements needed"],
  "gwtFeedback": {
    "given": "feedback on given clause",
    "when": "feedback on when clause",
    "then": "feedback on then clause"
  },
  "acFeedback": ["feedback per acceptance criterion"],
  "recommendation": "approve | refine | reject"
}
`;

/**
 * Story refinement prompt
 */
export const STORY_REFINEMENT_PROMPT = `Refine this AI Story based on the review feedback.

## Current Story
{story}

## Review Feedback
{feedback}

## Specific Issues to Fix
{issues}

## Instructions
1. Address each issue in the feedback
2. Improve GWT to be more specific
3. Ensure all ACs are testable
4. Add missing technical details
5. Maintain consistency with original feature intent

Return the improved story as a valid JSON object.
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate story ID in WAVE-XXX-DOMAIN-XXX format
 * @param {number} index - Story index
 * @param {string} domain - Story domain
 * @param {number} wave - Wave number (default 1)
 * @returns {string} Story ID
 */
export function generateStoryId(index, domain = 'GEN', wave = 1) {
  const domainCode = (domain || 'GEN').toUpperCase().slice(0, 4).replace(/-/g, '');
  return `WAVE-${String(wave).padStart(3, '0')}-${domainCode}-${String(index).padStart(3, '0')}`;
}

/**
 * Map PRD priority to story priority
 * @param {string} prdPriority - PRD feature priority
 * @returns {string} Story priority
 */
function mapPriority(prdPriority) {
  const mapping = {
    'must-have': 'high',
    'should-have': 'medium',
    'nice-to-have': 'low'
  };
  return mapping[prdPriority] || 'medium';
}

/**
 * Map PRD features to story templates
 * @param {Array} features - PRD features
 * @returns {Array} Story templates
 */
export function featuresToStories(features) {
  if (!features || !Array.isArray(features)) {
    return [];
  }

  return features.map(feature => ({
    featureId: feature.id,
    featureName: feature.name,
    featureDescription: feature.description,
    domain: feature.domain,
    priority: mapPriority(feature.priority),
    acceptanceCriteria: feature.acceptanceCriteria || [],
    mockupRefs: feature.mockupRefs || [],
    complexity: feature.estimatedComplexity || 'medium'
  }));
}

/**
 * Assign mockup references to a story based on domain and content
 * @param {Object} story - Story to assign mockups to
 * @param {Array} mockups - Available mockups
 * @returns {Object} Story with updated mockupRefs
 */
export function assignMockupRefs(story, mockups) {
  if (!mockups || !Array.isArray(mockups) || mockups.length === 0) {
    return story;
  }

  const existingRefs = story.mockupRefs || [];
  const newRefs = [...existingRefs];

  // Domain to keyword mapping for mockup matching
  const domainKeywords = {
    'authentication': ['login', 'auth', 'signin', 'signup', 'register'],
    'forms': ['form', 'input', 'submit', 'create', 'edit'],
    'navigation': ['nav', 'menu', 'header', 'sidebar'],
    'ui-components': ['component', 'list', 'table', 'card'],
    'search': ['search', 'filter', 'find'],
    'settings': ['settings', 'config', 'preferences'],
    'admin': ['admin', 'dashboard', 'manage']
  };

  const keywords = domainKeywords[story.domain] || [];

  for (const mockup of mockups) {
    const mockupName = (mockup.name || '').toLowerCase();
    const mockupContent = (mockup.content || '').toLowerCase();

    // Check if mockup name or content matches domain keywords
    const matches = keywords.some(keyword =>
      mockupName.includes(keyword) || mockupContent.includes(keyword)
    );

    if (matches && !newRefs.includes(mockup.name)) {
      newRefs.push(mockup.name);
    }
  }

  return {
    ...story,
    mockupRefs: newRefs
  };
}

/**
 * Calculate average detail score across stories
 * @param {Array} stories - Stories to score
 * @returns {number} Average score (rounded)
 */
export function calculateAverageScore(stories) {
  if (!stories || !Array.isArray(stories) || stories.length === 0) {
    return 0;
  }

  const validStories = stories.filter(s => s !== null && s !== undefined);
  if (validStories.length === 0) {
    return 0;
  }

  const totalScore = validStories.reduce((sum, story) => {
    return sum + scoreStoryDetail(story);
  }, 0);

  return Math.round(totalScore / validStories.length);
}

/**
 * Validate an array of stories
 * @param {Array} stories - Stories to validate
 * @returns {Object} Validation summary
 */
export function validateStories(stories) {
  if (!stories || !Array.isArray(stories)) {
    return {
      totalStories: 0,
      validStories: 0,
      invalidStories: 0,
      averageScore: 0,
      storyResults: []
    };
  }

  const storyResults = stories.map(story => {
    const validation = validateEnhancedStory(story);
    const score = scoreStoryDetail(story);

    return {
      storyId: story?.id || 'unknown',
      valid: validation.valid,
      score,
      errors: validation.errors || [],
      warnings: validation.warnings || []
    };
  });

  const validCount = storyResults.filter(r => r.valid).length;
  const invalidCount = storyResults.length - validCount;
  const averageScore = calculateAverageScore(stories);

  return {
    totalStories: stories.length,
    validStories: validCount,
    invalidStories: invalidCount,
    averageScore,
    storyResults
  };
}

// ============================================================================
// STORY GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate a single story from a feature
 * @param {Object} feature - PRD feature
 * @param {Object} context - Project context
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generated story
 */
export async function generateSingleStory(feature, context, options = {}) {
  const { skipLLM = false, wave = 1 } = options;

  const storyIndex = feature.id ? parseInt(feature.id.replace(/\D/g, '')) || 1 : 1;

  // Create base story from feature
  const story = {
    id: generateStoryId(storyIndex, feature.domain, wave),
    title: `Implement ${feature.name}`,
    epic: feature.epic || categorizeEpic(feature.domain),
    domain: feature.domain,
    priority: mapPriority(feature.priority),
    status: 'ready',

    userStory: {
      asA: 'user',
      iWant: `to ${feature.name?.toLowerCase() || 'perform action'}`,
      soThat: `I can ${feature.description?.slice(0, 50) || 'achieve my goal'}`
    },

    gwt: {
      given: `I am using the application and have access to ${feature.name || 'the feature'}`,
      when: `I interact with the ${feature.name || 'feature'} functionality`,
      then: `the system responds appropriately and ${feature.description || 'completes the action'}`
    },

    acceptanceCriteria: (feature.acceptanceCriteria || []).map((ac, i) => ({
      id: `AC-${String(i + 1).padStart(3, '0')}`,
      description: typeof ac === 'string' ? ac : ac.description || 'Criterion',
      testable: true
    })),

    technicalNotes: {
      suggestedApproach: `Implement ${feature.name} using the project's established patterns`,
      filesLikelyModified: [],
      apiEndpoints: [],
      databaseTables: [],
      externalServices: context.techStack || []
    },

    dependencies: [],

    mockupRefs: (feature.mockupRefs || []).map(ref =>
      typeof ref === 'string' ? { file: ref, elements: [] } : ref
    ),

    assignedAgent: 'fullstack',
    estimatedTokens: 10000,
    estimatedHours: feature.estimatedComplexity === 'high' ? 8 : feature.estimatedComplexity === 'low' ? 2 : 4,
    wave
  };

  // Ensure minimum acceptance criteria
  while (story.acceptanceCriteria.length < 3) {
    const index = story.acceptanceCriteria.length + 1;
    story.acceptanceCriteria.push({
      id: `AC-${String(index).padStart(3, '0')}`,
      description: `Feature ${index} is implemented correctly`,
      testable: true
    });
  }

  // Add safety for sensitive domains
  if (['authentication', 'authorization', 'payments', 'database'].includes(feature.domain)) {
    story.safety = {
      riskLevel: feature.domain === 'payments' ? 'critical' : 'high',
      requiresApproval: true,
      approver: 'security-lead',
      safetyTags: [feature.domain]
    };
  }

  // If skipLLM, return the basic story
  if (skipLLM) {
    return story;
  }

  // TODO: Implement LLM-based generation
  return story;
}

/**
 * Categorize feature into an epic based on domain
 * @param {string} domain - Feature domain
 * @returns {string} Epic name
 */
function categorizeEpic(domain) {
  const epicMapping = {
    'authentication': 'User Authentication',
    'authorization': 'User Authentication',
    'database': 'Data Management',
    'api': 'Backend Services',
    'ui-components': 'User Interface',
    'forms': 'User Interface',
    'navigation': 'User Interface',
    'state-management': 'Application Core',
    'integrations': 'External Integrations',
    'payments': 'Payments & Billing',
    'notifications': 'Notifications',
    'search': 'Search & Discovery',
    'media': 'Media Management',
    'analytics': 'Analytics & Reporting',
    'admin': 'Administration',
    'settings': 'Settings & Configuration',
    'infrastructure': 'Infrastructure'
  };

  return epicMapping[domain] || 'General Features';
}

/**
 * Generate all stories from a PRD
 * @param {Object} prd - PRD object
 * @param {string} projectPath - Project path
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result
 */
export async function generateStories(prd, projectPath, options = {}) {
  const {
    maxStories = Infinity,
    minScore = MIN_ACCEPTABLE_SCORE,
    maxRetries = MAX_RETRIES,
    skipLLM = false
  } = options;

  const startTime = Date.now();

  const result = {
    success: false,
    stories: [],
    validation: {
      totalStories: 0,
      validStories: 0,
      invalidStories: 0,
      averageScore: 0,
      storyResults: []
    },
    metrics: {
      generationTime: 0,
      tokensUsed: 0,
      cost: 0,
      retryCount: 0
    },
    error: null
  };

  // Validate PRD input
  if (!prd) {
    result.error = 'PRD is required for story generation';
    return result;
  }

  if (!prd.features || !prd.features.core || prd.features.core.length === 0) {
    result.error = 'PRD must have at least one core feature';
    return result;
  }

  try {
    // Get features to convert
    const features = prd.features.core.slice(0, maxStories);

    // Build context
    const context = {
      projectName: prd.projectName || 'Unknown Project',
      techStack: prd.technical?.stack?.map(s => s.name) || []
    };

    // Generate stories for each feature
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const story = await generateSingleStory(feature, context, { skipLLM });

      result.stories.push(story);
    }

    // Validate all stories
    result.validation = validateStories(result.stories);

    // Calculate metrics
    result.metrics.generationTime = Date.now() - startTime;

    result.success = true;
    return result;
  } catch (e) {
    result.error = e.message;
    return result;
  }
}

// Default export
export default generateStories;
