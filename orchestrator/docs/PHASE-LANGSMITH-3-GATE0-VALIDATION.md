# Phase LangSmith-3: Node Instrumentation - Gate 0 Validation

**Date:** 2026-01-25
**Status:** COMPLETE
**Phase:** LangSmith Tracing Integration - Node Instrumentation

---

## 1. Research Summary

### 1.1 Existing WAVE Nodes

| Node | File | Purpose |
|------|------|---------|
| `cto_node` | `nodes/cto.py` | Architecture review |
| `pm_node` | `nodes/pm.py` | Task planning |
| `dev_node` | `nodes/dev.py` | Code implementation |
| `qa_node` | `nodes/qa.py` | Testing/validation |
| `supervisor_node` | `nodes/supervisor.py` | Routing decisions |
| `safety_gate_node` | `nodes/safety_gate.py` | Safety checks |
| `dev_fix_node` | `nodes/dev_fix.py` | Bug fixes |
| `human_escalation_node` | `nodes/human_escalation.py` | HITL handling |
| `fe_dev_node` | `nodes/dev_agents.py` | Frontend dev |
| `be_dev_node` | `nodes/dev_agents.py` | Backend dev |

### 1.2 Node Function Signature

All WAVE nodes follow this pattern:

```python
def node_name(state: WAVEState) -> Dict[str, Any]:
    """
    Node implementation.

    Args:
        state: Current WAVE state

    Returns:
        Dict with state updates
    """
    # ... implementation
    return {"current_agent": "node_name", ...}
```

### 1.3 Instrumentation Strategy

**Option A: Modify Each Node File** (Not chosen)
- Requires editing 10+ files
- Risk of breaking existing code
- Hard to maintain

**Option B: Node Wrapper Utility** (Chosen)
- Create `wrap_node()` function
- Non-invasive - original nodes unchanged
- Easy to enable/disable tracing
- Single point of maintenance

### 1.4 Node Wrapper Design

```python
def wrap_node(
    node_fn: Callable,
    name: Optional[str] = None,
    capture_state: bool = True,
) -> Callable:
    """
    Wrap a WAVE node with tracing.

    Captures:
    - Input state (optional)
    - Output state updates
    - Execution time
    - Any errors
    """
```

---

## 2. Gap Analysis

### 2.1 Current State (Phase 2 Complete)

| Component | Status | Notes |
|-----------|--------|-------|
| TracingManager | ✅ Complete | `src/tracing/manager.py` |
| trace_node decorator | ✅ Complete | `src/tracing/decorators.py` |
| Existing nodes | ✅ Exist | `nodes/*.py` (10 nodes) |
| Node wrapper | ❌ Missing | Utility for wrapping nodes |
| Traced node exports | ❌ Missing | Pre-wrapped node versions |

### 2.2 Required Implementation

| Component | Priority | Description |
|-----------|----------|-------------|
| `node_wrapper.py` | High | wrap_node utility function |
| `traced_nodes.py` | High | Pre-wrapped node exports |
| State capture | Medium | Capture input/output state |
| Error handling | High | Trace errors properly |

---

## 3. Implementation Plan

### 3.1 Phase 3 Scope (Node Instrumentation)

1. **wrap_node() function** - Generic node wrapper
2. **TracedNodeResult** - Result type with metadata
3. **State capture** - Optional input/output state logging
4. **Error tracing** - Capture and trace exceptions
5. **Pre-wrapped exports** - Ready-to-use traced nodes

### 3.2 File Structure

```
orchestrator/
├── src/
│   └── tracing/
│       ├── __init__.py      # Updated exports
│       ├── config.py        # Phase 1
│       ├── manager.py       # Phase 2
│       ├── decorators.py    # Phase 2
│       └── node_wrapper.py  # Phase 3 - NEW
├── nodes/
│   └── traced_nodes.py      # Phase 3 - NEW (exports)
└── tests/
    └── test_langsmith_nodes.py  # TDD tests (15 tests)
```

### 3.3 wrap_node Design

```python
@dataclass
class TracedNodeResult:
    """Result from a traced node execution."""
    output: Dict[str, Any]
    duration_ms: float
    trace_id: Optional[str]
    error: Optional[str]

def wrap_node(
    node_fn: Callable[[WAVEState], Dict[str, Any]],
    name: Optional[str] = None,
    capture_state: bool = False,
    tags: Optional[List[str]] = None,
) -> Callable[[WAVEState], Dict[str, Any]]:
    """
    Wrap a WAVE node function with tracing.

    The wrapped function:
    - Creates a trace span for the node
    - Captures execution time
    - Optionally captures input/output state
    - Handles and traces errors
    - Returns original output (transparent)
    """
```

### 3.4 Pre-wrapped Nodes

```python
# nodes/traced_nodes.py

from nodes import cto_node, dev_node, qa_node, ...
from src.tracing.node_wrapper import wrap_node

# Pre-wrapped versions
traced_cto_node = wrap_node(cto_node, tags=["agent", "cto"])
traced_dev_node = wrap_node(dev_node, tags=["agent", "dev"])
traced_qa_node = wrap_node(qa_node, tags=["agent", "qa"])
# ... etc
```

---

## 4. TDD Test Plan

### 4.1 Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| wrap_node Function | 5 | Core wrapper functionality |
| State Capture | 3 | Input/output state logging |
| Error Handling | 3 | Exception tracing |
| Pre-wrapped Nodes | 4 | Exported traced nodes |
| **Total** | **15** | |

### 4.2 Test Cases

```python
# wrap_node Function Tests
test_wrap_node_exists()
test_wrap_node_preserves_output()
test_wrap_node_preserves_async()
test_wrap_node_adds_timing()
test_wrap_node_works_when_tracing_disabled()

# State Capture Tests
test_capture_state_includes_input()
test_capture_state_includes_output()
test_capture_state_disabled_by_default()

# Error Handling Tests
test_wrap_node_traces_errors()
test_wrap_node_reraises_errors()
test_error_includes_traceback()

# Pre-wrapped Nodes Tests
test_traced_cto_node_exists()
test_traced_dev_node_exists()
test_traced_nodes_are_callable()
test_traced_nodes_return_dict()
```

---

## 5. Integration Points

### 5.1 Graph Integration

```python
# src/graph.py
from nodes.traced_nodes import (
    traced_cto_node,
    traced_dev_node,
    traced_qa_node,
)

# Use traced versions in graph
graph.add_node("cto", traced_cto_node)
graph.add_node("dev", traced_dev_node)
```

### 5.2 Conditional Tracing

```python
# Use traced or original based on config
from src.tracing import is_tracing_active
from nodes import cto_node
from nodes.traced_nodes import traced_cto_node

node = traced_cto_node if is_tracing_active() else cto_node
```

---

## 6. Success Criteria

### 6.1 Gate 0 Checklist

- [x] Research existing node structure
- [x] Document wrapper strategy
- [x] Define wrap_node interface
- [x] Create test plan (15 tests)
- [x] Write TDD tests (must FAIL initially)
- [x] Implement node_wrapper.py
- [x] Create traced_nodes.py
- [x] All tests pass
- [x] Full test suite passes (548+ tests)

### 6.2 Acceptance Criteria

1. `wrap_node()` function wraps any node transparently
2. Wrapped nodes produce identical output
3. State capture is optional and off by default
4. Errors are traced and re-raised
5. Pre-wrapped versions of all core nodes exist
6. All 15 new tests pass
7. All existing tests still pass

---

## 7. References

- [LangSmith Custom Instrumentation](https://docs.langchain.com/langsmith/annotate-code)
- [LangGraph State Management](https://langchain-ai.github.io/langgraph/)
- Phase 2: `src/tracing/decorators.py`

---

**Next Step:** Write TDD tests (all must FAIL before implementation)
