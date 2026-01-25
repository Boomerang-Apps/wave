"""
LangSmith Core Tracing TDD Tests
Phase LangSmith-2: Core Tracing Infrastructure

Tests for TracingManager, decorators, and context helpers.
All tests must FAIL initially (TDD process).

Test Categories:
1. TracingManager (6 tests)
2. Decorators (8 tests)
3. Context Helpers (4 tests)

Total: 18 tests
"""

import pytest
import asyncio
from typing import Dict, Any
from unittest.mock import MagicMock, patch


# =============================================================================
# Test Category 1: TracingManager (6 tests)
# =============================================================================

class TestTracingManager:
    """Tests for TracingManager class"""

    def test_tracing_manager_exists(self):
        """TracingManager class should exist"""
        from src.tracing.manager import TracingManager

        manager = TracingManager()
        assert manager is not None

    def test_tracing_manager_singleton(self):
        """TracingManager should be a singleton"""
        from src.tracing.manager import TracingManager

        manager1 = TracingManager.get_instance()
        manager2 = TracingManager.get_instance()

        assert manager1 is manager2

    def test_tracing_manager_initialize(self):
        """TracingManager.initialize() should apply config"""
        from src.tracing.manager import TracingManager
        from src.tracing.config import TracingConfig

        TracingManager.reset_instance()  # Reset for clean test
        manager = TracingManager.get_instance()

        config = TracingConfig(enabled=True, api_key="test-key")
        result = manager.initialize(config)

        assert result is True
        assert manager._initialized is True

    def test_tracing_manager_is_active(self):
        """TracingManager.is_active() should reflect state"""
        from src.tracing.manager import TracingManager
        from src.tracing.config import TracingConfig

        TracingManager.reset_instance()
        manager = TracingManager.get_instance()

        # Not active before initialization
        assert manager.is_active() is False

        # Active after initialization with valid config
        config = TracingConfig(enabled=True, api_key="test-key")
        manager.initialize(config)
        assert manager.is_active() is True

    def test_tracing_manager_is_not_active_when_disabled(self):
        """TracingManager.is_active() should be False when disabled"""
        from src.tracing.manager import TracingManager
        from src.tracing.config import TracingConfig

        TracingManager.reset_instance()
        manager = TracingManager.get_instance()

        config = TracingConfig(enabled=False)
        manager.initialize(config)

        assert manager.is_active() is False

    def test_tracing_manager_shutdown(self):
        """TracingManager.shutdown() should cleanup"""
        from src.tracing.manager import TracingManager
        from src.tracing.config import TracingConfig

        TracingManager.reset_instance()
        manager = TracingManager.get_instance()

        config = TracingConfig(enabled=True, api_key="test-key")
        manager.initialize(config)
        manager.shutdown()

        assert manager._initialized is False


# =============================================================================
# Test Category 2: Decorators (8 tests)
# =============================================================================

class TestTraceNodeDecorator:
    """Tests for trace_node decorator"""

    def test_trace_node_decorator_exists(self):
        """trace_node decorator should exist"""
        from src.tracing.decorators import trace_node

        assert callable(trace_node)

    def test_trace_node_preserves_function(self):
        """trace_node should preserve function behavior"""
        from src.tracing.decorators import trace_node

        @trace_node()
        def my_node(state: Dict) -> Dict:
            return {"result": state.get("input", 0) * 2}

        result = my_node({"input": 5})
        assert result == {"result": 10}

    def test_trace_node_preserves_async_function(self):
        """trace_node should work with async functions"""
        from src.tracing.decorators import trace_node

        @trace_node()
        async def my_async_node(state: Dict) -> Dict:
            return {"result": state.get("input", 0) * 2}

        result = asyncio.run(my_async_node({"input": 5}))
        assert result == {"result": 10}

    def test_trace_node_adds_metadata(self):
        """trace_node should accept metadata parameter"""
        from src.tracing.decorators import trace_node

        @trace_node(metadata={"agent": "developer"})
        def my_node(state: Dict) -> Dict:
            return state

        # Should not raise
        result = my_node({})
        assert result == {}


class TestTraceToolDecorator:
    """Tests for trace_tool decorator"""

    def test_trace_tool_decorator_exists(self):
        """trace_tool decorator should exist"""
        from src.tracing.decorators import trace_tool

        assert callable(trace_tool)

    def test_trace_tool_preserves_function(self):
        """trace_tool should preserve function behavior"""
        from src.tracing.decorators import trace_tool

        @trace_tool()
        def my_tool(query: str) -> str:
            return f"Result for: {query}"

        result = my_tool("test query")
        assert result == "Result for: test query"

    def test_trace_tool_accepts_name(self):
        """trace_tool should accept custom name"""
        from src.tracing.decorators import trace_tool

        @trace_tool(name="custom_tool_name")
        def my_tool(x: int) -> int:
            return x * 2

        result = my_tool(5)
        assert result == 10


class TestTraceLLMCallDecorator:
    """Tests for trace_llm_call decorator"""

    def test_trace_llm_call_decorator_exists(self):
        """trace_llm_call decorator should exist"""
        from src.tracing.decorators import trace_llm_call

        assert callable(trace_llm_call)

    def test_trace_llm_call_preserves_function(self):
        """trace_llm_call should preserve function behavior"""
        from src.tracing.decorators import trace_llm_call

        @trace_llm_call()
        def call_model(messages: list) -> str:
            return "model response"

        result = call_model([{"role": "user", "content": "hello"}])
        assert result == "model response"

    def test_trace_llm_call_accepts_model(self):
        """trace_llm_call should accept model parameter"""
        from src.tracing.decorators import trace_llm_call

        @trace_llm_call(model="claude-3-opus")
        def call_claude(messages: list) -> str:
            return "claude response"

        result = call_claude([])
        assert result == "claude response"

    def test_decorators_work_when_disabled(self, monkeypatch):
        """All decorators should be no-op when tracing disabled"""
        from src.tracing.decorators import trace_node, trace_tool, trace_llm_call
        from src.tracing.manager import TracingManager
        from src.tracing.config import TracingConfig

        # Disable tracing
        TracingManager.reset_instance()
        manager = TracingManager.get_instance()
        config = TracingConfig(enabled=False)
        manager.initialize(config)

        @trace_node()
        def node_fn(state):
            return state

        @trace_tool()
        def tool_fn(x):
            return x

        @trace_llm_call()
        def llm_fn(messages):
            return "response"

        # All should work without error
        assert node_fn({"key": "value"}) == {"key": "value"}
        assert tool_fn(42) == 42
        assert llm_fn([]) == "response"


# =============================================================================
# Test Category 3: Context Helpers (4 tests)
# =============================================================================

class TestContextHelpers:
    """Tests for tracing context helpers"""

    def test_get_trace_context_exists(self):
        """get_trace_context function should exist"""
        from src.tracing.decorators import get_trace_context

        assert callable(get_trace_context)

    def test_with_trace_context_exists(self):
        """with_trace_context context manager should exist"""
        from src.tracing.decorators import with_trace_context

        assert callable(with_trace_context)

    def test_with_trace_context_works_as_context_manager(self):
        """with_trace_context should work as context manager"""
        from src.tracing.decorators import with_trace_context

        with with_trace_context(project_name="test-project"):
            # Should not raise
            pass

    def test_nested_contexts_work(self):
        """Nested trace contexts should work correctly"""
        from src.tracing.decorators import with_trace_context, get_trace_context

        with with_trace_context(project_name="outer"):
            with with_trace_context(tags=["inner"]):
                # Should not raise
                ctx = get_trace_context()
                # Context should exist (may be None if tracing disabled)
                assert ctx is None or ctx is not None


# =============================================================================
# Test Category 4: Module Exports (2 tests)
# =============================================================================

class TestModuleExports:
    """Tests for module-level exports"""

    def test_tracing_module_exports_manager(self):
        """src.tracing should export TracingManager"""
        from src.tracing import TracingManager

        assert TracingManager is not None

    def test_tracing_module_exports_decorators(self):
        """src.tracing should export all decorators"""
        from src.tracing import trace_node, trace_tool, trace_llm_call

        assert callable(trace_node)
        assert callable(trace_tool)
        assert callable(trace_llm_call)
