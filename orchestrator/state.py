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

from typing import TypedDict, List, Optional, Any, Literal, Dict
from langchain_core.messages import BaseMessage

from src.retry.retry_state import RetryState, create_retry_state
from tools.p_variable import load_p_variable, load_rlm_config, get_project_context
from tools.story_loader import load_stories


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

    # P Variable / RLM context
    p_variable: Optional[Dict[str, Any]]
    rlm_config: Optional[Dict[str, Any]]
    project_context: str

    # Retry state (Phase 3: Dev-Fix Loop)
    retry: RetryState

    # QA result tracking (Phase 3: Dev-Fix Loop)
    qa_passed: bool
    qa_feedback: str

    # Stories from Supabase (SOURCE OF TRUTH)
    stories: List[Dict[str, Any]]
    story_ids: List[str]  # Specific story IDs to process
    current_story: Optional[Dict[str, Any]]  # Active story being worked on


def create_initial_state(
    run_id: str,
    task: str,
    repo_path: str = "",
    branch: str = "main",
    token_limit: int = 100000,
    cost_limit_usd: float = 10.0,
    project_id: str = "",
    wave_number: int = 1,
    story_ids: List[str] = None
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
        project_id: Supabase project ID for story loading
        wave_number: Wave number for story loading
        story_ids: Optional list of specific story IDs to process

    Returns:
        Initialized WAVEState
    """
    # Load P Variable (RLM context) if repo_path provided
    p_variable = None
    rlm_config = None
    project_context = ""

    if repo_path:
        p_variable = load_p_variable(repo_path)
        rlm_config = load_rlm_config(repo_path)
        if p_variable:
            project_context = get_project_context(p_variable)
            print(f"[RLM] P Variable loaded for {repo_path}")

    # Load stories from Supabase (SOURCE OF TRUTH) with filesystem fallback
    stories = []
    if repo_path or project_id:
        stories = load_stories(
            project_id=project_id,
            repo_path=repo_path,
            wave_number=wave_number,
            story_ids=story_ids or []
        )
        source = stories[0].get('_source', 'unknown') if stories else 'none'
        print(f"[STORIES] Loaded {len(stories)} stories from {source}")

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
        rlm_summary="",
        p_variable=p_variable,
        rlm_config=rlm_config,
        project_context=project_context,
        retry=create_retry_state(),
        qa_passed=False,
        qa_feedback="",
        stories=stories,
        story_ids=story_ids or [],
        current_story=stories[0] if stories else None
    )
