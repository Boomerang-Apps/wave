# WAVE Safety Policy

**Version:** 1.0.0
**Classification:** CRITICAL - All agents MUST comply

---

## Safety Philosophy

> "Safety must be enforced externally, not requested. Telling agents 'DO NOT exceed budget' doesn't work. External kill switch, stuck detection, and budget limits DO work."

---

## Core Principles

### 1. Defense in Depth
Multiple layers of protection:
- CLAUDE.md instructions (agent level)
- Signal file validation (orchestrator level)
- Budget limits (cost tracking)
- Kill switch (immediate halt)
- Domain boundaries (worktree isolation)

### 2. Fail Safe
When in doubt, stop and escalate:
- Unknown error → Escalate
- Budget exceeded → Pause
- Max retries reached → Escalate
- Kill switch → Halt immediately

### 3. Human in the Loop
Critical operations require approval:
- Deploy to production
- Database migrations
- Package publishing
- Cross-domain changes

### 4. Reversibility First
Every action must be undoable:
- Git branches (revert/reset)
- Database changes (migrations down)
- File changes (version control)

### 5. Minimal Privilege
Agents only access what they need:
- FE-Dev: Frontend files only
- BE-Dev: Backend files only
- QA: Read-only (no modifications)
- Dev-Fix: Targeted fixes only

---

## Enforcement Layers

### Layer 1: CLAUDE.md
Embedded in every agent prompt:
- Read first before any action
- Contains safety rules
- Documents forbidden operations

### Layer 2: Worktree Isolation
Each agent in separate Git worktree:
- Cannot affect other agents' work
- Cannot commit to main
- Isolated file system

### Layer 3: Signal Validation
Orchestrator validates all signals:
- Required fields present
- Token usage included
- Valid JSON format

### Layer 4: Budget Tracking
Cost monitoring at wave level:
- Warning at 75%
- Critical at 90%
- Pause at 100%

### Layer 5: Kill Switch
Immediate halt capability:
```bash
echo "STOP" > .claude/EMERGENCY-STOP
```
All agents check this before every action.

---

## Escalation Protocol

When escalation is triggered:

1. **Signal Created**: `signal-wave[N]-ESCALATION.json`
2. **Slack Notification**: Sent to team
3. **Pipeline Pause**: No further actions
4. **Human Review**: Required to continue

### Escalation Triggers
- Max retries exceeded (default: 3)
- Budget exceeded (100%)
- Security vulnerability detected
- Agent stuck (no progress)
- Kill switch activated

---

## Audit Trail

### Black Box Recording
All events logged to:
```
.claude/black-box/flight-recorder.jsonl
```

### Events Recorded
- Pipeline start/end
- Gate transitions
- QA decisions
- Retries
- Escalations
- Cost updates

---

## Recovery Procedures

### After Kill Switch
1. Review what triggered it
2. Remove EMERGENCY-STOP file
3. Reset agent state if needed
4. Restart orchestrator

### After Budget Exceeded
1. Review cost breakdown
2. Adjust budget if appropriate
3. Reset cost tracking
4. Resume pipeline

### After Max Retries
1. Review escalation signal
2. Examine unresolved issues
3. Manual fix required
4. Create manual approval signal

---

*WAVE Framework Safety Policy | Version 1.0.0*
