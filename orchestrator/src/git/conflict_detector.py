"""
Conflict Detector Module
Detect cross-domain conflicts for merge consensus.

Based on Grok's Parallel Domain Execution Recommendations

Detects:
- File conflicts (same file modified by multiple domains)
- Schema conflicts (incompatible database migrations)
- API conflicts (breaking API changes)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Set


@dataclass
class ConflictResult:
    """
    Result of cross-domain conflict detection.

    Attributes:
        has_conflicts: Whether any conflicts were detected
        conflicting_files: Dict mapping file path to list of domains that modified it
        conflict_type: Type of conflict ("file", "schema", "api", "none")
        severity: Severity level ("blocking", "warning", "none")
    """
    has_conflicts: bool
    conflicting_files: Dict[str, List[str]]
    conflict_type: str
    severity: str


def detect_file_conflicts(domain_results: Dict[str, Any]) -> List[str]:
    """
    Detect files modified by multiple domains.

    Args:
        domain_results: Dict mapping domain name to result dict with files_modified

    Returns:
        List of file paths that were modified by multiple domains
    """
    file_domains: Dict[str, List[str]] = {}

    for domain, result in domain_results.items():
        files = result.get("files_modified", [])
        for file_path in files:
            if file_path not in file_domains:
                file_domains[file_path] = []
            file_domains[file_path].append(domain)

    # Return files modified by more than one domain
    conflicts = [
        file_path for file_path, domains in file_domains.items()
        if len(domains) > 1
    ]

    return conflicts


def detect_schema_conflicts(domain_results: Dict[str, Any]) -> List[str]:
    """
    Detect schema/migration conflicts between domains.

    Looks for migration files or schema changes that might conflict.

    Args:
        domain_results: Dict mapping domain name to result dict

    Returns:
        List of potential schema conflict descriptions
    """
    conflicts = []

    # Look for migration files
    migration_patterns = ["migration", "schema", ".sql", "alembic"]

    for domain, result in domain_results.items():
        files = result.get("files_modified", [])
        for file_path in files:
            file_lower = file_path.lower()
            if any(pattern in file_lower for pattern in migration_patterns):
                # Check if other domains also have migrations
                for other_domain, other_result in domain_results.items():
                    if other_domain != domain:
                        other_files = other_result.get("files_modified", [])
                        for other_file in other_files:
                            if any(pattern in other_file.lower() for pattern in migration_patterns):
                                conflict = f"Schema conflict: {domain} and {other_domain} both have migrations"
                                if conflict not in conflicts:
                                    conflicts.append(conflict)

    return conflicts


def detect_api_conflicts(domain_results: Dict[str, Any]) -> List[str]:
    """
    Detect API conflicts between domains.

    Looks for API endpoint or contract changes that might conflict.

    Args:
        domain_results: Dict mapping domain name to result dict

    Returns:
        List of potential API conflict descriptions
    """
    conflicts = []

    # Look for API-related files
    api_patterns = ["api", "endpoint", "route", "controller", "openapi", "swagger"]

    shared_api_files: Dict[str, List[str]] = {}

    for domain, result in domain_results.items():
        files = result.get("files_modified", [])
        for file_path in files:
            file_lower = file_path.lower()
            if any(pattern in file_lower for pattern in api_patterns):
                if file_path not in shared_api_files:
                    shared_api_files[file_path] = []
                shared_api_files[file_path].append(domain)

    # Report files touched by multiple domains
    for file_path, domains in shared_api_files.items():
        if len(domains) > 1:
            conflicts.append(f"API conflict: {file_path} modified by {', '.join(domains)}")

    return conflicts


def check_cross_domain_conflicts(domain_results: Dict[str, Any]) -> ConflictResult:
    """
    Check for all types of cross-domain conflicts.

    Aggregates file, schema, and API conflict detection.

    Args:
        domain_results: Dict mapping domain name to result dict

    Returns:
        ConflictResult with all detected conflicts
    """
    # Detect all conflict types
    file_conflicts = detect_file_conflicts(domain_results)
    schema_conflicts = detect_schema_conflicts(domain_results)
    api_conflicts = detect_api_conflicts(domain_results)

    # Build conflicting files dict
    conflicting_files: Dict[str, List[str]] = {}
    for domain, result in domain_results.items():
        for file_path in result.get("files_modified", []):
            if file_path in file_conflicts:
                if file_path not in conflicting_files:
                    conflicting_files[file_path] = []
                if domain not in conflicting_files[file_path]:
                    conflicting_files[file_path].append(domain)

    # Determine conflict type and severity
    has_conflicts = bool(file_conflicts or schema_conflicts or api_conflicts)

    if schema_conflicts or api_conflicts:
        conflict_type = "schema" if schema_conflicts else "api"
        severity = "blocking"
    elif file_conflicts:
        conflict_type = "file"
        severity = "warning"
    else:
        conflict_type = "none"
        severity = "none"

    return ConflictResult(
        has_conflicts=has_conflicts,
        conflicting_files=conflicting_files,
        conflict_type=conflict_type,
        severity=severity,
    )


__all__ = [
    "ConflictResult",
    "check_cross_domain_conflicts",
    "detect_file_conflicts",
    "detect_schema_conflicts",
    "detect_api_conflicts",
]
