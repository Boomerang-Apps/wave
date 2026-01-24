/**
 * TDD Tests for Story Schema Validator (Launch Sequence)
 *
 * Phase 3, Step 3.2: Story Schema Validator
 *
 * Tests the validation of AI story files against the schema.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockAccess, mockReaddir, mockReadFile } = vi.hoisted(() => ({
  mockAccess: vi.fn(),
  mockReaddir: vi.fn(),
  mockReadFile: vi.fn()
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    access: mockAccess,
    readdir: mockReaddir,
    readFile: mockReadFile
  },
  access: mockAccess,
  readdir: mockReaddir,
  readFile: mockReadFile
}));

import {
  STORY_SCHEMA,
  REQUIRED_STORY_FIELDS,
  VALID_STORY_STATUSES,
  VALID_STORY_PRIORITIES,
  VALID_AGENT_TYPES,
  validateStory,
  validateStoryField,
  detectStories,
  validateAllStories
} from '../utils/story-schema.js';

describe('Story Schema Validator', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Schema Constants Tests
  // ============================================

  describe('STORY_SCHEMA', () => {
    it('should define schema with required fields', () => {
      expect(STORY_SCHEMA).toBeDefined();
      expect(typeof STORY_SCHEMA).toBe('object');
    });

    it('should include id field definition', () => {
      expect(STORY_SCHEMA.id).toBeDefined();
      expect(STORY_SCHEMA.id.type).toBe('string');
      expect(STORY_SCHEMA.id.required).toBe(true);
    });

    it('should include title field definition', () => {
      expect(STORY_SCHEMA.title).toBeDefined();
      expect(STORY_SCHEMA.title.type).toBe('string');
      expect(STORY_SCHEMA.title.required).toBe(true);
    });

    it('should include description field definition', () => {
      expect(STORY_SCHEMA.description).toBeDefined();
      expect(STORY_SCHEMA.description.type).toBe('string');
    });

    it('should include status field definition', () => {
      expect(STORY_SCHEMA.status).toBeDefined();
      expect(STORY_SCHEMA.status.enum).toBeDefined();
    });

    it('should include priority field definition', () => {
      expect(STORY_SCHEMA.priority).toBeDefined();
      expect(STORY_SCHEMA.priority.enum).toBeDefined();
    });

    it('should include assignedAgent field definition', () => {
      expect(STORY_SCHEMA.assignedAgent).toBeDefined();
    });

    it('should include acceptanceCriteria field definition', () => {
      expect(STORY_SCHEMA.acceptanceCriteria).toBeDefined();
      expect(STORY_SCHEMA.acceptanceCriteria.type).toBe('array');
    });

    it('should include dependencies field definition', () => {
      expect(STORY_SCHEMA.dependencies).toBeDefined();
      expect(STORY_SCHEMA.dependencies.type).toBe('array');
    });
  });

  describe('REQUIRED_STORY_FIELDS', () => {
    it('should be an array of required field names', () => {
      expect(Array.isArray(REQUIRED_STORY_FIELDS)).toBe(true);
    });

    it('should include id', () => {
      expect(REQUIRED_STORY_FIELDS).toContain('id');
    });

    it('should include title', () => {
      expect(REQUIRED_STORY_FIELDS).toContain('title');
    });

    it('should include description', () => {
      expect(REQUIRED_STORY_FIELDS).toContain('description');
    });
  });

  describe('VALID_STORY_STATUSES', () => {
    it('should include draft status', () => {
      expect(VALID_STORY_STATUSES).toContain('draft');
    });

    it('should include ready status', () => {
      expect(VALID_STORY_STATUSES).toContain('ready');
    });

    it('should include in-progress status', () => {
      expect(VALID_STORY_STATUSES).toContain('in-progress');
    });

    it('should include completed status', () => {
      expect(VALID_STORY_STATUSES).toContain('completed');
    });

    it('should include blocked status', () => {
      expect(VALID_STORY_STATUSES).toContain('blocked');
    });
  });

  describe('VALID_STORY_PRIORITIES', () => {
    it('should include high priority', () => {
      expect(VALID_STORY_PRIORITIES).toContain('high');
    });

    it('should include medium priority', () => {
      expect(VALID_STORY_PRIORITIES).toContain('medium');
    });

    it('should include low priority', () => {
      expect(VALID_STORY_PRIORITIES).toContain('low');
    });
  });

  describe('VALID_AGENT_TYPES', () => {
    it('should include fe-dev agent', () => {
      expect(VALID_AGENT_TYPES).toContain('fe-dev');
    });

    it('should include be-dev agent', () => {
      expect(VALID_AGENT_TYPES).toContain('be-dev');
    });

    it('should include qa agent', () => {
      expect(VALID_AGENT_TYPES).toContain('qa');
    });

    it('should include devops agent', () => {
      expect(VALID_AGENT_TYPES).toContain('devops');
    });
  });

  // ============================================
  // validateStoryField Tests
  // ============================================

  describe('validateStoryField', () => {
    it('should return valid for correct string field', () => {
      const result = validateStoryField('id', 'STORY-001', STORY_SCHEMA.id);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for missing required field', () => {
      const result = validateStoryField('id', undefined, STORY_SCHEMA.id);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should return invalid for wrong type', () => {
      const result = validateStoryField('id', 123, STORY_SCHEMA.id);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('type');
    });

    it('should return valid for correct enum value', () => {
      const result = validateStoryField('status', 'ready', STORY_SCHEMA.status);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for wrong enum value', () => {
      const result = validateStoryField('status', 'invalid-status', STORY_SCHEMA.status);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be one of');
    });

    it('should return valid for correct array field', () => {
      const result = validateStoryField('acceptanceCriteria', ['AC1', 'AC2'], STORY_SCHEMA.acceptanceCriteria);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for non-array when array expected', () => {
      const result = validateStoryField('acceptanceCriteria', 'not an array', STORY_SCHEMA.acceptanceCriteria);
      expect(result.valid).toBe(false);
    });

    it('should allow optional fields to be undefined', () => {
      const schema = { type: 'string', required: false };
      const result = validateStoryField('optional', undefined, schema);
      expect(result.valid).toBe(true);
    });

    it('should validate minLength constraint', () => {
      const result = validateStoryField('title', '', { type: 'string', required: true, minLength: 1 });
      expect(result.valid).toBe(false);
    });

    it('should validate maxLength constraint', () => {
      const result = validateStoryField('id', 'a'.repeat(100), { type: 'string', required: true, maxLength: 50 });
      expect(result.valid).toBe(false);
    });
  });

  // ============================================
  // validateStory Tests
  // ============================================

  describe('validateStory', () => {
    const validStory = {
      id: 'STORY-001',
      title: 'User Login Feature',
      description: 'As a user, I want to log in so that I can access my account.',
      status: 'draft',
      priority: 'high',
      acceptanceCriteria: ['User can enter email', 'User can enter password'],
      dependencies: []
    };

    it('should return valid for complete story', () => {
      const result = validateStory(validStory);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for missing id', () => {
      const story = { ...validStory, id: undefined };
      const result = validateStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
    });

    it('should return invalid for missing title', () => {
      const story = { ...validStory, title: undefined };
      const result = validateStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'title')).toBe(true);
    });

    it('should return invalid for missing description', () => {
      const story = { ...validStory, description: undefined };
      const result = validateStory(story);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for invalid status', () => {
      const story = { ...validStory, status: 'invalid' };
      const result = validateStory(story);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for invalid priority', () => {
      const story = { ...validStory, priority: 'urgent' };
      const result = validateStory(story);
      expect(result.valid).toBe(false);
    });

    it('should return all errors at once', () => {
      const story = { id: 123, title: '', status: 'bad' };
      const result = validateStory(story);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should return story id in result', () => {
      const result = validateStory(validStory);
      expect(result.storyId).toBe('STORY-001');
    });

    it('should handle null story', () => {
      const result = validateStory(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle non-object story', () => {
      const result = validateStory('not an object');
      expect(result.valid).toBe(false);
    });

    it('should validate assignedAgent if present', () => {
      const story = { ...validStory, assignedAgent: 'fe-dev' };
      const result = validateStory(story);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid assignedAgent', () => {
      const story = { ...validStory, assignedAgent: 'invalid-agent' };
      const result = validateStory(story);
      expect(result.valid).toBe(false);
    });
  });

  // ============================================
  // detectStories Tests
  // ============================================

  describe('detectStories', () => {
    it('should return empty array when no stories folder', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await detectStories('/project');

      expect(result.found).toBe(false);
      expect(result.files).toEqual([]);
    });

    it('should find stories in stories folder', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === '/project/stories') return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      mockReaddir.mockResolvedValue([
        { name: 'story-001.json', isFile: () => true },
        { name: 'story-002.json', isFile: () => true }
      ]);

      const result = await detectStories('/project');

      expect(result.found).toBe(true);
      expect(result.files).toHaveLength(2);
    });

    it('should ignore non-json files', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === '/project/stories') return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      mockReaddir.mockResolvedValue([
        { name: 'story-001.json', isFile: () => true },
        { name: 'readme.md', isFile: () => true }
      ]);

      const result = await detectStories('/project');

      expect(result.files).toHaveLength(1);
    });

    it('should return file paths', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'story-001.json', isFile: () => true }
      ]);

      const result = await detectStories('/project');

      expect(result.files[0]).toHaveProperty('path');
      expect(result.files[0].path).toContain('story-001.json');
    });

    it('should handle invalid project path', async () => {
      const result = await detectStories('');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should search in .claudecode/stories', async () => {
      mockAccess.mockImplementation((path) => {
        if (path.includes('.claudecode/stories')) return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      mockReaddir.mockResolvedValue([
        { name: 'story-001.json', isFile: () => true }
      ]);

      const result = await detectStories('/project');

      expect(result.found).toBe(true);
    });
  });

  // ============================================
  // validateAllStories Tests
  // ============================================

  describe('validateAllStories', () => {
    it('should validate all story files', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === '/project/stories') return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      mockReaddir.mockResolvedValue([
        { name: 'story-001.json', isFile: () => true },
        { name: 'story-002.json', isFile: () => true }
      ]);
      mockReadFile.mockResolvedValue(JSON.stringify({
        id: 'STORY-001',
        title: 'Test Story',
        description: 'Description',
        status: 'draft',
        priority: 'medium',
        acceptanceCriteria: [],
        dependencies: []
      }));

      const result = await validateAllStories('/project');

      expect(result.totalCount).toBe(2);
      expect(result.validCount).toBe(2);
    });

    it('should count invalid stories', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === '/project/stories') return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      mockReaddir.mockResolvedValue([
        { name: 'story-001.json', isFile: () => true }
      ]);
      mockReadFile.mockResolvedValue(JSON.stringify({
        // Missing required fields
        title: 'Incomplete Story'
      }));

      const result = await validateAllStories('/project');

      expect(result.invalidCount).toBe(1);
    });

    it('should return validation details for each story', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === '/project/stories') return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      mockReaddir.mockResolvedValue([
        { name: 'story-001.json', isFile: () => true }
      ]);
      mockReadFile.mockResolvedValue(JSON.stringify({
        id: 'STORY-001',
        title: 'Test',
        description: 'Desc',
        status: 'draft',
        priority: 'high',
        acceptanceCriteria: [],
        dependencies: []
      }));

      const result = await validateAllStories('/project');

      expect(result.stories).toHaveLength(1);
      expect(result.stories[0]).toHaveProperty('valid');
      expect(result.stories[0]).toHaveProperty('filename');
    });

    it('should handle JSON parse errors', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === '/project/stories') return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      mockReaddir.mockResolvedValue([
        { name: 'bad-story.json', isFile: () => true }
      ]);
      mockReadFile.mockResolvedValue('not valid json');

      const result = await validateAllStories('/project');

      expect(result.invalidCount).toBe(1);
      expect(result.stories[0].error).toContain('parse');
    });

    it('should return overall valid status', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'story-001.json', isFile: () => true }
      ]);
      mockReadFile.mockResolvedValue(JSON.stringify({
        id: 'STORY-001',
        title: 'Test',
        description: 'Desc',
        status: 'draft',
        priority: 'high',
        acceptanceCriteria: [],
        dependencies: []
      }));

      const result = await validateAllStories('/project');

      expect(result.valid).toBe(true);
    });

    it('should return invalid when any story fails', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'story-001.json', isFile: () => true }
      ]);
      mockReadFile.mockResolvedValue(JSON.stringify({
        title: 'Missing id'
      }));

      const result = await validateAllStories('/project');

      expect(result.valid).toBe(false);
    });

    it('should return valid when no stories found', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await validateAllStories('/project');

      expect(result.valid).toBe(true);
      expect(result.totalCount).toBe(0);
    });
  });
});
