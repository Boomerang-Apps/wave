"""
Phase 10: Cross-Domain Merge Consensus TDD Tests
Tests for supervisor consensus and conflict detection.

Based on Grok's Parallel Domain Execution Recommendations

Test Categories:
1. Consensus Logic (8 tests)
2. Conflict Detection (7 tests)
3. Merge Routing (5 tests)

Total: 20 tests
"""

import pytest
from typing import Dict, Any, List


# =============================================================================
# Test Category 1: Consensus Logic (8 tests)
# =============================================================================

class TestConsensusLogic:
    """Tests for cross-domain consensus decision logic"""

    def test_consensus_result_exists(self):
        """ConsensusResult TypedDict should exist"""
        from src.parallel.cross_domain_consensus import ConsensusResult

        result: ConsensusResult = {
            "merge_approved": True,
            "merge_type": "auto",
            "needs_human": False,
            "avg_safety_score": 0.90,
            "escalation_reason": None,
            "failed_domains": [],
        }

        assert result["merge_approved"] is True

    def test_cross_domain_consensus_exists(self):
        """cross_domain_consensus function should exist"""
        from src.parallel.cross_domain_consensus import cross_domain_consensus
        assert callable(cross_domain_consensus)

    def test_check_all_domains_passed_exists(self):
        """check_all_domains_passed function should exist"""
        from src.parallel.cross_domain_consensus import check_all_domains_passed
        assert callable(check_all_domains_passed)

    def test_check_all_domains_passed_returns_true_when_all_pass(self):
        """check_all_domains_passed should return True when all domains pass QA"""
        from src.parallel.cross_domain_consensus import check_all_domains_passed

        domain_results = {
            "auth": {"qa_passed": True, "safety_score": 0.9},
            "payments": {"qa_passed": True, "safety_score": 0.85},
        }

        result = check_all_domains_passed(domain_results)
        assert result is True

    def test_check_all_domains_passed_returns_false_when_any_fail(self):
        """check_all_domains_passed should return False when any domain fails"""
        from src.parallel.cross_domain_consensus import check_all_domains_passed

        domain_results = {
            "auth": {"qa_passed": True, "safety_score": 0.9},
            "payments": {"qa_passed": False, "safety_score": 0.75},
        }

        result = check_all_domains_passed(domain_results)
        assert result is False

    def test_calculate_average_safety_exists(self):
        """calculate_average_safety function should exist"""
        from src.parallel.cross_domain_consensus import calculate_average_safety
        assert callable(calculate_average_safety)

    def test_calculate_average_safety_computes_correctly(self):
        """calculate_average_safety should compute correct average"""
        from src.parallel.cross_domain_consensus import calculate_average_safety

        domain_results = {
            "auth": {"qa_passed": True, "safety_score": 0.90},
            "payments": {"qa_passed": True, "safety_score": 0.80},
        }

        result = calculate_average_safety(domain_results)
        assert result == pytest.approx(0.85, rel=0.01)

    def test_build_escalation_reason_exists(self):
        """build_escalation_reason function should exist"""
        from src.parallel.cross_domain_consensus import build_escalation_reason
        assert callable(build_escalation_reason)


# =============================================================================
# Test Category 2: Conflict Detection (7 tests)
# =============================================================================

class TestConflictDetection:
    """Tests for cross-domain conflict detection"""

    def test_conflict_result_exists(self):
        """ConflictResult dataclass should exist"""
        from src.git.conflict_detector import ConflictResult

        result = ConflictResult(
            has_conflicts=True,
            conflicting_files={"shared.ts": ["auth", "payments"]},
            conflict_type="file",
            severity="blocking",
        )

        assert result.has_conflicts is True

    def test_check_cross_domain_conflicts_exists(self):
        """check_cross_domain_conflicts function should exist"""
        from src.git.conflict_detector import check_cross_domain_conflicts
        assert callable(check_cross_domain_conflicts)

    def test_detect_file_conflicts_exists(self):
        """detect_file_conflicts function should exist"""
        from src.git.conflict_detector import detect_file_conflicts
        assert callable(detect_file_conflicts)

    def test_detect_file_conflicts_finds_overlaps(self):
        """detect_file_conflicts should find files modified by multiple domains"""
        from src.git.conflict_detector import detect_file_conflicts

        domain_results = {
            "auth": {"files_modified": ["shared/types.ts", "auth.py"]},
            "payments": {"files_modified": ["shared/types.ts", "pay.py"]},
        }

        conflicts = detect_file_conflicts(domain_results)
        assert "shared/types.ts" in conflicts

    def test_detect_schema_conflicts_exists(self):
        """detect_schema_conflicts function should exist"""
        from src.git.conflict_detector import detect_schema_conflicts
        assert callable(detect_schema_conflicts)

    def test_detect_api_conflicts_exists(self):
        """detect_api_conflicts function should exist"""
        from src.git.conflict_detector import detect_api_conflicts
        assert callable(detect_api_conflicts)

    def test_conflict_result_has_severity(self):
        """ConflictResult should have severity field"""
        from src.git.conflict_detector import ConflictResult

        result = ConflictResult(
            has_conflicts=True,
            conflicting_files={},
            conflict_type="file",
            severity="warning",
        )

        assert result.severity == "warning"


# =============================================================================
# Test Category 3: Merge Routing (5 tests)
# =============================================================================

class TestMergeRouting:
    """Tests for merge routing decisions"""

    def test_consensus_router_exists(self):
        """consensus_router function should exist"""
        from src.parallel.cross_domain_consensus import consensus_router
        assert callable(consensus_router)

    def test_consensus_router_returns_auto_merge_when_approved(self):
        """consensus_router should return 'auto_merge' when merge approved"""
        from src.parallel.cross_domain_consensus import consensus_router

        state = {
            "merge_approved": True,
            "needs_human": False,
        }

        result = consensus_router(state)
        assert result == "auto_merge"

    def test_consensus_router_returns_escalate_when_rejected(self):
        """consensus_router should return 'escalate' when merge rejected"""
        from src.parallel.cross_domain_consensus import consensus_router

        state = {
            "merge_approved": False,
            "needs_human": True,
        }

        result = consensus_router(state)
        assert result == "escalate"

    def test_consensus_approves_when_all_conditions_met(self):
        """cross_domain_consensus should approve when all conditions met"""
        from src.parallel.cross_domain_consensus import cross_domain_consensus

        state = {
            "domain_results": {
                "auth": {"qa_passed": True, "safety_score": 0.92, "files_modified": ["auth.py"]},
                "payments": {"qa_passed": True, "safety_score": 0.88, "files_modified": ["pay.py"]},
            },
        }

        result = cross_domain_consensus(state)
        assert result["merge_approved"] is True

    def test_consensus_rejects_when_safety_below_threshold(self):
        """cross_domain_consensus should reject when safety below threshold"""
        from src.parallel.cross_domain_consensus import cross_domain_consensus

        state = {
            "domain_results": {
                "auth": {"qa_passed": True, "safety_score": 0.70, "files_modified": []},
                "payments": {"qa_passed": True, "safety_score": 0.60, "files_modified": []},
            },
        }

        result = cross_domain_consensus(state)
        assert result["merge_approved"] is False
        assert result["needs_human"] is True
