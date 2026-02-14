/**
 * TDD Tests for Tab Gating Component (Launch Sequence)
 *
 * Phase 1, Step 1.5: Tab Rendering with Lock State
 *
 * Tests the GatedTab component that renders tab buttons with
 * locked/unlocked states based on gate access validation.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { GatedTab } from '../components/GatedTab';
import type { GatedTabProps } from '../components/GatedTab';

describe('GatedTab Component', () => {

  // ============================================
  // Default Props Helper
  // ============================================

  const defaultProps: GatedTabProps = {
    id: 'mockup-design',
    label: 'Mockup Design',
    shortLabel: '0',
    stepNumber: 0,
    isLocked: false,
    isActive: false,
    status: 'idle',
    blockedBy: [],
    onClick: vi.fn()
  };

  // ============================================
  // Locked Tab Tests
  // ============================================

  describe('locked tab', () => {
    it('should render Lock icon when locked', () => {
      render(<GatedTab {...defaultProps} isLocked={true} />);

      // Look for lock icon (svg with test id or lock class)
      const lockIcon = screen.getByTestId('lock-icon');
      expect(lockIcon).toBeInTheDocument();
    });

    it('should have opacity-40 class when locked', () => {
      render(<GatedTab {...defaultProps} isLocked={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('opacity-40');
    });

    it('should be disabled when locked', () => {
      render(<GatedTab {...defaultProps} isLocked={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should wrap button with tooltip trigger when locked with blockers', () => {
      render(
        <GatedTab
          {...defaultProps}
          isLocked={true}
          blockedBy={['Mockup Design', 'PRD & Stories']}
        />
      );

      // Tooltip trigger wrapper exists with data-state attribute (Radix UI pattern)
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-state', 'closed');
    });

    it('should not call onClick when clicked while locked', () => {
      const onClick = vi.fn();
      render(<GatedTab {...defaultProps} isLocked={true} onClick={onClick} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });

    it('should have cursor-not-allowed class when locked', () => {
      render(<GatedTab {...defaultProps} isLocked={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('cursor-not-allowed');
    });

    it('should show blocked status indicator when locked', () => {
      render(<GatedTab {...defaultProps} isLocked={true} status="blocked" />);

      // Check for blocked status dot - uses semantic color
      const statusDot = screen.getByTestId('status-dot');
      expect(statusDot).toHaveClass('bg-destructive');
    });
  });

  // ============================================
  // Unlocked Tab Tests
  // ============================================

  describe('unlocked tab', () => {
    it('should be clickable when unlocked', () => {
      const onClick = vi.fn();
      render(<GatedTab {...defaultProps} isLocked={false} onClick={onClick} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should show step number when unlocked', () => {
      render(<GatedTab {...defaultProps} isLocked={false} stepNumber={0} />);

      expect(screen.getByText('0.')).toBeInTheDocument();
    });

    it('should not be disabled when unlocked', () => {
      render(<GatedTab {...defaultProps} isLocked={false} />);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    it('should not have Lock icon when unlocked', () => {
      render(<GatedTab {...defaultProps} isLocked={false} />);

      expect(screen.queryByTestId('lock-icon')).not.toBeInTheDocument();
    });

    it('should not have opacity-40 class when unlocked', () => {
      render(<GatedTab {...defaultProps} isLocked={false} />);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('opacity-40');
    });

    it('should not have tooltip when unlocked', () => {
      render(<GatedTab {...defaultProps} isLocked={false} blockedBy={[]} />);

      // No tooltip content should be present for unlocked tabs
      expect(screen.queryByText(/Complete first:/)).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Active Tab Tests
  // ============================================

  describe('active tab', () => {
    it('should have active styling when active', () => {
      render(<GatedTab {...defaultProps} isActive={true} />);

      const button = screen.getByRole('button');
      // Active unlocked tab uses bg-background and shadow-sm
      expect(button).toHaveClass('bg-background');
      expect(button).toHaveClass('shadow-sm');
    });

    it('should not have active styling when inactive', () => {
      render(<GatedTab {...defaultProps} isActive={false} />);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('shadow-sm');
    });
  });

  // ============================================
  // Status Indicator Tests
  // ============================================

  describe('status indicator', () => {
    it('should show ready status (green) when status is ready', () => {
      render(<GatedTab {...defaultProps} status="ready" />);

      const statusDot = screen.getByTestId('status-dot');
      expect(statusDot).toHaveClass('bg-green-500');
    });

    it('should show idle status (muted) when status is idle', () => {
      render(<GatedTab {...defaultProps} status="idle" />);

      const statusDot = screen.getByTestId('status-dot');
      expect(statusDot).toHaveClass('bg-muted-foreground');
    });

    it('should show blocked status (destructive) when status is blocked', () => {
      render(<GatedTab {...defaultProps} status="blocked" />);

      const statusDot = screen.getByTestId('status-dot');
      expect(statusDot).toHaveClass('bg-destructive');
    });
  });

  // ============================================
  // Label Display Tests
  // ============================================

  describe('label display', () => {
    it('should display the tab label', () => {
      render(<GatedTab {...defaultProps} label="Mockup Design" />);

      expect(screen.getByText('Mockup Design')).toBeInTheDocument();
    });

    it('should display short label when provided', () => {
      render(<GatedTab {...defaultProps} shortLabel="0" />);

      expect(screen.getByText('0.')).toBeInTheDocument();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should not show tooltip when blockedBy is empty', () => {
      render(<GatedTab {...defaultProps} isLocked={true} blockedBy={[]} />);

      // With empty blockedBy, no tooltip is rendered
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      // No tooltip content should be present
      expect(screen.queryByText(/Complete first:/)).not.toBeInTheDocument();
    });

    it('should have tooltip trigger when locked with multiple blockers', () => {
      const manyBlockers = ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5'];
      render(<GatedTab {...defaultProps} isLocked={true} blockedBy={manyBlockers} />);

      // Tooltip trigger is present (content appears on hover in real browser)
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-state', 'closed');
    });

    it('should call onClick with tab id', () => {
      const onClick = vi.fn();
      render(<GatedTab {...defaultProps} id="test-tab" onClick={onClick} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledWith('test-tab');
    });
  });
});
