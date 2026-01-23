# WAVE Architecture - Final Summary Report

**Version:** 1.0.0
**Date:** 2026-01-23
**Purpose:** Comprehensive architecture review for second opinion before first execution

---

## Executive Summary

WAVE (Wave-based Autonomous Validation Engine) is an **autonomous AI-powered development framework** that orchestrates multiple Claude AI agents working in parallel through a multi-gate quality system. It implements aerospace-grade safety (DO-178C inspired) with defense-in-depth protection, signal-based coordination, and comprehensive audit trails.

### Key Metrics

| Metric | Value |
|--------|-------|
| Portal Tabs | 10 integrated validation tabs |
| Core Scripts | 32 bash scripts |
| Server Components | 4 Node.js modules |
| Safety Documents | 7 FMEA/emergency/approval docs |
| Agent Types | 8 specialized agents |
| Development Gates | 7+ progression gates |
| Forbidden Operations | 108 L0 patterns |
| Emergency Levels | 5 (E1-E5) |

---

## Part 1: Portal Architecture (10 Tabs)

### Tab Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Project    2. Execution   3. Config    4. Infra     5. Safety          │
│     Overview      Plan           Keys        Validation    Compliance       │
├─────────────────────────────────────────────────────────────────────────────┤
│  6. RLM        7. Build QA    8. Notif.    9. Agent     10. Audit          │
│     Protocol                     Slack        Dispatch       Log            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tab 1: Project Overview (Gate 0)
**Purpose:** AI-powered PRD analysis and gap detection

- Scans project directory structure
- Reads CLAUDE.md protocol documentation
- Validates AI PRD documents
- Parses story JSON files
- Generates readiness score (0-100)
- **Data:** Stored in Supabase `wave_analysis_reports`

### Tab 2: Execution Plan
**Purpose:** Wave/story roadmap visualization

- Wave 1-4 progression display
- Story-level details with acceptance criteria
- Risk classification (low/medium/high/critical)
- Progress tracking with completion percentages

### Tab 3: Configurations
**Purpose:** Centralized credential management

- API keys (Anthropic, GitHub, Supabase, Slack, Vercel)
- Budget limits (WAVE_BUDGET_LIMIT)
- Individual connection testing
- Secret redaction (OWASP-compliant)
- **Data:** Stored in `wave_project_config`

### Tab 4: Infrastructure
**Purpose:** System readiness validation

- Git worktrees (fe-dev, be-dev, qa, dev-fix)
- Branch configuration verification
- Docker availability
- Node.js/npm versions
- Database connectivity

### Tab 5: Aerospace Safety
**Purpose:** DO-178C compliance validation

- FMEA document (17 failure modes)
- Emergency levels (E1-E5)
- Approval matrix (L0-L5)
- Forbidden operations (108 patterns)
- Kill switch configuration

### Tab 6: RLM Protocol
**Purpose:** Recursive Language Model validation

- Memory schema compliance
- P variable generation
- Context hash management
- Agent decision tracking

### Tab 7: Build QA
**Purpose:** Build quality assurance

- TypeScript compilation (0 errors required)
- Production build validation
- ESLint compliance
- Unit test execution (80%+ coverage)
- Security audit (npm audit)
- **NEW:** Terminal Setup snippet with tmux command

### Tab 8: Notifications
**Purpose:** Slack integration testing

- 20+ event type support
- Thread-per-story pattern
- Web API + webhook fallback
- Test notification dispatch

### Tab 9: Agent Dispatch
**Purpose:** Agent lifecycle management

- 8 agent types monitoring
- Status tracking (idle/running/error)
- Token usage display
- Heartbeat monitoring
- Start/stop controls

### Tab 10: Audit Log
**Purpose:** Complete traceability

- Event classification by type/category/severity
- Actor tracking (agent/user/system/portal)
- Safety tag filtering
- Review flag management
- Cost tracking per event

---

## Part 2: Core Scripts Architecture

### Orchestration Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                    wave-orchestrator.sh                          │
│  Main control loop with budget tracking & emergency detection    │
├─────────────────────────────────────────────────────────────────┤
│                    merge-watcher-v12.sh                          │
│  Signal file monitoring with RLM + Building Block enforcement    │
├─────────────────────────────────────────────────────────────────┤
│                    wave-terminal.sh                              │
│  tmux session setup (4-pane: watcher, portal, fe-dev, be-dev)   │
└─────────────────────────────────────────────────────────────────┘
```

### Safety Layer

| Script | Purpose |
|--------|---------|
| `check-kill-switch.sh` | Emergency stop enforcement |
| `safety-violation-detector.sh` | L0 pattern detection |
| `behavioral-safety-probe.sh` | Runtime behavior validation |
| `protocol-compliance-checker.sh` | CLAUDE.md enforcement |

### Validation Layer

| Script | Purpose |
|--------|---------|
| `wave-preflight.sh` | Pre-execution system validation |
| `pre-merge-validator.sh` | Final merge checks |
| `post-deploy-validator.sh` | Deployment verification |
| `validation-report-generator.sh` | Report generation |

### Monitoring Layer

| Script | Purpose |
|--------|---------|
| `stuck-detector.sh` | Frozen agent detection |
| `agent-watchdog.sh` | Continuous health monitoring |
| `drift-detector.sh` | Unplanned change detection |

---

## Part 3: Server Components

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     index.js (Express Server)                    │
│  /api/analyze-stream, /api/slack/notify, /api/validate-*        │
├─────────────────────────────────────────────────────────────────┤
│  slack-notifier.js    │  slack-events.js    │  validate-infra.js│
│  Web API + Webhooks   │  Event Definitions  │  System Checks    │
├─────────────────────────────────────────────────────────────────┤
│           utils/retry-manager.js    │    utils/secret-redactor.js│
│           AWS Exponential Backoff   │    OWASP Secret Masking    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Features Implemented

1. **Slack Integration**
   - Web API with thread support (preferred)
   - Webhook fallback
   - Retry with exponential backoff + jitter
   - Circuit breaker pattern
   - Secret redaction before sending

2. **Retry Manager**
   - AWS Builders Library pattern
   - Full jitter implementation
   - Configurable thresholds
   - Circuit breaker (10 failures → open)

3. **Secret Redactor**
   - 50+ OWASP-validated patterns
   - AI API keys, cloud credentials, tokens
   - Database URLs, private keys
   - Deep object traversal

---

## Part 4: Safety Architecture

### Defense-in-Depth Model

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: CLAUDE.md Instructions    (Agent-level rules)          │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: Worktree Isolation        (Git-based boundaries)       │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Signal Validation         (Orchestrator enforcement)   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: Budget Tracking           (Cost controls)              │
├─────────────────────────────────────────────────────────────────┤
│ Layer 5: Kill Switch               (Emergency halt)             │
└─────────────────────────────────────────────────────────────────┘
```

### Approval Matrix (L0-L5)

| Level | Authority | Examples |
|-------|-----------|----------|
| L0 | FORBIDDEN | DROP DATABASE, rm -rf, force push |
| L1 | HUMAN ONLY | Production deploy, schema migration |
| L2 | CTO APPROVAL | New dependencies, API changes |
| L3 | PM APPROVAL | Feature scope changes |
| L4 | QA REVIEW | Code merge approval |
| L5 | AUTO-ALLOWED | Standard development |

### Emergency Levels (E1-E5)

| Level | Scope | Trigger |
|-------|-------|---------|
| E1 | Single agent | Agent error/timeout |
| E2 | Domain (FE/BE) | Multiple agent failures |
| E3 | Current wave | Budget exceeded, 3x retry fail |
| E4 | All agents | Total budget exhausted |
| E5 | Complete shutdown | Security violation |

---

## Part 5: Multi-Gate Workflow

### Gate Progression

```
Gate 0: PM Assignment
    │   └─ Stories assigned to agents/waves
    ▼
Gate 2: Development
    │   └─ FE-Dev & BE-Dev work in parallel
    ▼
Gate 3: Code Complete
    │   └─ Agents signal completion
    ▼
Gate 4: QA Validation
    │   ├─ PASS → Gate 5-7
    │   └─ FAIL → Gate 4.5 (retry)
    ▼
Gate 4.5: Dev-Fix Retry (max 3x)
    │   ├─ FIXED → Return to Gate 4
    │   └─ FAILED 3x → ESCALATION (E3)
    ▼
Gate 5-6: Review & Code Review
    │
    ▼
Gate 7: Final Approval & Merge
```

### Signal File Flow

```
.claude/
├── signal-gate0-assignments.json      ← PM creates
├── signal-wave1-gate3-fe-complete.json ← FE-Dev creates
├── signal-wave1-gate3-be-complete.json ← BE-Dev creates
├── signal-wave1-gate4-approved.json   ← QA creates (pass)
├── signal-wave1-gate4-rejected.json   ← QA creates (fail)
├── signal-wave1-gate4.5-retry.json    ← Orchestrator creates
├── signal-wave1-gate4.5-fixed.json    ← Dev-Fix creates
└── signal-wave1-ESCALATION.json       ← Orchestrator (3x fail)
```

---

## Part 6: Agent Architecture

### Agent Roster

| Agent | Model | Gates | Worktree | Purpose |
|-------|-------|-------|----------|---------|
| FE-Dev-1/2 | Sonnet 4 | 2→3 | fe-dev | Frontend development |
| BE-Dev-1/2 | Sonnet 4 | 2→3 | be-dev | Backend development |
| QA | Haiku 4 | 4 | qa | Validation & testing |
| Dev-Fix | Sonnet 4 | 4.5 | dev-fix | Bug fixing/retries |
| PM | Opus 4.5 | 0,5-7 | - | Coordination |
| CTO | Opus 4.5 | Pre-flight | - | Architecture decisions |

### Domain Boundaries

```
FE-Dev Allowed:              BE-Dev Allowed:
├── src/app/[pages]          ├── src/app/api/
├── src/components/          ├── server/
├── src/styles/              ├── lib/server/
├── src/hooks/               ├── database/
└── src/lib/                 └── prisma/

FORBIDDEN (All Agents):
├── .env* files
├── package.json modifications (without approval)
├── Files assigned to other agents
└── Cross-domain modifications
```

---

## Part 7: Cost Tracking

### Model Pricing

| Model | Input (per 1M) | Output (per 1M) |
|-------|----------------|-----------------|
| Sonnet 4 | $3.00 | $15.00 |
| Opus 4.5 | $15.00 | $75.00 |
| Haiku 4 | $0.25 | $1.25 |

### Budget Thresholds

| Threshold | Action |
|-----------|--------|
| 75% | Warning notification |
| 90% | Critical alert |
| 100% | Pause execution (E3) |

### Token Tracking

Every signal file includes:
```json
"token_usage": {
  "input_tokens": 15420,
  "output_tokens": 3250,
  "total_tokens": 18670,
  "estimated_cost_usd": 0.0842,
  "model": "claude-sonnet-4-20250514"
}
```

---

## Part 8: Database Schema

### Supabase Tables

| Table | Purpose |
|-------|---------|
| `maf_analysis_reports` | Project analysis (SOURCE OF TRUTH) |
| `maf_project_config` | Configuration storage |
| `stories` | AI stories (SOURCE OF TRUTH) |
| `wave_audit_log` | Comprehensive audit trail |
| `wave_agent_sessions` | Agent lifecycle tracking |
| `wave_validation_runs` | Validation history |
| `wave_slack_threads` | Slack thread mapping |
| `wave_credentials` | Encrypted credentials |

---

## Part 9: Recent Implementations

### Gap 1: Validation Modes
- Strict mode (production) vs Dev mode (development)
- CI mode for continuous integration
- Mode-specific check requirements

### Gap 2: Slack Web API Migration
- Migrated from webhook-only to Web API + webhook fallback
- Thread support with `thread_ts`
- Thread persistence to database

### Gap 3: Retry Manager
- AWS Builders Library exponential backoff
- Full jitter implementation
- Circuit breaker pattern

### Gap 4: Secret Redactor
- OWASP-compliant patterns (50+)
- Integrated into Slack notifier
- Deep object traversal

### Gap 5: Vitest Testing
- Unit test infrastructure
- Coverage reporting (v8 provider)
- 70% coverage thresholds

### Gap 6: Gate Override Logging
- SonarSource audit requirements
- Override event tracking
- Justification capture

### Terminal Setup
- `wave-terminal.sh` script for tmux
- 4-pane layout (watcher, portal, agents)
- Copyable snippet in Build QA tab

---

## Part 10: Areas for Review Before First Execution

### Critical Review Items

| Area | Status | Concern |
|------|--------|---------|
| Kill Switch Testing | Needs Test | Has `.claude/EMERGENCY-STOP` been tested? |
| Budget Limits | Configured | Are limits realistic for first wave? |
| Worktree Setup | Manual | Requires `setup-worktrees.sh` before start |
| Supabase Tables | Migrations Ready | Need to run migrations |
| Slack Webhooks | Configured | Test connection before execution |
| Agent Prompts | Exist | Verify CLAUDE.md and agent files |

### Potential Gaps Identified

1. **Docker Validation**
   - Current: Only checks if Dockerfile exists
   - Needed: Actual container build/run test (deferred to CI)

2. **Agent Heartbeat**
   - Current: Monitoring exists in scripts
   - Needed: Portal UI for real-time heartbeat display

3. **Real-time Logs**
   - Current: merge-watcher writes to terminal
   - Needed: Optional Portal log viewer (low priority)

4. **Story Sync**
   - Current: Manual sync from JSON files
   - Needed: Automated sync on file change (nice-to-have)

### Pre-Execution Checklist

```
[ ] Run Supabase migrations (001-004)
[ ] Configure all API keys in Tab 3
[ ] Test Slack connection in Tab 8
[ ] Run Infrastructure validation in Tab 4
[ ] Run Safety validation in Tab 5
[ ] Verify worktrees exist (setup-worktrees.sh)
[ ] Set budget limits (WAVE_BUDGET_LIMIT)
[ ] Review CLAUDE.md for project specifics
[ ] Verify stories exist in stories/wave1/
[ ] Test kill switch mechanism
```

---

## Architecture Diagrams

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WAVE PORTAL                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Project │ │ Config  │ │ Infra   │ │ Safety  │ │Build QA │ │ Audit   │   │
│  │ Overview│ │  Keys   │ │ Valid.  │ │ Comply  │ │ Tests   │ │  Log    │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
│       │           │           │           │           │           │         │
│       └───────────┴───────────┴─────┬─────┴───────────┴───────────┘         │
│                                     │                                        │
│                          ┌──────────▼──────────┐                            │
│                          │   Express Server    │                            │
│                          │   (index.js)        │                            │
│                          └──────────┬──────────┘                            │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Supabase     │       │ Slack Notifier  │       │ merge-watcher   │
│   (Database)    │       │ (Web API)       │       │ (Orchestrator)  │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                              │
                          ┌───────────────────────────────────┼───────┐
                          │                                   │       │
                          ▼                                   ▼       ▼
                  ┌───────────────┐                   ┌─────────────────┐
                  │  .claude/     │                   │   Worktrees     │
                  │  Signal Files │                   │ fe-dev, be-dev  │
                  └───────────────┘                   │ qa, dev-fix     │
                                                      └─────────────────┘
```

### Agent Communication Flow

```
                    ┌─────────────┐
                    │     PM      │
                    │  (Opus 4.5) │
                    └──────┬──────┘
                           │ Gate 0: Assignments
                           ▼
        ┌──────────────────┴──────────────────┐
        │                                      │
        ▼                                      ▼
┌───────────────┐                      ┌───────────────┐
│   FE-Dev-1    │                      │   BE-Dev-1    │
│  (Sonnet 4)   │                      │  (Sonnet 4)   │
└───────┬───────┘                      └───────┬───────┘
        │                                      │
        │ Gate 3: Complete                     │ Gate 3: Complete
        │                                      │
        └──────────────────┬───────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │     QA      │
                    │  (Haiku 4)  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
         PASS ▼                    FAIL ▼
    ┌─────────────┐           ┌─────────────┐
    │   Gate 7    │           │  Dev-Fix    │
    │   Merge     │           │ (Sonnet 4)  │
    └─────────────┘           └──────┬──────┘
                                     │
                                     │ Retry (max 3x)
                                     ▼
                              Back to QA
```

---

## Conclusion

WAVE represents a **comprehensive autonomous development framework** with:

- **Multi-agent orchestration** across 8 specialized agents
- **Multi-gate quality control** with 7+ progression gates
- **Aerospace-grade safety** (DO-178C inspired, FMEA documented)
- **Financial control** through token tracking and budget limits
- **Complete auditability** via signal files, database logs, and black box
- **Parallel development** using worktree isolation

The system prioritizes **safety and reversibility** over speed, implementing external enforcement mechanisms that prevent agents from exceeding boundaries.

### Ready for Second Opinion

This report provides the complete architecture for review. Key areas to validate:

1. **Safety mechanisms** - Are 5 defense layers sufficient?
2. **Budget limits** - Are thresholds appropriate for workload?
3. **Gate flow** - Is the progression logical and complete?
4. **Agent boundaries** - Are domain restrictions clear?
5. **Retry logic** - Is 3x retry appropriate before escalation?

---

*Report generated: 2026-01-23*
*WAVE Framework Version: 12.2*
