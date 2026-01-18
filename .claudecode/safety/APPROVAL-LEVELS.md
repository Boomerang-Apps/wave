# WAVE Framework - Approval Levels Matrix

**Version:** 1.0.0
**Classification:** CRITICAL - Defines who can approve what
**Source:** MAF Agnostic Framework (Synthesized for WAVE)

---

## Overview

WAVE uses a 6-level approval matrix (L0-L5) to determine which operations require approval and from whom. This is a core component of aerospace-grade safety.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         APPROVAL LEVELS HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   L0: FORBIDDEN     ──────────────────────────────────  NEVER ALLOWED           │
│         │                                                                        │
│   L1: HUMAN ONLY    ──────────────────────────────────  Human approval only     │
│         │                                                                        │
│   L2: CTO APPROVAL  ──────────────────────────────────  CTO agent can approve   │
│         │                                                                        │
│   L3: PM APPROVAL   ──────────────────────────────────  PM agent can approve    │
│         │                                                                        │
│   L4: QA REVIEW     ──────────────────────────────────  QA agent can approve    │
│         │                                                                        │
│   L5: AUTO-ALLOWED  ──────────────────────────────────  No approval needed      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Level Definitions

### L0: FORBIDDEN (Never Allowed)

**Approver:** NONE - These operations are NEVER permitted

**Description:** Operations that could cause catastrophic damage, security breaches, or are fundamentally unsafe. No agent or human can approve these during automated execution.

**Operations (108 total):**
- All operations in COMPLETE-SAFETY-REFERENCE.md Categories A-J
- See: `COMPLETE-SAFETY-REFERENCE.md` for full list

**Examples:**
| Operation | Category | Why L0 |
|-----------|----------|--------|
| `DROP DATABASE` | A: Database | Irreversible data loss |
| `rm -rf /` | B: File System | System destruction |
| `git push --force main` | C: Git | History loss |
| `sudo` | D: Privilege | Security bypass |
| `curl \| bash` | E: Network | Remote code execution |
| `cat .env` | F: Secrets | Credential exposure |
| `shutdown` | G: System | Availability loss |
| `npm publish` | H: Publishing | Supply chain risk |
| Deploy to production | I: Production | User impact |
| Modify other domain | J: Domain | Boundary violation |

**Enforcement:**
- `safety-violation-detector.sh` monitors for these patterns
- Violation triggers immediate kill switch
- Logged to `VIOLATIONS.log`

---

### L1: HUMAN ONLY (Requires Human Approval)

**Approver:** Human operator (cannot be delegated to agents)

**Description:** Operations that require human judgment due to their impact, risk, or irreversibility. Agents must request approval and wait for explicit human confirmation.

**Operations:**
| Operation | Risk | Why Human |
|-----------|------|-----------|
| Merge to main/master | High | Affects production |
| Database migrations (up) | High | Schema changes |
| Create new API endpoints | Medium | Architecture decision |
| Add new dependencies | Medium | Supply chain |
| Modify security config | High | Auth/access changes |
| Update .env in production | Critical | Credential management |
| Create cloud resources | High | Cost implications |
| Delete any production data | Critical | User data loss |
| Modify CI/CD pipelines | High | Build process changes |
| Update SSL/TLS certificates | High | HTTPS continuity |

**Approval Process:**
1. Agent creates signal: `signal-wave[N]-L1-APPROVAL-NEEDED.json`
2. Slack notification sent to human
3. Human reviews and responds: "Approved" or "Rejected"
4. Agent creates signal: `signal-wave[N]-L1-APPROVED.json` or `signal-wave[N]-L1-REJECTED.json`
5. Pipeline continues or halts based on response

**Signal Format:**
```json
{
  "signal_type": "L1-APPROVAL-NEEDED",
  "operation": "database_migration",
  "description": "Add user_preferences table with 3 columns",
  "risk_level": "high",
  "reversible": true,
  "rollback_plan": "migrations/down/001_remove_user_preferences.sql",
  "requested_by": "be-dev-1",
  "timestamp": "2026-01-16T12:00:00Z"
}
```

---

### L2: CTO APPROVAL (CTO Agent Can Approve)

**Approver:** CTO Agent (Opus 4.5)

**Description:** Architecture and technical decisions that affect system structure. The CTO agent has authority to approve these without human intervention.

**Operations:**
| Operation | Why CTO |
|-----------|---------|
| Create new modules/packages | Architecture decision |
| Modify shared interfaces | Breaking change potential |
| Add new database tables | Schema architecture |
| Change API response formats | Contract changes |
| Introduce new patterns | Consistency |
| Approve tech stack additions | Technical fit |
| Resolve escalations from retry loop | Technical judgment |
| Override QA rejection (rare) | Technical override |

**Approval Process:**
1. Agent creates signal: `signal-wave[N]-L2-CTO-APPROVAL-NEEDED.json`
2. CTO agent reviews against architecture principles
3. CTO creates: `signal-wave[N]-L2-CTO-APPROVED.json` or escalates to L1

**When CTO Must Escalate to Human (L1):**
- Security implications
- Cost implications > $100
- Breaking changes to existing APIs
- Changes affecting multiple domains

---

### L3: PM APPROVAL (PM Agent Can Approve)

**Approver:** PM Agent (Opus 4.5)

**Description:** Story coordination and workflow decisions. PM manages story assignment, gate transitions, and cross-agent coordination.

**Operations:**
| Operation | Why PM |
|-----------|--------|
| Assign stories to agents | Coordination |
| Approve gate transitions (5-6) | Process |
| Approve merge readiness (Gate 7 prep) | Standards |
| Re-assign blocked stories | Coordination |
| Approve retry allocation | Resource management |
| Coordinate cross-domain work | Communication |
| Approve story completion | Acceptance |
| Request wave status changes | Orchestration |

**Approval Process:**
1. Agent creates signal: `signal-wave[N]-L3-PM-APPROVAL-NEEDED.json`
2. PM agent reviews against story requirements and acceptance criteria
3. PM creates: `signal-wave[N]-L3-PM-APPROVED.json` or requests changes

---

### L4: QA REVIEW (QA Agent Can Approve)

**Approver:** QA Agent (Haiku 4)

**Description:** Code quality and test validation. QA reviews implementation against acceptance criteria and automated checks.

**Operations:**
| Operation | Why QA |
|-----------|--------|
| Approve Gate 4 (code review) | Quality gate |
| Run test suites | Validation |
| Check lint/type compliance | Standards |
| Verify acceptance criteria | Story completion |
| Approve minor code changes | Low-risk changes |
| Request fixes (reject) | Quality enforcement |
| Verify bug fixes | Fix validation |

**Approval Process:**
1. Dev agent creates signal: `signal-wave[N]-gate3-[agent]-complete.json`
2. QA agent runs automated checks: build, lint, typecheck, test
3. QA reviews acceptance criteria
4. QA creates: `signal-wave[N]-gate4-approved.json` or `signal-wave[N]-gate4-rejected.json`

**QA Rejection Triggers:**
- Build fails
- TypeScript errors
- Lint violations (errors, not warnings)
- Test failures
- Acceptance criteria not met
- Security vulnerabilities detected

---

### L5: AUTO-ALLOWED (No Approval Needed)

**Approver:** NONE - Operations proceed automatically

**Description:** Safe operations that don't require approval. These are the default allowed operations for development work.

**Operations:**
| Operation | Why Safe |
|-----------|----------|
| Read any file in domain | No modification |
| Write files in assigned domain | Isolated worktree |
| Run npm/yarn install | Local to worktree |
| Run npm/yarn build | Local to worktree |
| Run npm/yarn test | Read-only validation |
| Run npm/yarn lint | Read-only validation |
| Git commit to feature branch | Isolated branch |
| Git push to feature branch | Own branch |
| Create signal files | Communication |
| Log to console | Observability |
| Create/modify tests | Development |

**Constraints:**
- Must be within agent's assigned domain
- Must be within worktree boundaries
- Must not exceed token budget
- Must not trigger forbidden patterns

---

## Approval Matrix Summary

| Level | Approver | Response Time | Escalation |
|-------|----------|---------------|------------|
| L0 | NEVER | N/A | Kill switch |
| L1 | Human | Manual | N/A |
| L2 | CTO Agent | < 2 min | L1 if unsure |
| L3 | PM Agent | < 2 min | L2 if technical |
| L4 | QA Agent | < 5 min | L3 if unclear |
| L5 | Auto | Immediate | L4 if risky |

---

## Decision Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         APPROVAL DECISION FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Operation Requested                                                            │
│         │                                                                        │
│         ▼                                                                        │
│   ┌─────────────┐                                                               │
│   │ Is it in    │──YES──▶ L0: FORBIDDEN                                         │
│   │ 108 list?   │         Kill switch activated                                 │
│   └──────┬──────┘                                                               │
│          │ NO                                                                    │
│          ▼                                                                       │
│   ┌─────────────┐                                                               │
│   │ Affects     │──YES──▶ L1: HUMAN APPROVAL                                    │
│   │ production? │         Wait for human                                        │
│   └──────┬──────┘                                                               │
│          │ NO                                                                    │
│          ▼                                                                       │
│   ┌─────────────┐                                                               │
│   │ Architecture│──YES──▶ L2: CTO APPROVAL                                      │
│   │ change?     │         CTO agent decides                                     │
│   └──────┬──────┘                                                               │
│          │ NO                                                                    │
│          ▼                                                                       │
│   ┌─────────────┐                                                               │
│   │ Story/      │──YES──▶ L3: PM APPROVAL                                       │
│   │ coordination│         PM agent decides                                      │
│   └──────┬──────┘                                                               │
│          │ NO                                                                    │
│          ▼                                                                       │
│   ┌─────────────┐                                                               │
│   │ Code        │──YES──▶ L4: QA REVIEW                                         │
│   │ quality?    │         QA agent validates                                    │
│   └──────┬──────┘                                                               │
│          │ NO                                                                    │
│          ▼                                                                       │
│   L5: AUTO-ALLOWED                                                              │
│   Proceed immediately                                                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation in WAVE

### Scripts That Enforce Levels

| Script | Enforces |
|--------|----------|
| `safety-violation-detector.sh` | L0 (forbidden patterns) |
| `pre-flight-validator.sh` | L1 (environment validation) |
| `wave-orchestrator.sh` | L2-L4 (signal routing) |
| Agent configurations | L5 (domain boundaries) |

### Signal Files by Level

| Level | Signal Pattern |
|-------|---------------|
| L0 | `signal-wave[N]-VIOLATION.json` |
| L1 | `signal-wave[N]-L1-APPROVAL-*.json` |
| L2 | `signal-wave[N]-L2-CTO-*.json` |
| L3 | `signal-wave[N]-L3-PM-*.json` |
| L4 | `signal-wave[N]-gate4-*.json` |
| L5 | `signal-wave[N]-gate[N]-[agent]-complete.json` |

---

## Cross-Reference

| Related Document | Purpose |
|-----------------|---------|
| COMPLETE-SAFETY-REFERENCE.md | L0 forbidden operations list |
| EMERGENCY-LEVELS.md | E1-E5 emergency responses |
| FMEA.md | Failure modes by approval level |
| gate-protocol.md | Gate-specific approvals |

---

**Document Status:** LOCKED
**Last Updated:** 2026-01-16

*WAVE Framework | Approval Levels Matrix | L0-L5*
