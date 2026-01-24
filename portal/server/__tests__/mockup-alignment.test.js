/**
 * TDD Tests for Mockup-Story Alignment Checker (Launch Sequence)
 *
 * Phase 3, Step 3.3: Mockup-Story Alignment Checker
 *
 * Tests the alignment between mockups and stories to ensure
 * every mockup has stories and every story references a mockup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  checkMockupStoryAlignment,
  findUnmappedMockups,
  findOrphanedStories,
  calculateAlignmentScore,
  createAlignmentReport
} from '../utils/mockup-alignment.js';

describe('Mockup-Story Alignment Checker', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // checkMockupStoryAlignment Tests
  // ============================================

  describe('checkMockupStoryAlignment', () => {
    it('should return aligned=true when all mockups have stories', () => {
      const mockups = [
        { name: 'home.html', path: '/mockups/home.html' },
        { name: 'about.html', path: '/mockups/about.html' }
      ];
      const stories = [
        { id: 'STORY-001', title: 'Home Page', mockupRef: 'home.html' },
        { id: 'STORY-002', title: 'About Page', mockupRef: 'about.html' }
      ];

      const result = checkMockupStoryAlignment(mockups, stories);

      expect(result.aligned).toBe(true);
    });

    it('should return aligned=false when mockup has no stories', () => {
      const mockups = [
        { name: 'home.html', path: '/mockups/home.html' },
        { name: 'contact.html', path: '/mockups/contact.html' }
      ];
      const stories = [
        { id: 'STORY-001', title: 'Home Page', mockupRef: 'home.html' }
      ];

      const result = checkMockupStoryAlignment(mockups, stories);

      expect(result.aligned).toBe(false);
    });

    it('should return unmapped mockups list', () => {
      const mockups = [
        { name: 'home.html', path: '/mockups/home.html' },
        { name: 'contact.html', path: '/mockups/contact.html' }
      ];
      const stories = [
        { id: 'STORY-001', title: 'Home Page', mockupRef: 'home.html' }
      ];

      const result = checkMockupStoryAlignment(mockups, stories);

      expect(result.unmappedMockups).toContain('contact.html');
    });

    it('should return orphaned stories list', () => {
      const mockups = [
        { name: 'home.html', path: '/mockups/home.html' }
      ];
      const stories = [
        { id: 'STORY-001', title: 'Home Page', mockupRef: 'home.html' },
        { id: 'STORY-002', title: 'Settings', mockupRef: 'settings.html' }
      ];

      const result = checkMockupStoryAlignment(mockups, stories);

      expect(result.orphanedStories).toContain('STORY-002');
    });

    it('should calculate coverage percentage', () => {
      const mockups = [
        { name: 'home.html', path: '/mockups/home.html' },
        { name: 'about.html', path: '/mockups/about.html' },
        { name: 'contact.html', path: '/mockups/contact.html' },
        { name: 'settings.html', path: '/mockups/settings.html' }
      ];
      const stories = [
        { id: 'STORY-001', title: 'Home Page', mockupRef: 'home.html' },
        { id: 'STORY-002', title: 'About Page', mockupRef: 'about.html' }
      ];

      const result = checkMockupStoryAlignment(mockups, stories);

      expect(result.coveragePercent).toBe(50);
    });

    it('should return 100% coverage when fully aligned', () => {
      const mockups = [
        { name: 'home.html', path: '/mockups/home.html' }
      ];
      const stories = [
        { id: 'STORY-001', title: 'Home Page', mockupRef: 'home.html' }
      ];

      const result = checkMockupStoryAlignment(mockups, stories);

      expect(result.coveragePercent).toBe(100);
    });

    it('should return 0% coverage when no stories match', () => {
      const mockups = [
        { name: 'home.html', path: '/mockups/home.html' }
      ];
      const stories = [
        { id: 'STORY-001', title: 'Random', mockupRef: 'other.html' }
      ];

      const result = checkMockupStoryAlignment(mockups, stories);

      expect(result.coveragePercent).toBe(0);
    });

    it('should handle empty mockups array', () => {
      const mockups = [];
      const stories = [
        { id: 'STORY-001', title: 'Home', mockupRef: 'home.html' }
      ];

      const result = checkMockupStoryAlignment(mockups, stories);

      expect(result.aligned).toBe(true);
      expect(result.coveragePercent).toBe(100);
    });

    it('should handle empty stories array', () => {
      const mockups = [
        { name: 'home.html', path: '/mockups/home.html' }
      ];
      const stories = [];

      const result = checkMockupStoryAlignment(mockups, stories);

      expect(result.aligned).toBe(false);
      expect(result.coveragePercent).toBe(0);
    });

    it('should handle both empty arrays', () => {
      const result = checkMockupStoryAlignment([], []);

      expect(result.aligned).toBe(true);
      expect(result.coveragePercent).toBe(100);
    });

    it('should match stories without mockupRef by title', () => {
      const mockups = [
        { name: 'home-page.html', path: '/mockups/home-page.html' }
      ];
      const stories = [
        { id: 'STORY-001', title: 'Home Page Feature' }
      ];

      const result = checkMockupStoryAlignment(mockups, stories);

      expect(result.coveragePercent).toBeGreaterThan(0);
    });

    it('should count stories per mockup', () => {
      const mockups = [
        { name: 'home.html', path: '/mockups/home.html' }
      ];
      const stories = [
        { id: 'STORY-001', title: 'Home Header', mockupRef: 'home.html' },
        { id: 'STORY-002', title: 'Home Footer', mockupRef: 'home.html' },
        { id: 'STORY-003', title: 'Home Content', mockupRef: 'home.html' }
      ];

      const result = checkMockupStoryAlignment(mockups, stories);

      expect(result.storyCountPerMockup['home.html']).toBe(3);
    });
  });

  // ============================================
  // findUnmappedMockups Tests
  // ============================================

  describe('findUnmappedMockups', () => {
    it('should return empty array when all mockups have stories', () => {
      const mockups = [{ name: 'home.html' }];
      const stories = [{ mockupRef: 'home.html' }];

      const result = findUnmappedMockups(mockups, stories);

      expect(result).toEqual([]);
    });

    it('should return mockups without corresponding stories', () => {
      const mockups = [
        { name: 'home.html' },
        { name: 'orphan.html' }
      ];
      const stories = [{ mockupRef: 'home.html' }];

      const result = findUnmappedMockups(mockups, stories);

      expect(result).toContain('orphan.html');
    });

    it('should handle case-insensitive matching', () => {
      const mockups = [{ name: 'Home.HTML' }];
      const stories = [{ mockupRef: 'home.html' }];

      const result = findUnmappedMockups(mockups, stories);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // findOrphanedStories Tests
  // ============================================

  describe('findOrphanedStories', () => {
    it('should return empty array when all stories have mockups', () => {
      const mockups = [{ name: 'home.html' }];
      const stories = [{ id: 'S1', mockupRef: 'home.html' }];

      const result = findOrphanedStories(mockups, stories);

      expect(result).toEqual([]);
    });

    it('should return stories referencing non-existent mockups', () => {
      const mockups = [{ name: 'home.html' }];
      const stories = [
        { id: 'S1', mockupRef: 'home.html' },
        { id: 'S2', mockupRef: 'missing.html' }
      ];

      const result = findOrphanedStories(mockups, stories);

      expect(result).toContain('S2');
    });

    it('should not flag stories without mockupRef as orphaned', () => {
      const mockups = [{ name: 'home.html' }];
      const stories = [{ id: 'S1', title: 'Backend Story' }];

      const result = findOrphanedStories(mockups, stories);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // calculateAlignmentScore Tests
  // ============================================

  describe('calculateAlignmentScore', () => {
    it('should return 100 for perfect alignment', () => {
      const mockups = [{ name: 'home.html' }, { name: 'about.html' }];
      const stories = [
        { mockupRef: 'home.html' },
        { mockupRef: 'about.html' }
      ];

      const score = calculateAlignmentScore(mockups, stories);

      expect(score).toBe(100);
    });

    it('should return 0 when no alignment', () => {
      const mockups = [{ name: 'home.html' }];
      const stories = [{ mockupRef: 'other.html' }];

      const score = calculateAlignmentScore(mockups, stories);

      expect(score).toBe(0);
    });

    it('should calculate partial alignment', () => {
      const mockups = [
        { name: 'home.html' },
        { name: 'about.html' },
        { name: 'contact.html' },
        { name: 'settings.html' }
      ];
      const stories = [
        { mockupRef: 'home.html' },
        { mockupRef: 'about.html' }
      ];

      const score = calculateAlignmentScore(mockups, stories);

      expect(score).toBe(50);
    });

    it('should return 100 for empty mockups', () => {
      const score = calculateAlignmentScore([], [{ mockupRef: 'any.html' }]);
      expect(score).toBe(100);
    });
  });

  // ============================================
  // createAlignmentReport Tests
  // ============================================

  describe('createAlignmentReport', () => {
    it('should create a summary report', () => {
      const mockups = [
        { name: 'home.html', path: '/mockups/home.html' }
      ];
      const stories = [
        { id: 'S1', title: 'Home', mockupRef: 'home.html' }
      ];

      const report = createAlignmentReport(mockups, stories);

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('mockupCount');
      expect(report).toHaveProperty('storyCount');
      expect(report).toHaveProperty('coveragePercent');
      expect(report).toHaveProperty('status');
    });

    it('should set status to ready when aligned', () => {
      const mockups = [{ name: 'home.html', path: '/m/home.html' }];
      const stories = [{ id: 'S1', mockupRef: 'home.html' }];

      const report = createAlignmentReport(mockups, stories);

      expect(report.status).toBe('ready');
    });

    it('should set status to blocked when not aligned', () => {
      const mockups = [
        { name: 'home.html', path: '/m/home.html' },
        { name: 'unmapped.html', path: '/m/unmapped.html' }
      ];
      const stories = [{ id: 'S1', mockupRef: 'home.html' }];

      const report = createAlignmentReport(mockups, stories);

      expect(report.status).toBe('blocked');
    });

    it('should include list of gaps', () => {
      const mockups = [
        { name: 'home.html', path: '/m/home.html' },
        { name: 'unmapped.html', path: '/m/unmapped.html' }
      ];
      const stories = [{ id: 'S1', mockupRef: 'home.html' }];

      const report = createAlignmentReport(mockups, stories);

      expect(report.gaps).toContain('unmapped.html');
    });

    it('should include timestamp', () => {
      const report = createAlignmentReport([], []);

      expect(report.timestamp).toBeDefined();
      expect(typeof report.timestamp).toBe('string');
    });

    it('should provide human-readable summary', () => {
      const mockups = [{ name: 'home.html', path: '/m/home.html' }];
      const stories = [{ id: 'S1', mockupRef: 'home.html' }];

      const report = createAlignmentReport(mockups, stories);

      expect(report.summary).toContain('1');
      expect(report.summary.toLowerCase()).toContain('mockup');
    });
  });
});
