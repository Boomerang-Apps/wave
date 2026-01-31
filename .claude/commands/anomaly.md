# Anomaly: Report an Anomaly

Report and track an anomaly (defect, issue, unexpected behavior).

## Arguments
- `$ARGUMENTS` - Story ID and summary (e.g., "AUTH-BE-001 Login fails with special chars")

## Purpose
Document issues discovered during development or testing for tracking and resolution.

## Anomaly Classification

| Class | Description | Response Time | Auto-Rollback |
|-------|-------------|---------------|---------------|
| Critical | System down, data loss, security breach | Immediate | Yes |
| Major | Feature broken, workaround exists | 4 hours | No |
| Minor | UI issue, cosmetic | 24 hours | No |
| Trivial | Documentation, typo | Next wave | No |

## Execution

### 1. Create Anomaly Report

```json
{
  "id": "ANM-{STORY-ID}-{NNN}",
  "class": "Critical|Major|Minor|Trivial",
  "storyId": "{STORY-ID}",
  "summary": "{brief description}",
  "description": "{detailed description}",
  "detectedAt": "{timestamp}",
  "detectedBy": "{agent}",
  "detectedDuring": "Gate {N}",
  "stepsToReproduce": [
    "Step 1",
    "Step 2",
    "Step 3"
  ],
  "expected": "{expected behavior}",
  "actual": "{actual behavior}",
  "evidence": "{screenshot/log path}",
  "affectedAC": ["AC{N}"],
  "environment": {
    "os": "{operating system}",
    "runtime": "{node/python/go version}",
    "browser": "{if applicable}"
  },
  "status": "open|investigating|resolved|closed",
  "assignedTo": null,
  "rootCause": null,
  "resolution": null,
  "resolvedAt": null,
  "preventionAction": null
}
```

### 2. Determine Response

| Class | Actions |
|-------|---------|
| Critical | Immediate notification, consider rollback, halt deployment |
| Major | Block gate progression, assign for immediate fix |
| Minor | Log and continue, fix before Gate 7 |
| Trivial | Add to backlog, optional fix |

### 3. Save Anomaly File

Save to `.claude/signals/signal-anomaly-{id}.json`

### 4. Update Story Status

If blocking:
- Set story status to "blocked"
- Add anomaly reference to story

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ANOMALY REPORTED                                                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ID: ANM-{STORY-ID}-001                                                      ║
║  Class: {MAJOR}                                                              ║
║  Story: {STORY-ID}                                                           ║
║  Gate: {Gate N}                                                              ║
║                                                                              ║
║  SUMMARY                                                                     ║
║  ───────                                                                     ║
║  {brief description}                                                         ║
║                                                                              ║
║  DETAILS                                                                     ║
║  ───────                                                                     ║
║  Expected: {expected behavior}                                               ║
║  Actual: {actual behavior}                                                   ║
║                                                                              ║
║  STEPS TO REPRODUCE                                                          ║
║  ───────────────────                                                         ║
║  1. {step 1}                                                                 ║
║  2. {step 2}                                                                 ║
║  3. {step 3}                                                                 ║
║                                                                              ║
║  AFFECTED                                                                    ║
║  ────────                                                                    ║
║  Acceptance Criteria: {AC list}                                              ║
║                                                                              ║
║  RESPONSE                                                                    ║
║  ────────                                                                    ║
║  • Gate progression: BLOCKED                                                 ║
║  • Story status: blocked                                                     ║
║  • Action: Fix required before proceeding                                    ║
║                                                                              ║
║  Signal: .claude/signals/signal-anomaly-{id}.json                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Resolution Workflow

When anomaly is resolved:

```bash
/anomaly-resolve ANM-{STORY-ID}-001 "Root cause: X, Fixed by: Y"
```

Updates anomaly with:
- status: "resolved"
- rootCause: "{description}"
- resolution: "{how it was fixed}"
- resolvedAt: "{timestamp}"
- preventionAction: "{how to prevent recurrence}"
