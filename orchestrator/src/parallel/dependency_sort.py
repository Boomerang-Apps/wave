"""
Dependency Sort Module
Topological sorting and execution layer computation for parallel domains.

Based on Grok's Parallel Domain Execution Recommendations

Uses Kahn's algorithm for topological sorting to:
1. Respect domain dependencies
2. Create execution layers for parallel execution
3. Detect circular dependencies
"""

from typing import Dict, List, Any, Set
from collections import deque


def topological_sort_domains(
    domains: List[str],
    dependencies: Dict[str, List[str]]
) -> List[str]:
    """
    Topologically sort domains based on dependencies.

    Uses Kahn's algorithm (BFS-based).

    Args:
        domains: List of all domains
        dependencies: Dict mapping domain to list of dependencies

    Returns:
        Topologically sorted list of domains

    Raises:
        ValueError: If circular dependency detected
    """
    if not domains:
        return []

    # Build in-degree map
    in_degree = {domain: 0 for domain in domains}
    adj_list = {domain: [] for domain in domains}

    for domain, deps in dependencies.items():
        if domain in domains:
            for dep in deps:
                if dep in domains:
                    adj_list[dep].append(domain)
                    in_degree[domain] += 1

    # Initialize queue with nodes having no dependencies
    queue = deque([d for d in domains if in_degree[d] == 0])
    sorted_domains = []

    while queue:
        current = queue.popleft()
        sorted_domains.append(current)

        for neighbor in adj_list[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    # Check for circular dependency
    if len(sorted_domains) != len(domains):
        raise ValueError("Circular dependency detected in domains")

    return sorted_domains


def compute_execution_layers(
    domains: List[str],
    dependencies: Dict[str, List[str]]
) -> List[List[str]]:
    """
    Compute execution layers for parallel execution.

    Domains in the same layer have no dependencies on each other
    and can execute in parallel.

    Args:
        domains: List of all domains
        dependencies: Dict mapping domain to list of dependencies

    Returns:
        List of layers, each layer is a list of domains
    """
    if not domains:
        return []

    # Track which layer each domain belongs to
    domain_layers = {}

    # Build reverse lookup: domain -> domains that depend on it
    dependents = {domain: [] for domain in domains}
    for domain, deps in dependencies.items():
        if domain in domains:
            for dep in deps:
                if dep in domains:
                    dependents[dep].append(domain)

    # Find domains with no dependencies (layer 0)
    layer_0 = [d for d in domains if d not in dependencies or not dependencies.get(d)]
    for domain in layer_0:
        domain_layers[domain] = 0

    # Process remaining domains
    remaining = set(domains) - set(layer_0)

    while remaining:
        newly_assigned = []

        for domain in remaining:
            deps = dependencies.get(domain, [])
            # Filter to only deps that are in our domain list
            valid_deps = [d for d in deps if d in domains]

            if all(d in domain_layers for d in valid_deps):
                # All dependencies have been assigned layers
                max_dep_layer = max(domain_layers[d] for d in valid_deps) if valid_deps else -1
                domain_layers[domain] = max_dep_layer + 1
                newly_assigned.append(domain)

        if not newly_assigned:
            # No progress made - circular dependency
            break

        remaining -= set(newly_assigned)

    # Convert to list of layers
    if not domain_layers:
        return [domains]  # All independent

    max_layer = max(domain_layers.values())
    layers = [[] for _ in range(max_layer + 1)]

    for domain, layer in domain_layers.items():
        layers[layer].append(domain)

    # Sort domains within each layer for determinism
    for layer in layers:
        layer.sort()

    return layers


def detect_circular_dependencies(
    dependencies: Dict[str, List[str]]
) -> List[List[str]]:
    """
    Detect circular dependencies in the dependency graph.

    Args:
        dependencies: Dict mapping domain to list of dependencies

    Returns:
        List of cycles found (each cycle is a list of domains)
    """
    cycles = []
    visited = set()
    rec_stack = set()
    path = []

    def dfs(node: str) -> bool:
        visited.add(node)
        rec_stack.add(node)
        path.append(node)

        for neighbor in dependencies.get(node, []):
            if neighbor not in visited:
                if dfs(neighbor):
                    return True
            elif neighbor in rec_stack:
                # Found cycle
                cycle_start = path.index(neighbor)
                cycles.append(path[cycle_start:] + [neighbor])
                return True

        path.pop()
        rec_stack.remove(node)
        return False

    # Check all nodes
    all_nodes = set(dependencies.keys())
    for deps in dependencies.values():
        all_nodes.update(deps)

    for node in all_nodes:
        if node not in visited:
            dfs(node)

    return cycles


def validate_dependencies(
    domains: List[str],
    dependencies: Dict[str, List[str]]
) -> Dict[str, Any]:
    """
    Validate that dependencies are well-formed.

    Checks:
    1. All dependency references exist in domains list
    2. No circular dependencies
    3. No self-dependencies

    Args:
        domains: List of all domains
        dependencies: Dict mapping domain to list of dependencies

    Returns:
        Dict with 'valid' bool and 'errors' list
    """
    errors = []
    domain_set = set(domains)

    # Check for missing dependencies
    for domain, deps in dependencies.items():
        for dep in deps:
            if dep not in domain_set:
                errors.append(f"Domain '{domain}' depends on non-existent domain '{dep}'")

        # Check for self-dependency
        if domain in deps:
            errors.append(f"Domain '{domain}' has self-dependency")

    # Check for circular dependencies
    cycles = detect_circular_dependencies(dependencies)
    if cycles:
        for cycle in cycles:
            errors.append(f"Circular dependency detected: {' -> '.join(cycle)}")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
    }


def dependency_sort_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph node for dependency sorting.

    Computes sorted domains and execution layers from state.

    Args:
        state: Current parallel state

    Returns:
        Dict with sorted_domains and execution_layers
    """
    domains = state.get("domains", [])
    dependencies = state.get("domain_dependencies", {})

    # Validate first
    validation = validate_dependencies(domains, dependencies)
    if not validation["valid"]:
        return {
            "sorted_domains": domains,  # Fallback to original order
            "execution_layers": [domains],  # Single layer
            "dependency_errors": validation["errors"],
        }

    # Compute sorted order
    sorted_domains = topological_sort_domains(domains, dependencies)

    # Compute execution layers
    execution_layers = compute_execution_layers(domains, dependencies)

    return {
        "sorted_domains": sorted_domains,
        "execution_layers": execution_layers,
        "dependency_errors": [],
    }


__all__ = [
    "topological_sort_domains",
    "compute_execution_layers",
    "detect_circular_dependencies",
    "validate_dependencies",
    "dependency_sort_node",
]
