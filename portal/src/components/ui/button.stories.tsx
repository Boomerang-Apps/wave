import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Mail, Download, Plus, ChevronRight, Trash2, Settings } from 'lucide-react';

/**
 * # Button
 *
 * Primary button component built on Radix UI Slot with class-variance-authority.
 * Supports multiple variants, sizes, and can render as a child component via `asChild`.
 *
 * ## Features
 * - 6 variants: default, destructive, outline, secondary, ghost, link
 * - 4 sizes: sm, default, lg, icon
 * - Full accessibility support
 * - Icon support with automatic sizing
 * - Disabled state
 */

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Versatile button component with multiple variants and sizes. Built on Radix UI primitives.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'Visual style variant',
      table: {
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Button size',
      table: {
        defaultValue: { summary: 'default' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    asChild: {
      control: 'boolean',
      description: 'Render as a Slot component (for custom elements)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'default',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Delete',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost',
    variant: 'ghost',
  },
};

export const Link: Story = {
  args: {
    children: 'Link',
    variant: 'link',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-6 bg-background rounded-xl">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-6 bg-background rounded-xl">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-6 bg-background rounded-xl">
      <Button>
        <Mail />
        Login with Email
      </Button>
      <Button variant="secondary">
        <Download />
        Download
      </Button>
      <Button variant="outline">
        <Plus />
        Add Item
      </Button>
      <Button variant="ghost">
        Continue
        <ChevronRight />
      </Button>
    </div>
  ),
};

export const IconButtons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-6 bg-background rounded-xl">
      <Button size="icon">
        <Plus />
      </Button>
      <Button size="icon" variant="secondary">
        <Settings />
      </Button>
      <Button size="icon" variant="outline">
        <Download />
      </Button>
      <Button size="icon" variant="destructive">
        <Trash2 />
      </Button>
      <Button size="icon" variant="ghost">
        <Mail />
      </Button>
    </div>
  ),
};

export const DisabledStates: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-6 bg-background rounded-xl">
      <Button disabled>Default</Button>
      <Button variant="secondary" disabled>Secondary</Button>
      <Button variant="destructive" disabled>Destructive</Button>
      <Button variant="outline" disabled>Outline</Button>
      <Button variant="ghost" disabled>Ghost</Button>
      <Button variant="link" disabled>Link</Button>
    </div>
  ),
};

export const LoadingState: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-6 bg-background rounded-xl">
      <Button disabled>
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading...
      </Button>
      <Button variant="outline" disabled>
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Processing...
      </Button>
    </div>
  ),
};

export const ButtonGroups: Story = {
  render: () => (
    <div className="space-y-6 p-6 bg-background rounded-xl">
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Horizontal Group</h4>
        <div className="flex gap-2">
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Toolbar</h4>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost">
            <Plus />
          </Button>
          <Button size="icon" variant="ghost">
            <Download />
          </Button>
          <Button size="icon" variant="ghost">
            <Settings />
          </Button>
          <Button size="icon" variant="ghost">
            <Trash2 />
          </Button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Mixed Variants</h4>
        <div className="flex gap-2">
          <Button variant="destructive">
            <Trash2 />
            Delete
          </Button>
          <Button variant="outline">Cancel</Button>
          <Button variant="secondary">Draft</Button>
          <Button>
            Publish
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  ),
};

export const RealWorldExamples: Story = {
  render: () => (
    <div className="space-y-6 p-6 bg-background rounded-xl max-w-2xl">
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Delete Confirmation</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete this item? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Form Actions</h3>
        <div className="space-y-3 mb-4">
          <input
            type="text"
            placeholder="Enter your name"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
          />
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
          />
        </div>
        <div className="flex justify-between">
          <Button variant="ghost">Reset</Button>
          <div className="flex gap-2">
            <Button variant="secondary">Save Draft</Button>
            <Button>Submit</Button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Project Settings</h3>
          <Button size="icon" variant="ghost">
            <Settings />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Manage your project configuration and team members.
        </p>
        <Button variant="outline" className="w-full">
          <Plus />
          Add Team Member
        </Button>
      </div>
    </div>
  ),
};
