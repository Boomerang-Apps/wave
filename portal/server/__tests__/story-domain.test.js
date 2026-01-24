/**
 * TDD Tests for Story Domain Classifier (Launch Sequence)
 *
 * Phase 4, Step 4.1: Story Domain Classifier
 *
 * Tests the classification of stories by domain (frontend, backend, etc.)
 * for agent assignment purposes.
 */

import { describe, it, expect } from 'vitest';

import {
  STORY_DOMAINS,
  DOMAIN_KEYWORDS,
  classifyStoryDomain,
  classifyAllStories,
  getDomainStats
} from '../utils/story-domain.js';

describe('Story Domain Classifier', () => {

  // ============================================
  // Constants Tests
  // ============================================

  describe('STORY_DOMAINS', () => {
    it('should define frontend domain', () => {
      expect(STORY_DOMAINS).toContain('frontend');
    });

    it('should define backend domain', () => {
      expect(STORY_DOMAINS).toContain('backend');
    });

    it('should define fullstack domain', () => {
      expect(STORY_DOMAINS).toContain('fullstack');
    });

    it('should define qa domain', () => {
      expect(STORY_DOMAINS).toContain('qa');
    });

    it('should define devops domain', () => {
      expect(STORY_DOMAINS).toContain('devops');
    });

    it('should define design domain', () => {
      expect(STORY_DOMAINS).toContain('design');
    });
  });

  describe('DOMAIN_KEYWORDS', () => {
    it('should have keywords for frontend', () => {
      expect(DOMAIN_KEYWORDS.frontend).toBeDefined();
      expect(Array.isArray(DOMAIN_KEYWORDS.frontend)).toBe(true);
      expect(DOMAIN_KEYWORDS.frontend.length).toBeGreaterThan(0);
    });

    it('should have keywords for backend', () => {
      expect(DOMAIN_KEYWORDS.backend).toBeDefined();
      expect(DOMAIN_KEYWORDS.backend.length).toBeGreaterThan(0);
    });

    it('should include UI-related keywords for frontend', () => {
      const keywords = DOMAIN_KEYWORDS.frontend.map(k => k.toLowerCase());
      expect(keywords.some(k => k.includes('ui') || k.includes('component') || k.includes('button'))).toBe(true);
    });

    it('should include API-related keywords for backend', () => {
      const keywords = DOMAIN_KEYWORDS.backend.map(k => k.toLowerCase());
      expect(keywords.some(k => k.includes('api') || k.includes('endpoint') || k.includes('database'))).toBe(true);
    });

    it('should include test-related keywords for qa', () => {
      const keywords = DOMAIN_KEYWORDS.qa.map(k => k.toLowerCase());
      expect(keywords.some(k => k.includes('test') || k.includes('qa'))).toBe(true);
    });
  });

  // ============================================
  // classifyStoryDomain Tests
  // ============================================

  describe('classifyStoryDomain', () => {
    it('should return explicit domain when provided', () => {
      const story = {
        id: 'S1',
        title: 'Some Story',
        domain: 'backend'
      };

      const result = classifyStoryDomain(story);

      expect(result).toBe('backend');
    });

    it('should classify frontend story by title keywords', () => {
      const story = {
        id: 'S1',
        title: 'Create login button component',
        description: 'Add a button for login'
      };

      const result = classifyStoryDomain(story);

      expect(result).toBe('frontend');
    });

    it('should classify backend story by title keywords', () => {
      const story = {
        id: 'S1',
        title: 'Create user authentication API endpoint',
        description: 'REST endpoint for auth'
      };

      const result = classifyStoryDomain(story);

      expect(result).toBe('backend');
    });

    it('should classify by description when title is generic', () => {
      const story = {
        id: 'S1',
        title: 'Implement feature',
        description: 'Create a React component for the dashboard'
      };

      const result = classifyStoryDomain(story);

      expect(result).toBe('frontend');
    });

    it('should classify QA story by keywords', () => {
      const story = {
        id: 'S1',
        title: 'Write unit tests for auth module',
        description: 'Add test coverage'
      };

      const result = classifyStoryDomain(story);

      expect(result).toBe('qa');
    });

    it('should classify devops story by keywords', () => {
      const story = {
        id: 'S1',
        title: 'Setup CI/CD pipeline',
        description: 'Configure GitHub Actions'
      };

      const result = classifyStoryDomain(story);

      expect(result).toBe('devops');
    });

    it('should return fullstack for mixed frontend/backend', () => {
      const story = {
        id: 'S1',
        title: 'Create form with API integration',
        description: 'Build React form that calls REST endpoint'
      };

      const result = classifyStoryDomain(story);

      expect(result).toBe('fullstack');
    });

    it('should return fullstack as default for unknown', () => {
      const story = {
        id: 'S1',
        title: 'Update documentation',
        description: 'Fix typos in readme'
      };

      const result = classifyStoryDomain(story);

      expect(result).toBe('fullstack');
    });

    it('should handle story with only id', () => {
      const story = { id: 'S1' };

      const result = classifyStoryDomain(story);

      expect(result).toBe('fullstack');
    });

    it('should be case-insensitive', () => {
      const story = {
        id: 'S1',
        title: 'CREATE REACT COMPONENT',
        description: 'UI WORK'
      };

      const result = classifyStoryDomain(story);

      expect(result).toBe('frontend');
    });

    it('should classify CSS/styling as frontend', () => {
      const story = {
        id: 'S1',
        title: 'Update styling for header',
        description: 'Fix CSS issues'
      };

      const result = classifyStoryDomain(story);

      expect(result).toBe('frontend');
    });

    it('should classify database work as backend', () => {
      const story = {
        id: 'S1',
        title: 'Create user table migration',
        description: 'Add database schema'
      };

      const result = classifyStoryDomain(story);

      expect(result).toBe('backend');
    });

    it('should return confidence score', () => {
      const story = {
        id: 'S1',
        title: 'Create React component',
        description: ''
      };

      const result = classifyStoryDomain(story, { includeConfidence: true });

      expect(result).toHaveProperty('domain');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.confidence).toBe('number');
    });
  });

  // ============================================
  // classifyAllStories Tests
  // ============================================

  describe('classifyAllStories', () => {
    it('should classify array of stories', () => {
      const stories = [
        { id: 'S1', title: 'Create button component' },
        { id: 'S2', title: 'Create API endpoint' },
        { id: 'S3', title: 'Write tests' }
      ];

      const result = classifyAllStories(stories);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('domain');
      expect(result[0]).toHaveProperty('storyId', 'S1');
    });

    it('should preserve original story data', () => {
      const stories = [
        { id: 'S1', title: 'Create button', priority: 'high' }
      ];

      const result = classifyAllStories(stories);

      expect(result[0].priority).toBe('high');
    });

    it('should handle empty array', () => {
      const result = classifyAllStories([]);

      expect(result).toEqual([]);
    });

    it('should add domain field to each story', () => {
      const stories = [
        { id: 'S1', title: 'Frontend work' },
        { id: 'S2', title: 'Backend work' }
      ];

      const result = classifyAllStories(stories);

      expect(result.every(s => s.domain)).toBe(true);
    });
  });

  // ============================================
  // getDomainStats Tests
  // ============================================

  describe('getDomainStats', () => {
    it('should count stories per domain', () => {
      const stories = [
        { id: 'S1', domain: 'frontend' },
        { id: 'S2', domain: 'frontend' },
        { id: 'S3', domain: 'backend' }
      ];

      const stats = getDomainStats(stories);

      expect(stats.frontend).toBe(2);
      expect(stats.backend).toBe(1);
    });

    it('should return zero for domains with no stories', () => {
      const stories = [
        { id: 'S1', domain: 'frontend' }
      ];

      const stats = getDomainStats(stories);

      expect(stats.backend).toBe(0);
      expect(stats.qa).toBe(0);
    });

    it('should handle empty array', () => {
      const stats = getDomainStats([]);

      expect(stats.frontend).toBe(0);
      expect(stats.backend).toBe(0);
    });

    it('should include total count', () => {
      const stories = [
        { id: 'S1', domain: 'frontend' },
        { id: 'S2', domain: 'backend' }
      ];

      const stats = getDomainStats(stories);

      expect(stats.total).toBe(2);
    });

    it('should include percentage breakdown', () => {
      const stories = [
        { id: 'S1', domain: 'frontend' },
        { id: 'S2', domain: 'frontend' },
        { id: 'S3', domain: 'backend' },
        { id: 'S4', domain: 'backend' }
      ];

      const stats = getDomainStats(stories);

      expect(stats.percentages.frontend).toBe(50);
      expect(stats.percentages.backend).toBe(50);
    });
  });
});
