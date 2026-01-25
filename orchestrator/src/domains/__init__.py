"""
WAVE Domain Sub-graphs Module

Provides domain-specific sub-graphs for hierarchical multi-agent execution.
Each domain (auth, payments, profile, etc.) has its own isolated workflow.

Based on Grok's Hierarchical Supervisor Pattern from LANGGRAPH-ENHANCEMENT-PLAN.md
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
]
