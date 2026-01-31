# /commit - Standardized Git Commit

**Priority:** P1 (HIGH)
**Recommended Model:** Haiku
**Aliases:** /c

## Purpose

Create standardized git commits with enforced message format, story ID linking, and co-author attribution. Ensures consistent commit history across all WAVE agents.

## When to Run

- After completing a logical unit of work
- Before switching to another task
- After passing local tests
- Before creating PR

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `message` | Commit description | Auto-generates from diff |
| `--story` | Story ID | Detects from branch name |
| `--no-verify` | Skip pre-commit hooks | false |
| `--amend` | Amend previous commit | false |

## Commit Message Format

```
<type>(<story-id>): <description>

<body>

Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `test` - Adding/updating tests
- `docs` - Documentation changes
- `chore` - Maintenance tasks
- `style` - Formatting, no code change

## Execution Steps

### 1. Pre-commit Checks
```bash
# Run type-check
npm run type-check

# Run linter
npm run lint

# Run tests (optional, based on config)
npm run test:run
```

### 2. Detect Story ID
```bash
# Extract from branch name
git branch --show-current | grep -oE 'WAVE[0-9]+-[A-Z]+-[0-9]+'
# Example: wave1/WAVE1-FE-001 → WAVE1-FE-001
```

### 3. Analyze Changes
```bash
# Get staged files
git diff --cached --stat

# Get diff summary for message generation
git diff --cached --name-only
```

### 4. Generate Commit Message

If no message provided, analyze diff and generate:
```
feat(WAVE1-FE-001): Add photo upload with validation

- Implement file picker for gallery selection
- Add camera capture support
- Show preview after upload
- Validate file type and size

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### 5. Create Commit
```bash
git commit -m "$(cat <<'EOF'
feat(WAVE1-FE-001): Add photo upload with validation

- Implement file picker for gallery selection
- Add camera capture support
- Show preview after upload
- Validate file type and size

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

## Output Format

### Success
```
Commit Created
==============
Branch: wave1/WAVE1-FE-001
Story: WAVE1-FE-001
Type: feat

Message:
  feat(WAVE1-FE-001): Add photo upload with validation

  - Implement file picker for gallery selection
  - Add camera capture support
  - Show preview after upload
  - Validate file type and size

  Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

Files: 5 changed, 234 insertions(+), 12 deletions(-)
Hash: abc123f
```

### Pre-commit Failure
```
Commit Blocked
==============
Pre-commit checks failed:

[FAIL] Type-check: 3 errors
  - src/components/Upload.tsx:45 - Type 'string' not assignable
  - src/lib/validation.ts:12 - Missing return type
  - src/lib/validation.ts:28 - Unused variable

FIX REQUIRED before commit.
Run: npm run type-check
```

## Validation Rules

### File Change Limit
```yaml
max_file_changes_per_commit: 15
```
If exceeded:
```
[WARNING] 18 files changed (limit: 15)
Consider splitting into smaller commits.
Proceed anyway? [y/N]
```

### Branch Protection
```
[ERROR] Cannot commit directly to main
Create a feature branch: git checkout -b wave1/WAVE1-XXX-NNN
```

### No Story ID
```
[WARNING] No story ID detected
Branch: feature/random-branch

Options:
1. Continue without story ID
2. Specify: /commit --story WAVE1-FE-001
3. Cancel and create proper branch
```

## Co-Author Attribution

Always append based on model used:
```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
Co-Authored-By: Claude Sonnet 4 <noreply@anthropic.com>
Co-Authored-By: Claude Haiku 3.5 <noreply@anthropic.com>
```

## Integration

- Runs: Pre-commit hooks
- Updates: Git history
- Triggers: CI on push
- Used by: `/pr` for PR creation

## Evidence Sources

- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.4)
- Format: Conventional Commits specification
- Co-author: GitHub co-author format
