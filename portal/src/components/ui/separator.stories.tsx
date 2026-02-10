import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from './separator';
import { Mail, Bell, Settings, User } from 'lucide-react';

/**
 * # Separator
 *
 * Divider component built on Radix UI Separator primitive.
 * Creates visual separation between content sections.
 *
 * ## Features
 * - Horizontal and vertical orientations
 * - Decorative or semantic (for screen readers)
 * - Customizable thickness and color
 * - Accessible ARIA attributes
 */

const meta: Meta<typeof Separator> = {
  title: 'Components/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Visual divider component with horizontal and vertical orientations.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Separator orientation',
      table: {
        defaultValue: { summary: 'horizontal' },
      },
    },
    decorative: {
      control: 'boolean',
      description: 'Whether separator is decorative (hidden from screen readers)',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-[300px] space-y-4 p-6 bg-background">
      <div>
        <h4 className="text-sm font-medium text-foreground">Section 1</h4>
        <p className="text-sm text-muted-foreground">Content above separator</p>
      </div>
      <Separator />
      <div>
        <h4 className="text-sm font-medium text-foreground">Section 2</h4>
        <p className="text-sm text-muted-foreground">Content below separator</p>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex items-center h-20 p-6 bg-background">
      <div className="px-4">
        <span className="text-sm text-foreground">Left</span>
      </div>
      <Separator orientation="vertical" />
      <div className="px-4">
        <span className="text-sm text-foreground">Middle</span>
      </div>
      <Separator orientation="vertical" />
      <div className="px-4">
        <span className="text-sm text-foreground">Right</span>
      </div>
    </div>
  ),
};

export const InText: Story = {
  render: () => (
    <div className="w-[400px] p-6 bg-background">
      <div className="space-y-4">
        <p className="text-sm text-foreground">
          First paragraph with some content that demonstrates how the separator works in text context.
        </p>
        <Separator />
        <p className="text-sm text-foreground">
          Second paragraph that comes after the separator, creating a clear visual division.
        </p>
        <Separator />
        <p className="text-sm text-foreground">
          Third paragraph showing multiple separators in sequence.
        </p>
      </div>
    </div>
  ),
};

export const InList: Story = {
  render: () => (
    <div className="w-[300px] bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 hover:bg-accent cursor-pointer transition-colors">
        <h4 className="text-sm font-medium text-foreground">Item 1</h4>
        <p className="text-xs text-muted-foreground">Description for item 1</p>
      </div>
      <Separator />
      <div className="p-4 hover:bg-accent cursor-pointer transition-colors">
        <h4 className="text-sm font-medium text-foreground">Item 2</h4>
        <p className="text-xs text-muted-foreground">Description for item 2</p>
      </div>
      <Separator />
      <div className="p-4 hover:bg-accent cursor-pointer transition-colors">
        <h4 className="text-sm font-medium text-foreground">Item 3</h4>
        <p className="text-xs text-muted-foreground">Description for item 3</p>
      </div>
    </div>
  ),
};

export const InMenu: Story = {
  render: () => (
    <div className="w-[250px] bg-popover border border-border rounded-lg shadow-md p-1">
      <div className="px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <User className="h-4 w-4" />
          Profile
        </div>
      </div>
      <div className="px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Settings className="h-4 w-4" />
          Settings
        </div>
      </div>
      <Separator className="my-1" />
      <div className="px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Bell className="h-4 w-4" />
          Notifications
        </div>
      </div>
      <div className="px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Mail className="h-4 w-4" />
          Messages
        </div>
      </div>
      <Separator className="my-1" />
      <div className="px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer text-red-400">
        <div className="flex items-center gap-2 text-sm">
          Sign Out
        </div>
      </div>
    </div>
  ),
};

export const CustomThickness: Story = {
  render: () => (
    <div className="w-[400px] space-y-6 p-6 bg-background">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Thin (1px - default)</div>
        <Separator />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Medium (2px)</div>
        <Separator className="h-[2px]" />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Thick (4px)</div>
        <Separator className="h-[4px]" />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Extra Thick (8px)</div>
        <Separator className="h-[8px]" />
      </div>
    </div>
  ),
};

export const CustomColors: Story = {
  render: () => (
    <div className="w-[400px] space-y-6 p-6 bg-background">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Default (Border)</div>
        <Separator />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-green-400">Success</div>
        <Separator className="bg-green-500" />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-amber-400">Warning</div>
        <Separator className="bg-amber-500" />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-red-400">Error</div>
        <Separator className="bg-red-500" />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-blue-400">Info</div>
        <Separator className="bg-blue-500" />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-foreground">Primary</div>
        <Separator className="bg-primary" />
      </div>
    </div>
  ),
};

export const VerticalHeights: Story = {
  render: () => (
    <div className="flex items-center gap-6 p-6 bg-background">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Short</span>
        <Separator orientation="vertical" className="h-8" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Medium</span>
        <Separator orientation="vertical" className="h-16" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Tall</span>
        <Separator orientation="vertical" className="h-24" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Extra Tall</span>
        <Separator orientation="vertical" className="h-32" />
      </div>
    </div>
  ),
};

export const InToolbar: Story = {
  render: () => (
    <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
      <button className="px-3 py-1.5 text-sm hover:bg-accent rounded">
        Bold
      </button>
      <button className="px-3 py-1.5 text-sm hover:bg-accent rounded">
        Italic
      </button>
      <button className="px-3 py-1.5 text-sm hover:bg-accent rounded">
        Underline
      </button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <button className="px-3 py-1.5 text-sm hover:bg-accent rounded">
        Left
      </button>
      <button className="px-3 py-1.5 text-sm hover:bg-accent rounded">
        Center
      </button>
      <button className="px-3 py-1.5 text-sm hover:bg-accent rounded">
        Right
      </button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <button className="px-3 py-1.5 text-sm hover:bg-accent rounded">
        Undo
      </button>
      <button className="px-3 py-1.5 text-sm hover:bg-accent rounded">
        Redo
      </button>
    </div>
  ),
};

export const InCard: Story = {
  render: () => (
    <div className="w-[350px] bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Card Title</h3>
        <p className="text-sm text-muted-foreground">
          This is the main content area of the card component.
        </p>
      </div>

      <Separator />

      <div className="p-4 bg-muted/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Created</span>
          <span className="text-foreground">2 days ago</span>
        </div>
      </div>

      <Separator />

      <div className="p-4 flex justify-end gap-2">
        <button className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors">
          Cancel
        </button>
        <button className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          Confirm
        </button>
      </div>
    </div>
  ),
};

export const DashedStyle: Story = {
  render: () => (
    <div className="w-[400px] space-y-6 p-6 bg-background">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Dashed</div>
        <Separator className="border-dashed border-t border-border h-0" />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Dotted</div>
        <Separator className="border-dotted border-t border-border h-0" />
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Double</div>
        <Separator className="border-double border-t-4 border-border h-0" />
      </div>
    </div>
  ),
};

export const SpacingVariations: Story = {
  render: () => (
    <div className="w-[400px] p-6 bg-background">
      <div className="space-y-1">
        <p className="text-sm text-foreground">Tight spacing (my-1)</p>
        <Separator className="my-1" />
        <p className="text-sm text-foreground">Content continues here</p>
      </div>

      <div className="space-y-4 mt-8">
        <p className="text-sm text-foreground">Normal spacing (my-4)</p>
        <Separator className="my-4" />
        <p className="text-sm text-foreground">Content continues here</p>
      </div>

      <div className="space-y-8 mt-12">
        <p className="text-sm text-foreground">Loose spacing (my-8)</p>
        <Separator className="my-8" />
        <p className="text-sm text-foreground">Content continues here</p>
      </div>
    </div>
  ),
};
