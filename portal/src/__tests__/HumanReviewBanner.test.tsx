/**
 * Tests for HumanReviewBanner Component (Phase D.2)
 * TDD - Tests written BEFORE implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HumanReviewBanner } from '../components/HumanReviewBanner';

describe('HumanReviewBanner', () => {
  const mockItems = [
    {
      id: 'review-1',
      type: 'file_deletion',
      reason: 'Attempting to delete critical system file',
      safety_score: 0.45,
      created_at: '2026-01-25T12:00:00Z'
    },
    {
      id: 'review-2',
      type: 'permission_change',
      reason: 'Changing permissions to 777',
      safety_score: 0.62,
      created_at: '2026-01-25T12:05:00Z'
    }
  ];

  const defaultProps = {
    items: mockItems,
    onApprove: vi.fn(),
    onReject: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering with items', () => {
    it('should render the banner when items exist', () => {
      render(<HumanReviewBanner {...defaultProps} />);

      expect(screen.getByTestId('human-review-banner')).toBeInTheDocument();
    });

    it('should show count of items requiring review', () => {
      render(<HumanReviewBanner {...defaultProps} />);

      expect(screen.getByText(/2 item\(s\) require human review/i)).toBeInTheDocument();
    });

    it('should render warning icon', () => {
      render(<HumanReviewBanner {...defaultProps} />);

      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
    });

    it('should render each review item', () => {
      render(<HumanReviewBanner {...defaultProps} />);

      expect(screen.getByText('file_deletion')).toBeInTheDocument();
      expect(screen.getByText('permission_change')).toBeInTheDocument();
    });

    it('should display item reason', () => {
      render(<HumanReviewBanner {...defaultProps} />);

      expect(screen.getByText('Attempting to delete critical system file')).toBeInTheDocument();
    });

    it('should display safety score as percentage', () => {
      render(<HumanReviewBanner {...defaultProps} />);

      expect(screen.getByText(/45%/)).toBeInTheDocument();
      expect(screen.getByText(/62%/)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should return null when no items', () => {
      const { container } = render(<HumanReviewBanner {...defaultProps} items={[]} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('actions', () => {
    it('should have approve button for each item', () => {
      render(<HumanReviewBanner {...defaultProps} />);

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      expect(approveButtons).toHaveLength(2);
    });

    it('should have reject button for each item', () => {
      render(<HumanReviewBanner {...defaultProps} />);

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      expect(rejectButtons).toHaveLength(2);
    });

    it('should call onApprove with item id when approve clicked', () => {
      render(<HumanReviewBanner {...defaultProps} />);

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      fireEvent.click(approveButtons[0]);

      expect(defaultProps.onApprove).toHaveBeenCalledWith('review-1');
    });

    it('should call onReject with item id and reason when reject clicked', () => {
      // Mock window.prompt
      const mockPrompt = vi.spyOn(window, 'prompt').mockReturnValue('Not needed');

      render(<HumanReviewBanner {...defaultProps} />);

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      fireEvent.click(rejectButtons[0]);

      expect(defaultProps.onReject).toHaveBeenCalledWith('review-1', 'Not needed');

      mockPrompt.mockRestore();
    });

    it('should not call onReject if prompt is cancelled', () => {
      const mockPrompt = vi.spyOn(window, 'prompt').mockReturnValue(null);

      render(<HumanReviewBanner {...defaultProps} />);

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      fireEvent.click(rejectButtons[0]);

      expect(defaultProps.onReject).not.toHaveBeenCalled();

      mockPrompt.mockRestore();
    });
  });

  describe('safety score styling', () => {
    it('should show red styling for low safety scores', () => {
      render(<HumanReviewBanner {...defaultProps} />);

      const scoreElements = screen.getAllByTestId('safety-score');
      expect(scoreElements[0].className).toContain('red');
    });
  });

  describe('single item', () => {
    it('should show singular text for one item', () => {
      render(<HumanReviewBanner {...defaultProps} items={[mockItems[0]]} />);

      expect(screen.getByText(/1 item\(s\) require human review/i)).toBeInTheDocument();
    });
  });
});
