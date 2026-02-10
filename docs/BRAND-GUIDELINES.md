# WAVE Brand Guidelines

> Autonomous Execution, Verified Results

---

## Table of Contents

1. [Brand Identity](#brand-identity)
2. [Design Principles](#design-principles)
3. [Voice & Tone](#voice--tone)
4. [Logo Usage](#logo-usage)
5. [Color System](#color-system)
6. [Typography](#typography)
7. [Iconography](#iconography)
8. [Layout & Spacing](#layout--spacing)
9. [Component Patterns](#component-patterns)
10. [Accessibility](#accessibility)

---

## Brand Identity

**Name:** WAVE (Workflow Automation for Verified Execution)

**Tagline:** Autonomous Execution, Verified Results

**Mission:** WAVE is a project-agnostic multi-agent orchestration framework that coordinates AI development agents through Docker containers, Git worktree isolation, and signal-based quality gates.

**Positioning:** The operating system for AI-powered software development teams.

WAVE does not target a single language, framework, or team structure. It is infrastructure-level tooling that sits between the human decision-maker and the autonomous agents executing software development work. Every brand decision reflects this: technical, precise, and built for sustained professional use.

---

## Design Principles

### 1. Dark-First

WAVE uses a monochromatic dark theme as the default. The aesthetic follows the "Devin-style" approach: high-contrast text on near-black backgrounds, designed for extended coding sessions under any lighting condition. A light mode is available for accessibility and user preference, but dark mode is the canonical presentation.

### 2. Data-Dense

Dashboard layouts maximize information density. Every pixel earns its place. WAVE users are developers and engineering leads who need gate statuses, agent progress, build logs, and merge queues visible at a glance. Whitespace is used for grouping and hierarchy, never for decoration.

### 3. Monochromatic with Semantic Accents

The interface is built on a grayscale foundation. The only chromatic colors in the system are semantic status indicators: green for success, amber for warnings and in-progress states, and red for failures and errors. No blue, no purple, no brand gradients. Color means something or it is not used.

### 4. Developer-Native

WAVE speaks the language of its users. Monospace code rendering, keyboard-first navigation, terminal-like interaction patterns, and technical terminology used without apology. The interface feels like a tool, not a product landing page.

---

## Voice & Tone

WAVE communicates in English only. All UI text, documentation, logs, and notifications use a single language direction: left-to-right (LTR).

### Characteristics

- **Technical and precise.** Use exact terminology. Say "Git worktree" not "code workspace." Say "Docker container" not "isolated environment."
- **Concise, no fluff.** Developers hate marketing speak. Every word in the UI should carry information. If a label can be one word, it should be one word.
- **Action-oriented.** Prefer verbs that map to real operations: "Run", "Deploy", "Approve", "Merge", "Stop", "Retry."
- **Status-focused.** Communicate state clearly using unambiguous pass/fail/pending language. "Gate 3: Passed" not "Gate 3 looks good."
- **Technical terminology used freely.** Git, Docker, CI/CD, gates, worktrees, signals, orchestration. The audience knows these terms. Do not simplify them.

### Examples

| Instead of | Use |
|---|---|
| "Your project is being worked on" | "Agent BE-Dev executing story WAVE-P2-001" |
| "Something went wrong" | "Gate 2 failed: build error in portal/src/App.tsx:42" |
| "Great job!" | "All gates passed. Ready for merge." |
| "Click here to start" | "Run wave" |

---

## Logo Usage

> Logo design is TBD. The following rules apply once a logo is finalized.

### Clear Space

Maintain a minimum clear space of 1x the logo height on all sides. No other elements, text, or visual noise should enter this boundary.

### Do Not

- Stretch, compress, or distort the logo proportions.
- Rotate the logo to any angle.
- Apply drop shadows, glows, outlines, or other effects.
- Place the logo on backgrounds where it does not meet minimum contrast requirements.
- Recreate or approximate the logo using similar shapes or fonts.

---

## Color System

WAVE uses HSL-based color definitions. The system supports both dark mode (default) and light mode. All values below are specified as HSL.

### Dark Mode (Default)

| Token | HSL Value | Hex | Usage |
|---|---|---|---|
| `--background` | `hsl(0 0% 4%)` | #0a0a0a | Page background |
| `--foreground` | `hsl(0 0% 95%)` | #f2f2f2 | Primary text |
| `--card` | `hsl(0 0% 12%)` | #1e1e1e | Card surfaces |
| `--popover` | `hsl(0 0% 8%)` | #141414 | Popover/dropdown surfaces |
| `--primary` | `hsl(0 0% 95%)` | #f2f2f2 | Primary actions, emphasis |
| `--primary-foreground` | `hsl(0 0% 4%)` | #0a0a0a | Text on primary surfaces |
| `--secondary` | `hsl(0 0% 10%)` | #1a1a1a | Secondary surfaces |
| `--muted` | `hsl(0 0% 12%)` | #1f1f1f | Muted/disabled backgrounds |
| `--muted-foreground` | `hsl(0 0% 60%)` | — | Muted/secondary text |
| `--border` | `hsl(0 0% 16%)` | #292929 | Borders, dividers |
| `--input` | `hsl(0 0% 16%)` | #292929 | Input field borders |
| `--sidebar` | `hsl(0 0% 5%)` | #0d0d0d | Sidebar background |
| `--destructive` | `hsl(0 62% 50%)` | — | Errors, failures, blocking |
| `--success` | `hsl(142 70% 45%)` | — | Passed gates, completed tasks |
| `--warning` | `hsl(38 92% 50%)` | — | Pending, in-progress, attention needed |

### Light Mode

| Token | HSL Value | Hex | Usage |
|---|---|---|---|
| `--background` | `hsl(0 0% 100%)` | #ffffff | Page background |
| `--foreground` | `hsl(0 0% 9%)` | — | Primary text |
| `--card` | `hsl(0 0% 100%)` | #ffffff | Card surfaces |
| `--popover` | `hsl(0 0% 100%)` | #ffffff | Popover/dropdown surfaces |
| `--primary` | `hsl(0 0% 9%)` | — | Primary actions, emphasis |
| `--primary-foreground` | `hsl(0 0% 100%)` | #ffffff | Text on primary surfaces |
| `--secondary` | `hsl(0 0% 96%)` | — | Secondary surfaces |
| `--muted` | `hsl(0 0% 96%)` | — | Muted/disabled backgrounds |
| `--border` | `hsl(0 0% 90%)` | — | Borders, dividers |
| `--input` | `hsl(0 0% 90%)` | — | Input field borders |
| `--destructive` | `hsl(0 84% 60%)` | — | Errors, failures, blocking |
| `--success` | `hsl(142 76% 36%)` | — | Passed gates, completed tasks |
| `--warning` | `hsl(38 92% 50%)` | — | Pending, in-progress, attention needed |

### Usage Rules

- **Dark mode is the default.** Light mode exists for accessibility and user preference.
- **Status colors are the ONLY chromatic colors.** Green, amber, and red. No blue, purple, teal, or any other hue appears in the interface.
- **Success green** indicates passed gates, completed tasks, and healthy states.
- **Warning amber** indicates pending operations, in-progress work, and items that need attention.
- **Destructive red** indicates failures, errors, and blocking issues.
- **Never use color as the sole indicator of state.** Always pair color with a text label (see [Accessibility](#accessibility)).

---

## Typography

WAVE uses two font families: a sans-serif for UI text and a monospace for code and technical content. Both are loaded from Google Fonts.

### Sans-Serif: Inter

The primary UI typeface. Clean, highly legible at small sizes, and designed for screens.

| Weight | Name | Usage |
|---|---|---|
| 400 | Regular | Body text, descriptions, secondary content |
| 500 | Medium | UI labels, sidebar navigation items, table headers |
| 600 | SemiBold | Section headings, stat values, emphasized content |
| 700 | Bold | Page titles, hero metrics, primary headings |

**Fallback stack:** `Inter, system-ui, -apple-system, sans-serif`

### Monospace: JetBrains Mono

Used for all code-related content. Optimized for readability in dense code blocks and terminal output.

| Weight | Name | Usage |
|---|---|---|
| 400 | Regular | Code blocks, terminal output, log entries |
| 500 | Medium | Inline code, file paths, CLI commands |

**Fallback stack:** `"JetBrains Mono", "Fira Code", "Cascadia Code", monospace`

### Guidelines

- Never use more than two font families in a single view.
- Do not use italic for emphasis in code contexts; use weight changes or color instead.
- Minimum body text size: 14px (0.875rem). Minimum code text size: 13px (0.8125rem).
- Line height for body text: 1.5. Line height for code: 1.6.

---

## Iconography

### Library

WAVE uses [Lucide React](https://lucide.dev/) as the sole icon library. Do not mix icon libraries or introduce custom SVGs without explicit approval.

### Sizing

Icons scale based on context:

| Context | Size | Example |
|---|---|---|
| Inline with text | 16px | Status indicators next to labels |
| Standard UI elements | 20px | Sidebar navigation, button icons |
| Prominent/standalone | 24px | Page headers, empty states |

### Style

- **Stroke width:** 2 (Lucide default).
- **Style:** Outlined only. No filled variants.
- **Color:** Monochromatic. Icons inherit the current text color (`currentColor`). The only exception is status icons, which use the corresponding semantic color (green/amber/red).

### Usage

- Navigation items: icon paired with a text label.
- Status indicators: icon + text label + optional color.
- Action buttons: icon-only buttons must have an `aria-label`.
- Avoid decorative icons that add no informational value.

---

## Layout & Spacing

### Direction

All layouts use left-to-right (LTR) text direction. WAVE is an English-only platform.

### Border Radius

| Token | Value |
|---|---|
| `--radius-sm` | `calc(0.5rem - 4px)` |
| `--radius-md` | `calc(0.5rem - 2px)` |
| `--radius-lg` | `0.5rem` |

### Layout Patterns

- **Sidebar + Content:** Fixed-width sidebar on the left, scrollable content area on the right. The sidebar uses `--sidebar` background (#0d0d0d in dark mode).
- **Tabbed Interfaces:** Horizontal tab bar for switching between related views (e.g., gate details, agent logs, build output).
- **Data Grids:** Dense table layouts for story lists, gate statuses, and agent assignments.

### Sidebar

- Fixed width.
- Background: `--sidebar` (#0d0d0d in dark mode).
- Items: icon + text label, vertically stacked.
- Section headers: uppercase, `tracking-wider` (letter-spacing), muted foreground color.
- Active item: highlighted background with primary foreground text.

### Cards

- Background: `--card`.
- Border: 1px solid `--border`.
- Border radius: `rounded-xl`.
- Padding: `p-4` (1rem).

### Tables

- Class: `devin-table`.
- Minimal borders: bottom border on rows only.
- Header row: muted background, medium weight text.
- No outer border on the table container.

### Animations

| Name | Duration | Usage |
|---|---|---|
| `fadeIn` | 0.2s | Elements appearing in place |
| `slideIn` | 0.2s | Content entering from a direction |
| `slideInFromRight` | 0.3s | Flyout panels and drawers |

All animations must respect `prefers-reduced-motion` (see [Accessibility](#accessibility)).

---

## Component Patterns

### Status Badges

Pill-shaped badges that communicate state at a glance.

- Background: 10% opacity of the status color.
- Text: full-saturation status color.
- Border radius: fully rounded (`rounded-full`).
- Always include a text label; never rely on color alone.

```
[Passed]  — green text, green/10% background
[Pending] — amber text, amber/10% background
[Failed]  — red text, red/10% background
```

### Stat Cards

Used for key metrics on dashboards (e.g., "Gates Passed: 5/7", "Active Agents: 3").

- Structure: icon + numeric value + descriptive label.
- Background: `--card`.
- Border: 1px solid `--border`.
- The numeric value uses SemiBold (600) weight.

### Tables

- Minimal visual chrome.
- Row dividers: 1px bottom border using `--border`.
- Header row: `--muted` background, medium weight text, uppercase or sentence case depending on context.
- No zebra striping.

### Sidebar Navigation

- Section headers: uppercase text, `tracking-wider`, muted foreground.
- Navigation items: icon (20px) + label, full-width clickable area.
- Active state: highlighted background, primary foreground color.
- Hover state: subtle background change.

### Flyout Panels

- Enter from the right side of the viewport (`slideInFromRight`, 0.3s).
- Backdrop: semi-transparent overlay.
- Width: contextual, typically 400-600px.
- Close action: X button in top-right corner + clicking the backdrop + pressing Escape.

### Wizards (Multi-Step Flows)

Following the Gate0Wizard pattern:

- Progress indicator showing current step and total steps.
- Clear step titles and descriptions.
- Back/Next navigation buttons.
- Validation before advancing to the next step.
- Summary/confirmation on the final step.

---

## Accessibility

### Target Standard

WAVE targets **WCAG 2.1 Level AA** compliance.

### Color Contrast

- All foreground text on background surfaces must meet a minimum contrast ratio of **4.5:1** for normal text and **3:1** for large text (18px+ or 14px+ bold).
- The default dark mode combination (`#f2f2f2` on `#0a0a0a`) achieves a contrast ratio of **18.1:1**, well above the minimum.
- Status colors on their respective muted backgrounds must also meet contrast requirements.

### Focus Indicators

- All focusable elements display a visible focus ring.
- Focus ring style: **2px solid** using `--ring` color.
- Focus ring offset: **2px** from the element edge.
- Focus indicators must be visible in both dark and light modes.

### Keyboard Navigation

- All interactive elements (buttons, links, inputs, tabs, menu items) must be reachable via the **Tab** key.
- Complex components (dropdowns, modals, tab groups) must support arrow key navigation.
- Escape key closes modals, popovers, and flyout panels.
- Keyboard shortcuts must not conflict with browser or OS defaults.

### Screen Readers

- Use semantic HTML elements (`nav`, `main`, `section`, `header`, `footer`, `table`, `button`).
- Icon-only buttons must include an `aria-label` describing the action.
- Dynamic content updates use `aria-live` regions where appropriate.
- Status changes (gate passed, build failed) are announced to assistive technology.

### Motion

- All animations must respect the `prefers-reduced-motion` media query.
- When reduced motion is preferred, animations are either disabled or replaced with instant transitions.
- No content should depend on animation to be understood.

### Color Independence

- Status badges always include a text label alongside the color indicator.
- Charts and graphs (if introduced) must use patterns or labels in addition to color.
- Error states include descriptive text, not just a red border.

---

## Summary

WAVE's brand is defined by restraint and precision. A monochromatic palette with three semantic accent colors. Two typefaces. One icon library. Dark by default, dense by design, and built for the developers who use it eight hours a day. Every visual decision serves the goal of making autonomous agent orchestration legible, controllable, and trustworthy.
