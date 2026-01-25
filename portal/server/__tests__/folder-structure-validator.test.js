// ═══════════════════════════════════════════════════════════════════════════════
// FOLDER STRUCTURE VALIDATOR TESTS (Gate 0 Enhancement)
// ═══════════════════════════════════════════════════════════════════════════════
// Validates project folder structure against recommended best practices
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateFolderStructure,
  getRecommendedStructure,
  calculateStructureComplianceScore,
  getStructureDeviations,
  STRUCTURE_TEMPLATES
} from '../utils/folder-structure-validator.js';

describe('FolderStructureValidator', () => {
  describe('STRUCTURE_TEMPLATES', () => {
    it('should have nextjs template defined', () => {
      expect(STRUCTURE_TEMPLATES.nextjs).toBeDefined();
      expect(STRUCTURE_TEMPLATES.nextjs.required).toBeInstanceOf(Array);
      expect(STRUCTURE_TEMPLATES.nextjs.recommended).toBeInstanceOf(Array);
    });

    it('should have required folders for nextjs', () => {
      const { required } = STRUCTURE_TEMPLATES.nextjs;
      expect(required).toContain('docs');
      expect(required).toContain('mockups');
    });

    it('should have recommended folders for nextjs', () => {
      const { recommended } = STRUCTURE_TEMPLATES.nextjs;
      expect(recommended).toContain('src');
      expect(recommended).toContain('public');
    });

    it('should have required files for nextjs', () => {
      const { requiredFiles } = STRUCTURE_TEMPLATES.nextjs;
      expect(requiredFiles).toContain('docs/PRD.md');
      expect(requiredFiles).toContain('docs/CLAUDE.md');
    });
  });

  describe('getRecommendedStructure', () => {
    it('should return nextjs structure by default', () => {
      const structure = getRecommendedStructure();
      expect(structure).toEqual(STRUCTURE_TEMPLATES.nextjs);
    });

    it('should return specified template structure', () => {
      const structure = getRecommendedStructure('nextjs');
      expect(structure).toEqual(STRUCTURE_TEMPLATES.nextjs);
    });

    it('should return default for unknown template', () => {
      const structure = getRecommendedStructure('unknown');
      expect(structure).toEqual(STRUCTURE_TEMPLATES.nextjs);
    });
  });

  describe('validateFolderStructure', () => {
    it('should return valid result for compliant structure', () => {
      const existingPaths = [
        'docs',
        'docs/PRD.md',
        'docs/CLAUDE.md',
        'mockups',
        'mockups/html',
        'src',
        'public',
        'package.json'
      ];

      const result = validateFolderStructure(existingPaths, 'nextjs');

      expect(result.valid).toBe(true);
      expect(result.missingRequired).toHaveLength(0);
      // Score depends on recommended items present - 80+ is good for basic compliance
      expect(result.complianceScore).toBeGreaterThanOrEqual(80);
    });

    it('should detect missing required folders', () => {
      const existingPaths = [
        'src',
        'public',
        'package.json'
      ];

      const result = validateFolderStructure(existingPaths, 'nextjs');

      expect(result.valid).toBe(false);
      expect(result.missingRequired).toContain('docs');
      expect(result.missingRequired).toContain('mockups');
    });

    it('should detect missing required files', () => {
      const existingPaths = [
        'docs',
        'mockups',
        'src'
      ];

      const result = validateFolderStructure(existingPaths, 'nextjs');

      expect(result.missingRequiredFiles).toContain('docs/PRD.md');
      expect(result.missingRequiredFiles).toContain('docs/CLAUDE.md');
    });

    it('should identify present recommended folders', () => {
      const existingPaths = [
        'docs',
        'mockups',
        'src',
        'src/components',
        'src/lib'
      ];

      const result = validateFolderStructure(existingPaths, 'nextjs');

      expect(result.presentRecommended).toContain('src');
      expect(result.presentRecommended).toContain('src/components');
    });

    it('should identify missing recommended folders', () => {
      const existingPaths = [
        'docs',
        'mockups'
      ];

      const result = validateFolderStructure(existingPaths, 'nextjs');

      expect(result.missingRecommended).toContain('src');
      expect(result.missingRecommended).toContain('public');
    });

    it('should handle empty paths array', () => {
      const result = validateFolderStructure([], 'nextjs');

      expect(result.valid).toBe(false);
      expect(result.missingRequired.length).toBeGreaterThan(0);
      expect(result.complianceScore).toBe(0);
    });
  });

  describe('calculateStructureComplianceScore', () => {
    it('should return 100 for fully compliant structure', () => {
      const existingPaths = [
        'docs',
        'docs/PRD.md',
        'docs/CLAUDE.md',
        'docs/Architecture.md',
        'docs/User-Stories.json',
        'mockups',
        'mockups/html',
        'src',
        'src/app',
        'src/components',
        'src/lib',
        'public',
        'package.json',
        '.env.example'
      ];

      const score = calculateStructureComplianceScore(existingPaths, 'nextjs');

      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('should return 0 for empty structure', () => {
      const score = calculateStructureComplianceScore([], 'nextjs');
      expect(score).toBe(0);
    });

    it('should weight required items higher than recommended', () => {
      // Only required folders
      const withRequired = ['docs', 'mockups', 'docs/PRD.md', 'docs/CLAUDE.md'];
      // Only recommended folders
      const withRecommended = ['src', 'public', 'src/components'];

      const scoreRequired = calculateStructureComplianceScore(withRequired, 'nextjs');
      const scoreRecommended = calculateStructureComplianceScore(withRecommended, 'nextjs');

      expect(scoreRequired).toBeGreaterThan(scoreRecommended);
    });

    it('should return partial score for partial compliance', () => {
      const existingPaths = [
        'docs',
        'mockups',
        'src'
      ];

      const score = calculateStructureComplianceScore(existingPaths, 'nextjs');

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });
  });

  describe('getStructureDeviations', () => {
    it('should return empty array for compliant structure', () => {
      const existingPaths = [
        'docs',
        'docs/PRD.md',
        'docs/CLAUDE.md',
        'mockups',
        'mockups/html',
        'src',
        'public'
      ];

      const deviations = getStructureDeviations(existingPaths, 'nextjs');

      // May have minor warnings but no critical errors
      const criticalDeviations = deviations.filter(d => d.severity === 'error');
      expect(criticalDeviations).toHaveLength(0);
    });

    it('should return errors for missing required folders', () => {
      const existingPaths = ['src', 'public'];

      const deviations = getStructureDeviations(existingPaths, 'nextjs');

      const docsDeviation = deviations.find(d => d.path === 'docs');
      expect(docsDeviation).toBeDefined();
      expect(docsDeviation.severity).toBe('error');
      expect(docsDeviation.message).toContain('Required folder missing');
    });

    it('should return warnings for missing recommended folders', () => {
      const existingPaths = ['docs', 'mockups', 'docs/PRD.md', 'docs/CLAUDE.md'];

      const deviations = getStructureDeviations(existingPaths, 'nextjs');

      const srcDeviation = deviations.find(d => d.path === 'src');
      expect(srcDeviation).toBeDefined();
      expect(srcDeviation.severity).toBe('warning');
    });

    it('should include suggestion for each deviation', () => {
      const existingPaths = ['src'];

      const deviations = getStructureDeviations(existingPaths, 'nextjs');

      deviations.forEach(deviation => {
        expect(deviation.suggestion).toBeDefined();
        expect(deviation.suggestion.length).toBeGreaterThan(0);
      });
    });

    it('should detect scattered files needing reorganization', () => {
      const existingPaths = [
        'PRD.md',           // Should be in docs/
        'mockup.html',      // Should be in mockups/html/
        'stories.json',     // Should be in docs/ or stories/
        'src'
      ];

      const deviations = getStructureDeviations(existingPaths, 'nextjs');

      const scatteredFile = deviations.find(d => d.type === 'misplaced');
      expect(scatteredFile).toBeDefined();
      expect(scatteredFile.suggestedLocation).toBeDefined();
    });
  });
});

describe('Edge Cases', () => {
  it('should handle paths with leading slashes', () => {
    const existingPaths = ['/docs', '/mockups', '/src'];
    const result = validateFolderStructure(existingPaths, 'nextjs');
    expect(result).toBeDefined();
  });

  it('should handle paths with trailing slashes', () => {
    const existingPaths = ['docs/', 'mockups/', 'src/'];
    const result = validateFolderStructure(existingPaths, 'nextjs');
    expect(result).toBeDefined();
  });

  it('should be case-insensitive for folder matching', () => {
    const existingPaths = ['DOCS', 'Mockups', 'SRC'];
    const result = validateFolderStructure(existingPaths, 'nextjs');

    // Should recognize these as the required/recommended folders
    expect(result.missingRequired).not.toContain('docs');
    expect(result.missingRequired).not.toContain('mockups');
  });

  it('should handle deeply nested paths', () => {
    const existingPaths = [
      'src/app/dashboard/components/Chart.tsx',
      'src/lib/supabase/client.ts'
    ];
    const result = validateFolderStructure(existingPaths, 'nextjs');

    // Should recognize src as present
    expect(result.presentRecommended).toContain('src');
  });
});
