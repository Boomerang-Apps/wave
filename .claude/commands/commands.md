# Commands Index: Wave V2 Protocol Shortcuts

List and describe all available Wave V2 commands.

## Arguments
- `$ARGUMENTS` - Optional: command name for detailed help

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
/fix [target]      # Fix issues: build, test, lint, security, all
/gate <N> [scope]  # Run gate 0-7
/wave [N] [action] # Wave operations
/audit [scope]     # Audit completed work
/validate [scope]  # Validate schemas
/keys [service]    # Validate API keys/credentials           ✅ NEW
/docker ready      # Docker readiness with dependencies      ✅ NEW
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
║  /branch                       Git branching operations                      ║
║                                Args: "create {ID}" | "switch {ID}" |         ║
║                                      "status" | "cleanup"                    ║
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

### Design Verification Commands
```bash
/design-verify ./design.html http://localhost:3000           # Compare HTML to React
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

### Infrastructure Commands (NEW)
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
```
