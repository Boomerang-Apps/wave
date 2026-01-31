# Trace: View/Update Traceability Matrix

View or update the requirements traceability matrix.

## Arguments
- `$ARGUMENTS` - Story ID, Wave, or "all" (e.g., "AUTH-BE-001", "wave 1", "all")

## Purpose
Maintain bidirectional traceability from requirements to implementation.

## Traceability Levels

```
L0: PRD (Business Requirements)
 │
 └─► L1: Epic (Feature Area)
      │
      └─► L2: Story (User Story)
           │
           └─► L3: AC (Acceptance Criteria)
                │
                └─► L4: Test (Test Cases)
                     │
                     └─► L5: Code (Implementation)
```

## Matrix Structure

```json
{
  "storyId": "{STORY-ID}",
  "epic": "{EPIC-ID}",
  "prdSections": ["3.1.1", "3.1.2"],
  "acceptanceCriteria": [
    {
      "acId": "AC1",
      "requirement": "{requirement text}",
      "testCases": ["TEST-{ID}-01", "TEST-{ID}-02"],
      "codeArtifacts": ["src/path/to/file.ts:functionName"],
      "status": "PENDING|IMPLEMENTED|VERIFIED"
    }
  ]
}
```

## Execution

### View Mode
Display current traceability for scope:
- Show L0→L5 links
- Highlight gaps (missing tests, code)
- Calculate coverage percentage

### Update Mode
After implementation:
1. Link test files to ACs
2. Link code files/functions to ACs
3. Update status to IMPLEMENTED
4. After QA: Update to VERIFIED

## Coverage Metrics

```
Traceability Coverage = (ACs with complete L2→L5) / (Total ACs) × 100%
```

| Coverage | Status |
|----------|--------|
| 100% | Complete ✓ |
| 80-99% | Gaps to address |
| <80% | Significant gaps |

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  TRACEABILITY MATRIX: {scope}                                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  STORY: AUTH-BE-001 - Supabase Auth Configuration                            ║
║  ─────────────────────────────────────────────────                           ║
║  PRD: Section 3.1.1 (Authentication Architecture)                            ║
║  Epic: EPIC-AUTH                                                             ║
║                                                                              ║
║  AC1: auth.users table exists                                                ║
║  ├─ Tests: TEST-AUTH-001-01 ✓                                                ║
║  ├─ Code: supabase/migrations/001_schema.sql ✓                               ║
║  └─ Status: VERIFIED ✓                                                       ║
║                                                                              ║
║  AC2: users table matches interface                                          ║
║  ├─ Tests: TEST-AUTH-001-02 ✓                                                ║
║  ├─ Code: supabase/migrations/001_schema.sql ✓                               ║
║  └─ Status: VERIFIED ✓                                                       ║
║                                                                              ║
║  AC3: RLS policies applied                                                   ║
║  ├─ Tests: ✗ MISSING                                                         ║
║  ├─ Code: supabase/migrations/002_rls.sql ✓                                  ║
║  └─ Status: IMPLEMENTED (needs test)                                         ║
║                                                                              ║
║  COVERAGE                                                                    ║
║  ────────                                                                    ║
║  Total ACs: 9                                                                ║
║  With Tests: 8 (89%)                                                         ║
║  With Code: 9 (100%)                                                         ║
║  Verified: 7 (78%)                                                           ║
║                                                                              ║
║  GAPS                                                                        ║
║  ────                                                                        ║
║  • AC3: Missing test case                                                    ║
║  • AC7, AC8: Pending verification                                            ║
║                                                                              ║
║  File: planning/traceability/{wave}-traceability-matrix.json                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
