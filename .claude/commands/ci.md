# /ci - CI/CD Pipeline Validation

**Tier:** 2 (Workflow Command)
**Priority:** P1 (HIGH)
**Recommended Model:** Sonnet
**Aliases:** /cicd, /pipeline, /actions, /workflow

## Purpose

Validate CI/CD configuration, check pipeline status, and simulate CI runs locally. Supports GitHub Actions, Vercel, and custom pipelines.

## Usage

```bash
/ci                        # Full CI pipeline simulation
/ci check                  # Verify CI config exists and is valid
/ci status                 # Show GitHub Actions status
/ci validate               # Validate workflow YAML files
/ci run [workflow]         # Trigger workflow manually
/ci logs [run-id]          # View workflow run logs
/ci badge                  # Generate status badges
/ci local                  # Run CI checks locally
```

---

## What It Checks

### Configuration Validation
| Check | Tool | Pass Criteria |
|-------|------|---------------|
| Workflow YAML syntax | `actionlint` | Valid YAML |
| Action versions | Custom | No deprecated actions |
| Secret references | Custom | All secrets defined |
| Environment variables | Custom | Required vars present |
| Branch protection | GitHub API | Rules configured |
| Required checks | GitHub API | All defined |

### Pipeline Status
| Check | Source | Display |
|-------|--------|---------|
| Last run status | GitHub API | Pass/Fail/Running |
| Run duration | GitHub API | Avg time |
| Failure rate | GitHub API | Last 10 runs |
| Coverage trend | Codecov/Custom | Trend graph |
| Deploy status | Vercel API | Production status |

---

## Output

### `/ci` - Full Pipeline Simulation

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CI/CD PIPELINE VALIDATION                                            /ci    ║
║  Project: AirView | Branch: feature/AUTH-BE-005                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  SIMULATING CI PIPELINE                                                      ║
║  ──────────────────────                                                      ║
║                                                                              ║
║  Step 1: Install Dependencies                                                ║
║  ├── pnpm install --frozen-lockfile                                          ║
║  └── ✓ Completed (23.4s)                                                     ║
║                                                                              ║
║  Step 2: Type Check                                                          ║
║  ├── pnpm tsc --noEmit                                                       ║
║  └── ✓ Completed (8.2s) - 0 errors                                           ║
║                                                                              ║
║  Step 3: Lint                                                                ║
║  ├── pnpm lint                                                               ║
║  └── ✓ Completed (12.1s) - 0 errors, 0 warnings                              ║
║                                                                              ║
║  Step 4: Unit Tests                                                          ║
║  ├── pnpm test:unit --coverage                                               ║
║  └── ✓ Completed (45.3s) - 245 passed, 84.2% coverage                        ║
║                                                                              ║
║  Step 5: Integration Tests                                                   ║
║  ├── pnpm test:integration                                                   ║
║  └── ✓ Completed (34.2s) - 48 passed                                         ║
║                                                                              ║
║  Step 6: Build                                                               ║
║  ├── pnpm build                                                              ║
║  └── ✓ Completed (67.8s) - Bundle: 287KB                                     ║
║                                                                              ║
║  Step 7: Security Scan                                                       ║
║  ├── pnpm audit --audit-level=high                                           ║
║  └── ✓ Completed (5.4s) - 0 critical, 0 high                                 ║
║                                                                              ║
║  PIPELINE SUMMARY                                                            ║
║  ────────────────                                                            ║
║                                                                              ║
║  ┌────────────────────┬──────────┬──────────┬───────────────────────────────┐║
║  │ Step               │ Status   │ Duration │ Details                       │║
║  ├────────────────────┼──────────┼──────────┼───────────────────────────────┤║
║  │ Install            │ ✓ Pass   │ 23.4s    │ 1,234 packages                │║
║  │ Type Check         │ ✓ Pass   │ 8.2s     │ 0 errors                      │║
║  │ Lint               │ ✓ Pass   │ 12.1s    │ 0 issues                      │║
║  │ Unit Tests         │ ✓ Pass   │ 45.3s    │ 245/245 passed                │║
║  │ Integration Tests  │ ✓ Pass   │ 34.2s    │ 48/48 passed                  │║
║  │ Build              │ ✓ Pass   │ 67.8s    │ 287KB bundle                  │║
║  │ Security           │ ✓ Pass   │ 5.4s     │ No vulnerabilities            │║
║  └────────────────────┴──────────┴──────────┴───────────────────────────────┘║
║                                                                              ║
║  Total Duration: 3m 16s                                                      ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: ✓ CI PIPELINE WOULD PASS                                            ║
║  Ready to push to remote                                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### `/ci status` - GitHub Actions Status

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GITHUB ACTIONS STATUS                                         /ci status    ║
║  Repository: Boomerang-Apps/airview                                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  WORKFLOWS                                                                   ║
║  ─────────                                                                   ║
║                                                                              ║
║  ┌─────────────────────┬──────────┬─────────────┬──────────────────────────┐ ║
║  │ Workflow            │ Status   │ Last Run    │ Duration                 │ ║
║  ├─────────────────────┼──────────┼─────────────┼──────────────────────────┤ ║
║  │ CI                  │ ✓ Pass   │ 2h ago      │ 4m 12s                   │ ║
║  │ Deploy Preview      │ ✓ Pass   │ 2h ago      │ 2m 34s                   │ ║
║  │ Deploy Production   │ ✓ Pass   │ 3d ago      │ 3m 45s                   │ ║
║  │ Security Scan       │ ✓ Pass   │ 1d ago      │ 1m 22s                   │ ║
║  │ Dependency Review   │ ✓ Pass   │ 2h ago      │ 45s                      │ ║
║  └─────────────────────┴──────────┴─────────────┴──────────────────────────┘ ║
║                                                                              ║
║  RECENT RUNS (CI Workflow)                                                   ║
║  ─────────────────────────                                                   ║
║                                                                              ║
║  #234  ✓ Pass   feature/AUTH-BE-005   "feat: Add login validation"    2h ago ║
║  #233  ✓ Pass   main                  "Merge PR #45"                  5h ago ║
║  #232  ✗ Fail   feature/AUTH-BE-004   "wip: password reset"          8h ago ║
║        └── Failed: Unit tests (2 failures)                                   ║
║  #231  ✓ Pass   main                  "Merge PR #44"                  1d ago ║
║  #230  ✓ Pass   feature/AUTH-BE-003   "feat: email verification"     1d ago ║
║                                                                              ║
║  SUCCESS RATE (Last 10 runs)                                                 ║
║  ──────────────────────────                                                  ║
║  ████████░░  80% (8/10 passed)                                               ║
║                                                                              ║
║  AVERAGE DURATION                                                            ║
║  ────────────────                                                            ║
║  CI:         4m 15s                                                          ║
║  Deploy:     3m 02s                                                          ║
║                                                                              ║
║  BRANCH PROTECTION                                                           ║
║  ─────────────────                                                           ║
║  ✓ Required status checks: CI, Security Scan                                 ║
║  ✓ Require PR reviews: 1 approval                                            ║
║  ✓ Dismiss stale reviews: enabled                                            ║
║  ✓ Require linear history: enabled                                           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### `/ci check` - Configuration Validation

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  CI CONFIGURATION CHECK                                        /ci check     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  WORKFLOW FILES                                                              ║
║  ──────────────                                                              ║
║                                                                              ║
║  ✓ .github/workflows/ci.yml                                                  ║
║    ├── Syntax: valid                                                         ║
║    ├── Triggers: push, pull_request                                          ║
║    ├── Jobs: lint, test, build, security                                     ║
║    └── Actions: all up-to-date                                               ║
║                                                                              ║
║  ✓ .github/workflows/deploy.yml                                              ║
║    ├── Syntax: valid                                                         ║
║    ├── Triggers: push to main                                                ║
║    ├── Jobs: deploy-preview, deploy-production                               ║
║    └── Actions: all up-to-date                                               ║
║                                                                              ║
║  ⚠ .github/workflows/security.yml                                            ║
║    ├── Syntax: valid                                                         ║
║    ├── Triggers: schedule (weekly)                                           ║
║    └── Warning: actions/checkout@v3 → upgrade to v4                          ║
║                                                                              ║
║  SECRETS CHECK                                                               ║
║  ─────────────                                                               ║
║                                                                              ║
║  ┌────────────────────────────┬──────────┬───────────────────────────────┐   ║
║  │ Secret                     │ Status   │ Used In                       │   ║
║  ├────────────────────────────┼──────────┼───────────────────────────────┤   ║
║  │ VERCEL_TOKEN               │ ✓ Set    │ deploy.yml                    │   ║
║  │ VERCEL_ORG_ID              │ ✓ Set    │ deploy.yml                    │   ║
║  │ VERCEL_PROJECT_ID          │ ✓ Set    │ deploy.yml                    │   ║
║  │ SUPABASE_URL               │ ✓ Set    │ ci.yml                        │   ║
║  │ SUPABASE_ANON_KEY          │ ✓ Set    │ ci.yml                        │   ║
║  │ CODECOV_TOKEN              │ ✗ Missing│ ci.yml (optional)             │   ║
║  └────────────────────────────┴──────────┴───────────────────────────────┘   ║
║                                                                              ║
║  ENVIRONMENT VARIABLES                                                       ║
║  ─────────────────────                                                       ║
║                                                                              ║
║  ✓ NODE_VERSION: 20 (defined in ci.yml)                                      ║
║  ✓ PNPM_VERSION: 8 (defined in ci.yml)                                       ║
║                                                                              ║
║  ACTIONLINT RESULTS                                                          ║
║  ─────────────────                                                           ║
║                                                                              ║
║  ⚠ 1 warning found:                                                          ║
║    .github/workflows/security.yml:15: outdated action version                ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: ⚠ PASS WITH WARNINGS                                                ║
║                                                                              ║
║  RECOMMENDED:                                                                ║
║  1. Upgrade actions/checkout@v3 to v4 in security.yml                        ║
║  2. Add CODECOV_TOKEN for coverage reporting                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Commands Run

```bash
# Validate workflow syntax
npx actionlint

# Check GitHub Actions status
gh run list --limit 10

# View specific run
gh run view <run-id>

# Trigger workflow
gh workflow run ci.yml

# View run logs
gh run view <run-id> --log

# Local CI simulation
pnpm install --frozen-lockfile && \
pnpm tsc --noEmit && \
pnpm lint && \
pnpm test:unit --coverage && \
pnpm test:integration && \
pnpm build && \
pnpm audit --audit-level=high
```

---

## CI Pipeline Steps

### Standard CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit --coverage
      - run: pnpm test:integration
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm audit --audit-level=high
```

---

## Local CI (`/ci local`)

Run the full CI pipeline locally before pushing:

```bash
/ci local
# Runs all CI steps in sequence
# Uses same commands as GitHub Actions
# Faster feedback loop
```

---

## Trigger Workflow (`/ci run`)

```bash
# Trigger default CI workflow
/ci run

# Trigger specific workflow
/ci run deploy

# Trigger with inputs
/ci run deploy --ref main
```

---

## Status Badges (`/ci badge`)

Generate status badges for README:

```markdown
<!-- Generated by /ci badge -->
![CI](https://github.com/Boomerang-Apps/airview/actions/workflows/ci.yml/badge.svg)
![Coverage](https://codecov.io/gh/Boomerang-Apps/airview/branch/main/graph/badge.svg)
![Deploy](https://img.shields.io/github/deployments/Boomerang-Apps/airview/production)
```

---

## Integration

### With /harden
```bash
# /harden --ci uses CI thresholds
/harden --ci
```

### With /gate-2
```bash
# Gate 2 includes CI validation
/gate-2 story AUTH-BE-001
```

### With /gate-7
```bash
# Gate 7 checks CI status before merge
/gate-7 story AUTH-BE-001
```

---

## Vercel Integration

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  VERCEL DEPLOYMENT STATUS                                                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  PRODUCTION                                                                  ║
║  ──────────                                                                  ║
║  URL:     https://airview.vercel.app                                         ║
║  Status:  ✓ Ready                                                            ║
║  Commit:  abc123 "Merge PR #45"                                              ║
║  Deploy:  3 days ago                                                         ║
║                                                                              ║
║  PREVIEW (feature/AUTH-BE-005)                                               ║
║  ──────────────────────────────                                              ║
║  URL:     https://airview-auth-be-005.vercel.app                             ║
║  Status:  ✓ Ready                                                            ║
║  Commit:  def456 "feat: Add login validation"                                ║
║  Deploy:  2 hours ago                                                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Research Validation

| Source | Type | URL |
|--------|------|-----|
| GitHub Actions Docs | Official | https://docs.github.com/en/actions |
| actionlint | Tool | https://github.com/rhysd/actionlint |
| Vercel CI/CD | Official | https://vercel.com/docs/concepts/deployments |
| GitHub CLI | Official | https://cli.github.com/manual/gh_run |

### CI/CD Best Practices Applied
- **Fail fast** - Lint and type check before tests
- **Parallel jobs** - Independent steps run concurrently
- **Caching** - pnpm cache for faster installs
- **Frozen lockfile** - Reproducible builds
- **Security scanning** - Part of every pipeline
- **Branch protection** - Required checks before merge

---

## Related Commands

| Command | Focus |
|---------|-------|
| `/test` | Test execution and coverage |
| `/build` | Build validation |
| `/harden --ci` | CI-mode hardening |
| `/gate-2` | Build verification gate |

