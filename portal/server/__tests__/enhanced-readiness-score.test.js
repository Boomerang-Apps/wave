// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED READINESS SCORE TESTS (Gate 0 Enhancement)
// ═══════════════════════════════════════════════════════════════════════════════
// Adds structure compliance bonus to readiness score calculation
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateEnhancedReadinessScore,
  getScoreBreakdown,
  getReadinessLevel,
  READINESS_LEVELS
} from '../utils/enhanced-readiness-score.js';

describe('EnhancedReadinessScore', () => {
  describe('READINESS_LEVELS', () => {
    it('should define readiness level thresholds', () => {
      expect(READINESS_LEVELS.READY).toBeDefined();
      expect(READINESS_LEVELS.READY.min).toBe(90);
      expect(READINESS_LEVELS.NEEDS_WORK.min).toBe(60);
      expect(READINESS_LEVELS.NOT_READY.min).toBe(0);
    });
  });

  describe('calculateEnhancedReadinessScore', () => {
    it('should calculate base score from report', () => {
      const report = {
        ai_prd: { status: 'pass' },
        ai_stories: { status: 'pass', stories_found: 10 },
        html_prototype: { status: 'pass', total_prototypes: 5 },
        claude_md: { status: 'pass', has_claude_md: true },
        file_structure: { status: 'pass' }
      };

      const score = calculateEnhancedReadinessScore(report, []);

      expect(score.total).toBe(100);
      expect(score.base).toBe(100);
    });

    it('should add structure compliance bonus', () => {
      const report = {
        ai_prd: { status: 'pass' },
        ai_stories: { status: 'pass', stories_found: 10 },
        html_prototype: { status: 'pass', total_prototypes: 5 },
        claude_md: { status: 'pass', has_claude_md: true },
        file_structure: { status: 'pass' }
      };

      const existingPaths = [
        'docs',
        'docs/PRD.md',
        'docs/CLAUDE.md',
        'mockups',
        'mockups/html',
        'src',
        'public'
      ];

      const score = calculateEnhancedReadinessScore(report, existingPaths);

      // Should have structure compliance bonus (up to 10 bonus points)
      expect(score.structureBonus).toBeGreaterThan(0);
      expect(score.structureBonus).toBeLessThanOrEqual(10);
    });

    it('should cap total score at 100', () => {
      const report = {
        ai_prd: { status: 'pass' },
        ai_stories: { status: 'pass', stories_found: 10 },
        html_prototype: { status: 'pass', total_prototypes: 5 },
        claude_md: { status: 'pass', has_claude_md: true },
        file_structure: { status: 'pass' }
      };

      const existingPaths = [
        'docs', 'docs/PRD.md', 'docs/CLAUDE.md', 'docs/Architecture.md',
        'mockups', 'mockups/html',
        'src', 'src/app', 'src/components', 'src/lib',
        'public', 'package.json', '.env.example'
      ];

      const score = calculateEnhancedReadinessScore(report, existingPaths);

      expect(score.total).toBeLessThanOrEqual(100);
    });

    it('should handle partial PRD status', () => {
      const report = {
        ai_prd: { status: 'warn' },
        ai_stories: { status: 'pass', stories_found: 5 },
        html_prototype: { status: 'pass', total_prototypes: 3 },
        claude_md: { status: 'warn', has_claude_md: true },
        file_structure: { status: 'warn' }
      };

      const score = calculateEnhancedReadinessScore(report, []);

      expect(score.base).toBeLessThan(100);
      expect(score.base).toBeGreaterThan(0);
    });

    it('should handle missing stories gracefully', () => {
      const report = {
        ai_prd: { status: 'pass' },
        ai_stories: { status: 'fail', stories_found: 0 },
        html_prototype: { status: 'pass', total_prototypes: 5 },
        claude_md: { status: 'pass', has_claude_md: true },
        file_structure: { status: 'pass' }
      };

      const score = calculateEnhancedReadinessScore(report, []);

      expect(score.base).toBeLessThan(100);
      // Stories = 0 points
      expect(score.breakdown.stories).toBe(0);
    });

    it('should give partial credit for some stories found', () => {
      const report = {
        ai_prd: { status: 'pass' },
        ai_stories: { status: 'fail', stories_found: 3 },
        html_prototype: { status: 'pass', total_prototypes: 5 },
        claude_md: { status: 'pass', has_claude_md: true },
        file_structure: { status: 'pass' }
      };

      const score = calculateEnhancedReadinessScore(report, []);

      // Should get partial credit (10 points) for having some stories
      expect(score.breakdown.stories).toBe(10);
    });
  });

  describe('getScoreBreakdown', () => {
    it('should return detailed breakdown', () => {
      const report = {
        ai_prd: { status: 'pass' },
        ai_stories: { status: 'pass', stories_found: 10 },
        html_prototype: { status: 'pass', total_prototypes: 5 },
        claude_md: { status: 'pass', has_claude_md: true },
        file_structure: { status: 'pass' }
      };

      const breakdown = getScoreBreakdown(report, []);

      expect(breakdown.prd).toBeDefined();
      expect(breakdown.prd.score).toBe(25);
      expect(breakdown.prd.maxScore).toBe(25);

      expect(breakdown.stories).toBeDefined();
      expect(breakdown.stories.score).toBe(25);

      expect(breakdown.htmlPrototypes).toBeDefined();
      expect(breakdown.htmlPrototypes.score).toBe(15);

      expect(breakdown.claudeMd).toBeDefined();
      expect(breakdown.claudeMd.score).toBe(20);

      expect(breakdown.fileStructure).toBeDefined();
      expect(breakdown.fileStructure.score).toBe(15);
    });

    it('should include structure compliance in breakdown', () => {
      const report = {
        ai_prd: { status: 'pass' },
        ai_stories: { status: 'pass', stories_found: 10 },
        html_prototype: { status: 'pass', total_prototypes: 5 },
        claude_md: { status: 'pass', has_claude_md: true },
        file_structure: { status: 'pass' }
      };

      // Need sufficient paths to get compliance score > 50%
      const existingPaths = [
        'docs',
        'docs/PRD.md',
        'docs/CLAUDE.md',
        'mockups',
        'mockups/html',
        'src',
        'public'
      ];

      const breakdown = getScoreBreakdown(report, existingPaths);

      expect(breakdown.structureCompliance).toBeDefined();
      expect(breakdown.structureCompliance.score).toBeGreaterThan(0);
      expect(breakdown.structureCompliance.maxScore).toBe(10);
    });
  });

  describe('getReadinessLevel', () => {
    it('should return READY for scores >= 90', () => {
      expect(getReadinessLevel(100)).toEqual(READINESS_LEVELS.READY);
      expect(getReadinessLevel(95)).toEqual(READINESS_LEVELS.READY);
      expect(getReadinessLevel(90)).toEqual(READINESS_LEVELS.READY);
    });

    it('should return NEEDS_WORK for scores 60-89', () => {
      expect(getReadinessLevel(89)).toEqual(READINESS_LEVELS.NEEDS_WORK);
      expect(getReadinessLevel(75)).toEqual(READINESS_LEVELS.NEEDS_WORK);
      expect(getReadinessLevel(60)).toEqual(READINESS_LEVELS.NEEDS_WORK);
    });

    it('should return NOT_READY for scores < 60', () => {
      expect(getReadinessLevel(59)).toEqual(READINESS_LEVELS.NOT_READY);
      expect(getReadinessLevel(30)).toEqual(READINESS_LEVELS.NOT_READY);
      expect(getReadinessLevel(0)).toEqual(READINESS_LEVELS.NOT_READY);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle undefined report fields', () => {
    const report = {
      ai_prd: undefined,
      ai_stories: undefined,
      html_prototype: undefined,
      claude_md: undefined,
      file_structure: undefined
    };

    const score = calculateEnhancedReadinessScore(report, []);

    expect(score.total).toBe(0);
    expect(score.base).toBe(0);
  });

  it('should handle empty report', () => {
    const report = {};

    const score = calculateEnhancedReadinessScore(report, []);

    expect(score.total).toBe(0);
  });

  it('should handle null existing paths', () => {
    const report = {
      ai_prd: { status: 'pass' },
      ai_stories: { status: 'pass', stories_found: 10 },
      html_prototype: { status: 'pass', total_prototypes: 5 },
      claude_md: { status: 'pass', has_claude_md: true },
      file_structure: { status: 'pass' }
    };

    const score = calculateEnhancedReadinessScore(report, null);

    expect(score.total).toBe(100);
    expect(score.structureBonus).toBe(0);
  });
});
