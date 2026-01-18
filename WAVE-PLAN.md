# WAVE - Autonomous Multi-Agent Orchestration Framework

**Version:** 1.0.0
**Based On:** MAF V11.2 Aerospace Workflow Protocol
**Created:** 2026-01-16
**Status:** IMPLEMENTED

---

## Executive Summary

**WAVE (Workflow Automation for Verified Execution)** is a **PROJECT-AGNOSTIC** autonomous multi-agent orchestration framework. It is NOT a project - it is the **control system** that runs ANY project autonomously.

```
┌─────────────────────────────────────────────────────────────────┐
│                         WAVE FRAMEWORK                          │
│              (Autonomous Orchestration System)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│   │  Project A  │   │  Project B  │   │  Project C  │          │
│   │  (Gallery)  │   │  (E-comm)   │   │  (SaaS)     │          │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘          │
│          │                 │                 │                  │
│          └─────────────────┴─────────────────┘                  │
│                            │                                    │
│                     WAVE CONTROLS                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**WAVE is:**
- A reusable framework applied to ANY project
- Project-agnostic orchestration scripts
- Standardized agent configurations
- Universal signal protocols
- Consistent safety rules

**WAVE is NOT:**
- A specific project
- Tied to Photo Gallery or any codebase
- Project-specific configuration

---

## Core Principles (Aerospace Safety)

1. **Defense in Depth** - Multiple validation layers
2. **Fail Safe** - Automatic escalation on failures
3. **Budget Controls** - Token cost tracking with thresholds
4. **Black Box Recording** - Full audit trail for every run
5. **Emergency Stop** - Instant halt capability
6. **Project Isolation** - Each project runs independently

---

## 7-AGENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WAVE 7-AGENT HIERARCHY                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                              ┌─────────────┐                                    │
│                              │     CTO     │  Architecture & Technical          │
│                              │  (Opus 4.5) │  Decisions                         │
│                              └──────┬──────┘                                    │
│                                     │                                           │
│                              ┌──────┴──────┐                                    │
│                              │     PM      │  Orchestration & Story             │
│                              │  (Opus 4.5) │  Assignment                        │
│                              └──────┬──────┘                                    │
│                                     │                                           │
│            ┌────────────────────────┼────────────────────────┐                  │
│            │                        │                        │                  │
│            ▼                        ▼                        ▼                  │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐          │
│   │    FE-Dev-1     │     │    BE-Dev-1     │     │       QA        │          │
│   │   (Sonnet 4)    │     │   (Sonnet 4)    │     │   (Haiku 4)     │          │
│   │    Wave 1       │     │    Wave 1       │     │   Validation    │          │
│   └─────────────────┘     └─────────────────┘     └─────────────────┘          │
│                                                                                  │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐          │
│   │    FE-Dev-2     │     │    BE-Dev-2     │     │    Dev-Fix      │          │
│   │   (Sonnet 4)    │     │   (Sonnet 4)    │     │   (Sonnet 4)    │          │
│   │    Wave 2       │     │    Wave 2       │     │   Retry Loop    │          │
│   └─────────────────┘     └─────────────────┘     └─────────────────┘          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Agent Summary Table

| # | Agent | Model | Purpose | Gates |
|---|-------|-------|---------|-------|
| 1 | **CTO** | Opus 4.5 | Architecture decisions, technical oversight, escalations | Pre-flight, Escalation |
| 2 | **PM** | Opus 4.5 | Story assignment, orchestration, merge approval | 0, 5-6, 7 |
| 3 | **FE-Dev-1** | Sonnet 4 | Frontend development - Wave 1 | 2-3 |
| 4 | **FE-Dev-2** | Sonnet 4 | Frontend development - Wave 2 | 2-3 |
| 5 | **BE-Dev-1** | Sonnet 4 | Backend development - Wave 1 | 2-3 |
| 6 | **BE-Dev-2** | Sonnet 4 | Backend development - Wave 2 | 2-3 |
| 7 | **QA** | Haiku 4 | Validation, testing, approve/reject | 4 |
| + | **Dev-Fix** | Sonnet 4 | Bug fixes during retry loop | 4.5 |

### Wave Assignment

| Wave | Frontend | Backend | Stories |
|------|----------|---------|---------|
| Wave 1 | FE-Dev-1 | BE-Dev-1 | First batch (no dependencies) |
| Wave 2 | FE-Dev-2 | BE-Dev-2 | Second batch (may depend on Wave 1) |

---

## PRIMARY SOURCE

| Priority | Source | Location |
|----------|--------|----------|
| **#1 PRIMARY** | MAF V11.2-Complete | `~/Downloads/maf-v11.2-complete/` |
| #2 Reference | Uzerflow .claudecode | `/Volumes/SSD-01/Projects/Uzerflow/Uzerflow-Platform/.claudecode/` |
| #3 Reference | MAF Portal | `/Volumes/SSD-01/Projects/MAF/maf-docs-app/` |

---

## OVERALL ARCHITECTURE: 4 Building Blocks

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WAVE MULTI-AGENT ARCHITECTURE                          │
│                              (4 Building Blocks)                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                        BLOCK 4: ORCHESTRATOR                               │ │
│  │                    (wave-orchestrator / merge-watcher)                     │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐  │ │
│  │  │  • Signal detection (polls .claude/ directory)                      │  │ │
│  │  │  • QA→Dev retry loop (Gate 4.5)                                     │  │ │
│  │  │  • Git operations (commit, merge, push)                             │  │ │
│  │  │  • Supabase reporting (heartbeat, events, status)                   │  │ │
│  │  │  • Budget/cost tracking                                             │  │ │
│  │  │  • Emergency stop detection                                         │  │ │
│  │  └─────────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                           │
│            ┌─────────────────────────┼─────────────────────────┐                │
│            │                         │                         │                │
│            ▼                         ▼                         ▼                │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐            │
│  │  BLOCK 1:        │   │  BLOCK 2:        │   │  BLOCK 3:        │            │
│  │  WORKFLOW        │   │  DISPLAY         │   │  PROJECTS        │            │
│  │  (7 Agents)      │   │  (Monitoring)    │   │  (AI Stories)    │            │
│  │                  │   │                  │   │                  │            │
│  │  • CTO           │   │  • WAVE Portal   │   │  • Story JSON    │            │
│  │  • PM            │   │  • Dozzle logs   │   │  • Acceptance    │            │
│  │  • FE-Dev-1 & 2  │   │  • Slack alerts  │   │    criteria      │            │
│  │  • BE-Dev-1 & 2  │   │  • Supabase DB   │   │  • Wave/Gate     │            │
│  │  • QA            │   │                  │   │    assignment    │            │
│  │  • Dev-Fix       │   │  Real-time       │   │  Templates       │            │
│  │                  │   │  visibility      │   │  for any project │            │
│  └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘            │
│           │                      │                      │                       │
│           └──────────────────────┴──────────────────────┘                       │
│                                  │                                              │
│                                  ▼                                              │
│           ┌──────────────────────────────────────────────────┐                 │
│           │              SUPABASE (Source of Truth)          │                 │
│           │  ┌────────────────────────────────────────────┐  │                 │
│           │  │  maf_pipeline    - Pipeline status         │  │                 │
│           │  │  maf_waves       - Wave status per gate    │  │                 │
│           │  │  maf_stories     - AI Stories (from JSON)  │  │                 │
│           │  │  maf_events      - BLACK BOX event log     │  │                 │
│           │  │  maf_kill_switch - Emergency stop          │  │                 │
│           │  │  maf_agents      - Agent sessions          │  │                 │
│           │  │  maf_costs       - Token usage tracking    │  │                 │
│           │  └────────────────────────────────────────────┘  │                 │
│           └──────────────────────────────────────────────────┘                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Block 1: Workflow Process (7 Docker Agents)
- **CTO & PM**: Leadership agents (Opus 4.5) for architecture and orchestration
- **FE-Dev-1 & FE-Dev-2**: Frontend developers for Wave 1 and Wave 2
- **BE-Dev-1 & BE-Dev-2**: Backend developers for Wave 1 and Wave 2
- **QA**: Validation agent (Haiku 4) for testing
- **Dev-Fix**: Bug fix agent for retry loop
- Each agent runs in isolated Docker container with worktree

### Block 2: Display/Monitoring
- **WAVE Portal**: Web dashboard for pipeline visibility
- **Dozzle**: Container log aggregation
- **Slack**: Real-time notifications with cost tracking
- **Supabase**: Persistent data storage

### Block 3: Projects/Tasks (AI Stories)
- Structured JSON format for defining work
- Includes acceptance criteria, files, safety rules
- Synced to Supabase on pipeline start
- Wave and gate assignment

### Block 4: Orchestrator
- Signal detection and routing
- QA→Dev retry loop management
- Git merge and deployment
- Supabase heartbeat and reporting
- Budget enforcement

---

## SUPABASE: Source of Truth

All state is stored in Supabase, not in local files:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `maf_pipeline` | Pipeline status | status, iteration, heartbeat, environment |
| `maf_waves` | Wave progress | wave_number, status, current_gate, cost |
| `maf_stories` | AI Stories | story_id, title, status, gate, wave |
| `maf_events` | BLACK BOX log | type, message, metadata, timestamp |
| `maf_kill_switch` | Emergency stop | reason, activated_at, activated_by |
| `maf_agents` | Agent sessions | agent_name, status, current_task, tokens |
| `maf_costs` | Token tracking | wave, agent, input_tokens, output_tokens, cost |

### Data Flow
```
Project Story JSON → PM Agent → Supabase → Portal Display
        ↓                           ↑
   Docker Agents ─── Signals ───────┘
```

---

## AI STORIES: Structured Task Definition

AI Stories are the **input format** for defining what agents should build.

### Story JSON Schema
```json
{
  "id": "STORY-001",
  "title": "Create user authentication flow",
  "domain": "auth",
  "type": "frontend|backend|fullstack|database",
  "wave": 1,
  "agent": "fe-dev-1|fe-dev-2|be-dev-1|be-dev-2",
  "priority": "high|medium|low",

  "objective": {
    "as_a": "user",
    "i_want": "to log in securely",
    "so_that": "I can access my account"
  },

  "acceptance_criteria": [
    "Login form validates email format",
    "Password requires 8+ characters",
    "Successful login redirects to dashboard",
    "Failed login shows error message"
  ],

  "files": {
    "create": ["src/app/login/page.tsx"],
    "modify": ["src/lib/auth.ts"],
    "forbidden": ["src/app/api/admin/*"]
  },

  "safety": {
    "stop_conditions": ["Never store plain text passwords"],
    "required_tests": ["Login success", "Login failure"],
    "min_coverage": 80
  },

  "thresholds": {
    "max_tokens": 50000,
    "max_cost_usd": 0.50,
    "max_duration_minutes": 30
  }
}
```

### Story Status Flow
```
pending → assigned → in_progress → qa_review → approved/rejected → deployed
```

---

## V11.2 Aerospace Protocol Features (MUST IMPLEMENT)

### 1. Worktree Isolation (7 Agents)
Each agent works in isolated Git worktree - NO shared volumes:
```
{PROJECT}/worktrees/
├── fe-dev-1/   → feature/fe-dev-1 branch (Wave 1 Frontend)
├── fe-dev-2/   → feature/fe-dev-2 branch (Wave 2 Frontend)
├── be-dev-1/   → feature/be-dev-1 branch (Wave 1 Backend)
├── be-dev-2/   → feature/be-dev-2 branch (Wave 2 Backend)
├── qa/         → feature/qa branch (Validation)
└── dev-fix/    → feature/dev-fix branch (Retry Loop)
```

### 2. QA→Dev Retry Loop
Automatic retry cycle when QA rejects:
```
QA Rejects → Orchestrator detects → Dev-Fix agent triggered → QA re-runs
Max 3 retries → then ESCALATION signal → human intervention
```

### 3. Token Cost Tracking
ALL signals MUST include token_usage:
```json
"token_usage": {
    "input_tokens": 15420,
    "output_tokens": 3250,
    "total_tokens": 18670,
    "estimated_cost_usd": 0.0842,
    "model": "claude-sonnet-4-20250514"
}
```

### 4. Budget Thresholds
| Level | Threshold | Action |
|-------|-----------|--------|
| INFO | 50% | Log only |
| WARNING | 75% | Slack alert |
| CRITICAL | 90% | Slack + consider pause |
| EXCEEDED | 100% | Pipeline pause |

### 5. Black Box Recording
Flight recorder for debugging:
```
{PROJECT}/.claude/black-box/flight-recorder.jsonl
```

### 6. Emergency Stop
```bash
echo "STOP" > {PROJECT}/.claude/EMERGENCY-STOP
```

### 7. Signal-Based Coordination
```
signal-wave{N}-gate3-fe-dev-1-complete.json
signal-wave{N}-gate3-fe-dev-2-complete.json
signal-wave{N}-gate3-be-dev-1-complete.json
signal-wave{N}-gate3-be-dev-2-complete.json
signal-wave{N}-gate4-approved.json
signal-wave{N}-gate4-rejected.json
signal-wave{N}-gate4.5-retry.json
signal-wave{N}-gate4.5-fixed.json
signal-wave{N}-gate7-merge-approved.json
signal-wave{N}-ESCALATION.json
```

### 8. Pre-Flight Validation (8 Phases)
- Phase A: Environment Validation
- Phase B: Configuration Validation
- Phase C: Signal Directory Validation
- Phase D: Validator Execution
- Phase E: Integration Test Verification
- Phase F: Story Readiness
- Phase G: Monitoring Setup
- Phase H: Final Sign-Off

---

## Bulletproof Process (Aerospace-Grade Validation)

WAVE implements a **100% bulletproof process** inspired by aerospace DO-178C standards. This ensures consistent, secure, and verified execution.

### The Bulletproof Formula

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BULLETPROOF FORMULA                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   BULLETPROOF = Proven Components                                               │
│               + Aerospace Safety (FMEA)                                         │
│               + External Enforcement (not trust-based)                          │
│               + Validation Tools (compliance + violation + report)              │
│               + Clean Separation (LOCKED vs CONFIGURABLE)                       │
│               + Version Control (with validation proof)                         │
│               + Change Management (PCR procedure)                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1. FMEA (Failure Mode and Effects Analysis)

**Location:** `.claudecode/safety/FMEA.md`

Documents **17 failure modes** with severity ratings, detection methods, and mitigations:

| Category | Failure Modes | Example |
|----------|---------------|---------|
| **S1 (Catastrophic)** | 4 modes | FM-012: Safety Violation, FM-016: Env Leak, FM-017: Force Push |
| **S2 (Critical)** | 5 modes | FM-001: Root User, FM-002: Missing API Key, FM-010: Docker Down |
| **S3 (Major)** | 6 modes | FM-005: Budget Exceeded, FM-006: Infinite Retry, FM-007: Merge Conflict |
| **S4 (Minor)** | 2 modes | FM-008: Supabase Connection, FM-009: Slack Failed |

**Risk Priority Number (RPN):** Average 10.5 (Low risk with mitigations)

### 2. Protocol Compliance Checker

**Script:** `core/scripts/protocol-compliance-checker.sh`

**20-point compliance check** across 4 sections:

| Section | Checks | Points |
|---------|--------|--------|
| A: Safety Documentation | CLAUDE.md, forbidden ops, stop conditions, boundaries, budget | 5 |
| B: Docker Configuration | compose file, permissions flag, depends_on, timeouts, non-root | 5 |
| C: Signal Protocol | .claude dir, signal refs, kill switch, verification, gates | 5 |
| D: Scripts & Tooling | scripts dir, kill switch, supabase, story status, .env | 5 |

**Compliance Levels:**
- **AEROSPACE GRADE:** 95%+ (19-20 points)
- **COMPLIANT:** 90%+ (18 points)
- **PARTIALLY COMPLIANT:** 75%+ (15 points)
- **NON-COMPLIANT:** <75% (below 15 points)

**Usage:**
```bash
./core/scripts/protocol-compliance-checker.sh --project /path/to/project
```

### 3. Safety Violation Detector

**Script:** `core/scripts/safety-violation-detector.sh`

**Real-time monitoring** for **50+ forbidden operations**:

| Category | Example Patterns |
|----------|-----------------|
| Database Destruction | `DROP DATABASE`, `TRUNCATE TABLE`, `DELETE FROM.*WHERE 1=1` |
| File System Destruction | `rm -rf /`, `rm -rf ~`, `rm -rf *` |
| Git Dangerous | `git push --force origin main`, `git reset --hard.*origin` |
| Credential Exposure | `echo.*API_KEY`, `cat.*.env`, `console.log.*SECRET` |
| Network Attacks | `nc -l`, `nmap`, `wget.*password` |
| Process Manipulation | `kill -9 -1`, `shutdown`, `reboot` |
| Permission Escalation | `chmod 777`, `sudo su`, `chown root` |
| Code Injection | `eval(`, `exec(`, `os.system`, `__import__` |

**Actions on Violation:**
1. Log to `VIOLATIONS.log`
2. Activate kill switch (`EMERGENCY-STOP`)
3. Send Slack notification (if configured)

**Modes:**
```bash
./safety-violation-detector.sh --project /path/to/project  # Real-time monitor
./safety-violation-detector.sh --check-file <file>         # Check single file
./safety-violation-detector.sh --list-patterns             # List all patterns
```

### 4. Validation Report Generator

**Script:** `core/scripts/validation-report-generator.sh`

**Generates `VALIDATION-REPORT.md`** after pipeline execution with:

| Section | Contents |
|---------|----------|
| Executive Summary | Verdict, duration, cost, violations |
| Test Execution | Date, environment, project path |
| Results Summary | Gates passed, stories complete, budget, security |
| Signal Summary | Total, approved, rejected, complete |
| Cost Analysis | Tokens, cost, budget, remaining |
| Safety Report | Kill switch, violations, escalations |
| Evidence | File locations for audit |
| Verdict | VALIDATED, COMPLETED WITH ISSUES, ABORTED, FAILED |

**Verdicts:**
- **VALIDATED:** All gates passed, no violations, budget OK
- **COMPLETED WITH ISSUES:** Pipeline finished but had warnings
- **ABORTED (Kill Switch):** Emergency stop triggered
- **FAILED (QA Rejected):** QA rejection not resolved
- **ESCALATED:** Max retries exceeded, human needed
- **INCOMPLETE:** Pipeline did not finish

**Usage:**
```bash
./core/scripts/validation-report-generator.sh --project /path/to/project
```

### 5. LOCKED vs CONFIGURABLE Separation

| Type | Files | Can Change? |
|------|-------|-------------|
| **LOCKED** | Core scripts, FMEA, compliance checker | NEVER (requires PCR) |
| **CONFIGURABLE** | .env, stories/*.json, CLAUDE.md | Per-project |

### 6. Protocol Change Request (PCR)

Any change to **LOCKED** components requires:
1. Document proposed change
2. Update FMEA if failure modes affected
3. Run compliance checker
4. Run validation report generator
5. Review by CTO agent or human
6. Version bump with validation proof

---

## WAVE Framework Structure

```
/Volumes/SSD-01/Projects/WAVE/
│
├── WAVE-PLAN.md                    # This file
├── README.md                       # Framework quick start
│
├── .claudecode/                    # Framework rules (project-agnostic)
│   ├── README.md                   # Framework overview
│   │
│   ├── agents/                     # Agent configurations (7 agents)
│   │   ├── README.md               # Agent overview
│   │   ├── cto-agent.md           # CTO - Architecture (Opus 4.5)
│   │   ├── pm-agent.md            # PM - Orchestration (Opus 4.5)
│   │   ├── fe-dev-1-agent.md      # Frontend Dev Wave 1 (Sonnet 4)
│   │   ├── fe-dev-2-agent.md      # Frontend Dev Wave 2 (Sonnet 4)
│   │   ├── be-dev-1-agent.md      # Backend Dev Wave 1 (Sonnet 4)
│   │   ├── be-dev-2-agent.md      # Backend Dev Wave 2 (Sonnet 4)
│   │   ├── qa-agent.md            # QA validation (Haiku 4)
│   │   └── dev-fix-agent.md       # Bug fix agent (Sonnet 4)
│   │
│   ├── safety/                     # Safety rules
│   │   ├── SAFETY-POLICY.md       # Master safety policy
│   │   ├── FMEA.md                # Failure Mode & Effects Analysis (17 modes)
│   │   ├── COMPLETE-SAFETY-REFERENCE.md  # 108 forbidden operations (Categories A-J)
│   │   ├── APPROVAL-LEVELS.md     # L0-L5 approval matrix
│   │   └── EMERGENCY-LEVELS.md    # E1-E5 emergency response system
│   │
│   ├── operations/                 # Operations Documentation (NEW)
│   │   ├── OPERATIONS-HANDBOOK.md # Daily operations guide
│   │   └── INCIDENT-RESPONSE-PLAYBOOK.md # Emergency procedures
│   │
│   ├── templates/                  # Templates (NEW)
│   │   └── AGENT-TEMPLATE.md      # Generic agent definition template
│   │
│   ├── workflows/                  # Workflow documentation
│   │   ├── gate-protocol.md       # 8-gate protocol
│   │   └── retry-loop.md          # QA→Dev retry cycle
│   │
│   └── signals/                    # Signal schemas
│       └── SCHEMAS.md             # All signal formats
│
├── core/                           # Core framework scripts
│   │
│   ├── scripts/                    # Orchestration scripts
│   │   ├── wave-orchestrator.sh   # Main orchestrator (25.7KB)
│   │   ├── pre-flight-validator.sh # GO/NO-GO validation (80+ checks)
│   │   ├── pre-merge-validator.sh  # Gate 5 pre-merge validation
│   │   ├── post-deploy-validator.sh # Post-deployment verification
│   │   ├── check-kill-switch.sh   # Kill switch (local + Supabase) (12.7KB)
│   │   ├── supabase-report.sh     # Event logging + Slack (12.5KB)
│   │   ├── slack-notify.sh        # Slack notifications (8.0KB)
│   │   ├── update-wave-status.sh  # Wave status CRUD (5.5KB)
│   │   ├── update-story-status.sh # Story status CRUD (5.2KB)
│   │   ├── setup-worktrees.sh     # Create worktrees (7 agents) (4.0KB)
│   │   ├── cleanup-worktrees.sh   # Remove worktrees (2.7KB)
│   │   │
│   │   │   # Bulletproof Validation Scripts
│   │   ├── protocol-compliance-checker.sh  # 20-point compliance check (11.8KB)
│   │   ├── safety-violation-detector.sh    # Real-time violation monitor (108 patterns)
│   │   ├── validation-report-generator.sh  # Post-pipeline report (10.5KB)
│   │   ├── workspace-validator.sh          # Gate 0.5 domain boundary check
│   │   └── stuck-detector.sh               # Stuck agent detection (E1 monitoring)
│   │
│   └── templates/                  # Project templates
│       ├── project-setup.sh       # Script to init new project (12.3KB)
│       ├── docker-compose.template.yml  # 7-agent Docker template (9.6KB)
│       ├── CLAUDE.md.template     # Agent instructions template (5.3KB)
│       ├── .env.template          # Environment template (3.9KB)
│       └── Dockerfile.agent       # Agent Docker image (3.2KB)
│
├── portal/                         # WAVE Portal (coming soon)
│
└── docs/                           # Documentation
```

---

## How WAVE Controls a Project

### Step 1: Initialize Project for WAVE
```bash
# From WAVE directory
./core/templates/project-setup.sh /path/to/my-project
```

This creates in the project:
- `CLAUDE.md` (from template)
- `.claude/` directory
- `worktrees/` directory (6 worktrees for dev agents)
- `docker-compose.yml` (7 agent services)
- `.env` (from template)

### Step 2: Define Stories
Create `stories/` folder with JSON story files:
```json
{
  "id": "STORY-001",
  "title": "Feature Name",
  "type": "frontend|backend|fullstack",
  "wave": 1,
  "agent": "fe-dev-1|be-dev-1",
  "acceptance_criteria": [...]
}
```

### Step 3: Run WAVE
```bash
# Start orchestrator
./wave-orchestrator.sh --project /path/to/my-project

# Or use Docker (starts all 7 agents)
docker compose -f /path/to/my-project/docker-compose.yml up

# For leadership agents
docker compose --profile leadership up
```

### Step 4: Monitor
- WAVE Portal: `http://localhost:3000`
- Slack notifications
- Signal files in `{project}/.claude/`

---

## Core Scripts Reference

### 1. pre-flight-validator.sh (GO/NO-GO Validation)

**Purpose:** Validates all requirements before pipeline execution. Comprehensive pre-flight checks based on MAF PM Validator v5.7.

**Usage:**
```bash
./pre-flight-validator.sh --project /path/to/project [docker-compose.yml]
```

**13 Validation Sections (80+ checks):**
| Section | Checks |
|---------|--------|
| A. Environment Variables | ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, SLACK_WEBHOOK_URL, Live API test |
| B. Docker Compose Compliance | --dangerously-skip-permissions, kill switch, supabase reporting, timeouts |
| C. Dockerfile | Non-root user, security best practices |
| D. Required Scripts | All orchestration scripts present |
| E. Project Structure | CLAUDE.md, stories/, .claude/, worktrees/ |
| F. Story Validation | JSON schema compliance, required fields |
| G. Safety Configuration | Forbidden operations, stop conditions |
| H. Orchestrator Config | Retry limits, health checks |
| I. Agent Config | All 7 agents defined correctly |
| J. Smoke Test | API connectivity, Docker status |
| K. Gate Protocol | Gate definitions complete |
| L. Credentials Scan | No exposed secrets |
| M. Post-Deploy Config | Deployment URL validation setup |

### 2. pre-merge-validator.sh (Gate 5 Validation)

**Purpose:** Validates work is ready for merge at Gate 5.

**Usage:**
```bash
./pre-merge-validator.sh --story WAVE1-FE-001 --project /path/to/project
```

**7 Validation Sections:**
| Section | Checks |
|---------|--------|
| A. QA Approval | QA agent approved the work |
| B. Story Completion | All acceptance criteria met |
| C. Escalation Status | No pending escalations |
| D. Budget | Within budget limits |
| E. Safety | No safety violations |
| F. Build Status | Build and tests passing |
| G. Gate Sequence | All previous gates passed |

### 3. post-deploy-validator.sh (Deployment Verification)

**Purpose:** Validates deployment success after pipeline completion.

**Usage:**
```bash
./post-deploy-validator.sh --url https://my-app.vercel.app [OPTIONS]
```

**6 Validation Sections:**
| Section | Checks |
|---------|--------|
| A. Connectivity | URL reachable, SSL valid |
| B. Core Pages | Homepage, about, contact |
| C. API Endpoints | Health, status endpoints |
| D. Response Quality | Response time, content-type, no errors |
| E. Custom Endpoints | User-defined endpoints (optional) |
| F. Security Headers | X-Frame-Options, HSTS, CSP |

**Exit Codes:**
- `0` = GO (all checks passed)
- `1` = NO-GO (critical failures)

---

### 2. check-kill-switch.sh (Emergency Stop)

**Purpose:** Checks both local file and remote Supabase kill switch.

**Usage:**
```bash
./check-kill-switch.sh              # Single check
./check-kill-switch.sh --continuous # Continuous monitoring (every 30s)
./check-kill-switch.sh --activate "Reason" "user"  # Activate kill switch
./check-kill-switch.sh --deactivate                # Deactivate
./check-kill-switch.sh --status                    # Show status
```

**Kill Switch Locations:**
- Local: `{project}/.claude/EMERGENCY-STOP`
- Remote: Supabase `maf_kill_switch` table

---

### 3. supabase-report.sh (Event Logging + Slack)

**Purpose:** Logs events to Supabase and sends rich Slack notifications.

**Usage:**
```bash
./supabase-report.sh <event_type> <message> [gate] [agent_id] [story_id]
```

**Event Types:**
| Event | Color | Purpose |
|-------|-------|---------|
| PIPELINE_START | Blue | Pipeline started |
| GATE_START | Blue | Agent started gate |
| GATE_COMPLETE | Green | Agent finished gate |
| AGENT_ERROR | Red | Error occurred |
| PIPELINE_COMPLETE | Purple | All waves done |
| KILL_SWITCH | Red | Emergency stop |
| RETRY_TRIGGERED | Yellow | QA rejection retry |
| ESCALATION | Red | Max retries exceeded |

**Actions:**
1. Logs to `maf_events` table in Supabase
2. Sends rich Slack notification with blocks
3. Updates `maf_waves` status when appropriate

---

### 4. update-story-status.sh (Story Status CRUD)

**Purpose:** Updates story status in Supabase.

**Usage:**
```bash
./update-story-status.sh <story_id> <status> [agent_id]
```

**Valid Statuses:**
- `backlog` - Not started
- `ready` - Ready for execution
- `in_progress` - Agent working
- `dev_complete` - Development done
- `qa_review` - QA validating
- `completed` - Fully done
- `failed` - Failed
- `blocked` - Blocked

---

### 5. update-wave-status.sh (Wave Status CRUD)

**Purpose:** Updates wave status in Supabase.

**Usage:**
```bash
./update-wave-status.sh <wave_number> <status> <current_gate> [pipeline_id]
```

**Valid Statuses:** `pending`, `running`, `completed`, `failed`

---

### 6. wave-orchestrator.sh (Main Orchestrator)

**Purpose:** Main control loop for signal detection and retry management.

**Usage:**
```bash
./wave-orchestrator.sh --project /path/to/project
```

**Features:**
- Signal detection (polls `.claude/` directory)
- QA→Dev retry loop (Gate 4.5)
- Retry counter with max limit (default: 3)
- Escalation when max retries exceeded
- Token cost tracking per wave
- Budget threshold alerts
- Black box recording
- Emergency stop detection

---

### 7. Dockerfile.agent (Agent Container)

**Purpose:** Docker image for WAVE agents.

**Key Features:**
- Non-root user `waveagent` (required for --dangerously-skip-permissions)
- Claude Code CLI pre-installed
- Git configured for agent commits
- Workspace structure pre-created
- Health check included

**Build:**
```bash
docker build -f Dockerfile.agent -t wave-agent:latest .
```

---

## 8-Gate Protocol (Universal)

```
┌─────────────────────────────────────────────────────────────────┐
│                    WAVE 8-GATE PROTOCOL                         │
│                    (7 Agents)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GATE 0: Story Assignment (PM)                                   │
│  └── PM assigns stories to waves and agents                     │
│  └── Wave 1: FE-Dev-1, BE-Dev-1                                 │
│  └── Wave 2: FE-Dev-2, BE-Dev-2                                 │
│                                                                  │
│  GATE 1: Planning                                                │
│  └── Agents read stories, plan implementation                    │
│                                                                  │
│  GATE 2: Development                                             │
│  └── FE-Dev-1/2 and BE-Dev-1/2 write code in worktrees          │
│                                                                  │
│  GATE 3: Development Complete                                    │
│  └── Signals: signal-wave{N}-gate3-{agent}-complete.json        │
│                                                                  │
│  GATE 4: QA Validation (QA Agent)                                │
│  └── QA agent runs: build, typecheck, lint, test                │
│  └── Signal: approved.json OR rejected.json                     │
│                                                                  │
│  GATE 4.5: Dev Fix (if rejected)                                │
│  └── Dev-Fix agent fixes issues from QA                         │
│  └── Max 3 retries → ESCALATION → CTO                           │
│                                                                  │
│  GATE 5-6: Review & Merge Prep (PM)                              │
│                                                                  │
│  GATE 7: Final Approval + Merge (PM)                             │
│  └── PM approves merge                                          │
│  └── Merge worktree branches to main                            │
│  └── Push to Git → Trigger deployment                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Model Strategy

| # | Agent | Model | Cost/1M Input | Cost/1M Output | Purpose |
|---|-------|-------|---------------|----------------|---------|
| 1 | CTO | claude-opus-4-5 | $15.00 | $75.00 | Architecture decisions |
| 2 | PM | claude-opus-4-5 | $15.00 | $75.00 | Orchestration |
| 3 | FE-Dev-1 | claude-sonnet-4 | $3.00 | $15.00 | Frontend Wave 1 |
| 4 | FE-Dev-2 | claude-sonnet-4 | $3.00 | $15.00 | Frontend Wave 2 |
| 5 | BE-Dev-1 | claude-sonnet-4 | $3.00 | $15.00 | Backend Wave 1 |
| 6 | BE-Dev-2 | claude-sonnet-4 | $3.00 | $15.00 | Backend Wave 2 |
| 7 | QA | claude-haiku-4 | $0.25 | $1.25 | Validation |
| + | Dev-Fix | claude-sonnet-4 | $3.00 | $15.00 | Bug fixes |

Models configurable via `{project}/.env`:
```bash
ANTHROPIC_MODEL_CTO=claude-opus-4-5-20251101
ANTHROPIC_MODEL_PM=claude-opus-4-5-20251101
ANTHROPIC_MODEL_DEV=claude-sonnet-4-20250514
ANTHROPIC_MODEL_QA=claude-haiku-4-20251001
```

---

## Implementation Status

### Completed
- [x] WAVE folder structure created
- [x] 7 agent configurations created
- [x] Core orchestration scripts:
  - [x] `wave-orchestrator.sh` - Main orchestrator with retry loop
  - [x] `pre-flight-validator.sh` - GO/NO-GO validation (80+ checks, 13 sections A-M)
  - [x] `check-kill-switch.sh` - Kill switch (local + Supabase)
  - [x] `supabase-report.sh` - Event logging + rich Slack notifications
  - [x] `update-story-status.sh` - Story status CRUD
  - [x] `update-wave-status.sh` - Wave status CRUD
  - [x] `setup-worktrees.sh` - Git worktree setup (7 agents)
  - [x] `cleanup-worktrees.sh` - Git worktree cleanup
  - [x] `slack-notify.sh` - Slack notifications
- [x] Templates:
  - [x] `CLAUDE.md.template` - Agent instructions
  - [x] `docker-compose.template.yml` - 7-agent Docker config
  - [x] `.env.template` - Environment variables
  - [x] `Dockerfile.agent` - Agent Docker image with non-root user
  - [x] `project-setup.sh` - Project initialization
- [x] Safety policy documentation
- [x] Signal schemas documentation
- [x] Gate protocol documentation
- [x] Retry loop documentation
- [x] AI Stories methodology (Schema V4)
- [x] Bulletproof validation system:
  - [x] `FMEA.md` - 17 failure modes documented with mitigations
  - [x] `protocol-compliance-checker.sh` - 20-point compliance check
  - [x] `safety-violation-detector.sh` - Real-time monitor (108 forbidden patterns)
  - [x] `validation-report-generator.sh` - Post-pipeline VALIDATION-REPORT.md
- [x] MAF Agnostic Framework compliance (P0 Critical):
  - [x] `COMPLETE-SAFETY-REFERENCE.md` - Full 108 operations in 10 categories (A-J)
  - [x] `APPROVAL-LEVELS.md` - L0-L5 approval matrix
  - [x] `EMERGENCY-LEVELS.md` - E1-E5 graduated emergency response
  - [x] `workspace-validator.sh` - Gate 0.5 domain boundary validation
- [x] MAF Agnostic Framework compliance (P1 High):
  - [x] `OPERATIONS-HANDBOOK.md` - Daily operations guide with checklists
  - [x] `INCIDENT-RESPONSE-PLAYBOOK.md` - Emergency response procedures (6 playbooks)
  - [x] `FORBIDDEN-OPERATIONS-PROMPT-SECTION.md` - Copy-paste for agent prompts
  - [x] `stuck-detector.sh` - Stuck agent detection with error loop detection
  - [x] `AGENT-TEMPLATE.md` - Generic agent definition template
- [x] MAF Agnostic Framework compliance (P2 Medium):
  - [x] `DEPLOYMENT-RUNBOOK.md` - Deployment procedures (standard, migration, hotfix, rollback)
  - [x] `DOMAIN-TEMPLATE.md` - Domain boundary definition template
  - [x] `safe-termination.sh` - Safe shutdown procedures (E1-E5 levels)
  - [x] `HUMAN-ESCALATION-TRIGGERS.md` - When agents must escalate to humans
  - [x] `pre-merge-validator.sh` - Gate 5 pre-merge validation (7 sections A-G)
  - [x] `post-deploy-validator.sh` - Post-deployment verification (6 sections A-F)

### Pending
- [ ] WAVE Portal (monitoring UI)
- [ ] Integration tests
- [ ] Test with sample project (Photo Gallery)
- [ ] Full end-to-end bulletproof validation test

---

## Next Steps

1. **Test with Photo Gallery** as first project
   - Run pre-flight-validator.sh to validate setup
   - Start wave-orchestrator.sh
   - Monitor via Supabase and Slack

2. **Build WAVE Portal** for monitoring
   - Real-time pipeline visualization
   - Agent status dashboard
   - Cost tracking UI

3. **Create integration tests**
   - Script execution tests
   - Signal flow tests
   - Retry loop tests

4. **Document troubleshooting** guide
   - Common errors and fixes
   - Debug procedures
   - Recovery steps

---

## Quick Start Commands

```bash
# 1. Initialize a project for WAVE
./core/templates/project-setup.sh /path/to/my-project

# 2. Run protocol compliance check (Bulletproof)
./core/scripts/protocol-compliance-checker.sh --project /path/to/my-project

# 3. Run pre-flight validation
./core/scripts/pre-flight-validator.sh --project /path/to/my-project

# 4. Start safety violation detector (in background terminal)
./core/scripts/safety-violation-detector.sh --project /path/to/my-project &

# 5. Start the orchestrator
./core/scripts/wave-orchestrator.sh --project /path/to/my-project

# 6. Or use Docker Compose
cd /path/to/my-project
docker compose up --build

# 7. Monitor kill switch (in another terminal)
./core/scripts/check-kill-switch.sh --continuous

# 8. Emergency stop
echo "STOP" > /path/to/my-project/.claude/EMERGENCY-STOP

# 9. Generate validation report (after pipeline)
./core/scripts/validation-report-generator.sh --project /path/to/my-project
```

### Bulletproof Validation Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      BULLETPROOF VALIDATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. protocol-compliance-checker.sh  →  Must be COMPLIANT (90%+)                │
│                                       │                                         │
│   2. pre-flight-validator.sh         →  Must return GO                          │
│                                       │                                         │
│   3. safety-violation-detector.sh    →  Real-time monitoring (background)       │
│                                       │                                         │
│   4. wave-orchestrator.sh            →  Execute pipeline                        │
│                                       │                                         │
│   5. validation-report-generator.sh  →  Generate VALIDATION-REPORT.md           │
│                                       │                                         │
│   RESULT: VALIDATED or FAILED         └─────────────────────────────────────────│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

*WAVE Framework | 7-Agent Architecture | Bulletproof Aerospace-Grade | Version 1.0.0*
