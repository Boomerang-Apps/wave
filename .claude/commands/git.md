# /git - Git Operations Suite

**Tier:** 2 (Workflow Command)
**Priority:** P1 (HIGH)
**Recommended Model:** Sonnet
**Aliases:** /g, /repo

## Purpose

Comprehensive git operations including status, sync, cleanup, stash management, and common workflows. Simplifies complex git operations with safety checks.

## Usage

```bash
/git                       # Show status overview
/git status                # Detailed status with recommendations
/git sync                  # Sync with remote (fetch + rebase)
/git cleanup               # Clean up local repository
/git stash [action]        # Stash management
/git undo [action]         # Undo operations safely
/git log [scope]           # Enhanced log views
/git diff [scope]          # Enhanced diff views
/git blame <file>          # Annotated blame
```

---

## Commands

### `/git status` - Enhanced Status

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GIT STATUS                                                    /git status   ║
║  Repository: airview | Branch: feature/AUTH-BE-005                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  BRANCH INFO                                                                 ║
║  ───────────                                                                 ║
║  Current:     feature/AUTH-BE-005                                            ║
║  Upstream:    origin/feature/AUTH-BE-005                                     ║
║  Base:        main                                                           ║
║  Behind main: 3 commits                                                      ║
║  Ahead:       5 commits                                                      ║
║                                                                              ║
║  WORKING TREE                                                                ║
║  ────────────                                                                ║
║                                                                              ║
║  Staged (2 files):                                                           ║
║  ├── M  src/features/auth/lib/validate.ts                                    ║
║  └── A  src/features/auth/lib/password.ts                                    ║
║                                                                              ║
║  Modified (3 files):                                                         ║
║  ├── M  src/features/auth/components/LoginForm.tsx                           ║
║  ├── M  src/features/auth/hooks/useAuth.ts                                   ║
║  └── M  src/lib/utils.ts                                                     ║
║                                                                              ║
║  Untracked (1 file):                                                         ║
║  └── ?  src/features/auth/lib/new-helper.ts                                  ║
║                                                                              ║
║  RECOMMENDATIONS                                                             ║
║  ───────────────                                                             ║
║  1. ⚠ Branch is 3 commits behind main                                        ║
║     → Run: /git sync                                                         ║
║  2. You have uncommitted changes                                             ║
║     → Run: /commit or /git stash                                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### `/git sync` - Sync with Remote

Safely syncs your branch with the latest changes from main.

```bash
/git sync                  # Sync current branch with main
/git sync main             # Explicitly sync with main
/git sync origin/develop   # Sync with different branch
/git sync --rebase         # Force rebase (default)
/git sync --merge          # Use merge instead of rebase
```

**Process:**
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GIT SYNC                                                       /git sync    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Step 1: Stash local changes                                                 ║
║  └── ✓ Stashed 3 modified files                                              ║
║                                                                              ║
║  Step 2: Fetch from origin                                                   ║
║  └── ✓ Fetched latest from origin/main                                       ║
║                                                                              ║
║  Step 3: Rebase onto main                                                    ║
║  └── ✓ Rebased 5 commits onto main                                           ║
║                                                                              ║
║  Step 4: Restore stashed changes                                             ║
║  └── ✓ Applied stash@{0}                                                     ║
║                                                                              ║
║  RESULT: ✓ SYNC COMPLETE                                                     ║
║  Branch feature/AUTH-BE-005 is now up to date with main                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**If Conflicts Occur:**
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GIT SYNC - CONFLICT DETECTED                                   /git sync    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ✗ REBASE PAUSED - Conflicts in 2 files:                                     ║
║                                                                              ║
║  ├── src/features/auth/lib/validate.ts                                       ║
║  │   Lines 45-52: Both modified password validation                          ║
║  │                                                                           ║
║  └── package.json                                                            ║
║      Lines 23-25: Dependency version conflict                                ║
║                                                                              ║
║  OPTIONS:                                                                    ║
║  1. Resolve conflicts manually, then: git rebase --continue                  ║
║  2. Abort rebase: git rebase --abort                                         ║
║  3. Use /git undo sync to restore previous state                             ║
║                                                                              ║
║  TIP: Use VS Code's merge editor for easier conflict resolution              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### `/git cleanup` - Repository Cleanup

```bash
/git cleanup               # Full cleanup (interactive)
/git cleanup branches      # Clean merged branches only
/git cleanup remotes       # Prune stale remote references
/git cleanup cache         # Clear git cache
/git cleanup --aggressive  # Deep clean (gc aggressive)
```

**Output:**
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GIT CLEANUP                                                  /git cleanup   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  MERGED BRANCHES                                                             ║
║  ───────────────                                                             ║
║  Found 4 merged branches to delete:                                          ║
║  ├── fix/hotfix-login                                                        ║
║  ├── feature/AUTH-BE-003                                                     ║
║  ├── dependabot/npm_and_yarn/lodash-4.17.21                                  ║
║  └── dependabot/npm_and_yarn/axios-0.21.4                                    ║
║                                                                              ║
║  ? Delete these branches? [Y/n] Y                                            ║
║  ✓ Deleted 4 local branches                                                  ║
║  ✓ Deleted 4 remote branches                                                 ║
║                                                                              ║
║  STALE REMOTES                                                               ║
║  ─────────────                                                               ║
║  ✓ Pruned 6 stale remote-tracking branches                                   ║
║                                                                              ║
║  GIT GC                                                                      ║
║  ──────                                                                      ║
║  ✓ Garbage collection complete                                               ║
║  ✓ Freed 12.4 MB                                                             ║
║                                                                              ║
║  RESULT: Repository cleaned                                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### `/git stash` - Stash Management

```bash
/git stash                 # Stash current changes
/git stash list            # List all stashes
/git stash show [n]        # Show stash contents
/git stash pop             # Apply and remove latest stash
/git stash apply [n]       # Apply stash without removing
/git stash drop [n]        # Remove a stash
/git stash clear           # Remove all stashes (careful!)
/git stash branch <name>   # Create branch from stash
```

**Output:**
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GIT STASH LIST                                            /git stash list   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌───────┬─────────────────────────────────────────┬──────────┬─────────────┐║
║  │ Index │ Description                             │ Branch   │ Age         │║
║  ├───────┼─────────────────────────────────────────┼──────────┼─────────────┤║
║  │ 0     │ WIP on AUTH-BE-005: login validation    │ AUTH-005 │ 2 hours     │║
║  │ 1     │ WIP on AUTH-BE-004: password reset      │ AUTH-004 │ 1 day       │║
║  │ 2     │ Temp: debugging session                 │ main     │ 3 days      │║
║  └───────┴─────────────────────────────────────────┴──────────┴─────────────┘║
║                                                                              ║
║  Commands:                                                                   ║
║  • /git stash show 0    - View stash contents                                ║
║  • /git stash pop       - Apply latest stash                                 ║
║  • /git stash drop 2    - Remove old stash                                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### `/git undo` - Safe Undo Operations

```bash
/git undo commit           # Undo last commit (keep changes)
/git undo commit --hard    # Undo last commit (discard changes)
/git undo stage            # Unstage all files
/git undo stage <file>     # Unstage specific file
/git undo changes          # Discard all local changes
/git undo changes <file>   # Discard changes in specific file
/git undo merge            # Abort current merge
/git undo rebase           # Abort current rebase
/git undo sync             # Undo last sync operation
```

**Safety Checks:**
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GIT UNDO COMMIT                                          /git undo commit   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Last commit: abc1234                                                        ║
║  Message: "feat: Add login validation"                                       ║
║  Author: You <you@example.com>                                               ║
║  Date: 2 hours ago                                                           ║
║                                                                              ║
║  Files changed:                                                              ║
║  ├── M  src/features/auth/lib/validate.ts                                    ║
║  ├── A  src/features/auth/lib/password.ts                                    ║
║  └── M  src/features/auth/components/LoginForm.tsx                           ║
║                                                                              ║
║  ⚠ WARNING: This commit has NOT been pushed to remote.                       ║
║                                                                              ║
║  ? Undo this commit? Changes will be preserved. [Y/n]                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

**Blocked Operation:**
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GIT UNDO COMMIT - BLOCKED                                /git undo commit   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ✗ CANNOT UNDO - Commit has been pushed to remote!                           ║
║                                                                              ║
║  The commit abc1234 exists on origin/feature/AUTH-BE-005                     ║
║  Undoing would require a force push, which is dangerous.                     ║
║                                                                              ║
║  SAFE ALTERNATIVES:                                                          ║
║  1. Create a revert commit: git revert abc1234                               ║
║  2. If you must force push: git push --force-with-lease                      ║
║     (only if you're the sole contributor to this branch)                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### `/git log` - Enhanced Log Views

```bash
/git log                   # Pretty log (last 10)
/git log 20                # Last 20 commits
/git log --all             # All branches
/git log --graph           # ASCII graph
/git log --today           # Today's commits
/git log --mine            # Your commits only
/git log <file>            # File history
/git log --pr              # Commits since branching from main
```

**Output:**
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GIT LOG                                                        /git log     ║
║  Branch: feature/AUTH-BE-005                                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  abc1234  feat: Add login validation                              2 hours    ║
║           └── src/features/auth/lib/validate.ts (+45, -12)                   ║
║                                                                              ║
║  def5678  fix: Handle edge case in password check                 5 hours    ║
║           └── src/features/auth/lib/password.ts (+8, -3)                     ║
║                                                                              ║
║  ghi9012  feat: Add password strength meter                       1 day      ║
║           ├── src/features/auth/components/PasswordMeter.tsx (+120)          ║
║           └── src/features/auth/lib/password.ts (+35)                        ║
║                                                                              ║
║  ─────────── main (3 commits behind) ───────────                             ║
║                                                                              ║
║  jkl3456  Merge pull request #47 from PROFILES-STORY-001          2 days     ║
║                                                                              ║
║  mno7890  feat: Add profile wizard                                2 days     ║
║           └── src/features/profiles/... (8 files)                            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

### `/git diff` - Enhanced Diff Views

```bash
/git diff                  # Working tree vs staged
/git diff --staged         # Staged vs last commit
/git diff main             # Current branch vs main
/git diff <commit>         # Current vs specific commit
/git diff <file>           # Diff specific file
/git diff --stat           # Summary only
/git diff --name-only      # File names only
```

---

### `/git blame` - Annotated Blame

```bash
/git blame <file>          # Full blame
/git blame <file> -L 10,20 # Lines 10-20 only
/git blame <file> --since="2 weeks ago"
```

**Output:**
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GIT BLAME: src/features/auth/lib/validate.ts                  /git blame    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  abc1234 (You, 2h ago)      45 │ export function validatePassword(pwd) {    ║
║  abc1234 (You, 2h ago)      46 │   if (pwd.length < 8) {                    ║
║  abc1234 (You, 2h ago)      47 │     return { valid: false, error: 'min' }; ║
║  abc1234 (You, 2h ago)      48 │   }                                        ║
║  def5678 (John, 1w ago)     49 │   if (!/[A-Z]/.test(pwd)) {                ║
║  def5678 (John, 1w ago)     50 │     return { valid: false, error: 'upper'};║
║  ghi9012 (Jane, 2w ago)     51 │   }                                        ║
║  ghi9012 (Jane, 2w ago)     52 │   return { valid: true };                  ║
║  initial (Bot, 3mo ago)     53 │ }                                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Commands Run

```bash
# Status
git status --porcelain
git rev-list --count main..HEAD
git rev-list --count HEAD..main

# Sync
git stash push -m "auto-stash before sync"
git fetch origin main
git rebase origin/main
git stash pop

# Cleanup
git branch --merged main | grep -v main | xargs git branch -d
git remote prune origin
git gc --prune=now

# Stash
git stash list --format='%gd: %s (%cr)'
git stash show -p stash@{0}

# Undo
git reset --soft HEAD~1
git checkout -- <file>
git restore --staged <file>

# Log
git log --oneline --graph --decorate -n 10
git log --author="$(git config user.email)" --oneline

# Diff
git diff --stat
git diff main...HEAD

# Blame
git blame -L 10,20 <file>
```

---

## Safety Features

### Protected Operations
| Operation | Protection |
|-----------|------------|
| Force push | Blocked on main/develop |
| Hard reset | Confirmation required |
| Stash clear | Confirmation required |
| Branch delete | Check for unmerged commits |
| Undo pushed commit | Blocked (suggest revert) |

### Automatic Backups
- Creates reflog entries before destructive operations
- Stashes changes before sync operations
- Preserves original branch on rebase conflicts

---

## Research Validation

| Source | Type | URL |
|--------|------|-----|
| Git Documentation | Official | https://git-scm.com/docs |
| GitHub CLI | Official | https://cli.github.com/manual/ |
| Pro Git Book | Best Practice | https://git-scm.com/book/en/v2 |
| Atlassian Git | Tutorial | https://www.atlassian.com/git/tutorials |

### Best Practices Applied
- **Rebase over merge** for cleaner history
- **Stash before sync** to preserve local work
- **Confirmation prompts** for destructive operations
- **Block dangerous operations** on protected branches

---

## Related Commands

| Command | Focus |
|---------|-------|
| `/branch` | Branch operations |
| `/branch-health` | Branch health analysis |
| `/commit` | Commit with conventions |
| `/pr` | Pull request management |

