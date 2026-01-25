"""
Domain Sub-graph Module
Creates isolated LangGraph sub-graphs for domain-specific execution.

Based on Grok's Hierarchical Supervisor Pattern:
- Each domain (auth, payments, profile, etc.) has its own sub-graph
- Domain sub-graphs have specialized CTO, Dev, QA nodes
- Parent supervisor delegates to domain sub-graphs
"""

from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph

from .domain_nodes import (
    domain_cto_node,
    domain_pm_node,
    domain_dev_node,
    domain_qa_node,
)


# Supported domains for WAVE orchestrator
SUPPORTED_DOMAINS: List[str] = [
    "auth",       # Authentication, login, sessions, OAuth
    "payments",   # Payment processing, billing, subscriptions
    "profile",    # User profile, settings, preferences
    "api",        # REST/GraphQL endpoints, API routes
    "ui",         # Frontend components, React/Vue/Angular
    "data",       # Database, migrations, schemas, queries
]


class DomainState(TypedDict):
    """
    State schema for domain sub-graphs.

    Isolated state for domain-specific execution, linked to parent run.
    """
    # Domain identification
    domain: str
    parent_run_id: str

    # Task being executed
    task: str

    # Execution tracking
    files_modified: List[str]
    tests_passed: bool
    cto_approved: bool


def create_initial_domain_state(
    domain: str,
    parent_run_id: str,
    task: str,
) -> DomainState:
    """
    Factory function to create initial domain state.

    Args:
        domain: Domain name (auth, payments, etc.)
        parent_run_id: ID of parent workflow run
        task: Task description for this domain

    Returns:
        Initialized DomainState
    """
    return DomainState(
        domain=domain,
        parent_run_id=parent_run_id,
        task=task,
        files_modified=[],
        tests_passed=False,
        cto_approved=False,
    )


def create_domain_subgraph(domain: str) -> StateGraph:
    """
    Create a domain-specific sub-graph.

    Flow: PM → CTO → Dev → QA → END

    Args:
        domain: Domain name to create sub-graph for

    Returns:
        StateGraph configured for domain execution
    """
    if domain not in SUPPORTED_DOMAINS:
        raise ValueError(f"Unsupported domain: {domain}. Must be one of {SUPPORTED_DOMAINS}")

    # Create graph with DomainState
    graph = StateGraph(DomainState)

    # Add domain-specific nodes
    graph.add_node("domain_pm", domain_pm_node)
    graph.add_node("domain_cto", domain_cto_node)
    graph.add_node("domain_dev", domain_dev_node)
    graph.add_node("domain_qa", domain_qa_node)

    # Set entry point - PM plans first
    graph.set_entry_point("domain_pm")

    # Linear flow for domain execution: PM → CTO → Dev → QA → END
    graph.add_edge("domain_pm", "domain_cto")
    graph.add_edge("domain_cto", "domain_dev")
    graph.add_edge("domain_dev", "domain_qa")
    graph.add_edge("domain_qa", END)

    return graph


def compile_domain_subgraph(domain: str, checkpointer=None) -> CompiledStateGraph:
    """
    Compile a domain sub-graph for execution.

    Args:
        domain: Domain name to compile sub-graph for
        checkpointer: Optional checkpointer for state persistence

    Returns:
        Compiled graph ready for execution
    """
    graph = create_domain_subgraph(domain)
    return graph.compile(checkpointer=checkpointer)


__all__ = [
    "DomainState",
    "SUPPORTED_DOMAINS",
    "create_initial_domain_state",
    "create_domain_subgraph",
    "compile_domain_subgraph",
]
