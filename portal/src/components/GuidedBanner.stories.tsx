import type { Meta, StoryObj } from '@storybook/react';
import { ModeProvider } from '../contexts/ModeContext';
import {
  GuidedBanner,
  WelcomeBanner,
  StepCompleteBanner,
  TipBanner,
  NextStepBanner,
} from './GuidedBanner';

const noop = () => {};

// Decorator to provide ModeContext in Simple mode (GuidedBanner only renders in Simple mode)
const SimpleModeDecorator = (Story: React.ComponentType) => (
  <ModeProvider>
    <Story />
  </ModeProvider>
);

const meta: Meta<typeof GuidedBanner> = {
  title: 'Components/GuidedBanner',
  component: GuidedBanner,
  tags: ['autodocs'],
  decorators: [SimpleModeDecorator],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'tip', 'next-step'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof GuidedBanner>;

export const Info: Story = {
  args: {
    title: 'Getting Started',
    description: 'Configure your project settings to begin the wave execution process.',
    variant: 'info',
    actionLabel: 'Open Settings',
    onAction: noop,
  },
};

export const Success: Story = {
  args: {
    title: 'Gate 3 Complete!',
    description: 'All tests passed. Moving on to QA acceptance.',
    variant: 'success',
  },
};

export const Tip: Story = {
  args: {
    title: 'Helpful Tip',
    description: 'You can use /cto quick to get a rapid health check of your project at any time.',
    variant: 'tip',
  },
};

export const NextStep: Story = {
  args: {
    title: 'Ready for: Wave Plan',
    description: "You've completed PRD & Stories. Let's move on to the next step.",
    variant: 'next-step',
    actionLabel: 'Proceed to Wave Plan',
    onAction: noop,
  },
};

export const NonDismissible: Story = {
  args: {
    title: 'Required Action',
    description: 'You must configure your API keys before proceeding.',
    variant: 'info',
    dismissible: false,
    actionLabel: 'Configure Keys',
    onAction: noop,
  },
};

export const Welcome: Story = {
  render: () => <WelcomeBanner onGetStarted={noop} />,
};

export const StepComplete: Story = {
  render: () => <StepCompleteBanner stepName="Infrastructure Setup" nextStep="Safety Protocol" />,
};

export const TipPreset: Story = {
  render: () => <TipBanner tip="Run /wave-status to see your current progress across all active waves." />,
};

export const NextStepPreset: Story = {
  render: () => (
    <NextStepBanner
      currentStep="Configuration"
      nextStep="Infrastructure"
      onProceed={noop}
    />
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <GuidedBanner
        title="Info Banner"
        description="This is an informational message."
        variant="info"
      />
      <GuidedBanner
        title="Success Banner"
        description="Operation completed successfully."
        variant="success"
      />
      <GuidedBanner
        title="Tip Banner"
        description="Here's a helpful tip for you."
        variant="tip"
      />
      <GuidedBanner
        title="Next Step Banner"
        description="Ready to proceed to the next phase."
        variant="next-step"
        actionLabel="Continue"
        onAction={noop}
      />
    </div>
  ),
};
