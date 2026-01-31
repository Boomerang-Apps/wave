# Wave V2 Protocol Command Reference

**Version:** 2.0
**Framework:** Wave V2 Aerospace Safety Protocol
**Compatibility:** Project-agnostic (Node.js, Python, Go, Rust, Java)

---

## Quick Start

```bash
# Initialize Wave V2 in a new project
/wave-init

# Create a new story
/story-create "AUTH BE Implement user login"

# Execute a story through all gates
/execute-story story AUTH-BE-001

# Check protocol compliance
/protocol-verify story AUTH-BE-001

# View project status
/wave-status all
```

---

## Scope Convention

Most commands accept a **scope argument** that determines the analysis level:

| Scope | Example | Description |
|-------|---------|-------------|
| `story {ID}` | `story AUTH-BE-001` | Single story |
| `wave {N}` | `wave 1` | All stories in wave |
| `all` | `all` | Entire project |

---

## Command Reference

### Initialization & Setup

#### `/wave-init`
Initialize Wave V2 framework for a new project.

```bash
/wave-init
```

**Creates:**
- `.claude/config.json` - Project configuration
- `.claude/signals/` - Signal file directory
- `stories/` - Story file structure
- `planning/` - Planning artifacts
- `contracts/` - API contracts

---

### Story Lifecycle

#### `/story-create`
Create a new story following Schema V4.1.

```bash
/story-create "{EPIC} {TYPE} {TITLE}"

# Examples:
/story-create "AUTH BE Implement password reset"
/story-create "PROF FE Create profile edit form"
```

**Arguments:**
- `EPIC` - Parent epic (AUTH, PROF, PROJ, etc.)
- `TYPE` - BE (backend), FE (frontend), INT (integration)
- `TITLE` - Story title

---

#### `/execute-story`
Execute a story through all gates (0-7) with full TDD workflow.

```bash
/execute-story story {ID}

# Example:
/execute-story story AUTH-BE-001
```

**Phases:**
1. Preparation (schema validation, dependencies)
2. Branching (feature branch creation)
3. TDD Implementation (RED→GREEN→REFACTOR per AC)
4. Gates 1-3 (self-verification)
5. Gates 4-6 (QA, PM, Architecture)
6. Gate 7 (merge)

---

#### `/research`
Validate research sources for acceptance criteria (PFC-K).

```bash
/research story {ID}
/research wave {N}
/research all

# Examples:
/research story AUTH-BE-001
/research wave 1
/research all
```

**Validates:**
- Source credibility (high/medium/low)
- AC coverage
- Industry standards
- Local regulations

---

### Wave Management

#### `/launch-wave`
Launch a complete wave with multi-agent orchestration.

```bash
/launch-wave wave {N}

# Example:
/launch-wave wave 1
```

**Pre-launch checks:**
- Schema validation
- Research validation
- Gate 0 approval
- Dependency resolution
- Agent availability

---

#### `/wave-status`
Display progress dashboard for waves and stories.

```bash
/wave-status wave {N}
/wave-status all

# Examples:
/wave-status wave 1
/wave-status all
```

**Shows:**
- Completion percentage
- Story status by agent
- Gate distribution
- Blockers and next actions

---

### Gate Commands

#### `/gate-0` - Pre-Flight Authorization
Validate story readiness (11 PFC checks).

```bash
/gate-0 story {ID}
/gate-0 wave {N}
```

**Checks:** Schema, DAL, Contracts, Paths, Dependencies, Security, Tests, Rollback, EARS, Points, Research

---

#### `/gate-1` - Self-Verification
Agent self-review of implementation.

```bash
/gate-1 story {ID}
```

**Checks:** AC completion, Contract compliance, Path ownership, Code quality

---

#### `/gate-2` - Build Verification
Compile, lint, and security audit.

```bash
/gate-2 story {ID}
/gate-2 wave {N}
/gate-2 all
```

**Checks:** Build success, Type checking, Lint rules, Security audit

---

#### `/gate-3` - Test Verification
Unit tests, coverage, and integration.

```bash
/gate-3 story {ID}
/gate-3 wave {N}
/gate-3 all
```

**Checks:** Unit tests, Coverage thresholds (DAL-based), Integration tests

---

#### `/gate-4` - QA Acceptance
Manual acceptance testing by QA agent.

```bash
/gate-4 story {ID}
```

**Checks:** AC verification, Edge cases, Error handling, UX review

---

#### `/gate-5` - PM Validation
Requirements validation by PM agent.

```bash
/gate-5 story {ID}
```

**Checks:** Requirements met, User value, Documentation, Stakeholder approval

---

#### `/gate-6` - Architecture Review
Technical review by CTO agent.

```bash
/gate-6 story {ID}
/gate-6 wave {N}
```

**Checks:** Design patterns, Security, Performance, Scalability

---

#### `/gate-7` - Merge Authorization
Final approval and merge.

```bash
/gate-7 story {ID}
```

**Checks:** All gates passed, No conflicts, CI green, Traceability updated

---

#### `/gate-check`
Quick verification of specific gate status.

```bash
/gate-check {gate} story {ID}

# Example:
/gate-check gate-3 story AUTH-BE-001
```

---

### Development Workflow

#### `/branch`
Git branching operations following Wave V2 conventions.

```bash
/branch create {ID}    # Create feature branch
/branch switch {ID}    # Switch to feature branch
/branch status         # Show branch status
/branch cleanup        # Remove merged branches

# Examples:
/branch create AUTH-BE-001
/branch status
```

**Branch Structure:**
```
main
├── develop
└── workspace/
    ├── be-dev
    ├── fe-dev
    ├── qa
    └── pm
```

---

#### `/tdd`
Execute TDD cycle (RED→GREEN→REFACTOR).

```bash
/tdd story {ID}           # All ACs
/tdd story {ID}/AC{N}     # Single AC

# Examples:
/tdd story AUTH-BE-001
/tdd story AUTH-BE-001/AC3
```

**Cycle:**
1. **RED** - Write failing test
2. **GREEN** - Minimum code to pass
3. **REFACTOR** - Clean up, test still passes

---

### Validation & Analysis

#### `/schema-validate`
Validate stories against Schema V4.1.

```bash
/schema-validate story {ID}
/schema-validate wave {N}
/schema-validate all

# Examples:
/schema-validate story AUTH-BE-001
/schema-validate all
```

**Validates:**
- 21 required fields
- EARS format for ACs
- Research validation structure
- ID patterns

---

#### `/protocol-verify`
Comprehensive Wave V2 protocol compliance audit.

```bash
/protocol-verify story {ID}
/protocol-verify wave {N}
/protocol-verify all

# Examples:
/protocol-verify story AUTH-BE-001
/protocol-verify all
```

**Audits:**
- Gate 0 Pre-Flight (11 checks)
- Research Validation (8 checks)
- Branching & VCS (6 checks)
- TDD Compliance (8 checks per AC)
- Coverage (5 checks)
- Milestones (5 checks)
- Rollback (5 checks)

---

#### `/gap-analysis`
Identify missing requirements and coverage gaps.

```bash
/gap-analysis story {ID}
/gap-analysis wave {N}
/gap-analysis epic {NAME}
/gap-analysis all

# Examples:
/gap-analysis wave 1
/gap-analysis all
```

**Analyzes:**
- Requirements gaps
- Design gaps
- Implementation gaps
- Test gaps
- Research gaps
- Documentation gaps

---

#### `/rlm-verify`
Requirements Lifecycle Management verification.

```bash
/rlm-verify story {ID}
/rlm-verify wave {N}
/rlm-verify all
```

**Verifies:**
- Forward traceability (PRD→Code)
- Backward traceability (Code→PRD)
- Orphan detection

**RLM Hierarchy:**
```
L0: PRD → L1: Epic → L2: Story → L3: AC → L4: Test → L5: Code
```

---

#### `/trace`
Build traceability matrix.

```bash
/trace story {ID}
/trace wave {N}
/trace all
```

**Maps:** Requirements → Design → Implementation → Tests

---

### Quality & Safety

#### `/hazard`
Perform hazard analysis (DO-178C style).

```bash
/hazard story {ID}
/hazard wave {N}
/hazard all
```

**Analyzes:**
- Failure modes
- Severity assessment
- Mitigation strategies
- DAL implications

---

#### `/anomaly`
Report defects or issues found during development.

```bash
/anomaly story {ID}
/anomaly wave {N}
```

**Creates:** Anomaly report with severity, impact, and remediation

---

#### `/rollback`
Execute or verify rollback procedures.

```bash
/rollback story {ID}
/rollback wave {N}
```

**Validates:**
- Rollback plan exists
- Triggers defined
- Procedure documented
- Data reversibility

---

### Design System

#### `/design-system`
Manage design system and component library.

```bash
/design-system init        # Initialize design system
/design-system validate    # Validate components
/design-system sync        # Sync with mockups
/design-system storybook   # Generate Storybook
```

---

### Reference

#### `/commands`
Display this command index.

```bash
/commands
/commands {command-name}   # Detailed help
```

---

## Signal Files

Commands create signal files for tracking:

```
.claude/signals/
├── signal-wave{N}-launched.json
├── signal-{STORY-ID}-started.json
├── signal-{STORY-ID}-gate{N}-passed.json
├── signal-anomaly-{ID}.json
├── signal-{STORY-ID}-complete.json
└── signal-wave{N}-complete.json
```

---

## Project Configuration

Commands read configuration from `.claude/config.json`:

```json
{
  "framework": "wave-v2",
  "version": "2.0",
  "project": {
    "name": "Project Name",
    "type": "auto-detect"
  },
  "commands": {
    "install": "auto-detect",
    "build": "auto-detect",
    "test": "auto-detect",
    "testCoverage": "auto-detect",
    "lint": "auto-detect",
    "typeCheck": "auto-detect",
    "securityAudit": "auto-detect"
  },
  "coverage": {
    "DAL-A": { "statement": 100, "branch": 100 },
    "DAL-B": { "statement": 95, "branch": 90 },
    "DAL-C": { "statement": 90, "branch": 85 },
    "DAL-D": { "statement": 80, "branch": 75 },
    "DAL-E": { "statement": 70, "branch": 60 }
  },
  "agents": ["be-dev", "fe-dev", "qa", "pm", "cto"]
}
```

---

## Auto-Detection

Commands auto-detect project type and use appropriate tools:

| Project | Build | Test | Lint | Security |
|---------|-------|------|------|----------|
| Node.js (pnpm) | `pnpm build` | `pnpm test` | `pnpm lint` | `pnpm audit` |
| Node.js (npm) | `npm run build` | `npm test` | `npm run lint` | `npm audit` |
| Python | `python -m build` | `pytest` | `ruff check .` | `safety check` |
| Go | `go build ./...` | `go test ./...` | `golangci-lint run` | `govulncheck ./...` |
| Rust | `cargo build` | `cargo test` | `cargo clippy` | `cargo audit` |

---

## Installation

To add Wave V2 commands to a new project:

1. Copy `.claude/commands/` directory to your project
2. Run `/wave-init` to initialize framework
3. Commands are immediately available

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2024-01 | Initial release with 27 commands |

---

## References

- DO-178C (Software Considerations in Airborne Systems)
- ARP4754A (Development of Civil Aircraft and Systems)
- NASA-STD-8719.13 (Software Safety)
- OWASP Security Standards
- EARS (Easy Approach to Requirements Syntax)
