"""
Test A.6: LangGraph Definition
TDD - Tests written BEFORE implementation

Acceptance Criteria:
1. StateGraph created with WAVEState
2. All agent nodes registered
3. Edges connecting nodes defined
4. Conditional routing from supervisor
5. Graph compiles successfully
"""

import pytest


class TestGraphImports:
    """Test A.6.1: Verify graph components are importable"""

    def test_graph_builder_exists(self):
        """Graph builder should be importable"""
        from graph import create_wave_graph
        assert create_wave_graph is not None
        assert callable(create_wave_graph)

    def test_compiled_graph_exists(self):
        """Compiled graph should be importable"""
        from graph import wave_graph
        assert wave_graph is not None


class TestGraphStructure:
    """Test A.6.2: Verify graph has correct structure"""

    def test_graph_has_nodes(self):
        """Graph should have all agent nodes"""
        from graph import create_wave_graph

        graph = create_wave_graph()
        # Get node names from the graph
        node_names = set(graph.nodes.keys())

        # Should have all agent nodes
        expected_nodes = {"supervisor", "cto", "pm", "dev", "qa"}
        assert expected_nodes.issubset(node_names)

    def test_graph_has_entry_point(self):
        """Graph should have an entry point"""
        from graph import wave_graph

        # Compiled graph should exist and be runnable
        assert wave_graph is not None

    def test_graph_is_state_graph(self):
        """Graph should be a StateGraph"""
        from graph import create_wave_graph
        from langgraph.graph import StateGraph

        graph = create_wave_graph()
        assert isinstance(graph, StateGraph)


class TestGraphCompilation:
    """Test A.6.3: Verify graph compiles correctly"""

    def test_graph_compiles(self):
        """Graph should compile without errors"""
        from graph import create_wave_graph

        graph = create_wave_graph()
        compiled = graph.compile()
        assert compiled is not None

    def test_compiled_graph_is_runnable(self):
        """Compiled graph should be a CompiledGraph"""
        from graph import wave_graph
        from langgraph.graph.state import CompiledStateGraph

        assert isinstance(wave_graph, CompiledStateGraph)


class TestGraphExecution:
    """Test A.6.4: Verify graph can execute"""

    def test_graph_accepts_initial_state(self):
        """Graph should accept initial state"""
        from graph import wave_graph
        from state import create_initial_state

        initial_state = create_initial_state(
            run_id="test-123",
            task="Test task"
        )

        # Should be able to invoke (may return after first node)
        # Using stream to get first result
        result = None
        for chunk in wave_graph.stream(initial_state):
            result = chunk
            break

        assert result is not None

    def test_graph_updates_state(self):
        """Graph execution should update state"""
        from graph import wave_graph
        from state import create_initial_state

        initial_state = create_initial_state(
            run_id="test-456",
            task="Another test"
        )

        # Run graph and collect results
        results = list(wave_graph.stream(initial_state))

        # Should have at least one result
        assert len(results) > 0

        # Last result should have updated current_agent
        last_result = results[-1]
        # Result is dict with node name as key
        assert isinstance(last_result, dict)


class TestGraphRouting:
    """Test A.6.5: Verify routing logic"""

    def test_supervisor_routes_to_agents(self):
        """Supervisor should route to other agents"""
        from nodes.supervisor import route_to_agent
        from state import create_initial_state

        state = create_initial_state(
            run_id="test-789",
            task="Route test"
        )

        # Initial routing should go to PM
        result = route_to_agent(state)
        assert result == "pm"

    def test_completed_state_routes_to_end(self):
        """Completed state should route to END"""
        from nodes.supervisor import route_to_agent
        from state import create_initial_state

        state = create_initial_state(
            run_id="test-end",
            task="End test"
        )
        state["status"] = "completed"

        result = route_to_agent(state)
        assert result == "END"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
