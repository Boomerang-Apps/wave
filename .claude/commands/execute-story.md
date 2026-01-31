# Execute Story: Full Wave V2 Protocol

Execute a story through all gates following the Wave V2 Aerospace Safety Protocol.

## Arguments
- `$ARGUMENTS` - Story ID (e.g., AUTH-BE-001)

## Purpose
Complete story execution from Gate 0 through Gate 7 with TDD, research validation, and full traceability.

## Prerequisites
- `.claude/config.json` exists (run `/wave-init` if not)
- Story file exists in `stories/wave{N}/`
- Gate 0 passed for the wave

## Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STORY EXECUTION: {STORY-ID}                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 0: PREPARATION                                                       │
│  ├── Load story from stories/wave{N}/{STORY-ID}.json                        │
│  ├── Validate Schema V4.1 compliance                                        │
│  ├── Verify research validation complete                                    │
│  ├── Check dependencies (blockedBy) resolved                                │
│  └── Create signal: signal-{STORY-ID}-started.json                          │
│                                                                             │
│  PHASE 1: BRANCHING                                                         │
│  ├── Determine agent workspace: workspace/{agent}                           │
│  ├── Fetch latest: git fetch origin                                         │
│  ├── Create feature branch: feature/{STORY-ID}                              │
│  └── Verify branch created                                                  │
│                                                                             │
│  PHASE 2: TDD IMPLEMENTATION (per AC)                                       │
│  │                                                                          │
│  │  For each Acceptance Criteria:                                           │
│  │  ┌─────────────────────────────────────────┐                             │
│  │  │  RED: Write failing test                │                             │
│  │  │  ├── Test references AC ID              │                             │
│  │  │  ├── Test follows EARS trigger/behavior │                             │
│  │  │  └── Run test, confirm FAIL             │                             │
│  │  │                                         │                             │
│  │  │  GREEN: Implement minimum code          │                             │
│  │  │  ├── Follow contracts exactly           │                             │
│  │  │  ├── Stay within ownedPaths             │                             │
│  │  │  └── Run test, confirm PASS             │                             │
│  │  │                                         │                             │
│  │  │  REFACTOR: Clean up                     │                             │
│  │  │  ├── Remove duplication                 │                             │
│  │  │  ├── Apply design patterns              │                             │
│  │  │  └── Run test, confirm still PASS       │                             │
│  │  └─────────────────────────────────────────┘                             │
│  │                                                                          │
│  └── Repeat for all ACs                                                     │
│                                                                             │
│  PHASE 3: GATES 1-3 (Self-Verification)                                     │
│  ├── Gate 1: Self-verify (ACs, contracts, ownership)                        │
│  ├── Gate 2: Build (compile, lint, security)                                │
│  └── Gate 3: Test (unit, coverage, integration)                             │
│                                                                             │
│  PHASE 4: QUALITY GATES                                                     │
│  ├── Gate 4: QA Acceptance (manual AC verification)                         │
│  ├── Gate 5: PM Validation (requirements met)                               │
│  └── Gate 6: Architecture Review (patterns, security)                       │
│                                                                             │
│  PHASE 5: MERGE                                                             │
│  ├── Gate 7: Merge Authorization                                            │
│  ├── Commit with traceability                                               │
│  ├── Push feature branch                                                    │
│  ├── Create/merge PR                                                        │
│  ├── Update traceability matrix                                             │
│  └── Create signal: signal-{STORY-ID}-complete.json                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Configuration
Commands auto-detected from project type or read from `.claude/config.json`:

```json
{
  "commands": {
    "install": "{package manager install}",
    "build": "{build command}",
    "test": "{test command}",
    "testCoverage": "{coverage command}",
    "lint": "{lint command}",
    "typeCheck": "{type check command}",
    "securityAudit": "{security audit command}"
  }
}
```

## Error Handling

If any gate fails:
1. Stop execution at current gate
2. Document failure with specific error
3. Create anomaly report if defect found
4. Provide remediation guidance
5. Do NOT proceed to next gate
6. After fix, re-run from failed gate

## Signal Files Created

| Signal | When |
|--------|------|
| `signal-{STORY-ID}-started.json` | Execution begins |
| `signal-{STORY-ID}-gate{N}-passed.json` | Each gate passes |
| `signal-anomaly-{ID}.json` | If anomaly found |
| `signal-{STORY-ID}-complete.json` | All gates pass |

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  STORY EXECUTION: {STORY-ID}                                                 ║
║  {Title}                                                                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  STORY INFO                                                                  ║
║  ──────────                                                                  ║
║  Wave: {N} | Agent: {agent} | DAL: {DAL-X} | Points: {N}                     ║
║  ACs: {N} | Status: {status}                                                 ║
║                                                                              ║
║  PHASE 0: PREPARATION                                         ✓ COMPLETE    ║
║  ├── Schema validation: ✓                                                   ║
║  ├── Research validation: ✓                                                 ║
║  └── Dependencies: ✓ (none blocked)                                         ║
║                                                                              ║
║  PHASE 1: BRANCHING                                           ✓ COMPLETE    ║
║  └── Branch: feature/{STORY-ID}                                             ║
║                                                                              ║
║  PHASE 2: TDD IMPLEMENTATION                                  → IN PROGRESS ║
║  ├── AC1: ✓ RED → GREEN → REFACTOR                                          ║
║  ├── AC2: ✓ RED → GREEN → REFACTOR                                          ║
║  ├── AC3: → RED (writing test...)                                           ║
║  └── AC4-N: pending                                                         ║
║                                                                              ║
║  PHASE 3: GATES 1-3                                           ○ PENDING     ║
║  PHASE 4: GATES 4-6                                           ○ PENDING     ║
║  PHASE 5: GATE 7 + MERGE                                      ○ PENDING     ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  CURRENT: Implementing AC3                                                   ║
║  NEXT: Complete TDD for remaining ACs                                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Completion Summary

When all gates pass:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  STORY COMPLETE: {STORY-ID}                                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  GATES PASSED                                                                ║
║  ────────────                                                                ║
║  ✓ Gate 0: Pre-flight         {timestamp}                                   ║
║  ✓ Gate 1: Self-verification  {timestamp}                                   ║
║  ✓ Gate 2: Build              {timestamp}                                   ║
║  ✓ Gate 3: Test               {timestamp}                                   ║
║  ✓ Gate 4: QA                 {timestamp}                                   ║
║  ✓ Gate 5: PM                 {timestamp}                                   ║
║  ✓ Gate 6: Architecture       {timestamp}                                   ║
║  ✓ Gate 7: Merge              {timestamp}                                   ║
║                                                                              ║
║  METRICS                                                                     ║
║  ───────                                                                     ║
║  Files: +{N} new, ~{N} modified                                              ║
║  Tests: {N} added                                                            ║
║  Coverage: {N}%                                                              ║
║  Time: {duration}                                                            ║
║                                                                              ║
║  ARTIFACTS                                                                   ║
║  ─────────                                                                   ║
║  Branch: feature/{STORY-ID} → merged to {target}                             ║
║  Commit: {hash}                                                              ║
║  Signal: .claude/signals/signal-{STORY-ID}-complete.json                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
