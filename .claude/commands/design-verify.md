# Design Verify: Visual Design-to-Code Validation

## Command
`/design-verify <design-source> <react-target>`

## Purpose
Validate that React implementation matches HTML/Figma design specifications using Playwright MCP for automated visual comparison.

## Arguments
- `<design-source>`: Path to HTML mockup, URL, or "figma:<frame-id>"
- `<react-target>`: React component path or localhost URL (default: http://localhost:3000)

## Prerequisites
- Playwright MCP server configured in `.claude/mcp.json`
- React dev server running (for localhost comparisons)
- Design file accessible (local HTML or URL)

---

## Protocol Phases

### Phase 1: Setup & Discovery
```yaml
actions:
  - Verify Playwright MCP connection
  - Identify design source type (HTML file, URL, Figma)
  - Identify React target (component file, localhost URL)
  - Start React dev server if needed
  - Create output directory: .claude/design-verify/
```

### Phase 2: Capture Design Baseline
```yaml
actions:
  - Load design source in Playwright
  - Capture full-page screenshot → baseline-full.png
  - Capture component-level screenshots
  - Extract computed styles for key elements:
    - Colors (background, text, border)
    - Typography (font-family, size, weight, line-height)
    - Spacing (margin, padding, gap)
    - Layout (display, flex, grid properties)
    - Dimensions (width, height, border-radius)
  - Save as design-specs.json
```

### Phase 3: Capture React Implementation
```yaml
actions:
  - Load React app in Playwright
  - Wait for hydration complete
  - Capture matching screenshots → current-full.png
  - Extract computed styles for same elements
  - Save as react-specs.json
```

### Phase 4: Visual Comparison
```yaml
actions:
  - Pixel diff: baseline-full.png vs current-full.png
  - Calculate diff percentage
  - Generate diff overlay image → diff.png
  - Identify regions with >5% deviation
```

### Phase 5: Style Comparison
```yaml
checks:
  colors:
    - Compare hex values (allow #fff vs #ffffff normalization)
    - Flag if delta > 0 (exact match required)

  typography:
    - font-family: exact match
    - font-size: tolerance ±1px
    - font-weight: exact match
    - line-height: tolerance ±2px

  spacing:
    - margin: tolerance ±2px
    - padding: tolerance ±2px
    - gap: tolerance ±2px

  layout:
    - display: exact match
    - flex-direction: exact match
    - justify-content: exact match
    - align-items: exact match

  dimensions:
    - width: tolerance ±2px (or % match)
    - height: tolerance ±2px (or auto)
    - border-radius: tolerance ±1px
```

### Phase 6: Responsive Verification
```yaml
breakpoints:
  mobile: 375x667
  tablet: 768x1024
  desktop: 1440x900

actions:
  - For each breakpoint:
    - Resize viewport
    - Capture design screenshot
    - Capture React screenshot
    - Compare and log differences
```

### Phase 7: Interactive States
```yaml
states:
  - default: no interaction
  - hover: mouse over interactive elements
  - focus: keyboard focus on inputs
  - active: mouse down state
  - disabled: disabled attribute set

actions:
  - For each interactive element:
    - Trigger state
    - Compare styles
    - Log mismatches
```

### Phase 8: Report Generation
```yaml
output: .claude/design-verify/report-{timestamp}.json
format:
  summary:
    status: PASS | FAIL | WARNING
    matchScore: 0-100%
    criticalIssues: number
    warnings: number

  visualDiff:
    fullPage: percentage
    byComponent: [{ name, diff% }]

  styleDiff:
    colors: [{ element, expected, actual, status }]
    typography: [{ element, property, expected, actual, status }]
    spacing: [{ element, property, expected, actual, status }]
    layout: [{ element, property, expected, actual, status }]

  responsive:
    mobile: { status, issues[] }
    tablet: { status, issues[] }
    desktop: { status, issues[] }

  interactiveStates:
    hover: [{ element, status, issues[] }]
    focus: [{ element, status, issues[] }]

  recommendations:
    - actionable fix suggestions
```

---

## Playwright MCP Commands Used

```javascript
// Navigate to pages
await mcp.playwright.navigate({ url: designUrl });
await mcp.playwright.navigate({ url: reactUrl });

// Screenshots
await mcp.playwright.screenshot({
  path: 'baseline.png',
  fullPage: true
});

// Get computed styles
await mcp.playwright.evaluate({
  script: `
    const el = document.querySelector('${selector}');
    return window.getComputedStyle(el);
  `
});

// Set viewport
await mcp.playwright.setViewport({
  width: 375,
  height: 667
});

// Hover interaction
await mcp.playwright.hover({ selector: '.button' });

// Focus interaction
await mcp.playwright.focus({ selector: 'input' });
```

---

## Example Usage

### Basic Comparison
```
/design-verify ./designs/homepage.html http://localhost:3000
```

### Component-Level
```
/design-verify ./designs/button.html http://localhost:3000/storybook/button
```

### With Figma
```
/design-verify figma:1234567890 http://localhost:3000/dashboard
```

---

## Output Files

```
.claude/design-verify/
├── report-20260201T120000Z.json    # Full comparison report
├── baseline-full.png               # Design screenshot
├── current-full.png                # React screenshot
├── diff.png                        # Visual diff overlay
├── design-specs.json               # Extracted design styles
├── react-specs.json                # Extracted React styles
└── responsive/
    ├── mobile-baseline.png
    ├── mobile-current.png
    ├── tablet-baseline.png
    ├── tablet-current.png
    ├── desktop-baseline.png
    └── desktop-current.png
```

---

## Thresholds

| Metric | Pass | Warning | Fail |
|--------|------|---------|------|
| Visual diff | <2% | 2-5% | >5% |
| Color match | 100% | - | <100% |
| Typography | ±1px | ±2px | >2px |
| Spacing | ±2px | ±4px | >4px |
| Layout | exact | - | mismatch |

---

## Integration with Wave V2

### Pre-Gate 4 (QA) Check
```yaml
gate4_prerequisites:
  - /design-verify must pass or have approved exceptions
  - Visual diff < 5%
  - No critical color mismatches
  - Responsive layouts verified
```

### Story Acceptance Criteria
```yaml
story_completion:
  - Design verification report attached
  - All breakpoints tested
  - Interactive states validated
```

---

## Troubleshooting

### Playwright MCP Not Connected
```bash
# Check MCP configuration
cat .claude/mcp.json

# Ensure server is listed
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-playwright"]
    }
  }
}
```

### React App Not Loading
```bash
# Start dev server first
pnpm dev

# Or specify running port
/design-verify ./design.html http://localhost:5173
```

### Styles Not Matching Due to Fonts
```yaml
common_issues:
  - Web fonts not loaded: wait for font load event
  - System font fallback: ensure font files available
  - Font rendering differs: use font-smoothing normalization
```

---

## Quick Checklist

- [ ] Playwright MCP connected
- [ ] Design source accessible
- [ ] React dev server running
- [ ] Fonts loaded in both environments
- [ ] Same viewport size for both captures
- [ ] Interactive states testable
- [ ] Responsive breakpoints defined

---

## Signal File

On completion, creates:
```json
// .claude/signals/design-verify-{timestamp}.json
{
  "command": "/design-verify",
  "timestamp": "2026-02-01T12:00:00Z",
  "designSource": "./designs/homepage.html",
  "reactTarget": "http://localhost:3000",
  "result": "PASS",
  "matchScore": 97,
  "criticalIssues": 0,
  "warnings": 2,
  "reportPath": ".claude/design-verify/report-20260201T120000Z.json"
}
```
