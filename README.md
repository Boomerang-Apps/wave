# WAVE - Workflow Automation for Verified Execution

**Version:** 2.0.0
**Based On:** MAF V11.2 Aerospace Workflow Protocol

[![GitHub](https://img.shields.io/github/license/Boomerang-Apps/wave)](LICENSE)

---

## What is WAVE?

WAVE is a **project-agnostic** autonomous multi-agent orchestration framework. It controls ANY project autonomously using Docker containers, Git worktree isolation, and signal-based coordination.

**New in V2.0:**
- **RLM Integration** - Recursive Language Model for persistent agent memory
- **Building Blocks** - Phase-gate validation with hard enforcement (no warnings, only PASS/FAIL)

```
┌─────────────────────────────────────────────────────────────────┐
│                         WAVE FRAMEWORK                          │
│              (Autonomous Orchestration System)                  │
├─────────────────────────────────────────────────────────────────┤
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│   │  Project A  │   │  Project B  │   │  Project C  │          │
│   │  (Gallery)  │   │  (E-comm)   │   │  (SaaS)     │          │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘          │
│          │                 │                 │                  │
│          └─────────────────┴─────────────────┘                  │
│                            │                                    │
│                     WAVE CONTROLS                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Initialize Your Project

```bash
# From WAVE directory
./core/templates/project-setup.sh /path/to/your-project

# With options
./core/templates/project-setup.sh /path/to/your-project \
    --project-name "MyApp" \
    --package-manager npm
```

### 2. Add Your API Key

```bash
cd /path/to/your-project
# Edit .env and add ANTHROPIC_API_KEY
```

### 3. Create AI Stories

```bash
# Create story files in stories/ directory
cp stories/STORY-TEMPLATE.json stories/STORY-001.json
# Edit the story with your requirements
```

### 4. Run WAVE

```bash
# Option A: Docker Compose
docker compose up

# Option B: Orchestrator Script
./wave-orchestrator.sh --project /path/to/your-project
```

---

## Architecture: 4 Building Blocks

### Block 1: Workflow (Docker Agents)
- fe-dev: Frontend development
- be-dev: Backend development
- qa: Quality assurance
- dev-fix: Bug fixes (retry loop)

### Block 2: Display (Monitoring)
- WAVE Portal (coming soon)
- Dozzle for container logs
- Slack notifications
- Supabase for persistence

### Block 3: Projects (AI Stories)
- JSON-based task definitions
- Acceptance criteria
- File constraints
- Budget limits

### Block 4: Orchestrator
- Signal detection
- QA→Dev retry loop
- Git merge operations
- Cost tracking

---

## Key Features

### Worktree Isolation
Each agent works in an isolated Git worktree - no file conflicts.

### QA→Dev Retry Loop
Automatic retries when QA rejects (max 3 by default), then escalation.

### Token Cost Tracking
All signals include token usage for budget management.

### Emergency Stop
```bash
echo "STOP" > .claude/EMERGENCY-STOP
```

### Black Box Recording
Full audit trail in `.claude/black-box/flight-recorder.jsonl`

---

## RLM Integration (V2.0)

Recursive Language Model provides **persistent context** across agent sessions:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RLM CONTEXT FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│   P Variable ──► Agent Query ──► Response ──► P Update          │
│       │                                           │             │
│       └───────────── Persistent Memory ───────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- **P Variable** - Project state stored in `.claude/P.json`
- **Agent Memory** - Per-agent context in `.claude/rlm/agent-memory/`
- **Snapshot/Recovery** - Wave completion snapshots for rollback
- **Change Detection** - Content hashing tracks modifications

**Scripts:**
- `core/scripts/rlm/generate-p-variable.sh` - Generate project state
- `core/scripts/rlm/update-p-variable.sh` - Update after changes
- `core/scripts/rlm/snapshot-p-variable.sh` - Save wave snapshots
- `core/scripts/rlm/restore-p-variable.sh` - Restore from snapshot

---

## Building Blocks (V2.0)

Phase-gate validation system with **hard enforcement** - NO WARNINGS, only PASS or FAIL:

```
┌─────────────────────────────────────────────────────────────────┐
│                 BUILDING BLOCK PHASES                           │
├─────────────────────────────────────────────────────────────────┤
│   Phase 0        Phase 2        Phase 3        Phase 4          │
│   Stories   ──►  Smoke Test ──► Dev Complete ──► QA/Merge       │
│      │              │              │              │              │
│      ▼              ▼              ▼              ▼              │
│   🔒 LOCK        🔒 LOCK        🔒 LOCK        🔒 LOCK           │
│   +checksum      +checksum      +checksum      +checksum        │
└─────────────────────────────────────────────────────────────────┘
```

**Enforcement:**
- Each phase creates a **lock file** with SHA256 checksum
- **Drift detection** auto-invalidates downstream locks
- Cannot proceed without valid lock from previous phase
- Lock files stored in `.claude/locks/`

**Scripts:**
- `core/scripts/building-blocks/phase-orchestrator.sh` - Master orchestrator
- `core/scripts/building-blocks/lock-manager.sh` - Lock CRUD operations
- `core/scripts/building-blocks/drift-detector.sh` - State change detection
- `core/scripts/building-blocks/phase0-validator.sh` - Story validation
- `core/scripts/building-blocks/phase2-validator.sh` - Build/test/lint
- `core/scripts/building-blocks/phase3-validator.sh` - Dev completion
- `core/scripts/building-blocks/phase4-validator.sh` - QA validation

**Usage:**
```bash
# Run all phases
./core/scripts/building-blocks/phase-orchestrator.sh \
    --project /path/to/project --wave 3 --run-all

# Check status
./core/scripts/building-blocks/lock-manager.sh status \
    --project /path/to/project --wave 3
```

---

## Directory Structure

```
WAVE/
├── .claudecode/              # Framework rules
│   ├── agents/               # Agent role definitions
│   ├── safety/               # Safety policies
│   ├── workflows/            # Workflow documentation
│   └── signals/              # Signal schemas
├── core/
│   ├── scripts/              # Orchestration scripts
│   │   ├── merge-watcher-v12.sh    # Main orchestrator (V12.2)
│   │   ├── wave-orchestrator.sh
│   │   ├── building-blocks/        # Phase validation (V2.0)
│   │   │   ├── phase-orchestrator.sh
│   │   │   ├── lock-manager.sh
│   │   │   ├── drift-detector.sh
│   │   │   └── phase[0-4]-validator.sh
│   │   ├── rlm/                    # RLM integration (V2.0)
│   │   │   ├── generate-p-variable.sh
│   │   │   ├── update-p-variable.sh
│   │   │   ├── snapshot-p-variable.sh
│   │   │   └── restore-p-variable.sh
│   │   └── ...
│   └── templates/            # Project templates
├── reports/                  # Generated reports
├── portal/                   # WAVE Portal (coming soon)
├── docs/                     # Documentation
└── README.md                 # This file
```

---

## Configuration

Environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| ANTHROPIC_API_KEY | required | Your Anthropic API key |
| MAX_RETRIES | 3 | QA→Dev retry attempts |
| WAVE_BUDGET | 2.00 | Budget per wave (USD) |
| STORY_BUDGET | 0.50 | Budget per story (USD) |
| SLACK_WEBHOOK_URL | - | Slack notifications |

---

## Safety

WAVE implements the Aerospace Safety Protocol:

1. **Defense in Depth** - Multiple validation layers
2. **Fail Safe** - Automatic escalation on failures
3. **Budget Controls** - Token cost tracking
4. **Black Box Recording** - Full audit trail
5. **Emergency Stop** - Instant halt capability

See `.claudecode/safety/SAFETY-POLICY.md` for full details.

---

## Documentation

| Document | Description |
|----------|-------------|
| `WAVE-QUICKSTART.md` | Get started in 5 minutes |
| `WAVE-STEP-BY-STEP.md` | Detailed walkthrough |
| `WAVE-ARCHITECTURE.md` | System architecture |
| `WAVE-PROCESS-GUIDE.md` | Process documentation |
| `RLM-WAVE-IMPLEMENTATION-GUIDE.md` | RLM integration guide |
| `CTO-MASTER-EXECUTION-PROTOCOL.md` | Full execution protocol |

---

## merge-watcher (V12.2)

The main orchestrator script with RLM and Building Blocks:

```bash
# Basic usage
./core/scripts/merge-watcher-v12.sh --project /path/to/project --wave 3

# With options
./core/scripts/merge-watcher-v12.sh \
    --project /path/to/project \
    --wave 3 \
    --type FE_ONLY \
    --interval 15

# Disable Building Blocks (not recommended)
./core/scripts/merge-watcher-v12.sh \
    --project /path/to/project \
    --wave 3 \
    --no-building-blocks
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

*WAVE Framework V2.0 | Autonomous Multi-Agent Orchestration with RLM + Building Blocks*
