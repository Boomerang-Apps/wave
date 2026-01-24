/**
 * TDD Tests for Mockup Validation Endpoint (Launch Sequence)
 *
 * Phase 2, Step 2.4: Mockup Validation Endpoint
 *
 * Tests the POST /api/validate-mockups endpoint that validates
 * mockup files and persists results to the database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockDetect, mockAnalyze, mockSaveValidation } = vi.hoisted(() => ({
  mockDetect: vi.fn(),
  mockAnalyze: vi.fn(),
  mockSaveValidation: vi.fn()
}));

// Mock dependencies
vi.mock('../utils/mockup-detection.js', () => ({
  detectMockups: mockDetect
}));

vi.mock('../utils/mockup-analysis.js', () => ({
  analyzeMockup: mockAnalyze
}));

vi.mock('../utils/validation-persistence.js', () => ({
  saveValidation: mockSaveValidation
}));

import {
  validateMockups,
  createMockupValidationRequest
} from '../utils/mockup-endpoint.js';

describe('Mockup Validation Endpoint', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // validateMockups Function Tests
  // ============================================

  describe('validateMockups', () => {
    it('should return 200 with validation results', async () => {
      mockDetect.mockResolvedValue({
        found: true,
        folderExists: true,
        files: [{ name: 'home.html', path: '/project/design_mockups/home.html' }]
      });
      mockAnalyze.mockResolvedValue({
        valid: true,
        title: 'Home Page',
        forms: [],
        navigation: { links: [] },
        interactiveElements: { buttons: [], selects: [], textareas: [], checkboxes: [], radios: [] },
        summary: 'Basic page'
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateMockups('/project', 'project-123');

      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty('checks');
      expect(result.data).toHaveProperty('status');
      expect(result.data).toHaveProperty('screens');
    });

    it('should include checks array in response', async () => {
      mockDetect.mockResolvedValue({
        found: true,
        folderExists: true,
        files: [{ name: 'home.html', path: '/project/design_mockups/home.html' }]
      });
      mockAnalyze.mockResolvedValue({ valid: true, title: 'Home', forms: [], navigation: { links: [] }, interactiveElements: { buttons: [], selects: [], textareas: [], checkboxes: [], radios: [] }, summary: '' });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateMockups('/project', 'project-123');

      expect(Array.isArray(result.data.checks)).toBe(true);
    });

    it('should include screens list in response', async () => {
      mockDetect.mockResolvedValue({
        found: true,
        folderExists: true,
        files: [
          { name: 'home.html', path: '/project/design_mockups/home.html' },
          { name: 'about.html', path: '/project/design_mockups/about.html' }
        ]
      });
      mockAnalyze.mockResolvedValue({ valid: true, title: 'Page', forms: [], navigation: { links: [] }, interactiveElements: { buttons: [], selects: [], textareas: [], checkboxes: [], radios: [] }, summary: '' });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateMockups('/project', 'project-123');

      expect(result.data.screens).toHaveLength(2);
    });

    it('should return status=ready when all checks pass', async () => {
      mockDetect.mockResolvedValue({
        found: true,
        folderExists: true,
        files: [{ name: 'home.html', path: '/project/design_mockups/home.html' }]
      });
      mockAnalyze.mockResolvedValue({ valid: true, title: 'Home', forms: [], navigation: { links: [] }, interactiveElements: { buttons: [], selects: [], textareas: [], checkboxes: [], radios: [] }, summary: '' });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateMockups('/project', 'project-123');

      expect(result.data.status).toBe('ready');
    });

    it('should return status=blocked when mockup folder missing', async () => {
      mockDetect.mockResolvedValue({
        found: false,
        folderExists: false,
        files: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateMockups('/project', 'project-123');

      expect(result.data.status).toBe('blocked');
    });

    it('should return status=blocked when no HTML files found', async () => {
      mockDetect.mockResolvedValue({
        found: false,
        folderExists: true,
        files: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateMockups('/project', 'project-123');

      expect(result.data.status).toBe('blocked');
    });

    it('should return 400 when project path missing', async () => {
      const result = await validateMockups('', 'project-123');

      expect(result.status).toBe(400);
      expect(result.error).toBeDefined();
    });

    it('should return 400 when project ID missing', async () => {
      const result = await validateMockups('/project', '');

      expect(result.status).toBe(400);
      expect(result.error).toBeDefined();
    });

    it('should persist results to database', async () => {
      mockDetect.mockResolvedValue({
        found: true,
        folderExists: true,
        files: [{ name: 'home.html', path: '/project/design_mockups/home.html' }]
      });
      mockAnalyze.mockResolvedValue({ valid: true, title: 'Home', forms: [], navigation: { links: [] }, interactiveElements: { buttons: [], selects: [], textareas: [], checkboxes: [], radios: [] }, summary: '' });
      mockSaveValidation.mockResolvedValue({ success: true });

      await validateMockups('/project', 'project-123');

      expect(mockSaveValidation).toHaveBeenCalledWith(
        'project-123',
        '_mockup',
        expect.objectContaining({
          status: expect.any(String),
          checks: expect.any(Array),
          screens: expect.any(Array)
        })
      );
    });

    it('should include timestamp in persisted data', async () => {
      mockDetect.mockResolvedValue({
        found: true,
        folderExists: true,
        files: [{ name: 'home.html', path: '/project/design_mockups/home.html' }]
      });
      mockAnalyze.mockResolvedValue({ valid: true, title: 'Home', forms: [], navigation: { links: [] }, interactiveElements: { buttons: [], selects: [], textareas: [], checkboxes: [], radios: [] }, summary: '' });
      mockSaveValidation.mockResolvedValue({ success: true });

      await validateMockups('/project', 'project-123');

      expect(mockSaveValidation).toHaveBeenCalledWith(
        'project-123',
        '_mockup',
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });
  });

  // ============================================
  // Check Results Tests
  // ============================================

  describe('check results', () => {
    it('should include folder existence check', async () => {
      mockDetect.mockResolvedValue({ found: true, folderExists: true, files: [{ name: 'home.html', path: '/project/design_mockups/home.html' }] });
      mockAnalyze.mockResolvedValue({ valid: true, title: '', forms: [], navigation: { links: [] }, interactiveElements: { buttons: [], selects: [], textareas: [], checkboxes: [], radios: [] }, summary: '' });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateMockups('/project', 'project-123');

      const folderCheck = result.data.checks.find(c => c.name === 'Mockup Folder');
      expect(folderCheck).toBeDefined();
      expect(folderCheck.status).toBe('pass');
    });

    it('should fail folder check when folder missing', async () => {
      mockDetect.mockResolvedValue({ found: false, folderExists: false, files: [] });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateMockups('/project', 'project-123');

      const folderCheck = result.data.checks.find(c => c.name === 'Mockup Folder');
      expect(folderCheck.status).toBe('fail');
    });

    it('should include HTML files check', async () => {
      mockDetect.mockResolvedValue({ found: true, folderExists: true, files: [{ name: 'home.html', path: '/project/design_mockups/home.html' }] });
      mockAnalyze.mockResolvedValue({ valid: true, title: '', forms: [], navigation: { links: [] }, interactiveElements: { buttons: [], selects: [], textareas: [], checkboxes: [], radios: [] }, summary: '' });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateMockups('/project', 'project-123');

      const filesCheck = result.data.checks.find(c => c.name === 'HTML Files');
      expect(filesCheck).toBeDefined();
      expect(filesCheck.status).toBe('pass');
    });

    it('should include individual mockup analysis checks', async () => {
      mockDetect.mockResolvedValue({
        found: true,
        folderExists: true,
        files: [
          { name: 'home.html', path: '/project/design_mockups/home.html' },
          { name: 'about.html', path: '/project/design_mockups/about.html' }
        ]
      });
      mockAnalyze.mockResolvedValue({ valid: true, title: 'Page', forms: [], navigation: { links: [] }, interactiveElements: { buttons: [], selects: [], textareas: [], checkboxes: [], radios: [] }, summary: 'OK' });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateMockups('/project', 'project-123');

      const homeCheck = result.data.checks.find(c => c.name === 'home.html');
      const aboutCheck = result.data.checks.find(c => c.name === 'about.html');
      expect(homeCheck).toBeDefined();
      expect(aboutCheck).toBeDefined();
    });
  });

  // ============================================
  // createMockupValidationRequest Tests
  // ============================================

  describe('createMockupValidationRequest', () => {
    it('should create valid request object', () => {
      const req = createMockupValidationRequest('/project', 'project-123');

      expect(req).toHaveProperty('projectPath', '/project');
      expect(req).toHaveProperty('projectId', 'project-123');
    });

    it('should validate required fields', () => {
      const req = createMockupValidationRequest('', '');

      expect(req.isValid).toBe(false);
      expect(req.errors).toContain('Project path is required');
      expect(req.errors).toContain('Project ID is required');
    });

    it('should return isValid=true when all fields present', () => {
      const req = createMockupValidationRequest('/project', 'project-123');

      expect(req.isValid).toBe(true);
      expect(req.errors).toHaveLength(0);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should handle detection errors gracefully', async () => {
      mockDetect.mockRejectedValue(new Error('Permission denied'));
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateMockups('/project', 'project-123');

      expect(result.status).toBe(500);
      expect(result.error).toBeDefined();
    });

    it('should handle analysis errors for individual files', async () => {
      mockDetect.mockResolvedValue({
        found: true,
        folderExists: true,
        files: [{ name: 'broken.html', path: '/project/design_mockups/broken.html' }]
      });
      mockAnalyze.mockResolvedValue({
        valid: false,
        error: 'Invalid HTML',
        title: '',
        forms: [],
        navigation: { links: [] },
        interactiveElements: { buttons: [], selects: [], textareas: [], checkboxes: [], radios: [] },
        summary: ''
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validateMockups('/project', 'project-123');

      // Should still return 200 but with warn status on the file
      expect(result.status).toBe(200);
      const brokenCheck = result.data.checks.find(c => c.name === 'broken.html');
      expect(brokenCheck.status).toBe('warn');
    });

    it('should handle database save errors', async () => {
      mockDetect.mockResolvedValue({
        found: true,
        folderExists: true,
        files: [{ name: 'home.html', path: '/project/design_mockups/home.html' }]
      });
      mockAnalyze.mockResolvedValue({ valid: true, title: '', forms: [], navigation: { links: [] }, interactiveElements: { buttons: [], selects: [], textareas: [], checkboxes: [], radios: [] }, summary: '' });
      mockSaveValidation.mockRejectedValue(new Error('DB error'));

      const result = await validateMockups('/project', 'project-123');

      // Should still return validation results even if save fails
      expect(result.status).toBe(200);
      expect(result.data.persistError).toBeDefined();
    });
  });
});
