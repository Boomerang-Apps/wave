"""
Test C.2: Parallel Execution Pattern (Map/Reduce)
TDD - Tests written BEFORE implementation

Gate 0 Validation: Phase 2 of LANGGRAPH-ENHANCEMENT-PLAN.md
Based on Grok's LangGraph multi-agent patterns guide.

Test Categories:
1. Parallel State Schema
2. Fan-Out Dispatcher (Map)
3. Fan-In Aggregator (Reduce)
4. Parallel Execution Graph
5. Integration with Supervisor

Expected Result: All tests should FAIL initially, then PASS after implementation.
"""

import pytest
import asyncio
from typing import List, Dict, Any


# =============================================================================
# SECTION 1: Parallel State Schema Tests
# =============================================================================

class TestParallelState:
    """Test parallel execution state schema"""

    def test_parallel_state_exists(self):
        """ParallelState TypedDict should exist"""
        from src.parallel.parallel_state import ParallelState
        assert ParallelState is not None

    def test_parallel_state_has_domains_field(self):
        """ParallelState should have 'domains' field for domains to process"""
        from src.parallel.parallel_state import ParallelState
        annotations = ParallelState.__annotations__
        assert "domains" in annotations, "ParallelState missing 'domains' field"

    def test_parallel_state_has_domain_results_field(self):
        """ParallelState should have 'domain_results' field for results"""
        from src.parallel.parallel_state import ParallelState
        annotations = ParallelState.__annotations__
        assert "domain_results" in annotations, "ParallelState missing 'domain_results' field"

    def test_parallel_state_has_aggregated_files_field(self):
        """ParallelState should have 'aggregated_files' field"""
        from src.parallel.parallel_state import ParallelState
        annotations = ParallelState.__annotations__
        assert "aggregated_files" in annotations, "ParallelState missing 'aggregated_files' field"

    def test_parallel_state_has_all_tests_passed_field(self):
        """ParallelState should have 'all_tests_passed' field"""
        from src.parallel.parallel_state import ParallelState
        annotations = ParallelState.__annotations__
        assert "all_tests_passed" in annotations, "ParallelState missing 'all_tests_passed' field"

    def test_parallel_state_has_total_budget_used(self):
        """ParallelState should have 'total_budget_used' field"""
        from src.parallel.parallel_state import ParallelState
        annotations = ParallelState.__annotations__
        assert "total_budget_used" in annotations, "ParallelState missing 'total_budget_used' field"

    def test_parallel_state_has_parent_run_id(self):
        """ParallelState should have 'parent_run_id' field"""
        from src.parallel.parallel_state import ParallelState
        annotations = ParallelState.__annotations__
        assert "parent_run_id" in annotations, "ParallelState missing 'parent_run_id' field"

    def test_create_parallel_state_function_exists(self):
        """create_parallel_state function should exist"""
        from src.parallel.parallel_state import create_parallel_state
        assert callable(create_parallel_state)

    def test_create_parallel_state_initializes_correctly(self):
        """create_parallel_state should initialize with defaults"""
        from src.parallel.parallel_state import create_parallel_state
        state = create_parallel_state(
            parent_run_id="test-123",
            task="Test task",
            domains=["auth", "payments"]
        )
        assert state["parent_run_id"] == "test-123"
        assert state["domains"] == ["auth", "payments"]
        assert state["domain_results"] == []
        assert state["all_tests_passed"] is False


# =============================================================================
# SECTION 2: Fan-Out Dispatcher Tests
# =============================================================================

class TestFanOutDispatcher:
    """Test fan-out dispatcher node (Map pattern)"""

    def test_fan_out_dispatcher_exists(self):
        """fan_out_dispatcher function should exist"""
        from src.parallel.dispatcher import fan_out_dispatcher
        assert callable(fan_out_dispatcher)

    def test_fan_out_creates_domain_tasks(self):
        """Dispatcher should create tasks for each domain"""
        from src.parallel.dispatcher import create_domain_tasks
        from src.parallel.parallel_state import create_parallel_state

        state = create_parallel_state(
            parent_run_id="test-123",
            task="Build login with payments",
            domains=["auth", "payments"]
        )
        tasks = create_domain_tasks(state)
        assert len(tasks) == 2

    def test_fan_out_handles_single_domain(self):
        """Dispatcher should handle single domain correctly"""
        from src.parallel.dispatcher import create_domain_tasks
        from src.parallel.parallel_state import create_parallel_state

        state = create_parallel_state(
            parent_run_id="test-123",
            task="Implement login",
            domains=["auth"]
        )
        tasks = create_domain_tasks(state)
        assert len(tasks) == 1

    def test_fan_out_handles_empty_domains(self):
        """Dispatcher should handle empty domains list"""
        from src.parallel.dispatcher import create_domain_tasks
        from src.parallel.parallel_state import create_parallel_state

        state = create_parallel_state(
            parent_run_id="test-123",
            task="Unknown task",
            domains=[]
        )
        tasks = create_domain_tasks(state)
        assert len(tasks) == 0

    def test_fan_out_dispatcher_returns_dict(self):
        """fan_out_dispatcher should return state updates dict"""
        from src.parallel.dispatcher import fan_out_dispatcher
        from src.parallel.parallel_state import create_parallel_state

        state = create_parallel_state(
            parent_run_id="test-123",
            task="Build auth",
            domains=["auth"]
        )
        result = fan_out_dispatcher(state)
        assert isinstance(result, dict)

    def test_fan_out_sets_execution_started(self):
        """Dispatcher should set execution_started flag"""
        from src.parallel.dispatcher import fan_out_dispatcher
        from src.parallel.parallel_state import create_parallel_state

        state = create_parallel_state(
            parent_run_id="test-123",
            task="Build auth",
            domains=["auth"]
        )
        result = fan_out_dispatcher(state)
        assert result.get("execution_started") is True


# =============================================================================
# SECTION 3: Async Execution Tests
# =============================================================================

class TestAsyncExecution:
    """Test async parallel domain execution"""

    @pytest.mark.asyncio
    async def test_execute_domains_parallel_exists(self):
        """execute_domains_parallel async function should exist"""
        from src.parallel.dispatcher import execute_domains_parallel
        assert asyncio.iscoroutinefunction(execute_domains_parallel)

    @pytest.mark.asyncio
    async def test_execute_domains_parallel_returns_results(self):
        """execute_domains_parallel should return list of results"""
        from src.parallel.dispatcher import execute_domains_parallel
        from src.parallel.parallel_state import create_parallel_state

        state = create_parallel_state(
            parent_run_id="test-123",
            task="Build auth and payments",
            domains=["auth", "payments"]
        )
        results = await execute_domains_parallel(state)
        assert isinstance(results, list)
        assert len(results) == 2

    @pytest.mark.asyncio
    async def test_execute_domains_parallel_handles_single(self):
        """execute_domains_parallel should handle single domain"""
        from src.parallel.dispatcher import execute_domains_parallel
        from src.parallel.parallel_state import create_parallel_state

        state = create_parallel_state(
            parent_run_id="test-123",
            task="Build auth",
            domains=["auth"]
        )
        results = await execute_domains_parallel(state)
        assert len(results) == 1


# =============================================================================
# SECTION 4: Fan-In Aggregator Tests
# =============================================================================

class TestFanInAggregator:
    """Test fan-in aggregator node (Reduce pattern)"""

    def test_fan_in_aggregator_exists(self):
        """fan_in_aggregator function should exist"""
        from src.parallel.aggregator import fan_in_aggregator
        assert callable(fan_in_aggregator)

    def test_fan_in_merges_files_modified(self):
        """Aggregator should merge files_modified from all domains"""
        from src.parallel.aggregator import merge_files_modified

        domain_results = [
            {"files_modified": ["auth/login.py", "auth/session.py"]},
            {"files_modified": ["payments/stripe.py"]},
        ]
        merged = merge_files_modified(domain_results)
        assert len(merged) == 3
        assert "auth/login.py" in merged
        assert "payments/stripe.py" in merged

    def test_fan_in_aggregates_test_results(self):
        """Aggregator should determine if all tests passed"""
        from src.parallel.aggregator import aggregate_test_results

        domain_results = [
            {"tests_passed": True},
            {"tests_passed": True},
        ]
        all_passed = aggregate_test_results(domain_results)
        assert all_passed is True

    def test_fan_in_detects_test_failure(self):
        """Aggregator should detect if any domain failed tests"""
        from src.parallel.aggregator import aggregate_test_results

        domain_results = [
            {"tests_passed": True},
            {"tests_passed": False},
        ]
        all_passed = aggregate_test_results(domain_results)
        assert all_passed is False

    def test_fan_in_combines_budget_usage(self):
        """Aggregator should sum budget usage across domains"""
        from src.parallel.aggregator import combine_budget_usage

        domain_results = [
            {"budget_used": 1000},
            {"budget_used": 2500},
        ]
        total = combine_budget_usage(domain_results)
        assert total == 3500

    def test_fan_in_handles_partial_failure(self):
        """Aggregator should handle partial domain failures"""
        from src.parallel.aggregator import fan_in_aggregator

        state = {
            "domain_results": [
                {"domain": "auth", "success": True, "files_modified": ["a.py"]},
                {"domain": "payments", "success": False, "error": "Failed"},
            ],
            "domains": ["auth", "payments"],
        }
        result = fan_in_aggregator(state)
        assert isinstance(result, dict)
        assert "partial_failure" in result or "failed_domains" in result

    def test_fan_in_returns_aggregated_state(self):
        """fan_in_aggregator should return complete aggregated state"""
        from src.parallel.aggregator import fan_in_aggregator

        state = {
            "domain_results": [
                {"domain": "auth", "success": True, "files_modified": ["a.py"], "tests_passed": True, "budget_used": 100},
            ],
            "domains": ["auth"],
        }
        result = fan_in_aggregator(state)
        assert "aggregated_files" in result
        assert "all_tests_passed" in result
        assert "total_budget_used" in result


# =============================================================================
# SECTION 5: Parallel Execution Graph Tests
# =============================================================================

class TestParallelGraph:
    """Test parallel execution graph structure"""

    def test_create_parallel_graph_exists(self):
        """create_parallel_graph function should exist"""
        from src.parallel.parallel_graph import create_parallel_graph
        assert callable(create_parallel_graph)

    def test_create_parallel_graph_returns_stategraph(self):
        """create_parallel_graph should return a StateGraph"""
        from src.parallel.parallel_graph import create_parallel_graph
        from langgraph.graph import StateGraph
        graph = create_parallel_graph()
        assert isinstance(graph, StateGraph)

    def test_parallel_graph_has_dispatcher_node(self):
        """Parallel graph should have dispatcher node"""
        from src.parallel.parallel_graph import create_parallel_graph
        graph = create_parallel_graph()
        # Check node exists in graph structure
        assert "dispatcher" in graph.nodes or "fan_out" in graph.nodes

    def test_parallel_graph_has_aggregator_node(self):
        """Parallel graph should have aggregator node"""
        from src.parallel.parallel_graph import create_parallel_graph
        graph = create_parallel_graph()
        # Check node exists in graph structure
        assert "aggregator" in graph.nodes or "fan_in" in graph.nodes

    def test_compile_parallel_graph_exists(self):
        """compile_parallel_graph function should exist"""
        from src.parallel.parallel_graph import compile_parallel_graph
        assert callable(compile_parallel_graph)

    def test_parallel_graph_compiles(self):
        """Parallel graph should compile without errors"""
        from src.parallel.parallel_graph import compile_parallel_graph
        compiled = compile_parallel_graph()
        assert compiled is not None

    def test_parallel_graph_is_runnable(self):
        """Compiled parallel graph should be runnable"""
        from src.parallel.parallel_graph import compile_parallel_graph
        compiled = compile_parallel_graph()
        assert hasattr(compiled, "invoke") or hasattr(compiled, "ainvoke")


# =============================================================================
# SECTION 6: Supervisor Integration Tests
# =============================================================================

class TestSupervisorParallelIntegration:
    """Test supervisor integration with parallel execution"""

    def test_supervisor_detects_multi_domain_task(self):
        """Supervisor should detect tasks requiring multiple domains"""
        from src.domains.domain_router import analyze_story_domains
        domains = analyze_story_domains("Build user login with payment processing")
        assert len(domains) >= 2
        assert "auth" in domains
        assert "payments" in domains

    def test_supervisor_sets_parallel_flag(self):
        """Supervisor should set parallel execution flag for multi-domain tasks"""
        from nodes.supervisor import supervisor_node
        from state import create_initial_state

        state = create_initial_state(
            run_id="test-123",
            task="Build user login with payment processing and profile settings"
        )
        result = supervisor_node(state)
        actions = result.get("actions", [])
        last_action = actions[-1] if actions else {}
        details = last_action.get("details", {})

        # Should detect multiple domains
        domains = details.get("domains_detected", [])
        assert len(domains) >= 2

    def test_parallel_route_function_exists(self):
        """route_to_parallel function should exist"""
        from src.parallel.parallel_graph import route_to_parallel
        assert callable(route_to_parallel)

    def test_route_to_parallel_for_multi_domain(self):
        """route_to_parallel should return True for multi-domain tasks"""
        from src.parallel.parallel_graph import should_use_parallel

        state = {
            "task": "Build login with payments",
            "domains_detected": ["auth", "payments"]
        }
        result = should_use_parallel(state)
        assert result is True

    def test_route_to_parallel_false_for_single(self):
        """should_use_parallel should return False for single domain"""
        from src.parallel.parallel_graph import should_use_parallel

        state = {
            "task": "Build login",
            "domains_detected": ["auth"]
        }
        result = should_use_parallel(state)
        assert result is False


# =============================================================================
# SECTION 7: Module Exports Tests
# =============================================================================

class TestParallelModuleExports:
    """Test parallel module exports"""

    def test_parallel_module_exports(self):
        """All parallel components should be exported from __init__.py"""
        from src.parallel import (
            ParallelState,
            create_parallel_state,
            fan_out_dispatcher,
            fan_in_aggregator,
            create_parallel_graph,
            compile_parallel_graph,
            execute_domains_parallel,
            should_use_parallel,
        )
        # All imports should succeed
        assert ParallelState is not None
        assert create_parallel_state is not None
        assert fan_out_dispatcher is not None
        assert fan_in_aggregator is not None
        assert create_parallel_graph is not None
        assert compile_parallel_graph is not None
        assert execute_domains_parallel is not None
        assert should_use_parallel is not None


# =============================================================================
# SECTION 8: Budget and Error Handling Tests
# =============================================================================

class TestParallelBudgetAndErrors:
    """Test budget tracking and error handling in parallel execution"""

    def test_parallel_respects_total_budget(self):
        """Parallel execution should track combined budget"""
        from src.parallel.aggregator import combine_budget_usage

        results = [
            {"budget_used": 5000},
            {"budget_used": 3000},
            {"budget_used": 2000},
        ]
        total = combine_budget_usage(results)
        assert total == 10000

    def test_parallel_handles_domain_error(self):
        """Parallel execution should handle individual domain errors"""
        from src.parallel.aggregator import handle_domain_errors

        results = [
            {"domain": "auth", "success": True},
            {"domain": "payments", "success": False, "error": "API timeout"},
        ]
        error_summary = handle_domain_errors(results)
        assert "payments" in error_summary.get("failed_domains", [])

    def test_parallel_continues_on_non_critical_failure(self):
        """Parallel should continue if non-critical domain fails"""
        from src.parallel.aggregator import should_continue_after_failure

        results = [
            {"domain": "auth", "success": True, "critical": True},
            {"domain": "ui", "success": False, "critical": False},
        ]
        should_continue = should_continue_after_failure(results)
        assert should_continue is True

    def test_parallel_stops_on_critical_failure(self):
        """Parallel should stop if critical domain fails"""
        from src.parallel.aggregator import should_continue_after_failure

        results = [
            {"domain": "auth", "success": False, "critical": True},
            {"domain": "ui", "success": True, "critical": False},
        ]
        should_continue = should_continue_after_failure(results)
        assert should_continue is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
