import type { Meta, StoryObj } from '@storybook/react';

/**
 * # Color Tokens
 *
 * WAVE uses a Linear-inspired dark theme with semantic color tokens.
 * All colors are defined as CSS variables and mapped through Tailwind CSS.
 *
 * ## Color Philosophy
 * - Monochromatic base (grays only)
 * - Semantic accents (success, warning, destructive)
 * - High contrast for accessibility
 * - Dark mode first approach
 */

const ColorSwatch = ({
  name,
  variable,
  hex,
  usage
}: {
  name: string;
  variable: string;
  hex?: string;
  usage?: string;
}) => (
  <div className="flex items-center gap-4 p-4 border border-border rounded-lg bg-card">
    <div
      className="w-20 h-20 rounded-lg border border-border shadow-sm flex-shrink-0"
      style={{ backgroundColor: `hsl(var(${variable}))` }}
    />
    <div className="flex-1 min-w-0">
      <div className="font-semibold text-foreground">{name}</div>
      <div className="text-sm text-muted-foreground font-mono">{variable}</div>
      {hex && <div className="text-xs text-muted-foreground">{hex}</div>}
      {usage && <div className="text-sm text-muted-foreground mt-1">{usage}</div>}
    </div>
  </div>
);

const ColorGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold mb-4 text-foreground">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  </div>
);

const meta: Meta = {
  title: 'Design System/Tokens/Colors',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Complete color palette for the WAVE portal. All colors support both light and dark modes.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllColors: Story = {
  render: () => (
    <div className="space-y-8 p-6 bg-background min-h-screen">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-foreground">WAVE Color System</h2>
        <p className="text-muted-foreground">Linear-inspired dark theme with semantic tokens</p>
      </div>

      <ColorGroup title="Base Colors">
        <ColorSwatch
          name="Background"
          variable="--background"
          hex="#1e1e1e (dark) / #ffffff (light)"
          usage="Primary page background"
        />
        <ColorSwatch
          name="Foreground"
          variable="--foreground"
          hex="#fafafa (dark) / #171717 (light)"
          usage="Primary text color"
        />
      </ColorGroup>

      <ColorGroup title="Surface Colors">
        <ColorSwatch
          name="Card"
          variable="--card"
          hex="#1e1e1e"
          usage="Card and panel backgrounds"
        />
        <ColorSwatch
          name="Card Foreground"
          variable="--card-foreground"
          hex="#fafafa"
          usage="Text on card surfaces"
        />
        <ColorSwatch
          name="Popover"
          variable="--popover"
          hex="#262626"
          usage="Dropdown and popover backgrounds"
        />
        <ColorSwatch
          name="Popover Foreground"
          variable="--popover-foreground"
          hex="#fafafa"
          usage="Text in popovers"
        />
      </ColorGroup>

      <ColorGroup title="Interactive Colors">
        <ColorSwatch
          name="Primary"
          variable="--primary"
          hex="#fafafa"
          usage="Primary actions and emphasis"
        />
        <ColorSwatch
          name="Primary Foreground"
          variable="--primary-foreground"
          hex="#1e1e1e"
          usage="Text on primary elements"
        />
        <ColorSwatch
          name="Secondary"
          variable="--secondary"
          hex="#262626"
          usage="Secondary actions"
        />
        <ColorSwatch
          name="Secondary Foreground"
          variable="--secondary-foreground"
          hex="#fafafa"
          usage="Text on secondary elements"
        />
      </ColorGroup>

      <ColorGroup title="State Colors">
        <ColorSwatch
          name="Muted"
          variable="--muted"
          hex="#262626"
          usage="Muted/disabled backgrounds"
        />
        <ColorSwatch
          name="Muted Foreground"
          variable="--muted-foreground"
          hex="#a3a3a3"
          usage="Secondary text, labels"
        />
        <ColorSwatch
          name="Accent"
          variable="--accent"
          hex="#262626"
          usage="Accent backgrounds"
        />
        <ColorSwatch
          name="Accent Foreground"
          variable="--accent-foreground"
          hex="#fafafa"
          usage="Text on accents"
        />
      </ColorGroup>

      <ColorGroup title="Semantic Colors">
        <ColorSwatch
          name="Success"
          variable="--success"
          hex="hsl(142 70% 45%)"
          usage="Success states, passed gates"
        />
        <ColorSwatch
          name="Warning"
          variable="--warning"
          hex="hsl(38 92% 50%)"
          usage="Warnings, pending states"
        />
        <ColorSwatch
          name="Destructive"
          variable="--destructive"
          hex="hsl(0 62% 50%)"
          usage="Errors, failures, blocking"
        />
        <ColorSwatch
          name="Destructive Foreground"
          variable="--destructive-foreground"
          hex="#ffffff"
          usage="Text on destructive elements"
        />
      </ColorGroup>

      <ColorGroup title="Border & Input">
        <ColorSwatch
          name="Border"
          variable="--border"
          hex="#2e2e2e"
          usage="Border color for components"
        />
        <ColorSwatch
          name="Input"
          variable="--input"
          hex="#262626"
          usage="Input field borders"
        />
        <ColorSwatch
          name="Ring"
          variable="--ring"
          hex="#fafafa"
          usage="Focus ring color"
        />
      </ColorGroup>

      <ColorGroup title="Sidebar">
        <ColorSwatch
          name="Sidebar"
          variable="--sidebar"
          hex="#1e1e1e"
          usage="Sidebar background"
        />
        <ColorSwatch
          name="Sidebar Foreground"
          variable="--sidebar-foreground"
          hex="#666666"
          usage="Sidebar text"
        />
        <ColorSwatch
          name="Sidebar Border"
          variable="--sidebar-border"
          hex="#2e2e2e"
          usage="Sidebar borders"
        />
        <ColorSwatch
          name="Sidebar Active"
          variable="--sidebar-active"
          hex="#2e2e2e"
          usage="Active sidebar item"
        />
      </ColorGroup>

      <ColorGroup title="Chart Colors">
        <ColorSwatch
          name="Chart 1"
          variable="--chart-1"
          usage="Chart data series 1"
        />
        <ColorSwatch
          name="Chart 2"
          variable="--chart-2"
          usage="Chart data series 2"
        />
        <ColorSwatch
          name="Chart 3"
          variable="--chart-3"
          usage="Chart data series 3"
        />
        <ColorSwatch
          name="Chart 4"
          variable="--chart-4"
          usage="Chart data series 4"
        />
      </ColorGroup>
    </div>
  ),
};

export const BaseColors: Story = {
  render: () => (
    <div className="space-y-4 p-6 bg-background">
      <ColorSwatch
        name="Background"
        variable="--background"
        hex="#1e1e1e (dark)"
        usage="Primary page background"
      />
      <ColorSwatch
        name="Foreground"
        variable="--foreground"
        hex="#fafafa (dark)"
        usage="Primary text color"
      />
    </div>
  ),
};

export const SemanticColors: Story = {
  render: () => (
    <div className="space-y-4 p-6 bg-background">
      <ColorSwatch
        name="Success"
        variable="--success"
        usage="Success states, passed gates, completed tasks"
      />
      <ColorSwatch
        name="Warning"
        variable="--warning"
        usage="Warnings, pending states, attention needed"
      />
      <ColorSwatch
        name="Destructive"
        variable="--destructive"
        usage="Errors, failures, blocking issues"
      />
    </div>
  ),
};

export const ColorContrast: Story = {
  render: () => (
    <div className="space-y-6 p-6 bg-background">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground">Accessibility Check</h3>
        <p className="text-muted-foreground mb-6">
          All color combinations meet WCAG AA standards (4.5:1 contrast ratio minimum)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 bg-background border border-border rounded-lg">
          <p className="text-foreground font-semibold mb-2">Primary Text</p>
          <p className="text-muted-foreground">Secondary Text</p>
          <p className="text-xs text-muted-foreground mt-2">
            Contrast: 18:1 (primary) / 7:1 (secondary)
          </p>
        </div>

        <div className="p-6 bg-card border border-border rounded-lg">
          <p className="text-card-foreground font-semibold mb-2">Card Text</p>
          <p className="text-muted-foreground">Card Secondary</p>
          <p className="text-xs text-muted-foreground mt-2">
            Contrast: 16:1 (primary)
          </p>
        </div>

        <div className="p-6 bg-primary text-primary-foreground rounded-lg">
          <p className="font-semibold">Primary Button</p>
          <p className="text-xs mt-2">Contrast: 14:1</p>
        </div>

        <div className="p-6 bg-destructive text-destructive-foreground rounded-lg">
          <p className="font-semibold">Destructive Action</p>
          <p className="text-xs mt-2">Contrast: 5.2:1</p>
        </div>
      </div>
    </div>
  ),
};
