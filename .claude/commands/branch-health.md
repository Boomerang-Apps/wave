# /branch-health - Branch Health Analysis

**Tier:** 2 (Workflow Command)
**Priority:** P1 (HIGH)
**Recommended Model:** Sonnet
**Aliases:** /bh, /branch-audit, /repo-health

## Purpose

Comprehensive analysis of repository branch health including stale branches, PR status, merge readiness, drift detection, and team metrics. Essential for maintaining a clean and efficient git workflow.

## Usage

```bash
/branch-health             # Full branch health analysis
/branch-health stale       # Stale branch detection only
/branch-health prs         # PR status analysis only
/branch-health drift       # Branch drift analysis only
/branch-health metrics     # Team metrics only
/branch-health --cleanup   # Generate cleanup recommendations
/branch-health --fix       # Auto-cleanup (with confirmation)
```

---

## What It Analyzes

### 1. Branch Hygiene
| Check | Threshold | Action |
|-------|-----------|--------|
| Stale branches | >30 days no commits | Flag for deletion |
| Orphaned branches | No upstream, no PR | Flag for deletion |
| Merged branches | Still exists after merge | Auto-delete candidate |
| Naming compliance | `feature/EPIC-TYPE-NNN` | Report violations |
| Branch count | >20 active branches | Warning |

### 2. PR Status
| Check | Source | Display |
|-------|--------|---------|
| Open PRs | GitHub API | Count by author |
| Draft PRs | GitHub API | List |
| Stale PRs | >7 days no activity | Flag |
| Failing checks | GitHub API | List with reasons |
| Merge conflicts | GitHub API | List |
| Awaiting review | GitHub API | List |

### 3. Merge Readiness
| Check | Criteria | Status |
|-------|----------|--------|
| Ready to merge | All checks pass, approved | ✓ Ready |
| Needs rebase | Behind main | ⚠ Rebase |
| Has conflicts | Merge conflict | ✗ Conflicts |
| Needs review | No approvals | ○ Pending |
| Blocked | Required checks failing | ✗ Blocked |

### 4. Drift Analysis
| Check | Threshold | Risk |
|-------|-----------|------|
| Commits behind main | >10 commits | High |
| Days since rebase | >7 days | Medium |
| Conflict probability | Based on files changed | Calculated |

---

## Output

### `/branch-health` - Full Analysis

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  BRANCH HEALTH ANALYSIS                                     /branch-health   ║
║  Repository: Boomerang-Apps/airview | Date: 2026-02-01                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  SUMMARY                                                                     ║
║  ───────                                                                     ║
║                                                                              ║
║  Health Score:  78/100  ███████████████░░░░░ ⚠ NEEDS ATTENTION               ║
║                                                                              ║
║  Total Branches:    18                                                       ║
║  Active (7 days):   8                                                        ║
║  Stale (>30 days):  4   ← cleanup recommended                                ║
║  Orphaned:          2   ← cleanup recommended                                ║
║                                                                              ║
║  BRANCH STATUS                                                               ║
║  ─────────────                                                               ║
║                                                                              ║
║  ┌─────────────────────────────┬──────────┬────────────┬────────────────────┐║
║  │ Branch                      │ Status   │ Behind     │ Last Activity      │║
║  ├─────────────────────────────┼──────────┼────────────┼────────────────────┤║
║  │ main                        │ ✓ Base   │ -          │ 2h ago             │║
║  │ feature/AUTH-BE-005         │ ✓ Active │ 3 commits  │ 1h ago             │║
║  │ feature/AUTH-BE-004         │ ✓ Active │ 8 commits  │ 1d ago             │║
║  │ feature/PROFILES-STORY-002  │ ⚠ Drift  │ 15 commits │ 3d ago             │║
║  │ feature/UI-FE-003           │ ✓ Active │ 2 commits  │ 5h ago             │║
║  │ feature/old-experiment      │ ✗ Stale  │ 45 commits │ 42d ago            │║
║  │ feature/test-branch         │ ✗ Orphan │ 12 commits │ 28d ago            │║
║  │ fix/hotfix-login            │ ✓ Merged │ -          │ 5d ago (delete)    │║
║  └─────────────────────────────┴──────────┴────────────┴────────────────────┘║
║                                                                              ║
║  PULL REQUESTS                                                               ║
║  ─────────────                                                               ║
║                                                                              ║
║  Open PRs: 5                                                                 ║
║                                                                              ║
║  ┌─────┬─────────────────────────────┬───────────┬────────────┬─────────────┐║
║  │ #   │ Title                       │ Status    │ Checks     │ Age         │║
║  ├─────┼─────────────────────────────┼───────────┼────────────┼─────────────┤║
║  │ #48 │ feat: Add login validation  │ ✓ Ready   │ ✓ Pass     │ 2h          │║
║  │ #47 │ feat: Profile wizard        │ ⚠ Review  │ ✓ Pass     │ 1d          │║
║  │ #45 │ fix: Password reset flow    │ ✗ Failing │ ✗ 2 failed │ 3d          │║
║  │ #44 │ feat: Email verification    │ ⚠ Stale   │ ✓ Pass     │ 8d          │║
║  │ #42 │ wip: Messaging feature      │ ○ Draft   │ ○ Pending  │ 12d         │║
║  └─────┴─────────────────────────────┴───────────┴────────────┴─────────────┘║
║                                                                              ║
║  PR Status Breakdown:                                                        ║
║  ├── Ready to merge: 1                                                       ║
║  ├── Awaiting review: 1                                                      ║
║  ├── Failing checks: 1                                                       ║
║  ├── Stale (>7 days): 1                                                      ║
║  └── Draft: 1                                                                ║
║                                                                              ║
║  DRIFT ANALYSIS                                                              ║
║  ──────────────                                                              ║
║                                                                              ║
║  Branches needing rebase:                                                    ║
║                                                                              ║
║  ┌─────────────────────────────┬────────────┬─────────────┬─────────────────┐║
║  │ Branch                      │ Behind     │ Risk        │ Action          │║
║  ├─────────────────────────────┼────────────┼─────────────┼─────────────────┤║
║  │ feature/PROFILES-STORY-002  │ 15 commits │ HIGH        │ Rebase ASAP     │║
║  │ feature/AUTH-BE-004         │ 8 commits  │ MEDIUM      │ Rebase soon     │║
║  │ feature/AUTH-BE-005         │ 3 commits  │ LOW         │ OK for now      │║
║  └─────────────────────────────┴────────────┴─────────────┴─────────────────┘║
║                                                                              ║
║  FILES AT RISK (potential conflicts):                                        ║
║  ├── src/features/auth/lib/validate.ts (modified in main + 2 branches)       ║
║  └── src/components/ui/Button.tsx (modified in main + 1 branch)              ║
║                                                                              ║
║  NAMING COMPLIANCE                                                           ║
║  ─────────────────                                                           ║
║                                                                              ║
║  Pattern: feature/{EPIC}-{TYPE}-{NNN} or fix/{description}                   ║
║                                                                              ║
║  ⚠ 2 branches violate naming convention:                                     ║
║  ├── feature/old-experiment (missing story ID)                               ║
║  └── feature/test-branch (missing story ID)                                  ║
║                                                                              ║
║  CLEANUP RECOMMENDATIONS                                                     ║
║  ───────────────────────                                                     ║
║                                                                              ║
║  Safe to delete (6 branches):                                                ║
║  ├── fix/hotfix-login (merged 5d ago)                                        ║
║  ├── feature/old-experiment (stale 42d, no PR)                               ║
║  ├── feature/test-branch (orphan, no upstream)                               ║
║  ├── feature/archived-feature (stale 65d)                                    ║
║  ├── dependabot/npm_and_yarn/lodash-4.17.21 (merged)                         ║
║  └── dependabot/npm_and_yarn/axios-0.21.4 (merged)                           ║
║                                                                              ║
║  Run: /branch-health --fix to cleanup                                        ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  HEALTH SCORE: 78/100                                                        ║
║                                                                              ║
║  ISSUES:                                                                     ║
║  1. ✗ 4 stale branches need cleanup                                          ║
║  2. ✗ 1 PR failing checks (#45)                                              ║
║  3. ⚠ 1 branch with high drift (PROFILES-STORY-002)                          ║
║  4. ⚠ 1 stale PR needs attention (#44)                                       ║
║                                                                              ║
║  RECOMMENDED ACTIONS:                                                        ║
║  1. Run /branch-health --fix to cleanup stale branches                       ║
║  2. Fix failing checks on PR #45                                             ║
║  3. Rebase feature/PROFILES-STORY-002                                        ║
║  4. Review or close stale PR #44                                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### `/branch-health metrics` - Team Metrics

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  BRANCH METRICS                                      /branch-health metrics  ║
║  Period: Last 30 days                                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  PR THROUGHPUT                                                               ║
║  ─────────────                                                               ║
║                                                                              ║
║  PRs Merged:        23                                                       ║
║  PRs Closed:        4                                                        ║
║  PRs Opened:        28                                                       ║
║  Net Change:        +1 (slight backlog)                                      ║
║                                                                              ║
║  Weekly Trend:                                                               ║
║  Week 1:  ████████  8 merged                                                 ║
║  Week 2:  ██████    6 merged                                                 ║
║  Week 3:  █████     5 merged                                                 ║
║  Week 4:  ████      4 merged  ← declining                                    ║
║                                                                              ║
║  PR LIFECYCLE                                                                ║
║  ────────────                                                                ║
║                                                                              ║
║  Average Time to Merge:     2.3 days                                         ║
║  Average Time to Review:    8 hours                                          ║
║  Average Review Cycles:     1.4                                              ║
║  First Review Time:         4 hours                                          ║
║                                                                              ║
║  BRANCH LIFECYCLE                                                            ║
║  ────────────────                                                            ║
║                                                                              ║
║  Average Branch Age:        5.2 days                                         ║
║  Longest Active Branch:     12 days (feature/MSG-BE-001)                     ║
║  Branches Created:          28                                               ║
║  Branches Deleted:          24                                               ║
║                                                                              ║
║  CODE REVIEW HEALTH                                                          ║
║  ─────────────────                                                           ║
║                                                                              ║
║  Reviews Given:             45                                               ║
║  Reviews Received:          42                                               ║
║  Approval Rate:             89%                                              ║
║  Changes Requested:         11%                                              ║
║                                                                              ║
║  MERGE CONFLICT RATE                                                         ║
║  ──────────────────                                                          ║
║                                                                              ║
║  PRs with conflicts:        3/28 (11%)                                       ║
║  Average resolution time:   2 hours                                          ║
║  Hot files (conflict prone):                                                 ║
║  ├── src/features/auth/lib/validate.ts (4 conflicts)                         ║
║  └── package.json (3 conflicts)                                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Commands Run

```bash
# List all branches with details
git branch -a --format='%(refname:short) %(upstream:short) %(committerdate:relative)'

# Find stale branches (>30 days)
git for-each-ref --sort=-committerdate --format='%(refname:short) %(committerdate:relative)' refs/heads/

# Find merged branches
git branch --merged main | grep -v main

# Check commits behind main
git rev-list --count main..branch-name

# List PRs via GitHub CLI
gh pr list --state all --json number,title,state,mergeable,statusCheckRollup

# Get PR details
gh pr view <number> --json reviews,commits,files
```

---

## Auto-Cleanup (`/branch-health --fix`)

```bash
/branch-health --fix       # Interactive cleanup
/branch-health --fix --yes # Auto-confirm (dangerous)
```

### What Gets Cleaned
```
1. Merged branches (local and remote)
2. Orphaned branches (no upstream)
3. Stale branches (>60 days, with confirmation)
```

### Cleanup Process
```
╔══════════════════════════════════════════════════════════════════════════════╗
║  BRANCH CLEANUP                                      /branch-health --fix    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  SAFE TO DELETE (auto-approved):                                             ║
║  ───────────────────────────────                                             ║
║  ✓ fix/hotfix-login (merged)                                                 ║
║  ✓ dependabot/npm_and_yarn/lodash-4.17.21 (merged)                           ║
║  ✓ dependabot/npm_and_yarn/axios-0.21.4 (merged)                             ║
║                                                                              ║
║  REQUIRES CONFIRMATION:                                                      ║
║  ─────────────────────                                                       ║
║  ? feature/old-experiment (stale 42d) - Delete? [y/N]                        ║
║  ? feature/test-branch (orphan) - Delete? [y/N]                              ║
║                                                                              ║
║  SKIPPED (has open PR):                                                      ║
║  ─────────────────────                                                       ║
║  ○ feature/AUTH-BE-005 (PR #48 open)                                         ║
║  ○ feature/PROFILES-STORY-002 (PR #47 open)                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Health Score Calculation

| Factor | Weight | Scoring |
|--------|--------|---------|
| Stale branches | 20% | -5 per stale branch |
| Failing PRs | 25% | -10 per failing PR |
| Branch drift | 20% | -5 per high-drift branch |
| PR age | 15% | -3 per stale PR |
| Naming compliance | 10% | -2 per violation |
| Orphaned branches | 10% | -3 per orphan |

### Score Ranges
| Score | Rating | Action |
|-------|--------|--------|
| 90-100 | Excellent | Maintain |
| 75-89 | Good | Minor cleanup |
| 60-74 | Fair | Attention needed |
| <60 | Poor | Immediate action |

---

## Integration

### With /preflight
```bash
# /preflight includes branch health check
/preflight
# Warns if branch is >10 commits behind main
```

### With /gate-7
```bash
# Gate 7 checks branch health before merge
/gate-7 story AUTH-BE-001
# Blocks if branch has high drift
```

### Scheduled Checks
```yaml
# .github/workflows/branch-health.yml
name: Branch Health
on:
  schedule:
    - cron: '0 9 * * 1'  # Weekly Monday 9am
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - run: gh api repos/{owner}/{repo}/branches | jq ...
```

---

## Research Validation

| Source | Type | URL |
|--------|------|-----|
| GitHub Flow | Best Practice | https://docs.github.com/en/get-started/quickstart/github-flow |
| Git Branching | Official | https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflows |
| Trunk Based Dev | Industry | https://trunkbaseddevelopment.com/ |
| GitHub CLI | Official | https://cli.github.com/manual/ |

### Best Practices Applied
- **Short-lived branches** - Merge within 1-2 days when possible
- **Regular rebasing** - Keep branches <10 commits behind main
- **Clean as you go** - Delete merged branches immediately
- **Naming conventions** - Enforce consistent branch naming
- **PR hygiene** - Close or update stale PRs weekly

---

## Related Commands

| Command | Focus |
|---------|-------|
| `/branch` | Basic branch operations |
| `/git` | Common git operations |
| `/pr` | Pull request management |
| `/ci status` | CI/CD pipeline status |

