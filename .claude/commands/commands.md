# Commands Index: Wave V2 Protocol Shortcuts

List and describe all available Wave V2 commands.

## Arguments
- `$ARGUMENTS` - Optional: command name for detailed help

---

## ⭐ IMPORTANT COMMANDS (Quick Workflow Reference)

**Essential commands organized by workflow stage - Read this first!**

```bash
# View the complete workflow guide
cat .claude/commands/IMPORTANT-COMMANDS.md

# Or view the 30-second quick start
cat .claude/commands/QUICK-START.md
```

### The 3 Essential Workflows

**🚀 BEFORE Starting:**
```bash
/wave-status → /status → /gate-0 → /branch create
```

**💻 DURING Development:**
```bash
/tdd → /test unit → /commit → /gates 1-3
```

**✅ AFTER Finishing:**
```bash
/test → /gates 4-7 → /pr create → /done
```

**🚨 EMERGENCY:**
```bash
/emergency-stop | /escalate | /rollback
```

📖 **Full Guide:** See [IMPORTANT-COMMANDS.md](./IMPORTANT-COMMANDS.md) for detailed workflows, CTO recommendations, and golden rules.

---

## TIER 1: CORE COMMANDS (Memorize These)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  DAILY DRIVERS - 5 Commands That Do Everything                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  /go                      Start session                                      ║
║                           → preflight + status + wave-status                 ║
║                           Aliases: /start, /begin                            ║
║                                                                              ║
║  /story <id>              Work on story                                      ║
║                           → branch + gate-0 + context                        ║
║                           Aliases: /s                                        ║
║                                                                              ║
║  /done                    Complete current work                              ║
║                           → story-audit + commit + gate-check                ║
║                           Aliases: /d, /complete, /finish                    ║
║                                                                              ║
║  /check [target]          Quick health check                                 ║
║                           → build + test + status                            ║
║                           Aliases: /c, /status                               ║
║                                                                              ║
║  /end [focus]             End session                                        ║
║                           → handoff + push                                   ║
║                           Aliases: /bye, /eod, /close                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Typical Day Flow

```bash
/go                          # Start session, get GO status
/story AUTH-BE-001           # Load and work on story
# ... do work ...
/done                        # Validate and commit
/story AUTH-BE-002           # Next story
# ... do work ...
/done                        # Validate and commit
/end "auth features"         # End session with handoff
```

---

## TIER 2: WORKFLOW COMMANDS (Know These Exist)

### Quick Reference
```bash
/cto [mode]        # CTO Advisor: full|quick|next|health|debt|risks|roadmap|plan
/prd [mode]        # PRD Analysis: full|quick|gaps|stories|missing|coverage|drift|report
/fix [target]      # Fix issues: build, test, lint, security, all
/gate <N> [scope]  # Run gate 0-7
/wave [N] [action] # Wave operations
/audit [scope]     # Audit completed work
/validate [scope]  # Validate schemas
/keys [service]    # Validate API keys/credentials
/docker ready      # Docker readiness with dependencies
/test [scope]      # Run tests
/build             # Run build
/commit [msg]      # Commit changes
/pr [title]        # Create pull request
/branch [op]       # Branch operations
```

---

## TIER 3: ALL COMMANDS (Full Reference)

### Scope Argument Convention

Most commands accept a scope argument:
```
story {ID}    # Single story (e.g., "story AUTH-BE-001")
wave {N}      # Entire wave (e.g., "wave 1")
all           # Full project analysis
```

### Command Categories

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  WAVE V2 COMMAND INDEX                                                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  INITIALIZATION & SETUP                                                      ║
║  ──────────────────────                                                      ║
║  /wave-init                    Initialize Wave V2 framework for project      ║
║                                Args: none                                    ║
║                                                                              ║
║  STORY LIFECYCLE                                                             ║
║  ───────────────                                                             ║
║  /story-create                 Create new story with Schema V4.1             ║
║                                Args: "{EPIC} {TYPE} {TITLE}"                 ║
║                                                                              ║
║  /execute-story                Execute story through all gates (0-7)         ║
║                                Args: "story {ID}"                            ║
║                                                                              ║
║  /research                     Validate research sources (PFC-K)             ║
║                                Args: "story {ID}" | "wave {N}" | "all"       ║
║                                                                              ║
║  WAVE MANAGEMENT                                                             ║
║  ───────────────                                                             ║
║  /launch-wave                  Launch wave with multi-agent orchestration    ║
║                                Args: "wave {N}"                              ║
║                                                                              ║
║  /wave-status                  Show wave progress and status dashboard       ║
║                                Args: "wave {N}" | "all"                      ║
║                                                                              ║
║  GATES (0-7)                                                                 ║
║  ───────────                                                                 ║
║  /gate-0                       Pre-flight authorization (11 PFC checks)      ║
║                                Args: "story {ID}" | "wave {N}"               ║
║                                                                              ║
║  /gate-1                       Self-verification (ACs, contracts, paths)     ║
║                                Args: "story {ID}"                            ║
║                                                                              ║
║  /gate-2                       Build verification (compile, lint, security)  ║
║                                Args: "story {ID}" | "wave {N}" | "all"       ║
║                                                                              ║
║  /gate-3                       Test verification (unit, coverage, integ)     ║
║                                Args: "story {ID}" | "wave {N}" | "all"       ║
║                                                                              ║
║  /gate-4                       QA acceptance testing                         ║
║                                Args: "story {ID}"                            ║
║                                                                              ║
║  /gate-5                       PM validation (requirements met)              ║
║                                Args: "story {ID}"                            ║
║                                                                              ║
║  /gate-6                       Architecture review (patterns, security)      ║
║                                Args: "story {ID}" | "wave {N}"               ║
║                                                                              ║
║  /gate-7                       Merge authorization                           ║
║                                Args: "story {ID}"                            ║
║                                                                              ║
║  /gate-check                   Quick verify specific gate status             ║
║                                Args: "{gate} story {ID}"                     ║
║                                                                              ║
║  DEVELOPMENT WORKFLOW                                                        ║
║  ────────────────────                                                        ║
║  /fix                          Research-driven fix protocol                  ║
║                                Args: "build" | "lint" | "test" |             ║
║                                      "security" | "{file}" | "all"           ║
║                                Aliases: /f, /repair                          ║
║                                                                              ║
║  /test                         Test execution & coverage                     ║
║                                Args: "unit" | "integration" | "e2e" |        ║
║                                      "coverage" | "watch" | "--ci"           ║
║                                Aliases: /tests, /coverage, /vitest           ║
║                                                                              ║
║  /ci                           CI/CD pipeline validation                     ║
║                                Args: "check" | "status" | "validate" |       ║
║                                      "run [workflow]" | "local" | "badge"    ║
║                                Aliases: /cicd, /pipeline, /actions           ║
║                                                                              ║
║  /git                          Git operations suite                          ║
║                                Args: "status" | "sync" | "cleanup" |         ║
║                                      "stash" | "undo" | "log" | "diff"       ║
║                                Aliases: /g, /repo                            ║
║                                                                              ║
║  /branch                       Git branching operations                      ║
║                                Args: "create {ID}" | "switch {ID}" |         ║
║                                      "status" | "cleanup"                    ║
║                                                                              ║
║  /branch-health                Branch health analysis                        ║
║                                Args: "stale" | "prs" | "drift" | "metrics"   ║
║                                      "--cleanup" | "--fix"                   ║
║                                Aliases: /bh, /branch-audit, /repo-health     ║
║                                                                              ║
║  /tdd                          TDD cycle (RED-GREEN-REFACTOR)                ║
║                                Args: "story {ID}" | "story {ID}/AC{N}"       ║
║                                                                              ║
║  VALIDATION & ANALYSIS                                                       ║
║  ─────────────────────                                                       ║
║  /schema-validate              Validate story JSON against Schema V4.1       ║
║                                Args: "story {ID}" | "wave {N}" | "all"       ║
║                                Use: Before implementation                    ║
║                                                                              ║
║  /story-audit                  Post-completion Schema V4.1 compliance        ║
║                                Args: (none) | "wave {N}" | "wave all" |      ║
║                                      "{ID}" | "recent" | "today"             ║
║                                Use: After implementation, before Gate 5/7    ║
║                                                                              ║
║  /protocol-verify              Verify Wave V2 protocol compliance            ║
║                                Args: "story {ID}" | "wave {N}" | "all"       ║
║                                                                              ║
║  /gap-analysis                 Identify missing requirements/coverage        ║
║                                Args: "story {ID}" | "wave {N}" |             ║
║                                      "epic {NAME}" | "all"                   ║
║                                                                              ║
║  /rearchitect                  Analyze & reorganize folder structure         ║
║                                Args: "analyze" | "plan" | "execute" |        ║
║                                      "validate"                              ║
║                                                                              ║
║  /rlm-verify                   Requirements lifecycle traceability           ║
║                                Args: "story {ID}" | "wave {N}" | "all"       ║
║                                                                              ║
║  /trace                        Build traceability matrix (L0→L5)             ║
║                                Args: "story {ID}" | "wave {N}" | "all"       ║
║                                                                              ║
║  QUALITY & SAFETY                                                            ║
║  ────────────────                                                            ║
║  /harden                       Production hardening & quality gate           ║
║                                Args: "quick" | "security" | "performance" |  ║
║                                      "quality" | "a11y" | "production"       ║
║                                      "--fix" | "--ci" | "--report"           ║
║                                Aliases: /quality, /production-check          ║
║                                                                              ║
║  /security                     Security scan (OWASP, vulns, secrets)         ║
║                                Args: "deps" | "secrets" | "owasp" |          ║
║                                      "headers" | "--fix"                     ║
║                                Aliases: /sec, /audit-security, /vuln         ║
║                                                                              ║
║  /perf                         Performance analysis (Core Web Vitals)        ║
║                                Args: "bundle" | "lighthouse" | "vitals" |    ║
║                                      "images" | "--fix"                      ║
║                                Aliases: /performance, /lighthouse            ║
║                                                                              ║
║  /a11y                         Accessibility audit (WCAG 2.1 AA)             ║
║                                Args: "contrast" | "keyboard" | "aria" |      ║
║                                      "forms" | "--fix"                       ║
║                                Aliases: /accessibility, /wcag                ║
║                                                                              ║
║  /hazard                       Hazard analysis (DO-178C style)               ║
║                                Args: "story {ID}" | "wave {N}" | "all"       ║
║                                                                              ║
║  /anomaly                      Report defect or issue                        ║
║                                Args: "story {ID}" | "wave {N}"               ║
║                                                                              ║
║  /rollback                     Execute rollback procedure                    ║
║                                Args: "story {ID}" | "wave {N}"               ║
║                                                                              ║
║  DESIGN SYSTEM                                                               ║
║  ─────────────                                                               ║
║  /design-system                Design system / component library             ║
║                                Args: "init" | "validate" | "sync" |          ║
║                                      "storybook"                             ║
║                                                                              ║
║  /design-verify                Visual design-to-code validation              ║
║                                Args: "{design-source} {react-target}"        ║
║                                Uses: Playwright MCP for comparison           ║
║                                                                              ║
║  /ui-trace                     Story ↔ Component traceability                ║
║                                Args: "stories" | "components" | "wave {N}"   ║
║                                Checks: missing components, missing stories   ║
║                                Aliases: /component-trace, /storybook-trace   ║
║                                                                              ║
║  SESSION MANAGEMENT                                                          ║
║  ──────────────────                                                          ║
║  /preflight                    GO/NO-GO pre-flight authorization             ║
║                                Args: none (interactive prompts)              ║
║                                Aliases: /pf, /takeoff-check                  ║
║                                                                              ║
║  /handoff                      Generate session handoff document             ║
║                                Args: "{focus}" (optional description)        ║
║                                Aliases: /ho, /session-end, /eod              ║
║                                                                              ║
║  STRATEGIC & ADVISORY                                                        ║
║  ────────────────────                                                        ║
║  /cto                          CTO Advisor: strategic analysis &             ║
║                                recommendations                               ║
║                                                                              ║
║                                OPTIONS:                                      ║
║                                ┌─────────────┬──────────────────────────┐    ║
║                                │ full        │ Complete analysis (def)  │    ║
║                                │ quick       │ Executive summary (~2m)  │    ║
║                                │ next        │ What should I do next?   │    ║
║                                │ health      │ Project health metrics   │    ║
║                                │ debt        │ Technical debt analysis  │    ║
║                                │ risks       │ Risk assessment          │    ║
║                                │ roadmap     │ Strategic recommendations│    ║
║                                │ plan        │ Execution plan compliance│    ║
║                                │ plan --strict│ Strict: fail on deviate │    ║
║                                └─────────────┴──────────────────────────┘    ║
║                                                                              ║
║                                Aliases: /advisor, /strategy, /recommend      ║
║                                                                              ║
║  /prd                          PRD Analysis & Compliance                     ║
║                                Codebase vs PRD vs Stories analysis           ║
║                                                                              ║
║                                OPTIONS:                                      ║
║                                ┌─────────────┬──────────────────────────┐    ║
║                                │ full        │ Complete analysis (def)  │    ║
║                                │ quick       │ Compliance summary (~3m) │    ║
║                                │ gaps        │ PRD vs Implementation    │    ║
║                                │ stories     │ Story coverage analysis  │    ║
║                                │ missing     │ Find missing stories     │    ║
║                                │ coverage    │ Code-to-requirements     │    ║
║                                │ drift       │ Implementation drift     │    ║
║                                │ report      │ Formal compliance report │    ║
║                                └─────────────┴──────────────────────────┘    ║
║                                                                              ║
║                                Aliases: /prd-check, /requirements,           ║
║                                         /compliance                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## Quick Reference

### Fix & Repair Commands
```bash
/fix build                           # Fix build/TypeScript errors
/fix lint                            # Fix lint issues
/fix test                            # Fix failing tests
/fix security                        # Fix security vulnerabilities
/fix all                             # Fix all issues
/f build                             # Alias for /fix build
```

### Story-Level Commands
```bash
/execute-story story AUTH-BE-001     # Full execution
/tdd story AUTH-BE-001               # TDD for all ACs
/tdd story AUTH-BE-001/AC3           # TDD for single AC
/gate-0 story AUTH-BE-001            # Pre-flight
/gate-4 story AUTH-BE-001            # QA acceptance
/branch create AUTH-BE-001           # Create feature branch
/protocol-verify story AUTH-BE-001   # Verify compliance
```

### Wave-Level Commands
```bash
/launch-wave wave 1                  # Launch entire wave
/wave-status wave 1                  # Wave dashboard
/gate-0 wave 1                       # Pre-flight all stories
/schema-validate wave 1              # Validate all stories
/gap-analysis wave 1                 # Gap analysis for wave
/rlm-verify wave 1                   # RLM verification
```

### Project-Level Commands
```bash
/wave-status all                     # Overall project status
/schema-validate all                 # Validate all stories
/protocol-verify all                 # Full compliance audit
/gap-analysis all                    # Project-wide gaps
/rlm-verify all                      # Full traceability
/trace all                           # Complete matrix
/rearchitect analyze                 # Analyze folder structure
/rearchitect plan                    # Generate reorganization plan
```

### Design & Component Commands
```bash
/design-verify ./design.html http://localhost:3000           # Compare HTML to React
/ui-trace                                                    # Story ↔ Component trace
/ui-trace --fix                                              # Generate fix plan
/design-verify ./mockups/button.html localhost:3000/button   # Component level
/design-verify figma:123456 http://localhost:5173            # Figma source
```

### Schema Validation Commands
```bash
# Before implementation (validate story JSON)
/schema-validate story AUTH-BE-001   # Single story
/schema-validate wave 1              # All stories in wave

# After implementation (audit completed work)
/story-audit                         # Current wave (default)
/story-audit wave 1                  # Specific wave
/story-audit wave all                # All waves
/story-audit AUTH-BE-001             # Single story
/story-audit AUTH-BE-001 UI-FE-002   # Multiple stories
/story-audit recent                  # Last 7 days
/story-audit today                   # Today only
```

### Infrastructure Commands
```bash
# Credential validation
/keys                                # Check all API keys/credentials
/keys anthropic                      # Check only Anthropic API key
/keys github                         # Check only GitHub credentials
/keys --quick                        # Just show set/unset status

# Docker readiness
/docker ready                        # Full readiness check with dependencies
/docker ready --quick                # Skip dependency version checks
/docker status                       # Container status only
/docker build                        # Build agent image
/docker start                        # Start all containers
```

### Git & Branch Management
```bash
# Git operations
/git                                 # Show status overview
/git status                          # Detailed status with recommendations
/git sync                            # Sync with remote (fetch + rebase)
/git cleanup                         # Clean up local repository
/git stash                           # Stash management
/git undo commit                     # Undo last commit safely
/git log                             # Enhanced log views

# Branch health analysis
/branch-health                       # Full branch health analysis
/branch-health stale                 # Find stale branches (>30 days)
/branch-health prs                   # PR status analysis
/branch-health drift                 # Branch drift from main
/branch-health metrics               # Team metrics (PR throughput)
/branch-health --fix                 # Auto-cleanup stale branches
```

### Test & Coverage Commands
```bash
# Test execution
/test                                # Run all tests with coverage
/test unit                           # Unit tests only
/test integration                    # Integration tests only
/test e2e                            # E2E tests (Playwright)
/test coverage                       # Coverage report only
/test watch                          # Watch mode for TDD
/test --ci                           # CI mode (strict thresholds)

# CI/CD pipeline
/ci                                  # Full CI pipeline simulation
/ci check                            # Verify CI config exists
/ci status                           # Show GitHub Actions status
/ci validate                         # Validate workflow YAML files
/ci local                            # Run CI checks locally
/ci run [workflow]                   # Trigger workflow manually
```

### Production Hardening Commands
```bash
# Full hardening suite
/harden                              # All checks (security, perf, quality, a11y)
/harden quick                        # Fast essential checks only (~2 min)
/harden --fix                        # Auto-fix what's possible
/harden --ci                         # CI mode with exit codes

# Security scanning
/security                            # Full security scan
/security deps                       # Dependency vulnerabilities only
/security secrets                    # Secret detection only
/security owasp                      # OWASP pattern check
/security --fix                      # Auto-fix security issues

# Performance analysis
/perf                                # Full performance analysis
/perf bundle                         # Bundle size analysis only
/perf lighthouse                     # Lighthouse CI only
/perf vitals                         # Core Web Vitals only
/perf --fix                          # Auto-optimize images

# Accessibility audit
/a11y                                # Full accessibility audit
/a11y contrast                       # Color contrast only
/a11y keyboard                       # Keyboard navigation only
/a11y aria                           # ARIA attributes only
/a11y --fix                          # Auto-fix a11y issues
```

## Usage Examples

```bash
# Fix issues before starting work
/preflight                           # Check for blockers
/fix build                           # Fix any build errors
/preflight                           # Re-check for GO status

# Initialize new project
/wave-init

# Create a new story
/story-create "AUTH BE Implement password reset"

# Start working on a story
/branch create AUTH-BE-005
/tdd story AUTH-BE-005

# Validate before merge
/protocol-verify story AUTH-BE-005
/gate-7 story AUTH-BE-005

# Wave management
/launch-wave wave 2
/wave-status wave 2
/gap-analysis wave 2

# Project health check
/protocol-verify all
/gap-analysis all

# Folder structure analysis & reorganization
/rearchitect analyze                 # Scan and report
/rearchitect plan                    # Generate move plan
/rearchitect execute                 # Apply changes (with backup)
/rearchitect validate                # Verify after changes

# Session management
/preflight                           # GO/NO-GO check before work
/handoff                             # End of session handoff
/handoff auth-feature                # Handoff with focus label

# CTO Advisor & Strategic Analysis
/cto                                 # Full strategic analysis
/cto quick                           # Quick executive summary
/cto next                            # What should I do next?
/cto health                          # Project health metrics only
/cto debt                            # Technical debt analysis
/cto risks                           # Risk assessment
/cto roadmap                         # Strategic recommendations
/cto plan                            # Execution plan compliance check
/cto plan --strict                   # Strict mode - fail on deviations
/advisor                             # Alias for /cto
/strategy                            # Alias for /cto

# PRD Analysis & Compliance
/prd                                 # Full PRD compliance analysis
/prd quick                           # Quick compliance summary
/prd gaps                            # PRD vs Implementation gaps
/prd stories                         # Story coverage analysis
/prd missing                         # Find missing stories
/prd coverage                        # Code-to-requirements trace
/prd drift                           # Detect implementation drift
/prd report                          # Formal compliance report
/requirements                        # Alias for /prd
/compliance                          # Alias for /prd
```
