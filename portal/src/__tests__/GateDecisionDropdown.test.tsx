/**
 * Tests for GateDecisionDropdown Component (Phase D.1)
 * TDD - Tests written BEFORE implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GateDecisionDropdown } from '../components/GateDecisionDropdown';

describe('GateDecisionDropdown', () => {
  const defaultProps = {
    onGo: vi.fn(),
    onHold: vi.fn(),
    onKill: vi.fn(),
    onRecycle: vi.fn(),
    currentStatus: 'pending' as const
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the dropdown trigger button', () => {
      render(<GateDecisionDropdown {...defaultProps} />);

      expect(screen.getByRole('button', { name: /gate decision/i })).toBeInTheDocument();
    });

    it('should render target icon', () => {
      render(<GateDecisionDropdown {...defaultProps} />);

      expect(screen.getByTestId('gate-icon')).toBeInTheDocument();
    });

    it('should show current status badge', () => {
      render(<GateDecisionDropdown {...defaultProps} currentStatus="hold" />);

      expect(screen.getByText(/hold/i)).toBeInTheDocument();
    });
  });

  describe('dropdown menu', () => {
    it('should open menu when trigger is clicked', async () => {
      render(<GateDecisionDropdown {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /gate decision/i }));

      expect(await screen.findByText('Go (Proceed)')).toBeInTheDocument();
    });

    it('should show all four options', async () => {
      render(<GateDecisionDropdown {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /gate decision/i }));

      expect(await screen.findByText('Go (Proceed)')).toBeInTheDocument();
      expect(screen.getByText('Hold (Pause for data)')).toBeInTheDocument();
      expect(screen.getByText('Kill (Abandon)')).toBeInTheDocument();
      expect(screen.getByText('Recycle (Restart)')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('should call onGo when Go option is clicked', async () => {
      render(<GateDecisionDropdown {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /gate decision/i }));
      fireEvent.click(await screen.findByText('Go (Proceed)'));

      expect(defaultProps.onGo).toHaveBeenCalledTimes(1);
    });

    it('should call onRecycle when Recycle option is clicked', async () => {
      render(<GateDecisionDropdown {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /gate decision/i }));
      fireEvent.click(await screen.findByText('Recycle (Restart)'));

      expect(defaultProps.onRecycle).toHaveBeenCalledTimes(1);
    });
  });

  describe('status display', () => {
    it('should show green styling for go status', () => {
      render(<GateDecisionDropdown {...defaultProps} currentStatus="go" />);

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge.className).toContain('green');
    });

    it('should show amber styling for hold status', () => {
      render(<GateDecisionDropdown {...defaultProps} currentStatus="hold" />);

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge.className).toContain('amber');
    });

    it('should show red styling for kill status', () => {
      render(<GateDecisionDropdown {...defaultProps} currentStatus="kill" />);

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge.className).toContain('red');
    });

    it('should show blue styling for recycle status', () => {
      render(<GateDecisionDropdown {...defaultProps} currentStatus="recycle" />);

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge.className).toContain('blue');
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<GateDecisionDropdown {...defaultProps} disabled={true} />);

      expect(screen.getByRole('button', { name: /gate decision/i })).toBeDisabled();
    });

    it('should not open menu when disabled', () => {
      render(<GateDecisionDropdown {...defaultProps} disabled={true} />);

      fireEvent.click(screen.getByRole('button', { name: /gate decision/i }));

      expect(screen.queryByText('Go (Proceed)')).not.toBeInTheDocument();
    });
  });
});

describe('GateDecisionDropdown types', () => {
  it('should accept all valid status values', () => {
    const statuses: Array<'pending' | 'go' | 'hold' | 'kill' | 'recycle'> = [
      'pending', 'go', 'hold', 'kill', 'recycle'
    ];

    statuses.forEach(status => {
      const { unmount } = render(
        <GateDecisionDropdown
          onGo={vi.fn()}
          onHold={vi.fn()}
          onKill={vi.fn()}
          onRecycle={vi.fn()}
          currentStatus={status}
        />
      );
      unmount();
    });
  });
});
