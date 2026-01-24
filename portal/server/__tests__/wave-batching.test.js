/**
 * TDD Tests for Wave Batching Algorithm (Launch Sequence)
 *
 * Phase 4, Step 4.4: Wave Batching Algorithm
 *
 * Tests the batching of stories into execution waves
 * based on dependencies and parallel execution.
 */

import { describe, it, expect } from 'vitest';

import {
  createWavePlan,
  batchStoriesIntoWaves,
  getWaveStats,
  validateWavePlan,
  optimizeWavePlan
} from '../utils/wave-batching.js';

describe('Wave Batching Algorithm', () => {

  // ============================================
  // batchStoriesIntoWaves Tests
  // ============================================

  describe('batchStoriesIntoWaves', () => {
    it('should put independent stories in wave 1', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', domain: 'frontend' },
        { id: 'S2', title: 'Story 2', domain: 'backend' }
      ];

      const waves = batchStoriesIntoWaves(stories);

      expect(waves).toHaveLength(1);
      expect(waves[0].stories).toHaveLength(2);
    });

    it('should put dependent story in next wave', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] }
      ];

      const waves = batchStoriesIntoWaves(stories);

      expect(waves).toHaveLength(2);
      expect(waves[0].stories.some(s => s.id === 'S1')).toBe(true);
      expect(waves[1].stories.some(s => s.id === 'S2')).toBe(true);
    });

    it('should put parallel stories in same wave', () => {
      const stories = [
        { id: 'S1', title: 'Base' },
        { id: 'S2', title: 'Left', dependencies: ['S1'] },
        { id: 'S3', title: 'Right', dependencies: ['S1'] }
      ];

      const waves = batchStoriesIntoWaves(stories);

      expect(waves).toHaveLength(2);
      expect(waves[1].stories).toHaveLength(2);
    });

    it('should number waves starting from 1', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' }
      ];

      const waves = batchStoriesIntoWaves(stories);

      expect(waves[0].waveNumber).toBe(1);
    });

    it('should handle diamond dependency pattern', () => {
      const stories = [
        { id: 'S1', title: 'Base' },
        { id: 'S2', title: 'Left', dependencies: ['S1'] },
        { id: 'S3', title: 'Right', dependencies: ['S1'] },
        { id: 'S4', title: 'Top', dependencies: ['S2', 'S3'] }
      ];

      const waves = batchStoriesIntoWaves(stories);

      expect(waves).toHaveLength(3);
      expect(waves[0].stories.some(s => s.id === 'S1')).toBe(true);
      expect(waves[1].stories.some(s => s.id === 'S2')).toBe(true);
      expect(waves[1].stories.some(s => s.id === 'S3')).toBe(true);
      expect(waves[2].stories.some(s => s.id === 'S4')).toBe(true);
    });

    it('should handle empty stories array', () => {
      const waves = batchStoriesIntoWaves([]);

      expect(waves).toEqual([]);
    });

    it('should include agent assignments in waves', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', domain: 'frontend' }
      ];

      const waves = batchStoriesIntoWaves(stories);

      expect(waves[0].stories[0]).toHaveProperty('agent');
    });
  });

  // ============================================
  // createWavePlan Tests
  // ============================================

  describe('createWavePlan', () => {
    it('should create a wave plan with metadata', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', domain: 'frontend' }
      ];

      const plan = createWavePlan(stories, 'project-123');

      expect(plan).toHaveProperty('projectId', 'project-123');
      expect(plan).toHaveProperty('waves');
      expect(plan).toHaveProperty('createdAt');
    });

    it('should include total story count', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2' }
      ];

      const plan = createWavePlan(stories, 'project-123');

      expect(plan.totalStories).toBe(2);
    });

    it('should include wave count', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] }
      ];

      const plan = createWavePlan(stories, 'project-123');

      expect(plan.totalWaves).toBe(2);
    });

    it('should validate dependencies before creating plan', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', dependencies: ['S999'] }
      ];

      const plan = createWavePlan(stories, 'project-123');

      expect(plan.valid).toBe(false);
      expect(plan.errors.length).toBeGreaterThan(0);
    });

    it('should include domain breakdown', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', domain: 'frontend' },
        { id: 'S2', title: 'Story 2', domain: 'backend' }
      ];

      const plan = createWavePlan(stories, 'project-123');

      expect(plan.domainBreakdown).toHaveProperty('frontend', 1);
      expect(plan.domainBreakdown).toHaveProperty('backend', 1);
    });

    it('should include agent workload', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', domain: 'frontend' }
      ];

      const plan = createWavePlan(stories, 'project-123');

      expect(plan.agentWorkload).toBeDefined();
    });

    it('should be valid for correct dependencies', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] }
      ];

      const plan = createWavePlan(stories, 'project-123');

      expect(plan.valid).toBe(true);
    });
  });

  // ============================================
  // getWaveStats Tests
  // ============================================

  describe('getWaveStats', () => {
    it('should calculate stories per wave', () => {
      const waves = [
        { waveNumber: 1, stories: [{ id: 'S1' }, { id: 'S2' }] },
        { waveNumber: 2, stories: [{ id: 'S3' }] }
      ];

      const stats = getWaveStats(waves);

      expect(stats.storiesPerWave).toEqual([2, 1]);
    });

    it('should calculate average stories per wave', () => {
      const waves = [
        { waveNumber: 1, stories: [{ id: 'S1' }, { id: 'S2' }] },
        { waveNumber: 2, stories: [{ id: 'S3' }, { id: 'S4' }] }
      ];

      const stats = getWaveStats(waves);

      expect(stats.averagePerWave).toBe(2);
    });

    it('should find largest wave', () => {
      const waves = [
        { waveNumber: 1, stories: [{ id: 'S1' }] },
        { waveNumber: 2, stories: [{ id: 'S2' }, { id: 'S3' }, { id: 'S4' }] }
      ];

      const stats = getWaveStats(waves);

      expect(stats.largestWave).toBe(2);
      expect(stats.largestWaveSize).toBe(3);
    });

    it('should calculate parallelism factor', () => {
      const waves = [
        { waveNumber: 1, stories: [{ id: 'S1' }, { id: 'S2' }, { id: 'S3' }] }
      ];

      const stats = getWaveStats(waves);

      expect(stats.parallelismFactor).toBe(3);
    });

    it('should handle empty waves', () => {
      const stats = getWaveStats([]);

      expect(stats.storiesPerWave).toEqual([]);
      expect(stats.totalWaves).toBe(0);
    });
  });

  // ============================================
  // validateWavePlan Tests
  // ============================================

  describe('validateWavePlan', () => {
    it('should return valid for correct plan', () => {
      const plan = {
        projectId: 'project-123',
        waves: [
          { waveNumber: 1, stories: [{ id: 'S1' }] }
        ],
        totalStories: 1,
        totalWaves: 1
      };

      const result = validateWavePlan(plan);

      expect(result.valid).toBe(true);
    });

    it('should detect missing projectId', () => {
      const plan = {
        waves: [{ waveNumber: 1, stories: [{ id: 'S1' }] }]
      };

      const result = validateWavePlan(plan);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('projectId'))).toBe(true);
    });

    it('should detect empty waves', () => {
      const plan = {
        projectId: 'project-123',
        waves: []
      };

      const result = validateWavePlan(plan);

      expect(result.valid).toBe(false);
    });

    it('should detect wave without stories', () => {
      const plan = {
        projectId: 'project-123',
        waves: [{ waveNumber: 1, stories: [] }]
      };

      const result = validateWavePlan(plan);

      expect(result.valid).toBe(false);
    });

    it('should detect duplicate story assignments', () => {
      const plan = {
        projectId: 'project-123',
        waves: [
          { waveNumber: 1, stories: [{ id: 'S1' }] },
          { waveNumber: 2, stories: [{ id: 'S1' }] }
        ]
      };

      const result = validateWavePlan(plan);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('duplicate'))).toBe(true);
    });
  });

  // ============================================
  // optimizeWavePlan Tests
  // ============================================

  describe('optimizeWavePlan', () => {
    it('should not change optimal plan', () => {
      const waves = [
        { waveNumber: 1, stories: [{ id: 'S1', agent: 'fe-dev-1' }] }
      ];

      const optimized = optimizeWavePlan(waves);

      expect(optimized).toHaveLength(1);
    });

    it('should balance workload within waves', () => {
      const waves = [
        {
          waveNumber: 1,
          stories: [
            { id: 'S1', agent: 'fe-dev-1', domain: 'frontend' },
            { id: 'S2', agent: 'fe-dev-1', domain: 'frontend' },
            { id: 'S3', agent: 'fe-dev-1', domain: 'frontend' },
            { id: 'S4', agent: 'fe-dev-1', domain: 'frontend' }
          ]
        }
      ];

      const optimized = optimizeWavePlan(waves);

      // Should be balanced between fe-dev-1 and fe-dev-2
      const agents = optimized[0].stories.map(s => s.agent);
      const fe1Count = agents.filter(a => a === 'fe-dev-1').length;
      const fe2Count = agents.filter(a => a === 'fe-dev-2').length;
      expect(Math.abs(fe1Count - fe2Count)).toBeLessThanOrEqual(1);
    });

    it('should preserve wave structure', () => {
      const waves = [
        { waveNumber: 1, stories: [{ id: 'S1', domain: 'frontend' }] },
        { waveNumber: 2, stories: [{ id: 'S2', domain: 'backend' }] }
      ];

      const optimized = optimizeWavePlan(waves);

      expect(optimized).toHaveLength(2);
      expect(optimized[0].waveNumber).toBe(1);
      expect(optimized[1].waveNumber).toBe(2);
    });

    it('should handle empty waves array', () => {
      const optimized = optimizeWavePlan([]);

      expect(optimized).toEqual([]);
    });
  });
});
