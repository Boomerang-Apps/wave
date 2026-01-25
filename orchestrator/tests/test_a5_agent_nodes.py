"""
Test A.5: Agent Nodes
TDD - Tests written BEFORE implementation

Acceptance Criteria:
1. Agent node functions exist (cto, pm, dev, qa, supervisor)
2. Each node is callable and accepts WAVEState
3. Each node returns dict with state updates
4. Nodes have role-specific system prompts
5. Supervisor has routing logic
"""

import pytest
from typing import Callable


class TestAgentNodeImports:
    """Test A.5.1: Verify agent nodes are importable"""

    def test_cto_node_exists(self):
        """CTO node should be importable"""
        from nodes.cto import cto_node
        assert cto_node is not None
        assert callable(cto_node)

    def test_pm_node_exists(self):
        """PM node should be importable"""
        from nodes.pm import pm_node
        assert pm_node is not None
        assert callable(pm_node)

    def test_dev_node_exists(self):
        """Dev node should be importable"""
        from nodes.dev import dev_node
        assert dev_node is not None
        assert callable(dev_node)

    def test_qa_node_exists(self):
        """QA node should be importable"""
        from nodes.qa import qa_node
        assert qa_node is not None
        assert callable(qa_node)

    def test_supervisor_node_exists(self):
        """Supervisor node should be importable"""
        from nodes.supervisor import supervisor_node
        assert supervisor_node is not None
        assert callable(supervisor_node)


class TestAgentSystemPrompts:
    """Test A.5.2: Verify agents have system prompts"""

    def test_cto_has_system_prompt(self):
        """CTO should have a system prompt"""
        from nodes.cto import CTO_SYSTEM_PROMPT
        assert CTO_SYSTEM_PROMPT is not None
        assert len(CTO_SYSTEM_PROMPT) > 50
        assert "architect" in CTO_SYSTEM_PROMPT.lower() or "technical" in CTO_SYSTEM_PROMPT.lower()

    def test_pm_has_system_prompt(self):
        """PM should have a system prompt"""
        from nodes.pm import PM_SYSTEM_PROMPT
        assert PM_SYSTEM_PROMPT is not None
        assert len(PM_SYSTEM_PROMPT) > 50
        assert "task" in PM_SYSTEM_PROMPT.lower() or "project" in PM_SYSTEM_PROMPT.lower()

    def test_dev_has_system_prompt(self):
        """Dev should have a system prompt"""
        from nodes.dev import DEV_SYSTEM_PROMPT
        assert DEV_SYSTEM_PROMPT is not None
        assert len(DEV_SYSTEM_PROMPT) > 50
        assert "code" in DEV_SYSTEM_PROMPT.lower() or "implement" in DEV_SYSTEM_PROMPT.lower()

    def test_qa_has_system_prompt(self):
        """QA should have a system prompt"""
        from nodes.qa import QA_SYSTEM_PROMPT
        assert QA_SYSTEM_PROMPT is not None
        assert len(QA_SYSTEM_PROMPT) > 50
        assert "test" in QA_SYSTEM_PROMPT.lower() or "quality" in QA_SYSTEM_PROMPT.lower()

    def test_supervisor_has_system_prompt(self):
        """Supervisor should have a system prompt"""
        from nodes.supervisor import SUPERVISOR_SYSTEM_PROMPT
        assert SUPERVISOR_SYSTEM_PROMPT is not None
        assert len(SUPERVISOR_SYSTEM_PROMPT) > 50


class TestAgentRoles:
    """Test A.5.3: Verify agent role constants"""

    def test_agent_roles_defined(self):
        """Agent roles should be defined"""
        from nodes import AGENT_ROLES
        assert AGENT_ROLES is not None
        assert isinstance(AGENT_ROLES, (list, tuple))

    def test_all_roles_present(self):
        """All five roles should be defined"""
        from nodes import AGENT_ROLES
        expected_roles = {"cto", "pm", "dev", "qa", "supervisor"}
        assert set(AGENT_ROLES) == expected_roles


class TestSupervisorRouting:
    """Test A.5.4: Verify supervisor routing logic"""

    def test_supervisor_has_route_function(self):
        """Supervisor should have routing function"""
        from nodes.supervisor import route_to_agent
        assert route_to_agent is not None
        assert callable(route_to_agent)

    def test_route_returns_valid_agent(self):
        """Route function should return valid agent name"""
        from nodes.supervisor import route_to_agent
        from nodes import AGENT_ROLES
        from state import create_initial_state

        state = create_initial_state(
            run_id="test-123",
            task="Test task"
        )

        # Route should return a string
        result = route_to_agent(state)
        assert isinstance(result, str)
        # Should be valid agent or END
        assert result in AGENT_ROLES or result == "END"


class TestNodeStateHandling:
    """Test A.5.5: Verify nodes handle state correctly"""

    def test_cto_returns_dict(self):
        """CTO node should return dict"""
        from nodes.cto import cto_node
        from state import create_initial_state

        state = create_initial_state(
            run_id="test-123",
            task="Create a REST API"
        )

        result = cto_node(state)
        assert isinstance(result, dict)

    def test_pm_returns_dict(self):
        """PM node should return dict"""
        from nodes.pm import pm_node
        from state import create_initial_state

        state = create_initial_state(
            run_id="test-123",
            task="Create a REST API"
        )

        result = pm_node(state)
        assert isinstance(result, dict)

    def test_dev_returns_dict(self):
        """Dev node should return dict"""
        from nodes.dev import dev_node
        from state import create_initial_state

        state = create_initial_state(
            run_id="test-123",
            task="Create a REST API"
        )

        result = dev_node(state)
        assert isinstance(result, dict)

    def test_qa_returns_dict(self):
        """QA node should return dict"""
        from nodes.qa import qa_node
        from state import create_initial_state

        state = create_initial_state(
            run_id="test-123",
            task="Create a REST API"
        )

        result = qa_node(state)
        assert isinstance(result, dict)

    def test_supervisor_returns_dict(self):
        """Supervisor node should return dict"""
        from nodes.supervisor import supervisor_node
        from state import create_initial_state

        state = create_initial_state(
            run_id="test-123",
            task="Create a REST API"
        )

        result = supervisor_node(state)
        assert isinstance(result, dict)


class TestNodeStateUpdates:
    """Test A.5.6: Verify nodes update correct state fields"""

    def test_node_updates_current_agent(self):
        """Nodes should update current_agent field"""
        from nodes.cto import cto_node
        from state import create_initial_state

        state = create_initial_state(
            run_id="test-123",
            task="Create a REST API"
        )

        result = cto_node(state)
        assert 'current_agent' in result
        assert result['current_agent'] == 'cto'

    def test_node_can_add_actions(self):
        """Nodes should be able to add to actions list"""
        from nodes.cto import cto_node
        from state import create_initial_state

        state = create_initial_state(
            run_id="test-123",
            task="Create a REST API"
        )

        result = cto_node(state)
        # Actions should be returned (may be empty list or have entries)
        assert 'actions' in result
        assert isinstance(result['actions'], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
