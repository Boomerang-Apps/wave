/**
 * TDD Tests for Enhanced Story Schema
 *
 * IMPORTANT: These tests are written BEFORE implementation.
 * All tests MUST FAIL until enhanced-story-schema.js is implemented.
 *
 * Based on: docs/enhanced-story-schema/SPECIFICATION.md
 * Date: 2026-01-26
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import from the module that doesn't exist yet - will cause import error
import {
  // Schema
  ENHANCED_STORY_SCHEMA,

  // Enums
  VALID_DOMAINS,
  VALID_PRIORITIES,
  VALID_RISK_LEVELS,
  VALID_STATUSES,
  VALID_AGENTS,
  UI_DOMAINS,

  // Thresholds
  DETAIL_SCORE_THRESHOLDS,

  // Validation Functions
  validateEnhancedStory,
  validateEnhancedStoryField,
  validateGWT,
  validateAcceptanceCriteria,

  // Scoring Functions
  scoreStoryDetail,
  getDetailScoreBreakdown,

  // Utility Functions
  isUIRelatedDomain,
  getRequiredFieldsForDomain
} from '../utils/enhanced-story-schema.js';


// ============================================
// Test Fixtures
// ============================================

const VALID_COMPLETE_STORY = {
  id: 'WAVE-001-AUTH-001',
  title: 'User Login with Email and Password',
  epic: 'User Authentication',
  domain: 'authentication',
  priority: 'high',
  userStory: {
    asA: 'registered user',
    iWant: 'to log in with my email and password',
    soThat: 'I can access my personalized dashboard'
  },
  gwt: {
    given: 'I am on the login page and have a registered account with valid credentials',
    when: 'I enter my email and password then click Sign In button',
    then: 'I am authenticated and redirected to my dashboard with welcome message'
  },
  acceptanceCriteria: [
    { id: 'AC-001', description: 'Login form displays email and password fields', testable: true },
    { id: 'AC-002', description: 'Form validates email format before submission', testable: true },
    { id: 'AC-003', description: 'Error message shown for invalid credentials', testable: true },
    { id: 'AC-004', description: 'Successful login stores session in httpOnly cookie', testable: true },
    { id: 'AC-005', description: 'User is redirected to dashboard after login', testable: true }
  ],
  mockupRefs: [
    { file: '01-login.html', elements: ['#email-input', '#password-input'] }
  ],
  technicalNotes: {
    suggestedApproach: 'Use NextAuth.js with Credentials provider',
    filesLikelyModified: ['src/app/login/page.tsx'],
    apiEndpoints: ['/api/auth/signin'],
    databaseTables: ['users'],
    externalServices: ['Supabase Auth']
  },
  safety: {
    riskLevel: 'high',
    requiresApproval: true,
    approver: 'security-lead',
    safetyTags: ['auth', 'credentials']
  },
  dependencies: [],
  status: 'ready',
  assignedAgent: 'fullstack',
  estimatedTokens: 15000,
  estimatedHours: 4,
  wave: 1
};

const MINIMAL_VALID_STORY = {
  id: 'WAVE-001-API-002',
  title: 'Create User Profile API Endpoint',
  epic: 'User Management',
  domain: 'api',
  priority: 'medium',
  userStory: {
    asA: 'frontend application',
    iWant: 'to fetch user profile data via API',
    soThat: 'I can display user information on screen'
  },
  gwt: {
    given: 'A user is authenticated with a valid session token in the system',
    when: 'A GET request is made to /api/users/profile with auth token header',
    then: 'The API returns the user profile data as JSON with 200 OK status'
  },
  acceptanceCriteria: [
    { id: 'AC-001', description: 'Endpoint returns 401 for unauthenticated requests', testable: true },
    { id: 'AC-002', description: 'Endpoint returns user profile JSON for valid requests', testable: true },
    { id: 'AC-003', description: 'Response includes id, email, name, createdAt fields', testable: true }
  ],
  technicalNotes: {},
  dependencies: [],
  status: 'draft'
};


describe('Enhanced Story Schema', () => {

  // ============================================
  // ENUM TESTS
  // ============================================

  describe('VALID_DOMAINS', () => {
    it('should be an array', () => {
      expect(Array.isArray(VALID_DOMAINS)).toBe(true);
    });

    it('should include authentication domain', () => {
      expect(VALID_DOMAINS).toContain('authentication');
    });

    it('should include authorization domain', () => {
      expect(VALID_DOMAINS).toContain('authorization');
    });

    it('should include database domain', () => {
      expect(VALID_DOMAINS).toContain('database');
    });

    it('should include api domain', () => {
      expect(VALID_DOMAINS).toContain('api');
    });

    it('should include ui-components domain', () => {
      expect(VALID_DOMAINS).toContain('ui-components');
    });

    it('should include forms domain', () => {
      expect(VALID_DOMAINS).toContain('forms');
    });

    it('should include navigation domain', () => {
      expect(VALID_DOMAINS).toContain('navigation');
    });

    it('should include state-management domain', () => {
      expect(VALID_DOMAINS).toContain('state-management');
    });

    it('should include integrations domain', () => {
      expect(VALID_DOMAINS).toContain('integrations');
    });

    it('should include payments domain', () => {
      expect(VALID_DOMAINS).toContain('payments');
    });

    it('should include notifications domain', () => {
      expect(VALID_DOMAINS).toContain('notifications');
    });

    it('should include search domain', () => {
      expect(VALID_DOMAINS).toContain('search');
    });

    it('should include media domain', () => {
      expect(VALID_DOMAINS).toContain('media');
    });

    it('should include analytics domain', () => {
      expect(VALID_DOMAINS).toContain('analytics');
    });

    it('should include admin domain', () => {
      expect(VALID_DOMAINS).toContain('admin');
    });

    it('should include settings domain', () => {
      expect(VALID_DOMAINS).toContain('settings');
    });

    it('should include infrastructure domain', () => {
      expect(VALID_DOMAINS).toContain('infrastructure');
    });

    it('should have exactly 17 domains', () => {
      expect(VALID_DOMAINS.length).toBe(17);
    });
  });

  describe('VALID_PRIORITIES', () => {
    it('should include critical priority', () => {
      expect(VALID_PRIORITIES).toContain('critical');
    });

    it('should include high priority', () => {
      expect(VALID_PRIORITIES).toContain('high');
    });

    it('should include medium priority', () => {
      expect(VALID_PRIORITIES).toContain('medium');
    });

    it('should include low priority', () => {
      expect(VALID_PRIORITIES).toContain('low');
    });

    it('should have exactly 4 priorities', () => {
      expect(VALID_PRIORITIES.length).toBe(4);
    });
  });

  describe('VALID_RISK_LEVELS', () => {
    it('should include critical risk level', () => {
      expect(VALID_RISK_LEVELS).toContain('critical');
    });

    it('should include high risk level', () => {
      expect(VALID_RISK_LEVELS).toContain('high');
    });

    it('should include medium risk level', () => {
      expect(VALID_RISK_LEVELS).toContain('medium');
    });

    it('should include low risk level', () => {
      expect(VALID_RISK_LEVELS).toContain('low');
    });
  });

  describe('VALID_STATUSES', () => {
    it('should include draft status', () => {
      expect(VALID_STATUSES).toContain('draft');
    });

    it('should include ready status', () => {
      expect(VALID_STATUSES).toContain('ready');
    });

    it('should include in-progress status', () => {
      expect(VALID_STATUSES).toContain('in-progress');
    });

    it('should include completed status', () => {
      expect(VALID_STATUSES).toContain('completed');
    });

    it('should include blocked status', () => {
      expect(VALID_STATUSES).toContain('blocked');
    });
  });

  describe('VALID_AGENTS', () => {
    it('should include fe-dev agent', () => {
      expect(VALID_AGENTS).toContain('fe-dev');
    });

    it('should include be-dev agent', () => {
      expect(VALID_AGENTS).toContain('be-dev');
    });

    it('should include qa agent', () => {
      expect(VALID_AGENTS).toContain('qa');
    });

    it('should include devops agent', () => {
      expect(VALID_AGENTS).toContain('devops');
    });

    it('should include fullstack agent', () => {
      expect(VALID_AGENTS).toContain('fullstack');
    });

    it('should include unassigned agent', () => {
      expect(VALID_AGENTS).toContain('unassigned');
    });
  });

  describe('UI_DOMAINS', () => {
    it('should include ui-components', () => {
      expect(UI_DOMAINS).toContain('ui-components');
    });

    it('should include forms', () => {
      expect(UI_DOMAINS).toContain('forms');
    });

    it('should include navigation', () => {
      expect(UI_DOMAINS).toContain('navigation');
    });

    it('should have exactly 3 UI domains', () => {
      expect(UI_DOMAINS.length).toBe(3);
    });
  });

  describe('DETAIL_SCORE_THRESHOLDS', () => {
    it('should define excellent threshold as 95', () => {
      expect(DETAIL_SCORE_THRESHOLDS.excellent).toBe(95);
    });

    it('should define good threshold as 85', () => {
      expect(DETAIL_SCORE_THRESHOLDS.good).toBe(85);
    });

    it('should define acceptable threshold as 70', () => {
      expect(DETAIL_SCORE_THRESHOLDS.acceptable).toBe(70);
    });

    it('should define minimum threshold as 60', () => {
      expect(DETAIL_SCORE_THRESHOLDS.minimum).toBe(60);
    });

    it('should define failing threshold as 0', () => {
      expect(DETAIL_SCORE_THRESHOLDS.failing).toBe(0);
    });
  });

  // ============================================
  // SCHEMA TESTS
  // ============================================

  describe('ENHANCED_STORY_SCHEMA', () => {
    it('should be defined', () => {
      expect(ENHANCED_STORY_SCHEMA).toBeDefined();
    });

    it('should have id field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.id).toBeDefined();
      expect(ENHANCED_STORY_SCHEMA.id.required).toBe(true);
    });

    it('should have title field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.title).toBeDefined();
      expect(ENHANCED_STORY_SCHEMA.title.required).toBe(true);
    });

    it('should have epic field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.epic).toBeDefined();
      expect(ENHANCED_STORY_SCHEMA.epic.required).toBe(true);
    });

    it('should have domain field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.domain).toBeDefined();
      expect(ENHANCED_STORY_SCHEMA.domain.required).toBe(true);
    });

    it('should have priority field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.priority).toBeDefined();
      expect(ENHANCED_STORY_SCHEMA.priority.required).toBe(true);
    });

    it('should have userStory field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.userStory).toBeDefined();
      expect(ENHANCED_STORY_SCHEMA.userStory.required).toBe(true);
    });

    it('should have gwt field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.gwt).toBeDefined();
      expect(ENHANCED_STORY_SCHEMA.gwt.required).toBe(true);
    });

    it('should have acceptanceCriteria field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.acceptanceCriteria).toBeDefined();
      expect(ENHANCED_STORY_SCHEMA.acceptanceCriteria.required).toBe(true);
    });

    it('should have technicalNotes field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.technicalNotes).toBeDefined();
      expect(ENHANCED_STORY_SCHEMA.technicalNotes.required).toBe(true);
    });

    it('should have dependencies field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.dependencies).toBeDefined();
      expect(ENHANCED_STORY_SCHEMA.dependencies.required).toBe(true);
    });

    it('should have mockupRefs field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.mockupRefs).toBeDefined();
    });

    it('should have safety field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.safety).toBeDefined();
    });

    it('should have status field definition', () => {
      expect(ENHANCED_STORY_SCHEMA.status).toBeDefined();
    });
  });

  // ============================================
  // VALIDATION FUNCTION TESTS
  // ============================================

  describe('validateEnhancedStory', () => {
    it('should return valid for complete story', () => {
      const result = validateEnhancedStory(VALID_COMPLETE_STORY);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return storyId in result', () => {
      const result = validateEnhancedStory(VALID_COMPLETE_STORY);
      expect(result.storyId).toBe('WAVE-001-AUTH-001');
    });

    it('should return detailScore in result', () => {
      const result = validateEnhancedStory(VALID_COMPLETE_STORY);
      expect(typeof result.detailScore).toBe('number');
      expect(result.detailScore).toBeGreaterThanOrEqual(0);
      expect(result.detailScore).toBeLessThanOrEqual(100);
    });

    it('should return invalid for null story', () => {
      const result = validateEnhancedStory(null);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for non-object story', () => {
      const result = validateEnhancedStory('not an object');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for empty object', () => {
      const result = validateEnhancedStory({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    // ID Validation
    it('should return error for missing id', () => {
      const story = { ...VALID_COMPLETE_STORY };
      delete story.id;
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
    });

    it('should return error for invalid id format', () => {
      const story = { ...VALID_COMPLETE_STORY, id: 'invalid-id' };
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_ID_FORMAT')).toBe(true);
    });

    it('should accept valid id format PROJ-NUM-DOMAIN-NUM', () => {
      const story = { ...VALID_COMPLETE_STORY, id: 'TEST-123-AUTH-456' };
      const result = validateEnhancedStory(story);
      const idErrors = result.errors.filter(e => e.field === 'id');
      expect(idErrors.length).toBe(0);
    });

    // Title Validation
    it('should return error for missing title', () => {
      const story = { ...VALID_COMPLETE_STORY };
      delete story.title;
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'title')).toBe(true);
    });

    it('should return error for title too short', () => {
      const story = { ...VALID_COMPLETE_STORY, title: 'Short' };
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'TITLE_TOO_SHORT')).toBe(true);
    });

    // Epic Validation
    it('should return error for missing epic', () => {
      const story = { ...VALID_COMPLETE_STORY };
      delete story.epic;
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'epic')).toBe(true);
    });

    // Domain Validation
    it('should return error for missing domain', () => {
      const story = { ...VALID_COMPLETE_STORY };
      delete story.domain;
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'domain')).toBe(true);
    });

    it('should return error for invalid domain', () => {
      const story = { ...VALID_COMPLETE_STORY, domain: 'invalid-domain' };
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_DOMAIN')).toBe(true);
    });

    // Priority Validation
    it('should return error for missing priority', () => {
      const story = { ...VALID_COMPLETE_STORY };
      delete story.priority;
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'priority')).toBe(true);
    });

    it('should return error for invalid priority', () => {
      const story = { ...VALID_COMPLETE_STORY, priority: 'urgent' };
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
    });

    // UserStory Validation
    it('should return error for missing userStory', () => {
      const story = { ...VALID_COMPLETE_STORY };
      delete story.userStory;
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'userStory')).toBe(true);
    });

    it('should return error for incomplete userStory', () => {
      const story = { ...VALID_COMPLETE_STORY, userStory: { asA: 'user' } };
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INCOMPLETE_USER_STORY')).toBe(true);
    });

    // GWT Validation
    it('should return error for missing gwt', () => {
      const story = { ...VALID_COMPLETE_STORY };
      delete story.gwt;
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'gwt')).toBe(true);
    });

    it('should return error for gwt with short given', () => {
      const story = {
        ...VALID_COMPLETE_STORY,
        gwt: { given: 'Short', when: VALID_COMPLETE_STORY.gwt.when, then: VALID_COMPLETE_STORY.gwt.then }
      };
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'GWT_TOO_SHORT')).toBe(true);
    });

    it('should return error for gwt with short when', () => {
      const story = {
        ...VALID_COMPLETE_STORY,
        gwt: { given: VALID_COMPLETE_STORY.gwt.given, when: 'Short', then: VALID_COMPLETE_STORY.gwt.then }
      };
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
    });

    it('should return error for gwt with short then', () => {
      const story = {
        ...VALID_COMPLETE_STORY,
        gwt: { given: VALID_COMPLETE_STORY.gwt.given, when: VALID_COMPLETE_STORY.gwt.when, then: 'Short' }
      };
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
    });

    // Acceptance Criteria Validation
    it('should return error for missing acceptanceCriteria', () => {
      const story = { ...VALID_COMPLETE_STORY };
      delete story.acceptanceCriteria;
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'acceptanceCriteria')).toBe(true);
    });

    it('should return error for less than 3 acceptance criteria', () => {
      const story = {
        ...VALID_COMPLETE_STORY,
        acceptanceCriteria: [
          { id: 'AC-001', description: 'First criterion here', testable: true },
          { id: 'AC-002', description: 'Second criterion here', testable: true }
        ]
      };
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INSUFFICIENT_AC')).toBe(true);
    });

    it('should return error for acceptance criteria without id', () => {
      const story = {
        ...VALID_COMPLETE_STORY,
        acceptanceCriteria: [
          { description: 'Missing id', testable: true },
          { id: 'AC-002', description: 'Has id', testable: true },
          { id: 'AC-003', description: 'Has id too', testable: true }
        ]
      };
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
    });

    // TechnicalNotes Validation
    it('should return error for missing technicalNotes', () => {
      const story = { ...VALID_COMPLETE_STORY };
      delete story.technicalNotes;
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'technicalNotes')).toBe(true);
    });

    it('should accept empty technicalNotes object', () => {
      const story = { ...VALID_COMPLETE_STORY, technicalNotes: {} };
      const result = validateEnhancedStory(story);
      const techNotesErrors = result.errors.filter(e => e.field === 'technicalNotes');
      expect(techNotesErrors.length).toBe(0);
    });

    // Dependencies Validation
    it('should return error for missing dependencies', () => {
      const story = { ...VALID_COMPLETE_STORY };
      delete story.dependencies;
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'dependencies')).toBe(true);
    });

    it('should accept empty dependencies array', () => {
      const story = { ...VALID_COMPLETE_STORY, dependencies: [] };
      const result = validateEnhancedStory(story);
      const depErrors = result.errors.filter(e => e.field === 'dependencies');
      expect(depErrors.length).toBe(0);
    });

    // MockupRefs Validation for UI domains
    it('should return error for UI domain without mockupRefs', () => {
      const story = { ...VALID_COMPLETE_STORY, domain: 'ui-components' };
      delete story.mockupRefs;
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_MOCKUP_REFS')).toBe(true);
    });

    it('should not require mockupRefs for non-UI domain', () => {
      const story = { ...MINIMAL_VALID_STORY };  // domain is 'api'
      delete story.mockupRefs;
      const result = validateEnhancedStory(story);
      const mockupErrors = result.errors.filter(e => e.code === 'MISSING_MOCKUP_REFS');
      expect(mockupErrors.length).toBe(0);
    });

    // Status Validation
    it('should return error for invalid status', () => {
      const story = { ...VALID_COMPLETE_STORY, status: 'invalid-status' };
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
    });

    // AssignedAgent Validation
    it('should return error for invalid assignedAgent', () => {
      const story = { ...VALID_COMPLETE_STORY, assignedAgent: 'invalid-agent' };
      const result = validateEnhancedStory(story);
      expect(result.valid).toBe(false);
    });

    // Multiple errors
    it('should return all errors at once', () => {
      const story = { id: 'bad', title: 'x' };
      const result = validateEnhancedStory(story);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });

  describe('validateGWT', () => {
    it('should return valid for correct GWT', () => {
      const result = validateGWT(VALID_COMPLETE_STORY.gwt);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for missing given', () => {
      const result = validateGWT({ when: 'some action is taken by user', then: 'expected result occurs as planned' });
      expect(result.valid).toBe(false);
    });

    it('should return invalid for missing when', () => {
      const result = validateGWT({ given: 'some context is established here', then: 'expected result occurs as planned' });
      expect(result.valid).toBe(false);
    });

    it('should return invalid for missing then', () => {
      const result = validateGWT({ given: 'some context is established here', when: 'some action is taken by user' });
      expect(result.valid).toBe(false);
    });

    it('should return invalid for given less than 20 chars', () => {
      const result = validateGWT({ given: 'too short', when: 'some action is taken by user', then: 'expected result occurs as planned' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'given')).toBe(true);
    });

    it('should return invalid for when less than 20 chars', () => {
      const result = validateGWT({ given: 'some context is established here', when: 'too short', then: 'expected result occurs as planned' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'when')).toBe(true);
    });

    it('should return invalid for then less than 20 chars', () => {
      const result = validateGWT({ given: 'some context is established here', when: 'some action is taken by user', then: 'too short' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'then')).toBe(true);
    });

    it('should return invalid for null gwt', () => {
      const result = validateGWT(null);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAcceptanceCriteria', () => {
    it('should return valid for 3+ criteria', () => {
      const result = validateAcceptanceCriteria(VALID_COMPLETE_STORY.acceptanceCriteria);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for less than 3 criteria', () => {
      const result = validateAcceptanceCriteria([
        { id: 'AC-001', description: 'First criterion', testable: true }
      ]);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for empty array', () => {
      const result = validateAcceptanceCriteria([]);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for criteria missing id', () => {
      const result = validateAcceptanceCriteria([
        { description: 'Missing id', testable: true },
        { id: 'AC-002', description: 'Has id here', testable: true },
        { id: 'AC-003', description: 'Has id here too', testable: true }
      ]);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for criteria missing description', () => {
      const result = validateAcceptanceCriteria([
        { id: 'AC-001', testable: true },
        { id: 'AC-002', description: 'Has description', testable: true },
        { id: 'AC-003', description: 'Has description', testable: true }
      ]);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for criteria missing testable', () => {
      const result = validateAcceptanceCriteria([
        { id: 'AC-001', description: 'Missing testable flag' },
        { id: 'AC-002', description: 'Has testable', testable: true },
        { id: 'AC-003', description: 'Has testable', testable: true }
      ]);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for invalid AC id format', () => {
      const result = validateAcceptanceCriteria([
        { id: 'bad-id', description: 'Invalid id format here', testable: true },
        { id: 'AC-002', description: 'Valid id format here', testable: true },
        { id: 'AC-003', description: 'Valid id format here', testable: true }
      ]);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for null criteria', () => {
      const result = validateAcceptanceCriteria(null);
      expect(result.valid).toBe(false);
    });
  });

  // ============================================
  // SCORING FUNCTION TESTS
  // ============================================

  describe('scoreStoryDetail', () => {
    it('should return 100 for complete story', () => {
      const score = scoreStoryDetail(VALID_COMPLETE_STORY);
      expect(score).toBe(100);
    });

    it('should return score between 0 and 100', () => {
      const score = scoreStoryDetail(MINIMAL_VALID_STORY);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return lower score for minimal story', () => {
      const fullScore = scoreStoryDetail(VALID_COMPLETE_STORY);
      const minimalScore = scoreStoryDetail(MINIMAL_VALID_STORY);
      expect(minimalScore).toBeLessThan(fullScore);
    });

    it('should return 0 for empty object', () => {
      const score = scoreStoryDetail({});
      expect(score).toBe(0);
    });

    it('should return 0 for null', () => {
      const score = scoreStoryDetail(null);
      expect(score).toBe(0);
    });

    it('should give points for valid id', () => {
      const withId = scoreStoryDetail({ id: 'WAVE-001-AUTH-001' });
      const withoutId = scoreStoryDetail({});
      expect(withId).toBeGreaterThan(withoutId);
    });

    it('should give points for valid title', () => {
      const withTitle = scoreStoryDetail({ title: 'A valid story title here' });
      const withoutTitle = scoreStoryDetail({});
      expect(withTitle).toBeGreaterThan(withoutTitle);
    });

    it('should give points for complete userStory', () => {
      const withUserStory = scoreStoryDetail({
        userStory: { asA: 'user', iWant: 'to do something useful', soThat: 'I can achieve my goal' }
      });
      const withoutUserStory = scoreStoryDetail({});
      expect(withUserStory).toBeGreaterThan(withoutUserStory);
    });

    it('should give points for complete gwt', () => {
      const withGwt = scoreStoryDetail({
        gwt: {
          given: 'some context is established here in the system',
          when: 'user takes some specific action in the app',
          then: 'expected result occurs as planned by design'
        }
      });
      const withoutGwt = scoreStoryDetail({});
      expect(withGwt).toBeGreaterThan(withoutGwt);
    });

    it('should give points for acceptance criteria', () => {
      const withAC = scoreStoryDetail({
        acceptanceCriteria: [
          { id: 'AC-001', description: 'First criterion', testable: true },
          { id: 'AC-002', description: 'Second criterion', testable: true },
          { id: 'AC-003', description: 'Third criterion', testable: true }
        ]
      });
      const withoutAC = scoreStoryDetail({});
      expect(withAC).toBeGreaterThan(withoutAC);
    });

    it('should give points for technicalNotes', () => {
      const withNotes = scoreStoryDetail({
        technicalNotes: {
          suggestedApproach: 'Use React hooks',
          filesLikelyModified: ['src/app.tsx']
        }
      });
      const withoutNotes = scoreStoryDetail({});
      expect(withNotes).toBeGreaterThan(withoutNotes);
    });
  });

  describe('getDetailScoreBreakdown', () => {
    it('should return breakdown object', () => {
      const breakdown = getDetailScoreBreakdown(VALID_COMPLETE_STORY);
      expect(typeof breakdown).toBe('object');
    });

    it('should include total score', () => {
      const breakdown = getDetailScoreBreakdown(VALID_COMPLETE_STORY);
      expect(typeof breakdown.total).toBe('number');
    });

    it('should include identification breakdown', () => {
      const breakdown = getDetailScoreBreakdown(VALID_COMPLETE_STORY);
      expect(breakdown.identification).toBeDefined();
      expect(breakdown.identification.score).toBeDefined();
      expect(breakdown.identification.max).toBe(20);
    });

    it('should include userStory breakdown', () => {
      const breakdown = getDetailScoreBreakdown(VALID_COMPLETE_STORY);
      expect(breakdown.userStory).toBeDefined();
      expect(breakdown.userStory.max).toBe(10);
    });

    it('should include gwt breakdown', () => {
      const breakdown = getDetailScoreBreakdown(VALID_COMPLETE_STORY);
      expect(breakdown.gwt).toBeDefined();
      expect(breakdown.gwt.max).toBe(20);
    });

    it('should include acceptanceCriteria breakdown', () => {
      const breakdown = getDetailScoreBreakdown(VALID_COMPLETE_STORY);
      expect(breakdown.acceptanceCriteria).toBeDefined();
      expect(breakdown.acceptanceCriteria.max).toBe(25);
    });

    it('should include technicalNotes breakdown', () => {
      const breakdown = getDetailScoreBreakdown(VALID_COMPLETE_STORY);
      expect(breakdown.technicalNotes).toBeDefined();
      expect(breakdown.technicalNotes.max).toBe(15);
    });

    it('should include mockupRefs breakdown', () => {
      const breakdown = getDetailScoreBreakdown(VALID_COMPLETE_STORY);
      expect(breakdown.mockupRefs).toBeDefined();
      expect(breakdown.mockupRefs.max).toBe(5);
    });

    it('should include metadata breakdown', () => {
      const breakdown = getDetailScoreBreakdown(VALID_COMPLETE_STORY);
      expect(breakdown.metadata).toBeDefined();
      expect(breakdown.metadata.max).toBe(5);
    });

    it('should have max scores sum to 100', () => {
      const breakdown = getDetailScoreBreakdown(VALID_COMPLETE_STORY);
      const totalMax =
        breakdown.identification.max +
        breakdown.userStory.max +
        breakdown.gwt.max +
        breakdown.acceptanceCriteria.max +
        breakdown.technicalNotes.max +
        breakdown.mockupRefs.max +
        breakdown.metadata.max;
      expect(totalMax).toBe(100);
    });
  });

  // ============================================
  // UTILITY FUNCTION TESTS
  // ============================================

  describe('isUIRelatedDomain', () => {
    it('should return true for ui-components', () => {
      expect(isUIRelatedDomain('ui-components')).toBe(true);
    });

    it('should return true for forms', () => {
      expect(isUIRelatedDomain('forms')).toBe(true);
    });

    it('should return true for navigation', () => {
      expect(isUIRelatedDomain('navigation')).toBe(true);
    });

    it('should return false for api', () => {
      expect(isUIRelatedDomain('api')).toBe(false);
    });

    it('should return false for database', () => {
      expect(isUIRelatedDomain('database')).toBe(false);
    });

    it('should return false for authentication', () => {
      expect(isUIRelatedDomain('authentication')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isUIRelatedDomain(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isUIRelatedDomain(undefined)).toBe(false);
    });
  });

  describe('getRequiredFieldsForDomain', () => {
    it('should return array of required fields', () => {
      const fields = getRequiredFieldsForDomain('api');
      expect(Array.isArray(fields)).toBe(true);
    });

    it('should include mockupRefs for ui-components domain', () => {
      const fields = getRequiredFieldsForDomain('ui-components');
      expect(fields).toContain('mockupRefs');
    });

    it('should include mockupRefs for forms domain', () => {
      const fields = getRequiredFieldsForDomain('forms');
      expect(fields).toContain('mockupRefs');
    });

    it('should not include mockupRefs for api domain', () => {
      const fields = getRequiredFieldsForDomain('api');
      expect(fields).not.toContain('mockupRefs');
    });

    it('should always include base required fields', () => {
      const fields = getRequiredFieldsForDomain('api');
      expect(fields).toContain('id');
      expect(fields).toContain('title');
      expect(fields).toContain('epic');
      expect(fields).toContain('domain');
      expect(fields).toContain('userStory');
      expect(fields).toContain('gwt');
      expect(fields).toContain('acceptanceCriteria');
      expect(fields).toContain('technicalNotes');
      expect(fields).toContain('dependencies');
    });
  });
});
