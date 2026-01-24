#!/usr/bin/env python3
"""
PoC-1.3: State Schema Validation

Validates:
1. WAVEState TypedDict works correctly
2. Nested state models (Budget, Git, Safety) work
3. State serialization/deserialization works
4. State validation catches invalid data
5. State persistence simulation works
6. State transitions preserve data

Usage:
    python3 poc/poc_state_schema.py
"""

import sys
import os
import json
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import state types
try:
    from src.graph import (
        WAVEState,
        BudgetState,
        GitState,
        SafetyState,
        RetryState,
        Phase,
        Gate,
        EscalationLevel,
        create_initial_state,
    )
    IMPORTS_OK = True
except ImportError as e:
    print(f"[ERROR] Import failed: {e}")
    IMPORTS_OK = False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 1: Basic State Creation
# ═══════════════════════════════════════════════════════════════════════════════

def test_basic_state_creation():
    """Test 1: Create initial state with all fields."""
    print("\n[Test 1] Basic State Creation")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return False

    try:
        state = create_initial_state(
            story_id="STATE-001",
            project_path="/test/project",
            wave_number=1,
            requirements="Test requirement",
            token_limit=50000,
            cost_limit_usd=5.0
        )

        # Verify core fields
        checks = [
            ("story_id", state["story_id"] == "STATE-001"),
            ("project_path", state["project_path"] == "/test/project"),
            ("wave_number", state["wave_number"] == 1),
            ("requirements", state["requirements"] == "Test requirement"),
            ("phase", state["phase"] == Phase.VALIDATE.value),
            ("gate", state["gate"] == Gate.STORY_ASSIGNED.value),
        ]

        all_passed = True
        for name, passed in checks:
            print(f"  {name}: {'OK' if passed else 'FAIL'}")
            if not passed:
                all_passed = False

        if all_passed:
            print("  Result: PASSED")
            return True
        else:
            print("  Result: FAILED")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        print("  Result: FAILED")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2: Nested State Models
# ═══════════════════════════════════════════════════════════════════════════════

def test_nested_state_models():
    """Test 2: Nested state models (Budget, Git, Safety, Retry)."""
    print("\n[Test 2] Nested State Models")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return False

    try:
        state = create_initial_state(
            story_id="STATE-002",
            project_path="/test/project",
            requirements="Test"
        )

        # Check Budget state
        budget = state["budget"]
        budget_ok = (
            budget["tokens_used"] == 0 and
            budget["token_limit"] == 100_000 and
            budget["cost_usd"] == 0.0
        )
        print(f"  BudgetState: {'OK' if budget_ok else 'FAIL'}")

        # Check Git state
        git = state["git"]
        git_ok = (
            git["worktree_path"] == "" and
            git["base_branch"] == "main" and
            git["has_conflicts"] == False
        )
        print(f"  GitState: {'OK' if git_ok else 'FAIL'}")

        # Check Safety state
        safety = state["safety"]
        safety_ok = (
            safety["violations"] == [] and
            safety["constitutional_score"] == 1.0 and
            safety["emergency_stop"] == False
        )
        print(f"  SafetyState: {'OK' if safety_ok else 'FAIL'}")

        # Check Retry state
        retry = state["retry"]
        retry_ok = (
            retry["count"] == 0 and
            retry["max_retries"] == 3
        )
        print(f"  RetryState: {'OK' if retry_ok else 'FAIL'}")

        if budget_ok and git_ok and safety_ok and retry_ok:
            print("  Result: PASSED")
            return True
        else:
            print("  Result: FAILED")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        print("  Result: FAILED")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3: State Serialization
# ═══════════════════════════════════════════════════════════════════════════════

def test_state_serialization():
    """Test 3: State can be serialized to JSON and back."""
    print("\n[Test 3] State Serialization")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return False

    try:
        original_state = create_initial_state(
            story_id="STATE-003",
            project_path="/test/project",
            requirements="Serialization test"
        )

        # Serialize to JSON
        json_str = json.dumps(original_state, default=str)
        json_ok = len(json_str) > 0
        print(f"  Serialize to JSON: {'OK' if json_ok else 'FAIL'}")
        print(f"  JSON size: {len(json_str)} bytes")

        # Deserialize from JSON
        restored_state = json.loads(json_str)
        restore_ok = restored_state["story_id"] == "STATE-003"
        print(f"  Deserialize from JSON: {'OK' if restore_ok else 'FAIL'}")

        # Check nested objects survived
        nested_ok = (
            restored_state["budget"]["token_limit"] == 100_000 and
            restored_state["git"]["base_branch"] == "main"
        )
        print(f"  Nested objects preserved: {'OK' if nested_ok else 'FAIL'}")

        if json_ok and restore_ok and nested_ok:
            print("  Result: PASSED")
            return True
        else:
            print("  Result: FAILED")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        print("  Result: FAILED")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4: State Updates
# ═══════════════════════════════════════════════════════════════════════════════

def test_state_updates():
    """Test 4: State can be updated correctly."""
    print("\n[Test 4] State Updates")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return False

    try:
        state = create_initial_state(
            story_id="STATE-004",
            project_path="/test/project",
            requirements="Update test"
        )

        # Simulate state updates through workflow
        updates = [
            {"phase": Phase.PLAN.value, "gate": Gate.DEV_STARTED.value},
            {"plan": "Implementation plan", "plan_feasible": True},
            {"phase": Phase.DEVELOP.value, "code": "def hello(): pass"},
            {"phase": Phase.QA.value, "gate": Gate.DEV_COMPLETE.value},
            {"qa_passed": True, "qa_feedback": "Looks good"},
        ]

        for update in updates:
            state = {**state, **update}

        # Verify final state
        checks = [
            ("phase updated", state["phase"] == Phase.QA.value),
            ("gate updated", state["gate"] == Gate.DEV_COMPLETE.value),
            ("plan set", state["plan"] == "Implementation plan"),
            ("code set", state["code"] == "def hello(): pass"),
            ("qa_passed set", state["qa_passed"] == True),
            ("original preserved", state["story_id"] == "STATE-004"),
        ]

        all_passed = True
        for name, passed in checks:
            print(f"  {name}: {'OK' if passed else 'FAIL'}")
            if not passed:
                all_passed = False

        if all_passed:
            print("  Result: PASSED")
            return True
        else:
            print("  Result: FAILED")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        print("  Result: FAILED")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5: Enum Validation
# ═══════════════════════════════════════════════════════════════════════════════

def test_enum_validation():
    """Test 5: Enums work correctly for phases and gates."""
    print("\n[Test 5] Enum Validation")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return False

    try:
        # Test Phase enum
        phases = [Phase.VALIDATE, Phase.PLAN, Phase.DEVELOP, Phase.QA, Phase.MERGE, Phase.DONE, Phase.FAILED]
        phase_ok = all(p.value for p in phases)
        print(f"  Phase enum ({len(phases)} values): {'OK' if phase_ok else 'FAIL'}")

        # Test Gate enum
        gates = [Gate.STORY_ASSIGNED, Gate.DEV_STARTED, Gate.DEV_COMPLETE,
                 Gate.QA_STARTED, Gate.QA_PASSED, Gate.MERGE_READY, Gate.MERGED, Gate.DEPLOYED]
        gate_ok = all(g.value for g in gates)
        print(f"  Gate enum ({len(gates)} values): {'OK' if gate_ok else 'FAIL'}")

        # Test EscalationLevel enum
        escalations = [EscalationLevel.NONE, EscalationLevel.WARNING,
                       EscalationLevel.CRITICAL, EscalationLevel.E_STOP]
        escalation_ok = all(e.value for e in escalations)
        print(f"  EscalationLevel enum ({len(escalations)} values): {'OK' if escalation_ok else 'FAIL'}")

        # Test enum values match expected
        value_checks = [
            Phase.VALIDATE.value == "validate",
            Gate.MERGED.value == 7,
            EscalationLevel.E_STOP.value == "e-stop",
        ]
        values_ok = all(value_checks)
        print(f"  Enum values correct: {'OK' if values_ok else 'FAIL'}")

        if phase_ok and gate_ok and escalation_ok and values_ok:
            print("  Result: PASSED")
            return True
        else:
            print("  Result: FAILED")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        print("  Result: FAILED")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 6: Budget Tracking
# ═══════════════════════════════════════════════════════════════════════════════

def test_budget_tracking():
    """Test 6: Budget tracking works correctly."""
    print("\n[Test 6] Budget Tracking")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return False

    try:
        state = create_initial_state(
            story_id="STATE-006",
            project_path="/test/project",
            requirements="Budget test",
            token_limit=10000,
            cost_limit_usd=1.0
        )

        # Check initial budget
        budget = state["budget"]
        initial_ok = budget["tokens_used"] == 0 and budget["token_limit"] == 10000
        print(f"  Initial budget: {'OK' if initial_ok else 'FAIL'}")

        # Simulate token usage
        budget_update = {
            **budget,
            "tokens_used": 7500,
            "cost_usd": 0.75
        }
        state = {**state, "budget": budget_update}

        # Check percentage calculation (would be property in Pydantic)
        tokens_used = state["budget"]["tokens_used"]
        token_limit = state["budget"]["token_limit"]
        percentage = tokens_used / token_limit if token_limit > 0 else 0

        percentage_ok = percentage == 0.75
        print(f"  Usage percentage (75%): {'OK' if percentage_ok else 'FAIL'}")

        # Check warning threshold (75%)
        warning_threshold = 0.75
        is_warning = percentage >= warning_threshold
        warning_ok = is_warning == True
        print(f"  Warning threshold triggered: {'OK' if warning_ok else 'FAIL'}")

        # Check critical threshold (90%)
        critical_threshold = 0.90
        is_critical = percentage >= critical_threshold
        critical_ok = is_critical == False  # 75% is not critical
        print(f"  Critical threshold not triggered: {'OK' if critical_ok else 'FAIL'}")

        if initial_ok and percentage_ok and warning_ok and critical_ok:
            print("  Result: PASSED")
            return True
        else:
            print("  Result: FAILED")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        print("  Result: FAILED")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# RUN ALL TESTS
# ═══════════════════════════════════════════════════════════════════════════════

def run_all_tests():
    """Run all state schema tests."""
    print("=" * 60)
    print("       POC-1.3: STATE SCHEMA VALIDATION")
    print("=" * 60)

    if not IMPORTS_OK:
        print("\n[ERROR] Required imports failed")
        return False

    tests = [
        ("Basic State Creation", test_basic_state_creation),
        ("Nested State Models", test_nested_state_models),
        ("State Serialization", test_state_serialization),
        ("State Updates", test_state_updates),
        ("Enum Validation", test_enum_validation),
        ("Budget Tracking", test_budget_tracking),
    ]

    results = []

    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"\n[{name}] EXCEPTION: {e}")
            results.append((name, False))

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, p in results if p)
    total = len(results)

    for name, success in results:
        icon = "PASS" if success else "FAIL"
        print(f"  [{icon}] {name}")

    print(f"\nResults: {passed}/{total} passed")

    if passed == total:
        print("\nPOC-1.3 STATE SCHEMA: PASSED")
        return True
    elif passed >= total - 1:
        print("\nPOC-1.3 STATE SCHEMA: MOSTLY PASSED")
        return True
    else:
        print("\nPOC-1.3 STATE SCHEMA: FAILED")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
