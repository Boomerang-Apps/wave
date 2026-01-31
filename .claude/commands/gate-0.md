# Gate 0: Pre-Flight Authorization

Run the complete Gate 0 Pre-Flight Checklist for a wave or story.

## Arguments
- `$ARGUMENTS` - Wave number OR Story ID (e.g., "1" for Wave 1, or "AUTH-BE-001" for single story)

## Owner
CTO Master Agent

## Pre-Flight Checklist (PFC)

Execute all 11 mandatory checks:

### Category A: Documentation Verification
```
□ PFC-A1: PRD completeness check
   - Verify PRD exists and covers all stories
   - Check PRD sections map to epics

□ PFC-A2: Contract registry validation
   - All referenced contracts exist in contracts/
   - TypeScript compiles without errors

□ PFC-A3: Story specification review
   - Stories follow Schema V4.1
   - All required fields present
   - EARS format acceptance criteria

□ PFC-A4: Traceability matrix existence
   - L0→L3 traceability documented
   - planning/traceability/ files exist
```

### Category B: Configuration Verification
```
□ PFC-B1: Repository state validation
   - Git repo initialized
   - Clean working directory (no uncommitted changes)

□ PFC-B2: Branch protection rules
   - main branch protected (if GitHub configured)
   - develop branch exists

□ PFC-B3: Environment variables secured
   - .env in .gitignore
   - .env.example documents required vars
   - No secrets in committed files

□ PFC-B4: Dependency lockfile present
   - pnpm-lock.yaml exists
   - pnpm install succeeds
```

### Category C: Safety Assessment
```
□ PFC-C1: DAL classification complete
   - Every story has DAL level assigned
   - DAL matches domain risk level

□ PFC-C2: Hazard analysis documented
   - planning/hazards/ files exist
   - All high-risk hazards identified

□ PFC-C3: Risk mitigation identified
   - Each hazard has mitigation plan
   - Mitigation owners assigned

□ PFC-C4: Rollback procedure defined
   - Each story has rollbackPlan
   - Rollback steps documented
```

### Category D: Resource Verification
```
□ PFC-D1: Agent availability confirmed
   - Agent workspace branches exist
   - Handoff documents prepared

□ PFC-D2: Tool access validated
   - Node.js available
   - pnpm available
   - Required CLIs installed

□ PFC-D3: Token budget allocated
   - Estimated tokens within limits

□ PFC-D4: Time constraints defined
   - Gate retry limits documented
```

### Category E: Communication Verification
```
□ PFC-E1: Signal file paths defined
   - .claude/ directory exists
   - Signal file naming convention documented

□ PFC-E2: Handoff documents ready
   - Agent assignments clear
   - Story ownership defined

□ PFC-E3: Escalation paths clear
   - Agent → CTO → Human escalation

□ PFC-E4: Stakeholder notification plan
   - Signal files for status updates
```

### Category F: Research Validation (Schema V4.1)
```
□ PFC-K: Research validation complete
   - Each story has researchValidation section
   - Sources are credible (official docs, standards)
   - Research linked to acceptance criteria
   - Industry standards documented
   - Local regulations addressed
```

## Execution

1. Parse argument to determine scope (wave or story)
2. Load relevant story files
3. Run each check, collect results
4. Calculate pass rate (must be 100% or 95%+ with documented exceptions)
5. Generate signal file: `.claude/signal-wave{N}-gate0-{approved|rejected}.json`
6. Output checklist report with PASS/FAIL for each item

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GATE 0: PRE-FLIGHT AUTHORIZATION                                            ║
║  Wave: {N} | Stories: {count} | Domain: {domain}                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  [A] DOCUMENTATION VERIFICATION                                              ║
║      ✓ A1: PRD Completeness                                                  ║
║      ✓ A2: Contract Registry Valid                                           ║
║      ✓ A3: Story Specifications Complete                                     ║
║      ✓ A4: Traceability Matrix Exists                                        ║
║                                                                              ║
║  [B] CONFIGURATION VERIFICATION                                              ║
║      ✓ B1: Repository Initialized                                            ║
║      ○ B2: Branch Protection (N/A - local dev)                               ║
║      ✓ B3: Environment Variables Secured                                     ║
║      ✓ B4: Dependency Lockfile Present                                       ║
║                                                                              ║
║  ... (continue for all categories)                                           ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: APPROVED | Pass Rate: 100% (20/20)                                  ║
║  Signal: .claude/signal-wave1-gate0-approved.json                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## On Failure

If any critical check fails:
1. Mark gate as REJECTED
2. List all failing checks with remediation steps
3. Do NOT proceed to story execution
4. Create signal file with rejection reason
