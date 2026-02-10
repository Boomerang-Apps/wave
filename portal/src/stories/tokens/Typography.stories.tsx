import type { Meta, StoryObj } from '@storybook/react';

/**
 * # Typography
 *
 * WAVE uses two font families: Inter for UI and JetBrains Mono for code.
 * Typography is designed for high readability in developer tools.
 *
 * ## Font Stack
 * - **Sans-serif**: Inter, system-ui
 * - **Monospace**: JetBrains Mono, monospace
 */

const TypeScale = ({
  label,
  className,
  sample = 'The quick brown fox jumps over the lazy dog'
}: {
  label: string;
  className: string;
  sample?: string;
}) => (
  <div className="mb-6 pb-6 border-b border-border last:border-0">
    <div className="flex items-baseline justify-between mb-2">
      <span className="text-sm text-muted-foreground font-mono">{label}</span>
      <span className="text-xs text-muted-foreground">{className}</span>
    </div>
    <div className={className}>{sample}</div>
  </div>
);

const meta: Meta = {
  title: 'Design System/Tokens/Typography',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Typography system for the WAVE portal. Uses Inter for UI text and JetBrains Mono for code.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllTypography: Story = {
  render: () => (
    <div className="space-y-8 p-6 bg-background">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-foreground">Typography System</h2>
        <p className="text-muted-foreground">Complete type scale and font weights</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground">Display & Headings</h3>
        <TypeScale label="text-4xl" className="text-4xl font-bold text-foreground" />
        <TypeScale label="text-3xl" className="text-3xl font-bold text-foreground" />
        <TypeScale label="text-2xl" className="text-2xl font-bold text-foreground" />
        <TypeScale label="text-xl" className="text-xl font-semibold text-foreground" />
        <TypeScale label="text-lg" className="text-lg font-semibold text-foreground" />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground">Body Text</h3>
        <TypeScale label="text-base" className="text-base text-foreground" />
        <TypeScale label="text-sm" className="text-sm text-foreground" />
        <TypeScale label="text-xs" className="text-xs text-foreground" />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground">Font Weights</h3>
        <TypeScale label="font-normal (400)" className="text-base font-normal text-foreground" />
        <TypeScale label="font-medium (500)" className="text-base font-medium text-foreground" />
        <TypeScale label="font-semibold (600)" className="text-base font-semibold text-foreground" />
        <TypeScale label="font-bold (700)" className="text-base font-bold text-foreground" />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground">Monospace (Code)</h3>
        <TypeScale
          label="font-mono text-base"
          className="text-base font-mono text-foreground"
          sample="const greeting = 'Hello World';"
        />
        <TypeScale
          label="font-mono text-sm"
          className="text-sm font-mono text-foreground"
          sample="function executeStory(id: string) { ... }"
        />
        <TypeScale
          label="font-mono text-xs"
          className="text-xs font-mono text-foreground"
          sample="/wave-status && /gate-0 && /branch create"
        />
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground">Text Colors</h3>
        <div className="space-y-4">
          <div>
            <span className="text-sm text-muted-foreground font-mono mb-2 block">text-foreground</span>
            <p className="text-foreground">Primary text color for main content</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground font-mono mb-2 block">text-muted-foreground</span>
            <p className="text-muted-foreground">Secondary text for labels and descriptions</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground font-mono mb-2 block">text-primary</span>
            <p className="text-primary">Emphasized text and primary actions</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const FontFamilies: Story = {
  render: () => (
    <div className="space-y-6 p-6 bg-background">
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Inter (Sans-serif)</h3>
        <p className="text-base mb-2 text-foreground">
          The primary UI typeface. Clean, highly legible at small sizes, and designed for screens.
        </p>
        <p className="text-sm text-muted-foreground">
          Font stack: Inter, system-ui, -apple-system, sans-serif
        </p>
        <div className="mt-4 flex gap-4">
          <span className="text-base font-normal">Regular</span>
          <span className="text-base font-medium">Medium</span>
          <span className="text-base font-semibold">Semibold</span>
          <span className="text-base font-bold">Bold</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground font-sans">JetBrains Mono (Monospace)</h3>
        <p className="text-base mb-2 text-foreground font-sans">
          Used for all code-related content. Optimized for readability in dense code blocks and terminal output.
        </p>
        <p className="text-sm text-muted-foreground font-sans">
          Font stack: "JetBrains Mono", "Fira Code", "Cascadia Code", monospace
        </p>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <code className="font-mono text-sm text-foreground block">
            const wave = &#123;<br />
            &nbsp;&nbsp;status: 'active',<br />
            &nbsp;&nbsp;gates: [0, 1, 2, 3, 4, 5, 6, 7],<br />
            &nbsp;&nbsp;agents: ['FE-Dev', 'BE-Dev', 'QA']<br />
            &#125;;
          </code>
        </div>
      </div>
    </div>
  ),
};

export const TextSamples: Story = {
  render: () => (
    <div className="space-y-6 p-6 bg-background max-w-3xl">
      <div className="bg-card border border-border rounded-xl p-6">
        <h1 className="text-3xl font-bold mb-4 text-foreground">
          WAVE Architecture Overview
        </h1>
        <p className="text-base text-foreground mb-4">
          WAVE (Workflow Automation & Validation Engine) is an Air Traffic Controller for AI agents.
          It orchestrates 7 autonomous agents through 8 gates with aerospace-grade safety protocols.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          The system uses Docker containers, Git worktree isolation, and signal-based coordination
          to enable parallel development across multiple agents without conflicts.
        </p>
        <div className="bg-muted p-4 rounded-lg">
          <code className="text-sm font-mono text-foreground">
            /wave-status && /gate-0 story WAVE-P1-001 && /branch create
          </code>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-3 text-foreground">Key Features</h2>
        <ul className="space-y-2">
          <li className="text-base text-foreground">
            <span className="font-semibold">8-Gate Protocol:</span>{' '}
            <span className="text-muted-foreground">Sequential quality gates (0-7)</span>
          </li>
          <li className="text-base text-foreground">
            <span className="font-semibold">7 Specialized Agents:</span>{' '}
            <span className="text-muted-foreground">CTO, PM, FE-Dev, BE-Dev, QA, Dev-Fix</span>
          </li>
          <li className="text-base text-foreground">
            <span className="font-semibold">Domain Isolation:</span>{' '}
            <span className="text-muted-foreground">Prevents cross-domain conflicts</span>
          </li>
        </ul>
      </div>
    </div>
  ),
};

export const LineHeights: Story = {
  render: () => (
    <div className="space-y-6 p-6 bg-background">
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Line Height Scale</h3>
        <div className="space-y-6">
          <div>
            <span className="text-sm text-muted-foreground font-mono mb-2 block">leading-tight (1.25)</span>
            <p className="text-base leading-tight text-foreground">
              Tight line height for headings and short text blocks. This is typically used for
              titles and UI labels where space is limited and readability is still maintained.
            </p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground font-mono mb-2 block">leading-normal (1.5)</span>
            <p className="text-base leading-normal text-foreground">
              Normal line height for body text. This provides comfortable reading for longer
              paragraphs and is the default for most content. It balances readability with
              efficient use of vertical space.
            </p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground font-mono mb-2 block">leading-relaxed (1.625)</span>
            <p className="text-base leading-relaxed text-foreground">
              Relaxed line height for improved readability in long-form content. This is useful
              for documentation, blog posts, and other content where reader comfort is prioritized
              over space efficiency.
            </p>
          </div>
        </div>
      </div>
    </div>
  ),
};
