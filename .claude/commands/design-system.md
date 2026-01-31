# Design System: Create or Validate Design System

Create, validate, or sync design system / component library.

## Arguments
- `$ARGUMENTS` - Action: "init", "validate", "sync", "storybook"

## Purpose
Manage design system tokens, components, and Storybook documentation.

## Actions

### `init` - Initialize Design System
Create design system structure from mockups or configuration.

### `validate` - Validate Design System
Check components match design tokens and patterns.

### `sync` - Sync with Mockups
Update design system from mockup/prototype files.

### `storybook` - Generate/Update Storybook
Create or update Storybook stories for components.

## Design System Structure

```
design-system/
├── tokens/
│   ├── colors.json          # Color palette
│   ├── typography.json      # Font families, sizes, weights
│   ├── spacing.json         # Spacing scale
│   ├── breakpoints.json     # Responsive breakpoints
│   └── shadows.json         # Shadow definitions
│
├── components/
│   ├── primitives/          # Base components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Text/
│   │   └── ...
│   │
│   └── patterns/            # Composite components
│       ├── Form/
│       ├── Card/
│       ├── Modal/
│       └── ...
│
├── stories/                 # Storybook stories
│   ├── Button.stories.tsx
│   ├── Input.stories.tsx
│   └── ...
│
└── docs/
    ├── README.md
    ├── tokens.md
    └── components.md
```

## Token Schema

```json
{
  "colors": {
    "primary": {
      "50": "#f0f9ff",
      "500": "#3b82f6",
      "900": "#1e3a8a"
    },
    "semantic": {
      "success": "#22c55e",
      "error": "#ef4444",
      "warning": "#f59e0b"
    }
  },
  "typography": {
    "fontFamilies": {
      "heading": "Rubik, sans-serif",
      "body": "Heebo, sans-serif"
    },
    "fontSizes": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.125rem"
    }
  },
  "spacing": {
    "0": "0",
    "1": "0.25rem",
    "2": "0.5rem",
    "4": "1rem",
    "8": "2rem"
  }
}
```

## Validation Checks

### Token Validation
```
□ All colors have accessible contrast ratios
□ Typography scale is consistent
□ Spacing follows mathematical progression
□ Breakpoints cover mobile/tablet/desktop
```

### Component Validation
```
□ Components use tokens (no hardcoded values)
□ Components are accessible (WCAG 2.1)
□ Components support RTL/LTR
□ Components have proper TypeScript types
□ Components have Storybook stories
```

### Mockup Sync Validation
```
□ All mockup colors exist in tokens
□ All mockup fonts exist in typography
□ Component variants match mockup states
□ Responsive behavior matches mockup
```

## Storybook Generation

For each component, generate:

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Button',
    variant: 'secondary',
  },
};
```

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  DESIGN SYSTEM: {action}                                                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  TOKEN VALIDATION                                                            ║
║  ────────────────                                                            ║
║  Colors: ✓ 24 colors defined, all accessible                                 ║
║  Typography: ✓ 2 families, 8 sizes                                           ║
║  Spacing: ✓ 12-step scale                                                    ║
║  Breakpoints: ✓ 4 breakpoints (sm, md, lg, xl)                               ║
║                                                                              ║
║  COMPONENT VALIDATION                                                        ║
║  ────────────────────                                                        ║
║  Total Components: 24                                                        ║
║  ├── Primitives: 12 (Button, Input, Text, ...)                               ║
║  └── Patterns: 12 (Form, Card, Modal, ...)                                   ║
║                                                                              ║
║  Component Status:                                                           ║
║  ✓ Button: tokens ✓, a11y ✓, RTL ✓, types ✓, stories ✓                       ║
║  ✓ Input: tokens ✓, a11y ✓, RTL ✓, types ✓, stories ✓                        ║
║  ⚠ Select: tokens ✓, a11y ⚠, RTL ✓, types ✓, stories ✓                       ║
║    └── Warning: Missing keyboard navigation                                  ║
║  ✗ DatePicker: tokens ✓, a11y ✗, RTL ✗, types ✓, stories ✗                   ║
║    └── Issues: No aria-labels, RTL not supported, no stories                 ║
║                                                                              ║
║  MOCKUP SYNC                                                                 ║
║  ──────────                                                                  ║
║  Mockup source: /path/to/mockups/                                            ║
║  ✓ Colors: 100% matched                                                      ║
║  ✓ Typography: 100% matched                                                  ║
║  ⚠ Components: 2 variants missing                                            ║
║    └── Button: ghost variant not implemented                                 ║
║    └── Input: error state styling differs                                    ║
║                                                                              ║
║  STORYBOOK                                                                   ║
║  ─────────                                                                   ║
║  Stories: 48 total                                                           ║
║  Coverage: 22/24 components (92%)                                            ║
║  Missing: DatePicker, TimePicker                                             ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: 92% Complete | 2 issues to resolve                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Integration with Stories

Link design system to story acceptance criteria:

```json
{
  "acceptanceCriteria": [
    {
      "id": "AC1",
      "ears": "WHEN login form renders THEN use design system Button component",
      "designSystemRef": "primitives/Button"
    }
  ]
}
```
