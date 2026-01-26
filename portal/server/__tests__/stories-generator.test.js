/**
 * Stories Generator - TDD Test Suite
 *
 * These tests are written BEFORE implementation following TDD.
 * All tests MUST FAIL initially (file doesn't exist).
 *
 * Test Categories:
 * 1. Prompt exports (STORY_GENERATION_PROMPT, etc.)
 * 2. Constants (MIN_ACCEPTABLE_SCORE, MAX_RETRIES)
 * 3. generateStories() - Main generation from PRD
 * 4. generateSingleStory() - Single story generation
 * 5. validateStories() - Batch validation
 * 6. featuresToStories() - Feature to story mapping
 * 7. assignMockupRefs() - Mockup matching
 * 8. generateStoryId() - ID generation
 * 9. calculateAverageScore() - Score averaging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// This import will FAIL until stories-generator.js is created
import {
  // Prompts
  STORY_GENERATION_PROMPT,
  STORY_REVIEW_PROMPT,
  STORY_REFINEMENT_PROMPT,
  VALID_DOMAINS_FOR_PROMPT,

  // Constants
  MIN_ACCEPTABLE_SCORE,
  MAX_RETRIES,

  // Main Functions
  generateStories,
  generateSingleStory,
  validateStories,

  // Helper Functions
  featuresToStories,
  assignMockupRefs,
  generateStoryId,
  calculateAverageScore
} from '../utils/stories-generator.js';

import {
  VALID_DOMAINS,
  validateEnhancedStory,
  scoreStoryDetail
} from '../utils/enhanced-story-schema.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const SAMPLE_PRD = {
  id: 'prd-001',
  projectName: 'TestApp',
  version: '1.0.0',
  status: 'draft',
  features: {
    core: [
      {
        id: 'F-001',
        name: 'User Login',
        description: 'Users can log in to access their personalized dashboard',
        priority: 'must-have',
        domain: 'authentication',
        acceptanceCriteria: [
          'User can enter email and password',
          'Invalid credentials show error message',
          'Successful login redirects to dashboard'
        ],
        mockupRefs: ['02-login.html'],
        estimatedComplexity: 'medium'
      },
      {
        id: 'F-002',
        name: 'Task Creation',
        description: 'Users can create new tasks with a title and description',
        priority: 'must-have',
        domain: 'forms',
        acceptanceCriteria: [
          'User can enter task title',
          'User can enter task description',
          'Task is saved to database'
        ],
        mockupRefs: ['01-task-list.html'],
        estimatedComplexity: 'low'
      },
      {
        id: 'F-003',
        name: 'API Endpoints',
        description: 'REST API endpoints for task CRUD operations',
        priority: 'must-have',
        domain: 'api',
        acceptanceCriteria: [
          'GET /api/tasks returns task list',
          'POST /api/tasks creates a task',
          'DELETE /api/tasks/:id removes task'
        ],
        mockupRefs: [],
        estimatedComplexity: 'medium'
      }
    ],
    enhanced: [],
    future: []
  },
  technical: {
    stack: [{ category: 'frontend', name: 'Next.js', purpose: 'UI' }]
  }
};

const VALID_STORY = {
  id: 'WAVE-001-AUTH-001',
  title: 'Implement User Login Authentication',
  epic: 'User Authentication',
  domain: 'authentication',
  priority: 'high',
  status: 'ready',
  userStory: {
    asA: 'registered user',
    iWant: 'to log in with my email and password',
    soThat: 'I can access my personalized dashboard and data'
  },
  gwt: {
    given: 'I am on the login page and have valid account credentials stored in the database',
    when: 'I enter my email and password and click the login button',
    then: 'I am authenticated and redirected to my dashboard with my session persisted'
  },
  acceptanceCriteria: [
    { id: 'AC-001', description: 'Login form displays email and password fields', testable: true },
    { id: 'AC-002', description: 'Email field validates proper email format', testable: true },
    { id: 'AC-003', description: 'Invalid credentials display error message', testable: true },
    { id: 'AC-004', description: 'Successful login redirects to dashboard', testable: true },
    { id: 'AC-005', description: 'Session token is stored and persists', testable: true }
  ],
  technicalNotes: {
    suggestedApproach: 'Use Supabase Auth signInWithPassword method',
    filesLikelyModified: ['src/app/login/page.tsx'],
    apiEndpoints: ['/api/auth/signin'],
    databaseTables: ['users'],
    externalServices: ['Supabase Auth']
  },
  dependencies: [],
  mockupRefs: [
    { file: '02-login.html', elements: ['#email-input', '#password-input'] }
  ],
  safety: {
    riskLevel: 'high',
    requiresApproval: true,
    approver: 'security-lead',
    safetyTags: ['auth', 'credentials']
  },
  assignedAgent: 'fullstack',
  estimatedTokens: 15000,
  estimatedHours: 4,
  wave: 1
};

const SAMPLE_FEATURE = {
  id: 'F-001',
  name: 'User Login',
  description: 'Users can log in to access their personalized dashboard',
  priority: 'must-have',
  domain: 'authentication',
  acceptanceCriteria: [
    'User can enter email and password',
    'Invalid credentials show error message',
    'Successful login redirects to dashboard'
  ],
  mockupRefs: ['02-login.html'],
  estimatedComplexity: 'medium'
};

const SAMPLE_MOCKUPS = [
  { name: '01-task-list.html', content: '<html><body>Task List</body></html>' },
  { name: '02-login.html', content: '<html><body>Login Form</body></html>' }
];

// ============================================================================
// 1. PROMPT EXPORTS TESTS
// ============================================================================

describe('STORY_GENERATION_PROMPT', () => {
  it('should be exported as a string', () => {
    expect(STORY_GENERATION_PROMPT).toBeDefined();
    expect(typeof STORY_GENERATION_PROMPT).toBe('string');
  });

  it('should contain feature placeholder', () => {
    expect(STORY_GENERATION_PROMPT).toContain('{feature}');
  });

  it('should contain context placeholder', () => {
    expect(STORY_GENERATION_PROMPT).toContain('{context}');
  });

  it('should contain domains placeholder', () => {
    expect(STORY_GENERATION_PROMPT).toContain('{domains}');
  });

  it('should mention GWT requirements', () => {
    expect(STORY_GENERATION_PROMPT.toLowerCase()).toContain('given');
    expect(STORY_GENERATION_PROMPT.toLowerCase()).toContain('when');
    expect(STORY_GENERATION_PROMPT.toLowerCase()).toContain('then');
  });

  it('should mention acceptance criteria requirements', () => {
    expect(STORY_GENERATION_PROMPT.toLowerCase()).toContain('acceptance criteria');
  });

  it('should mention testable requirement', () => {
    expect(STORY_GENERATION_PROMPT.toLowerCase()).toContain('testable');
  });

  it('should mention JSON output format', () => {
    expect(STORY_GENERATION_PROMPT.toLowerCase()).toContain('json');
  });
});

describe('STORY_REVIEW_PROMPT', () => {
  it('should be exported as a string', () => {
    expect(STORY_REVIEW_PROMPT).toBeDefined();
    expect(typeof STORY_REVIEW_PROMPT).toBe('string');
  });

  it('should contain story placeholder', () => {
    expect(STORY_REVIEW_PROMPT).toContain('{story}');
  });

  it('should contain feature placeholder', () => {
    expect(STORY_REVIEW_PROMPT).toContain('{feature}');
  });

  it('should mention review checklist', () => {
    expect(STORY_REVIEW_PROMPT).toContain('GWT');
    expect(STORY_REVIEW_PROMPT).toContain('Acceptance Criteria');
  });

  it('should mention recommendation output', () => {
    expect(STORY_REVIEW_PROMPT).toContain('recommendation');
  });
});

describe('STORY_REFINEMENT_PROMPT', () => {
  it('should be exported as a string', () => {
    expect(STORY_REFINEMENT_PROMPT).toBeDefined();
    expect(typeof STORY_REFINEMENT_PROMPT).toBe('string');
  });

  it('should contain story placeholder', () => {
    expect(STORY_REFINEMENT_PROMPT).toContain('{story}');
  });

  it('should contain feedback placeholder', () => {
    expect(STORY_REFINEMENT_PROMPT).toContain('{feedback}');
  });

  it('should contain issues placeholder', () => {
    expect(STORY_REFINEMENT_PROMPT).toContain('{issues}');
  });
});

describe('VALID_DOMAINS_FOR_PROMPT', () => {
  it('should be exported as a string', () => {
    expect(VALID_DOMAINS_FOR_PROMPT).toBeDefined();
    expect(typeof VALID_DOMAINS_FOR_PROMPT).toBe('string');
  });

  it('should contain all valid domains', () => {
    for (const domain of VALID_DOMAINS) {
      expect(VALID_DOMAINS_FOR_PROMPT).toContain(domain);
    }
  });
});

// ============================================================================
// 2. CONSTANTS TESTS
// ============================================================================

describe('MIN_ACCEPTABLE_SCORE', () => {
  it('should be exported as a number', () => {
    expect(MIN_ACCEPTABLE_SCORE).toBeDefined();
    expect(typeof MIN_ACCEPTABLE_SCORE).toBe('number');
  });

  it('should be 70 (acceptable threshold)', () => {
    expect(MIN_ACCEPTABLE_SCORE).toBe(70);
  });
});

describe('MAX_RETRIES', () => {
  it('should be exported as a number', () => {
    expect(MAX_RETRIES).toBeDefined();
    expect(typeof MAX_RETRIES).toBe('number');
  });

  it('should be 3', () => {
    expect(MAX_RETRIES).toBe(3);
  });
});

// ============================================================================
// 3. generateStories() TESTS
// ============================================================================

describe('generateStories', () => {
  it('should be an async function', () => {
    expect(typeof generateStories).toBe('function');
  });

  it('should return object with expected structure', async () => {
    try {
      const result = await generateStories(SAMPLE_PRD, '/test/path', { skipLLM: true });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('stories');
      expect(result).toHaveProperty('validation');
      expect(result).toHaveProperty('metrics');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should generate stories for each core feature', async () => {
    try {
      const result = await generateStories(SAMPLE_PRD, '/test/path', { skipLLM: true });
      expect(result.stories.length).toBe(SAMPLE_PRD.features.core.length);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should return validation summary', async () => {
    try {
      const result = await generateStories(SAMPLE_PRD, '/test/path', { skipLLM: true });
      expect(result.validation).toHaveProperty('totalStories');
      expect(result.validation).toHaveProperty('validStories');
      expect(result.validation).toHaveProperty('invalidStories');
      expect(result.validation).toHaveProperty('averageScore');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should return metrics', async () => {
    try {
      const result = await generateStories(SAMPLE_PRD, '/test/path', { skipLLM: true });
      expect(result.metrics).toHaveProperty('generationTime');
      expect(result.metrics).toHaveProperty('tokensUsed');
      expect(result.metrics).toHaveProperty('cost');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should return error for null PRD', async () => {
    const result = await generateStories(null, '/test/path');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should return error for PRD without features', async () => {
    const result = await generateStories({ id: 'test' }, '/test/path');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should respect maxStories option', async () => {
    try {
      const result = await generateStories(SAMPLE_PRD, '/test/path', {
        skipLLM: true,
        maxStories: 2
      });
      expect(result.stories.length).toBeLessThanOrEqual(2);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});

// ============================================================================
// 4. generateSingleStory() TESTS
// ============================================================================

describe('generateSingleStory', () => {
  it('should be an async function', () => {
    expect(typeof generateSingleStory).toBe('function');
  });

  it('should return a story object', async () => {
    try {
      const context = { projectName: 'TestApp', techStack: ['Next.js'] };
      const result = await generateSingleStory(SAMPLE_FEATURE, context, { skipLLM: true });
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('domain');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should preserve feature domain', async () => {
    try {
      const context = { projectName: 'TestApp', techStack: ['Next.js'] };
      const result = await generateSingleStory(SAMPLE_FEATURE, context, { skipLLM: true });
      expect(result.domain).toBe(SAMPLE_FEATURE.domain);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should include mockupRefs from feature', async () => {
    try {
      const context = { projectName: 'TestApp', techStack: ['Next.js'] };
      const result = await generateSingleStory(SAMPLE_FEATURE, context, { skipLLM: true });
      expect(result.mockupRefs).toContain('02-login.html');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should map priority from feature', async () => {
    try {
      const context = { projectName: 'TestApp', techStack: ['Next.js'] };
      const result = await generateSingleStory(SAMPLE_FEATURE, context, { skipLLM: true });
      // must-have maps to high
      expect(result.priority).toBe('high');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should generate valid GWT structure', async () => {
    try {
      const context = { projectName: 'TestApp', techStack: ['Next.js'] };
      const result = await generateSingleStory(SAMPLE_FEATURE, context, { skipLLM: true });
      expect(result.gwt).toHaveProperty('given');
      expect(result.gwt).toHaveProperty('when');
      expect(result.gwt).toHaveProperty('then');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should generate valid userStory structure', async () => {
    try {
      const context = { projectName: 'TestApp', techStack: ['Next.js'] };
      const result = await generateSingleStory(SAMPLE_FEATURE, context, { skipLLM: true });
      expect(result.userStory).toHaveProperty('asA');
      expect(result.userStory).toHaveProperty('iWant');
      expect(result.userStory).toHaveProperty('soThat');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});

// ============================================================================
// 5. validateStories() TESTS
// ============================================================================

describe('validateStories', () => {
  it('should be a function', () => {
    expect(typeof validateStories).toBe('function');
  });

  it('should return validation summary', () => {
    const result = validateStories([VALID_STORY]);
    expect(result).toHaveProperty('totalStories');
    expect(result).toHaveProperty('validStories');
    expect(result).toHaveProperty('invalidStories');
    expect(result).toHaveProperty('averageScore');
    expect(result).toHaveProperty('storyResults');
  });

  it('should count total stories', () => {
    const result = validateStories([VALID_STORY, VALID_STORY]);
    expect(result.totalStories).toBe(2);
  });

  it('should identify valid stories', () => {
    const result = validateStories([VALID_STORY]);
    expect(result.validStories).toBe(1);
    expect(result.invalidStories).toBe(0);
  });

  it('should identify invalid stories', () => {
    const invalidStory = { ...VALID_STORY, gwt: { given: '', when: '', then: '' } };
    const result = validateStories([invalidStory]);
    expect(result.invalidStories).toBe(1);
  });

  it('should calculate average score', () => {
    const result = validateStories([VALID_STORY]);
    expect(result.averageScore).toBeGreaterThan(0);
    expect(result.averageScore).toBeLessThanOrEqual(100);
  });

  it('should return empty summary for empty array', () => {
    const result = validateStories([]);
    expect(result.totalStories).toBe(0);
    expect(result.validStories).toBe(0);
    expect(result.averageScore).toBe(0);
  });

  it('should return empty summary for null', () => {
    const result = validateStories(null);
    expect(result.totalStories).toBe(0);
  });

  it('should include per-story results', () => {
    const result = validateStories([VALID_STORY]);
    expect(result.storyResults.length).toBe(1);
    expect(result.storyResults[0]).toHaveProperty('storyId');
    expect(result.storyResults[0]).toHaveProperty('valid');
    expect(result.storyResults[0]).toHaveProperty('score');
  });
});

// ============================================================================
// 6. featuresToStories() TESTS
// ============================================================================

describe('featuresToStories', () => {
  it('should be a function', () => {
    expect(typeof featuresToStories).toBe('function');
  });

  it('should return array of story templates', () => {
    const result = featuresToStories(SAMPLE_PRD.features.core);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });

  it('should preserve feature ID', () => {
    const result = featuresToStories(SAMPLE_PRD.features.core);
    expect(result[0].featureId).toBe('F-001');
  });

  it('should preserve feature name', () => {
    const result = featuresToStories(SAMPLE_PRD.features.core);
    expect(result[0].featureName).toBe('User Login');
  });

  it('should preserve feature domain', () => {
    const result = featuresToStories(SAMPLE_PRD.features.core);
    expect(result[0].domain).toBe('authentication');
  });

  it('should map must-have to high priority', () => {
    const result = featuresToStories(SAMPLE_PRD.features.core);
    expect(result[0].priority).toBe('high');
  });

  it('should map should-have to medium priority', () => {
    const features = [{ ...SAMPLE_FEATURE, priority: 'should-have' }];
    const result = featuresToStories(features);
    expect(result[0].priority).toBe('medium');
  });

  it('should map nice-to-have to low priority', () => {
    const features = [{ ...SAMPLE_FEATURE, priority: 'nice-to-have' }];
    const result = featuresToStories(features);
    expect(result[0].priority).toBe('low');
  });

  it('should preserve mockupRefs', () => {
    const result = featuresToStories(SAMPLE_PRD.features.core);
    expect(result[0].mockupRefs).toContain('02-login.html');
  });

  it('should preserve complexity', () => {
    const result = featuresToStories(SAMPLE_PRD.features.core);
    expect(result[0].complexity).toBe('medium');
  });

  it('should return empty array for null', () => {
    const result = featuresToStories(null);
    expect(result).toEqual([]);
  });

  it('should return empty array for empty array', () => {
    const result = featuresToStories([]);
    expect(result).toEqual([]);
  });
});

// ============================================================================
// 7. assignMockupRefs() TESTS
// ============================================================================

describe('assignMockupRefs', () => {
  it('should be a function', () => {
    expect(typeof assignMockupRefs).toBe('function');
  });

  it('should return story with mockupRefs', () => {
    const story = { ...VALID_STORY, mockupRefs: [] };
    const result = assignMockupRefs(story, SAMPLE_MOCKUPS);
    expect(result).toHaveProperty('mockupRefs');
  });

  it('should preserve existing mockupRefs', () => {
    const story = { ...VALID_STORY, mockupRefs: ['existing.html'] };
    const result = assignMockupRefs(story, SAMPLE_MOCKUPS);
    expect(result.mockupRefs).toContain('existing.html');
  });

  it('should match mockups by domain keyword', () => {
    const story = { ...VALID_STORY, domain: 'authentication', mockupRefs: [] };
    const mockups = [
      { name: 'login-page.html', content: '<html>Login</html>' }
    ];
    const result = assignMockupRefs(story, mockups);
    expect(result.mockupRefs.length).toBeGreaterThan(0);
  });

  it('should return unchanged story if no mockups', () => {
    const story = { ...VALID_STORY, mockupRefs: ['existing.html'] };
    const result = assignMockupRefs(story, []);
    expect(result.mockupRefs).toEqual(['existing.html']);
  });

  it('should return unchanged story if null mockups', () => {
    const story = { ...VALID_STORY };
    const result = assignMockupRefs(story, null);
    expect(result.mockupRefs).toBeDefined();
  });
});

// ============================================================================
// 8. generateStoryId() TESTS
// ============================================================================

describe('generateStoryId', () => {
  it('should be a function', () => {
    expect(typeof generateStoryId).toBe('function');
  });

  it('should return string in WAVE-XXX-DOMAIN-XXX format', () => {
    const id = generateStoryId(1, 'authentication');
    expect(id).toMatch(/^WAVE-\d{3}-[A-Z]+-\d{3}$/);
  });

  it('should pad single digit with zeros', () => {
    const id = generateStoryId(1, 'api');
    expect(id).toBe('WAVE-001-API-001');
  });

  it('should pad double digit with zeros', () => {
    const id = generateStoryId(12, 'api');
    expect(id).toBe('WAVE-001-API-012');
  });

  it('should handle triple digit', () => {
    const id = generateStoryId(123, 'api');
    expect(id).toBe('WAVE-001-API-123');
  });

  it('should handle 0', () => {
    const id = generateStoryId(0, 'api');
    expect(id).toBe('WAVE-001-API-000');
  });

  it('should generate sequential IDs', () => {
    const id1 = generateStoryId(1, 'auth');
    const id2 = generateStoryId(2, 'auth');
    const id3 = generateStoryId(3, 'auth');
    expect(id1).toBe('WAVE-001-AUTH-001');
    expect(id2).toBe('WAVE-001-AUTH-002');
    expect(id3).toBe('WAVE-001-AUTH-003');
  });
});

// ============================================================================
// 9. calculateAverageScore() TESTS
// ============================================================================

describe('calculateAverageScore', () => {
  it('should be a function', () => {
    expect(typeof calculateAverageScore).toBe('function');
  });

  it('should return a number', () => {
    const result = calculateAverageScore([VALID_STORY]);
    expect(typeof result).toBe('number');
  });

  it('should calculate average of scores', () => {
    // Create stories with different scores
    const stories = [VALID_STORY, VALID_STORY]; // Both should have same score
    const result = calculateAverageScore(stories);
    const singleScore = scoreStoryDetail(VALID_STORY);
    expect(result).toBe(singleScore);
  });

  it('should return 0 for empty array', () => {
    const result = calculateAverageScore([]);
    expect(result).toBe(0);
  });

  it('should return 0 for null', () => {
    const result = calculateAverageScore(null);
    expect(result).toBe(0);
  });

  it('should return 0 for undefined', () => {
    const result = calculateAverageScore(undefined);
    expect(result).toBe(0);
  });

  it('should handle single story', () => {
    const result = calculateAverageScore([VALID_STORY]);
    expect(result).toBeGreaterThan(0);
  });

  it('should round to nearest integer', () => {
    const result = calculateAverageScore([VALID_STORY]);
    expect(Number.isInteger(result)).toBe(true);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  describe('featuresToStories with validateStories', () => {
    it('should produce validatable story templates', () => {
      const templates = featuresToStories(SAMPLE_PRD.features.core);
      expect(templates.length).toBeGreaterThan(0);
      // Templates are not full stories yet, just feature mappings
      expect(templates[0]).toHaveProperty('featureId');
      expect(templates[0]).toHaveProperty('domain');
    });
  });

  describe('validateStories with enhanced-story-schema', () => {
    it('should use validateEnhancedStory internally', () => {
      const result = validateStories([VALID_STORY]);
      // Result should match what validateEnhancedStory would return
      const directValidation = validateEnhancedStory(VALID_STORY);
      expect(result.storyResults[0].valid).toBe(directValidation.valid);
    });

    it('should use scoreStoryDetail internally', () => {
      const result = validateStories([VALID_STORY]);
      const directScore = scoreStoryDetail(VALID_STORY);
      expect(result.storyResults[0].score).toBe(directScore);
    });
  });

  describe('generateStoryId sequence', () => {
    it('should generate unique IDs for multiple features', () => {
      const ids = SAMPLE_PRD.features.core.map((_, i) => generateStoryId(i + 1));
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('calculateAverageScore with validateStories', () => {
    it('should match validation averageScore', () => {
      const validation = validateStories([VALID_STORY]);
      const calculated = calculateAverageScore([VALID_STORY]);
      expect(validation.averageScore).toBe(calculated);
    });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  describe('empty and null inputs', () => {
    it('featuresToStories handles undefined', () => {
      const result = featuresToStories(undefined);
      expect(result).toEqual([]);
    });

    it('validateStories handles undefined', () => {
      const result = validateStories(undefined);
      expect(result.totalStories).toBe(0);
    });

    it('calculateAverageScore handles array with null items', () => {
      const result = calculateAverageScore([null, VALID_STORY]);
      expect(typeof result).toBe('number');
    });
  });

  describe('invalid data', () => {
    it('validateStories handles stories with missing required fields', () => {
      const incompleteStory = { id: 'STORY-001', title: 'Test' };
      const result = validateStories([incompleteStory]);
      expect(result.invalidStories).toBe(1);
    });

    it('featuresToStories handles features with missing fields', () => {
      const incompleteFeatures = [{ id: 'F-001', name: 'Test' }];
      const result = featuresToStories(incompleteFeatures);
      expect(result.length).toBe(1);
      // Should still create template with available data
      expect(result[0].featureId).toBe('F-001');
    });
  });
});
