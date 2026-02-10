# Wave V2 Commands - Complete Reference

> **Total Commands: 62** | **Version: 2.7** | **Last Updated: 2026-02-03**

---

# Quick Start

```bash
/go                    # Start your day
/story AUTH-BE-001     # Work on a story
/done                  # Complete work
/end "focus"           # End session
```

---

# TIER 1: CORE COMMANDS

## /go
**Description:** Start your development session with full system initialization
**Aliases:** `/start`, `/begin`
**What it does:**
- Runs preflight checks
- Shows system status
- Displays wave progress dashboard

**Usage:**
```bash
/go
```

---

## /story
**Description:** Load and work on a specific story with full context setup
**Aliases:** `/s`
**What it does:**
- Creates/switches to feature branch
- Runs Gate 0 pre-flight checks
- Loads story context and requirements

**Usage:**
```bash
/story AUTH-BE-001
/story UI-FE-003
/s PROJ-BE-005
```

---

## /done
**Description:** Complete current work with validation and commit
**Aliases:** `/d`, `/complete`, `/finish`
**What it does:**
- Runs story audit
- Creates standardized commit
- Performs gate check

**Usage:**
```bash
/done
/d
/complete
```

---

## /check
**Description:** Quick health check of the project
**Aliases:** `/c`, `/status`
**What it does:**
- Runs build
- Runs tests
- Shows status

**Usage:**
```bash
/check
/c
```

---

## /end
**Description:** End development session with handoff documentation
**Aliases:** `/bye`, `/eod`, `/close`
**What it does:**
- Generates handoff document
- Pushes changes to remote

**Usage:**
```bash
/end
/end "auth features"
/end "bug fixes completed"
/eod "wave 1 progress"
```

---

# INITIALIZATION & SETUP

## /wave-init
**Description:** Initialize Wave V2 framework in a project
**Options:** None

**Usage:**
```bash
/wave-init
```

**What it creates:**
- `.claude/` directory structure
- Signal files
- Hook configurations
- Command references

---

## /keys
**Description:** Validate and manage API keys and credentials
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `audit` | Compare .env.example vs actual .env |
| `validate` | Test actual API connectivity |
| `setup` | Interactive guide for missing keys |
| `--quick` | Just show set/unset status |

**Usage:**
```bash
/keys
/keys audit
/keys validate
/keys setup
/keys --quick
```

---

## /docker
**Description:** Docker container management for WAVE infrastructure
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `ready` | Check if Docker is ready |
| `status` | Show container status |
| `build` | Build containers |
| `start` | Start containers |
| `--quick` | Fast status check |

**Usage:**
```bash
/docker
/docker ready
/docker status
/docker build
/docker start
/docker start --quick
```

---

# STORY LIFECYCLE

## /story-create
**Description:** Create a new story following Schema V4.2
**Aliases:** None

**Usage:**
```bash
/story-create "AUTH feature User Registration"
/story-create "PROJ bugfix Payment Processing Error"
/story-create "UI enhancement Dashboard Charts"
```

**Format:** `"{EPIC} {TYPE} {TITLE}"`

**Types:** `feature`, `enhancement`, `bugfix`, `refactor`, `test`, `documentation`, `security`, `infrastructure`

---

## /execute-story
**Description:** Execute story through all gates (0-7)
**Aliases:** None

**Usage:**
```bash
/execute-story story AUTH-BE-001
/execute-story story UI-FE-003
```

---

## /story
**Description:** Load and work on a story
**Aliases:** `/s`

**Usage:**
```bash
/story AUTH-BE-001
/story UI-FE-003
/s PROJ-BE-005
```

---

## /story-audit
**Description:** Post-completion compliance audit
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Audit specific story |
| `wave {N}` | Audit entire wave |
| `recent` | Audit recently completed stories |
| `today` | Audit stories completed today |

**Usage:**
```bash
/story-audit story AUTH-BE-001
/story-audit wave 1
/story-audit recent
/story-audit today
```

---

## /research
**Description:** Validate research sources (PFC-K compliance)
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Validate single story research |
| `wave {N}` | Validate wave-wide research |
| `all` | Validate all project research |

**Usage:**
```bash
/research story AUTH-BE-001
/research wave 1
/research all
```

---

## /validate-research
**Description:** Schema V4.1/V4.2 research validation
**Aliases:** None

**Usage:**
```bash
/validate-research story AUTH-BE-001
```

---

# WAVE MANAGEMENT

## /launch-wave
**Description:** Launch wave with multi-agent orchestration
**Aliases:** None

**Usage:**
```bash
/launch-wave wave 1
/launch-wave wave 2
```

---

## /wave-status
**Description:** Wave progress dashboard
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `wave {N}` | Show specific wave status |
| `all` | Show all waves status |

**Usage:**
```bash
/wave-status
/wave-status wave 1
/wave-status all
```

---

## /wave-start
**Description:** Batch wave dispatch
**Aliases:** None

**Usage:**
```bash
/wave-start wave 1
/wave-start wave 2
```

---

# GATES (0-7)

## /gate-0
**Description:** Pre-flight authorization with 11 PFC checks
**Purpose:** Verify story is ready for implementation

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Check specific story |
| `wave {N}` | Check entire wave |

**Usage:**
```bash
/gate-0 story AUTH-BE-001
/gate-0 wave 1
```

**Checks performed:**
1. Story schema validation
2. Research validation
3. Dependency check
4. File ownership verification
5. Contract existence
6. Test strategy defined
7. Acceptance criteria complete
8. Safety conditions defined
9. Hazard analysis complete
10. Traceability links
11. Resource availability

---

## /gate-1
**Description:** Self-verification (ACs, contracts, paths)
**Purpose:** Agent self-checks before implementation

**Usage:**
```bash
/gate-1 story AUTH-BE-001
```

**Checks performed:**
- Acceptance criteria understood
- Contracts reviewed
- File paths identified
- Implementation approach defined

---

## /gate-2
**Description:** Build verification
**Purpose:** Ensure code compiles and passes static analysis

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Verify specific story |
| `wave {N}` | Verify entire wave |
| `all` | Verify all |

**Usage:**
```bash
/gate-2 story AUTH-BE-001
/gate-2 wave 1
/gate-2 all
```

**Checks performed:**
- TypeScript compilation
- Lint checks (ESLint)
- Security static analysis
- Build success

---

## /gate-3
**Description:** Test verification
**Purpose:** Ensure tests pass and coverage meets threshold

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Verify specific story |
| `wave {N}` | Verify entire wave |
| `all` | Verify all |

**Usage:**
```bash
/gate-3 story AUTH-BE-001
/gate-3 wave 1
/gate-3 all
```

**Checks performed:**
- Unit tests pass
- Integration tests pass
- Coverage threshold met (70%+)
- No test regressions

---

## /gate-4
**Description:** QA acceptance testing
**Purpose:** QA validates acceptance criteria

**Usage:**
```bash
/gate-4 story AUTH-BE-001
```

**Checks performed:**
- All ACs tested
- Edge cases covered
- UI/UX validation
- Design verification passed

---

## /gate-5
**Description:** PM validation
**Purpose:** Product Manager validates requirements met

**Usage:**
```bash
/gate-5 story AUTH-BE-001
```

**Checks performed:**
- Requirements fulfilled
- User story objective met
- Business value delivered
- Documentation complete

---

## /gate-6
**Description:** Architecture review
**Purpose:** CTO/Architect reviews patterns and security

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Review specific story |
| `wave {N}` | Review entire wave |

**Usage:**
```bash
/gate-6 story AUTH-BE-001
/gate-6 wave 1
```

**Checks performed:**
- Architecture patterns followed
- Security best practices
- Performance considerations
- Scalability review
- Code quality standards

---

## /gate-7
**Description:** Merge authorization
**Purpose:** Final approval before merge to main

**Usage:**
```bash
/gate-7 story AUTH-BE-001
```

**Checks performed:**
- All previous gates passed
- No conflicts with main
- CI/CD checks green
- Merge approval granted

---

## /gate-check
**Description:** Quick verify specific gate
**Aliases:** None

**Usage:**
```bash
/gate-check gate-0 story AUTH-BE-001
/gate-check gate-2 story UI-FE-003
/gate-check gate-5 story PROJ-BE-005
```

---

## /preflight
**Description:** Interactive pre-flight authorization
**Aliases:** `/pf`, `/takeoff-check`

**Usage:**
```bash
/preflight
/pf
```

---

# DEVELOPMENT WORKFLOW

## /fix
**Description:** Research-driven fix protocol
**Aliases:** `/f`, `/repair`

**Options:**
| Option | Description |
|--------|-------------|
| `build` | Fix build errors |
| `test` | Fix test failures |
| `lint` | Fix lint issues |
| `security` | Fix security issues |
| `all` | Fix all issues |
| `{file}` | Fix specific file |

**Usage:**
```bash
/fix
/fix build
/fix test
/fix lint
/fix security
/fix all
/fix src/components/Button.tsx
/f build
```

---

## /build
**Description:** Run build process
**Aliases:** None

**Usage:**
```bash
/build
```

---

## /commit
**Description:** Create standardized git commit
**Aliases:** None

**Usage:**
```bash
/commit
/commit "feat: add user registration"
/commit "fix: resolve payment processing error"
```

**Commit format:**
```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## /pr
**Description:** Create pull request
**Aliases:** None

**Usage:**
```bash
/pr
/pr "Add user authentication feature"
```

---

## /tdd
**Description:** Test-driven development cycle guidance
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | TDD for entire story |
| `story {ID}/AC{N}` | TDD for specific AC |

**Usage:**
```bash
/tdd story AUTH-BE-001
/tdd story AUTH-BE-001/AC01
/tdd story UI-FE-003/AC03
```

---

# GIT & BRANCH MANAGEMENT

## /git
**Description:** Enhanced git operations
**Aliases:** `/g`, `/repo`

**Options:**
| Option | Description |
|--------|-------------|
| `status` | Detailed status with recommendations |
| `sync` | Sync with remote (fetch + rebase) |
| `cleanup` | Clean merged branches, prune remotes |
| `stash` | Stash management |
| `undo` | Safe undo operations |
| `log` | Enhanced log views |
| `diff` | Enhanced diff views |

**Usage:**
```bash
/git status
/git sync
/git cleanup
/git stash
/git undo
/git log
/git diff
/g status
```

---

## /branch
**Description:** Branch management operations
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `create {ID}` | Create feature branch for story |
| `switch {ID}` | Switch to story branch |
| `status` | Show branch status |
| `cleanup` | Clean up merged branches |

**Usage:**
```bash
/branch create AUTH-BE-001
/branch switch AUTH-BE-001
/branch status
/branch cleanup
```

---

## /branch-health
**Description:** Branch health analysis and cleanup
**Aliases:** `/bh`, `/branch-audit`

**Options:**
| Option | Description |
|--------|-------------|
| `stale` | Find stale branches (>30 days) |
| `prs` | PR status analysis |
| `drift` | Branch drift from main |
| `metrics` | Team metrics (PR throughput) |
| `--fix` | Auto-cleanup stale branches |
| `--cleanup` | Generate cleanup recommendations |

**Usage:**
```bash
/branch-health
/branch-health stale
/branch-health prs
/branch-health drift
/branch-health metrics
/branch-health --fix
/branch-health --cleanup
/bh stale
```

---

# TEST & CI/CD

## /test
**Description:** Run tests with various scopes
**Aliases:** `/tests`, `/coverage`

**Options:**
| Option | Description |
|--------|-------------|
| `unit` | Unit tests only |
| `integration` | Integration tests only |
| `e2e` | E2E tests (Playwright) |
| `coverage` | Coverage report only |
| `watch` | Watch mode for TDD |
| `--ci` | CI mode (strict thresholds) |

**Usage:**
```bash
/test
/test unit
/test integration
/test e2e
/test coverage
/test watch
/test --ci
/test unit --ci
```

---

## /ci
**Description:** CI/CD operations
**Aliases:** `/cicd`, `/pipeline`

**Options:**
| Option | Description |
|--------|-------------|
| `check` | Verify CI config exists |
| `status` | Show GitHub Actions status |
| `validate` | Validate workflow YAML files |
| `local` | Run CI checks locally |
| `run [workflow]` | Trigger workflow manually |
| `badge` | Generate status badges |

**Usage:**
```bash
/ci
/ci check
/ci status
/ci validate
/ci local
/ci run tests
/ci run deploy
/ci badge
```

---

# VALIDATION & ANALYSIS

## /schema-validate
**Description:** Validate story against Schema V4.2
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Validate specific story |
| `wave {N}` | Validate entire wave |
| `all` | Validate all stories |

**Usage:**
```bash
/schema-validate story AUTH-BE-001
/schema-validate wave 1
/schema-validate all
```

---

## /protocol-verify
**Description:** Wave V2 protocol compliance verification
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Verify specific story |
| `wave {N}` | Verify entire wave |
| `all` | Verify all |

**Usage:**
```bash
/protocol-verify story AUTH-BE-001
/protocol-verify wave 1
/protocol-verify all
```

---

## /gap-analysis
**Description:** Identify missing requirements and implementation gaps
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Analyze specific story |
| `wave {N}` | Analyze entire wave |
| `epic {NAME}` | Analyze specific epic |
| `all` | Analyze entire project |

**Usage:**
```bash
/gap-analysis story AUTH-BE-001
/gap-analysis wave 1
/gap-analysis epic AUTH
/gap-analysis all
```

---

## /rlm-verify
**Description:** Requirements Lifecycle Management verification
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Verify specific story |
| `wave {N}` | Verify entire wave |
| `all` | Verify all |

**Usage:**
```bash
/rlm-verify story AUTH-BE-001
/rlm-verify wave 1
/rlm-verify all
```

---

## /rlm
**Description:** Token budget and learning monitor
**Aliases:** None

**Usage:**
```bash
/rlm
```

---

## /trace
**Description:** View/update traceability matrix
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Trace specific story |
| `wave {N}` | Trace entire wave |
| `all` | Trace all |

**Usage:**
```bash
/trace story AUTH-BE-001
/trace wave 1
/trace all
```

---

## /rearchitect
**Description:** Analyze and reorganize folder structure
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `analyze` | Analyze current structure |
| `plan` | Create reorganization plan |
| `execute` | Execute reorganization |
| `validate` | Validate new structure |

**Usage:**
```bash
/rearchitect analyze
/rearchitect plan
/rearchitect execute
/rearchitect validate
```

---

# QUALITY & SAFETY

## /harden
**Description:** Production hardening suite
**Aliases:** `/quality`

**Options:**
| Option | Description |
|--------|-------------|
| `quick` | Fast essential checks (~2 min) |
| `security` | Security checks only |
| `performance` | Performance checks only |
| `quality` | Code quality checks only |
| `a11y` | Accessibility checks only |
| `production` | Production readiness only |
| `--fix` | Auto-fix what's possible |
| `--ci` | CI mode with exit codes |

**Usage:**
```bash
/harden
/harden quick
/harden security
/harden performance
/harden quality
/harden a11y
/harden production
/harden --fix
/harden quick --fix
/harden --ci
```

---

## /security
**Description:** Security scanning and vulnerability detection
**Aliases:** `/sec`, `/vuln`

**Options:**
| Option | Description |
|--------|-------------|
| `deps` | Dependency vulnerabilities only |
| `secrets` | Secret detection only |
| `owasp` | OWASP pattern check only |
| `headers` | HTTP security headers only |
| `--fix` | Auto-fix security issues |

**Usage:**
```bash
/security
/security deps
/security secrets
/security owasp
/security headers
/security --fix
/security deps --fix
/sec deps
```

---

## /perf
**Description:** Performance analysis
**Aliases:** `/performance`

**Options:**
| Option | Description |
|--------|-------------|
| `bundle` | Bundle size analysis only |
| `lighthouse` | Lighthouse CI only |
| `vitals` | Core Web Vitals only |
| `images` | Image optimization check |
| `--fix` | Auto-optimize images |

**Usage:**
```bash
/perf
/perf bundle
/perf lighthouse
/perf vitals
/perf images
/perf --fix
/perf images --fix
```

---

## /a11y
**Description:** Accessibility testing (WCAG compliance)
**Aliases:** `/accessibility`, `/wcag`

**Options:**
| Option | Description |
|--------|-------------|
| `contrast` | Color contrast only |
| `keyboard` | Keyboard navigation only |
| `aria` | ARIA attributes only |
| `forms` | Form accessibility only |
| `--fix` | Auto-fix a11y issues |

**Usage:**
```bash
/a11y
/a11y contrast
/a11y keyboard
/a11y aria
/a11y forms
/a11y --fix
/a11y contrast --fix
```

---

## /qa
**Description:** QA validation checklist runner
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | QA for specific story |
| `wave {N}` | QA for entire wave |

**Usage:**
```bash
/qa story AUTH-BE-001
/qa wave 1
```

---

## /safety
**Description:** Constitutional AI safety check
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Safety check for story |
| `wave {N}` | Safety check for wave |

**Usage:**
```bash
/safety story AUTH-BE-001
/safety wave 1
```

---

## /hazard
**Description:** Analyze story hazards (DO-178C aligned)
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Analyze specific story |
| `wave {N}` | Analyze entire wave |
| `all` | Analyze all |

**Usage:**
```bash
/hazard story AUTH-BE-001
/hazard wave 1
/hazard all
```

---

## /anomaly
**Description:** Report an anomaly
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Report for specific story |
| `wave {N}` | Report for wave |

**Usage:**
```bash
/anomaly story AUTH-BE-001
/anomaly wave 1
```

---

## /rollback
**Description:** Execute rollback procedure
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Rollback specific story |
| `wave {N}` | Rollback entire wave |

**Usage:**
```bash
/rollback story AUTH-BE-001
/rollback wave 1
```

---

# DESIGN SYSTEM

## /design-system
**Description:** Design system management
**Aliases:** `/ds`, `/tokens`

**Options:**
| Option | Description |
|--------|-------------|
| `init` | Initialize design system structure |
| `detect` | Detect design systems in use |
| `validate` | Validate tokens and components |
| `sync` | Sync tokens across sources |
| `sync storybook` | Sync tokens to Storybook |
| `audit` | Full consistency audit |
| `storybook` | Generate component stories |

**Usage:**
```bash
/design-system
/design-system init
/design-system detect
/design-system validate
/design-system sync
/design-system sync storybook
/design-system audit
/design-system storybook
/ds detect
/ds audit
```

---

## /design-verify
**Description:** Visual design-to-code validation
**Aliases:** None

**Arguments:**
- `{design-source}`: Path to HTML mockup, URL, or "figma:{frame-id}"
- `{react-target}`: React component path or localhost URL

**Usage:**
```bash
/design-verify ./designs/homepage.html http://localhost:3000
/design-verify ./designs/button.html http://localhost:6006/button
/design-verify figma:1234567890 http://localhost:3000/dashboard
```

---

## /ui-trace
**Description:** UI story to component traceability
**Aliases:** `/component-trace`

**Options:**
| Option | Description |
|--------|-------------|
| `stories` | Check story → component refs |
| `components` | Check component → Storybook coverage |
| `wave {N}` | Trace only specific wave |
| `--fix` | Generate missing stories/components list |

**Usage:**
```bash
/ui-trace
/ui-trace stories
/ui-trace components
/ui-trace wave 1
/ui-trace --fix
```

---

# SESSION MANAGEMENT

## /preflight
**Description:** Pre-flight authorization (interactive)
**Aliases:** `/pf`, `/takeoff-check`

**Usage:**
```bash
/preflight
/pf
```

---

## /handoff
**Description:** Session handoff generator
**Aliases:** `/ho`, `/session-end`, `/eod`

**Usage:**
```bash
/handoff
/handoff "auth feature"
/handoff "bug fixes completed"
/ho "wave 1 progress"
```

**Output:** Creates `.claude/SESSION-HANDOFF-{DATE}-{FOCUS}.md`

---

## /status
**Description:** System health check
**Aliases:** None

**Usage:**
```bash
/status
```

---

## /report
**Description:** Progress report generation
**Aliases:** None

**Options:**
| Option | Description |
|--------|-------------|
| `story {ID}` | Report for specific story |
| `wave {N}` | Report for entire wave |
| `all` | Full project report |

**Usage:**
```bash
/report story AUTH-BE-001
/report wave 1
/report all
```

---

## /escalate
**Description:** Auto-escalation to human
**Aliases:** None

**Usage:**
```bash
/escalate "blocked by missing API key"
/escalate "security vulnerability found"
/escalate "unclear requirements"
```

---

# MULTI-AGENT

## /agent
**Description:** Multi-agent orchestration
**Aliases:** None

**Usage:**
```bash
/agent
```

---

# STRATEGIC & ADVISORY

## /cto
**Description:** CTO Advisor - Strategic analysis and recommendations
**Aliases:** `/advisor`, `/strategy`

**Options:**
| Option | Description |
|--------|-------------|
| `full` | Complete analysis (all sections) - DEFAULT |
| `quick` | Fast executive summary (~2 min) |
| `next` | Just "what should I do next?" |
| `health` | Project health metrics only |
| `debt` | Technical debt analysis only |
| `risks` | Risk assessment only |
| `roadmap` | Strategic roadmap recommendations |
| `plan` | Execution plan compliance check |
| `plan --strict` | Strict mode: fail on any deviation |

**Usage:**
```bash
/cto
/cto full
/cto quick
/cto next
/cto health
/cto debt
/cto risks
/cto roadmap
/cto plan
/cto plan --strict
/advisor quick
/strategy roadmap
```

**Output includes:**
- Project Health Score (0-100)
- Technical Debt Assessment
- Risk Analysis (Critical/High/Medium)
- Architecture Review
- Strategic Recommendations
- Execution Plan Compliance

---

## /prd
**Description:** PRD Analysis & Compliance
**Aliases:** `/requirements`, `/compliance`

**Options:**
| Option | Description |
|--------|-------------|
| `full` | Complete PRD analysis (all sections) - DEFAULT |
| `quick` | Fast compliance summary (~3 min) |
| `gaps` | Gap analysis only (PRD vs Implementation) |
| `stories` | Story coverage analysis only |
| `missing` | Identify missing stories only |
| `coverage` | Code-to-requirements traceability |
| `drift` | Detect requirement drift from PRD |
| `report` | Generate formal compliance report |

**Usage:**
```bash
/prd
/prd full
/prd quick
/prd gaps
/prd stories
/prd missing
/prd coverage
/prd drift
/prd report
/requirements gaps
/compliance report
```

**Output includes:**
- Compliance Score (0-100)
- PRD Coverage Analysis
- Story Implementation Status
- Gap Analysis (4 types)
- Missing Stories List
- Recommendations

---

# SUMMARY BY CATEGORY

| Category | Count | Commands |
|----------|-------|----------|
| Core (Tier 1) | 5 | go, story, done, check, end |
| Initialization | 3 | wave-init, keys, docker |
| Story Lifecycle | 6 | story-create, execute-story, story, story-audit, research, validate-research |
| Wave Management | 3 | launch-wave, wave-status, wave-start |
| Gates | 10 | gate-0 through gate-7, gate-check, preflight |
| Development | 5 | fix, build, commit, pr, tdd |
| Git & Branch | 3 | git, branch, branch-health |
| Test & CI/CD | 2 | test, ci |
| Validation | 7 | schema-validate, protocol-verify, gap-analysis, rlm-verify, rlm, trace, rearchitect |
| Quality & Safety | 9 | harden, security, perf, a11y, qa, safety, hazard, anomaly, rollback |
| Design System | 3 | design-system, design-verify, ui-trace |
| Session | 5 | preflight, handoff, status, report, escalate |
| Multi-Agent | 1 | agent |
| Strategic & Advisory | 2 | cto, prd |
| **TOTAL** | **62** | |

---

# VERSION HISTORY

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

---

# RECOMMENDED MODEL BY COMMAND TYPE

| Command Type | Recommended Model | Reason |
|--------------|-------------------|--------|
| `/cto`, `/prd` | Opus 4.5 | Deep strategic analysis |
| `/qa`, `/safety`, `/hazard` | Sonnet 4.5 | Balanced analysis |
| `/fix`, `/build`, `/test` | Sonnet 3.5 | Fast execution |
| `/preflight`, `/status` | Haiku | Quick checks |

---

# TERMINAL SETUP COMMANDS

## CTO Terminal (Opus 4.5)
```bash
cd /path/to/project && source .env && claude --dangerously-skip-permissions --model claude-opus-4-5-20251101
```

## QA Terminal (Haiku)
```bash
cd /path/to/project && source .env && claude --dangerously-skip-permissions --model claude-3-5-haiku-latest
```

## Senior Dev Terminal (Sonnet)
```bash
cd /path/to/project && source .env && claude --dangerously-skip-permissions --model claude-3-5-sonnet-20241022
```

---

*Generated by Wave V2 Framework | Version 2.7 | 2026-02-03*
