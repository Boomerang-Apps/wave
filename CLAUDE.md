# WAVE V2 - Claude Code Instructions

## MANDATORY: Pre-Flight Validation

**BEFORE ANY WORK**, you MUST run:

```bash
cd /Volumes/SSD-01/Projects/WAVE/orchestrator
python3 scripts/preflight_lock.py --audit
python3 scripts/preflight_lock.py --check
```

If the lock check fails, run:
```bash
python3 scripts/preflight_lock.py --validate --lock
```

**DO NOT PROCEED** if validation fails. Fix errors first.

---

## Architecture Compliance

All work MUST follow `/orchestrator/docs/WAVE-V2-IMPLEMENTATION-GUIDE.md`

### Critical Rules

1. **NEVER skip pre-flight validation**
2. **NEVER implement features without first auditing existing code**
3. **ALWAYS map checklist terms to codebase before assuming "missing"**
4. **ALWAYS use ChatAnthropic API (not CLI flags)**
5. **ALWAYS check WAVE_PRINCIPLES for safety (not "DO-178C" literal search)**

### Term Mapping (Memorize This)

| Checklist Term | Codebase Implementation |
|---------------|-------------------------|
| DO-178C probes | `WAVE_PRINCIPLES` in `constitutional.py` |
| Autonomous flag | NOT NEEDED (API is autonomous) |
| E-Stop | `EmergencyStop` in `emergency_stop.py` |
| Domain isolation | `SUPPORTED_DOMAINS` in `domain_router.py` |
| Budget enforcement | `BudgetTracker` in `budget.py` |
| Constitutional AI | `ConstitutionalChecker` in `constitutional.py` |

---

## 10-Step Launch Sequence

Steps 0-9 are SEQUENTIAL. NO SKIPPING.

| Step | ID | Purpose |
|------|-----|---------|
| 0 | mockup-design | HTML prototypes |
| 1 | project-overview | PRD & Stories |
| 2 | execution-plan | Wave assignment |
| 3 | system-config | API keys |
| 4 | infrastructure | Services check |
| 5 | compliance-safety | Safety guardrails |
| 6 | rlm-protocol | Learning system |
| 7 | notifications | Slack alerts |
| 8 | build-qa | Docker + tests |
| 9 | agent-dispatch | LAUNCH |

---

## Safety Systems

### Emergency Stop
- File: `.claude/EMERGENCY-STOP`
- Redis: `wave:emergency` channel
- Check with: `EmergencyStop().check()`

### WAVE_PRINCIPLES (DO-178C Equivalent)
- P001: No Destructive Commands
- P002: No Secret Exposure
- P003: Stay In Scope
- P004: Validate Inputs
- P005: Respect Budgets
- P006: Escalate Uncertainty

---

## Before ANY Implementation Task

```
┌─────────────────────────────────────────────────────────────┐
│  MANDATORY PRE-IMPLEMENTATION CHECKLIST                     │
├─────────────────────────────────────────────────────────────┤
│  [ ] 1. Run preflight_lock.py --audit                       │
│  [ ] 2. Run preflight_lock.py --check                       │
│  [ ] 3. Grep for related functionality (multiple patterns)  │
│  [ ] 4. Search for alternative naming conventions           │
│  [ ] 5. Map checklist terms to codebase terms               │
│  [ ] 6. Confirm "missing" status with file reads            │
│  [ ] 7. Document what EXISTS before planning what's MISSING │
└─────────────────────────────────────────────────────────────┘
```

**NEVER create duplicate implementations. ALWAYS audit first.**

---

## Key File Locations

```
/orchestrator/
├── scripts/preflight_lock.py     # RUN THIS FIRST
├── src/safety/                   # Safety systems
├── src/agents/                   # Domain agents
├── src/domains/                  # Domain isolation
└── docs/WAVE-V2-IMPLEMENTATION-GUIDE.md  # Full reference
```

---

## Validation Commands

```bash
# Audit checklist terms
python3 scripts/preflight_lock.py --audit

# Check if locked
python3 scripts/preflight_lock.py --check

# Full validation + lock
python3 scripts/preflight_lock.py --validate --lock
```

**If ANY check fails, STOP and fix before proceeding.**
