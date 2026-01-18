# WAVE QA→Dev Retry Loop

**Version:** 1.0.0
**Purpose:** Document the automatic retry cycle when QA rejects

---

## Overview

When QA rejects code, WAVE automatically triggers a retry cycle:

```
QA Rejects → Orchestrator → Dev-Fix Agent → QA Re-runs
     ↓                                           ↓
  Max 3 retries                            Pass? → Gate 5
     ↓                                           ↓
  ESCALATION                               Fail? → Retry
```

---

## Retry Flow

### Step 1: QA Rejection
QA agent creates rejection signal with:
- Validation results (build, typecheck, lint, test)
- List of issues with IDs, severity, suggested fixes
- `rejection_count` field

### Step 2: Orchestrator Detection
Orchestrator polls for signals:
- Detects `signal-wave{N}-gate4-rejected.json`
- Checks `rejection_count` vs `MAX_RETRIES`
- Archives rejection signal
- Decides: retry or escalate

### Step 3: Retry Trigger
If `rejection_count < MAX_RETRIES`:
- Creates `signal-wave{N}-gate4.5-retry.json`
- Clears previous gate 3/4 signals
- Dev-Fix agent starts

### Step 4: Dev-Fix Agent
Dev-Fix agent:
- Reads rejection signal for issues
- Fixes ALL issues
- Runs validations
- Creates `signal-wave{N}-gate4.5-fixed.json`

### Step 5: QA Re-run
Orchestrator:
- Detects fixed signal
- Clears rejection signal
- QA agent runs again

### Step 6: Resolution
- If QA passes → Gate 5 (proceed)
- If QA fails → Repeat from Step 1
- If max retries → ESCALATION

---

## Configuration

```bash
# In .env
MAX_RETRIES=3      # Default: 3 retries before escalation
POLL_INTERVAL=10   # Seconds between signal checks
```

---

## Signal Files

### Rejection Signal (QA → Orchestrator)
```json
{
    "wave": 1,
    "gate": 4,
    "decision": "REJECTED",
    "rejection_count": 1,
    "issues": [...]
}
```

### Retry Signal (Orchestrator → Dev-Fix)
```json
{
    "wave": 1,
    "gate": "4.5",
    "action": "DEV_FIX",
    "retry_count": 1,
    "issues_file": "signal-wave1-gate4-rejected.json"
}
```

### Fixed Signal (Dev-Fix → Orchestrator)
```json
{
    "wave": 1,
    "gate": "4.5",
    "status": "FIXED",
    "issues_fixed": ["QA-001", "QA-002"]
}
```

### Escalation Signal (Orchestrator → Human)
```json
{
    "wave": 1,
    "type": "ESCALATION",
    "reason": "Max retries exceeded",
    "requires": "HUMAN_INTERVENTION"
}
```

---

## Escalation

When `rejection_count >= MAX_RETRIES`:

1. Orchestrator creates ESCALATION signal
2. Slack notification sent
3. Pipeline pauses
4. Human review required
5. Manual signal needed to continue

---

## Archive

All rejections are archived:
```
.claude/archive/rejection-wave1-attempt1-20260116-103000.json
.claude/archive/rejection-wave1-attempt2-20260116-104500.json
```

---

*WAVE Framework | Retry Loop | Version 1.0.0*
