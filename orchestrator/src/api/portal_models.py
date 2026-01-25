"""
Portal Models Module
Request/response models for Portal integration.

Based on Grok's Parallel Domain Execution Recommendations

Provides:
- PortalWorkflowRequest: Request model with domains and dependencies
- DomainProgressEvent: Event model for domain progress updates
- Validation functions for Portal API contract
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Any, Optional


@dataclass
class PortalWorkflowRequest:
    """
    Request model for starting a workflow with domain dependencies.

    Matches Portal's dependency-graph.js output format.
    """
    domains: List[str]
    dependencies: Dict[str, List[str]]
    wave_number: int
    story_ids: List[str]
    project_path: str
    requirements: str

    def __post_init__(self):
        """Validate request after initialization."""
        if not self.domains:
            self.domains = []
        if not self.dependencies:
            self.dependencies = {}
        if not self.story_ids:
            self.story_ids = []


@dataclass
class DomainProgressEvent:
    """
    Event model for domain progress updates.

    Published to Redis channels for real-time Portal updates.
    """
    event_type: str  # "started", "progress", "complete"
    domain: str
    run_id: str
    timestamp: str
    data: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create_started(cls, domain: str, run_id: str) -> "DomainProgressEvent":
        """Create a domain started event."""
        return cls(
            event_type="started",
            domain=domain,
            run_id=run_id,
            timestamp=datetime.now().isoformat(),
            data={},
        )

    @classmethod
    def create_progress(
        cls,
        domain: str,
        run_id: str,
        current_node: str,
        files_modified: List[str],
        tests_status: str,
    ) -> "DomainProgressEvent":
        """Create a domain progress event."""
        return cls(
            event_type="progress",
            domain=domain,
            run_id=run_id,
            timestamp=datetime.now().isoformat(),
            data={
                "current_node": current_node,
                "files_modified": files_modified,
                "tests_status": tests_status,
            },
        )

    @classmethod
    def create_complete(
        cls,
        domain: str,
        run_id: str,
        qa_passed: bool,
        safety_score: float,
    ) -> "DomainProgressEvent":
        """Create a domain complete event."""
        return cls(
            event_type="complete",
            domain=domain,
            run_id=run_id,
            timestamp=datetime.now().isoformat(),
            data={
                "qa_passed": qa_passed,
                "safety_score": safety_score,
            },
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization."""
        return {
            "event": f"domain.{self.event_type}",
            "domain": self.domain,
            "run_id": self.run_id,
            "timestamp": self.timestamp,
            **self.data,
        }


@dataclass
class DomainStatus:
    """Status of a single domain in a run."""
    domain: str
    status: str  # "pending", "running", "complete", "failed"
    layer: int
    progress: float = 0.0
    current_node: Optional[str] = None
    error: Optional[str] = None


def validate_portal_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate a Portal workflow request.

    Checks:
    1. domains is a non-empty list
    2. dependencies only reference existing domains
    3. Required fields are present

    Args:
        request_data: Raw request data dict

    Returns:
        Dict with 'valid' bool and 'errors' list
    """
    errors = []

    # Check domains
    domains = request_data.get("domains", [])
    if not domains:
        errors.append("domains must be a non-empty list")

    # Check dependencies reference valid domains
    dependencies = request_data.get("dependencies", {})
    domain_set = set(domains)

    for domain, deps in dependencies.items():
        if domain not in domain_set:
            errors.append(f"dependency key '{domain}' not in domains list")
        for dep in deps:
            if dep not in domain_set:
                errors.append(f"dependency '{dep}' for '{domain}' not in domains list")

    # Check required fields
    required_fields = ["wave_number", "project_path", "requirements"]
    for field in required_fields:
        if field not in request_data:
            errors.append(f"missing required field: {field}")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
    }


__all__ = [
    "PortalWorkflowRequest",
    "DomainProgressEvent",
    "DomainStatus",
    "validate_portal_request",
]
