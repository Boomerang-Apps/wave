# /design-system - Design System Management

**Tier:** 2 (Workflow Command)
**Priority:** P2 (MEDIUM)
**Recommended Model:** Sonnet
**Aliases:** /ds, /tokens

## Purpose

Comprehensive design system management: detect what's in use, validate consistency, sync to Storybook, and manage tokens/components.

## Usage

```bash
# Detection & Analysis
/design-system detect              # Detect design systems in use
/design-system audit               # Full consistency audit

# Storybook Integration
/design-system sync storybook      # Sync tokens to Storybook theme
/design-system storybook           # Generate component stories

# Token Management
/design-system init                # Initialize design system structure
/design-system validate            # Validate tokens and components
/design-system sync mockups        # Sync from mockup files
```

---

## Action: `detect`

Automatically identify which design systems, UI libraries, and token sources are in use.

### What It Detects

| System | Detection Method |
|--------|------------------|
| **shadcn/ui** | `components.json`, `@/components/ui/*` imports |
| **Tailwind CSS** | `tailwind.config.ts/js`, `@tailwind` directives |
| **CSS Variables** | `:root { --var }` in globals.css |
| **Radix UI** | `@radix-ui/*` in package.json |
| **Headless UI** | `@headlessui/*` in package.json |
| **Chakra UI** | `@chakra-ui/*` in package.json |
| **MUI** | `@mui/*` in package.json |
| **Ant Design** | `antd` in package.json |
| **Storybook** | `.storybook/` directory |

### Output

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  DESIGN SYSTEM DETECTION                            /design-system detect    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  DETECTED SYSTEMS                                                            ║
║  ────────────────                                                            ║
║                                                                              ║
║  1. shadcn/ui                                                    ✓ DETECTED  ║
║     ─────────────────────────────────────────────────────────────────────    ║
║     Config:     components.json                                              ║
║     Style:      new-york                                                     ║
║     Theme:      slate                                                        ║
║     Components: 24 installed                                                 ║
║                                                                              ║
║     Installed Components:                                                    ║
║     ├── Button, Card, Dialog, Input, Label, Select                           ║
║     ├── Checkbox, RadioGroup, Switch, Tabs, Toast                            ║
║     ├── Dropdown, Popover, Tooltip, Avatar, Badge                            ║
║     └── Form, Table, Skeleton, Progress, Separator                           ║
║                                                                              ║
║     Missing Common Components:                                               ║
║     └── DatePicker, Combobox, Command, Calendar                              ║
║                                                                              ║
║  2. Tailwind CSS                                                 ✓ DETECTED  ║
║     ─────────────────────────────────────────────────────────────────────    ║
║     Config:     tailwind.config.ts                                           ║
║     Version:    3.4.0                                                        ║
║     Plugins:    tailwindcss-animate, @tailwindcss/typography                 ║
║                                                                              ║
║     Theme Extensions:                                                        ║
║     ├── Colors:                                                              ║
║     │   ├── background: hsl(var(--background))                               ║
║     │   ├── foreground: hsl(var(--foreground))                               ║
║     │   ├── primary: hsl(var(--primary))                                     ║
║     │   ├── secondary: hsl(var(--secondary))                                 ║
║     │   ├── muted: hsl(var(--muted))                                         ║
║     │   ├── accent: hsl(var(--accent))                                       ║
║     │   └── destructive: hsl(var(--destructive))                             ║
║     │                                                                        ║
║     ├── Border Radius:                                                       ║
║     │   └── lg, md, sm (CSS variable based)                                  ║
║     │                                                                        ║
║     └── Fonts:                                                               ║
║         ├── sans: Heebo, system-ui                                           ║
║         └── heading: Rubik, system-ui                                        ║
║                                                                              ║
║  3. CSS Variables                                                ✓ DETECTED  ║
║     ─────────────────────────────────────────────────────────────────────    ║
║     Source:     src/app/globals.css                                          ║
║     Variables:  32 defined                                                   ║
║                                                                              ║
║     Light Mode (:root):                                                      ║
║     ├── --background: 0 0% 100%                                              ║
║     ├── --foreground: 222.2 84% 4.9%                                         ║
║     ├── --primary: 222.2 47.4% 11.2%                                         ║
║     ├── --primary-foreground: 210 40% 98%                                    ║
║     └── ... (28 more)                                                        ║
║                                                                              ║
║     Dark Mode (.dark):                                                       ║
║     ├── --background: 222.2 84% 4.9%                                         ║
║     ├── --foreground: 210 40% 98%                                            ║
║     └── ... (28 more)                                                        ║
║                                                                              ║
║  4. Storybook                                                    ✓ DETECTED  ║
║     ─────────────────────────────────────────────────────────────────────    ║
║     Config:     .storybook/                                                  ║
║     Version:    8.0.0                                                        ║
║     Framework:  @storybook/nextjs                                            ║
║     Addons:     essentials, themes, a11y                                     ║
║     Stories:    18 files                                                     ║
║                                                                              ║
║     Theme Status:  ⚠ NOT SYNCED                                              ║
║     └── Storybook theme doesn't match Tailwind/shadcn tokens                 ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  SYNC STATUS                                                                 ║
║  ───────────                                                                 ║
║                                                                              ║
║  CSS Variables → Tailwind:    ✓ Synced                                       ║
║  Tailwind → Storybook:        ⚠ Out of sync (run: /design-system sync sb)    ║
║  shadcn → Storybook stories:  ⚠ 75% coverage (18/24 components)              ║
║                                                                              ║
║  RECOMMENDATIONS                                                             ║
║  ───────────────                                                             ║
║  1. Run /design-system sync storybook to sync theme                          ║
║  2. Run /design-system storybook to generate missing stories                 ║
║  3. Consider adding: DatePicker, Calendar for date handling                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Action: `sync storybook`

Sync design tokens from Tailwind/CSS variables to Storybook theme and generate token documentation.

### What It Does

1. **Updates Storybook config** to use project's design tokens
2. **Creates theme file** mapping CSS variables to Storybook
3. **Generates token stories** documenting colors, typography, spacing
4. **Adds dark mode support** with theme switcher

### Output

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  STORYBOOK SYNC                               /design-system sync storybook  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  DETECTED SOURCE                                                             ║
║  ───────────────                                                             ║
║  Primary:    Tailwind CSS (tailwind.config.ts)                               ║
║  Variables:  CSS Variables (globals.css)                                     ║
║  Library:    shadcn/ui (slate theme)                                         ║
║                                                                              ║
║  ACTIONS PERFORMED                                                           ║
║  ─────────────────                                                           ║
║                                                                              ║
║  1. Updated .storybook/preview.tsx                                           ║
║     ├── Added: import '../src/app/globals.css'                               ║
║     ├── Added: Dark mode decorator                                           ║
║     ├── Added: RTL support decorator                                         ║
║     └── Added: Tailwind class support                                        ║
║                                                                              ║
║  2. Created .storybook/theme.ts                                              ║
║     ├── Extracted 32 CSS variables                                           ║
║     ├── Mapped to Storybook theme API                                        ║
║     └── Light/dark mode variants                                             ║
║                                                                              ║
║  3. Updated .storybook/main.ts                                               ║
║     ├── Added: @storybook/addon-themes                                       ║
║     ├── Added: @storybook/addon-a11y                                         ║
║     └── Configured: postcss for Tailwind                                     ║
║                                                                              ║
║  4. Created Token Documentation Stories                                      ║
║     ├── stories/tokens/Colors.stories.tsx                                    ║
║     │   └── All color tokens with swatches                                   ║
║     ├── stories/tokens/Typography.stories.tsx                                ║
║     │   └── Font families, sizes, weights                                    ║
║     ├── stories/tokens/Spacing.stories.tsx                                   ║
║     │   └── Spacing scale visualization                                      ║
║     ├── stories/tokens/Shadows.stories.tsx                                   ║
║     │   └── Shadow tokens with examples                                      ║
║     └── stories/tokens/BorderRadius.stories.tsx                              ║
║         └── Border radius scale                                              ║
║                                                                              ║
║  5. Created Component Index                                                  ║
║     └── stories/ComponentIndex.stories.tsx                                   ║
║         └── Overview of all shadcn/ui components                             ║
║                                                                              ║
║  FILES MODIFIED/CREATED                                                      ║
║  ──────────────────────                                                      ║
║  ✓ .storybook/preview.tsx (modified)                                         ║
║  ✓ .storybook/theme.ts (created)                                             ║
║  ✓ .storybook/main.ts (modified)                                             ║
║  ✓ stories/tokens/Colors.stories.tsx (created)                               ║
║  ✓ stories/tokens/Typography.stories.tsx (created)                           ║
║  ✓ stories/tokens/Spacing.stories.tsx (created)                              ║
║  ✓ stories/tokens/Shadows.stories.tsx (created)                              ║
║  ✓ stories/tokens/BorderRadius.stories.tsx (created)                         ║
║  ✓ stories/ComponentIndex.stories.tsx (created)                              ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: ✓ Storybook synced with design system                               ║
║                                                                              ║
║  Start Storybook:  pnpm storybook                                            ║
║  View tokens:      http://localhost:6006/?path=/docs/tokens-colors           ║
║  Dark mode:        Toggle in Storybook toolbar                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Generated Files

#### `.storybook/preview.tsx`
```typescript
import type { Preview } from '@storybook/react';
import '../src/app/globals.css';
import { withThemeByClassName } from '@storybook/addon-themes';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
};

export default preview;
```

#### `stories/tokens/Colors.stories.tsx`
```typescript
import type { Meta, StoryObj } from '@storybook/react';

const ColorSwatch = ({ name, variable }: { name: string; variable: string }) => (
  <div className="flex items-center gap-4 p-2">
    <div
      className="w-16 h-16 rounded-lg border"
      style={{ backgroundColor: `hsl(var(${variable}))` }}
    />
    <div>
      <div className="font-medium">{name}</div>
      <div className="text-sm text-muted-foreground">{variable}</div>
    </div>
  </div>
);

const meta: Meta = {
  title: 'Tokens/Colors',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const AllColors: StoryObj = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <ColorSwatch name="Background" variable="--background" />
      <ColorSwatch name="Foreground" variable="--foreground" />
      <ColorSwatch name="Primary" variable="--primary" />
      <ColorSwatch name="Secondary" variable="--secondary" />
      <ColorSwatch name="Muted" variable="--muted" />
      <ColorSwatch name="Accent" variable="--accent" />
      <ColorSwatch name="Destructive" variable="--destructive" />
      {/* ... more colors */}
    </div>
  ),
};
```

---

## Action: `audit`

Full consistency audit across all design system sources.

### What It Checks

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  DESIGN SYSTEM AUDIT                              /design-system audit       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  1. TOKEN CONSISTENCY                                                        ║
║  ────────────────────                                                        ║
║                                                                              ║
║  CSS Variables ↔ Tailwind Config                                             ║
║  ├── --primary         ✓ Mapped to theme.colors.primary                      ║
║  ├── --secondary       ✓ Mapped to theme.colors.secondary                    ║
║  ├── --custom-blue     ✗ NOT in Tailwind config                              ║
║  └── border-radius-xl  ✗ CSS var missing, only in Tailwind                   ║
║                                                                              ║
║  2. COMPONENT TOKEN USAGE                                                    ║
║  ────────────────────────                                                    ║
║                                                                              ║
║  Hardcoded Values Found (should use tokens):                                 ║
║  ├── src/components/ui/Button.tsx:42                                         ║
║  │   └── color: "#3b82f6" → should be: text-primary                          ║
║  ├── src/components/ui/Card.tsx:18                                           ║
║  │   └── padding: "16px" → should be: p-4                                    ║
║  └── src/features/auth/LoginForm.tsx:67                                      ║
║      └── border-radius: "8px" → should be: rounded-lg                        ║
║                                                                              ║
║  3. STORYBOOK COVERAGE                                                       ║
║  ─────────────────────                                                       ║
║                                                                              ║
║  shadcn/ui Components:     18/24 (75%) have stories                          ║
║  Custom Components:        4/12 (33%) have stories                           ║
║  Token Documentation:      ✗ No token stories                                ║
║                                                                              ║
║  Missing Stories:                                                            ║
║  ├── shadcn: DatePicker, Calendar, Combobox, Command, Menubar, Sheet         ║
║  └── custom: LoginForm, RegisterForm, ProfileCard, SearchBar, ...            ║
║                                                                              ║
║  4. ACCESSIBILITY                                                            ║
║  ───────────────                                                             ║
║                                                                              ║
║  Color Contrast (WCAG AA):                                                   ║
║  ├── primary on background:      ✓ 12.5:1                                    ║
║  ├── secondary on background:    ✓ 8.2:1                                     ║
║  ├── muted on background:        ⚠ 3.8:1 (minimum 4.5:1)                     ║
║  └── destructive on background:  ✓ 5.1:1                                     ║
║                                                                              ║
║  5. DARK MODE                                                                ║
║  ───────────                                                                 ║
║                                                                              ║
║  CSS Variables:  ✓ .dark class defined with 32 overrides                     ║
║  Tailwind:       ✓ darkMode: 'class' configured                              ║
║  Components:     ⚠ 3 components don't support dark mode                      ║
║    └── CustomBadge, LegacyAlert, OldTooltip                                  ║
║                                                                              ║
║  6. RTL SUPPORT                                                              ║
║  ─────────────                                                               ║
║                                                                              ║
║  Direction-aware utilities:  ✓ Using start/end instead of left/right         ║
║  Components with RTL issues: 2                                               ║
║    └── Sidebar (fixed left position)                                         ║
║    └── Toast (animation direction)                                           ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  AUDIT SUMMARY                                                               ║
║  ─────────────                                                               ║
║                                                                              ║
║  ✓ Passed:     8 checks                                                      ║
║  ⚠ Warnings:   4 issues                                                      ║
║  ✗ Failed:     3 issues                                                      ║
║                                                                              ║
║  Priority Fixes:                                                             ║
║  1. Add missing CSS variable to Tailwind: --custom-blue                      ║
║  2. Replace 3 hardcoded values with tokens                                   ║
║  3. Fix muted color contrast (increase to 4.5:1)                             ║
║                                                                              ║
║  Run: /design-system sync storybook    (sync tokens)                         ║
║  Run: /design-system storybook         (generate missing stories)            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Action: `storybook`

Generate Storybook stories for components.

### Usage

```bash
/design-system storybook                    # Generate for all components
/design-system storybook Button Input       # Specific components
/design-system storybook --missing          # Only missing stories
```

### Generated Story Template

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Primary button component from shadcn/ui',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'Button style variant',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Button size',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
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

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
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
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
```

---

## Action: `init`

Initialize design system structure.

```bash
/design-system init                    # Full initialization
/design-system init --shadcn           # Initialize with shadcn/ui
/design-system init --from-figma       # Extract from Figma (requires MCP)
```

---

## Action: `validate`

Validate design tokens and components.

```bash
/design-system validate                # Full validation
/design-system validate tokens         # Only token validation
/design-system validate components     # Only component validation
/design-system validate a11y           # Accessibility check
```

---

## Signal File

```json
// .claude/signals/design-system-{action}-{timestamp}.json
{
  "command": "/design-system detect",
  "timestamp": "2026-02-01T14:00:00Z",
  "detected": {
    "shadcn": {
      "installed": true,
      "version": "0.8.0",
      "components": 24,
      "theme": "slate",
      "style": "new-york"
    },
    "tailwind": {
      "installed": true,
      "version": "3.4.0",
      "customColors": 7,
      "plugins": ["animate", "typography"]
    },
    "storybook": {
      "installed": true,
      "version": "8.0.0",
      "stories": 18,
      "synced": false
    }
  },
  "recommendations": [
    "sync-storybook",
    "add-missing-stories",
    "fix-contrast-issues"
  ]
}
```

---

## Integration

### With /ui-trace
```bash
# ui-trace uses design-system detect results
/ui-trace
# Shows: "Design System: shadcn/ui (24 components)"
```

### With /preflight
```bash
# Preflight checks design system sync status
/preflight
# Warning: Storybook not synced with design tokens
```

### With AI Stories
```json
{
  "acceptanceCriteria": [{
    "id": "AC1",
    "ears": "WHEN form renders THEN use shadcn Button component",
    "designSystemRef": "shadcn/Button"
  }]
}
```

---

## Quick Reference

```bash
# Detection & Analysis
/design-system detect              # What design systems are in use?
/design-system audit               # Full consistency audit

# Storybook
/design-system sync storybook      # Sync tokens to Storybook
/design-system storybook           # Generate component stories
/design-system storybook --missing # Only generate missing stories

# Validation
/design-system validate            # Full validation
/design-system validate a11y       # Accessibility only
/design-system validate tokens     # Token consistency only

# Aliases
/ds detect                         # Short form
/ds sync sb                        # Sync to Storybook
/ds audit                          # Run audit
```
