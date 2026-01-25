/**
 * End-to-End Workflow Integration Tests (Phase F.2)
 * Verifies UI components work with types and mock data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// UI Components
import { GateDecisionDropdown } from '../components/GateDecisionDropdown';
import { HumanReviewBanner } from '../components/HumanReviewBanner';
import { OrchestratorStatus } from '../components/OrchestratorStatus';

// Types from database schema
import type {
  OrchestratorRun,
  OrchestratorRunSummary,
  GateStatus,
  OrchestratorPhase
} from '../types/orchestrator';

// Component-specific type (different from database type)
import type { HumanReviewItem } from '../components/HumanReviewBanner';

describe('E2E: Complete Orchestrator Workflow', () => {
  describe('Scenario: Run with human review escalation', () => {
    it('should display run status with pending review', () => {
      // Mock orchestrator status
      const runStatus: OrchestratorRunSummary = {
        runId: 'e2e-run-001',
        status: 'development',
        currentAgent: 'dev',
        safetyScore: 0.65, // Low - triggers review
        gateStatus: 'hold',
        tokensUsed: 10000,
        actionsCount: 8,
        pendingReviews: 1
      };

      // Render OrchestratorStatus
      render(
        <OrchestratorStatus
          status={{
            runId: runStatus.runId,
            status: 'running',
            currentAgent: runStatus.currentAgent,
            safetyScore: runStatus.safetyScore,
            gateStatus: runStatus.gateStatus,
            tokensUsed: runStatus.tokensUsed,
            actionsCount: runStatus.actionsCount
          }}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onKill={vi.fn()}
        />
      );

      // Verify status displayed
      expect(screen.getByText('dev')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('hold')).toBeInTheDocument();
    });

    it('should display human review banner for escalated items', () => {
      // Use component's HumanReviewItem type (different from database type)
      const reviewItems = [
        {
          id: 'review-001',
          type: 'safety',
          reason: 'Low safety score detected during file operations',
          safety_score: 0.65,
          created_at: '2026-01-25T12:00:00Z'
        }
      ];

      const onApprove = vi.fn();
      const onReject = vi.fn();

      render(
        <HumanReviewBanner
          items={reviewItems}
          onApprove={onApprove}
          onReject={onReject}
        />
      );

      // Verify review displayed
      expect(screen.getByText(/1 item\(s\) require human review/i)).toBeInTheDocument();
      expect(screen.getByText('safety')).toBeInTheDocument();
      expect(screen.getByTestId('safety-score')).toHaveTextContent('65%');

      // Approve the item
      fireEvent.click(screen.getByRole('button', { name: /approve/i }));
      expect(onApprove).toHaveBeenCalledWith('review-001');
    });

    it('should allow gate decision changes', () => {
      const onGo = vi.fn();
      const onHold = vi.fn();
      const onKill = vi.fn();
      const onRecycle = vi.fn();

      render(
        <GateDecisionDropdown
          onGo={onGo}
          onHold={onHold}
          onKill={onKill}
          onRecycle={onRecycle}
          currentStatus="hold"
        />
      );

      // Open dropdown
      fireEvent.click(screen.getByRole('button', { name: /gate decision/i }));

      // Select Go
      fireEvent.click(screen.getByText('Go (Proceed)'));
      expect(onGo).toHaveBeenCalled();
    });
  });

  describe('Scenario: Successful run completion', () => {
    it('should show completed status', () => {
      render(
        <OrchestratorStatus
          status={{
            runId: 'complete-run-001',
            status: 'completed',
            currentAgent: 'qa',
            safetyScore: 0.95,
            gateStatus: 'go',
            tokensUsed: 25000,
            actionsCount: 30
          }}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onKill={vi.fn()}
        />
      );

      expect(screen.getByTestId('status-badge')).toHaveTextContent('completed');
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('25,000')).toBeInTheDocument();
    });

    it('should not show review banner when no items', () => {
      const { container } = render(
        <HumanReviewBanner
          items={[]}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Scenario: Failed run with kill', () => {
    it('should allow killing a failed run', () => {
      const onKill = vi.fn();
      vi.spyOn(window, 'prompt').mockReturnValue('Run stuck in loop');

      render(
        <OrchestratorStatus
          status={{
            runId: 'failed-run-001',
            status: 'running',
            currentAgent: 'dev',
            safetyScore: 0.55,
            gateStatus: 'pending',
            tokensUsed: 50000,
            actionsCount: 100
          }}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onKill={onKill}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /kill/i }));
      expect(onKill).toHaveBeenCalledWith('Run stuck in loop');
    });
  });
});

describe('E2E: Type Compatibility', () => {
  it('should accept valid OrchestratorRun type', () => {
    const run: OrchestratorRun = {
      id: 'type-test-001',
      thread_id: 'thread-001',
      project_id: 'project-001',
      story_id: 'story-001',
      phase: 'development',
      current_agent: 'dev',
      gate_status: 'go',
      safety_score: 0.92,
      violations: null,
      requires_human_review: false,
      tokens_used: 5000,
      cost_usd: 0.015,
      started_at: '2026-01-25T12:00:00Z',
      completed_at: null,
      updated_at: '2026-01-25T12:30:00Z',
      files_created: ['src/index.ts'],
      error: null
    };

    expect(run.phase).toBe('development');
    expect(run.gate_status).toBe('go');
  });

  it('should accept all gate status values', () => {
    const statuses: GateStatus[] = ['pending', 'go', 'hold', 'kill', 'recycle'];

    statuses.forEach(status => {
      render(
        <GateDecisionDropdown
          onGo={vi.fn()}
          onHold={vi.fn()}
          onKill={vi.fn()}
          onRecycle={vi.fn()}
          currentStatus={status}
        />
      );
    });
  });

  it('should accept all phase values in OrchestratorStatus', () => {
    const phases: OrchestratorPhase[] = ['planning', 'development', 'testing', 'complete', 'failed'];

    phases.forEach(phase => {
      const status = phase === 'complete' ? 'completed' :
                     phase === 'failed' ? 'failed' : 'running';

      const { unmount } = render(
        <OrchestratorStatus
          status={{
            runId: `phase-test-${phase}`,
            status: status as any,
            currentAgent: 'test',
            safetyScore: 0.9,
            gateStatus: 'go',
            tokensUsed: 1000,
            actionsCount: 5
          }}
          onPause={vi.fn()}
          onResume={vi.fn()}
          onKill={vi.fn()}
        />
      );
      unmount();
    });
  });
});

describe('E2E: Component Interaction', () => {
  it('should handle full approval workflow', () => {
    // Use component's HumanReviewItem type (different from database type)
    const reviewItems = [
      {
        id: 'approve-test',
        type: 'gate_override',
        reason: 'User requested override',
        created_at: '2026-01-25T12:00:00Z'
      }
    ];

    const onApprove = vi.fn();

    render(
      <HumanReviewBanner
        items={reviewItems}
        onApprove={onApprove}
        onReject={vi.fn()}
      />
    );

    // Click approve
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    // Verify callback
    expect(onApprove).toHaveBeenCalledWith('approve-test');
  });

  it('should handle gate decision with resume', () => {
    const onResume = vi.fn();

    render(
      <OrchestratorStatus
        status={{
          runId: 'resume-test',
          status: 'running',
          currentAgent: 'dev',
          safetyScore: 0.85,
          gateStatus: 'hold', // On hold
          tokensUsed: 5000,
          actionsCount: 10
        }}
        onPause={vi.fn()}
        onResume={onResume}
        onKill={vi.fn()}
      />
    );

    // Should show Resume button when on hold
    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(onResume).toHaveBeenCalled();
  });
});
