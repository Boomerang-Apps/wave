/**
 * Tests for OrchestratorStatus Component (Phase D.3)
 * TDD - Tests written BEFORE implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrchestratorStatus } from '../components/OrchestratorStatus';

describe('OrchestratorStatus', () => {
  const defaultStatus = {
    runId: 'run-123',
    status: 'running' as const,
    currentAgent: 'dev',
    safetyScore: 0.92,
    gateStatus: 'go' as const,
    tokensUsed: 15000,
    actionsCount: 10
  };

  const defaultProps = {
    status: defaultStatus,
    onPause: vi.fn(),
    onResume: vi.fn(),
    onKill: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the status card', () => {
      render(<OrchestratorStatus {...defaultProps} />);

      expect(screen.getByTestId('orchestrator-status')).toBeInTheDocument();
    });

    it('should render orchestrator run title', () => {
      render(<OrchestratorStatus {...defaultProps} />);

      expect(screen.getByText('Orchestrator Run')).toBeInTheDocument();
    });

    it('should render CPU icon', () => {
      render(<OrchestratorStatus {...defaultProps} />);

      expect(screen.getByTestId('cpu-icon')).toBeInTheDocument();
    });
  });

  describe('status display', () => {
    it('should display current agent', () => {
      render(<OrchestratorStatus {...defaultProps} />);

      expect(screen.getByText('dev')).toBeInTheDocument();
    });

    it('should display safety score as percentage', () => {
      render(<OrchestratorStatus {...defaultProps} />);

      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    it('should display gate status', () => {
      render(<OrchestratorStatus {...defaultProps} />);

      expect(screen.getByText('go')).toBeInTheDocument();
    });

    it('should display tokens used with formatting', () => {
      render(<OrchestratorStatus {...defaultProps} />);

      expect(screen.getByText('15,000')).toBeInTheDocument();
    });

    it('should display run status badge', () => {
      render(<OrchestratorStatus {...defaultProps} />);

      expect(screen.getByTestId('status-badge')).toHaveTextContent('running');
    });
  });

  describe('status badge styling', () => {
    it('should show green badge for completed status', () => {
      render(<OrchestratorStatus {...defaultProps} status={{ ...defaultStatus, status: 'completed' }} />);

      const badge = screen.getByTestId('status-badge');
      expect(badge.className).toContain('green');
    });

    it('should show red badge for failed status', () => {
      render(<OrchestratorStatus {...defaultProps} status={{ ...defaultStatus, status: 'failed' }} />);

      const badge = screen.getByTestId('status-badge');
      expect(badge.className).toContain('red');
    });

    it('should show blue badge for running status', () => {
      render(<OrchestratorStatus {...defaultProps} status={{ ...defaultStatus, status: 'running' }} />);

      const badge = screen.getByTestId('status-badge');
      expect(badge.className).toContain('blue');
    });
  });

  describe('safety score colors', () => {
    it('should show green for high safety score (>= 0.85)', () => {
      render(<OrchestratorStatus {...defaultProps} status={{ ...defaultStatus, safetyScore: 0.92 }} />);

      const scoreElement = screen.getByTestId('safety-score');
      expect(scoreElement.className).toContain('green');
    });

    it('should show amber for medium safety score (>= 0.7, < 0.85)', () => {
      render(<OrchestratorStatus {...defaultProps} status={{ ...defaultStatus, safetyScore: 0.78 }} />);

      const scoreElement = screen.getByTestId('safety-score');
      expect(scoreElement.className).toContain('amber');
    });

    it('should show red for low safety score (< 0.7)', () => {
      render(<OrchestratorStatus {...defaultProps} status={{ ...defaultStatus, safetyScore: 0.55 }} />);

      const scoreElement = screen.getByTestId('safety-score');
      expect(scoreElement.className).toContain('red');
    });
  });

  describe('control buttons', () => {
    it('should show pause button when not on hold', () => {
      render(<OrchestratorStatus {...defaultProps} status={{ ...defaultStatus, gateStatus: 'go' }} />);

      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('should show resume button when on hold', () => {
      render(<OrchestratorStatus {...defaultProps} status={{ ...defaultStatus, gateStatus: 'hold' }} />);

      expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
    });

    it('should show kill button', () => {
      render(<OrchestratorStatus {...defaultProps} />);

      expect(screen.getByRole('button', { name: /kill/i })).toBeInTheDocument();
    });

    it('should call onPause when pause clicked', () => {
      render(<OrchestratorStatus {...defaultProps} status={{ ...defaultStatus, gateStatus: 'go' }} />);

      fireEvent.click(screen.getByRole('button', { name: /pause/i }));

      expect(defaultProps.onPause).toHaveBeenCalledTimes(1);
    });

    it('should call onResume when resume clicked', () => {
      render(<OrchestratorStatus {...defaultProps} status={{ ...defaultStatus, gateStatus: 'hold' }} />);

      fireEvent.click(screen.getByRole('button', { name: /resume/i }));

      expect(defaultProps.onResume).toHaveBeenCalledTimes(1);
    });

    it('should call onKill with reason when kill clicked', () => {
      const mockPrompt = vi.spyOn(window, 'prompt').mockReturnValue('Test kill reason');

      render(<OrchestratorStatus {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /kill/i }));

      expect(defaultProps.onKill).toHaveBeenCalledWith('Test kill reason');

      mockPrompt.mockRestore();
    });

    it('should not call onKill if prompt cancelled', () => {
      const mockPrompt = vi.spyOn(window, 'prompt').mockReturnValue(null);

      render(<OrchestratorStatus {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /kill/i }));

      expect(defaultProps.onKill).not.toHaveBeenCalled();

      mockPrompt.mockRestore();
    });
  });

  describe('null state', () => {
    it('should return null when status is null', () => {
      const { container } = render(<OrchestratorStatus {...defaultProps} status={null} />);

      expect(container.firstChild).toBeNull();
    });
  });
});
