# Rollback: Execute Rollback Procedure

Execute rollback for a story or wave.

## Arguments
- `$ARGUMENTS` - Story ID or "wave {N}" (e.g., "AUTH-BE-001" or "wave 1")

## Purpose
Safely revert changes when a gate fails or anomaly is detected.

## Rollback Triggers

| Trigger | Condition | Automatic |
|---------|-----------|-----------|
| Build Failure | Gate 2 fails 3 times | No |
| Test Regression | Existing tests fail | No |
| Security Breach | Vulnerability detected | Yes |
| Data Corruption | Integrity check fails | Yes |
| Performance | Latency >2x baseline | No |

## Execution

### 1. Assess Impact

```
□ Identify scope of rollback (story/wave)
□ Check for data migrations that ran
□ Identify dependent stories
□ Notify affected agents
```

### 2. Rollback Decision Tree

```
Is there a data migration?
├── YES → Check if reversible
│   ├── Reversible → Prepare rollback SQL
│   └── Irreversible → STOP, escalate to CTO
└── NO → Proceed with code rollback

Are there dependent stories merged?
├── YES → Rollback dependencies first
└── NO → Proceed with single story rollback
```

### 3. Execute Rollback

**Code Rollback:**
```bash
# Identify commits to revert
git log --oneline feature/{STORY-ID}

# Revert commits
git revert {commit-range} --no-commit
git commit -m "revert({domain}): Rollback {STORY-ID}

Reason: {failure reason}
Gate: {failed gate}
Anomaly: {anomaly-id if applicable}

Co-Authored-By: {agent} <noreply@anthropic.com>"
```

**Database Rollback (if applicable):**
```sql
-- Execute rollback SQL from story's rollbackPlan
-- Verify data integrity after rollback
```

### 4. Verify Rollback

```
□ Previous tests pass
□ No regression in other features
□ Data integrity verified
□ System stable
```

### 5. Document Rollback

Create rollback signal file:
```json
{
  "id": "RB-{STORY-ID}-001",
  "storyId": "{STORY-ID}",
  "trigger": "{trigger type}",
  "failedGate": "Gate {N}",
  "anomalyId": "{if applicable}",
  "initiatedAt": "{timestamp}",
  "initiatedBy": "{agent}",
  "approvedBy": "cto-master-agent",
  "commits": {
    "reverted": ["{commit-hash}"],
    "rollbackCommit": "{new-commit-hash}"
  },
  "dataImpact": "none|reversible|irreversible",
  "status": "complete",
  "completedAt": "{timestamp}",
  "rootCause": "{to be determined}",
  "preventionAction": "{to be determined}"
}
```

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ROLLBACK: {STORY-ID}                                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  TRIGGER                                                                     ║
║  ───────                                                                     ║
║  Reason: {failure reason}                                                    ║
║  Gate: {failed gate}                                                         ║
║  Anomaly: {anomaly-id}                                                       ║
║                                                                              ║
║  IMPACT ASSESSMENT                                                           ║
║  ─────────────────                                                           ║
║  Code changes: {N} commits                                                   ║
║  Data migration: {yes/no}                                                    ║
║  Dependencies: {list or none}                                                ║
║                                                                              ║
║  ROLLBACK EXECUTION                                                          ║
║  ──────────────────                                                          ║
║  ✓ Commits reverted: {commit-range}                                          ║
║  ✓ Rollback commit: {new-hash}                                               ║
║  ✓ Database: {no changes / rolled back}                                      ║
║                                                                              ║
║  VERIFICATION                                                                ║
║  ────────────                                                                ║
║  ✓ Previous tests pass                                                       ║
║  ✓ No regressions detected                                                   ║
║  ✓ System stable                                                             ║
║                                                                              ║
║  NEXT STEPS                                                                  ║
║  ──────────                                                                  ║
║  1. Root cause analysis                                                      ║
║  2. Update hazard analysis                                                   ║
║  3. Add regression tests                                                     ║
║  4. Re-execute from Gate 0                                                   ║
║                                                                              ║
║  Signal: .claude/signals/signal-rollback-{id}.json                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
