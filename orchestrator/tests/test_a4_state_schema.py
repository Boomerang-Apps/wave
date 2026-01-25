"""
Test A.4: State Schema
TDD - Tests written BEFORE implementation

Acceptance Criteria:
1. WAVEState TypedDict exists with all required fields
2. Nested state types: GitState, BudgetState, SafetyState, GateState
3. Message history tracking
4. Agent action tracking
5. Proper type annotations for LangGraph compatibility
"""

import pytest
from typing import get_type_hints


class TestStateSchemaImports:
    """Test A.4.1: Verify state classes are importable"""

    def test_wave_state_exists(self):
        """WAVEState should be importable"""
        from state import WAVEState
        assert WAVEState is not None

    def test_git_state_exists(self):
        """GitState should be importable"""
        from state import GitState
        assert GitState is not None

    def test_budget_state_exists(self):
        """BudgetState should be importable"""
        from state import BudgetState
        assert BudgetState is not None

    def test_safety_state_exists(self):
        """SafetyState should be importable"""
        from state import SafetyState
        assert SafetyState is not None

    def test_gate_state_exists(self):
        """GateState should be importable"""
        from state import GateState
        assert GateState is not None

    def test_agent_action_exists(self):
        """AgentAction should be importable"""
        from state import AgentAction
        assert AgentAction is not None


class TestWAVEStateFields:
    """Test A.4.2: WAVEState has required fields"""

    def test_wave_state_has_run_id(self):
        """WAVEState should have run_id field"""
        from state import WAVEState
        hints = get_type_hints(WAVEState)
        assert 'run_id' in hints

    def test_wave_state_has_task(self):
        """WAVEState should have task field"""
        from state import WAVEState
        hints = get_type_hints(WAVEState)
        assert 'task' in hints

    def test_wave_state_has_messages(self):
        """WAVEState should have messages field"""
        from state import WAVEState
        hints = get_type_hints(WAVEState)
        assert 'messages' in hints

    def test_wave_state_has_current_agent(self):
        """WAVEState should have current_agent field"""
        from state import WAVEState
        hints = get_type_hints(WAVEState)
        assert 'current_agent' in hints

    def test_wave_state_has_git_state(self):
        """WAVEState should have git field"""
        from state import WAVEState
        hints = get_type_hints(WAVEState)
        assert 'git' in hints

    def test_wave_state_has_budget(self):
        """WAVEState should have budget field"""
        from state import WAVEState
        hints = get_type_hints(WAVEState)
        assert 'budget' in hints

    def test_wave_state_has_safety(self):
        """WAVEState should have safety field"""
        from state import WAVEState
        hints = get_type_hints(WAVEState)
        assert 'safety' in hints

    def test_wave_state_has_gates(self):
        """WAVEState should have gates field"""
        from state import WAVEState
        hints = get_type_hints(WAVEState)
        assert 'gates' in hints

    def test_wave_state_has_actions(self):
        """WAVEState should have actions field"""
        from state import WAVEState
        hints = get_type_hints(WAVEState)
        assert 'actions' in hints

    def test_wave_state_has_status(self):
        """WAVEState should have status field"""
        from state import WAVEState
        hints = get_type_hints(WAVEState)
        assert 'status' in hints


class TestGitStateFields:
    """Test A.4.3: GitState has required fields"""

    def test_git_state_has_repo_path(self):
        """GitState should have repo_path field"""
        from state import GitState
        hints = get_type_hints(GitState)
        assert 'repo_path' in hints

    def test_git_state_has_branch(self):
        """GitState should have branch field"""
        from state import GitState
        hints = get_type_hints(GitState)
        assert 'branch' in hints

    def test_git_state_has_base_commit(self):
        """GitState should have base_commit field"""
        from state import GitState
        hints = get_type_hints(GitState)
        assert 'base_commit' in hints

    def test_git_state_has_current_commit(self):
        """GitState should have current_commit field"""
        from state import GitState
        hints = get_type_hints(GitState)
        assert 'current_commit' in hints


class TestBudgetStateFields:
    """Test A.4.4: BudgetState has required fields"""

    def test_budget_state_has_token_limit(self):
        """BudgetState should have token_limit field"""
        from state import BudgetState
        hints = get_type_hints(BudgetState)
        assert 'token_limit' in hints

    def test_budget_state_has_tokens_used(self):
        """BudgetState should have tokens_used field"""
        from state import BudgetState
        hints = get_type_hints(BudgetState)
        assert 'tokens_used' in hints

    def test_budget_state_has_cost_limit(self):
        """BudgetState should have cost_limit_usd field"""
        from state import BudgetState
        hints = get_type_hints(BudgetState)
        assert 'cost_limit_usd' in hints

    def test_budget_state_has_cost_used(self):
        """BudgetState should have cost_used_usd field"""
        from state import BudgetState
        hints = get_type_hints(BudgetState)
        assert 'cost_used_usd' in hints


class TestSafetyStateFields:
    """Test A.4.5: SafetyState has required fields"""

    def test_safety_state_has_score(self):
        """SafetyState should have constitutional_score field"""
        from state import SafetyState
        hints = get_type_hints(SafetyState)
        assert 'constitutional_score' in hints

    def test_safety_state_has_violations(self):
        """SafetyState should have violations field"""
        from state import SafetyState
        hints = get_type_hints(SafetyState)
        assert 'violations' in hints

    def test_safety_state_has_human_approved(self):
        """SafetyState should have human_approved field"""
        from state import SafetyState
        hints = get_type_hints(SafetyState)
        assert 'human_approved' in hints


class TestGateStateFields:
    """Test A.4.6: GateState has required fields"""

    def test_gate_state_has_gate_number(self):
        """GateState should have gate_number field"""
        from state import GateState
        hints = get_type_hints(GateState)
        assert 'gate_number' in hints

    def test_gate_state_has_passed(self):
        """GateState should have passed field"""
        from state import GateState
        hints = get_type_hints(GateState)
        assert 'passed' in hints

    def test_gate_state_has_criteria(self):
        """GateState should have criteria field"""
        from state import GateState
        hints = get_type_hints(GateState)
        assert 'criteria' in hints


class TestAgentActionFields:
    """Test A.4.7: AgentAction has required fields"""

    def test_agent_action_has_agent(self):
        """AgentAction should have agent field"""
        from state import AgentAction
        hints = get_type_hints(AgentAction)
        assert 'agent' in hints

    def test_agent_action_has_action_type(self):
        """AgentAction should have action_type field"""
        from state import AgentAction
        hints = get_type_hints(AgentAction)
        assert 'action_type' in hints

    def test_agent_action_has_timestamp(self):
        """AgentAction should have timestamp field"""
        from state import AgentAction
        hints = get_type_hints(AgentAction)
        assert 'timestamp' in hints

    def test_agent_action_has_details(self):
        """AgentAction should have details field"""
        from state import AgentAction
        hints = get_type_hints(AgentAction)
        assert 'details' in hints


class TestStateCreation:
    """Test A.4.8: State objects can be created"""

    def test_create_git_state(self):
        """Should be able to create GitState"""
        from state import GitState
        git = GitState(
            repo_path="/test/repo",
            branch="main",
            base_commit="abc123",
            current_commit="abc123"
        )
        assert git['repo_path'] == "/test/repo"
        assert git['branch'] == "main"

    def test_create_budget_state(self):
        """Should be able to create BudgetState"""
        from state import BudgetState
        budget = BudgetState(
            token_limit=100000,
            tokens_used=0,
            cost_limit_usd=10.0,
            cost_used_usd=0.0
        )
        assert budget['token_limit'] == 100000
        assert budget['tokens_used'] == 0

    def test_create_safety_state(self):
        """Should be able to create SafetyState"""
        from state import SafetyState
        safety = SafetyState(
            constitutional_score=1.0,
            violations=[],
            human_approved=False
        )
        assert safety['constitutional_score'] == 1.0
        assert safety['violations'] == []

    def test_create_agent_action(self):
        """Should be able to create AgentAction"""
        from state import AgentAction
        action = AgentAction(
            agent="cto",
            action_type="plan",
            timestamp="2024-01-01T00:00:00Z",
            details={"plan": "test plan"}
        )
        assert action['agent'] == "cto"
        assert action['action_type'] == "plan"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
