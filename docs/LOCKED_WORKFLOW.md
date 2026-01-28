# WAVE v2 Locked Workflow Sequence

## Aerospace-Grade Enforcement (DO-178C Inspired)

This document defines the **LOCKED** workflow sequence for WAVE v2.
Any deviation (skip, jump, or out-of-order execution) will:
- Block the workflow
- Log a violation
- Require manual intervention

---

## Locked Gate Sequence (MANDATORY ORDER)

| Gate | Name | Description | Validation |
|------|------|-------------|------------|
| **0** | Research | Validate PRD/stories, run pre-flight lock | `preflight_lock.py --validate --lock` |
| **1** | Planning | PM agent assigns stories, update P.json | `wave_state.current_gate == 1` |
| **2** | TDD | Write failing tests FIRST (RED state) | Tests exist and FAIL |
| **3** | Branching | Create feature branch, git worktree | Branch exists per story |
| **4** | Develop | Write code to pass tests (GREEN state) | Tests PASS |
| **5** | Refactor | Refactor while keeping tests green | Tests still PASS |
| **6** | Safety Gate | Constitutional AI score >= 0.85 | `safety_score >= 0.85` |
| **7** | QA | Coverage >= 80%, all tests green | `coverage >= 80%` |
| **8** | Merge/Deploy | Merge watcher, Vercel deploy | Merged to main |

---

## Enforcement Mechanisms

### 1. P.json State Tracking
```json
{
  "wave_state": {
    "current_wave": 1,
    "current_gate": 0,
    "gate_history": [
      {"gate": 0, "completed_at": "2026-01-28T10:00:00Z", "status": "passed"}
    ]
  }
}
```

### 2. Workflow Lock File
Location: `.claude/WORKFLOW.lock`
```json
{
  "gates": ["Gate 0: Research", "Gate 1: Planning", ...],
  "locked_at": "2026-01-28T10:00:00Z",
  "hash": "sha256:abc123..."
}
```

### 3. Pre-Commit Hook
Blocks commits if gate sequence violated.

### 4. Pre-Flight Validator
Checks `current_gate` matches expected before proceeding.

---

## Gate Transition Rules

### Rule 1: Sequential Only
- Gate N can only proceed after Gate N-1 is PASSED
- No skipping (e.g., cannot jump from Gate 1 to Gate 4)

### Rule 2: No Regression
- Once a gate passes, cannot go back without reset
- Reset requires explicit command: `workflow_locker.py --reset`

### Rule 3: Validation Required
Each gate has specific pass criteria:

| Gate | Pass Criteria |
|------|---------------|
| 0 | Pre-flight GO, architecture locked |
| 1 | Stories assigned, P.json updated |
| 2 | Test files exist, tests FAIL (RED) |
| 3 | Feature branch created, worktree active |
| 4 | All tests PASS (GREEN) |
| 5 | Refactor complete, tests still PASS |
| 6 | Safety score >= 0.85, no violations |
| 7 | Coverage >= 80%, QA approved |
| 8 | PR merged, deployed successfully |

---

## Drift Detection

### What is Drift?
When `current_gate` in P.json doesn't match expected gate in workflow.

### Detection Methods
1. **workflow_locker.py --check**: Manual check
2. **Pre-commit hook**: Automatic on commit
3. **wave_monitor.py**: Real-time during execution
4. **Retrospective audit**: Post-run analysis

### On Drift Detection
1. Workflow HALTS immediately
2. Alert sent to Slack
3. Log written to `.claude/workflow_violations.log`
4. Manual intervention required

---

## Commands

```bash
# Lock workflow (initialize)
python workflow_locker.py --lock

# Check current gate
python workflow_locker.py --check

# Advance to next gate (after validation)
python workflow_locker.py --advance

# Reset workflow (requires confirmation)
python workflow_locker.py --reset --confirm

# View gate history
python workflow_locker.py --history
```

---

## Integration with Existing Tools

| Tool | Integration |
|------|-------------|
| `preflight_lock.py` | Gate 0 validation + architecture lock |
| `pre-flight-validator.sh` | Gate check in Section N |
| `wave_monitor.py` | Real-time gate drift detection |
| `rlm_auditor.py` | Budget + gate tracking |
| `issue_detector.py` | Gate violation alerts |

---

## Safety Principles Enforced

| Principle | Gate | Enforcement |
|-----------|------|-------------|
| P001: No Destructive Actions | Gate 6 | Safety score check |
| P002: No Secret Exposure | Gate 6 | Pattern matching |
| P004: Code Quality | Gate 7 | Coverage >= 80% |
| P005: Respect Budgets | All | RLM auditor |
| P006: Escalate Uncertainty | All | Halt on drift |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-28 | Initial locked workflow |

---

*This workflow is LOCKED. Any modification requires CTO approval.*
