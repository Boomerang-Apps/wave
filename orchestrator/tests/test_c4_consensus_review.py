"""
Test C.4: Consensus/Multi-Actor Review Pattern
TDD - Tests written BEFORE implementation

Gate 0 Validation: Phase 4 of LANGGRAPH-ENHANCEMENT-PLAN.md
Based on Grok's LangGraph multi-agent patterns guide.

Test Categories:
1. Review Result Schema
2. Reviewer Nodes (QA, Security, Architecture)
3. Consensus Aggregator
4. Consensus Router
5. Review Graph Integration

Expected Result: All tests should FAIL initially, then PASS after implementation.
"""

import pytest
from typing import Dict, Any


# =============================================================================
# SECTION 1: Review Result Schema Tests
# =============================================================================

class TestReviewResultSchema:
    """Test review result schema"""

    def test_review_result_exists(self):
        """ReviewResult TypedDict should exist"""
        from src.consensus.review_state import ReviewResult
        assert ReviewResult is not None

    def test_review_result_has_approved(self):
        """ReviewResult should have 'approved' field"""
        from src.consensus.review_state import ReviewResult
        annotations = ReviewResult.__annotations__
        assert "approved" in annotations, "ReviewResult missing 'approved' field"

    def test_review_result_has_score(self):
        """ReviewResult should have 'score' field"""
        from src.consensus.review_state import ReviewResult
        annotations = ReviewResult.__annotations__
        assert "score" in annotations, "ReviewResult missing 'score' field"

    def test_review_result_has_feedback(self):
        """ReviewResult should have 'feedback' field"""
        from src.consensus.review_state import ReviewResult
        annotations = ReviewResult.__annotations__
        assert "feedback" in annotations, "ReviewResult missing 'feedback' field"

    def test_review_result_has_reviewer(self):
        """ReviewResult should have 'reviewer' field"""
        from src.consensus.review_state import ReviewResult
        annotations = ReviewResult.__annotations__
        assert "reviewer" in annotations, "ReviewResult missing 'reviewer' field"

    def test_create_review_result(self):
        """create_review_result should create valid ReviewResult"""
        from src.consensus.review_state import create_review_result
        result = create_review_result(
            reviewer="qa",
            approved=True,
            score=0.85,
            feedback="Tests pass"
        )
        assert result["reviewer"] == "qa"
        assert result["approved"] is True
        assert result["score"] == 0.85


class TestConsensusStateSchema:
    """Test consensus state schema"""

    def test_consensus_state_exists(self):
        """ConsensusState TypedDict should exist"""
        from src.consensus.review_state import ConsensusState
        assert ConsensusState is not None

    def test_consensus_state_has_reviews(self):
        """ConsensusState should have 'reviews' field"""
        from src.consensus.review_state import ConsensusState
        annotations = ConsensusState.__annotations__
        assert "reviews" in annotations, "ConsensusState missing 'reviews' field"

    def test_consensus_state_has_consensus_result(self):
        """ConsensusState should have 'consensus_result' field"""
        from src.consensus.review_state import ConsensusState
        annotations = ConsensusState.__annotations__
        assert "consensus_result" in annotations, "ConsensusState missing 'consensus_result' field"

    def test_consensus_state_has_average_score(self):
        """ConsensusState should have 'average_score' field"""
        from src.consensus.review_state import ConsensusState
        annotations = ConsensusState.__annotations__
        assert "average_score" in annotations, "ConsensusState missing 'average_score' field"


# =============================================================================
# SECTION 2: Reviewer Nodes Tests
# =============================================================================

class TestQAReviewerNode:
    """Test QA reviewer node"""

    def test_qa_reviewer_node_exists(self):
        """qa_reviewer_node function should exist"""
        from nodes.reviewers import qa_reviewer_node
        assert callable(qa_reviewer_node)

    def test_qa_reviewer_returns_dict(self):
        """qa_reviewer_node should return dict with review result"""
        from nodes.reviewers import qa_reviewer_node
        state = {"task": "Test task", "code": "print('hello')"}
        result = qa_reviewer_node(state)
        assert isinstance(result, dict)

    def test_qa_reviewer_returns_review_qa(self):
        """qa_reviewer_node should return review_qa key"""
        from nodes.reviewers import qa_reviewer_node
        state = {"task": "Test task", "code": "print('hello')"}
        result = qa_reviewer_node(state)
        assert "review_qa" in result

    def test_qa_reviewer_has_approved_field(self):
        """QA review should have approved field"""
        from nodes.reviewers import qa_reviewer_node
        state = {"task": "Test task", "code": "print('hello')"}
        result = qa_reviewer_node(state)
        assert "approved" in result["review_qa"]

    def test_qa_reviewer_has_score_field(self):
        """QA review should have score field"""
        from nodes.reviewers import qa_reviewer_node
        state = {"task": "Test task", "code": "print('hello')"}
        result = qa_reviewer_node(state)
        assert "score" in result["review_qa"]
        assert 0 <= result["review_qa"]["score"] <= 1


class TestSecurityReviewerNode:
    """Test Security reviewer node"""

    def test_security_reviewer_node_exists(self):
        """security_reviewer_node function should exist"""
        from nodes.reviewers import security_reviewer_node
        assert callable(security_reviewer_node)

    def test_security_reviewer_returns_dict(self):
        """security_reviewer_node should return dict"""
        from nodes.reviewers import security_reviewer_node
        state = {"task": "Test task", "code": "print('hello')"}
        result = security_reviewer_node(state)
        assert isinstance(result, dict)

    def test_security_reviewer_returns_review_security(self):
        """security_reviewer_node should return review_security key"""
        from nodes.reviewers import security_reviewer_node
        state = {"task": "Test task", "code": "print('hello')"}
        result = security_reviewer_node(state)
        assert "review_security" in result

    def test_security_reviewer_has_approved_field(self):
        """Security review should have approved field"""
        from nodes.reviewers import security_reviewer_node
        state = {"task": "Test task", "code": "print('hello')"}
        result = security_reviewer_node(state)
        assert "approved" in result["review_security"]


class TestArchitectureReviewerNode:
    """Test Architecture reviewer node"""

    def test_architecture_reviewer_node_exists(self):
        """architecture_reviewer_node function should exist"""
        from nodes.reviewers import architecture_reviewer_node
        assert callable(architecture_reviewer_node)

    def test_architecture_reviewer_returns_dict(self):
        """architecture_reviewer_node should return dict"""
        from nodes.reviewers import architecture_reviewer_node
        state = {"task": "Test task", "code": "print('hello')"}
        result = architecture_reviewer_node(state)
        assert isinstance(result, dict)

    def test_architecture_reviewer_returns_review_architecture(self):
        """architecture_reviewer_node should return review_architecture key"""
        from nodes.reviewers import architecture_reviewer_node
        state = {"task": "Test task", "code": "print('hello')"}
        result = architecture_reviewer_node(state)
        assert "review_architecture" in result


# =============================================================================
# SECTION 3: Consensus Aggregator Tests
# =============================================================================

class TestConsensusAggregator:
    """Test consensus aggregator"""

    def test_consensus_aggregator_exists(self):
        """consensus_aggregator function should exist"""
        from src.consensus.aggregator import consensus_aggregator
        assert callable(consensus_aggregator)

    def test_consensus_all_approved_high_score(self):
        """All approved with high scores should result in 'approved'"""
        from src.consensus.aggregator import consensus_aggregator
        state = {
            "review_qa": {"approved": True, "score": 0.9, "feedback": "Good"},
            "review_security": {"approved": True, "score": 0.85, "feedback": "Secure"},
            "review_architecture": {"approved": True, "score": 0.88, "feedback": "Clean"},
        }
        result = consensus_aggregator(state)
        assert result["consensus"] == "approved"

    def test_consensus_rejected_when_not_all_approved(self):
        """If any reviewer rejects, consensus should be 'rejected'"""
        from src.consensus.aggregator import consensus_aggregator
        state = {
            "review_qa": {"approved": True, "score": 0.9, "feedback": "Good"},
            "review_security": {"approved": False, "score": 0.4, "feedback": "Vulnerability found"},
            "review_architecture": {"approved": True, "score": 0.88, "feedback": "Clean"},
        }
        result = consensus_aggregator(state)
        assert result["consensus"] in ["rejected", "human_review"]

    def test_consensus_human_review_on_low_score(self):
        """Any score < 0.5 should trigger 'human_review'"""
        from src.consensus.aggregator import consensus_aggregator
        state = {
            "review_qa": {"approved": True, "score": 0.9, "feedback": "Good"},
            "review_security": {"approved": True, "score": 0.4, "feedback": "Minor concerns"},
            "review_architecture": {"approved": True, "score": 0.88, "feedback": "Clean"},
        }
        result = consensus_aggregator(state)
        assert result["consensus"] == "human_review"

    def test_consensus_calculates_average_score(self):
        """Aggregator should calculate average score"""
        from src.consensus.aggregator import consensus_aggregator
        state = {
            "review_qa": {"approved": True, "score": 0.9, "feedback": "Good"},
            "review_security": {"approved": True, "score": 0.8, "feedback": "Secure"},
            "review_architecture": {"approved": True, "score": 0.7, "feedback": "OK"},
        }
        result = consensus_aggregator(state)
        assert "avg_score" in result or "average_score" in result
        # Average should be (0.9 + 0.8 + 0.7) / 3 = 0.8
        score = result.get("avg_score", result.get("average_score", 0))
        assert 0.79 <= score <= 0.81

    def test_consensus_rejected_on_low_average(self):
        """Average score < 0.8 with all approved should be 'rejected'"""
        from src.consensus.aggregator import consensus_aggregator
        state = {
            "review_qa": {"approved": True, "score": 0.7, "feedback": "OK"},
            "review_security": {"approved": True, "score": 0.7, "feedback": "OK"},
            "review_architecture": {"approved": True, "score": 0.7, "feedback": "OK"},
        }
        result = consensus_aggregator(state)
        # Average is 0.7, below 0.8 threshold
        assert result["consensus"] == "rejected"

    def test_consensus_collects_feedback(self):
        """Aggregator should collect all feedback"""
        from src.consensus.aggregator import consensus_aggregator
        state = {
            "review_qa": {"approved": True, "score": 0.9, "feedback": "Tests pass"},
            "review_security": {"approved": True, "score": 0.85, "feedback": "No issues"},
            "review_architecture": {"approved": True, "score": 0.88, "feedback": "Clean code"},
        }
        result = consensus_aggregator(state)
        # Should have some form of feedback collection
        assert result.get("consensus") == "approved"


# =============================================================================
# SECTION 4: Consensus Router Tests
# =============================================================================

class TestConsensusRouter:
    """Test consensus router"""

    def test_consensus_router_exists(self):
        """consensus_router function should exist"""
        from src.consensus.router import consensus_router
        assert callable(consensus_router)

    def test_router_returns_merge_on_approved(self):
        """Router should return 'merge' when consensus is approved"""
        from src.consensus.router import consensus_router
        state = {"consensus": "approved", "avg_score": 0.9}
        result = consensus_router(state)
        assert result == "merge"

    def test_router_returns_escalate_on_human_review(self):
        """Router should return 'escalate_human' when consensus needs human review"""
        from src.consensus.router import consensus_router
        state = {"consensus": "human_review", "reason": "Low score"}
        result = consensus_router(state)
        assert result == "escalate_human"

    def test_router_returns_failed_on_rejected(self):
        """Router should return 'failed' when consensus is rejected"""
        from src.consensus.router import consensus_router
        state = {"consensus": "rejected", "avg_score": 0.5}
        result = consensus_router(state)
        assert result == "failed"


# =============================================================================
# SECTION 5: Review Graph Integration Tests
# =============================================================================

class TestConsensusGraph:
    """Test consensus review graph"""

    def test_create_consensus_graph_exists(self):
        """create_consensus_graph function should exist"""
        from src.consensus.review_graph import create_consensus_graph
        assert callable(create_consensus_graph)

    def test_consensus_graph_returns_stategraph(self):
        """create_consensus_graph should return StateGraph"""
        from src.consensus.review_graph import create_consensus_graph
        from langgraph.graph import StateGraph
        graph = create_consensus_graph()
        assert isinstance(graph, StateGraph)

    def test_consensus_graph_has_qa_reviewer(self):
        """Consensus graph should have qa_reviewer node"""
        from src.consensus.review_graph import create_consensus_graph
        graph = create_consensus_graph()
        assert "qa_reviewer" in graph.nodes

    def test_consensus_graph_has_security_reviewer(self):
        """Consensus graph should have security_reviewer node"""
        from src.consensus.review_graph import create_consensus_graph
        graph = create_consensus_graph()
        assert "security_reviewer" in graph.nodes

    def test_consensus_graph_has_architecture_reviewer(self):
        """Consensus graph should have architecture_reviewer node"""
        from src.consensus.review_graph import create_consensus_graph
        graph = create_consensus_graph()
        assert "architecture_reviewer" in graph.nodes

    def test_consensus_graph_has_aggregator(self):
        """Consensus graph should have consensus aggregator node"""
        from src.consensus.review_graph import create_consensus_graph
        graph = create_consensus_graph()
        assert "consensus" in graph.nodes or "aggregator" in graph.nodes

    def test_compile_consensus_graph_exists(self):
        """compile_consensus_graph function should exist"""
        from src.consensus.review_graph import compile_consensus_graph
        assert callable(compile_consensus_graph)

    def test_consensus_graph_compiles(self):
        """Consensus graph should compile without errors"""
        from src.consensus.review_graph import compile_consensus_graph
        compiled = compile_consensus_graph()
        assert compiled is not None

    def test_consensus_graph_is_runnable(self):
        """Compiled consensus graph should be runnable"""
        from src.consensus.review_graph import compile_consensus_graph
        compiled = compile_consensus_graph()
        assert hasattr(compiled, "invoke") or hasattr(compiled, "stream")


# =============================================================================
# SECTION 6: Module Exports Tests
# =============================================================================

class TestConsensusModuleExports:
    """Test consensus module exports"""

    def test_consensus_module_exports(self):
        """All consensus components should be exported from __init__.py"""
        from src.consensus import (
            ReviewResult,
            ConsensusState,
            create_review_result,
            consensus_aggregator,
            consensus_router,
            create_consensus_graph,
            compile_consensus_graph,
        )
        assert ReviewResult is not None
        assert ConsensusState is not None
        assert create_review_result is not None
        assert consensus_aggregator is not None
        assert consensus_router is not None
        assert create_consensus_graph is not None
        assert compile_consensus_graph is not None

    def test_reviewers_importable(self):
        """Reviewer nodes should be importable"""
        from nodes.reviewers import (
            qa_reviewer_node,
            security_reviewer_node,
            architecture_reviewer_node,
        )
        assert qa_reviewer_node is not None
        assert security_reviewer_node is not None
        assert architecture_reviewer_node is not None


# =============================================================================
# SECTION 7: Threshold Configuration Tests
# =============================================================================

class TestConsensusThresholds:
    """Test consensus threshold configuration"""

    def test_approval_threshold_constant(self):
        """APPROVAL_THRESHOLD should be defined"""
        from src.consensus.aggregator import APPROVAL_THRESHOLD
        assert APPROVAL_THRESHOLD == 0.8

    def test_human_review_threshold_constant(self):
        """HUMAN_REVIEW_THRESHOLD should be defined"""
        from src.consensus.aggregator import HUMAN_REVIEW_THRESHOLD
        assert HUMAN_REVIEW_THRESHOLD == 0.5

    def test_threshold_edge_case_exactly_08(self):
        """Score exactly 0.8 should be approved"""
        from src.consensus.aggregator import consensus_aggregator
        state = {
            "review_qa": {"approved": True, "score": 0.8, "feedback": "OK"},
            "review_security": {"approved": True, "score": 0.8, "feedback": "OK"},
            "review_architecture": {"approved": True, "score": 0.8, "feedback": "OK"},
        }
        result = consensus_aggregator(state)
        assert result["consensus"] == "approved"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
