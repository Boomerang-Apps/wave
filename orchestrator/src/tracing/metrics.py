"""
LangSmith Metrics & Export Module
Phase LangSmith-4: Metrics & Export

Provides metrics collection and export utilities for WAVE runs:
    - RunMetrics: Dataclass for run metrics
    - MetricsCollector: Singleton for collecting metrics
    - export_metrics_json: Export to JSON
    - get_run_summary: Human-readable summary
    - attach_metrics_to_trace: Attach to LangSmith

All utilities work independently of tracing state.
"""

import json
import threading
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, Dict, Any, List

from .manager import is_tracing_active


# =============================================================================
# RUN METRICS DATACLASS
# =============================================================================

@dataclass
class RunMetrics:
    """
    Metrics collected for a single WAVE run.

    Captures execution, token, cost, and quality metrics
    for analysis and reporting.

    Attributes:
        run_id: Unique run identifier
        start_time: Run start timestamp
        end_time: Run end timestamp (None if still running)
        total_duration_ms: Total execution time in milliseconds
        node_executions: Total number of node executions
        node_errors: Number of node errors
        tokens_used: Total tokens consumed
        cost_usd: Total cost in USD
        agent_counts: Execution count per agent
        agent_durations: Total duration per agent (ms)
        retry_count: Number of retries
        safety_violations: Number of safety violations
    """

    run_id: str
    start_time: datetime
    end_time: Optional[datetime]
    total_duration_ms: float
    node_executions: int
    node_errors: int
    tokens_used: int
    cost_usd: float
    agent_counts: Dict[str, int]
    agent_durations: Dict[str, float]
    retry_count: int
    safety_violations: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        data = asdict(self)
        # Convert datetime objects to ISO strings
        data["start_time"] = self.start_time.isoformat() if self.start_time else None
        data["end_time"] = self.end_time.isoformat() if self.end_time else None
        return data


# =============================================================================
# METRICS COLLECTOR
# =============================================================================

class MetricsCollector:
    """
    Singleton collector for WAVE run metrics.

    Collects metrics during run execution and produces
    a RunMetrics summary at the end.

    Usage:
        collector = MetricsCollector.get_instance()
        collector.start_run("run-123")
        collector.record_node_execution("cto_node", 150.5)
        collector.record_tokens(1500, 0.03)
        metrics = collector.end_run()
    """

    _instance: Optional["MetricsCollector"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self):
        """Initialize MetricsCollector."""
        self._reset_state()

    def _reset_state(self) -> None:
        """Reset internal state for new run."""
        self._run_id: Optional[str] = None
        self._start_time: Optional[datetime] = None
        self._collecting: bool = False
        self._node_executions: int = 0
        self._node_errors: int = 0
        self._tokens_used: int = 0
        self._cost_usd: float = 0.0
        self._agent_counts: Dict[str, int] = {}
        self._agent_durations: Dict[str, float] = {}
        self._retry_count: int = 0
        self._safety_violations: int = 0
        self._errors: List[str] = []

    @classmethod
    def get_instance(cls) -> "MetricsCollector":
        """
        Get or create the singleton MetricsCollector instance.

        Returns:
            MetricsCollector instance
        """
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """
        Reset the singleton instance.

        Used for testing to ensure clean state.
        """
        with cls._lock:
            if cls._instance is not None:
                cls._instance._reset_state()
            cls._instance = None

    def start_run(self, run_id: str) -> None:
        """
        Start collecting metrics for a new run.

        Args:
            run_id: Unique identifier for the run
        """
        self._reset_state()
        self._run_id = run_id
        self._start_time = datetime.now()
        self._collecting = True

    def end_run(self) -> RunMetrics:
        """
        End metrics collection and return RunMetrics.

        Returns:
            RunMetrics with all collected data
        """
        end_time = datetime.now()

        # Calculate total duration
        if self._start_time:
            duration = (end_time - self._start_time).total_seconds() * 1000
        else:
            duration = 0.0

        metrics = RunMetrics(
            run_id=self._run_id or "unknown",
            start_time=self._start_time or datetime.now(),
            end_time=end_time,
            total_duration_ms=duration,
            node_executions=self._node_executions,
            node_errors=self._node_errors,
            tokens_used=self._tokens_used,
            cost_usd=self._cost_usd,
            agent_counts=dict(self._agent_counts),
            agent_durations=dict(self._agent_durations),
            retry_count=self._retry_count,
            safety_violations=self._safety_violations,
        )

        self._collecting = False
        return metrics

    def is_collecting(self) -> bool:
        """Check if currently collecting metrics."""
        return self._collecting

    @property
    def current_run_id(self) -> Optional[str]:
        """Get current run ID."""
        return self._run_id

    def record_node_execution(self, node_name: str, duration_ms: float) -> None:
        """
        Record a node execution.

        Args:
            node_name: Name of the executed node
            duration_ms: Execution duration in milliseconds
        """
        if not self._collecting:
            return

        self._node_executions += 1

        # Track per-agent counts
        if node_name not in self._agent_counts:
            self._agent_counts[node_name] = 0
            self._agent_durations[node_name] = 0.0

        self._agent_counts[node_name] += 1
        self._agent_durations[node_name] += duration_ms

    def record_node_error(self, node_name: str, error: str) -> None:
        """
        Record a node error.

        Args:
            node_name: Name of the node that errored
            error: Error message
        """
        if not self._collecting:
            return

        self._node_errors += 1
        self._errors.append(f"{node_name}: {error}")

    def record_tokens(self, count: int, cost_usd: float) -> None:
        """
        Record token usage.

        Args:
            count: Number of tokens used
            cost_usd: Cost in USD
        """
        if not self._collecting:
            return

        self._tokens_used += count
        self._cost_usd += cost_usd

    def record_retry(self) -> None:
        """Record a retry attempt."""
        if not self._collecting:
            return

        self._retry_count += 1

    def record_safety_violation(self, violation: str) -> None:
        """
        Record a safety violation.

        Args:
            violation: Description of the violation
        """
        if not self._collecting:
            return

        self._safety_violations += 1

    def get_current_metrics(self) -> Optional[RunMetrics]:
        """
        Get current metrics without ending the run.

        Returns:
            RunMetrics snapshot or None if not collecting
        """
        if not self._collecting:
            return None

        return RunMetrics(
            run_id=self._run_id or "unknown",
            start_time=self._start_time or datetime.now(),
            end_time=None,
            total_duration_ms=0.0,
            node_executions=self._node_executions,
            node_errors=self._node_errors,
            tokens_used=self._tokens_used,
            cost_usd=self._cost_usd,
            agent_counts=dict(self._agent_counts),
            agent_durations=dict(self._agent_durations),
            retry_count=self._retry_count,
            safety_violations=self._safety_violations,
        )


# =============================================================================
# EXPORT FUNCTIONS
# =============================================================================

def export_metrics_json(
    metrics: RunMetrics,
    filepath: Optional[str] = None,
) -> str:
    """
    Export metrics to JSON.

    Args:
        metrics: RunMetrics to export
        filepath: Optional file path to write to

    Returns:
        JSON string of metrics
    """
    data = metrics.to_dict()
    json_str = json.dumps(data, indent=2, default=str)

    if filepath:
        with open(filepath, 'w') as f:
            f.write(json_str)

    return json_str


def get_run_summary(metrics: RunMetrics) -> Dict[str, Any]:
    """
    Get human-readable summary of run metrics.

    Args:
        metrics: RunMetrics to summarize

    Returns:
        Dictionary with summary fields
    """
    # Calculate duration string
    if metrics.total_duration_ms > 0:
        seconds = metrics.total_duration_ms / 1000
        if seconds >= 60:
            duration = f"{seconds / 60:.1f} minutes"
        else:
            duration = f"{seconds:.1f} seconds"
    else:
        duration = "N/A"

    return {
        "run_id": metrics.run_id,
        "duration": duration,
        "total_nodes": metrics.node_executions,
        "error_count": metrics.node_errors,
        "total_tokens": metrics.tokens_used,
        "total_cost_usd": metrics.cost_usd,
        "retry_count": metrics.retry_count,
        "safety_violations": metrics.safety_violations,
        "agents_used": list(metrics.agent_counts.keys()),
        "busiest_agent": max(
            metrics.agent_counts.items(),
            key=lambda x: x[1],
            default=("none", 0)
        )[0] if metrics.agent_counts else "none",
    }


def attach_metrics_to_trace(metrics: RunMetrics) -> None:
    """
    Attach metrics to current LangSmith trace.

    If tracing is not active, this is a no-op.

    Args:
        metrics: RunMetrics to attach
    """
    if not is_tracing_active():
        return

    try:
        from langsmith import get_current_run_tree

        run_tree = get_current_run_tree()
        if run_tree:
            # Attach metrics as metadata
            run_tree.metadata = run_tree.metadata or {}
            run_tree.metadata["wave_metrics"] = metrics.to_dict()

    except ImportError:
        # LangSmith not installed
        pass
    except Exception:
        # Ignore errors - metrics attachment is optional
        pass


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "RunMetrics",
    "MetricsCollector",
    "export_metrics_json",
    "get_run_summary",
    "attach_metrics_to_trace",
]
