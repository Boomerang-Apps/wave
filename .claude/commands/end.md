# /end - Session End Orchestrator

**Tier:** 1 (Core Command)
**Aliases:** /bye, /eod, /close
**Orchestrates:** handoff, commit, push, report

## Purpose

Single command to properly close your development session. Ensures all work is saved, documented, and ready for handoff.

## Usage

```bash
/end                      # End session with handoff
/end "auth feature"       # End with focus label
/end --no-push            # Don't push to remote
/end --quick              # Minimal handoff, just essentials
```

## What It Does

```
/end
 │
 ├─→ 1. Check Uncommitted Work
 │     └── Any unstaged changes?
 │     └── Any staged but uncommitted?
 │     └── Prompt to commit or stash
 │
 ├─→ 2. Push Changes
 │     └── Push all commits to remote
 │     └── Verify push successful
 │
 ├─→ 3. Generate Handoff (/handoff)
 │     └── Session summary
 │     └── Work completed
 │     └── Pending items
 │     └── Context for next session
 │
 ├─→ 4. Update Signals
 │     └── Mark session as closed
 │     └── Update story statuses
 │     └── Clear session locks
 │
 └─→ 5. Session Summary
       └── Time spent
       └── Stories touched
       └── Commits made
       └── Next session suggestions
```

## Output

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  SESSION END                                                       /end      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  UNCOMMITTED WORK                                                            ║
║  ────────────────                                                            ║
║  Status:    ✓ All changes committed                                          ║
║                                                                              ║
║  PUSH STATUS                                                                 ║
║  ───────────                                                                 ║
║  Branch:    feature/AUTH-BE-001 → origin                                     ║
║  Commits:   3 commits pushed                                                 ║
║  Status:    ✓ Up to date with remote                                         ║
║                                                                              ║
║  SESSION SUMMARY                                                             ║
║  ───────────────                                                             ║
║  Duration:  2h 45m                                                           ║
║  Stories:   AUTH-BE-001 (completed), AUTH-BE-002 (in-progress)               ║
║  Commits:   5 commits                                                        ║
║  Tests:     +24 new tests                                                    ║
║  Coverage:  87% (+3%)                                                        ║
║                                                                              ║
║  WORK COMPLETED                                                              ║
║  ──────────────                                                              ║
║  ✓ AUTH-BE-001: User login flow - Gate 4 passed                              ║
║  ○ AUTH-BE-002: Password reset - AC 1-3 implemented                          ║
║                                                                              ║
║  PENDING FOR NEXT SESSION                                                    ║
║  ─────────────────────────                                                   ║
║  • AUTH-BE-002: Complete AC 4-6                                              ║
║  • AUTH-BE-001: Needs Gate 5 (PM review)                                     ║
║                                                                              ║
║  HANDOFF DOCUMENT                                                            ║
║  ─────────────────                                                           ║
║  Created:   .claude/handoffs/SESSION-2026-02-01T1630.md                      ║
║                                                                              ║
║  NEXT SESSION                                                                ║
║  ────────────                                                                ║
║  Suggested start:                                                            ║
║  → /go                                                                       ║
║  → /story AUTH-BE-002 --resume                                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Session closed. See you next time!
```

## Uncommitted Work Handling

If there's uncommitted work:

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  SESSION END                                              /end ⚠ UNCOMMITTED ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  UNCOMMITTED WORK DETECTED                                                   ║
║  ─────────────────────────                                                   ║
║  Modified:   5 files                                                         ║
║  Untracked:  2 files                                                         ║
║                                                                              ║
║  FILES:                                                                      ║
║  M  src/features/auth/login.ts                                               ║
║  M  src/features/auth/session.ts                                             ║
║  M  src/features/auth/__tests__/login.test.ts                                ║
║  M  src/features/auth/__tests__/session.test.ts                              ║
║  M  stories/wave2/AUTH-BE-002.json                                           ║
║  ?  src/features/auth/utils.ts                                               ║
║  ?  src/features/auth/__tests__/utils.test.ts                                ║
║                                                                              ║
║  OPTIONS                                                                     ║
║  ────────                                                                    ║
║  [1] Commit all changes (recommended)                                        ║
║  [2] Stash changes for later                                                 ║
║  [3] Discard changes (dangerous)                                             ║
║  [4] Cancel /end and continue working                                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Flags

| Flag | Description |
|------|-------------|
| `"focus"` | Label for handoff document |
| `--no-push` | Don't push to remote |
| `--no-handoff` | Skip handoff document creation |
| `--quick` | Minimal output, essential info only |
| `--force` | End even with uncommitted work (stash) |

## Signal Files

Creates on success:
```json
// .claude/signals/session-end-{timestamp}.json
{
  "command": "/end",
  "timestamp": "2026-02-01T16:30:00Z",
  "duration": "2h 45m",
  "storiesCompleted": ["AUTH-BE-001"],
  "storiesInProgress": ["AUTH-BE-002"],
  "commits": 5,
  "pushed": true,
  "handoffPath": ".claude/handoffs/SESSION-2026-02-01T1630.md",
  "nextSessionSuggestion": "/story AUTH-BE-002 --resume"
}
```

## Handoff Document

Created at `.claude/handoffs/SESSION-{timestamp}.md`:

```markdown
# Session Handoff: 2026-02-01

## Focus: Auth Feature Implementation

## Session Summary
- Duration: 2h 45m
- Stories: 2 touched
- Commits: 5

## Completed
- AUTH-BE-001: User login flow (Gate 4 passed)

## In Progress
- AUTH-BE-002: Password reset
  - AC 1-3: Implemented ✓
  - AC 4-6: Pending
  - Tests: 8 written, all passing

## Context for Next Session
- AUTH-BE-002 is on branch `feature/AUTH-BE-002`
- Last working on: `src/features/auth/reset.ts`
- Next step: Implement email sending (AC4)

## Blockers
- None

## Notes
- Used Supabase auth helpers for session management
- Rate limiting pattern in `/docs/patterns/rate-limit.md`
```

## Quick Examples

```bash
# Standard session end
/end

# With focus label
/end "auth implementation"

# Quick end (minimal output)
/end --quick

# End without pushing
/end --no-push

# Force end (stash uncommitted)
/end --force
```

## Relationship to Other Commands

| Instead of... | Use... |
|---------------|--------|
| `/handoff` then `git push` | `/end` |
| Manual session wrap-up | `/end` |
| Forgetting to document work | `/end` (creates handoff) |

## Best Practices

1. **Always use `/end` to close sessions** - ensures proper handoff
2. **Add focus labels** - helps identify sessions later
3. **Don't skip handoffs** - critical for context preservation
4. **Review pending items** - ensures nothing forgotten
