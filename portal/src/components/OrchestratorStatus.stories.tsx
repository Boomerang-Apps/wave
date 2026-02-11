import type { Meta, StoryObj } from '@storybook/react';
import { OrchestratorStatus } from './OrchestratorStatus';
import type { OrchestratorRunStatus } from './OrchestratorStatus';

const noop = () => {};

const meta: Meta<typeof OrchestratorStatus> = {
  title: 'Components/OrchestratorStatus',
  component: OrchestratorStatus,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onPause: noop,
    onResume: noop,
    onKill: noop,
  },
};

export default meta;
type Story = StoryObj<typeof OrchestratorStatus>;

const baseStatus: OrchestratorRunStatus = {
  runId: 'run-001',
  status: 'running',
  currentAgent: 'BE-Dev',
  safetyScore: 0.92,
  gateStatus: 'go',
  tokensUsed: 45200,
  actionsCount: 12,
};

export const Running: Story = {
  args: {
    status: baseStatus,
  },
};

export const Completed: Story = {
  args: {
    status: { ...baseStatus, status: 'completed', safetyScore: 0.95 },
  },
};

export const Failed: Story = {
  args: {
    status: { ...baseStatus, status: 'failed', safetyScore: 0.45 },
  },
};

export const Held: Story = {
  args: {
    status: { ...baseStatus, status: 'held', gateStatus: 'hold', safetyScore: 0.72 },
  },
};

export const Cancelled: Story = {
  args: {
    status: { ...baseStatus, status: 'cancelled' },
  },
};

export const LowSafetyScore: Story = {
  args: {
    status: { ...baseStatus, safetyScore: 0.55, currentAgent: 'FE-Dev' },
  },
};

export const MediumSafetyScore: Story = {
  args: {
    status: { ...baseStatus, safetyScore: 0.75, currentAgent: 'QA-Agent' },
  },
};

export const HighTokenUsage: Story = {
  args: {
    status: { ...baseStatus, tokensUsed: 1250000, actionsCount: 87 },
  },
};

export const NoStatus: Story = {
  args: {
    status: null,
  },
};
