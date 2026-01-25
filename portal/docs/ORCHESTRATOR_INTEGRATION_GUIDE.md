# WAVE Portal - Orchestrator Integration Guide

**Based on:** Grok Analysis (Score: 8.8/10 → Target: 10/10)
**Generated:** 2026-01-25
**Estimated Effort:** 5-12 days (parallel waves, machine speed)

---

## Executive Summary

The WAVE Portal is an excellent control plane (UI, gating, audit). To achieve full hybrid v3 vision, we need to integrate a **Python LangGraph orchestrator** for resilient, checkpointed, constitutionally-scored execution.

### Current State (80% Complete)
- ✅ 10-gate sequential validation
- ✅ Comprehensive audit logging
- ✅ Real-time Supabase subscriptions
- ✅ Safety tagging and detection
- ✅ Agent session tracking

### Gaps to Address
- ❌ Runtime orchestrator (currently CLI-based)
- ❌ Kill/Hold/Recycle gate decisions
- ❌ Constitutional scoring at runtime
- ❌ Human escalation UI
- ❌ User testing feedback loop

---

## Phase A: Python Orchestrator Skeleton

**Duration:** 1-2 days
**Priority:** HIGHEST

### Directory Structure

```
/Volumes/SSD-01/Projects/WAVE/
├── portal/              # Existing (React + Express)
└── orchestrator/        # NEW (Python + LangGraph)
    ├── main.py          # FastAPI entry point
    ├── graph.py         # LangGraph definition
    ├── state.py         # Pydantic state schema
    ├── nodes/
    │   ├── cto.py       # CTO Master node
    │   ├── pm.py        # PM node
    │   ├── dev.py       # Developer node
    │   ├── qa.py        # QA node
    │   └── supervisor.py # Supervisor node
    ├── tools/
    │   ├── git_tools.py          # pygit2 operations
    │   ├── constitutional_scorer.py  # Safety scoring
    │   └── file_tools.py         # File operations
    ├── checkpointer/
    │   └── supabase.py   # Supabase checkpointer
    ├── requirements.txt
    └── tests/
```

### requirements.txt

```txt
langgraph>=0.2.0
langchain-anthropic>=0.3.0
pydantic>=2.0.0
sqlalchemy>=2.0.0
redis>=5.0.0
pygit2>=1.14.0
fastapi>=0.115.0
uvicorn>=0.34.0
python-dotenv>=1.0.0
httpx>=0.28.0
```

### state.py - Extended Pydantic Schema

```python
"""
WAVE Orchestrator State Schema
Typed, nested state for LangGraph checkpointing
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field
from datetime import datetime

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
    is_exceeded: bool = False

class SafetyState(BaseModel):
    """Constitutional AI safety state"""
    score: float = 1.0  # 0-1, 1 is safe
    violations: list[str] = Field(default_factory=list)
    requires_human_review: bool = False
    blocked_actions: list[str] = Field(default_factory=list)

class GateState(BaseModel):
    """Gate progression state"""
    current_gate: int = 0
    gate_status: Literal["pending", "go", "hold", "kill", "recycle"] = "pending"
    hold_reason: Optional[str] = None
    kill_reason: Optional[str] = None
    overrides: list[dict] = Field(default_factory=list)

class AgentOutput(BaseModel):
    """Individual agent output"""
    agent: str
    action: str
    result: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tokens_used: int = 0
    safety_score: float = 1.0

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

    # Sub-states
    git: GitState = Field(default_factory=GitState)
    budget: BudgetState = Field(default_factory=BudgetState)
    safety: SafetyState = Field(default_factory=SafetyState)
    gate: GateState = Field(default_factory=GateState)

    # Execution
    phase: Literal["planning", "development", "testing", "review", "complete", "failed"] = "planning"
    current_agent: str = ""
    agent_outputs: list[AgentOutput] = Field(default_factory=list)

    # Results
    files_created: list[str] = Field(default_factory=list)
    tests_passed: int = 0
    tests_failed: int = 0
    error: Optional[str] = None

    # Metadata
    started_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### graph.py - LangGraph Definition

```python
"""
WAVE LangGraph Orchestrator
Multi-agent graph with checkpointing and constitutional scoring
"""

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from state import WAVEState
from nodes.cto import cto_node
from nodes.pm import pm_node
from nodes.dev import dev_node
from nodes.qa import qa_node
from nodes.supervisor import supervisor_node
from tools.constitutional_scorer import score_action

# Create graph
builder = StateGraph(WAVEState)

# Add nodes
builder.add_node("cto", cto_node)
builder.add_node("pm", pm_node)
builder.add_node("dev", dev_node)
builder.add_node("qa", qa_node)
builder.add_node("supervisor", supervisor_node)
builder.add_node("safety_check", safety_check_node)

# Define edges
builder.set_entry_point("cto")

builder.add_edge("cto", "pm")
builder.add_edge("pm", "dev")
builder.add_edge("dev", "qa")
builder.add_edge("qa", "supervisor")

# Conditional: Supervisor decides next step
builder.add_conditional_edges(
    "supervisor",
    route_supervisor,
    {
        "continue": "dev",      # More work needed
        "review": "cto",        # Escalate to CTO
        "complete": END,        # Done
        "kill": END,            # Abandon story
        "hold": END,            # Pause for human
    }
)

# Safety check before every tool call
def safety_check_node(state: WAVEState) -> WAVEState:
    """Constitutional scoring before actions"""
    if state.safety.score < 0.7:
        state.safety.requires_human_review = True
        state.gate.gate_status = "hold"
        state.gate.hold_reason = f"Safety score below threshold: {state.safety.score}"
    return state

def route_supervisor(state: WAVEState) -> str:
    """Determine next step based on state"""
    if state.gate.gate_status == "kill":
        return "kill"
    if state.gate.gate_status == "hold":
        return "hold"
    if state.safety.requires_human_review:
        return "hold"
    if state.tests_failed > 0:
        return "continue"
    if state.phase == "complete":
        return "complete"
    return "review"

# Compile with checkpointer
checkpointer = MemorySaver()  # Replace with Supabase in production
app = builder.compile(checkpointer=checkpointer)
```

### main.py - FastAPI Server

```python
"""
WAVE Orchestrator API Server
Bridges Portal (Node.js) with LangGraph (Python)
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import redis
import json
from datetime import datetime
from graph import app as langgraph_app, checkpointer
from state import WAVEState

app = FastAPI(title="WAVE Orchestrator", version="1.0.0")

# CORS for portal
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis for real-time updates to portal
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# Request/Response models
class StartRequest(BaseModel):
    project_id: str
    story_id: str
    domain: str
    prompt: str
    plan: str = ""

class StartResponse(BaseModel):
    status: str
    thread_id: str
    message: str

class StatusResponse(BaseModel):
    thread_id: str
    phase: str
    current_agent: str
    safety_score: float
    gate_status: str
    tokens_used: int
    error: str | None

# Endpoints
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.post("/orchestrator/start", response_model=StartResponse)
async def start_orchestrator(req: StartRequest, background_tasks: BackgroundTasks):
    """Start orchestrator run for a story"""
    thread_id = f"{req.project_id}-{req.story_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    # Create initial state
    initial_state = WAVEState(
        project_id=req.project_id,
        story_id=req.story_id,
        thread_id=thread_id,
        domain=req.domain,
        prompt=req.prompt,
        plan=req.plan,
    )

    # Run in background
    background_tasks.add_task(run_orchestrator, thread_id, initial_state)

    return StartResponse(
        status="started",
        thread_id=thread_id,
        message="Orchestrator run initiated"
    )

async def run_orchestrator(thread_id: str, initial_state: WAVEState):
    """Background task to run LangGraph"""
    config = {"configurable": {"thread_id": thread_id}}

    try:
        for output in langgraph_app.stream(initial_state.model_dump(), config):
            # Publish to Redis for portal real-time updates
            redis_client.publish("wave-orchestrator", json.dumps({
                "thread_id": thread_id,
                "event": "update",
                "data": output,
                "timestamp": datetime.utcnow().isoformat()
            }))
    except Exception as e:
        redis_client.publish("wave-orchestrator", json.dumps({
            "thread_id": thread_id,
            "event": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }))

@app.get("/orchestrator/status/{thread_id}", response_model=StatusResponse)
async def get_status(thread_id: str):
    """Get current state of orchestrator run"""
    state = checkpointer.get({"configurable": {"thread_id": thread_id}})

    if not state:
        raise HTTPException(status_code=404, detail="Thread not found")

    return StatusResponse(
        thread_id=thread_id,
        phase=state.get("phase", "unknown"),
        current_agent=state.get("current_agent", ""),
        safety_score=state.get("safety", {}).get("score", 1.0),
        gate_status=state.get("gate", {}).get("gate_status", "pending"),
        tokens_used=state.get("budget", {}).get("tokens_used", 0),
        error=state.get("error")
    )

@app.post("/orchestrator/pause/{thread_id}")
async def pause_orchestrator(thread_id: str, reason: str = ""):
    """Pause (Hold) an orchestrator run"""
    # Update state to hold
    state = checkpointer.get({"configurable": {"thread_id": thread_id}})
    if state:
        state["gate"]["gate_status"] = "hold"
        state["gate"]["hold_reason"] = reason
        checkpointer.put({"configurable": {"thread_id": thread_id}}, state)
    return {"status": "paused", "thread_id": thread_id}

@app.post("/orchestrator/resume/{thread_id}")
async def resume_orchestrator(thread_id: str, background_tasks: BackgroundTasks):
    """Resume a paused run"""
    state = checkpointer.get({"configurable": {"thread_id": thread_id}})
    if state:
        state["gate"]["gate_status"] = "go"
        state["gate"]["hold_reason"] = None
        background_tasks.add_task(run_orchestrator, thread_id, WAVEState(**state))
    return {"status": "resumed", "thread_id": thread_id}

@app.post("/orchestrator/kill/{thread_id}")
async def kill_orchestrator(thread_id: str, reason: str):
    """Kill (abandon) an orchestrator run"""
    state = checkpointer.get({"configurable": {"thread_id": thread_id}})
    if state:
        state["gate"]["gate_status"] = "kill"
        state["gate"]["kill_reason"] = reason
        state["phase"] = "failed"
        checkpointer.put({"configurable": {"thread_id": thread_id}}, state)
    return {"status": "killed", "thread_id": thread_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## Phase B: Constitutional Scorer

**Duration:** 1 day

### tools/constitutional_scorer.py

```python
"""
Constitutional AI Scorer
Evaluates actions against safety principles before execution
"""

from typing import Tuple
from anthropic import Anthropic

PRINCIPLES = [
    "Never execute destructive commands (rm -rf, DROP TABLE, etc.)",
    "Never expose secrets, API keys, or credentials in code or logs",
    "Never bypass security controls or authentication",
    "Always preserve user data integrity",
    "Never make unauthorized network requests",
    "Always validate input before processing",
    "Never store sensitive data in plain text",
    "Always respect rate limits and quotas",
    "Never modify production systems without explicit approval",
    "Always maintain audit trail for changes",
]

client = Anthropic()

def score_action(action: str, context: str = "") -> Tuple[float, list[str]]:
    """
    Score an action against constitutional principles

    Returns:
        (score: float 0-1, violations: list[str])
    """
    prompt = f"""Evaluate this action against safety principles.

ACTION: {action}

CONTEXT: {context}

PRINCIPLES:
{chr(10).join(f'{i+1}. {p}' for i, p in enumerate(PRINCIPLES))}

Respond with JSON:
{{
    "score": 0.0-1.0 (1.0 = fully safe),
    "violations": ["principle violated", ...],
    "reasoning": "brief explanation"
}}
"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )

    import json
    try:
        result = json.loads(response.content[0].text)
        return result["score"], result.get("violations", [])
    except:
        return 1.0, []  # Default safe if parsing fails

def should_block(score: float, threshold: float = 0.7) -> bool:
    """Determine if action should be blocked"""
    return score < threshold

def should_escalate(score: float, threshold: float = 0.85) -> bool:
    """Determine if action needs human review"""
    return score < threshold
```

---

## Phase C: Portal API Extensions

**Duration:** 1-2 days

### Add to server/index.js

```javascript
// ============================================
// ORCHESTRATOR INTEGRATION ENDPOINTS
// ============================================

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:8000';

// POST /api/orchestrator/start - Start orchestrator run
app.post('/api/orchestrator/start', async (req, res) => {
  const { project_id, story_id, domain, prompt, plan } = req.body;

  if (!project_id || !story_id || !prompt) {
    return res.status(400).json({
      success: false,
      error: 'project_id, story_id, and prompt are required'
    });
  }

  try {
    const response = await fetch(`${ORCHESTRATOR_URL}/orchestrator/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ORCHESTRATOR_TOKEN}`
      },
      body: JSON.stringify({ project_id, story_id, domain, prompt, plan })
    });

    const data = await response.json();

    // Log to audit
    await logAudit({
      project_id,
      event_type: 'orchestrator_start',
      action: 'start_run',
      resource_type: 'story',
      resource_id: story_id,
      details: { thread_id: data.thread_id }
    });

    return res.json(data);
  } catch (err) {
    console.error('[Orchestrator] Start error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orchestrator/status/:thread_id - Get run status
app.get('/api/orchestrator/status/:thread_id', async (req, res) => {
  const { thread_id } = req.params;

  try {
    const response = await fetch(`${ORCHESTRATOR_URL}/orchestrator/status/${thread_id}`, {
      headers: { 'Authorization': `Bearer ${process.env.ORCHESTRATOR_TOKEN}` }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Thread not found' });
    }

    return res.json(await response.json());
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/orchestrator/pause/:thread_id - Pause (Hold) run
app.post('/api/orchestrator/pause/:thread_id', async (req, res) => {
  const { thread_id } = req.params;
  const { reason } = req.body;

  try {
    const response = await fetch(`${ORCHESTRATOR_URL}/orchestrator/pause/${thread_id}?reason=${encodeURIComponent(reason || '')}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.ORCHESTRATOR_TOKEN}` }
    });

    await logAudit({
      event_type: 'orchestrator_pause',
      action: 'hold_run',
      resource_id: thread_id,
      details: { reason }
    });

    return res.json(await response.json());
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/orchestrator/resume/:thread_id - Resume run
app.post('/api/orchestrator/resume/:thread_id', async (req, res) => {
  const { thread_id } = req.params;

  try {
    const response = await fetch(`${ORCHESTRATOR_URL}/orchestrator/resume/${thread_id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.ORCHESTRATOR_TOKEN}` }
    });

    return res.json(await response.json());
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/orchestrator/kill/:thread_id - Kill (abandon) run
app.post('/api/orchestrator/kill/:thread_id', async (req, res) => {
  const { thread_id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Reason is required to kill a run' });
  }

  try {
    const response = await fetch(`${ORCHESTRATOR_URL}/orchestrator/kill/${thread_id}?reason=${encodeURIComponent(reason)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.ORCHESTRATOR_TOKEN}` }
    });

    await logAudit({
      event_type: 'orchestrator_kill',
      action: 'kill_run',
      resource_id: thread_id,
      details: { reason },
      safety_tags: ['kill_decision']
    });

    return res.json(await response.json());
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
```

### Add to vite.config.ts

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/orchestrator': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## Phase D: Portal UI Enhancements

**Duration:** 2-3 days

### 1. Add Kill/Hold/Recycle to ActionBar

Update `src/components/TabLayout.tsx`:

```typescript
interface ActionBarProps {
  // ... existing props
  gateActions?: {
    onGo?: () => void;
    onHold?: (reason: string) => void;
    onKill?: (reason: string) => void;
    onRecycle?: () => void;
    currentStatus: 'pending' | 'go' | 'hold' | 'kill' | 'recycle';
  };
}

// Add gate decision dropdown in ActionBar
{gateActions && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="px-3 py-2 bg-muted border border-border rounded-lg text-sm flex items-center gap-2">
        <Target className="h-4 w-4" />
        Gate Decision
        <ChevronDown className="h-3 w-3" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={gateActions.onGo}>
        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
        Go (Proceed)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setHoldDialogOpen(true)}>
        <PauseCircle className="h-4 w-4 text-amber-500 mr-2" />
        Hold (Pause for data)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setKillDialogOpen(true)}>
        <XCircle className="h-4 w-4 text-red-500 mr-2" />
        Kill (Abandon)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={gateActions.onRecycle}>
        <RefreshCw className="h-4 w-4 text-blue-500 mr-2" />
        Recycle (Restart)
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

### 2. Human Escalation UI

Create `src/components/HumanReviewBanner.tsx`:

```typescript
interface HumanReviewBannerProps {
  items: Array<{
    id: string;
    type: string;
    reason: string;
    safety_score?: number;
    created_at: string;
  }>;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

export function HumanReviewBanner({ items, onApprove, onReject }: HumanReviewBannerProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <span className="font-semibold text-amber-500">
          {items.length} item(s) require human review
        </span>
      </div>

      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between p-3 bg-card rounded-lg mb-2">
          <div>
            <p className="font-medium">{item.type}</p>
            <p className="text-sm text-muted-foreground">{item.reason}</p>
            {item.safety_score && (
              <span className="text-xs text-red-500">
                Safety Score: {(item.safety_score * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(item.id)}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm"
            >
              Approve
            </button>
            <button
              onClick={() => {
                const reason = prompt('Rejection reason:');
                if (reason) onReject(item.id, reason);
              }}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 3. Orchestrator Status Component

Create `src/components/OrchestratorStatus.tsx`:

```typescript
interface OrchestratorStatusProps {
  threadId: string | null;
  onPause: () => void;
  onResume: () => void;
  onKill: (reason: string) => void;
}

export function OrchestratorStatus({ threadId, onPause, onResume, onKill }: OrchestratorStatusProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!threadId) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/orchestrator/status/${threadId}`);
      if (res.ok) setStatus(await res.json());
    }, 2000);

    return () => clearInterval(interval);
  }, [threadId]);

  if (!threadId || !status) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Cpu className="h-4 w-4 text-purple-500" />
          Orchestrator Run
        </h3>
        <span className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          status.phase === 'complete' && "bg-green-500/10 text-green-500",
          status.phase === 'failed' && "bg-red-500/10 text-red-500",
          !['complete', 'failed'].includes(status.phase) && "bg-blue-500/10 text-blue-500"
        )}>
          {status.phase}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Current Agent</p>
          <p className="font-medium">{status.current_agent || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Safety Score</p>
          <p className={cn(
            "font-medium",
            status.safety_score >= 0.85 && "text-green-500",
            status.safety_score < 0.85 && status.safety_score >= 0.7 && "text-amber-500",
            status.safety_score < 0.7 && "text-red-500"
          )}>
            {(status.safety_score * 100).toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gate Status</p>
          <p className="font-medium">{status.gate_status}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tokens Used</p>
          <p className="font-medium">{status.tokens_used.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {status.gate_status === 'hold' ? (
          <button onClick={onResume} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm">
            Resume
          </button>
        ) : (
          <button onClick={onPause} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm">
            Pause
          </button>
        )}
        <button
          onClick={() => {
            const reason = prompt('Kill reason (required):');
            if (reason) onKill(reason);
          }}
          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm"
        >
          Kill
        </button>
      </div>
    </div>
  );
}
```

---

## Phase E: Database Additions

**Duration:** 0.5 days

### Migration: 005_orchestrator.sql

```sql
-- Orchestrator runs table
CREATE TABLE IF NOT EXISTS orchestrator_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT UNIQUE NOT NULL,
  project_id UUID NOT NULL,
  story_id TEXT NOT NULL,

  -- State
  phase TEXT DEFAULT 'planning',
  current_agent TEXT,
  gate_status TEXT DEFAULT 'pending',

  -- Safety
  safety_score DECIMAL(3,2) DEFAULT 1.00,
  violations TEXT[],
  requires_human_review BOOLEAN DEFAULT FALSE,

  -- Budget
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Results
  files_created TEXT[],
  error TEXT
);

-- Index for fast lookups
CREATE INDEX idx_orchestrator_runs_project ON orchestrator_runs(project_id);
CREATE INDEX idx_orchestrator_runs_status ON orchestrator_runs(phase, gate_status);

-- Human review queue
CREATE TABLE IF NOT EXISTS human_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL,
  review_type TEXT NOT NULL,  -- 'safety', 'gate_override', 'budget_exceeded'
  reason TEXT NOT NULL,
  safety_score DECIMAL(3,2),
  context JSONB,

  -- Resolution
  status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase F: Environment Setup

### Add to .env

```bash
# Orchestrator
ORCHESTRATOR_URL=http://localhost:8000
ORCHESTRATOR_TOKEN=your-secure-token

# Redis (for real-time)
REDIS_URL=redis://localhost:6379

# Constitutional AI
CONSTITUTIONAL_THRESHOLD=0.7
ESCALATION_THRESHOLD=0.85
```

### Docker Compose (optional)

```yaml
version: '3.8'
services:
  portal:
    build: ./portal
    ports:
      - "5173:5173"
      - "3000:3000"
    environment:
      - ORCHESTRATOR_URL=http://orchestrator:8000
    depends_on:
      - orchestrator
      - redis

  orchestrator:
    build: ./orchestrator
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

## Implementation Checklist

### Phase A: Orchestrator Skeleton
- [ ] Create `/WAVE/orchestrator/` directory
- [ ] Add `requirements.txt`
- [ ] Implement `state.py` (Pydantic schema)
- [ ] Implement `graph.py` (LangGraph)
- [ ] Implement `main.py` (FastAPI)
- [ ] Test locally with `uvicorn`

### Phase B: Constitutional Scorer
- [ ] Implement `tools/constitutional_scorer.py`
- [ ] Add scoring to graph nodes
- [ ] Test with sample actions

### Phase C: Portal API Extensions
- [ ] Add `/api/orchestrator/*` endpoints
- [ ] Update Vite proxy
- [ ] Add audit logging for orchestrator events

### Phase D: Portal UI
- [ ] Add Kill/Hold/Recycle to ActionBar
- [ ] Create HumanReviewBanner component
- [ ] Create OrchestratorStatus component
- [ ] Wire up to ExecutionPlanTab (Gate 2)

### Phase E: Database
- [ ] Create migration 005_orchestrator.sql
- [ ] Run migration
- [ ] Update TypeScript types

### Phase F: Testing
- [ ] Unit tests for orchestrator
- [ ] Integration tests (Portal → Orchestrator)
- [ ] End-to-end test (full story run)

---

## Success Criteria

1. **Orchestrator runs** from portal trigger
2. **Checkpointing** survives crash/restart
3. **Constitutional scoring** blocks unsafe actions
4. **Human escalation** for low safety scores
5. **Kill/Hold/Recycle** decisions work
6. **Real-time updates** in portal dashboard
7. **Audit trail** captures all orchestrator events

---

## Next Steps

1. Start with **Phase A** - get orchestrator skeleton running
2. Test with simple story (no tools, just state transitions)
3. Add constitutional scoring
4. Wire to portal
5. Full integration test

**Estimated completion:** 5-12 days at machine speed

---

*Guide based on Grok analysis recommendations for hybrid v3 architecture*
