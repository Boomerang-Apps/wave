/**
 * Alignment Checker - TDD Test Suite
 *
 * These tests are written BEFORE implementation following TDD.
 * All tests MUST FAIL initially (file doesn't exist).
 *
 * Test Categories:
 * 1. Constants (ALIGNMENT_THRESHOLDS, UI_DOMAINS)
 * 2. checkAlignment() - Main alignment check
 * 3. checkPRDStoriesAlignment() - PRD ↔ Stories
 * 4. checkStoryMockupsAlignment() - Stories ↔ Mockups
 * 5. checkPRDMockupsAlignment() - PRD ↔ Mockups
 * 6. Helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// This import will FAIL until alignment-checker.js is created
import {
  // Constants
  ALIGNMENT_THRESHOLDS,
  UI_DOMAINS,

  // Main Functions
  checkAlignment,
  checkPRDStoriesAlignment,
  checkStoryMockupsAlignment,
  checkPRDMockupsAlignment,

  // Helper Functions
  findStoryForFeature,
  isUIRelatedStory,
  validateMockupRef,
  generateRecommendations,
  calculateCoveragePercentage
} from '../utils/alignment-checker.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const SAMPLE_PRD = {
  id: 'prd-001',
  projectName: 'TestApp',
  features: {
    core: [
      {
        id: 'F-001',
        name: 'User Login',
        description: 'Users can log in',
        domain: 'authentication',
        priority: 'must-have',
        mockupRefs: ['login.html']
      },
      {
        id: 'F-002',
        name: 'Dashboard',
        description: 'User dashboard view',
        domain: 'ui-components',
        priority: 'must-have',
        mockupRefs: ['dashboard.html']
      },
      {
        id: 'F-003',
        name: 'API Endpoints',
        description: 'REST API',
        domain: 'api',
        priority: 'should-have',
        mockupRefs: []
      }
    ],
    enhanced: [],
    future: []
  }
};

const SAMPLE_STORIES = [
  {
    id: 'WAVE-001-AUTH-001',
    title: 'Implement User Login',
    domain: 'authentication',
    priority: 'high',
    mockupRefs: [{ file: 'login.html', elements: [] }]
  },
  {
    id: 'WAVE-001-UICO-002',
    title: 'Build Dashboard UI',
    domain: 'ui-components',
    priority: 'high',
    mockupRefs: [{ file: 'dashboard.html', elements: [] }]
  }
];

const SAMPLE_MOCKUPS = [
  { name: 'login.html', content: '<html><body><form>Login Form</form></body></html>' },
  { name: 'dashboard.html', content: '<html><body><div>Dashboard</div></body></html>' },
  { name: 'unused.html', content: '<html><body>Unused</body></html>' }
];

const ALIGNED_PRD = {
  features: {
    core: [
      { id: 'F-001', name: 'Login', domain: 'authentication', priority: 'must-have' },
      { id: 'F-002', name: 'Dashboard', domain: 'ui-components', priority: 'must-have' }
    ]
  }
};

const ALIGNED_STORIES = [
  {
    id: 'WAVE-001-AUTH-001',
    title: 'Login Feature',
    domain: 'authentication',
    priority: 'high',
    mockupRefs: []
  },
  {
    id: 'WAVE-001-UICO-002',
    title: 'Dashboard Feature',
    domain: 'ui-components',
    priority: 'high',
    mockupRefs: [{ file: 'dashboard.html', elements: [] }]
  }
];

const ALIGNED_MOCKUPS = [
  { name: 'dashboard.html', content: '<html>Dashboard</html>' }
];

// ============================================================================
// 1. CONSTANTS TESTS
// ============================================================================

describe('ALIGNMENT_THRESHOLDS', () => {
  it('should be exported', () => {
    expect(ALIGNMENT_THRESHOLDS).toBeDefined();
  });

  it('should have excellent threshold at 90', () => {
    expect(ALIGNMENT_THRESHOLDS.excellent).toBe(90);
  });

  it('should have good threshold at 80', () => {
    expect(ALIGNMENT_THRESHOLDS.good).toBe(80);
  });

  it('should have acceptable threshold at 70', () => {
    expect(ALIGNMENT_THRESHOLDS.acceptable).toBe(70);
  });

  it('should have poor threshold at 50', () => {
    expect(ALIGNMENT_THRESHOLDS.poor).toBe(50);
  });

  it('should have failing threshold at 0', () => {
    expect(ALIGNMENT_THRESHOLDS.failing).toBe(0);
  });
});

describe('UI_DOMAINS', () => {
  it('should be exported as array', () => {
    expect(UI_DOMAINS).toBeDefined();
    expect(Array.isArray(UI_DOMAINS)).toBe(true);
  });

  it('should contain ui-components', () => {
    expect(UI_DOMAINS).toContain('ui-components');
  });

  it('should contain forms', () => {
    expect(UI_DOMAINS).toContain('forms');
  });

  it('should contain navigation', () => {
    expect(UI_DOMAINS).toContain('navigation');
  });
});

// ============================================================================
// 2. checkAlignment() TESTS
// ============================================================================

describe('checkAlignment', () => {
  it('should be an async function', () => {
    expect(typeof checkAlignment).toBe('function');
  });

  it('should return AlignmentReport structure', async () => {
    const result = await checkAlignment(SAMPLE_PRD, SAMPLE_STORIES, '/test/path');
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('scores');
    expect(result).toHaveProperty('coverage');
    expect(result).toHaveProperty('gaps');
    expect(result).toHaveProperty('recommendations');
  });

  it('should return score between 0 and 100', async () => {
    const result = await checkAlignment(SAMPLE_PRD, SAMPLE_STORIES, '/test/path');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('should have scores breakdown', async () => {
    const result = await checkAlignment(SAMPLE_PRD, SAMPLE_STORIES, '/test/path');
    expect(result.scores).toHaveProperty('prdStories');
    expect(result.scores).toHaveProperty('storyMockups');
    expect(result.scores).toHaveProperty('prdMockups');
  });

  it('should have coverage stats', async () => {
    const result = await checkAlignment(SAMPLE_PRD, SAMPLE_STORIES, '/test/path');
    expect(result.coverage).toHaveProperty('featuresWithStories');
    expect(result.coverage).toHaveProperty('totalFeatures');
    expect(result.coverage).toHaveProperty('featureCoverage');
  });

  it('should have gaps structure', async () => {
    const result = await checkAlignment(SAMPLE_PRD, SAMPLE_STORIES, '/test/path');
    expect(result.gaps).toHaveProperty('featuresWithoutStories');
    expect(result.gaps).toHaveProperty('storiesWithoutFeatures');
    expect(result.gaps).toHaveProperty('uiStoriesWithoutMockups');
  });

  it('should return valid: false for null PRD', async () => {
    const result = await checkAlignment(null, SAMPLE_STORIES, '/test/path');
    expect(result.valid).toBe(false);
    expect(result.score).toBe(0);
  });

  it('should return valid: false for null stories', async () => {
    const result = await checkAlignment(SAMPLE_PRD, null, '/test/path');
    expect(result.valid).toBe(false);
  });

  it('should return valid: true for well-aligned data', async () => {
    const result = await checkAlignment(ALIGNED_PRD, ALIGNED_STORIES, '/test/path');
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });
});

// ============================================================================
// 3. checkPRDStoriesAlignment() TESTS
// ============================================================================

describe('checkPRDStoriesAlignment', () => {
  it('should be a function', () => {
    expect(typeof checkPRDStoriesAlignment).toBe('function');
  });

  it('should return object with score', () => {
    const result = checkPRDStoriesAlignment(SAMPLE_PRD, SAMPLE_STORIES);
    expect(result).toHaveProperty('score');
    expect(typeof result.score).toBe('number');
  });

  it('should identify features with stories', () => {
    const result = checkPRDStoriesAlignment(SAMPLE_PRD, SAMPLE_STORIES);
    expect(result).toHaveProperty('featuresWithStories');
    expect(Array.isArray(result.featuresWithStories)).toBe(true);
  });

  it('should identify features without stories', () => {
    const result = checkPRDStoriesAlignment(SAMPLE_PRD, SAMPLE_STORIES);
    expect(result).toHaveProperty('featuresWithoutStories');
    // F-003 (API) has no story
    expect(result.featuresWithoutStories.length).toBeGreaterThan(0);
  });

  it('should detect orphan stories', () => {
    const orphanStories = [
      ...SAMPLE_STORIES,
      { id: 'WAVE-001-ORPH-999', title: 'Orphan', domain: 'settings', priority: 'low', mockupRefs: [] }
    ];
    const result = checkPRDStoriesAlignment(SAMPLE_PRD, orphanStories);
    expect(result.storiesWithoutFeatures.length).toBeGreaterThan(0);
  });

  it('should detect domain mismatches', () => {
    const mismatchedStories = [
      { id: 'WAVE-001-AUTH-001', title: 'Login', domain: 'forms', priority: 'high', mockupRefs: [] }
    ];
    const result = checkPRDStoriesAlignment(SAMPLE_PRD, mismatchedStories);
    expect(result.domainMismatches.length).toBeGreaterThan(0);
  });

  it('should detect priority mismatches', () => {
    const mismatchedStories = [
      { id: 'WAVE-001-AUTH-001', title: 'Login', domain: 'authentication', priority: 'low', mockupRefs: [] }
    ];
    const result = checkPRDStoriesAlignment(SAMPLE_PRD, mismatchedStories);
    expect(result.priorityMismatches.length).toBeGreaterThan(0);
  });

  it('should return max score (50) for full alignment', () => {
    const result = checkPRDStoriesAlignment(ALIGNED_PRD, ALIGNED_STORIES);
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it('should handle empty stories array', () => {
    const result = checkPRDStoriesAlignment(SAMPLE_PRD, []);
    expect(result.score).toBe(0);
    expect(result.featuresWithoutStories.length).toBe(3);
  });

  it('should handle null PRD', () => {
    const result = checkPRDStoriesAlignment(null, SAMPLE_STORIES);
    expect(result.score).toBe(0);
  });
});

// ============================================================================
// 4. checkStoryMockupsAlignment() TESTS
// ============================================================================

describe('checkStoryMockupsAlignment', () => {
  it('should be a function', () => {
    expect(typeof checkStoryMockupsAlignment).toBe('function');
  });

  it('should return object with score', () => {
    const result = checkStoryMockupsAlignment(SAMPLE_STORIES, SAMPLE_MOCKUPS);
    expect(result).toHaveProperty('score');
    expect(typeof result.score).toBe('number');
  });

  it('should identify UI stories with mockups', () => {
    const result = checkStoryMockupsAlignment(SAMPLE_STORIES, SAMPLE_MOCKUPS);
    expect(result).toHaveProperty('uiStoriesWithMockups');
    expect(Array.isArray(result.uiStoriesWithMockups)).toBe(true);
  });

  it('should identify UI stories without mockups', () => {
    const storiesNoMockups = [
      { id: 'WAVE-001-UICO-001', title: 'UI Story', domain: 'ui-components', priority: 'high', mockupRefs: [] }
    ];
    const result = checkStoryMockupsAlignment(storiesNoMockups, SAMPLE_MOCKUPS);
    expect(result.uiStoriesWithoutMockups.length).toBeGreaterThan(0);
  });

  it('should identify missing mockup refs', () => {
    const storiesWithMissingRefs = [
      { id: 'WAVE-001-UICO-001', title: 'UI Story', domain: 'ui-components', priority: 'high', mockupRefs: [{ file: 'nonexistent.html', elements: [] }] }
    ];
    const result = checkStoryMockupsAlignment(storiesWithMissingRefs, SAMPLE_MOCKUPS);
    expect(result.missingMockupRefs.length).toBeGreaterThan(0);
  });

  it('should identify orphan mockups', () => {
    const result = checkStoryMockupsAlignment(SAMPLE_STORIES, SAMPLE_MOCKUPS);
    expect(result).toHaveProperty('orphanMockups');
    // unused.html is not referenced
    expect(result.orphanMockups).toContain('unused.html');
  });

  it('should not flag non-UI stories for mockup refs', () => {
    const apiStories = [
      { id: 'WAVE-001-API-001', title: 'API Story', domain: 'api', priority: 'high', mockupRefs: [] }
    ];
    const result = checkStoryMockupsAlignment(apiStories, SAMPLE_MOCKUPS);
    expect(result.uiStoriesWithoutMockups.length).toBe(0);
  });

  it('should return max score (30) when all UI stories have valid mockups', () => {
    const result = checkStoryMockupsAlignment(ALIGNED_STORIES, ALIGNED_MOCKUPS);
    expect(result.score).toBeGreaterThanOrEqual(20);
  });

  it('should handle empty stories array', () => {
    const result = checkStoryMockupsAlignment([], SAMPLE_MOCKUPS);
    expect(result.score).toBe(0);
  });

  it('should handle empty mockups array', () => {
    const result = checkStoryMockupsAlignment(SAMPLE_STORIES, []);
    expect(result.missingMockupRefs.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 5. checkPRDMockupsAlignment() TESTS
// ============================================================================

describe('checkPRDMockupsAlignment', () => {
  it('should be a function', () => {
    expect(typeof checkPRDMockupsAlignment).toBe('function');
  });

  it('should return object with score', () => {
    const result = checkPRDMockupsAlignment(SAMPLE_PRD, SAMPLE_MOCKUPS);
    expect(result).toHaveProperty('score');
    expect(typeof result.score).toBe('number');
  });

  it('should identify features visible in mockups', () => {
    const result = checkPRDMockupsAlignment(SAMPLE_PRD, SAMPLE_MOCKUPS);
    expect(result).toHaveProperty('featuresInMockups');
    expect(Array.isArray(result.featuresInMockups)).toBe(true);
  });

  it('should identify features not in mockups', () => {
    const result = checkPRDMockupsAlignment(SAMPLE_PRD, SAMPLE_MOCKUPS);
    expect(result).toHaveProperty('featuresNotInMockups');
  });

  it('should identify orphan mockups', () => {
    const result = checkPRDMockupsAlignment(SAMPLE_PRD, SAMPLE_MOCKUPS);
    expect(result).toHaveProperty('orphanMockups');
  });

  it('should handle null PRD', () => {
    const result = checkPRDMockupsAlignment(null, SAMPLE_MOCKUPS);
    expect(result.score).toBe(0);
  });

  it('should handle empty mockups', () => {
    const result = checkPRDMockupsAlignment(SAMPLE_PRD, []);
    expect(result.score).toBe(0);
  });
});

// ============================================================================
// 6. HELPER FUNCTIONS TESTS
// ============================================================================

describe('findStoryForFeature', () => {
  it('should be a function', () => {
    expect(typeof findStoryForFeature).toBe('function');
  });

  it('should find story matching feature by name keyword', () => {
    const feature = { id: 'F-001', name: 'Login', domain: 'authentication' };
    const story = findStoryForFeature(feature, SAMPLE_STORIES);
    expect(story).toBeDefined();
    expect(story.domain).toBe('authentication');
  });

  it('should find story matching feature by domain', () => {
    const feature = { id: 'F-002', name: 'Dashboard', domain: 'ui-components' };
    const story = findStoryForFeature(feature, SAMPLE_STORIES);
    expect(story).toBeDefined();
    expect(story.domain).toBe('ui-components');
  });

  it('should return null if no matching story', () => {
    const feature = { id: 'F-999', name: 'Unknown', domain: 'payments' };
    const story = findStoryForFeature(feature, SAMPLE_STORIES);
    expect(story).toBeNull();
  });

  it('should handle empty stories array', () => {
    const feature = { id: 'F-001', name: 'Login', domain: 'authentication' };
    const story = findStoryForFeature(feature, []);
    expect(story).toBeNull();
  });
});

describe('isUIRelatedStory', () => {
  it('should be a function', () => {
    expect(typeof isUIRelatedStory).toBe('function');
  });

  it('should return true for ui-components domain', () => {
    const story = { domain: 'ui-components' };
    expect(isUIRelatedStory(story)).toBe(true);
  });

  it('should return true for forms domain', () => {
    const story = { domain: 'forms' };
    expect(isUIRelatedStory(story)).toBe(true);
  });

  it('should return true for navigation domain', () => {
    const story = { domain: 'navigation' };
    expect(isUIRelatedStory(story)).toBe(true);
  });

  it('should return false for api domain', () => {
    const story = { domain: 'api' };
    expect(isUIRelatedStory(story)).toBe(false);
  });

  it('should return false for authentication domain', () => {
    const story = { domain: 'authentication' };
    expect(isUIRelatedStory(story)).toBe(false);
  });

  it('should return false for null story', () => {
    expect(isUIRelatedStory(null)).toBe(false);
  });
});

describe('validateMockupRef', () => {
  it('should be a function', () => {
    expect(typeof validateMockupRef).toBe('function');
  });

  it('should return true for existing mockup', () => {
    const ref = { file: 'login.html', elements: [] };
    expect(validateMockupRef(ref, SAMPLE_MOCKUPS)).toBe(true);
  });

  it('should return false for non-existing mockup', () => {
    const ref = { file: 'nonexistent.html', elements: [] };
    expect(validateMockupRef(ref, SAMPLE_MOCKUPS)).toBe(false);
  });

  it('should handle string ref', () => {
    expect(validateMockupRef('login.html', SAMPLE_MOCKUPS)).toBe(true);
  });

  it('should return false for empty mockups array', () => {
    const ref = { file: 'login.html', elements: [] };
    expect(validateMockupRef(ref, [])).toBe(false);
  });

  it('should return false for null ref', () => {
    expect(validateMockupRef(null, SAMPLE_MOCKUPS)).toBe(false);
  });
});

describe('generateRecommendations', () => {
  it('should be a function', () => {
    expect(typeof generateRecommendations).toBe('function');
  });

  it('should generate create_story recommendation for missing stories', () => {
    const gaps = {
      featuresWithoutStories: [{ featureId: 'F-001', featureName: 'Login', domain: 'auth', priority: 'must-have' }],
      storiesWithoutFeatures: [],
      uiStoriesWithoutMockups: [],
      missingMockupRefs: [],
      domainMismatches: [],
      priorityMismatches: []
    };
    const recommendations = generateRecommendations(gaps);
    expect(recommendations.some(r => r.type === 'create_story')).toBe(true);
  });

  it('should generate add_mockup_ref recommendation for UI stories', () => {
    const gaps = {
      featuresWithoutStories: [],
      storiesWithoutFeatures: [],
      uiStoriesWithoutMockups: [{ storyId: 'WAVE-001-UICO-001', title: 'UI Story', domain: 'ui-components' }],
      missingMockupRefs: [],
      domainMismatches: [],
      priorityMismatches: []
    };
    const recommendations = generateRecommendations(gaps);
    expect(recommendations.some(r => r.type === 'add_mockup_ref')).toBe(true);
  });

  it('should generate fix_domain recommendation for mismatches', () => {
    const gaps = {
      featuresWithoutStories: [],
      storiesWithoutFeatures: [],
      uiStoriesWithoutMockups: [],
      missingMockupRefs: [],
      domainMismatches: [{ featureId: 'F-001', storyId: 'S-001', featureDomain: 'auth', storyDomain: 'forms' }],
      priorityMismatches: []
    };
    const recommendations = generateRecommendations(gaps);
    expect(recommendations.some(r => r.type === 'fix_domain')).toBe(true);
  });

  it('should return empty array for no gaps', () => {
    const gaps = {
      featuresWithoutStories: [],
      storiesWithoutFeatures: [],
      uiStoriesWithoutMockups: [],
      missingMockupRefs: [],
      domainMismatches: [],
      priorityMismatches: []
    };
    const recommendations = generateRecommendations(gaps);
    expect(recommendations).toHaveLength(0);
  });

  it('should prioritize high for must-have features', () => {
    const gaps = {
      featuresWithoutStories: [{ featureId: 'F-001', featureName: 'Login', domain: 'auth', priority: 'must-have' }],
      storiesWithoutFeatures: [],
      uiStoriesWithoutMockups: [],
      missingMockupRefs: [],
      domainMismatches: [],
      priorityMismatches: []
    };
    const recommendations = generateRecommendations(gaps);
    expect(recommendations[0].priority).toBe('high');
  });
});

describe('calculateCoveragePercentage', () => {
  it('should be a function', () => {
    expect(typeof calculateCoveragePercentage).toBe('function');
  });

  it('should return 100 for full coverage', () => {
    expect(calculateCoveragePercentage(10, 10)).toBe(100);
  });

  it('should return 50 for half coverage', () => {
    expect(calculateCoveragePercentage(5, 10)).toBe(50);
  });

  it('should return 0 for no coverage', () => {
    expect(calculateCoveragePercentage(0, 10)).toBe(0);
  });

  it('should return 0 if total is 0', () => {
    expect(calculateCoveragePercentage(0, 0)).toBe(0);
  });

  it('should round to nearest integer', () => {
    expect(calculateCoveragePercentage(1, 3)).toBe(33);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  it('checkAlignment should use all sub-checks', async () => {
    const result = await checkAlignment(SAMPLE_PRD, SAMPLE_STORIES, '/test/path');

    // Should have all score components
    expect(result.scores.prdStories).toBeDefined();
    expect(result.scores.storyMockups).toBeDefined();
    expect(result.scores.prdMockups).toBeDefined();

    // Total should be sum of components
    const expectedTotal = result.scores.prdStories + result.scores.storyMockups + result.scores.prdMockups;
    expect(Math.abs(result.score - expectedTotal)).toBeLessThan(5); // Allow small rounding difference
  });

  it('should generate recommendations for all gap types', async () => {
    const result = await checkAlignment(SAMPLE_PRD, SAMPLE_STORIES, '/test/path');

    // Should have recommendations if there are gaps
    if (result.gaps.featuresWithoutStories.length > 0 ||
        result.gaps.uiStoriesWithoutMockups.length > 0) {
      expect(result.recommendations.length).toBeGreaterThan(0);
    }
  });

  it('should return valid: true only if score >= 70', async () => {
    const result = await checkAlignment(ALIGNED_PRD, ALIGNED_STORIES, '/test/path');

    if (result.score >= 70) {
      expect(result.valid).toBe(true);
    } else {
      expect(result.valid).toBe(false);
    }
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('should handle PRD with no features', async () => {
    const emptyPRD = { features: { core: [], enhanced: [], future: [] } };
    const result = await checkAlignment(emptyPRD, SAMPLE_STORIES, '/test/path');
    expect(result.score).toBe(0);
  });

  it('should handle stories with various mockupRef formats', () => {
    const mixedStories = [
      { id: 'S-001', domain: 'ui-components', mockupRefs: ['file.html'] },
      { id: 'S-002', domain: 'ui-components', mockupRefs: [{ file: 'file2.html', elements: [] }] },
      { id: 'S-003', domain: 'ui-components', mockupRefs: null },
      { id: 'S-004', domain: 'ui-components' }
    ];
    const result = checkStoryMockupsAlignment(mixedStories, SAMPLE_MOCKUPS);
    expect(result).toBeDefined();
  });

  it('should handle undefined domains', () => {
    const story = { id: 'S-001' };
    expect(isUIRelatedStory(story)).toBe(false);
  });
});
