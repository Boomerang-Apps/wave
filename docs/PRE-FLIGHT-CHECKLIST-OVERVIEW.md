# WAVE Portal Pre-Flight Checklist - Comprehensive Overview

> **Document Purpose:** Second opinion review of all pre-flight validation features
> **Generated:** 2026-01-23
> **Version:** 1.0

---

## Executive Summary

The WAVE Portal Pre-Flight Checklist is an aerospace-grade validation system designed to ensure all infrastructure, safety, and protocol requirements are met before launching autonomous AI coding agents. The system consists of **9 tabs** with **100+ individual checks** across categories including infrastructure, security, compliance, and agent orchestration.

---

## Table of Contents

1. [Tabs Overview](#tabs-overview)
2. [Tab 1: Project Overview](#tab-1-project-overview)
3. [Tab 2: Execution Plan](#tab-2-execution-plan)
4. [Tab 3: Configurations](#tab-3-configurations)
5. [Tab 4: Infrastructure](#tab-4-infrastructure)
6. [Tab 5: Aerospace Safety](#tab-5-aerospace-safety)
7. [Tab 6: RLM Protocol](#tab-6-rlm-protocol)
8. [Tab 7: Build QA](#tab-7-build-qa)
9. [Tab 8: Notifications](#tab-8-notifications)
10. [Tab 9: Agent Dispatch](#tab-9-agent-dispatch)
11. [Master Validation Script](#master-validation-script)
12. [Scoring & Evaluation Logic](#scoring--evaluation-logic)
13. [File Structure Requirements](#file-structure-requirements)
14. [Improvement Recommendations](#improvement-recommendations)

---

## Tabs Overview

| # | Tab ID | Label | Shortcut | Purpose |
|---|--------|-------|----------|---------|
| 1 | `project-overview` | Project Overview | **1** | View project structure and readiness score |
| 2 | `execution-plan` | Execution Plan | **2** | Detailed project execution timeline |
| 3 | `system-config` | Configurations | **3** | Manage API keys and credentials |
| 4 | `infrastructure` | Infrastructure | **4** | Core infrastructure validation (Docker, Git, APIs) |
| 5 | `compliance-safety` | Aerospace Safety | **5** | DO-178C aerospace-grade safety validation |
| 6 | `rlm-protocol` | RLM Protocol | **6** | P Variable, Memory, Snapshots management |
| 7 | `build-qa` | Build QA | **7** | Build testing and QA procedures |
| 8 | `notifications` | Notifications | **8** | Slack and alerting setup |
| 9 | `agent-dispatch` | Agent Dispatch | **9** | Launch and monitor AI agents |

> **Note:** Tabs 3 and 4 are ordered so that Configurations (credentials) comes before Infrastructure (validation), since infrastructure checks depend on having credentials configured.

---

## Tab 1: Project Overview

### Purpose
Overview of project structure, gap analysis, and readiness assessment.

### Status Indicators
| Status | Meaning |
|--------|---------|
| PASS | Analysis report generated and available |
| WARN | Report incomplete or pending generation |
| PENDING | No analysis run yet |

### Checks Performed

| Check | Description | Pass Criteria |
|-------|-------------|---------------|
| File Structure | Visual representation of project directories | Files discovered |
| AI PRD Document | Location and content validation | CLAUDE.md exists, size > 0 |
| AI Stories | Count stories by wave | ≥1 story file found |
| HTML Prototypes | Prototype file discovery | Files scanned |
| Readiness Score | Overall project readiness | Calculated 0-100% |
| Gap Analysis | Identify gaps with priority | Report generated |

### Sections Displayed
1. **File Structure Tree** - Visual directory representation
2. **AI PRD Document** - Location, size, content preview
3. **AI Stories** - Story count by wave, IDs, validation status
4. **HTML Prototypes** - All prototype files discovered
5. **Readiness Score** - Percentage with visual indicator
6. **Gap Analysis** - Prioritized gaps (HIGH/MEDIUM/LOW)

### Integration Points
- **Input Files:** `CLAUDE.md`, `stories/`, `.claude/`, `prototypes/`
- **API Endpoint:** `POST /api/analyze-stream` (SSE streaming)
- **Database:** `wave_analysis_reports` table
- **Output:** `.claude/reports/gap-analysis-YYYY-MM-DD.md`

---

## Tab 2: Execution Plan

### Purpose
Detailed project execution timeline and wave planning.

### Status
Static PASS - Informational tab

### Content
- Wave execution sequence
- Story assignment overview
- Timeline visualization
- Agent allocation plan

---

## Tab 3: Configurations

### Purpose
Manage API keys, webhooks, and service credentials.

> **Why Tab 3?** Configurations must come before Infrastructure because infrastructure validation (e.g., "Is Supabase reachable?") depends on having the credentials configured first.

### Status Indicators
| Status | Meaning |
|--------|---------|
| PASS | All required keys configured |
| WARN | Some required keys missing |
| FAIL | Critical keys missing |

### Configuration Keys

| Key | Required | Format | Source |
|-----|----------|--------|--------|
| `ANTHROPIC_API_KEY` | **Yes** | `sk-ant-*` | console.anthropic.com |
| `SUPABASE_URL` | **Yes** | `https://xxx.supabase.co` | Supabase dashboard |
| `SUPABASE_ANON_KEY` | **Yes** | `eyJ*` | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | No | `eyJ*` | Supabase dashboard |
| `SLACK_WEBHOOK_URL` | No | `https://hooks.slack.com/*` | Slack App Config |
| `GITHUB_TOKEN` | No | `ghp_*` | GitHub Settings |
| `GITHUB_REPO_URL` | No | HTTPS URL | GitHub |
| `VERCEL_TOKEN` | No | Token string | Vercel dashboard |
| `WAVE_BUDGET_LIMIT` | **Yes** | Numeric (e.g., "5.00") | Manual |

### Connection Tests Available
| Service | Test Endpoint | Method |
|---------|--------------|--------|
| Anthropic API | `POST /api/test-anthropic` | Send minimal request |
| Supabase | Direct REST call | Check HTTP 200 |
| Slack | Webhook POST | Send test message |

### Storage
- **Database:** `wave_project_config.config` (JSONB)
- **Features:** Show/Hide toggle, Save/Reload, Connection testing

---

## Tab 4: Infrastructure

### Purpose
Validate all foundation infrastructure required for WAVE development.

> **Why Tab 4?** Infrastructure validation uses credentials from Tab 3 (Configurations) to test connectivity to services like Supabase, Slack, etc.

### Status Indicators
| Status | Meaning |
|--------|---------|
| READY | All required checks passed |
| BLOCKED | Critical checks failed |
| VALIDATING | Currently running validation |
| IDLE | Validation not yet run |

### API Endpoint
`POST /api/validate-foundation` (Server-Sent Events streaming)

### Category 1: Git Worktrees

| Check | Pass Criteria | Fail Action |
|-------|---------------|-------------|
| Worktrees Exist | fe-dev, be-dev, qa, dev-fix directories exist | `git worktree add worktrees/{name} -b wave{N}-{name}` |
| Branches Match Wave | All on `wave{N}-*` branches | Checkout correct branches |
| Synced with Remote | Not behind origin | `git pull` in each worktree |
| No Uncommitted Changes | `git status --porcelain` empty | `git add . && git commit` or `git stash` |

### Category 2: Docker Build

| Check | Pass Criteria | Fail Action |
|-------|---------------|-------------|
| Docker Installed & Running | `docker info` succeeds | Install/start Docker |
| Docker Compose Valid | `docker compose config` succeeds | Fix syntax errors |
| Image Build Test | Images exist or build succeeds | `docker compose build` |
| Dozzle Log Viewer | Container running (optional) | Start Dozzle container |

### Category 3: Notifications

| Check | Pass Criteria | Fail Action |
|-------|---------------|-------------|
| Slack Webhook | `SLACK_WEBHOOK_URL` contains `hooks.slack.com` | Configure webhook |

### Category 4: Signal Files

| Check | Pass Criteria | Fail Action |
|-------|---------------|-------------|
| Signal Schema Valid | ≥1 valid JSON signal file | Create signal files |

### Database Storage
- **Location:** `wave_project_config.config._foundation`
- **Format:** `{ status, checks[], last_checked }`

---

## Tab 5: Aerospace Safety

### Purpose
DO-178C aerospace-grade safety validation and compliance.

### Status Indicators
| Status | Meaning |
|--------|---------|
| READY | Safety compliant, all checks passed |
| BLOCKED | Safety violations detected |
| VALIDATING | In progress |

### API Endpoint
`POST /api/validate-safety`

### Section D: Safety Documentation

| Check | File | Pass Criteria |
|-------|------|---------------|
| FMEA Document | `.claudecode/safety/FMEA.md` | Contains 17 `## FM-` headers |
| Emergency Levels | `.claudecode/safety/EMERGENCY-LEVELS.md` | Contains E1-E5 headers |
| Approval Matrix | `.claudecode/safety/APPROVAL-LEVELS.md` | Contains L0-L5 headers |
| Forbidden Operations | `.claudecode/safety/COMPLETE-SAFETY-REFERENCE.md` | Contains 108 `[A-J]\d+` entries |
| Safety Policy | `.claudecode/safety/SAFETY-POLICY.md` | File exists |

### Emergency Level Hierarchy

| Level | Name | Action |
|-------|------|--------|
| E1 | AGENT STOP | Single agent stops |
| E2 | DOMAIN STOP | Domain agents stop |
| E3 | WAVE STOP | Current wave stops |
| E4 | SYSTEM STOP | All agents stop |
| E5 | EMERGENCY HALT | Total system shutdown |

### Approval Level Hierarchy

| Level | Name | Description |
|-------|------|-------------|
| L0 | FORBIDDEN | 108 operations never allowed |
| L1 | HUMAN ONLY | Requires human approval |
| L2 | CTO APPROVAL | CTO agent can approve |
| L3 | PM APPROVAL | PM agent can approve |
| L4 | QA REVIEW | QA agent can approve |
| L5 | AUTO-ALLOWED | Standard development operations |

### Section E: Validation Scripts

| Script | Location | Purpose |
|--------|----------|---------|
| `pre-flight-validator.sh` | `/core/scripts/` | Pre-flight validation |
| `pre-merge-validator.sh` | `/core/scripts/` | Validation before PR merge |
| `post-deploy-validator.sh` | `/core/scripts/` | Post-deployment verification |
| `safety-violation-detector.sh` | `/core/scripts/` | Detect forbidden operations |
| `protocol-compliance-checker.sh` | `/core/scripts/` | Verify RLM protocol compliance |

### PM Agent Configuration Check
- **File:** `.claudecode/agents/pm-agent.md`
- **Required:** Contains "Gate 0-7" and "Budget" references

---

## Tab 6: RLM Protocol

### Purpose
Validate Recursive LLM (RLM) Protocol - P Variable, Memory, Snapshots, Token Budget.

### Status Indicators
| Status | Meaning |
|--------|---------|
| READY | RLM fully configured, Gate 0 certified |
| BLOCKED | Critical RLM component missing |
| WARN | Partially configured but functional |

### API Endpoint
`POST /api/validate-rlm`

### Gate 0 Lock File
- **Location:** `.claude/gate0-lock.json`
- **Generated When:** All critical checks pass AND warnings < 5
- **Content:** Phase, wave number, RLM status, SHA256 checksum

### Category 1: P Variable (External Context)

| Check | File/Path | Pass Criteria |
|-------|-----------|---------------|
| P Variable Generated | `.claude/P.json` | Exists, valid JSON |
| Schema Valid | P.json content | Has `meta` or `project` field |
| Codebase Indexed | P.json content | `file_count > 0` |
| Context Hash | `.claude/context-hash.txt` | File exists |

### Category 2: Agent Memory Persistence

| Check | File/Path | Pass Criteria |
|-------|-----------|---------------|
| Memory Directory | `.claude/agent-memory/` | Directory exists |
| FE-Dev Memory | `*fe-dev*.json` | Valid JSON with entries |
| BE-Dev Memory | `*be-dev*.json` | Valid JSON with entries |
| Memory Schema | `.claudecode/schemas/memory-schema.json` | File exists |

### Category 3: Snapshots & Recovery

| Check | File/Path | Pass Criteria |
|-------|-----------|---------------|
| Snapshot Directory | `.claude/rlm-snapshots/` | Directory exists |
| Startup Checkpoint | `*startup*.json` | ≥1 snapshot |
| Pre-sync Checkpoint | `*pre-sync*.json` | ≥1 snapshot |
| Restore Capability | All snapshots | ≥1 total snapshot |

### Category 4: RLM Scripts

| Script | Required | Purpose |
|--------|----------|---------|
| `load-project-variable.sh` | Yes | Load P variable |
| `query-variable.py` | Yes | Query P variable |
| `memory-manager.sh` | Yes | Manage agent memory |
| `snapshot-variable.sh` | Yes | Create RLM snapshots |
| `sub-llm-dispatch.py` | Yes | Sub-LLM cost optimization |

### Category 5: Token Budget & Efficiency

| Check | Criteria | Pass Threshold |
|-------|----------|----------------|
| Budget Tracking | `.claude/budget.json` exists | Valid JSON |
| Token Reduction | `(1 - (P.json size / 500KB)) * 100` | ≥80% |
| Sub-LLM Costs | `.claude/sub-llm-costs.json` exists | File exists |
| Query Efficiency | `query-variable.py` exists | File exists |

---

## Tab 7: Build QA

### Purpose
Build testing and QA procedures.

### Status
**PENDING** - Implementation placeholder

### Planned Checks
- [ ] Build command succeeds
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Bundle size within limits

---

## Tab 8: Notifications

### Purpose
Slack and alerting integrations.

### Status
**PENDING** - Implementation placeholder

### Planned Features
- [ ] Slack channel configuration
- [ ] Notification triggers
- [ ] Message templates
- [ ] Escalation rules

---

## Tab 9: Agent Dispatch

### Purpose
Launch and monitor AI coding agents.

### Agent Types

| Agent | Model | Gates | Purpose |
|-------|-------|-------|---------|
| CTO | Opus 4.5 | 0, 7 | Architecture & oversight |
| PM | Opus 4.5 | 0, 5, 6, 7 | Orchestration & assignment |
| FE-Dev-1 | Sonnet 4 | 2, 3 | Frontend development |
| FE-Dev-2 | Sonnet 4 | 2, 3 | Frontend development |
| BE-Dev-1 | Sonnet 4 | 2, 3 | Backend development |
| BE-Dev-2 | Sonnet 4 | 2, 3 | Backend development |
| QA | Haiku 4 | 4 | Validation & testing |
| Dev-Fix | Sonnet 4 | 4.5 | Bug fix retry loop |

### Agent States

| State | Description | Actions Available |
|-------|-------------|-------------------|
| `idle` | Not running | Start |
| `starting` | Initializing | Wait |
| `running` | Active | View, Stop |
| `stopping` | Shutting down | Wait |
| `error` | Failed | View logs, Restart |

### Features
- **Agent Cards Grid** - Visual status of all 8 agents
- **Terminal Modal** - View agent output in real-time
- **Activity Feed** - Signal file events log
- **Validate All Button** - Run master validation
- **Token Usage Tracking** - Cost monitoring per agent

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agents` | GET | List all agents with status |
| `/api/agents/:type/start` | POST | Start an agent |
| `/api/agents/:type/stop` | POST | Stop an agent |
| `/api/agents/:type/output` | GET | Get agent terminal output |
| `/api/agents/activity` | GET | Get recent activity feed |

---

## Master Validation Script

### Location
`/core/scripts/wave-validate-all.sh`

### Usage
```bash
# Human-readable output
./wave-validate-all.sh /path/to/project

# JSON output (for Portal API)
./wave-validate-all.sh /path/to/project --json

# Quick mode (skip network tests)
./wave-validate-all.sh /path/to/project --quick
```

### Exit Codes
| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Failures detected |
| 2 | Critical failures |

### Validation Sections

#### Section 1: AI Stories
- Stories directory exists
- Story count > 0
- Valid JSON files
- Required fields present (id, title)

#### Section 2: Plan Validation
- P.md exists and size > 100 bytes
- P.md contains `##` section headers
- CLAUDE.md exists
- wave-config.json valid (optional)

#### Section 3: Infrastructure
- .env file loaded
- ANTHROPIC_API_KEY set
- Supabase reachable (slow mode)
- GitHub token set (optional)
- Git repository valid

#### Section 4: Security
- Secret files gitignored
- Dockerfile uses non-root user
- No hardcoded API keys (slow mode)

#### Section 5: Docker
- Docker installed
- Docker daemon running
- WAVE images exist
- docker-compose.yml valid
- Containers running

#### Section 6: Slack
- Webhook URL configured
- Webhook reachable (slow mode)

#### Section 7: Signal Files
- .claude directory exists
- gate0-lock.json certified
- No stale signals (> 1 hour)
- No error signals

#### Section 8: Agent Definitions
- Agents directory exists
- Required agents: cto, pm, fe-dev, be-dev, qa

### Output Files
- **Console:** Color-coded results
- **JSON Report:** `.claude/validation-report.json`

---

## Scoring & Evaluation Logic

### Check Status Hierarchy

| Priority | Status | Color | Meaning |
|----------|--------|-------|---------|
| 1 | FAIL | Red | Critical failure, blocks progress |
| 2 | WARN | Yellow | Warning, can proceed with caution |
| 3 | PASS | Green | Check passed |
| 4 | PENDING | Gray | Not yet evaluated |

### Tab Status Determination

```
IF all required checks PASS
  → Tab Status = 'pass' (green)
ELSE IF any check FAIL
  → Tab Status = 'fail' (red, blocked)
ELSE IF validation in progress
  → Tab Status = 'pending' (validating)
ELSE IF only warnings exist
  → Tab Status = 'warn' (yellow)
ELSE
  → Tab Status = 'pending' (idle)
```

### Readiness Score Calculation

```
Score = (Passing Checks / Total Checks) × 100

Components weighted:
- File structure completeness
- Documentation coverage
- Story organization
- Prototype availability
- Configuration status
```

---

## File Structure Requirements

```
PROJECT_ROOT/
├── .claude/
│   ├── P.json                    # P Variable (project context)
│   ├── P.md                      # Plan document
│   ├── context-hash.txt          # Context change detection
│   ├── budget.json               # Token budget tracking
│   ├── gate0-lock.json           # Gate 0 certification
│   ├── validation-report.json    # Latest validation results
│   ├── agent-memory/             # Agent decision memory
│   │   ├── fe-dev-memory.json
│   │   └── be-dev-memory.json
│   ├── rlm-snapshots/            # RLM recovery points
│   │   ├── startup-*.json
│   │   └── pre-sync-*.json
│   ├── sub-llm-costs.json        # Cost tracking
│   ├── reports/                  # Generated reports
│   │   └── gap-analysis-*.md
│   └── locks/                    # Signal files
│
├── .claudecode/
│   ├── agents/                   # Agent definitions
│   │   ├── cto.md
│   │   ├── pm.md
│   │   ├── fe-dev-1.md
│   │   ├── fe-dev-2.md
│   │   ├── be-dev-1.md
│   │   ├── be-dev-2.md
│   │   ├── qa.md
│   │   └── dev-fix.md
│   ├── safety/                   # Safety documentation
│   │   ├── FMEA.md              # 17 failure modes
│   │   ├── EMERGENCY-LEVELS.md  # E1-E5 levels
│   │   ├── APPROVAL-LEVELS.md   # L0-L5 levels
│   │   ├── COMPLETE-SAFETY-REFERENCE.md  # 108 forbidden ops
│   │   └── SAFETY-POLICY.md
│   └── schemas/
│       └── memory-schema.json
│
├── core/scripts/
│   ├── wave-validate-all.sh      # Master validation
│   ├── pre-flight-validator.sh
│   ├── pre-merge-validator.sh
│   ├── post-deploy-validator.sh
│   ├── safety-violation-detector.sh
│   ├── protocol-compliance-checker.sh
│   └── rlm/
│       ├── load-project-variable.sh
│       ├── query-variable.py
│       ├── memory-manager.sh
│       ├── snapshot-variable.sh
│       └── sub-llm-dispatch.py
│
├── stories/                      # Wave story definitions
│   ├── wave1/
│   ├── wave2/
│   └── wave3/
│
├── worktrees/                    # Git worktrees
│   ├── fe-dev-1/
│   ├── fe-dev-2/
│   ├── be-dev-1/
│   ├── be-dev-2/
│   ├── qa/
│   └── dev-fix/
│
├── CLAUDE.md                     # Project guidelines
├── docker-compose.yml            # Container orchestration
├── Dockerfile.agent              # Agent container build
├── entrypoint-agent.sh           # Container entrypoint
└── .env                          # Environment variables
```

---

## Improvement Recommendations

### High Priority

| Area | Current State | Recommendation |
|------|---------------|----------------|
| **Tab 7: Build QA** | Placeholder | Implement build/test validation checks |
| **Tab 8: Notifications** | Placeholder | Implement Slack integration UI |
| **Error Recovery** | Manual | Add auto-retry for transient failures |
| **Validation Caching** | None | Cache results for 5 minutes to reduce load |

### Medium Priority

| Area | Current State | Recommendation |
|------|---------------|----------------|
| **Progress Persistence** | In-memory | Save validation progress to survive refresh |
| **Parallel Validation** | Sequential | Run independent checks in parallel |
| **Historical Tracking** | None | Store validation history for trend analysis |
| **Export Reports** | JSON only | Add PDF/HTML export options |

### Low Priority

| Area | Current State | Recommendation |
|------|---------------|----------------|
| **Keyboard Navigation** | Number shortcuts only | Add arrow key navigation |
| **Accessibility** | Basic | Add ARIA labels, screen reader support |
| **Dark Mode** | Not supported | Add theme toggle |
| **Mobile View** | Desktop only | Add responsive layout |

### Security Improvements

| Area | Recommendation |
|------|----------------|
| **API Key Masking** | Show only last 4 characters by default |
| **Audit Trail** | Log all configuration changes |
| **Secret Rotation** | Add reminders for key rotation |
| **Encryption** | Encrypt sensitive config in database |

### Performance Improvements

| Area | Recommendation |
|------|----------------|
| **Lazy Loading** | Load tab content only when selected |
| **Debounced Polling** | Reduce agent status polling frequency |
| **Batch API Calls** | Combine multiple validation requests |
| **WebSocket** | Replace polling with WebSocket for real-time |

### UX Improvements

| Area | Recommendation |
|------|----------------|
| **Guided Workflow** | Add step-by-step wizard for first-time setup |
| **Fix Suggestions** | Add "Fix Now" buttons with auto-remediation |
| **Diff View** | Show what changed since last validation |
| **Notifications** | Browser notifications for validation results |

---

## API Reference

### Server Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analyze-stream` | POST | Gap analysis (SSE) |
| `/api/validate-foundation` | POST | Infrastructure validation (SSE) |
| `/api/validate-safety` | POST | Safety compliance |
| `/api/validate-rlm` | POST | RLM protocol |
| `/api/validate-all` | POST | Run master validation script |
| `/api/validate-quick` | GET | Quick status check |
| `/api/test-anthropic` | POST | Test API key |
| `/api/test-slack` | POST | Test Slack webhook |
| `/api/agents` | GET | List agents |
| `/api/agents/:type/start` | POST | Start agent |
| `/api/agents/:type/stop` | POST | Stop agent |
| `/api/agents/:type/output` | GET | Agent output |
| `/api/agents/activity` | GET | Activity feed |
| `/api/sync-stories` | POST | Sync stories to DB |
| `/api/health` | GET | Health check |

### Database Tables

| Table | Purpose |
|-------|---------|
| `wave_projects` | Project metadata |
| `wave_project_config` | Configuration and validation results |
| `wave_analysis_reports` | Gap analysis reports |
| `wave_audit_log` | Audit trail |
| `wave_stories` | Story data |

---

## Conclusion

The WAVE Portal Pre-Flight Checklist provides comprehensive validation across 9 tabs covering project analysis, infrastructure, security, safety compliance, RLM protocol, and agent orchestration. The system is approximately **80% complete** with Tabs 7 (Build QA) and 8 (Notifications) pending implementation.

Key strengths:
- Aerospace-grade safety validation (DO-178C inspired)
- Comprehensive RLM protocol support
- Real-time agent monitoring
- Master validation script for CLI usage

Key areas for improvement:
- Complete Build QA and Notifications tabs
- Add validation caching and parallel execution
- Implement auto-remediation for common issues
- Add historical trend tracking

---

*Document generated for second opinion review. Please provide feedback on completeness, accuracy, and suggested improvements.*
