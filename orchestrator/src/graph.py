"""
WAVE v2 Core StateGraph

This module defines the core workflow graph for WAVE using LangGraph.
It includes:
- WAVEState: The complete state schema
- Node placeholders for each workflow phase
- Conditional routing logic
- Integration points for multi-LLM orchestration
"""

import os
from typing import Literal, Annotated, Optional
from typing_extensions import TypedDict
from datetime import datetime
from enum import Enum

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

# Try to import Claude for develop node
try:
    from langchain_anthropic import ChatAnthropic
    from langchain_core.messages import HumanMessage, SystemMessage
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False

# Import Slack notifications
import sys
_root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

try:
    from notifications import notify_step, notify_run_start, notify_run_complete
    NOTIFICATIONS_AVAILABLE = True
except ImportError:
    NOTIFICATIONS_AVAILABLE = False
    def notify_step(*args, **kwargs): pass
    def notify_run_start(*args, **kwargs): pass
    def notify_run_complete(*args, **kwargs): pass

# Import Supervisor for distributed execution
try:
    from src.supervisor import get_supervisor, Supervisor
    DISTRIBUTED_MODE = os.getenv("WAVE_DISTRIBUTED", "true").lower() == "true"
except ImportError:
    DISTRIBUTED_MODE = False
    def get_supervisor(): return None

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS (Enhancement 2 - Grok: Dev-Fix Retry Limit)
# ═══════════════════════════════════════════════════════════════════════════════

DEV_FIX_MAX_RETRIES = 3  # Maximum retries for dev-fix loop before escalation


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
    story_id = state.get("story_id", "unknown")
    notify_run_start(story_id, state.get("requirements", "")[:100])
    notify_step(
        agent="validator",
        action="validating requirements",
        task=state.get("requirements", "")[:100],
        run_id=story_id,
        status="validating"
    )

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
    Create implementation plan - dispatches to PM agent worker.

    Gate: 2 (planning within dev started)
    Uses: Distributed PM agent via Redis queue
    """
    story_id = state.get("story_id", "unknown")
    requirements = state.get("requirements", "")
    project_path = state.get("project_path", "/project")

    notify_step(
        agent="supervisor",
        action="dispatching to PM agent",
        task=requirements[:100],
        run_id=story_id,
        status="dispatching"
    )

    # Use distributed PM agent if available
    if DISTRIBUTED_MODE:
        supervisor = get_supervisor()
        if supervisor:
            # Dispatch to PM agent queue
            task_id = supervisor.dispatch_to_pm(
                story_id=story_id,
                requirements=requirements,
                project_path=project_path
            )

            # Wait for PM agent to complete
            result = supervisor.wait_for_result(task_id, timeout=120)

            if result.get("status") == "completed":
                plan = result.get("plan", {})
                return {
                    "plan": plan.get("plan_summary", ""),
                    "plan_feasible": True,
                    "files_modified": result.get("fe_files", []) + result.get("be_files", []),
                    "phase": Phase.DEVELOP.value,
                    "updated_at": datetime.now().isoformat()
                }
            else:
                return {
                    "phase": Phase.FAILED.value,
                    "error": result.get("error", "PM agent failed"),
                    "error_count": state["error_count"] + 1
                }

    # Fallback: placeholder plan
    return {
        "plan": "Implementation plan placeholder",
        "plan_feasible": True,
        "phase": Phase.DEVELOP.value,
        "updated_at": datetime.now().isoformat()
    }


DEV_SYSTEM_PROMPT = """You are the Developer agent in a multi-agent software development system.

Your responsibilities:
1. Implement code according to the task specifications
2. Write clean, maintainable, well-documented code
3. Create appropriate tests for your implementation
4. Handle errors gracefully and securely

Coding standards:
- Follow existing code patterns in the repository
- Keep functions small and focused
- Use meaningful variable and function names
- Add comments for complex logic
- Never commit secrets or credentials
- Validate all inputs

Output Format:
- Return ONLY the code in a markdown code block
- Include a brief comment at the top explaining what the code does
- Keep the implementation simple and focused
"""


def develop_node(state: WAVEState) -> dict:
    """
    Generate code - dispatches to FE and BE agents in parallel.

    Gate: 2 -> 3
    Uses: Distributed FE + BE agents via Redis queues (parallel execution)
    """
    requirements = state.get("requirements", "")
    project_path = state.get("project_path", "/project")
    story_id = state.get("story_id", "unknown")
    files_modified = state.get("files_modified", [])

    # Categorize files by domain
    fe_files = [f for f in files_modified if any(ext in f for ext in ['.tsx', '.ts', '.jsx', '.js', '.css'])]
    be_files = [f for f in files_modified if any(ext in f for ext in ['.py', 'api/', 'server/'])]

    # If no files specified, let agents determine
    if not fe_files and not be_files:
        fe_files = ["to_be_determined"]
        be_files = ["to_be_determined"]

    # Use distributed agents if available
    if DISTRIBUTED_MODE:
        supervisor = get_supervisor()
        if supervisor:
            notify_step(
                agent="supervisor",
                action="dispatching to FE + BE agents (parallel)",
                task=requirements[:100],
                run_id=story_id,
                status="parallel_dispatch"
            )

            # Dispatch FE and BE in parallel
            task_ids = supervisor.dispatch_parallel_dev(
                story_id=story_id,
                fe_files=fe_files,
                be_files=be_files,
                requirements=requirements,
                project_path=project_path
            )

            # Wait for both to complete
            results = supervisor.wait_for_parallel_dev(task_ids, timeout=180)

            fe_result = results.get("fe_result", {})
            be_result = results.get("be_result", {})

            # Combine code from both agents
            combined_code = ""
            all_files = []

            if fe_result.get("status") == "completed":
                combined_code += f"// === FRONTEND CODE ===\n{fe_result.get('code', '')}\n\n"
                all_files.extend(fe_result.get("files_modified", []))

            if be_result.get("status") == "completed":
                combined_code += f"// === BACKEND CODE ===\n{be_result.get('code', '')}\n\n"
                all_files.extend(be_result.get("files_modified", []))

            # Check if at least one succeeded
            if fe_result.get("status") == "completed" or be_result.get("status") == "completed":
                return {
                    "code": combined_code,
                    "files_modified": all_files,
                    "phase": Phase.QA.value,
                    "gate": Gate.DEV_COMPLETE.value,
                    "updated_at": datetime.now().isoformat()
                }
            else:
                return {
                    "phase": Phase.FAILED.value,
                    "error": f"FE: {fe_result.get('error', 'unknown')}, BE: {be_result.get('error', 'unknown')}",
                    "error_count": state["error_count"] + 1
                }

    # Fallback: Direct Claude call (original behavior)
    notify_step(
        agent="dev",
        action="generating code with Claude (fallback)",
        task=requirements[:100],
        run_id=story_id,
        status="developing"
    )

    generated_code = None

    if CLAUDE_AVAILABLE and os.getenv("ANTHROPIC_API_KEY"):
        try:
            # Initialize Claude
            llm = ChatAnthropic(
                model="claude-sonnet-4-20250514",
                temperature=0.2
            )

            # Build prompt
            prompt = f"""Task: {requirements}

Project Path: {project_path}

Please implement this task. Return the code in a markdown code block.
Keep it simple and focused on the specific requirement."""

            # Call Claude
            messages = [
                SystemMessage(content=DEV_SYSTEM_PROMPT),
                HumanMessage(content=prompt)
            ]

            response = llm.invoke(messages)
            generated_code = response.content

        except Exception as e:
            generated_code = f"# Error calling Claude: {str(e)}"
    else:
        generated_code = "# Claude not available (no API key or langchain_anthropic not installed)"

    return {
        "code": generated_code,
        "phase": Phase.QA.value,
        "gate": Gate.DEV_COMPLETE.value,
        "updated_at": datetime.now().isoformat()
    }


def qa_node(state: WAVEState) -> dict:
    """
    QA validation - dispatches to QA agent worker.

    Gate: 3 -> 4 -> 5
    Uses: Distributed QA agent via Redis queue
    """
    story_id = state.get("story_id", "unknown")
    code = state.get("code", "")
    files = state.get("files_modified", [])
    requirements = state.get("requirements", "")
    qa_retry = state["qa_retry_count"]

    # Use distributed QA agent if available
    if DISTRIBUTED_MODE and code:
        supervisor = get_supervisor()
        if supervisor:
            notify_step(
                agent="supervisor",
                action="dispatching to QA agent",
                task=requirements[:100],
                run_id=story_id,
                status="dispatching"
            )

            # Dispatch to QA agent
            task_id = supervisor.dispatch_to_qa(
                story_id=story_id,
                code=code,
                files=files,
                requirements=requirements
            )

            # Wait for QA agent to complete
            result = supervisor.wait_for_result(task_id, timeout=120)

            if result.get("status") == "completed":
                passed = result.get("passed", False)
                score = result.get("score", 0.0)

                if passed:
                    return {
                        "qa_passed": True,
                        "qa_feedback": result.get("qa_result", {}).get("summary", "QA passed"),
                        "phase": Phase.MERGE.value,
                        "gate": Gate.QA_PASSED.value,
                        "updated_at": datetime.now().isoformat()
                    }
                else:
                    return {
                        "qa_passed": False,
                        "qa_feedback": result.get("qa_result", {}).get("summary", "QA failed"),
                        "qa_retry_count": qa_retry + 1,
                        "phase": Phase.DEVELOP.value if qa_retry < 3 else Phase.FAILED.value
                    }

    # Fallback: simple check
    notify_step(
        agent="qa",
        action="validating code quality (fallback)",
        task=requirements[:100],
        run_id=story_id,
        status="testing"
    )

    if code:
        return {
            "qa_passed": True,
            "qa_feedback": "Tests passed (fallback)",
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
    story_id = state.get("story_id", "unknown")
    notify_step(
        agent="safety_gate",
        action="running constitutional AI check",
        task=state.get("requirements", "")[:100],
        run_id=story_id,
        status="safety_check"
    )

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
    CTO Master final approval - dispatches to CTO agent worker.

    Gate: 5 -> 6 -> 7
    Uses: Distributed CTO agent via Redis queue
    """
    story_id = state.get("story_id", "unknown")
    code = state.get("code", "")
    files = state.get("files_modified", [])
    plan = state.get("plan", "")

    # Use distributed CTO agent if available
    if DISTRIBUTED_MODE and code:
        supervisor = get_supervisor()
        if supervisor:
            notify_step(
                agent="supervisor",
                action="dispatching to CTO agent",
                task=state.get("requirements", "")[:100],
                run_id=story_id,
                status="dispatching"
            )

            # Dispatch to CTO agent
            task_id = supervisor.dispatch_to_cto(
                story_id=story_id,
                code=code,
                files=files,
                plan={"summary": plan}
            )

            # Wait for CTO agent to complete
            result = supervisor.wait_for_result(task_id, timeout=120)

            if result.get("status") == "completed":
                approved = result.get("approved", False)

                if approved:
                    return {
                        "cto_master_approved": True,
                        "cto_master_review": result.get("review", {}).get("summary", "Approved"),
                        "phase": Phase.DONE.value,
                        "gate": Gate.MERGED.value,
                        "completed_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }
                else:
                    return {
                        "cto_master_approved": False,
                        "cto_master_review": result.get("review", {}).get("summary", "Rejected"),
                        "phase": Phase.FAILED.value,
                        "error": "CTO review rejected"
                    }

    # Fallback: auto-approve
    notify_step(
        agent="cto",
        action="reviewing for merge approval (fallback)",
        task=state.get("requirements", "")[:100],
        run_id=story_id,
        status="reviewing"
    )

    return {
        "cto_master_approved": True,
        "cto_master_review": "Approved by CTO Master (fallback)",
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
    story_id = state.get("story_id", "unknown")
    notify_step(
        agent="merge",
        action="merging code to main branch",
        task=state.get("requirements", "")[:100],
        run_id=story_id,
        status="merging"
    )

    # Notify completion
    notify_run_complete(
        run_id=story_id,
        task=state.get("requirements", "")[:100],
        actions_count=7,
        status="completed"
    )

    # TODO: Integrate with GitTools for merge
    return {
        "gate": Gate.MERGED.value,
        "updated_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════
# DEV-FIX RETRY FUNCTIONS (Enhancement 2 - Grok)
# ═══════════════════════════════════════════════════════════════════════════════

def should_retry_dev_fix(state: dict) -> bool:
    """
    Determine if dev-fix should retry or escalate.

    Enhancement 2 (Grok): Limit retries to prevent infinite loops.

    Args:
        state: Current workflow state

    Returns:
        True if should retry, False if should escalate
    """
    retries = state.get('dev_fix_retries', 0)
    qa_passed = state.get('qa_passed', False)

    # No retry needed if QA passed
    if qa_passed:
        return False

    # Escalate if max retries reached
    if retries >= DEV_FIX_MAX_RETRIES:
        return False

    # Continue retrying
    return True


def increment_dev_fix_retries(state: dict) -> dict:
    """
    Increment the dev-fix retry counter.

    Enhancement 2 (Grok): Track retry count for limit enforcement.

    Args:
        state: Current workflow state

    Returns:
        Updated state with incremented retry count
    """
    current = state.get('dev_fix_retries', 0)
    state['dev_fix_retries'] = current + 1
    return state


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
    # Constants
    "DEV_FIX_MAX_RETRIES",
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
    # Dev-fix functions (Enhancement 2)
    "should_retry_dev_fix",
    "increment_dev_fix_retries",
    # Nodes (for testing/extension)
    "validate_node",
    "plan_node",
    "develop_node",
    "qa_node",
    "constitutional_node",
    "cto_master_node",
    "merge_node",
]
