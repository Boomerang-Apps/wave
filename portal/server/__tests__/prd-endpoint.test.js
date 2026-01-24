/**
 * TDD Tests for PRD Validation Endpoint (Launch Sequence)
 *
 * Phase 3, Step 3.4: PRD Validation Endpoint
 *
 * Tests the POST /api/validate-prd endpoint that validates
 * PRD files and persists results to the database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockDetectPRD, mockParsePRDStructure, mockSaveValidation } = vi.hoisted(() => ({
  mockDetectPRD: vi.fn(),
  mockParsePRDStructure: vi.fn(),
  mockSaveValidation: vi.fn()
}));

// Mock dependencies
vi.mock('../utils/prd-detection.js', () => ({
  detectPRD: mockDetectPRD,
  parsePRDStructure: mockParsePRDStructure
}));

vi.mock('../utils/validation-persistence.js', () => ({
  saveValidation: mockSaveValidation
}));

import {
  validatePRD,
  createPRDValidationRequest
} from '../utils/prd-endpoint.js';

describe('PRD Validation Endpoint', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // createPRDValidationRequest Tests
  // ============================================

  describe('createPRDValidationRequest', () => {
    it('should create valid request object', () => {
      const req = createPRDValidationRequest('/project', 'project-123');

      expect(req).toHaveProperty('projectPath', '/project');
      expect(req).toHaveProperty('projectId', 'project-123');
    });

    it('should validate required fields', () => {
      const req = createPRDValidationRequest('', '');

      expect(req.isValid).toBe(false);
      expect(req.errors).toContain('Project path is required');
      expect(req.errors).toContain('Project ID is required');
    });

    it('should return isValid=true when all fields present', () => {
      const req = createPRDValidationRequest('/project', 'project-123');

      expect(req.isValid).toBe(true);
      expect(req.errors).toHaveLength(0);
    });
  });

  // ============================================
  // validatePRD Function Tests
  // ============================================

  describe('validatePRD', () => {
    it('should return 200 with validation results', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 1024 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: true,
        title: 'My App PRD',
        epics: [{ name: 'Epic 1', features: [] }],
        featureCount: 3,
        sections: ['Overview', 'Goals']
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty('checks');
      expect(result.data).toHaveProperty('status');
    });

    it('should include checks array in response', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 1024 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: true,
        title: 'PRD',
        epics: [{ name: 'Epic', features: [] }],
        featureCount: 1,
        sections: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      expect(Array.isArray(result.data.checks)).toBe(true);
    });

    it('should return status=ready when PRD is valid', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 1024 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: true,
        title: 'My PRD',
        epics: [{ name: 'Epic', features: [{ name: 'Feature' }] }],
        featureCount: 1,
        sections: ['Overview']
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      expect(result.data.status).toBe('ready');
    });

    it('should return status=blocked when no PRD found', async () => {
      mockDetectPRD.mockResolvedValue({
        found: false,
        files: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      expect(result.data.status).toBe('blocked');
    });

    it('should return status=blocked when PRD structure is invalid', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 100 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: false,
        title: '',
        epics: [],
        featureCount: 0,
        sections: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      expect(result.data.status).toBe('blocked');
    });

    it('should return 400 when project path missing', async () => {
      const result = await validatePRD('', 'project-123');

      expect(result.status).toBe(400);
      expect(result.error).toBeDefined();
    });

    it('should return 400 when project ID missing', async () => {
      const result = await validatePRD('/project', '');

      expect(result.status).toBe(400);
      expect(result.error).toBeDefined();
    });

    it('should persist results to database', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 1024 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: true,
        title: 'PRD',
        epics: [{ name: 'Epic', features: [] }],
        featureCount: 0,
        sections: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      await validatePRD('/project', 'project-123');

      expect(mockSaveValidation).toHaveBeenCalledWith(
        'project-123',
        '_prd',
        expect.objectContaining({
          status: expect.any(String),
          checks: expect.any(Array)
        })
      );
    });

    it('should include timestamp in persisted data', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 1024 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: true,
        title: 'PRD',
        epics: [{ name: 'Epic', features: [] }],
        featureCount: 0,
        sections: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      await validatePRD('/project', 'project-123');

      expect(mockSaveValidation).toHaveBeenCalledWith(
        'project-123',
        '_prd',
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });

    it('should include PRD file info in response', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 2048 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: true,
        title: 'My App',
        epics: [{ name: 'Epic', features: [] }],
        featureCount: 0,
        sections: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      expect(result.data.prdFile).toBeDefined();
      expect(result.data.prdFile.name).toBe('PRD.md');
    });

    it('should include PRD structure in response', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 1024 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: true,
        title: 'My App PRD',
        epics: [
          { name: 'Epic 1', features: [{ name: 'Feature 1' }] },
          { name: 'Epic 2', features: [{ name: 'Feature 2' }] }
        ],
        featureCount: 2,
        sections: ['Overview', 'Goals']
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      expect(result.data.structure).toBeDefined();
      expect(result.data.structure.epicCount).toBe(2);
      expect(result.data.structure.featureCount).toBe(2);
    });
  });

  // ============================================
  // Check Results Tests
  // ============================================

  describe('check results', () => {
    it('should include PRD file check', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 1024 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: true,
        title: 'PRD',
        epics: [{ name: 'Epic', features: [] }],
        featureCount: 0,
        sections: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      const prdCheck = result.data.checks.find(c => c.name === 'PRD Document');
      expect(prdCheck).toBeDefined();
      expect(prdCheck.status).toBe('pass');
    });

    it('should fail PRD check when not found', async () => {
      mockDetectPRD.mockResolvedValue({
        found: false,
        files: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      const prdCheck = result.data.checks.find(c => c.name === 'PRD Document');
      expect(prdCheck.status).toBe('fail');
    });

    it('should include title check', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 1024 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: true,
        title: 'My App PRD',
        epics: [{ name: 'Epic', features: [] }],
        featureCount: 0,
        sections: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      const titleCheck = result.data.checks.find(c => c.name === 'PRD Title');
      expect(titleCheck).toBeDefined();
      expect(titleCheck.status).toBe('pass');
    });

    it('should include epics check', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 1024 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: true,
        title: 'PRD',
        epics: [{ name: 'Epic 1', features: [] }],
        featureCount: 0,
        sections: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      const epicsCheck = result.data.checks.find(c => c.name === 'Epics Defined');
      expect(epicsCheck).toBeDefined();
    });

    it('should fail epics check when no epics', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 1024 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: false,
        title: 'PRD',
        epics: [],
        featureCount: 0,
        sections: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      const epicsCheck = result.data.checks.find(c => c.name === 'Epics Defined');
      expect(epicsCheck.status).toBe('fail');
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should handle detection errors gracefully', async () => {
      mockDetectPRD.mockRejectedValue(new Error('Permission denied'));
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      expect(result.status).toBe(500);
      expect(result.error).toBeDefined();
    });

    it('should handle parse errors gracefully', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 1024 }]
      });
      mockParsePRDStructure.mockRejectedValue(new Error('Parse failed'));
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      expect(result.status).toBe(200);
      expect(result.data.status).toBe('blocked');
    });

    it('should handle database save errors', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [{ name: 'PRD.md', path: '/project/PRD.md', size: 1024 }]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: true,
        title: 'PRD',
        epics: [{ name: 'Epic', features: [] }],
        featureCount: 0,
        sections: []
      });
      mockSaveValidation.mockRejectedValue(new Error('DB error'));

      const result = await validatePRD('/project', 'project-123');

      expect(result.status).toBe(200);
      expect(result.data.persistError).toBeDefined();
    });

    it('should handle multiple PRD files (use first)', async () => {
      mockDetectPRD.mockResolvedValue({
        found: true,
        files: [
          { name: 'PRD.md', path: '/project/PRD.md', size: 1024 },
          { name: 'PRD-v2.md', path: '/project/PRD-v2.md', size: 2048 }
        ]
      });
      mockParsePRDStructure.mockResolvedValue({
        valid: true,
        title: 'PRD',
        epics: [{ name: 'Epic', features: [] }],
        featureCount: 0,
        sections: []
      });
      mockSaveValidation.mockResolvedValue({ success: true });

      const result = await validatePRD('/project', 'project-123');

      expect(mockParsePRDStructure).toHaveBeenCalledWith('/project/PRD.md');
    });
  });
});
