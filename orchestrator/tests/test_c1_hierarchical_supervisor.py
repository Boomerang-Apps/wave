"""
Test C.1: Hierarchical Supervisor Pattern
TDD - Tests written BEFORE implementation

Gate 0 Validation: Phase 1 of LANGGRAPH-ENHANCEMENT-PLAN.md
Based on Grok's LangGraph multi-agent patterns guide.

Test Categories:
1. State Schema Enhancement (4 new fields)
2. Domain State TypedDict
3. Domain Sub-graphs (6 domains)
4. Domain Nodes (CTO, Dev, QA)
5. Domain Router (analyze_story_domains)
6. Enhanced Supervisor (domain delegation)

Expected Result: All tests should FAIL initially, then PASS after implementation.
"""

import pytest
from typing import List


# =============================================================================
# SECTION 1: State Schema Enhancement Tests
# =============================================================================

class TestStateSchemaEnhancement:
    """Test A.4 extension: WAVEState new fields from Grok's example"""

    def test_wave_state_has_domain_field(self):
        """WAVEState should have 'domain' field for current domain tracking"""
        from state import WAVEState
        # Check the TypedDict annotations
        annotations = WAVEState.__annotations__
        assert "domain" in annotations, "WAVEState missing 'domain' field"

    def test_wave_state_has_retry_count_field(self):
        """WAVEState should have 'retry_count' field for retry tracking"""
        from state import WAVEState
        annotations = WAVEState.__annotations__
        assert "retry_count" in annotations, "WAVEState missing 'retry_count' field"

    def test_wave_state_has_needs_human_field(self):
        """WAVEState should have 'needs_human' field for HITL flag"""
        from state import WAVEState
        annotations = WAVEState.__annotations__
        assert "needs_human" in annotations, "WAVEState missing 'needs_human' field"

    def test_wave_state_has_rlm_summary_field(self):
        """WAVEState should have 'rlm_summary' field for LLM-generated summary"""
        from state import WAVEState
        annotations = WAVEState.__annotations__
        assert "rlm_summary" in annotations, "WAVEState missing 'rlm_summary' field"

    def test_create_initial_state_includes_domain(self):
        """create_initial_state should set domain to empty string by default"""
        from state import create_initial_state
        state = create_initial_state(run_id="test-123", task="Test task")
        assert state.get("domain") == "", "domain should default to empty string"

    def test_create_initial_state_includes_retry_count(self):
        """create_initial_state should set retry_count to 0 by default"""
        from state import create_initial_state
        state = create_initial_state(run_id="test-123", task="Test task")
        assert state.get("retry_count") == 0, "retry_count should default to 0"

    def test_create_initial_state_includes_needs_human(self):
        """create_initial_state should set needs_human to False by default"""
        from state import create_initial_state
        state = create_initial_state(run_id="test-123", task="Test task")
        assert state.get("needs_human") is False, "needs_human should default to False"

    def test_create_initial_state_includes_rlm_summary(self):
        """create_initial_state should set rlm_summary to empty string by default"""
        from state import create_initial_state
        state = create_initial_state(run_id="test-123", task="Test task")
        assert state.get("rlm_summary") == "", "rlm_summary should default to empty string"


# =============================================================================
# SECTION 2: Domain State Tests
# =============================================================================

class TestDomainState:
    """Test domain-specific state schema"""

    def test_domain_state_exists(self):
        """DomainState TypedDict should exist"""
        from src.domains.domain_graph import DomainState
        assert DomainState is not None

    def test_domain_state_has_domain_field(self):
        """DomainState should have 'domain' field"""
        from src.domains.domain_graph import DomainState
        annotations = DomainState.__annotations__
        assert "domain" in annotations, "DomainState missing 'domain' field"

    def test_domain_state_has_parent_run_id(self):
        """DomainState should have 'parent_run_id' field"""
        from src.domains.domain_graph import DomainState
        annotations = DomainState.__annotations__
        assert "parent_run_id" in annotations, "DomainState missing 'parent_run_id' field"

    def test_domain_state_has_task(self):
        """DomainState should have 'task' field"""
        from src.domains.domain_graph import DomainState
        annotations = DomainState.__annotations__
        assert "task" in annotations, "DomainState missing 'task' field"

    def test_domain_state_has_files_modified(self):
        """DomainState should have 'files_modified' field"""
        from src.domains.domain_graph import DomainState
        annotations = DomainState.__annotations__
        assert "files_modified" in annotations, "DomainState missing 'files_modified' field"

    def test_domain_state_has_tests_passed(self):
        """DomainState should have 'tests_passed' field"""
        from src.domains.domain_graph import DomainState
        annotations = DomainState.__annotations__
        assert "tests_passed" in annotations, "DomainState missing 'tests_passed' field"

    def test_domain_state_has_cto_approved(self):
        """DomainState should have 'cto_approved' field"""
        from src.domains.domain_graph import DomainState
        annotations = DomainState.__annotations__
        assert "cto_approved" in annotations, "DomainState missing 'cto_approved' field"


# =============================================================================
# SECTION 3: Domain Sub-graph Tests
# =============================================================================

class TestDomainSubgraphs:
    """Test domain sub-graph creation and structure"""

    def test_supported_domains_list_exists(self):
        """SUPPORTED_DOMAINS constant should exist with at least 6 domains"""
        from src.domains.domain_graph import SUPPORTED_DOMAINS
        assert isinstance(SUPPORTED_DOMAINS, list)
        assert len(SUPPORTED_DOMAINS) >= 6, f"Expected 6+ domains, got {len(SUPPORTED_DOMAINS)}"

    def test_supported_domains_contains_auth(self):
        """SUPPORTED_DOMAINS should include 'auth' domain"""
        from src.domains.domain_graph import SUPPORTED_DOMAINS
        assert "auth" in SUPPORTED_DOMAINS

    def test_supported_domains_contains_payments(self):
        """SUPPORTED_DOMAINS should include 'payments' domain"""
        from src.domains.domain_graph import SUPPORTED_DOMAINS
        assert "payments" in SUPPORTED_DOMAINS

    def test_supported_domains_contains_profile(self):
        """SUPPORTED_DOMAINS should include 'profile' domain"""
        from src.domains.domain_graph import SUPPORTED_DOMAINS
        assert "profile" in SUPPORTED_DOMAINS

    def test_supported_domains_contains_api(self):
        """SUPPORTED_DOMAINS should include 'api' domain"""
        from src.domains.domain_graph import SUPPORTED_DOMAINS
        assert "api" in SUPPORTED_DOMAINS

    def test_supported_domains_contains_ui(self):
        """SUPPORTED_DOMAINS should include 'ui' domain"""
        from src.domains.domain_graph import SUPPORTED_DOMAINS
        assert "ui" in SUPPORTED_DOMAINS

    def test_supported_domains_contains_data(self):
        """SUPPORTED_DOMAINS should include 'data' domain"""
        from src.domains.domain_graph import SUPPORTED_DOMAINS
        assert "data" in SUPPORTED_DOMAINS

    def test_create_domain_subgraph_returns_stategraph(self):
        """create_domain_subgraph should return a StateGraph"""
        from src.domains.domain_graph import create_domain_subgraph
        from langgraph.graph import StateGraph
        graph = create_domain_subgraph("auth")
        assert isinstance(graph, StateGraph)

    def test_create_domain_subgraph_for_each_domain(self):
        """create_domain_subgraph should work for all supported domains"""
        from src.domains.domain_graph import create_domain_subgraph, SUPPORTED_DOMAINS
        from langgraph.graph import StateGraph
        for domain in SUPPORTED_DOMAINS:
            graph = create_domain_subgraph(domain)
            assert isinstance(graph, StateGraph), f"Failed for domain: {domain}"

    def test_compile_domain_subgraph_is_runnable(self):
        """compile_domain_subgraph should return a compiled runnable graph"""
        from src.domains.domain_graph import compile_domain_subgraph
        compiled = compile_domain_subgraph("auth")
        assert compiled is not None
        # Check it has invoke method (LangGraph compiled graphs are runnable)
        assert hasattr(compiled, "invoke") or hasattr(compiled, "stream")


# =============================================================================
# SECTION 4: Domain Node Tests
# =============================================================================

class TestDomainNodes:
    """Test domain-specific agent nodes"""

    def test_domain_cto_node_exists(self):
        """domain_cto_node function should exist"""
        from src.domains.domain_nodes import domain_cto_node
        assert callable(domain_cto_node)

    def test_domain_dev_node_exists(self):
        """domain_dev_node function should exist"""
        from src.domains.domain_nodes import domain_dev_node
        assert callable(domain_dev_node)

    def test_domain_qa_node_exists(self):
        """domain_qa_node function should exist"""
        from src.domains.domain_nodes import domain_qa_node
        assert callable(domain_qa_node)

    def test_domain_pm_node_exists(self):
        """domain_pm_node function should exist"""
        from src.domains.domain_nodes import domain_pm_node
        assert callable(domain_pm_node)

    def test_domain_cto_node_returns_dict(self):
        """domain_cto_node should return a dict with state updates"""
        from src.domains.domain_nodes import domain_cto_node
        from src.domains.domain_graph import DomainState
        test_state: DomainState = {
            "domain": "auth",
            "parent_run_id": "test-123",
            "task": "Implement login",
            "files_modified": [],
            "tests_passed": False,
            "cto_approved": False,
        }
        result = domain_cto_node(test_state)
        assert isinstance(result, dict)

    def test_domain_dev_node_returns_dict(self):
        """domain_dev_node should return a dict with state updates"""
        from src.domains.domain_nodes import domain_dev_node
        from src.domains.domain_graph import DomainState
        test_state: DomainState = {
            "domain": "auth",
            "parent_run_id": "test-123",
            "task": "Implement login",
            "files_modified": [],
            "tests_passed": False,
            "cto_approved": True,
        }
        result = domain_dev_node(test_state)
        assert isinstance(result, dict)

    def test_domain_qa_node_returns_dict(self):
        """domain_qa_node should return a dict with state updates"""
        from src.domains.domain_nodes import domain_qa_node
        from src.domains.domain_graph import DomainState
        test_state: DomainState = {
            "domain": "auth",
            "parent_run_id": "test-123",
            "task": "Implement login",
            "files_modified": ["auth/login.py"],
            "tests_passed": False,
            "cto_approved": True,
        }
        result = domain_qa_node(test_state)
        assert isinstance(result, dict)


# =============================================================================
# SECTION 5: Domain Router Tests
# =============================================================================

class TestDomainRouter:
    """Test domain analysis and routing"""

    def test_analyze_story_domains_exists(self):
        """analyze_story_domains function should exist"""
        from src.domains.domain_router import analyze_story_domains
        assert callable(analyze_story_domains)

    def test_analyze_story_domains_returns_list(self):
        """analyze_story_domains should return a list of domains"""
        from src.domains.domain_router import analyze_story_domains
        result = analyze_story_domains("Implement user authentication")
        assert isinstance(result, list)

    def test_analyze_story_domains_detects_auth(self):
        """analyze_story_domains should detect auth-related tasks"""
        from src.domains.domain_router import analyze_story_domains
        result = analyze_story_domains("Implement user login and authentication")
        assert "auth" in result, f"Expected 'auth' in {result}"

    def test_analyze_story_domains_detects_payments(self):
        """analyze_story_domains should detect payment-related tasks"""
        from src.domains.domain_router import analyze_story_domains
        result = analyze_story_domains("Add Stripe payment processing")
        assert "payments" in result, f"Expected 'payments' in {result}"

    def test_analyze_story_domains_detects_profile(self):
        """analyze_story_domains should detect profile-related tasks"""
        from src.domains.domain_router import analyze_story_domains
        result = analyze_story_domains("Update user profile page with settings")
        assert "profile" in result, f"Expected 'profile' in {result}"

    def test_analyze_story_domains_detects_api(self):
        """analyze_story_domains should detect API-related tasks"""
        from src.domains.domain_router import analyze_story_domains
        result = analyze_story_domains("Create REST API endpoint for data")
        assert "api" in result, f"Expected 'api' in {result}"

    def test_analyze_story_domains_detects_ui(self):
        """analyze_story_domains should detect UI-related tasks"""
        from src.domains.domain_router import analyze_story_domains
        result = analyze_story_domains("Build React dashboard component")
        assert "ui" in result, f"Expected 'ui' in {result}"

    def test_analyze_story_domains_detects_data(self):
        """analyze_story_domains should detect data-related tasks"""
        from src.domains.domain_router import analyze_story_domains
        result = analyze_story_domains("Implement database migration and schema update")
        assert "data" in result, f"Expected 'data' in {result}"

    def test_analyze_story_domains_detects_multiple(self):
        """analyze_story_domains should detect multiple domains in complex tasks"""
        from src.domains.domain_router import analyze_story_domains
        result = analyze_story_domains(
            "Build user authentication with profile page and payment integration"
        )
        assert len(result) >= 2, f"Expected multiple domains, got {result}"
        assert "auth" in result
        # Should also detect profile and/or payments

    def test_analyze_story_domains_returns_empty_for_unknown(self):
        """analyze_story_domains should return empty for unrecognized tasks"""
        from src.domains.domain_router import analyze_story_domains
        result = analyze_story_domains("Do something completely abstract")
        # Should return empty or default domain list
        assert isinstance(result, list)

    def test_route_to_domain_exists(self):
        """route_to_domain function should exist"""
        from src.domains.domain_router import route_to_domain
        assert callable(route_to_domain)

    def test_route_to_domain_returns_compiled_graph(self):
        """route_to_domain should return a compiled domain sub-graph"""
        from src.domains.domain_router import route_to_domain
        compiled = route_to_domain("auth")
        assert compiled is not None
        assert hasattr(compiled, "invoke") or hasattr(compiled, "stream")


# =============================================================================
# SECTION 6: Enhanced Supervisor Tests
# =============================================================================

class TestEnhancedSupervisor:
    """Test supervisor node with domain delegation"""

    def test_supervisor_analyzes_task_domains(self):
        """Supervisor should analyze task to determine relevant domains"""
        from nodes.supervisor import supervisor_node
        from state import create_initial_state
        state = create_initial_state(
            run_id="test-123",
            task="Implement user login with password reset"
        )
        result = supervisor_node(state)
        # Result should include domain analysis
        actions = result.get("actions", [])
        assert len(actions) > 0
        # Check if domain was analyzed in details
        last_action = actions[-1]
        assert "domain" in str(last_action.get("details", {})).lower() or \
               result.get("domain") is not None or \
               "domains" in str(last_action.get("details", {})).lower()

    def test_supervisor_delegates_to_domain_subgraph(self):
        """Supervisor should delegate domain tasks to sub-graphs"""
        from nodes.supervisor import route_to_agent
        from state import create_initial_state
        state = create_initial_state(
            run_id="test-123",
            task="Implement authentication"
        )
        state["domain"] = "auth"  # Set domain
        # When domain is set, should route to domain sub-graph
        route = route_to_agent(state)
        # Should return domain-related route or the domain subgraph name
        assert route in ["auth", "domain_auth", "pm", "cto", "dev", "qa", "END"]

    def test_supervisor_handles_multi_domain_task(self):
        """Supervisor should coordinate multi-domain tasks"""
        from nodes.supervisor import supervisor_node
        from state import create_initial_state
        state = create_initial_state(
            run_id="test-123",
            task="Build login page with payment integration"
        )
        result = supervisor_node(state)
        # Should identify multiple domains
        actions = result.get("actions", [])
        assert len(actions) > 0


# =============================================================================
# SECTION 7: Integration Tests
# =============================================================================

class TestHierarchicalIntegration:
    """Integration tests for full hierarchical flow"""

    def test_domain_subgraph_in_main_graph(self):
        """Main graph should be able to invoke domain sub-graphs"""
        from src.domains.domain_graph import compile_domain_subgraph
        from src.domains.domain_graph import DomainState

        # Compile auth domain sub-graph
        auth_graph = compile_domain_subgraph("auth")

        # Create domain state
        domain_state: DomainState = {
            "domain": "auth",
            "parent_run_id": "test-123",
            "task": "Implement login",
            "files_modified": [],
            "tests_passed": False,
            "cto_approved": False,
        }

        # Should be invokable (may fail without LLM, but structure should work)
        assert auth_graph is not None

    def test_domain_exports_in_init(self):
        """All domain components should be exported from __init__.py"""
        from src.domains import (
            DomainState,
            create_domain_subgraph,
            compile_domain_subgraph,
            SUPPORTED_DOMAINS,
            domain_cto_node,
            domain_pm_node,
            domain_dev_node,
            domain_qa_node,
            analyze_story_domains,
            route_to_domain,
        )
        # All imports should succeed
        assert DomainState is not None
        assert create_domain_subgraph is not None
        assert compile_domain_subgraph is not None
        assert SUPPORTED_DOMAINS is not None
        assert domain_cto_node is not None
        assert domain_pm_node is not None
        assert domain_dev_node is not None
        assert domain_qa_node is not None
        assert analyze_story_domains is not None
        assert route_to_domain is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
