# Gap Analysis: Identify Missing Requirements and Implementation Gaps

Analyze gaps between requirements, design, implementation, and testing.

## Arguments
- `$ARGUMENTS` - Scope: "all", "wave {N}", "epic {NAME}", or Story ID

## Purpose
Identify missing elements across the development lifecycle to ensure complete coverage from PRD to deployment.

## Gap Categories

### 1. Requirements Gaps
```
□ PRD sections without epics
□ Epics without stories
□ Stories without acceptance criteria
□ ACs without EARS format
□ Missing non-functional requirements
□ Undefined edge cases
```

### 2. Design Gaps
```
□ Stories without contracts
□ Contracts without implementations
□ Missing API documentation
□ Undefined error codes
□ Missing data models
□ Incomplete security design
```

### 3. Implementation Gaps
```
□ ACs without implementation
□ Contracts not fulfilled
□ Missing error handling
□ Incomplete validation
□ Hardcoded values (should be config)
□ Missing logging/telemetry
```

### 4. Test Gaps
```
□ ACs without tests
□ Code without test coverage
□ Missing edge case tests
□ Missing error scenario tests
□ Missing integration tests
□ Missing E2E tests
```

### 5. Research Gaps
```
□ Stories without research validation
□ ACs without research backing
□ Missing industry standards
□ Outdated sources
□ Low-credibility only sources
```

### 6. Documentation Gaps
```
□ Missing API documentation
□ Missing deployment docs
□ Missing runbooks
□ Missing architecture diagrams
□ Outdated documentation
```

## Execution

### 1. Scan All Artifacts
```
Artifacts:
├── PRD: planning/prd/
├── Epics: planning/epics/
├── Stories: stories/wave*/
├── Contracts: contracts/
├── Source: {src directory}
├── Tests: {test directory}
├── Docs: docs/
└── Config: .claude/config.json
```

### 2. Build Coverage Matrix
```
┌──────────────┬────────┬───────┬────────┬──────┬──────────┐
│ Requirement  │ Design │ Story │ Impl   │ Test │ Research │
├──────────────┼────────┼───────┼────────┼──────┼──────────┤
│ PRD 3.1 Auth │ ✓      │ ✓     │ ✓      │ ✓    │ ✓        │
│ PRD 3.2 Prof │ ✓      │ ✓     │ partial│ ✓    │ ⚠        │
│ PRD 3.3 Proj │ ✓      │ ✓     │ ○      │ ○    │ ○        │
└──────────────┴────────┴───────┴────────┴──────┴──────────┘
```

### 3. Identify Critical Gaps
Prioritize gaps by:
- DAL level (higher DAL = more critical)
- Dependency impact (blocks other work)
- Security implications
- User-facing impact

### 4. Generate Remediation Plan
For each gap:
- Specific action required
- Estimated effort
- Assigned agent
- Priority level

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GAP ANALYSIS: {scope}                                                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  COVERAGE SUMMARY                                                            ║
║  ────────────────                                                            ║
║  Requirements → Design:    ████████████████████ 100%                         ║
║  Design → Stories:         ████████████████████ 100%                         ║
║  Stories → Implementation: ████████████████░░░░  80%                         ║
║  Implementation → Tests:   ████████████░░░░░░░░  65%                         ║
║  Stories → Research:       ████████████████████ 100%                         ║
║                                                                              ║
║  REQUIREMENTS GAPS                                                           ║
║  ─────────────────                                                           ║
║  ✓ All PRD sections have epics                                               ║
║  ✓ All epics have stories                                                    ║
║  ✓ All stories have ACs                                                      ║
║  ⚠ 3 ACs missing EARS format:                                                ║
║    └── PROF-BE-002/AC5, PROJ-BE-001/AC3, PROJ-BE-001/AC4                     ║
║                                                                              ║
║  DESIGN GAPS                                                                 ║
║  ───────────                                                                 ║
║  ✓ All stories have contracts                                                ║
║  ⚠ 2 contracts not implemented:                                              ║
║    └── contracts/api/projects/create.yaml                                    ║
║    └── contracts/api/projects/update.yaml                                    ║
║  ✗ Missing API documentation for:                                            ║
║    └── /api/v1/projects/* endpoints                                          ║
║                                                                              ║
║  IMPLEMENTATION GAPS                                                         ║
║  ───────────────────                                                         ║
║  Wave 1: ████████████████████ 100% (11/11 stories)                           ║
║  Wave 2: ████████████████░░░░  80% (8/10 stories)                            ║
║    └── Missing: PROF-BE-003, PROF-BE-004                                     ║
║  Wave 3: ░░░░░░░░░░░░░░░░░░░░   0% (0/12 stories)                            ║
║                                                                              ║
║  TEST GAPS                                                                   ║
║  ─────────                                                                   ║
║  Overall Coverage: 72%                                                       ║
║  ├── Unit Tests: 85%                                                         ║
║  ├── Integration: 60%                                                        ║
║  └── E2E: 40%                                                                ║
║                                                                              ║
║  Untested Code:                                                              ║
║  ├── src/services/auth/mfa.ts (0% coverage)                                  ║
║  ├── src/services/profiles/verification.ts (45% coverage)                    ║
║  └── src/utils/validation.ts (30% coverage)                                  ║
║                                                                              ║
║  ACs Without Tests:                                                          ║
║  ├── AUTH-BE-005/AC4: Password history check                                 ║
║  ├── PROF-BE-001/AC6: Profile image upload                                   ║
║  └── PROF-BE-002/AC3: License verification                                   ║
║                                                                              ║
║  RESEARCH GAPS                                                               ║
║  ─────────────                                                               ║
║  ✓ All stories have research validation                                      ║
║  ⚠ 5 ACs without research backing:                                           ║
║    └── AUTH-BE-003/AC7, PROF-BE-001/AC5-AC6, ...                             ║
║  ⚠ 2 stories with only low-credibility sources:                              ║
║    └── PROJ-BE-001, PROJ-BE-002                                              ║
║                                                                              ║
║  CRITICAL GAPS (Priority)                                                    ║
║  ─────────────────────────                                                   ║
║  1. [HIGH] MFA service has 0% test coverage (DAL-B)                          ║
║     Action: Write unit tests for mfa.ts                                      ║
║     Agent: be-dev                                                            ║
║                                                                              ║
║  2. [HIGH] Projects API contracts not implemented                            ║
║     Action: Implement Wave 3 stories                                         ║
║     Agent: be-dev                                                            ║
║                                                                              ║
║  3. [MEDIUM] 3 ACs missing EARS format                                       ║
║     Action: Rewrite ACs with WHEN/THEN                                       ║
║     Agent: pm                                                                ║
║                                                                              ║
║  4. [MEDIUM] E2E test coverage at 40%                                        ║
║     Action: Add E2E tests for critical flows                                 ║
║     Agent: qa                                                                ║
║                                                                              ║
║  REMEDIATION SUMMARY                                                         ║
║  ───────────────────                                                         ║
║  Total Gaps: 18                                                              ║
║  ├── Critical: 2                                                             ║
║  ├── High: 4                                                                 ║
║  ├── Medium: 8                                                               ║
║  └── Low: 4                                                                  ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  GAP SCORE: 78% Coverage                                                     ║
║  Status: FAIR - Remediation required before Wave 3                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Gap Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| Critical | Blocks deployment, security risk | Immediate fix required |
| High | Significant coverage gap | Fix before next wave |
| Medium | Notable missing element | Schedule for remediation |
| Low | Minor gap, nice to have | Backlog for future |

## Gap Tracking

Gaps are tracked in: `planning/gaps/gap-registry.json`

```json
{
  "analysisId": "GAP-{timestamp}",
  "scope": "{scope}",
  "analyzedAt": "ISO datetime",
  "totalGaps": 18,
  "gaps": [
    {
      "id": "GAP-001",
      "category": "test",
      "severity": "critical",
      "description": "MFA service has 0% test coverage",
      "location": "src/services/auth/mfa.ts",
      "action": "Write unit tests",
      "assignedTo": "be-dev",
      "status": "open",
      "createdAt": "ISO datetime"
    }
  ]
}
```
