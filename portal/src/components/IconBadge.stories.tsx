import type { Meta, StoryObj } from '@storybook/react';
import { Cpu, Rocket, Shield, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { IconBadge } from './IconBadge';

const meta: Meta<typeof IconBadge> = {
  title: 'Components/IconBadge',
  component: IconBadge,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof IconBadge>;

export const Default: Story = {
  args: {
    icon: <Cpu className="h-4 w-4" />,
    size: 'md',
  },
};

export const ExtraSmall: Story = {
  args: {
    icon: <Zap />,
    size: 'xs',
  },
};

export const Small: Story = {
  args: {
    icon: <Shield />,
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    icon: <Rocket />,
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    icon: <AlertTriangle />,
    size: 'lg',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <div className="flex flex-col items-center gap-2">
        <IconBadge icon={<CheckCircle2 />} size="xs" />
        <span className="text-xs text-muted-foreground">xs</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconBadge icon={<CheckCircle2 />} size="sm" />
        <span className="text-xs text-muted-foreground">sm</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconBadge icon={<CheckCircle2 />} size="md" />
        <span className="text-xs text-muted-foreground">md</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <IconBadge icon={<CheckCircle2 />} size="lg" />
        <span className="text-xs text-muted-foreground">lg</span>
      </div>
    </div>
  ),
};
