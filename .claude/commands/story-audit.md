# Story Audit: Post-Completion Schema V4.1 Compliance

## Command
`/story-audit [scope]`

## Arguments
- `$ARGUMENTS` - Scope (optional, defaults to current wave):
  - `wave <N>` - All completed stories in wave N
  - `wave all` - All completed stories across all waves
  - `<STORY-ID>` - Specific story (e.g., AUTH-BE-001)
  - `<ID1> <ID2> ...` - Multiple specific stories
  - `recent` - Stories completed in last 7 days
  - `today` - Stories completed today
  - (no argument) - Current wave's completed stories

## Examples
```bash
/story-audit                      # Current wave completed stories
/story-audit wave 1               # All completed in Wave 1
/story-audit wave 2               # All completed in Wave 2
/story-audit wave all             # All completed across all waves
/story-audit AUTH-BE-001          # Single story
/story-audit AUTH-BE-001 UI-FE-003 PAY-BE-002   # Multiple stories
/story-audit recent               # Last 7 days
/story-audit today                # Today only
```

## Purpose
Verify that **completed story implementations** match their Schema V4.1 definitions. Post-implementation audit ensuring work delivered matches specifications.

## When to Use
- After marking stories as "complete"
- Before Gate 5 (PM Validation)
- Before Gate 7 (Merge Authorization)
- End of wave review
- During retrospectives
- When QA reports discrepancies

## Difference from /schema-validate

| Command | When | What |
|---------|------|------|
| `/schema-validate` | Before implementation | Validates story JSON structure |
| `/story-audit` | After implementation | Validates implementation matches story |

---

## Audit Phases

### Phase 1: Story Schema Compliance
```yaml
checks:
  - Story JSON valid against Schema V4.1
  - All 21 required fields present
  - EARS format correct for all ACs
  - Research validation documented
status: PASS | FAIL
```

### Phase 2: Acceptance Criteria Verification
```yaml
for_each_ac:
  - AC defined in story JSON
  - Implementation exists (code changes)
  - Test exists covering this AC
  - Test passes
  - AC marked complete in story

output:
  AC1: { defined: ✓, implemented: ✓, tested: ✓, passing: ✓ }
  AC2: { defined: ✓, implemented: ✓, tested: ✓, passing: ✓ }
  AC3: { defined: ✓, implemented: ✗, tested: ✗, passing: - }
```

### Phase 3: Contract Verification
```yaml
checks:
  - All contracts[] paths exist
  - Contract interfaces implemented
  - No breaking changes to existing contracts
  - Types exported correctly
```

### Phase 4: Owned Paths Verification
```yaml
checks:
  - All ownedPaths[] modified in this story
  - No files modified outside ownedPaths (unless dependency)
  - Domain ownership respected
```

### Phase 5: Test Coverage Audit
```yaml
checks:
  - testStrategy.unitTests implemented
  - testStrategy.integrationTests implemented (if specified)
  - testStrategy.e2eTests implemented (if specified)
  - Coverage meets testStrategy.minimumCoverage threshold
  - All tests passing
```

### Phase 6: Research Application Audit
```yaml
checks:
  - Each source in researchValidation.sources:
    - Has appliedToAC references
    - Those ACs show evidence of research application
    - Implementation follows keyInsights
  - Industry standards applied (if documented)
  - Local regulations followed (if documented)
```

### Phase 7: Security Requirements Audit
```yaml
checks:
  - securityRequirements.authentication implemented
  - securityRequirements.authorization (RLS) applied
  - securityRequirements.dataProtection followed
  - No secrets in code
  - OWASP top 10 addressed
```

### Phase 8: Rollback Plan Verification
```yaml
checks:
  - rollbackPlan documented
  - Rollback commands valid
  - Trigger conditions defined
  - Tested in staging (if applicable)
```

---

## Output Format

### Wave-Level Summary (when auditing multiple stories)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  STORY AUDIT: Wave {N} Summary                                               ║
║  Post-Completion Schema V4.1 Compliance                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  AUDIT SCOPE                                                                 ║
║  ───────────                                                                 ║
║  Wave: {N}                                                                   ║
║  Stories Found: {total}                                                      ║
║  Completed: {completed}                                                      ║
║  In Progress: {in_progress} (skipped)                                        ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  WAVE AUDIT RESULTS                                                          ║
║  ─────────────────                                                           ║
║                                                                              ║
║  │ Story ID      │ Title                    │ Score │ Status  │             ║
║  │───────────────│──────────────────────────│───────│─────────│             ║
║  │ AUTH-BE-001   │ User Login Flow          │  97%  │ ✓ PASS  │             ║
║  │ AUTH-BE-002   │ Password Reset           │ 100%  │ ✓ PASS  │             ║
║  │ AUTH-BE-003   │ Session Management       │  95%  │ ✓ PASS  │             ║
║  │ UI-FE-001     │ Login Page Component     │  92%  │ ⚠ WARN  │             ║
║  │ UI-FE-002     │ Dashboard Layout         │  88%  │ ⚠ WARN  │             ║
║  │ PAY-BE-001    │ Payment Processing       │  45%  │ ✗ FAIL  │             ║
║                                                                              ║
║  SUMMARY                                                                     ║
║  ───────                                                                     ║
║  ✓ Passed:  3 stories (50%)                                                  ║
║  ⚠ Warning: 2 stories (33%)                                                  ║
║  ✗ Failed:  1 story  (17%)                                                   ║
║                                                                              ║
║  Wave Compliance Score: 86%                                                  ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ISSUES REQUIRING ATTENTION                                                  ║
║  ─────────────────────────                                                   ║
║                                                                              ║
║  PAY-BE-001 (FAILED - 45%):                                                  ║
║  • AC3: Not implemented                                                      ║
║  • AC5: Test failing                                                         ║
║  • Research: No sources documented                                           ║
║                                                                              ║
║  UI-FE-001 (WARNING - 92%):                                                  ║
║  • Research: Source 2 application unclear                                    ║
║                                                                              ║
║  UI-FE-002 (WARNING - 88%):                                                  ║
║  • Modified file outside ownedPaths (needs CTO approval)                     ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  GATE READINESS                                                              ║
║  ──────────────                                                              ║
║  Gate 5 (PM):    ⚠ 5/6 ready (PAY-BE-001 blocking)                          ║
║  Gate 7 (Merge): ⚠ 3/6 ready (3 stories need attention)                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Single Story Detail (when auditing specific story)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  STORY AUDIT: {STORY-ID}                                                     ║
║  Post-Completion Schema V4.1 Compliance                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  STORY: {title}                                                              ║
║  Status: {status}                                                            ║
║  Agent: {agent}                                                              ║
║  Wave: {wave}                                                                ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PHASE 1: Schema Compliance                                    ✓ PASS        ║
║  ─────────────────────────────────────────────────────────────────────────   ║
║  • JSON valid against Schema V4.1                                            ║
║  • 21/21 required fields present                                             ║
║  • 9/9 ACs in EARS format                                                    ║
║  • Research validation: 5 sources documented                                 ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PHASE 2: Acceptance Criteria                                  ✓ PASS        ║
║  ─────────────────────────────────────────────────────────────────────────   ║
║                                                                              ║
║  │ AC  │ Defined │ Implemented │ Tested │ Passing │ Status │                ║
║  │─────│─────────│─────────────│────────│─────────│────────│                ║
║  │ AC1 │    ✓    │      ✓      │   ✓    │    ✓    │ PASS   │                ║
║  │ AC2 │    ✓    │      ✓      │   ✓    │    ✓    │ PASS   │                ║
║  │ AC3 │    ✓    │      ✓      │   ✓    │    ✓    │ PASS   │                ║
║  │ AC4 │    ✓    │      ✓      │   ✓    │    ✓    │ PASS   │                ║
║  │ AC5 │    ✓    │      ✓      │   ✓    │    ✓    │ PASS   │                ║
║  │ AC6 │    ✓    │      ✓      │   ✓    │    ✓    │ PASS   │                ║
║  │ AC7 │    ✓    │      ✓      │   ✓    │    ✓    │ PASS   │                ║
║  │ AC8 │    ✓    │      ✓      │   ✓    │    ✓    │ PASS   │                ║
║  │ AC9 │    ✓    │      ✓      │   ✓    │    ✓    │ PASS   │                ║
║                                                                              ║
║  Coverage: 9/9 ACs (100%)                                                    ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PHASE 3: Contract Verification                                ✓ PASS        ║
║  ─────────────────────────────────────────────────────────────────────────   ║
║  • contracts/auth/login.contract.ts: ✓ exists, ✓ implemented                 ║
║  • contracts/auth/session.contract.ts: ✓ exists, ✓ implemented               ║
║  • No breaking changes detected                                              ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PHASE 4: Owned Paths                                          ✓ PASS        ║
║  ─────────────────────────────────────────────────────────────────────────   ║
║  • src/features/auth/**: 12 files modified ✓                                 ║
║  • supabase/functions/auth-**: 3 files modified ✓                            ║
║  • No modifications outside owned paths                                      ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PHASE 5: Test Coverage                                        ✓ PASS        ║
║  ─────────────────────────────────────────────────────────────────────────   ║
║  • Unit tests: 24 tests ✓                                                    ║
║  • Integration tests: 8 tests ✓                                              ║
║  • E2E tests: 3 tests ✓                                                      ║
║  • Coverage: 87% (threshold: 70%) ✓                                          ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PHASE 6: Research Application                                 ⚠ WARNING     ║
║  ─────────────────────────────────────────────────────────────────────────   ║
║  • Source 1 (Supabase Auth Docs): Applied to AC1, AC2, AC3 ✓                 ║
║  • Source 2 (OWASP Auth Guidelines): Applied to AC4, AC5 ✓                   ║
║  • Source 3 (Israeli Privacy Law): Applied to AC6 ✓                          ║
║  • Source 4 (JWT Best Practices): Applied to AC7, AC8 ✓                      ║
║  • Source 5 (Rate Limiting): ⚠ No clear evidence of application              ║
║                                                                              ║
║  Warning: Source 5 documented but implementation evidence unclear            ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PHASE 7: Security Requirements                                ✓ PASS        ║
║  ─────────────────────────────────────────────────────────────────────────   ║
║  • Authentication: Supabase GoTrue ✓                                         ║
║  • Authorization: RLS policies applied ✓                                     ║
║  • Data protection: PII handling correct ✓                                   ║
║  • No secrets in code ✓                                                      ║
║  • OWASP checks passed ✓                                                     ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  PHASE 8: Rollback Plan                                        ✓ PASS        ║
║  ─────────────────────────────────────────────────────────────────────────   ║
║  • Rollback method: git checkout ✓                                           ║
║  • Commands documented ✓                                                     ║
║  • Trigger conditions defined ✓                                              ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  AUDIT RESULT: ✓ PASS (1 warning)                                            ║
║                                                                              ║
║  Compliance Score: 97/100                                                    ║
║  • Schema: 100%                                                              ║
║  • ACs: 100%                                                                 ║
║  • Contracts: 100%                                                           ║
║  • Paths: 100%                                                               ║
║  • Tests: 100%                                                               ║
║  • Research: 90% (1 source unclear)                                          ║
║  • Security: 100%                                                            ║
║  • Rollback: 100%                                                            ║
║                                                                              ║
║  Gate Readiness:                                                             ║
║  • Gate 5 (PM): ✓ Ready                                                      ║
║  • Gate 7 (Merge): ✓ Ready                                                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Failure Examples

### Missing AC Implementation
```
PHASE 2: Acceptance Criteria                                  ✗ FAIL
─────────────────────────────────────────────────────────────────────────
│ AC  │ Defined │ Implemented │ Tested │ Passing │ Status │
│─────│─────────│─────────────│────────│─────────│────────│
│ AC3 │    ✓    │      ✗      │   ✗    │    -    │ FAIL   │

Issue: AC3 "WHEN user requests password reset THEN send email"
       No implementation found in owned paths
       No tests reference AC3
```

### Test Not Passing
```
PHASE 2: Acceptance Criteria                                  ✗ FAIL
─────────────────────────────────────────────────────────────────────────
│ AC7 │    ✓    │      ✓      │   ✓    │    ✗    │ FAIL   │

Issue: AC7 test failing
       File: src/features/auth/__tests__/session.test.ts:47
       Error: Expected 401, received 403
```

### Contract Not Implemented
```
PHASE 3: Contract Verification                                ✗ FAIL
─────────────────────────────────────────────────────────────────────────
• contracts/auth/mfa.contract.ts: ✓ exists, ✗ NOT implemented

Issue: Contract defines enableMFA() but no implementation found
```

### Modification Outside Owned Paths
```
PHASE 4: Owned Paths                                          ⚠ WARNING
─────────────────────────────────────────────────────────────────────────
• src/features/auth/**: 12 files modified ✓
• src/lib/utils.ts: ⚠ MODIFIED (not in ownedPaths)

Warning: File modified outside story scope
         May conflict with other agents' work
         Requires CTO approval for merge
```

---

## Signal File

On completion, creates:
```json
// .claude/signals/story-audit-{STORY-ID}-{timestamp}.json
{
  "command": "/story-audit",
  "storyId": "AUTH-BE-001",
  "timestamp": "2026-02-01T14:30:00Z",
  "result": "PASS",
  "complianceScore": 97,
  "phases": {
    "schema": { "status": "pass", "score": 100 },
    "acceptanceCriteria": { "status": "pass", "score": 100, "implemented": 9, "total": 9 },
    "contracts": { "status": "pass", "score": 100 },
    "ownedPaths": { "status": "pass", "score": 100 },
    "testCoverage": { "status": "pass", "score": 100, "coverage": 87 },
    "research": { "status": "warning", "score": 90, "warnings": 1 },
    "security": { "status": "pass", "score": 100 },
    "rollback": { "status": "pass", "score": 100 }
  },
  "warnings": [
    "Source 5 (Rate Limiting) application unclear"
  ],
  "gateReadiness": {
    "gate5": true,
    "gate7": true
  }
}
```

---

## Integration with Gates

### Gate 5 (PM Validation) Prerequisite
```yaml
gate5_requires:
  - /story-audit result: PASS or PASS_WITH_WARNINGS
  - All ACs implemented and tested
  - Compliance score >= 80%
```

### Gate 7 (Merge Authorization) Prerequisite
```yaml
gate7_requires:
  - /story-audit result: PASS
  - All ACs passing tests
  - No modifications outside ownedPaths (or CTO approved)
  - Compliance score >= 95%
```

---

## Quick Reference

```bash
# Audit current wave (default)
/story-audit

# Audit specific wave
/story-audit wave 1
/story-audit wave 2
/story-audit wave all

# Audit single story
/story-audit AUTH-BE-001

# Audit multiple stories
/story-audit AUTH-BE-001 AUTH-BE-002 UI-FE-003

# Audit by time
/story-audit recent                  # Last 7 days
/story-audit today                   # Today only

# With options
/story-audit wave 1 --verbose        # Detailed output
/story-audit wave 1 --report         # Generate report file
/story-audit wave 1 --fail-fast      # Stop on first failure
```

---

## Checklist

Before running `/story-audit`:
- [ ] Story marked as complete
- [ ] All commits pushed
- [ ] Tests run recently
- [ ] Build passing

After audit:
- [ ] Address any FAIL items
- [ ] Document warning exceptions (if acceptable)
- [ ] Proceed to Gate 5/7
