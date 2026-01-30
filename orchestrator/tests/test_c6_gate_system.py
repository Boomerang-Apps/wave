"""
Phase 6: 12-Gate TDD System Tests
Tests for the full 12-gate TDD launch sequence with dependencies.

TDD Flow: Design → Story → Plan → TESTS (RED) → Dev → Complete → REFACTOR → QA → Safety → Review → Merge → Deploy

Based on Grok's Gate System from LANGGRAPH-ENHANCEMENT-PLAN.md
Updated: 2026-01-30 - Added TDD gates (TESTS_WRITTEN=25, REFACTOR_COMPLETE=45)

Test Categories:
1. Gate Enum (8 tests)
2. Gate Validator (7 tests)
3. Gate Tracker (6 tests)
4. Gate Nodes (8 tests)
5. Module Exports (2 tests)
6. Integration (7 tests)

Total: 38 tests
"""

import pytest
from typing import Dict, Any


# =============================================================================
# Test Category 1: Gate Enum (8 tests)
# =============================================================================

class TestGateEnum:
    """Tests for Gate enum and dependencies"""

    def test_gate_enum_exists(self):
        """Gate enum should exist"""
        from src.gates.gate_system import Gate
        assert Gate is not None

    def test_gate_enum_has_12_gates(self):
        """Gate enum should have 12 gates (including TDD gates 25, 45)"""
        from src.gates.gate_system import Gate
        assert len(Gate) == 12  # Original 10 + TESTS_WRITTEN(25) + REFACTOR_COMPLETE(45)

    def test_gate_design_validated_is_0(self):
        """DESIGN_VALIDATED should be gate 0"""
        from src.gates.gate_system import Gate
        assert Gate.DESIGN_VALIDATED == 0

    def test_gate_deployed_is_9(self):
        """DEPLOYED should be gate 9"""
        from src.gates.gate_system import Gate
        assert Gate.DEPLOYED == 9

    def test_gate_dependencies_exists(self):
        """GATE_DEPENDENCIES should exist"""
        from src.gates.gate_system import GATE_DEPENDENCIES
        assert GATE_DEPENDENCIES is not None
        assert isinstance(GATE_DEPENDENCIES, dict)

    def test_gate_dependencies_has_all_gates(self):
        """GATE_DEPENDENCIES should have entries for gates 1-9"""
        from src.gates.gate_system import Gate, GATE_DEPENDENCIES

        # Gates 1-9 should have dependencies (Gate 0 has none)
        for gate in Gate:
            if gate.value > 0:
                assert gate in GATE_DEPENDENCIES

    def test_gate_0_has_no_dependencies(self):
        """Gate 0 should have no dependencies"""
        from src.gates.gate_system import Gate, GATE_DEPENDENCIES

        # Gate 0 should not be in dependencies (or have empty list)
        deps = GATE_DEPENDENCIES.get(Gate.DESIGN_VALIDATED, [])
        assert len(deps) == 0

    def test_gate_descriptions_exists(self):
        """GATE_DESCRIPTIONS should exist"""
        from src.gates.gate_system import GATE_DESCRIPTIONS
        assert GATE_DESCRIPTIONS is not None
        assert isinstance(GATE_DESCRIPTIONS, dict)


# =============================================================================
# Test Category 2: Gate Validator (7 tests)
# =============================================================================

class TestGateValidator:
    """Tests for gate validation functions"""

    def test_can_pass_gate_exists(self):
        """can_pass_gate function should exist"""
        from src.gates.gate_validator import can_pass_gate
        assert callable(can_pass_gate)

    def test_can_pass_gate_0_always_true(self):
        """can_pass_gate should return True for gate 0 with no passed gates"""
        from src.gates.gate_system import Gate
        from src.gates.gate_validator import can_pass_gate

        passed_gates = []
        assert can_pass_gate(Gate.DESIGN_VALIDATED, passed_gates) is True

    def test_can_pass_gate_requires_dependencies(self):
        """can_pass_gate should require dependencies to be met"""
        from src.gates.gate_system import Gate
        from src.gates.gate_validator import can_pass_gate

        # Gate 1 requires Gate 0
        passed_gates = []
        assert can_pass_gate(Gate.STORY_ASSIGNED, passed_gates) is False

        passed_gates = [Gate.DESIGN_VALIDATED]
        assert can_pass_gate(Gate.STORY_ASSIGNED, passed_gates) is True

    def test_get_current_gate_exists(self):
        """get_current_gate function should exist"""
        from src.gates.gate_validator import get_current_gate
        assert callable(get_current_gate)

    def test_get_next_gate_exists(self):
        """get_next_gate function should exist"""
        from src.gates.gate_validator import get_next_gate
        assert callable(get_next_gate)

    def test_validate_gate_transition_valid(self):
        """validate_gate_transition should accept valid transitions"""
        from src.gates.gate_system import Gate
        from src.gates.gate_validator import validate_gate_transition

        # Valid: Gate 0 -> Gate 1
        result = validate_gate_transition(
            from_gate=Gate.DESIGN_VALIDATED,
            to_gate=Gate.STORY_ASSIGNED
        )
        assert result["valid"] is True

    def test_validate_gate_transition_invalid(self):
        """validate_gate_transition should reject invalid transitions"""
        from src.gates.gate_system import Gate
        from src.gates.gate_validator import validate_gate_transition

        # Invalid: Gate 0 -> Gate 5 (skipping gates)
        result = validate_gate_transition(
            from_gate=Gate.DESIGN_VALIDATED,
            to_gate=Gate.QA_PASSED
        )
        assert result["valid"] is False


# =============================================================================
# Test Category 3: Gate Tracker (6 tests)
# =============================================================================

class TestGateTracker:
    """Tests for gate progress tracking"""

    def test_gate_progress_exists(self):
        """GateProgress TypedDict should exist"""
        from src.gates.gate_tracker import GateProgress
        assert GateProgress is not None

    def test_create_gate_progress_exists(self):
        """create_gate_progress function should exist"""
        from src.gates.gate_tracker import create_gate_progress
        assert callable(create_gate_progress)

    def test_mark_gate_passed_exists(self):
        """mark_gate_passed function should exist"""
        from src.gates.gate_tracker import mark_gate_passed
        assert callable(mark_gate_passed)

    def test_mark_gate_passed_updates_state(self):
        """mark_gate_passed should update progress state"""
        from src.gates.gate_system import Gate
        from src.gates.gate_tracker import create_gate_progress, mark_gate_passed

        progress = create_gate_progress()
        updated = mark_gate_passed(progress, Gate.DESIGN_VALIDATED)

        assert Gate.DESIGN_VALIDATED in updated["passed_gates"]

    def test_get_gate_history_exists(self):
        """get_gate_history function should exist"""
        from src.gates.gate_tracker import get_gate_history
        assert callable(get_gate_history)

    def test_get_gate_history_returns_list(self):
        """get_gate_history should return list of transitions"""
        from src.gates.gate_system import Gate
        from src.gates.gate_tracker import create_gate_progress, mark_gate_passed, get_gate_history

        progress = create_gate_progress()
        progress = mark_gate_passed(progress, Gate.DESIGN_VALIDATED)

        history = get_gate_history(progress)
        assert isinstance(history, list)
        assert len(history) >= 1


# =============================================================================
# Test Category 4: Gate Nodes (8 tests)
# =============================================================================

class TestGateNodes:
    """Tests for gate validation nodes"""

    def test_gate_check_node_exists(self):
        """gate_check_node function should exist"""
        from nodes.gate_nodes import gate_check_node
        assert callable(gate_check_node)

    def test_gate_check_node_returns_dict(self):
        """gate_check_node should return dict"""
        from src.gates.gate_system import Gate
        from nodes.gate_nodes import gate_check_node

        state = {"gate_progress": {"passed_gates": []}}
        result = gate_check_node(state, Gate.DESIGN_VALIDATED)

        assert isinstance(result, dict)

    def test_gate_0_design_node_exists(self):
        """gate_0_design_node function should exist"""
        from nodes.gate_nodes import gate_0_design_node
        assert callable(gate_0_design_node)

    def test_gate_6_safety_node_exists(self):
        """gate_6_safety_node function should exist"""
        from nodes.gate_nodes import gate_6_safety_node
        assert callable(gate_6_safety_node)

    def test_gate_9_deploy_node_exists(self):
        """gate_9_deploy_node function should exist"""
        from nodes.gate_nodes import gate_9_deploy_node
        assert callable(gate_9_deploy_node)

    def test_gate_router_exists(self):
        """gate_router function should exist"""
        from nodes.gate_nodes import gate_router
        assert callable(gate_router)

    def test_gate_router_routes_to_next(self):
        """gate_router should route to next gate on success"""
        from nodes.gate_nodes import gate_router

        state = {"gate_passed": True, "current_gate": 0}
        result = gate_router(state)

        assert result == "next_gate"

    def test_gate_router_blocks_on_failure(self):
        """gate_router should block on gate failure"""
        from nodes.gate_nodes import gate_router

        state = {"gate_passed": False, "current_gate": 0}
        result = gate_router(state)

        assert result == "gate_failed"


# =============================================================================
# Test Category 5: Module Exports (2 tests)
# =============================================================================

class TestGatesModuleExports:
    """Tests for module exports"""

    def test_gates_module_exports(self):
        """gates module should export key components"""
        from src.gates import (
            Gate,
            GATE_DEPENDENCIES,
            GATE_DESCRIPTIONS,
            can_pass_gate,
            get_current_gate,
            get_next_gate,
            GateProgress,
            create_gate_progress,
            mark_gate_passed,
        )

        assert Gate is not None
        assert GATE_DEPENDENCIES is not None
        assert callable(can_pass_gate)
        assert callable(create_gate_progress)

    def test_gate_nodes_importable(self):
        """gate_nodes module should be importable"""
        from nodes import gate_nodes
        assert gate_nodes is not None


# =============================================================================
# Test Category 6: Integration (7 tests)
# =============================================================================

class TestGateIntegration:
    """Integration tests for gate system"""

    def test_full_gate_progression(self):
        """Should be able to progress through all 12 TDD gates in order"""
        from src.gates.gate_system import Gate
        from src.gates.gate_tracker import create_gate_progress, mark_gate_passed
        from src.gates.gate_validator import can_pass_gate, GATE_ORDER

        progress = create_gate_progress()

        # Progress through gates in TDD order (not enum value order!)
        for gate in GATE_ORDER:
            assert can_pass_gate(gate, progress["passed_gates"]) is True, \
                f"Should be able to pass {gate.name} after {[g.name for g in progress['passed_gates']]}"
            progress = mark_gate_passed(progress, gate)

        # Should have all 12 gates passed
        assert len(progress["passed_gates"]) == 12

    def test_gate_dependency_enforcement(self):
        """Dependencies should be enforced"""
        from src.gates.gate_system import Gate
        from src.gates.gate_validator import can_pass_gate

        # Cannot pass gate 5 without gates 0-4
        passed_gates = [Gate.DESIGN_VALIDATED, Gate.STORY_ASSIGNED]
        assert can_pass_gate(Gate.QA_PASSED, passed_gates) is False

    def test_gate_cannot_skip(self):
        """Should not be able to skip gates"""
        from src.gates.gate_system import Gate
        from src.gates.gate_validator import validate_gate_transition

        # Cannot skip from gate 0 to gate 3
        result = validate_gate_transition(
            from_gate=Gate.DESIGN_VALIDATED,
            to_gate=Gate.DEV_STARTED
        )
        assert result["valid"] is False

    def test_gate_history_tracked(self):
        """Gate transitions should be tracked in history"""
        from src.gates.gate_system import Gate
        from src.gates.gate_tracker import create_gate_progress, mark_gate_passed, get_gate_history

        progress = create_gate_progress()
        progress = mark_gate_passed(progress, Gate.DESIGN_VALIDATED)
        progress = mark_gate_passed(progress, Gate.STORY_ASSIGNED)

        history = get_gate_history(progress)
        assert len(history) >= 2

    def test_gate_6_safety_integration(self):
        """Gate 6 should integrate with safety scoring"""
        from src.gates.gate_system import Gate
        from nodes.gate_nodes import gate_6_safety_node

        # High safety score - should pass
        # Must include ALL TDD prerequisites: 0, 1, 2, 25, 3, 4, 45, 5
        state = {
            "safety": {"constitutional_score": 0.95, "violations": []},
            "gate_progress": {
                "passed_gates": [
                    Gate.DESIGN_VALIDATED,
                    Gate.STORY_ASSIGNED,
                    Gate.PLAN_APPROVED,
                    Gate.TESTS_WRITTEN,     # TDD RED
                    Gate.DEV_STARTED,
                    Gate.DEV_COMPLETE,
                    Gate.REFACTOR_COMPLETE,  # TDD REFACTOR
                    Gate.QA_PASSED,
                ]
            },
        }
        result = gate_6_safety_node(state)
        assert result.get("gate_passed", False) is True

    def test_gate_failure_handling(self):
        """Gate failure should be handled gracefully"""
        from src.gates.gate_system import Gate
        from nodes.gate_nodes import gate_6_safety_node

        # Low safety score - should fail (even with all prerequisites)
        state = {
            "safety": {"constitutional_score": 0.3, "violations": ["test"]},
            "gate_progress": {
                "passed_gates": [
                    Gate.DESIGN_VALIDATED,
                    Gate.STORY_ASSIGNED,
                    Gate.PLAN_APPROVED,
                    Gate.TESTS_WRITTEN,
                    Gate.DEV_STARTED,
                    Gate.DEV_COMPLETE,
                    Gate.REFACTOR_COMPLETE,
                    Gate.QA_PASSED,
                ]
            },
        }
        result = gate_6_safety_node(state)
        assert result.get("gate_passed", True) is False

    def test_gate_rollback_not_allowed(self):
        """Should not be able to rollback to earlier gate"""
        from src.gates.gate_system import Gate
        from src.gates.gate_validator import validate_gate_transition

        # Cannot go from gate 5 back to gate 3
        result = validate_gate_transition(
            from_gate=Gate.QA_PASSED,
            to_gate=Gate.DEV_STARTED
        )
        assert result["valid"] is False
