# QA Checklist - Commands Reference Page

**Feature:** Commands Reference Page (57 Commands)
**Date:** 2026-02-10
**Commit:** b5be6bb
**URL:** http://localhost:7000/commands

---

## Test Categories

### 1. PAGE LOAD & STRUCTURE

**TEST-001: Page loads successfully**
- [ ] Page loads without errors
- [ ] Title "Commands Reference" visible
- [ ] Search bar present
- [ ] Category filters visible
- [ ] Command cards render

**TEST-002: All 57 commands present**
- [ ] Total command count displays "57 commands"
- [ ] All categories visible (17 categories)
- [ ] No missing commands from .claude/commands/

---

### 2. SEARCH FUNCTIONALITY

**TEST-003: Search by command name**
- [ ] Search for "/go" returns 1 result
- [ ] Search for "/gate" returns 9 results (gate-0 through gate-7, gate-check, preflight)
- [ ] Search for "/test" returns test-related commands
- [ ] Search is case-insensitive

**TEST-004: Search by description**
- [ ] Search for "security" returns security-related commands
- [ ] Search for "git" returns git-related commands
- [ ] Search for "quality" returns quality commands

**TEST-005: Search by aliases**
- [ ] Commands with aliases are searchable by alias
- [ ] "/c" finds "/commit" (alias)
- [ ] "/b" finds "/build" (alias)

---

### 3. CATEGORY FILTERING

**TEST-006: Category filters work**
- [ ] "All Commands" shows all 57
- [ ] "Core" category shows core commands (go, done, end, agent)
- [ ] "Gates" category shows gate commands (gate-0 to gate-7)
- [ ] Each category shows correct count

**TEST-007: Category counts accurate**
- [ ] Core: 4 commands
- [ ] Gates: 10 commands (gate-0 to gate-7, preflight, gate-check)
- [ ] Quality: 5+ commands
- [ ] Git: 5+ commands

---

### 4. COMMAND CARDS - COLLAPSED STATE

**TEST-008: Command header displays correctly**
- [ ] Command name visible (e.g., "/go")
- [ ] Tier badge visible (Tier 1, 2, 3)
- [ ] Priority badge visible (P0, P1, P2)
- [ ] Model badge visible (Opus, Sonnet, Haiku)
- [ ] Short description visible
- [ ] Aliases visible if present
- [ ] Category icon visible
- [ ] Copy button visible
- [ ] Expand/collapse chevron visible

---

### 5. COMMAND CARDS - EXPANDED STATE

**TEST-009: Expansion/collapse works**
- [ ] Click card header expands card
- [ ] Click again collapses card
- [ ] Chevron rotates on expand/collapse
- [ ] Multiple cards can be expanded simultaneously

**TEST-010: Expanded content displays**
- [ ] Full description visible
- [ ] "When to Use" section with bullet points
- [ ] Arguments table with Name/Description/Required columns
- [ ] Examples section with code blocks
- [ ] Related commands as clickable tags
- [ ] Important notes with warning icons
- [ ] Metadata footer (owner, model, last updated)

**TEST-011: Workflow phases display**
- [ ] Commands with phases show phase cards
- [ ] Phase numbers visible (1, 2, 3...)
- [ ] Phase checks show with checkmark icons
- [ ] Phase descriptions visible

---

### 6. COPY FUNCTIONALITY

**TEST-012: Copy command name**
- [ ] Click copy button on command header
- [ ] Icon changes to checkmark
- [ ] Command copied to clipboard
- [ ] Checkmark reverts after 2 seconds

**TEST-013: Copy examples**
- [ ] Click copy button on example
- [ ] Icon changes to checkmark
- [ ] Example copied to clipboard
- [ ] Checkmark reverts after 2 seconds

---

### 7. SPECIFIC COMMANDS VALIDATION

**TEST-014: Core commands present**
- [ ] /go - with orchestrates field
- [ ] /done - with orchestrates field
- [ ] /end - with orchestrates field
- [ ] /agent - with agent types

**TEST-015: Gate commands present**
- [ ] /gate-0 - Owner: CTO, Model: Opus
- [ ] /gate-1 - Owner: Agent
- [ ] /gate-2 - Owner: Agent
- [ ] /gate-3 - Owner: Agent, Model: Sonnet
- [ ] /gate-4 - Owner: QA
- [ ] /gate-5 - Owner: PM
- [ ] /gate-6 - Owner: CTO, Model: Opus
- [ ] /gate-7 - Owner: CTO, Model: Opus
- [ ] /preflight - with phases
- [ ] /gate-check - with arguments

**TEST-016: Quality commands present**
- [ ] /test - with unit, integration, e2e arguments
- [ ] /build - with type-check, lint, prod arguments
- [ ] /tdd - with RED-GREEN-REFACTOR phases
- [ ] /qa - with checklist argument
- [ ] /harden - with security, perf, a11y, quality arguments
- [ ] /a11y - accessibility audit
- [ ] /perf - performance analysis
- [ ] /security - security scan

**TEST-017: Git commands present**
- [ ] /git - with status, sync, cleanup arguments
- [ ] /branch - with create, switch, status, cleanup
- [ ] /branch-health - with stale, prs, drift
- [ ] /commit - with standardized format
- [ ] /pr - pull request creation
- [ ] /ci - CI/CD pipeline validation

**TEST-018: Strategic commands present**
- [ ] /status - CTO dashboard
- [ ] /cto - with full, quick, health, debt, risks arguments
- [ ] /prd - PRD analysis

**TEST-019: Workflow commands present**
- [ ] /story - story execution
- [ ] /execute-story - full Wave V2 protocol
- [ ] /wave-status - progress dashboard
- [ ] /wave-init - initialize framework
- [ ] /wave-start - batch wave dispatch
- [ ] /launch-wave - start wave execution

**TEST-020: Design commands present**
- [ ] /design-system - with detect, audit, sync
- [ ] /design-verify - visual validation
- [ ] /ui-trace - UI traceability

**TEST-021: Development commands present**
- [ ] /docker - container management
- [ ] /keys - credential validation
- [ ] /fix - research-driven fix protocol

**TEST-022: Documentation commands present**
- [ ] /story-audit - post-completion compliance
- [ ] /story-create - create new story
- [ ] /schema-validate - schema validation
- [ ] /validate-research - research validation
- [ ] /research - execute research phase
- [ ] /trace - traceability matrix
- [ ] /report - progress report
- [ ] /handoff - session handoff

**TEST-023: Specialized commands present**
- [ ] /anomaly - report anomaly
- [ ] /escalate - auto-escalation
- [ ] /gap-analysis - identify gaps
- [ ] /hazard - analyze hazards
- [ ] /protocol-verify - compliance verification
- [ ] /rearchitect - reorganize structure
- [ ] /rlm - token budget monitor
- [ ] /rlm-verify - RLM verification
- [ ] /rollback - execute rollback
- [ ] /safety - Constitutional AI check

---

### 8. UI/UX & STYLING

**TEST-024: Linear dark theme applied**
- [ ] Background: #1e1e1e (flat surface)
- [ ] Cards: #1e1e1e with #2e2e2e border
- [ ] Hover: #252525 (darken)
- [ ] Text hierarchy: #fafafa → #a3a3a3 → #666
- [ ] Accent color: #5e6ad2 (indigo)

**TEST-025: Interactive states**
- [ ] Cards hover to darker background
- [ ] Buttons hover effects work
- [ ] Focus states visible
- [ ] No broken hover states (no invisible hover:bg-muted)

**TEST-026: Responsive design**
- [ ] Layout responsive at 1920px
- [ ] Layout responsive at 1440px
- [ ] Layout responsive at 1024px
- [ ] Search bar full width
- [ ] Category filters wrap properly

**TEST-027: Typography & spacing**
- [ ] Command names in monospace font
- [ ] Code blocks in monospace
- [ ] Consistent spacing between sections
- [ ] No text overflow or truncation issues

---

### 9. NAVIGATION INTEGRATION

**TEST-028: Navigation menu**
- [ ] Commands link visible in primary sidebar (left)
- [ ] Terminal icon visible
- [ ] Link active state works
- [ ] Clicking navigates to /commands
- [ ] Commands appears in top navigation breadcrumb

---

### 10. PERFORMANCE & ERRORS

**TEST-029: Performance**
- [ ] Page loads in < 2 seconds
- [ ] Search is instant (< 100ms)
- [ ] Category filtering is instant
- [ ] Expand/collapse is smooth
- [ ] No console errors

**TEST-030: Error handling**
- [ ] No React errors in console
- [ ] No TypeScript errors
- [ ] No missing icons
- [ ] No broken images
- [ ] All imports resolve correctly

---

## ACCEPTANCE CRITERIA

**PASS Requirements:**
- All 30 tests pass
- All 57 commands present and searchable
- Copy functionality works
- Navigation integration complete
- No console errors
- Linear dark theme correctly applied

**BLOCKERS:**
- Missing commands (< 57 total)
- Search not working
- Copy functionality broken
- Console errors present
- Navigation broken

---

## Test Execution

- **Tester:** QA Agent (Haiku)
- **Environment:** Development (localhost:7000)
- **Browser:** Chrome/Safari
- **Date:** 2026-02-10
