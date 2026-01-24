# WAVE Agent Launch Sequence - TDD Implementation Plan

## Progress Tracker

```
PHASE 1: Gating Infrastructure     [██████████] 100% (5/5 steps) ✓
PHASE 2: Step 0 - Mockup Design    [██████████] 100% (5/5 steps) ✓
PHASE 3: Step 1 - PRD & Stories    [██████████] 100% (5/5 steps) ✓
PHASE 4: Step 2 - Wave Plan        [░░░░░░░░░░] 0%
PHASE 5: Enhanced Validations      [░░░░░░░░░░] 0%
PHASE 6: Progress Visualization    [░░░░░░░░░░] 0%
─────────────────────────────────────────────────
OVERALL PROGRESS                   [██████░░░░] 50%  (15/30 steps)
```

**Last Updated:** 2026-01-24 18:45
**Current Phase:** Phase 3 Complete
**Current Step:** Ready for Phase 4

---

## TDD Methodology

### Red-Green-Refactor Cycle

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD CYCLE (MANDATORY)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. RED    → Write failing test first                      │
│              Test must fail before any implementation        │
│              Run test, confirm it fails                      │
│                                                              │
│   2. GREEN  → Write minimum code to pass                    │
│              Only write enough code to make test pass        │
│              No extra features, no "nice to have"            │
│                                                              │
│   3. REFACTOR → Clean up without breaking tests             │
│              Improve code quality                            │
│              All tests must still pass                       │
│                                                              │
│   4. REPEAT → Next test case                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Code Practice Standards

| Practice | Requirement |
|----------|-------------|
| **Test Coverage** | Minimum 80% for new code |
| **Test Naming** | `should_[expected]_when_[condition]` |
| **File Naming** | `[feature].test.js` alongside `[feature].js` |
| **No Implementation Without Test** | Every function must have test first |
| **Commit Pattern** | `test: [description]` then `feat: [description]` |
| **Type Safety** | TypeScript strict mode, no `any` |
| **Error Handling** | All edge cases must have tests |

---

## Phase 1: Gating Infrastructure

### Step 1.1: Gate Dependencies Data Structure

**Test File:** `portal/server/__tests__/gate-dependencies.test.js`

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

#### TDD Checklist

- [ ] **RED:** Write test for `GATE_DEPENDENCIES` constant exists
- [ ] **RED:** Write test for each step having required fields (step, label, requiredSteps, validationKey)
- [ ] **RED:** Write test for step 0 having no required steps
- [ ] **RED:** Write test for sequential dependency chain (step N requires step N-1)
- [ ] **GREEN:** Implement `GATE_DEPENDENCIES` constant
- [ ] **REFACTOR:** Extract to separate file if needed

#### Test Cases

```javascript
describe('GATE_DEPENDENCIES', () => {
  it('should define 10 steps (0-9)')
  it('should have step 0 (mockup-design) with no required steps')
  it('should have each step require the previous step')
  it('should have unique validation keys for each step')
  it('should have all required fields: step, label, requiredSteps, validationKey')
})
```

---

### Step 1.2: Gate Access Validator Function

**Test File:** `portal/server/__tests__/gate-access.test.js`

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

#### TDD Checklist

- [ ] **RED:** Write test for `canAccessStep()` returns `{ allowed, blockedBy }`
- [ ] **RED:** Write test for step 0 always accessible
- [ ] **RED:** Write test for step 1 blocked when step 0 not ready
- [ ] **RED:** Write test for step 1 allowed when step 0 ready
- [ ] **RED:** Write test for `blockedBy` containing correct step labels
- [ ] **RED:** Write test for step 9 blocked when any previous step not ready
- [ ] **GREEN:** Implement `canAccessStep()` function
- [ ] **REFACTOR:** Optimize for performance

#### Test Cases

```javascript
describe('canAccessStep', () => {
  it('should allow step 0 without any prerequisites')
  it('should block step 1 when step 0 is idle')
  it('should block step 1 when step 0 is blocked')
  it('should allow step 1 when step 0 is ready')
  it('should return blockedBy array with step labels')
  it('should block step 9 if any step 0-8 is not ready')
  it('should allow step 9 when all steps 0-8 are ready')
})
```

---

### Step 1.3: Step Status Getter Function

**Test File:** `portal/server/__tests__/step-status.test.js`

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

#### TDD Checklist

- [ ] **RED:** Write test for `getStepStatus()` returns 'idle' | 'ready' | 'blocked'
- [ ] **RED:** Write test for unknown step returns 'idle'
- [ ] **RED:** Write test for step with no validation returns 'idle'
- [ ] **RED:** Write test for step with ready validation returns 'ready'
- [ ] **RED:** Write test for step with blocked validation returns 'blocked'
- [ ] **GREEN:** Implement `getStepStatus()` function
- [ ] **REFACTOR:** Add caching if needed

#### Test Cases

```javascript
describe('getStepStatus', () => {
  it('should return idle for unknown step ID')
  it('should return idle when no validation exists')
  it('should return ready when validation status is ready')
  it('should return blocked when validation status is blocked')
  it('should read from persisted validation state')
})
```

---

### Step 1.4: Pre-Flight Check Function

**Test File:** `portal/server/__tests__/preflight-check.test.js`

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

#### TDD Checklist

- [ ] **RED:** Write test for `runPreFlightCheck()` returns `{ ready, blockers }`
- [ ] **RED:** Write test for ready=true when all 10 steps pass
- [ ] **RED:** Write test for ready=false when any step fails
- [ ] **RED:** Write test for blockers containing failed step names
- [ ] **RED:** Write test for blockers in step order (0 first, 9 last)
- [ ] **GREEN:** Implement `runPreFlightCheck()` function
- [ ] **REFACTOR:** Add detailed blocker messages

#### Test Cases

```javascript
describe('runPreFlightCheck', () => {
  it('should return ready=true when all steps pass')
  it('should return ready=false when step 0 fails')
  it('should return ready=false when step 5 fails')
  it('should list all blockers in step order')
  it('should include step number and label in blockers')
})
```

---

### Step 1.5: Tab Rendering with Lock State

**Test File:** `portal/src/__tests__/TabGating.test.tsx`

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

#### TDD Checklist

- [ ] **RED:** Write test for locked tab shows Lock icon
- [ ] **RED:** Write test for locked tab has opacity-40 class
- [ ] **RED:** Write test for locked tab is disabled
- [ ] **RED:** Write test for locked tab has title tooltip
- [ ] **RED:** Write test for unlocked tab is clickable
- [ ] **RED:** Write test for unlocked tab shows step number
- [ ] **GREEN:** Implement locked/unlocked tab rendering
- [ ] **REFACTOR:** Extract to TabButton component

#### Test Cases

```javascript
describe('Tab Rendering with Gating', () => {
  it('should render Lock icon for blocked tabs')
  it('should apply opacity-40 class to locked tabs')
  it('should set disabled=true on locked tabs')
  it('should show tooltip with blocker info on locked tabs')
  it('should allow click on unlocked tabs')
  it('should show step number on unlocked tabs')
  it('should show StatusDot with blocked status for locked tabs')
})
```

---

## Phase 2: Step 0 - Mockup Design Tab

### Step 2.1: Mockup Validation Types

**Test File:** `portal/server/__tests__/mockup-validation-types.test.js`

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

#### TDD Checklist

- [ ] **RED:** Write test for MockupCheck type has required fields
- [ ] **RED:** Write test for MockupValidationResult type structure
- [ ] **RED:** Write test for valid status values
- [ ] **GREEN:** Implement types in validation-persistence.js
- [ ] **REFACTOR:** Add JSDoc comments

---

### Step 2.2: Mockup Detection Function

**Test File:** `portal/server/__tests__/mockup-detection.test.js`

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

#### TDD Checklist

- [ ] **RED:** Write test for detecting design_mockups folder
- [ ] **RED:** Write test for finding HTML files in folder
- [ ] **RED:** Write test for returning empty array when no mockups
- [ ] **RED:** Write test for sorting files by name
- [ ] **GREEN:** Implement `detectMockups()` function
- [ ] **REFACTOR:** Add file pattern configuration

---

### Step 2.3: Mockup Analysis Function

**Test File:** `portal/server/__tests__/mockup-analysis.test.js`

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

#### TDD Checklist

- [ ] **RED:** Write test for extracting page title from HTML
- [ ] **RED:** Write test for detecting form elements
- [ ] **RED:** Write test for detecting navigation links
- [ ] **RED:** Write test for detecting interactive elements
- [ ] **GREEN:** Implement `analyzeMockup()` function
- [ ] **REFACTOR:** Add more element detection

---

### Step 2.4: Mockup Validation Endpoint

**Test File:** `portal/server/__tests__/mockup-endpoint.test.js`

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

#### TDD Checklist

- [ ] **RED:** Write test for POST /api/validate-mockups returns 200
- [ ] **RED:** Write test for response includes checks array
- [ ] **RED:** Write test for response includes status
- [ ] **RED:** Write test for response includes screens list
- [ ] **RED:** Write test for 400 when project path missing
- [ ] **GREEN:** Implement endpoint in server/index.js
- [ ] **REFACTOR:** Add request validation middleware

---

### Step 2.5: Mockup Tab UI Component

**Test File:** `portal/src/__tests__/MockupDesignTab.test.tsx`

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

#### TDD Checklist

- [ ] **RED:** Write test for tab renders info box
- [ ] **RED:** Write test for validate button calls API
- [ ] **RED:** Write test for progress bar shows during validation
- [ ] **RED:** Write test for results display after validation
- [ ] **RED:** Write test for "Lock Mockups" button appears when ready
- [ ] **GREEN:** Implement MockupDesignTab component
- [ ] **REFACTOR:** Extract sub-components

---

## Phase 3: Step 1 - PRD & Stories Validation

### Step 3.1: PRD Detection Function

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 3.2: Story Schema Validator

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 3.3: Mockup-Story Alignment Checker

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 3.4: PRD Validation Endpoint

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 3.5: Stories Validation Endpoint

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

---

## Phase 4: Step 2 - Wave Execution Plan

### Step 4.1: Story Domain Classifier

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 4.2: Dependency Graph Builder

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 4.3: Agent Assignment Logic

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 4.4: Wave Batching Algorithm

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 4.5: Wave Plan Persistence

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

---

## Phase 5: Enhanced Validations

### Step 5.1: API Key Verification (Anthropic)

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 5.2: API Key Verification (Supabase)

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 5.3: Docker Validation

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 5.4: Slack Webhook Test

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

---

## Phase 6: Progress Visualization

### Step 6.1: Launch Sequence Header Component

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 6.2: Step Progress Indicator

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 6.3: Next Step Navigation Button

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

### Step 6.4: Pre-Flight Summary Panel

```
STATUS: [ ] Not Started  [ ] Tests Written  [ ] Tests Passing  [ ] Refactored
```

---

## Code Standards Checklist

### Before Each Commit

- [ ] All new tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)
- [ ] Test coverage >= 80% for new code
- [ ] No `any` types used
- [ ] Error cases handled and tested
- [ ] JSDoc comments on public functions

### Commit Message Format

```
test: add tests for [feature]
feat: implement [feature]
refactor: improve [feature]
fix: resolve [issue] in [feature]
```

---

## Test Execution Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- gate-dependencies.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run only Phase 1 tests
npm test -- --grep "GATE_DEPENDENCIES|canAccessStep|getStepStatus|runPreFlightCheck"
```

---

## Definition of Done

Each step is complete when:

1. [ ] All test cases written and documented
2. [ ] All tests pass (green)
3. [ ] Code coverage >= 80%
4. [ ] No TypeScript/lint errors
5. [ ] Code refactored for clarity
6. [ ] Progress bar updated in this file
7. [ ] Commit made with proper message

---

## Notes & Decisions

_Record important decisions and learnings here as implementation progresses._

| Date | Phase | Decision | Rationale |
|------|-------|----------|-----------|
| | | | |

---

## Blockers & Issues

_Track any blockers or issues encountered._

| Date | Phase | Issue | Status | Resolution |
|------|-------|-------|--------|------------|
| | | | | |
