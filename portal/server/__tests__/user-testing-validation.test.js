/**
 * TDD Tests for User Testing Validation (Grok Recommendation G3.1)
 *
 * Validates mockups/stories with real user feedback
 * Based on Design Sprint Day 5 methodology
 */

import { describe, it, expect } from 'vitest';

import {
  USER_TESTING_CONFIG,
  createUserTestingSession,
  recordUserFeedback,
  evaluateUserTesting,
  calculateAverageScores
} from '../utils/user-testing-validation.js';

describe('User Testing Validation (G3.1)', () => {

  // ============================================
  // USER_TESTING_CONFIG Constants Tests
  // ============================================

  describe('USER_TESTING_CONFIG', () => {
    it('should have minTesters defined', () => {
      expect(USER_TESTING_CONFIG.minTesters).toBeDefined();
      expect(USER_TESTING_CONFIG.minTesters).toBe(3);
    });

    it('should have minFeedbackScore defined', () => {
      expect(USER_TESTING_CONFIG.minFeedbackScore).toBeDefined();
      expect(USER_TESTING_CONFIG.minFeedbackScore).toBe(3.5);
    });

    it('should have required questions', () => {
      expect(USER_TESTING_CONFIG.requiredQuestions).toContain('usability');
      expect(USER_TESTING_CONFIG.requiredQuestions).toContain('clarity');
      expect(USER_TESTING_CONFIG.requiredQuestions).toContain('completeness');
    });

    it('should have recommended settings', () => {
      expect(USER_TESTING_CONFIG.recommended).toBeDefined();
      expect(USER_TESTING_CONFIG.recommended.testers).toBe(5);
    });
  });

  // ============================================
  // createUserTestingSession Tests
  // ============================================

  describe('createUserTestingSession', () => {
    const mockMockups = [
      { id: 'mockup-1', name: 'Home Page' },
      { id: 'mockup-2', name: 'Dashboard' }
    ];
    const mockStories = [
      { id: 'story-1', title: 'User Login' },
      { id: 'story-2', title: 'View Dashboard' }
    ];

    it('should create session with unique ID', () => {
      const session = createUserTestingSession(mockMockups, mockStories);

      expect(session.id).toBeDefined();
      expect(session.id).toContain('ut-');
    });

    it('should set status to pending', () => {
      const session = createUserTestingSession(mockMockups, mockStories);

      expect(session.status).toBe('pending');
    });

    it('should include mockups with feedbackCollected flag', () => {
      const session = createUserTestingSession(mockMockups, mockStories);

      expect(session.mockups).toHaveLength(2);
      expect(session.mockups[0].feedbackCollected).toBe(false);
    });

    it('should include stories with feedbackCollected flag', () => {
      const session = createUserTestingSession(mockMockups, mockStories);

      expect(session.stories).toHaveLength(2);
      expect(session.stories[0].feedbackCollected).toBe(false);
    });

    it('should initialize empty testers array', () => {
      const session = createUserTestingSession(mockMockups, mockStories);

      expect(session.testers).toEqual([]);
    });

    it('should include createdAt timestamp', () => {
      const session = createUserTestingSession(mockMockups, mockStories);

      expect(session.createdAt).toBeDefined();
    });
  });

  // ============================================
  // recordUserFeedback Tests
  // ============================================

  describe('recordUserFeedback', () => {
    const mockFeedback = {
      usability: 4,
      clarity: 5,
      completeness: 4,
      comments: 'Great design!',
      suggestions: ['Add dark mode'],
      blockers: []
    };

    it('should record feedback with session ID', () => {
      const record = recordUserFeedback('ut-123', 'tester-1', mockFeedback);

      expect(record.sessionId).toBe('ut-123');
    });

    it('should include tester ID', () => {
      const record = recordUserFeedback('ut-123', 'tester-1', mockFeedback);

      expect(record.testerId).toBe('tester-1');
    });

    it('should include usability score', () => {
      const record = recordUserFeedback('ut-123', 'tester-1', mockFeedback);

      expect(record.feedback.usability).toBe(4);
    });

    it('should include clarity score', () => {
      const record = recordUserFeedback('ut-123', 'tester-1', mockFeedback);

      expect(record.feedback.clarity).toBe(5);
    });

    it('should include completeness score', () => {
      const record = recordUserFeedback('ut-123', 'tester-1', mockFeedback);

      expect(record.feedback.completeness).toBe(4);
    });

    it('should include comments', () => {
      const record = recordUserFeedback('ut-123', 'tester-1', mockFeedback);

      expect(record.feedback.comments).toBe('Great design!');
    });

    it('should include suggestions', () => {
      const record = recordUserFeedback('ut-123', 'tester-1', mockFeedback);

      expect(record.feedback.suggestions).toEqual(['Add dark mode']);
    });

    it('should include blockers (empty by default)', () => {
      const feedbackWithoutBlockers = { ...mockFeedback };
      delete feedbackWithoutBlockers.blockers;

      const record = recordUserFeedback('ut-123', 'tester-1', feedbackWithoutBlockers);

      expect(record.feedback.blockers).toEqual([]);
    });

    it('should include recordedAt timestamp', () => {
      const record = recordUserFeedback('ut-123', 'tester-1', mockFeedback);

      expect(record.recordedAt).toBeDefined();
    });
  });

  // ============================================
  // evaluateUserTesting Tests
  // ============================================

  describe('evaluateUserTesting', () => {
    it('should fail when insufficient testers', () => {
      const session = {
        testers: [
          { feedback: { usability: 5, clarity: 5, completeness: 5, blockers: [] } }
        ],
        mockups: [],
        stories: []
      };

      const result = evaluateUserTesting(session);

      expect(result.passed).toBe(false);
      expect(result.status).toBe('insufficient_testers');
    });

    it('should include message for insufficient testers', () => {
      const session = {
        testers: [
          { feedback: { usability: 5, clarity: 5, completeness: 5, blockers: [] } }
        ],
        mockups: [],
        stories: []
      };

      const result = evaluateUserTesting(session);

      expect(result.message).toContain('3');
    });

    it('should fail when blockers found', () => {
      const session = {
        testers: [
          { feedback: { usability: 5, clarity: 5, completeness: 5, blockers: ['Navigation confusing'] } },
          { feedback: { usability: 5, clarity: 5, completeness: 5, blockers: [] } },
          { feedback: { usability: 5, clarity: 5, completeness: 5, blockers: [] } }
        ],
        mockups: [],
        stories: []
      };

      const result = evaluateUserTesting(session);

      expect(result.passed).toBe(false);
      expect(result.status).toBe('blockers_found');
      expect(result.blockers).toContain('Navigation confusing');
    });

    it('should fail when score below minimum', () => {
      const session = {
        testers: [
          { feedback: { usability: 2, clarity: 2, completeness: 2, blockers: [] } },
          { feedback: { usability: 3, clarity: 3, completeness: 3, blockers: [] } },
          { feedback: { usability: 2, clarity: 2, completeness: 2, blockers: [] } }
        ],
        mockups: [],
        stories: []
      };

      const result = evaluateUserTesting(session);

      expect(result.passed).toBe(false);
      expect(result.status).toBe('low_score');
    });

    it('should pass when all criteria met', () => {
      const session = {
        testers: [
          { feedback: { usability: 4, clarity: 4, completeness: 4, blockers: [] } },
          { feedback: { usability: 5, clarity: 5, completeness: 5, blockers: [] } },
          { feedback: { usability: 4, clarity: 4, completeness: 4, blockers: [] } }
        ],
        mockups: [],
        stories: []
      };

      const result = evaluateUserTesting(session);

      expect(result.passed).toBe(true);
      expect(result.status).toBe('approved');
    });

    it('should include scores in result', () => {
      const session = {
        testers: [
          { feedback: { usability: 4, clarity: 4, completeness: 4, blockers: [] } },
          { feedback: { usability: 5, clarity: 5, completeness: 5, blockers: [] } },
          { feedback: { usability: 4, clarity: 4, completeness: 4, blockers: [] } }
        ],
        mockups: [],
        stories: []
      };

      const result = evaluateUserTesting(session);

      expect(result.scores).toBeDefined();
      expect(result.scores.avgUsability).toBeDefined();
      expect(result.scores.avgClarity).toBeDefined();
      expect(result.scores.avgCompleteness).toBeDefined();
      expect(result.scores.overallScore).toBeDefined();
    });

    it('should include tester count when passed', () => {
      const session = {
        testers: [
          { feedback: { usability: 4, clarity: 4, completeness: 4, blockers: [] } },
          { feedback: { usability: 5, clarity: 5, completeness: 5, blockers: [] } },
          { feedback: { usability: 4, clarity: 4, completeness: 4, blockers: [] } }
        ],
        mockups: [],
        stories: []
      };

      const result = evaluateUserTesting(session);

      expect(result.testerCount).toBe(3);
    });
  });

  // ============================================
  // calculateAverageScores Tests
  // ============================================

  describe('calculateAverageScores', () => {
    it('should calculate average usability score', () => {
      const testers = [
        { feedback: { usability: 4, clarity: 5, completeness: 4 } },
        { feedback: { usability: 5, clarity: 4, completeness: 5 } }
      ];

      const scores = calculateAverageScores(testers);

      expect(scores.avgUsability).toBe(4.5);
    });

    it('should calculate average clarity score', () => {
      const testers = [
        { feedback: { usability: 4, clarity: 4, completeness: 4 } },
        { feedback: { usability: 4, clarity: 5, completeness: 4 } }
      ];

      const scores = calculateAverageScores(testers);

      expect(scores.avgClarity).toBe(4.5);
    });

    it('should calculate overall score', () => {
      const testers = [
        { feedback: { usability: 3, clarity: 3, completeness: 3 } },
        { feedback: { usability: 5, clarity: 5, completeness: 5 } }
      ];

      const scores = calculateAverageScores(testers);

      expect(scores.overallScore).toBe(4);
    });
  });
});
