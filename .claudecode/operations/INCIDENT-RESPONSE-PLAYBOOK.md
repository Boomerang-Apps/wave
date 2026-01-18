# WAVE Framework - Incident Response Playbook

**Version:** 1.0.0
**Classification:** CRITICAL - Emergency response procedures
**Review Cycle:** Monthly or after any incident

---

## Incident Classification

### Severity Levels

| Severity | Name | Response Time | Examples |
|----------|------|---------------|----------|
| **SEV-1** | Critical | < 5 min | Security breach, data loss, system down |
| **SEV-2** | High | < 15 min | Pipeline stuck, budget exceeded, all agents failed |
| **SEV-3** | Medium | < 1 hour | Single wave failed, QA loop, merge conflict |
| **SEV-4** | Low | < 4 hours | Single agent issue, cosmetic failures |

### Emergency Level Mapping

| Emergency | Severity | Response |
|-----------|----------|----------|
| E5 (Security Halt) | SEV-1 | Immediate isolation, security review |
| E4 (System Stop) | SEV-1/2 | Full stop, investigate root cause |
| E3 (Wave Stop) | SEV-2/3 | Wave investigation, potential restart |
| E2 (Domain Stop) | SEV-3 | Domain fix, resume |
| E1 (Agent Stop) | SEV-4 | Agent restart/replace |

---

## Incident Response Process

### Phase 1: DETECT (0-2 minutes)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PHASE 1: DETECT                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. Alert received (Slack, monitoring, user report)                            │
│   2. Acknowledge alert                                                           │
│   3. Open incident channel/thread                                               │
│   4. Determine severity level                                                    │
│   5. Page appropriate responders                                                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Detection Sources:**
- Slack alerts (#wave-alerts, #wave-security)
- Safety violation detector alerts
- Kill switch activation
- Supabase dashboard
- Manual observation

### Phase 2: CONTAIN (2-10 minutes)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             PHASE 2: CONTAIN                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   SEV-1/SEV-2:                                                                  │
│   1. Activate kill switch immediately                                           │
│   2. Stop all agent containers                                                  │
│   3. Preserve evidence (logs, signals, state)                                   │
│   4. Isolate affected components                                                │
│                                                                                  │
│   SEV-3/SEV-4:                                                                  │
│   1. Stop affected agent/wave only                                              │
│   2. Allow other components to continue                                         │
│   3. Document current state                                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Containment Commands:**
```bash
# SEV-1: Full stop
echo "INCIDENT: $(date) - SEV-1 containment" > .claude/EMERGENCY-STOP
docker compose down

# SEV-2: System stop, preserve state
echo "INCIDENT: $(date) - SEV-2 containment" > .claude/EMERGENCY-STOP
docker compose stop

# SEV-3: Wave stop
echo "INCIDENT: $(date) - Wave 1 stop" > .claude/wave1-STOP

# SEV-4: Agent stop
docker compose stop fe-dev-1
```

### Phase 3: INVESTIGATE (10-60 minutes)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 3: INVESTIGATE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. Gather evidence:                                                            │
│      - Agent logs                                                               │
│      - Signal files                                                             │
│      - Violations log                                                           │
│      - Token tracking                                                           │
│      - Black box recorder                                                       │
│                                                                                  │
│   2. Timeline reconstruction:                                                    │
│      - What happened?                                                           │
│      - When did it start?                                                       │
│      - What was the trigger?                                                    │
│                                                                                  │
│   3. Root cause analysis:                                                        │
│      - Why did it happen?                                                       │
│      - Was it preventable?                                                      │
│      - Were safeguards bypassed?                                                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Investigation Commands:**
```bash
# Collect evidence
mkdir -p /tmp/incident-$(date +%Y%m%d-%H%M%S)
INCIDENT_DIR=/tmp/incident-$(date +%Y%m%d-%H%M%S)

# Copy logs
docker compose logs > $INCIDENT_DIR/docker-logs.txt
cp -r .claude/ $INCIDENT_DIR/claude-state/

# Get recent signals
ls -la .claude/signal-*.json > $INCIDENT_DIR/signal-list.txt
cat .claude/signal-*.json > $INCIDENT_DIR/signals.json

# Get violations
cp .claude/VIOLATIONS.log $INCIDENT_DIR/ 2>/dev/null

# Get cost data
cp .claude/token-tracking.csv $INCIDENT_DIR/

# Black box
cp .claude/black-box/flight-recorder.jsonl $INCIDENT_DIR/ 2>/dev/null

# Create incident summary
echo "Incident: $(date)" > $INCIDENT_DIR/INCIDENT-SUMMARY.md
echo "Severity: [SEV-?]" >> $INCIDENT_DIR/INCIDENT-SUMMARY.md
echo "Status: Investigating" >> $INCIDENT_DIR/INCIDENT-SUMMARY.md
```

### Phase 4: REMEDIATE (Variable)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            PHASE 4: REMEDIATE                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. Fix immediate issue                                                         │
│   2. Verify fix in isolation                                                     │
│   3. Restore service gradually                                                  │
│   4. Monitor for recurrence                                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Phase 5: RECOVER (Variable)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             PHASE 5: RECOVER                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. Remove kill switch                                                          │
│   2. Reset affected components                                                  │
│   3. Resume pipeline (if appropriate)                                           │
│   4. Verify normal operation                                                    │
│   5. Close incident                                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Recovery Commands:**
```bash
# Remove kill switch
rm -f .claude/EMERGENCY-STOP

# Reset state
rm -f .claude/signal-*-ESCALATION.json

# Restart services
docker compose up -d

# Verify health
./core/scripts/check-kill-switch.sh --status
docker compose ps
```

---

## Incident Playbooks by Type

### PLAYBOOK-001: Security Violation Detected (E5)

**Trigger:** Safety violation detector finds L0 forbidden operation

**Severity:** SEV-1

**Immediate Actions:**
```bash
# 1. Verify kill switch activated (should be automatic)
cat .claude/EMERGENCY-STOP

# 2. Stop all containers immediately
docker compose down

# 3. Preserve evidence
mkdir -p /secure/incident-$(date +%Y%m%d)
cp -r .claude/ /secure/incident-$(date +%Y%m%d)/
docker compose logs > /secure/incident-$(date +%Y%m%d)/docker-logs.txt

# 4. Check what was violated
cat .claude/VIOLATIONS.log | tail -10
```

**Investigation Checklist:**
```
□ What pattern was matched?
□ Which agent triggered it?
□ Was it a false positive?
□ Was any data actually exposed/modified?
□ Check git history for malicious commits
□ Review agent prompt for injection
```

**Recovery (only after security review):**
```bash
# 1. Get explicit security approval
# 2. Rotate any potentially exposed credentials
# 3. Update .env with new credentials
# 4. If needed, update forbidden patterns
# 5. Remove kill switch
rm -f .claude/EMERGENCY-STOP
rm -f .claude/SECURITY-HALT

# 6. Restart with enhanced monitoring
./core/scripts/safety-violation-detector.sh --project . &
./core/scripts/wave-orchestrator.sh --project .
```

---

### PLAYBOOK-002: Budget Exceeded (E3/E4)

**Trigger:** Token costs exceed configured budget

**Severity:** SEV-2

**Immediate Actions:**
```bash
# 1. Pipeline should auto-pause
cat .claude/EMERGENCY-STOP

# 2. Check current costs
cat .claude/token-tracking.csv | tail -5

# 3. Calculate total spent
awk -F',' 'NR>1 {sum+=$7} END {print "Total: $" sum}' .claude/token-tracking.csv
```

**Investigation Checklist:**
```
□ Which agent consumed most tokens?
□ Was there an infinite loop?
□ Are stories appropriately sized?
□ Is model selection optimal (Haiku vs Sonnet)?
□ Were there excessive retries?
```

**Recovery Options:**

Option A: Increase budget (requires approval)
```bash
# Update .env
echo "WAVE_BUDGET_USD=30" >> .env

# Remove kill switch and continue
rm -f .claude/EMERGENCY-STOP
./core/scripts/wave-orchestrator.sh --project . --resume
```

Option B: Complete current work only
```bash
# Let current gate finish, don't start new work
rm -f .claude/EMERGENCY-STOP
# Monitor manually, stop after current gate
```

Option C: Reset and restart
```bash
# Backup current tracking
mv .claude/token-tracking.csv .claude/token-tracking-exceeded.csv.bak

# Reset tracking
echo "timestamp,agent,gate,input_tokens,output_tokens,total_tokens,cost_usd,cumulative_cost" > .claude/token-tracking.csv

# Restart
rm -f .claude/EMERGENCY-STOP
./core/scripts/wave-orchestrator.sh --project .
```

---

### PLAYBOOK-003: Agent Stuck/Infinite Loop (E1/E2)

**Trigger:** Agent shows no progress for > 5 minutes, or same error repeated

**Severity:** SEV-3/SEV-4

**Immediate Actions:**
```bash
# 1. Identify stuck agent
docker compose ps | grep -v "Up"
docker compose logs --tail=50 fe-dev-1

# 2. Check for loop patterns
docker compose logs fe-dev-1 | grep -c "error"
docker compose logs fe-dev-1 | tail -100 | sort | uniq -c | sort -rn | head -10
```

**Investigation Checklist:**
```
□ What is the agent trying to do?
□ Is it waiting for a signal that won't come?
□ Is there an API error?
□ Is the prompt unclear?
□ Is the task impossible?
```

**Recovery:**
```bash
# Option 1: Restart agent
docker compose restart fe-dev-1

# Option 2: Reset agent state and retry
docker compose down fe-dev-1
rm -f .claude/signal-*-fe-dev-1-*.json
docker compose up -d fe-dev-1

# Option 3: Skip this agent's work
./core/scripts/update-story-status.sh STORY-001 blocked fe-dev-1
cat > .claude/signal-wave1-gate3-fe-dev-1-skipped.json << EOF
{
  "signal_type": "agent-skipped",
  "agent": "fe-dev-1",
  "reason": "Agent stuck, manual skip",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

---

### PLAYBOOK-004: QA Rejection Loop (E3)

**Trigger:** Gate 4.5 retry count reaches maximum (3)

**Severity:** SEV-2/SEV-3

**Immediate Actions:**
```bash
# 1. Check rejection history
ls -la .claude/signal-*-gate4-rejected.json
cat .claude/signal-*-gate4-rejected.json | jq '.rejection_reasons'

# 2. Check fix attempts
ls -la .claude/signal-*-gate4.5-*.json
```

**Investigation Checklist:**
```
□ What is QA rejecting?
□ Is the rejection valid?
□ Can dev-fix agent address it?
□ Is this an architecture issue?
□ Are acceptance criteria clear?
□ Is this a TypeScript/config issue?
```

**Recovery Options:**

Option A: Manual fix
```bash
# 1. Enter dev-fix worktree
cd worktrees/dev-fix

# 2. Make manual changes
# ... edit files ...

# 3. Commit
git add .
git commit -m "Manual fix for QA rejection: [description]"

# 4. Create fixed signal
cat > ../.claude/signal-wave1-gate4.5-manual-fixed.json << EOF
{
  "signal_type": "manual-fix",
  "fixed_by": "human",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# 5. Re-run QA
docker compose restart qa
```

Option B: Override QA (requires L1 approval)
```bash
# Document approval
cat > .claude/signal-wave1-gate4-manual-override.json << EOF
{
  "signal_type": "qa-override",
  "approved_by": "human",
  "approval_level": "L1",
  "reason": "Non-critical issue, approved to proceed",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

Option C: Escalate to CTO
```bash
cat > .claude/signal-wave1-CTO-REVIEW-NEEDED.json << EOF
{
  "signal_type": "cto-review-needed",
  "reason": "QA rejection loop - architecture decision needed",
  "context": "$(cat .claude/signal-*-gate4-rejected.json | jq -c '.')",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

---

### PLAYBOOK-005: Merge Conflict (E2)

**Trigger:** Git merge fails at Gate 7

**Severity:** SEV-3

**Immediate Actions:**
```bash
# 1. Identify conflicting files
cd worktrees/fe-dev-1
git merge main --no-commit 2>&1 | grep "CONFLICT"

# 2. List conflicted files
git diff --name-only --diff-filter=U
```

**Investigation Checklist:**
```
□ Which files are conflicted?
□ Did agents modify the same file?
□ Is this a domain boundary violation?
□ Are the changes compatible?
```

**Recovery:**
```bash
# Option 1: Manual merge resolution
cd worktrees/fe-dev-1
git merge main
# Resolve conflicts in editor
git add .
git commit -m "Resolve merge conflicts"

# Option 2: Theirs/ours strategy (if one side is clearly correct)
git checkout --theirs path/to/file  # Keep main's version
git checkout --ours path/to/file    # Keep agent's version
git add .
git commit -m "Resolve merge conflict - kept [theirs/ours]"

# Option 3: Re-run agent with updated main
git worktree remove worktrees/fe-dev-1 --force
git worktree add worktrees/fe-dev-1 -b feature/fe-dev-1-v2
# Reassign stories to new worktree
```

---

### PLAYBOOK-006: Infrastructure Failure (E4)

**Trigger:** Docker, Supabase, or Slack unavailable

**Severity:** SEV-1/SEV-2

**Immediate Actions:**
```bash
# 1. Activate kill switch (if not already)
echo "INFRA FAILURE: $(date)" > .claude/EMERGENCY-STOP

# 2. Check Docker
docker ps
docker compose ps
systemctl status docker

# 3. Check Supabase
curl -s "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_SERVICE_KEY"

# 4. Check Slack
curl -s -X POST "$SLACK_WEBHOOK_URL" -d '{"text":"test"}'
```

**Recovery:**
```bash
# Docker restart
sudo systemctl restart docker
docker compose up -d

# If Supabase down: pipeline can continue with local-only mode
# Signals still work, just no remote reporting

# If Slack down: pipeline continues, just no notifications
# Check Supabase or local logs instead
```

---

## Post-Incident Procedures

### Incident Report Template

```markdown
# Incident Report: [INCIDENT-YYYY-MM-DD-NNN]

## Summary
- **Date:** YYYY-MM-DD HH:MM
- **Duration:** X hours Y minutes
- **Severity:** SEV-N
- **Emergency Level:** E-N
- **Affected:** [pipeline/wave/agent]

## Timeline
| Time | Event |
|------|-------|
| HH:MM | Initial alert received |
| HH:MM | Containment initiated |
| HH:MM | Root cause identified |
| HH:MM | Fix applied |
| HH:MM | Service restored |

## Root Cause
[Description of what caused the incident]

## Impact
- Pipeline downtime: X hours
- Tokens wasted: N
- Cost impact: $X.XX
- Stories affected: N

## Resolution
[What was done to fix it]

## Lessons Learned
- [Lesson 1]
- [Lesson 2]

## Action Items
- [ ] [Action 1] - Owner - Due date
- [ ] [Action 2] - Owner - Due date

## Prevention
[What will prevent this from happening again]
```

### Post-Incident Checklist

```
□ Incident report completed
□ Timeline documented
□ Root cause identified
□ Fix verified
□ Monitoring updated if needed
□ FMEA updated if new failure mode
□ Playbook updated if needed
□ Team debriefed
□ Action items assigned
```

---

## Communication Templates

### Incident Start (Slack)
```
🚨 INCIDENT DECLARED

Severity: SEV-[N]
Status: Investigating
Affected: [component]
Impact: [brief description]

Incident Commander: [name]
Thread: [link]
```

### Status Update (Slack)
```
📊 INCIDENT UPDATE

Status: [Investigating/Contained/Remediating/Resolved]
Progress: [what's been done]
ETA: [if known]
Next update: [time]
```

### Incident Resolved (Slack)
```
✅ INCIDENT RESOLVED

Duration: [X hours Y minutes]
Root cause: [brief]
Resolution: [what fixed it]

Post-incident report to follow.
```

---

**Document Status:** CRITICAL
**Last Updated:** 2026-01-16

*WAVE Framework | Incident Response Playbook | Version 1.0.0*
