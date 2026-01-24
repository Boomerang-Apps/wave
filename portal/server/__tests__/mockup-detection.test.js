/**
 * TDD Tests for Mockup Detection (Launch Sequence)
 *
 * Phase 2, Step 2.2: Mockup Detection Function
 *
 * Tests the detectMockups() function that finds HTML mockup
 * files in the design_mockups folder.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create mock functions that can be accessed in vi.mock
const { mockAccess, mockReaddir } = vi.hoisted(() => ({
  mockAccess: vi.fn(),
  mockReaddir: vi.fn()
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: { access: mockAccess, readdir: mockReaddir },
  access: mockAccess,
  readdir: mockReaddir
}));

import {
  detectMockups,
  getMockupFolderPath,
  MOCKUP_FILE_PATTERNS
} from '../utils/mockup-detection.js';

describe('Mockup Detection', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // getMockupFolderPath Tests
  // ============================================

  describe('getMockupFolderPath', () => {
    it('should return path to design_mockups folder', () => {
      const projectRoot = '/projects/my-app';
      const result = getMockupFolderPath(projectRoot);

      expect(result).toBe('/projects/my-app/design_mockups');
    });

    it('should handle trailing slash in project root', () => {
      const projectRoot = '/projects/my-app/';
      const result = getMockupFolderPath(projectRoot);

      expect(result).toBe('/projects/my-app/design_mockups');
    });

    it('should handle Windows-style paths', () => {
      const projectRoot = 'C:\\projects\\my-app';
      const result = getMockupFolderPath(projectRoot);

      // Should normalize to forward slashes
      expect(result).toContain('design_mockups');
    });
  });

  // ============================================
  // detectMockups - Folder Detection
  // ============================================

  describe('detectMockups - folder detection', () => {
    it('should return empty array when design_mockups folder does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await detectMockups('/projects/my-app');

      expect(result.found).toBe(false);
      expect(result.files).toEqual([]);
      expect(result.folderExists).toBe(false);
    });

    it('should return found=true when folder exists with HTML files', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'home.html', isFile: () => true, isDirectory: () => false },
        { name: 'about.html', isFile: () => true, isDirectory: () => false }
      ]);

      const result = await detectMockups('/projects/my-app');

      expect(result.found).toBe(true);
      expect(result.folderExists).toBe(true);
    });

    it('should set folderExists=true even if no HTML files', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'readme.txt', isFile: () => true, isDirectory: () => false }
      ]);

      const result = await detectMockups('/projects/my-app');

      expect(result.folderExists).toBe(true);
      expect(result.found).toBe(false);
      expect(result.files).toEqual([]);
    });
  });

  // ============================================
  // detectMockups - File Finding
  // ============================================

  describe('detectMockups - file finding', () => {
    it('should find HTML files in folder', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'home.html', isFile: () => true, isDirectory: () => false },
        { name: 'about.html', isFile: () => true, isDirectory: () => false },
        { name: 'contact.html', isFile: () => true, isDirectory: () => false }
      ]);

      const result = await detectMockups('/projects/my-app');

      expect(result.files).toHaveLength(3);
      expect(result.files.map(f => f.name)).toContain('home.html');
      expect(result.files.map(f => f.name)).toContain('about.html');
      expect(result.files.map(f => f.name)).toContain('contact.html');
    });

    it('should find HTM files as well', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'page.htm', isFile: () => true, isDirectory: () => false }
      ]);

      const result = await detectMockups('/projects/my-app');

      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('page.htm');
    });

    it('should ignore non-HTML files', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'home.html', isFile: () => true, isDirectory: () => false },
        { name: 'styles.css', isFile: () => true, isDirectory: () => false },
        { name: 'script.js', isFile: () => true, isDirectory: () => false },
        { name: 'readme.md', isFile: () => true, isDirectory: () => false }
      ]);

      const result = await detectMockups('/projects/my-app');

      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('home.html');
    });

    it('should ignore directories', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'home.html', isFile: () => true, isDirectory: () => false },
        { name: 'assets', isFile: () => false, isDirectory: () => true }
      ]);

      const result = await detectMockups('/projects/my-app');

      expect(result.files).toHaveLength(1);
    });

    it('should return empty array when no mockups exist', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([]);

      const result = await detectMockups('/projects/my-app');

      expect(result.files).toEqual([]);
      expect(result.found).toBe(false);
    });
  });

  // ============================================
  // detectMockups - Sorting
  // ============================================

  describe('detectMockups - sorting', () => {
    it('should sort files by name alphabetically', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'z-page.html', isFile: () => true, isDirectory: () => false },
        { name: 'a-page.html', isFile: () => true, isDirectory: () => false },
        { name: 'm-page.html', isFile: () => true, isDirectory: () => false }
      ]);

      const result = await detectMockups('/projects/my-app');

      expect(result.files[0].name).toBe('a-page.html');
      expect(result.files[1].name).toBe('m-page.html');
      expect(result.files[2].name).toBe('z-page.html');
    });

    it('should sort numerically named files correctly', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: '10-checkout.html', isFile: () => true, isDirectory: () => false },
        { name: '1-home.html', isFile: () => true, isDirectory: () => false },
        { name: '2-about.html', isFile: () => true, isDirectory: () => false }
      ]);

      const result = await detectMockups('/projects/my-app');

      // Natural sort: 1, 2, 10 (not 1, 10, 2)
      expect(result.files[0].name).toBe('1-home.html');
      expect(result.files[1].name).toBe('2-about.html');
      expect(result.files[2].name).toBe('10-checkout.html');
    });
  });

  // ============================================
  // detectMockups - File Info
  // ============================================

  describe('detectMockups - file info', () => {
    it('should include full path for each file', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'home.html', isFile: () => true, isDirectory: () => false }
      ]);

      const result = await detectMockups('/projects/my-app');

      expect(result.files[0].path).toBe('/projects/my-app/design_mockups/home.html');
    });

    it('should include file name for each file', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'home.html', isFile: () => true, isDirectory: () => false }
      ]);

      const result = await detectMockups('/projects/my-app');

      expect(result.files[0].name).toBe('home.html');
    });
  });

  // ============================================
  // MOCKUP_FILE_PATTERNS Tests
  // ============================================

  describe('MOCKUP_FILE_PATTERNS', () => {
    it('should include .html extension', () => {
      expect(MOCKUP_FILE_PATTERNS).toContain('.html');
    });

    it('should include .htm extension', () => {
      expect(MOCKUP_FILE_PATTERNS).toContain('.htm');
    });

    it('should be case-insensitive patterns', () => {
      // Implementation should handle .HTML, .Html, etc.
      expect(MOCKUP_FILE_PATTERNS.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should handle empty project path', async () => {
      const result = await detectMockups('');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null project path', async () => {
      const result = await detectMockups(null);

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle file system errors gracefully', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      const result = await detectMockups('/projects/my-app');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle files with spaces in names', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'my page.html', isFile: () => true, isDirectory: () => false }
      ]);

      const result = await detectMockups('/projects/my-app');

      expect(result.files[0].name).toBe('my page.html');
    });

    it('should handle case-insensitive extensions', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'page.HTML', isFile: () => true, isDirectory: () => false },
        { name: 'page2.Html', isFile: () => true, isDirectory: () => false }
      ]);

      const result = await detectMockups('/projects/my-app');

      expect(result.files).toHaveLength(2);
    });
  });
});
