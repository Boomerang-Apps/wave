/**
 * Tests for LaunchSequenceProgress Component (Phase 6)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LaunchSequenceProgress } from '../components/LaunchSequenceProgress';
import type { LaunchStep } from '../components/LaunchSequenceProgress';

describe('LaunchSequenceProgress', () => {
  const mockSteps: LaunchStep[] = [
    { id: 'mockup-design', label: 'Mockup', status: 'ready' },
    { id: 'project-overview', label: 'PRD', status: 'ready' },
    { id: 'execution-plan', label: 'Plan', status: 'idle' },
    { id: 'system-config', label: 'Config', status: 'idle' },
    { id: 'infrastructure', label: 'Infra', status: 'idle' },
    { id: 'compliance-safety', label: 'Safety', status: 'idle' },
    { id: 'rlm-protocol', label: 'RLM', status: 'idle' },
    { id: 'notifications', label: 'Slack', status: 'idle' },
    { id: 'build-qa', label: 'Build', status: 'idle' },
    { id: 'agent-dispatch', label: 'Launch', status: 'idle' },
  ];

  it('should render launch sequence header', () => {
    render(<LaunchSequenceProgress steps={mockSteps} currentStep={2} />);

    expect(screen.getByText('Launch Sequence')).toBeInTheDocument();
  });

  it('should display completion count', () => {
    render(<LaunchSequenceProgress steps={mockSteps} currentStep={2} />);

    expect(screen.getByText('2/10 Complete')).toBeInTheDocument();
  });

  it('should render all step circles', () => {
    render(<LaunchSequenceProgress steps={mockSteps} currentStep={0} />);

    // Should have 10 steps rendered
    const stepLabels = mockSteps.map(s => s.label);
    stepLabels.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('should show READY badge when all steps complete', () => {
    const allReadySteps = mockSteps.map(s => ({ ...s, status: 'ready' as const }));
    render(<LaunchSequenceProgress steps={allReadySteps} currentStep={9} />);

    expect(screen.getByText('READY')).toBeInTheDocument();
  });

  it('should show all green message when complete', () => {
    const allReadySteps = mockSteps.map(s => ({ ...s, status: 'ready' as const }));
    render(<LaunchSequenceProgress steps={allReadySteps} currentStep={9} />);

    expect(screen.getByText(/all systems green/i)).toBeInTheDocument();
  });

  it('should not show READY badge when steps incomplete', () => {
    render(<LaunchSequenceProgress steps={mockSteps} currentStep={2} />);

    expect(screen.queryByText('READY')).not.toBeInTheDocument();
  });
});
