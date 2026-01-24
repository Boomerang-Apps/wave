/**
 * Tests for NextStepButton Component (Phase 6)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextStepButton } from '../components/NextStepButton';

describe('NextStepButton', () => {
  const mockNextStep = {
    id: 'execution-plan',
    label: 'Wave Plan',
    step: 2
  };

  const mockOnNavigate = vi.fn();
  const mockOnLaunch = vi.fn();

  beforeEach(() => {
    mockOnNavigate.mockClear();
    mockOnLaunch.mockClear();
  });

  describe('when current step is not ready', () => {
    it('should not render when status is idle', () => {
      const { container } = render(
        <NextStepButton
          currentStepStatus="idle"
          nextStep={mockNextStep}
          isFinalStep={false}
          onNavigate={mockOnNavigate}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when status is blocked', () => {
      const { container } = render(
        <NextStepButton
          currentStepStatus="blocked"
          nextStep={mockNextStep}
          isFinalStep={false}
          onNavigate={mockOnNavigate}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when status is validating', () => {
      const { container } = render(
        <NextStepButton
          currentStepStatus="validating"
          nextStep={mockNextStep}
          isFinalStep={false}
          onNavigate={mockOnNavigate}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('when current step is ready (not final)', () => {
    it('should render continue button', () => {
      render(
        <NextStepButton
          currentStepStatus="ready"
          nextStep={mockNextStep}
          isFinalStep={false}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText(/Continue to Step 2: Wave Plan/)).toBeInTheDocument();
    });

    it('should call onNavigate when clicked', () => {
      render(
        <NextStepButton
          currentStepStatus="ready"
          nextStep={mockNextStep}
          isFinalStep={false}
          onNavigate={mockOnNavigate}
        />
      );

      fireEvent.click(screen.getByText(/Continue to Step 2/));

      expect(mockOnNavigate).toHaveBeenCalledWith('execution-plan');
    });

    it('should not render if nextStep is null', () => {
      const { container } = render(
        <NextStepButton
          currentStepStatus="ready"
          nextStep={null}
          isFinalStep={false}
          onNavigate={mockOnNavigate}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('when on final step (ready)', () => {
    it('should render launch button', () => {
      render(
        <NextStepButton
          currentStepStatus="ready"
          nextStep={null}
          isFinalStep={true}
          onNavigate={mockOnNavigate}
          onLaunch={mockOnLaunch}
        />
      );

      expect(screen.getByText('Launch Agents')).toBeInTheDocument();
    });

    it('should show all checks passed message', () => {
      render(
        <NextStepButton
          currentStepStatus="ready"
          nextStep={null}
          isFinalStep={true}
          onNavigate={mockOnNavigate}
          onLaunch={mockOnLaunch}
        />
      );

      expect(screen.getByText(/All Pre-Flight Checks Passed/)).toBeInTheDocument();
    });

    it('should call onLaunch when launch button clicked', () => {
      render(
        <NextStepButton
          currentStepStatus="ready"
          nextStep={null}
          isFinalStep={true}
          onNavigate={mockOnNavigate}
          onLaunch={mockOnLaunch}
        />
      );

      fireEvent.click(screen.getByText('Launch Agents'));

      expect(mockOnLaunch).toHaveBeenCalled();
    });
  });
});
