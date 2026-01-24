/**
 * TDD Tests for Dependency Graph Builder (Launch Sequence)
 *
 * Phase 4, Step 4.2: Dependency Graph Builder
 *
 * Tests the building and analysis of story dependency graphs
 * for wave batching and parallel execution.
 */

import { describe, it, expect } from 'vitest';

import {
  buildDependencyGraph,
  topologicalSort,
  detectCircularDependencies,
  getExecutionLevels,
  getStoryDependents,
  validateDependencies
} from '../utils/dependency-graph.js';

describe('Dependency Graph Builder', () => {

  // ============================================
  // buildDependencyGraph Tests
  // ============================================

  describe('buildDependencyGraph', () => {
    it('should create empty graph for empty stories', () => {
      const graph = buildDependencyGraph([]);

      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(graph.nodes).toHaveLength(0);
    });

    it('should create nodes for each story', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2' }
      ];

      const graph = buildDependencyGraph(stories);

      expect(graph.nodes).toHaveLength(2);
      expect(graph.nodes).toContain('S1');
      expect(graph.nodes).toContain('S2');
    });

    it('should create edges for dependencies', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', dependencies: [] },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] }
      ];

      const graph = buildDependencyGraph(stories);

      expect(graph.edges['S2']).toContain('S1');
    });

    it('should handle stories with no dependencies', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2' }
      ];

      const graph = buildDependencyGraph(stories);

      expect(graph.edges['S1'] || []).toHaveLength(0);
      expect(graph.edges['S2'] || []).toHaveLength(0);
    });

    it('should handle multiple dependencies', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2' },
        { id: 'S3', title: 'Story 3', dependencies: ['S1', 'S2'] }
      ];

      const graph = buildDependencyGraph(stories);

      expect(graph.edges['S3']).toContain('S1');
      expect(graph.edges['S3']).toContain('S2');
    });

    it('should include story data in graph', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', priority: 'high' }
      ];

      const graph = buildDependencyGraph(stories);

      expect(graph.storyMap['S1']).toHaveProperty('priority', 'high');
    });
  });

  // ============================================
  // topologicalSort Tests
  // ============================================

  describe('topologicalSort', () => {
    it('should sort stories with no dependencies', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2' }
      ];

      const sorted = topologicalSort(stories);

      expect(sorted).toHaveLength(2);
    });

    it('should put dependency before dependent', () => {
      const stories = [
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] },
        { id: 'S1', title: 'Story 1' }
      ];

      const sorted = topologicalSort(stories);

      const s1Index = sorted.findIndex(s => s.id === 'S1');
      const s2Index = sorted.findIndex(s => s.id === 'S2');
      expect(s1Index).toBeLessThan(s2Index);
    });

    it('should handle chain of dependencies', () => {
      const stories = [
        { id: 'S3', title: 'Story 3', dependencies: ['S2'] },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] },
        { id: 'S1', title: 'Story 1' }
      ];

      const sorted = topologicalSort(stories);

      const s1Index = sorted.findIndex(s => s.id === 'S1');
      const s2Index = sorted.findIndex(s => s.id === 'S2');
      const s3Index = sorted.findIndex(s => s.id === 'S3');
      expect(s1Index).toBeLessThan(s2Index);
      expect(s2Index).toBeLessThan(s3Index);
    });

    it('should handle diamond dependencies', () => {
      const stories = [
        { id: 'S1', title: 'Base' },
        { id: 'S2', title: 'Left', dependencies: ['S1'] },
        { id: 'S3', title: 'Right', dependencies: ['S1'] },
        { id: 'S4', title: 'Top', dependencies: ['S2', 'S3'] }
      ];

      const sorted = topologicalSort(stories);

      const s1Index = sorted.findIndex(s => s.id === 'S1');
      const s2Index = sorted.findIndex(s => s.id === 'S2');
      const s3Index = sorted.findIndex(s => s.id === 'S3');
      const s4Index = sorted.findIndex(s => s.id === 'S4');

      expect(s1Index).toBeLessThan(s2Index);
      expect(s1Index).toBeLessThan(s3Index);
      expect(s2Index).toBeLessThan(s4Index);
      expect(s3Index).toBeLessThan(s4Index);
    });

    it('should throw error for circular dependencies', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', dependencies: ['S2'] },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] }
      ];

      expect(() => topologicalSort(stories)).toThrow(/circular/i);
    });

    it('should handle empty array', () => {
      const sorted = topologicalSort([]);
      expect(sorted).toEqual([]);
    });
  });

  // ============================================
  // detectCircularDependencies Tests
  // ============================================

  describe('detectCircularDependencies', () => {
    it('should return empty array for no cycles', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] }
      ];

      const cycles = detectCircularDependencies(stories);

      expect(cycles).toHaveLength(0);
    });

    it('should detect simple circular dependency', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', dependencies: ['S2'] },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] }
      ];

      const cycles = detectCircularDependencies(stories);

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('S1');
      expect(cycles[0]).toContain('S2');
    });

    it('should detect self-referencing dependency', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', dependencies: ['S1'] }
      ];

      const cycles = detectCircularDependencies(stories);

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should detect longer cycle', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', dependencies: ['S3'] },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] },
        { id: 'S3', title: 'Story 3', dependencies: ['S2'] }
      ];

      const cycles = detectCircularDependencies(stories);

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should handle stories with no dependencies', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2' }
      ];

      const cycles = detectCircularDependencies(stories);

      expect(cycles).toHaveLength(0);
    });
  });

  // ============================================
  // getExecutionLevels Tests
  // ============================================

  describe('getExecutionLevels', () => {
    it('should put independent stories in level 0', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2' }
      ];

      const levels = getExecutionLevels(stories);

      expect(levels[0]).toContain('S1');
      expect(levels[0]).toContain('S2');
    });

    it('should put dependent stories in higher levels', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] }
      ];

      const levels = getExecutionLevels(stories);

      expect(levels[0]).toContain('S1');
      expect(levels[1]).toContain('S2');
    });

    it('should handle chain - each in own level', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] },
        { id: 'S3', title: 'Story 3', dependencies: ['S2'] }
      ];

      const levels = getExecutionLevels(stories);

      expect(levels).toHaveLength(3);
      expect(levels[0]).toContain('S1');
      expect(levels[1]).toContain('S2');
      expect(levels[2]).toContain('S3');
    });

    it('should put parallel stories in same level', () => {
      const stories = [
        { id: 'S1', title: 'Base' },
        { id: 'S2', title: 'Left', dependencies: ['S1'] },
        { id: 'S3', title: 'Right', dependencies: ['S1'] }
      ];

      const levels = getExecutionLevels(stories);

      expect(levels[0]).toContain('S1');
      expect(levels[1]).toContain('S2');
      expect(levels[1]).toContain('S3');
    });

    it('should handle diamond pattern', () => {
      const stories = [
        { id: 'S1', title: 'Base' },
        { id: 'S2', title: 'Left', dependencies: ['S1'] },
        { id: 'S3', title: 'Right', dependencies: ['S1'] },
        { id: 'S4', title: 'Top', dependencies: ['S2', 'S3'] }
      ];

      const levels = getExecutionLevels(stories);

      expect(levels).toHaveLength(3);
      expect(levels[0]).toContain('S1');
      expect(levels[1]).toContain('S2');
      expect(levels[1]).toContain('S3');
      expect(levels[2]).toContain('S4');
    });

    it('should return empty array for empty input', () => {
      const levels = getExecutionLevels([]);
      expect(levels).toEqual([]);
    });
  });

  // ============================================
  // getStoryDependents Tests
  // ============================================

  describe('getStoryDependents', () => {
    it('should return empty array for story with no dependents', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2' }
      ];

      const dependents = getStoryDependents('S1', stories);

      expect(dependents).toHaveLength(0);
    });

    it('should return direct dependents', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] },
        { id: 'S3', title: 'Story 3', dependencies: ['S1'] }
      ];

      const dependents = getStoryDependents('S1', stories);

      expect(dependents).toContain('S2');
      expect(dependents).toContain('S3');
    });

    it('should return transitive dependents when requested', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] },
        { id: 'S3', title: 'Story 3', dependencies: ['S2'] }
      ];

      const dependents = getStoryDependents('S1', stories, { transitive: true });

      expect(dependents).toContain('S2');
      expect(dependents).toContain('S3');
    });
  });

  // ============================================
  // validateDependencies Tests
  // ============================================

  describe('validateDependencies', () => {
    it('should return valid for proper dependencies', () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] }
      ];

      const result = validateDependencies(stories);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing dependency', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', dependencies: ['S999'] }
      ];

      const result = validateDependencies(stories);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('S999'))).toBe(true);
    });

    it('should detect circular dependency', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', dependencies: ['S2'] },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] }
      ];

      const result = validateDependencies(stories);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.toLowerCase().includes('circular'))).toBe(true);
    });

    it('should return all errors at once', () => {
      const stories = [
        { id: 'S1', title: 'Story 1', dependencies: ['S999', 'S1'] }
      ];

      const result = validateDependencies(stories);

      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should be valid for empty stories', () => {
      const result = validateDependencies([]);

      expect(result.valid).toBe(true);
    });
  });
});
