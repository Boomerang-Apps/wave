"""
Portal Endpoints Module
API endpoints for Portal integration with domain dependencies.

Based on Grok's Parallel Domain Execution Recommendations

Provides:
- start_with_dependencies: Start workflow with domain dependencies
- get_domain_status: Get status of a single domain
- get_run_status: Get status of entire run
"""

import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional

from .portal_models import (
    PortalWorkflowRequest,
    DomainStatus,
    validate_portal_request,
)


# In-memory storage for run tracking (would be Redis/DB in production)
_run_storage: Dict[str, Dict[str, Any]] = {}


def generate_run_id() -> str:
    """Generate a unique run ID."""
    return str(uuid.uuid4())[:8]


async def start_with_dependencies(request: PortalWorkflowRequest) -> Dict[str, Any]:
    """
    Start a workflow with domain dependencies.

    Creates a new run with the specified domains and dependencies,
    initializes domain statuses, and returns run information.

    Args:
        request: Portal workflow request with domains and dependencies

    Returns:
        Dict with run_id, status, and domain info
    """
    run_id = generate_run_id()

    # Compute execution layers from dependencies
    # (simplified - in production would use topological_sort)
    layers = compute_simple_layers(request.domains, request.dependencies)

    # Initialize domain statuses
    domain_statuses = {}
    for layer_idx, layer_domains in enumerate(layers):
        for domain in layer_domains:
            domain_statuses[domain] = DomainStatus(
                domain=domain,
                status="pending",
                layer=layer_idx,
            )

    # Store run information
    _run_storage[run_id] = {
        "run_id": run_id,
        "domains": request.domains,
        "dependencies": request.dependencies,
        "wave_number": request.wave_number,
        "story_ids": request.story_ids,
        "project_path": request.project_path,
        "requirements": request.requirements,
        "domain_statuses": domain_statuses,
        "status": "started",
        "created_at": datetime.now().isoformat(),
    }

    return create_portal_response(
        success=True,
        run_id=run_id,
        domains=request.domains,
        domain_statuses=domain_statuses,
    )


def compute_simple_layers(
    domains: List[str],
    dependencies: Dict[str, List[str]],
) -> List[List[str]]:
    """
    Compute simple execution layers from dependencies.

    Args:
        domains: List of domain names
        dependencies: Dict mapping domain to list of dependencies

    Returns:
        List of layers, each containing domains that can run in parallel
    """
    # Find domains with no dependencies (layer 0)
    layer_0 = [d for d in domains if d not in dependencies or not dependencies.get(d)]

    if not layer_0:
        return [domains]  # No dependencies, all in one layer

    # Remaining domains
    remaining = set(domains) - set(layer_0)
    layers = [layer_0]

    while remaining:
        # Find domains whose dependencies are all in previous layers
        assigned = set()
        for d in remaining:
            deps = dependencies.get(d, [])
            if all(dep in set().union(*layers) for dep in deps):
                assigned.add(d)

        if not assigned:
            # No progress - put remaining in last layer
            layers.append(list(remaining))
            break

        layers.append(list(assigned))
        remaining -= assigned

    return layers


async def get_domain_status(run_id: str, domain: str) -> Dict[str, Any]:
    """
    Get the status of a single domain in a run.

    Args:
        run_id: Run identifier
        domain: Domain name

    Returns:
        Dict with domain status information
    """
    run_data = _run_storage.get(run_id)

    if not run_data:
        return {
            "success": False,
            "error": f"Run {run_id} not found",
        }

    domain_statuses = run_data.get("domain_statuses", {})
    domain_status = domain_statuses.get(domain)

    if not domain_status:
        return {
            "success": False,
            "error": f"Domain {domain} not found in run {run_id}",
        }

    return {
        "success": True,
        "run_id": run_id,
        "domain": domain,
        "status": domain_status.status,
        "layer": domain_status.layer,
        "progress": domain_status.progress,
        "current_node": domain_status.current_node,
        "error": domain_status.error,
    }


async def get_run_status(run_id: str) -> Dict[str, Any]:
    """
    Get the status of an entire run.

    Args:
        run_id: Run identifier

    Returns:
        Dict with run status and all domain statuses
    """
    run_data = _run_storage.get(run_id)

    if not run_data:
        return {
            "success": False,
            "error": f"Run {run_id} not found",
        }

    domain_statuses = run_data.get("domain_statuses", {})

    # Calculate overall progress
    total_domains = len(domain_statuses)
    completed = sum(1 for ds in domain_statuses.values() if ds.status == "complete")
    overall_progress = completed / total_domains if total_domains > 0 else 0

    return {
        "success": True,
        "run_id": run_id,
        "status": run_data.get("status", "unknown"),
        "domains": run_data.get("domains", []),
        "overall_progress": overall_progress,
        "domain_statuses": {
            domain: {
                "status": ds.status,
                "layer": ds.layer,
                "progress": ds.progress,
            }
            for domain, ds in domain_statuses.items()
        },
        "created_at": run_data.get("created_at"),
    }


def create_portal_response(
    success: bool,
    run_id: str,
    domains: List[str],
    domain_statuses: Optional[Dict[str, DomainStatus]] = None,
    error: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a standardized Portal response.

    Args:
        success: Whether the operation succeeded
        run_id: Run identifier
        domains: List of domain names
        domain_statuses: Optional dict of domain statuses
        error: Optional error message

    Returns:
        Standardized response dict
    """
    response = {
        "success": success,
        "run_id": run_id,
        "status": "started" if success else "failed",
        "domains": {
            domain: {
                "status": domain_statuses[domain].status if domain_statuses else "pending",
                "layer": domain_statuses[domain].layer if domain_statuses else 0,
            }
            for domain in domains
        } if domains else {},
    }

    if error:
        response["error"] = error

    return response


def clear_run_storage() -> None:
    """Clear all run storage (for testing)."""
    _run_storage.clear()


__all__ = [
    "start_with_dependencies",
    "get_domain_status",
    "get_run_status",
    "create_portal_response",
    "clear_run_storage",
]
