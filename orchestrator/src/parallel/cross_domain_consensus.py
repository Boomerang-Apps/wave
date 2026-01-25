"""
Cross-Domain Consensus Module
Supervisor consensus for cross-domain merge decisions.

Based on Grok's Parallel Domain Execution Recommendations

Implements consensus rules:
1. All domains must pass QA
2. Average safety score >= threshold (0.85)
3. No blocking conflicts between domains

Routes to either auto-merge or human escalation.
"""

from typing import TypedDict, Dict, List, Any, Optional

# Import conflict detector
import sys
import os
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.git.conflict_detector import check_cross_domain_conflicts


# Constants
SAFETY_THRESHOLD = 0.85
MIN_DOMAINS_FOR_CONSENSUS = 1


class ConsensusResult(TypedDict):
    """
    Result of cross-domain consensus decision.

    Attributes:
        merge_approved: Whether merge is approved
        merge_type: "auto" for automatic merge, "manual" for human review
        needs_human: Whether human review is required
        avg_safety_score: Average safety score across domains
        escalation_reason: Reason for escalation (if needs_human)
        failed_domains: List of domains that failed QA
    """
    merge_approved: bool
    merge_type: str
    needs_human: bool
    avg_safety_score: float
    escalation_reason: Optional[str]
    failed_domains: List[str]


def check_all_domains_passed(domain_results: Dict[str, Any]) -> bool:
    """
    Check if all domains passed QA.

    Args:
        domain_results: Dict mapping domain name to result dict

    Returns:
        True if all domains have qa_passed=True
    """
    if not domain_results:
        return False

    for domain, result in domain_results.items():
        if not result.get("qa_passed", False):
            return False

    return True


def calculate_average_safety(domain_results: Dict[str, Any]) -> float:
    """
    Calculate average safety score across all domains.

    Args:
        domain_results: Dict mapping domain name to result dict

    Returns:
        Average safety score (0.0 if no domains)
    """
    if not domain_results:
        return 0.0

    scores = [
        result.get("safety_score", 0.0)
        for result in domain_results.values()
    ]

    return sum(scores) / len(scores) if scores else 0.0


def get_failed_domains(domain_results: Dict[str, Any]) -> List[str]:
    """
    Get list of domains that failed QA.

    Args:
        domain_results: Dict mapping domain name to result dict

    Returns:
        List of domain names that failed
    """
    return [
        domain for domain, result in domain_results.items()
        if not result.get("qa_passed", False)
    ]


def build_escalation_reason(
    failed_domains: List[str],
    avg_safety: float,
    conflict_files: List[str],
    safety_threshold: float = SAFETY_THRESHOLD
) -> str:
    """
    Build human-readable escalation reason.

    Args:
        failed_domains: List of domains that failed QA
        avg_safety: Average safety score
        conflict_files: List of conflicting files
        safety_threshold: Safety threshold for approval

    Returns:
        Detailed escalation reason string
    """
    reasons = []

    if failed_domains:
        reasons.append(f"QA failed for: {', '.join(failed_domains)}")

    if avg_safety < safety_threshold:
        reasons.append(f"Safety score {avg_safety:.2f} below threshold {safety_threshold}")

    if conflict_files:
        reasons.append(f"File conflicts: {', '.join(conflict_files)}")

    return ". ".join(reasons) if reasons else "Unknown reason"


def cross_domain_consensus(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Make consensus decision for cross-domain merge.

    Evaluates:
    1. All domains passed QA
    2. Average safety score >= threshold
    3. No blocking conflicts

    Args:
        state: Current state with domain_results

    Returns:
        ConsensusResult with merge decision
    """
    domain_results = state.get("domain_results", {})

    # Check all domains passed QA
    all_passed = check_all_domains_passed(domain_results)
    failed_domains = get_failed_domains(domain_results)

    # Calculate average safety
    avg_safety = calculate_average_safety(domain_results)
    safety_ok = avg_safety >= SAFETY_THRESHOLD

    # Check for conflicts
    conflict_result = check_cross_domain_conflicts(domain_results)
    has_blocking_conflicts = (
        conflict_result.has_conflicts and
        conflict_result.severity == "blocking"
    )

    # Make decision
    merge_approved = all_passed and safety_ok and not has_blocking_conflicts

    # Build escalation reason if needed
    escalation_reason = None
    if not merge_approved:
        escalation_reason = build_escalation_reason(
            failed_domains=failed_domains,
            avg_safety=avg_safety,
            conflict_files=list(conflict_result.conflicting_files.keys()),
        )

    return {
        "merge_approved": merge_approved,
        "merge_type": "auto" if merge_approved else "manual",
        "needs_human": not merge_approved,
        "avg_safety_score": avg_safety,
        "escalation_reason": escalation_reason,
        "failed_domains": failed_domains,
        "has_conflicts": conflict_result.has_conflicts,
        "conflicting_files": conflict_result.conflicting_files,
    }


def consensus_router(state: Dict[str, Any]) -> str:
    """
    Route based on consensus decision.

    Used as conditional edge in LangGraph.

    Args:
        state: Current state with merge_approved

    Returns:
        "auto_merge" if approved, "escalate" if needs human review
    """
    if state.get("merge_approved", False):
        return "auto_merge"
    else:
        return "escalate"


__all__ = [
    "ConsensusResult",
    "cross_domain_consensus",
    "check_all_domains_passed",
    "calculate_average_safety",
    "build_escalation_reason",
    "consensus_router",
    "SAFETY_THRESHOLD",
]
