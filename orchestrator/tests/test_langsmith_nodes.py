"""
LangSmith Node Instrumentation TDD Tests
Phase LangSmith-3: Node Instrumentation

Tests for wrap_node utility and pre-wrapped node exports.
All tests must FAIL initially (TDD process).

Test Categories:
1. wrap_node Function (5 tests)
2. State Capture (3 tests)
3. Error Handling (3 tests)
4. Pre-wrapped Nodes (4 tests)

Total: 15 tests
"""

import pytest
import asyncio
from typing import Dict, Any
from unittest.mock import MagicMock, patch


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def sample_state():
    """Sample WAVE state for testing."""
    return {
        "run_id": "test-123",
        "task": "Test task",
        "current_agent": "unknown",
        "messages": [],
        "actions": [],
    }


@pytest.fixture
def sample_node():
    """Sample node function for testing."""
    def node_fn(state: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "current_agent": "test_node",
            "result": state.get("task", "") + " processed",
        }
    return node_fn


@pytest.fixture
def async_sample_node():
    """Sample async node function for testing."""
    async def async_node_fn(state: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "current_agent": "async_test_node",
            "result": state.get("task", "") + " processed async",
        }
    return async_node_fn


@pytest.fixture
def error_node():
    """Node that raises an error."""
    def node_fn(state: Dict[str, Any]) -> Dict[str, Any]:
        raise ValueError("Test error from node")
    return node_fn


# =============================================================================
# Test Category 1: wrap_node Function (5 tests)
# =============================================================================

class TestWrapNodeFunction:
    """Tests for wrap_node utility function"""

    def test_wrap_node_exists(self):
        """wrap_node function should exist"""
        from src.tracing.node_wrapper import wrap_node

        assert callable(wrap_node)

    def test_wrap_node_preserves_output(self, sample_node, sample_state):
        """wrap_node should preserve original node output"""
        from src.tracing.node_wrapper import wrap_node

        wrapped = wrap_node(sample_node)
        result = wrapped(sample_state)

        # Output should match original
        assert result["current_agent"] == "test_node"
        assert result["result"] == "Test task processed"

    def test_wrap_node_preserves_async(self, async_sample_node, sample_state):
        """wrap_node should work with async nodes"""
        from src.tracing.node_wrapper import wrap_node

        wrapped = wrap_node(async_sample_node)
        result = asyncio.run(wrapped(sample_state))

        assert result["current_agent"] == "async_test_node"
        assert "processed async" in result["result"]

    def test_wrap_node_adds_timing(self, sample_node, sample_state):
        """wrap_node should track execution time"""
        from src.tracing.node_wrapper import wrap_node, get_last_trace_info

        wrapped = wrap_node(sample_node, name="timed_node")
        wrapped(sample_state)

        trace_info = get_last_trace_info()
        assert trace_info is not None
        assert "duration_ms" in trace_info
        assert trace_info["duration_ms"] >= 0

    def test_wrap_node_works_when_tracing_disabled(self, sample_node, sample_state):
        """wrap_node should work when tracing is disabled"""
        from src.tracing.node_wrapper import wrap_node
        from src.tracing.manager import TracingManager
        from src.tracing.config import TracingConfig

        # Disable tracing
        TracingManager.reset_instance()
        manager = TracingManager.get_instance()
        manager.initialize(TracingConfig(enabled=False))

        wrapped = wrap_node(sample_node)
        result = wrapped(sample_state)

        # Should still work
        assert result["current_agent"] == "test_node"


# =============================================================================
# Test Category 2: State Capture (3 tests)
# =============================================================================

class TestStateCapture:
    """Tests for input/output state capture"""

    def test_capture_state_disabled_by_default(self, sample_node, sample_state):
        """State capture should be disabled by default"""
        from src.tracing.node_wrapper import wrap_node, get_last_trace_info

        wrapped = wrap_node(sample_node)
        wrapped(sample_state)

        trace_info = get_last_trace_info()
        # Should not have full state by default
        assert trace_info is None or "input_state" not in trace_info

    def test_capture_state_includes_input(self, sample_node, sample_state):
        """capture_state=True should include input state"""
        from src.tracing.node_wrapper import wrap_node, get_last_trace_info

        wrapped = wrap_node(sample_node, capture_state=True)
        wrapped(sample_state)

        trace_info = get_last_trace_info()
        assert trace_info is not None
        assert "input_state" in trace_info
        assert trace_info["input_state"]["run_id"] == "test-123"

    def test_capture_state_includes_output(self, sample_node, sample_state):
        """capture_state=True should include output state"""
        from src.tracing.node_wrapper import wrap_node, get_last_trace_info

        wrapped = wrap_node(sample_node, capture_state=True)
        wrapped(sample_state)

        trace_info = get_last_trace_info()
        assert trace_info is not None
        assert "output_state" in trace_info
        assert trace_info["output_state"]["current_agent"] == "test_node"


# =============================================================================
# Test Category 3: Error Handling (3 tests)
# =============================================================================

class TestErrorHandling:
    """Tests for error handling in wrapped nodes"""

    def test_wrap_node_traces_errors(self, error_node, sample_state):
        """wrap_node should trace errors"""
        from src.tracing.node_wrapper import wrap_node, get_last_trace_info

        wrapped = wrap_node(error_node, name="error_node")

        with pytest.raises(ValueError):
            wrapped(sample_state)

        trace_info = get_last_trace_info()
        assert trace_info is not None
        assert "error" in trace_info
        assert "ValueError" in trace_info["error"]

    def test_wrap_node_reraises_errors(self, error_node, sample_state):
        """wrap_node should re-raise original errors"""
        from src.tracing.node_wrapper import wrap_node

        wrapped = wrap_node(error_node)

        with pytest.raises(ValueError, match="Test error from node"):
            wrapped(sample_state)

    def test_error_includes_node_name(self, error_node, sample_state):
        """Error trace should include node name"""
        from src.tracing.node_wrapper import wrap_node, get_last_trace_info

        wrapped = wrap_node(error_node, name="my_error_node")

        with pytest.raises(ValueError):
            wrapped(sample_state)

        trace_info = get_last_trace_info()
        assert trace_info is not None
        assert trace_info.get("node_name") == "my_error_node"


# =============================================================================
# Test Category 4: Pre-wrapped Nodes (4 tests)
# =============================================================================

class TestPreWrappedNodes:
    """Tests for pre-wrapped node exports"""

    def test_traced_cto_node_exists(self):
        """traced_cto_node should exist"""
        from nodes.traced_nodes import traced_cto_node

        assert callable(traced_cto_node)

    def test_traced_dev_node_exists(self):
        """traced_dev_node should exist"""
        from nodes.traced_nodes import traced_dev_node

        assert callable(traced_dev_node)

    def test_traced_nodes_are_callable(self):
        """All traced nodes should be callable"""
        from nodes.traced_nodes import (
            traced_cto_node,
            traced_pm_node,
            traced_dev_node,
            traced_qa_node,
            traced_supervisor_node,
            traced_safety_gate_node,
        )

        assert callable(traced_cto_node)
        assert callable(traced_pm_node)
        assert callable(traced_dev_node)
        assert callable(traced_qa_node)
        assert callable(traced_supervisor_node)
        assert callable(traced_safety_gate_node)

    def test_traced_nodes_return_dict(self, sample_state):
        """Traced nodes should return dict like original nodes"""
        from nodes.traced_nodes import traced_cto_node

        result = traced_cto_node(sample_state)

        assert isinstance(result, dict)
        assert "current_agent" in result


# =============================================================================
# Test Category 5: Module Exports (2 tests)
# =============================================================================

class TestModuleExports:
    """Tests for module-level exports"""

    def test_tracing_module_exports_wrap_node(self):
        """src.tracing should export wrap_node"""
        from src.tracing import wrap_node

        assert callable(wrap_node)

    def test_node_wrapper_module_exports(self):
        """node_wrapper module should export all utilities"""
        from src.tracing.node_wrapper import (
            wrap_node,
            get_last_trace_info,
            clear_trace_info,
        )

        assert callable(wrap_node)
        assert callable(get_last_trace_info)
        assert callable(clear_trace_info)
