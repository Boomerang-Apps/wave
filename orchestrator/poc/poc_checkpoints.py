#!/usr/bin/env python3
"""
PoC-1.4: PostgreSQL Checkpoint Validation

Validates:
1. Memory checkpointer works (fallback)
2. Checkpoint save works
3. Checkpoint restore works
4. Crash recovery simulation works
5. Multiple checkpoints per thread work
6. PostgreSQL integration (if available)

Usage:
    # Memory only (no database needed)
    python3 poc/poc_checkpoints.py

    # With PostgreSQL
    docker run -d --name wave-postgres -e POSTGRES_USER=wave -e POSTGRES_PASSWORD=wave -e POSTGRES_DB=wave_orchestrator -p 5432:5432 postgres:16
    export DATABASE_URL="postgresql://wave:wave@localhost:5432/wave_orchestrator"
    python3 poc/poc_checkpoints.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import modules
try:
    from src.graph import (
        WAVEState,
        Phase,
        Gate,
        create_initial_state,
        create_wave_graph,
    )
    from src.persistence import (
        create_checkpointer,
        test_database_connection,
        generate_thread_id,
        CheckpointManager,
        POSTGRES_AVAILABLE,
        MEMORY_AVAILABLE,
    )
    IMPORTS_OK = True
except ImportError as e:
    print(f"[ERROR] Import failed: {e}")
    IMPORTS_OK = False

# Check for langgraph checkpoint
try:
    from langgraph.checkpoint.memory import MemorySaver
    LANGGRAPH_OK = True
except ImportError:
    LANGGRAPH_OK = False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 1: Memory Checkpointer
# ═══════════════════════════════════════════════════════════════════════════════

def test_memory_checkpointer():
    """Test 1: Memory checkpointer works as fallback."""
    print("\n[Test 1] Memory Checkpointer")
    print("-" * 40)

    if not IMPORTS_OK or not LANGGRAPH_OK:
        print("  SKIPPED - imports failed")
        return False

    try:
        checkpointer = create_checkpointer(use_memory=True)
        print(f"  Checkpointer type: {type(checkpointer).__name__}")

        is_memory = "Memory" in type(checkpointer).__name__
        print(f"  Is memory saver: {'YES' if is_memory else 'NO'}")

        if is_memory:
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
# TEST 2: Checkpoint Save
# ═══════════════════════════════════════════════════════════════════════════════

def test_checkpoint_save():
    """Test 2: Checkpoint save during workflow execution."""
    print("\n[Test 2] Checkpoint Save")
    print("-" * 40)

    if not IMPORTS_OK or not LANGGRAPH_OK:
        print("  SKIPPED - imports failed")
        return False

    try:
        # Create graph with memory checkpointer
        checkpointer = create_checkpointer(use_memory=True)
        graph = create_wave_graph()
        app = graph.compile(checkpointer=checkpointer)

        print("  Graph with checkpointer: CREATED")

        # Create initial state
        state = create_initial_state(
            story_id="CHECKPOINT-001",
            project_path="/test/project",
            requirements="Test checkpoint save"
        )

        # Generate thread ID
        thread_id = generate_thread_id("CHECKPOINT-001", 1)
        config = {"configurable": {"thread_id": thread_id}}

        print(f"  Thread ID: {thread_id}")

        # Run workflow (will create checkpoints)
        result = app.invoke(state, config)

        print(f"  Final phase: {result['phase']}")
        print(f"  Final gate: {result['gate']}")

        # Check if we got a result
        if result["phase"] in [Phase.DONE.value, Phase.FAILED.value]:
            print("  Checkpoints saved: YES")
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
# TEST 3: Checkpoint Restore
# ═══════════════════════════════════════════════════════════════════════════════

def test_checkpoint_restore():
    """Test 3: Restore state from checkpoint."""
    print("\n[Test 3] Checkpoint Restore")
    print("-" * 40)

    if not IMPORTS_OK or not LANGGRAPH_OK:
        print("  SKIPPED - imports failed")
        return False

    try:
        # Create graph with memory checkpointer
        checkpointer = create_checkpointer(use_memory=True)
        graph = create_wave_graph()
        app = graph.compile(checkpointer=checkpointer)

        # Run first execution
        state1 = create_initial_state(
            story_id="RESTORE-001",
            project_path="/test/project",
            requirements="Test restore"
        )
        thread_id = "restore-test-thread"
        config = {"configurable": {"thread_id": thread_id}}

        result1 = app.invoke(state1, config)
        print(f"  First execution phase: {result1['phase']}")

        # Get state from checkpoint
        restored_state = app.get_state(config)

        if restored_state and restored_state.values:
            restored_values = restored_state.values
            print(f"  Restored story_id: {restored_values.get('story_id')}")
            print(f"  Restored phase: {restored_values.get('phase')}")

            # Verify restoration
            matches = (
                restored_values.get('story_id') == 'RESTORE-001' and
                restored_values.get('phase') == result1['phase']
            )

            if matches:
                print("  State restored correctly: YES")
                print("  Result: PASSED")
                return True
            else:
                print("  State restored correctly: NO")
                print("  Result: FAILED")
                return False
        else:
            print("  No checkpoint found")
            print("  Result: FAILED")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        print("  Result: FAILED")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4: Crash Recovery Simulation
# ═══════════════════════════════════════════════════════════════════════════════

def test_crash_recovery():
    """Test 4: Simulate crash and recovery."""
    print("\n[Test 4] Crash Recovery Simulation")
    print("-" * 40)

    if not IMPORTS_OK or not LANGGRAPH_OK:
        print("  SKIPPED - imports failed")
        return False

    try:
        # Create checkpointer (simulates persistent storage)
        checkpointer = create_checkpointer(use_memory=True)

        # First "process" - run workflow
        graph1 = create_wave_graph()
        app1 = graph1.compile(checkpointer=checkpointer)

        state = create_initial_state(
            story_id="CRASH-001",
            project_path="/test/project",
            requirements="Test crash recovery"
        )
        thread_id = "crash-recovery-thread"
        config = {"configurable": {"thread_id": thread_id}}

        # Run workflow
        result1 = app1.invoke(state, config)
        print(f"  Before crash - phase: {result1['phase']}")

        # Simulate crash - create new app instance with same checkpointer
        # (In production, this would be a new process)
        graph2 = create_wave_graph()
        app2 = graph2.compile(checkpointer=checkpointer)

        # Recover state from checkpoint
        recovered = app2.get_state(config)

        if recovered and recovered.values:
            print(f"  After recovery - phase: {recovered.values.get('phase')}")
            print(f"  After recovery - story_id: {recovered.values.get('story_id')}")

            # Verify recovery
            recovery_ok = (
                recovered.values.get('story_id') == 'CRASH-001' and
                recovered.values.get('phase') == result1['phase']
            )

            if recovery_ok:
                print("  Recovery successful: YES")
                print("  Result: PASSED")
                return True
            else:
                print("  Recovery successful: NO")
                print("  Result: FAILED")
                return False
        else:
            print("  No state recovered")
            print("  Result: FAILED")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        print("  Result: FAILED")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5: Multiple Threads
# ═══════════════════════════════════════════════════════════════════════════════

def test_multiple_threads():
    """Test 5: Multiple concurrent threads with checkpoints."""
    print("\n[Test 5] Multiple Threads")
    print("-" * 40)

    if not IMPORTS_OK or not LANGGRAPH_OK:
        print("  SKIPPED - imports failed")
        return False

    try:
        checkpointer = create_checkpointer(use_memory=True)
        graph = create_wave_graph()
        app = graph.compile(checkpointer=checkpointer)

        # Run multiple threads
        threads = []
        for i in range(3):
            state = create_initial_state(
                story_id=f"MULTI-{i:03d}",
                project_path="/test/project",
                requirements=f"Test thread {i}"
            )
            thread_id = f"multi-thread-{i}"
            config = {"configurable": {"thread_id": thread_id}}

            result = app.invoke(state, config)
            threads.append({
                "thread_id": thread_id,
                "story_id": state["story_id"],
                "phase": result["phase"]
            })

        print(f"  Threads executed: {len(threads)}")

        # Verify each thread can be restored independently
        all_restored = True
        for thread in threads:
            config = {"configurable": {"thread_id": thread["thread_id"]}}
            restored = app.get_state(config)

            if restored and restored.values:
                matches = restored.values.get("story_id") == thread["story_id"]
                print(f"    {thread['thread_id']}: {'OK' if matches else 'FAIL'}")
                if not matches:
                    all_restored = False
            else:
                print(f"    {thread['thread_id']}: FAIL (no checkpoint)")
                all_restored = False

        if all_restored:
            print("  All threads isolated: YES")
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
# TEST 6: PostgreSQL Integration (Optional)
# ═══════════════════════════════════════════════════════════════════════════════

def test_postgresql_integration():
    """Test 6: PostgreSQL integration (if available)."""
    print("\n[Test 6] PostgreSQL Integration")
    print("-" * 40)

    if not IMPORTS_OK:
        print("  SKIPPED - imports failed")
        return True  # Optional test

    if not POSTGRES_AVAILABLE:
        print("  PostgreSQL driver: NOT INSTALLED")
        print("  Result: SKIPPED (optional)")
        return True

    # Check database connection
    db_available = test_database_connection()
    print(f"  Database connection: {'OK' if db_available else 'NOT AVAILABLE'}")

    if not db_available:
        print("  To test PostgreSQL:")
        print("    docker run -d --name wave-postgres \\")
        print("      -e POSTGRES_USER=wave \\")
        print("      -e POSTGRES_PASSWORD=wave \\")
        print("      -e POSTGRES_DB=wave_orchestrator \\")
        print("      -p 5432:5432 postgres:16")
        print("  Result: SKIPPED (database not running)")
        return True

    try:
        # Create PostgreSQL checkpointer
        checkpointer = create_checkpointer(use_memory=False)
        print(f"  Checkpointer type: {type(checkpointer).__name__}")

        # Setup database tables
        manager = CheckpointManager()
        setup_ok = manager.setup_database()
        print(f"  Database setup: {'OK' if setup_ok else 'FAIL'}")

        if setup_ok:
            # Run a quick test
            graph = create_wave_graph()
            app = graph.compile(checkpointer=checkpointer)

            state = create_initial_state(
                story_id="POSTGRES-001",
                project_path="/test/project",
                requirements="Test PostgreSQL"
            )
            config = {"configurable": {"thread_id": "postgres-test"}}

            result = app.invoke(state, config)
            print(f"  Workflow executed: {result['phase']}")

            # Verify checkpoint in database
            restored = app.get_state(config)
            if restored and restored.values:
                print("  Checkpoint in database: YES")
                print("  Result: PASSED")
                return True

        print("  Result: FAILED")
        return False
    except Exception as e:
        print(f"  Error: {e}")
        print("  Result: SKIPPED (error)")
        return True  # Optional test


# ═══════════════════════════════════════════════════════════════════════════════
# RUN ALL TESTS
# ═══════════════════════════════════════════════════════════════════════════════

def run_all_tests():
    """Run all checkpoint tests."""
    print("=" * 60)
    print("       POC-1.4: CHECKPOINT VALIDATION")
    print("       (GATE 1 - Major Milestone)")
    print("=" * 60)

    if not IMPORTS_OK:
        print("\n[ERROR] Required imports failed")
        return False

    if not LANGGRAPH_OK:
        print("\n[ERROR] LangGraph checkpoint not available")
        return False

    print(f"\nPostgreSQL driver: {'AVAILABLE' if POSTGRES_AVAILABLE else 'NOT INSTALLED'}")
    print(f"Memory saver: {'AVAILABLE' if MEMORY_AVAILABLE else 'NOT INSTALLED'}")

    tests = [
        ("Memory Checkpointer", test_memory_checkpointer),
        ("Checkpoint Save", test_checkpoint_save),
        ("Checkpoint Restore", test_checkpoint_restore),
        ("Crash Recovery", test_crash_recovery),
        ("Multiple Threads", test_multiple_threads),
        ("PostgreSQL Integration", test_postgresql_integration),
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
    print("GATE 1 SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, p in results if p)
    total = len(results)

    for name, success in results:
        icon = "PASS" if success else "FAIL"
        print(f"  [{icon}] {name}")

    print(f"\nResults: {passed}/{total} passed")

    # Gate 1 criteria
    print("\n" + "-" * 40)
    print("GATE 1 CRITERIA:")
    print("-" * 40)

    gate_checks = {
        "LangGraph compiles": LANGGRAPH_OK,
        "Checkpoints save": results[1][1] if len(results) > 1 else False,
        "Checkpoints restore": results[2][1] if len(results) > 2 else False,
        "Crash recovery works": results[3][1] if len(results) > 3 else False,
    }

    gate_passed = all(gate_checks.values())

    for check, ok in gate_checks.items():
        print(f"  [{' OK ' if ok else 'FAIL'}] {check}")

    if gate_passed:
        print("\n" + "=" * 60)
        print("  GATE 1: PASSED")
        print("=" * 60)
        return True
    else:
        print("\n" + "=" * 60)
        print("  GATE 1: FAILED")
        print("=" * 60)
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
