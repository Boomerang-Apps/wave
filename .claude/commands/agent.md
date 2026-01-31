# /agent - Multi-Agent Orchestration

**Priority:** P1 (HIGH)
**Recommended Model:** Sonnet (orchestration), Haiku (individual agents)
**Aliases:** /agents

## Purpose

Spawn, monitor, and coordinate domain-specific agents for parallel development. Manages the WAVE multi-agent system with 7 specialized agent types.

## When to Run

- When spawning domain-specific agents
- Monitoring active agent progress
- Coordinating multi-agent workflows
- Troubleshooting agent issues

## Arguments

| Command | Description |
|---------|-------------|
| `list` | List all active agents (default) |
| `spawn <type>` | Spawn a specific agent |
| `status <id>` | Check agent status |
| `kill <id>` | Terminate agent |
| `logs <id>` | View agent logs |
| `assign <id> <story>` | Assign story to agent |

## Agent Types

| Type | Role | Model | Capabilities |
|------|------|-------|--------------|
| `cto` | Architecture, review, merge | Opus | Code review, architecture decisions |
| `pm` | Story management, prioritization | Sonnet | Backlog management, stakeholder updates |
| `fe-dev-1` | Frontend primary | Sonnet | React, TypeScript, UI implementation |
| `fe-dev-2` | Frontend secondary | Sonnet | React, TypeScript, UI implementation |
| `be-dev-1` | Backend primary | Sonnet | API, database, server-side |
| `be-dev-2` | Backend secondary | Sonnet | API, database, server-side |
| `qa` | Testing, validation | Haiku | E2E tests, QA checklists |

## Agent Lifecycle

```
SPAWNED → IDLE → ASSIGNED → WORKING → COMPLETED
                    ↓
                 BLOCKED → ESCALATED
                    ↓
                  FAILED
```

## Commands

### /agent list (default)
```
WAVE Agent Orchestrator
=======================
Active Agents: 3

ID          TYPE      STATUS    CURRENT TASK            TOKENS
agent-001   fe-dev-1  Working   WAVE1-FE-001: Upload    12,450
agent-002   be-dev-1  Idle      -                       0
agent-003   qa        Working   QA-WAVE1-CHECKLIST      3,200

Total Tokens: 15,650
Budget: 500,000

Commands:
  /agent spawn qa        - Spawn QA agent
  /agent status agent-001 - Check agent status
  /agent kill agent-003  - Terminate agent
```

### /agent spawn <type>
```bash
/agent spawn fe-dev-1
```

Output:
```
Agent Spawned
=============
ID: agent-004
Type: fe-dev-1
Model: Claude Sonnet 4
Status: IDLE

Capabilities:
- React/Next.js development
- TypeScript
- Tailwind CSS
- Component testing

Ready to receive assignment.
Use: /agent assign agent-004 WAVE1-FE-002
```

### /agent status <id>
```bash
/agent status agent-001
```

Output:
```
Agent Status: agent-001
=======================
Type: fe-dev-1
Model: Claude Sonnet 4
Status: WORKING
Uptime: 45 minutes

Current Task: WAVE1-FE-001 (Photo Upload)
Progress: 60%
Phase: GREEN (Implementation)

Acceptance Criteria:
- [x] AC-001: Gallery upload
- [x] AC-002: Camera capture
- [ ] AC-003: Preview (in progress)
- [ ] AC-004: Size validation
- [ ] AC-005: Type validation

Token Usage: 12,450 / 100,000 (12.4%)
Commits: 3
Files Changed: 8

Last Activity: 2 minutes ago
```

### /agent assign <id> <story>
```bash
/agent assign agent-001 WAVE1-FE-002
```

Output:
```
Story Assigned
==============
Agent: agent-001 (fe-dev-1)
Story: WAVE1-FE-002 (Style Selection)
Status: ASSIGNED

Agent will begin work immediately.
Monitor: /agent status agent-001
```

### /agent kill <id>
```bash
/agent kill agent-003
```

Output:
```
Agent Terminated
================
ID: agent-003
Type: qa
Reason: User requested

Final Status:
- Tokens Used: 3,200
- Tasks Completed: 1
- Duration: 15 minutes

Resources released.
```

### /agent logs <id>
```bash
/agent logs agent-001 --tail 20
```

Output:
```
Agent Logs: agent-001
=====================
[14:30:15] Starting story WAVE1-FE-001
[14:30:18] Running /preflight...
[14:30:25] Pre-flight passed
[14:30:30] Creating branch wave1/WAVE1-FE-001
[14:31:00] Writing test for AC-001
[14:32:15] Test written, running...
[14:32:20] Test FAILED (expected - RED phase)
[14:33:00] Implementing AC-001...
[14:35:30] Implementation complete
[14:35:35] Running tests...
[14:35:40] Test PASSED (GREEN phase)
[14:36:00] Committing changes...
```

## Agent Communication

### Inter-Agent Messages
Agents communicate via Redis queue:
```
wave:agent:messages:{agent-id}
```

### Coordination Patterns
1. **Handoff** - FE agent completes, notifies BE agent
2. **Review Request** - Dev agent requests CTO review
3. **Escalation** - Agent blocked, escalates to PM
4. **Completion** - Agent done, notifies orchestrator

## Spawning Configuration

### Resource Limits
```yaml
max_concurrent_agents: 4
max_tokens_per_agent: 100000
max_runtime_minutes: 120
```

### Agent Defaults
```yaml
fe-dev:
  model: sonnet
  domain_access: [frontend, ui, components]

be-dev:
  model: sonnet
  domain_access: [backend, api, database]

qa:
  model: haiku
  domain_access: [all] # read-only
```

## Error Handling

### Agent Blocked
```
[BLOCKED] agent-001 cannot proceed
Reason: Dependency WAVE1-BE-001 not complete
Action: Waiting for be-dev-1 to complete

Options:
1. Wait for dependency
2. Reassign to different story
3. Escalate to PM
```

### Agent Failed
```
[FAILED] agent-002 encountered error
Error: Build failed - type errors
Attempts: 3

Actions:
1. Review logs: /agent logs agent-002
2. Manual intervention required
3. Escalating to CTO agent
```

## Integration

- Uses: Redis for task queue (wave-redis)
- Uses: Docker for agent containers
- Reads: `P.json` for agent config
- Updates: Agent status in real-time
- Triggers: `/escalate` on failures

## Evidence Sources

- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.12)
- Agents: `/Volumes/SSD-01/Projects/Footprint/footprint/src/agents/`
- Orchestrator: `/Volumes/SSD-01/Projects/WAVE/`
