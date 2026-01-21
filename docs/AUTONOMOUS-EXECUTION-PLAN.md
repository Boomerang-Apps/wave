# WAVE Autonomous Development Execution Plan

**Version:** 1.0.0
**Date:** 2026-01-21
**Status:** DRAFT

---

## Executive Summary

This document outlines the complete process for running autonomous multi-agent development using the WAVE framework. It covers everything from AI Story validation to execution monitoring and retrospective analysis.

---

## Table of Contents

1. [Pre-Flight Phase](#1-pre-flight-phase)
2. [AI Stories Validation](#2-ai-stories-validation)
3. [Domain Wave Planning](#3-domain-wave-planning)
4. [Infrastructure Testing](#4-infrastructure-testing)
5. [Green Light Checklist](#5-green-light-checklist)
6. [Execution Protocol](#6-execution-protocol)
7. [Monitoring & Reporting](#7-monitoring--reporting)
8. [Safety Protocol Enforcement](#8-safety-protocol-enforcement)
9. [Retrospective](#9-retrospective)

---

## 1. Pre-Flight Phase

### 1.1 Prerequisites Checklist

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRE-FLIGHT CHECKLIST                         │
├─────────────────────────────────────────────────────────────────┤
│  [ ] Docker Desktop installed and running                       │
│  [ ] ANTHROPIC_API_KEY configured in .env                       │
│  [ ] Git repository initialized with remote                     │
│  [ ] WAVE framework cloned/updated                              │
│  [ ] Project initialized with WAVE templates                    │
│  [ ] Slack webhook configured (optional)                        │
│  [ ] AI PRD document available                                  │
│  [ ] AI Stories created in stories/ directory                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Environment Setup Script

```bash
#!/bin/bash
# pre-flight-setup.sh

# 1. Verify Docker
docker info > /dev/null 2>&1 || { echo "Docker not running"; exit 1; }

# 2. Verify API Key
[ -f .env ] && grep -q "ANTHROPIC_API_KEY=sk-ant" .env || { echo "API key missing"; exit 1; }

# 3. Verify Git
git status > /dev/null 2>&1 || { echo "Not a git repo"; exit 1; }

# 4. Create required directories
mkdir -p .claude/{prompts,locks,signals,rlm-snapshots,agent-memory}
mkdir -p stories worktrees/{fe-dev,be-dev,qa,dev-fix}

echo "Pre-flight setup complete"
```

---

## 2. AI Stories Validation

### 2.1 Story Analysis Process

```
┌─────────────────────────────────────────────────────────────────┐
│                 AI STORIES VALIDATION FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   AI PRD ──► Story Extraction ──► Schema Validation             │
│                                         │                        │
│                                         ▼                        │
│                              ┌─────────────────┐                │
│                              │  Gap Analysis   │                │
│                              │  - Missing AC   │                │
│                              │  - Scope issues │                │
│                              │  - Dependencies │                │
│                              └────────┬────────┘                │
│                                       │                          │
│                    ┌──────────────────┴──────────────────┐      │
│                    ▼                                      ▼      │
│              [ALIGNED]                            [GAPS FOUND]   │
│                  │                                      │        │
│                  ▼                                      ▼        │
│           Proceed to                           Enhancement      │
│           Domain Planning                      Plan Created     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Story Validation Script

Create: `core/scripts/validation/analyze-stories.sh`

```bash
#!/bin/bash
# Analyzes AI Stories against PRD requirements

PROJECT_PATH=$1
PRD_FILE=$2

echo "═══════════════════════════════════════════════════════════════"
echo " AI STORY ANALYSIS REPORT"
echo "═══════════════════════════════════════════════════════════════"

# 1. Schema Validation (Phase 0)
./core/scripts/building-blocks/phase0-validator.sh \
    --project "$PROJECT_PATH" --wave 1 --dry-run

# 2. Coverage Analysis
echo ""
echo "Checking story coverage against PRD..."
# - Extract features from PRD
# - Map to stories
# - Identify gaps

# 3. Dependency Analysis
echo ""
echo "Analyzing story dependencies..."
# - Check for circular dependencies
# - Verify domain isolation
# - Flag cross-domain conflicts

# 4. Generate Report
cat > "$PROJECT_PATH/reports/story-analysis-$(date +%Y%m%d).json" << EOF
{
  "analysis_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_stories": $(find "$PROJECT_PATH/stories" -name "*.json" | wc -l),
  "schema_valid": true,
  "gaps": [],
  "recommendations": []
}
EOF
```

### 2.3 Gap Analysis Template

When gaps are found, generate an enhancement plan:

```json
{
  "gap_analysis": {
    "date": "2026-01-21",
    "prd_reference": "AI-PRD-v1.0",
    "gaps_found": [
      {
        "id": "GAP-001",
        "type": "missing_story",
        "description": "Authentication flow not covered",
        "prd_section": "3.1 User Authentication",
        "recommendation": "Create AUTH-FE-001 and AUTH-BE-001 stories",
        "priority": "HIGH"
      }
    ],
    "enhancement_plan": [
      {
        "action": "Create missing stories",
        "stories_to_create": ["AUTH-FE-001", "AUTH-BE-001"],
        "estimated_effort": "2 waves"
      }
    ]
  }
}
```

---

## 3. Domain Wave Planning

### 3.1 Domain Decomposition

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOMAIN WAVE STRUCTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Wave 1: Foundation                                              │
│  ├── AUTH-FE-001: Login UI                                      │
│  ├── AUTH-BE-001: Auth API                                      │
│  └── AUTH-BE-002: JWT Service                                   │
│                                                                  │
│  Wave 2: Core Features                                           │
│  ├── PROD-FE-001: Product Listing                               │
│  ├── PROD-BE-001: Product API                                   │
│  └── PROD-BE-002: Inventory Service                             │
│                                                                  │
│  Wave 3: Transactions                                            │
│  ├── PAY-FE-001: Checkout UI                                    │
│  ├── PAY-BE-001: Payment API                                    │
│  └── PAY-BE-002: Stripe Integration                             │
│                                                                  │
│  Wave 4: Enhancement                                             │
│  ├── NOTIF-FE-001: Notification Center                          │
│  └── NOTIF-BE-001: Push Service                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Wave Execution Order

| Wave | Domain | Stories | Type | Dependencies |
|------|--------|---------|------|--------------|
| 1 | Authentication | AUTH-* | FE+BE | None |
| 2 | Products | PROD-* | FE+BE | Wave 1 |
| 3 | Payments | PAY-* | FE+BE | Wave 1, 2 |
| 4 | Notifications | NOTIF-* | FE+BE | Wave 1 |

### 3.3 Domain Wave Planning Script

Create: `core/scripts/planning/generate-wave-plan.sh`

```bash
#!/bin/bash
# Generates domain-based wave execution plan

PROJECT_PATH=$1

echo "Analyzing stories by domain..."

# Group stories by domain prefix
domains=$(ls "$PROJECT_PATH/stories/"*.json | \
    xargs -I{} jq -r '.id' {} | \
    cut -d'-' -f1 | sort -u)

wave=1
for domain in $domains; do
    echo ""
    echo "Wave $wave: $domain"
    echo "─────────────────────"

    # List stories for this domain
    ls "$PROJECT_PATH/stories/"*.json | \
        xargs -I{} jq -r "select(.id | startswith(\"$domain\")) | .id + \": \" + .title" {}

    ((wave++))
done
```

---

## 4. Infrastructure Testing

### 4.1 Infrastructure Test Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE TEST MATRIX                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Test ID   │ Component        │ Validation                       │
│  ──────────┼──────────────────┼────────────────────────────────  │
│  INFRA-01  │ Docker           │ Containers start/stop            │
│  INFRA-02  │ Dozzle           │ Log viewer accessible            │
│  INFRA-03  │ Worktrees        │ Isolation verified               │
│  INFRA-04  │ Terminal         │ Agent execution works            │
│  INFRA-05  │ Slack            │ Notifications delivered          │
│  INFRA-06  │ Git              │ Commits/pushes work              │
│  INFRA-07  │ API Key          │ Claude CLI authenticates         │
│  INFRA-08  │ Signals          │ File creation/detection          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Infrastructure Test Script

Create: `core/scripts/testing/infra-test.sh`

```bash
#!/bin/bash
# Infrastructure validation tests

set -e
PASSED=0
FAILED=0

test_result() {
    if [ $1 -eq 0 ]; then
        echo "  ✓ $2"
        ((PASSED++))
    else
        echo "  ✗ $2"
        ((FAILED++))
    fi
}

echo "═══════════════════════════════════════════════════════════════"
echo " INFRASTRUCTURE TESTS"
echo "═══════════════════════════════════════════════════════════════"

# INFRA-01: Docker
echo ""
echo "[INFRA-01] Docker"
docker info > /dev/null 2>&1
test_result $? "Docker daemon running"

docker compose version > /dev/null 2>&1
test_result $? "Docker Compose available"

# INFRA-02: Dozzle
echo ""
echo "[INFRA-02] Dozzle"
docker compose up -d dozzle 2>/dev/null
sleep 2
curl -s http://localhost:9080 > /dev/null 2>&1
test_result $? "Dozzle accessible at :9080"
docker compose stop dozzle 2>/dev/null

# INFRA-03: Worktrees
echo ""
echo "[INFRA-03] Worktrees"
[ -d "worktrees/fe-dev" ]
test_result $? "FE-DEV worktree exists"
[ -d "worktrees/be-dev" ]
test_result $? "BE-DEV worktree exists"

# INFRA-04: Terminal/Agent
echo ""
echo "[INFRA-04] Agent Execution"
which claude > /dev/null 2>&1
test_result $? "Claude CLI installed"

# INFRA-05: Slack (if configured)
echo ""
echo "[INFRA-05] Slack Notifications"
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -s -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"text":"WAVE Infra Test"}' > /dev/null 2>&1
    test_result $? "Slack webhook reachable"
else
    echo "  ⊘ Slack not configured (optional)"
fi

# INFRA-06: Git
echo ""
echo "[INFRA-06] Git Operations"
git status > /dev/null 2>&1
test_result $? "Git repository valid"
git remote -v | grep -q origin
test_result $? "Git remote configured"

# INFRA-07: API Key
echo ""
echo "[INFRA-07] API Authentication"
grep -q "ANTHROPIC_API_KEY=sk-ant" .env 2>/dev/null
test_result $? "API key format valid"

# INFRA-08: Signal System
echo ""
echo "[INFRA-08] Signal System"
mkdir -p .claude
echo '{"test":true}' > .claude/test-signal.json
[ -f .claude/test-signal.json ]
test_result $? "Signal file creation works"
rm -f .claude/test-signal.json

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " RESULTS: $PASSED passed, $FAILED failed"
echo "═══════════════════════════════════════════════════════════════"

[ $FAILED -eq 0 ] && exit 0 || exit 1
```

### 4.3 Slack Rich Notification Test

```bash
# Test rich Slack notification
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "blocks": [
      {
        "type": "header",
        "text": {"type": "plain_text", "text": "🚀 WAVE Execution Starting"}
      },
      {
        "type": "section",
        "fields": [
          {"type": "mrkdwn", "text": "*Project:*\nphoto-gallery"},
          {"type": "mrkdwn", "text": "*Wave:*\n3"},
          {"type": "mrkdwn", "text": "*Stories:*\n4"},
          {"type": "mrkdwn", "text": "*Agents:*\nFE, BE"}
        ]
      },
      {
        "type": "context",
        "elements": [
          {"type": "mrkdwn", "text": "Started at 2026-01-21 06:00 UTC"}
        ]
      }
    ]
  }'
```

---

## 5. Green Light Checklist

### 5.1 Final Pre-Launch Verification

```
┌─────────────────────────────────────────────────────────────────┐
│                   GREEN LIGHT CHECKLIST                          │
│                  All items must be ✓ to proceed                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STORIES                                                         │
│  [ ] All stories pass Schema V4 validation                       │
│  [ ] No gaps between PRD and stories                             │
│  [ ] Domain dependencies mapped                                  │
│  [ ] Acceptance criteria are testable                            │
│                                                                  │
│  INFRASTRUCTURE                                                  │
│  [ ] Docker containers start successfully                        │
│  [ ] Dozzle dashboard accessible                                 │
│  [ ] Worktrees created and isolated                              │
│  [ ] Git branches configured                                     │
│  [ ] Slack notifications working (if enabled)                    │
│                                                                  │
│  BUILDING BLOCKS                                                 │
│  [ ] Phase 0 lock created (Stories validated)                    │
│  [ ] Phase 2 lock created (Smoke test passed)                    │
│  [ ] No drift detected                                           │
│                                                                  │
│  SAFETY                                                          │
│  [ ] CLAUDE.md present in project                                │
│  [ ] No EMERGENCY-STOP file exists                               │
│  [ ] Budget limits configured                                    │
│  [ ] Max retries set (default: 3)                                │
│                                                                  │
│  ENVIRONMENT                                                     │
│  [ ] .env file configured                                        │
│  [ ] ANTHROPIC_API_KEY valid                                     │
│  [ ] Project paths correct                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Green Light Script

Create: `core/scripts/validation/green-light-check.sh`

```bash
#!/bin/bash
# Final pre-launch verification

PROJECT_PATH=$1
WAVE=$2

echo "═══════════════════════════════════════════════════════════════"
echo " GREEN LIGHT CHECK - Wave $WAVE"
echo "═══════════════════════════════════════════════════════════════"

ALL_CLEAR=true

# Stories
echo ""
echo "📋 STORIES"
./core/scripts/building-blocks/phase0-validator.sh \
    -p "$PROJECT_PATH" -w "$WAVE" --dry-run > /dev/null 2>&1
[ $? -eq 0 ] && echo "  ✓ Schema validation passed" || { echo "  ✗ Schema validation failed"; ALL_CLEAR=false; }

# Infrastructure
echo ""
echo "🔧 INFRASTRUCTURE"
docker info > /dev/null 2>&1
[ $? -eq 0 ] && echo "  ✓ Docker running" || { echo "  ✗ Docker not running"; ALL_CLEAR=false; }

# Building Blocks
echo ""
echo "🧱 BUILDING BLOCKS"
./core/scripts/building-blocks/lock-manager.sh validate \
    -p "$PROJECT_PATH" -w "$WAVE" --phase 0 > /dev/null 2>&1
[ $? -eq 0 ] && echo "  ✓ Phase 0 lock valid" || echo "  ⊘ Phase 0 not locked (will create)"

./core/scripts/building-blocks/lock-manager.sh validate \
    -p "$PROJECT_PATH" -w "$WAVE" --phase 2 > /dev/null 2>&1
[ $? -eq 0 ] && echo "  ✓ Phase 2 lock valid" || echo "  ⊘ Phase 2 not locked (will create)"

# Safety
echo ""
echo "🛡️ SAFETY"
[ -f "$PROJECT_PATH/CLAUDE.md" ] && echo "  ✓ CLAUDE.md present" || { echo "  ✗ CLAUDE.md missing"; ALL_CLEAR=false; }
[ ! -f "$PROJECT_PATH/.claude/EMERGENCY-STOP" ] && echo "  ✓ No emergency stop" || { echo "  ✗ EMERGENCY-STOP active"; ALL_CLEAR=false; }

# Environment
echo ""
echo "⚙️ ENVIRONMENT"
[ -f "$PROJECT_PATH/.env" ] && echo "  ✓ .env file exists" || { echo "  ✗ .env missing"; ALL_CLEAR=false; }
grep -q "ANTHROPIC_API_KEY=sk-ant" "$PROJECT_PATH/.env" 2>/dev/null
[ $? -eq 0 ] && echo "  ✓ API key configured" || { echo "  ✗ API key invalid"; ALL_CLEAR=false; }

# Verdict
echo ""
echo "═══════════════════════════════════════════════════════════════"
if [ "$ALL_CLEAR" = true ]; then
    echo " 🟢 GREEN LIGHT - Ready to launch Wave $WAVE"
    exit 0
else
    echo " 🔴 NOT READY - Fix issues above before launching"
    exit 1
fi
```

---

## 6. Execution Protocol

### 6.1 Launch Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION SEQUENCE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  T-5 min   │ Run green-light-check.sh                           │
│  T-4 min   │ Run phase0-validator.sh (create lock)              │
│  T-3 min   │ Run phase2-validator.sh (smoke test)               │
│  T-2 min   │ Start Dozzle (docker compose up -d dozzle)         │
│  T-1 min   │ Start merge-watcher                                 │
│  T-0       │ Launch agents (./wave-start.sh)                     │
│            │                                                      │
│  [RUNNING] │ Monitor via Dozzle + progress reports               │
│            │                                                      │
│  Gate 3    │ Agents signal completion                            │
│  Gate 4    │ QA validation (auto or manual)                      │
│  Gate 4.5  │ Dev-fix if rejected (max 3 retries)                │
│  Phase 3   │ Run phase3-validator.sh                             │
│  Phase 4   │ Run phase4-validator.sh                             │
│            │                                                      │
│  COMPLETE  │ Generate retrospective report                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Master Launch Script

Create: `core/scripts/launch/wave-launch.sh`

```bash
#!/bin/bash
# Master launch script for autonomous execution

set -e

PROJECT_PATH=$1
WAVE=$2
TYPE=${3:-FE_BE}  # FE_ONLY, BE_ONLY, FE_BE

echo "═══════════════════════════════════════════════════════════════"
echo " WAVE AUTONOMOUS LAUNCH"
echo " Project: $PROJECT_PATH"
echo " Wave: $WAVE"
echo " Type: $TYPE"
echo "═══════════════════════════════════════════════════════════════"

# T-5: Green light check
echo ""
echo "[T-5] Running green light check..."
./core/scripts/validation/green-light-check.sh "$PROJECT_PATH" "$WAVE"

# T-4: Phase 0 validation
echo ""
echo "[T-4] Validating stories (Phase 0)..."
./core/scripts/building-blocks/phase0-validator.sh \
    --project "$PROJECT_PATH" --wave "$WAVE"

# T-3: Phase 2 smoke test
echo ""
echo "[T-3] Running smoke test (Phase 2)..."
./core/scripts/building-blocks/phase2-validator.sh \
    --project "$PROJECT_PATH" --wave "$WAVE"

# T-2: Start monitoring
echo ""
echo "[T-2] Starting Dozzle..."
PROJECT_PATH="$PROJECT_PATH" WAVE_NUMBER="$WAVE" docker compose up -d dozzle

# T-1: Start merge-watcher
echo ""
echo "[T-1] Starting merge-watcher..."
PROJECT_PATH="$PROJECT_PATH" WAVE_NUMBER="$WAVE" docker compose up -d merge-watcher

sleep 3

# T-0: Launch agents
echo ""
echo "[T-0] LAUNCHING AGENTS..."

case $TYPE in
    FE_ONLY)
        ./wave-start.sh --project "$PROJECT_PATH" --wave "$WAVE" --fe-only
        ;;
    BE_ONLY)
        ./wave-start.sh --project "$PROJECT_PATH" --wave "$WAVE" --be-only
        ;;
    FE_BE)
        ./wave-start.sh --project "$PROJECT_PATH" --wave "$WAVE"
        ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " LAUNCH COMPLETE"
echo " Monitor: http://localhost:9080 (Dozzle)"
echo " Logs: docker compose logs -f"
echo "═══════════════════════════════════════════════════════════════"
```

---

## 7. Monitoring & Reporting

### 7.1 Progress Report Structure

Reports generated every 5 minutes during execution:

```json
{
  "report_type": "progress",
  "timestamp": "2026-01-21T06:15:00Z",
  "wave": 3,
  "elapsed_minutes": 15,
  "status": "IN_PROGRESS",
  "agents": {
    "fe-dev": {
      "status": "RUNNING",
      "current_story": "WAVE3-FE-001",
      "acceptance_criteria_completed": 3,
      "acceptance_criteria_total": 5
    },
    "be-dev": {
      "status": "RUNNING",
      "current_story": "WAVE3-BE-001",
      "acceptance_criteria_completed": 2,
      "acceptance_criteria_total": 4
    }
  },
  "signals_detected": [
    "signal-wave3-gate3-fe-complete.json"
  ],
  "budget": {
    "used_usd": 0.75,
    "limit_usd": 2.00,
    "percentage": 37.5
  },
  "health": {
    "docker": "healthy",
    "merge_watcher": "running",
    "drift_detected": false
  }
}
```

### 7.2 Progress Monitor Script

Create: `core/scripts/monitoring/progress-monitor.sh`

```bash
#!/bin/bash
# Generates progress reports every N minutes

PROJECT_PATH=$1
WAVE=$2
INTERVAL=${3:-300}  # 5 minutes default

REPORT_DIR="$PROJECT_PATH/reports/wave$WAVE"
mkdir -p "$REPORT_DIR"

while true; do
    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    REPORT_FILE="$REPORT_DIR/progress-$(date +%H%M%S).json"

    # Collect status
    FE_STATUS=$(docker inspect wave-fe-dev --format='{{.State.Status}}' 2>/dev/null || echo "not_running")
    BE_STATUS=$(docker inspect wave-be-dev --format='{{.State.Status}}' 2>/dev/null || echo "not_running")

    # Check signals
    FE_COMPLETE=$([ -f "$PROJECT_PATH/.claude/signal-wave${WAVE}-gate3-fe-complete.json" ] && echo "true" || echo "false")
    BE_COMPLETE=$([ -f "$PROJECT_PATH/.claude/signal-wave${WAVE}-gate3-be-complete.json" ] && echo "true" || echo "false")

    # Generate report
    cat > "$REPORT_FILE" << EOF
{
  "report_type": "progress",
  "timestamp": "$TIMESTAMP",
  "wave": $WAVE,
  "agents": {
    "fe-dev": {"status": "$FE_STATUS", "complete": $FE_COMPLETE},
    "be-dev": {"status": "$BE_STATUS", "complete": $BE_COMPLETE}
  }
}
EOF

    echo "[$(date +%H:%M:%S)] Progress report: $REPORT_FILE"

    # Send to Slack if configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"Wave $WAVE Progress: FE=$FE_STATUS, BE=$BE_STATUS\"}" > /dev/null
    fi

    # Check if complete
    if [ "$FE_COMPLETE" = "true" ] && [ "$BE_COMPLETE" = "true" ]; then
        echo "All agents complete - stopping monitor"
        break
    fi

    sleep $INTERVAL
done
```

### 7.3 Slack Progress Notification

```bash
# Rich progress notification
send_progress_slack() {
    local wave=$1
    local fe_status=$2
    local be_status=$3
    local elapsed=$4

    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"blocks\": [
          {
            \"type\": \"section\",
            \"text\": {\"type\": \"mrkdwn\", \"text\": \"*Wave $wave Progress Report*\"}
          },
          {
            \"type\": \"section\",
            \"fields\": [
              {\"type\": \"mrkdwn\", \"text\": \"*FE-DEV:*\n$fe_status\"},
              {\"type\": \"mrkdwn\", \"text\": \"*BE-DEV:*\n$be_status\"},
              {\"type\": \"mrkdwn\", \"text\": \"*Elapsed:*\n${elapsed}min\"},
              {\"type\": \"mrkdwn\", \"text\": \"*Budget:*\n\$0.75/\$2.00\"}
            ]
          }
        ]
      }"
}
```

---

## 8. Safety Protocol Enforcement

### 8.1 Gate Enforcement Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                   SAFETY GATE ENFORCEMENT                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Gate    │ Check                    │ Enforcement                │
│  ────────┼──────────────────────────┼──────────────────────────  │
│  Gate 0  │ Stories exist            │ Phase 0 validator          │
│  Gate 2  │ Build/test/lint pass     │ Phase 2 validator          │
│  Gate 3  │ Agent signals complete   │ merge-watcher detection    │
│  Gate 4  │ QA approval              │ Phase 4 validator          │
│  Gate 4.5│ Dev-fix on rejection     │ Retry loop (max 3)         │
│                                                                  │
│  LOCKS                                                           │
│  ────────────────────────────────────────────────────────────── │
│  - Each phase creates lock file with SHA256 checksum            │
│  - Cannot proceed without valid previous lock                    │
│  - Drift detection auto-invalidates downstream locks             │
│                                                                  │
│  EMERGENCY STOP                                                  │
│  ────────────────────────────────────────────────────────────── │
│  - Create .claude/EMERGENCY-STOP to halt all agents             │
│  - Checked before every agent action                             │
│  - Immediate termination on detection                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Safety Consistency Script

Create: `core/scripts/safety/verify-safety.sh`

```bash
#!/bin/bash
# Verifies safety protocol is being followed

PROJECT_PATH=$1

echo "═══════════════════════════════════════════════════════════════"
echo " SAFETY PROTOCOL VERIFICATION"
echo "═══════════════════════════════════════════════════════════════"

# 1. CLAUDE.md check
echo ""
echo "1. Agent Safety Instructions"
if [ -f "$PROJECT_PATH/CLAUDE.md" ]; then
    FORBIDDEN_COUNT=$(grep -c "❌" "$PROJECT_PATH/CLAUDE.md" || echo 0)
    echo "   ✓ CLAUDE.md present ($FORBIDDEN_COUNT forbidden operations defined)"
else
    echo "   ✗ CLAUDE.md missing - CRITICAL"
fi

# 2. Emergency stop check
echo ""
echo "2. Emergency Stop"
if [ -f "$PROJECT_PATH/.claude/EMERGENCY-STOP" ]; then
    echo "   ⚠ EMERGENCY-STOP is ACTIVE"
else
    echo "   ✓ No emergency stop"
fi

# 3. Lock chain integrity
echo ""
echo "3. Lock Chain Integrity"
./core/scripts/building-blocks/drift-detector.sh \
    --project "$PROJECT_PATH" --wave 3 2>/dev/null || echo "   Run drift detector for details"

# 4. Budget check
echo ""
echo "4. Budget Controls"
if grep -q "WAVE_BUDGET" "$PROJECT_PATH/.env" 2>/dev/null; then
    BUDGET=$(grep "WAVE_BUDGET" "$PROJECT_PATH/.env" | cut -d= -f2)
    echo "   ✓ Wave budget: \$$BUDGET"
else
    echo "   ⊘ Budget not configured (unlimited)"
fi

# 5. Retry limits
echo ""
echo "5. Retry Limits"
MAX_RETRIES=$(grep "MAX_RETRIES" "$PROJECT_PATH/.env" 2>/dev/null | cut -d= -f2 || echo "3")
echo "   ✓ Max retries: $MAX_RETRIES"
```

---

## 9. Retrospective

### 9.1 Retrospective Report Structure

Generated at end of each wave:

```json
{
  "retrospective": {
    "wave": 3,
    "project": "photo-gallery",
    "date": "2026-01-21",
    "duration_minutes": 45,

    "summary": {
      "stories_completed": 4,
      "stories_total": 4,
      "success_rate": "100%"
    },

    "metrics": {
      "total_cost_usd": 1.25,
      "budget_usd": 2.00,
      "budget_utilization": "62.5%",
      "tokens_used": 125000,
      "api_calls": 42
    },

    "quality": {
      "tests_passed": 198,
      "tests_failed": 0,
      "coverage": "79.54%",
      "typescript_errors": 0,
      "lint_errors": 0
    },

    "timeline": {
      "started": "2026-01-21T06:00:00Z",
      "gate3_fe": "2026-01-21T06:25:00Z",
      "gate3_be": null,
      "gate4_approved": "2026-01-21T06:45:00Z",
      "completed": "2026-01-21T06:45:00Z"
    },

    "issues": [
      {
        "type": "warning",
        "description": "ESLint config warning (non-blocking)",
        "resolution": "Pre-existing project issue"
      }
    ],

    "lessons_learned": [
      "Coverage threshold met for modified files",
      "API integration completed without manual intervention"
    ],

    "recommendations": [
      "Consider adding E2E tests for critical paths",
      "Update ESLint config to resolve warnings"
    ]
  }
}
```

### 9.2 Retrospective Generator Script

Create: `core/scripts/reporting/generate-retrospective.sh`

```bash
#!/bin/bash
# Generates wave retrospective report

PROJECT_PATH=$1
WAVE=$2

REPORT_DIR="$PROJECT_PATH/reports"
mkdir -p "$REPORT_DIR"

REPORT_FILE="$REPORT_DIR/retrospective-wave$WAVE-$(date +%Y%m%d-%H%M%S).json"

echo "Generating retrospective for Wave $WAVE..."

# Collect data
SIGNAL_FILE="$PROJECT_PATH/.claude/signal-wave${WAVE}-gate3-fe-complete.json"
APPROVAL_FILE="$PROJECT_PATH/.claude/signal-wave${WAVE}-gate4-approved.json"

# Generate report
cat > "$REPORT_FILE" << EOF
{
  "retrospective": {
    "wave": $WAVE,
    "project": "$(basename $PROJECT_PATH)",
    "date": "$(date +%Y-%m-%d)",
    "completed": $([ -f "$APPROVAL_FILE" ] && echo "true" || echo "false"),
    "report_file": "$REPORT_FILE"
  }
}
EOF

echo "Retrospective saved: $REPORT_FILE"

# Send to Slack
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"blocks\": [
          {\"type\": \"header\", \"text\": {\"type\": \"plain_text\", \"text\": \"📊 Wave $WAVE Retrospective\"}},
          {\"type\": \"section\", \"text\": {\"type\": \"mrkdwn\", \"text\": \"Execution complete. Review report at \`$REPORT_FILE\`\"}}
        ]
      }"
fi
```

---

## 10. Complete Execution Checklist

### Step-by-Step Launch Guide

```
┌─────────────────────────────────────────────────────────────────┐
│              AUTONOMOUS EXECUTION CHECKLIST                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BEFORE LAUNCH (Do Once)                                         │
│  ──────────────────────────────────────────────────────────────  │
│  [ ] 1. Clone/update WAVE framework                              │
│  [ ] 2. Configure .env with ANTHROPIC_API_KEY                    │
│  [ ] 3. Initialize project with templates                        │
│  [ ] 4. Create AI Stories from PRD                               │
│  [ ] 5. Run story analysis (analyze-stories.sh)                  │
│  [ ] 6. Fix any gaps found                                       │
│  [ ] 7. Create domain wave plan                                  │
│  [ ] 8. Run infrastructure tests (infra-test.sh)                 │
│                                                                  │
│  FOR EACH WAVE                                                   │
│  ──────────────────────────────────────────────────────────────  │
│  [ ] 1. Run green-light-check.sh                                 │
│  [ ] 2. Run phase0-validator.sh                                  │
│  [ ] 3. Run phase2-validator.sh                                  │
│  [ ] 4. Launch: ./wave-start.sh --project PATH --wave N          │
│  [ ] 5. Monitor: http://localhost:9080                           │
│  [ ] 6. Wait for Gate 3 signals                                  │
│  [ ] 7. Run phase3-validator.sh                                  │
│  [ ] 8. Run phase4-validator.sh                                  │
│  [ ] 9. Generate retrospective                                   │
│  [ ] 10. Commit and push changes                                 │
│                                                                  │
│  TROUBLESHOOTING                                                 │
│  ──────────────────────────────────────────────────────────────  │
│  - Agent stuck: Check Dozzle logs                                │
│  - QA rejection: Check rejection signal for issues               │
│  - Drift detected: Re-run validators from Phase 0                │
│  - Emergency: echo "STOP" > .claude/EMERGENCY-STOP               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scripts Summary

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `analyze-stories.sh` | Validate stories against PRD | Before first wave |
| `generate-wave-plan.sh` | Create domain-based wave plan | Before first wave |
| `infra-test.sh` | Test Docker, Dozzle, etc. | Before first wave |
| `green-light-check.sh` | Final pre-launch verification | Before each wave |
| `wave-launch.sh` | Master launch script | Start of each wave |
| `progress-monitor.sh` | Generate progress reports | During execution |
| `verify-safety.sh` | Check safety compliance | Anytime |
| `generate-retrospective.sh` | Create wave summary | After each wave |

---

## Quick Reference Commands

```bash
# Full autonomous launch
./core/scripts/launch/wave-launch.sh /path/to/project 3 FE_BE

# Just check readiness
./core/scripts/validation/green-light-check.sh /path/to/project 3

# Monitor progress
./core/scripts/monitoring/progress-monitor.sh /path/to/project 3

# Emergency stop
echo "STOP" > /path/to/project/.claude/EMERGENCY-STOP

# View logs
docker compose logs -f fe-dev

# Check lock status
./core/scripts/building-blocks/lock-manager.sh status -p /path/to/project -w 3
```

---

*WAVE Autonomous Execution Plan v1.0.0 | 2026-01-21*
