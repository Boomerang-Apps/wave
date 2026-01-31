# TDD: Test-Driven Development Cycle

Execute the RED-GREEN-REFACTOR TDD cycle for acceptance criteria.

## Arguments
- `$ARGUMENTS` - Target: "{STORY-ID}" or "{STORY-ID}/AC{N}"

## Purpose
Enforce strict TDD discipline: write tests first, implement minimum code, then refactor.

## TDD Cycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TDD CYCLE: RED → GREEN → REFACTOR                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     ┌─────────┐                                                             │
│     │   RED   │  Write a failing test                                       │
│     │  (FAIL) │  - Test doesn't exist yet                                   │
│     └────┬────┘  - Run test, confirm it FAILS                               │
│          │                                                                  │
│          ▼                                                                  │
│     ┌─────────┐                                                             │
│     │  GREEN  │  Write minimum code to pass                                 │
│     │  (PASS) │  - Only enough to make test pass                            │
│     └────┬────┘  - Run test, confirm it PASSES                              │
│          │                                                                  │
│          ▼                                                                  │
│     ┌─────────┐                                                             │
│     │REFACTOR │  Clean up the code                                          │
│     │  (PASS) │  - Remove duplication                                       │
│     └────┬────┘  - Run test, confirm still PASSES                           │
│          │                                                                  │
│          └──────────► Next AC                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## TDD Rules

### RED Phase
```
□ Write test BEFORE any implementation
□ Test must reference AC ID (in describe/it block or comment)
□ Test must follow EARS pattern (trigger → behavior)
□ Test must FAIL when first run
□ Test failure must be for the RIGHT reason (not syntax error)
```

### GREEN Phase
```
□ Write MINIMUM code to pass test
□ No extra features or "just in case" code
□ Stay within story's ownedPaths
□ Follow existing contracts exactly
□ Test must PASS after implementation
```

### REFACTOR Phase
```
□ Remove code duplication
□ Improve naming and readability
□ Extract common patterns
□ Apply design patterns if appropriate
□ Test must still PASS after refactoring
```

## EARS to Test Mapping

Transform EARS acceptance criteria into tests:

```
AC: "WHEN user submits registration form with valid data
     THEN create user account and return 201 status"

Test:
describe('User Registration (AUTH-BE-001)', () => {
  it('AC1: should create user and return 201 when valid data submitted', async () => {
    // WHEN: trigger
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(validUserData);

    // THEN: behavior
    expect(response.status).toBe(201);
    expect(await User.findByEmail(validUserData.email)).toBeTruthy();
  });
});
```

## Execution Workflow

### For Single AC: `/tdd AUTH-BE-001/AC1`

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  TDD CYCLE: AUTH-BE-001/AC1                                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ACCEPTANCE CRITERIA                                                         ║
║  ───────────────────                                                         ║
║  AC1: WHEN user submits registration form with valid data                    ║
║       THEN create user account and return 201 status                         ║
║                                                                              ║
║  PHASE 1: RED                                                    → ACTIVE   ║
║  ─────────────                                                               ║
║  □ Create test file (if not exists)                                          ║
║  □ Write test for AC1                                                        ║
║  □ Run test                                                                  ║
║  □ Confirm test FAILS                                                        ║
║                                                                              ║
║  Test Location: src/services/auth/__tests__/register.test.ts                 ║
║                                                                              ║
║  Test Code:                                                                  ║
║  ┌────────────────────────────────────────────────────────────────────────┐ ║
║  │ describe('User Registration (AUTH-BE-001)', () => {                    │ ║
║  │   it('AC1: creates user and returns 201 for valid data', async () => { │ ║
║  │     const response = await request(app)                                │ ║
║  │       .post('/api/v1/auth/register')                                   │ ║
║  │       .send({                                                          │ ║
║  │         email: 'test@example.com',                                     │ ║
║  │         password: 'SecurePass123!',                                    │ ║
║  │         name: 'Test User'                                              │ ║
║  │       });                                                              │ ║
║  │                                                                        │ ║
║  │     expect(response.status).toBe(201);                                 │ ║
║  │     expect(response.body.user.email).toBe('test@example.com');         │ ║
║  │   });                                                                  │ ║
║  │ });                                                                    │ ║
║  └────────────────────────────────────────────────────────────────────────┘ ║
║                                                                              ║
║  Test Result: ✗ FAILED (expected)                                            ║
║  └── Error: Cannot POST /api/v1/auth/register                                ║
║                                                                              ║
║  PHASE 2: GREEN                                                  ○ PENDING  ║
║  ───────────────                                                             ║
║  □ Implement registration endpoint                                           ║
║  □ Run test                                                                  ║
║  □ Confirm test PASSES                                                       ║
║                                                                              ║
║  PHASE 3: REFACTOR                                               ○ PENDING  ║
║  ─────────────────                                                           ║
║  □ Review implementation for improvements                                    ║
║  □ Apply refactoring (if any)                                                ║
║  □ Run test                                                                  ║
║  □ Confirm test still PASSES                                                 ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  CURRENT: RED phase - Test written and failing                               ║
║  NEXT: Implement minimum code to make test pass                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### For Full Story: `/tdd AUTH-BE-001`

Runs TDD cycle for all ACs in sequence:
1. Load story and list all ACs
2. For each AC: RED → GREEN → REFACTOR
3. Track progress and results

## Test File Conventions

### File Naming (Project-Agnostic)
```
Source File              Test File
────────────             ─────────
{name}.ts               {name}.test.ts      (TypeScript)
{name}.js               {name}.test.js      (JavaScript)
{name}.py               test_{name}.py      (Python)
{name}.go               {name}_test.go      (Go)
{name}.rs               {name}_test.rs      (Rust - in tests/)
```

### Test Organization
```
describe('{Story ID} - {Story Title}', () => {
  describe('{AC ID}', () => {
    it('should {expected behavior} when {trigger}', () => {
      // Test implementation
    });
  });
});
```

## Coverage Requirements by DAL

| DAL Level | Statement | Branch | Function | Line |
|-----------|-----------|--------|----------|------|
| DAL-A | 100% | 100% | 100% | 100% |
| DAL-B | 95% | 90% | 100% | 95% |
| DAL-C | 90% | 85% | 95% | 90% |
| DAL-D | 80% | 75% | 90% | 80% |
| DAL-E | 70% | 60% | 80% | 70% |

## TDD Verification Checklist

After completing TDD for all ACs:

```
□ All ACs have corresponding tests
□ All tests have AC ID in name/description
□ All tests follow EARS trigger/behavior pattern
□ Coverage meets DAL requirements
□ No implementation code without test
□ Tests are independent (no shared state)
□ Tests run fast (<5 seconds per test)
□ Tests are deterministic (same result every run)
```

## Output Summary

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  TDD COMPLETE: AUTH-BE-001                                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  RESULTS                                                                     ║
║  ───────                                                                     ║
║  AC1: ✓ RED → GREEN → REFACTOR                                               ║
║  AC2: ✓ RED → GREEN → REFACTOR                                               ║
║  AC3: ✓ RED → GREEN → REFACTOR                                               ║
║  AC4: ✓ RED → GREEN → REFACTOR                                               ║
║  AC5: ✓ RED → GREEN → REFACTOR                                               ║
║                                                                              ║
║  COVERAGE                                                                    ║
║  ────────                                                                    ║
║  Statements: 94% (target: 90%)  ✓                                            ║
║  Branches:   88% (target: 85%)  ✓                                            ║
║  Functions:  100% (target: 95%) ✓                                            ║
║  Lines:      93% (target: 90%)  ✓                                            ║
║                                                                              ║
║  FILES CREATED/MODIFIED                                                      ║
║  ─────────────────────                                                       ║
║  + src/services/auth/__tests__/register.test.ts (new)                        ║
║  + src/services/auth/register.ts (new)                                       ║
║  ~ src/routes/auth.ts (modified)                                             ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  TDD VERIFIED: All ACs covered, coverage thresholds met                      ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
