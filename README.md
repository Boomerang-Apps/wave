# WAVE - Workflow Automation for Verified Execution

**Version:** 1.0.0
**Based On:** MAF V11.2 Aerospace Workflow Protocol

---

## What is WAVE?

WAVE is a **project-agnostic** autonomous multi-agent orchestration framework. It controls ANY project autonomously using Docker containers, Git worktree isolation, and signal-based coordination.

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

## Directory Structure

```
WAVE/
├── .claudecode/          # Framework rules
│   ├── agents/           # Agent role definitions
│   ├── safety/           # Safety policies
│   ├── workflows/        # Workflow documentation
│   └── signals/          # Signal schemas
├── core/
│   ├── scripts/          # Orchestration scripts
│   │   ├── wave-orchestrator.sh
│   │   ├── setup-worktrees.sh
│   │   └── cleanup-worktrees.sh
│   └── templates/        # Project templates
│       ├── CLAUDE.md.template
│       ├── docker-compose.template.yml
│       ├── .env.template
│       └── project-setup.sh
├── portal/               # WAVE Portal (coming soon)
├── docs/                 # Documentation
└── README.md             # This file
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

- `WAVE-PLAN.md` - Detailed framework plan
- `.claudecode/` - Rules and configurations
- `docs/` - Additional documentation

---

*WAVE Framework | Autonomous Multi-Agent Orchestration*
