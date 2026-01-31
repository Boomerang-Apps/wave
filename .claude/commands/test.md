# /test - Test Execution

**Priority:** P2 (MEDIUM)
**Recommended Model:** Haiku
**Aliases:** /t

## Purpose

Run test suite with coverage reporting. Supports running all tests, specific files, or watch mode for TDD.

## When to Run

- During TDD (RED-GREEN-REFACTOR)
- Before commit
- Before PR
- After refactoring

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `<file>` | Specific test file | All tests |
| `--coverage` | Include coverage report | true |
| `--watch` | Watch mode for TDD | false |
| `--ui` | Open Vitest UI | false |
| `--filter <pattern>` | Filter tests by name | - |

## Execution Commands

### Run All Tests
```bash
cd /Volumes/SSD-01/Projects/Footprint/footprint
npm run test:run
```

### Run Specific File
```bash
npm run test:run -- src/components/__tests__/Upload.test.tsx
```

### Watch Mode (TDD)
```bash
npm run test -- --watch
```

### With Coverage
```bash
npm run test:run -- --coverage
```

### Vitest UI
```bash
npm run test -- --ui
```

## Output Format

### All Passing
```
Test Results
============
Files: 85
Tests: 1986
Passed: 1986
Failed: 0
Skipped: 0

Duration: 12.4s

Coverage Report
---------------
File                    | Stmts | Branch | Funcs | Lines |
------------------------|-------|--------|-------|-------|
src/components/         | 82.3% | 74.1%  | 85.2% | 82.8% |
src/lib/                | 79.1% | 68.5%  | 81.0% | 79.5% |
src/app/                | 75.4% | 65.2%  | 78.3% | 75.9% |
------------------------|-------|--------|-------|-------|
All files               | 78.5% | 69.3%  | 81.2% | 78.9% |

Target: 80%
Status: BELOW TARGET (need +1.5%)
```

### With Failures
```
Test Results
============
Files: 85
Tests: 1986
Passed: 1982
Failed: 4
Skipped: 0

FAILURES
--------

1) src/components/__tests__/Upload.test.tsx
   ✗ should validate file size

   Expected: true
   Received: false

   at validateFileSize (src/lib/validation.ts:45:12)
   at Object.<anonymous> (src/components/__tests__/Upload.test.tsx:28:5)

2) src/lib/__tests__/validation.test.ts
   ✗ should reject files over 20MB

   AssertionError: expected 'valid' to equal 'invalid'

   ... 2 more failures

Duration: 14.2s

FIX REQUIRED: 4 tests failing
```

### Watch Mode Output
```
Test Watch Mode
===============
Watching for file changes...

Press:
  a - run all tests
  f - run only failed tests
  p - filter by filename
  t - filter by test name
  q - quit

Last Run: 1986 passed, 0 failed
```

## Coverage Thresholds

From project config:
```yaml
coverage:
  statements: 80%
  branches: 70%
  functions: 80%
  lines: 80%
```

### Coverage Warning
```
[WARNING] Coverage below threshold

Current:
  Statements: 78.5% (target: 80%)
  Lines: 78.9% (target: 80%)

Uncovered Files:
  src/lib/newFeature.ts - 45% coverage
  src/components/NewComponent.tsx - 62% coverage

Add tests to reach target coverage.
```

## TDD Workflow

### RED Phase
```
/test --watch

# Write failing test
# Test runs automatically
# See: 1 failing

[RED] Test failing as expected
Write implementation to make it pass.
```

### GREEN Phase
```
# Implement feature
# Test re-runs automatically
# See: 1 passing

[GREEN] Test passing!
Consider refactoring if needed.
```

### REFACTOR Phase
```
# Refactor code
# Tests ensure behavior unchanged
# All tests still pass

[REFACTOR] Safe to refactor - tests passing.
```

## Specific Test Patterns

### Run Component Tests
```bash
/test src/components/
```

### Run Tests Matching Pattern
```bash
/test --filter "upload"
```

### Run Single Test File
```bash
/test src/lib/__tests__/validation.test.ts
```

## Integration

- Used by: `/story` (TDD workflow)
- Used by: `/build` (pre-build validation)
- Used by: `/commit` (pre-commit check)
- Config: `vitest.config.ts`

## Evidence Sources

- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.7)
- Config: `vitest.config.ts`
- Scripts: `package.json` test commands
