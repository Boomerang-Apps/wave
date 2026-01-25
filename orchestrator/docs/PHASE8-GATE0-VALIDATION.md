# Phase 8: Parallel Dev Agents - Gate 0 Validation

**Date:** 2026-01-25
**Phase:** 8 of 11
**Pattern:** Parallel Frontend/Backend Developer Agents

---

## Requirements from Grok's Recommendations

### Objective
Run frontend and backend developers in parallel within each domain sub-graph, enabling simultaneous fe-dev/be-dev execution.

### Key Quote from Grok
> "Domain CTO → [fe-dev || be-dev] → QA+Scorer → (retry or pass)"

The pattern shows parallel dev agents within the domain workflow, where frontend and backend work happens simultaneously before QA validation.

---

## Gap Analysis

### Current Implementation (Phase 7)

```python
# Current: Single dev node in domain workflow
def domain_dev_node(state: DomainState) -> Dict[str, Any]:
    # Single dev handles all work sequentially
    return {
        "files_modified": [...],
        "tests_written": [...],
    }
```

**Limitations:**
- Single dev node handles all work (no specialization)
- No parallel fe/be execution within domains
- No dev type tracking or assignment
- No merge of parallel dev results

### Required Implementation (Phase 8)

| Feature | Current | Required |
|---------|---------|----------|
| Dev agent types | ❌ Single dev | ✅ fe-dev, be-dev |
| Parallel execution | ❌ Sequential | ✅ fe-dev \|\| be-dev |
| Dev assignments | ❌ None | ✅ `dev_assignments: List[str]` |
| Result merging | ❌ None | ✅ `merge_dev_results` node |
| Agent routing | ❌ None | ✅ Route by assignment type |

---

## Components to Implement

### 1. Dev Agent State (`src/domains/dev_agent_state.py` - NEW)

```python
class DevAgentState(TypedDict):
    domain: str
    current_assignment: str  # "frontend" or "backend"
    agent_type: str
    files_modified: List[str]
    tests_written: List[str]
    success: bool
    error: Optional[str]

class DomainDevState(TypedDict):
    domain: str
    dev_assignments: List[str]  # ["frontend", "backend"]
    dev_results: List[DevAgentResult]
    merged_files: List[str]
    merged_tests: List[str]
```

### 2. Dev Agent Nodes (`nodes/dev_agents.py` - NEW)

```python
def fe_dev_node(state: DevAgentState) -> Dict[str, Any]
def be_dev_node(state: DevAgentState) -> Dict[str, Any]
def dev_agent_node(state: DevAgentState) -> Dict[str, Any]  # Router
```

### 3. Dev Result Merger (`src/domains/dev_merger.py` - NEW)

```python
def merge_dev_results(state: DomainDevState) -> Dict[str, Any]
def aggregate_dev_files(dev_results: List[DevAgentResult]) -> List[str]
def aggregate_dev_tests(dev_results: List[DevAgentResult]) -> List[str]
```

### 4. Parallel Dev Graph (`src/domains/parallel_dev_graph.py` - NEW)

```python
def create_parallel_dev_graph() -> StateGraph
def compile_parallel_dev_graph() -> CompiledStateGraph
```

---

## Test Categories (TDD)

### 1. Dev Agent Types Tests (6 tests)
- `test_dev_agent_state_exists`
- `test_fe_dev_node_exists`
- `test_be_dev_node_exists`
- `test_fe_dev_returns_frontend_type`
- `test_be_dev_returns_backend_type`
- `test_dev_agent_routes_by_assignment`

### 2. Parallel Dev Tests (8 tests)
- `test_domain_dev_state_has_assignments`
- `test_domain_dev_state_has_results`
- `test_parallel_dev_graph_exists`
- `test_parallel_dev_graph_has_fe_node`
- `test_parallel_dev_graph_has_be_node`
- `test_parallel_dev_graph_has_merge_node`
- `test_parallel_dev_graph_compiles`
- `test_parallel_dev_graph_is_runnable`

### 3. Dev Merge Tests (5 tests)
- `test_merge_dev_results_exists`
- `test_merge_aggregates_files`
- `test_merge_aggregates_tests`
- `test_merge_handles_empty_results`
- `test_merge_deduplicates_files`

**Total: 19 tests**

---

## Implementation Order

1. **Create dev_agent_state.py** - State schemas for dev agents
2. **Create dev_agents.py** - fe-dev, be-dev, router nodes
3. **Create dev_merger.py** - Result aggregation
4. **Create parallel_dev_graph.py** - StateGraph for parallel execution
5. **Update __init__.py files** - Export new components

---

## Success Criteria

- [ ] All 19 TDD tests pass
- [ ] Full test suite (425 + 19 = 444) passes
- [ ] Frontend and backend devs execute in parallel
- [ ] Results are properly merged after parallel execution
- [ ] Graph integrates with domain sub-graphs

---

## Example: Parallel Dev Flow

```
Input:
  domain: "auth"
  dev_assignments: ["frontend", "backend"]

Execution:
  1. Domain CTO plans work
  2. Parallel fan-out:
     ├── fe-dev executes → {files: ["LoginForm.tsx"], tests: ["login.test.ts"]}
     └── be-dev executes → {files: ["auth_api.py"], tests: ["test_auth.py"]}
  3. Merge results:
     {
       merged_files: ["LoginForm.tsx", "auth_api.py"],
       merged_tests: ["login.test.ts", "test_auth.py"]
     }
  4. QA validates merged results
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   PARALLEL DEV GRAPH                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  START (from Domain CTO)                                        │
│    ↓                                                            │
│  ┌──────────────────────┐                                       │
│  │   FAN-OUT TO DEVS    │  ← Create tasks for fe/be            │
│  └──────────┬───────────┘                                       │
│       ┌─────┴─────┐                                             │
│       ↓           ↓                                             │
│  ┌─────────┐ ┌─────────┐                                       │
│  │ FE-DEV  │ │ BE-DEV  │  ← Execute in parallel                │
│  │         │ │         │                                        │
│  │ React,  │ │ API,    │                                        │
│  │ Vue,    │ │ DB,     │                                        │
│  │ styles  │ │ services│                                        │
│  └────┬────┘ └────┬────┘                                       │
│       └─────┬─────┘                                             │
│             ↓                                                    │
│  ┌──────────────────────┐                                       │
│  │   MERGE DEV RESULTS  │  ← Aggregate files & tests           │
│  └──────────┬───────────┘                                       │
│             ↓                                                    │
│           END (to QA)                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Notes

- This phase focuses on parallel dev execution within a single domain
- Integration with the full domain sub-graph will be in domain_graph_v2
- Dev agents can be extended with specialized tools (fe: npm, be: pytest)
- Budget tracking should account for parallel execution costs
