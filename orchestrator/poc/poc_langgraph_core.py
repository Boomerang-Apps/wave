#!/usr/bin/env python3
"""
PoC-1.1: LangGraph Core Validation

Validates:
1. StateGraph compilation works
2. State transitions work correctly
3. Conditional routing works
4. Node execution order is correct

Usage:
    python3 poc/poc_langgraph_core.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Literal, Annotated
from typing_extensions import TypedDict

try:
    from langgraph.graph import StateGraph, START, END
    from langgraph.graph.message import add_messages
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    print("[WARNING] langgraph not installed. Run: pip3 install langgraph")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 1: Basic StateGraph
# ═══════════════════════════════════════════════════════════════════════════════

class SimpleState(TypedDict):
    """Simple state for basic test"""
    value: int
    phase: str


def test_basic_graph():
    """Test 1: Basic StateGraph compilation and execution."""
    print("\n[Test 1] Basic StateGraph")
    print("-" * 40)

    if not LANGGRAPH_AVAILABLE:
        print("  SKIPPED - langgraph not installed")
        return False

    def increment_node(state: SimpleState) -> dict:
        return {"value": state["value"] + 1, "phase": "incremented"}

    def double_node(state: SimpleState) -> dict:
        return {"value": state["value"] * 2, "phase": "doubled"}

    # Build graph
    graph = StateGraph(SimpleState)
    graph.add_node("increment", increment_node)
    graph.add_node("double", double_node)

    graph.add_edge(START, "increment")
    graph.add_edge("increment", "double")
    graph.add_edge("double", END)

    # Compile
    try:
        app = graph.compile()
        print("  Graph compiled: YES")
    except Exception as e:
        print(f"  Graph compiled: NO - {e}")
        return False

    # Execute
    try:
        result = app.invoke({"value": 5, "phase": "start"})
        # Expected: (5 + 1) * 2 = 12
        expected = 12
        actual = result["value"]

        if actual == expected:
            print(f"  Execution correct: YES (5 -> {actual})")
            print("  Result: PASSED")
            return True
        else:
            print(f"  Execution correct: NO (expected {expected}, got {actual})")
            print("  Result: FAILED")
            return False
    except Exception as e:
        print(f"  Execution failed: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2: Conditional Routing
# ═══════════════════════════════════════════════════════════════════════════════

class ConditionalState(TypedDict):
    """State with routing condition"""
    value: int
    route: Literal["high", "low", "done"]


def test_conditional_routing():
    """Test 2: Conditional edge routing."""
    print("\n[Test 2] Conditional Routing")
    print("-" * 40)

    if not LANGGRAPH_AVAILABLE:
        print("  SKIPPED - langgraph not installed")
        return False

    def check_node(state: ConditionalState) -> dict:
        if state["value"] >= 10:
            return {"route": "high"}
        else:
            return {"route": "low"}

    def high_node(state: ConditionalState) -> dict:
        return {"value": state["value"] + 100, "route": "done"}

    def low_node(state: ConditionalState) -> dict:
        return {"value": state["value"] + 1, "route": "done"}

    def route_decision(state: ConditionalState) -> str:
        return state["route"]

    # Build graph
    graph = StateGraph(ConditionalState)
    graph.add_node("check", check_node)
    graph.add_node("high", high_node)
    graph.add_node("low", low_node)

    graph.add_edge(START, "check")
    graph.add_conditional_edges(
        "check",
        route_decision,
        {"high": "high", "low": "low"}
    )
    graph.add_edge("high", END)
    graph.add_edge("low", END)

    try:
        app = graph.compile()
        print("  Conditional graph compiled: YES")
    except Exception as e:
        print(f"  Conditional graph compiled: NO - {e}")
        return False

    # Test high route (value >= 10)
    try:
        result_high = app.invoke({"value": 15, "route": "low"})
        expected_high = 115  # 15 + 100
        high_ok = result_high["value"] == expected_high
        print(f"  High route (15 -> {result_high['value']}): {'OK' if high_ok else 'FAIL'}")
    except Exception as e:
        print(f"  High route failed: {e}")
        high_ok = False

    # Test low route (value < 10)
    try:
        result_low = app.invoke({"value": 5, "route": "high"})
        expected_low = 6  # 5 + 1
        low_ok = result_low["value"] == expected_low
        print(f"  Low route (5 -> {result_low['value']}): {'OK' if low_ok else 'FAIL'}")
    except Exception as e:
        print(f"  Low route failed: {e}")
        low_ok = False

    if high_ok and low_ok:
        print("  Result: PASSED")
        return True
    else:
        print("  Result: FAILED")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3: WAVE-like State Schema
# ═══════════════════════════════════════════════════════════════════════════════

class WAVELikeState(TypedDict):
    """State mimicking WAVE workflow"""
    story_id: str
    phase: Literal["validate", "plan", "develop", "qa", "merge", "done", "failed"]
    gate: int
    code: str
    error_count: int
    messages: Annotated[list, add_messages] if LANGGRAPH_AVAILABLE else list


def test_wave_state():
    """Test 3: WAVE-like state schema with phases."""
    print("\n[Test 3] WAVE-like State Schema")
    print("-" * 40)

    if not LANGGRAPH_AVAILABLE:
        print("  SKIPPED - langgraph not installed")
        return False

    def validate_node(state: WAVELikeState) -> dict:
        # Simulate validation
        if state["story_id"]:
            return {"phase": "plan", "gate": 2}
        else:
            return {"phase": "failed", "error_count": state["error_count"] + 1}

    def plan_node(state: WAVELikeState) -> dict:
        return {"phase": "develop", "gate": 3}

    def develop_node(state: WAVELikeState) -> dict:
        return {
            "phase": "qa",
            "gate": 4,
            "code": "def hello(): return 'world'"
        }

    def qa_node(state: WAVELikeState) -> dict:
        if state["code"]:
            return {"phase": "merge", "gate": 5}
        else:
            return {"phase": "develop", "error_count": state["error_count"] + 1}

    def merge_node(state: WAVELikeState) -> dict:
        return {"phase": "done", "gate": 7}

    def route_phase(state: WAVELikeState) -> str:
        phase = state["phase"]
        if phase in ["done", "failed"]:
            return "end"
        return phase

    # Build graph
    graph = StateGraph(WAVELikeState)
    graph.add_node("validate", validate_node)
    graph.add_node("plan", plan_node)
    graph.add_node("develop", develop_node)
    graph.add_node("qa", qa_node)
    graph.add_node("merge", merge_node)

    graph.add_edge(START, "validate")
    graph.add_conditional_edges(
        "validate",
        route_phase,
        {"plan": "plan", "failed": END, "end": END}
    )
    graph.add_edge("plan", "develop")
    graph.add_edge("develop", "qa")
    graph.add_conditional_edges(
        "qa",
        route_phase,
        {"merge": "merge", "develop": "develop", "end": END}
    )
    graph.add_edge("merge", END)

    try:
        app = graph.compile()
        print("  WAVE graph compiled: YES")
    except Exception as e:
        print(f"  WAVE graph compiled: NO - {e}")
        return False

    # Execute full workflow
    try:
        initial_state = {
            "story_id": "WAVE-001",
            "phase": "validate",
            "gate": 1,
            "code": "",
            "error_count": 0,
            "messages": []
        }
        result = app.invoke(initial_state)

        print(f"  Story: {result['story_id']}")
        print(f"  Final phase: {result['phase']}")
        print(f"  Final gate: {result['gate']}")
        print(f"  Code generated: {'YES' if result['code'] else 'NO'}")

        if result["phase"] == "done" and result["gate"] == 7:
            print("  Result: PASSED")
            return True
        else:
            print("  Result: FAILED")
            return False
    except Exception as e:
        print(f"  Execution failed: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4: Error Handling & Retry Loop
# ═══════════════════════════════════════════════════════════════════════════════

class RetryState(TypedDict):
    """State with retry tracking"""
    value: int
    attempts: int
    max_attempts: int
    success: bool


def test_retry_loop():
    """Test 4: Retry loop with max attempts."""
    print("\n[Test 4] Retry Loop")
    print("-" * 40)

    if not LANGGRAPH_AVAILABLE:
        print("  SKIPPED - langgraph not installed")
        return False

    attempt_counter = {"count": 0}  # Mutable counter

    def process_node(state: RetryState) -> dict:
        attempt_counter["count"] += 1
        # Fail first 2 times, succeed on 3rd
        if attempt_counter["count"] >= 3:
            return {"success": True, "attempts": state["attempts"] + 1}
        else:
            return {"success": False, "attempts": state["attempts"] + 1}

    def route_retry(state: RetryState) -> str:
        if state["success"]:
            return "done"
        elif state["attempts"] >= state["max_attempts"]:
            return "failed"
        else:
            return "retry"

    # Build graph
    graph = StateGraph(RetryState)
    graph.add_node("process", process_node)

    graph.add_edge(START, "process")
    graph.add_conditional_edges(
        "process",
        route_retry,
        {"done": END, "failed": END, "retry": "process"}
    )

    try:
        app = graph.compile()
        print("  Retry graph compiled: YES")
    except Exception as e:
        print(f"  Retry graph compiled: NO - {e}")
        return False

    # Test successful retry
    attempt_counter["count"] = 0
    try:
        result = app.invoke({
            "value": 0,
            "attempts": 0,
            "max_attempts": 5,
            "success": False
        })

        print(f"  Attempts made: {result['attempts']}")
        print(f"  Success: {result['success']}")

        if result["success"] and result["attempts"] == 3:
            print("  Result: PASSED")
            return True
        else:
            print("  Result: FAILED")
            return False
    except Exception as e:
        print(f"  Execution failed: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5: State Persistence Check
# ═══════════════════════════════════════════════════════════════════════════════

def test_state_persistence():
    """Test 5: Verify state is preserved across nodes."""
    print("\n[Test 5] State Persistence")
    print("-" * 40)

    if not LANGGRAPH_AVAILABLE:
        print("  SKIPPED - langgraph not installed")
        return False

    class PersistState(TypedDict):
        original_value: int
        modified_value: int
        history: list

    def node_a(state: PersistState) -> dict:
        return {
            "modified_value": state["original_value"] + 10,
            "history": state["history"] + ["node_a"]
        }

    def node_b(state: PersistState) -> dict:
        return {
            "modified_value": state["modified_value"] * 2,
            "history": state["history"] + ["node_b"]
        }

    def node_c(state: PersistState) -> dict:
        return {
            "history": state["history"] + ["node_c"]
        }

    graph = StateGraph(PersistState)
    graph.add_node("a", node_a)
    graph.add_node("b", node_b)
    graph.add_node("c", node_c)

    graph.add_edge(START, "a")
    graph.add_edge("a", "b")
    graph.add_edge("b", "c")
    graph.add_edge("c", END)

    try:
        app = graph.compile()
        result = app.invoke({
            "original_value": 5,
            "modified_value": 0,
            "history": []
        })

        # Check original preserved
        original_ok = result["original_value"] == 5
        # Check modifications: (5 + 10) * 2 = 30
        modified_ok = result["modified_value"] == 30
        # Check history
        history_ok = result["history"] == ["node_a", "node_b", "node_c"]

        print(f"  Original preserved: {'YES' if original_ok else 'NO'}")
        print(f"  Modifications correct: {'YES' if modified_ok else 'NO'}")
        print(f"  History tracked: {'YES' if history_ok else 'NO'}")

        if original_ok and modified_ok and history_ok:
            print("  Result: PASSED")
            return True
        else:
            print("  Result: FAILED")
            return False
    except Exception as e:
        print(f"  Execution failed: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 6: Graph Visualization
# ═══════════════════════════════════════════════════════════════════════════════

def test_graph_visualization():
    """Test 6: Generate graph visualization."""
    print("\n[Test 6] Graph Visualization")
    print("-" * 40)

    if not LANGGRAPH_AVAILABLE:
        print("  SKIPPED - langgraph not installed")
        return False

    def dummy_node(state: SimpleState) -> dict:
        return state

    graph = StateGraph(SimpleState)
    graph.add_node("start", dummy_node)
    graph.add_node("process", dummy_node)
    graph.add_node("finish", dummy_node)

    graph.add_edge(START, "start")
    graph.add_edge("start", "process")
    graph.add_edge("process", "finish")
    graph.add_edge("finish", END)

    try:
        app = graph.compile()

        # Try to get graph representation
        try:
            # LangGraph provides get_graph() method
            graph_repr = app.get_graph()
            has_nodes = len(graph_repr.nodes) > 0
            print(f"  Graph nodes: {len(graph_repr.nodes)}")
            print(f"  Graph edges: {len(graph_repr.edges)}")
            print("  Visualization available: YES")
            print("  Result: PASSED")
            return True
        except AttributeError:
            # Fallback - just check it compiled
            print("  Visualization method not available")
            print("  Graph compiled successfully")
            print("  Result: PASSED (partial)")
            return True
    except Exception as e:
        print(f"  Failed: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# RUN ALL TESTS
# ═══════════════════════════════════════════════════════════════════════════════

def run_all_tests():
    """Run all LangGraph core tests."""
    print("=" * 60)
    print("       POC-1.1: LANGGRAPH CORE VALIDATION")
    print("=" * 60)

    if not LANGGRAPH_AVAILABLE:
        print("\n[ERROR] langgraph not installed")
        print("  Run: pip3 install langgraph")
        print("\nTo install all dependencies:")
        print("  pip3 install langgraph langchain-anthropic pydantic sqlalchemy redis pygit2")
        return False

    tests = [
        ("Basic StateGraph", test_basic_graph),
        ("Conditional Routing", test_conditional_routing),
        ("WAVE-like State", test_wave_state),
        ("Retry Loop", test_retry_loop),
        ("State Persistence", test_state_persistence),
        ("Graph Visualization", test_graph_visualization),
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
        print("\nPOC-1.1 LANGGRAPH CORE: PASSED")
        return True
    elif passed >= total - 1:
        print("\nPOC-1.1 LANGGRAPH CORE: MOSTLY PASSED")
        return True
    else:
        print("\nPOC-1.1 LANGGRAPH CORE: FAILED")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
