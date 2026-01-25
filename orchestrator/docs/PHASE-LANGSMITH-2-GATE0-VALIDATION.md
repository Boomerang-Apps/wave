# Phase LangSmith-2: Core Tracing Infrastructure - Gate 0 Validation

**Date:** 2026-01-25
**Status:** IN PROGRESS
**Phase:** LangSmith Tracing Integration - Core Infrastructure

---

## 1. Research Summary

### 1.1 LangSmith Tracing Components

| Component | Purpose |
|-----------|---------|
| `@traceable` decorator | Automatically trace function calls |
| `trace` context manager | Manual trace spans for code blocks |
| `tracing_context` | Set project/metadata for scope |
| `get_current_run_tree` | Access current trace context |
| Callback handlers | Async trace collection |

### 1.2 @traceable Decorator

```python
from langsmith import traceable

@traceable(
    run_type="chain",      # "llm", "chain", "tool", "retriever", "embedding"
    name="my_operation",   # Custom name (default: function name)
    metadata={"key": "val"},
    tags=["tag1", "tag2"],
    project_name="my-project",
)
def my_function(x):
    return x
```

**Run Types:**
- `llm` - LLM API calls
- `chain` - General chain operations (default)
- `tool` - Tool/function executions
- `retriever` - Document retrieval
- `embedding` - Embedding generation
- `prompt` - Prompt formatting
- `parser` - Output parsing

### 1.3 Trace Context Manager

```python
from langsmith import trace

with trace("operation_name", run_type="tool", tags=["important"]) as run:
    # Code to trace
    run.metadata["key"] = "value"
    result = do_something()
    run.end(outputs={"result": result})
```

### 1.4 Tracing Context

```python
from langsmith import tracing_context

with tracing_context(
    project_name="my-project",
    tags=["test"],
    metadata={"version": "1.0"},
    enabled=True,
):
    # All traced functions inherit this context
    my_function()
```

### 1.5 Run Tree Access

```python
from langsmith import get_current_run_tree

run = get_current_run_tree()
if run:
    run.metadata["runtime_key"] = "value"
```

---

## 2. Gap Analysis

### 2.1 Current State (Phase 1 Complete)

| Component | Status | Notes |
|-----------|--------|-------|
| TracingConfig | ✅ Complete | `src/tracing/config.py` |
| Environment loading | ✅ Complete | `from_env()` method |
| Validation | ✅ Complete | `validate()` method |
| TracingManager | ❌ Missing | Core manager class |
| Decorators | ❌ Missing | WAVE-specific wrappers |
| Context handlers | ❌ Missing | Trace context management |

### 2.2 Required Implementation

| Component | Priority | Description |
|-----------|----------|-------------|
| `TracingManager` | High | Central manager for all tracing |
| `trace_node` decorator | High | Decorator for graph nodes |
| `trace_tool` decorator | High | Decorator for tool functions |
| `trace_llm_call` decorator | High | Decorator for LLM operations |
| Context helpers | Medium | get/set trace context |

---

## 3. Implementation Plan

### 3.1 Phase 2 Scope (Core Infrastructure)

1. **TracingManager class** - Singleton manager for tracing lifecycle
2. **Node decorator** - `@trace_node` for LangGraph nodes
3. **Tool decorator** - `@trace_tool` for tool functions
4. **LLM decorator** - `@trace_llm_call` for LLM invocations
5. **Context helpers** - `get_trace_context()`, `with_trace_context()`

### 3.2 File Structure

```
orchestrator/
├── src/
│   └── tracing/
│       ├── __init__.py      # Updated exports
│       ├── config.py        # Phase 1 (complete)
│       ├── manager.py       # TracingManager class
│       └── decorators.py    # Tracing decorators
└── tests/
    └── test_langsmith_core.py  # TDD tests (18 tests)
```

### 3.3 TracingManager Design

```python
class TracingManager:
    """Singleton manager for LangSmith tracing."""

    _instance: Optional["TracingManager"] = None

    def __init__(self, config: TracingConfig):
        self.config = config
        self._initialized = False

    @classmethod
    def get_instance(cls) -> "TracingManager":
        """Get or create singleton instance."""

    def initialize(self) -> bool:
        """Initialize tracing (apply config, validate)."""

    def is_active(self) -> bool:
        """Check if tracing is currently active."""

    def create_run(self, name: str, run_type: str, **kwargs) -> RunContext:
        """Create a new traced run."""

    def get_current_run(self) -> Optional[RunTree]:
        """Get the current run tree."""

    def shutdown(self) -> None:
        """Cleanup and shutdown tracing."""
```

### 3.4 Decorator Design

```python
def trace_node(
    name: Optional[str] = None,
    metadata: Optional[Dict] = None,
    tags: Optional[List[str]] = None,
):
    """Decorator for tracing LangGraph nodes."""

def trace_tool(
    name: Optional[str] = None,
    metadata: Optional[Dict] = None,
):
    """Decorator for tracing tool functions."""

def trace_llm_call(
    model: Optional[str] = None,
    metadata: Optional[Dict] = None,
):
    """Decorator for tracing LLM calls."""
```

---

## 4. TDD Test Plan

### 4.1 Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| TracingManager | 6 | Singleton, lifecycle, state |
| Decorators | 8 | trace_node, trace_tool, trace_llm_call |
| Context | 4 | Context management helpers |
| **Total** | **18** | |

### 4.2 Test Cases

```python
# TracingManager Tests
test_tracing_manager_exists()
test_tracing_manager_singleton()
test_tracing_manager_initialize()
test_tracing_manager_is_active()
test_tracing_manager_create_run()
test_tracing_manager_shutdown()

# Decorator Tests
test_trace_node_decorator_exists()
test_trace_node_preserves_function()
test_trace_node_adds_metadata()
test_trace_tool_decorator_exists()
test_trace_tool_sets_run_type()
test_trace_llm_call_decorator_exists()
test_trace_llm_call_captures_model()
test_decorators_work_when_disabled()

# Context Tests
test_get_trace_context_exists()
test_with_trace_context_exists()
test_context_inherits_config()
test_nested_contexts_work()
```

---

## 5. Integration Points

### 5.1 WAVE Node Integration

```python
# nodes/developer.py
from src.tracing import trace_node

@trace_node(tags=["agent", "developer"])
def developer_node(state: WAVEState) -> WAVEState:
    # Node implementation
    pass
```

### 5.2 Multi-LLM Integration

```python
# src/multi_llm.py
from src.tracing import trace_llm_call

@trace_llm_call(model="claude-3-opus")
async def call_claude(messages: List[dict]) -> str:
    # LLM call
    pass
```

---

## 6. Success Criteria

### 6.1 Gate 0 Checklist

- [x] Research @traceable decorator patterns
- [x] Research trace context manager
- [x] Document TracingManager design
- [x] Create test plan (18 tests)
- [ ] Write TDD tests (must FAIL initially)
- [ ] Implement TracingManager
- [ ] Implement decorators
- [ ] All tests pass
- [ ] Full test suite passes (513+ tests)

### 6.2 Acceptance Criteria

1. `TracingManager` singleton exists and manages lifecycle
2. `trace_node` decorator works on sync/async functions
3. `trace_tool` decorator sets correct run_type
4. `trace_llm_call` captures model info
5. Decorators are no-op when tracing disabled
6. All 18 new tests pass
7. All existing tests still pass

---

## 7. References

- [LangSmith @traceable Decorator](https://docs.langchain.com/langsmith/annotate-code)
- [Run Helpers Reference](https://reference.langchain.com/python/langsmith/observability/sdk/run_helpers/)
- [Trace Context Manager](https://docs.smith.langchain.com/reference/python/run_helpers/langsmith.run_helpers.trace)
- [LangSmith Tracing Deep Dive](https://medium.com/@aviadr1/langsmith-tracing-deep-dive-beyond-the-docs-75016c91f747)

---

**Next Step:** Write TDD tests (all must FAIL before implementation)
