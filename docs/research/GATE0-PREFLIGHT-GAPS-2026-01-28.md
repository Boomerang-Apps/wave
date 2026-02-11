# GATE 0 RESEARCH: Pre-Flight Gaps Documentation
**Date:** 2026-01-28 19:15 IST
**Researcher:** Claude Code (Opus 4.5)
**Status:** RESEARCH COMPLETE - Ready for TDD

---

## Issue 1: Slack Channel Validation

### Problem Statement
Pre-flight checks that SLACK_WEBHOOK_URL exists, but does NOT validate the destination channel.

### Evidence

**PROOF 1.1:** Webhook configured in `.env`
```
SLACK_WEBHOOK_URL=https://hooks.example.com/services/[REDACTED]/[REDACTED]/[REDACTED]
```

**PROOF 1.2:** Webhook points to WRONG channel
- **Actual:** #maf-tests (screenshot evidence at 19:01 IST)
- **Expected:** #wave-notifications

**PROOF 1.3:** P.json missing `slack_channel` field
- No `slack_channel` key in P.json schema
- Cannot validate destination without this field

**PROOF 1.4:** Pre-flight has NO Slack channel validation
- Current check: `[ -n "$SLACK_WEBHOOK_URL" ]` (existence only)
- Missing: Channel destination verification

### Root Cause
Pre-flight validates webhook URL FORMAT but not DESTINATION.

### Required Fix
1. Add `slack_channel` field to P.json schema
2. Add pre-flight check to verify channel matches expected
3. Add dry-run test to confirm notifications reach correct channel

---

## Issue 2: LangSmith Propagation

### Problem Statement
LANGSMITH environment variables exist in `.env` but are NOT propagated to all agent containers in docker-compose.yml.

### Evidence

**PROOF 2.1:** LANGSMITH configured in `.env`
```
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_sk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX_XXXXXXXXXXXX
LANGSMITH_WORKSPACE_ID=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

**PROOF 2.2:** Only 5 LANGSMITH references in docker-compose.yml
- Expected: 11 services (all agents)
- Actual: 5 references

**PROOF 2.3:** Service-by-service analysis
| Service | Has LANGSMITH |
|---------|---------------|
| orchestrator | ✅ YES |
| pm | ✅ YES |
| cto | ❌ NO |
| fe-dev-1 | ❌ NO |
| fe-dev-2 | ❌ NO |
| be-dev-1 | ❌ NO |
| be-dev-2 | ❌ NO |
| qa | ❌ NO |
| dev-fix | ❌ NO |

**PROOF 2.4:** LangSmith dashboard shows NO new traces
- Last traces: 3+ hours ago
- PM agent executed but NO traces captured

### Root Cause
docker-compose.yml services are missing LANGSMITH_* environment variables.

### Required Fix
1. Add LANGSMITH_TRACING, LANGSMITH_API_KEY, LANGSMITH_PROJECT to ALL agent services
2. Add pre-flight check to verify LANGSMITH propagation count >= 9
3. Add pre-flight check to verify agent containers have LANGSMITH env

---

## Issue 3: Container Cleanup

### Problem Statement
No pre-flight check for stale/duplicate containers before startup.

### Evidence

**PROOF 3.1:** Duplicate containers were running
```
Old containers (4 hours old):
- wave-be-agent-2, wave-fe-agent-1, wave-fe-agent-2
- wave-pm-agent, wave-be-agent-1, wave-qa-agent, wave-cto-agent

New containers (11 minutes):
- wave-pm, wave-cto, wave-qa, wave-dev-fix
- wave-fe-dev-1, wave-fe-dev-2, wave-be-dev-1, wave-be-dev-2
```

**PROOF 3.2:** Total containers running simultaneously: 16
- Expected: 9-11 (one set)
- Actual: 16 (two sets)
- Impact: Resource waste, potential conflicts

**PROOF 3.3:** Pre-flight has NO container cleanup checks
- No `docker stop` validation
- No `docker rm` for stale containers
- No expected container count validation

### Root Cause
Pre-flight doesn't verify clean container state before execution.

### Required Fix
1. Add check for stale wave-* containers
2. Add cleanup command or validation
3. Add expected container count check

---

## Summary of Required Pre-Flight Additions

### Section K-EXT: Slack Channel Validation
```bash
check "K4: slack_channel in P.json" "$(jq -e '.slack_channel' P.json)"
check "K5: Slack webhook reachable" "$(curl -s -o /dev/null -w '%{http_code}' $SLACK_WEBHOOK_URL)"
```

### Section L-EXT: LangSmith Propagation
```bash
check "L5: LANGSMITH in docker-compose (>=9)" "$(grep -c 'LANGSMITH' docker-compose.yml) -ge 9"
check "L6: LANGSMITH_API_KEY set" "$([ -n '$LANGSMITH_API_KEY' ])"
```

### Section M: Container Management
```bash
check "M1: No stale wave containers" "$(docker ps -aq --filter 'name=wave-' --filter 'status=exited' | wc -l) -eq 0"
check "M2: Expected container count" "$(docker ps -q --filter 'name=wave-' | wc -l) -le 12"
```

---

## Gate 0 Research Status: COMPLETE

**Next Step:** Gate 2 - TDD (Write failing tests for these checks)

*Document generated: 2026-01-28 19:15 IST*
