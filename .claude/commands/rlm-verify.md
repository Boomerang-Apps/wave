# RLM Verify: Requirements Lifecycle Management Verification

Verify complete requirements traceability from PRD to implementation.

## Arguments
- `$ARGUMENTS` - Scope: "all", "wave {N}", or Story ID

## Purpose
Validate bidirectional traceability across all requirement levels per aerospace RLM standards.

## RLM Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REQUIREMENTS LIFECYCLE MANAGEMENT (RLM)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  L0: PRD (Product Requirements Document)                                    │
│  │   Business needs, user goals, market requirements                        │
│  │                                                                          │
│  └─► L1: EPIC (Feature Area)                                                │
│      │   High-level capability grouping                                     │
│      │                                                                      │
│      └─► L2: STORY (User Story)                                             │
│          │   Implementable unit of work                                     │
│          │                                                                  │
│          └─► L3: AC (Acceptance Criteria)                                   │
│              │   EARS format: WHEN x THEN y                                 │
│              │                                                              │
│              └─► L4: TEST (Test Cases)                                      │
│                  │   Unit, integration, E2E tests                           │
│                  │                                                          │
│                  └─► L5: CODE (Implementation)                              │
│                      Source code, configurations                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Verification Checks

### Forward Traceability (Top-Down)
```
□ L0→L1: Every PRD section maps to at least one Epic
□ L1→L2: Every Epic decomposes into Stories
□ L2→L3: Every Story has Acceptance Criteria
□ L3→L4: Every AC has Test Case(s)
□ L4→L5: Every Test has implementing Code
```

### Backward Traceability (Bottom-Up)
```
□ L5→L4: All Code is covered by Tests
□ L4→L3: All Tests trace to ACs
□ L3→L2: All ACs belong to Stories
□ L2→L1: All Stories belong to Epics
□ L1→L0: All Epics trace to PRD sections
```

### Orphan Detection
```
□ No code without test coverage
□ No tests without AC reference
□ No ACs without story
□ No stories without epic
□ No epics without PRD section
```

## RLM States

| State | Description | Transition |
|-------|-------------|------------|
| DRAFT | Initial creation | Author creates |
| BASELINED | Approved for implementation | CTO approves (Gate 0) |
| IMPLEMENTED | Code complete | Agent implements |
| VERIFIED | Tests pass | QA verifies (Gate 4) |
| VALIDATED | Requirements met | PM validates (Gate 5) |

## Execution

### 1. Load Requirements Registry
Read `planning/rlm/requirements-registry.json`

### 2. Scan Artifacts
- Stories: `stories/wave*/`
- Tests: configured test directory
- Code: configured source directory
- Traceability: `planning/traceability/`

### 3. Build Traceability Graph
```
PRD Section 3.1 → EPIC-AUTH → AUTH-BE-001 → AC1 → TEST-001 → auth.ts:login()
                           → AUTH-BE-002 → AC1 → TEST-002 → register.ts:create()
                                         → AC2 → TEST-003 → register.ts:validate()
```

### 4. Identify Gaps
- Missing links at each level
- Orphaned artifacts
- Incomplete coverage

### 5. Calculate Metrics

```
Coverage Metrics:
├── Forward Coverage: (linked items / total items) × 100%
├── Backward Coverage: (traced items / total items) × 100%
├── Orphan Rate: (orphaned items / total items) × 100%
└── Overall RLM Score: weighted average
```

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  RLM VERIFICATION: {scope}                                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  FORWARD TRACEABILITY (PRD → Code)                                           ║
║  ─────────────────────────────────                                           ║
║  L0→L1 (PRD→Epic):     ████████████████████ 100% (5/5 sections)              ║
║  L1→L2 (Epic→Story):   ████████████████████ 100% (62/62 stories)             ║
║  L2→L3 (Story→AC):     ████████████████████ 100% (312/312 ACs)               ║
║  L3→L4 (AC→Test):      ████████████░░░░░░░░  65% (203/312 tests)             ║
║  L4→L5 (Test→Code):    ████████████████░░░░  80% (162/203 linked)            ║
║                                                                              ║
║  BACKWARD TRACEABILITY (Code → PRD)                                          ║
║  ──────────────────────────────────                                          ║
║  L5→L4 (Code→Test):    ████████████████░░░░  82% coverage                    ║
║  L4→L3 (Test→AC):      ████████████████████ 100% all tests traced            ║
║  L3→L2 (AC→Story):     ████████████████████ 100% all ACs in stories          ║
║  L2→L1 (Story→Epic):   ████████████████████ 100% all stories in epics        ║
║  L1→L0 (Epic→PRD):     ████████████████████ 100% all epics traced            ║
║                                                                              ║
║  ORPHAN ANALYSIS                                                             ║
║  ───────────────                                                             ║
║  Orphaned Code: 12 functions (no test coverage)                              ║
║  Orphaned Tests: 0                                                           ║
║  Orphaned ACs: 0                                                             ║
║                                                                              ║
║  RLM STATE DISTRIBUTION                                                      ║
║  ─────────────────────                                                       ║
║  DRAFT:        ░░░░░░░░░░░░░░░░░░░░   0 stories                              ║
║  BASELINED:    ████░░░░░░░░░░░░░░░░  12 stories                              ║
║  IMPLEMENTED:  ████████░░░░░░░░░░░░  25 stories                              ║
║  VERIFIED:     ████████████░░░░░░░░  15 stories                              ║
║  VALIDATED:    ████████████████████  10 stories                              ║
║                                                                              ║
║  GAPS REQUIRING ATTENTION                                                    ║
║  ────────────────────────                                                    ║
║  1. AUTH-BE-003/AC5: Missing test case                                       ║
║  2. PROF-BE-001/AC2-AC4: Tests not linked to code                            ║
║  3. 12 utility functions: No test coverage                                   ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RLM SCORE: 87% (Good)                                                       ║
║  Status: PASS with gaps to address                                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## RLM Score Interpretation

| Score | Status | Action |
|-------|--------|--------|
| 95-100% | Excellent | Ready for certification |
| 85-94% | Good | Minor gaps to address |
| 70-84% | Fair | Significant gaps, remediate |
| <70% | Poor | Major remediation required |
