"""
WAVE Orchestrator Agent Nodes
Multi-agent system with CTO, PM, Dev, QA, and Supervisor roles
"""

from .cto import cto_node, CTO_SYSTEM_PROMPT
from .pm import pm_node, PM_SYSTEM_PROMPT
from .dev import dev_node, DEV_SYSTEM_PROMPT
from .qa import qa_node, QA_SYSTEM_PROMPT
from .supervisor import supervisor_node, SUPERVISOR_SYSTEM_PROMPT, route_to_agent

# All agent roles in the system
AGENT_ROLES = ("cto", "pm", "dev", "qa", "supervisor")

__all__ = [
    "cto_node",
    "pm_node",
    "dev_node",
    "qa_node",
    "supervisor_node",
    "route_to_agent",
    "AGENT_ROLES",
    "CTO_SYSTEM_PROMPT",
    "PM_SYSTEM_PROMPT",
    "DEV_SYSTEM_PROMPT",
    "QA_SYSTEM_PROMPT",
    "SUPERVISOR_SYSTEM_PROMPT",
]
