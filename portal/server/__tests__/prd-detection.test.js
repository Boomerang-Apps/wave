/**
 * TDD Tests for PRD Detection Function (Launch Sequence)
 *
 * Phase 3, Step 3.1: PRD Detection Function
 *
 * Tests the function that detects PRD (Product Requirements Document)
 * files in a project directory.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockAccess, mockReaddir, mockReadFile, mockStat } = vi.hoisted(() => ({
  mockAccess: vi.fn(),
  mockReaddir: vi.fn(),
  mockReadFile: vi.fn(),
  mockStat: vi.fn()
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    access: mockAccess,
    readdir: mockReaddir,
    readFile: mockReadFile,
    stat: mockStat
  },
  access: mockAccess,
  readdir: mockReaddir,
  readFile: mockReadFile,
  stat: mockStat
}));

import {
  PRD_FILE_PATTERNS,
  PRD_SEARCH_LOCATIONS,
  detectPRD,
  parsePRDStructure
} from '../utils/prd-detection.js';

describe('PRD Detection Module', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Constants Tests
  // ============================================

  describe('PRD_FILE_PATTERNS', () => {
    it('should be an array of regex patterns', () => {
      expect(Array.isArray(PRD_FILE_PATTERNS)).toBe(true);
      expect(PRD_FILE_PATTERNS.length).toBeGreaterThan(0);
    });

    it('should match PRD.md', () => {
      const matches = PRD_FILE_PATTERNS.some(p => p.test('PRD.md'));
      expect(matches).toBe(true);
    });

    it('should match prd.md (case insensitive)', () => {
      const matches = PRD_FILE_PATTERNS.some(p => p.test('prd.md'));
      expect(matches).toBe(true);
    });

    it('should match Product-Requirements.md', () => {
      const matches = PRD_FILE_PATTERNS.some(p => p.test('Product-Requirements.md'));
      expect(matches).toBe(true);
    });

    it('should match MyApp-PRD.md', () => {
      const matches = PRD_FILE_PATTERNS.some(p => p.test('MyApp-PRD.md'));
      expect(matches).toBe(true);
    });

    it('should match PRD-v2.md', () => {
      const matches = PRD_FILE_PATTERNS.some(p => p.test('PRD-v2.md'));
      expect(matches).toBe(true);
    });

    it('should not match random markdown files', () => {
      const matches = PRD_FILE_PATTERNS.some(p => p.test('README.md'));
      expect(matches).toBe(false);
    });

    it('should not match random text files', () => {
      const matches = PRD_FILE_PATTERNS.some(p => p.test('notes.txt'));
      expect(matches).toBe(false);
    });
  });

  describe('PRD_SEARCH_LOCATIONS', () => {
    it('should be an array of search paths', () => {
      expect(Array.isArray(PRD_SEARCH_LOCATIONS)).toBe(true);
      expect(PRD_SEARCH_LOCATIONS.length).toBeGreaterThan(0);
    });

    it('should include root directory', () => {
      expect(PRD_SEARCH_LOCATIONS).toContain('.');
    });

    it('should include docs folder', () => {
      expect(PRD_SEARCH_LOCATIONS).toContain('docs');
    });

    it('should include documentation folder', () => {
      expect(PRD_SEARCH_LOCATIONS).toContain('documentation');
    });
  });

  // ============================================
  // detectPRD Function Tests
  // ============================================

  describe('detectPRD', () => {
    it('should return found=false when no PRD exists', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockReaddir.mockResolvedValue([]);

      const result = await detectPRD('/project');

      expect(result.found).toBe(false);
      expect(result.files).toEqual([]);
    });

    it('should return found=true when PRD.md exists in root', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockImplementation((dir) => {
        if (dir === '/project') {
          return Promise.resolve([
            { name: 'PRD.md', isFile: () => true, isDirectory: () => false }
          ]);
        }
        return Promise.resolve([]);
      });
      mockStat.mockResolvedValue({ isFile: () => true });

      const result = await detectPRD('/project');

      expect(result.found).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('should find PRD in docs folder', async () => {
      mockAccess.mockImplementation((path) => {
        if (path === '/project/docs') return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      mockReaddir.mockImplementation((dir) => {
        if (dir === '/project/docs') {
          return Promise.resolve([
            { name: 'PRD.md', isFile: () => true, isDirectory: () => false }
          ]);
        }
        return Promise.resolve([]);
      });
      mockStat.mockResolvedValue({ isFile: () => true });

      const result = await detectPRD('/project');

      expect(result.found).toBe(true);
      expect(result.files[0].path).toContain('docs');
    });

    it('should return file path and name', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockImplementation((dir) => {
        if (dir === '/project') {
          return Promise.resolve([
            { name: 'Product-Requirements.md', isFile: () => true, isDirectory: () => false }
          ]);
        }
        return Promise.resolve([]);
      });
      mockStat.mockResolvedValue({ isFile: () => true });

      const result = await detectPRD('/project');

      expect(result.files[0]).toHaveProperty('name', 'Product-Requirements.md');
      expect(result.files[0]).toHaveProperty('path');
    });

    it('should find multiple PRD files', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockImplementation((dir) => {
        if (dir === '/project') {
          return Promise.resolve([
            { name: 'PRD.md', isFile: () => true, isDirectory: () => false },
            { name: 'PRD-v2.md', isFile: () => true, isDirectory: () => false }
          ]);
        }
        return Promise.resolve([]);
      });
      mockStat.mockResolvedValue({ isFile: () => true });

      const result = await detectPRD('/project');

      expect(result.files.length).toBe(2);
    });

    it('should handle invalid project path', async () => {
      const result = await detectPRD('');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null project path', async () => {
      const result = await detectPRD(null);

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle filesystem errors gracefully', async () => {
      mockAccess.mockRejectedValue(new Error('Permission denied'));
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      const result = await detectPRD('/project');

      expect(result.found).toBe(false);
      expect(result.files).toEqual([]);
    });

    it('should ignore non-matching files', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockImplementation((dir) => {
        if (dir === '/project') {
          return Promise.resolve([
            { name: 'README.md', isFile: () => true, isDirectory: () => false },
            { name: 'PRD.md', isFile: () => true, isDirectory: () => false },
            { name: 'notes.txt', isFile: () => true, isDirectory: () => false }
          ]);
        }
        return Promise.resolve([]);
      });
      mockStat.mockResolvedValue({ isFile: () => true });

      const result = await detectPRD('/project');

      expect(result.files.length).toBe(1);
      expect(result.files[0].name).toBe('PRD.md');
    });

    it('should include file size in result', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockImplementation((dir) => {
        if (dir === '/project') {
          return Promise.resolve([
            { name: 'PRD.md', isFile: () => true, isDirectory: () => false }
          ]);
        }
        return Promise.resolve([]);
      });
      mockStat.mockResolvedValue({ isFile: () => true, size: 2048 });

      const result = await detectPRD('/project');

      expect(result.files[0]).toHaveProperty('size', 2048);
    });
  });

  // ============================================
  // parsePRDStructure Function Tests
  // ============================================

  describe('parsePRDStructure', () => {
    it('should extract title from markdown', async () => {
      const prdContent = `# My App PRD

## Overview
This is the product requirements document.
`;
      mockReadFile.mockResolvedValue(prdContent);

      const result = await parsePRDStructure('/project/PRD.md');

      expect(result.title).toBe('My App PRD');
    });

    it('should extract epics from markdown', async () => {
      const prdContent = `# PRD

## Epic 1: User Authentication
Description of auth epic.

## Epic 2: Dashboard
Description of dashboard epic.
`;
      mockReadFile.mockResolvedValue(prdContent);

      const result = await parsePRDStructure('/project/PRD.md');

      expect(result.epics.length).toBe(2);
      expect(result.epics[0].name).toContain('User Authentication');
      expect(result.epics[1].name).toContain('Dashboard');
    });

    it('should extract features from epics', async () => {
      const prdContent = `# PRD

## Epic 1: Authentication

### Feature 1.1: Login
Users can log in.

### Feature 1.2: Logout
Users can log out.
`;
      mockReadFile.mockResolvedValue(prdContent);

      const result = await parsePRDStructure('/project/PRD.md');

      expect(result.epics[0].features.length).toBe(2);
    });

    it('should return empty structure for empty file', async () => {
      mockReadFile.mockResolvedValue('');

      const result = await parsePRDStructure('/project/PRD.md');

      expect(result.title).toBe('');
      expect(result.epics).toEqual([]);
    });

    it('should handle file read errors', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const result = await parsePRDStructure('/project/PRD.md');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should count total features', async () => {
      const prdContent = `# PRD

## Epic 1: Auth
### Feature 1.1: Login
### Feature 1.2: Logout

## Epic 2: Dashboard
### Feature 2.1: Overview
`;
      mockReadFile.mockResolvedValue(prdContent);

      const result = await parsePRDStructure('/project/PRD.md');

      expect(result.featureCount).toBe(3);
    });

    it('should extract sections from PRD', async () => {
      const prdContent = `# PRD

## Overview
Product overview text.

## Goals
1. Goal one
2. Goal two

## Non-Goals
Things we won't do.
`;
      mockReadFile.mockResolvedValue(prdContent);

      const result = await parsePRDStructure('/project/PRD.md');

      expect(result.sections).toContain('Overview');
      expect(result.sections).toContain('Goals');
      expect(result.sections).toContain('Non-Goals');
    });

    it('should mark valid when structure is complete', async () => {
      const prdContent = `# My App PRD

## Overview
Description here.

## Epic 1: Core Features
### Feature 1.1: Main feature
`;
      mockReadFile.mockResolvedValue(prdContent);

      const result = await parsePRDStructure('/project/PRD.md');

      expect(result.valid).toBe(true);
    });

    it('should mark invalid when no title', async () => {
      const prdContent = `Some content without proper headers`;
      mockReadFile.mockResolvedValue(prdContent);

      const result = await parsePRDStructure('/project/PRD.md');

      expect(result.valid).toBe(false);
    });

    it('should mark invalid when no epics', async () => {
      const prdContent = `# My PRD

Just some text without epics.
`;
      mockReadFile.mockResolvedValue(prdContent);

      const result = await parsePRDStructure('/project/PRD.md');

      expect(result.valid).toBe(false);
    });
  });
});
