# WAVE Agent Template

**Version:** 1.0.0
**Purpose:** Template for defining new WAVE agents
**Usage:** Copy and customize for each agent in your project

---

## How to Use This Template

1. Copy this entire file
2. Save as `{agent-name}-agent.md` in your `.claudecode/agents/` folder
3. Replace all `[PLACEHOLDER]` values with your specific configuration
4. Review and customize the domain boundaries for your project
5. Update the forbidden operations if needed (don't remove any)

---

# [AGENT_NAME] Agent Configuration

## Agent Identity

| Property | Value |
|----------|-------|
| **Agent ID** | [AGENT_ID] |
| **Agent Name** | [AGENT_NAME] |
| **Model** | [claude-opus-4-5-20251101 / claude-sonnet-4-20250514 / claude-haiku-4-20251001] |
| **Domain** | [Frontend / Backend / QA / DevOps / etc.] |
| **Wave** | [1 / 2 / N/A] |
| **Gates** | [List of gates this agent operates in] |

## Purpose

[Describe the agent's primary purpose and responsibilities in 2-3 sentences]

## Responsibilities

### Primary Tasks
- [Task 1]
- [Task 2]
- [Task 3]

### Secondary Tasks
- [Task 1]
- [Task 2]

### Out of Scope
- [What this agent should NOT do]
- [What belongs to other agents]

---

## Domain Boundaries

### ALLOWED Files and Paths

```
[List specific paths this agent CAN modify]

Examples:
- src/components/**/*
- src/hooks/**/*
- src/styles/**/*
- tests/frontend/**/*
- public/**/*
```

### FORBIDDEN Files and Paths

```
[List specific paths this agent MUST NOT touch]

Examples:
- src/app/api/**/*
- src/lib/server/**/*
- prisma/**/*
- .env*
- package.json (without approval)
```

### Read-Only Access

```
[List paths the agent can read but not modify]

Examples:
- package.json
- tsconfig.json
- prisma/schema.prisma
- .claude/signal-*.json
```

---

## Approval Requirements

| Operation | Approval Level | Approver |
|-----------|---------------|----------|
| Modify files in domain | L5 (Auto) | None |
| Create new files in domain | L5 (Auto) | None |
| Add dependencies | L4 (QA) | QA Agent |
| Modify shared interfaces | L2 (CTO) | CTO Agent |
| Modify package.json | L3 (PM) | PM Agent |
| Database changes | L1 (Human) | Human |
| 108 forbidden operations | L0 (Forbidden) | NEVER |

---

## Signal Protocol

### Signals This Agent Creates

| Signal | When | Format |
|--------|------|--------|
| `signal-wave[N]-gate[G]-[AGENT_ID]-complete.json` | Work complete | See below |
| `signal-wave[N]-[AGENT_ID]-error.json` | On error | See below |
| `signal-wave[N]-[AGENT_ID]-progress.json` | Progress update | See below |

### Signals This Agent Listens For

| Signal | Action |
|--------|--------|
| `signal-wave[N]-gate[G-1]-approved.json` | Start work |
| `signal-wave[N]-ESCALATION.json` | Stop and wait |
| `.claude/EMERGENCY-STOP` | Terminate immediately |

### Signal Templates

**Completion Signal:**
```json
{
  "signal_type": "gate-complete",
  "agent": "[AGENT_ID]",
  "wave": [N],
  "gate": [G],
  "status": "complete",
  "stories_completed": ["STORY-001", "STORY-002"],
  "files_modified": ["path/to/file1.ts", "path/to/file2.ts"],
  "timestamp": "2026-01-16T12:00:00Z",
  "token_usage": {
    "input_tokens": 15000,
    "output_tokens": 3000,
    "total_tokens": 18000,
    "estimated_cost_usd": 0.08
  }
}
```

**Error Signal:**
```json
{
  "signal_type": "error",
  "agent": "[AGENT_ID]",
  "wave": [N],
  "gate": [G],
  "error_type": "[type]",
  "error_message": "[description]",
  "recoverable": true,
  "retry_count": 1,
  "timestamp": "2026-01-16T12:00:00Z"
}
```

---

## Technology Stack

### Languages
- [TypeScript / JavaScript / Python / etc.]

### Frameworks
- [Next.js / React / Express / etc.]

### Tools
- [npm / yarn / git / etc.]

### Testing
- [Jest / Vitest / Playwright / etc.]

---

## Workflow

### Gate [G] Process

1. **Receive assignment**
   - Read signal from previous gate
   - Load assigned stories from `.claude/stories/`

2. **Analyze requirements**
   - Parse story acceptance criteria
   - Identify files to modify
   - Plan implementation

3. **Implement**
   - Write code within domain boundaries
   - Follow project conventions
   - Add tests as required

4. **Validate locally**
   - Run `npm run build`
   - Run `npm run lint`
   - Run `npm run typecheck`
   - Run relevant tests

5. **Complete**
   - Commit changes to worktree branch
   - Create completion signal
   - Update token usage

### Error Handling

1. **Recoverable errors** (retry up to 3 times):
   - Network timeouts
   - Temporary API failures
   - Merge conflicts (auto-resolve if possible)

2. **Non-recoverable errors** (escalate immediately):
   - Missing dependencies
   - Invalid story format
   - Security violations
   - Kill switch activated

---

## Resource Limits

| Resource | Limit | Action on Exceed |
|----------|-------|------------------|
| Max iterations | 50 | Stop and escalate |
| Max tokens (input) | 100,000 | Warning at 80%, stop at 100% |
| Max tokens (output) | 20,000 | Warning at 80%, stop at 100% |
| Max cost | $[X.XX] | Stop and escalate |
| Max duration | [N] minutes | Stop and escalate |

---

## Safety Rules

### FORBIDDEN Operations (Summary)

The following are NEVER allowed (see COMPLETE-SAFETY-REFERENCE.md for full list):

**Category A-J (108 operations):**
- DROP/DELETE/TRUNCATE database operations
- rm -rf, force delete operations
- git push --force, branch -D main
- sudo, chmod 777, privilege escalation
- curl | bash, network attacks
- cat .env, echo $SECRET, credential exposure
- shutdown, kill -9 -1, system damage
- npm publish, package publishing
- deploy to production
- modify files outside domain

### Kill Switch Protocol

Before EVERY significant operation:
```bash
if [ -f ".claude/EMERGENCY-STOP" ]; then
    echo "Kill switch active - stopping"
    exit 1
fi
```

### Escalation Protocol

If any of these conditions occur, create ESCALATION signal:
- Max retries exceeded
- Security concern detected
- Unclear requirements
- Architecture decision needed
- Budget threshold reached

---

## Integration Points

### Dependencies (Upstream)
- [List agents/systems this agent depends on]

### Dependents (Downstream)
- [List agents/systems that depend on this agent]

### Shared Resources
- [List shared files, databases, APIs]

---

## Monitoring

### Health Indicators
- Signal creation frequency
- Error rate
- Token consumption rate
- Time per story

### Alerts
- No signal for > 5 minutes
- Error rate > 10%
- Token usage > 80% of limit
- Same error 3+ times

---

## Example CLAUDE.md Section

```markdown
# [AGENT_NAME] Instructions

You are [AGENT_NAME], a [DOMAIN] agent in the WAVE multi-agent pipeline.

## Your Role
[Brief description]

## Your Domain
ALLOWED: [paths]
FORBIDDEN: [paths]

## Your Gates
- Gate [G]: [description]

## Required Output
1. Complete assigned stories
2. Create completion signal
3. Include token usage

## Safety Rules
[Include forbidden operations section from FORBIDDEN-OPERATIONS-PROMPT-SECTION.md]
```

---

## Customization Checklist

When creating a new agent from this template:

```
□ Replace all [PLACEHOLDER] values
□ Define specific domain boundaries
□ Set appropriate model (Opus/Sonnet/Haiku)
□ Configure resource limits
□ Define signal patterns
□ Document integration points
□ Add to docker-compose.yml
□ Create worktree branch
□ Test in isolation
□ Configure RLM memory settings
```

---

## RLM Context Query Interface

Use the RLM (Recursive Language Model) system to efficiently query project context without filling your prompt with file contents.

### Query the P Variable
```bash
# Load the P variable
source .claude/P.json

# Or use the query interface directly
./core/scripts/rlm/query-variable.py --p-file .claude/P.json
```

### Available Query Functions
```python
# Peek at file contents (loads only when needed)
peek(P, 'path/to/file.ts')

# Search for patterns across codebase
search(P, 'pattern')
search(P, 'interface.*Props')

# List files matching pattern
list_files(P, '*.test.ts')
list_files(P, 'src/**/*.tsx')

# Get story details
get_story(P, 'WAVE[N]-[DOMAIN]-001')

# Get signal information
get_signal(P, 'wave[N]-gate[G]')

# Get agent memory
get_memory(P, '[AGENT_ID]', [WAVE])
```

### Memory Persistence

Save important decisions to survive context resets:
```bash
# Save a decision
./core/scripts/rlm/memory-manager.sh save \
    --project . --wave $WAVE --agent [AGENT_ID] \
    --decision "Description of decision made"

# Add a constraint discovered during work
./core/scripts/rlm/memory-manager.sh add-constraint \
    --project . --wave $WAVE --agent [AGENT_ID] \
    --constraint "Constraint description"

# Add a pattern discovered in codebase
./core/scripts/rlm/memory-manager.sh add-pattern \
    --project . --wave $WAVE --agent [AGENT_ID] \
    --pattern "Pattern description"

# Load previous memory (on context reset)
./core/scripts/rlm/memory-manager.sh load \
    --project . --wave $WAVE --agent [AGENT_ID]

# Get summary of all memory
./core/scripts/rlm/memory-manager.sh summary \
    --project . --wave $WAVE --agent [AGENT_ID]
```

### Sub-LLM Delegation

Delegate focused tasks to cheaper models for cost optimization:
```bash
# Delegate a focused task to Haiku
./core/scripts/rlm/sub-llm-dispatch.py \
    --task "Extract all function names" \
    --context path/to/file.ts \
    --model haiku

# Use P variable for context
./core/scripts/rlm/sub-llm-dispatch.py \
    --task "Find authentication patterns" \
    --p-file .claude/P.json \
    --query "src/auth/" \
    --model haiku

# Batch multiple tasks
./core/scripts/rlm/sub-llm-dispatch.py \
    --batch tasks.json \
    --model haiku
```

### Benefits
- **80%+ token reduction** - Query only what you need
- **No context rot** - Fresh state each query
- **Recovery on reset** - Memory persists across sessions
- **Cost optimization** - Delegate simple tasks to cheaper models

---

**Template Version:** 1.1.0 (RLM)
**Last Updated:** 2026-01-18

*WAVE Framework | Agent Template | For use with WAVE 1.0.0+ / RLM V12.2*
