import type { Meta, StoryObj } from '@storybook/react';
import { LaunchSequenceProgress } from './LaunchSequenceProgress';
import type { LaunchStep } from './LaunchSequenceProgress';

const meta: Meta<typeof LaunchSequenceProgress> = {
  title: 'Components/LaunchSequenceProgress',
  component: LaunchSequenceProgress,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof LaunchSequenceProgress>;

const defaultSteps: LaunchStep[] = [
  { id: '0', label: 'Mockup', status: 'idle' },
  { id: '1', label: 'PRD', status: 'idle' },
  { id: '2', label: 'Wave Plan', status: 'idle' },
  { id: '3', label: 'Config', status: 'idle' },
  { id: '4', label: 'Infra', status: 'idle' },
  { id: '5', label: 'Safety', status: 'idle' },
  { id: '6', label: 'RLM', status: 'idle' },
  { id: '7', label: 'Notify', status: 'idle' },
  { id: '8', label: 'Build QA', status: 'idle' },
  { id: '9', label: 'Launch', status: 'idle' },
];

export const AllIdle: Story = {
  args: {
    steps: defaultSteps,
    currentStep: 0,
  },
};

export const InProgress: Story = {
  args: {
    steps: defaultSteps.map((step, i) => ({
      ...step,
      status: i < 4 ? 'ready' : i === 4 ? 'validating' : 'idle',
    })),
    currentStep: 4,
  },
};

export const WithBlockedStep: Story = {
  args: {
    steps: defaultSteps.map((step, i) => ({
      ...step,
      status: i < 3 ? 'ready' : i === 3 ? 'blocked' : 'idle',
    })),
    currentStep: 3,
  },
};

export const AllComplete: Story = {
  args: {
    steps: defaultSteps.map((step) => ({
      ...step,
      status: 'ready' as const,
    })),
    currentStep: 9,
  },
};

export const MixedStatuses: Story = {
  args: {
    steps: [
      { id: '0', label: 'Mockup', status: 'ready' },
      { id: '1', label: 'PRD', status: 'ready' },
      { id: '2', label: 'Wave Plan', status: 'ready' },
      { id: '3', label: 'Config', status: 'blocked' },
      { id: '4', label: 'Infra', status: 'idle' },
      { id: '5', label: 'Safety', status: 'idle' },
      { id: '6', label: 'RLM', status: 'validating' },
      { id: '7', label: 'Notify', status: 'idle' },
      { id: '8', label: 'Build QA', status: 'idle' },
      { id: '9', label: 'Launch', status: 'idle' },
    ],
    currentStep: 3,
  },
};
