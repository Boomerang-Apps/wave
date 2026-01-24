"""
WAVE v2 Core StateGraph

This module defines the core workflow graph for WAVE using LangGraph.
It includes:
- WAVEState: The complete state schema
- Node placeholders for each workflow phase
- Conditional routing logic
- Integration points for multi-LLM orchestration
"""

from typing import Literal, Annotated, Optional
from typing_extensions import TypedDict
from datetime import datetime
from enum import Enum

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class Phase(str, Enum):
    """WAVE workflow phases"""
    VALIDATE = "validate"
    PLAN = "plan"
    DEVELOP = "develop"
    QA = "qa"
    MERGE = "merge"
    DONE = "done"
    FAILED = "failed"


class Gate(int, Enum):
    """WAVE 8-gate system"""
    STORY_ASSIGNED = 1
    DEV_STARTED = 2
    DEV_COMPLETE = 3
    QA_STARTED = 4
    QA_PASSED = 5
    MERGE_READY = 6
    MERGED = 7
    DEPLOYED = 8


class EscalationLevel(str, Enum):
    """Safety escalation levels"""
    NONE = "none"
    WARNING = "warning"
    CRITICAL = "critical"
    E_STOP = "e-stop"


# ═══════════════════════════════════════════════════════════════════════════════
# NESTED STATE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class BudgetState(TypedDict):
    """Token and cost tracking per story"""
    tokens_used: int
    token_limit: int
    cost_usd: float
    cost_limit_usd: float


class GitState(TypedDict):
    """Git worktree state for isolated development"""
    worktree_path: str
    branch_name: str
    base_branch: str
    commits: list
    has_conflicts: bool
    files_changed: list


class SafetyState(TypedDict):
    """Constitutional AI safety tracking"""
    violations: list
    constitutional_score: float
    escalation_level: str
    emergency_stop: bool


class RetryState(TypedDict):
    """Retry tracking with backoff"""
    count: int
    max_retries: int
    last_error: str


# ═══════════════════════════════════════════════════════════════════════════════
# WAVE STATE SCHEMA
# ═══════════════════════════════════════════════════════════════════════════════

class WAVEState(TypedDict):
    """
    Complete state schema for WAVE v2 workflow.

    This state flows through all nodes and is persisted via PostgreSQL checkpoints.
    """
    # Core identifiers
    story_id: str
    project_path: str
    wave_number: int

    # Workflow tracking
    phase: str  # Phase enum value
    gate: int   # Gate enum value (1-8)

    # Messages (accumulator pattern)
    messages: Annotated[list, add_messages]

    # Requirements and planning
    requirements: str
    plan: str
    plan_feasible: bool

    # Code artifacts
    code: str
    files_modified: list

    # Test results
    test_results: str
    test_passed: bool

    # QA tracking
    qa_feedback: str
    qa_passed: bool
    qa_retry_count: int
    qa_provider: str  # "claude" or "grok"

    # CTO Master review
    cto_master_approved: bool
    cto_master_review: str

    # Budget tracking
    budget: BudgetState

    # Git state
    git: GitState

    # Safety state
    safety: SafetyState

    # Retry state
    retry: RetryState

    # Timestamps
    started_at: str
    updated_at: str
    completed_at: Optional[str]

    # Error tracking
    error: Optional[str]
    error_count: int


# ═══════════════════════════════════════════════════════════════════════════════
# DEFAULT STATE FACTORY
# ═══════════════════════════════════════════════════════════════════════════════

def create_initial_state(
    story_id: str,
    project_path: str,
    wave_number: int = 1,
    requirements: str = "",
    token_limit: int = 100_000,
    cost_limit_usd: float = 10.0
) -> WAVEState:
    """Create initial state for a new story."""
    now = datetime.now().isoformat()

    return WAVEState(
        # Core identifiers
        story_id=story_id,
        project_path=project_path,
        wave_number=wave_number,

        # Workflow tracking
        phase=Phase.VALIDATE.value,
        gate=Gate.STORY_ASSIGNED.value,

        # Messages
        messages=[],

        # Requirements and planning
        requirements=requirements,
        plan="",
        plan_feasible=False,

        # Code artifacts
        code="",
        files_modified=[],

        # Test results
        test_results="",
        test_passed=False,

        # QA tracking
        qa_feedback="",
        qa_passed=False,
        qa_retry_count=0,
        qa_provider="claude",

        # CTO Master review
        cto_master_approved=False,
        cto_master_review="",

        # Budget tracking
        budget=BudgetState(
            tokens_used=0,
            token_limit=token_limit,
            cost_usd=0.0,
            cost_limit_usd=cost_limit_usd
        ),

        # Git state
        git=GitState(
            worktree_path="",
            branch_name="",
            base_branch="main",
            commits=[],
            has_conflicts=False,
            files_changed=[]
        ),

        # Safety state
        safety=SafetyState(
            violations=[],
            constitutional_score=1.0,
            escalation_level=EscalationLevel.NONE.value,
            emergency_stop=False
        ),

        # Retry state
        retry=RetryState(
            count=0,
            max_retries=3,
            last_error=""
        ),

        # Timestamps
        started_at=now,
        updated_at=now,
        completed_at=None,

        # Error tracking
        error=None,
        error_count=0
    )


# ═══════════════════════════════════════════════════════════════════════════════
# NODE PLACEHOLDERS
# ═══════════════════════════════════════════════════════════════════════════════

def validate_node(state: WAVEState) -> dict:
    """
    Validate story requirements and setup.

    Gate: 1 -> 2
    Checks:
    - Story ID is valid
    - Requirements are present
    - Budget is available
    - Safety check passes
    """
    # TODO: Implement validation logic
    # For now, pass through if requirements exist
    if state["requirements"]:
        return {
            "phase": Phase.PLAN.value,
            "gate": Gate.DEV_STARTED.value,
            "updated_at": datetime.now().isoformat()
        }
    else:
        return {
            "phase": Phase.FAILED.value,
            "error": "No requirements provided",
            "error_count": state["error_count"] + 1
        }


def plan_node(state: WAVEState) -> dict:
    """
    Create implementation plan using Grok for feasibility.

    Gate: 2 (planning within dev started)
    Uses: Grok for truthful feasibility assessment
    """
    # TODO: Integrate with MultiLLMOrchestrator.planning_node
    return {
        "plan": "Implementation plan placeholder",
        "plan_feasible": True,
        "phase": Phase.DEVELOP.value,
        "updated_at": datetime.now().isoformat()
    }


def develop_node(state: WAVEState) -> dict:
    """
    Generate code using Claude.

    Gate: 2 -> 3
    Uses: Claude for creative coding
    """
    # TODO: Integrate with Claude developer agent
    return {
        "code": "# Generated code placeholder",
        "phase": Phase.QA.value,
        "gate": Gate.DEV_COMPLETE.value,
        "updated_at": datetime.now().isoformat()
    }


def qa_node(state: WAVEState) -> dict:
    """
    QA validation with Claude -> Grok fallback.

    Gate: 3 -> 4 -> 5
    Uses: Claude primary, Grok fallback after 2 failures
    """
    # TODO: Integrate with MultiLLMOrchestrator.qa_node
    qa_retry = state["qa_retry_count"]

    if state["code"]:
        return {
            "qa_passed": True,
            "qa_feedback": "Tests passed",
            "phase": Phase.MERGE.value,
            "gate": Gate.QA_PASSED.value,
            "updated_at": datetime.now().isoformat()
        }
    else:
        return {
            "qa_passed": False,
            "qa_feedback": "No code to test",
            "qa_retry_count": qa_retry + 1,
            "phase": Phase.DEVELOP.value if qa_retry < 3 else Phase.FAILED.value
        }


def constitutional_node(state: WAVEState) -> dict:
    """
    Safety check using Grok Constitutional AI.

    Runs: Before any destructive action
    Uses: Grok for strict safety scoring
    """
    # TODO: Integrate with MultiLLMOrchestrator.constitutional_node
    return {
        "safety": SafetyState(
            violations=state["safety"]["violations"],
            constitutional_score=1.0,
            escalation_level=EscalationLevel.NONE.value,
            emergency_stop=False
        )
    }


def cto_master_node(state: WAVEState) -> dict:
    """
    CTO Master final approval using Grok.

    Gate: 5 -> 6 -> 7
    Uses: Grok for truthful merge approval
    """
    # TODO: Integrate with MultiLLMOrchestrator.cto_master_node
    return {
        "cto_master_approved": True,
        "cto_master_review": "Approved by CTO Master",
        "phase": Phase.DONE.value,
        "gate": Gate.MERGED.value,
        "completed_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }


def merge_node(state: WAVEState) -> dict:
    """
    Execute merge after CTO approval.

    Gate: 6 -> 7
    """
    # TODO: Integrate with GitTools for merge
    return {
        "gate": Gate.MERGED.value,
        "updated_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTING FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def route_from_validate(state: WAVEState) -> str:
    """Route after validation."""
    if state["phase"] == Phase.FAILED.value:
        return "failed"
    if state["safety"]["emergency_stop"]:
        return "failed"
    return "plan"


def route_from_qa(state: WAVEState) -> str:
    """Route after QA - retry or proceed."""
    if state["qa_passed"]:
        return "cto_master"
    if state["qa_retry_count"] >= state["retry"]["max_retries"]:
        return "failed"
    return "develop"  # Retry


def route_from_cto(state: WAVEState) -> str:
    """Route after CTO review."""
    if state["cto_master_approved"]:
        return "merge"
    return "failed"


# ═══════════════════════════════════════════════════════════════════════════════
# GRAPH BUILDER
# ═══════════════════════════════════════════════════════════════════════════════

def create_wave_graph() -> StateGraph:
    """
    Create the core WAVE StateGraph.

    Workflow:
    START -> validate -> plan -> develop -> qa -> cto_master -> merge -> END
                                    ^         |
                                    |_________|  (retry loop)

    Returns:
        Compiled StateGraph ready for execution
    """
    graph = StateGraph(WAVEState)

    # Add nodes
    graph.add_node("validate", validate_node)
    graph.add_node("plan", plan_node)
    graph.add_node("develop", develop_node)
    graph.add_node("qa", qa_node)
    graph.add_node("constitutional", constitutional_node)
    graph.add_node("cto_master", cto_master_node)
    graph.add_node("merge", merge_node)

    # Add edges
    graph.add_edge(START, "validate")

    # Validate -> Plan or Failed
    graph.add_conditional_edges(
        "validate",
        route_from_validate,
        {"plan": "plan", "failed": END}
    )

    # Plan -> Develop
    graph.add_edge("plan", "develop")

    # Develop -> QA (with constitutional check)
    graph.add_edge("develop", "constitutional")
    graph.add_edge("constitutional", "qa")

    # QA -> CTO Master or Retry or Failed
    graph.add_conditional_edges(
        "qa",
        route_from_qa,
        {"cto_master": "cto_master", "develop": "develop", "failed": END}
    )

    # CTO Master -> Merge or Failed
    graph.add_conditional_edges(
        "cto_master",
        route_from_cto,
        {"merge": "merge", "failed": END}
    )

    # Merge -> END
    graph.add_edge("merge", END)

    return graph


def compile_wave_graph(checkpointer=None):
    """
    Compile the WAVE graph with optional checkpointer.

    Args:
        checkpointer: Optional PostgresSaver for crash recovery

    Returns:
        Compiled graph ready for invoke()
    """
    graph = create_wave_graph()

    if checkpointer:
        return graph.compile(checkpointer=checkpointer)
    else:
        return graph.compile()


# ═══════════════════════════════════════════════════════════════════════════════
# VISUALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

def get_graph_diagram() -> str:
    """
    Generate ASCII diagram of the WAVE graph.

    Returns:
        String diagram for display
    """
    return """
    WAVE v2 StateGraph
    ==================

    ┌─────────┐
    │  START  │
    └────┬────┘
         │
         ▼
    ┌─────────────┐
    │  validate   │──────────────┐
    └──────┬──────┘              │
           │                     │ (failed)
           ▼                     │
    ┌─────────────┐              │
    │    plan     │              │
    └──────┬──────┘              │
           │                     │
           ▼                     │
    ┌─────────────┐              │
    │   develop   │◄─────────┐   │
    └──────┬──────┘          │   │
           │                 │   │
           ▼                 │   │
    ┌─────────────────┐      │   │
    │ constitutional  │      │   │
    └──────┬──────────┘      │   │
           │                 │   │
           ▼                 │   │
    ┌─────────────┐          │   │
    │     qa      │──────────┘   │
    └──────┬──────┘   (retry)    │
           │                     │
           ▼                     │
    ┌─────────────┐              │
    │ cto_master  │──────────────┤
    └──────┬──────┘              │
           │                     │
           ▼                     │
    ┌─────────────┐              │
    │    merge    │              │
    └──────┬──────┘              │
           │                     │
           ▼                     ▼
    ┌─────────┐           ┌─────────┐
    │   END   │           │ FAILED  │
    └─────────┘           └─────────┘

    Multi-LLM Routing:
    - validate:      Claude (requirements)
    - plan:          Grok (feasibility)
    - develop:       Claude (coding)
    - constitutional: Grok (safety)
    - qa:            Claude → Grok (fallback)
    - cto_master:    Grok (approval)
    - merge:         GitTools (pygit2)
    """


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Enums
    "Phase",
    "Gate",
    "EscalationLevel",
    # State types
    "WAVEState",
    "BudgetState",
    "GitState",
    "SafetyState",
    "RetryState",
    # Functions
    "create_initial_state",
    "create_wave_graph",
    "compile_wave_graph",
    "get_graph_diagram",
    # Nodes (for testing/extension)
    "validate_node",
    "plan_node",
    "develop_node",
    "qa_node",
    "constitutional_node",
    "cto_master_node",
    "merge_node",
]
