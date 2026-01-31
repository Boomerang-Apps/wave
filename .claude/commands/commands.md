# Commands Index: Wave V2 Protocol Shortcuts

List and describe all available Wave V2 commands.

## Arguments
- `$ARGUMENTS` - Optional: command name for detailed help

## Available Commands

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
║  /branch                       Git branching operations                      ║
║                                Args: "create {ID}" | "switch {ID}" |         ║
║                                      "status" | "cleanup"                    ║
║                                                                              ║
║  /tdd                          TDD cycle (RED-GREEN-REFACTOR)                ║
║                                Args: "story {ID}" | "story {ID}/AC{N}"       ║
║                                                                              ║
║  VALIDATION & ANALYSIS                                                       ║
║  ─────────────────────                                                       ║
║  /schema-validate              Validate against Schema V4.1                  ║
║                                Args: "story {ID}" | "wave {N}" | "all"       ║
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

## Usage Examples

```bash
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
