/**
 * TDD Tests for Agent Assignment Logic (Launch Sequence)
 *
 * Phase 4, Step 4.3: Agent Assignment Logic
 *
 * Tests the assignment of stories to agents based on domain
 * and load balancing.
 */

import { describe, it, expect } from 'vitest';

import {
  AGENT_TYPES,
  AGENT_DOMAIN_MAP,
  getAgentsForDomain,
  assignStoryToAgent,
  assignAllStories,
  getAgentWorkload,
  balanceWorkload
} from '../utils/agent-assignment.js';

describe('Agent Assignment Logic', () => {

  // ============================================
  // Constants Tests
  // ============================================

  describe('AGENT_TYPES', () => {
    it('should include fe-dev-1', () => {
      expect(AGENT_TYPES).toContain('fe-dev-1');
    });

    it('should include fe-dev-2', () => {
      expect(AGENT_TYPES).toContain('fe-dev-2');
    });

    it('should include be-dev-1', () => {
      expect(AGENT_TYPES).toContain('be-dev-1');
    });

    it('should include be-dev-2', () => {
      expect(AGENT_TYPES).toContain('be-dev-2');
    });

    it('should include qa agent', () => {
      expect(AGENT_TYPES).toContain('qa');
    });

    it('should include devops agent', () => {
      expect(AGENT_TYPES).toContain('devops');
    });
  });

  describe('AGENT_DOMAIN_MAP', () => {
    it('should map frontend to fe-dev agents', () => {
      expect(AGENT_DOMAIN_MAP.frontend).toContain('fe-dev-1');
      expect(AGENT_DOMAIN_MAP.frontend).toContain('fe-dev-2');
    });

    it('should map backend to be-dev agents', () => {
      expect(AGENT_DOMAIN_MAP.backend).toContain('be-dev-1');
      expect(AGENT_DOMAIN_MAP.backend).toContain('be-dev-2');
    });

    it('should map qa to qa agent', () => {
      expect(AGENT_DOMAIN_MAP.qa).toContain('qa');
    });

    it('should map devops to devops agent', () => {
      expect(AGENT_DOMAIN_MAP.devops).toContain('devops');
    });

    it('should map fullstack to all dev agents', () => {
      expect(AGENT_DOMAIN_MAP.fullstack.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // getAgentsForDomain Tests
  // ============================================

  describe('getAgentsForDomain', () => {
    it('should return fe-dev agents for frontend', () => {
      const agents = getAgentsForDomain('frontend');

      expect(agents).toContain('fe-dev-1');
    });

    it('should return be-dev agents for backend', () => {
      const agents = getAgentsForDomain('backend');

      expect(agents).toContain('be-dev-1');
    });

    it('should return all dev agents for fullstack', () => {
      const agents = getAgentsForDomain('fullstack');

      expect(agents.length).toBeGreaterThanOrEqual(2);
    });

    it('should return fallback for unknown domain', () => {
      const agents = getAgentsForDomain('unknown');

      expect(agents.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // assignStoryToAgent Tests
  // ============================================

  describe('assignStoryToAgent', () => {
    it('should assign frontend story to fe-dev', () => {
      const story = { id: 'S1', domain: 'frontend' };

      const assignment = assignStoryToAgent(story);

      expect(assignment.agent).toMatch(/fe-dev/);
    });

    it('should assign backend story to be-dev', () => {
      const story = { id: 'S1', domain: 'backend' };

      const assignment = assignStoryToAgent(story);

      expect(assignment.agent).toMatch(/be-dev/);
    });

    it('should assign qa story to qa agent', () => {
      const story = { id: 'S1', domain: 'qa' };

      const assignment = assignStoryToAgent(story);

      expect(assignment.agent).toBe('qa');
    });

    it('should return story id in assignment', () => {
      const story = { id: 'S1', domain: 'frontend' };

      const assignment = assignStoryToAgent(story);

      expect(assignment.storyId).toBe('S1');
    });

    it('should use explicit assignedAgent if provided', () => {
      const story = { id: 'S1', domain: 'frontend', assignedAgent: 'be-dev-1' };

      const assignment = assignStoryToAgent(story);

      expect(assignment.agent).toBe('be-dev-1');
    });

    it('should consider current workload for load balancing', () => {
      const story = { id: 'S1', domain: 'frontend' };
      const workload = { 'fe-dev-1': 5, 'fe-dev-2': 0 };

      const assignment = assignStoryToAgent(story, { workload });

      expect(assignment.agent).toBe('fe-dev-2');
    });
  });

  // ============================================
  // assignAllStories Tests
  // ============================================

  describe('assignAllStories', () => {
    it('should assign all stories', () => {
      const stories = [
        { id: 'S1', domain: 'frontend' },
        { id: 'S2', domain: 'backend' },
        { id: 'S3', domain: 'qa' }
      ];

      const assignments = assignAllStories(stories);

      expect(assignments).toHaveLength(3);
      expect(assignments.every(a => a.agent)).toBe(true);
    });

    it('should balance load across agents', () => {
      const stories = [
        { id: 'S1', domain: 'frontend' },
        { id: 'S2', domain: 'frontend' },
        { id: 'S3', domain: 'frontend' },
        { id: 'S4', domain: 'frontend' }
      ];

      const assignments = assignAllStories(stories);

      // Count assignments per agent
      const counts = {};
      for (const a of assignments) {
        counts[a.agent] = (counts[a.agent] || 0) + 1;
      }

      // Should be reasonably balanced (no agent with more than 2x another)
      const values = Object.values(counts);
      const max = Math.max(...values);
      const min = Math.min(...values);
      expect(max - min).toBeLessThanOrEqual(1);
    });

    it('should preserve story data', () => {
      const stories = [
        { id: 'S1', domain: 'frontend', priority: 'high', title: 'Test' }
      ];

      const assignments = assignAllStories(stories);

      expect(assignments[0].priority).toBe('high');
      expect(assignments[0].title).toBe('Test');
    });

    it('should handle empty array', () => {
      const assignments = assignAllStories([]);

      expect(assignments).toEqual([]);
    });

    it('should include assignment metadata', () => {
      const stories = [
        { id: 'S1', domain: 'frontend' }
      ];

      const assignments = assignAllStories(stories);

      expect(assignments[0]).toHaveProperty('assignedAt');
    });
  });

  // ============================================
  // getAgentWorkload Tests
  // ============================================

  describe('getAgentWorkload', () => {
    it('should count stories per agent', () => {
      const assignments = [
        { storyId: 'S1', agent: 'fe-dev-1' },
        { storyId: 'S2', agent: 'fe-dev-1' },
        { storyId: 'S3', agent: 'be-dev-1' }
      ];

      const workload = getAgentWorkload(assignments);

      expect(workload['fe-dev-1']).toBe(2);
      expect(workload['be-dev-1']).toBe(1);
    });

    it('should return 0 for agents with no stories', () => {
      const assignments = [
        { storyId: 'S1', agent: 'fe-dev-1' }
      ];

      const workload = getAgentWorkload(assignments);

      expect(workload['fe-dev-2']).toBe(0);
    });

    it('should handle empty assignments', () => {
      const workload = getAgentWorkload([]);

      expect(workload['fe-dev-1']).toBe(0);
    });

    it('should include estimated hours if available', () => {
      const assignments = [
        { storyId: 'S1', agent: 'fe-dev-1', estimatedHours: 4 },
        { storyId: 'S2', agent: 'fe-dev-1', estimatedHours: 2 }
      ];

      const workload = getAgentWorkload(assignments, { useHours: true });

      expect(workload['fe-dev-1']).toBe(6);
    });
  });

  // ============================================
  // balanceWorkload Tests
  // ============================================

  describe('balanceWorkload', () => {
    it('should not change already balanced assignments', () => {
      const assignments = [
        { storyId: 'S1', agent: 'fe-dev-1', domain: 'frontend' },
        { storyId: 'S2', agent: 'fe-dev-2', domain: 'frontend' }
      ];

      const balanced = balanceWorkload(assignments);

      expect(balanced).toHaveLength(2);
    });

    it('should rebalance uneven workload', () => {
      const assignments = [
        { storyId: 'S1', agent: 'fe-dev-1', domain: 'frontend' },
        { storyId: 'S2', agent: 'fe-dev-1', domain: 'frontend' },
        { storyId: 'S3', agent: 'fe-dev-1', domain: 'frontend' },
        { storyId: 'S4', agent: 'fe-dev-1', domain: 'frontend' }
      ];

      const balanced = balanceWorkload(assignments);

      const workload = getAgentWorkload(balanced);
      const values = Object.values(workload).filter(v => v > 0);
      const max = Math.max(...values);
      const min = Math.min(...values);
      expect(max - min).toBeLessThanOrEqual(1);
    });

    it('should respect domain constraints', () => {
      const assignments = [
        { storyId: 'S1', agent: 'fe-dev-1', domain: 'frontend' },
        { storyId: 'S2', agent: 'fe-dev-1', domain: 'frontend' }
      ];

      const balanced = balanceWorkload(assignments);

      // All frontend stories should still be on fe-dev agents
      for (const a of balanced) {
        if (a.domain === 'frontend') {
          expect(a.agent).toMatch(/fe-dev/);
        }
      }
    });

    it('should handle empty array', () => {
      const balanced = balanceWorkload([]);

      expect(balanced).toEqual([]);
    });
  });
});
