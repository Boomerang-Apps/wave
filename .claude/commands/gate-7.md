# Gate 7: Merge Authorization

Run Gate 7 Merge Authorization after Gate 6 passes.

## Arguments
- `$ARGUMENTS` - Story ID (e.g., AUTH-BE-001)

## Owner
CTO Master Agent

## Purpose
Final authorization before merging to integration branch.

## Mandatory Checks

```
□ MA-A: All previous gates passed
   - Gate 0: Pre-flight ✓
   - Gate 1: Self-verification ✓
   - Gate 2: Build ✓
   - Gate 3: Test ✓
   - Gate 4: QA ✓
   - Gate 5: PM ✓
   - Gate 6: Architecture ✓

□ MA-B: No merge conflicts
   - Rebase/merge latest from target branch
   - Resolve any conflicts
   - Re-run Gate 2 after resolution

□ MA-C: Commit history clean
   - Squash if excessive commits
   - Meaningful commit messages
   - Co-author attribution included

□ MA-D: PR description complete
   - Summary of changes
   - Link to story
   - Test instructions
   - Screenshots (if UI)

□ MA-E: Traceability artifacts updated
   - Traceability matrix reflects implementation
   - Test case IDs linked
   - Code artifacts documented

□ MA-F: Release notes drafted
   - User-facing changes documented
   - Breaking changes highlighted
   - Migration steps if needed
```

## Execution

1. Verify all previous gates have signal files
2. Check for merge conflicts with target branch
3. Review commit history
4. Verify PR/MR is ready
5. Create completion signal file
6. Authorize merge

## Pass Criteria
6/6 checks GREEN

## Fail Action
- Document what's missing
- Return to appropriate gate
- Do NOT merge

## Merge Commands

```bash
# Ensure up to date
git fetch origin
git rebase origin/{target-branch}

# If conflicts, resolve and re-run Gate 2
git add .
git rebase --continue

# Squash if needed
git rebase -i HEAD~{n}

# Create final commit
git commit --amend -m "feat({domain}): {STORY-ID} - {title}

Implements:
- AC1: {description}
- AC2: {description}

Gates: 0-7 passed
Story: {STORY-ID}

Co-Authored-By: {agent} <noreply@anthropic.com>"

# Push feature branch
git push origin feature/{STORY-ID} --force-with-lease

# Create PR (if not exists) or merge
gh pr create --base {target} --title "{STORY-ID}: {title}" --body "..."
# or
gh pr merge --squash
```

## Signal Files

Create completion signal:
```json
// .claude/signals/signal-{wave}-{STORY-ID}-complete.json
{
  "storyId": "{STORY-ID}",
  "status": "complete",
  "gates": {
    "gate0": "2026-01-30T10:00:00Z",
    "gate1": "2026-01-30T11:00:00Z",
    "gate2": "2026-01-30T11:15:00Z",
    "gate3": "2026-01-30T11:30:00Z",
    "gate4": "2026-01-30T12:00:00Z",
    "gate5": "2026-01-30T12:30:00Z",
    "gate6": "2026-01-30T13:00:00Z",
    "gate7": "2026-01-30T13:15:00Z"
  },
  "mergedTo": "{target-branch}",
  "mergedAt": "2026-01-30T13:15:00Z",
  "mergedBy": "cto-master-agent"
}
```

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GATE 7: MERGE AUTHORIZATION                                                 ║
║  Story: {STORY-ID} | CTO Agent                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  GATE VERIFICATION                                                           ║
║  ─────────────────                                                           ║
║  ✓ Gate 0: Pre-flight passed      (2026-01-30T10:00:00Z)                     ║
║  ✓ Gate 1: Self-verification      (2026-01-30T11:00:00Z)                     ║
║  ✓ Gate 2: Build verification     (2026-01-30T11:15:00Z)                     ║
║  ✓ Gate 3: Test verification      (2026-01-30T11:30:00Z)                     ║
║  ✓ Gate 4: QA acceptance          (2026-01-30T12:00:00Z)                     ║
║  ✓ Gate 5: PM validation          (2026-01-30T12:30:00Z)                     ║
║  ✓ Gate 6: Architecture review    (2026-01-30T13:00:00Z)                     ║
║                                                                              ║
║  MERGE CHECKS                                                                ║
║  ────────────                                                                ║
║  □ MA-A: All Gates Passed         ✓ 7/7 gates complete                       ║
║  □ MA-B: No Conflicts             ✓ Clean merge with {target}                ║
║  □ MA-C: Commit History           ✓ Squashed to 1 commit                     ║
║  □ MA-D: PR Description           ✓ Complete with screenshots                ║
║  □ MA-E: Traceability             ✓ Matrix updated                           ║
║  □ MA-F: Release Notes            ✓ Drafted in CHANGELOG.md                  ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: AUTHORIZED                                                          ║
║  Action: Merge to {target-branch}                                            ║
║  Signal: .claude/signals/signal-wave1-{STORY-ID}-complete.json               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
