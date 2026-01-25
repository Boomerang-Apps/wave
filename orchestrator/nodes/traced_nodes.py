"""
Pre-wrapped Traced Node Exports
Phase LangSmith-3: Node Instrumentation

Provides pre-wrapped versions of all WAVE nodes with tracing enabled.
Import these instead of the base nodes to get automatic tracing.

Usage:
    from nodes.traced_nodes import traced_cto_node, traced_dev_node

    # Use in graph
    graph.add_node("cto", traced_cto_node)
    graph.add_node("dev", traced_dev_node)

All traced nodes are transparent - they return the exact same output
as the original nodes, just with added observability.
"""

from src.tracing.node_wrapper import wrap_node

# Import original nodes
from .cto import cto_node
from .pm import pm_node
from .dev import dev_node
from .qa import qa_node
from .supervisor import supervisor_node
from .safety_gate import safety_gate_node
from .dev_agents import fe_dev_node, be_dev_node, dev_agent_node


# =============================================================================
# PRE-WRAPPED TRACED NODES
# =============================================================================

# CTO Node - Architecture review and planning
traced_cto_node = wrap_node(
    cto_node,
    name="cto_node",
    tags=["agent", "cto", "architecture"],
)

# PM Node - Task planning and breakdown
traced_pm_node = wrap_node(
    pm_node,
    name="pm_node",
    tags=["agent", "pm", "planning"],
)

# Dev Node - Code implementation
traced_dev_node = wrap_node(
    dev_node,
    name="dev_node",
    tags=["agent", "dev", "implementation"],
)

# QA Node - Testing and validation
traced_qa_node = wrap_node(
    qa_node,
    name="qa_node",
    tags=["agent", "qa", "testing"],
)

# Supervisor Node - Routing and orchestration
traced_supervisor_node = wrap_node(
    supervisor_node,
    name="supervisor_node",
    tags=["agent", "supervisor", "routing"],
)

# Safety Gate Node - Safety checks
traced_safety_gate_node = wrap_node(
    safety_gate_node,
    name="safety_gate_node",
    tags=["agent", "safety", "gate"],
)

# Frontend Dev Node - Frontend implementation
traced_fe_dev_node = wrap_node(
    fe_dev_node,
    name="fe_dev_node",
    tags=["agent", "dev", "frontend"],
)

# Backend Dev Node - Backend implementation
traced_be_dev_node = wrap_node(
    be_dev_node,
    name="be_dev_node",
    tags=["agent", "dev", "backend"],
)

# Generic Dev Agent Node - Specialized dev agent
traced_dev_agent_node = wrap_node(
    dev_agent_node,
    name="dev_agent_node",
    tags=["agent", "dev", "specialized"],
)


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Core agent nodes
    "traced_cto_node",
    "traced_pm_node",
    "traced_dev_node",
    "traced_qa_node",
    "traced_supervisor_node",
    "traced_safety_gate_node",
    # Parallel dev agents
    "traced_fe_dev_node",
    "traced_be_dev_node",
    "traced_dev_agent_node",
]
