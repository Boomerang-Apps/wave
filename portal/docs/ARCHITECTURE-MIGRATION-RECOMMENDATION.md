# WAVE Architecture Migration Recommendation

**Date:** 2026-01-24
**Author:** Claude Code (CTO Analysis)
**Status:** Proposed
**Context:** Response to Grok's LangGraph architecture review

---

## Executive Summary

WAVE's current architecture has two disconnected layers:
1. **Bash Orchestration Layer** - File-based signal coordination, fragile, race-prone
2. **Portal Layer** - Solid Node.js backend with tested utilities (1,719 tests)

Grok's independent review correctly identified that the bash layer is the critical weakness. This document recommends a **phased hybrid migration** to LangGraph while preserving portal investments.

---

## Current State Assessment

### What Works (Portal Layer)

| Component | Status | Tests |
|-----------|--------|-------|
| Pattern Matcher (CQ-010) | Production-ready | 37 |
| State Persistence (CQ-011) | Production-ready | 26 |
| Git Validator (CQ-009) | Production-ready | 39 |
| Async File I/O (CQ-008) | Production-ready | 37 |
| Safe File Ops (SEC-005) | Production-ready | 35 |
| Rate Limit Store (SEC-006) | Production-ready | 29 |
| **Total Phase 3** | **Complete** | **253** |

### What's Broken (Bash Layer)

| Issue | Impact | Severity |
|-------|--------|----------|
| File-based signal coordination | Race conditions, lost state | Critical |
| No crash recovery | Agent failures lose all progress | Critical |
| Implicit state machine | Gate transitions are fragile | High |
| No typed state | Runtime errors, silent failures | High |
| Shell script complexity | Unmaintainable, untestable | Medium |

---

## Grok's LangGraph Proposal Analysis

### Strengths

**1. Typed State Management**
```python
class AgentState(TypedDict):
    phase: Literal["planning", "development", "qa", "merge", "done"]
    rlm_summary: str
    retry_count: int
    needs_human_approval: bool
```
Eliminates file-based signals with compile-time validated state.

**2. Checkpointing for Crash Recovery**
```python
checkpointer = MemorySaver()  # Redis for production
app = workflow.compile(checkpointer=checkpointer)
```
If agent crashes mid-story, resume from last checkpoint.

**3. Declarative Routing**
```python
workflow.add_conditional_edges("dev_agent", check_dev_output, {
    "needs_qa": "qa_gate",
    "needs_fix": "dev_agent",
    "approved": "merge_agent"
})
```
Replaces bash `if` chains with testable graph edges.

**4. Human-in-the-Loop**
```python
if state["needs_human_approval"]:
    return Command(goto="human_review", update=state)
```
Production-grade escalation vs bash's implicit patterns.

### Gaps in Grok's Proposal

| Missing Component | Current Solution | Needed Integration |
|-------------------|------------------|-------------------|
| Git worktree isolation | `worktrees/fe-dev-*` | GitPython + subprocess |
| Claude CLI invocation | `claude --dangerously-skip-permissions` | Anthropic SDK or subprocess |
| Budget tracking | Portal `/api/budgets/track` | State field + Redis |
| Slack notifications | `slack-notify.sh` | LangGraph node |
| Portal dashboard | React UI | Redis subscription |

---

## Recommended Architecture

### Target State

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WAVE v2 Architecture                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐         ┌──────────────────────────────────────┐   │
│  │    Portal      │◄───────▶│        Redis (Shared State)          │   │
│  │   (Node.js)    │         │                                      │   │
│  │                │         │  - LangGraph checkpoints             │   │
│  │  - Dashboard   │         │  - Agent state (real-time)           │   │
│  │  - Settings    │         │  - Budget tracking                   │   │
│  │  - Audit logs  │         │  - Thread tracking (Slack)           │   │
│  │                │         │                                      │   │
│  │  Phase 3 Utils:│         └──────────────────────────────────────┘   │
│  │  - git-validator        ▲                                           │
│  │  - pattern-matcher      │                                           │
│  │  - state-persistence    │                                           │
│  │  - safe-file-ops        ▼                                           │
│  └────────────────┘  ┌──────────────────────────────────────────────┐  │
│          │           │         Python Orchestrator (LangGraph)       │  │
│          │           │                                               │  │
│          ▼           │  ┌─────────┐  ┌─────────┐  ┌─────────┐       │  │
│  ┌────────────────┐  │  │   CTO   │  │   Dev   │  │   QA    │       │  │
│  │    Supabase    │  │  │  Agent  │──│  Agent  │──│  Agent  │       │  │
│  │   (Metadata)   │  │  └─────────┘  └─────────┘  └─────────┘       │  │
│  │                │  │        │            │            │            │  │
│  │  - Projects    │  │        ▼            ▼            ▼            │  │
│  │  - Stories     │  │  ┌─────────────────────────────────────┐     │  │
│  │  - Waves       │  │  │     Claude CLI / Anthropic SDK      │     │  │
│  │  - Audit trail │  │  │  (--dangerously-skip-permissions)   │     │  │
│  └────────────────┘  │  └─────────────────────────────────────┘     │  │
│                      │                     │                         │  │
│                      │                     ▼                         │  │
│                      │  ┌─────────────────────────────────────┐     │  │
│                      │  │         Git Worktrees               │     │  │
│                      │  │  worktrees/fe-dev-1, fe-dev-2, ...  │     │  │
│                      │  └─────────────────────────────────────┘     │  │
│                      └───────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Request (Portal UI)
        │
        ▼
┌───────────────────┐
│  Portal Backend   │──────▶ Supabase (persist request)
│  (Node.js)        │
└───────────────────┘
        │
        ▼ POST /api/orchestrator/start
┌───────────────────┐
│  Python Orch.     │──────▶ Redis (create checkpoint)
│  (LangGraph)      │
└───────────────────┘
        │
        ▼ StateGraph execution
┌───────────────────┐
│  CTO Agent        │──────▶ Claude CLI (planning)
└───────────────────┘
        │
        ▼ conditional edge
┌───────────────────┐
│  Dev Agent(s)     │──────▶ Claude CLI (implementation)
│  (parallel)       │──────▶ Git worktrees (isolation)
└───────────────────┘
        │
        ▼ checkpoint + conditional edge
┌───────────────────┐
│  QA Gate          │──────▶ Claude CLI (validation)
└───────────────────┘
        │
        ▼ approved
┌───────────────────┐
│  Merge Agent      │──────▶ Git merge to main
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Slack Notify     │──────▶ Thread update
└───────────────────┘
        │
        ▼
Portal Dashboard (real-time via Redis subscription)
```

---

## Migration Phases

### Phase 1: Python Orchestrator Foundation (2-3 sprints)

**Goal:** Replace bash scripts with LangGraph while keeping Claude CLI invocation

**Deliverables:**
- [ ] `orchestrator/` Python package with LangGraph StateGraph
- [ ] Redis integration for checkpointing
- [ ] Basic agent nodes (CTO, Dev, QA, Merge)
- [ ] Claude CLI subprocess wrapper
- [ ] Git worktree management via GitPython

**Files to Create:**
```
/WAVE/orchestrator/
├── __init__.py
├── state.py           # AgentState TypedDict
├── graph.py           # StateGraph definition
├── agents/
│   ├── cto.py
│   ├── dev.py
│   ├── qa.py
│   └── merge.py
├── tools/
│   ├── claude_cli.py  # Subprocess wrapper
│   ├── git_ops.py     # GitPython wrapper
│   └── redis_client.py
└── tests/
    ├── test_state.py
    ├── test_graph.py
    └── test_agents.py
```

### Phase 2: Portal Integration (1-2 sprints)

**Goal:** Connect Portal to Python orchestrator

**Deliverables:**
- [ ] Portal API endpoint `/api/orchestrator/start`
- [ ] Redis subscription for real-time state updates
- [ ] Dashboard shows LangGraph state (phase, agent, progress)
- [ ] Budget tracking integrated into AgentState

**Files to Modify:**
```
/WAVE/portal/server/
├── index.js           # Add orchestrator endpoints
├── redis-client.js    # New: Redis connection
└── routes/
    └── orchestrator.js # New: Orchestrator API
```

### Phase 3: Direct SDK Migration (1 sprint)

**Goal:** Replace Claude CLI with Anthropic SDK for better control

**Deliverables:**
- [ ] `anthropic` Python SDK integration
- [ ] Streaming response handling
- [ ] Token counting at SDK level
- [ ] Remove subprocess overhead

**Files to Modify:**
```
/WAVE/orchestrator/tools/
├── claude_cli.py      # Deprecated
└── claude_sdk.py      # New: Direct SDK calls
```

### Phase 4: Bash Deprecation (1 sprint)

**Goal:** Remove bash scripts, full LangGraph operation

**Deliverables:**
- [ ] Archive `core/scripts/*.sh` to `core/scripts/legacy/`
- [ ] Update documentation
- [ ] Remove file-based signal watchers
- [ ] Comprehensive integration tests

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LangGraph learning curve | Start with simple 3-node graph, expand incrementally |
| Redis single point of failure | Redis Sentinel or managed Redis (AWS ElastiCache) |
| Claude CLI deprecation | SDK migration in Phase 3 provides fallback |
| Portal/Orchestrator drift | Shared Redis schema with versioning |
| Test coverage regression | Require 80%+ coverage for orchestrator package |

---

## Success Metrics

| Metric | Current (Bash) | Target (LangGraph) |
|--------|----------------|-------------------|
| Crash recovery | None | < 5 min resume |
| State consistency | Race-prone | ACID (Redis) |
| Agent throughput | 1 story/wave | 3+ parallel |
| Test coverage | ~30% bash | 80%+ Python |
| Mean time to debug | Hours | Minutes (typed state) |

---

## Decision Required

**Options:**

1. **Proceed with Hybrid Migration** - Implement phases 1-4 as described
2. **Full Rewrite** - Abandon portal, build everything in Python
3. **Bash Hardening** - Add locking/retry to existing scripts (not recommended)

**Recommendation:** Option 1 (Hybrid Migration)

- Preserves 1,719 tests of portal investment
- Phases risk across sprints
- Allows rollback at each phase
- Portal UI remains stable during migration

---

## Appendix: Key Code Patterns

### LangGraph State Definition

```python
from typing import TypedDict, Literal, Annotated
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    # Core workflow state
    messages: Annotated[list, add_messages]
    phase: Literal["planning", "development", "qa", "merge", "done"]

    # RLM compression (P-variable)
    rlm_summary: str

    # Story tracking
    story_id: str
    wave_number: int
    assignments: list[dict]

    # Safety controls
    retry_count: int
    needs_human_approval: bool

    # Budget tracking
    tokens_used: int
    budget_limit: int
    cost_usd: float

    # Git state
    worktree_path: str
    branch_name: str
```

### Conditional Edge Pattern

```python
def check_qa_result(state: AgentState) -> str:
    if state["needs_human_approval"]:
        return "human_review"
    if state["retry_count"] >= 3:
        return "escalate"
    if qa_passed(state):
        return "merge"
    return "dev_fix"

workflow.add_conditional_edges(
    "qa_gate",
    check_qa_result,
    {
        "human_review": "human_node",
        "escalate": "escalation_node",
        "merge": "merge_agent",
        "dev_fix": "dev_agent"
    }
)
```

### Redis Checkpoint Integration

```python
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.redis import RedisSaver

# Development
checkpointer = MemorySaver()

# Production
checkpointer = RedisSaver(
    host="localhost",
    port=6379,
    db=0,
    prefix="wave:checkpoint:"
)

app = workflow.compile(checkpointer=checkpointer)

# Resume from crash
config = {"configurable": {"thread_id": story_id}}
result = app.invoke(None, config)  # Resumes from last checkpoint
```

---

## References

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)
- [Redis Persistence](https://redis.io/docs/management/persistence/)
- Grok Architecture Review (2026-01-24)
- WAVE Portal Phase 3 QA Report (commit `920ae8d`)
