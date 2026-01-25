# WAVE Portal Enhancement Roadmap

## Implementation Progress Tracker

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        WAVE PORTAL v2.0 ENHANCEMENT                          ║
║                                                                              ║
║  Overall Progress: [░░░░░░░░░░░░░░░░░░░░] 0%                                ║
║                                                                              ║
║  Phase A: Orchestrator Skeleton    [░░░░░░░░░░] 0%   ⏱️ 1-2 days            ║
║  Phase B: Constitutional Scorer    [░░░░░░░░░░] 0%   ⏱️ 1 day               ║
║  Phase C: Portal API Extensions    [░░░░░░░░░░] 0%   ⏱️ 1-2 days            ║
║  Phase D: Portal UI Enhancements   [░░░░░░░░░░] 0%   ⏱️ 2-3 days            ║
║  Phase E: Database Migrations      [░░░░░░░░░░] 0%   ⏱️ 0.5 days            ║
║  Phase F: Integration & Testing    [░░░░░░░░░░] 0%   ⏱️ 1-2 days            ║
║                                                                              ║
║  Target: 8.8/10 → 10/10 (Full Hybrid v3)                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Quick Navigation

| Phase | Name | Priority | Status | Link |
|-------|------|----------|--------|------|
| A | Orchestrator Skeleton | 🔴 CRITICAL | ⬜ Not Started | [Jump to Phase A](#phase-a-orchestrator-skeleton) |
| B | Constitutional Scorer | 🔴 CRITICAL | ⬜ Not Started | [Jump to Phase B](#phase-b-constitutional-scorer) |
| C | Portal API Extensions | 🟠 HIGH | ⬜ Not Started | [Jump to Phase C](#phase-c-portal-api-extensions) |
| D | Portal UI Enhancements | 🟠 HIGH | ⬜ Not Started | [Jump to Phase D](#phase-d-portal-ui-enhancements) |
| E | Database Migrations | 🟡 MEDIUM | ⬜ Not Started | [Jump to Phase E](#phase-e-database-migrations) |
| F | Integration & Testing | 🟠 HIGH | ⬜ Not Started | [Jump to Phase F](#phase-f-integration--testing) |

---

## Phase A: Orchestrator Skeleton

### Progress: ░░░░░░░░░░ 0% (0/12 tasks)

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE A: Python LangGraph Orchestrator                         │
│  ─────────────────────────────────────────────────────────────  │
│  Priority: 🔴 CRITICAL (Enables all other phases)               │
│  Estimated Time: 1-2 days                                       │
│  Dependencies: None (Entry Point)                               │
│  Output: Running FastAPI server on port 8000                    │
└─────────────────────────────────────────────────────────────────┘
```

### Pre-Flight Checklist

- [ ] Python 3.11+ installed
- [ ] Redis server available (local or Docker)
- [ ] Anthropic API key configured
- [ ] Virtual environment ready

### Step-by-Step Implementation

#### A.1 Directory Setup (10 min)
```bash
# Create orchestrator directory structure
mkdir -p /Volumes/SSD-01/Projects/WAVE/orchestrator
cd /Volumes/SSD-01/Projects/WAVE/orchestrator

mkdir -p nodes tools checkpointer tests
touch __init__.py main.py graph.py state.py
touch nodes/__init__.py nodes/cto.py nodes/pm.py nodes/dev.py nodes/qa.py nodes/supervisor.py
touch tools/__init__.py tools/git_tools.py tools/constitutional_scorer.py tools/file_tools.py
touch checkpointer/__init__.py checkpointer/supabase.py
touch requirements.txt .env
```

**Verification:**
```bash
tree /Volumes/SSD-01/Projects/WAVE/orchestrator
```

- [ ] **A.1 COMPLETE** - Directory structure created

---

#### A.2 Dependencies Setup (5 min)

**File:** `requirements.txt`
```txt
# Core
langgraph>=0.2.0
langchain-anthropic>=0.3.0
langchain-core>=0.3.0

# State & Validation
pydantic>=2.0.0
pydantic-settings>=2.0.0

# API Server
fastapi>=0.115.0
uvicorn[standard]>=0.34.0

# Database & Cache
sqlalchemy>=2.0.0
redis>=5.0.0
asyncpg>=0.30.0

# Git Operations
pygit2>=1.14.0

# Utilities
python-dotenv>=1.0.0
httpx>=0.28.0
```

**Install:**
```bash
cd /Volumes/SSD-01/Projects/WAVE/orchestrator
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Verification:**
```bash
python -c "import langgraph; import fastapi; print('Dependencies OK')"
```

- [ ] **A.2 COMPLETE** - Dependencies installed

---

#### A.3 Environment Configuration (5 min)

**File:** `.env`
```bash
# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Redis
REDIS_URL=redis://localhost:6379

# Supabase (for checkpointing)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true

# Safety Thresholds
CONSTITUTIONAL_BLOCK_THRESHOLD=0.7
CONSTITUTIONAL_ESCALATE_THRESHOLD=0.85

# Budget Limits
DEFAULT_TOKEN_LIMIT=100000
DEFAULT_COST_LIMIT_USD=10.0
```

- [ ] **A.3 COMPLETE** - Environment configured

---

#### A.4 State Schema (30 min)

**File:** `state.py`

```python
"""
WAVE Orchestrator State Schema
Typed, nested state for LangGraph checkpointing
"""

from typing import Literal, Optional, Annotated
from pydantic import BaseModel, Field
from datetime import datetime
from operator import add

# ============================================
# Sub-State Models
# ============================================

class GitState(BaseModel):
    """Git worktree state"""
    branch: str = ""
    commit_hash: str = ""
    worktree_path: str = ""
    files_changed: list[str] = Field(default_factory=list)
    has_uncommitted: bool = False

class BudgetState(BaseModel):
    """Token/cost budget tracking"""
    tokens_used: int = 0
    tokens_limit: int = 100000
    cost_usd: float = 0.0
    cost_limit_usd: float = 10.0

    @property
    def is_exceeded(self) -> bool:
        return self.tokens_used >= self.tokens_limit or self.cost_usd >= self.cost_limit_usd

    @property
    def utilization_percent(self) -> float:
        return min(100, (self.tokens_used / self.tokens_limit) * 100)

class SafetyState(BaseModel):
    """Constitutional AI safety state"""
    score: float = 1.0  # 0-1, 1 is safe
    violations: list[str] = Field(default_factory=list)
    blocked_actions: list[str] = Field(default_factory=list)

    @property
    def requires_human_review(self) -> bool:
        return self.score < 0.85

    @property
    def should_block(self) -> bool:
        return self.score < 0.7

class GateState(BaseModel):
    """Gate progression state"""
    current_gate: int = 0
    gate_status: Literal["pending", "go", "hold", "kill", "recycle"] = "pending"
    hold_reason: Optional[str] = None
    kill_reason: Optional[str] = None
    recycle_count: int = 0
    max_recycles: int = 3

class AgentOutput(BaseModel):
    """Individual agent output"""
    agent: str
    action: str
    result: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tokens_used: int = 0
    safety_score: float = 1.0
    tool_calls: list[str] = Field(default_factory=list)

# ============================================
# Master State
# ============================================

class WAVEState(BaseModel):
    """
    Master state for WAVE orchestrator
    Checkpointed by LangGraph for crash recovery
    """
    # Identity
    project_id: str
    story_id: str
    thread_id: str = ""

    # Domain context
    domain: str = ""
    prompt: str = ""
    plan: str = ""
    acceptance_criteria: list[str] = Field(default_factory=list)

    # Sub-states
    git: GitState = Field(default_factory=GitState)
    budget: BudgetState = Field(default_factory=BudgetState)
    safety: SafetyState = Field(default_factory=SafetyState)
    gate: GateState = Field(default_factory=GateState)

    # Execution tracking
    phase: Literal[
        "initializing",
        "planning",
        "development",
        "testing",
        "review",
        "complete",
        "failed",
        "held",
        "killed"
    ] = "initializing"
    current_agent: str = ""
    iteration: int = 0
    max_iterations: int = 10

    # Outputs (use Annotated for reducer)
    messages: Annotated[list[dict], add] = Field(default_factory=list)
    agent_outputs: list[AgentOutput] = Field(default_factory=list)

    # Results
    files_created: list[str] = Field(default_factory=list)
    files_modified: list[str] = Field(default_factory=list)
    tests_passed: int = 0
    tests_failed: int = 0
    test_output: str = ""

    # Error handling
    error: Optional[str] = None
    error_count: int = 0
    max_errors: int = 3

    # Metadata
    started_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def add_agent_output(self, output: AgentOutput):
        """Add agent output and update budget"""
        self.agent_outputs.append(output)
        self.budget.tokens_used += output.tokens_used
        self.updated_at = datetime.utcnow()

    def should_stop(self) -> bool:
        """Check if orchestrator should stop"""
        return (
            self.phase in ["complete", "failed", "killed"] or
            self.gate.gate_status in ["kill", "hold"] or
            self.budget.is_exceeded or
            self.safety.should_block or
            self.iteration >= self.max_iterations or
            self.error_count >= self.max_errors
        )
```

**Verification:**
```bash
python -c "from state import WAVEState; s = WAVEState(project_id='test', story_id='1'); print(s.model_dump_json(indent=2))"
```

- [ ] **A.4 COMPLETE** - State schema implemented

---

#### A.5 Agent Nodes (1 hour)

**File:** `nodes/cto.py`
```python
"""CTO Master Node - Architecture & Approval"""

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from state import WAVEState, AgentOutput
from datetime import datetime

llm = ChatAnthropic(model="claude-sonnet-4-20250514", max_tokens=4096)

CTO_SYSTEM = """You are the CTO Master agent in the WAVE development system.

Your responsibilities:
1. Review and approve architectural decisions
2. Ensure code quality standards
3. Make Go/Hold/Kill decisions on stories
4. Escalate safety concerns

Current context:
- Project: {project_id}
- Story: {story_id}
- Phase: {phase}
- Safety Score: {safety_score}
- Budget Used: {budget_percent}%

Respond with your decision and reasoning."""

async def cto_node(state: WAVEState) -> WAVEState:
    """CTO Master reviews and approves"""
    state.current_agent = "cto"
    state.phase = "review"

    messages = [
        SystemMessage(content=CTO_SYSTEM.format(
            project_id=state.project_id,
            story_id=state.story_id,
            phase=state.phase,
            safety_score=state.safety.score,
            budget_percent=state.budget.utilization_percent
        )),
        HumanMessage(content=f"""
Review this story:

PROMPT: {state.prompt}

PLAN: {state.plan}

AGENT OUTPUTS:
{chr(10).join(f"- {o.agent}: {o.action}" for o in state.agent_outputs[-5:])}

Provide your assessment and decision (GO/HOLD/KILL).
""")
    ]

    response = await llm.ainvoke(messages)

    output = AgentOutput(
        agent="cto",
        action="review",
        result=response.content,
        tokens_used=response.usage_metadata.get("total_tokens", 0) if hasattr(response, "usage_metadata") else 500
    )
    state.add_agent_output(output)

    # Parse decision from response
    content_lower = response.content.lower()
    if "kill" in content_lower:
        state.gate.gate_status = "kill"
        state.gate.kill_reason = "CTO decision"
        state.phase = "killed"
    elif "hold" in content_lower:
        state.gate.gate_status = "hold"
        state.gate.hold_reason = "CTO review required"
        state.phase = "held"
    else:
        state.gate.gate_status = "go"

    return state
```

**File:** `nodes/pm.py`
```python
"""PM Node - Planning & Requirements"""

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from state import WAVEState, AgentOutput

llm = ChatAnthropic(model="claude-sonnet-4-20250514", max_tokens=4096)

PM_SYSTEM = """You are the PM agent in the WAVE development system.

Your responsibilities:
1. Break down stories into tasks
2. Define acceptance criteria
3. Estimate effort
4. Prioritize work

Respond with a clear plan."""

async def pm_node(state: WAVEState) -> WAVEState:
    """PM creates execution plan"""
    state.current_agent = "pm"
    state.phase = "planning"

    messages = [
        SystemMessage(content=PM_SYSTEM),
        HumanMessage(content=f"""
Create an execution plan for:

STORY: {state.prompt}

DOMAIN: {state.domain}

Provide:
1. Task breakdown
2. Acceptance criteria
3. Estimated complexity
""")
    ]

    response = await llm.ainvoke(messages)

    output = AgentOutput(
        agent="pm",
        action="plan",
        result=response.content,
        tokens_used=response.usage_metadata.get("total_tokens", 0) if hasattr(response, "usage_metadata") else 500
    )
    state.add_agent_output(output)
    state.plan = response.content

    return state
```

**File:** `nodes/dev.py`
```python
"""Developer Node - Code Implementation"""

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from state import WAVEState, AgentOutput

llm = ChatAnthropic(model="claude-sonnet-4-20250514", max_tokens=8192)

DEV_SYSTEM = """You are the Developer agent in the WAVE development system.

Your responsibilities:
1. Implement features according to plan
2. Write clean, tested code
3. Follow security best practices
4. Document your changes

Current iteration: {iteration}/{max_iterations}
Files created: {files_count}"""

async def dev_node(state: WAVEState) -> WAVEState:
    """Developer implements code"""
    state.current_agent = "dev"
    state.phase = "development"
    state.iteration += 1

    messages = [
        SystemMessage(content=DEV_SYSTEM.format(
            iteration=state.iteration,
            max_iterations=state.max_iterations,
            files_count=len(state.files_created)
        )),
        HumanMessage(content=f"""
Implement the following:

PLAN:
{state.plan}

PREVIOUS WORK:
{chr(10).join(f"- {f}" for f in state.files_created[-5:])}

{f"TEST FAILURES: {state.test_output}" if state.tests_failed > 0 else ""}

Provide the implementation.
""")
    ]

    response = await llm.ainvoke(messages)

    output = AgentOutput(
        agent="dev",
        action="implement",
        result=response.content,
        tokens_used=response.usage_metadata.get("total_tokens", 0) if hasattr(response, "usage_metadata") else 1000
    )
    state.add_agent_output(output)

    # TODO: Parse response for file operations
    # For now, just track that dev node ran

    return state
```

**File:** `nodes/qa.py`
```python
"""QA Node - Testing & Validation"""

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from state import WAVEState, AgentOutput

llm = ChatAnthropic(model="claude-sonnet-4-20250514", max_tokens=4096)

QA_SYSTEM = """You are the QA agent in the WAVE development system.

Your responsibilities:
1. Review code for bugs and issues
2. Verify acceptance criteria
3. Run and validate tests
4. Report quality metrics"""

async def qa_node(state: WAVEState) -> WAVEState:
    """QA tests and validates"""
    state.current_agent = "qa"
    state.phase = "testing"

    messages = [
        SystemMessage(content=QA_SYSTEM),
        HumanMessage(content=f"""
Review and test the implementation:

ACCEPTANCE CRITERIA:
{chr(10).join(f"- {c}" for c in state.acceptance_criteria) or "Not specified"}

FILES CREATED/MODIFIED:
{chr(10).join(f"- {f}" for f in state.files_created + state.files_modified)}

DEVELOPER OUTPUT:
{state.agent_outputs[-1].result if state.agent_outputs else "No output"}

Provide test results and quality assessment.
""")
    ]

    response = await llm.ainvoke(messages)

    output = AgentOutput(
        agent="qa",
        action="test",
        result=response.content,
        tokens_used=response.usage_metadata.get("total_tokens", 0) if hasattr(response, "usage_metadata") else 500
    )
    state.add_agent_output(output)

    # Parse test results (simplified)
    content_lower = response.content.lower()
    if "pass" in content_lower and "fail" not in content_lower:
        state.tests_passed += 1
    elif "fail" in content_lower:
        state.tests_failed += 1
        state.test_output = response.content

    return state
```

**File:** `nodes/supervisor.py`
```python
"""Supervisor Node - Orchestration Decisions"""

from state import WAVEState, AgentOutput
from datetime import datetime

async def supervisor_node(state: WAVEState) -> WAVEState:
    """Supervisor decides next action"""
    state.current_agent = "supervisor"

    # Check termination conditions
    if state.should_stop():
        if state.gate.gate_status == "kill":
            state.phase = "killed"
        elif state.gate.gate_status == "hold":
            state.phase = "held"
        elif state.budget.is_exceeded:
            state.phase = "failed"
            state.error = "Budget exceeded"
        elif state.safety.should_block:
            state.phase = "failed"
            state.error = f"Safety blocked: {state.safety.violations}"
        elif state.tests_passed > 0 and state.tests_failed == 0:
            state.phase = "complete"
        else:
            state.phase = "failed"
            state.error = "Max iterations reached"
    else:
        # Continue development if tests failing
        if state.tests_failed > 0:
            state.phase = "development"
        # Move to review if tests passing
        elif state.tests_passed > 0:
            state.phase = "review"
        else:
            state.phase = "development"

    output = AgentOutput(
        agent="supervisor",
        action="decide",
        result=f"Phase: {state.phase}, Gate: {state.gate.gate_status}"
    )
    state.add_agent_output(output)

    return state

def route_supervisor(state: WAVEState) -> str:
    """Route based on supervisor decision"""
    if state.phase in ["complete", "killed", "held", "failed"]:
        return "end"
    if state.phase == "review":
        return "cto"
    if state.phase == "development":
        return "dev"
    return "end"
```

- [ ] **A.5 COMPLETE** - Agent nodes implemented

---

#### A.6 LangGraph Definition (30 min)

**File:** `graph.py`
```python
"""
WAVE LangGraph Orchestrator
Multi-agent graph with checkpointing
"""

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from state import WAVEState
from nodes.cto import cto_node
from nodes.pm import pm_node
from nodes.dev import dev_node
from nodes.qa import qa_node
from nodes.supervisor import supervisor_node, route_supervisor

def create_graph():
    """Create and compile the WAVE orchestrator graph"""

    # Create graph builder
    builder = StateGraph(WAVEState)

    # Add nodes
    builder.add_node("cto", cto_node)
    builder.add_node("pm", pm_node)
    builder.add_node("dev", dev_node)
    builder.add_node("qa", qa_node)
    builder.add_node("supervisor", supervisor_node)

    # Set entry point
    builder.set_entry_point("pm")  # Start with planning

    # Define edges
    builder.add_edge("pm", "dev")
    builder.add_edge("dev", "qa")
    builder.add_edge("qa", "supervisor")

    # Conditional routing from supervisor
    builder.add_conditional_edges(
        "supervisor",
        route_supervisor,
        {
            "cto": "cto",
            "dev": "dev",
            "end": END
        }
    )

    # CTO can approve (end) or send back
    builder.add_conditional_edges(
        "cto",
        lambda s: "end" if s.gate.gate_status in ["kill", "hold"] or s.phase == "complete" else "dev",
        {
            "end": END,
            "dev": "dev"
        }
    )

    # Compile with checkpointer
    checkpointer = MemorySaver()
    return builder.compile(checkpointer=checkpointer), checkpointer

# Create global instances
app, checkpointer = create_graph()
```

**Verification:**
```bash
python -c "from graph import app; print('Graph compiled:', app)"
```

- [ ] **A.6 COMPLETE** - Graph compiled

---

#### A.7 FastAPI Server (45 min)

**File:** `main.py`
```python
"""
WAVE Orchestrator API Server
FastAPI server bridging Portal with LangGraph
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import redis.asyncio as redis
import json
import os
from datetime import datetime
from dotenv import load_dotenv

from graph import app as langgraph_app, checkpointer
from state import WAVEState

load_dotenv()

# ============================================
# App Setup
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle"""
    # Startup
    app.state.redis = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
    print("🚀 WAVE Orchestrator started")
    yield
    # Shutdown
    await app.state.redis.close()
    print("👋 WAVE Orchestrator stopped")

app = FastAPI(
    title="WAVE Orchestrator",
    version="1.0.0",
    description="LangGraph-based multi-agent orchestrator for WAVE",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        os.getenv("PORTAL_URL", "")
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Request/Response Models
# ============================================

class StartRequest(BaseModel):
    project_id: str
    story_id: str
    domain: str = ""
    prompt: str
    plan: str = ""
    acceptance_criteria: list[str] = []

class StartResponse(BaseModel):
    success: bool
    thread_id: str
    message: str

class StatusResponse(BaseModel):
    thread_id: str
    phase: str
    current_agent: str
    iteration: int
    safety_score: float
    gate_status: str
    tokens_used: int
    budget_percent: float
    tests_passed: int
    tests_failed: int
    error: str | None
    updated_at: str

class ActionRequest(BaseModel):
    reason: str = ""

# ============================================
# Active Runs Tracking
# ============================================

active_runs: dict[str, dict] = {}

# ============================================
# Endpoints
# ============================================

@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "service": "wave-orchestrator",
        "timestamp": datetime.utcnow().isoformat(),
        "active_runs": len(active_runs)
    }

@app.post("/orchestrator/start", response_model=StartResponse)
async def start_orchestrator(req: StartRequest, background_tasks: BackgroundTasks):
    """Start a new orchestrator run"""

    thread_id = f"{req.project_id}-{req.story_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    # Check if already running
    if thread_id in active_runs:
        raise HTTPException(400, "Run already in progress for this story")

    # Create initial state
    initial_state = WAVEState(
        project_id=req.project_id,
        story_id=req.story_id,
        thread_id=thread_id,
        domain=req.domain,
        prompt=req.prompt,
        plan=req.plan,
        acceptance_criteria=req.acceptance_criteria
    )

    # Track run
    active_runs[thread_id] = {
        "status": "starting",
        "started_at": datetime.utcnow().isoformat()
    }

    # Run in background
    background_tasks.add_task(run_orchestrator, thread_id, initial_state, app.state.redis)

    return StartResponse(
        success=True,
        thread_id=thread_id,
        message="Orchestrator run started"
    )

async def run_orchestrator(thread_id: str, initial_state: WAVEState, redis_client):
    """Background task to run LangGraph"""
    config = {"configurable": {"thread_id": thread_id}}

    try:
        active_runs[thread_id]["status"] = "running"

        async for output in langgraph_app.astream(initial_state.model_dump(), config):
            # Get current state
            node_name = list(output.keys())[0]
            node_state = output[node_name]

            # Publish update to Redis
            await redis_client.publish("wave-orchestrator", json.dumps({
                "thread_id": thread_id,
                "event": "node_complete",
                "node": node_name,
                "phase": node_state.get("phase", "unknown"),
                "agent": node_state.get("current_agent", ""),
                "timestamp": datetime.utcnow().isoformat()
            }))

            # Update active runs
            active_runs[thread_id]["last_node"] = node_name
            active_runs[thread_id]["phase"] = node_state.get("phase", "unknown")

        # Mark complete
        active_runs[thread_id]["status"] = "complete"
        await redis_client.publish("wave-orchestrator", json.dumps({
            "thread_id": thread_id,
            "event": "complete",
            "timestamp": datetime.utcnow().isoformat()
        }))

    except Exception as e:
        active_runs[thread_id]["status"] = "error"
        active_runs[thread_id]["error"] = str(e)
        await redis_client.publish("wave-orchestrator", json.dumps({
            "thread_id": thread_id,
            "event": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }))

@app.get("/orchestrator/status/{thread_id}", response_model=StatusResponse)
async def get_status(thread_id: str):
    """Get current status of a run"""

    # Get from checkpointer
    config = {"configurable": {"thread_id": thread_id}}
    checkpoint = checkpointer.get(config)

    if not checkpoint:
        # Check active runs
        if thread_id in active_runs:
            return StatusResponse(
                thread_id=thread_id,
                phase=active_runs[thread_id].get("phase", "starting"),
                current_agent="",
                iteration=0,
                safety_score=1.0,
                gate_status="pending",
                tokens_used=0,
                budget_percent=0,
                tests_passed=0,
                tests_failed=0,
                error=active_runs[thread_id].get("error"),
                updated_at=active_runs[thread_id].get("started_at", "")
            )
        raise HTTPException(404, "Thread not found")

    state = checkpoint.get("channel_values", {})

    return StatusResponse(
        thread_id=thread_id,
        phase=state.get("phase", "unknown"),
        current_agent=state.get("current_agent", ""),
        iteration=state.get("iteration", 0),
        safety_score=state.get("safety", {}).get("score", 1.0),
        gate_status=state.get("gate", {}).get("gate_status", "pending"),
        tokens_used=state.get("budget", {}).get("tokens_used", 0),
        budget_percent=state.get("budget", {}).get("tokens_used", 0) / state.get("budget", {}).get("tokens_limit", 100000) * 100,
        tests_passed=state.get("tests_passed", 0),
        tests_failed=state.get("tests_failed", 0),
        error=state.get("error"),
        updated_at=state.get("updated_at", datetime.utcnow().isoformat())
    )

@app.post("/orchestrator/hold/{thread_id}")
async def hold_orchestrator(thread_id: str, req: ActionRequest):
    """Hold (pause) a run"""
    config = {"configurable": {"thread_id": thread_id}}
    checkpoint = checkpointer.get(config)

    if not checkpoint:
        raise HTTPException(404, "Thread not found")

    # Update state
    state = checkpoint.get("channel_values", {})
    state["gate"] = state.get("gate", {})
    state["gate"]["gate_status"] = "hold"
    state["gate"]["hold_reason"] = req.reason or "Manual hold"
    state["phase"] = "held"

    # Note: In production, use proper checkpointer update
    active_runs[thread_id]["status"] = "held"

    return {"success": True, "status": "held", "thread_id": thread_id}

@app.post("/orchestrator/resume/{thread_id}")
async def resume_orchestrator(thread_id: str, background_tasks: BackgroundTasks):
    """Resume a held run"""
    config = {"configurable": {"thread_id": thread_id}}
    checkpoint = checkpointer.get(config)

    if not checkpoint:
        raise HTTPException(404, "Thread not found")

    state = checkpoint.get("channel_values", {})
    state["gate"]["gate_status"] = "go"
    state["gate"]["hold_reason"] = None
    state["phase"] = "development"

    # Resume in background
    background_tasks.add_task(
        run_orchestrator,
        thread_id,
        WAVEState(**state),
        app.state.redis
    )

    return {"success": True, "status": "resumed", "thread_id": thread_id}

@app.post("/orchestrator/kill/{thread_id}")
async def kill_orchestrator(thread_id: str, req: ActionRequest):
    """Kill (abandon) a run"""
    if not req.reason:
        raise HTTPException(400, "Reason is required to kill a run")

    config = {"configurable": {"thread_id": thread_id}}
    checkpoint = checkpointer.get(config)

    if not checkpoint:
        raise HTTPException(404, "Thread not found")

    state = checkpoint.get("channel_values", {})
    state["gate"] = state.get("gate", {})
    state["gate"]["gate_status"] = "kill"
    state["gate"]["kill_reason"] = req.reason
    state["phase"] = "killed"

    active_runs[thread_id]["status"] = "killed"

    return {"success": True, "status": "killed", "thread_id": thread_id}

@app.get("/orchestrator/runs")
async def list_runs():
    """List all runs"""
    return {
        "runs": [
            {"thread_id": tid, **info}
            for tid, info in active_runs.items()
        ]
    }

# ============================================
# Main
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "false").lower() == "true"
    )
```

- [ ] **A.7 COMPLETE** - FastAPI server implemented

---

#### A.8 Test & Run (15 min)

```bash
# Terminal 1: Start Redis
docker run -p 6379:6379 redis:7-alpine

# Terminal 2: Start orchestrator
cd /Volumes/SSD-01/Projects/WAVE/orchestrator
source venv/bin/activate
python main.py

# Terminal 3: Test endpoints
curl http://localhost:8000/health

curl -X POST http://localhost:8000/orchestrator/start \
  -H "Content-Type: application/json" \
  -d '{"project_id": "test-1", "story_id": "story-1", "prompt": "Create a hello world function"}'

# Check status
curl http://localhost:8000/orchestrator/status/test-1-story-1-TIMESTAMP
```

- [ ] **A.8 COMPLETE** - Orchestrator running and tested

---

### Phase A Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ PHASE A COMPLETE                                            │
│  ─────────────────────────────────────────────────────────────  │
│  Deliverables:                                                  │
│  • Python orchestrator with LangGraph                           │
│  • Multi-agent nodes (CTO, PM, Dev, QA, Supervisor)            │
│  • FastAPI server on port 8000                                  │
│  • Redis pub/sub for real-time updates                         │
│  • Checkpointing for crash recovery                            │
└─────────────────────────────────────────────────────────────────┘
```

- [ ] **PHASE A COMPLETE** ✓

---

## Phase B: Constitutional Scorer

### Progress: ░░░░░░░░░░ 0% (0/4 tasks)

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE B: Constitutional AI Safety Scoring                      │
│  ─────────────────────────────────────────────────────────────  │
│  Priority: 🔴 CRITICAL (Runtime safety enforcement)             │
│  Estimated Time: 1 day                                          │
│  Dependencies: Phase A                                          │
│  Output: Safety scoring before all tool calls                   │
└─────────────────────────────────────────────────────────────────┘
```

#### B.1 Constitutional Principles (15 min)

**File:** `tools/constitutional_scorer.py`
```python
"""
Constitutional AI Scorer
Evaluates actions against safety principles
"""

from typing import Tuple
from anthropic import Anthropic
import json
import os

# Safety Principles (Based on WAVE requirements)
PRINCIPLES = [
    # Security
    "Never execute destructive commands (rm -rf, DROP TABLE, format, etc.)",
    "Never expose secrets, API keys, passwords, or credentials",
    "Never bypass authentication or authorization controls",
    "Never disable security features or logging",

    # Data Integrity
    "Always preserve user data - never delete without explicit approval",
    "Always validate input before processing",
    "Never store sensitive data in plain text or logs",

    # System Safety
    "Never modify production systems without explicit approval",
    "Always respect rate limits and resource quotas",
    "Never make unauthorized external network requests",

    # Compliance
    "Always maintain audit trail for all changes",
    "Always follow the approved plan - no scope creep",
    "Never skip required validation gates",
]

client = Anthropic()

SCORER_PROMPT = """Evaluate this action against safety principles.

ACTION TO EVALUATE:
{action}

CONTEXT:
{context}

SAFETY PRINCIPLES:
{principles}

Analyze the action and respond with ONLY valid JSON:
{{
    "score": <float 0.0-1.0, where 1.0 is completely safe>,
    "violations": [<list of violated principles, empty if none>],
    "risks": [<potential risks even if not violations>],
    "reasoning": "<brief explanation>"
}}
"""

def score_action(action: str, context: str = "") -> Tuple[float, list[str], list[str]]:
    """
    Score an action against constitutional principles.

    Args:
        action: The action/command to evaluate
        context: Additional context about the action

    Returns:
        Tuple of (score, violations, risks)
        - score: 0.0-1.0 where 1.0 is fully safe
        - violations: List of violated principles
        - risks: List of potential risks
    """
    principles_text = "\n".join(f"{i+1}. {p}" for i, p in enumerate(PRINCIPLES))

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": SCORER_PROMPT.format(
                    action=action,
                    context=context,
                    principles=principles_text
                )
            }]
        )

        result = json.loads(response.content[0].text)
        return (
            float(result.get("score", 1.0)),
            result.get("violations", []),
            result.get("risks", [])
        )

    except json.JSONDecodeError:
        # If parsing fails, be conservative
        return 0.5, ["Could not parse safety response"], ["Unknown risk"]
    except Exception as e:
        # On error, block by default
        return 0.0, [f"Safety check error: {str(e)}"], ["System error"]

def should_block(score: float) -> bool:
    """Determine if action should be blocked"""
    threshold = float(os.getenv("CONSTITUTIONAL_BLOCK_THRESHOLD", "0.7"))
    return score < threshold

def should_escalate(score: float) -> bool:
    """Determine if action needs human review"""
    threshold = float(os.getenv("CONSTITUTIONAL_ESCALATE_THRESHOLD", "0.85"))
    return score < threshold

def evaluate_tool_call(tool_name: str, tool_args: dict, context: str = "") -> dict:
    """
    Evaluate a tool call before execution.

    Returns:
        {
            "allowed": bool,
            "score": float,
            "violations": list,
            "risks": list,
            "requires_review": bool
        }
    """
    action = f"Tool: {tool_name}\nArguments: {json.dumps(tool_args, indent=2)}"

    score, violations, risks = score_action(action, context)

    return {
        "allowed": not should_block(score),
        "score": score,
        "violations": violations,
        "risks": risks,
        "requires_review": should_escalate(score)
    }
```

- [ ] **B.1 COMPLETE** - Constitutional principles defined

---

#### B.2 Integrate with Nodes (30 min)

Update each node to use constitutional scoring before tool calls.

**Add to `nodes/dev.py`:**
```python
from tools.constitutional_scorer import evaluate_tool_call

async def dev_node(state: WAVEState) -> WAVEState:
    # ... existing code ...

    # Before any tool call:
    def safe_tool_call(tool_name: str, tool_args: dict) -> dict:
        evaluation = evaluate_tool_call(
            tool_name,
            tool_args,
            context=f"Project: {state.project_id}, Story: {state.story_id}"
        )

        if not evaluation["allowed"]:
            state.safety.violations.extend(evaluation["violations"])
            state.safety.blocked_actions.append(f"{tool_name}: {evaluation['violations']}")
            state.safety.score = min(state.safety.score, evaluation["score"])
            return {"blocked": True, "reason": evaluation["violations"]}

        if evaluation["requires_review"]:
            state.safety.score = min(state.safety.score, evaluation["score"])
            # Continue but flag for review

        # Execute tool
        return execute_tool(tool_name, tool_args)

    # ... rest of implementation ...
```

- [ ] **B.2 COMPLETE** - Scoring integrated with nodes

---

#### B.3 Safety Check Node (20 min)

**Add to `graph.py`:**
```python
from tools.constitutional_scorer import should_block

async def safety_gate_node(state: WAVEState) -> WAVEState:
    """Safety checkpoint before critical operations"""

    if state.safety.should_block:
        state.gate.gate_status = "hold"
        state.gate.hold_reason = f"Safety violations: {state.safety.violations}"
        state.phase = "held"

    return state

# Add to graph
builder.add_node("safety_gate", safety_gate_node)

# Add edges to route through safety gate
builder.add_edge("dev", "safety_gate")
builder.add_edge("safety_gate", "qa")
```

- [ ] **B.3 COMPLETE** - Safety gate node added

---

#### B.4 Test Constitutional Scorer (15 min)

```bash
cd /Volumes/SSD-01/Projects/WAVE/orchestrator
python -c "
from tools.constitutional_scorer import score_action, evaluate_tool_call

# Test safe action
score, violations, risks = score_action('Create a new file: hello.py')
print(f'Safe action: score={score}, violations={violations}')

# Test dangerous action
score, violations, risks = score_action('rm -rf /')
print(f'Dangerous action: score={score}, violations={violations}')

# Test tool call
result = evaluate_tool_call('bash', {'command': 'rm -rf /tmp/*'})
print(f'Tool evaluation: {result}')
"
```

- [ ] **B.4 COMPLETE** - Constitutional scorer tested

---

### Phase B Summary

- [ ] **PHASE B COMPLETE** ✓

---

## Phase C: Portal API Extensions

### Progress: ░░░░░░░░░░ 0% (0/5 tasks)

*(Continue with detailed steps for C.1-C.5)*

---

## Phase D: Portal UI Enhancements

### Progress: ░░░░░░░░░░ 0% (0/6 tasks)

*(Continue with detailed steps for D.1-D.6)*

---

## Phase E: Database Migrations

### Progress: ░░░░░░░░░░ 0% (0/3 tasks)

*(Continue with detailed steps for E.1-E.3)*

---

## Phase F: Integration & Testing

### Progress: ░░░░░░░░░░ 0% (0/5 tasks)

*(Continue with detailed steps for F.1-F.5)*

---

## Progress Tracking Template

Update this section as you complete tasks:

```
Last Updated: [DATE]

╔══════════════════════════════════════════════════════════════════════════════╗
║                        WAVE PORTAL v2.0 ENHANCEMENT                          ║
║                                                                              ║
║  Overall Progress: [████████░░░░░░░░░░░░] 40%                               ║
║                                                                              ║
║  Phase A: Orchestrator Skeleton    [██████████] 100% ✅                      ║
║  Phase B: Constitutional Scorer    [██████████] 100% ✅                      ║
║  Phase C: Portal API Extensions    [██████░░░░] 60%  🔄                      ║
║  Phase D: Portal UI Enhancements   [░░░░░░░░░░] 0%   ⏳                      ║
║  Phase E: Database Migrations      [░░░░░░░░░░] 0%   ⏳                      ║
║  Phase F: Integration & Testing    [░░░░░░░░░░] 0%   ⏳                      ║
║                                                                              ║
║  Current: Phase C, Step C.3                                                  ║
║  Blockers: None                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Quick Commands Reference

```bash
# Start all services
cd /Volumes/SSD-01/Projects/WAVE

# Terminal 1: Redis
docker run -p 6379:6379 redis:7-alpine

# Terminal 2: Orchestrator (Python)
cd orchestrator && source venv/bin/activate && python main.py

# Terminal 3: Portal Backend (Node.js)
cd portal && npm run server

# Terminal 4: Portal Frontend (Vite)
cd portal && npm run dev

# Health checks
curl http://localhost:8000/health  # Orchestrator
curl http://localhost:3000/api/health  # Portal Backend
curl http://localhost:5173  # Portal Frontend
```

---

## Rollback Procedures

If something breaks:

1. **Orchestrator issues:**
   ```bash
   cd /Volumes/SSD-01/Projects/WAVE/orchestrator
   git stash  # Save changes
   git checkout main  # Restore
   ```

2. **Portal issues:**
   ```bash
   cd /Volumes/SSD-01/Projects/WAVE/portal
   git stash
   git checkout main
   ```

3. **Database issues:**
   ```sql
   -- Rollback migration
   DROP TABLE IF EXISTS orchestrator_runs;
   DROP TABLE IF EXISTS human_review_queue;
   ```

---

*This roadmap is designed for agent-driven implementation. Copy individual phases as stories.*
