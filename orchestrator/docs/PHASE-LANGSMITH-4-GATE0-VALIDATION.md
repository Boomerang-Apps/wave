# Phase LangSmith-4: Metrics & Export - Gate 0 Validation

**Date:** 2026-01-25
**Status:** COMPLETE
**Phase:** LangSmith Tracing Integration - Metrics & Export

---

## 1. Research Summary

### 1.1 WAVE State Metrics Sources

| Source | Field | Description |
|--------|-------|-------------|
| WAVEState | `budget.tokens_used` | Total tokens consumed |
| WAVEState | `budget.cost_used_usd` | Total cost in USD |
| WAVEState | `retry_count` | Number of retries |
| WAVEState | `actions` | List of agent actions |
| WAVEState | `safety.violations` | Safety violations |
| node_wrapper | `duration_ms` | Node execution time |
| node_wrapper | `error` | Node errors |

### 1.2 LangSmith Metrics Capabilities

LangSmith provides built-in metrics via the API:
- Run latency
- Token usage (if captured)
- Error rates
- Feedback scores

For custom metrics, we need to:
1. Capture metrics during execution
2. Attach as metadata to traces
3. Optionally export to external systems

### 1.3 Metrics Strategy

**Option A: Inline Metadata** (Chosen)
- Attach metrics to each trace as metadata
- Use LangSmith dashboard for visualization
- Lightweight, no external dependencies

**Option B: Separate Metrics Store**
- Store metrics in separate database
- More complex setup
- Better for custom dashboards

---

## 2. Gap Analysis

### 2.1 Current State (Phase 3 Complete)

| Component | Status | Notes |
|-----------|--------|-------|
| TracingManager | ✅ Complete | `src/tracing/manager.py` |
| Node Wrapper | ✅ Complete | `src/tracing/node_wrapper.py` |
| Trace Context | ✅ Complete | `src/tracing/decorators.py` |
| Metrics Collection | ❌ Missing | Need MetricsCollector |
| Export Utilities | ❌ Missing | Need JSON/Report export |
| Run Summary | ❌ Missing | Need aggregation |

### 2.2 Required Implementation

| Component | Priority | Description |
|-----------|----------|-------------|
| `RunMetrics` | High | Dataclass for run metrics |
| `MetricsCollector` | High | Collect metrics during run |
| `export_metrics_json` | Medium | Export to JSON |
| `get_run_summary` | Medium | Aggregate run summary |
| `attach_metrics_to_trace` | High | Attach to LangSmith |

---

## 3. Implementation Plan

### 3.1 Phase 4 Scope (Metrics & Export)

1. **RunMetrics dataclass** - Structured metrics container
2. **MetricsCollector** - Singleton for collecting metrics
3. **JSON export** - Export metrics to JSON file
4. **Run summary** - Aggregate metrics for a run
5. **LangSmith integration** - Attach metrics to traces

### 3.2 File Structure

```
orchestrator/
├── src/
│   └── tracing/
│       ├── __init__.py      # Updated exports
│       ├── config.py        # Phase 1
│       ├── manager.py       # Phase 2
│       ├── decorators.py    # Phase 2
│       ├── node_wrapper.py  # Phase 3
│       └── metrics.py       # Phase 4 - NEW
└── tests/
    └── test_langsmith_metrics.py  # TDD tests (15 tests)
```

### 3.3 RunMetrics Design

```python
@dataclass
class RunMetrics:
    """Metrics collected for a single run."""
    run_id: str
    start_time: datetime
    end_time: Optional[datetime]

    # Execution metrics
    total_duration_ms: float
    node_executions: int
    node_errors: int

    # Token/cost metrics
    tokens_used: int
    cost_usd: float

    # Agent metrics
    agent_counts: Dict[str, int]  # agent -> execution count
    agent_durations: Dict[str, float]  # agent -> total ms

    # Quality metrics
    retry_count: int
    safety_violations: int
```

### 3.4 MetricsCollector Design

```python
class MetricsCollector:
    """
    Singleton collector for run metrics.

    Usage:
        collector = MetricsCollector.get_instance()
        collector.start_run("run-123")
        collector.record_node_execution("cto_node", 150.5)
        collector.record_tokens(1500, 0.03)
        metrics = collector.end_run()
    """

    def start_run(self, run_id: str) -> None
    def end_run(self) -> RunMetrics
    def record_node_execution(self, node_name: str, duration_ms: float) -> None
    def record_node_error(self, node_name: str, error: str) -> None
    def record_tokens(self, count: int, cost_usd: float) -> None
    def record_retry(self) -> None
    def record_safety_violation(self, violation: str) -> None
    def get_current_metrics(self) -> Optional[RunMetrics]
```

### 3.5 Export Functions

```python
def export_metrics_json(
    metrics: RunMetrics,
    filepath: Optional[str] = None
) -> str:
    """Export metrics to JSON string/file."""

def get_run_summary(metrics: RunMetrics) -> Dict[str, Any]:
    """Get human-readable summary of run metrics."""

def attach_metrics_to_trace(metrics: RunMetrics) -> None:
    """Attach metrics to current LangSmith trace."""
```

---

## 4. TDD Test Plan

### 4.1 Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| RunMetrics | 3 | Dataclass validation |
| MetricsCollector | 6 | Collector functionality |
| Export Functions | 4 | JSON/summary export |
| Integration | 2 | LangSmith attachment |
| **Total** | **15** | |

### 4.2 Test Cases

```python
# RunMetrics Tests
test_run_metrics_exists()
test_run_metrics_has_required_fields()
test_run_metrics_calculates_duration()

# MetricsCollector Tests
test_collector_singleton()
test_collector_start_run()
test_collector_record_node_execution()
test_collector_record_tokens()
test_collector_end_run_returns_metrics()
test_collector_reset_between_runs()

# Export Tests
test_export_metrics_json_string()
test_export_metrics_json_file()
test_get_run_summary()
test_summary_includes_all_fields()

# Integration Tests
test_attach_metrics_to_trace()
test_metrics_work_when_tracing_disabled()
```

---

## 5. Integration Points

### 5.1 Node Wrapper Integration

```python
# Automatic metric recording in wrap_node
def wrap_node(node_fn, name=None, capture_state=False, tags=None):
    # ... existing wrapper code ...

    # Record metrics
    collector = MetricsCollector.get_instance()
    if collector.is_collecting():
        collector.record_node_execution(node_name, duration_ms)
        if error:
            collector.record_node_error(node_name, str(error))
```

### 5.2 Run Lifecycle Integration

```python
# In main.py or runner
from src.tracing.metrics import MetricsCollector, export_metrics_json

collector = MetricsCollector.get_instance()
collector.start_run(run_id)

try:
    # Execute graph
    result = graph.invoke(state)
finally:
    metrics = collector.end_run()
    export_metrics_json(metrics, f"runs/{run_id}/metrics.json")
```

---

## 6. Success Criteria

### 6.1 Gate 0 Checklist

- [x] Research metrics sources
- [x] Document metrics strategy
- [x] Define RunMetrics interface
- [x] Define MetricsCollector interface
- [x] Create test plan (15 tests)
- [x] Write TDD tests (must FAIL initially)
- [x] Implement metrics.py
- [x] All tests pass
- [x] Full test suite passes (563+ tests)

### 6.2 Acceptance Criteria

1. `RunMetrics` captures all relevant run metrics
2. `MetricsCollector` follows singleton pattern
3. Collector properly tracks node executions
4. JSON export produces valid JSON
5. Run summary is human-readable
6. Works when tracing is disabled
7. All 15 new tests pass
8. All existing tests still pass

---

## 7. References

- [LangSmith Metrics API](https://docs.smith.langchain.com/reference)
- [LangSmith Custom Metadata](https://docs.langchain.com/langsmith/annotate-code)
- Phase 3: `src/tracing/node_wrapper.py`
- WAVE State: `state.py`

---

**Next Step:** Write TDD tests (all must FAIL before implementation)
