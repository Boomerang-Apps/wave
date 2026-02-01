# /ui-trace - UI Story to Component Traceability

**Tier:** 2 (Workflow Command)
**Priority:** P2 (MEDIUM)
**Recommended Model:** Sonnet
**Aliases:** /component-trace, /storybook-trace

## Purpose

Validate bidirectional traceability between AI UI Stories and Storybook component library:
1. **Stories → Components**: Do referenced components exist?
2. **Codebase → Storybook**: Are all custom components documented in Storybook?
3. **Coverage**: What's the overall component coverage?

## Usage

```bash
/ui-trace                    # Full trace analysis
/ui-trace stories            # Only check story → component refs
/ui-trace components         # Only check component → Storybook coverage
/ui-trace wave 1             # Trace only Wave 1 UI stories
/ui-trace --fix              # Generate missing stories/components list
```

---

## What It Checks

### 1. Story → Component References
```
AI Story AC/Implementation     →    Component Exists?
─────────────────────────────────────────────────────
"Use Button component"         →    ✓ components/ui/Button.tsx
"Use LoginForm pattern"        →    ✓ components/patterns/LoginForm.tsx
"Use DatePicker"               →    ✗ NOT FOUND
```

### 2. Custom Components → Storybook
```
Component in Codebase          →    Has Storybook Story?
─────────────────────────────────────────────────────
components/ui/Button.tsx       →    ✓ Button.stories.tsx
components/ui/Input.tsx        →    ✓ Input.stories.tsx
components/ui/FileUpload.tsx   →    ✗ NO STORY
features/auth/LoginForm.tsx    →    ✗ NO STORY (should have)
```

### 3. Orphaned Stories
```
Storybook Story                →    Component Still Exists?
─────────────────────────────────────────────────────
OldButton.stories.tsx          →    ✗ Component deleted
DeprecatedModal.stories.tsx    →    ✗ Component deleted
```

---

## Detection Rules

### Components That MUST Have Stories

```javascript
// Auto-detected patterns that require Storybook stories:

// 1. Shared UI components
src/components/ui/**/*.tsx           // All primitives
src/components/patterns/**/*.tsx     // All patterns
src/components/layout/**/*.tsx       // All layouts

// 2. Feature components (reusable)
src/features/*/components/**/*.tsx   // Feature components

// 3. Explicitly marked
// @storybook-required comment in file
```

### Components That DON'T Need Stories

```javascript
// Excluded from Storybook requirement:

*.test.tsx                    // Test files
*.spec.tsx                    // Spec files
index.tsx                     // Barrel exports
*.types.ts                    // Type definitions
*Context.tsx                  // Context providers
*Provider.tsx                 // Providers
hooks/*.ts                    // Hooks (not components)
lib/*.ts                      // Utilities
```

### Story Component Reference Detection

```javascript
// Patterns detected in AI Story files:

// 1. designSystemRef field
{
  "acceptanceCriteria": [{
    "designSystemRef": "primitives/Button"  // ← Detected
  }]
}

// 2. EARS statements mentioning components
"WHEN user clicks THEN use Button component"  // ← Detected

// 3. Implementation paths
{
  "implementation": {
    "frontendPaths": ["src/components/ui/Button.tsx"]  // ← Detected
  }
}

// 4. Technical notes
"Uses: LoginForm, Button, Input components"  // ← Detected
```

---

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  UI STORY ↔ COMPONENT TRACE                                      /ui-trace   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  SCAN SUMMARY                                                                ║
║  ────────────                                                                ║
║  AI Stories scanned:        12 UI stories (Wave 1-2)                         ║
║  Components in codebase:    34 total                                         ║
║  Storybook stories:         28 stories                                       ║
║                                                                              ║
║  ══════════════════════════════════════════════════════════════════════════  ║
║                                                                              ║
║  1. MISSING COMPONENTS (referenced in stories but don't exist)               ║
║  ─────────────────────────────────────────────────────────────               ║
║                                                                              ║
║  ✗ DatePicker                                                                ║
║    └── Referenced by: UI-FE-003/AC2 (Profile Edit)                           ║
║    └── Action: Create component + Storybook story                            ║
║                                                                              ║
║  ✗ FileUpload                                                                ║
║    └── Referenced by: UI-FE-007/AC1 (Document Upload)                        ║
║    └── Action: Create component + Storybook story                            ║
║                                                                              ║
║  ✗ RatingStars                                                               ║
║    └── Referenced by: UI-FE-011/AC3 (Review Form)                            ║
║    └── Action: Create component + Storybook story                            ║
║                                                                              ║
║  ══════════════════════════════════════════════════════════════════════════  ║
║                                                                              ║
║  2. COMPONENTS WITHOUT STORYBOOK STORIES                                     ║
║  ───────────────────────────────────────                                     ║
║                                                                              ║
║  UI Components (should have stories):                                        ║
║  ✗ src/components/ui/Tooltip.tsx                                             ║
║  ✗ src/components/ui/Popover.tsx                                             ║
║  ✗ src/components/ui/Tabs.tsx                                                ║
║                                                                              ║
║  Feature Components (should have stories):                                   ║
║  ✗ src/features/auth/components/LoginForm.tsx                                ║
║  ✗ src/features/auth/components/RegisterForm.tsx                             ║
║  ✗ src/features/profile/components/ProfileCard.tsx                           ║
║                                                                              ║
║  Pattern Components (should have stories):                                   ║
║  ✗ src/components/patterns/DataTable.tsx                                     ║
║  ✗ src/components/patterns/SearchBar.tsx                                     ║
║                                                                              ║
║  ══════════════════════════════════════════════════════════════════════════  ║
║                                                                              ║
║  3. ORPHANED STORYBOOK STORIES (component deleted)                           ║
║  ─────────────────────────────────────────────────                           ║
║                                                                              ║
║  ⚠ stories/OldDropdown.stories.tsx → Component no longer exists              ║
║  ⚠ stories/LegacyCard.stories.tsx  → Component no longer exists              ║
║                                                                              ║
║  ══════════════════════════════════════════════════════════════════════════  ║
║                                                                              ║
║  4. STORY COVERAGE DETAILS                                                   ║
║  ─────────────────────────                                                   ║
║                                                                              ║
║  UI-FE-001 (Login Page)                                                      ║
║  ├── Button              ✓ exists + has story                                ║
║  ├── Input               ✓ exists + has story                                ║
║  ├── Form                ✓ exists + has story                                ║
║  └── LoginForm           ✗ exists, NO STORY ← needs story                    ║
║                                                                              ║
║  UI-FE-002 (Registration)                                                    ║
║  ├── Button              ✓ exists + has story                                ║
║  ├── Input               ✓ exists + has story                                ║
║  ├── Select              ✓ exists + has story                                ║
║  ├── CheckboxGroup       ✓ exists + has story                                ║
║  └── RegisterForm        ✗ exists, NO STORY ← needs story                    ║
║                                                                              ║
║  UI-FE-003 (Profile Edit)                                                    ║
║  ├── Button              ✓ exists + has story                                ║
║  ├── Input               ✓ exists + has story                                ║
║  └── DatePicker          ✗ MISSING ← create component                        ║
║                                                                              ║
║  ══════════════════════════════════════════════════════════════════════════  ║
║                                                                              ║
║  COVERAGE SUMMARY                                                            ║
║  ────────────────                                                            ║
║                                                                              ║
║  Component Coverage:                                                         ║
║  ├── UI Components:      12/15 (80%) have Storybook stories                  ║
║  ├── Pattern Components:  4/6  (67%) have Storybook stories                  ║
║  └── Feature Components:  8/13 (62%) have Storybook stories                  ║
║                                                                              ║
║  Story Coverage:                                                             ║
║  ├── Stories with all components:     9/12 (75%)                             ║
║  ├── Stories with missing components: 3/12 (25%)                             ║
║  └── Total component refs resolved:   28/34 (82%)                            ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: 11 issues found                                                     ║
║                                                                              ║
║  ✗ 3 components referenced but don't exist (blocking)                        ║
║  ✗ 8 components missing Storybook stories (documentation gap)                ║
║  ⚠ 2 orphaned stories (cleanup needed)                                       ║
║                                                                              ║
║  RECOMMENDED ACTIONS:                                                        ║
║  1. Create missing components: DatePicker, FileUpload, RatingStars           ║
║  2. Add stories for: LoginForm, RegisterForm, ProfileCard, etc.              ║
║  3. Delete orphaned stories: OldDropdown, LegacyCard                         ║
║                                                                              ║
║  Run: /ui-trace --fix to generate component/story templates                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Fix Mode (`--fix`)

When run with `--fix`, generates actionable output:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  UI TRACE FIX PLAN                                           /ui-trace --fix ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  COMPONENTS TO CREATE                                                        ║
║  ────────────────────                                                        ║
║                                                                              ║
║  1. DatePicker                                                               ║
║     Path: src/components/ui/DatePicker.tsx                                   ║
║     Story: src/components/ui/DatePicker.stories.tsx                          ║
║     Required by: UI-FE-003                                                   ║
║                                                                              ║
║     Template:                                                                ║
║     /design-system init DatePicker --with-story                              ║
║                                                                              ║
║  2. FileUpload                                                               ║
║     Path: src/components/ui/FileUpload.tsx                                   ║
║     Story: src/components/ui/FileUpload.stories.tsx                          ║
║     Required by: UI-FE-007                                                   ║
║                                                                              ║
║  STORIES TO CREATE                                                           ║
║  ─────────────────                                                           ║
║                                                                              ║
║  1. LoginForm.stories.tsx                                                    ║
║     Component: src/features/auth/components/LoginForm.tsx                    ║
║     Command: /design-system storybook LoginForm                              ║
║                                                                              ║
║  2. RegisterForm.stories.tsx                                                 ║
║     Component: src/features/auth/components/RegisterForm.tsx                 ║
║     Command: /design-system storybook RegisterForm                           ║
║                                                                              ║
║  STORIES TO DELETE                                                           ║
║  ─────────────────                                                           ║
║                                                                              ║
║  1. stories/OldDropdown.stories.tsx (orphaned)                               ║
║  2. stories/LegacyCard.stories.tsx (orphaned)                                ║
║                                                                              ║
║  BATCH COMMANDS                                                              ║
║  ──────────────                                                              ║
║                                                                              ║
║  # Create missing components with stories                                    ║
║  /design-system init DatePicker FileUpload RatingStars --with-story          ║
║                                                                              ║
║  # Generate stories for existing components                                  ║
║  /design-system storybook LoginForm RegisterForm ProfileCard                 ║
║                                                                              ║
║  # Cleanup orphaned stories                                                  ║
║  rm stories/OldDropdown.stories.tsx stories/LegacyCard.stories.tsx           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Component Detection Paths

### Where to Look for Components

```yaml
# Default paths scanned
componentPaths:
  - src/components/**/*.tsx
  - src/features/*/components/**/*.tsx
  - components/**/*.tsx

# Default story paths
storyPaths:
  - src/**/*.stories.tsx
  - stories/**/*.stories.tsx
  - .storybook/**/*.stories.tsx
```

### Where to Look for AI Stories

```yaml
# Story locations
storyPaths:
  - stories/wave-*/UI-*.json
  - .claude/stories/UI-*.json
  - ai-stories/UI-*.json
```

---

## Integration

### With /story-audit
```bash
# /story-audit now includes component trace
/story-audit UI-FE-001
# Includes: "Component Coverage: 4/4 ✓"
```

### With /design-system
```bash
# Generate stories for components found by trace
/ui-trace --fix | /design-system storybook
```

### With /gap-analysis
```bash
# /gap-analysis includes UI trace results
/gap-analysis wave 1
# Includes: "UI Component Gaps: 3 missing"
```

### With /preflight
```bash
# Pre-flight warns about missing components
/preflight
# Warning: 3 UI stories reference missing components
```

---

## Signal File

```json
// .claude/signals/ui-trace-{timestamp}.json
{
  "command": "/ui-trace",
  "timestamp": "2026-02-01T12:00:00Z",
  "result": "GAPS_FOUND",
  "summary": {
    "storiesScanned": 12,
    "componentsInCodebase": 34,
    "storybookStories": 28,
    "missingComponents": 3,
    "componentsWithoutStories": 8,
    "orphanedStories": 2
  },
  "missingComponents": [
    {
      "name": "DatePicker",
      "referencedBy": ["UI-FE-003/AC2"]
    },
    {
      "name": "FileUpload",
      "referencedBy": ["UI-FE-007/AC1"]
    }
  ],
  "componentsWithoutStories": [
    "src/components/ui/Tooltip.tsx",
    "src/features/auth/components/LoginForm.tsx"
  ],
  "orphanedStories": [
    "stories/OldDropdown.stories.tsx"
  ],
  "coverage": {
    "uiComponents": 0.80,
    "patternComponents": 0.67,
    "featureComponents": 0.62,
    "overall": 0.72
  }
}
```

---

## Configuration

Create `.claude/ui-trace.config.json` to customize:

```json
{
  "componentPaths": [
    "src/components/**/*.tsx",
    "src/features/*/components/**/*.tsx"
  ],
  "storyPaths": [
    "src/**/*.stories.tsx",
    "stories/**/*.stories.tsx"
  ],
  "aiStoryPaths": [
    "stories/wave-*/UI-*.json"
  ],
  "excludePatterns": [
    "**/*.test.tsx",
    "**/*.spec.tsx",
    "**/index.tsx"
  ],
  "requireStoriesFor": [
    "src/components/ui/**",
    "src/components/patterns/**"
  ],
  "optionalStoriesFor": [
    "src/features/*/components/**"
  ]
}
```

---

## Troubleshooting

### Component Not Detected
```
Check:
1. Component exports a React component (not just types)
2. File has .tsx extension
3. Path is in componentPaths config
4. Not in excludePatterns
```

### Story Reference Not Found
```
Ensure AI Story has one of:
1. designSystemRef field in AC
2. Component name in EARS statement
3. Component path in frontendPaths
4. Component mentioned in technicalNotes
```

### False Positives
```
Add to .claude/ui-trace.config.json:
{
  "ignoreComponents": ["InternalHelper", "DebugPanel"],
  "ignoreStories": ["Experimental/*"]
}
```
