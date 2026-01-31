# Protocol Verify: Wave V2 Compliance Verification

Validate and summarize compliance with the Wave V2 Aerospace Safety Protocol.

## Arguments
- `$ARGUMENTS` - Scope: "story {ID}", "wave {N}", or "all"

## Purpose
Comprehensive audit of protocol compliance across all gates, ensuring Research, Branching, TDD, Coverage, QA, and all required elements are properly executed.

## Protocol Compliance Checklist

### Gate 0: Pre-Flight Authorization
```
□ PFC-A: Schema V4.1 compliance verified
□ PFC-B: DAL level assigned and appropriate
□ PFC-C: Contracts defined and documented
□ PFC-D: Path ownership declared (ownedPaths)
□ PFC-E: Dependencies mapped (soft and hard)
□ PFC-F: Security requirements documented
□ PFC-G: Test strategy defined
□ PFC-H: Rollback plan documented
□ PFC-I: Acceptance criteria in EARS format
□ PFC-J: Story points estimated (Fibonacci)
□ PFC-K: Research validation complete
```

### Research Validation (PFC-K)
```
□ researchValidation object present
□ At least 1 high-credibility source
□ Every AC has research backing (appliedToAC)
□ Industry standards documented (if applicable)
□ Local regulations checked (if applicable)
□ status: "validated"
□ validatedBy: agent name recorded
□ completedAt: timestamp recorded
```

### Branching & Version Control
```
□ Feature branch created: feature/{STORY-ID}
□ Branch from correct base (workspace/{agent})
□ Commits follow convention: {type}({scope}): {message}
□ Commit messages reference story ID
□ No direct commits to main/develop
□ PR created with proper template
```

### TDD Compliance (Per AC)
```
□ RED: Test written BEFORE implementation
□ RED: Test fails initially (confirmed)
□ GREEN: Minimum code to pass test
□ GREEN: Test passes (confirmed)
□ REFACTOR: Code cleaned up
□ REFACTOR: Test still passes (confirmed)
□ Test references AC ID in description/name
□ Test follows EARS trigger/behavior
```

### Coverage Requirements
```
□ Unit test coverage meets threshold (DAL-based)
□ Branch coverage adequate
□ Critical paths tested
□ Edge cases covered
□ Error scenarios tested
□ Coverage report generated
```

### Milestone & Tagging
```
□ Gate passage signals created
□ Signal files properly formatted
□ Timestamps recorded
□ Agent attribution recorded
□ Anomalies logged if found
```

### Rollback Readiness
```
□ Rollback plan documented in story
□ Rollback triggers defined
□ Rollback procedure clear
□ Data migration reversible (if applicable)
□ Feature flags in place (if applicable)
```

## Verification Execution

### 1. Collect Evidence
```
For each story in scope:
├── Load story JSON
├── Check signal files in .claude/signals/
├── Analyze git history (branches, commits, PRs)
├── Scan test files for AC references
├── Check coverage reports
└── Verify traceability matrix
```

### 2. Score Each Category
```
Score = (Passed Checks / Total Checks) × 100%

Categories:
├── Gate 0 Pre-Flight: /11 checks
├── Research Validation: /8 checks
├── Branching: /6 checks
├── TDD Compliance: /8 checks per AC
├── Coverage: /5 checks
├── Milestones: /5 checks
└── Rollback: /5 checks
```

### 3. Calculate Overall Compliance
```
Overall = Weighted Average of Categories

Weights (DAL-dependent):
├── DAL-A/B: Higher weight on TDD, Coverage, Research
├── DAL-C: Balanced weights
└── DAL-D/E: Higher weight on basic compliance
```

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  PROTOCOL COMPLIANCE VERIFICATION: {scope}                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  EXECUTIVE SUMMARY                                                           ║
║  ─────────────────                                                           ║
║  Overall Compliance: 94% ████████████████████░░░░                            ║
║  Stories Verified: {N}                                                       ║
║  Gates Audited: {N}                                                          ║
║  Issues Found: {N} (Critical: {N}, Warning: {N})                             ║
║                                                                              ║
║  CATEGORY BREAKDOWN                                                          ║
║  ──────────────────                                                          ║
║                                                                              ║
║  Gate 0 Pre-Flight:     ████████████████████ 100% (11/11)                    ║
║  ├── Schema V4.1: ✓                                                          ║
║  ├── DAL Assignment: ✓                                                       ║
║  ├── Contracts: ✓                                                            ║
║  ├── Path Ownership: ✓                                                       ║
║  ├── Dependencies: ✓                                                         ║
║  ├── Security: ✓                                                             ║
║  ├── Test Strategy: ✓                                                        ║
║  ├── Rollback Plan: ✓                                                        ║
║  ├── EARS Format: ✓                                                          ║
║  ├── Story Points: ✓                                                         ║
║  └── Research: ✓                                                             ║
║                                                                              ║
║  Research Validation:   ████████████████████ 100% (8/8)                      ║
║  ├── researchValidation present: ✓                                           ║
║  ├── High-credibility source: ✓                                              ║
║  ├── AC coverage: ✓ (all ACs backed)                                         ║
║  ├── Industry standards: ✓                                                   ║
║  ├── Local regulations: ✓ (N/A)                                              ║
║  ├── Status validated: ✓                                                     ║
║  ├── Validator recorded: ✓                                                   ║
║  └── Timestamp recorded: ✓                                                   ║
║                                                                              ║
║  Branching & VCS:       ████████████████░░░░  83% (5/6)                      ║
║  ├── Feature branch: ✓ feature/AUTH-BE-001                                   ║
║  ├── Correct base: ✓ workspace/be-dev                                        ║
║  ├── Commit convention: ✓                                                    ║
║  ├── Story ID in commits: ✓                                                  ║
║  ├── No direct commits: ✓                                                    ║
║  └── PR created: ⚠ Not yet created                                           ║
║                                                                              ║
║  TDD Compliance:        ████████████████████ 100% (72/72)                    ║
║  ├── AC1: RED ✓ → GREEN ✓ → REFACTOR ✓                                       ║
║  ├── AC2: RED ✓ → GREEN ✓ → REFACTOR ✓                                       ║
║  ├── AC3: RED ✓ → GREEN ✓ → REFACTOR ✓                                       ║
║  └── ... (all ACs verified)                                                  ║
║                                                                              ║
║  Coverage:              ████████████████░░░░  85% (4/5)                      ║
║  ├── Unit coverage: ✓ 92% (threshold: 80%)                                   ║
║  ├── Branch coverage: ✓ 78%                                                  ║
║  ├── Critical paths: ✓                                                       ║
║  ├── Edge cases: ⚠ 2 edge cases missing tests                                ║
║  └── Error scenarios: ✓                                                      ║
║                                                                              ║
║  Milestones & Signals:  ████████████████████ 100% (5/5)                      ║
║  ├── signal-AUTH-BE-001-started.json: ✓                                      ║
║  ├── signal-AUTH-BE-001-gate0-passed.json: ✓                                 ║
║  ├── signal-AUTH-BE-001-gate1-passed.json: ✓                                 ║
║  ├── signal-AUTH-BE-001-gate2-passed.json: ✓                                 ║
║  └── signal-AUTH-BE-001-gate3-passed.json: ✓                                 ║
║                                                                              ║
║  Rollback Readiness:    ████████████████████ 100% (5/5)                      ║
║  ├── Plan documented: ✓                                                      ║
║  ├── Triggers defined: ✓                                                     ║
║  ├── Procedure clear: ✓                                                      ║
║  ├── Data reversible: ✓ (N/A)                                                ║
║  └── Feature flags: ✓ (N/A)                                                  ║
║                                                                              ║
║  ISSUES REQUIRING ATTENTION                                                  ║
║  ──────────────────────────                                                  ║
║  ⚠ AUTH-BE-001: PR not yet created for merge                                 ║
║  ⚠ AUTH-BE-001: 2 edge cases missing test coverage                           ║
║                                                                              ║
║  PROTOCOL TIMELINE                                                           ║
║  ─────────────────                                                           ║
║  Gate 0: 2024-01-15 10:00:00 ✓                                               ║
║  Gate 1: 2024-01-15 14:30:00 ✓                                               ║
║  Gate 2: 2024-01-15 15:00:00 ✓                                               ║
║  Gate 3: 2024-01-15 16:30:00 ✓                                               ║
║  Gate 4: pending                                                             ║
║  Gate 5: pending                                                             ║
║  Gate 6: pending                                                             ║
║  Gate 7: pending                                                             ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  COMPLIANCE STATUS: 94% - GOOD                                               ║
║  Action: Address 2 warnings before proceeding to Gate 4                      ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Compliance Thresholds

| Score | Status | Gate Progression |
|-------|--------|------------------|
| 95-100% | Excellent | Proceed to next gate |
| 85-94% | Good | Proceed with noted warnings |
| 70-84% | Fair | Address issues before proceeding |
| <70% | Poor | STOP - Major remediation required |

## Evidence Artifacts

The verification collects evidence from:

```
Evidence Sources:
├── stories/wave{N}/{STORY-ID}.json    # Story definition
├── .claude/signals/                    # Gate passage signals
├── .claude/config.json                 # Project configuration
├── planning/traceability/              # Traceability matrix
├── git log --oneline                   # Commit history
├── git branch -a                       # Branch structure
├── {test-dir}/**/*.test.*             # Test files
├── coverage/                           # Coverage reports
└── planning/rlm/                       # RLM artifacts
```

## Audit Trail

Each verification creates an audit record:

```json
{
  "auditId": "AUDIT-{timestamp}",
  "scope": "{scope}",
  "verifiedAt": "ISO datetime",
  "verifiedBy": "cto",
  "overallScore": 94,
  "categories": {
    "gate0": { "score": 100, "passed": 11, "total": 11 },
    "research": { "score": 100, "passed": 8, "total": 8 },
    "branching": { "score": 83, "passed": 5, "total": 6 },
    "tdd": { "score": 100, "passed": 72, "total": 72 },
    "coverage": { "score": 85, "passed": 4, "total": 5 },
    "milestones": { "score": 100, "passed": 5, "total": 5 },
    "rollback": { "score": 100, "passed": 5, "total": 5 }
  },
  "issues": [...],
  "evidence": [...]
}
```
