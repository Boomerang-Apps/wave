# Wave V2 Framework - Claude Commands

**Portable Wave V2 Aerospace Safety Protocol for Claude Code**

## Quick Setup for New Projects

Copy this entire `.claude/` directory to your project root:

```bash
# From source project
cp -r .claude/ /path/to/new-project/

# In new project
cd /path/to/new-project
# Run /wave-init to configure for your project
```

## Directory Structure

```
.claude/
├── README.md                 # This file
├── WAVE-V2-COMMANDS.md       # Full command reference
├── config.json               # Project configuration (auto-generated)
├── commands/                 # Slash command definitions
│   ├── commands.md           # Command index
│   ├── wave-init.md          # /wave-init
│   ├── execute-story.md      # /execute-story
│   ├── protocol-verify.md    # /protocol-verify
│   ├── gate-0.md             # /gate-0
│   ├── gate-1.md             # /gate-1
│   ├── gate-2.md             # /gate-2
│   ├── gate-3.md             # /gate-3
│   ├── gate-4.md             # /gate-4
│   ├── gate-5.md             # /gate-5
│   ├── gate-6.md             # /gate-6
│   ├── gate-7.md             # /gate-7
│   ├── gate-check.md         # /gate-check
│   ├── story-create.md       # /story-create
│   ├── research.md           # /research
│   ├── launch-wave.md        # /launch-wave
│   ├── wave-status.md        # /wave-status
│   ├── branch.md             # /branch
│   ├── tdd.md                # /tdd
│   ├── schema-validate.md    # /schema-validate
│   ├── gap-analysis.md       # /gap-analysis
│   ├── rlm-verify.md         # /rlm-verify
│   ├── trace.md              # /trace
│   ├── hazard.md             # /hazard
│   ├── anomaly.md            # /anomaly
│   ├── rollback.md           # /rollback
│   ├── design-system.md      # /design-system
│   └── validate-research.md  # /validate-research
└── signals/                  # Runtime signal files (auto-generated)
```

## First-Time Setup

After copying to a new project, run:

```bash
/wave-init
```

This will:
1. Detect your project type (Node.js, Python, Go, Rust, etc.)
2. Create `.claude/config.json` with appropriate commands
3. Set up `stories/`, `planning/`, and `contracts/` directories
4. Configure coverage thresholds by DAL level

## Available Commands (27 Total)

### Essential Commands

| Command | Purpose |
|---------|---------|
| `/wave-init` | Initialize framework |
| `/execute-story story {ID}` | Full story execution |
| `/protocol-verify all` | Compliance audit |
| `/wave-status all` | Project dashboard |

### Scope Convention

```
/command story AUTH-BE-001   # Single story
/command wave 1              # Entire wave
/command all                 # Full project
```

### Full Command List

See `WAVE-V2-COMMANDS.md` for complete documentation.

## Compatible Projects

- **WAVE** - Any Wave V2 project
- **Footprint** - Copy and configure
- **AirView** - Origin project
- **Any Project** - Framework auto-detects:
  - Node.js (npm/pnpm/yarn)
  - Python (pip/poetry)
  - Go
  - Rust (cargo)
  - Java (maven/gradle)

## Project-Specific Configuration

After `/wave-init`, customize `.claude/config.json`:

```json
{
  "project": {
    "name": "Your Project Name",
    "type": "nodejs"
  },
  "commands": {
    "build": "pnpm build",
    "test": "pnpm test",
    "lint": "pnpm lint"
  },
  "coverage": {
    "DAL-C": { "statement": 90, "branch": 85 }
  }
}
```

## Wave V2 Protocol Summary

```
Gate 0: Pre-Flight    → Schema, Research, Dependencies
Gate 1: Self-Verify   → AC completion, Contracts
Gate 2: Build         → Compile, Lint, Security
Gate 3: Test          → Unit, Coverage, Integration
Gate 4: QA            → Acceptance testing
Gate 5: PM            → Requirements validation
Gate 6: Architecture  → Technical review
Gate 7: Merge         → Final approval
```

## Questions?

Run `/commands` to see all available commands with descriptions.
