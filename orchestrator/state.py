"""
WAVE Orchestrator State Schema
TypedDict models for LangGraph state management

Classes:
- GitState: Git worktree tracking
- BudgetState: Token/cost tracking
- SafetyState: Constitutional AI state
- GateState: Gate progression
- AgentAction: Agent action record
- WAVEState: Master state for LangGraph
"""

from typing import TypedDict, List, Optional, Any, Literal
from langchain_core.messages import BaseMessage


class GitState(TypedDict):
    """Git repository state tracking"""
    repo_path: str
    branch: str
    base_commit: str
    current_commit: str


class BudgetState(TypedDict):
    """Token and cost budget tracking"""
    token_limit: int
    tokens_used: int
    cost_limit_usd: float
    cost_used_usd: float


class SafetyState(TypedDict):
    """Constitutional AI safety state"""
    constitutional_score: float
    violations: List[str]
    human_approved: bool


class GateState(TypedDict):
    """Gate review state"""
    gate_number: int
    passed: bool
    criteria: List[str]


class AgentAction(TypedDict):
    """Record of an agent action"""
    agent: str
    action_type: str
    timestamp: str
    details: dict


# Status type for run state
RunStatus = Literal["pending", "running", "paused", "completed", "failed", "cancelled"]


class WAVEState(TypedDict):
    """
    Master state for WAVE orchestrator.

    This is the main state object passed between LangGraph nodes.
    All fields should be immutable - create new state objects when updating.
    """
    # Run identification
    run_id: str
    task: str

    # LangGraph message history
    messages: List[BaseMessage]

    # Current agent in execution
    current_agent: Optional[str]

    # Domain tracking (Phase 1: Hierarchical Supervisor)
    domain: str

    # Nested state objects
    git: GitState
    budget: BudgetState
    safety: SafetyState
    gates: List[GateState]

    # Action history
    actions: List[AgentAction]

    # Run status
    status: RunStatus

    # Retry tracking (Phase 1: Hierarchical Supervisor)
    retry_count: int

    # Human-in-the-loop flag (Phase 1: Hierarchical Supervisor)
    needs_human: bool

    # LLM-generated summary (Phase 1: Hierarchical Supervisor)
    rlm_summary: str


def create_initial_state(
    run_id: str,
    task: str,
    repo_path: str = "",
    branch: str = "main",
    token_limit: int = 100000,
    cost_limit_usd: float = 10.0
) -> WAVEState:
    """
    Factory function to create a new WAVEState with defaults.

    Args:
        run_id: Unique identifier for this run
        task: Task description
        repo_path: Path to git repository
        branch: Git branch name
        token_limit: Maximum tokens allowed
        cost_limit_usd: Maximum cost in USD

    Returns:
        Initialized WAVEState
    """
    return WAVEState(
        run_id=run_id,
        task=task,
        messages=[],
        current_agent=None,
        domain="",
        git=GitState(
            repo_path=repo_path,
            branch=branch,
            base_commit="",
            current_commit=""
        ),
        budget=BudgetState(
            token_limit=token_limit,
            tokens_used=0,
            cost_limit_usd=cost_limit_usd,
            cost_used_usd=0.0
        ),
        safety=SafetyState(
            constitutional_score=1.0,
            violations=[],
            human_approved=False
        ),
        gates=[],
        actions=[],
        status="pending",
        retry_count=0,
        needs_human=False,
        rlm_summary=""
    )
