# WAVE Agent Configurations

Agent role definitions for the WAVE multi-agent framework.

## 7 Agents Architecture

| # | Agent | File | Purpose | Model |
|---|-------|------|---------|-------|
| 1 | CTO | `cto-agent.md` | Architecture decisions, technical oversight | Opus 4.5 |
| 2 | PM | `pm-agent.md` | Orchestration, story assignment, approvals | Opus 4.5 |
| 3 | QA | `qa-agent.md` | Validation & testing | Haiku 4 |
| 4 | FE-Dev-1 | `fe-dev-1-agent.md` | Frontend development (Wave 1) | Sonnet 4 |
| 5 | FE-Dev-2 | `fe-dev-2-agent.md` | Frontend development (Wave 2) | Sonnet 4 |
| 6 | BE-Dev-1 | `be-dev-1-agent.md` | Backend development (Wave 1) | Sonnet 4 |
| 7 | BE-Dev-2 | `be-dev-2-agent.md` | Backend development (Wave 2) | Sonnet 4 |

## Agent Hierarchy

```
                    ┌─────────┐
                    │   CTO   │  Architecture & Technical Decisions
                    └────┬────┘
                         │
                    ┌────┴────┐
                    │   PM    │  Orchestration & Story Assignment
                    └────┬────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
    │ FE-Dev  │    │ BE-Dev  │    │   QA    │
    │  1 & 2  │    │  1 & 2  │    │         │
    └─────────┘    └─────────┘    └─────────┘
```

## Wave Assignment

| Wave | FE Developer | BE Developer | Stories |
|------|--------------|--------------|---------|
| Wave 1 | FE-Dev-1 | BE-Dev-1 | First batch |
| Wave 2 | FE-Dev-2 | BE-Dev-2 | Second batch |

## Agent Lifecycle

```
CTO: Architecture Review → Technical Decisions
PM: Story Assignment → Gate Approvals → Merge Authorization
Dev: Planning → Development → Complete Signal
QA: Validation → Approve/Reject → Retry Coordination
```

## Common Rules (All Agents)

1. **Read CLAUDE.md first** - Safety protocol
2. **Check EMERGENCY-STOP** - Before any action
3. **Work in worktree only** - Isolated Git branch
4. **Include token usage** - In all signal files
5. **Create completion signal** - When done

## Model Configuration

Override in `.env`:
```bash
ANTHROPIC_MODEL_CTO=claude-opus-4-5-20251101
ANTHROPIC_MODEL_PM=claude-opus-4-5-20251101
ANTHROPIC_MODEL_DEV=claude-sonnet-4-20250514
ANTHROPIC_MODEL_QA=claude-haiku-4-20251001
```
