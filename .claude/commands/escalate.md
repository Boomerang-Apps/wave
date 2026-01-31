# /escalate - Auto-Escalation to Human

**Priority:** P2 (MEDIUM)
**Recommended Model:** Haiku
**Aliases:** /esc, /help-human

## Purpose

Auto-escalate critical issues to human operators via Slack notification. Pauses autonomous operations until human acknowledges and resolves the issue.

## When to Run

- Safety score below threshold (< 0.85)
- Budget exceeded (100% of allocation)
- Agent blocked and cannot proceed
- Critical error encountered
- Manual escalation needed

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `reason` | Escalation reason | Required |
| `--block` | Block operations until resolved | true |
| `--priority` | Priority level (low/medium/high/critical) | high |
| `--resolve <id>` | Resolve an escalation | - |
| `--list` | List open escalations | - |

## Automatic Triggers

Escalation is auto-triggered by:

| Condition | Priority | Source |
|-----------|----------|--------|
| Safety score < 0.85 | CRITICAL | `/safety` |
| Budget exceeded | HIGH | `/rlm` |
| Agent stuck > 30 min | MEDIUM | `/agent` |
| Build failed 3x | MEDIUM | `/build` |
| Test failures blocking | HIGH | `/test` |

## Execution

### Create Escalation
```python
# Via notifications.py
from src.notifications import send_slack_alert

send_slack_alert(
    channel="#wave-alerts",
    message={
        "type": "escalation",
        "priority": "critical",
        "reason": "Safety score below threshold",
        "context": {...},
        "agent": "be-dev-1",
        "story": "WAVE1-SEC-001"
    }
)
```

### Log Escalation
```bash
# Write to escalation log
mkdir -p .claude/escalations
echo '{
  "id": "ESC-001",
  "timestamp": "2026-01-29T14:30:00Z",
  "reason": "Safety score below threshold",
  "priority": "critical",
  "status": "open",
  "agent": "be-dev-1",
  "story": "WAVE1-SEC-001"
}' > .claude/escalations/ESC-001.json
```

## Output Format

### Escalation Created
```
ESCALATION TRIGGERED
====================
ID: ESC-001
Priority: CRITICAL
Reason: Safety score below threshold (0.72 < 0.85)

Context:
  Agent: be-dev-1
  Story: WAVE1-SEC-001
  File: app/api/admin/users/route.ts
  Issue: Auth verification missing on POST handler

Action Taken:
  [✓] Slack notification sent to #wave-alerts
  [✓] Operations BLOCKED for agent be-dev-1
  [✓] Escalation logged to .claude/escalations/ESC-001.json

Status: BLOCKED - Awaiting human approval

To resume after fix:
  /escalate --resolve ESC-001
```

### Budget Escalation
```
ESCALATION TRIGGERED
====================
ID: ESC-002
Priority: HIGH
Reason: Token budget exceeded

Context:
  Story: WAVE1-FE-001
  Budget: 100,000 tokens
  Used: 105,230 tokens (105.2%)
  Cost: $1.58

Action Taken:
  [✓] Slack notification sent to #wave-alerts
  [✓] Story work paused
  [✓] Escalation logged

Options:
  1. Increase budget: /rlm --budget 150000
  2. Complete with current progress
  3. Abort story

Awaiting human decision.
```

### List Open Escalations
```bash
/escalate --list
```

Output:
```
Open Escalations
================
ID        PRIORITY   REASON                    AGE      STATUS
ESC-001   CRITICAL   Safety score < 0.85       2h 15m   OPEN
ESC-002   HIGH       Budget exceeded           45m      OPEN
ESC-003   MEDIUM     Agent blocked             15m      ACKNOWLEDGED

Total: 3 open escalations
```

### Resolve Escalation
```bash
/escalate --resolve ESC-001
```

Output:
```
Escalation Resolved
===================
ID: ESC-001
Resolution: Human approved after code review
Resolved By: @elizager
Duration: 2 hours 15 minutes

Agent be-dev-1 unblocked.
Operations may resume.
```

## Slack Message Format

```
🚨 WAVE ESCALATION - CRITICAL

*Reason:* Safety score below threshold (0.72 < 0.85)
*Agent:* be-dev-1
*Story:* WAVE1-SEC-001

*Context:*
Auth verification missing on POST handler
File: app/api/admin/users/route.ts:15

*Action Required:*
Review and approve or reject the changes.

*Commands:*
`/escalate --resolve ESC-001` - After fixing
`/agent status be-dev-1` - Check agent state

_Escalation ID: ESC-001_
```

## Escalation Workflow

```
Issue Detected
     ↓
Create Escalation
     ↓
Send Slack Alert ──→ Human Notified
     ↓
Block Operations
     ↓
Await Resolution
     ↓
Human Reviews ──→ Approves/Rejects
     ↓
/escalate --resolve
     ↓
Resume Operations
```

## Priority Levels

| Level | Response Time | Auto-Block | Slack Channel |
|-------|---------------|------------|---------------|
| CRITICAL | Immediate | Yes | #wave-alerts + DM |
| HIGH | 30 minutes | Yes | #wave-alerts |
| MEDIUM | 2 hours | No | #wave-status |
| LOW | Next day | No | #wave-status |

## Integration

- Triggered by: `/safety`, `/rlm`, `/agent`
- Uses: `src/notifications.py` for Slack
- Logs to: `.claude/escalations/`
- Blocks: Agent operations when --block

## Evidence Sources

- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.13)
- Notifications: `src/notifications.py`
- Grok Enhancement: Auto-escalation system
