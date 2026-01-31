# /wave-start - Batch Wave Dispatch

**Priority:** P1 (HIGH)
**Recommended Model:** Sonnet
**Aliases:** /ws, /dispatch

## Purpose

Batch-dispatch all stories for a development wave. Auto-assigns stories to appropriate agents, initializes wave tracking, and creates all feature branches upfront.

## When to Run

- Starting a new development wave
- After wave planning is complete
- When all stories are defined and prioritized

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `wave-num` | Wave number to start | Required |
| `--dry-run` | Preview without executing | false |
| `--parallel <n>` | Max parallel agents | 2 |
| `--priority <p>` | Start with priority | P0 |

## Pre-requisites

Before wave start:
1. `/preflight` passes
2. All wave stories defined
3. Agents available
4. Budget approved
5. Previous wave complete (or first wave)

## Execution Steps

### 1. Load Wave Stories
```bash
# From local files
ls stories/wave${WAVE_NUM}/*.json

# Or from Supabase
SELECT * FROM stories WHERE wave = ${WAVE_NUM} ORDER BY priority
```

### 2. Validate Stories
- All stories have acceptance criteria
- Dependencies are resolvable
- No circular dependencies
- Domains are valid

### 3. Agent Assignment
```yaml
Assignment Rules:
  - P0 stories first
  - Match domain to agent type
  - Balance load across agents
  - Respect dependencies
```

### 4. Create Branches
```bash
# For each story
git checkout main
git checkout -b wave${WAVE_NUM}/${STORY_ID}
git push -u origin wave${WAVE_NUM}/${STORY_ID}
```

### 5. Dispatch Agents
```bash
# Spawn and assign
/agent spawn fe-dev-1
/agent assign agent-001 WAVE1-FE-001
```

## Output Format

### Dry Run
```
WAVE 1 INITIALIZATION (DRY RUN)
===============================
Stories Found: 8
Agents Available: 4 (fe-dev-1, fe-dev-2, be-dev-1, be-dev-2)

Assignment Plan:
  WAVE1-FE-001 → fe-dev-1 (Photo Upload)
  WAVE1-FE-002 → fe-dev-2 (Style Selection)
  WAVE1-FE-003 → fe-dev-1 (Product Customization) [after FE-001]
  WAVE1-BE-001 → be-dev-1 (Upload API)
  WAVE1-BE-002 → be-dev-2 (Transform API)
  WAVE1-SEC-001 → be-dev-1 (RLS Policies) [after BE-001]
  WAVE1-INT-001 → be-dev-2 (Stripe Integration) [after BE-002]
  WAVE1-QA-001 → qa (E2E Tests) [after all]

Dependency Graph:
  FE-001 ─┬→ FE-003
          └→ BE-001 → SEC-001
  FE-002 ─→ BE-002 → INT-001
  ALL ────→ QA-001

Estimated Duration: 3-5 days
Budget Required: ~400,000 tokens

To execute: /wave-start 1 (without --dry-run)
```

### Execution
```
WAVE 1 INITIALIZATION
=====================
Stories: 8
Agents: 4
Parallel Limit: 2

[1/8] Creating branch wave1/WAVE1-FE-001... ✓
[2/8] Creating branch wave1/WAVE1-FE-002... ✓
[3/8] Creating branch wave1/WAVE1-FE-003... ✓
[4/8] Creating branch wave1/WAVE1-BE-001... ✓
[5/8] Creating branch wave1/WAVE1-BE-002... ✓
[6/8] Creating branch wave1/WAVE1-SEC-001... ✓
[7/8] Creating branch wave1/WAVE1-INT-001... ✓
[8/8] Creating branch wave1/WAVE1-QA-001... ✓

Branches Created: 8/8

Spawning Agents...
[1/4] fe-dev-1 → agent-001 ✓
[2/4] fe-dev-2 → agent-002 ✓
[3/4] be-dev-1 → agent-003 ✓
[4/4] be-dev-2 → agent-004 ✓

Agents Spawned: 4/4

Assigning P0 Stories...
[1/4] WAVE1-FE-001 → agent-001 (fe-dev-1) ✓
[2/4] WAVE1-FE-002 → agent-002 (fe-dev-2) ✓
[3/4] WAVE1-BE-001 → agent-003 (be-dev-1) ✓
[4/4] WAVE1-BE-002 → agent-004 (be-dev-2) ✓

Initial Dispatch: 4/4

P.json Updated:
  wave_state.current_wave: 1
  wave_state.status: "active"
  wave_state.started_at: "2026-01-29T14:00:00Z"

=====================================
WAVE 1 STARTED
=====================================

Monitor Progress:
  /agent list          - View all agents
  /report 1            - Generate progress report
  /wave-start 1 --status - Check wave status
```

### Wave Status
```bash
/wave-start 1 --status
```

Output:
```
WAVE 1 STATUS
=============
Started: 2026-01-29 14:00 UTC
Duration: 2 days 4 hours

STORY PROGRESS
--------------
[████████████████████] 100% WAVE1-FE-001 (fe-dev-1) ✓
[████████████████░░░░]  80% WAVE1-FE-002 (fe-dev-2)
[████████████████████] 100% WAVE1-FE-003 (fe-dev-1) ✓
[████████████████████] 100% WAVE1-BE-001 (be-dev-1) ✓
[████████████░░░░░░░░]  60% WAVE1-BE-002 (be-dev-2)
[████████░░░░░░░░░░░░]  40% WAVE1-SEC-001 (be-dev-1)
[░░░░░░░░░░░░░░░░░░░░]   0% WAVE1-INT-001 (waiting)
[░░░░░░░░░░░░░░░░░░░░]   0% WAVE1-QA-001 (waiting)

OVERALL: 5/8 stories (62.5%)

AGENTS
------
agent-001 (fe-dev-1): Working on WAVE1-FE-003 ✓ Complete
agent-002 (fe-dev-2): Working on WAVE1-FE-002
agent-003 (be-dev-1): Working on WAVE1-SEC-001
agent-004 (be-dev-2): Working on WAVE1-BE-002

BUDGET
------
Used: 245,000 / 500,000 tokens (49%)
Cost: $3.67

BLOCKERS
--------
None

ETA: ~1 day remaining
```

## Wave Completion

When all stories complete:
```
WAVE 1 COMPLETE
===============
Duration: 4 days 2 hours
Stories: 8/8 complete
PRs Merged: 8
Tests: 156 passing, 0 failing

Summary:
- Photo Upload Flow ✓
- Style Selection ✓
- Product Customization ✓
- Upload API ✓
- Transform API ✓
- RLS Policies ✓
- Stripe Integration ✓
- E2E Tests ✓

Final Budget: 423,500 / 500,000 tokens (84.7%)
Final Cost: $6.35

Next: /wave-start 2 (when ready)
```

## Error Handling

### Story Missing AC
```
[ERROR] Cannot start wave

Story WAVE1-FE-003 has no acceptance criteria.
Fix: Add AC to stories/wave1/WAVE1-FE-003.json
```

### Circular Dependency
```
[ERROR] Circular dependency detected

WAVE1-BE-001 depends on WAVE1-SEC-001
WAVE1-SEC-001 depends on WAVE1-BE-001

Fix: Review and correct dependencies
```

### Insufficient Agents
```
[WARNING] Not enough agents for parallel execution

Stories: 8
Available Agents: 2
Parallel Limit: 2

Wave will execute with reduced parallelism.
Estimated time increase: +40%

Continue? [y/N]
```

## Integration

- Uses: `/preflight` before start
- Uses: `/agent` for spawning
- Uses: `/story` for execution
- Uses: `/report` for progress
- Updates: `P.json` wave state

## Evidence Sources

- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.14)
- Stories: `/Volumes/SSD-01/Projects/Footprint/footprint/stories/`
- Orchestrator: `/Volumes/SSD-01/Projects/WAVE/`
