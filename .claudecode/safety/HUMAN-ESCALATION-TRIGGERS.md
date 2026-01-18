# WAVE Framework - Human Escalation Triggers

**Version:** 1.0.0
**Classification:** SAFETY - Human escalation requirements
**Purpose:** Define when agents MUST escalate to human operators

---

## Table of Contents

1. [Overview](#overview)
2. [Escalation Categories](#escalation-categories)
3. [Trigger Matrix](#trigger-matrix)
4. [Escalation Procedures](#escalation-procedures)
5. [Signal Formats](#signal-formats)
6. [Response Requirements](#response-requirements)
7. [Agent Instructions](#agent-instructions)

---

## Overview

### Principle

Agents in the WAVE framework operate with significant autonomy, but certain situations REQUIRE human judgment and approval. This document defines the triggers that MUST result in human escalation.

### Escalation Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ESCALATION HIERARCHY                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   L5 (Auto) ──────────▶ L4 (QA) ──────────▶ L3 (PM)                            │
│       │                     │                   │                               │
│       │                     │                   ▼                               │
│       │                     │              L2 (CTO) ────────▶ L1 (Human)       │
│       │                     │                   │                  │            │
│       │                     ▼                   │                  ▼            │
│       │              QA Review             Architecture      FINAL AUTHORITY    │
│       │                                                                         │
│       ▼                                                                         │
│   Auto-resolved                                                                 │
│   (routine work)                                                                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Principle: When in Doubt, Escalate

If an agent is uncertain whether to escalate, it MUST escalate. False positives are acceptable; false negatives are not.

---

## Escalation Categories

### Category 1: MANDATORY (Always Escalate)

These triggers ALWAYS require human intervention. No agent can approve or bypass these.

| Trigger | Description | Urgency |
|---------|-------------|---------|
| **Security Breach** | Any indication of security compromise | IMMEDIATE |
| **Data Loss Risk** | Potential for user data loss | IMMEDIATE |
| **Production Impact** | Any action affecting live systems | HIGH |
| **Legal/Compliance** | Potential legal or regulatory issues | HIGH |
| **Budget Exceeded** | Token usage exceeds project budget | MEDIUM |
| **Ethical Concern** | Any ethical ambiguity in requirements | MEDIUM |

### Category 2: CONDITIONAL (Context-Dependent)

These may or may not require human escalation based on context.

| Trigger | Escalate If | Don't Escalate If |
|---------|-------------|-------------------|
| **Architecture Change** | Affects core patterns | Minor refactoring |
| **New Dependency** | External API, security-related | Well-known utility lib |
| **Test Failure** | > 3 retry attempts | First occurrence |
| **Merge Conflict** | In shared/config files | In agent's own domain |
| **Error Rate** | > 20% of operations | Transient issues |

### Category 3: INFORMATIONAL (Notify but Continue)

These should notify humans but don't require waiting for response.

| Trigger | Action |
|---------|--------|
| **Wave Complete** | Notify, continue to next wave |
| **Story Complete** | Log, continue to next story |
| **Warning Threshold** | Notify, continue with caution |
| **Performance Degradation** | Log, continue monitoring |

---

## Trigger Matrix

### Security Triggers

| Code | Trigger | Detection | Response Time | Action |
|------|---------|-----------|---------------|--------|
| SEC-001 | L0 operation attempted | safety-violation-detector | 0ms | E5 + Human |
| SEC-002 | Credential exposure detected | Pattern match in output | 0ms | E4 + Human |
| SEC-003 | Unauthorized file access | workspace-validator | 0ms | E3 + Human |
| SEC-004 | External network request | Pattern match | 0ms | E2 + Human |
| SEC-005 | Privilege escalation attempt | Command detection | 0ms | E5 + Human |

### Data Triggers

| Code | Trigger | Detection | Response Time | Action |
|------|---------|-----------|---------------|--------|
| DATA-001 | Production database access | Connection string check | 0ms | E4 + Human |
| DATA-002 | Migration without backup | Pre-command check | 1m | E3 + Human |
| DATA-003 | Data deletion > 100 rows | Query analysis | 1m | E2 + Human |
| DATA-004 | Schema change to core tables | Migration review | 5m | E2 + Human |
| DATA-005 | PII handling | Content detection | 1m | E3 + Human |

### Budget Triggers

| Code | Trigger | Threshold | Response Time | Action |
|------|---------|-----------|---------------|--------|
| BUD-001 | Budget warning | 80% consumed | 5m | Notify Human |
| BUD-002 | Budget critical | 90% consumed | 1m | E3 + Human |
| BUD-003 | Budget exceeded | 100% consumed | 0ms | E4 + Human |
| BUD-004 | Single story over budget | > $5 per story | 1m | E2 + Human |
| BUD-005 | Token spike | > 3x normal rate | 1m | E2 + Human |

### Quality Triggers

| Code | Trigger | Threshold | Response Time | Action |
|------|---------|-----------|---------------|--------|
| QA-001 | Test failure loop | 3 consecutive | 5m | E2 + Human |
| QA-002 | Coverage drop | > 10% decrease | 10m | E1 + Human |
| QA-003 | Build failure | 3 consecutive | 5m | E2 + Human |
| QA-004 | Critical bug found | Severity 1 | 0ms | E3 + Human |
| QA-005 | Regression detected | Any | 1m | E2 + Human |

### Process Triggers

| Code | Trigger | Detection | Response Time | Action |
|------|---------|-----------|---------------|--------|
| PROC-001 | Stuck agent | No progress 15m | 15m | E1 + Human |
| PROC-002 | Conflicting signals | 2+ agents claim same file | 1m | E2 + Human |
| PROC-003 | Invalid signal format | Schema validation | 0ms | E1 + Human |
| PROC-004 | Gate timeout | Gate > 2x expected | 30m | E2 + Human |
| PROC-005 | Escalation ignored | No response 10m | 10m | E3 + Human |

### Requirements Triggers

| Code | Trigger | Detection | Response Time | Action |
|------|---------|-----------|---------------|--------|
| REQ-001 | Ambiguous requirement | Agent uncertainty | 5m | E2 + Human |
| REQ-002 | Conflicting requirements | Story comparison | 5m | E3 + Human |
| REQ-003 | Out of scope request | Scope check | 1m | E2 + Human |
| REQ-004 | Missing acceptance criteria | Story validation | 5m | E2 + Human |
| REQ-005 | Architectural decision needed | Pattern analysis | 5m | E3 + Human |

---

## Escalation Procedures

### Procedure 1: Standard Escalation

For non-urgent escalations (response time > 5 minutes):

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         STANDARD ESCALATION                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. Agent Detects Trigger                                                      │
│            │                                                                     │
│            ▼                                                                     │
│   2. Create ESCALATION Signal                                                   │
│      signal-[wave]-ESCALATION-[code].json                                       │
│            │                                                                     │
│            ▼                                                                     │
│   3. PAUSE Current Work                                                         │
│      (Do not proceed past current operation)                                    │
│            │                                                                     │
│            ▼                                                                     │
│   4. Wait for Response Signal                                                   │
│      signal-[wave]-ESCALATION-[code]-response.json                              │
│            │                                                                     │
│            ▼                                                                     │
│   5. Read Response and Act                                                      │
│      - APPROVED: Continue with guidance                                         │
│      - DENIED: Stop and revert if needed                                        │
│      - MODIFIED: Adjust approach and continue                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Procedure 2: Urgent Escalation

For urgent escalations (response time < 5 minutes):

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         URGENT ESCALATION                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. Agent Detects Urgent Trigger                                               │
│            │                                                                     │
│            ▼                                                                     │
│   2. IMMEDIATELY Stop Work                                                      │
│      (Halt mid-operation if necessary)                                          │
│            │                                                                     │
│            ▼                                                                     │
│   3. Create URGENT-ESCALATION Signal                                            │
│      signal-[wave]-URGENT-ESCALATION-[code].json                                │
│            │                                                                     │
│            ▼                                                                     │
│   4. Activate Emergency Level (E1-E5)                                           │
│      Based on severity                                                          │
│            │                                                                     │
│            ▼                                                                     │
│   5. Wait for Human (No timeout)                                                │
│      Cannot continue without explicit approval                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Procedure 3: Security Escalation

For security-related triggers:

```bash
# 1. Immediately halt
touch .claude/EMERGENCY-STOP

# 2. Create security signal
cat > .claude/signal-SECURITY-ESCALATION.json << EOF
{
    "signal_type": "security-escalation",
    "code": "[SEC-XXX]",
    "description": "[what was detected]",
    "agent": "[agent-id]",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "severity": "critical",
    "requires_human": true,
    "auto_response": "E5_halt"
}
EOF

# 3. Do NOT attempt to fix or investigate further
# 4. Wait for human
```

---

## Signal Formats

### Standard Escalation Signal

```json
{
    "signal_type": "escalation",
    "escalation_code": "REQ-001",
    "category": "requirements",
    "urgency": "standard",
    "agent": "fe-dev-1",
    "wave": 1,
    "gate": 2,
    "trigger_description": "Story STORY-003 has ambiguous acceptance criteria",
    "context": {
        "story_id": "STORY-003",
        "specific_ambiguity": "Does 'responsive' mean mobile-first or desktop-first?",
        "options_considered": [
            "Mobile-first (industry standard)",
            "Desktop-first (matches existing codebase)",
            "Both (more work but comprehensive)"
        ]
    },
    "agent_recommendation": "Mobile-first, as it aligns with modern best practices",
    "timestamp": "2026-01-16T12:00:00Z",
    "awaiting_response": true
}
```

### Urgent Escalation Signal

```json
{
    "signal_type": "urgent-escalation",
    "escalation_code": "SEC-002",
    "category": "security",
    "urgency": "immediate",
    "agent": "be-dev-1",
    "wave": 1,
    "gate": 2,
    "trigger_description": "Potential credential exposure in log output",
    "context": {
        "file": "src/lib/api-client.ts",
        "line": 45,
        "detected_pattern": "API key in console.log statement"
    },
    "actions_taken": [
        "Halted all work",
        "Activated E4 system stop",
        "Did not commit changes"
    ],
    "timestamp": "2026-01-16T12:00:00Z",
    "requires_human": true,
    "emergency_level": "E4"
}
```

### Human Response Signal

```json
{
    "signal_type": "escalation-response",
    "escalation_code": "REQ-001",
    "responded_by": "human",
    "response_type": "approved_with_guidance",
    "decision": "Use mobile-first approach",
    "guidance": [
        "Implement mobile-first CSS",
        "Add breakpoints at 768px and 1024px",
        "Ensure all interactive elements are touch-friendly"
    ],
    "timestamp": "2026-01-16T12:15:00Z"
}
```

---

## Response Requirements

### Response Time SLAs

| Urgency | Expected Response | Maximum Wait | Escalation if Exceeded |
|---------|------------------|--------------|------------------------|
| IMMEDIATE | < 5 minutes | 10 minutes | Auto-escalate to emergency contact |
| HIGH | < 30 minutes | 1 hour | Notify backup contact |
| MEDIUM | < 2 hours | 4 hours | Notify project lead |
| LOW | < 24 hours | 48 hours | Log and continue monitoring |

### Required Response Content

Human responses MUST include:

1. **Decision** - Clear yes/no/modified
2. **Rationale** - Why this decision was made
3. **Guidance** - Specific instructions for agent
4. **Scope** - Does this apply to similar future cases?

### Response Types

| Type | Meaning | Agent Action |
|------|---------|--------------|
| `approved` | Proceed as requested | Continue with original plan |
| `approved_with_guidance` | Proceed with modifications | Adjust and continue |
| `denied` | Do not proceed | Stop, possibly revert |
| `deferred` | Not now | Pause, wait for later signal |
| `reassigned` | Different agent should handle | Transfer to specified agent |

---

## Agent Instructions

### Copy-Paste Section for CLAUDE.md

```markdown
## Human Escalation Protocol

You MUST escalate to humans in these situations:

### ALWAYS ESCALATE (No Exceptions)
- Any L0 forbidden operation considered
- Security concern (credentials, unauthorized access)
- Production impact (deployment, database changes)
- Data loss risk (deletion, migration)
- Budget threshold reached (>80%)
- Ethical ambiguity in requirements
- Legal/compliance uncertainty

### ESCALATE AFTER 3 RETRIES
- Test failures
- Build failures
- Merge conflicts in shared files
- API integration errors

### ESCALATE ON UNCERTAINTY
- Ambiguous requirements
- Multiple valid interpretations
- Architecture decisions
- Scope questions

### HOW TO ESCALATE

1. Create signal: `.claude/signal-[wave]-ESCALATION-[code].json`
2. Include:
   - What triggered the escalation
   - Context (file, line, story)
   - Options you considered
   - Your recommendation
3. STOP and wait for response signal
4. Do NOT proceed without human approval

### WAITING FOR RESPONSE

While waiting:
- DO NOT continue work on escalated item
- CAN work on other independent items
- Check for response signal every 30 seconds
- After 10 minutes with no response, log warning

### RESPONSE HANDLING

When you receive `.claude/signal-[wave]-ESCALATION-[code]-response.json`:
- Read the decision
- Follow the guidance exactly
- Log that escalation was resolved
- Continue work
```

### Decision Tree for Agents

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    AGENT ESCALATION DECISION TREE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   New Task/Decision                                                             │
│         │                                                                        │
│         ▼                                                                        │
│   ┌─────────────────┐                                                           │
│   │ Is this an L0   │──YES──▶ STOP. Create security escalation. E5.            │
│   │ forbidden op?   │                                                           │
│   └────────┬────────┘                                                           │
│            │ NO                                                                  │
│            ▼                                                                     │
│   ┌─────────────────┐                                                           │
│   │ Does it affect  │──YES──▶ Create escalation. Wait for approval.            │
│   │ production?     │                                                           │
│   └────────┬────────┘                                                           │
│            │ NO                                                                  │
│            ▼                                                                     │
│   ┌─────────────────┐                                                           │
│   │ Is there data   │──YES──▶ Create escalation. Wait for approval.            │
│   │ loss risk?      │                                                           │
│   └────────┬────────┘                                                           │
│            │ NO                                                                  │
│            ▼                                                                     │
│   ┌─────────────────┐                                                           │
│   │ Are requirements│──YES──▶ Create escalation. Ask for clarification.        │
│   │ ambiguous?      │                                                           │
│   └────────┬────────┘                                                           │
│            │ NO                                                                  │
│            ▼                                                                     │
│   ┌─────────────────┐                                                           │
│   │ Is this within  │──NO───▶ Create escalation. Request scope change.         │
│   │ your domain?    │                                                           │
│   └────────┬────────┘                                                           │
│            │ YES                                                                 │
│            ▼                                                                     │
│   ┌─────────────────┐                                                           │
│   │ Are you         │──NO───▶ Create escalation. Explain uncertainty.          │
│   │ confident?      │                                                           │
│   └────────┬────────┘                                                           │
│            │ YES                                                                 │
│            ▼                                                                     │
│   PROCEED with task                                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Monitoring Escalations

### Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Escalations per wave | < 5 | > 10 |
| Response time (avg) | < 30m | > 2h |
| Unresolved escalations | 0 | > 3 |
| False positive rate | < 20% | > 40% |
| Security escalations | 0 | > 0 |

### Escalation Log

All escalations should be logged in `.claude/ESCALATION-LOG.md`:

```markdown
# Escalation Log

## Wave 1

| Time | Code | Agent | Status | Response Time |
|------|------|-------|--------|---------------|
| 10:00 | REQ-001 | fe-dev-1 | Resolved | 15m |
| 10:30 | QA-001 | qa | Resolved | 5m |
| 11:00 | BUD-001 | be-dev-2 | Pending | - |
```

---

## Emergency Contacts

| Priority | Role | When to Contact |
|----------|------|-----------------|
| 1 | On-call Engineer | All E3+ escalations |
| 2 | Tech Lead | Unresolved after 30m |
| 3 | Project Manager | Budget/scope issues |
| 4 | Security Team | Any SEC-* escalation |

---

**Document Status:** SAFETY
**Last Updated:** 2026-01-16

*WAVE Framework | Human Escalation Triggers | Version 1.0.0*
