# /test - Test Execution & Coverage

**Tier:** 2 (Workflow Command)
**Priority:** P0 (CRITICAL)
**Recommended Model:** Sonnet
**Aliases:** /tests, /coverage, /jest, /vitest

## Purpose

Execute tests and generate coverage reports. Supports unit tests, integration tests, E2E tests, and coverage thresholds.

## Usage

```bash
/test                      # Run all tests with coverage
/test unit                 # Unit tests only
/test integration          # Integration tests only
/test e2e                  # E2E tests (Playwright)
/test coverage             # Generate coverage report only
/test watch                # Watch mode for development
/test <pattern>            # Run tests matching pattern
/test --ci                 # CI mode (strict thresholds)
/test --update             # Update snapshots
/test --verbose            # Verbose output
```

---

## Test Categories

### Unit Tests (`/test unit`)
```bash
# Runs: vitest or jest
pnpm test:unit
# or
pnpm vitest run --coverage
```

**Scope:**
- Utility functions
- Hooks
- Pure components
- Business logic
- Schema validations

### Integration Tests (`/test integration`)
```bash
# Runs: vitest with setup
pnpm test:integration
# or
pnpm vitest run --config vitest.integration.config.ts
```

**Scope:**
- API endpoints
- Database operations
- Service interactions
- Supabase RLS policies

### E2E Tests (`/test e2e`)
```bash
# Runs: Playwright
pnpm test:e2e
# or
npx playwright test
```

**Scope:**
- Critical user flows
- Authentication journeys
- Payment flows
- Cross-browser testing

---

## Coverage Thresholds

| Metric | Minimum | Target | Blocking |
|--------|---------|--------|----------|
| Statements | 70% | 85% | <60% |
| Branches | 65% | 80% | <55% |
| Functions | 75% | 90% | <65% |
| Lines | 70% | 85% | <60% |

### Per-Feature Thresholds

| Feature | Required | Notes |
|---------|----------|-------|
| Auth | 90% | Security critical |
| Payments | 95% | Financial critical |
| Core Utils | 85% | Shared code |
| UI Components | 70% | Visual testing supplements |
| API Routes | 80% | Integration tested |

---

## Output

### `/test` - Full Test Run

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  TEST EXECUTION                                                      /test   ║
║  Project: AirView | Branch: feature/AUTH-BE-005                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  UNIT TESTS                                                                  ║
║  ──────────                                                                  ║
║  ✓ 245 passed                                                                ║
║  ○ 0 skipped                                                                 ║
║  ✗ 0 failed                                                                  ║
║  ⏱ 12.4s                                                                     ║
║                                                                              ║
║  INTEGRATION TESTS                                                           ║
║  ─────────────────                                                           ║
║  ✓ 48 passed                                                                 ║
║  ○ 2 skipped (requires external service)                                     ║
║  ✗ 0 failed                                                                  ║
║  ⏱ 34.2s                                                                     ║
║                                                                              ║
║  E2E TESTS                                                                   ║
║  ─────────                                                                   ║
║  ✓ 18 passed (3 browsers × 6 tests)                                          ║
║  ○ 0 skipped                                                                 ║
║  ✗ 0 failed                                                                  ║
║  ⏱ 45.8s                                                                     ║
║                                                                              ║
║  COVERAGE SUMMARY                                                            ║
║  ────────────────                                                            ║
║                                                                              ║
║  Statements:  84.2%  █████████████████░░░ ✓ (min: 70%)                       ║
║  Branches:    76.5%  ███████████████░░░░░ ✓ (min: 65%)                       ║
║  Functions:   89.1%  ██████████████████░░ ✓ (min: 75%)                       ║
║  Lines:       83.8%  █████████████████░░░ ✓ (min: 70%)                       ║
║                                                                              ║
║  COVERAGE BY FEATURE                                                         ║
║  ───────────────────                                                         ║
║                                                                              ║
║  ┌─────────────────────┬───────┬────────┬────────────────────────────────┐   ║
║  │ Feature             │ Cover │ Target │ Status                         │   ║
║  ├─────────────────────┼───────┼────────┼────────────────────────────────┤   ║
║  │ features/auth       │ 92.1% │ 90%    │ ✓ Pass                         │   ║
║  │ features/payments   │ 96.3% │ 95%    │ ✓ Pass                         │   ║
║  │ features/profiles   │ 85.4% │ 80%    │ ✓ Pass                         │   ║
║  │ features/messaging  │ 72.1% │ 75%    │ ⚠ Below target                 │   ║
║  │ features/projects   │ 78.9% │ 80%    │ ⚠ Below target                 │   ║
║  │ lib/utils           │ 88.2% │ 85%    │ ✓ Pass                         │   ║
║  │ components/ui       │ 71.5% │ 70%    │ ✓ Pass                         │   ║
║  └─────────────────────┴───────┴────────┴────────────────────────────────┘   ║
║                                                                              ║
║  UNCOVERED FILES (Top 5)                                                     ║
║  ───────────────────────                                                     ║
║  1. src/features/messaging/lib/socket.ts          45.2% (needs mocking)      ║
║  2. src/features/projects/lib/export.ts           52.1%                      ║
║  3. src/features/profiles/lib/avatar-upload.ts    58.4%                      ║
║  4. src/lib/analytics.ts                          61.2%                      ║
║  5. src/features/messaging/components/Chat.tsx    63.8%                      ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: ✓ PASS                                                              ║
║  Total: 311 tests | Coverage: 84.2% | Duration: 1m 32s                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### `/test coverage` - Coverage Report Only

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  COVERAGE REPORT                                            /test coverage   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  OVERALL COVERAGE                                                            ║
║  ────────────────                                                            ║
║                                                                              ║
║  ┌────────────────────────────────────────────────────────────────────────┐  ║
║  │                                                                        │  ║
║  │   Statements   ████████████████░░░░   84.2%   (2,145 / 2,548)         │  ║
║  │   Branches     ███████████████░░░░░   76.5%   (892 / 1,166)           │  ║
║  │   Functions    ██████████████████░░   89.1%   (412 / 462)             │  ║
║  │   Lines        █████████████████░░░   83.8%   (1,987 / 2,371)         │  ║
║  │                                                                        │  ║
║  └────────────────────────────────────────────────────────────────────────┘  ║
║                                                                              ║
║  TREND (last 5 runs)                                                         ║
║  ───────────────────                                                         ║
║  Jan 28:  81.2%  ████████████████░░░░                                        ║
║  Jan 29:  82.5%  █████████████████░░░                                        ║
║  Jan 30:  83.1%  █████████████████░░░                                        ║
║  Jan 31:  83.8%  █████████████████░░░                                        ║
║  Feb 01:  84.2%  █████████████████░░░  ↑ +0.4%                               ║
║                                                                              ║
║  DETAILED REPORT                                                             ║
║  ───────────────                                                             ║
║  HTML:  coverage/index.html                                                  ║
║  JSON:  coverage/coverage-final.json                                         ║
║  LCOV:  coverage/lcov.info                                                   ║
║                                                                              ║
║  Open report: open coverage/index.html                                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Commands Run

```bash
# Unit tests
pnpm vitest run --coverage

# Integration tests
pnpm vitest run --config vitest.integration.config.ts --coverage

# E2E tests
pnpm playwright test

# Coverage only (no test execution)
pnpm vitest run --coverage --reporter=json

# Watch mode
pnpm vitest --watch

# CI mode (strict)
pnpm vitest run --coverage --reporter=junit --outputFile=test-results.xml
```

---

## CI Mode (`/test --ci`)

In CI mode, the command:
1. Uses stricter thresholds
2. Outputs JUnit XML for CI parsing
3. Fails on any threshold breach
4. Generates coverage badges
5. Returns proper exit codes

```bash
# CI configuration
pnpm vitest run \
  --coverage \
  --coverage.thresholds.statements=70 \
  --coverage.thresholds.branches=65 \
  --coverage.thresholds.functions=75 \
  --coverage.thresholds.lines=70 \
  --reporter=junit \
  --outputFile=test-results.xml
```

### Exit Codes
| Code | Meaning |
|------|---------|
| 0 | All tests pass, coverage meets thresholds |
| 1 | Test failures |
| 2 | Coverage below thresholds |
| 3 | Configuration error |

---

## Watch Mode (`/test watch`)

Interactive watch mode for development:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  TEST WATCH MODE                                             /test watch     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Watching for changes...                                                     ║
║                                                                              ║
║  Tests:    245 passed, 0 failed                                              ║
║  Coverage: 84.2%                                                             ║
║  Time:     12.4s                                                             ║
║                                                                              ║
║  Press:                                                                      ║
║    a - run all tests                                                         ║
║    f - run only failed tests                                                 ║
║    u - update snapshots                                                      ║
║    p - filter by filename                                                    ║
║    t - filter by test name                                                   ║
║    q - quit                                                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Pattern Matching (`/test <pattern>`)

```bash
# Run tests in specific file
/test auth.test.ts

# Run tests matching pattern
/test "login"

# Run tests in directory
/test features/auth

# Run specific test
/test "should validate password strength"
```

---

## TDD Workflow

### RED Phase
```
/test watch

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

---

## Configuration

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/test-utils/**',
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 75,
        lines: 70,
      },
    },
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
  },
});
```

### playwright.config.ts
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'junit' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
```

---

## Integration with Gates

### Gate 3 Integration
```bash
# /gate-3 runs /test internally
/gate-3 story AUTH-BE-001
# Equivalent to: /test --ci + additional checks
```

### Gate 7 Integration
```bash
# /gate-7 verifies tests pass before merge
/gate-7 story AUTH-BE-001
# Includes: /test --ci as prerequisite
```

---

## Research Validation

This command follows industry testing best practices:

| Source | Type | URL |
|--------|------|-----|
| Vitest Documentation | Official | https://vitest.dev/ |
| Playwright Documentation | Official | https://playwright.dev/ |
| Testing Library | Best Practice | https://testing-library.com/ |
| Kent C. Dodds Testing | Best Practice | https://kentcdodds.com/blog/write-tests |
| Istanbul Coverage | Industry Standard | https://istanbul.js.org/ |

### Coverage Guidelines
- **70% minimum** is industry standard for production code
- **90%+ for critical paths** (auth, payments)
- **Focus on branch coverage** - it catches edge cases
- **Don't chase 100%** - diminishing returns after 85%

---

## Related Commands

| Command | Focus |
|---------|-------|
| `/gate-3` | Test verification gate |
| `/harden tests` | Test quality checks |
| `/ci` | CI/CD pipeline validation |
| `/tdd` | Test-driven development cycle |

