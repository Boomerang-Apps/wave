# Wave V2 Commands Reference

> **Total Commands: 62** | **Last Updated: 2026-02-03**

---

## Quick Start

```bash
/go                    # Start your day
/story AUTH-BE-001     # Work on a story
/done                  # Complete work
/end "focus"           # End session
```

---

## TIER 1: CORE COMMANDS

| Command | Purpose | Aliases |
|---------|---------|---------|
| `/go` | Start session (preflight + status + wave-status) | `/start`, `/begin` |
| `/story <id>` | Work on story (branch + gate-0 + context) | `/s` |
| `/done` | Complete work (story-audit + commit + gate-check) | `/d`, `/complete`, `/finish` |
| `/check` | Quick health check (build + test + status) | `/c`, `/status` |
| `/end [focus]` | End session (handoff + push) | `/bye`, `/eod`, `/close` |

---

## TIER 2: WORKFLOW COMMANDS

| Command | Purpose | Aliases |
|---------|---------|---------|
| `/cto [mode]` | CTO Advisor: `full`, `quick`, `next`, `health`, `debt`, `risks`, `roadmap`, `plan` | `/advisor`, `/strategy`, `/recommend` |
| `/prd [mode]` | PRD Analysis: `full`, `quick`, `gaps`, `stories`, `missing`, `coverage`, `drift`, `report` | `/prd-check`, `/requirements`, `/compliance` |
| `/fix [target]` | Fix issues: build, test, lint, security, all | `/f`, `/repair` |
| `/test [scope]` | Run tests with coverage | `/tests`, `/coverage`, `/vitest` |
| `/ci [action]` | CI/CD pipeline validation | `/cicd`, `/pipeline`, `/actions` |
| `/git [action]` | Git operations suite | `/g`, `/repo` |
| `/branch [op]` | Branch operations | - |
| `/branch-health` | Branch health analysis | `/bh`, `/branch-audit`, `/repo-health` |
| `/harden [scope]` | Production hardening | `/quality`, `/production-check` |
| `/security [scope]` | Security scan | `/sec`, `/audit-security`, `/vuln` |
| `/perf [scope]` | Performance analysis | `/performance`, `/lighthouse` |
| `/a11y [scope]` | Accessibility audit | `/accessibility`, `/wcag` |
| `/keys [service]` | Validate API keys/credentials | - |
| `/docker [action]` | Docker management | - |
| `/build` | Run build | - |
| `/commit [msg]` | Commit changes | - |
| `/pr [title]` | Create pull request | - |

---

## TIER 3: ALL COMMANDS

### Initialization & Setup

| Command | Purpose | Args |
|---------|---------|------|
| `/wave-init` | Initialize Wave V2 framework | none |
| `/keys` | Validate API keys/credentials | `audit`, `validate`, `setup`, `--quick` |
| `/docker` | Docker container management | `ready`, `status`, `build`, `start` |

### Story Lifecycle

| Command | Purpose | Args |
|---------|---------|------|
| `/story-create` | Create new story (Schema V4.1) | `"{EPIC} {TYPE} {TITLE}"` |
| `/execute-story` | Execute story through all gates | `story {ID}` |
| `/story` | Load and work on story | `{ID}` |
| `/story-audit` | Post-completion compliance | `wave {N}`, `{ID}`, `recent`, `today` |
| `/research` | Validate research sources (PFC-K) | `story {ID}`, `wave {N}`, `all` |
| `/validate-research` | Schema V4.1 research validation | `story {ID}` |

### Wave Management

| Command | Purpose | Args |
|---------|---------|------|
| `/launch-wave` | Launch wave with multi-agent | `wave {N}` |
| `/wave-status` | Wave progress dashboard | `wave {N}`, `all` |
| `/wave-start` | Batch wave dispatch | `wave {N}` |

### Gates (0-7)

| Command | Purpose | Args |
|---------|---------|------|
| `/gate-0` | Pre-flight authorization (11 PFC checks) | `story {ID}`, `wave {N}` |
| `/gate-1` | Self-verification (ACs, contracts, paths) | `story {ID}` |
| `/gate-2` | Build verification (compile, lint, security) | `story {ID}`, `wave {N}`, `all` |
| `/gate-3` | Test verification (unit, coverage, integ) | `story {ID}`, `wave {N}`, `all` |
| `/gate-4` | QA acceptance testing | `story {ID}` |
| `/gate-5` | PM validation (requirements met) | `story {ID}` |
| `/gate-6` | Architecture review (patterns, security) | `story {ID}`, `wave {N}` |
| `/gate-7` | Merge authorization | `story {ID}` |
| `/gate-check` | Quick verify specific gate | `{gate} story {ID}` |

### Development Workflow

| Command | Purpose | Aliases |
|---------|---------|---------|
| `/fix` | Research-driven fix protocol | `/f`, `/repair` |
| `/build` | Run and validate build | - |
| `/commit` | Commit with conventional format | - |
| `/pr` | Create pull request | - |
| `/tdd` | TDD cycle (RED-GREEN-REFACTOR) | - |

### Git & Branch Management

| Command | Purpose | Aliases |
|---------|---------|---------|
| `/git` | Git operations (status, sync, cleanup, stash, undo) | `/g`, `/repo` |
| `/branch` | Branch operations (create, switch, cleanup) | - |
| `/branch-health` | Branch health (stale, PRs, drift, metrics) | `/bh`, `/branch-audit` |

### Test & CI/CD

| Command | Purpose | Aliases |
|---------|---------|---------|
| `/test` | Test execution with coverage | `/tests`, `/coverage`, `/vitest` |
| `/ci` | CI/CD pipeline validation | `/cicd`, `/pipeline`, `/actions` |

### Validation & Analysis

| Command | Purpose | Args |
|---------|---------|------|
| `/schema-validate` | Validate story JSON (Schema V4.1) | `story {ID}`, `wave {N}`, `all` |
| `/protocol-verify` | Wave V2 protocol compliance | `story {ID}`, `wave {N}`, `all` |
| `/gap-analysis` | Identify missing requirements | `story {ID}`, `wave {N}`, `epic {NAME}` |
| `/rlm-verify` | Requirements lifecycle traceability | `story {ID}`, `wave {N}`, `all` |
| `/rlm` | Token budget & learning monitor | - |
| `/trace` | Build traceability matrix (L0→L5) | `story {ID}`, `wave {N}`, `all` |
| `/rearchitect` | Analyze & reorganize folders | `analyze`, `plan`, `execute`, `validate` |

### Quality & Safety

| Command | Purpose | Aliases |
|---------|---------|---------|
| `/harden` | Production hardening & quality gate | `/quality`, `/production-check` |
| `/security` | Security scan (OWASP, vulns, secrets) | `/sec`, `/audit-security`, `/vuln` |
| `/perf` | Performance (Core Web Vitals, Lighthouse) | `/performance`, `/lighthouse` |
| `/a11y` | Accessibility (WCAG 2.1 AA) | `/accessibility`, `/wcag` |
| `/qa` | QA validation checklist | - |
| `/safety` | Constitutional AI check | - |
| `/hazard` | Hazard analysis (DO-178C) | - |
| `/anomaly` | Report defect or issue | - |
| `/rollback` | Execute rollback procedure | - |

### Design System

| Command | Purpose | Args |
|---------|---------|------|
| `/design-system` | Design system management | `init`, `validate`, `sync`, `detect`, `audit`, `storybook` |
| `/design-verify` | Visual design-to-code validation | `{design-source} {react-target}` |
| `/ui-trace` | Story ↔ Component traceability | `stories`, `components`, `wave {N}` |

### Session Management

| Command | Purpose | Aliases |
|---------|---------|---------|
| `/preflight` | GO/NO-GO pre-flight authorization | `/pf`, `/takeoff-check` |
| `/handoff` | Generate session handoff document | `/ho`, `/session-end`, `/eod` |
| `/status` | System health check | - |
| `/report` | Progress report generation | - |
| `/escalate` | Auto-escalation to human | - |

### Multi-Agent

| Command | Purpose | Args |
|---------|---------|------|
| `/agent` | Multi-agent orchestration | - |

### Strategic & Advisory

| Command | Purpose | Aliases |
|---------|---------|---------|
| `/cto` | CTO Advisor: strategic analysis & recommendations | `/advisor`, `/strategy`, `/recommend` |
| `/prd` | PRD Analysis: codebase vs PRD vs stories compliance | `/prd-check`, `/requirements`, `/compliance` |

**`/cto` Options:**
| Mode | Description |
|------|-------------|
| `full` | Complete analysis (all sections) - DEFAULT |
| `quick` | Fast executive summary (~2 min) |
| `next` | Just "what should I do next?" |
| `health` | Project health metrics only |
| `debt` | Technical debt analysis only |
| `risks` | Risk assessment only |
| `roadmap` | Strategic roadmap recommendations |
| `plan` | Execution plan compliance check |
| `plan --strict` | Strict mode: fail on any deviation |

**`/prd` Options:**
| Mode | Description |
|------|-------------|
| `full` | Complete PRD analysis (all sections) - DEFAULT |
| `quick` | Fast compliance summary (~3 min) |
| `gaps` | Gap analysis only (PRD vs Implementation) |
| `stories` | Story coverage analysis only |
| `missing` | Identify missing stories only |
| `coverage` | Code-to-requirements traceability |
| `drift` | Detect requirement drift from PRD |
| `report` | Generate formal compliance report |

---

## Command Arguments Reference

### Scope Arguments (Most Commands)

| Scope | Example | Description |
|-------|---------|-------------|
| `story {ID}` | `story AUTH-BE-001` | Single story |
| `wave {N}` | `wave 1` | Entire wave |
| `all` | `all` | Full project |

### Git Arguments (`/git`)

| Arg | Description |
|-----|-------------|
| `status` | Detailed status with recommendations |
| `sync` | Sync with remote (fetch + rebase) |
| `cleanup` | Clean merged branches, prune remotes |
| `stash` | Stash management |
| `undo` | Safe undo operations |
| `log` | Enhanced log views |
| `diff` | Enhanced diff views |

### Branch Health Arguments (`/branch-health`)

| Arg | Description |
|-----|-------------|
| `stale` | Find stale branches (>30 days) |
| `prs` | PR status analysis |
| `drift` | Branch drift from main |
| `metrics` | Team metrics (PR throughput) |
| `--fix` | Auto-cleanup stale branches |
| `--cleanup` | Generate cleanup recommendations |

### Test Arguments (`/test`)

| Arg | Description |
|-----|-------------|
| `unit` | Unit tests only |
| `integration` | Integration tests only |
| `e2e` | E2E tests (Playwright) |
| `coverage` | Coverage report only |
| `watch` | Watch mode for TDD |
| `--ci` | CI mode (strict thresholds) |

### CI Arguments (`/ci`)

| Arg | Description |
|-----|-------------|
| `check` | Verify CI config exists |
| `status` | Show GitHub Actions status |
| `validate` | Validate workflow YAML files |
| `local` | Run CI checks locally |
| `run [workflow]` | Trigger workflow manually |
| `badge` | Generate status badges |

### Harden Arguments (`/harden`)

| Arg | Description |
|-----|-------------|
| `quick` | Fast essential checks (~2 min) |
| `security` | Security checks only |
| `performance` | Performance checks only |
| `quality` | Code quality checks only |
| `a11y` | Accessibility checks only |
| `production` | Production readiness only |
| `--fix` | Auto-fix what's possible |
| `--ci` | CI mode with exit codes |

### Security Arguments (`/security`)

| Arg | Description |
|-----|-------------|
| `deps` | Dependency vulnerabilities only |
| `secrets` | Secret detection only |
| `owasp` | OWASP pattern check only |
| `headers` | HTTP security headers only |
| `--fix` | Auto-fix security issues |

### Performance Arguments (`/perf`)

| Arg | Description |
|-----|-------------|
| `bundle` | Bundle size analysis only |
| `lighthouse` | Lighthouse CI only |
| `vitals` | Core Web Vitals only |
| `images` | Image optimization check |
| `--fix` | Auto-optimize images |

### Accessibility Arguments (`/a11y`)

| Arg | Description |
|-----|-------------|
| `contrast` | Color contrast only |
| `keyboard` | Keyboard navigation only |
| `aria` | ARIA attributes only |
| `forms` | Form accessibility only |
| `--fix` | Auto-fix a11y issues |

### Keys Arguments (`/keys`)

| Arg | Description |
|-----|-------------|
| `audit` | Compare .env.example vs actual |
| `validate` | Test actual API connectivity |
| `setup` | Interactive guide for missing keys |
| `--quick` | Just show set/unset status |

### CTO Arguments (`/cto`)

| Arg | Description |
|-----|-------------|
| `full` | Complete analysis (all sections) - DEFAULT |
| `quick` | Fast executive summary (~2 min) |
| `health` | Project health metrics only |
| `debt` | Technical debt analysis only |
| `risks` | Risk assessment only |
| `roadmap` | Strategic roadmap recommendations |
| `next` | Just "what should I do next?" |
| `plan` | Execution plan compliance check |
| `plan --strict` | Strict mode: fail on any deviation |

---

## Typical Workflows

### Daily Workflow
```bash
/go                          # Start session
/story AUTH-BE-001           # Load story
# ... work ...
/done                        # Complete work
/story AUTH-BE-002           # Next story
# ... work ...
/done                        # Complete work
/end "auth features"         # End session
```

### Before PR
```bash
/test --ci                   # Run tests with coverage
/harden quick                # Quick hardening check
/ci local                    # Simulate CI pipeline
/branch-health               # Check branch status
```

### Weekly Maintenance
```bash
/branch-health --fix         # Cleanup stale branches
/security                    # Full security scan
/git cleanup                 # Clean repository
```

### Production Release
```bash
/harden                      # Full hardening suite
/gate-7 story AUTH-BE-001    # Merge authorization
/ci status                   # Verify all checks pass
```

---

## Summary

| Category | Count |
|----------|-------|
| Core (Tier 1) | 5 |
| Initialization | 3 |
| Story Lifecycle | 6 |
| Wave Management | 3 |
| Gates | 10 |
| Development | 5 |
| Git & Branch | 3 |
| Test & CI/CD | 2 |
| Validation | 7 |
| Quality & Safety | 9 |
| Design System | 3 |
| Session | 5 |
| Multi-Agent | 1 |
| Strategic & Advisory | 2 |
| **TOTAL** | **62** |

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-03 | v2.7 | Added `/prd` PRD Analysis & Compliance command |
| 2026-02-03 | v2.6 | Added `/cto` CTO Advisor for strategic analysis |
| 2026-02-01 | v2.5 | Added `/git`, `/branch-health`, `/test`, `/ci` |
| 2026-02-01 | v2.4 | Added `/harden`, `/security`, `/perf`, `/a11y` |
| 2026-01-31 | v2.3 | Added `/keys`, `/docker`, `/ui-trace` |
| 2026-01-30 | v2.2 | Added `/design-system` enhancements |
| 2026-01-29 | v2.1 | Added `/fix`, `/handoff`, `/preflight` |
| 2026-01-28 | v2.0 | Initial Wave V2 command suite |

