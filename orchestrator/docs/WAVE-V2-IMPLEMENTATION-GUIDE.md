# WAVE V2 Implementation Guide & Validation Checklist

**Version:** 2.0.0
**Classification:** Aerospace-Grade | DO-178C Level B Inspired
**Purpose:** Reusable guide to verify WAVE implementations follow exact architecture

---

## Quick Validation Command

```bash
# Run this before any WAVE session to verify architecture compliance
python3 scripts/preflight_lock.py --audit && python3 scripts/preflight_lock.py --validate
```

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [10-Step Launch Sequence](#2-10-step-launch-sequence)
3. [Multi-Agent Container Architecture](#3-multi-agent-container-architecture)
4. [Safety Systems](#4-safety-systems)
5. [Implementation Checklist](#5-implementation-checklist)
6. [File Reference Map](#6-file-reference-map)
7. [Validation Scripts](#7-validation-scripts)

---

## 1. Architecture Overview

### 1.1 Two Distinct Systems

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WAVE CONTROLLER                                 │
│                 (The Orchestration System)                          │
│                                                                      │
│  Location: /Volumes/SSD-01/Projects/WAVE/orchestrator/              │
│  Purpose:  Project-agnostic automation framework                    │
│  Contains: Scripts, validators, agent configs, safety rules         │
│  Reusable: YES - across ALL projects                                │
├─────────────────────────────────────────────────────────────────────┤
│                      PROJECT BUCKETS                                 │
│                   (The Actual Applications)                          │
│                                                                      │
│  Examples: Footprint, AirView, PhotoGallery, Fixr                   │
│  Contains: Source code, tests, AI Stories, mockups                  │
│  Purpose:  Domain-specific codebases CONTROLLED BY WAVE             │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Aviation Analogy

| Aviation Concept | WAVE Equivalent | Description |
|------------------|-----------------|-------------|
| Airport | WAVE Portal | The entire facility/system |
| ATC Controller | CTO Master | Single authority controlling all traffic |
| Airline Company | Project | Organization with multiple domains |
| Individual Aircraft | Domain | One flight (auth, payments, profile) |
| Flight Crew | 7-Agent Team | Operates the aircraft |
| Passengers | AI Stories | The "cargo" being delivered safely |

### 1.3 Story Lifecycle (Passenger Journey)

```
1. TICKET PURCHASED    → Story Created in AI PRD
2. CHECK-IN            → Domain CTO validates story
3. BOARDING            → Domain PM assigns to developer
4. TAKEOFF             → Developer starts in worktree
5. IN-FLIGHT           → Gates 2-4 (code, test, QA)
6. LANDING CLEARANCE   → Gate 5 (PM approves)
7. TOUCHDOWN           → CTO Master merges to main
8. ARRIVAL             → Deployed to production
```

---

## 2. 10-Step Launch Sequence

**Core Principle:** Sequential gates - NO SKIPPING ALLOWED

```
[0]──>[1]──>[2]──>[3]──>[4]──>[5]──>[6]──>[7]──>[8]──>[9]
 │     │     │     │     │     │     │     │     │     │
 ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼
Design PRD  Wave  Config Infra Safety RLM Notify Build Launch
```

### Step Definitions

| Step | ID | Validation Key | Purpose | Gate Decision |
|------|-----|----------------|---------|---------------|
| **0** | `mockup-design` | `_mockup` | Validate HTML prototypes | Mockups locked |
| **1** | `project-overview` | `_stories` | Generate AI PRD & stories | Stories aligned |
| **2** | `execution-plan` | `_wavePlan` | Assign stories to agents | All assigned |
| **3** | `system-config` | `_config` | Set API keys & secrets | Keys verified |
| **4** | `infrastructure` | `_foundation` | Verify services accessible | All green |
| **5** | `compliance-safety` | `_safety` | Activate safety guardrails | Framework active |
| **6** | `rlm-protocol` | `_rlm` | Validate learning system | Learning ready |
| **7** | `notifications` | `_slack` | Test real-time alerts | Slack working |
| **8** | `build-qa` | `_buildQa` | Docker build + tests | Build ready |
| **9** | `agent-dispatch` | `_dispatch` | Final pre-flight & launch | LAUNCH AUTH |

### Status States

| State | Description | Visual |
|-------|-------------|--------|
| `idle` | Not yet started | Gray circle |
| `validating` | Currently running | Amber pulsing |
| `ready` | Passed | Green checkmark |
| `blocked` | Failed | Red X |

---

## 3. Multi-Agent Container Architecture

### 3.1 Target Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Supervisor (LangGraph)                                      │   │
│  │  - Routes tasks to domain queues                             │   │
│  │  - Tracks agent status                                       │   │
│  │  - Aggregates results                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │     REDIS (Queues)    │
                    │  pm-q │ cto-q │ fe-q  │
                    │  be-q │ qa-q  │ done  │
                    └───────────┬───────────┘
                                │
        ┌───────────┬───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │   PM    │ │   CTO   │ │ FE-DEV  │ │ BE-DEV  │ │   QA    │
   │ Agent   │ │ Agent   │ │ Agent-1 │ │ Agent-1 │ │ Agent   │
   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### 3.2 Agent Model Hierarchy

| Role | Model | Responsibility |
|------|-------|----------------|
| **CTO Master** | Claude Opus 4.5 | Merge decisions, ATC control |
| **Domain CTO** | Claude Opus 4.5 | Story validation, research |
| **Domain PM** | Claude Opus 4.5 | Orchestration, assignment |
| **FE-Dev 1 & 2** | Claude Sonnet 4 | Frontend implementation |
| **BE-Dev 1 & 2** | Claude Sonnet 4 | Backend implementation |
| **QA** | Claude Haiku 4 | Testing and validation |
| **Dev-Fix** | Claude Sonnet 4 | Retry loop for failures |

### 3.3 Container Requirements

| Container | Status | Purpose |
|-----------|--------|---------|
| `wave-orchestrator` | Running | Supervisor & LangGraph |
| `wave-pm-agent` | Running | Planning & assignment |
| `wave-cto-agent` | Running | Architecture review |
| `wave-fe-agent-1` | Running | Frontend development |
| `wave-fe-agent-2` | Running | Frontend parallel |
| `wave-be-agent-1` | Running | Backend development |
| `wave-be-agent-2` | Running | Backend parallel |
| `wave-qa-agent` | Running | Quality assurance |
| `wave-redis` | Running | Task queue |
| `wave-dozzle` | Running | Log viewer |

---

## 4. Safety Systems

### 4.1 DO-178C Principles (WAVE_PRINCIPLES)

| Principle ID | Name | Severity | Purpose |
|--------------|------|----------|---------|
| **P001** | No Destructive Commands | 1.0 | Block `rm -rf`, `DROP TABLE`, `--force` |
| **P002** | No Secret Exposure | 1.0 | Block API keys, passwords, .env |
| **P003** | Stay In Scope | 0.9 | Block path traversal, /etc/, ~/.ssh |
| **P004** | Validate Inputs | 0.7 | Block eval(), exec(), os.system() |
| **P005** | Respect Budgets | 0.8 | Token and cost limits |
| **P006** | Escalate Uncertainty | 0.6 | Human escalation triggers |

### 4.2 Emergency Stop Mechanisms

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EMERGENCY STOP TRIGGERS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. FILE-BASED:    Create .claude/EMERGENCY-STOP                    │
│  2. REDIS:         Publish to wave:emergency channel                │
│  3. API:           POST /api/emergency-stop                         │
│  4. SAFETY:        Constitutional AI violation detected             │
│                                                                      │
│  ALL AGENTS CHECK FOR EMERGENCY STOP BEFORE EACH TASK               │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Emergency Levels (E1-E5)

| Level | Name | Scope | Action | Aviation |
|-------|------|-------|--------|----------|
| E1 | Agent Stop | Single agent | Stop agent, reassign | Passenger illness |
| E2 | Domain Stop | Entire domain | Stop VM, preserve state | System malfunction |
| E3 | Wave Stop | Current wave | Abort, save progress | Weather diversion |
| E4 | System Stop | All domains | Graceful halt, backup | Emergency landing |
| E5 | EMERGENCY HALT | EVERYTHING | Immediate kill | MAYDAY |

### 4.4 Domain Isolation

| Domain | Allowed Paths | Purpose |
|--------|--------------|---------|
| auth | src/auth/**, api/auth/** | Authentication |
| payments | src/payments/**, api/payments/** | Payment processing |
| profile | src/profile/**, api/profile/** | User profiles |
| api | src/api/**, server/** | API endpoints |
| ui | src/components/**, src/pages/** | Frontend components |
| data | src/db/**, migrations/** | Database operations |

---

## 5. Implementation Checklist

### Pre-Implementation Audit (MANDATORY)

Before implementing ANY feature:

- [ ] Run `python3 scripts/preflight_lock.py --audit`
- [ ] Verify all 6 checklist terms map to codebase
- [ ] Run `python3 scripts/preflight_lock.py --validate`
- [ ] Verify 10/10 checks pass
- [ ] Create or verify lock file exists

### Critical Files Verification

```bash
# Safety Module
✓ src/safety/__init__.py
✓ src/safety/constitutional.py    # WAVE_PRINCIPLES
✓ src/safety/emergency_stop.py    # EmergencyStop class
✓ src/safety/budget.py            # BudgetTracker

# Domain Agents
✓ src/agents/pm_agent.py          # ChatAnthropic
✓ src/agents/cto_agent.py         # ChatAnthropic
✓ src/agents/fe_agent.py          # ChatAnthropic
✓ src/agents/be_agent.py          # ChatAnthropic
✓ src/agents/qa_agent.py          # ChatAnthropic

# Infrastructure
✓ src/domains/domain_router.py    # SUPPORTED_DOMAINS
✓ src/multi_llm.py                # MultiLLMOrchestrator
✓ src/task_queue.py               # Redis queue
✓ src/gates/gate_system.py        # Gate validation
```

### Term Mapping Protocol

| Checklist Term | Search Patterns | Codebase Implementation |
|---------------|-----------------|-------------------------|
| DO-178C probes | `WAVE_PRINCIPLES`, `SafetyPrinciple` | `constitutional.py` |
| Autonomous flag | N/A (API is autonomous) | `ChatAnthropic` in agents |
| E-Stop | `EmergencyStop`, `EMERGENCY_STOP_FILE` | `emergency_stop.py` |
| Domain isolation | `SUPPORTED_DOMAINS`, `DomainRouter` | `domain_router.py` |
| Budget enforcement | `BudgetTracker`, `check_budget` | `budget.py` |
| Constitutional AI | `ConstitutionalChecker`, `SafetyViolation` | `constitutional.py` |

---

## 6. File Reference Map

### Orchestrator Structure

```
/orchestrator/
├── src/
│   ├── safety/
│   │   ├── __init__.py           # Export all safety components
│   │   ├── constitutional.py     # WAVE_PRINCIPLES (P001-P006)
│   │   ├── emergency_stop.py     # EmergencyStop class
│   │   └── budget.py             # BudgetTracker class
│   ├── agents/
│   │   ├── pm_agent.py           # PMAgent (ChatAnthropic)
│   │   ├── cto_agent.py          # CTOAgent (ChatAnthropic)
│   │   ├── fe_agent.py           # FEAgent (ChatAnthropic)
│   │   ├── be_agent.py           # BEAgent (ChatAnthropic)
│   │   └── qa_agent.py           # QAAgent (ChatAnthropic)
│   ├── domains/
│   │   └── domain_router.py      # SUPPORTED_DOMAINS (6)
│   ├── gates/
│   │   └── gate_system.py        # Gate enum & validation
│   ├── multi_llm.py              # MultiLLMOrchestrator
│   ├── task_queue.py             # Redis task queue
│   ├── agent_worker.py           # Base AgentWorker class
│   ├── supervisor.py             # Task dispatcher
│   └── graph.py                  # LangGraph workflow
├── scripts/
│   ├── preflight_lock.py         # Pre-flight validation & lock
│   └── build-agents.sh           # Docker build script
├── docker/
│   ├── docker-compose.agents.yml # Multi-agent containers
│   └── agents/Dockerfile.worker  # Agent base image
├── tests/
│   ├── test_emergency_stop.py    # E-stop tests
│   └── test_constitutional.py    # Safety tests
└── docs/
    ├── WAVE-V2-IMPLEMENTATION-GUIDE.md  # This document
    ├── MULTI-AGENT-CONTAINER-ARCHITECTURE.md
    └── RETROSPECTIVE-PREFLIGHT-LOCK.md
```

### Portal Integration Points

```
/portal/
├── server/
│   └── utils/
│       ├── gate-dependencies.js  # 10-step system
│       ├── preflight-check.js    # Pre-flight validation
│       └── project-discovery.js  # Project detection
└── src/
    └── components/
        ├── LaunchSequence.tsx    # 10-step UI
        └── ProjectChecklist.tsx  # Step management
```

---

## 7. Validation Scripts

### 7.1 Pre-Flight Lock Script

```bash
# Location: scripts/preflight_lock.py

# Audit checklist terms vs codebase
python3 scripts/preflight_lock.py --audit

# Full validation (10 checks)
python3 scripts/preflight_lock.py --validate

# Validate and create lock
python3 scripts/preflight_lock.py --validate --lock

# Check lock before dispatch
python3 scripts/preflight_lock.py --check
```

### 7.2 Expected Audit Output

```
============================================================
Checklist Term → Codebase Audit
============================================================
  DO-178C probes            ✓ FOUND
  autonomous flag           ✓ FOUND
  emergency stop            ✓ FOUND
  budget enforcement        ✓ FOUND
  domain isolation          ✓ FOUND
  constitutional AI         ✓ FOUND
============================================================
```

### 7.3 Expected Validation Output

```
============================================================
WAVE v2 Pre-Flight Validation
============================================================

[CHECK] Critical Files... ✓ PASS
[CHECK] Safety Module... ✓ PASS
[CHECK] Emergency Stop... ✓ PASS
[CHECK] Constitutional AI (DO-178C)... ✓ PASS
[CHECK] Budget Enforcement... ✓ PASS
[CHECK] Domain Isolation... ✓ PASS
[CHECK] Agent Framework... ✓ PASS
[CHECK] Multi-LLM Routing... ✓ PASS
[CHECK] Gate System... ✓ PASS
[CHECK] Test Coverage... ✓ PASS

============================================================
Results: 10 passed, 0 errors, 0 warnings
============================================================

✓ Lock file created: .claude/PREFLIGHT.lock
✓ System is LOCKED and ready for agent dispatch.
```

### 7.4 Lock File Contents

```json
{
  "created_at": "2026-01-27T15:01:18",
  "version": "1.3.0",
  "file_hashes": {
    "src/safety/constitutional.py": "sha256:...",
    "src/safety/emergency_stop.py": "sha256:...",
    "src/agents/pm_agent.py": "sha256:...",
    // ... 13 critical files
  },
  "validation_hash": "sha256:combined..."
}
```

---

## 8. Quick Reference Card

### Before Starting ANY WAVE Session

```bash
cd /Volumes/SSD-01/Projects/WAVE/orchestrator
python3 scripts/preflight_lock.py --audit
python3 scripts/preflight_lock.py --validate --lock
```

### Key Components to Verify

| Component | File | Key Pattern |
|-----------|------|-------------|
| DO-178C | `constitutional.py` | `WAVE_PRINCIPLES` |
| E-Stop | `emergency_stop.py` | `EmergencyStop` |
| Domains | `domain_router.py` | `SUPPORTED_DOMAINS` |
| Agents | `*_agent.py` | `ChatAnthropic` |
| Budget | `budget.py` | `BudgetTracker` |
| Gates | `gate_system.py` | `class Gate` |

### Emergency Stop Commands

```bash
# Trigger E-Stop (File)
echo "Safety violation" > .claude/EMERGENCY-STOP

# Trigger E-Stop (Redis)
redis-cli PUBLISH wave:emergency '{"action":"HALT","reason":"Manual"}'

# Clear E-Stop
rm .claude/EMERGENCY-STOP
redis-cli DEL wave:emergency:active
```

### Docker Status Check

```bash
docker ps --filter "name=wave-*"
# Expect: orchestrator, pm-agent, cto-agent, fe-agent-1/2, be-agent-1/2, qa-agent, redis, dozzle
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0.0 | 2026-01-27 | Claude Code | Initial comprehensive guide |

---

**Use this document to validate every WAVE implementation follows the exact architecture.**

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  "WAVE enables autonomous AI development with aerospace-grade       │
│   safety. Agents cannot delete databases, expose secrets, or        │
│   push broken code - the system makes those actions impossible."    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```
