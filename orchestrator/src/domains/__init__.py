"""
WAVE Domain Sub-graphs Module

Provides domain-specific sub-graphs for hierarchical multi-agent execution.
Each domain (auth, payments, profile, etc.) has its own isolated workflow.

Based on Grok's Hierarchical Supervisor Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md

Phase 8 Enhancement: Parallel Dev Agents (fe-dev/be-dev)
"""

from .domain_graph import (
    DomainState,
    create_domain_subgraph,
    compile_domain_subgraph,
    create_initial_domain_state,
    SUPPORTED_DOMAINS,
)
from .domain_nodes import (
    domain_cto_node,
    domain_pm_node,
    domain_dev_node,
    domain_qa_node,
)
from .domain_router import (
    analyze_story_domains,
    route_to_domain,
    get_primary_domain,
    DOMAIN_PATTERNS,
)
# Phase 8: Parallel Dev Agents
from .dev_agent_state import (
    DevAgentState,
    DevAgentResult,
    DomainDevState,
    create_dev_agent_state,
    create_domain_dev_state,
)
from .dev_merger import (
    merge_dev_results,
    aggregate_dev_files,
    aggregate_dev_tests,
)
from .parallel_dev_graph import (
    create_parallel_dev_graph,
    compile_parallel_dev_graph,
)
# P3-002: Domain Boundary Enforcer
from .boundary_enforcer import (
    BoundaryEnforcer,
    AccessResult,
    DomainRule,
    AccessViolation,
)

__all__ = [
    # State
    "DomainState",
    # Graph
    "create_domain_subgraph",
    "compile_domain_subgraph",
    "create_initial_domain_state",
    "SUPPORTED_DOMAINS",
    # Nodes
    "domain_cto_node",
    "domain_pm_node",
    "domain_dev_node",
    "domain_qa_node",
    # Routing
    "analyze_story_domains",
    "route_to_domain",
    "get_primary_domain",
    "DOMAIN_PATTERNS",
    # Phase 8: Dev Agent State
    "DevAgentState",
    "DevAgentResult",
    "DomainDevState",
    "create_dev_agent_state",
    "create_domain_dev_state",
    # Phase 8: Dev Merger
    "merge_dev_results",
    "aggregate_dev_files",
    "aggregate_dev_tests",
    # Phase 8: Parallel Dev Graph
    "create_parallel_dev_graph",
    "compile_parallel_dev_graph",
    # P3-002: Boundary Enforcer
    "BoundaryEnforcer",
    "AccessResult",
    "DomainRule",
    "AccessViolation",
]
