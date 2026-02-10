import type { Meta, StoryObj } from '@storybook/react';

/**
 * # Border Radius
 *
 * WAVE uses a CSS variable-based border radius system for consistent rounded corners.
 * The base radius is defined in `--radius` and scaled down for smaller radii.
 *
 * ## Scale
 * - **sm**: `--radius` - 4px (0.5rem - 4px)
 * - **md**: `--radius` - 2px (0.5rem - 2px)
 * - **lg**: `--radius` (0.5rem = 8px)
 * - **xl**: 0.75rem (12px)
 * - **2xl**: 1rem (16px)
 * - **full**: 9999px (fully rounded)
 */

const RadiusBox = ({
  size,
  label,
  className
}: {
  size: string;
  label: string;
  className: string;
}) => (
  <div className="flex items-center gap-4 mb-4">
    <div className="w-32 text-sm text-muted-foreground font-mono">{label}</div>
    <div
      className={`w-24 h-24 bg-primary/20 border-2 border-primary ${className}`}
    />
    <div className="text-xs text-muted-foreground">{size}</div>
  </div>
);

const ComponentExample = ({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-6">
    <h4 className="text-sm font-medium text-foreground mb-3">{title}</h4>
    {children}
  </div>
);

const meta: Meta = {
  title: 'Design System/Tokens/Border Radius',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Border radius scale for consistent rounded corners across components.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllRadii: Story = {
  render: () => (
    <div className="space-y-8 p-6 bg-background">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-foreground">Border Radius Scale</h2>
        <p className="text-muted-foreground">Consistent rounded corners from --radius variable</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground">Scale Visualization</h3>
        <RadiusBox size="0px" label="rounded-none" className="rounded-none" />
        <RadiusBox size="2px" label="rounded-sm" className="rounded-sm" />
        <RadiusBox size="4px" label="rounded (default)" className="rounded" />
        <RadiusBox size="6px" label="rounded-md" className="rounded-md" />
        <RadiusBox size="8px" label="rounded-lg" className="rounded-lg" />
        <RadiusBox size="12px" label="rounded-xl" className="rounded-xl" />
        <RadiusBox size="16px" label="rounded-2xl" className="rounded-2xl" />
        <RadiusBox size="24px" label="rounded-3xl" className="rounded-3xl" />
        <RadiusBox size="9999px" label="rounded-full" className="rounded-full" />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground">Component Examples</h3>

        <ComponentExample title="Buttons - rounded-lg">
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
              Primary Button
            </button>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium">
              Secondary
            </button>
            <button className="px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium">
              Outline
            </button>
          </div>
        </ComponentExample>

        <ComponentExample title="Cards - rounded-xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-xl border border-border">
              <h5 className="font-semibold text-foreground mb-1">Card Title</h5>
              <p className="text-sm text-muted-foreground">Card with rounded-xl corners</p>
            </div>
            <div className="p-4 bg-muted rounded-xl border border-border">
              <h5 className="font-semibold text-foreground mb-1">Another Card</h5>
              <p className="text-sm text-muted-foreground">Consistent border radius</p>
            </div>
          </div>
        </ComponentExample>

        <ComponentExample title="Inputs - rounded-lg">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Text input"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground"
            />
            <select className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground">
              <option>Select option</option>
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>
        </ComponentExample>

        <ComponentExample title="Badges - rounded-full">
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-green-500/15 text-green-400 rounded-full text-xs font-medium">
              Active
            </span>
            <span className="px-3 py-1 bg-amber-500/15 text-amber-400 rounded-full text-xs font-medium">
              Pending
            </span>
            <span className="px-3 py-1 bg-red-500/15 text-red-400 rounded-full text-xs font-medium">
              Failed
            </span>
          </div>
        </ComponentExample>

        <ComponentExample title="Avatar - rounded-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-sm font-medium text-foreground">
              JD
            </div>
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center font-medium text-foreground">
              AB
            </div>
            <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-lg font-medium text-foreground">
              CTO
            </div>
          </div>
        </ComponentExample>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground">Individual Corner Control</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-primary/20 border-2 border-primary rounded-tl-2xl">
            <div className="text-sm font-mono text-muted-foreground mb-1">rounded-tl-2xl</div>
            <p className="text-xs text-foreground">Top-left only</p>
          </div>
          <div className="p-6 bg-primary/20 border-2 border-primary rounded-tr-2xl">
            <div className="text-sm font-mono text-muted-foreground mb-1">rounded-tr-2xl</div>
            <p className="text-xs text-foreground">Top-right only</p>
          </div>
          <div className="p-6 bg-primary/20 border-2 border-primary rounded-bl-2xl">
            <div className="text-sm font-mono text-muted-foreground mb-1">rounded-bl-2xl</div>
            <p className="text-xs text-foreground">Bottom-left only</p>
          </div>
          <div className="p-6 bg-primary/20 border-2 border-primary rounded-br-2xl">
            <div className="text-sm font-mono text-muted-foreground mb-1">rounded-br-2xl</div>
            <p className="text-xs text-foreground">Bottom-right only</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const CommonPatterns: Story = {
  render: () => (
    <div className="space-y-6 p-6 bg-background">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-foreground">Common Usage Patterns</h2>
        <p className="text-muted-foreground">Recommended border radius for typical components</p>
      </div>

      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold mb-3 text-foreground">Small Interactive Elements</h3>
          <p className="text-sm text-muted-foreground mb-4">Use rounded-lg (8px) for buttons, inputs, and small cards</p>
          <div className="flex gap-3">
            <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm">Button</button>
            <input
              type="text"
              placeholder="Input"
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold mb-3 text-foreground">Cards & Panels</h3>
          <p className="text-sm text-muted-foreground mb-4">Use rounded-xl (12px) for cards, modals, and panels</p>
          <div className="p-4 bg-muted rounded-xl border border-border">
            <p className="text-sm text-foreground">Card content with rounded-xl borders</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold mb-3 text-foreground">Large Surfaces</h3>
          <p className="text-sm text-muted-foreground mb-4">Use rounded-2xl (16px) for large containers and hero sections</p>
          <div className="p-6 bg-muted rounded-2xl border border-border">
            <h4 className="font-semibold text-foreground mb-2">Hero Section</h4>
            <p className="text-sm text-muted-foreground">Large surface with rounded-2xl borders</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold mb-3 text-foreground">Pills & Badges</h3>
          <p className="text-sm text-muted-foreground mb-4">Use rounded-full for badges, pills, and avatars</p>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-500/15 text-blue-400 rounded-full text-xs font-medium">
              Status Badge
            </span>
            <span className="px-3 py-1 bg-green-500/15 text-green-400 rounded-full text-xs font-medium">
              Active
            </span>
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-xs font-medium">
              AB
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const MixedRadius: Story = {
  render: () => (
    <div className="space-y-6 p-6 bg-background">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-foreground">Mixed Radius Patterns</h2>
        <p className="text-muted-foreground">Combining different radii for visual hierarchy</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-base font-semibold mb-4 text-foreground">Card with Header</h3>
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-muted border-b border-border">
            <h4 className="font-medium text-foreground">Card Header</h4>
          </div>
          <div className="p-4 bg-background">
            <p className="text-sm text-muted-foreground">
              Header has square corners (internal), but card has rounded-xl
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-base font-semibold mb-4 text-foreground">Nested Elements</h3>
        <div className="p-4 bg-muted rounded-xl border border-border">
          <div className="p-3 bg-background rounded-lg border border-border mb-3">
            <p className="text-sm text-foreground">Inner element with rounded-lg</p>
          </div>
          <div className="p-3 bg-background rounded-lg border border-border">
            <p className="text-sm text-foreground">Another nested element</p>
          </div>
        </div>
      </div>
    </div>
  ),
};
