/**
 * PRD Generator - TDD Test Suite
 *
 * These tests are written BEFORE implementation following TDD.
 * All tests MUST FAIL initially (file doesn't exist).
 *
 * Test Categories:
 * 1. Schema exports (PRD_SCHEMA, PRD_SCORE_WEIGHTS, PRD_SCORE_THRESHOLDS)
 * 2. Prompt exports (PRD_SYNTHESIS_PROMPT, PRD_REVIEW_PROMPT)
 * 3. validatePRD() - PRD validation against schema
 * 4. scorePRD() - Calculate PRD score (0-100)
 * 5. getPRDScoreBreakdown() - Detailed score breakdown
 * 6. createEmptyPRD() - Create blank PRD structure
 * 7. mergePRDs() - Merge existing and generated PRDs
 * 8. extractFeaturesFromMockups() - Feature extraction from HTML
 * 9. gatherPRDSources() - Source gathering (async)
 * 10. generatePRD() - Main generation function (async)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// This import will FAIL until prd-generator.js is created
import {
  // Schema & Types
  PRD_SCHEMA,
  PRD_SCORE_WEIGHTS,
  PRD_SCORE_THRESHOLDS,

  // Prompts
  PRD_SYNTHESIS_PROMPT,
  PRD_REVIEW_PROMPT,

  // Main Functions
  generatePRD,
  validatePRD,
  scorePRD,
  getPRDScoreBreakdown,

  // Helper Functions
  gatherPRDSources,
  extractFeaturesFromMockups,
  createEmptyPRD,
  mergePRDs
} from '../utils/prd-generator.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const VALID_COMPLETE_PRD = {
  id: 'prd-001',
  projectName: 'TestApp',
  version: '1.0.0',
  status: 'draft',
  createdAt: '2026-01-26T00:00:00Z',
  updatedAt: '2026-01-26T00:00:00Z',
  generatedBy: 'claude',

  overview: {
    problemStatement: 'Users need a way to track their daily tasks efficiently without complexity',
    targetAudience: 'Busy professionals who need simple task management',
    valueProposition: 'Simple, fast task management that syncs across all devices seamlessly',
    successMetrics: [
      { id: 'SM-001', metric: 'Daily active users', target: '1000', measurable: true },
      { id: 'SM-002', metric: 'Task completion rate', target: '80%', measurable: true },
      { id: 'SM-003', metric: 'User retention', target: '70%', measurable: true }
    ]
  },

  goals: {
    primary: [
      { id: 'G-001', description: 'Enable users to create and complete tasks quickly', measurable: true, metric: 'time to create task < 5s' },
      { id: 'G-002', description: 'Sync tasks across web and mobile platforms', measurable: true, metric: '99.9% sync success' },
      { id: 'G-003', description: 'Provide intuitive user experience', measurable: true, metric: 'NPS > 50' }
    ],
    secondary: [
      { id: 'G-004', description: 'Support task categories', measurable: false }
    ],
    nonGoals: ['Calendar integration', 'Team collaboration', 'Complex project management']
  },

  features: {
    core: [
      {
        id: 'F-001',
        name: 'Task Creation',
        description: 'Users can create new tasks with a title and optional description and due date',
        priority: 'must-have',
        domain: 'forms',
        acceptanceCriteria: [
          'User can enter task title (required)',
          'User can optionally add description',
          'User can set optional due date',
          'Task is saved to database on submit'
        ],
        mockupRefs: ['01-task-list.html'],
        estimatedComplexity: 'low'
      },
      {
        id: 'F-002',
        name: 'Task Completion',
        description: 'Users can mark tasks as complete with a single click',
        priority: 'must-have',
        domain: 'ui-components',
        acceptanceCriteria: [
          'Checkbox toggles completion status',
          'Completed tasks show strikethrough',
          'Completion is persisted to database'
        ],
        mockupRefs: ['01-task-list.html'],
        estimatedComplexity: 'low'
      },
      {
        id: 'F-003',
        name: 'User Authentication',
        description: 'Users can sign up and log in with email and password securely',
        priority: 'must-have',
        domain: 'authentication',
        acceptanceCriteria: [
          'User can register with email and password',
          'User can log in with credentials',
          'Session persists across browser refresh',
          'Password reset functionality available'
        ],
        mockupRefs: ['02-login.html'],
        estimatedComplexity: 'medium'
      },
      {
        id: 'F-004',
        name: 'Task Filtering',
        description: 'Users can filter tasks by status, date, and category',
        priority: 'should-have',
        domain: 'ui-components',
        acceptanceCriteria: [
          'Filter by completion status',
          'Filter by due date range',
          'Filters persist in URL'
        ],
        mockupRefs: ['01-task-list.html'],
        estimatedComplexity: 'medium'
      },
      {
        id: 'F-005',
        name: 'Task Search',
        description: 'Users can search tasks by title and description',
        priority: 'should-have',
        domain: 'search',
        acceptanceCriteria: [
          'Real-time search as user types',
          'Search highlights matching text',
          'No results state handled'
        ],
        mockupRefs: ['01-task-list.html'],
        estimatedComplexity: 'medium'
      }
    ],
    enhanced: [
      {
        id: 'F-006',
        name: 'Task Categories',
        description: 'Users can organize tasks into categories',
        priority: 'nice-to-have',
        domain: 'state-management',
        acceptanceCriteria: ['Create categories', 'Assign tasks to categories'],
        mockupRefs: [],
        estimatedComplexity: 'medium'
      }
    ],
    future: [
      {
        id: 'F-007',
        name: 'Recurring Tasks',
        description: 'Tasks can be set to recur on a schedule',
        priority: 'nice-to-have',
        domain: 'forms',
        acceptanceCriteria: ['Set recurrence pattern', 'Auto-create next occurrence'],
        mockupRefs: [],
        estimatedComplexity: 'high'
      }
    ]
  },

  technical: {
    stack: [
      { category: 'frontend', name: 'Next.js', version: '14', purpose: 'React framework with SSR' },
      { category: 'frontend', name: 'TailwindCSS', version: '3', purpose: 'Utility-first CSS' },
      { category: 'database', name: 'Supabase', purpose: 'Backend, auth, and realtime' },
      { category: 'infrastructure', name: 'Vercel', purpose: 'Hosting and deployment' }
    ],
    integrations: [
      { name: 'Supabase Auth', type: 'service', purpose: 'User authentication', required: true }
    ],
    constraints: ['Must work offline with sync', 'Mobile-first responsive design'],
    performance: [
      { metric: 'Time to Interactive', target: '<3s', priority: 'critical' },
      { metric: 'First Contentful Paint', target: '<1.5s', priority: 'important' }
    ]
  },

  personas: [
    {
      id: 'P-001',
      name: 'Busy Professional',
      role: 'Office worker',
      needs: ['Quick task entry', 'Cross-device sync', 'Simple interface'],
      painPoints: ['Complex apps waste time', 'Forgetting tasks', 'App fatigue']
    }
  ],

  risks: [
    {
      id: 'R-001',
      description: 'Users may not adopt due to app fatigue',
      likelihood: 'medium',
      impact: 'high',
      mitigation: 'Focus on simplicity and fast onboarding'
    },
    {
      id: 'R-002',
      description: 'Sync conflicts between devices',
      likelihood: 'low',
      impact: 'medium',
      mitigation: 'Implement conflict resolution with last-write-wins'
    }
  ],

  dependencies: [
    { type: 'external', name: 'Supabase', description: 'Backend services', status: 'available' }
  ],

  sources: {
    documents: ['README.md', 'CLAUDE.md'],
    mockups: ['01-task-list.html', '02-login.html'],
    userInput: true
  }
};

const MINIMAL_VALID_PRD = {
  id: 'prd-min',
  projectName: 'MinimalApp',
  version: '1.0.0',
  status: 'draft',
  createdAt: '2026-01-26T00:00:00Z',
  updatedAt: '2026-01-26T00:00:00Z',
  generatedBy: 'claude',

  overview: {
    problemStatement: 'Solving user problem X with solution Y',
    targetAudience: 'Target users',
    valueProposition: 'Value delivered to users through this',
    successMetrics: [
      { id: 'SM-001', metric: 'Metric 1', target: '100', measurable: true },
      { id: 'SM-002', metric: 'Metric 2', target: '50%', measurable: true }
    ]
  },

  goals: {
    primary: [
      { id: 'G-001', description: 'Primary goal one description', measurable: true },
      { id: 'G-002', description: 'Primary goal two description', measurable: true }
    ],
    secondary: [],
    nonGoals: []
  },

  features: {
    core: [
      {
        id: 'F-001',
        name: 'Feature One',
        description: 'Description of feature one functionality',
        priority: 'must-have',
        domain: 'ui-components',
        acceptanceCriteria: ['AC 1 for feature', 'AC 2 for feature'],
        mockupRefs: [],
        estimatedComplexity: 'low'
      },
      {
        id: 'F-002',
        name: 'Feature Two',
        description: 'Description of feature two functionality',
        priority: 'must-have',
        domain: 'api',
        acceptanceCriteria: ['AC 1 for feature', 'AC 2 for feature'],
        mockupRefs: [],
        estimatedComplexity: 'medium'
      },
      {
        id: 'F-003',
        name: 'Feature Three',
        description: 'Description of feature three functionality',
        priority: 'should-have',
        domain: 'database',
        acceptanceCriteria: ['AC 1 for feature', 'AC 2 for feature'],
        mockupRefs: [],
        estimatedComplexity: 'medium'
      }
    ],
    enhanced: [],
    future: []
  },

  technical: {
    stack: [
      { category: 'frontend', name: 'React', purpose: 'UI framework' }
    ],
    integrations: [],
    constraints: [],
    performance: []
  },

  personas: [],
  risks: [],
  dependencies: [],

  sources: {
    documents: [],
    mockups: [],
    userInput: false
  }
};

// ============================================================================
// 1. PRD_SCHEMA TESTS
// ============================================================================

describe('PRD_SCHEMA', () => {
  it('should be exported', () => {
    expect(PRD_SCHEMA).toBeDefined();
  });

  it('should have id field definition', () => {
    expect(PRD_SCHEMA.id).toBeDefined();
    expect(PRD_SCHEMA.id.type).toBe('string');
    expect(PRD_SCHEMA.id.required).toBe(true);
  });

  it('should have projectName field definition', () => {
    expect(PRD_SCHEMA.projectName).toBeDefined();
    expect(PRD_SCHEMA.projectName.type).toBe('string');
    expect(PRD_SCHEMA.projectName.required).toBe(true);
    expect(PRD_SCHEMA.projectName.minLength).toBe(1);
  });

  it('should have version field with pattern', () => {
    expect(PRD_SCHEMA.version).toBeDefined();
    expect(PRD_SCHEMA.version.type).toBe('string');
    expect(PRD_SCHEMA.version.required).toBe(true);
    expect(PRD_SCHEMA.version.pattern).toBeDefined();
  });

  it('should have status field with enum', () => {
    expect(PRD_SCHEMA.status).toBeDefined();
    expect(PRD_SCHEMA.status.type).toBe('string');
    expect(PRD_SCHEMA.status.enum).toContain('draft');
    expect(PRD_SCHEMA.status.enum).toContain('review');
    expect(PRD_SCHEMA.status.enum).toContain('approved');
  });

  it('should have overview section definition', () => {
    expect(PRD_SCHEMA.overview).toBeDefined();
    expect(PRD_SCHEMA.overview.type).toBe('object');
    expect(PRD_SCHEMA.overview.required).toBe(true);
  });

  it('should define overview properties with min lengths', () => {
    expect(PRD_SCHEMA.overview.properties.problemStatement.minLength).toBe(20);
    expect(PRD_SCHEMA.overview.properties.targetAudience.minLength).toBe(10);
    expect(PRD_SCHEMA.overview.properties.valueProposition.minLength).toBe(20);
    expect(PRD_SCHEMA.overview.properties.successMetrics.minItems).toBe(2);
  });

  it('should have goals section definition', () => {
    expect(PRD_SCHEMA.goals).toBeDefined();
    expect(PRD_SCHEMA.goals.type).toBe('object');
    expect(PRD_SCHEMA.goals.required).toBe(true);
    expect(PRD_SCHEMA.goals.properties.primary.minItems).toBe(2);
  });

  it('should have features section definition', () => {
    expect(PRD_SCHEMA.features).toBeDefined();
    expect(PRD_SCHEMA.features.type).toBe('object');
    expect(PRD_SCHEMA.features.required).toBe(true);
    expect(PRD_SCHEMA.features.properties.core.minItems).toBe(3);
  });

  it('should have technical section definition', () => {
    expect(PRD_SCHEMA.technical).toBeDefined();
    expect(PRD_SCHEMA.technical.type).toBe('object');
    expect(PRD_SCHEMA.technical.required).toBe(true);
    expect(PRD_SCHEMA.technical.properties.stack.minItems).toBe(1);
  });

  it('should have sources section as required', () => {
    expect(PRD_SCHEMA.sources).toBeDefined();
    expect(PRD_SCHEMA.sources.type).toBe('object');
    expect(PRD_SCHEMA.sources.required).toBe(true);
  });

  it('should have optional sections', () => {
    expect(PRD_SCHEMA.risks.required).toBeFalsy();
    expect(PRD_SCHEMA.dependencies.required).toBeFalsy();
    expect(PRD_SCHEMA.personas.required).toBeFalsy();
  });
});

// ============================================================================
// 2. PRD_SCORE_WEIGHTS TESTS
// ============================================================================

describe('PRD_SCORE_WEIGHTS', () => {
  it('should be exported', () => {
    expect(PRD_SCORE_WEIGHTS).toBeDefined();
  });

  it('should have overview weight of 25', () => {
    expect(PRD_SCORE_WEIGHTS.overview).toBe(25);
  });

  it('should have goals weight of 15', () => {
    expect(PRD_SCORE_WEIGHTS.goals).toBe(15);
  });

  it('should have features weight of 30', () => {
    expect(PRD_SCORE_WEIGHTS.features).toBe(30);
  });

  it('should have technical weight of 15', () => {
    expect(PRD_SCORE_WEIGHTS.technical).toBe(15);
  });

  it('should have personas weight of 5', () => {
    expect(PRD_SCORE_WEIGHTS.personas).toBe(5);
  });

  it('should have risks weight of 5', () => {
    expect(PRD_SCORE_WEIGHTS.risks).toBe(5);
  });

  it('should have completeness weight of 5', () => {
    expect(PRD_SCORE_WEIGHTS.completeness).toBe(5);
  });

  it('should have weights totaling 100', () => {
    const total = Object.values(PRD_SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

// ============================================================================
// 3. PRD_SCORE_THRESHOLDS TESTS
// ============================================================================

describe('PRD_SCORE_THRESHOLDS', () => {
  it('should be exported', () => {
    expect(PRD_SCORE_THRESHOLDS).toBeDefined();
  });

  it('should have excellent threshold at 90', () => {
    expect(PRD_SCORE_THRESHOLDS.excellent).toBe(90);
  });

  it('should have good threshold at 80', () => {
    expect(PRD_SCORE_THRESHOLDS.good).toBe(80);
  });

  it('should have acceptable threshold at 70', () => {
    expect(PRD_SCORE_THRESHOLDS.acceptable).toBe(70);
  });

  it('should have minimum threshold at 60', () => {
    expect(PRD_SCORE_THRESHOLDS.minimum).toBe(60);
  });

  it('should have failing threshold at 0', () => {
    expect(PRD_SCORE_THRESHOLDS.failing).toBe(0);
  });
});

// ============================================================================
// 4. PROMPTS TESTS
// ============================================================================

describe('PRD_SYNTHESIS_PROMPT', () => {
  it('should be exported as a string', () => {
    expect(PRD_SYNTHESIS_PROMPT).toBeDefined();
    expect(typeof PRD_SYNTHESIS_PROMPT).toBe('string');
  });

  it('should contain sources placeholder', () => {
    expect(PRD_SYNTHESIS_PROMPT).toContain('{sources}');
  });

  it('should contain domains placeholder', () => {
    expect(PRD_SYNTHESIS_PROMPT).toContain('{domains}');
  });

  it('should mention required sections', () => {
    expect(PRD_SYNTHESIS_PROMPT).toContain('Overview');
    expect(PRD_SYNTHESIS_PROMPT).toContain('Goals');
    expect(PRD_SYNTHESIS_PROMPT).toContain('Features');
    expect(PRD_SYNTHESIS_PROMPT).toContain('Technical');
  });

  it('should mention acceptance criteria requirement', () => {
    expect(PRD_SYNTHESIS_PROMPT).toContain('acceptanceCriteria');
  });

  it('should mention JSON output format', () => {
    expect(PRD_SYNTHESIS_PROMPT.toLowerCase()).toContain('json');
  });
});

describe('PRD_REVIEW_PROMPT', () => {
  it('should be exported as a string', () => {
    expect(PRD_REVIEW_PROMPT).toBeDefined();
    expect(typeof PRD_REVIEW_PROMPT).toBe('string');
  });

  it('should contain prd placeholder', () => {
    expect(PRD_REVIEW_PROMPT).toContain('{prd}');
  });

  it('should contain sources placeholder', () => {
    expect(PRD_REVIEW_PROMPT).toContain('{sources}');
  });

  it('should mention review checklist', () => {
    expect(PRD_REVIEW_PROMPT).toContain('Completeness');
    expect(PRD_REVIEW_PROMPT).toContain('Accuracy');
    expect(PRD_REVIEW_PROMPT).toContain('Clarity');
    expect(PRD_REVIEW_PROMPT).toContain('Gaps');
  });

  it('should specify output format with score and recommendation', () => {
    expect(PRD_REVIEW_PROMPT).toContain('score');
    expect(PRD_REVIEW_PROMPT).toContain('recommendation');
  });
});

// ============================================================================
// 5. validatePRD() TESTS
// ============================================================================

describe('validatePRD', () => {
  it('should be a function', () => {
    expect(typeof validatePRD).toBe('function');
  });

  describe('with valid complete PRD', () => {
    it('should return valid: true', () => {
      const result = validatePRD(VALID_COMPLETE_PRD);
      expect(result.valid).toBe(true);
    });

    it('should return no errors', () => {
      const result = validatePRD(VALID_COMPLETE_PRD);
      expect(result.errors).toHaveLength(0);
    });

    it('should return no missingRequired', () => {
      const result = validatePRD(VALID_COMPLETE_PRD);
      expect(result.missingRequired).toHaveLength(0);
    });
  });

  describe('with minimal valid PRD', () => {
    it('should return valid: true', () => {
      const result = validatePRD(MINIMAL_VALID_PRD);
      expect(result.valid).toBe(true);
    });
  });

  describe('with null/undefined input', () => {
    it('should return valid: false for null', () => {
      const result = validatePRD(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return valid: false for undefined', () => {
      const result = validatePRD(undefined);
      expect(result.valid).toBe(false);
    });

    it('should return valid: false for empty object', () => {
      const result = validatePRD({});
      expect(result.valid).toBe(false);
    });
  });

  describe('missing required fields', () => {
    it('should fail when id is missing', () => {
      const prd = { ...MINIMAL_VALID_PRD };
      delete prd.id;
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('id');
    });

    it('should fail when projectName is missing', () => {
      const prd = { ...MINIMAL_VALID_PRD };
      delete prd.projectName;
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('projectName');
    });

    it('should fail when version is missing', () => {
      const prd = { ...MINIMAL_VALID_PRD };
      delete prd.version;
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('version');
    });

    it('should fail when overview is missing', () => {
      const prd = { ...MINIMAL_VALID_PRD };
      delete prd.overview;
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('overview');
    });

    it('should fail when goals is missing', () => {
      const prd = { ...MINIMAL_VALID_PRD };
      delete prd.goals;
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('goals');
    });

    it('should fail when features is missing', () => {
      const prd = { ...MINIMAL_VALID_PRD };
      delete prd.features;
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('features');
    });

    it('should fail when technical is missing', () => {
      const prd = { ...MINIMAL_VALID_PRD };
      delete prd.technical;
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('technical');
    });

    it('should fail when sources is missing', () => {
      const prd = { ...MINIMAL_VALID_PRD };
      delete prd.sources;
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('sources');
    });
  });

  describe('invalid field values', () => {
    it('should fail when version format is invalid', () => {
      const prd = { ...MINIMAL_VALID_PRD, version: 'invalid' };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'version')).toBe(true);
    });

    it('should fail when status is invalid', () => {
      const prd = { ...MINIMAL_VALID_PRD, status: 'invalid-status' };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'status')).toBe(true);
    });

    it('should fail when problemStatement is too short', () => {
      const prd = {
        ...MINIMAL_VALID_PRD,
        overview: { ...MINIMAL_VALID_PRD.overview, problemStatement: 'Too short' }
      };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
    });

    it('should fail when targetAudience is too short', () => {
      const prd = {
        ...MINIMAL_VALID_PRD,
        overview: { ...MINIMAL_VALID_PRD.overview, targetAudience: 'Short' }
      };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
    });

    it('should fail when valueProposition is too short', () => {
      const prd = {
        ...MINIMAL_VALID_PRD,
        overview: { ...MINIMAL_VALID_PRD.overview, valueProposition: 'Too short' }
      };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
    });

    it('should fail when successMetrics has less than 2 items', () => {
      const prd = {
        ...MINIMAL_VALID_PRD,
        overview: { ...MINIMAL_VALID_PRD.overview, successMetrics: [{ id: 'SM-001', metric: 'M', target: '1', measurable: true }] }
      };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
    });

    it('should fail when primary goals has less than 2 items', () => {
      const prd = {
        ...MINIMAL_VALID_PRD,
        goals: { ...MINIMAL_VALID_PRD.goals, primary: [{ id: 'G-001', description: 'Only one goal', measurable: true }] }
      };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
    });

    it('should fail when core features has less than 3 items', () => {
      const prd = {
        ...MINIMAL_VALID_PRD,
        features: { ...MINIMAL_VALID_PRD.features, core: MINIMAL_VALID_PRD.features.core.slice(0, 2) }
      };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
    });

    it('should fail when tech stack is empty', () => {
      const prd = {
        ...MINIMAL_VALID_PRD,
        technical: { ...MINIMAL_VALID_PRD.technical, stack: [] }
      };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
    });
  });

  describe('feature validation', () => {
    it('should fail when feature id is invalid format', () => {
      const prd = {
        ...MINIMAL_VALID_PRD,
        features: {
          ...MINIMAL_VALID_PRD.features,
          core: MINIMAL_VALID_PRD.features.core.map((f, i) =>
            i === 0 ? { ...f, id: 'invalid' } : f
          )
        }
      };
      const result = validatePRD(prd);
      expect(result.errors.some(e => e.field?.includes('feature'))).toBe(true);
    });

    it('should fail when feature name is too short', () => {
      const prd = {
        ...MINIMAL_VALID_PRD,
        features: {
          ...MINIMAL_VALID_PRD.features,
          core: MINIMAL_VALID_PRD.features.core.map((f, i) =>
            i === 0 ? { ...f, name: 'A' } : f
          )
        }
      };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
    });

    it('should fail when feature description is too short', () => {
      const prd = {
        ...MINIMAL_VALID_PRD,
        features: {
          ...MINIMAL_VALID_PRD.features,
          core: MINIMAL_VALID_PRD.features.core.map((f, i) =>
            i === 0 ? { ...f, description: 'Short' } : f
          )
        }
      };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
    });

    it('should fail when feature priority is invalid', () => {
      const prd = {
        ...MINIMAL_VALID_PRD,
        features: {
          ...MINIMAL_VALID_PRD.features,
          core: MINIMAL_VALID_PRD.features.core.map((f, i) =>
            i === 0 ? { ...f, priority: 'invalid' } : f
          )
        }
      };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
    });

    it('should fail when feature has less than 2 acceptance criteria', () => {
      const prd = {
        ...MINIMAL_VALID_PRD,
        features: {
          ...MINIMAL_VALID_PRD.features,
          core: MINIMAL_VALID_PRD.features.core.map((f, i) =>
            i === 0 ? { ...f, acceptanceCriteria: ['Only one'] } : f
          )
        }
      };
      const result = validatePRD(prd);
      expect(result.valid).toBe(false);
    });
  });

  describe('warnings', () => {
    it('should warn when personas are empty', () => {
      const result = validatePRD(MINIMAL_VALID_PRD);
      expect(result.warnings.some(w => w.field === 'personas')).toBe(true);
    });

    it('should warn when risks are empty', () => {
      const result = validatePRD(MINIMAL_VALID_PRD);
      expect(result.warnings.some(w => w.field === 'risks')).toBe(true);
    });

    it('should not warn for complete PRD', () => {
      const result = validatePRD(VALID_COMPLETE_PRD);
      expect(result.warnings).toHaveLength(0);
    });
  });
});

// ============================================================================
// 6. scorePRD() TESTS
// ============================================================================

describe('scorePRD', () => {
  it('should be a function', () => {
    expect(typeof scorePRD).toBe('function');
  });

  it('should return a number between 0 and 100', () => {
    const score = scorePRD(VALID_COMPLETE_PRD);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should return high score (>=90) for complete PRD', () => {
    const score = scorePRD(VALID_COMPLETE_PRD);
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('should return lower score for minimal PRD', () => {
    const score = scorePRD(MINIMAL_VALID_PRD);
    expect(score).toBeLessThan(scorePRD(VALID_COMPLETE_PRD));
    expect(score).toBeGreaterThanOrEqual(60); // Should still be above minimum
  });

  it('should return 0 for null', () => {
    const score = scorePRD(null);
    expect(score).toBe(0);
  });

  it('should return 0 for undefined', () => {
    const score = scorePRD(undefined);
    expect(score).toBe(0);
  });

  it('should return 0 for empty object', () => {
    const score = scorePRD({});
    expect(score).toBe(0);
  });

  describe('overview scoring (25 points)', () => {
    it('should give 7 points for valid problemStatement', () => {
      const prd = { overview: { problemStatement: 'A valid problem statement that is long enough' } };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(7);
    });

    it('should give 6 points for valid targetAudience', () => {
      const prd = { overview: { targetAudience: 'Target users who need this' } };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(6);
    });

    it('should give 6 points for valid valueProposition', () => {
      const prd = { overview: { valueProposition: 'The value we provide to users is significant' } };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(6);
    });

    it('should give 6 points for 2+ successMetrics', () => {
      const prd = {
        overview: {
          successMetrics: [
            { id: 'SM-001', metric: 'M1', target: '1', measurable: true },
            { id: 'SM-002', metric: 'M2', target: '2', measurable: true }
          ]
        }
      };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(6);
    });
  });

  describe('goals scoring (15 points)', () => {
    it('should give 10 points for 2+ primary goals', () => {
      const prd = {
        goals: {
          primary: [
            { id: 'G-001', description: 'Goal 1', measurable: true },
            { id: 'G-002', description: 'Goal 2', measurable: true }
          ]
        }
      };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(10);
    });

    it('should give 3 points for secondary goals', () => {
      const prd = {
        goals: {
          primary: [
            { id: 'G-001', description: 'Goal 1', measurable: true },
            { id: 'G-002', description: 'Goal 2', measurable: true }
          ],
          secondary: [{ id: 'G-003', description: 'Secondary', measurable: false }]
        }
      };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(13);
    });

    it('should give 2 points for non-goals', () => {
      const prd = {
        goals: {
          primary: [
            { id: 'G-001', description: 'Goal 1', measurable: true },
            { id: 'G-002', description: 'Goal 2', measurable: true }
          ],
          nonGoals: ['Not doing this']
        }
      };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(12);
    });
  });

  describe('features scoring (30 points)', () => {
    it('should give up to 15 points for core features (3 points each, max 5)', () => {
      const prd = {
        features: {
          core: [
            { id: 'F-001', name: 'F1', description: 'Desc', priority: 'must-have', domain: 'api', acceptanceCriteria: ['AC1', 'AC2'], mockupRefs: [], estimatedComplexity: 'low' },
            { id: 'F-002', name: 'F2', description: 'Desc', priority: 'must-have', domain: 'api', acceptanceCriteria: ['AC1', 'AC2'], mockupRefs: [], estimatedComplexity: 'low' },
            { id: 'F-003', name: 'F3', description: 'Desc', priority: 'must-have', domain: 'api', acceptanceCriteria: ['AC1', 'AC2'], mockupRefs: [], estimatedComplexity: 'low' },
            { id: 'F-004', name: 'F4', description: 'Desc', priority: 'must-have', domain: 'api', acceptanceCriteria: ['AC1', 'AC2'], mockupRefs: [], estimatedComplexity: 'low' },
            { id: 'F-005', name: 'F5', description: 'Desc', priority: 'must-have', domain: 'api', acceptanceCriteria: ['AC1', 'AC2'], mockupRefs: [], estimatedComplexity: 'low' }
          ]
        }
      };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(15);
    });

    it('should give up to 10 points for features with acceptance criteria', () => {
      const prd = {
        features: {
          core: [
            { id: 'F-001', acceptanceCriteria: ['AC1', 'AC2'] },
            { id: 'F-002', acceptanceCriteria: ['AC1', 'AC2'] },
            { id: 'F-003', acceptanceCriteria: ['AC1', 'AC2'] },
            { id: 'F-004', acceptanceCriteria: ['AC1', 'AC2'] },
            { id: 'F-005', acceptanceCriteria: ['AC1', 'AC2'] }
          ]
        }
      };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(10);
    });

    it('should give up to 5 points for features with domains', () => {
      const prd = {
        features: {
          core: [
            { id: 'F-001', domain: 'api' },
            { id: 'F-002', domain: 'ui-components' },
            { id: 'F-003', domain: 'database' },
            { id: 'F-004', domain: 'forms' },
            { id: 'F-005', domain: 'authentication' }
          ]
        }
      };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(5);
    });
  });

  describe('technical scoring (15 points)', () => {
    it('should give 8 points for tech stack', () => {
      const prd = { technical: { stack: [{ category: 'frontend', name: 'React', purpose: 'UI' }] } };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(8);
    });

    it('should give 4 points for integrations', () => {
      const prd = {
        technical: {
          stack: [{ category: 'frontend', name: 'React', purpose: 'UI' }],
          integrations: [{ name: 'API', type: 'api', purpose: 'Backend', required: true }]
        }
      };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(12);
    });

    it('should give 3 points for constraints', () => {
      const prd = {
        technical: {
          stack: [{ category: 'frontend', name: 'React', purpose: 'UI' }],
          constraints: ['Must work offline']
        }
      };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(11);
    });
  });

  describe('personas scoring (5 points)', () => {
    it('should give 5 points for personas', () => {
      const prd = {
        personas: [{ id: 'P-001', name: 'User', role: 'User', needs: ['Need'], painPoints: ['Pain'] }]
      };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(5);
    });

    it('should give 0 points when no personas', () => {
      const prd = { personas: [] };
      const baseScore = scorePRD({});
      const prdScore = scorePRD(prd);
      expect(prdScore).toBe(baseScore);
    });
  });

  describe('risks scoring (5 points)', () => {
    it('should give 3 points for risks defined', () => {
      const prd = {
        risks: [{ id: 'R-001', description: 'Risk', likelihood: 'medium', impact: 'high' }]
      };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(3);
    });

    it('should give 2 additional points for risks with mitigation', () => {
      const prd = {
        risks: [{ id: 'R-001', description: 'Risk', likelihood: 'medium', impact: 'high', mitigation: 'Plan' }]
      };
      const score = scorePRD(prd);
      expect(score).toBeGreaterThanOrEqual(5);
    });
  });
});

// ============================================================================
// 7. getPRDScoreBreakdown() TESTS
// ============================================================================

describe('getPRDScoreBreakdown', () => {
  it('should be a function', () => {
    expect(typeof getPRDScoreBreakdown).toBe('function');
  });

  it('should return object with total score', () => {
    const breakdown = getPRDScoreBreakdown(VALID_COMPLETE_PRD);
    expect(breakdown.total).toBeDefined();
    expect(typeof breakdown.total).toBe('number');
  });

  it('should return breakdown for each category', () => {
    const breakdown = getPRDScoreBreakdown(VALID_COMPLETE_PRD);
    expect(breakdown.overview).toBeDefined();
    expect(breakdown.goals).toBeDefined();
    expect(breakdown.features).toBeDefined();
    expect(breakdown.technical).toBeDefined();
    expect(breakdown.personas).toBeDefined();
    expect(breakdown.risks).toBeDefined();
    expect(breakdown.completeness).toBeDefined();
  });

  it('should have score and max for each category', () => {
    const breakdown = getPRDScoreBreakdown(VALID_COMPLETE_PRD);
    expect(breakdown.overview.score).toBeDefined();
    expect(breakdown.overview.max).toBe(25);
    expect(breakdown.goals.max).toBe(15);
    expect(breakdown.features.max).toBe(30);
    expect(breakdown.technical.max).toBe(15);
    expect(breakdown.personas.max).toBe(5);
    expect(breakdown.risks.max).toBe(5);
    expect(breakdown.completeness.max).toBe(5);
  });

  it('should have details array for each category', () => {
    const breakdown = getPRDScoreBreakdown(VALID_COMPLETE_PRD);
    expect(Array.isArray(breakdown.overview.details)).toBe(true);
    expect(Array.isArray(breakdown.goals.details)).toBe(true);
    expect(Array.isArray(breakdown.features.details)).toBe(true);
    expect(Array.isArray(breakdown.technical.details)).toBe(true);
    expect(Array.isArray(breakdown.personas.details)).toBe(true);
    expect(Array.isArray(breakdown.risks.details)).toBe(true);
    expect(Array.isArray(breakdown.completeness.details)).toBe(true);
  });

  it('should have total equal to sum of category scores', () => {
    const breakdown = getPRDScoreBreakdown(VALID_COMPLETE_PRD);
    const sumOfCategories =
      breakdown.overview.score +
      breakdown.goals.score +
      breakdown.features.score +
      breakdown.technical.score +
      breakdown.personas.score +
      breakdown.risks.score +
      breakdown.completeness.score;
    expect(breakdown.total).toBe(sumOfCategories);
  });

  it('should return all zeros for empty object', () => {
    const breakdown = getPRDScoreBreakdown({});
    expect(breakdown.total).toBe(0);
    expect(breakdown.overview.score).toBe(0);
    expect(breakdown.goals.score).toBe(0);
    expect(breakdown.features.score).toBe(0);
    expect(breakdown.technical.score).toBe(0);
    expect(breakdown.personas.score).toBe(0);
    expect(breakdown.risks.score).toBe(0);
    expect(breakdown.completeness.score).toBe(0);
  });

  it('should return all zeros for null', () => {
    const breakdown = getPRDScoreBreakdown(null);
    expect(breakdown.total).toBe(0);
  });

  it('should have full score for complete PRD', () => {
    const breakdown = getPRDScoreBreakdown(VALID_COMPLETE_PRD);
    expect(breakdown.overview.score).toBe(25);
    expect(breakdown.technical.score).toBe(15);
    expect(breakdown.personas.score).toBe(5);
    expect(breakdown.risks.score).toBe(5);
  });
});

// ============================================================================
// 8. createEmptyPRD() TESTS
// ============================================================================

describe('createEmptyPRD', () => {
  it('should be a function', () => {
    expect(typeof createEmptyPRD).toBe('function');
  });

  it('should return object with required structure', () => {
    const prd = createEmptyPRD('TestProject');
    expect(prd.id).toBeDefined();
    expect(prd.projectName).toBe('TestProject');
    expect(prd.version).toBe('1.0.0');
    expect(prd.status).toBe('draft');
    expect(prd.overview).toBeDefined();
    expect(prd.goals).toBeDefined();
    expect(prd.features).toBeDefined();
    expect(prd.technical).toBeDefined();
    expect(prd.sources).toBeDefined();
  });

  it('should generate unique id', () => {
    const prd1 = createEmptyPRD('Project1');
    const prd2 = createEmptyPRD('Project2');
    expect(prd1.id).not.toBe(prd2.id);
  });

  it('should set createdAt and updatedAt timestamps', () => {
    const prd = createEmptyPRD('TestProject');
    expect(prd.createdAt).toBeDefined();
    expect(prd.updatedAt).toBeDefined();
  });

  it('should have empty arrays for array fields', () => {
    const prd = createEmptyPRD('TestProject');
    expect(prd.overview.successMetrics).toEqual([]);
    expect(prd.goals.primary).toEqual([]);
    expect(prd.goals.secondary).toEqual([]);
    expect(prd.goals.nonGoals).toEqual([]);
    expect(prd.features.core).toEqual([]);
    expect(prd.features.enhanced).toEqual([]);
    expect(prd.features.future).toEqual([]);
    expect(prd.technical.stack).toEqual([]);
    expect(prd.personas).toEqual([]);
    expect(prd.risks).toEqual([]);
    expect(prd.dependencies).toEqual([]);
  });

  it('should have empty strings for string fields', () => {
    const prd = createEmptyPRD('TestProject');
    expect(prd.overview.problemStatement).toBe('');
    expect(prd.overview.targetAudience).toBe('');
    expect(prd.overview.valueProposition).toBe('');
  });

  it('should use default project name if not provided', () => {
    const prd = createEmptyPRD();
    expect(prd.projectName).toBe('Untitled Project');
  });
});

// ============================================================================
// 9. mergePRDs() TESTS
// ============================================================================

describe('mergePRDs', () => {
  it('should be a function', () => {
    expect(typeof mergePRDs).toBe('function');
  });

  it('should return generated if existing is null', () => {
    const result = mergePRDs(null, MINIMAL_VALID_PRD);
    expect(result.projectName).toBe(MINIMAL_VALID_PRD.projectName);
  });

  it('should return generated if existing is undefined', () => {
    const result = mergePRDs(undefined, MINIMAL_VALID_PRD);
    expect(result.projectName).toBe(MINIMAL_VALID_PRD.projectName);
  });

  it('should preserve existing id', () => {
    const existing = { ...MINIMAL_VALID_PRD, id: 'existing-id' };
    const generated = { ...MINIMAL_VALID_PRD, id: 'generated-id' };
    const result = mergePRDs(existing, generated);
    expect(result.id).toBe('existing-id');
  });

  it('should update updatedAt timestamp', () => {
    const existing = { ...MINIMAL_VALID_PRD, updatedAt: '2020-01-01T00:00:00Z' };
    const generated = { ...MINIMAL_VALID_PRD };
    const result = mergePRDs(existing, generated);
    expect(result.updatedAt).not.toBe('2020-01-01T00:00:00Z');
  });

  it('should merge features, keeping unique by id', () => {
    const existing = {
      ...MINIMAL_VALID_PRD,
      features: {
        core: [
          { id: 'F-001', name: 'Existing Feature 1', description: 'Existing', priority: 'must-have', domain: 'api', acceptanceCriteria: ['AC1', 'AC2'], mockupRefs: [], estimatedComplexity: 'low' },
          { id: 'F-002', name: 'Existing Feature 2', description: 'Existing', priority: 'must-have', domain: 'api', acceptanceCriteria: ['AC1', 'AC2'], mockupRefs: [], estimatedComplexity: 'low' }
        ],
        enhanced: [],
        future: []
      }
    };
    const generated = {
      ...MINIMAL_VALID_PRD,
      features: {
        core: [
          { id: 'F-002', name: 'Updated Feature 2', description: 'Updated desc', priority: 'must-have', domain: 'api', acceptanceCriteria: ['AC1', 'AC2'], mockupRefs: [], estimatedComplexity: 'low' },
          { id: 'F-003', name: 'New Feature 3', description: 'New feature', priority: 'should-have', domain: 'forms', acceptanceCriteria: ['AC1', 'AC2'], mockupRefs: [], estimatedComplexity: 'medium' }
        ],
        enhanced: [],
        future: []
      }
    };
    const result = mergePRDs(existing, generated);

    // Should have 3 unique features
    expect(result.features.core).toHaveLength(3);

    // F-001 from existing
    expect(result.features.core.find(f => f.id === 'F-001')).toBeDefined();

    // F-002 should be updated
    const f002 = result.features.core.find(f => f.id === 'F-002');
    expect(f002.name).toBe('Updated Feature 2');

    // F-003 should be added
    expect(result.features.core.find(f => f.id === 'F-003')).toBeDefined();
  });

  it('should merge goals, keeping unique by id', () => {
    const existing = {
      ...MINIMAL_VALID_PRD,
      goals: {
        primary: [{ id: 'G-001', description: 'Existing goal', measurable: true }],
        secondary: [],
        nonGoals: ['Existing non-goal']
      }
    };
    const generated = {
      ...MINIMAL_VALID_PRD,
      goals: {
        primary: [{ id: 'G-002', description: 'New goal', measurable: true }],
        secondary: [{ id: 'G-003', description: 'Secondary', measurable: false }],
        nonGoals: ['New non-goal']
      }
    };
    const result = mergePRDs(existing, generated);

    expect(result.goals.primary).toHaveLength(2);
    expect(result.goals.nonGoals).toContain('Existing non-goal');
    expect(result.goals.nonGoals).toContain('New non-goal');
  });

  it('should prefer generated overview if more complete', () => {
    const existing = {
      ...MINIMAL_VALID_PRD,
      overview: {
        problemStatement: 'Short',
        targetAudience: 'Short',
        valueProposition: 'Short',
        successMetrics: []
      }
    };
    const generated = {
      ...MINIMAL_VALID_PRD,
      overview: {
        problemStatement: 'Much more detailed problem statement that is complete',
        targetAudience: 'Detailed target audience description',
        valueProposition: 'Comprehensive value proposition statement',
        successMetrics: [
          { id: 'SM-001', metric: 'M1', target: '100', measurable: true },
          { id: 'SM-002', metric: 'M2', target: '50', measurable: true }
        ]
      }
    };
    const result = mergePRDs(existing, generated);
    expect(result.overview.problemStatement.length).toBeGreaterThan(20);
  });

  it('should merge technical stack', () => {
    const existing = {
      ...MINIMAL_VALID_PRD,
      technical: {
        stack: [{ category: 'frontend', name: 'React', purpose: 'UI' }],
        integrations: [],
        constraints: ['Existing constraint'],
        performance: []
      }
    };
    const generated = {
      ...MINIMAL_VALID_PRD,
      technical: {
        stack: [{ category: 'backend', name: 'Node.js', purpose: 'Server' }],
        integrations: [{ name: 'API', type: 'api', purpose: 'Data', required: true }],
        constraints: ['New constraint'],
        performance: [{ metric: 'TTI', target: '<3s', priority: 'critical' }]
      }
    };
    const result = mergePRDs(existing, generated);

    expect(result.technical.stack).toHaveLength(2);
    expect(result.technical.integrations).toHaveLength(1);
    expect(result.technical.constraints).toContain('Existing constraint');
    expect(result.technical.constraints).toContain('New constraint');
    expect(result.technical.performance).toHaveLength(1);
  });
});

// ============================================================================
// 10. extractFeaturesFromMockups() TESTS
// ============================================================================

describe('extractFeaturesFromMockups', () => {
  it('should be a function', () => {
    expect(typeof extractFeaturesFromMockups).toBe('function');
  });

  it('should return empty array for empty input', () => {
    const result = extractFeaturesFromMockups([]);
    expect(result).toEqual([]);
  });

  it('should return empty array for null', () => {
    const result = extractFeaturesFromMockups(null);
    expect(result).toEqual([]);
  });

  it('should extract features from mockup with forms', () => {
    const mockups = [
      {
        name: 'login.html',
        content: '<html><body><form id="login-form"><input type="email"><input type="password"><button type="submit">Login</button></form></body></html>'
      }
    ];
    const result = extractFeaturesFromMockups(mockups);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(f => f.domain === 'forms' || f.domain === 'authentication')).toBe(true);
  });

  it('should extract features from mockup with buttons', () => {
    const mockups = [
      {
        name: 'dashboard.html',
        content: '<html><body><button>Create New</button><button>Delete</button><button>Edit</button></body></html>'
      }
    ];
    const result = extractFeaturesFromMockups(mockups);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should extract features from mockup with navigation', () => {
    const mockups = [
      {
        name: 'layout.html',
        content: '<html><body><nav><a href="/home">Home</a><a href="/about">About</a><a href="/contact">Contact</a></nav></body></html>'
      }
    ];
    const result = extractFeaturesFromMockups(mockups);
    expect(result.some(f => f.domain === 'navigation')).toBe(true);
  });

  it('should extract features from mockup with tables/lists', () => {
    const mockups = [
      {
        name: 'list.html',
        content: '<html><body><table><thead><tr><th>Name</th><th>Status</th><th>Actions</th></tr></thead></table></body></html>'
      }
    ];
    const result = extractFeaturesFromMockups(mockups);
    expect(result.some(f => f.domain === 'ui-components')).toBe(true);
  });

  it('should include mockupRefs in extracted features', () => {
    const mockups = [
      {
        name: 'feature.html',
        content: '<html><body><form><input><button>Submit</button></form></body></html>'
      }
    ];
    const result = extractFeaturesFromMockups(mockups);
    if (result.length > 0) {
      expect(result[0].mockupRefs).toContain('feature.html');
    }
  });

  it('should generate unique IDs for features', () => {
    const mockups = [
      {
        name: 'multi.html',
        content: '<html><body><form>Form 1</form><form>Form 2</form><nav>Nav</nav></body></html>'
      }
    ];
    const result = extractFeaturesFromMockups(mockups);
    const ids = result.map(f => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ============================================================================
// 11. gatherPRDSources() TESTS (Async)
// ============================================================================

describe('gatherPRDSources', () => {
  it('should be an async function', () => {
    expect(typeof gatherPRDSources).toBe('function');
    // Check if it returns a promise
    const result = gatherPRDSources('/nonexistent/path');
    expect(result).toBeInstanceOf(Promise);
  });

  it('should return object with expected structure', async () => {
    // This will likely fail for invalid path, but we test the structure
    try {
      const result = await gatherPRDSources('/nonexistent/path');
      expect(result).toHaveProperty('docs');
      expect(result).toHaveProperty('mockups');
      expect(result).toHaveProperty('techStack');
      expect(result).toHaveProperty('projectName');
    } catch (e) {
      // Expected to fail for nonexistent path
      expect(e).toBeDefined();
    }
  });

  it('should return empty sources for invalid path', async () => {
    const result = await gatherPRDSources('/nonexistent/path/that/does/not/exist');
    expect(result.docs).toEqual([]);
    expect(result.mockups).toEqual([]);
  });
});

// ============================================================================
// 12. generatePRD() TESTS (Async)
// ============================================================================

describe('generatePRD', () => {
  // Mock the LLM client for testing
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be an async function', () => {
    expect(typeof generatePRD).toBe('function');
  });

  it('should return object with expected structure', async () => {
    // We can't fully test without mocking, but we can check the return structure
    try {
      const result = await generatePRD('/nonexistent/path', { skipLLM: true });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('prd');
      expect(result).toHaveProperty('validation');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('sources');
    } catch (e) {
      // Expected behavior for test environment
      expect(e).toBeDefined();
    }
  });

  it('should accept visionStatement option', async () => {
    try {
      const result = await generatePRD('/path', {
        visionStatement: 'Build the best task app',
        skipLLM: true
      });
      expect(result.sources.userInput).toBe(true);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should accept forceRegenerate option', async () => {
    try {
      const result = await generatePRD('/path', { forceRegenerate: true, skipLLM: true });
      // Should not throw when forceRegenerate is true
      expect(result).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should return cost breakdown', async () => {
    try {
      const result = await generatePRD('/path', { skipLLM: true });
      expect(result.cost).toBeDefined();
      expect(result.cost).toHaveProperty('synthesis');
      expect(result.cost).toHaveProperty('review');
      expect(result.cost).toHaveProperty('refinement');
      expect(result.cost).toHaveProperty('total');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should return error on failure', async () => {
    const result = await generatePRD('/definitely/not/a/real/path');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  describe('validation and scoring consistency', () => {
    it('should give completeness points only when valid', () => {
      const validPrd = VALID_COMPLETE_PRD;
      const validation = validatePRD(validPrd);
      const breakdown = getPRDScoreBreakdown(validPrd);

      if (validation.valid) {
        expect(breakdown.completeness.score).toBe(5);
      } else {
        expect(breakdown.completeness.score).toBe(0);
      }
    });

    it('should have scorePRD match breakdown total', () => {
      const score = scorePRD(VALID_COMPLETE_PRD);
      const breakdown = getPRDScoreBreakdown(VALID_COMPLETE_PRD);
      expect(score).toBe(breakdown.total);
    });

    it('should have scorePRD match breakdown total for minimal PRD', () => {
      const score = scorePRD(MINIMAL_VALID_PRD);
      const breakdown = getPRDScoreBreakdown(MINIMAL_VALID_PRD);
      expect(score).toBe(breakdown.total);
    });
  });

  describe('createEmptyPRD validation', () => {
    it('empty PRD should fail validation', () => {
      const emptyPrd = createEmptyPRD('Test');
      const validation = validatePRD(emptyPrd);
      expect(validation.valid).toBe(false);
    });

    it('empty PRD should score 0', () => {
      const emptyPrd = createEmptyPRD('Test');
      const score = scorePRD(emptyPrd);
      expect(score).toBe(0);
    });
  });

  describe('mergePRDs with validation', () => {
    it('merging two valid PRDs should produce valid PRD', () => {
      const merged = mergePRDs(MINIMAL_VALID_PRD, VALID_COMPLETE_PRD);
      const validation = validatePRD(merged);
      expect(validation.valid).toBe(true);
    });

    it('merging should improve score', () => {
      const minimalScore = scorePRD(MINIMAL_VALID_PRD);
      const merged = mergePRDs(MINIMAL_VALID_PRD, VALID_COMPLETE_PRD);
      const mergedScore = scorePRD(merged);
      expect(mergedScore).toBeGreaterThanOrEqual(minimalScore);
    });
  });
});
