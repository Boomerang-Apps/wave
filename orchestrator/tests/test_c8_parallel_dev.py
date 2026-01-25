"""
Phase 8: Parallel Dev Agents TDD Tests
Tests for frontend/backend developer parallel execution within domains.

Based on Grok's Parallel Domain Execution Recommendations

Test Categories:
1. Dev Agent Types (6 tests)
2. Parallel Dev (8 tests)
3. Dev Merge (5 tests)

Total: 19 tests
"""

import pytest
from typing import Dict, Any, List


# =============================================================================
# Test Category 1: Dev Agent Types (6 tests)
# =============================================================================

class TestDevAgentTypes:
    """Tests for dev agent type definitions and nodes"""

    def test_dev_agent_state_exists(self):
        """DevAgentState TypedDict should exist"""
        from src.domains.dev_agent_state import DevAgentState

        state: DevAgentState = {
            "domain": "auth",
            "current_assignment": "frontend",
            "agent_type": "frontend",
            "files_modified": [],
            "tests_written": [],
            "success": True,
            "error": None,
        }

        assert state["agent_type"] == "frontend"

    def test_fe_dev_node_exists(self):
        """fe_dev_node function should exist"""
        from nodes.dev_agents import fe_dev_node
        assert callable(fe_dev_node)

    def test_be_dev_node_exists(self):
        """be_dev_node function should exist"""
        from nodes.dev_agents import be_dev_node
        assert callable(be_dev_node)

    def test_fe_dev_returns_frontend_type(self):
        """fe_dev_node should return agent_type='frontend'"""
        from nodes.dev_agents import fe_dev_node

        state = {
            "domain": "auth",
            "current_assignment": "frontend",
        }

        result = fe_dev_node(state)

        assert result["agent_type"] == "frontend"

    def test_be_dev_returns_backend_type(self):
        """be_dev_node should return agent_type='backend'"""
        from nodes.dev_agents import be_dev_node

        state = {
            "domain": "auth",
            "current_assignment": "backend",
        }

        result = be_dev_node(state)

        assert result["agent_type"] == "backend"

    def test_dev_agent_routes_by_assignment(self):
        """dev_agent_node should route to fe/be based on assignment"""
        from nodes.dev_agents import dev_agent_node

        fe_state = {
            "domain": "auth",
            "current_assignment": "frontend",
        }
        be_state = {
            "domain": "auth",
            "current_assignment": "backend",
        }

        fe_result = dev_agent_node(fe_state)
        be_result = dev_agent_node(be_state)

        assert fe_result["agent_type"] == "frontend"
        assert be_result["agent_type"] == "backend"


# =============================================================================
# Test Category 2: Parallel Dev (8 tests)
# =============================================================================

class TestParallelDev:
    """Tests for parallel dev execution"""

    def test_domain_dev_state_has_assignments(self):
        """DomainDevState should have dev_assignments field"""
        from src.domains.dev_agent_state import DomainDevState

        state: DomainDevState = {
            "domain": "auth",
            "dev_assignments": ["frontend", "backend"],
            "dev_results": [],
            "merged_files": [],
            "merged_tests": [],
        }

        assert state["dev_assignments"] == ["frontend", "backend"]

    def test_domain_dev_state_has_results(self):
        """DomainDevState should have dev_results field"""
        from src.domains.dev_agent_state import DomainDevState

        state: DomainDevState = {
            "domain": "auth",
            "dev_assignments": [],
            "dev_results": [
                {"agent_type": "frontend", "files_modified": ["app.tsx"]},
            ],
            "merged_files": [],
            "merged_tests": [],
        }

        assert len(state["dev_results"]) == 1

    def test_parallel_dev_graph_exists(self):
        """create_parallel_dev_graph function should exist"""
        from src.domains.parallel_dev_graph import create_parallel_dev_graph
        assert callable(create_parallel_dev_graph)

    def test_parallel_dev_graph_has_fe_node(self):
        """Parallel dev graph should have fe_dev node"""
        from src.domains.parallel_dev_graph import create_parallel_dev_graph

        graph = create_parallel_dev_graph()
        assert "fe_dev" in graph.nodes

    def test_parallel_dev_graph_has_be_node(self):
        """Parallel dev graph should have be_dev node"""
        from src.domains.parallel_dev_graph import create_parallel_dev_graph

        graph = create_parallel_dev_graph()
        assert "be_dev" in graph.nodes

    def test_parallel_dev_graph_has_merge_node(self):
        """Parallel dev graph should have merge_results node"""
        from src.domains.parallel_dev_graph import create_parallel_dev_graph

        graph = create_parallel_dev_graph()
        assert "merge_results" in graph.nodes

    def test_parallel_dev_graph_compiles(self):
        """Parallel dev graph should compile without error"""
        from src.domains.parallel_dev_graph import compile_parallel_dev_graph

        compiled = compile_parallel_dev_graph()
        assert compiled is not None

    def test_parallel_dev_graph_is_runnable(self):
        """Compiled parallel dev graph should be runnable"""
        from src.domains.parallel_dev_graph import compile_parallel_dev_graph
        from langgraph.graph.state import CompiledStateGraph

        compiled = compile_parallel_dev_graph()
        assert isinstance(compiled, CompiledStateGraph)


# =============================================================================
# Test Category 3: Dev Merge (5 tests)
# =============================================================================

class TestDevMerge:
    """Tests for dev result merging"""

    def test_merge_dev_results_exists(self):
        """merge_dev_results function should exist"""
        from src.domains.dev_merger import merge_dev_results
        assert callable(merge_dev_results)

    def test_merge_aggregates_files(self):
        """merge_dev_results should aggregate files from all devs"""
        from src.domains.dev_merger import merge_dev_results

        state = {
            "domain": "auth",
            "dev_results": [
                {"agent_type": "frontend", "files_modified": ["LoginForm.tsx"]},
                {"agent_type": "backend", "files_modified": ["auth_api.py"]},
            ],
        }

        result = merge_dev_results(state)

        assert "LoginForm.tsx" in result["merged_files"]
        assert "auth_api.py" in result["merged_files"]

    def test_merge_aggregates_tests(self):
        """merge_dev_results should aggregate tests from all devs"""
        from src.domains.dev_merger import merge_dev_results

        state = {
            "domain": "auth",
            "dev_results": [
                {"agent_type": "frontend", "tests_written": ["login.test.ts"]},
                {"agent_type": "backend", "tests_written": ["test_auth.py"]},
            ],
        }

        result = merge_dev_results(state)

        assert "login.test.ts" in result["merged_tests"]
        assert "test_auth.py" in result["merged_tests"]

    def test_merge_handles_empty_results(self):
        """merge_dev_results should handle empty dev_results"""
        from src.domains.dev_merger import merge_dev_results

        state = {
            "domain": "auth",
            "dev_results": [],
        }

        result = merge_dev_results(state)

        assert result["merged_files"] == []
        assert result["merged_tests"] == []

    def test_merge_deduplicates_files(self):
        """merge_dev_results should deduplicate files"""
        from src.domains.dev_merger import merge_dev_results

        state = {
            "domain": "auth",
            "dev_results": [
                {"agent_type": "frontend", "files_modified": ["shared/types.ts"]},
                {"agent_type": "backend", "files_modified": ["shared/types.ts"]},
            ],
        }

        result = merge_dev_results(state)

        # Should only appear once
        assert result["merged_files"].count("shared/types.ts") == 1
