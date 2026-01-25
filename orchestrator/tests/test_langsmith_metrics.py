"""
LangSmith Metrics & Export TDD Tests
Phase LangSmith-4: Metrics & Export

Tests for RunMetrics, MetricsCollector, and export utilities.
All tests must FAIL initially (TDD process).

Test Categories:
1. RunMetrics (3 tests)
2. MetricsCollector (6 tests)
3. Export Functions (4 tests)
4. Integration (2 tests)

Total: 15 tests
"""

import pytest
import json
import os
import tempfile
from datetime import datetime, timedelta
from typing import Dict, Any
from unittest.mock import MagicMock, patch


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def sample_run_id():
    """Sample run ID for testing."""
    return "test-run-123"


@pytest.fixture
def sample_metrics():
    """Create sample RunMetrics for testing."""
    from src.tracing.metrics import RunMetrics

    return RunMetrics(
        run_id="test-run-123",
        start_time=datetime(2026, 1, 25, 10, 0, 0),
        end_time=datetime(2026, 1, 25, 10, 5, 0),
        total_duration_ms=300000.0,
        node_executions=10,
        node_errors=1,
        tokens_used=5000,
        cost_usd=0.15,
        agent_counts={"cto_node": 2, "dev_node": 5, "qa_node": 3},
        agent_durations={"cto_node": 1000.0, "dev_node": 2500.0, "qa_node": 1500.0},
        retry_count=2,
        safety_violations=0,
    )


@pytest.fixture
def collector():
    """Get a fresh MetricsCollector instance."""
    from src.tracing.metrics import MetricsCollector

    MetricsCollector.reset_instance()
    return MetricsCollector.get_instance()


# =============================================================================
# Test Category 1: RunMetrics (3 tests)
# =============================================================================

class TestRunMetrics:
    """Tests for RunMetrics dataclass"""

    def test_run_metrics_exists(self):
        """RunMetrics class should exist"""
        from src.tracing.metrics import RunMetrics

        assert RunMetrics is not None

    def test_run_metrics_has_required_fields(self):
        """RunMetrics should have all required fields"""
        from src.tracing.metrics import RunMetrics

        metrics = RunMetrics(
            run_id="test",
            start_time=datetime.now(),
            end_time=None,
            total_duration_ms=0.0,
            node_executions=0,
            node_errors=0,
            tokens_used=0,
            cost_usd=0.0,
            agent_counts={},
            agent_durations={},
            retry_count=0,
            safety_violations=0,
        )

        assert hasattr(metrics, "run_id")
        assert hasattr(metrics, "start_time")
        assert hasattr(metrics, "end_time")
        assert hasattr(metrics, "total_duration_ms")
        assert hasattr(metrics, "node_executions")
        assert hasattr(metrics, "node_errors")
        assert hasattr(metrics, "tokens_used")
        assert hasattr(metrics, "cost_usd")
        assert hasattr(metrics, "agent_counts")
        assert hasattr(metrics, "agent_durations")
        assert hasattr(metrics, "retry_count")
        assert hasattr(metrics, "safety_violations")

    def test_run_metrics_calculates_duration(self, sample_metrics):
        """RunMetrics should calculate duration from start/end times"""
        # Duration should be 5 minutes = 300000 ms
        assert sample_metrics.total_duration_ms == 300000.0


# =============================================================================
# Test Category 2: MetricsCollector (6 tests)
# =============================================================================

class TestMetricsCollector:
    """Tests for MetricsCollector singleton"""

    def test_collector_singleton(self, collector):
        """MetricsCollector should be a singleton"""
        from src.tracing.metrics import MetricsCollector

        collector2 = MetricsCollector.get_instance()
        assert collector is collector2

    def test_collector_start_run(self, collector, sample_run_id):
        """Collector should track run start"""
        collector.start_run(sample_run_id)

        assert collector.is_collecting()
        assert collector.current_run_id == sample_run_id

    def test_collector_record_node_execution(self, collector, sample_run_id):
        """Collector should record node executions"""
        collector.start_run(sample_run_id)
        collector.record_node_execution("cto_node", 150.5)
        collector.record_node_execution("dev_node", 200.0)
        collector.record_node_execution("cto_node", 100.0)

        metrics = collector.get_current_metrics()
        assert metrics.node_executions == 3
        assert metrics.agent_counts["cto_node"] == 2
        assert metrics.agent_counts["dev_node"] == 1

    def test_collector_record_tokens(self, collector, sample_run_id):
        """Collector should record token usage"""
        collector.start_run(sample_run_id)
        collector.record_tokens(1000, 0.03)
        collector.record_tokens(500, 0.015)

        metrics = collector.get_current_metrics()
        assert metrics.tokens_used == 1500
        assert metrics.cost_usd == pytest.approx(0.045, rel=1e-3)

    def test_collector_end_run_returns_metrics(self, collector, sample_run_id):
        """Collector.end_run should return RunMetrics"""
        from src.tracing.metrics import RunMetrics

        collector.start_run(sample_run_id)
        collector.record_node_execution("test_node", 100.0)

        metrics = collector.end_run()

        assert isinstance(metrics, RunMetrics)
        assert metrics.run_id == sample_run_id
        assert metrics.node_executions == 1
        assert not collector.is_collecting()

    def test_collector_reset_between_runs(self, collector):
        """Collector should reset state between runs"""
        collector.start_run("run-1")
        collector.record_node_execution("node_a", 100.0)
        collector.end_run()

        collector.start_run("run-2")
        metrics = collector.get_current_metrics()

        assert metrics.run_id == "run-2"
        assert metrics.node_executions == 0
        assert len(metrics.agent_counts) == 0


# =============================================================================
# Test Category 3: Export Functions (4 tests)
# =============================================================================

class TestExportFunctions:
    """Tests for metrics export utilities"""

    def test_export_metrics_json_string(self, sample_metrics):
        """export_metrics_json should return JSON string"""
        from src.tracing.metrics import export_metrics_json

        result = export_metrics_json(sample_metrics)

        assert isinstance(result, str)
        data = json.loads(result)
        assert data["run_id"] == "test-run-123"
        assert data["tokens_used"] == 5000

    def test_export_metrics_json_file(self, sample_metrics):
        """export_metrics_json should write to file when path provided"""
        from src.tracing.metrics import export_metrics_json

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            filepath = f.name

        try:
            export_metrics_json(sample_metrics, filepath)

            with open(filepath, 'r') as f:
                data = json.load(f)

            assert data["run_id"] == "test-run-123"
            assert data["node_executions"] == 10
        finally:
            os.unlink(filepath)

    def test_get_run_summary(self, sample_metrics):
        """get_run_summary should return human-readable summary"""
        from src.tracing.metrics import get_run_summary

        summary = get_run_summary(sample_metrics)

        assert isinstance(summary, dict)
        assert "run_id" in summary
        assert "duration" in summary
        assert "total_nodes" in summary
        assert "total_tokens" in summary

    def test_summary_includes_all_fields(self, sample_metrics):
        """Summary should include all key metrics"""
        from src.tracing.metrics import get_run_summary

        summary = get_run_summary(sample_metrics)

        assert summary["run_id"] == "test-run-123"
        assert summary["total_nodes"] == 10
        assert summary["error_count"] == 1
        assert summary["total_tokens"] == 5000
        assert summary["total_cost_usd"] == 0.15
        assert summary["retry_count"] == 2


# =============================================================================
# Test Category 4: Integration (2 tests)
# =============================================================================

class TestIntegration:
    """Tests for LangSmith integration"""

    def test_attach_metrics_to_trace(self, sample_metrics):
        """attach_metrics_to_trace should attach to current trace"""
        from src.tracing.metrics import attach_metrics_to_trace
        from src.tracing.manager import TracingManager
        from src.tracing.config import TracingConfig

        # Enable tracing
        TracingManager.reset_instance()
        manager = TracingManager.get_instance()
        manager.initialize(TracingConfig(enabled=True, api_key="test-key"))

        # Should not raise
        attach_metrics_to_trace(sample_metrics)

        # Cleanup
        TracingManager.reset_instance()

    def test_metrics_work_when_tracing_disabled(self, collector, sample_run_id):
        """Metrics collection should work when tracing disabled"""
        from src.tracing.manager import TracingManager
        from src.tracing.config import TracingConfig

        # Disable tracing
        TracingManager.reset_instance()
        manager = TracingManager.get_instance()
        manager.initialize(TracingConfig(enabled=False))

        # Metrics should still work
        collector.start_run(sample_run_id)
        collector.record_node_execution("test_node", 100.0)
        metrics = collector.end_run()

        assert metrics.node_executions == 1

        # Cleanup
        TracingManager.reset_instance()


# =============================================================================
# Test Category 5: Module Exports (2 tests)
# =============================================================================

class TestModuleExports:
    """Tests for module-level exports"""

    def test_metrics_module_exports_all(self):
        """src.tracing.metrics should export all utilities"""
        from src.tracing.metrics import (
            RunMetrics,
            MetricsCollector,
            export_metrics_json,
            get_run_summary,
            attach_metrics_to_trace,
        )

        assert RunMetrics is not None
        assert callable(MetricsCollector.get_instance)
        assert callable(export_metrics_json)
        assert callable(get_run_summary)
        assert callable(attach_metrics_to_trace)

    def test_tracing_module_exports_metrics(self):
        """src.tracing should export metrics utilities"""
        from src.tracing import (
            RunMetrics,
            MetricsCollector,
            export_metrics_json,
            get_run_summary,
        )

        assert RunMetrics is not None
        assert MetricsCollector is not None
