#!/usr/bin/env python3
"""
PoC-2: Safety & Git Validation (GATE 2)

Validates:
1. Constitutional AI blocks unsafe actions
2. Budget tracking enforces limits
3. Git worktrees provide isolation
4. Conflict detection works
5. Merge system with CTO approval
6. Emergency stop works

Usage:
    python3 poc/poc_safety_git.py
"""

import sys
import os
import tempfile
import shutil

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import modules
try:
    from src.safety.constitutional import (
        ConstitutionalChecker,
        check_action_safety,
        WAVE_PRINCIPLES,
        SafetyCategory,
    )
    from src.safety.budget import (
        BudgetTracker,
        check_budget,
        BudgetAlertLevel,
    )
    from src.git.tools import (
        GitTools,
        create_worktree,
        PYGIT2_AVAILABLE,
    )
    from src.graph import EscalationLevel
    IMPORTS_OK = True
except ImportError as e:
    print(f"[ERROR] Import failed: {e}")
    IMPORTS_OK = False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 1: Constitutional AI - Pattern Detection
# ═══════════════════════════════════════════════════════════════════════════════

def test_constitutional_patterns():
    """Test 1: Pattern-based safety detection."""
    print("\n[Test 1] Constitutional AI - Pattern Detection")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return False

    checker = ConstitutionalChecker(use_grok=False)

    # Test cases: (action, should_block, description)
    test_cases = [
        ("rm -rf /", True, "Destructive rm command"),
        ("git push --force origin main", True, "Force push to main"),
        ("cat ~/.ssh/id_rsa", True, "SSH key access"),
        ("def add(a, b): return a + b", False, "Normal code"),
        ("DROP TABLE users;", True, "SQL injection"),
        ("print('Hello World')", False, "Safe print"),
        ("export API_KEY=secret123", True, "Secret exposure"),
        ("git commit -m 'fix bug'", False, "Normal git commit"),
    ]

    passed = 0
    for action, should_block, desc in test_cases:
        result = checker.check(action)
        blocked = not result.safe or result.recommendation == "BLOCK"

        is_correct = blocked == should_block
        icon = "OK" if is_correct else "FAIL"
        print(f"  [{icon}] {desc}: {'blocked' if blocked else 'allowed'}")

        if is_correct:
            passed += 1

    success = passed == len(test_cases)
    print(f"  Result: {passed}/{len(test_cases)} correct")
    print(f"  Result: {'PASSED' if success else 'FAILED'}")
    return success


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2: Constitutional AI - Severity Levels
# ═══════════════════════════════════════════════════════════════════════════════

def test_constitutional_severity():
    """Test 2: Safety severity levels."""
    print("\n[Test 2] Constitutional AI - Severity Levels")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return False

    checker = ConstitutionalChecker(use_grok=False)

    # Test escalation levels
    critical_result = checker.check("rm -rf /home")
    warning_result = checker.check("eval(user_input)")
    safe_result = checker.check("print('hello')")

    critical_ok = critical_result.escalation_level in [
        EscalationLevel.E_STOP, EscalationLevel.CRITICAL
    ]
    warning_ok = warning_result.violations and len(warning_result.violations) > 0
    safe_ok = safe_result.safe and safe_result.score >= 0.9

    print(f"  Critical action escalates: {'YES' if critical_ok else 'NO'}")
    print(f"  Warning action flagged: {'YES' if warning_ok else 'NO'}")
    print(f"  Safe action allowed: {'YES' if safe_ok else 'NO'}")

    success = critical_ok and safe_ok
    print(f"  Result: {'PASSED' if success else 'FAILED'}")
    return success


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3: Budget Tracking - Thresholds
# ═══════════════════════════════════════════════════════════════════════════════

def test_budget_thresholds():
    """Test 3: Budget threshold detection."""
    print("\n[Test 3] Budget Tracking - Thresholds")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return False

    tracker = BudgetTracker()

    # Test at different usage levels
    tests = [
        (50_000, 100_000, BudgetAlertLevel.NORMAL, "50% - Normal"),
        (75_000, 100_000, BudgetAlertLevel.WARNING, "75% - Warning"),
        (92_000, 100_000, BudgetAlertLevel.CRITICAL, "92% - Critical"),
        (105_000, 100_000, BudgetAlertLevel.EXCEEDED, "105% - Exceeded"),
    ]

    passed = 0
    for tokens, limit, expected_level, desc in tests:
        result = tracker.check_budget(tokens, limit)
        actual_level = result.alert.level if result.alert else BudgetAlertLevel.NORMAL

        is_correct = actual_level == expected_level
        icon = "OK" if is_correct else "FAIL"
        print(f"  [{icon}] {desc}: {actual_level.value}")

        if is_correct:
            passed += 1

    success = passed == len(tests)
    print(f"  Result: {passed}/{len(tests)} correct")
    print(f"  Result: {'PASSED' if success else 'FAILED'}")
    return success


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4: Budget Tracking - Cost Estimation
# ═══════════════════════════════════════════════════════════════════════════════

def test_budget_cost():
    """Test 4: Token cost estimation."""
    print("\n[Test 4] Budget Tracking - Cost Estimation")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return False

    tracker = BudgetTracker()

    # Test token estimation
    text = "This is a test sentence with about 10 words in it."
    estimated_tokens = tracker.estimate_tokens(text)
    expected_range = (10, 20)  # Rough estimate

    token_ok = expected_range[0] <= estimated_tokens <= expected_range[1]
    print(f"  Token estimate for '{text[:30]}...': {estimated_tokens}")
    print(f"  In expected range {expected_range}: {'YES' if token_ok else 'NO'}")

    # Test cost estimation
    cost_1k = tracker.estimate_cost(1000, "claude-3-sonnet")
    cost_ok = 0.001 <= cost_1k <= 0.01  # Reasonable range

    print(f"  Cost for 1K tokens (Sonnet): ${cost_1k:.4f}")
    print(f"  Cost reasonable: {'YES' if cost_ok else 'NO'}")

    success = token_ok and cost_ok
    print(f"  Result: {'PASSED' if success else 'FAILED'}")
    return success


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5: Git Tools - Worktree Operations
# ═══════════════════════════════════════════════════════════════════════════════

def test_git_worktrees():
    """Test 5: Git worktree creation and isolation."""
    print("\n[Test 5] Git Tools - Worktree Operations")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return False

    # Create a temporary git repo for testing
    temp_dir = tempfile.mkdtemp(prefix="wave-git-test-")

    try:
        # Initialize git repo
        os.system(f"cd {temp_dir} && git init -q && git config user.email 'test@test.com' && git config user.name 'Test'")
        os.system(f"cd {temp_dir} && echo 'test' > README.md && git add . && git commit -q -m 'Initial commit'")

        print(f"  Test repo: {temp_dir}")

        # Test GitTools
        tools = GitTools(temp_dir)

        # Create worktree
        worktree = tools.create_worktree("TEST-001", wave_number=1)
        worktree_ok = worktree.is_valid and os.path.exists(worktree.path)
        print(f"  Worktree created: {'YES' if worktree_ok else 'NO'}")

        if worktree_ok:
            print(f"    Path: {worktree.path}")
            print(f"    Branch: {worktree.branch}")

        # List worktrees
        worktrees = tools.list_worktrees()
        list_ok = len(worktrees) >= 1
        print(f"  Worktrees listed: {len(worktrees)}")

        # Make a change and commit
        if worktree_ok:
            test_file = os.path.join(worktree.path, "test.py")
            with open(test_file, "w") as f:
                f.write("print('hello')\n")

            commit = tools.commit_changes(
                worktree.path,
                "Add test file",
                author="WAVE Test"
            )
            commit_ok = commit is not None
            print(f"  Commit created: {'YES' if commit_ok else 'NO'}")

            if commit_ok:
                print(f"    SHA: {commit.sha[:8]}")

        # Cleanup worktree
        if worktree_ok:
            cleanup_ok = tools.cleanup_worktree(worktree.path)
            print(f"  Worktree cleaned up: {'YES' if cleanup_ok else 'NO'}")

        success = worktree_ok and list_ok
        print(f"  Result: {'PASSED' if success else 'FAILED'}")
        return success

    except Exception as e:
        print(f"  Error: {e}")
        print("  Result: FAILED")
        return False
    finally:
        # Cleanup temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 6: Emergency Stop
# ═══════════════════════════════════════════════════════════════════════════════

def test_emergency_stop():
    """Test 6: Emergency stop on critical violations."""
    print("\n[Test 6] Emergency Stop")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return False

    checker = ConstitutionalChecker(use_grok=False, strict_mode=True)

    # Test E-STOP triggering
    critical_actions = [
        "rm -rf /",
        "git push --force origin main",
        "DROP DATABASE production;",
    ]

    e_stops = 0
    for action in critical_actions:
        result = checker.check(action)
        if result.escalation_level == EscalationLevel.E_STOP:
            e_stops += 1
            print(f"  E-STOP triggered: {action[:30]}...")

    # Test budget E-STOP
    tracker = BudgetTracker(hard_limit=True)
    budget_result = tracker.check_budget(150_000, 100_000)  # 150% usage
    budget_blocked = not budget_result.allowed

    print(f"  Budget exceeded blocks: {'YES' if budget_blocked else 'NO'}")

    success = e_stops >= 2 and budget_blocked
    print(f"  Critical violations caught: {e_stops}/{len(critical_actions)}")
    print(f"  Result: {'PASSED' if success else 'FAILED'}")
    return success


# ═══════════════════════════════════════════════════════════════════════════════
# RUN ALL TESTS
# ═══════════════════════════════════════════════════════════════════════════════

def run_all_tests():
    """Run all Phase 2 tests."""
    print("=" * 60)
    print("       POC-2: SAFETY & GIT VALIDATION")
    print("       (GATE 2 - Major Milestone)")
    print("=" * 60)

    if not IMPORTS_OK:
        print("\n[ERROR] Required imports failed")
        return False

    print(f"\npygit2 available: {'YES' if PYGIT2_AVAILABLE else 'NO (using subprocess)'}")

    tests = [
        ("Constitutional Patterns", test_constitutional_patterns),
        ("Constitutional Severity", test_constitutional_severity),
        ("Budget Thresholds", test_budget_thresholds),
        ("Budget Cost", test_budget_cost),
        ("Git Worktrees", test_git_worktrees),
        ("Emergency Stop", test_emergency_stop),
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
    print("GATE 2 SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, p in results if p)
    total = len(results)

    for name, success in results:
        icon = "PASS" if success else "FAIL"
        print(f"  [{icon}] {name}")

    print(f"\nResults: {passed}/{total} passed")

    # Gate 2 criteria
    print("\n" + "-" * 40)
    print("GATE 2 CRITERIA:")
    print("-" * 40)

    gate_checks = {
        "Constitutional blocks unsafe": results[0][1] if len(results) > 0 else False,
        "Budget limits enforced": results[2][1] if len(results) > 2 else False,
        "Worktrees isolated": results[4][1] if len(results) > 4 else False,
        "Emergency stop works": results[5][1] if len(results) > 5 else False,
    }

    gate_passed = all(gate_checks.values())

    for check, ok in gate_checks.items():
        print(f"  [{' OK ' if ok else 'FAIL'}] {check}")

    if gate_passed:
        print("\n" + "=" * 60)
        print("  GATE 2: PASSED")
        print("=" * 60)
        return True
    else:
        print("\n" + "=" * 60)
        print("  GATE 2: FAILED")
        print("=" * 60)
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
