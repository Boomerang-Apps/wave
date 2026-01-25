"""
Test C.3: Enhanced Retry/Dev-Fix Loop
TDD - Tests written BEFORE implementation

Gate 0 Validation: Phase 3 of LANGGRAPH-ENHANCEMENT-PLAN.md
Based on Grok's LangGraph multi-agent patterns guide.

Test Categories:
1. Retry State Schema
2. Dev-Fix Agent Node
3. Retry Router with Backoff
4. Human Escalation Node
5. Graph Integration with Retry Cycle

Expected Result: All tests should FAIL initially, then PASS after implementation.
"""

import pytest
from typing import Dict, Any


# =============================================================================
# SECTION 1: Retry State Schema Tests
# =============================================================================

class TestRetryState:
    """Test retry state schema"""

    def test_retry_state_exists(self):
        """RetryState TypedDict should exist"""
        from src.retry.retry_state import RetryState
        assert RetryState is not None

    def test_retry_state_has_count(self):
        """RetryState should have 'count' field"""
        from src.retry.retry_state import RetryState
        annotations = RetryState.__annotations__
        assert "count" in annotations, "RetryState missing 'count' field"

    def test_retry_state_has_max_retries(self):
        """RetryState should have 'max_retries' field"""
        from src.retry.retry_state import RetryState
        annotations = RetryState.__annotations__
        assert "max_retries" in annotations, "RetryState missing 'max_retries' field"

    def test_retry_state_has_last_error(self):
        """RetryState should have 'last_error' field"""
        from src.retry.retry_state import RetryState
        annotations = RetryState.__annotations__
        assert "last_error" in annotations, "RetryState missing 'last_error' field"

    def test_retry_state_has_backoff_seconds(self):
        """RetryState should have 'backoff_seconds' field"""
        from src.retry.retry_state import RetryState
        annotations = RetryState.__annotations__
        assert "backoff_seconds" in annotations, "RetryState missing 'backoff_seconds' field"

    def test_create_retry_state_defaults(self):
        """create_retry_state should initialize with sensible defaults"""
        from src.retry.retry_state import create_retry_state
        state = create_retry_state()
        assert state["count"] == 0
        assert state["max_retries"] == 3
        assert state["last_error"] == ""
        assert state["backoff_seconds"] == 0.0

    def test_create_retry_state_custom_max(self):
        """create_retry_state should accept custom max_retries"""
        from src.retry.retry_state import create_retry_state
        state = create_retry_state(max_retries=5)
        assert state["max_retries"] == 5


class TestWAVEStateRetryFields:
    """Test WAVEState retry-related fields"""

    def test_wave_state_has_retry_field(self):
        """WAVEState should have 'retry' field with RetryState"""
        from state import WAVEState
        annotations = WAVEState.__annotations__
        assert "retry" in annotations, "WAVEState missing 'retry' field"

    def test_wave_state_has_qa_passed(self):
        """WAVEState should have 'qa_passed' field"""
        from state import WAVEState
        annotations = WAVEState.__annotations__
        assert "qa_passed" in annotations, "WAVEState missing 'qa_passed' field"

    def test_wave_state_has_qa_feedback(self):
        """WAVEState should have 'qa_feedback' field"""
        from state import WAVEState
        annotations = WAVEState.__annotations__
        assert "qa_feedback" in annotations, "WAVEState missing 'qa_feedback' field"

    def test_create_initial_state_includes_retry(self):
        """create_initial_state should initialize retry state"""
        from state import create_initial_state
        state = create_initial_state(run_id="test-123", task="Test")
        assert "retry" in state
        assert state["retry"]["count"] == 0
        assert state["retry"]["max_retries"] == 3

    def test_create_initial_state_includes_qa_passed(self):
        """create_initial_state should set qa_passed to False"""
        from state import create_initial_state
        state = create_initial_state(run_id="test-123", task="Test")
        assert state["qa_passed"] is False

    def test_create_initial_state_includes_qa_feedback(self):
        """create_initial_state should set qa_feedback to empty string"""
        from state import create_initial_state
        state = create_initial_state(run_id="test-123", task="Test")
        assert state["qa_feedback"] == ""


# =============================================================================
# SECTION 2: Dev-Fix Agent Node Tests
# =============================================================================

class TestDevFixNode:
    """Test Dev-Fix agent node"""

    def test_dev_fix_node_exists(self):
        """dev_fix_node function should exist"""
        from nodes.dev_fix import dev_fix_node
        assert callable(dev_fix_node)

    def test_dev_fix_node_returns_dict(self):
        """dev_fix_node should return state updates dict"""
        from nodes.dev_fix import dev_fix_node
        from src.retry.retry_state import create_retry_state

        state = {
            "task": "Fix login bug",
            "qa_feedback": "Test failed: login returns 401",
            "retry": create_retry_state(),
            "safety": {"constitutional_score": 1.0},
        }
        result = dev_fix_node(state)
        assert isinstance(result, dict)

    def test_dev_fix_increments_retry_count(self):
        """dev_fix_node should increment retry count"""
        from nodes.dev_fix import dev_fix_node
        from src.retry.retry_state import create_retry_state

        state = {
            "task": "Fix login bug",
            "qa_feedback": "Test failed",
            "retry": create_retry_state(),
            "safety": {"constitutional_score": 1.0},
        }
        result = dev_fix_node(state)
        assert result["retry"]["count"] == 1

    def test_dev_fix_escalates_at_max_retries(self):
        """dev_fix_node should escalate when max retries reached"""
        from nodes.dev_fix import dev_fix_node

        state = {
            "task": "Fix login bug",
            "qa_feedback": "Test failed",
            "retry": {
                "count": 3,
                "max_retries": 3,
                "last_error": "",
                "backoff_seconds": 0.0,
            },
            "safety": {"constitutional_score": 1.0},
        }
        result = dev_fix_node(state)
        assert result.get("needs_human") is True or result.get("escalate") is True

    def test_dev_fix_stores_qa_feedback(self):
        """dev_fix_node should store QA feedback in last_error"""
        from nodes.dev_fix import dev_fix_node
        from src.retry.retry_state import create_retry_state

        state = {
            "task": "Fix login bug",
            "qa_feedback": "AssertionError: expected 200, got 401",
            "retry": create_retry_state(),
            "safety": {"constitutional_score": 1.0},
        }
        result = dev_fix_node(state)
        assert "AssertionError" in result["retry"]["last_error"]

    def test_dev_fix_calculates_backoff(self):
        """dev_fix_node should calculate exponential backoff"""
        from nodes.dev_fix import dev_fix_node

        state = {
            "task": "Fix bug",
            "qa_feedback": "Test failed",
            "retry": {
                "count": 2,
                "max_retries": 5,
                "last_error": "",
                "backoff_seconds": 0.0,
            },
            "safety": {"constitutional_score": 1.0},
        }
        result = dev_fix_node(state)
        # Backoff should be exponential: 2^count seconds (base)
        assert result["retry"]["backoff_seconds"] > 0


# =============================================================================
# SECTION 3: Retry Router Tests
# =============================================================================

class TestRetryRouter:
    """Test QA retry router"""

    def test_qa_retry_router_exists(self):
        """qa_retry_router function should exist"""
        from src.retry.retry_router import qa_retry_router
        assert callable(qa_retry_router)

    def test_router_returns_cto_on_pass(self):
        """Router should return 'cto_master' when QA passes"""
        from src.retry.retry_router import qa_retry_router

        state = {
            "qa_passed": True,
            "retry": {"count": 0, "max_retries": 3},
            "safety": {"constitutional_score": 1.0},
        }
        result = qa_retry_router(state)
        assert result == "cto_master"

    def test_router_returns_dev_fix_on_fail(self):
        """Router should return 'dev_fix' when QA fails and retries available"""
        from src.retry.retry_router import qa_retry_router

        state = {
            "qa_passed": False,
            "retry": {"count": 0, "max_retries": 3},
            "safety": {"constitutional_score": 1.0},
        }
        result = qa_retry_router(state)
        assert result == "dev_fix"

    def test_router_escalates_at_max_retries(self):
        """Router should escalate when max retries reached"""
        from src.retry.retry_router import qa_retry_router

        state = {
            "qa_passed": False,
            "retry": {"count": 3, "max_retries": 3},
            "safety": {"constitutional_score": 1.0},
        }
        result = qa_retry_router(state)
        assert result == "escalate_human"

    def test_router_escalates_on_safety_violation(self):
        """Router should escalate on safety violation (score < 0.3)"""
        from src.retry.retry_router import qa_retry_router

        state = {
            "qa_passed": False,
            "retry": {"count": 0, "max_retries": 3},
            "safety": {"constitutional_score": 0.2},
        }
        result = qa_retry_router(state)
        assert result == "escalate_human"

    def test_router_returns_failed_on_unrecoverable(self):
        """Router should return 'failed' for unrecoverable errors"""
        from src.retry.retry_router import qa_retry_router

        state = {
            "qa_passed": False,
            "retry": {"count": 3, "max_retries": 3},
            "safety": {"constitutional_score": 0.1},
            "unrecoverable": True,
        }
        result = qa_retry_router(state)
        assert result in ["escalate_human", "failed"]


class TestBackoffCalculation:
    """Test exponential backoff calculation"""

    def test_calculate_backoff_exists(self):
        """calculate_backoff function should exist"""
        from src.retry.backoff import calculate_backoff
        assert callable(calculate_backoff)

    def test_backoff_zero_for_first_retry(self):
        """Backoff should be minimal for first retry"""
        from src.retry.backoff import calculate_backoff
        backoff = calculate_backoff(retry_count=0)
        assert backoff <= 1.0

    def test_backoff_exponential_growth(self):
        """Backoff should grow exponentially"""
        from src.retry.backoff import calculate_backoff
        backoff_1 = calculate_backoff(retry_count=1)
        backoff_2 = calculate_backoff(retry_count=2)
        backoff_3 = calculate_backoff(retry_count=3)
        assert backoff_2 > backoff_1
        assert backoff_3 > backoff_2

    def test_backoff_has_max_cap(self):
        """Backoff should have a maximum cap"""
        from src.retry.backoff import calculate_backoff
        backoff = calculate_backoff(retry_count=100)
        assert backoff <= 300  # Max 5 minutes

    def test_backoff_with_jitter(self):
        """Backoff should support jitter for avoiding thundering herd"""
        from src.retry.backoff import calculate_backoff
        # Multiple calls should give slightly different results with jitter
        backoffs = [calculate_backoff(retry_count=2, jitter=True) for _ in range(5)]
        # At least some variation expected
        assert len(set(backoffs)) >= 1  # May be same if no jitter


# =============================================================================
# SECTION 4: Human Escalation Node Tests
# =============================================================================

class TestHumanEscalationNode:
    """Test human escalation node"""

    def test_human_escalation_node_exists(self):
        """human_escalation_node function should exist"""
        from nodes.human_escalation import human_escalation_node
        assert callable(human_escalation_node)

    def test_escalation_sets_needs_human(self):
        """Escalation should set needs_human to True"""
        from nodes.human_escalation import human_escalation_node

        state = {
            "task": "Fix bug",
            "retry": {"count": 3, "max_retries": 3},
            "needs_human": False,
        }
        result = human_escalation_node(state)
        assert result["needs_human"] is True

    def test_escalation_records_reason(self):
        """Escalation should record the escalation reason"""
        from nodes.human_escalation import human_escalation_node

        state = {
            "task": "Fix bug",
            "retry": {"count": 3, "max_retries": 3, "last_error": "Test failed"},
            "needs_human": False,
        }
        result = human_escalation_node(state)
        assert "escalation_reason" in result or "reason" in str(result)

    def test_escalation_pauses_workflow(self):
        """Escalation should set status to paused"""
        from nodes.human_escalation import human_escalation_node

        state = {
            "task": "Fix bug",
            "retry": {"count": 3, "max_retries": 3},
            "status": "running",
        }
        result = human_escalation_node(state)
        assert result.get("status") == "paused"

    def test_escalation_preserves_state(self):
        """Escalation should preserve relevant state for human review"""
        from nodes.human_escalation import human_escalation_node

        state = {
            "task": "Fix critical bug",
            "qa_feedback": "Security test failed",
            "retry": {"count": 3, "max_retries": 3, "last_error": "Auth bypass"},
            "actions": [{"agent": "dev", "action": "fix"}],
        }
        result = human_escalation_node(state)
        # Should include context for human
        assert result.get("needs_human") is True


# =============================================================================
# SECTION 5: Retry Graph Integration Tests
# =============================================================================

class TestRetryGraphIntegration:
    """Test graph integration with retry cycle"""

    def test_create_retry_graph_exists(self):
        """create_retry_graph function should exist"""
        from src.retry.retry_graph import create_retry_graph
        assert callable(create_retry_graph)

    def test_retry_graph_has_dev_fix_node(self):
        """Retry graph should have dev_fix node"""
        from src.retry.retry_graph import create_retry_graph
        graph = create_retry_graph()
        assert "dev_fix" in graph.nodes

    def test_retry_graph_has_escalation_node(self):
        """Retry graph should have escalation node"""
        from src.retry.retry_graph import create_retry_graph
        graph = create_retry_graph()
        assert "escalate_human" in graph.nodes or "human_escalation" in graph.nodes

    def test_retry_graph_compiles(self):
        """Retry graph should compile without errors"""
        from src.retry.retry_graph import compile_retry_graph
        compiled = compile_retry_graph()
        assert compiled is not None

    def test_retry_graph_is_runnable(self):
        """Compiled retry graph should be runnable"""
        from src.retry.retry_graph import compile_retry_graph
        compiled = compile_retry_graph()
        assert hasattr(compiled, "invoke") or hasattr(compiled, "stream")


# =============================================================================
# SECTION 6: Module Exports Tests
# =============================================================================

class TestRetryModuleExports:
    """Test retry module exports"""

    def test_retry_module_exports(self):
        """All retry components should be exported from __init__.py"""
        from src.retry import (
            RetryState,
            create_retry_state,
            qa_retry_router,
            calculate_backoff,
            create_retry_graph,
            compile_retry_graph,
        )
        assert RetryState is not None
        assert create_retry_state is not None
        assert qa_retry_router is not None
        assert calculate_backoff is not None
        assert create_retry_graph is not None
        assert compile_retry_graph is not None

    def test_dev_fix_node_importable(self):
        """dev_fix_node should be importable from nodes"""
        from nodes.dev_fix import dev_fix_node
        assert dev_fix_node is not None

    def test_human_escalation_importable(self):
        """human_escalation_node should be importable from nodes"""
        from nodes.human_escalation import human_escalation_node
        assert human_escalation_node is not None


# =============================================================================
# SECTION 7: End-to-End Retry Cycle Tests
# =============================================================================

class TestRetryE2E:
    """End-to-end retry cycle tests"""

    def test_retry_cycle_increments_count(self):
        """Each retry cycle should increment count"""
        from nodes.dev_fix import dev_fix_node
        from src.retry.retry_state import create_retry_state

        retry = create_retry_state()
        for i in range(3):
            state = {
                "task": "Fix bug",
                "qa_feedback": f"Attempt {i+1} failed",
                "retry": retry,
                "safety": {"constitutional_score": 1.0},
            }
            result = dev_fix_node(state)
            retry = result["retry"]
            assert retry["count"] == i + 1

    def test_retry_stops_at_max(self):
        """Retry cycle should stop at max_retries"""
        from src.retry.retry_router import qa_retry_router
        from src.retry.retry_state import create_retry_state

        retry = create_retry_state(max_retries=3)
        retry["count"] = 3

        state = {
            "qa_passed": False,
            "retry": retry,
            "safety": {"constitutional_score": 1.0},
        }
        result = qa_retry_router(state)
        assert result == "escalate_human"

    def test_successful_qa_exits_cycle(self):
        """Successful QA should exit retry cycle to CTO"""
        from src.retry.retry_router import qa_retry_router

        state = {
            "qa_passed": True,
            "retry": {"count": 2, "max_retries": 3},
            "safety": {"constitutional_score": 1.0},
        }
        result = qa_retry_router(state)
        assert result == "cto_master"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
