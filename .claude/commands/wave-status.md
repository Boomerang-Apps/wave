# Wave Status: Progress Dashboard

Display progress and status for waves and stories.

## Arguments
- `$ARGUMENTS` - Scope: "wave {N}" or "all"

## Purpose
Provide real-time visibility into wave execution progress, story status, and blockers.

## Execution

### For `wave {N}`:
1. Load all stories from `stories/wave{N}/`
2. Check signal files for gate progress
3. Calculate completion metrics
4. Identify blockers and next actions

### For `all`:
1. Scan all waves in `stories/`
2. Aggregate status across all waves
3. Show overall project progress
4. Highlight critical path items

## Status States

| State | Symbol | Description |
|-------|--------|-------------|
| Pending | ○ | Not started |
| In Progress | → | Currently being worked on |
| Complete | ✓ | All gates passed |
| Blocked | ⊘ | Waiting on dependency |
| Failed | ✗ | Gate failed, needs remediation |

## Output Format

### Wave-Specific: `/wave-status wave 1`

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  WAVE STATUS: Wave 1 - Authentication                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  PROGRESS                                                                    ║
║  ────────                                                                    ║
║  Overall:  ████████████░░░░░░░░  55% (6/11 stories complete)                 ║
║  Points:   ████████░░░░░░░░░░░░  42% (21/50 points complete)                 ║
║                                                                              ║
║  BY AGENT                                                                    ║
║  ────────                                                                    ║
║  be-dev:  ████████████████░░░░  80% (4/5 complete)                           ║
║  fe-dev:  ████████░░░░░░░░░░░░  40% (2/5 complete)                           ║
║  qa:      All dependent on fe-dev                                            ║
║                                                                              ║
║  STORY STATUS                                                                ║
║  ────────────                                                                ║
║  ✓ AUTH-BE-001  Schema Setup            be-dev   5pts  Gate 7 ✓             ║
║  ✓ AUTH-BE-002  Client Registration     be-dev   8pts  Gate 7 ✓             ║
║  ✓ AUTH-BE-003  Pilot Registration      be-dev   8pts  Gate 7 ✓             ║
║  ✓ AUTH-BE-004  Login Endpoint          be-dev   5pts  Gate 7 ✓             ║
║  → AUTH-BE-005  Password Reset          be-dev   5pts  Gate 3 (testing)     ║
║  ✓ AUTH-FE-001  Login UI                fe-dev   5pts  Gate 7 ✓             ║
║  ✓ AUTH-FE-002  Client Reg UI           fe-dev   8pts  Gate 7 ✓             ║
║  → AUTH-FE-003  Pilot Reg UI            fe-dev   8pts  Gate 2 (building)    ║
║  ○ AUTH-FE-004  Email Verify UI         fe-dev   3pts  Pending              ║
║  ⊘ AUTH-INT-001 Auth Context            fe-dev   3pts  Blocked (BE-005)     ║
║  ⊘ AUTH-INT-002 Protected Routes        fe-dev   3pts  Blocked (INT-001)    ║
║                                                                              ║
║  GATE DISTRIBUTION                                                           ║
║  ─────────────────                                                           ║
║  Gate 0: ████████████████████ 11/11 (Pre-flight)                             ║
║  Gate 1: ████████████████████ 11/11 (Self-verify)                            ║
║  Gate 2: ████████████████░░░░  9/11 (Build)                                  ║
║  Gate 3: ████████████░░░░░░░░  7/11 (Test)                                   ║
║  Gate 4: ████████████░░░░░░░░  7/11 (QA)                                     ║
║  Gate 5: ████████████░░░░░░░░  7/11 (PM)                                     ║
║  Gate 6: ████████████░░░░░░░░  7/11 (Architecture)                           ║
║  Gate 7: ████████████░░░░░░░░  6/11 (Merged)                                 ║
║                                                                              ║
║  BLOCKERS                                                                    ║
║  ────────                                                                    ║
║  1. AUTH-INT-001 blocked by AUTH-BE-005 (be-dev needs to complete)           ║
║  2. AUTH-INT-002 blocked by AUTH-INT-001 (chain dependency)                  ║
║                                                                              ║
║  NEXT ACTIONS                                                                ║
║  ────────────                                                                ║
║  1. be-dev: Complete AUTH-BE-005 testing (Gate 3)                            ║
║  2. fe-dev: Complete AUTH-FE-003 build (Gate 2)                              ║
║  3. fe-dev: Start AUTH-FE-004                                                ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ETA: 3 stories remaining (AUTH-FE-004, AUTH-INT-001, AUTH-INT-002)          ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### All Waves: `/wave-status all`

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  PROJECT STATUS: AirView Marketplace                                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  OVERALL PROGRESS                                                            ║
║  ────────────────                                                            ║
║  Stories:  ████████░░░░░░░░░░░░  40% (25/62 complete)                        ║
║  Points:   ██████░░░░░░░░░░░░░░  32% (98/306 points)                         ║
║                                                                              ║
║  WAVE SUMMARY                                                                ║
║  ────────────                                                                ║
║  Wave 1 - Auth:       ████████████░░░░░░░░  55% (6/11)   → In Progress      ║
║  Wave 2 - Profiles:   ████████████████████ 100% (10/10)  ✓ Complete         ║
║  Wave 3 - Projects:   ████████████░░░░░░░░  60% (9/15)   → In Progress      ║
║  Wave 4 - Proposals:  ░░░░░░░░░░░░░░░░░░░░   0% (0/12)   ○ Not Started      ║
║  Wave 5 - Payments:   ░░░░░░░░░░░░░░░░░░░░   0% (0/8)    ⊘ Blocked          ║
║  Wave 6 - Messaging:  ░░░░░░░░░░░░░░░░░░░░   0% (0/6)    ⊘ Blocked          ║
║                                                                              ║
║  AGENT WORKLOAD                                                              ║
║  ──────────────                                                              ║
║  be-dev:   Active on Wave 1, 3 │ 12 stories pending                          ║
║  fe-dev:   Active on Wave 1, 3 │ 15 stories pending                          ║
║  qa:       Reviewing Wave 3    │ 8 stories in queue                          ║
║  pm:       Validating Wave 3   │ 5 stories in queue                          ║
║                                                                              ║
║  CRITICAL PATH                                                               ║
║  ─────────────                                                               ║
║  Wave 1 → Wave 4 → Wave 5 (Payments blocked on Auth + Proposals)             ║
║                                                                              ║
║  RECENT COMPLETIONS                                                          ║
║  ──────────────────                                                          ║
║  ✓ PROF-BE-005  2024-01-15 14:30  Profile Settings                           ║
║  ✓ PROJ-BE-003  2024-01-15 12:15  Project Creation                           ║
║  ✓ AUTH-BE-004  2024-01-15 10:00  Login Endpoint                             ║
║                                                                              ║
║  BLOCKERS & RISKS                                                            ║
║  ────────────────                                                            ║
║  ⚠ Wave 1 completion blocking Wave 4 start                                   ║
║  ⚠ Wave 5 (Payments) requires Wave 4 (Proposals) completion                  ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  HEALTH: Good | On Track for Wave 3 completion                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Signal File Locations

Status derived from:
```
.claude/signals/
├── signal-wave{N}-launched.json       # Wave started
├── signal-{STORY-ID}-started.json     # Story started
├── signal-{STORY-ID}-gate{N}-passed.json  # Gate progress
├── signal-{STORY-ID}-complete.json    # Story complete
└── signal-wave{N}-complete.json       # Wave complete
```

## Refresh Rate

For real-time monitoring, re-run `/wave-status` to get updated information.
