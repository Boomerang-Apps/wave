# WAVE Framework - Operations Handbook

**Version:** 1.0.0
**Classification:** OPERATIONAL - Daily reference for pipeline operators
**Audience:** DevOps, Pipeline Operators, Development Leads

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Daily Operations Checklist](#daily-operations-checklist)
3. [Pipeline Startup Procedures](#pipeline-startup-procedures)
4. [Monitoring & Observability](#monitoring--observability)
5. [Common Operations](#common-operations)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Maintenance Procedures](#maintenance-procedures)

---

## Quick Reference

### Essential Commands

```bash
# Pre-flight validation
./core/scripts/pre-flight-validator.sh --project /path/to/project

# Protocol compliance check
./core/scripts/protocol-compliance-checker.sh --project /path/to/project

# Start pipeline
./core/scripts/wave-orchestrator.sh --project /path/to/project

# Monitor kill switch
./core/scripts/check-kill-switch.sh --continuous

# Start safety monitor
./core/scripts/safety-violation-detector.sh --project /path/to/project

# Emergency stop
echo "STOP: [reason]" > /path/to/project/.claude/EMERGENCY-STOP

# Generate report
./core/scripts/validation-report-generator.sh --project /path/to/project
```

### Key File Locations

| File | Purpose |
|------|---------|
| `.claude/EMERGENCY-STOP` | Kill switch file |
| `.claude/signal-*.json` | Agent coordination signals |
| `.claude/VIOLATIONS.log` | Safety violations log |
| `.claude/token-tracking.csv` | Cost tracking |
| `VALIDATION-REPORT.md` | Post-pipeline report |

### Emergency Contacts

| Role | Responsibility |
|------|---------------|
| Pipeline Operator | Day-to-day operations |
| Development Lead | Escalation L2 |
| CTO | Escalation L1, Architecture |
| Security | E5 Security incidents |

---

## Daily Operations Checklist

### Pre-Shift Checklist

```
□ Check Supabase dashboard for any active kill switches
□ Review previous pipeline runs (VALIDATION-REPORT.md)
□ Check Slack channel for overnight alerts
□ Verify Docker daemon is running
□ Confirm API key validity (not expired)
□ Review pending stories in backlog
```

### Pipeline Start Checklist

```
□ Run protocol-compliance-checker.sh (must be 90%+)
□ Run pre-flight-validator.sh (must return GO)
□ Clear any old signal files from previous runs
□ Verify .env file is configured correctly
□ Start safety-violation-detector.sh in background
□ Start wave-orchestrator.sh
□ Confirm Slack notification received for PIPELINE_START
```

### During Pipeline Checklist

```
□ Monitor Slack for gate transitions
□ Watch for budget warnings (75%, 90%)
□ Check for stuck agents (no progress > 5 min)
□ Review QA rejections promptly
□ Monitor cost tracking
```

### Post-Pipeline Checklist

```
□ Run validation-report-generator.sh
□ Review VALIDATION-REPORT.md
□ Archive signal files if needed
□ Document any issues encountered
□ Update story status in Supabase
□ Reset cost tracking for next run
```

---

## Pipeline Startup Procedures

### Standard Startup Sequence

```bash
#!/bin/bash
# Standard pipeline startup sequence

PROJECT="/path/to/your/project"
WAVE_HOME="/Volumes/SSD-01/Projects/WAVE"

# Step 1: Compliance check
echo "Step 1: Running compliance check..."
$WAVE_HOME/core/scripts/protocol-compliance-checker.sh --project $PROJECT
if [ $? -ne 0 ]; then
    echo "❌ Compliance check failed. Fix issues before proceeding."
    exit 1
fi

# Step 2: Pre-flight validation
echo "Step 2: Running pre-flight validation..."
$WAVE_HOME/core/scripts/pre-flight-validator.sh --project $PROJECT
if [ $? -ne 0 ]; then
    echo "❌ Pre-flight failed. Review output and fix issues."
    exit 1
fi

# Step 3: Clear old signals
echo "Step 3: Clearing old signals..."
rm -f $PROJECT/.claude/signal-*.json 2>/dev/null

# Step 4: Start safety monitor (background)
echo "Step 4: Starting safety monitor..."
$WAVE_HOME/core/scripts/safety-violation-detector.sh --project $PROJECT &
SAFETY_PID=$!
echo "Safety monitor PID: $SAFETY_PID"

# Step 5: Start orchestrator
echo "Step 5: Starting orchestrator..."
$WAVE_HOME/core/scripts/wave-orchestrator.sh --project $PROJECT

# Cleanup
kill $SAFETY_PID 2>/dev/null
```

### Docker Compose Startup

```bash
# Navigate to project
cd /path/to/your/project

# Build images (first time or after changes)
docker compose build

# Start all services
docker compose up -d

# Follow logs
docker compose logs -f

# Start specific wave only
docker compose up -d fe-dev-1 be-dev-1

# Start with leadership agents
docker compose --profile leadership up -d
```

### Restart After Failure

```bash
# 1. Check what failed
cat .claude/signal-*-ESCALATION.json
cat .claude/VIOLATIONS.log

# 2. Remove kill switch if present
rm -f .claude/EMERGENCY-STOP

# 3. Reset wave status
./scripts/update-wave-status.sh 1 pending 0

# 4. Clear failed signals
rm -f .claude/signal-*-rejected.json
rm -f .claude/signal-*-ESCALATION.json

# 5. Restart from specific gate
docker compose up -d dev-fix  # For Gate 4.5 retry
```

---

## Monitoring & Observability

### Slack Notifications

| Event | Channel | Priority |
|-------|---------|----------|
| PIPELINE_START | #wave-pipeline | Info |
| GATE_COMPLETE | #wave-pipeline | Info |
| BUDGET_WARNING | #wave-alerts | Warning |
| QA_REJECTED | #wave-alerts | Warning |
| ESCALATION | #wave-alerts | High |
| KILL_SWITCH | #wave-alerts | Critical |
| SECURITY_VIOLATION | #wave-security | Critical |

### Key Metrics to Watch

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Budget usage | 75% | 90% | Review, consider pause |
| Agent iteration | 40 | 50 | Check for loops |
| Time per gate | 15 min | 30 min | Check stuck detection |
| Retry count | 2 | 3 | Prepare for escalation |
| Signal delay | 2 min | 5 min | Check agent health |

### Log Locations

```bash
# Agent logs (Docker)
docker compose logs fe-dev-1
docker compose logs be-dev-1
docker compose logs qa

# Signal files
ls -la .claude/signal-*.json

# Violations
cat .claude/VIOLATIONS.log

# Cost tracking
cat .claude/token-tracking.csv

# Black box recorder
cat .claude/black-box/flight-recorder.jsonl
```

### Health Checks

```bash
# Check Docker containers
docker compose ps

# Check agent health
curl -s http://localhost:3000/api/health  # If portal running

# Check Supabase connection
curl -s "$SUPABASE_URL/rest/v1/maf_pipeline?select=id" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"

# Check kill switch status
./core/scripts/check-kill-switch.sh --status
```

---

## Common Operations

### Pause Pipeline

```bash
# Graceful pause (wait for current gate to complete)
touch .claude/PAUSE-REQUESTED

# Immediate pause (stop current operations)
echo "PAUSE: Operator requested pause" > .claude/EMERGENCY-STOP
```

### Resume Pipeline

```bash
# Remove pause/stop files
rm -f .claude/EMERGENCY-STOP
rm -f .claude/PAUSE-REQUESTED

# Check current state
ls -la .claude/signal-*.json

# Resume orchestrator
./core/scripts/wave-orchestrator.sh --project /path/to/project --resume
```

### Skip Failed Story

```bash
# Mark story as blocked
./core/scripts/update-story-status.sh STORY-001 blocked fe-dev-1

# Create skip signal
cat > .claude/signal-wave1-STORY-001-skipped.json << EOF
{
  "signal_type": "story-skipped",
  "story_id": "STORY-001",
  "reason": "Blocked pending architecture decision",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Continue with remaining stories
```

### Force QA Approval (Emergency Only)

```bash
# WARNING: Requires L1 human approval
# Only use when QA agent is stuck on non-critical issue

# Create manual approval signal
cat > .claude/signal-wave1-gate4-manual-approved.json << EOF
{
  "signal_type": "gate4-manual-approved",
  "approved_by": "human",
  "reason": "QA stuck on cosmetic issue, manually approved",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "l1_approval": true
}
EOF
```

### Reset Cost Tracking

```bash
# Backup current tracking
cp .claude/token-tracking.csv .claude/token-tracking-$(date +%Y%m%d).csv.bak

# Reset tracking
echo "timestamp,agent,gate,input_tokens,output_tokens,total_tokens,cost_usd,cumulative_cost" > .claude/token-tracking.csv
```

### View Agent Worktree Status

```bash
# List all worktrees
git worktree list

# Check specific worktree
cd worktrees/fe-dev-1 && git status

# See changes made by agent
cd worktrees/fe-dev-1 && git diff main

# Check branch ahead/behind
cd worktrees/fe-dev-1 && git log main..HEAD --oneline
```

---

## Troubleshooting Guide

### Agent Won't Start

**Symptoms:** Container exits immediately, no logs

**Diagnosis:**
```bash
docker compose logs fe-dev-1
docker inspect wave-fe-dev-1
```

**Common Causes:**
1. Missing API key → Check .env file
2. Invalid CLAUDE.md → Validate syntax
3. Docker image issue → Rebuild: `docker compose build`
4. Permission denied → Check Dockerfile.agent has non-root user

**Resolution:**
```bash
# Rebuild and restart
docker compose down fe-dev-1
docker compose build fe-dev-1
docker compose up -d fe-dev-1
```

### Agent Stuck (No Progress)

**Symptoms:** No new signals for > 5 minutes, agent container running

**Diagnosis:**
```bash
# Check recent logs
docker compose logs --tail=100 fe-dev-1

# Check for infinite loop patterns
docker compose logs fe-dev-1 | grep -c "same error"
```

**Common Causes:**
1. Infinite retry loop → Max iterations reached
2. Waiting for input → Agent confused
3. API rate limit → Check Anthropic status
4. Large file processing → Just slow

**Resolution:**
```bash
# Option 1: Restart agent
docker compose restart fe-dev-1

# Option 2: Trigger E1 stop
./core/scripts/check-kill-switch.sh --activate "Agent stuck" "operator"

# Option 3: Manual intervention
docker compose exec fe-dev-1 bash
# Then investigate inside container
```

### QA Keeps Rejecting

**Symptoms:** Gate 4.5 retry count increasing, same errors

**Diagnosis:**
```bash
# Check rejection reasons
cat .claude/signal-*-gate4-rejected.json | jq '.rejection_reasons'

# Check dev-fix attempts
cat .claude/signal-*-gate4.5-*.json
```

**Common Causes:**
1. Unfixable architecture issue → Escalate to CTO
2. Unclear acceptance criteria → Review story
3. External dependency issue → Check APIs
4. TypeScript strict mode issues → Review tsconfig

**Resolution:**
```bash
# Option 1: Update acceptance criteria
# Edit story JSON, then restart

# Option 2: Manual fix
cd worktrees/dev-fix
# Make manual changes
git add . && git commit -m "Manual fix for QA issue"

# Option 3: Escalate
cat > .claude/signal-wave1-ESCALATION.json << EOF
{
  "signal_type": "ESCALATION",
  "reason": "QA rejection loop - needs human review",
  "retry_count": 3,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

### Budget Exceeded

**Symptoms:** Pipeline paused, budget alert received

**Diagnosis:**
```bash
cat .claude/token-tracking.csv | tail -5
```

**Resolution:**
```bash
# Option 1: Increase budget (requires approval)
# Update .env: WAVE_BUDGET_USD=30

# Option 2: Complete current wave, stop further work
# Let current gates finish, don't start new waves

# Option 3: Reset and continue (requires L1 approval)
./core/scripts/check-kill-switch.sh --deactivate
echo "timestamp,agent,gate,input_tokens,output_tokens,total_tokens,cost_usd,cumulative_cost" > .claude/token-tracking.csv
```

### Merge Conflicts

**Symptoms:** Gate 7 merge fails, conflict markers in files

**Diagnosis:**
```bash
cd worktrees/fe-dev-1
git merge main --no-commit
git diff --name-only --diff-filter=U  # Show conflicted files
```

**Resolution:**
```bash
# Option 1: Manual merge
cd worktrees/fe-dev-1
git merge main
# Resolve conflicts manually
git add .
git commit -m "Resolve merge conflicts with main"

# Option 2: Rebase (if appropriate)
cd worktrees/fe-dev-1
git fetch origin
git rebase origin/main
# Resolve conflicts
git rebase --continue

# Option 3: Re-run agent with fresh worktree
git worktree remove worktrees/fe-dev-1
git worktree add worktrees/fe-dev-1 -b feature/fe-dev-1-v2
```

---

## Maintenance Procedures

### Daily Maintenance

```bash
# Clean up old signal files (keep last 7 days)
find .claude -name "signal-*.json" -mtime +7 -delete

# Archive completed pipeline logs
tar -czf logs-$(date +%Y%m%d).tar.gz .claude/*.log
mv logs-*.tar.gz /archive/

# Prune Docker resources
docker system prune -f
```

### Weekly Maintenance

```bash
# Update WAVE framework
cd /Volumes/SSD-01/Projects/WAVE
git pull origin main

# Rebuild agent images
docker compose build --no-cache

# Verify all scripts executable
find core/scripts -name "*.sh" -exec chmod +x {} \;

# Run compliance check on WAVE itself
./core/scripts/protocol-compliance-checker.sh --project .
```

### Monthly Maintenance

```bash
# Review and archive old validation reports
mkdir -p /archive/reports/$(date +%Y%m)
mv */VALIDATION-REPORT-*.md /archive/reports/$(date +%Y%m)/

# Review FMEA - any new failure modes?
# Update if new patterns discovered

# Review cost trends
# Generate monthly cost report from token-tracking.csv

# Security review
# Check for any VIOLATIONS.log entries
# Review and rotate API keys if needed
```

### Before Major Updates

```bash
# 1. Complete all running pipelines
# 2. Backup current state
tar -czf wave-backup-$(date +%Y%m%d).tar.gz \
  .claudecode/ core/ WAVE-PLAN.md

# 3. Document current version
cat WAVE-PLAN.md | grep "Version:" > VERSION-BEFORE.txt

# 4. Run full test after update
./core/scripts/protocol-compliance-checker.sh --project test-project
./core/scripts/pre-flight-validator.sh --project test-project
```

---

## Appendix: Signal File Reference

### Signal Naming Convention

```
signal-wave{N}-gate{G}-{agent}-{status}.json
signal-wave{N}-{event}.json
signal-{emergency-level}.json
```

### Common Signal Types

| Signal | Created By | Purpose |
|--------|------------|---------|
| `signal-wave1-gate3-fe-dev-1-complete.json` | FE-Dev-1 | Dev work complete |
| `signal-wave1-gate4-approved.json` | QA | QA passed |
| `signal-wave1-gate4-rejected.json` | QA | QA failed |
| `signal-wave1-gate4.5-retry.json` | Orchestrator | Retry triggered |
| `signal-wave1-gate4.5-fixed.json` | Dev-Fix | Fix applied |
| `signal-wave1-ESCALATION.json` | Orchestrator | Human needed |
| `signal-wave1-gate7-merge-approved.json` | PM | Ready to merge |

---

**Document Status:** OPERATIONAL
**Last Updated:** 2026-01-16

*WAVE Framework | Operations Handbook | Version 1.0.0*
