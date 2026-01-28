"""
WAVE Monitoring Module

Provides real-time issue detection and monitoring for WAVE workflows.
Integrates with existing Slack notifications and LangSmith metrics.

Gate 0 Research Items #1 and #3 Implementation.
"""

from .issue_detector import (
    Issue,
    IssueSeverity,
    IssueDetector,
    IssueAlerter,
    detect_and_alert,
)

from .container_validator import (
    ContainerValidator,
    ContainerStatus,
    ContainerConfig,
    ContainerLevel,
    ValidationResult,
    validate_containers,
)

__all__ = [
    # Issue detection (Item #1)
    "Issue",
    "IssueSeverity",
    "IssueDetector",
    "IssueAlerter",
    "detect_and_alert",
    # Container validation (Item #3)
    "ContainerValidator",
    "ContainerStatus",
    "ContainerConfig",
    "ContainerLevel",
    "ValidationResult",
    "validate_containers",
]
