# WAVE Framework - Emergency Levels System

**Version:** 1.0.0
**Classification:** CRITICAL - Defines graduated emergency responses
**Source:** MAF Agnostic Framework (Synthesized for WAVE)

---

## Overview

WAVE uses a 5-level emergency system (E1-E5) to provide graduated responses to failures. This prevents over-reaction to minor issues while ensuring critical problems trigger immediate action.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         EMERGENCY LEVELS HIERARCHY                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                                                                                  │
│   E5: EMERGENCY HALT    ━━━━━━━━━━━━━━━━━━━━  Security breach, total stop       │
│         ▲                                                                        │
│         │ escalate                                                               │
│   E4: SYSTEM STOP       ━━━━━━━━━━━━━━━━━━━━  All agents stop                   │
│         ▲                                                                        │
│         │ escalate                                                               │
│   E3: WAVE STOP         ━━━━━━━━━━━━━━━━━━━━  Current wave stops                │
│         ▲                                                                        │
│         │ escalate                                                               │
│   E2: DOMAIN STOP       ━━━━━━━━━━━━━━━━━━━━  Domain agents stop                │
│         ▲                                                                        │
│         │ escalate                                                               │
│   E1: AGENT STOP        ━━━━━━━━━━━━━━━━━━━━  Single agent stops                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Level Definitions

### E1: AGENT STOP (Single Agent)

**Scope:** One agent only
**Response Time:** Immediate (within current iteration)
**Recovery:** Automatic retry possible

**Triggers:**
| Trigger | Description | Detection |
|---------|-------------|-----------|
| Max iterations | Agent exceeds iteration limit | Orchestrator counter |
| Error loop | Same error 3+ times | Error pattern matching |
| Stuck detection | No progress for 5 minutes | Heartbeat timeout |
| Token budget (agent) | Agent exceeds its budget | Cost tracking |
| Self-termination | Agent signals completion failure | Signal file |

**Actions:**
1. Stop the specific agent container
2. Log event to `maf_events` table
3. Create signal: `signal-wave[N]-E1-agent-stop-[agent].json`
4. Notify Slack: "Agent [name] stopped: [reason]"
5. Attempt restart if retriable

**Signal Format:**
```json
{
  "emergency_level": "E1",
  "scope": "agent",
  "agent_id": "fe-dev-1",
  "trigger": "max_iterations",
  "details": "Reached 50 iterations without completing story",
  "timestamp": "2026-01-16T12:00:00Z",
  "recovery_action": "retry",
  "retry_count": 1
}
```

**Recovery Options:**
- Automatic retry (up to 3 times)
- Reassign to different agent
- Escalate to E2 after 3 failures

---

### E2: DOMAIN STOP (Domain-Wide)

**Scope:** All agents in one domain (FE or BE)
**Response Time:** < 30 seconds
**Recovery:** Manual intervention may be needed

**Triggers:**
| Trigger | Description | Detection |
|---------|-------------|-----------|
| Multiple agent failures | 2+ agents in domain fail | E1 escalation counter |
| Domain budget exceeded | Domain exceeds budget | Cost tracking |
| Shared resource failure | Database/API unavailable | Health checks |
| Cross-agent conflict | Merge conflicts between domain agents | Git error |
| Domain-wide test failure | All tests in domain fail | Test runner |

**Actions:**
1. Stop all agents in the affected domain
2. Log event with domain context
3. Create signal: `signal-wave[N]-E2-domain-stop-[domain].json`
4. Notify Slack: "DOMAIN ALERT: [domain] stopped"
5. Preserve work in progress (git stash if needed)
6. Notify PM agent for coordination

**Signal Format:**
```json
{
  "emergency_level": "E2",
  "scope": "domain",
  "domain": "frontend",
  "affected_agents": ["fe-dev-1", "fe-dev-2"],
  "trigger": "multiple_agent_failures",
  "details": "Both FE agents failed with TypeScript errors",
  "timestamp": "2026-01-16T12:00:00Z",
  "recovery_action": "human_review",
  "escalated_from": ["E1-fe-dev-1", "E1-fe-dev-2"]
}
```

**Recovery Options:**
- Fix underlying issue (shared dependency, config)
- Restart domain after fix
- Reassign work to other wave
- Escalate to E3 if unresolvable

---

### E3: WAVE STOP (Current Wave)

**Scope:** All agents in current wave (Wave 1 or Wave 2)
**Response Time:** < 30 seconds
**Recovery:** Usually requires human intervention

**Triggers:**
| Trigger | Description | Detection |
|---------|-------------|-----------|
| Wave budget exceeded | Wave exceeds 100% budget | Cost tracking |
| Both domains failed | FE and BE domains failed | E2 counter |
| Integration failure | FE/BE integration broken | Integration tests |
| Max retries exceeded | Gate 4.5 retry limit hit | Retry counter |
| Wave timeout | Wave exceeds time limit | Timer |

**Actions:**
1. Stop all agents in the wave
2. Create ESCALATION signal
3. Log comprehensive event
4. Create signal: `signal-wave[N]-E3-wave-stop.json`
5. Notify Slack: "WAVE [N] STOPPED - Human review required"
6. Commit and preserve all work
7. Generate partial validation report

**Signal Format:**
```json
{
  "emergency_level": "E3",
  "scope": "wave",
  "wave_number": 1,
  "affected_agents": ["fe-dev-1", "be-dev-1", "qa"],
  "trigger": "max_retries_exceeded",
  "retry_count": 3,
  "details": "QA rejected 3 times, unable to resolve TypeScript errors",
  "timestamp": "2026-01-16T12:00:00Z",
  "recovery_action": "human_intervention",
  "cost_at_stop": {
    "total_tokens": 150000,
    "total_cost_usd": 2.50
  }
}
```

**Recovery Options:**
- Human reviews and fixes issues
- CTO intervention for architecture problems
- Skip problematic stories, continue with others
- Escalate to E4 if infrastructure issue

---

### E4: SYSTEM STOP (All Agents)

**Scope:** Entire pipeline - all agents across all waves
**Response Time:** < 10 seconds
**Recovery:** Always requires human intervention

**Triggers:**
| Trigger | Description | Detection |
|---------|-------------|-----------|
| Infrastructure failure | Docker/system down | Health checks |
| Total budget exceeded | Pipeline budget exhausted | Cost tracking |
| Multiple wave failures | Wave 1 and Wave 2 both failed | E3 counter |
| External service down | Supabase, Slack unavailable | Connectivity check |
| Kill switch activated | Manual or automated kill | File/DB check |

**Actions:**
1. **Immediate:** Stop ALL agent containers
2. Create signal: `signal-SYSTEM-E4-stop.json`
3. Activate kill switch file: `.claude/EMERGENCY-STOP`
4. Log to Supabase (if available)
5. Send URGENT Slack notification
6. Generate emergency report
7. Preserve all state

**Signal Format:**
```json
{
  "emergency_level": "E4",
  "scope": "system",
  "all_waves_affected": true,
  "trigger": "total_budget_exceeded",
  "details": "Pipeline budget of $20 exceeded at $20.15",
  "timestamp": "2026-01-16T12:00:00Z",
  "recovery_action": "human_required",
  "system_state": {
    "wave_1_status": "in_progress",
    "wave_2_status": "pending",
    "total_cost_usd": 20.15,
    "active_agents": 4
  }
}
```

**Recovery Process:**
1. Human investigates root cause
2. Fix infrastructure/budget issues
3. Remove kill switch file
4. Reset cost tracking if approved
5. Restart orchestrator
6. Resume from last checkpoint

---

### E5: EMERGENCY HALT (Security Breach)

**Scope:** Complete system shutdown with security lockdown
**Response Time:** IMMEDIATE (< 5 seconds)
**Recovery:** Security review required before any restart

**Triggers:**
| Trigger | Description | Detection |
|---------|-------------|-----------|
| Security violation | L0 forbidden operation attempted | Violation detector |
| Credential exposure | API key or secret leaked | Pattern matching |
| Malicious pattern | Crypto mining, backdoor detected | Pattern matching |
| Data exfiltration | Unauthorized data transfer | Network monitoring |
| Privilege escalation | Sudo/root access attempted | Pattern matching |

**Actions:**
1. **IMMEDIATE:** Kill ALL processes
2. Activate kill switch with security flag
3. Create signal: `signal-EMERGENCY-E5-SECURITY.json`
4. Log violation details
5. Send CRITICAL Slack notification
6. **Isolate affected containers**
7. Preserve evidence (logs, state)
8. **Do NOT auto-restart**

**Signal Format:**
```json
{
  "emergency_level": "E5",
  "scope": "security",
  "security_event": true,
  "trigger": "forbidden_operation",
  "violation": {
    "pattern": "echo $ANTHROPIC_API_KEY",
    "category": "F8",
    "severity": "critical",
    "agent": "be-dev-1",
    "file": "scripts/debug.sh",
    "line": 45
  },
  "timestamp": "2026-01-16T12:00:00Z",
  "recovery_action": "security_review_required",
  "evidence_location": ".claude/security-incident/"
}
```

**Recovery Process:**
1. **Security review** of all logs and actions
2. **Rotate any potentially exposed credentials**
3. **Investigate root cause** (prompt injection? bug?)
4. **Update forbidden patterns** if new pattern found
5. **Document incident** in security log
6. **Get explicit approval** before restart
7. Enhanced monitoring on restart

---

## Emergency Response Matrix

| Level | Scope | Response Time | Auto-Retry | Human Required |
|-------|-------|---------------|------------|----------------|
| E1 | Agent | Immediate | Yes (3x) | No |
| E2 | Domain | < 30s | Maybe | Maybe |
| E3 | Wave | < 30s | No | Yes |
| E4 | System | < 10s | No | Yes |
| E5 | Security | < 5s | NEVER | MANDATORY |

---

## Escalation Rules

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AUTOMATIC ESCALATION RULES                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   E1 → E2:  Same agent fails 3 times                                            │
│             OR 2+ agents in same domain fail                                    │
│                                                                                  │
│   E2 → E3:  Both domains fail                                                   │
│             OR domain budget exceeded                                           │
│                                                                                  │
│   E3 → E4:  Multiple waves fail                                                 │
│             OR total budget exceeded                                            │
│             OR infrastructure failure                                           │
│                                                                                  │
│   E4 → E5:  Security violation detected                                         │
│             (Immediate, no gradual escalation)                                  │
│                                                                                  │
│   ANY → E5: L0 forbidden operation detected                                     │
│             (Bypasses all other levels)                                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation in Scripts

### check-kill-switch.sh
```bash
# Check emergency level
check_emergency_level() {
    local project_root="$1"

    # E5: Security - highest priority
    if [ -f "$project_root/.claude/SECURITY-HALT" ]; then
        echo "E5"
        return
    fi

    # E4: System stop
    if [ -f "$project_root/.claude/EMERGENCY-STOP" ]; then
        echo "E4"
        return
    fi

    # Check Supabase for remote kill switch
    # ... (existing implementation)

    echo "OK"
}
```

### wave-orchestrator.sh
```bash
# Handle emergency based on level
handle_emergency() {
    local level="$1"
    local details="$2"

    case "$level" in
        E1) stop_agent "$details" ;;
        E2) stop_domain "$details" ;;
        E3) stop_wave "$details" ;;
        E4) stop_system "$details" ;;
        E5) security_halt "$details" ;;
    esac
}
```

---

## Slack Notification Formats

| Level | Color | Emoji | Message Format |
|-------|-------|-------|---------------|
| E1 | Yellow | :warning: | "Agent [name] stopped: [reason]" |
| E2 | Orange | :large_orange_diamond: | "DOMAIN ALERT: [domain] stopped" |
| E3 | Red | :red_circle: | "WAVE [N] STOPPED - Review required" |
| E4 | Dark Red | :octagonal_sign: | "SYSTEM STOP - All agents halted" |
| E5 | Black | :rotating_light: | "SECURITY HALT - Immediate review required" |

---

## Cross-Reference

| Related Document | Purpose |
|-----------------|---------|
| COMPLETE-SAFETY-REFERENCE.md | L0 operations that trigger E5 |
| APPROVAL-LEVELS.md | Approval requirements |
| FMEA.md | Failure modes mapped to emergency levels |
| check-kill-switch.sh | Kill switch implementation |
| wave-orchestrator.sh | Emergency handling |

---

## FMEA Mapping

| FMEA ID | Failure Mode | Emergency Level |
|---------|--------------|-----------------|
| FM-001 | Agent runs as root | E5 |
| FM-002 | Missing API key | E4 |
| FM-003 | Signal not created | E1 |
| FM-004 | Kill switch ignored | E5 |
| FM-005 | Budget exceeded | E3/E4 |
| FM-006 | Infinite retry loop | E3 |
| FM-007 | Git merge conflict | E2 |
| FM-008 | Supabase down | E4 |
| FM-012 | Safety violation | E5 |
| FM-016 | Environment leak | E5 |
| FM-017 | Force push to main | E5 |

---

**Document Status:** LOCKED
**Last Updated:** 2026-01-16

*WAVE Framework | Emergency Levels System | E1-E5*
