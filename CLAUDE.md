# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WAVE (Workflow Automation for Verified Execution) is a project-agnostic autonomous multi-agent orchestration framework. It controls projects using Docker containers, Git worktree isolation, and signal-based coordination.

## Monorepo Structure

```
WAVE/
├── portal/              # React 19 + Vite frontend + Express backend
├── orchestrator/        # Python LangGraph-based orchestrator
├── core/
│   └── scripts/         # Shell-based orchestration scripts
├── .claude/
│   └── commands/        # Slash command definitions
├── stories/             # AI story definitions (JSON)
└── docker-compose.yml   # Multi-agent container setup
```

## Build & Development Commands

### Portal (React + Express)

```bash
cd portal

# Install dependencies
npm install

# Development (frontend + backend together)
npm run dev:all

# Development (frontend only)
npm run dev

# Development (backend only)
npm run server:watch

# Build
npm run build

# Lint
npm run lint

# Tests
npm run test              # Watch mode
npm run test:run          # Single run
npm run test:coverage     # With coverage
npm run test:ui           # Interactive UI

# Single test file
npx vitest run src/__tests__/MyComponent.test.tsx
npx vitest run server/__tests__/my-api.test.js

# Single test by name
npx vitest run -t "should handle auth"
```

### Orchestrator (Python)

```bash
cd orchestrator

# Setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run
python main.py

# Tests
pytest
pytest tests/test_specific.py -v
pytest -k "test_name"
```

### Docker (Full Wave Execution)

```bash
# Start all services
./wave-start.sh --project /path/to/project --wave 1

# FE-only wave
./wave-start.sh --project /path/to/project --wave 1 --fe-only

# Stop
./wave-start.sh --stop

# Manual docker compose
docker compose up -d dozzle merge-watcher
docker compose --profile agents up -d
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Portal Frontend | React 19 + Vite + TypeScript |
| Portal Backend | Express.js + Node.js |
| UI Components | Radix UI + Tailwind CSS |
| Testing | Vitest + Testing Library |
| Orchestrator | Python + LangGraph + FastAPI |
| Tracing | LangSmith |
| Container Orchestration | Docker Compose |
| Database | Supabase (PostgreSQL) |

## Workflow Gates

| Gate | Owner | Description |
|------|-------|-------------|
| Gate 0 | CTO | Pre-wave approval |
| Gate 1 | Agent | Self-review |
| Gate 2 | Agent | Build passes |
| Gate 3 | Agent | Tests pass |
| Gate 4 | QA | Acceptance testing |
| Gate 5 | PM | Requirements met |
| Gate 6 | CTO | Architecture review |
| Gate 7 | CTO | Merge approval |

## Slash Commands

Run `/commands` to see full list. Key commands:
- `/gate-0` through `/gate-7` - Execute specific gates
- `/execute-story <id>` - Full story execution
- `/wave-status` - Wave progress dashboard
- `/commit` - Standardized git commit
- `/branch` - Create feature branch
- `/fix` - Research-driven fix protocol
- `/tdd` - TDD cycle guidance
- `/cto` - CTO advisor analysis

## Domain Ownership (Multi-Agent)

| Domain | Agent | Paths |
|--------|-------|-------|
| Auth | BE-Dev | src/features/auth/**, supabase/functions/auth-** |
| Profiles | BE-Dev | src/features/profiles/** |
| UI Shell | FE-Dev | portal/src/components/**, portal/src/pages/** |
| Contracts | CTO | contracts/** |
| Stories | PM | stories/** |

## Permissions

### Do Without Asking
- Create/edit files in owned paths
- Run npm install, test, lint, build
- Git add, commit, push to feature branches
- Run story linter

### Ask First
- Modify files outside ownership paths
- Merge to main or develop
- Delete migrations or seed data
- Unclear requirements

### Never Do
- Push directly to main
- Skip workflow gates
- Self-approve for QA/PM review
- Commit .env files or secrets

## Code Style

### TypeScript (Portal)
- Strict mode enabled
- Explicit return types on exported functions
- Use interfaces over types where possible
- Path alias: `@/` maps to `src/`

### Naming
- Components: PascalCase (LoginForm.tsx)
- Hooks: camelCase with 'use' prefix (useAuth.ts)
- Utils: camelCase (formatCurrency.ts)
- Types: PascalCase with 'I' prefix (IUser)

## Testing

- Minimum coverage: 70%
- Test files: `*.test.{ts,tsx,js}` or `*.spec.{ts,tsx,js}`
- Portal tests in `portal/src/__tests__/` and `portal/server/__tests__/`
- Orchestrator tests in `orchestrator/tests/`

## Key Configuration Files

- `portal/vitest.config.ts` - Test configuration
- `portal/vite.config.ts` - Vite build config
- `portal/tailwind.config.js` - Tailwind CSS
- `orchestrator/config.py` - Python orchestrator config
- `docker-compose.yml` - Container definitions

## Signal Files

Location: `.claude/`
Pattern: `signal-{wave}-{gate}-{status}.json`

## Emergency Stop

```bash
echo "STOP" > .claude/EMERGENCY-STOP
```

## Environment Variables

Required in `.env`:
- `ANTHROPIC_API_KEY` - For agent execution
- `VITE_SUPABASE_URL` - Supabase connection
- `VITE_SUPABASE_ANON_KEY` - Supabase auth
- `SLACK_WEBHOOK_URL` - Notifications (optional)
