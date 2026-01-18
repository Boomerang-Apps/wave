# WAVE .claudecode Rules

**Version:** 1.0.0
**Purpose:** Project-agnostic rules for autonomous multi-agent orchestration

---

## Directory Structure

```
.claudecode/
├── README.md              # This file
├── agents/                # Agent role definitions
│   ├── README.md
│   ├── fe-dev-agent.md   # Frontend developer agent
│   ├── be-dev-agent.md   # Backend developer agent
│   ├── qa-agent.md       # QA validation agent
│   └── dev-fix-agent.md  # Bug fix agent (retry loop)
├── safety/               # Safety rules and policies
│   ├── SAFETY-POLICY.md  # Master safety policy
│   └── FORBIDDEN-OPS.md  # 108 forbidden operations
├── workflows/            # Workflow documentation
│   ├── gate-protocol.md  # 8-gate protocol
│   ├── retry-loop.md     # QA→Dev retry cycle
│   ├── signal-flow.md    # Signal file flow
│   └── cost-tracking.md  # Token cost management
└── signals/              # Signal schemas
    ├── SCHEMAS.md        # All signal formats
    └── templates/        # JSON templates
```

---

## How These Rules Work

1. **Agent Rules** - Each agent has a dedicated .md file defining:
   - Role and responsibilities
   - Allowed operations
   - Required outputs (signals)
   - Safety constraints

2. **Safety Rules** - Enforced at multiple levels:
   - CLAUDE.md (in each project)
   - External kill switch
   - Budget limits
   - Domain boundaries

3. **Workflows** - Documented processes:
   - Gate protocol (0-7)
   - Retry loop (Gate 4.5)
   - Signal coordination
   - Cost tracking

---

## Usage

When initializing a project with WAVE:

1. The `project-setup.sh` script copies relevant rules
2. CLAUDE.md is generated from template
3. Agents read CLAUDE.md before any action
4. Orchestrator enforces safety externally

---

*WAVE Framework | Autonomous Multi-Agent Orchestration*
