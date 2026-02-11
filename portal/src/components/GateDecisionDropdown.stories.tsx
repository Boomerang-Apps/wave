import type { Meta, StoryObj } from '@storybook/react';
import { GateDecisionDropdown } from './GateDecisionDropdown';

const noop = () => {};

const meta: Meta<typeof GateDecisionDropdown> = {
  title: 'Components/GateDecisionDropdown',
  component: GateDecisionDropdown,
  tags: ['autodocs'],
  args: {
    onGo: noop,
    onHold: noop,
    onKill: noop,
    onRecycle: noop,
  },
  argTypes: {
    currentStatus: {
      control: 'select',
      options: ['pending', 'go', 'hold', 'kill', 'recycle'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof GateDecisionDropdown>;

export const Pending: Story = {
  args: {
    currentStatus: 'pending',
  },
};

export const Go: Story = {
  args: {
    currentStatus: 'go',
  },
};

export const Hold: Story = {
  args: {
    currentStatus: 'hold',
  },
};

export const Kill: Story = {
  args: {
    currentStatus: 'kill',
  },
};

export const Recycle: Story = {
  args: {
    currentStatus: 'recycle',
  },
};

export const Disabled: Story = {
  args: {
    currentStatus: 'pending',
    disabled: true,
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['pending', 'go', 'hold', 'kill', 'recycle'] as const).map((status) => (
        <div key={status} className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground w-20">{status}</span>
          <GateDecisionDropdown
            currentStatus={status}
            onGo={noop}
            onHold={noop}
            onKill={noop}
            onRecycle={noop}
          />
        </div>
      ))}
    </div>
  ),
};
