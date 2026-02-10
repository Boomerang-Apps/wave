# WAVE Framework - Workflows, Tools & SDKs Addendum

**Document ID:** CTO-WTS-2026-0205
**Date:** February 5, 2026
**Type:** Addendum to CTO Synthesized Recommendations
**Classification:** TECHNICAL IMPLEMENTATION GUIDE

---

## Part 1: Workflows

### 1.1 WAVE Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       WAVE WORKFLOW HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LEVEL 1: MASTER WORKFLOWS (Human-Initiated)                                 │
│  ├── Wave Execution Workflow      - Full autonomous story execution         │
│  ├── Pre-Flight Workflow          - Validation before dispatch              │
│  └── Emergency Stop Workflow      - E1-E5 graduated response                │
│                                                                              │
│  LEVEL 2: ORCHESTRATION WORKFLOWS (PM-Managed)                               │
│  ├── Story Assignment Workflow    - Gate 0: Assign stories to waves         │
│  ├── Merge Preparation Workflow   - Gate 5-6: Pre-merge validation          │
│  └── Deployment Workflow          - Gate 7: Merge + deploy                  │
│                                                                              │
│  LEVEL 3: AGENT WORKFLOWS (Agent-Executed)                                   │
│  ├── Development Workflow         - Gate 2-3: Code implementation           │
│  ├── QA Validation Workflow       - Gate 4: Test/lint/typecheck             │
│  ├── Retry/Fix Workflow           - Gate 4.5: Dev-Fix retry loop            │
│  └── CTO Review Workflow          - Architecture validation                 │
│                                                                              │
│  LEVEL 4: UTILITY WORKFLOWS (Automated)                                      │
│  ├── Signal Detection Workflow    - Monitor .claude/signals/                │
│  ├── Heartbeat Workflow           - Agent health monitoring                 │
│  ├── Budget Tracking Workflow     - Token spend monitoring                  │
│  └── Escalation Workflow          - Human notification triggers             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Master Workflows

#### Wave Execution Workflow

```yaml
# workflow: wave-execution
name: Wave Execution Workflow
trigger: manual ("START" command)
owner: CTO Master
phases:
  - phase: 1
    name: Validate Plan
    steps:
      - load AI Stories from ai-prd/stories/
      - validate story schema (JSON Schema V4)
      - check wave assignments
      - verify acceptance criteria
    tools: [Read, Glob, Grep]

  - phase: 2
    name: Connect Systems
    steps:
      - verify GitHub access
      - verify Supabase connection
      - verify Slack webhook
      - load credentials from credentials-manager.sh
    tools: [Bash, MCP:GitHub, MCP:Supabase]

  - phase: 3
    name: Pre-Flight
    steps:
      - run pre-flight-validator.sh (80+ checks)
      - generate PREFLIGHT.lock
      - send GO/NO-GO notification
    tools: [Bash, MCP:Slack]
    gate: Human approval required

  - phase: 4
    name: Execution
    steps:
      - create worktrees per agent
      - dispatch agents to containers
      - monitor progress via signals
      - handle retry loop (max 3)
    tools: [Bash, Docker, MCP:Memory]

  - phase: 5
    name: Deploy
    steps:
      - run pre-merge-validator.sh
      - merge to main (CTO Master)
      - trigger Vercel deployment
      - run post-deploy-validator.sh
    tools: [Bash, MCP:GitHub, MCP:Vercel]
```

#### Pre-Flight Workflow

```yaml
# workflow: pre-flight
name: Pre-Flight Validation Workflow
trigger: /preflight command or wave-start.sh
owner: CTO Master
sections:
  A: Environment validation (7 checks)
  B: Git state validation (6 checks)
  C: Dependency validation (5 checks)
  D: Configuration validation (8 checks)
  E: Safety system validation (10 checks)
  F: Story file validation (6 checks)
  G: Signal system validation (5 checks)
  H: Docker validation (7 checks)
  I: API connectivity (6 checks)
  J: Budget validation (4 checks)
  K: Worktree validation (5 checks)
  L: MCP server validation (6 checks)
  M: Permission validation (5 checks)
output:
  - PREFLIGHT.lock (sha256 hash)
  - GO/NO-GO decision
  - Slack notification
```

#### Emergency Stop Workflow

```yaml
# workflow: emergency-stop
name: Emergency Stop Workflow
trigger:
  - File: .claude/EMERGENCY-STOP
  - Supabase: maf_kill_switch.active = true
  - Slack: !emergency command
levels:
  E1:
    scope: Single agent
    action: Stop agent, reassign work
    recovery: Automatic
  E2:
    scope: Entire domain
    action: Stop domain VM, preserve state
    recovery: Manual restart
  E3:
    scope: Current wave
    action: Abort wave, save progress
    recovery: Resume from checkpoint
  E4:
    scope: All domains
    action: Graceful halt, backup state
    recovery: Full restart required
  E5:
    scope: EVERYTHING
    action: Immediate kill, no grace period
    recovery: Full investigation required
```

### 1.3 Agent Workflows

#### Development Workflow (FE/BE Dev Agents)

```yaml
# workflow: development
name: Development Workflow
trigger: Gate 2 signal
owner: FE-Dev-1/2, BE-Dev-1/2
steps:
  1_receive_assignment:
    input: signal-assignment.json
    action: Parse story, acceptance criteria

  2_plan_implementation:
    action: Break down into tasks
    output: Implementation plan (in memory)

  3_write_code:
    tools: [Write, Edit, MultiEdit]
    constraints:
      - Worktree isolation enforced
      - Domain boundaries checked
      - 108 forbidden operations blocked

  4_self_review:
    action: Review own code against criteria
    tool: Read, Grep

  5_run_tests:
    command: npm run test:run
    tool: Bash

  6_signal_completion:
    output: signal-gate-3-complete.json
    includes:
      - Files changed
      - Tests passed
      - Coverage percentage
```

#### QA Validation Workflow

```yaml
# workflow: qa-validation
name: QA Validation Workflow
trigger: Gate 4 signal
owner: QA Agent
permission_mode: plan (read-only code access)
steps:
  1_receive_submission:
    input: signal-gate-3-complete.json

  2_build_validation:
    command: npm run build
    expect: Exit code 0

  3_typecheck:
    command: tsc --noEmit
    expect: No errors

  4_lint:
    command: npm run lint
    expect: No errors (warnings OK)

  5_test:
    command: npm run test:run
    expect: 100% pass rate

  6_coverage:
    command: npm run test:coverage
    expect: >= 70% coverage

  7_security:
    command: npm audit
    expect: No critical vulnerabilities

  8_decision:
    if: All checks pass
      output: signal-qa-approved.json
    else:
      output: signal-qa-rejected.json
      triggers: Retry/Fix Workflow (max 3)
```

#### Retry/Fix Workflow

```yaml
# workflow: retry-fix
name: Retry/Fix Workflow
trigger: signal-qa-rejected.json
owner: Dev-Fix Agent
max_attempts: 3
steps:
  1_analyze_failure:
    input: QA rejection reason
    action: Parse error logs, identify root cause

  2_research_fix:
    tools: [Read, Grep, Glob, WebSearch]
    action: Research solution approaches

  3_implement_fix:
    tools: [Write, Edit]
    constraints: Same as Development Workflow

  4_verify_fix:
    command: npm run test:run
    action: Confirm fix resolves issue

  5_resubmit:
    output: signal-gate-3-complete.json
    triggers: QA Validation Workflow

escalation:
  condition: attempts >= 3
  action: Human escalation
  notification: Slack + Supabase event
```

### 1.4 Utility Workflows

#### Signal Detection Workflow

```yaml
# workflow: signal-detection
name: Signal Detection Workflow
trigger: Continuous (inotifywait)
owner: Orchestrator
location: .claude/signals/
patterns:
  - signal-assignment-*.json → Trigger Development
  - signal-gate-*-complete.json → Trigger next gate
  - signal-qa-*.json → Route to PM or Dev-Fix
  - signal-merge-ready.json → Trigger CTO Master
  - EMERGENCY-STOP → Trigger Emergency Workflow
```

#### Budget Tracking Workflow

```yaml
# workflow: budget-tracking
name: Budget Tracking Workflow
trigger: Every API call
owner: Orchestrator
actions:
  - Log token count to Supabase maf_costs
  - Calculate running total
  - Check against wave budget
  - Check against story budget
alerts:
  - 50% budget consumed → Info notification
  - 80% budget consumed → Warning notification
  - 100% budget consumed → Auto-pause + escalation
```

---

## Part 2: Tools & SDKs

### 2.1 SDK Ecosystem Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WAVE SDK ECOSYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ANTHROPIC SDKs                                                              │
│  ├── anthropic (Python)         - Core Claude API client                    │
│  ├── @anthropic-ai/sdk (JS)     - JavaScript/TypeScript client              │
│  └── Claude Code CLI            - Interactive development tool              │
│                                                                              │
│  ORCHESTRATION SDKs                                                          │
│  ├── LangGraph                  - Stateful agent workflows                  │
│  ├── LangChain                  - LLM application framework                 │
│  └── LangSmith                  - Tracing and observability                 │
│                                                                              │
│  CONTEXT MANAGEMENT SDKs                                                     │
│  └── RLM (Recursive LM)         - Context rot prevention                    │
│                                                                              │
│  MCP PROTOCOL                                                                │
│  ├── Memory Server              - Cross-session persistence                 │
│  ├── Sequential Thinking        - Complex reasoning                         │
│  ├── Git Server                 - Repository operations                     │
│  ├── GitHub Server              - Issues, PRs, Actions                      │
│  ├── Filesystem Server          - File operations                           │
│  ├── Docker Server              - Container management                      │
│  └── DBHub                      - Database operations                       │
│                                                                              │
│  EXTERNAL INTEGRATIONS                                                       │
│  ├── Supabase SDK               - Database, Auth, Storage                   │
│  ├── Vercel SDK                 - Deployment management                     │
│  ├── Sentry SDK                 - Error tracking                            │
│  ├── Slack SDK                  - Team communication                        │
│  └── Playwright                 - Browser automation                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Core SDKs - Implementation Guide

#### Anthropic SDK (Python)

```python
# Installation
pip install anthropic

# Usage in WAVE Orchestrator
from anthropic import Anthropic

class WaveAnthropicClient:
    def __init__(self):
        self.client = Anthropic()  # Uses ANTHROPIC_API_KEY env var

    def call_agent(self, agent_type: str, prompt: str) -> str:
        """Route to appropriate model based on agent type"""
        model_map = {
            "cto": "claude-opus-4-5-20250514",
            "pm": "claude-sonnet-4-20250514",
            "fe_dev": "claude-sonnet-4-20250514",
            "be_dev": "claude-sonnet-4-20250514",
            "qa": "claude-haiku-4-5-20251001",
            "dev_fix": "claude-sonnet-4-20250514"
        }

        response = self.client.messages.create(
            model=model_map.get(agent_type, "claude-sonnet-4-20250514"),
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
```

#### Anthropic SDK (JavaScript)

```javascript
// Installation
npm install @anthropic-ai/sdk

// Usage in Portal Server
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

async function callAgent(agentType, prompt) {
    const modelMap = {
        cto: 'claude-opus-4-5-20250514',
        pm: 'claude-sonnet-4-20250514',
        qa: 'claude-haiku-4-5-20251001'
    };

    const response = await anthropic.messages.create({
        model: modelMap[agentType] || 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].text;
}
```

#### Claude Code CLI

```bash
# Installation
npm install -g @anthropic-ai/claude-code

# Key Commands
claude                          # Start interactive session
claude -p "task"               # Headless execution
claude -r <session_id>         # Resume session
claude mcp add <server>        # Add MCP server
claude mcp list                # List configured servers

# Configuration Files
~/.claude/settings.json        # Global settings
.claude/settings.json          # Project settings
.claude/commands/              # Custom slash commands
.claude/hooks/                 # Lifecycle hooks
```

### 2.3 Orchestration SDKs

#### LangGraph (Recommended for v2)

```python
# Installation
pip install langgraph langchain-anthropic

# WAVE LangGraph Implementation
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from typing import TypedDict, Annotated
from operator import add

class AgentState(TypedDict):
    messages: Annotated[list, add]
    current_gate: int
    story_id: str
    agent_outputs: dict
    retry_count: int

def create_wave_graph():
    graph = StateGraph(AgentState)

    # Add nodes for each agent/gate
    graph.add_node("cto_validate", cto_validation_node)
    graph.add_node("pm_assign", pm_assignment_node)
    graph.add_node("dev_execute", development_node)
    graph.add_node("qa_validate", qa_validation_node)
    graph.add_node("dev_fix", retry_fix_node)
    graph.add_node("merge", merge_node)

    # Add edges
    graph.add_edge("cto_validate", "pm_assign")
    graph.add_edge("pm_assign", "dev_execute")
    graph.add_edge("dev_execute", "qa_validate")

    # Conditional routing for QA results
    graph.add_conditional_edges(
        "qa_validate",
        route_qa_result,
        {
            "approve": "merge",
            "reject": "dev_fix",
            "escalate": END
        }
    )

    # Retry loop
    graph.add_conditional_edges(
        "dev_fix",
        check_retry_limit,
        {
            "retry": "qa_validate",
            "escalate": END
        }
    )

    graph.add_edge("merge", END)
    graph.set_entry_point("cto_validate")

    # Add checkpointing for resilience
    checkpointer = SqliteSaver.from_conn_string(":memory:")
    return graph.compile(checkpointer=checkpointer)

def route_qa_result(state: AgentState) -> str:
    """Route based on QA validation result"""
    qa_output = state["agent_outputs"].get("qa", {})
    if qa_output.get("approved"):
        return "approve"
    elif state["retry_count"] >= 3:
        return "escalate"
    return "reject"
```

#### LangSmith Integration

```python
# Installation
pip install langsmith

# Enable tracing
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-key"
os.environ["LANGCHAIN_PROJECT"] = "wave-orchestrator"

# Usage - automatic tracing of all LangChain/LangGraph operations
# All agent calls, tool uses, and workflow transitions are logged
```

### 2.4 RLM SDK (Context Management)

```python
# Installation
pip install rlm
# or
pip install git+https://github.com/alexzhang13/rlm.git

# WAVE RLM Integration
from rlm import RLMAgent, RecursiveConfig

class WaveRLMAgent:
    """RLM-powered agent for context rot prevention"""

    def __init__(self, domain: str):
        self.domain = domain
        self.config = RecursiveConfig(
            max_depth=5,
            chunk_size=4000,
            overlap=200
        )
        self.agent = RLMAgent(config=self.config)

    def load_codebase(self, project_path: str):
        """Load domain-scoped codebase as external variable P"""
        domain_patterns = DOMAIN_PATTERNS.get(self.domain, ["**/*"])
        files = []
        for pattern in domain_patterns:
            files.extend(glob.glob(f"{project_path}/{pattern}"))

        # Store as external variable (not in context)
        self.agent.set_external_variable("P", files)

    async def execute_story(self, story: dict) -> dict:
        """Execute story with fresh sub-calls"""
        result = await self.agent.recursive_execute(
            task=story["description"],
            acceptance_criteria=story["acceptance_criteria"],
            max_tokens=100000  # Can handle 10M+ without degradation
        )
        return result

# Domain patterns for scoped context
DOMAIN_PATTERNS = {
    "AUTH": ["src/auth/**", "src/middleware/auth*"],
    "CLIENT": ["src/client/**", "src/components/client/**"],
    "PILOT": ["src/pilot/**", "src/components/pilot/**"],
    "ADMIN": ["src/admin/**", "src/components/admin/**"],
    "BOOKING": ["src/booking/**", "src/components/booking/**"],
    "PAYMENT": ["src/payment/**", "src/services/payment*"],
    "SHARED": ["src/shared/**", "src/components/ui/**"]
}
```

### 2.5 MCP Server SDKs

#### Memory Server

```javascript
// Configuration (.mcp.json)
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}

// Tools provided:
// - store(key, value) - Store persistent data
// - retrieve(key) - Retrieve stored data
// - delete(key) - Remove data
// - list() - List all stored keys

// Use cases in WAVE:
// - Agent state persistence across sessions
// - Story progress tracking
// - Cross-agent communication
```

#### Sequential Thinking Server

```javascript
// Configuration (.mcp.json)
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}

// Tools provided:
// - think_step_by_step(problem) - Break down complex problems
// - decompose_problem(problem) - Create task hierarchy

// Use cases in WAVE:
// - CTO architectural analysis
// - Complex debugging scenarios
// - Story feasibility assessment
```

#### GitHub Server

```javascript
// Configuration (.mcp.json)
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}

// Tools provided:
// - create_issue(repo, title, body)
// - list_issues(repo, state)
// - create_pull_request(repo, title, body, head, base)
// - get_pull_request(repo, number)
// - merge_pull_request(repo, number)
// - search_code(query)

// Use cases in WAVE:
// - Automated PR creation after QA approval
// - Issue tracking for escalations
// - Code search for implementation research
```

#### DBHub (Supabase/PostgreSQL)

```javascript
// Configuration (.mcp.json)
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub", "--dsn", "${DATABASE_URL}"]
    }
  }
}

// Tools provided:
// - query(sql) - Execute SELECT queries
// - execute(sql) - Execute INSERT/UPDATE/DELETE
// - describe_table(table_name) - Get schema
// - list_tables() - List all tables

// Use cases in WAVE:
// - Event logging to maf_events (black box)
// - Pipeline status updates
// - Kill switch checking
```

### 2.6 External Integration SDKs

#### Supabase SDK

```javascript
// Installation
npm install @supabase/supabase-js

// Usage in Portal
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// WAVE Event Logging
async function logEvent(pipelineId, eventType, data) {
    await supabase.from('maf_events').insert({
        pipeline_id: pipelineId,
        event_type: eventType,
        data: data,
        timestamp: new Date().toISOString()
    });
}

// Kill Switch Check
async function checkKillSwitch() {
    const { data } = await supabase
        .from('maf_kill_switch')
        .select('active')
        .single();
    return data?.active || false;
}
```

#### Vercel SDK

```javascript
// Installation
npm install @vercel/sdk

// Usage for deployments
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({ token: process.env.VERCEL_TOKEN });

async function createDeployment(projectId, gitRef) {
    return await vercel.deployments.create({
        name: projectId,
        gitSource: {
            type: 'github',
            ref: gitRef,
            repoId: process.env.GITHUB_REPO_ID
        }
    });
}
```

#### Slack SDK

```javascript
// Installation
npm install @slack/web-api

// Usage for notifications
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function sendPipelineNotification(channel, status, details) {
    await slack.chat.postMessage({
        channel: channel,
        blocks: [
            {
                type: 'header',
                text: { type: 'plain_text', text: `Pipeline ${status}` }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: details }
            }
        ]
    });
}
```

### 2.7 Tool Permission Matrix

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     TOOL & SDK PERMISSION MATRIX                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Tool/SDK              │ CTO │ PM  │ Dev │ QA  │ Fix │ Notes                 │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Anthropic SDK         │  ✓  │  ✓  │  ✓  │  ✓  │  ✓  │ All agents           │
│  Claude Code CLI       │  ✓  │  ✓  │  ✓  │  ✓  │  ✓  │ All agents           │
│  LangGraph             │  ✓  │  ✓  │  -  │  -  │  -  │ Orchestration only   │
│  LangSmith             │  ✓  │  ✓  │  ✓  │  ✓  │  ✓  │ Tracing (passive)    │
│  RLM                   │  ✓  │  ✓  │  ✓  │  -  │  ✓  │ Context management   │
│  ─────────────────────────────────────────────────────────────────────────── │
│  MCP: Memory           │  ✓  │  ✓  │  ✓  │  ✓  │  ✓  │ Cross-session state  │
│  MCP: Sequential       │  ✓  │  -  │  -  │  -  │  -  │ Complex reasoning    │
│  MCP: Git              │  ✓  │  ✓  │  ✓  │  R  │  ✓  │ R=Read-only for QA   │
│  MCP: GitHub           │  ✓  │  ✓  │  ✓  │  R  │  ✓  │ R=Read-only for QA   │
│  MCP: Docker           │  ✓  │  ✓  │  -  │  -  │  -  │ Orchestration only   │
│  MCP: DBHub            │  ✓  │  ✓  │  -  │  R  │  -  │ R=Read-only for QA   │
│  ─────────────────────────────────────────────────────────────────────────── │
│  Supabase SDK          │  ✓  │  ✓  │  -  │  R  │  -  │ Events + status      │
│  Vercel SDK            │  ✓  │  ✓  │  -  │  -  │  -  │ Deployments          │
│  Slack SDK             │  ✓  │  ✓  │  N  │  N  │  N  │ N=Notifications only │
│  Sentry SDK            │  ✓  │  R  │  -  │  R  │  R  │ R=Read-only          │
│  Playwright            │  -  │  -  │  -  │  ✓  │  -  │ QA automation only   │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Implementation Checklist

### SDK Setup Checklist

```bash
# 1. Core SDKs
pip install anthropic                    # Python Anthropic SDK
pip install langgraph langchain-anthropic # LangGraph orchestration
pip install langsmith                    # Tracing
pip install rlm                          # Context management (CRITICAL)

npm install @anthropic-ai/sdk            # JS Anthropic SDK
npm install @supabase/supabase-js        # Supabase
npm install @slack/web-api               # Slack

# 2. MCP Servers (add to .mcp.json)
claude mcp add memory -- npx -y @modelcontextprotocol/server-memory
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
claude mcp add github -- npx -y @modelcontextprotocol/server-github

# 3. Verify installation
python -c "import anthropic; print('Anthropic OK')"
python -c "import langgraph; print('LangGraph OK')"
python -c "import rlm; print('RLM OK')"
claude mcp list  # Should show all configured servers
```

### Workflow Setup Checklist

```bash
# 1. Create workflow directories
mkdir -p .claude/workflows
mkdir -p .claude/signals/pending
mkdir -p .claude/signals/completed
mkdir -p .claude/signals/failed

# 2. Create signal file templates
touch .claude/signals/SIGNAL_SCHEMA.json

# 3. Verify workflow scripts exist
ls core/scripts/wave-orchestrator.sh
ls core/scripts/pre-flight-validator.sh
ls core/scripts/merge-watcher-v12.sh

# 4. Test signal detection
./core/scripts/signal-watcher.sh --test
```

---

## Part 4: Quick Reference

### Workflow Commands

| Command | Description |
|---------|-------------|
| `./wave-start.sh --project /path --wave 1` | Start wave execution |
| `./core/scripts/pre-flight-validator.sh` | Run pre-flight checks |
| `./core/scripts/merge-watcher-v12.sh` | Start merge watcher |
| `echo "STOP" > .claude/EMERGENCY-STOP` | Emergency stop |
| `/wave-status` | Check pipeline status |
| `/preflight` | Run pre-flight from Claude Code |

### SDK Quick Reference

| SDK | Install | Import |
|-----|---------|--------|
| Anthropic (Py) | `pip install anthropic` | `from anthropic import Anthropic` |
| Anthropic (JS) | `npm i @anthropic-ai/sdk` | `import Anthropic from '@anthropic-ai/sdk'` |
| LangGraph | `pip install langgraph` | `from langgraph.graph import StateGraph` |
| RLM | `pip install rlm` | `from rlm import RLMAgent` |
| Supabase | `npm i @supabase/supabase-js` | `import { createClient }` |

### MCP Server Tools

| Server | Key Tools |
|--------|-----------|
| Memory | `store`, `retrieve`, `delete`, `list` |
| Sequential | `think_step_by_step`, `decompose_problem` |
| GitHub | `create_issue`, `create_pull_request`, `merge_pull_request` |
| Git | `git_status`, `git_diff`, `git_commit` |
| DBHub | `query`, `execute`, `describe_table` |

---

**Document Generated By:** Claude Opus 4.5 (CTO Master Agent)
**Date:** February 5, 2026

---

**END OF WORKFLOWS, TOOLS & SDKs ADDENDUM**
