# /go - Session Start Orchestrator

**Tier:** 1 (Core Command)
**Aliases:** /start, /begin
**Orchestrates:** preflight, status, wave-status

## Purpose

Single command to start your development session. Runs all necessary checks and gets you ready to work.

## Usage

```bash
/go                    # Full session start
/go quick              # Skip interactive prompts, auto-select defaults
/go story AUTH-BE-001  # Start and immediately load story
```

## What It Does

```
/go
 │
 ├─→ 1. System Health Check
 │     └── Build status, test status, git status
 │
 ├─→ 2. Pre-flight Authorization (/preflight)
 │     └── GO/NO-GO decision gate
 │     └── Config, Docker, Safety, Build, Tests, Stories
 │
 ├─→ 3. Mode Selection (if not quick)
 │     └── Single-Thread vs Autonomous Pipeline
 │     └── Story Work vs Custom Task
 │
 ├─→ 4. Context Loading
 │     └── Current wave status
 │     └── Available stories
 │     └── Pending work from last session
 │
 └─→ 5. Ready State
       └── Display recommended next action
       └── Suggest: /story <id> or /fix <target>
```

## Output

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  SESSION START                                                     /go       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  SYSTEM HEALTH                                                               ║
║  ─────────────                                                               ║
║  Build:    ✓ passing (0 errors)                                              ║
║  Tests:    ✓ 3769 passed                                                     ║
║  Git:      ✓ clean (main branch)                                             ║
║                                                                              ║
║  PRE-FLIGHT                                                                  ║
║  ──────────                                                                  ║
║  Status:   ✓ GO                                                              ║
║  Mode:     Single-Thread                                                     ║
║  Type:     Story Work                                                        ║
║                                                                              ║
║  WAVE STATUS                                                                 ║
║  ───────────                                                                 ║
║  Current Wave: 2                                                             ║
║  Stories:      8 total | 3 complete | 2 in-progress | 3 pending              ║
║                                                                              ║
║  PENDING FROM LAST SESSION                                                   ║
║  ─────────────────────────                                                   ║
║  • AUTH-BE-003: Gate 4 pending (needs QA)                                    ║
║                                                                              ║
║  RECOMMENDED NEXT ACTION                                                     ║
║  ───────────────────────                                                     ║
║  → /story AUTH-BE-003 --resume     Resume pending story                      ║
║  → /story UI-FE-001                Start new story                           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Flags

| Flag | Description |
|------|-------------|
| `quick` | Skip prompts, use defaults from last session |
| `story <id>` | Start session and immediately load story |
| `--no-checks` | Skip health checks (use with caution) |
| `--verbose` | Show detailed check output |

## Signal File

Creates on success:
```json
// .claude/signals/session-start-{timestamp}.json
{
  "command": "/go",
  "timestamp": "2026-02-01T09:00:00Z",
  "status": "GO",
  "mode": "single-thread",
  "type": "story-work",
  "systemHealth": {
    "build": "pass",
    "tests": "pass",
    "git": "clean"
  },
  "currentWave": 2,
  "pendingWork": ["AUTH-BE-003"],
  "recommendedAction": "/story AUTH-BE-003 --resume"
}
```

## Quick Start Examples

```bash
# Standard start
/go

# Quick start (no prompts)
/go quick

# Start and load story immediately
/go story AUTH-BE-001

# Verbose output
/go --verbose
```

## Relationship to Other Commands

| Instead of... | Use... |
|---------------|--------|
| `/preflight` then `/wave-status` then `/status` | `/go` |
| Manual checks before starting work | `/go` |

## Errors

| Error | Resolution |
|-------|------------|
| Build failing | Run `/fix build` then `/go` again |
| Tests failing | Run `/fix test` then `/go` again |
| NO-GO status | Address blockers shown in output |
