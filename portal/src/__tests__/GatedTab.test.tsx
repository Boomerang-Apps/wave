/**
 * Tests for GatedTab Component (Phase 6)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GatedTab } from '../components/GatedTab';

describe('GatedTab', () => {
  const defaultProps = {
    id: 'mockup-design',
    label: 'Mockup Design',
    shortLabel: '0',
    stepNumber: 0,
    isLocked: false,
    isActive: false,
    status: 'idle' as const,
    blockedBy: [],
    onClick: vi.fn()
  };

  beforeEach(() => {
    defaultProps.onClick.mockClear();
  });

  describe('unlocked state', () => {
    it('should render step number', () => {
      render(<GatedTab {...defaultProps} />);

      expect(screen.getByText('0.')).toBeInTheDocument();
    });

    it('should render label', () => {
      render(<GatedTab {...defaultProps} />);

      expect(screen.getByText('Mockup Design')).toBeInTheDocument();
    });

    it('should render status dot', () => {
      render(<GatedTab {...defaultProps} />);

      expect(screen.getByTestId('status-dot')).toBeInTheDocument();
    });

    it('should call onClick when clicked', () => {
      render(<GatedTab {...defaultProps} />);

      fireEvent.click(screen.getByRole('button'));

      expect(defaultProps.onClick).toHaveBeenCalledWith('mockup-design');
    });

    it('should not be disabled', () => {
      render(<GatedTab {...defaultProps} />);

      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('locked state', () => {
    it('should render lock icon instead of step number', () => {
      render(<GatedTab {...defaultProps} isLocked={true} blockedBy={['PRD']} />);

      expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
      expect(screen.queryByText('0.')).not.toBeInTheDocument();
    });

    it('should be disabled', () => {
      render(<GatedTab {...defaultProps} isLocked={true} blockedBy={['PRD']} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not call onClick when clicked', () => {
      render(<GatedTab {...defaultProps} isLocked={true} blockedBy={['PRD']} />);

      fireEvent.click(screen.getByRole('button'));

      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });

    it('should show tooltip with blocked steps', () => {
      render(<GatedTab {...defaultProps} isLocked={true} blockedBy={['Mockup', 'PRD']} />);

      const button = screen.getByRole('button');
      expect(button.getAttribute('title')).toBe('Complete first: Mockup, PRD');
    });

    it('should have reduced opacity', () => {
      render(<GatedTab {...defaultProps} isLocked={true} blockedBy={['PRD']} />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('opacity-40');
    });
  });

  describe('active state', () => {
    it('should have active styling when active and not locked', () => {
      render(<GatedTab {...defaultProps} isActive={true} />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-white');
    });

    it('should not have active styling when locked', () => {
      render(<GatedTab {...defaultProps} isActive={true} isLocked={true} blockedBy={['PRD']} />);

      const button = screen.getByRole('button');
      expect(button.className).not.toContain('bg-white shadow-sm');
    });
  });

  describe('status dot colors', () => {
    it('should show green dot for ready status', () => {
      render(<GatedTab {...defaultProps} status="ready" />);

      const dot = screen.getByTestId('status-dot');
      expect(dot.className).toContain('bg-green-500');
    });

    it('should show red dot for blocked status', () => {
      render(<GatedTab {...defaultProps} status="blocked" />);

      const dot = screen.getByTestId('status-dot');
      expect(dot.className).toContain('bg-red-500');
    });

    it('should show gray dot for idle status', () => {
      render(<GatedTab {...defaultProps} status="idle" />);

      const dot = screen.getByTestId('status-dot');
      expect(dot.className).toContain('bg-gray-400');
    });

    it('should show blocked status when locked', () => {
      render(<GatedTab {...defaultProps} status="idle" isLocked={true} blockedBy={['PRD']} />);

      const dot = screen.getByTestId('status-dot');
      expect(dot.className).toContain('bg-red-500');
    });
  });
});
