# /done - Completion Orchestrator

**Tier:** 1 (Core Command)
**Aliases:** /d, /complete, /finish
**Orchestrates:** story-audit, commit, gate-check, pr

## Purpose

Single command to complete your current work. Validates, commits, and prepares for the next gate.

## Usage

```bash
/done                     # Complete current story work
/done story AUTH-BE-001   # Complete specific story
/done --no-commit         # Audit only, don't commit
/done --pr                # Also create PR after commit
```

## What It Does

```
/done
 │
 ├─→ 1. Detect Current Context
 │     └── What story am I working on?
 │     └── What files changed?
 │     └── What's the current gate?
 │
 ├─→ 2. Run Story Audit (/story-audit)
 │     └── Schema V4.1 compliance
 │     └── All ACs implemented?
 │     └── Tests passing?
 │
 ├─→ 3. Build & Test Verification
 │     └── Ensure build passes
 │     └── Ensure tests pass
 │     └── No regressions
 │
 ├─→ 4. Commit Changes (/commit)
 │     └── Stage relevant files
 │     └── Generate commit message
 │     └── Include Co-Author
 │
 ├─→ 5. Gate Check (/gate-check)
 │     └── Which gates passed?
 │     └── What's the next gate?
 │
 └─→ 6. Next Steps
       └── Suggest next action
       └── Ready for PR? Gate 5? etc.
```

## Output

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  COMPLETION CHECK                                                  /done     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  CURRENT CONTEXT                                                             ║
║  ───────────────                                                             ║
║  Story:     AUTH-BE-001 (User Login Flow)                                    ║
║  Branch:    feature/AUTH-BE-001                                              ║
║  Files:     12 modified, 3 added                                             ║
║                                                                              ║
║  STORY AUDIT                                                                 ║
║  ───────────                                                                 ║
║  Schema:    ✓ Valid                                                          ║
║  ACs:       ✓ 9/9 implemented                                                ║
║  Tests:     ✓ 24 tests passing                                               ║
║  Coverage:  ✓ 87% (threshold: 70%)                                           ║
║  Score:     97/100                                                           ║
║                                                                              ║
║  BUILD & TEST                                                                ║
║  ────────────                                                                ║
║  Build:     ✓ passing                                                        ║
║  Tests:     ✓ 3769 passed (+24 new)                                          ║
║  Lint:      ✓ no issues                                                      ║
║                                                                              ║
║  COMMIT                                                                      ║
║  ───────                                                                     ║
║  Hash:      a1b2c3d                                                          ║
║  Message:   feat(auth): implement user login flow (AUTH-BE-001)              ║
║  Files:     15 files committed                                               ║
║                                                                              ║
║  GATE STATUS                                                                 ║
║  ───────────                                                                 ║
║  Gate 0:    ✓ Pre-flight                                                     ║
║  Gate 1:    ✓ Self-verification                                              ║
║  Gate 2:    ✓ Build                                                          ║
║  Gate 3:    ✓ Tests                                                          ║
║  Gate 4:    ○ QA (pending)                                                   ║
║                                                                              ║
║  NEXT STEPS                                                                  ║
║  ──────────                                                                  ║
║  → /gate 4 AUTH-BE-001     Run QA acceptance                                 ║
║  → /pr                      Create pull request                              ║
║  → /story UI-FE-001         Start next story                                 ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Flags

| Flag | Description |
|------|-------------|
| `story <id>` | Complete specific story (vs auto-detect) |
| `--no-commit` | Run audit only, don't commit |
| `--no-push` | Commit but don't push |
| `--pr` | Also create PR after commit |
| `--force` | Complete even with warnings |
| `--verbose` | Show detailed audit output |

## Failure Scenarios

### Audit Fails
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  COMPLETION CHECK                                           /done ✗ BLOCKED  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  STORY AUDIT                                                                 ║
║  ───────────                                                                 ║
║  ACs:       ✗ 7/9 implemented                                                ║
║                                                                              ║
║  MISSING:                                                                    ║
║  • AC8: WHEN rate limit exceeded THEN return 429                             ║
║  • AC9: WHEN session expires THEN redirect to login                          ║
║                                                                              ║
║  ACTION REQUIRED                                                             ║
║  ───────────────                                                             ║
║  Implement missing ACs before completing.                                    ║
║  Run: /tdd story AUTH-BE-001/AC8                                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Tests Failing
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  COMPLETION CHECK                                           /done ✗ BLOCKED  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  BUILD & TEST                                                                ║
║  ────────────                                                                ║
║  Build:     ✓ passing                                                        ║
║  Tests:     ✗ 2 failing                                                      ║
║                                                                              ║
║  FAILURES:                                                                   ║
║  • auth.test.ts:47 - Expected 401, got 403                                   ║
║  • session.test.ts:92 - Timeout after 5000ms                                 ║
║                                                                              ║
║  ACTION REQUIRED                                                             ║
║  ───────────────                                                             ║
║  Fix failing tests before completing.                                        ║
║  Run: /fix test                                                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Signal File

Creates on success:
```json
// .claude/signals/done-{STORY-ID}-{timestamp}.json
{
  "command": "/done",
  "storyId": "AUTH-BE-001",
  "timestamp": "2026-02-01T14:30:00Z",
  "result": "SUCCESS",
  "audit": {
    "score": 97,
    "acsImplemented": 9,
    "acsTotal": 9
  },
  "commit": {
    "hash": "a1b2c3d",
    "files": 15
  },
  "gateStatus": {
    "passed": [0, 1, 2, 3],
    "next": 4
  },
  "nextAction": "/gate 4 AUTH-BE-001"
}
```

## Quick Examples

```bash
# Complete current work
/done

# Complete specific story
/done story AUTH-BE-001

# Audit only (no commit)
/done --no-commit

# Complete and create PR
/done --pr

# Force complete with warnings
/done --force
```

## Relationship to Other Commands

| Instead of... | Use... |
|---------------|--------|
| `/story-audit` then `/commit` then `/gate-check` | `/done` |
| Manual verification before committing | `/done` |
| Checking multiple things separately | `/done` |
