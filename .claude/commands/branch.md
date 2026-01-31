# Branch: Git Branching Operations

Manage feature branches following Wave V2 branching conventions.

## Arguments
- `$ARGUMENTS` - Action: "create {STORY-ID}", "switch {STORY-ID}", "status", "cleanup"

## Purpose
Ensure proper branching workflow with workspace branches, feature branches, and merge conventions.

## Branch Structure

```
main                           # Production-ready code
├── develop                    # Integration branch
└── workspace/
    ├── be-dev                 # Backend developer workspace
    ├── fe-dev                 # Frontend developer workspace
    ├── qa                     # QA workspace
    └── pm                     # PM workspace

Feature branches (temporary):
└── feature/{STORY-ID}         # Created from workspace/{agent}
```

## Actions

### `create {STORY-ID}` - Create Feature Branch

1. Determine agent from story file
2. Ensure workspace branch is up to date
3. Create feature branch from workspace
4. Set up tracking

```bash
# Auto-detected workflow:
git fetch origin
git checkout workspace/{agent}
git pull origin workspace/{agent}
git checkout -b feature/{STORY-ID}
git push -u origin feature/{STORY-ID}
```

### `switch {STORY-ID}` - Switch to Feature Branch

1. Stash any uncommitted changes
2. Switch to feature branch
3. Pull latest changes

### `status` - Branch Status

Show current branch status:
- Active branch
- Uncommitted changes
- Commits ahead/behind
- Related story information

### `cleanup` - Clean Up Merged Branches

1. List merged feature branches
2. Confirm deletion
3. Remove local and remote branches

## Commit Convention

All commits must follow the convention:

```
{type}({scope}): {message}

Types:
├── feat     # New feature
├── fix      # Bug fix
├── test     # Adding tests
├── refactor # Code refactoring
├── docs     # Documentation
├── chore    # Maintenance
└── security # Security fix

Scope: Story ID or component name

Examples:
├── feat(AUTH-BE-001): implement user registration endpoint
├── test(AUTH-BE-001): add unit tests for registration
├── fix(AUTH-BE-002): resolve password validation issue
└── refactor(AUTH-BE-001): extract validation logic
```

## Branch Naming Rules

```
✓ feature/AUTH-BE-001         # Correct
✓ feature/PROF-FE-003         # Correct
✗ feature/auth                # Missing story ID
✗ AUTH-BE-001                 # Missing prefix
✗ feature/auth-be-001         # Lowercase not allowed
```

## Output Format

### Create Branch
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  BRANCH: CREATE feature/{STORY-ID}                                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  STORY INFO                                                                  ║
║  ──────────                                                                  ║
║  ID: {STORY-ID}                                                              ║
║  Title: {title}                                                              ║
║  Agent: {agent}                                                              ║
║  Workspace: workspace/{agent}                                                ║
║                                                                              ║
║  BRANCH CREATION                                                             ║
║  ───────────────                                                             ║
║  ✓ Fetched latest from origin                                                ║
║  ✓ Workspace branch up to date                                               ║
║  ✓ Created: feature/{STORY-ID}                                               ║
║  ✓ Pushed to origin with tracking                                            ║
║                                                                              ║
║  CURRENT STATE                                                               ║
║  ─────────────                                                               ║
║  Branch: feature/{STORY-ID}                                                  ║
║  Base: workspace/{agent} @ {commit-hash}                                     ║
║  Tracking: origin/feature/{STORY-ID}                                         ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Ready for development. Use TDD workflow for implementation.                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Branch Status
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  BRANCH: STATUS                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  CURRENT BRANCH                                                              ║
║  ──────────────                                                              ║
║  Branch: feature/AUTH-BE-001                                                 ║
║  Story: AUTH-BE-001 - Implement User Registration                            ║
║  Agent: be-dev                                                               ║
║                                                                              ║
║  SYNC STATUS                                                                 ║
║  ───────────                                                                 ║
║  Local:  ████████████████ 12 commits                                         ║
║  Remote: ████████████████ 12 commits (up to date)                            ║
║  Base:   ████████░░░░░░░░  8 commits behind workspace/be-dev                 ║
║                                                                              ║
║  WORKING TREE                                                                ║
║  ────────────                                                                ║
║  Modified: 2 files                                                           ║
║  ├── src/services/auth/register.ts                                           ║
║  └── src/services/auth/register.test.ts                                      ║
║  Staged: 0 files                                                             ║
║  Untracked: 0 files                                                          ║
║                                                                              ║
║  RECENT COMMITS                                                              ║
║  ──────────────                                                              ║
║  a1b2c3d feat(AUTH-BE-001): implement registration endpoint                  ║
║  d4e5f6g test(AUTH-BE-001): add unit tests for registration                  ║
║  h7i8j9k feat(AUTH-BE-001): add input validation                             ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ⚠ Branch is 8 commits behind workspace/be-dev - consider rebasing           ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Merge Workflow

When story is complete (all gates passed):

```
1. Ensure all tests pass
2. Update from workspace branch (rebase or merge)
3. Create PR: feature/{STORY-ID} → workspace/{agent}
4. After review: Merge PR
5. Cleanup: Delete feature branch
```

## Protected Branches

```
Protected (no direct commits):
├── main
└── develop

Workspace branches (agent commits only):
├── workspace/be-dev    # be-dev agent only
├── workspace/fe-dev    # fe-dev agent only
├── workspace/qa        # qa agent only
└── workspace/pm        # pm agent only
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Branch already exists | Switch to existing branch |
| Uncommitted changes | Stash or commit first |
| Conflicts on create | Resolve conflicts, then create |
| Story not found | Verify story ID exists |
