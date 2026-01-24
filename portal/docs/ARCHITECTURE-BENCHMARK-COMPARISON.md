# WAVE Architecture Migration: Benchmark Comparison

**Date:** 2026-01-24
**Comparing:** Claude Code Recommendation vs Grok Implementation Plan

---

## Executive Summary

| Aspect | Claude Code | Grok | Winner |
|--------|-------------|------|--------|
| **Pragmatism** | Phased hybrid migration | Full rewrite | Claude |
| **Completeness** | Architecture + strategy | Full code samples | Grok |
| **Risk** | Lower (preserves portal) | Higher (greenfield) | Claude |
| **Innovation** | Conservative | Aggressive (gVisor, Constitutional AI) | Grok |
| **Time to Value** | Faster (incremental) | Slower (big bang) | Claude |
| **Long-term Scalability** | Good | Excellent | Grok |

**Verdict:** Grok's plan is more technically ambitious; Claude's plan is more execution-safe. **Recommend: Grok's architecture with Claude's phased approach.**

---

## Side-by-Side Comparison

### 1. Core Architecture

| Component | Claude Code | Grok |
|-----------|-------------|------|
| **Orchestration** | LangGraph StateGraph | LangGraph StateGraph |
| **State Storage** | Redis only | PostgreSQL + Redis |
| **LLM Integration** | Claude CLI → SDK migration | Direct Anthropic SDK |
| **Sandboxing** | Git worktrees only | gVisor + Docker + worktrees |
| **Safety Enforcement** | Implicit (existing validators) | Constitutional AI scorer node |

**Analysis:**
- Both agree on LangGraph as the orchestration layer
- Grok adds PostgreSQL for durable state (ACID guarantees)
- Grok's gVisor sandboxing provides VM-level isolation
- Grok's constitutional AI node is novel and powerful

### 2. State Schema

**Claude Code:**
```python
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    phase: Literal["planning", "development", "qa", "merge", "done"]
    rlm_summary: str
    story_id: str
    wave_number: int
    assignments: list[dict]
    retry_count: int
    needs_human_approval: bool
    tokens_used: int
    budget_limit: int
    cost_usd: float
    worktree_path: str
    branch_name: str
```

**Grok:**
```python
class AgentState(TypedDict):
    messages: Annotated[list, "add_messages"]
    domain: str
    story_id: str
    wave_number: int
    phase: Literal["validate", "plan", "develop", "qa", "merge", "done"]
    gate: int  # 1-8 matching WAVE gates
    retry_count: int
    max_retries: int
    needs_human: bool
    human_approved: bool
    rlm_summary: str
    git: GitState  # Nested Pydantic model
    budget: BudgetTracking  # Nested Pydantic model
    safety: SafetyState  # Nested Pydantic model
    assignments: list[dict]
    started_at: datetime
    updated_at: datetime
```

**Analysis:**
| Feature | Claude | Grok | Better |
|---------|--------|------|--------|
| Gate tracking | No | Yes (1-8) | Grok |
| Nested state models | Flat | Pydantic nested | Grok |
| Timestamps | No | Yes | Grok |
| Safety state | No | Yes (violations, score) | Grok |
| Max retries configurable | No | Yes | Grok |

**Winner: Grok** - More complete schema with better type safety

### 3. Migration Strategy

**Claude Code - 4 Phases:**
```
Phase 1: Python Orchestrator Foundation (2-3 sprints)
Phase 2: Portal Integration (1-2 sprints)
Phase 3: Direct SDK Migration (1 sprint)
Phase 4: Bash Deprecation (1 sprint)

Total: 5-7 sprints (~10-14 weeks)
```

**Grok - 4 Phases:**
```
Phase 1: Foundations (Week 1-2)
Phase 2: Core Workflow (Week 3-5)
Phase 3: Safety & Production (Week 6-8)
Phase 4: Migration & Benchmark

Total: 8 weeks
```

**Analysis:**
| Aspect | Claude | Grok | Better |
|--------|--------|------|--------|
| Timeline realism | Conservative | Aggressive | Claude |
| Portal preservation | Explicit | Implicit | Claude |
| Rollback strategy | Each phase | Not specified | Claude |
| Bash deprecation | Explicit phase | Not specified | Claude |
| Dependency on new code | Lower | Higher | Claude |

**Winner: Claude** - More realistic timeline with explicit rollback points

### 4. Safety Mechanisms

**Claude Code:**
- Relies on existing WAVE validators
- `--dangerously-skip-permissions` preserved
- Budget tracking in state
- No explicit constitutional enforcement

**Grok:**
```python
CONSTITUTIONAL_PRINCIPLES = """
1. Never delete files outside the worktree
2. Never force push to main/master
3. Never expose secrets or credentials
4. Never bypass CI/CD checks
5. Never modify package-lock.json manually
6. Always run tests before marking complete
7. Always preserve existing functionality
8. Never exceed budget limits
"""

def constitutional_scorer(state: AgentState) -> dict:
    # Scores every action against principles
    # Returns score 0.0-1.0 with violations list
```

**Analysis:**
| Safety Feature | Claude | Grok | Better |
|----------------|--------|------|--------|
| Constitutional AI | No | Yes | Grok |
| Runtime enforcement | Implicit | Explicit tool allow-list | Grok |
| gVisor sandboxing | No | Yes | Grok |
| Budget enforcement | State only | State + constitutional check | Grok |
| Emergency stop | Not specified | Graph interruption API | Grok |

**Winner: Grok** - More comprehensive safety model

### 5. Git Integration

**Claude Code:**
- Uses existing `git-validator.js`
- Subprocess calls to git CLI
- Worktree management via shell

**Grok:**
```python
class GitTools:
    def create_worktree(self, branch_name: str, worktree_name: str) -> str
    def commit(self, worktree_path: str, message: str, files: list[str]) -> str
    def cleanup_worktree(self, worktree_name: str)
    def check_conflicts(self, source_branch: str, target_branch: str) -> bool
```

**Analysis:**
| Git Feature | Claude | Grok | Better |
|-------------|--------|------|--------|
| Library | Shell/git CLI | pygit2 | Grok |
| Conflict detection | Not specified | Yes | Grok |
| Worktree cleanup | Manual | Automated | Grok |
| Type safety | JavaScript | Python typed | Grok |

**Winner: Grok** - Native Python git with better API

### 6. Observability

**Claude Code:**
- Portal dashboard (existing)
- Redis subscription for real-time
- Supabase audit trail

**Grok:**
- LangSmith traces
- Slack webhooks
- Supabase export
- Constitutional score tracking

**Analysis:**
| Observability | Claude | Grok | Better |
|---------------|--------|------|--------|
| LLM decision traces | Not specified | LangSmith | Grok |
| Dashboard | Existing portal | Not specified | Claude |
| Audit trail | Supabase | Supabase | Tie |
| Safety metrics | No | Constitutional score | Grok |

**Winner: Grok** - LangSmith traces provide deeper debugging

### 7. Production Readiness

**Claude Code:**
- No Kubernetes manifests
- No container specs
- Relies on existing infra

**Grok:**
```yaml
# orchestrator-deployment.yaml
# agent-sandbox-pod.yaml (gVisor runtime)
```

**Analysis:**
| Production Feature | Claude | Grok | Better |
|--------------------|--------|------|--------|
| Kubernetes manifests | No | Yes | Grok |
| gVisor runtime | No | Yes | Grok |
| Security contexts | No | Yes | Grok |
| Resource limits | No | Yes | Grok |

**Winner: Grok** - Production-ready infrastructure code

---

## Quantitative Benchmark

### Complexity Metrics

| Metric | Claude | Grok | Notes |
|--------|--------|------|-------|
| New Python LoC | ~500 | ~1500 | Grok includes more tools |
| New files | 8 | 15+ | Grok is more modular |
| Dependencies | 5 | 10+ | Grok adds gVisor, pygit2 |
| Test coverage target | 80% | Not specified | Claude more explicit |
| Portal changes | Minimal | Minimal | Both preserve portal |

### Risk Assessment

| Risk | Claude (1-5) | Grok (1-5) | Notes |
|------|--------------|------------|-------|
| Implementation complexity | 2 | 4 | Grok has more moving parts |
| Timeline overrun | 2 | 4 | Grok's 8 weeks is aggressive |
| Integration failures | 2 | 3 | Claude keeps more existing code |
| Learning curve | 2 | 3 | Grok requires gVisor, pygit2 knowledge |
| Rollback difficulty | 1 | 3 | Claude has explicit rollback phases |
| **Total Risk Score** | **9/25** | **17/25** | Claude is lower risk |

### Capability Assessment

| Capability | Claude (1-5) | Grok (1-5) | Notes |
|------------|--------------|------------|-------|
| Crash recovery | 4 | 5 | Both have checkpointing, Grok adds Postgres |
| Safety enforcement | 3 | 5 | Grok has constitutional AI |
| Scalability | 4 | 5 | Grok has Kubernetes-native design |
| Observability | 3 | 5 | Grok has LangSmith |
| Maintainability | 4 | 4 | Both are typed Python |
| **Total Capability Score** | **18/25** | **24/25** | Grok is more capable |

---

## Recommended Hybrid Approach

**Take the best of both:**

### From Claude Code:
1. **Phased migration timeline** - 5-7 sprints with rollback points
2. **Explicit bash deprecation phase** - Don't leave legacy code running
3. **Portal preservation** - Keep existing 1,719 tests
4. **Conservative timeline** - Don't promise 8 weeks

### From Grok:
1. **Constitutional AI scorer** - Add as a node in the graph
2. **PostgreSQL + Redis** - Better durability than Redis alone
3. **pygit2 integration** - Native Python git operations
4. **gVisor sandboxing** - VM-level isolation for agents
5. **Extended state schema** - Nested Pydantic models
6. **Kubernetes manifests** - Production-ready deployment

### Merged Implementation Plan

```
Phase 1: Foundation (Weeks 1-4)
├── LangGraph orchestrator with Grok's state schema
├── PostgreSQL + Redis setup
├── Basic nodes: CTO, PM, Dev, QA
└── Claude CLI subprocess (not SDK yet)

Phase 2: Safety & Git (Weeks 5-8)
├── Constitutional AI scorer node
├── pygit2 GitTools class
├── Worktree automation
└── Budget enforcement in state

Phase 3: Portal Integration (Weeks 9-10)
├── POST /api/orchestrator/start endpoint
├── Redis pub/sub for real-time dashboard
├── LangSmith integration
└── Supabase audit export

Phase 4: Production Hardening (Weeks 11-14)
├── gVisor sandboxing
├── Kubernetes deployment
├── Direct Anthropic SDK migration
├── Bash deprecation

Phase 5: Migration & Validation (Weeks 15-16)
├── Port CLAUDE.md prompts
├── Convert AI Stories → state
├── Side-by-side benchmark with WAVE
└── Full test coverage
```

---

## Final Recommendation

| Decision Point | Recommendation |
|----------------|----------------|
| **Architecture** | Grok's design (LangGraph + PostgreSQL + gVisor) |
| **Timeline** | Claude's phased approach (16 weeks, not 8) |
| **State Schema** | Grok's extended schema with nested models |
| **Safety** | Grok's constitutional AI + tool allow-lists |
| **Git Operations** | Grok's pygit2 GitTools class |
| **Portal** | Claude's preservation strategy |
| **Rollback** | Claude's explicit phase gates |
| **Production** | Grok's Kubernetes manifests |

**Bottom Line:** Grok designed the better system; Claude designed the safer migration path. Use both.

---

## Appendix: Decision Matrix

```
                    ┌─────────────────────────────────────────┐
                    │         CAPABILITY                      │
                    │    Low ◄────────────────────► High      │
                    └─────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        │   AVOID             │   GROK PLAN         │
   R    │   (high risk,       │   (high capability, │
   I    │    low value)       │    high risk)       │
   S    │                     │                     │
   K    ├─────────────────────┼─────────────────────┤
        │                     │                     │
   Low  │   STATUS QUO        │   CLAUDE PLAN       │
        │   (keep WAVE        │   (good capability, │
   ▲    │    as-is)           │    low risk)        │
   │    │                     │                     │
   High └─────────────────────┴─────────────────────┘

   OPTIMAL: Grok capability + Claude risk mitigation = HYBRID
```
