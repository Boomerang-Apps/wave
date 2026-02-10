import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Button } from './button';
import { Plus, Info, HelpCircle, Settings, Copy, Trash2, Edit, Download } from 'lucide-react';

/**
 * # Tooltip
 *
 * Contextual popup component built on Radix UI Tooltip primitive.
 * Shows additional information on hover or focus.
 *
 * ## Subcomponents
 * - **TooltipProvider**: Required wrapper for tooltip context
 * - **Tooltip**: Root container
 * - **TooltipTrigger**: Element that triggers the tooltip
 * - **TooltipContent**: Popup content with positioning
 *
 * ## Features
 * - Automatic positioning with collision detection
 * - Keyboard accessible (focus trigger)
 * - Customizable delay and duration
 * - Four placement sides (top, bottom, left, right)
 * - Smooth fade and zoom animations
 */

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Contextual tooltip with smart positioning and keyboard support. Requires TooltipProvider wrapper.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Tooltip content</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const OnIcon: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline">
            <Info className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>More information</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const AllSides: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex flex-col items-center gap-12 p-12">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Top (default)</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tooltip on top</p>
          </TooltipContent>
        </Tooltip>

        <div className="flex gap-12">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Left</Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Tooltip on left</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Right</Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Tooltip on right</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Bottom</Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Tooltip on bottom</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const IconButtons: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex gap-2 p-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add new item</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline">
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy to clipboard</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline">
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete permanently</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const WithShortcut: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex gap-2 p-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2">
              <span>Copy</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>C
              </kbd>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline">
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2">
              <span>Save</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>S
              </kbd>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="outline">
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2">
              <span>Settings</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>,
              </kbd>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const MultiLine: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">
            <HelpCircle className="h-4 w-4 mr-2" />
            Need help?
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium mb-1">Getting Started</p>
          <p className="text-xs">
            Click this button to access our comprehensive help documentation
            and support resources.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const OnText: Story = {
  render: () => (
    <TooltipProvider>
      <p className="text-sm text-muted-foreground">
        This feature is{' '}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="underline decoration-dotted cursor-help">experimental</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Still in beta testing</p>
          </TooltipContent>
        </Tooltip>
        {' '}and may change in future releases.
      </p>
    </TooltipProvider>
  ),
};

export const RichContent: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">User Info</Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium">JD</span>
              </div>
              <div>
                <div className="font-medium">John Doe</div>
                <div className="text-xs text-muted-foreground">john@example.com</div>
              </div>
            </div>
            <div className="text-xs">
              Last active: 2 hours ago
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const VariousStates: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex flex-wrap gap-4 p-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Active Button</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to perform action</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary">Secondary</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Secondary action</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="destructive">Delete</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>⚠️ This action cannot be undone</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button disabled>Disabled</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>This action is currently unavailable</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const FormFields: Story = {
  render: () => (
    <TooltipProvider>
      <div className="space-y-4 w-[400px] p-6 bg-background">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Password must be at least 8 characters long and contain
                  uppercase, lowercase, and numbers.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <input
            type="password"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
            placeholder="Enter password"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">API Key</label>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Find this in your account settings</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <input
            type="text"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
            placeholder="Enter API key"
          />
        </div>
      </div>
    </TooltipProvider>
  ),
};

export const StatusIndicators: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex gap-4 p-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-3 h-3 bg-green-500 rounded-full cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>System operational</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-3 h-3 bg-amber-500 rounded-full cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Partial outage detected</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-3 h-3 bg-red-500 rounded-full cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>System down</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-3 h-3 bg-muted-foreground rounded-full cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Unknown status</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const Toolbar: Story = {
  render: () => (
    <TooltipProvider>
      <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <span className="font-bold">B</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2">
              <span>Bold</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>B
              </kbd>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <span className="italic">I</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2">
              <span>Italic</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>I
              </kbd>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <span className="underline">U</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2">
              <span>Underline</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>U
              </kbd>
            </div>
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2">
              <span>Copy</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">⌘</span>C
              </kbd>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const CustomDelay: Story = {
  render: () => (
    <div className="flex gap-4 p-6">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Instant</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Shows immediately</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={700}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Default (700ms)</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Shows after 700ms</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={1500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Slow (1500ms)</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Shows after 1.5 seconds</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  ),
};
