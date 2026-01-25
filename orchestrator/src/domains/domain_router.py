"""
Domain Router Module
Analyzes tasks to determine relevant domains and routes to sub-graphs.

Based on Grok's Hierarchical Supervisor Pattern:
- Analyze story/task to detect which domains are involved
- Route execution to appropriate domain sub-graphs
- Coordinate multi-domain tasks
"""

from typing import List
import re
from langgraph.graph.state import CompiledStateGraph

from .domain_graph import SUPPORTED_DOMAINS, compile_domain_subgraph


# Domain keyword patterns for detection
DOMAIN_PATTERNS = {
    "auth": [
        r"\bauth(?:entication|orization)?\b",
        r"\blogin\b",
        r"\blogout\b",
        r"\bsession[s]?\b",
        r"\bpassword\b",
        r"\boauth\b",
        r"\btoken[s]?\b",
        r"\bjwt\b",
        r"\bsign[- ]?(?:in|up|out)\b",
        r"\buser[- ]?(?:auth|access)\b",
        r"\bpermission[s]?\b",
        r"\brole[s]?\b",
        r"\baccess[- ]?control\b",
    ],
    "payments": [
        r"\bpay(?:ment|ments)?\b",
        r"\bbilling\b",
        r"\bstripe\b",
        r"\bpaypal\b",
        r"\binvoice[s]?\b",
        r"\bsubscription[s]?\b",
        r"\bcheckout\b",
        r"\bcredit[- ]?card\b",
        r"\btransaction[s]?\b",
        r"\bprice[s]?\b",
        r"\bpurchase\b",
        r"\brefund\b",
    ],
    "profile": [
        r"\bprofile\b",
        r"\buser[- ]?(?:profile|settings|preferences)\b",
        r"\bsettings\b",
        r"\bpreferences\b",
        r"\baccount[- ]?(?:settings|page|details)\b",
        r"\bavatar\b",
        r"\buser[- ]?info\b",
    ],
    "api": [
        r"\bapi\b",
        r"\bendpoint[s]?\b",
        r"\brest(?:ful)?\b",
        r"\bgraphql\b",
        r"\broute[s]?\b",
        r"\brequest[s]?\b",
        r"\bresponse[s]?\b",
        r"\bhttp\b",
        r"\bwebhook[s]?\b",
        r"\bcontroller[s]?\b",
    ],
    "ui": [
        r"\bui\b",
        r"\bfrontend\b",
        r"\bcomponent[s]?\b",
        r"\breact\b",
        r"\bvue\b",
        r"\bangular\b",
        r"\bpage[s]?\b",
        r"\bdashboard\b",
        r"\bform[s]?\b",
        r"\bbutton[s]?\b",
        r"\bmodal\b",
        r"\blayout\b",
        r"\bstyle[s]?\b",
        r"\bcss\b",
        r"\bhtml\b",
    ],
    "data": [
        r"\bdatabase\b",
        r"\bdb\b",
        r"\bmigration[s]?\b",
        r"\bschema\b",
        r"\bquery\b",
        r"\bsql\b",
        r"\bpostgres(?:ql)?\b",
        r"\bmysql\b",
        r"\bmongodb?\b",
        r"\bmodel[s]?\b",
        r"\btable[s]?\b",
        r"\borm\b",
        r"\bprisma\b",
        r"\bsupabase\b",
    ],
}


def analyze_story_domains(task: str) -> List[str]:
    """
    Analyze a task/story description to detect relevant domains.

    Uses keyword pattern matching to identify which domains
    are involved in the task.

    Args:
        task: Task or story description text

    Returns:
        List of detected domain names (e.g., ["auth", "payments"])
    """
    if not task:
        return []

    task_lower = task.lower()
    detected_domains = []

    for domain, patterns in DOMAIN_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, task_lower, re.IGNORECASE):
                if domain not in detected_domains:
                    detected_domains.append(domain)
                break  # Found match for this domain, move to next

    return detected_domains


def route_to_domain(domain: str, checkpointer=None) -> CompiledStateGraph:
    """
    Get a compiled domain sub-graph for execution.

    Args:
        domain: Domain name to route to
        checkpointer: Optional checkpointer for state persistence

    Returns:
        Compiled domain sub-graph ready for execution

    Raises:
        ValueError: If domain is not supported
    """
    if domain not in SUPPORTED_DOMAINS:
        raise ValueError(f"Unsupported domain: {domain}. Must be one of {SUPPORTED_DOMAINS}")

    return compile_domain_subgraph(domain, checkpointer=checkpointer)


def get_primary_domain(task: str) -> str:
    """
    Get the primary (first detected) domain for a task.

    Args:
        task: Task description

    Returns:
        Primary domain name or empty string if none detected
    """
    domains = analyze_story_domains(task)
    return domains[0] if domains else ""


__all__ = [
    "analyze_story_domains",
    "route_to_domain",
    "get_primary_domain",
    "DOMAIN_PATTERNS",
]
