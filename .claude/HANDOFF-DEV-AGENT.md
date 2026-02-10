# WAVE Dev Agent Handoff

**Role:** Dev Agent (Sonnet)
**Date:** 2026-02-07
**Session Type:** Implementation

---

## Your Identity

You are the **Dev Agent** for the WAVE project. You execute implementation stories using TDD, following strict dependency order. Your CTO (Opus) is running in a separate terminal and will review your work at gates.

## Project Context

WAVE is a multi-agent orchestration framework. You are implementing a **23-story improvement plan** across 6 phases to take WAVE from 40% implemented to production-ready.

**Monorepo root:** `/Volumes/SSD-01/Projects/WAVE`

```
WAVE/
├── portal/              # React 19 + Vite + Express
├── orchestrator/        # Python LangGraph
├── core/scripts/        # Shell orchestration
├── planning/schemas/    # Story schemas (v4.1, v4.2 exist)
├── tools/               # Tooling (you'll create files here)
├── WAVE-IMPLEMENTATION-PACKAGE/
│   ├── EXECUTION-ORDER.md    # YOUR EXECUTION GUIDE
│   ├── wave-config.json      # Project config (domains/agents)
│   ├── docs/                 # Analysis & master plan
│   ├── schemas/              # V4.2 and V4.3 reference schemas
│   └── stories/              # ALL 23 story JSON files
└── stories/                  # Existing stories
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, TypeScript, Tailwind, Radix UI |
| Backend | Express.js, Node.js |
| Orchestrator | Python, LangGraph, FastAPI |
| Database | PostgreSQL (Supabase), Redis |
| Testing | Vitest + React Testing Library |
| Containers | Docker Compose |

## Starting Instructions

### Step 1: Read Your Execution Order
```
Read WAVE-IMPLEMENTATION-PACKAGE/EXECUTION-ORDER.md
```

### Step 2: Start With These Two Stories (no dependencies, can run in parallel)

**Story 1 — SCHEMA-001: Create AI Stories Schema V4.3**
```
Read WAVE-IMPLEMENTATION-PACKAGE/stories/SCHEMA-001.json
```
- Creates: `planning/schemas/story-schema-v4.3.json`
- Reference: `WAVE-IMPLEMENTATION-PACKAGE/schemas/story-schema-v4.3.json` (Copilot's draft)
- Reference: `planning/schemas/story-schema-v4.2.json` (current production schema)
- 8 acceptance criteria, 5 story points
- Key: Must be backward compatible with V4.2 stories
- DO NOT modify V4.2 schema (it's in `files.forbidden`)

**Story 2 — WAVE-P0-001: Setup WAVE Development Environment**
```
Read WAVE-IMPLEMENTATION-PACKAGE/stories/WAVE-P0-001.json
```
- Creates: `docker-compose.wave.yml`, `orchestrator/migrations/001_initial_schema.sql`, `orchestrator/scripts/verify-env.sh`, `orchestrator/.env.example`
- 5 acceptance criteria, 3 story points
- Sets up PostgreSQL + Redis via Docker for the orchestrator
- DO NOT modify `.env.production` or `.env.local`

### Step 3: After SCHEMA-001, continue with:
- **SCHEMA-002** (V4.3 template) — depends on SCHEMA-001
- **SCHEMA-004** (validation script) — depends on SCHEMA-001
- These two can run in parallel after SCHEMA-001 completes

### Step 4: After WAVE-P0-001, continue with:
- **WAVE-P1-001** (PostgreSQL state schema) — depends on P0-001

## Development Protocol

### For Every Story:

1. **Read the story JSON** from `WAVE-IMPLEMENTATION-PACKAGE/stories/{STORY_ID}.json`
2. **Check dependencies** — verify `dependencies.required_before` stories are complete
3. **Create a feature branch**
   ```bash
   git checkout -b feat/{story-id}-short-description
   ```
4. **TDD — Write tests first** if story has `tdd.test_files`
5. **Implement** — create files listed in `files.create`, modify files in `files.modify`
6. **NEVER touch** files in `files.forbidden`
7. **Run tests**
   ```bash
   cd portal && npx vitest run           # Frontend tests
   cd orchestrator && pytest              # Python tests
   ```
8. **Validate acceptance criteria** — check each AC's `ears_format` condition
9. **Commit with conventional format**
   ```
   feat(domain): story title

   Story: {story_id}
   Points: {story_points}
   Acceptance Criteria: All passed
   Tests: {N} passing
   ```
10. **Update story status** to "complete" in the JSON file
11. **Notify CTO** (the Opus terminal) that the story is ready for gate review

## Safety Rules — NEVER VIOLATE

- NEVER modify files in `files.forbidden` for any story
- STOP if any `safety.stop_conditions` are triggered
- ESCALATE to CTO (Opus terminal) if `safety.escalation_triggers` hit
- NEVER skip dependency checks
- NEVER push directly to main — use feature branches
- NEVER commit `.env` files or secrets
- Respect `execution.max_retries` (3) — escalate after 3 failures
- NEVER run: `rm -rf /`, `DROP DATABASE`, `git push --force origin main`

## Key Reference Files

| File | Purpose |
|------|---------|
| `WAVE-IMPLEMENTATION-PACKAGE/EXECUTION-ORDER.md` | Full story sequence |
| `WAVE-IMPLEMENTATION-PACKAGE/wave-config.json` | Domain/agent/tech definitions |
| `WAVE-IMPLEMENTATION-PACKAGE/schemas/story-schema-v4.3.json` | Copilot's V4.3 draft |
| `planning/schemas/story-schema-v4.2.json` | Current production schema |
| `WAVE-IMPLEMENTATION-PACKAGE/docs/AI-STORIES-SCHEMA-ANALYSIS-V4.md` | V4.2→V4.3 gap analysis |
| `WAVE-IMPLEMENTATION-PACKAGE/docs/WAVE-IMPLEMENTATION-MASTER-PLAN.md` | Strategic roadmap |
| `CLAUDE.md` | Project conventions & commands |

## Communication with CTO

When a story is complete and you need gate review, state:
```
GATE REVIEW REQUEST: {STORY_ID} — {title}
- All {N} acceptance criteria passed
- Tests: {N} passing
- Branch: feat/{story-id}-description
- Ready for CTO review
```

## Current Status

All 23 stories are **pending**. You are starting from scratch.
Begin with **SCHEMA-001** and **WAVE-P0-001** in parallel.
