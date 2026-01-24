/**
 * TDD Tests for Stories Validation Endpoint (Launch Sequence)
 *
 * Phase 3, Step 3.5: Stories Validation Endpoint
 *
 * Tests the POST /api/validate-stories endpoint that validates
 * story files against schema and checks mockup alignment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mocks
const {
  mockValidateAllStories,
  mockDetectMockups,
  mockCheckAlignment,
  mockSaveValidation
} = vi.hoisted(() => ({
  mockValidateAllStories: vi.fn(),
  mockDetectMockups: vi.fn(),
  mockCheckAlignment: vi.fn(),
  mockSaveValidation: vi.fn()
}));

// Mock dependencies
vi.mock('../utils/story-schema.js', () => ({
  validateAllStories: mockValidateAllStories
}));

vi.mock('../utils/mockup-detection.js', () => ({
  detectMockups: mockDetectMockups
}));

vi.mock('../utils/mockup-alignment.js', () => ({
  checkMockupStoryAlignment: mockCheckAlignment,
  createAlignmentReport: vi.fn((m, s) => ({
    summary: 'Test',
    mockupCount: m.length,
    storyCount: s.length,
    coveragePercent: 100,
    status: 'ready',
    gaps: [],
    timestamp: new Date().toISOString()
  }))
}));

vi.mock('../utils/validation-persistence.js', () => ({
  saveValidation: mockSaveValidation
}));

import {
  validateStories,
  createStoriesValidationRequest
} from '../utils/stories-endpoint.js';

describe('Stories Validation Endpoint', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // createStoriesValidationRequest Tests
  // ============================================

  describe('createStoriesValidationRequest', () => {
    it('should create valid request object', () => {
      const req = createStoriesValidationRequest('/project', 'project-123');

      expect(req).toHaveProperty('projectPath', '/project');
      expect(req).toHaveProperty('projectId', 'project-123');
    });

    it('should validate required fields', () => {
      const req = createStoriesValidationRequest('', '');

      expect(req.isValid).toBe(false);
      expect(req.errors).toContain('Project path is required');
      expect(req.errors).toContain('Project ID is required');
    });

    it('should return isValid=true when all fields present', () => {
      const req = createStoriesValidationRequest('/project', 'project-123');

      expect(req.isValid).toBe(true);
      expect(req.errors).toHaveLength(0);
    });
  });

  // ============================================
  // validateStories Function Tests
  // ============================================

  describe('validateStories', () => {
    it('should return 200 with validation results', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 5,
        validCount: 5,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({
        found: true,
        files: [{ name: 'home.html', path: '/p/home.html' }]
      });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty('checks');
      expect(result.data).toHaveProperty('status');
    });

    it('should include checks array in response', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 2,
        validCount: 2,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({ found: false, files: [] });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      expect(Array.isArray(result.data.checks)).toBe(true);
    });

    it('should return status=ready when all stories valid and aligned', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 3,
        validCount: 3,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({
        found: true,
        files: [{ name: 'home.html', path: '/p/home.html' }]
      });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      expect(result.data.status).toBe('ready');
    });

    it('should return status=blocked when no stories found', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 0,
        validCount: 0,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({ found: false, files: [] });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      expect(result.data.status).toBe('blocked');
    });

    it('should return status=blocked when stories are invalid', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: false,
        totalCount: 3,
        validCount: 1,
        invalidCount: 2,
        stories: [
          { filename: 'story-1.json', valid: true },
          { filename: 'story-2.json', valid: false, errors: [{ field: 'id' }] }
        ]
      });
      mockDetectMockups.mockResolvedValue({ found: false, files: [] });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      expect(result.data.status).toBe('blocked');
    });

    it('should return status=blocked when alignment fails with low coverage', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 2,
        validCount: 2,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({
        found: true,
        files: [
          { name: 'home.html', path: '/p/home.html' },
          { name: 'about.html', path: '/p/about.html' },
          { name: 'contact.html', path: '/p/contact.html' }
        ]
      });
      mockCheckAlignment.mockReturnValue({
        aligned: false,
        coveragePercent: 33,  // Low coverage triggers block
        unmappedMockups: ['about.html', 'contact.html'],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      expect(result.data.status).toBe('blocked');
    });

    it('should return 400 when project path missing', async () => {
      const result = await validateStories('', 'project-123');

      expect(result.status).toBe(400);
      expect(result.error).toBeDefined();
    });

    it('should return 400 when project ID missing', async () => {
      const result = await validateStories('/project', '');

      expect(result.status).toBe(400);
      expect(result.error).toBeDefined();
    });

    it('should persist results to database', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 1,
        validCount: 1,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({ found: false, files: [] });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      await validateStories('/project', 'project-123');

      expect(mockSaveValidation).toHaveBeenCalledWith(
        'project-123',
        '_stories',
        expect.objectContaining({
          status: expect.any(String),
          checks: expect.any(Array)
        })
      );
    });

    it('should include story counts in response', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 5,
        validCount: 5,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({ found: false, files: [] });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      expect(result.data.storyCount).toBe(5);
      expect(result.data.validCount).toBe(5);
      expect(result.data.invalidCount).toBe(0);
    });

    it('should include alignment info in response', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 2,
        validCount: 2,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({
        found: true,
        files: [{ name: 'home.html', path: '/p/home.html' }]
      });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: { 'home.html': 2 }
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      expect(result.data.alignment).toBeDefined();
      expect(result.data.alignment.coveragePercent).toBe(100);
    });
  });

  // ============================================
  // Check Results Tests
  // ============================================

  describe('check results', () => {
    it('should include stories found check', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 3,
        validCount: 3,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({ found: false, files: [] });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      const storiesCheck = result.data.checks.find(c => c.name === 'Story Files');
      expect(storiesCheck).toBeDefined();
      expect(storiesCheck.status).toBe('pass');
    });

    it('should fail stories check when none found', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 0,
        validCount: 0,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({ found: false, files: [] });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      const storiesCheck = result.data.checks.find(c => c.name === 'Story Files');
      expect(storiesCheck.status).toBe('fail');
    });

    it('should include schema validation check', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 3,
        validCount: 3,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({ found: false, files: [] });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      const schemaCheck = result.data.checks.find(c => c.name === 'Schema Validation');
      expect(schemaCheck).toBeDefined();
      expect(schemaCheck.status).toBe('pass');
    });

    it('should fail schema check when stories invalid', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: false,
        totalCount: 3,
        validCount: 1,
        invalidCount: 2,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({ found: false, files: [] });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      const schemaCheck = result.data.checks.find(c => c.name === 'Schema Validation');
      expect(schemaCheck.status).toBe('fail');
    });

    it('should include alignment check', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 2,
        validCount: 2,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({
        found: true,
        files: [{ name: 'home.html', path: '/p/home.html' }]
      });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      const alignCheck = result.data.checks.find(c => c.name === 'Mockup Alignment');
      expect(alignCheck).toBeDefined();
    });

    it('should warn on alignment check when not fully aligned', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 2,
        validCount: 2,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({
        found: true,
        files: [
          { name: 'home.html', path: '/p/home.html' },
          { name: 'about.html', path: '/p/about.html' }
        ]
      });
      mockCheckAlignment.mockReturnValue({
        aligned: false,
        coveragePercent: 50,
        unmappedMockups: ['about.html'],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      const alignCheck = result.data.checks.find(c => c.name === 'Mockup Alignment');
      expect(alignCheck.status).toBe('warn');
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should handle validation errors gracefully', async () => {
      mockValidateAllStories.mockRejectedValue(new Error('Validation failed'));
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      expect(result.status).toBe(500);
      expect(result.error).toBeDefined();
    });

    it('should handle database save errors', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: true,
        totalCount: 1,
        validCount: 1,
        invalidCount: 0,
        stories: []
      });
      mockDetectMockups.mockResolvedValue({ found: false, files: [] });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockRejectedValue(new Error('DB error'));

      const result = await validateStories('/project', 'project-123');

      expect(result.status).toBe(200);
      expect(result.data.persistError).toBeDefined();
    });

    it('should include invalid story details in response', async () => {
      mockValidateAllStories.mockResolvedValue({
        valid: false,
        totalCount: 2,
        validCount: 1,
        invalidCount: 1,
        stories: [
          { filename: 'story-1.json', valid: true, storyId: 'S1' },
          { filename: 'story-2.json', valid: false, errors: [{ field: 'id', error: 'required' }] }
        ]
      });
      mockDetectMockups.mockResolvedValue({ found: false, files: [] });
      mockCheckAlignment.mockReturnValue({
        aligned: true,
        coveragePercent: 100,
        unmappedMockups: [],
        orphanedStories: [],
        storyCountPerMockup: {}
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateStories('/project', 'project-123');

      expect(result.data.invalidStories).toBeDefined();
      expect(result.data.invalidStories.length).toBe(1);
    });
  });
});
