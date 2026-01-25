/**
 * Tests for Orchestrator TypeScript Types (Phase E.2)
 * TDD - Tests written BEFORE implementation
 */

import { describe, it, expect } from 'vitest';
import type {
  OrchestratorRun,
  OrchestratorRunInsert,
  OrchestratorRunUpdate,
  HumanReviewItem,
  HumanReviewItemInsert,
  HumanReviewItemUpdate,
  OrchestratorPhase,
  GateStatus,
  ReviewType,
  ReviewStatus
} from '../types/orchestrator';

describe('Orchestrator Types', () => {
  describe('OrchestratorRun', () => {
    it('should have correct row type structure', () => {
      const run: OrchestratorRun = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        thread_id: 'thread-123',
        project_id: '123e4567-e89b-12d3-a456-426614174001',
        story_id: 'story-001',
        phase: 'development',
        current_agent: 'dev',
        gate_status: 'go',
        safety_score: 0.92,
        violations: ['minor_issue'],
        requires_human_review: false,
        tokens_used: 15000,
        cost_usd: 0.045,
        started_at: '2026-01-25T12:00:00Z',
        completed_at: null,
        updated_at: '2026-01-25T12:30:00Z',
        files_created: ['src/index.ts'],
        error: null
      };

      expect(run.id).toBeDefined();
      expect(run.thread_id).toBe('thread-123');
      expect(run.phase).toBe('development');
      expect(run.gate_status).toBe('go');
      expect(run.safety_score).toBe(0.92);
    });

    it('should allow null for optional fields', () => {
      const run: OrchestratorRun = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        thread_id: 'thread-123',
        project_id: '123e4567-e89b-12d3-a456-426614174001',
        story_id: 'story-001',
        phase: 'planning',
        current_agent: null,
        gate_status: 'pending',
        safety_score: 1.0,
        violations: null,
        requires_human_review: false,
        tokens_used: 0,
        cost_usd: 0,
        started_at: '2026-01-25T12:00:00Z',
        completed_at: null,
        updated_at: '2026-01-25T12:00:00Z',
        files_created: null,
        error: null
      };

      expect(run.current_agent).toBeNull();
      expect(run.completed_at).toBeNull();
    });
  });

  describe('OrchestratorRunInsert', () => {
    it('should require thread_id, project_id, and story_id', () => {
      const insert: OrchestratorRunInsert = {
        thread_id: 'thread-456',
        project_id: '123e4567-e89b-12d3-a456-426614174001',
        story_id: 'story-002'
      };

      expect(insert.thread_id).toBe('thread-456');
      expect(insert.project_id).toBeDefined();
      expect(insert.story_id).toBeDefined();
    });

    it('should allow optional fields', () => {
      const insert: OrchestratorRunInsert = {
        thread_id: 'thread-456',
        project_id: '123e4567-e89b-12d3-a456-426614174001',
        story_id: 'story-002',
        phase: 'development',
        current_agent: 'cto'
      };

      expect(insert.phase).toBe('development');
    });
  });

  describe('OrchestratorRunUpdate', () => {
    it('should allow partial updates', () => {
      const update: OrchestratorRunUpdate = {
        phase: 'testing',
        current_agent: 'qa'
      };

      expect(update.phase).toBe('testing');
      expect(update.thread_id).toBeUndefined();
    });
  });

  describe('HumanReviewItem', () => {
    it('should have correct row type structure', () => {
      const review: HumanReviewItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        thread_id: 'thread-123',
        review_type: 'safety',
        reason: 'Low safety score detected',
        safety_score: 0.65,
        context: { action: 'file_delete', path: '/etc/passwd' },
        status: 'pending',
        resolved_by: null,
        resolved_at: null,
        resolution_notes: null,
        created_at: '2026-01-25T12:00:00Z'
      };

      expect(review.review_type).toBe('safety');
      expect(review.status).toBe('pending');
      expect(review.context).toHaveProperty('action');
    });

    it('should support all review types', () => {
      const types: ReviewType[] = ['safety', 'gate_override', 'budget_exceeded'];
      types.forEach(type => {
        const review: HumanReviewItem = {
          id: '123',
          thread_id: 'thread-123',
          review_type: type,
          reason: 'Test',
          safety_score: null,
          context: null,
          status: 'pending',
          resolved_by: null,
          resolved_at: null,
          resolution_notes: null,
          created_at: '2026-01-25T12:00:00Z'
        };
        expect(review.review_type).toBe(type);
      });
    });

    it('should support all status values', () => {
      const statuses: ReviewStatus[] = ['pending', 'approved', 'rejected'];
      statuses.forEach(status => {
        const review: HumanReviewItem = {
          id: '123',
          thread_id: 'thread-123',
          review_type: 'safety',
          reason: 'Test',
          safety_score: null,
          context: null,
          status: status,
          resolved_by: null,
          resolved_at: null,
          resolution_notes: null,
          created_at: '2026-01-25T12:00:00Z'
        };
        expect(review.status).toBe(status);
      });
    });
  });

  describe('HumanReviewItemInsert', () => {
    it('should require thread_id, review_type, and reason', () => {
      const insert: HumanReviewItemInsert = {
        thread_id: 'thread-789',
        review_type: 'budget_exceeded',
        reason: 'Cost limit exceeded'
      };

      expect(insert.thread_id).toBeDefined();
      expect(insert.review_type).toBe('budget_exceeded');
      expect(insert.reason).toBeDefined();
    });
  });

  describe('OrchestratorPhase', () => {
    it('should include all valid phases', () => {
      const phases: OrchestratorPhase[] = [
        'planning',
        'development',
        'testing',
        'complete',
        'failed'
      ];

      phases.forEach(phase => {
        expect(typeof phase).toBe('string');
      });
    });
  });

  describe('GateStatus', () => {
    it('should include all valid gate statuses', () => {
      const statuses: GateStatus[] = [
        'pending',
        'go',
        'hold',
        'kill',
        'recycle'
      ];

      statuses.forEach(status => {
        expect(typeof status).toBe('string');
      });
    });
  });
});
