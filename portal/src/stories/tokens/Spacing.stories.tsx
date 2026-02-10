import type { Meta, StoryObj } from '@storybook/react';

/**
 * # Spacing
 *
 * WAVE uses Tailwind's default spacing scale based on rem units.
 * The scale provides consistent spacing across the application.
 *
 * ## Base Unit
 * - 1 unit = 0.25rem = 4px
 * - Scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64
 */

const SpacingBox = ({ size, label }: { size: string; label: string }) => (
  <div className="flex items-center gap-4 mb-4">
    <div className="w-24 text-sm text-muted-foreground font-mono">{label}</div>
    <div
      className="bg-primary h-8"
      style={{ width: `${size}rem` }}
    />
    <div className="text-xs text-muted-foreground">{size}rem ({parseFloat(size) * 16}px)</div>
  </div>
);

const PaddingExample = ({ size, label }: { size: string; label: string }) => (
  <div className="mb-4">
    <div className="text-sm text-muted-foreground font-mono mb-2">{label}</div>
    <div className={`${size} bg-muted border border-border inline-block`}>
      <div className="bg-primary/20 text-foreground text-sm">Content</div>
    </div>
  </div>
);

const GapExample = ({ size, label }: { size: string; label: string }) => (
  <div className="mb-6">
    <div className="text-sm text-muted-foreground font-mono mb-2">{label}</div>
    <div className={`flex ${size}`}>
      <div className="w-16 h-16 bg-primary/20 border border-border" />
      <div className="w-16 h-16 bg-primary/20 border border-border" />
      <div className="w-16 h-16 bg-primary/20 border border-border" />
    </div>
  </div>
);

const meta: Meta = {
  title: 'Design System/Tokens/Spacing',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Spacing scale for margins, padding, and gaps. Based on a 4px base unit.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllSpacing: Story = {
  render: () => (
    <div className="space-y-8 p-6 bg-background">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-foreground">Spacing Scale</h2>
        <p className="text-muted-foreground">Base unit: 1 = 0.25rem = 4px</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground">Scale Visualization</h3>
        <SpacingBox size="0.25" label="1 (0.25rem)" />
        <SpacingBox size="0.5" label="2 (0.5rem)" />
        <SpacingBox size="0.75" label="3 (0.75rem)" />
        <SpacingBox size="1" label="4 (1rem)" />
        <SpacingBox size="1.25" label="5 (1.25rem)" />
        <SpacingBox size="1.5" label="6 (1.5rem)" />
        <SpacingBox size="2" label="8 (2rem)" />
        <SpacingBox size="2.5" label="10 (2.5rem)" />
        <SpacingBox size="3" label="12 (3rem)" />
        <SpacingBox size="4" label="16 (4rem)" />
        <SpacingBox size="5" label="20 (5rem)" />
        <SpacingBox size="6" label="24 (6rem)" />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground">Padding Examples</h3>
        <PaddingExample size="p-1" label="p-1 (4px)" />
        <PaddingExample size="p-2" label="p-2 (8px)" />
        <PaddingExample size="p-3" label="p-3 (12px)" />
        <PaddingExample size="p-4" label="p-4 (16px)" />
        <PaddingExample size="p-6" label="p-6 (24px)" />
        <PaddingExample size="p-8" label="p-8 (32px)" />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground">Gap Examples (Flexbox/Grid)</h3>
        <GapExample size="gap-1" label="gap-1 (4px)" />
        <GapExample size="gap-2" label="gap-2 (8px)" />
        <GapExample size="gap-3" label="gap-3 (12px)" />
        <GapExample size="gap-4" label="gap-4 (16px)" />
        <GapExample size="gap-6" label="gap-6 (24px)" />
      </div>
    </div>
  ),
};

export const CommonPatterns: Story = {
  render: () => (
    <div className="space-y-6 p-6 bg-background">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-foreground">Common Spacing Patterns</h2>
        <p className="text-muted-foreground">Recommended spacing for typical UI patterns</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Card Padding</h3>
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4 border border-border">
            <div className="text-sm font-mono text-muted-foreground mb-1">p-4 (16px) - Default</div>
            <p className="text-foreground">Standard card padding for most use cases</p>
          </div>
          <div className="bg-muted rounded-lg p-6 border border-border">
            <div className="text-sm font-mono text-muted-foreground mb-1">p-6 (24px) - Spacious</div>
            <p className="text-foreground">Larger padding for important or prominent cards</p>
          </div>
          <div className="bg-muted rounded-lg p-8 border border-border">
            <div className="text-sm font-mono text-muted-foreground mb-1">p-8 (32px) - Hero</div>
            <p className="text-foreground">Extra padding for hero sections or feature cards</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Stack Spacing</h3>
        <div className="space-y-2 bg-muted p-4 rounded-lg border border-border">
          <div className="text-sm font-mono text-muted-foreground mb-2">space-y-2 (8px)</div>
          <div className="bg-background p-2 rounded text-foreground text-sm">Item 1</div>
          <div className="bg-background p-2 rounded text-foreground text-sm">Item 2</div>
          <div className="bg-background p-2 rounded text-foreground text-sm">Item 3</div>
        </div>

        <div className="space-y-4 bg-muted p-4 rounded-lg border border-border mt-4">
          <div className="text-sm font-mono text-muted-foreground mb-2">space-y-4 (16px)</div>
          <div className="bg-background p-3 rounded text-foreground">Item 1</div>
          <div className="bg-background p-3 rounded text-foreground">Item 2</div>
          <div className="bg-background p-3 rounded text-foreground">Item 3</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Component Spacing</h3>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg border border-border">
            <div className="text-sm font-mono text-muted-foreground mb-3">Button Group - gap-2</div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Save</button>
              <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm">Cancel</button>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg border border-border">
            <div className="text-sm font-mono text-muted-foreground mb-3">Form Fields - space-y-3</div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Username</label>
                <input type="text" className="w-full px-3 py-2 bg-background border border-border rounded-lg" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                <input type="email" className="w-full px-3 py-2 bg-background border border-border rounded-lg" />
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg border border-border">
            <div className="text-sm font-mono text-muted-foreground mb-3">Section Spacing - mb-8</div>
            <div className="space-y-8">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Section 1</h4>
                <p className="text-muted-foreground text-sm">Content for section 1</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Section 2</h4>
                <p className="text-muted-foreground text-sm">Content for section 2</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const ResponsiveSpacing: Story = {
  render: () => (
    <div className="space-y-6 p-6 bg-background">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-foreground">Responsive Spacing</h2>
        <p className="text-muted-foreground">Spacing adapts to screen size using Tailwind breakpoints</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 md:p-6 lg:p-8">
        <div className="text-sm font-mono text-muted-foreground mb-4">
          p-4 md:p-6 lg:p-8
        </div>
        <p className="text-foreground">
          This card has responsive padding:
        </p>
        <ul className="text-muted-foreground text-sm mt-2 space-y-1">
          <li>• Mobile: 16px (p-4)</li>
          <li>• Tablet: 24px (md:p-6)</li>
          <li>• Desktop: 32px (lg:p-8)</li>
        </ul>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="text-sm font-mono text-muted-foreground mb-4">
          grid gap-2 md:gap-4 lg:gap-6
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-4 lg:gap-6">
          <div className="aspect-square bg-primary/20 rounded-lg flex items-center justify-center text-xs text-foreground">1</div>
          <div className="aspect-square bg-primary/20 rounded-lg flex items-center justify-center text-xs text-foreground">2</div>
          <div className="aspect-square bg-primary/20 rounded-lg flex items-center justify-center text-xs text-foreground">3</div>
        </div>
        <p className="text-muted-foreground text-sm mt-4">
          Grid gap increases on larger screens: 8px → 16px → 24px
        </p>
      </div>
    </div>
  ),
};
