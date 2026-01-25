# Phase 7: Native LangGraph Parallel Pattern - Gate 0 Validation

**Date:** 2026-01-25
**Phase:** 7 of 11
**Pattern:** Topological Sort + Layer-Based Parallel Execution

---

## Requirements from Grok's Recommendations

### Objective
Replace `asyncio.gather` with a more sophisticated parallel execution pattern that:
1. Respects domain dependencies via topological sorting
2. Executes independent domains in parallel layers
3. Provides native LangGraph integration for fan-out/reduce

### Key Quote from Grok
> "Topological sort before fan-out (your dependency-graph.js prep)... LangGraph's `.map()` handles fan-out/reduce natively"

---

## Gap Analysis

### Current Implementation (Phase 2)

```python
# Current: src/parallel/dispatcher.py
async def execute_domains_parallel(state: ParallelState) -> List[DomainResult]:
    tasks = [execute_single_domain(domain, ...) for domain in domains]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return processed_results
```

**Limitations:**
- No dependency awareness - all domains run simultaneously
- No topological sorting - order is arbitrary
- Uses raw `asyncio.gather` - not LangGraph-native
- No execution layers - cannot respect "A before B" constraints

### Required Implementation (Phase 7)

| Feature | Current | Required |
|---------|---------|----------|
| Dependency tracking | ❌ None | ✅ `domain_dependencies: Dict[str, List[str]]` |
| Topological sort | ❌ None | ✅ Kahn's algorithm |
| Execution layers | ❌ None | ✅ `execution_layers: List[List[str]]` |
| Layer execution | ❌ All at once | ✅ Layer-by-layer with dependencies |
| LangGraph integration | ❌ asyncio.gather | ✅ StateGraph with Send() pattern |

---

## Components to Implement

### 1. Enhanced Parallel State (`src/parallel/parallel_state.py` - modify)

```python
class ParallelState(TypedDict):
    # Existing fields...

    # NEW: Dependency support
    domain_dependencies: Dict[str, List[str]]  # {domain: [depends_on_domains]}
    sorted_domains: List[str]                   # Topologically sorted
    execution_layers: List[List[str]]           # [[layer0], [layer1], ...]
    current_layer: int                          # Currently executing layer
```

### 2. Dependency Sorter (`src/parallel/dependency_sort.py` - NEW)

```python
def topological_sort_domains(domains: List[str], dependencies: Dict) -> List[str]
def compute_execution_layers(domains: List[str], dependencies: Dict) -> List[List[str]]
def detect_circular_dependencies(dependencies: Dict) -> List[List[str]]
def validate_dependencies(domains: List[str], dependencies: Dict) -> Dict[str, Any]
```

### 3. Layer Executor (`src/parallel/layer_executor.py` - NEW)

```python
def execute_layer(state: ParallelState, layer_index: int) -> Dict[str, Any]
async def execute_layer_parallel(domains: List[str], state: ParallelState) -> List[DomainResult]
def layer_execution_node(state: ParallelState) -> Dict[str, Any]
def should_continue_layers(state: ParallelState) -> str  # "next_layer" or "done"
```

### 4. Native Parallel Graph (`src/parallel/native_parallel_graph.py` - NEW)

```python
def create_native_parallel_graph() -> StateGraph
def compile_native_parallel_graph(checkpointer=None) -> CompiledStateGraph
```

---

## Test Categories (TDD)

### 1. Dependency State Tests (5 tests)
- `test_parallel_state_has_dependencies_field`
- `test_parallel_state_has_sorted_domains`
- `test_parallel_state_has_execution_layers`
- `test_parallel_state_has_current_layer`
- `test_create_parallel_state_with_dependencies`

### 2. Topological Sort Tests (8 tests)
- `test_topological_sort_exists`
- `test_topological_sort_no_dependencies`
- `test_topological_sort_simple_chain`
- `test_topological_sort_diamond_pattern`
- `test_detect_circular_dependencies_exists`
- `test_detect_circular_dependency_simple`
- `test_validate_dependencies_exists`
- `test_validate_dependencies_missing_domain`

### 3. Execution Layer Tests (6 tests)
- `test_compute_execution_layers_exists`
- `test_compute_layers_independent_domains`
- `test_compute_layers_sequential_dependencies`
- `test_compute_layers_partial_dependencies`
- `test_layer_executor_exists`
- `test_layer_execution_node_exists`

### 4. Native Parallel Graph Tests (5 tests)
- `test_create_native_parallel_graph_exists`
- `test_native_parallel_graph_has_sort_node`
- `test_native_parallel_graph_has_layer_executor`
- `test_native_parallel_graph_compiles`
- `test_native_parallel_graph_is_runnable`

**Total: 24 tests**

---

## Implementation Order

1. **Enhance ParallelState** - Add dependency fields
2. **Create dependency_sort.py** - Topological sort + layer computation
3. **Create layer_executor.py** - Layer-by-layer execution
4. **Create native_parallel_graph.py** - LangGraph StateGraph
5. **Update __init__.py** - Export new components

---

## Success Criteria

- [ ] All 24 TDD tests pass
- [ ] Full test suite (401 + 24 = 425) passes
- [ ] Domains with dependencies execute in correct order
- [ ] Independent domains within a layer execute in parallel
- [ ] Circular dependencies are detected and reported
- [ ] Graph integrates with existing WAVE orchestrator

---

## Example: Dependency Resolution

```
Input:
  domains: ["auth", "payments", "profile", "api"]
  dependencies: {
    "payments": ["auth"],      # payments depends on auth
    "profile": ["auth"],       # profile depends on auth
    "api": ["payments", "profile"]  # api depends on both
  }

Execution Layers:
  Layer 0: ["auth"]            # No dependencies - run first
  Layer 1: ["payments", "profile"]  # Depend on Layer 0 - run parallel
  Layer 2: ["api"]             # Depends on Layer 1 - run last

Sorted: ["auth", "payments", "profile", "api"]
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   NATIVE PARALLEL GRAPH                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  START                                                          │
│    ↓                                                            │
│  ┌──────────────────────┐                                       │
│  │   DEPENDENCY SORT    │  ← Topological sort, compute layers   │
│  └──────────┬───────────┘                                       │
│             ↓                                                    │
│  ┌──────────────────────┐                                       │
│  │   LAYER EXECUTOR     │  ← Execute current layer in parallel  │
│  └──────────┬───────────┘                                       │
│             ↓                                                    │
│       ┌─────┴─────┐                                             │
│       ↓           ↓                                             │
│  [next_layer] [all_done]                                        │
│       │           │                                             │
│       ↓           ↓                                             │
│  (loop back)   AGGREGATOR                                       │
│                   ↓                                             │
│                  END                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Notes

- LangGraph's actual `.map()` API may differ from Grok's pseudo-code
- Layer-based execution provides same semantics with clearer control
- Circular dependency detection prevents infinite loops
- This pattern enables Portal to pass `dependencies` from dependency-graph.js
