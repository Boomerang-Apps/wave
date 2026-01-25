# LangGraph Extended Enhancement Plan

**Date:** 2026-01-25
**Based On:** Grok's Parallel Domain Execution Recommendations
**Current Status:** Phases 1-6 Complete (401 tests)
**Target:** True Native LangGraph Parallelism with Domain Isolation

---

## MANDATORY: Gate 0 Process for Every Phase

**CRITICAL:** Every enhancement phase MUST follow the Gate 0 validation process. No code may be written until research, documentation, and TDD tests are complete.

### Gate 0 Checklist (Required for Each Phase)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     GATE 0 VALIDATION PROCESS                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  STEP 1: RESEARCH (No code written)                                     │
│  ├── [ ] Read Grok's recommendations for this phase                     │
│  ├── [ ] Analyze current implementation gaps                            │
│  ├── [ ] Identify all components needed                                 │
│  └── [ ] List all dependencies and interactions                         │
│                                                                          │
│  STEP 2: DOCUMENTATION (No code written)                                │
│  ├── [ ] Create docs/PHASE{N}-GATE0-VALIDATION.md                       │
│  ├── [ ] Document requirements from Grok's plan                         │
│  ├── [ ] Document gap analysis (current vs required)                    │
│  ├── [ ] List all test categories with descriptions                     │
│  └── [ ] Define success criteria                                        │
│                                                                          │
│  STEP 3: TDD TESTS FIRST (No implementation yet)                        │
│  ├── [ ] Create tests/test_c{N}_{phase_name}.py                         │
│  ├── [ ] Write ALL tests before any implementation                      │
│  ├── [ ] Run tests - ALL must FAIL (proves TDD)                         │
│  └── [ ] Commit test file separately if needed                          │
│                                                                          │
│  STEP 4: IMPLEMENTATION (Only after Steps 1-3)                          │
│  ├── [ ] Implement minimum code to pass tests                           │
│  ├── [ ] Run phase tests - all must pass                                │
│  ├── [ ] Run FULL test suite - no regressions                           │
│  └── [ ] Update Gate 0 doc with completion status                       │
│                                                                          │
│  STEP 5: COMMIT & PUSH                                                  │
│  ├── [ ] Commit with descriptive message                                │
│  ├── [ ] Include "Co-Authored-By: Claude" footer                        │
│  └── [ ] Push to remote                                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Gate 0 Document Template

Each phase requires a `docs/PHASE{N}-GATE0-VALIDATION.md` with:

```markdown
# Phase {N}: {Name} - Gate 0 Validation

**Date:** YYYY-MM-DD
**Phase:** {N} of 11
**Pattern:** {Pattern Name}

---

## Requirements from Grok's Recommendations
{What Grok said to implement}

## Gap Analysis
{Current state vs required state}

## Components to Implement
{List of files/functions/classes}

## Test Categories (TDD)
{Numbered list of test categories with test counts}

## Success Criteria
{Checkboxes for completion}

## Implementation Order
{Sequence of implementation steps}
```

### TDD Enforcement

```
RULE: Tests MUST be written BEFORE implementation code.

Verification Process:
1. Create test file with all tests
2. Run pytest - expect 100% FAILURE
3. Screenshot/log the failures (proof of TDD)
4. ONLY THEN write implementation
5. Run pytest - expect 100% PASS
```

---

## Executive Summary

This plan extends the WAVE orchestrator to implement **true LangGraph native parallelism** using the `.map()` pattern, replacing our current `asyncio.gather` approach. This provides:

1. **Native fan-out/reduce** - LangGraph manages parallelism
2. **Parallel dev agents** - fe-dev/be-dev run simultaneously within domains
3. **Topological dependency sorting** - Respect domain dependencies
4. **Per-domain worktrees** - Git isolation per domain
5. **Cross-domain merge consensus** - Supervisor aggregates final merge

---

## Gap Analysis: Current vs Grok's Recommendations

### Current Implementation (Phases 1-6)

| Component | Status | Implementation |
|-----------|--------|----------------|
| Domain Sub-graphs | ✅ | Sequential: PM → CTO → Dev → QA |
| Parallel Execution | ⚠️ | Uses `asyncio.gather`, not native `.map()` |
| Dev Agents | ⚠️ | Single dev node, not fe-dev/be-dev parallel |
| Dependency Sort | ❌ | No topological sorting |
| Per-domain Worktrees | ❌ | Not integrated |
| Cross-domain Merge | ⚠️ | Basic aggregator, not consensus-based |

### Grok's Extended Recommendations

```
Wave Plan Ready
      ↓
CTO Master Supervisor
      ↓ (Fan-out via .map())
┌─────────────────────────────────────────┐
│     Parallel Domain Sub-Graphs          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Auth   │ │Payments │ │ Profile │   │
│  └────┬────┘ └────┬────┘ └────┬────┘   │
│       ↓           ↓           ↓         │
│  Domain CTO  Domain CTO  Domain CTO    │
│       ↓           ↓           ↓         │
│  ┌────┴────┐ ┌────┴────┐ ┌────┴────┐   │
│  │fe-dev   │ │fe-dev   │ │fe-dev   │   │
│  │be-dev   │ │be-dev   │ │be-dev   │   │
│  └────┬────┘ └────┬────┘ └────┬────┘   │
│       ↓           ↓           ↓         │
│  QA+Scorer   QA+Scorer   QA+Scorer     │
│  (retry)     (retry)     (retry)       │
└─────────────────────────────────────────┘
      ↓ (Reduce)
Supervisor Consensus
      ↓
Cross-Domain Merge → END
      ↓ (or)
Human Review (escalate)
```

---

## Enhancement Phases

### Phase 7: Native LangGraph `.map()` Pattern

**Objective:** Replace `asyncio.gather` with LangGraph's native `.map()` for fan-out.

#### Gate 0 Requirements for Phase 7

| Step | Deliverable | Status |
|------|-------------|--------|
| Research | Read LangGraph `.map()` docs, analyze current parallel impl | ⬜ |
| Documentation | Create `docs/PHASE7-GATE0-VALIDATION.md` | ⬜ |
| TDD Tests | Create `tests/test_c7_native_parallel.py` (24 tests) | ⬜ |
| Verify TDD | Run tests, confirm 24/24 FAIL | ⬜ |
| Implement | Write code to pass tests | ⬜ |
| Validate | 24/24 pass, full suite passes | ⬜ |

#### 7.1 Update Parallel State

```python
# src/parallel/parallel_state.py - Enhanced

class ParallelState(TypedDict):
    # Existing
    domains_detected: List[str]
    domain_tasks: Dict[str, str]
    domain_results: Dict[str, DomainResult]

    # NEW: Dependency support
    domain_dependencies: Dict[str, List[str]]  # {domain: [depends_on]}
    sorted_domains: List[str]  # Topologically sorted

    # NEW: Execution layers (for dependency-respecting parallel)
    execution_layers: List[List[str]]  # [[layer1_domains], [layer2_domains]]
```

#### 7.2 Topological Sort Node

```python
# src/parallel/dependency_sort.py - NEW

def topological_sort_domains(state: ParallelState) -> Dict[str, Any]:
    """
    Sort domains by dependencies before parallel execution.

    Uses Kahn's algorithm to create execution layers:
    - Layer 0: No dependencies (can run first)
    - Layer 1: Depends on Layer 0
    - etc.
    """
    dependencies = state.get("domain_dependencies", {})
    domains = state.get("domains_detected", [])

    # Build execution layers
    layers = compute_execution_layers(domains, dependencies)

    return {
        "execution_layers": layers,
        "sorted_domains": flatten_layers(layers),
    }
```

#### 7.3 Native `.map()` Implementation

```python
# src/parallel/native_parallel.py - NEW

from langgraph.graph import StateGraph

def create_native_parallel_graph() -> StateGraph:
    """
    Create graph using LangGraph's native .map() for true parallelism.
    """
    graph = StateGraph(ParallelState)

    # Prepare sorted domains
    graph.add_node("dependency_sort", topological_sort_domains)

    # Native .map() over domains
    parallel_domains = graph.map(
        "domain_worker",
        create_domain_subgraph_v2,  # Enhanced sub-graph
        over="sorted_domains"        # Map over sorted list
    )

    # Aggregate results
    graph.add_node("consensus_aggregate", cross_domain_consensus)

    # Flow
    graph.add_edge(START, "dependency_sort")
    graph.add_edge("dependency_sort", parallel_domains)
    graph.add_edge(parallel_domains, "consensus_aggregate")
    graph.add_conditional_edges("consensus_aggregate", merge_or_escalate)

    return graph
```

#### 7.4 Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| Dependency Sort | 8 | Topological sorting, cycle detection |
| Native Map | 10 | `.map()` fan-out/reduce |
| Execution Layers | 6 | Layer-based parallel execution |
| **Total** | **24** | |

---

### Phase 8: Parallel Dev Agents (fe-dev/be-dev)

**Objective:** Run frontend and backend developers in parallel within each domain.

#### Gate 0 Requirements for Phase 8

| Step | Deliverable | Status |
|------|-------------|--------|
| Research | Analyze domain sub-graph, plan fe/be parallel execution | ⬜ |
| Documentation | Create `docs/PHASE8-GATE0-VALIDATION.md` | ⬜ |
| TDD Tests | Create `tests/test_c8_parallel_dev.py` (19 tests) | ⬜ |
| Verify TDD | Run tests, confirm 19/19 FAIL | ⬜ |
| Implement | Write code to pass tests | ⬜ |
| Validate | 19/19 pass, full suite passes | ⬜ |

#### 8.1 Enhanced Domain Sub-graph

```python
# src/domains/domain_graph_v2.py - Enhanced

def create_domain_subgraph_v2(domain: str) -> StateGraph:
    """
    Enhanced domain sub-graph with parallel fe-dev/be-dev.

    Flow:
    Domain CTO → [fe-dev || be-dev] → QA+Scorer → (retry or pass)
    """
    graph = StateGraph(DomainStateV2)

    # Domain CTO plans
    graph.add_node("domain_cto", domain_cto_node)

    # Parallel dev agents using nested .map()
    dev_agents = graph.map(
        "dev_agent",
        dev_agent_node,
        over="dev_assignments"  # ["frontend", "backend"]
    )

    # Merge dev results
    graph.add_node("dev_merge", merge_dev_results)

    # QA with constitutional scorer
    graph.add_node("qa_scorer", qa_with_scorer_node)

    # Retry router
    graph.add_conditional_edges(
        "qa_scorer",
        qa_retry_or_pass,
        {"retry": "domain_cto", "pass": END}
    )

    # Edges
    graph.add_edge(START, "domain_cto")
    graph.add_edge("domain_cto", dev_agents)
    graph.add_edge(dev_agents, "dev_merge")
    graph.add_edge("dev_merge", "qa_scorer")

    return graph
```

#### 8.2 Dev Agent Node

```python
# nodes/dev_agents.py - NEW

def fe_dev_node(state: DevAgentState) -> Dict[str, Any]:
    """Frontend developer - React/Vue/Angular components"""
    return {
        "agent_type": "frontend",
        "files_modified": [],
        "tests_written": [],
    }

def be_dev_node(state: DevAgentState) -> Dict[str, Any]:
    """Backend developer - API, database, services"""
    return {
        "agent_type": "backend",
        "files_modified": [],
        "tests_written": [],
    }

def dev_agent_node(state: DevAgentState) -> Dict[str, Any]:
    """Generic dev agent - routes to fe/be based on assignment"""
    assignment = state.get("current_assignment")
    if assignment == "frontend":
        return fe_dev_node(state)
    else:
        return be_dev_node(state)
```

#### 8.3 Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| Dev Agent Types | 6 | fe-dev, be-dev existence and behavior |
| Parallel Dev | 8 | Simultaneous fe/be execution |
| Dev Merge | 5 | Result aggregation |
| **Total** | **19** | |

---

### Phase 9: Per-Domain Worktrees

**Objective:** Integrate GitTools to create isolated worktrees per domain.

#### Gate 0 Requirements for Phase 9

| Step | Deliverable | Status |
|------|-------------|--------|
| Research | Analyze GitTools, plan per-domain worktree isolation | ⬜ |
| Documentation | Create `docs/PHASE9-GATE0-VALIDATION.md` | ⬜ |
| TDD Tests | Create `tests/test_c9_domain_worktrees.py` (18 tests) | ⬜ |
| Verify TDD | Run tests, confirm 18/18 FAIL | ⬜ |
| Implement | Write code to pass tests | ⬜ |
| Validate | 18/18 pass, full suite passes | ⬜ |

#### 9.1 Domain Worktree Manager

```python
# src/git/domain_worktrees.py - NEW

class DomainWorktreeManager:
    """Manages per-domain git worktrees for isolation."""

    def create_domain_worktree(
        self,
        domain: str,
        run_id: str,
        base_branch: str = "main"
    ) -> WorktreeInfo:
        """
        Create isolated worktree for domain execution.

        Path: /worktrees/{run_id}/{domain}/
        Branch: wave/{run_id}/{domain}
        """
        worktree_path = f"/worktrees/{run_id}/{domain}"
        branch_name = f"wave/{run_id}/{domain}"

        return self.git_tools.create_worktree(
            path=worktree_path,
            branch=branch_name,
            base=base_branch
        )

    def merge_domain_worktrees(
        self,
        run_id: str,
        domains: List[str]
    ) -> MergeResult:
        """
        Merge all domain worktrees into integration branch.

        Order: Respects topological sort for conflict resolution.
        """
        integration_branch = f"wave/{run_id}/integration"

        for domain in domains:  # Already sorted
            domain_branch = f"wave/{run_id}/{domain}"
            self.git_tools.merge_branch(domain_branch, integration_branch)

        return MergeResult(...)
```

#### 9.2 Integration with Domain Nodes

```python
# nodes/domain_nodes_v2.py - Enhanced

def domain_dev_node_with_worktree(state: DomainState) -> Dict[str, Any]:
    """
    Dev node that operates in isolated worktree.
    """
    worktree_manager = DomainWorktreeManager()

    # Create worktree for this domain
    worktree = worktree_manager.create_domain_worktree(
        domain=state["domain"],
        run_id=state["parent_run_id"]
    )

    # Execute in worktree context
    with worktree_context(worktree.path):
        # ... dev work ...
        pass

    return {
        "worktree_path": worktree.path,
        "worktree_branch": worktree.branch,
        "files_modified": [...],
    }
```

#### 9.3 Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| Worktree Creation | 6 | Per-domain worktree setup |
| Worktree Isolation | 5 | No cross-domain interference |
| Worktree Merge | 7 | Integration branch merging |
| **Total** | **18** | |

---

### Phase 10: Cross-Domain Merge Consensus

**Objective:** Implement supervisor consensus for final cross-domain merge.

#### Gate 0 Requirements for Phase 10

| Step | Deliverable | Status |
|------|-------------|--------|
| Research | Analyze consensus patterns, conflict detection needs | ⬜ |
| Documentation | Create `docs/PHASE10-GATE0-VALIDATION.md` | ⬜ |
| TDD Tests | Create `tests/test_c10_cross_domain.py` (20 tests) | ⬜ |
| Verify TDD | Run tests, confirm 20/20 FAIL | ⬜ |
| Implement | Write code to pass tests | ⬜ |
| Validate | 20/20 pass, full suite passes | ⬜ |

#### 10.1 Cross-Domain Consensus

```python
# src/parallel/cross_domain_consensus.py - NEW

def cross_domain_consensus(state: ParallelState) -> Dict[str, Any]:
    """
    Aggregate domain results and determine merge consensus.

    Rules:
    1. All domains must pass QA
    2. All domains must pass safety scoring
    3. No merge conflicts between domains
    4. Average safety score >= 0.85
    """
    domain_results = state.get("domain_results", {})

    # Check all domains passed
    all_passed = all(r.get("qa_passed") for r in domain_results.values())

    # Check safety scores
    safety_scores = [r.get("safety_score", 0) for r in domain_results.values()]
    avg_safety = sum(safety_scores) / len(safety_scores) if safety_scores else 0

    # Check for conflicts
    conflict_result = check_cross_domain_conflicts(domain_results)

    if all_passed and avg_safety >= 0.85 and not conflict_result.has_conflicts:
        return {
            "merge_approved": True,
            "merge_type": "auto",
            "avg_safety_score": avg_safety,
        }
    else:
        return {
            "merge_approved": False,
            "needs_human": True,
            "escalation_reason": build_escalation_reason(...),
        }
```

#### 10.2 Conflict Detection

```python
# src/git/conflict_detector.py - NEW

def check_cross_domain_conflicts(domain_results: Dict) -> ConflictResult:
    """
    Detect potential merge conflicts between domain worktrees.

    Checks:
    1. File overlap - same file modified by multiple domains
    2. Schema conflicts - incompatible DB migrations
    3. API conflicts - breaking API changes
    """
    file_modifications = {}

    for domain, result in domain_results.items():
        for file in result.get("files_modified", []):
            if file in file_modifications:
                # Conflict: same file modified by multiple domains
                file_modifications[file].append(domain)
            else:
                file_modifications[file] = [domain]

    conflicts = {f: domains for f, domains in file_modifications.items()
                 if len(domains) > 1}

    return ConflictResult(
        has_conflicts=len(conflicts) > 0,
        conflicting_files=conflicts,
    )
```

#### 10.3 Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| Consensus Logic | 8 | Approval/rejection rules |
| Conflict Detection | 7 | File/schema/API conflicts |
| Merge Routing | 5 | Auto-merge vs escalate |
| **Total** | **20** | |

---

### Phase 11: Portal Integration

**Objective:** Connect with Portal's dependency-graph.js and real-time updates.

#### Gate 0 Requirements for Phase 11

| Step | Deliverable | Status |
|------|-------------|--------|
| Research | Analyze Portal API contract, Redis pub/sub patterns | ⬜ |
| Documentation | Create `docs/PHASE11-GATE0-VALIDATION.md` | ⬜ |
| TDD Tests | Create `tests/test_c11_portal_integration.py` (18 tests) | ⬜ |
| Verify TDD | Run tests, confirm 18/18 FAIL | ⬜ |
| Implement | Write code to pass tests | ⬜ |
| Validate | 18/18 pass, full suite passes | ⬜ |

#### 11.1 API Endpoint Updates

```python
# src/api/endpoints_v2.py - Enhanced

@app.post("/orchestrator/start")
async def start_wave_execution(request: WaveStartRequest):
    """
    Start wave execution with domain dependencies.

    Request body:
    {
        "domains": ["auth", "payments", "profile"],
        "dependencies": {
            "payments": ["auth"],  // payments depends on auth
            "profile": ["auth"]    // profile depends on auth
        },
        "wave_number": 3,
        "story_ids": ["WAVE-123", "WAVE-124"]
    }
    """
    # Initialize state with dependencies
    initial_state = create_wave_state(
        domains=request.domains,
        dependencies=request.dependencies,
        wave_number=request.wave_number,
    )

    # Start execution
    result = await wave_graph_v2.ainvoke(initial_state)

    return {"run_id": result["run_id"], "status": "started"}
```

#### 11.2 Real-time Events

```python
# src/api/redis_pubsub_v2.py - Enhanced

class DomainEventPublisher:
    """Publish per-domain progress events for Portal."""

    async def publish_domain_started(self, run_id: str, domain: str):
        await self.publish(f"wave:{run_id}:domain:{domain}", {
            "event": "domain.started",
            "domain": domain,
            "timestamp": datetime.now().isoformat(),
        })

    async def publish_domain_progress(self, run_id: str, domain: str, progress: Dict):
        await self.publish(f"wave:{run_id}:domain:{domain}", {
            "event": "domain.progress",
            "domain": domain,
            "current_node": progress["current_node"],
            "files_modified": progress["files_modified"],
            "tests_status": progress["tests_status"],
        })

    async def publish_domain_complete(self, run_id: str, domain: str, result: Dict):
        await self.publish(f"wave:{run_id}:domain:{domain}", {
            "event": "domain.complete",
            "domain": domain,
            "qa_passed": result["qa_passed"],
            "safety_score": result["safety_score"],
        })
```

#### 11.3 Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| API Endpoints | 6 | Start with dependencies |
| Event Publishing | 8 | Per-domain events |
| Portal Contract | 4 | Request/response schema |
| **Total** | **18** | |

---

## Implementation Schedule

| Phase | Focus | New Tests | Total Tests |
|-------|-------|-----------|-------------|
| 7 | Native `.map()` Pattern | 24 | 425 |
| 8 | Parallel Dev Agents | 19 | 444 |
| 9 | Per-Domain Worktrees | 18 | 462 |
| 10 | Cross-Domain Consensus | 20 | 482 |
| 11 | Portal Integration | 18 | 500 |
| **Total** | | **99** | **500** |

---

## Architecture Diagram (After Enhancement)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WAVE ORCHESTRATOR v3                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Portal Request (domains + dependencies)                                 │
│           ↓                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    CTO MASTER SUPERVISOR                        │    │
│  │  - Topological sort domains                                     │    │
│  │  - Create execution layers                                      │    │
│  │  - Initialize per-domain worktrees                              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│           ↓                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │              LANGGRAPH .map() FAN-OUT (Native)                  │    │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │    │
│  │  │   AUTH        │ │  PAYMENTS     │ │   PROFILE     │         │    │
│  │  │  ┌─────────┐  │ │  ┌─────────┐  │ │  ┌─────────┐  │         │    │
│  │  │  │Domain   │  │ │  │Domain   │  │ │  │Domain   │  │         │    │
│  │  │  │CTO      │  │ │  │CTO      │  │ │  │CTO      │  │         │    │
│  │  │  └────┬────┘  │ │  └────┬────┘  │ │  └────┬────┘  │         │    │
│  │  │  ┌────┴────┐  │ │  ┌────┴────┐  │ │  ┌────┴────┐  │         │    │
│  │  │  │fe-dev ║│  │ │  │fe-dev ║│  │ │  │fe-dev ║│  │         │    │
│  │  │  │be-dev ║│  │ │  │be-dev ║│  │ │  │be-dev ║│  │         │    │
│  │  │  └────┬────┘  │ │  └────┬────┘  │ │  └────┬────┘  │         │    │
│  │  │  ┌────┴────┐  │ │  ┌────┴────┐  │ │  ┌────┴────┐  │         │    │
│  │  │  │QA+Score │←─┼─┼──│QA+Score │←─┼─┼──│QA+Score │  │         │    │
│  │  │  │ (retry) │  │ │  │ (retry) │  │ │  │ (retry) │  │         │    │
│  │  │  └─────────┘  │ │  └─────────┘  │ │  └─────────┘  │         │    │
│  │  │  Worktree:    │ │  Worktree:    │ │  Worktree:    │         │    │
│  │  │  /wt/auth     │ │  /wt/payments │ │  /wt/profile  │         │    │
│  │  └───────────────┘ └───────────────┘ └───────────────┘         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│           ↓                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    REDUCE: CROSS-DOMAIN CONSENSUS               │    │
│  │  - Aggregate domain results                                     │    │
│  │  - Check all QA passed                                          │    │
│  │  - Detect merge conflicts                                       │    │
│  │  - Calculate average safety score                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│           ↓                                                              │
│     ┌─────┴─────┐                                                       │
│     ↓           ↓                                                       │
│  ┌──────┐  ┌──────────┐                                                 │
│  │MERGE │  │ESCALATE  │                                                 │
│  │(auto)│  │(human)   │                                                 │
│  └──┬───┘  └────┬─────┘                                                 │
│     ↓           ↓                                                       │
│  ┌──────────────────┐                                                   │
│  │       END        │                                                   │
│  └──────────────────┘                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Test Coverage | 500+ tests passing |
| Native Parallelism | LangGraph `.map()` used |
| Dev Agent Parallelism | fe-dev/be-dev simultaneous |
| Worktree Isolation | Per-domain worktrees |
| Dependency Respect | Topological sort enforced |
| Conflict Detection | Cross-domain conflicts caught |
| Portal Integration | Real-time per-domain updates |

---

## Files to Create/Modify

### New Files

```
src/parallel/
├── dependency_sort.py      # Phase 7: Topological sorting
├── native_parallel.py      # Phase 7: .map() implementation
└── cross_domain_consensus.py  # Phase 10: Merge consensus

src/domains/
├── domain_graph_v2.py      # Phase 8: Enhanced with parallel devs
└── dev_assignments.py      # Phase 8: fe/be task assignment

src/git/
├── domain_worktrees.py     # Phase 9: Per-domain worktree manager
└── conflict_detector.py    # Phase 10: Conflict detection

nodes/
└── dev_agents.py           # Phase 8: fe-dev/be-dev nodes

src/api/
├── endpoints_v2.py         # Phase 11: Enhanced API
└── redis_pubsub_v2.py      # Phase 11: Per-domain events

tests/
├── test_c7_native_parallel.py     # 24 tests
├── test_c8_parallel_dev.py        # 19 tests
├── test_c9_domain_worktrees.py    # 18 tests
├── test_c10_cross_domain.py       # 20 tests
└── test_c11_portal_integration.py # 18 tests
```

### Modified Files

```
src/parallel/parallel_state.py  # Add dependency fields
src/domains/domain_nodes.py     # Worktree integration
src/api/endpoints.py            # Dependency support
```

---

## Next Steps

1. **Review this plan** with Grok for validation
2. **Start Phase 7** - Native `.map()` Pattern
3. **Follow Gate 0 process** - TDD tests first
4. **Update GROK-IMPLEMENTATION-SUMMARY.md** as phases complete

---

**Prepared for Implementation**
**WAVE v3 Extended Enhancement Plan - 2026-01-25**
