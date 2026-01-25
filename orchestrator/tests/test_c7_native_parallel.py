"""
Phase 7: Native LangGraph Parallel Pattern TDD Tests
Tests for topological sort and layer-based parallel execution.

Based on Grok's Parallel Domain Execution Recommendations

Test Categories:
1. Dependency State (5 tests)
2. Topological Sort (8 tests)
3. Execution Layers (6 tests)
4. Native Parallel Graph (5 tests)

Total: 24 tests
"""

import pytest
from typing import Dict, Any, List


# =============================================================================
# Test Category 1: Dependency State (5 tests)
# =============================================================================

class TestDependencyState:
    """Tests for enhanced parallel state with dependencies"""

    def test_parallel_state_has_dependencies_field(self):
        """ParallelState should have domain_dependencies field"""
        from src.parallel.parallel_state import ParallelState

        state: ParallelState = {
            "parent_run_id": "test-123",
            "task": "test",
            "domains": ["auth", "payments"],
            "domain_results": [],
            "aggregated_files": [],
            "all_tests_passed": False,
            "total_budget_used": 0.0,
            "execution_started": False,
            "execution_completed": False,
            "failed_domains": [],
            "partial_failure": False,
            # NEW fields
            "domain_dependencies": {"payments": ["auth"]},
            "sorted_domains": [],
            "execution_layers": [],
            "current_layer": 0,
        }

        assert "domain_dependencies" in state

    def test_parallel_state_has_sorted_domains(self):
        """ParallelState should have sorted_domains field"""
        from src.parallel.parallel_state import ParallelState

        state: ParallelState = {
            "parent_run_id": "test",
            "task": "test",
            "domains": [],
            "domain_results": [],
            "aggregated_files": [],
            "all_tests_passed": False,
            "total_budget_used": 0.0,
            "execution_started": False,
            "execution_completed": False,
            "failed_domains": [],
            "partial_failure": False,
            "domain_dependencies": {},
            "sorted_domains": ["auth", "payments"],
            "execution_layers": [],
            "current_layer": 0,
        }

        assert state["sorted_domains"] == ["auth", "payments"]

    def test_parallel_state_has_execution_layers(self):
        """ParallelState should have execution_layers field"""
        from src.parallel.parallel_state import ParallelState

        state: ParallelState = {
            "parent_run_id": "test",
            "task": "test",
            "domains": [],
            "domain_results": [],
            "aggregated_files": [],
            "all_tests_passed": False,
            "total_budget_used": 0.0,
            "execution_started": False,
            "execution_completed": False,
            "failed_domains": [],
            "partial_failure": False,
            "domain_dependencies": {},
            "sorted_domains": [],
            "execution_layers": [["auth"], ["payments", "profile"]],
            "current_layer": 0,
        }

        assert len(state["execution_layers"]) == 2

    def test_parallel_state_has_current_layer(self):
        """ParallelState should have current_layer field"""
        from src.parallel.parallel_state import ParallelState

        state: ParallelState = {
            "parent_run_id": "test",
            "task": "test",
            "domains": [],
            "domain_results": [],
            "aggregated_files": [],
            "all_tests_passed": False,
            "total_budget_used": 0.0,
            "execution_started": False,
            "execution_completed": False,
            "failed_domains": [],
            "partial_failure": False,
            "domain_dependencies": {},
            "sorted_domains": [],
            "execution_layers": [],
            "current_layer": 1,
        }

        assert state["current_layer"] == 1

    def test_create_parallel_state_with_dependencies(self):
        """create_parallel_state_with_deps should initialize dependency fields"""
        from src.parallel.parallel_state import create_parallel_state_with_deps

        state = create_parallel_state_with_deps(
            parent_run_id="test-123",
            task="implement auth",
            domains=["auth", "payments"],
            dependencies={"payments": ["auth"]},
        )

        assert state["domain_dependencies"] == {"payments": ["auth"]}
        assert state["sorted_domains"] == []
        assert state["execution_layers"] == []
        assert state["current_layer"] == 0


# =============================================================================
# Test Category 2: Topological Sort (8 tests)
# =============================================================================

class TestTopologicalSort:
    """Tests for topological sorting of domains"""

    def test_topological_sort_exists(self):
        """topological_sort_domains function should exist"""
        from src.parallel.dependency_sort import topological_sort_domains
        assert callable(topological_sort_domains)

    def test_topological_sort_no_dependencies(self):
        """Domains with no dependencies should maintain order"""
        from src.parallel.dependency_sort import topological_sort_domains

        domains = ["auth", "payments", "profile"]
        dependencies = {}

        sorted_domains = topological_sort_domains(domains, dependencies)

        # All domains should be present
        assert set(sorted_domains) == set(domains)

    def test_topological_sort_simple_chain(self):
        """Simple A -> B -> C chain should sort correctly"""
        from src.parallel.dependency_sort import topological_sort_domains

        domains = ["c", "a", "b"]
        dependencies = {
            "b": ["a"],  # b depends on a
            "c": ["b"],  # c depends on b
        }

        sorted_domains = topological_sort_domains(domains, dependencies)

        # a must come before b, b must come before c
        assert sorted_domains.index("a") < sorted_domains.index("b")
        assert sorted_domains.index("b") < sorted_domains.index("c")

    def test_topological_sort_diamond_pattern(self):
        """Diamond pattern (A -> B,C -> D) should sort correctly"""
        from src.parallel.dependency_sort import topological_sort_domains

        domains = ["d", "b", "c", "a"]
        dependencies = {
            "b": ["a"],
            "c": ["a"],
            "d": ["b", "c"],
        }

        sorted_domains = topological_sort_domains(domains, dependencies)

        # a must come before b and c
        # b and c must come before d
        assert sorted_domains.index("a") < sorted_domains.index("b")
        assert sorted_domains.index("a") < sorted_domains.index("c")
        assert sorted_domains.index("b") < sorted_domains.index("d")
        assert sorted_domains.index("c") < sorted_domains.index("d")

    def test_detect_circular_dependencies_exists(self):
        """detect_circular_dependencies function should exist"""
        from src.parallel.dependency_sort import detect_circular_dependencies
        assert callable(detect_circular_dependencies)

    def test_detect_circular_dependency_simple(self):
        """Should detect simple A -> B -> A cycle"""
        from src.parallel.dependency_sort import detect_circular_dependencies

        dependencies = {
            "a": ["b"],
            "b": ["a"],
        }

        cycles = detect_circular_dependencies(dependencies)

        assert len(cycles) > 0

    def test_validate_dependencies_exists(self):
        """validate_dependencies function should exist"""
        from src.parallel.dependency_sort import validate_dependencies
        assert callable(validate_dependencies)

    def test_validate_dependencies_missing_domain(self):
        """Should detect when dependency references non-existent domain"""
        from src.parallel.dependency_sort import validate_dependencies

        domains = ["auth", "payments"]
        dependencies = {
            "payments": ["auth", "missing_domain"],
        }

        result = validate_dependencies(domains, dependencies)

        assert result["valid"] is False
        assert "missing_domain" in str(result["errors"])


# =============================================================================
# Test Category 3: Execution Layers (6 tests)
# =============================================================================

class TestExecutionLayers:
    """Tests for layer-based execution"""

    def test_compute_execution_layers_exists(self):
        """compute_execution_layers function should exist"""
        from src.parallel.dependency_sort import compute_execution_layers
        assert callable(compute_execution_layers)

    def test_compute_layers_independent_domains(self):
        """Independent domains should all be in layer 0"""
        from src.parallel.dependency_sort import compute_execution_layers

        domains = ["auth", "payments", "profile"]
        dependencies = {}

        layers = compute_execution_layers(domains, dependencies)

        # All in one layer (layer 0)
        assert len(layers) == 1
        assert set(layers[0]) == set(domains)

    def test_compute_layers_sequential_dependencies(self):
        """Sequential dependencies should create one domain per layer"""
        from src.parallel.dependency_sort import compute_execution_layers

        domains = ["a", "b", "c"]
        dependencies = {
            "b": ["a"],
            "c": ["b"],
        }

        layers = compute_execution_layers(domains, dependencies)

        # Three layers: [a], [b], [c]
        assert len(layers) == 3
        assert layers[0] == ["a"]
        assert layers[1] == ["b"]
        assert layers[2] == ["c"]

    def test_compute_layers_partial_dependencies(self):
        """Mixed dependencies should create correct layers"""
        from src.parallel.dependency_sort import compute_execution_layers

        domains = ["auth", "payments", "profile", "api"]
        dependencies = {
            "payments": ["auth"],
            "profile": ["auth"],
            "api": ["payments", "profile"],
        }

        layers = compute_execution_layers(domains, dependencies)

        # Layer 0: [auth]
        # Layer 1: [payments, profile] (both depend only on auth)
        # Layer 2: [api] (depends on both payments and profile)
        assert len(layers) == 3
        assert layers[0] == ["auth"]
        assert set(layers[1]) == {"payments", "profile"}
        assert layers[2] == ["api"]

    def test_layer_executor_exists(self):
        """execute_layer function should exist"""
        from src.parallel.layer_executor import execute_layer
        assert callable(execute_layer)

    def test_layer_execution_node_exists(self):
        """layer_execution_node function should exist"""
        from src.parallel.layer_executor import layer_execution_node
        assert callable(layer_execution_node)


# =============================================================================
# Test Category 4: Native Parallel Graph (5 tests)
# =============================================================================

class TestNativeParallelGraph:
    """Tests for native parallel graph construction"""

    def test_create_native_parallel_graph_exists(self):
        """create_native_parallel_graph function should exist"""
        from src.parallel.native_parallel_graph import create_native_parallel_graph
        assert callable(create_native_parallel_graph)

    def test_native_parallel_graph_has_sort_node(self):
        """Native parallel graph should have dependency_sort node"""
        from src.parallel.native_parallel_graph import create_native_parallel_graph

        graph = create_native_parallel_graph()
        assert "dependency_sort" in graph.nodes

    def test_native_parallel_graph_has_layer_executor(self):
        """Native parallel graph should have layer_executor node"""
        from src.parallel.native_parallel_graph import create_native_parallel_graph

        graph = create_native_parallel_graph()
        assert "layer_executor" in graph.nodes

    def test_native_parallel_graph_compiles(self):
        """Native parallel graph should compile without error"""
        from src.parallel.native_parallel_graph import compile_native_parallel_graph

        compiled = compile_native_parallel_graph()
        assert compiled is not None

    def test_native_parallel_graph_is_runnable(self):
        """Compiled native parallel graph should be runnable"""
        from src.parallel.native_parallel_graph import compile_native_parallel_graph
        from langgraph.graph.state import CompiledStateGraph

        compiled = compile_native_parallel_graph()
        assert isinstance(compiled, CompiledStateGraph)
