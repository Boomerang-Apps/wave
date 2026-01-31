# /pr - Create Pull Request

**Priority:** P1 (HIGH)
**Recommended Model:** Haiku
**Aliases:** /pull-request

## Purpose

Create a pull request with standardized format, including summary from commits, test plan from acceptance criteria, and proper linking to stories/issues.

## When to Run

- After story implementation complete
- After all tests passing
- After local validation complete
- Before requesting code review

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--base` | Target branch | main or staging |
| `--title` | PR title | Auto-generates from story |
| `--draft` | Create as draft PR | false |
| `--no-push` | Create PR without pushing | false |

## Pre-requisites

Before creating PR:
1. All commits pushed to remote
2. Branch is up to date with base
3. All tests passing
4. Build succeeds
5. No merge conflicts

## Execution Steps

### 1. Pre-flight Checks
```bash
# Check uncommitted changes
git status --porcelain

# Check branch is pushed
git log origin/$(git branch --show-current)..HEAD

# Verify tests pass
npm run test:run

# Verify build passes
npm run build
```

### 2. Gather Information
```bash
# Get current branch
BRANCH=$(git branch --show-current)

# Extract story ID
STORY_ID=$(echo $BRANCH | grep -oE 'WAVE[0-9]+-[A-Z]+-[0-9]+')

# Get commit history for this branch
git log main..HEAD --oneline

# Get diff stats
git diff main..HEAD --stat
```

### 3. Generate PR Content

#### Title Format
```
feat(WAVE1-FE-001): Photo Upload Flow
```

#### Body Template
```markdown
## Summary
- Implement gallery upload with file picker
- Add camera capture support
- Show image preview after upload
- Add file validation (type and size)

## Story
Closes #WAVE1-FE-001

## Test Plan
- [ ] Upload valid JPG image from gallery
- [ ] Upload valid PNG image from gallery
- [ ] Capture photo from camera
- [ ] Verify preview displays correctly
- [ ] Upload invalid file type (expect error)
- [ ] Upload file > 20MB (expect error)

## Screenshots
(Add screenshots if UI changes)

## Checklist
- [x] Tests added/updated
- [x] Type-check passes
- [x] Build succeeds
- [x] Self-reviewed code

---
Generated with [Claude Code](https://claude.ai/code)
```

### 4. Create PR
```bash
gh pr create \
  --base main \
  --title "feat(WAVE1-FE-001): Photo Upload Flow" \
  --body "$(cat <<'EOF'
## Summary
- Implement gallery upload with file picker
- Add camera capture support
- Show image preview after upload

## Test Plan
- [ ] Upload valid image
- [ ] Verify preview displays

Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

## Output Format

### Success
```
Pull Request Created
====================
PR #4: feat(WAVE1-FE-001): Photo Upload Flow
URL: https://github.com/Boomerang-Apps/footprint/pull/4
Branch: wave1/WAVE1-FE-001 → main

Summary:
- Implement gallery upload
- Add camera capture
- Show preview
- Add validation

Test Plan:
- [ ] Upload valid image
- [ ] Upload invalid type (error shown)
- [ ] Upload oversized file (error shown)

Files Changed: 12
Commits: 8
Lines: +450 / -23

Status: Waiting for CI...

Next Steps:
1. Wait for CI checks to pass
2. Request review from team
3. Address review feedback
4. Merge when approved
```

### Blocked (Uncommitted Changes)
```
PR Creation Blocked
===================
[ERROR] Uncommitted changes detected

Modified files:
  - src/components/Upload.tsx
  - src/lib/validation.ts

FIX: Commit or stash changes first
  /commit "Complete upload implementation"
  OR
  git stash
```

### Blocked (Tests Failing)
```
PR Creation Blocked
===================
[ERROR] Tests are failing

Failed tests:
  - upload.test.tsx: 3 failures
  - validation.test.ts: 1 failure

FIX: Ensure all tests pass before creating PR
  npm run test:run
```

### Blocked (Behind Base)
```
PR Creation Blocked
===================
[WARNING] Branch is behind main by 5 commits

FIX: Update branch before creating PR
  git fetch origin main
  git rebase origin/main
  # Resolve any conflicts
  git push --force-with-lease
```

## PR Labels

Auto-add labels based on:
- Story domain: `frontend`, `backend`, `security`
- Story priority: `P0`, `P1`, `P2`
- Wave: `wave-1`, `wave-2`

```bash
gh pr edit --add-label "frontend,P0,wave-1"
```

## Reviewer Assignment

If configured in story:
```bash
gh pr edit --add-reviewer @cto-agent
```

## Draft PRs

For work-in-progress:
```bash
/pr --draft
```

Creates PR with `[WIP]` prefix and draft status.

## Integration

- Uses: `gh` CLI for GitHub operations
- Requires: GitHub authentication
- Triggers: CI workflow on PR creation
- Updates: Story status to `review`

## Evidence Sources

- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.5)
- GitHub CLI: `gh pr create` documentation
- Template: Conventional PR format
