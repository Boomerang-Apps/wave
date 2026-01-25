# WAVE 10-Step Launch Sequence Architecture

> **Version:** 1.0.0
> **Last Updated:** 2026-01-25
> **Status:** Canonical Reference

## Overview

The WAVE 10-Step Launch Sequence is a **design-first gated pre-flight checklist** that ensures no AI agents execute autonomously until all systems are validated. Based on aerospace industry best practices (NASA Pre-Flight, DO-178C, Stage-Gate Process).

**Core Principle:** Sequential gates - NO SKIPPING ALLOWED

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WAVE AGENT LAUNCH SEQUENCE                           │
│                  (Steps 0-9 - Sequential Gates)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [0]──>[1]──>[2]──>[3]──>[4]──>[5]──>[6]──>[7]──>[8]──>[9]            │
│   │     │     │     │     │     │     │     │     │     │              │
│   ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼              │
│ Design PRD  Wave  Config Infra Safety RLM  Notify Build Launch         │
│                                                                         │
│                    ALL GREEN = LAUNCH AUTHORIZED                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The 10 Steps (0-9)

### Step 0: Mockup Design
| Property | Value |
|----------|-------|
| **ID** | `mockup-design` |
| **Validation Key** | `_mockup` |
| **Prerequisites** | None (entry point) |
| **Purpose** | Validate HTML prototypes before any development |

**What Gets Validated:**
- `design_mockups/` folder exists
- At least 1 HTML file present
- Mockup structure parseable
- Design locked and approved

**Gate Decision:** Mockups locked & validated

---

### Step 1: PRD & Stories
| Property | Value |
|----------|-------|
| **ID** | `project-overview` |
| **Validation Key** | `_stories` |
| **Prerequisites** | Step 0 (Mockup Design) |
| **Purpose** | Generate and validate AI PRD and user stories |

**What Gets Validated:**
- AI-PRD.md document exists
- Story JSON files in `stories/wave{N}/`
- Stories match `ai-story-schema-v4.json`
- Mockup-to-story coverage ≥90%

**Gate Decision:** Stories aligned with mockups

---

### Step 2: Wave Plan
| Property | Value |
|----------|-------|
| **ID** | `execution-plan` |
| **Validation Key** | `_wavePlan` |
| **Prerequisites** | Step 1 (PRD & Stories) |
| **Purpose** | Assign stories to agents and create execution waves |

**What Gets Validated:**
- All stories assigned to agents (FE-Dev, BE-Dev, QA)
- Wave batches created by dependencies
- Execution timeline generated
- No circular dependencies

**Gate Decision:** All stories assigned

---

### Step 3: Configuration
| Property | Value |
|----------|-------|
| **ID** | `system-config` |
| **Validation Key** | `_config` |
| **Prerequisites** | Step 2 (Wave Plan) |
| **Purpose** | Set all API keys and secrets |

**What Gets Validated:**
- `ANTHROPIC_API_KEY` set and valid
- `SUPABASE_URL` configured
- `SUPABASE_ANON_KEY` configured
- `WAVE_BUDGET_LIMIT` defined
- Optional: `SLACK_WEBHOOK_URL`, `GITHUB_TOKEN`, `VERCEL_TOKEN`

**Gate Decision:** All required keys set

---

### Step 4: Infrastructure
| Property | Value |
|----------|-------|
| **ID** | `infrastructure` |
| **Validation Key** | `_foundation` |
| **Prerequisites** | Step 3 (Configuration) |
| **Purpose** | Verify all external services are accessible |

**What Gets Validated:**
- Anthropic API connectivity (test call)
- Supabase connection (query test)
- GitHub token valid (if configured)
- Docker daemon running
- Git worktrees configured
- Signal directory exists (`.claude/signals/`)

**Gate Decision:** All infrastructure green

---

### Step 5: Safety Protocol
| Property | Value |
|----------|-------|
| **ID** | `compliance-safety` |
| **Validation Key** | `_safety` |
| **Prerequisites** | Step 4 (Infrastructure) |
| **Purpose** | Activate aerospace-grade safety guardrails |

**What Gets Validated:**
- All bash scripts installed in `core/scripts/`
- Script permissions correct (executable)
- FMEA documented (17 failure modes)
- Emergency levels configured (E1-E5)
- 108 forbidden operations blocked
- Approval hierarchy (L0-L5) defined

**Gate Decision:** Safety framework active

---

### Step 6: RLM Protocol
| Property | Value |
|----------|-------|
| **ID** | `rlm-protocol` |
| **Validation Key** | `_rlm` |
| **Prerequisites** | Step 5 (Safety Protocol) |
| **Purpose** | Validate Recursive Language Model learning system |

**What Gets Validated:**
- **P Variable:** External context file exists and indexed
- **Agent Memory:** Memory files for FE-Dev, BE-Dev, QA
- **Snapshots:** Checkpoint/restore capability (startup, pre-sync)
- **Drift Detection:** Hash verification working
- **Token Efficiency:** Query efficiency ≥80%
- **Gate 0 Certification:** Learning system operational

**Gate Decision:** Learning system operational

---

### Step 7: Notifications
| Property | Value |
|----------|-------|
| **ID** | `notifications` |
| **Validation Key** | `_slack` |
| **Prerequisites** | Step 6 (RLM Protocol) |
| **Purpose** | Ensure real-time notifications are working |

**What Gets Validated:**
- Slack webhook URL configured
- Test message sent successfully
- Message received in channel
- All notification types tested:
  - `info`, `story_start`, `story_complete`
  - `gate_complete`, `escalation`, `budget_warning`
  - `wave_complete`, `estop`

**Gate Decision:** Notifications working

---

### Step 8: Build QA
| Property | Value |
|----------|-------|
| **ID** | `build-qa` |
| **Validation Key** | `_buildQa` |
| **Prerequisites** | Step 7 (Notifications) |
| **Purpose** | Verify Docker build and all QA tests pass |

**What Gets Validated:**
- **Docker:**
  - Docker daemon installed and running
  - `docker-compose.yml` valid
  - Container image builds successfully
  - Dozzle log viewer available (optional)
- **QA Tests:**
  - TypeScript compiles (`npm run build`)
  - No ESLint errors (`npm run lint`)
  - Unit tests pass (`npm test`)
  - Integration tests pass
  - Bundle size within limits

**Gate Decision:** Build ready

---

### Step 9: Terminal Launch
| Property | Value |
|----------|-------|
| **ID** | `agent-dispatch` |
| **Validation Key** | `_dispatch` |
| **Prerequisites** | Step 8 (Build QA) |
| **Purpose** | Final pre-flight check and agent launch |

**What Gets Validated:**
- All 9 previous steps are `ready`
- Pre-flight check returns GO
- Human authorization received ("START")
- `merge-watcher` or `wave-orchestrator` starts
- Agent containers deployed
- Real-time monitoring active

**Gate Decision:** ALL GREEN = LAUNCH AUTHORIZED

---

## Status States

Each step can be in one of these states:

| State | Description | Visual |
|-------|-------------|--------|
| `idle` | Not yet started | Gray circle |
| `validating` | Currently running checks | Amber pulsing |
| `ready` | Passed, next step unlocked | Green checkmark |
| `blocked` | Failed, progress halted | Red X |

---

## Database Persistence

All validation states are stored in `wave_project_config.config` JSONB:

```json
{
  "_mockup": { "status": "ready", "screens": [...], "last_checked": "..." },
  "_stories": { "status": "ready", "story_count": 12, "prd_valid": true },
  "_wavePlan": { "status": "ready", "waves": [...], "assignments": [...] },
  "_config": { "status": "ready", "keys_verified": true },
  "_foundation": { "status": "ready", "checks": [...] },
  "_safety": { "status": "ready", "checks": [...] },
  "_rlm": { "status": "ready", "gate0_certified": true },
  "_slack": { "status": "ready", "webhook_tested": true },
  "_buildQa": { "status": "ready", "docker_ready": true, "tests_passed": true },
  "_dispatch": { "status": "ready", "preflight_passed": true, "launched_at": "..." }
}
```

---

## Agent Architecture

### Multi-Model Hierarchy

| Role | Model | Responsibility |
|------|-------|----------------|
| **CTO Master** | Claude Opus 4.5 | Plan validation, merge decisions, ATC control |
| **Domain CTO** | Claude Opus 4.5 | Story validation, solution research |
| **Domain PM** | Claude Opus 4.5 | Orchestration, assignment, workflow |
| **FE-Dev 1 & 2** | Claude Sonnet 4 | Frontend implementation |
| **BE-Dev 1 & 2** | Claude Sonnet 4 | Backend implementation |
| **QA** | Claude Haiku 4 | Testing and validation |
| **Dev-Fix** | Claude Sonnet 4 | Retry loop for failed tests |

---

## Research Foundation

| Source | Pattern Applied |
|--------|-----------------|
| NASA Pre-Flight | Sequential validation gates, no-skip policy |
| DO-178C | Aerospace software certification standards |
| Stage-Gate (Dr. Cooper) | Go/Kill/Hold decisions at each gate |
| Google Design Sprints | Validate before building, prototype-first |
| PRINCE2 PID | Project Initiation Document structure |
| Terraform | Preconditions/postconditions pattern |
| CrewAI/LangGraph | Multi-agent orchestration patterns |

---

## Quick Reference

```
Step 0: Mockup Design    → _mockup     → HTML prototypes validated
Step 1: PRD & Stories    → _stories    → Requirements validated
Step 2: Wave Plan        → _wavePlan   → Agents assigned
Step 3: Configuration    → _config     → API keys set
Step 4: Infrastructure   → _foundation → Services connected
Step 5: Safety Protocol  → _safety     → Guardrails active
Step 6: RLM Protocol     → _rlm        → Learning system ready
Step 7: Notifications    → _slack      → Slack working
Step 8: Build QA         → _buildQa    → Docker + tests pass
Step 9: Terminal Launch  → _dispatch   → LAUNCH AUTHORIZED
```

---

*Generated by WAVE Portal - Aerospace-Grade AI Agent Orchestration*
