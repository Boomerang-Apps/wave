import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

/**
 * # Badge
 *
 * Compact badge component for status indicators, labels, and tags.
 * Uses class-variance-authority for variant management.
 *
 * ## Variants
 * - **default**: Primary badge styling
 * - **secondary**: Secondary/muted badge
 * - **destructive**: Error or critical status
 * - **outline**: Outlined badge
 * - **success**: Success status (green)
 * - **warning**: Warning status (amber)
 * - **info**: Information status (blue)
 * - **muted**: Muted/disabled appearance
 */

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Versatile badge component for status indicators, counts, and labels.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info', 'muted'],
      description: 'Badge variant',
      table: {
        defaultValue: { summary: 'default' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Badge',
    variant: 'default',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Destructive',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

export const Success: Story = {
  args: {
    children: 'Success',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: 'Warning',
    variant: 'warning',
  },
};

export const Info: Story = {
  args: {
    children: 'Info',
    variant: 'info',
  },
};

export const Muted: Story = {
  args: {
    children: 'Muted',
    variant: 'muted',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2 p-6">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="muted">Muted</Badge>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2 p-6">
      <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Complete
      </Badge>
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
      <Badge variant="info" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Info
      </Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="space-y-4 p-6 bg-background">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground w-24">Active:</span>
        <Badge variant="success">Active</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground w-24">Pending:</span>
        <Badge variant="warning">Pending</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground w-24">Failed:</span>
        <Badge variant="destructive">Failed</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground w-24">Inactive:</span>
        <Badge variant="muted">Inactive</Badge>
      </div>
    </div>
  ),
};

export const Counts: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">Notifications</span>
        <Badge>3</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">Messages</span>
        <Badge variant="destructive">12</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">Updates</span>
        <Badge variant="success">5</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">Warnings</span>
        <Badge variant="warning">2</Badge>
      </div>
    </div>
  ),
};

export const Tags: Story = {
  render: () => (
    <div className="space-y-4 p-6 bg-background max-w-md">
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Project Tags</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">React</Badge>
          <Badge variant="outline">TypeScript</Badge>
          <Badge variant="outline">Tailwind</Badge>
          <Badge variant="outline">Vite</Badge>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Category Tags</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Frontend</Badge>
          <Badge variant="secondary">Backend</Badge>
          <Badge variant="secondary">DevOps</Badge>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Status Tags</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Deployed</Badge>
          <Badge variant="warning">In Progress</Badge>
          <Badge variant="info">Reviewed</Badge>
        </div>
      </div>
    </div>
  ),
};

export const InContext: Story = {
  render: () => (
    <div className="space-y-4 max-w-md p-6 bg-background">
      <div className="flex items-center justify-between p-3 border border-border rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-full" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">John Doe</span>
              <Badge variant="success" className="text-[10px] px-1.5">Pro</Badge>
            </div>
            <span className="text-xs text-muted-foreground">john@example.com</span>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-foreground">API Integration</h4>
          <Badge variant="warning">In Progress</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Setting up REST API endpoints for user authentication
        </p>
      </div>

      <div className="border border-border rounded-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-foreground">Database Migration</h4>
          <Badge variant="success">Complete</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Successfully migrated to PostgreSQL 15
        </p>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-6">
      <Badge className="text-[10px] px-1.5 py-0">Tiny</Badge>
      <Badge>Default</Badge>
      <Badge className="text-sm px-3 py-1">Large</Badge>
    </div>
  ),
};

export const GateStatuses: Story = {
  render: () => (
    <div className="space-y-3 p-6 bg-background max-w-md">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Gate 0: Pre-flight</span>
        <Badge variant="success">
          <CheckCircle className="h-3 w-3 mr-1" />
          Passed
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Gate 1: Self-verification</span>
        <Badge variant="success">
          <CheckCircle className="h-3 w-3 mr-1" />
          Passed
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Gate 2: Build verification</span>
        <Badge variant="warning">
          <Clock className="h-3 w-3 mr-1" />
          Running
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Gate 3: Test verification</span>
        <Badge variant="muted">Pending</Badge>
      </div>
    </div>
  ),
};
