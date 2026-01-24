# WAVE v2.0 Hybrid Implementation Plan

**Version:** 1.0
**Date:** 2026-01-24
**Authors:** Claude Code + Grok (xAI)
**Status:** Approved for Implementation

---

## Executive Summary

This plan combines the **best architectural decisions from Grok** with the **safest migration strategy from Claude Code** to deliver a production-grade autonomous coding system in **16 weeks**.

| Source | Contribution |
|--------|--------------|
| **Grok** | Architecture, state schema, constitutional AI, gVisor, pygit2, Kubernetes |
| **Claude** | Phased timeline, rollback strategy, portal preservation, risk mitigation |

**Result:** A system that is safer, faster, and more scalable than WAVE v1, delivered with minimal risk.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WAVE v2.0 HYBRID ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    PORTAL LAYER (Preserved)                          │    │
│  │                                                                      │    │
│  │   React Dashboard ◄──► Node.js API ◄──► Supabase (metadata)         │    │
│  │                              │                                       │    │
│  │   Phase 3 Utilities:        │                                       │    │
│  │   • git-validator.js        │  REST + WebSocket                     │    │
│  │   • pattern-matcher.js      │                                       │    │
│  │   • state-persistence.js    ▼                                       │    │
│  └─────────────────────────────┬───────────────────────────────────────┘    │
│                                │                                             │
│  ┌─────────────────────────────┴───────────────────────────────────────┐    │
│  │                    ORCHESTRATION LAYER (New)                         │    │
│  │                                                                      │    │
│  │   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │    │
│  │   │   LangGraph  │◄──▶│    Redis     │◄──▶│    PostgreSQL        │  │    │
│  │   │  StateGraph  │    │   pub/sub    │    │   checkpoints        │  │    │
│  │   │              │    │   + cache    │    │   + audit trail      │  │    │
│  │   └──────┬───────┘    └──────────────┘    └──────────────────────┘  │    │
│  │          │                                                           │    │
│  │   ┌──────┴──────────────────────────────────────────────────────┐   │    │
│  │   │                    AGENT NODES                               │   │    │
│  │   │                                                              │   │    │
│  │   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │   │    │
│  │   │  │   CTO   │─▶│   PM    │─▶│   Dev   │─▶│   QA    │        │   │    │
│  │   │  │  Node   │  │  Node   │  │  Nodes  │  │  Node   │        │   │    │
│  │   │  └─────────┘  └─────────┘  └────┬────┘  └────┬────┘        │   │    │
│  │   │                                 │            │              │   │    │
│  │   │  ┌─────────────────────────────┐│  ┌────────┴────────┐     │   │    │
│  │   │  │   Constitutional Scorer     ││  │   Dev-Fix Node  │     │   │    │
│  │   │  │   (Safety Enforcement)      │◄──┤   (Retry Loop)  │     │   │    │
│  │   │  └─────────────────────────────┘│  └─────────────────┘     │   │    │
│  │   │                                 │                           │   │    │
│  │   │  ┌─────────────────────────────┴─────────────────────┐     │   │    │
│  │   │  │              CTO Master Supervisor                 │     │   │    │
│  │   │  │         (Cross-Domain Merge Authority)             │     │   │    │
│  │   │  └───────────────────────────────────────────────────┘     │   │    │
│  │   └──────────────────────────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    EXECUTION LAYER (New)                              │   │
│  │                                                                       │   │
│  │   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │   │
│  │   │   Anthropic  │    │    pygit2    │    │   gVisor Sandbox     │   │   │
│  │   │     SDK      │    │   GitTools   │    │   (per agent)        │   │   │
│  │   │              │    │              │    │                      │   │   │
│  │   │  Claude 3.5  │    │  Worktrees   │    │  Docker + runsc      │   │   │
│  │   │  Opus/Sonnet │    │  Commits     │    │  Isolated filesystem │   │   │
│  │   └──────────────┘    │  Conflicts   │    │  Network policies    │   │   │
│  │                       └──────────────┘    └──────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    OBSERVABILITY LAYER                                │   │
│  │                                                                       │   │
│  │   LangSmith Traces ◄──► Slack Webhooks ◄──► Supabase Audit Export    │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Component | Technology | Source |
|-------|-----------|------------|--------|
| Portal | Dashboard | React + TypeScript | Existing |
| Portal | API | Node.js + Express | Existing |
| Portal | Metadata | Supabase | Existing |
| Orchestration | Workflow | LangGraph | Grok |
| Orchestration | Cache/PubSub | Redis | Both |
| Orchestration | Checkpoints | PostgreSQL | Grok |
| Execution | LLM | Anthropic SDK | Grok |
| Execution | Git | pygit2 | Grok |
| Execution | Sandbox | gVisor + Docker | Grok |
| Safety | Enforcement | Constitutional AI | Grok |
| Observability | Traces | LangSmith | Grok |
| Observability | Alerts | Slack Webhooks | Both |

---

## State Schema (Production)

```python
# /orchestrator/state.py

from typing import Annotated, Literal, Optional
from typing_extensions import TypedDict
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class Phase(str, Enum):
    VALIDATE = "validate"
    PLAN = "plan"
    DEVELOP = "develop"
    QA = "qa"
    MERGE = "merge"
    DONE = "done"
    FAILED = "failed"

class EscalationLevel(str, Enum):
    NONE = "none"
    WARNING = "warning"
    CRITICAL = "critical"
    E_STOP = "e-stop"

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

# ═══════════════════════════════════════════════════════════════════════════════
# NESTED STATE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class BudgetTracking(BaseModel):
    """Token and cost tracking per story"""
    tokens_used: int = 0
    token_limit: int = 100_000
    cost_usd: float = 0.0
    cost_limit_usd: float = 10.0
    warning_threshold: float = 0.75  # 75%
    critical_threshold: float = 0.90  # 90%

    @property
    def percentage(self) -> float:
        return self.tokens_used / self.token_limit if self.token_limit > 0 else 0

    @property
    def is_warning(self) -> bool:
        return self.percentage >= self.warning_threshold

    @property
    def is_critical(self) -> bool:
        return self.percentage >= self.critical_threshold

class GitState(BaseModel):
    """Git worktree state for isolated development"""
    worktree_path: str = ""
    worktree_name: str = ""
    branch_name: str = ""
    base_branch: str = "main"
    commits: list[str] = Field(default_factory=list)
    has_conflicts: bool = False
    files_changed: list[str] = Field(default_factory=list)

class SafetyState(BaseModel):
    """Constitutional AI safety tracking"""
    violations: list[str] = Field(default_factory=list)
    constitutional_score: float = 1.0  # 0.0 = unsafe, 1.0 = fully compliant
    escalation_level: EscalationLevel = EscalationLevel.NONE
    emergency_stop: bool = False
    last_check_at: Optional[datetime] = None

class RetryState(BaseModel):
    """Retry tracking with backoff"""
    count: int = 0
    max_retries: int = 3
    last_error: Optional[str] = None
    backoff_seconds: int = 0

    @property
    def can_retry(self) -> bool:
        return self.count < self.max_retries

class Assignment(BaseModel):
    """Task assignment to agent"""
    agent: str  # fe-dev-1, fe-dev-2, be-dev-1, be-dev-2
    task: str
    files: list[str] = Field(default_factory=list)
    status: Literal["pending", "in_progress", "complete", "failed"] = "pending"

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN AGENT STATE
# ═══════════════════════════════════════════════════════════════════════════════

class AgentState(TypedDict):
    """
    Complete agent state for LangGraph orchestration.
    Combines Grok's comprehensive schema with WAVE concepts.
    """
    # ─────────────────────────────────────────────────────────────────────────
    # Core Identification
    # ─────────────────────────────────────────────────────────────────────────
    messages: Annotated[list, "add_messages"]
    project_id: str
    story_id: str
    wave_number: int
    domain: str  # authentication, dashboard, api, etc.

    # ─────────────────────────────────────────────────────────────────────────
    # Workflow State
    # ─────────────────────────────────────────────────────────────────────────
    phase: Phase
    gate: Gate  # 1-8 matching WAVE gates

    # ─────────────────────────────────────────────────────────────────────────
    # Human Interaction
    # ─────────────────────────────────────────────────────────────────────────
    needs_human: bool
    human_approved: bool
    human_feedback: Optional[str]

    # ─────────────────────────────────────────────────────────────────────────
    # RLM Compression (P-variable)
    # ─────────────────────────────────────────────────────────────────────────
    rlm_summary: str

    # ─────────────────────────────────────────────────────────────────────────
    # Nested State Objects
    # ─────────────────────────────────────────────────────────────────────────
    git: GitState
    budget: BudgetTracking
    safety: SafetyState
    retry: RetryState

    # ─────────────────────────────────────────────────────────────────────────
    # Assignments
    # ─────────────────────────────────────────────────────────────────────────
    assignments: list[Assignment]

    # ─────────────────────────────────────────────────────────────────────────
    # Timestamps
    # ─────────────────────────────────────────────────────────────────────────
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]


def create_initial_state(
    project_id: str,
    story_id: str,
    wave_number: int,
    domain: str,
    initial_message: str,
    rlm_summary: str = ""
) -> AgentState:
    """Factory function to create properly initialized state."""
    from langchain_core.messages import HumanMessage

    now = datetime.utcnow()

    return AgentState(
        messages=[HumanMessage(content=initial_message)],
        project_id=project_id,
        story_id=story_id,
        wave_number=wave_number,
        domain=domain,
        phase=Phase.VALIDATE,
        gate=Gate.STORY_ASSIGNED,
        needs_human=False,
        human_approved=False,
        human_feedback=None,
        rlm_summary=rlm_summary,
        git=GitState(),
        budget=BudgetTracking(),
        safety=SafetyState(),
        retry=RetryState(),
        assignments=[],
        created_at=now,
        updated_at=now,
        completed_at=None
    )
```

---

## Constitutional AI Scorer

```python
# /orchestrator/safety/constitutional.py

import json
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage
from ..state import AgentState, SafetyState, EscalationLevel

CONSTITUTIONAL_PRINCIPLES = """
## WAVE Constitutional Principles

### File Operations
1. NEVER delete files outside the assigned worktree
2. NEVER modify files in other agents' worktrees
3. NEVER write to /tmp, /etc, or system directories

### Git Operations
4. NEVER force push to main/master/develop
5. NEVER delete remote branches
6. NEVER rewrite history on shared branches
7. ALWAYS commit to feature branches only

### Security
8. NEVER expose API keys, secrets, or credentials in code
9. NEVER disable security features or authentication
10. NEVER add dependencies without version pinning

### Quality
11. ALWAYS run tests before marking development complete
12. NEVER reduce test coverage below baseline
13. NEVER introduce known security vulnerabilities

### Budget
14. NEVER exceed the allocated token budget
15. ALWAYS report token usage accurately

### Process
16. NEVER skip gates or bypass the workflow
17. NEVER merge without QA approval
18. ALWAYS preserve existing functionality unless explicitly changing it
"""

class ConstitutionalScorer:
    """
    Scores agent actions against constitutional principles.
    Returns compliance score and list of violations.
    """

    def __init__(self, model_name: str = "claude-3-5-sonnet-20241022"):
        self.model = ChatAnthropic(model=model_name, temperature=0)

    async def score(self, state: AgentState, action_description: str) -> SafetyState:
        """
        Score an action against constitutional principles.

        Args:
            state: Current agent state
            action_description: Description of the action to evaluate

        Returns:
            Updated SafetyState with score and violations
        """
        prompt = f"""
You are a Constitutional AI Safety Scorer for the WAVE autonomous coding system.

## Your Task
Evaluate the following agent action against our constitutional principles.

## Constitutional Principles
{CONSTITUTIONAL_PRINCIPLES}

## Current Context
- Story ID: {state['story_id']}
- Domain: {state['domain']}
- Phase: {state['phase']}
- Worktree: {state['git'].worktree_path}
- Budget Used: {state['budget'].percentage * 100:.1f}%

## Action to Evaluate
{action_description}

## Response Format
Return a JSON object with this exact structure:
{{
    "score": <float 0.0-1.0>,
    "violations": [<list of violated principle numbers>],
    "violation_details": [<list of detailed explanations>],
    "recommendation": "proceed" | "warn" | "block",
    "reasoning": "<brief explanation>"
}}

Where:
- score: 1.0 = fully compliant, 0.0 = critical violation
- recommendation:
  - "proceed": No issues, continue execution
  - "warn": Minor issue, log but continue
  - "block": Critical violation, halt and escalate
"""

        response = await self.model.ainvoke([HumanMessage(content=prompt)])

        try:
            result = json.loads(response.content)
        except json.JSONDecodeError:
            # If parsing fails, assume safe to proceed with warning
            return SafetyState(
                constitutional_score=0.8,
                violations=["Failed to parse constitutional check"],
                escalation_level=EscalationLevel.WARNING
            )

        # Map recommendation to escalation level
        escalation_map = {
            "proceed": EscalationLevel.NONE,
            "warn": EscalationLevel.WARNING,
            "block": EscalationLevel.CRITICAL
        }

        new_safety = SafetyState(
            constitutional_score=result.get("score", 1.0),
            violations=result.get("violation_details", []),
            escalation_level=escalation_map.get(
                result.get("recommendation", "proceed"),
                EscalationLevel.NONE
            ),
            emergency_stop=result.get("recommendation") == "block"
        )

        return new_safety


def create_constitutional_node(scorer: ConstitutionalScorer):
    """Factory to create a constitutional scoring node for LangGraph."""

    async def constitutional_node(state: AgentState) -> dict:
        """LangGraph node that scores the last action."""
        # Get the last message (the action to evaluate)
        last_message = state["messages"][-1]
        action_description = last_message.content

        # Score against constitutional principles
        new_safety = await scorer.score(state, action_description)

        # Determine if we need human intervention
        needs_human = new_safety.emergency_stop or state["needs_human"]

        return {
            "safety": new_safety,
            "needs_human": needs_human,
            "updated_at": datetime.utcnow()
        }

    return constitutional_node
```

---

## Git Tools (pygit2)

```python
# /orchestrator/tools/git_tools.py

import pygit2
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
from ..state import GitState

class GitTools:
    """
    Safe git operations using pygit2.
    All operations are confined to the project repository.
    """

    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path)
        self.repo = pygit2.Repository(str(self.repo_path))
        self.worktrees_dir = self.repo_path / "worktrees"

    # ═══════════════════════════════════════════════════════════════════════════
    # WORKTREE MANAGEMENT
    # ═══════════════════════════════════════════════════════════════════════════

    def create_worktree(
        self,
        story_id: str,
        agent_name: str,
        base_branch: str = "main"
    ) -> GitState:
        """
        Create an isolated worktree for an agent.

        Args:
            story_id: Story identifier (e.g., WAVE1-AUTH-001)
            agent_name: Agent name (e.g., fe-dev-1)
            base_branch: Branch to base worktree on

        Returns:
            GitState with worktree information
        """
        # Sanitize names
        worktree_name = f"{story_id}-{agent_name}".lower().replace(" ", "-")
        branch_name = f"feature/{worktree_name}"
        worktree_path = self.worktrees_dir / worktree_name

        # Ensure worktrees directory exists
        self.worktrees_dir.mkdir(parents=True, exist_ok=True)

        # Get base branch reference
        base_ref = self.repo.branches.get(base_branch)
        if not base_ref:
            raise ValueError(f"Base branch '{base_branch}' not found")

        base_commit = base_ref.peel()

        # Create branch if it doesn't exist
        if branch_name not in [b for b in self.repo.branches.local]:
            self.repo.branches.local.create(branch_name, base_commit)

        # Create worktree
        self.repo.add_worktree(worktree_name, str(worktree_path))

        # Checkout the branch in the worktree
        wt_repo = pygit2.Repository(str(worktree_path))
        branch_ref = wt_repo.branches.get(branch_name)
        wt_repo.checkout(branch_ref)

        return GitState(
            worktree_path=str(worktree_path),
            worktree_name=worktree_name,
            branch_name=branch_name,
            base_branch=base_branch,
            commits=[],
            has_conflicts=False,
            files_changed=[]
        )

    def cleanup_worktree(self, worktree_name: str) -> bool:
        """
        Remove a worktree after merge or abandonment.

        Args:
            worktree_name: Name of the worktree to remove

        Returns:
            True if cleanup successful
        """
        try:
            wt = self.repo.lookup_worktree(worktree_name)
            if wt:
                wt.prune(True)  # Force prune

            # Also remove the directory if it exists
            worktree_path = self.worktrees_dir / worktree_name
            if worktree_path.exists():
                import shutil
                shutil.rmtree(worktree_path)

            return True
        except Exception as e:
            print(f"Worktree cleanup error: {e}")
            return False

    # ═══════════════════════════════════════════════════════════════════════════
    # COMMIT OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════

    def commit(
        self,
        worktree_path: str,
        message: str,
        files: Optional[list[str]] = None
    ) -> str:
        """
        Stage and commit files in a worktree.

        Args:
            worktree_path: Path to the worktree
            message: Commit message
            files: List of files to stage (None = stage all changes)

        Returns:
            Commit SHA
        """
        wt_repo = pygit2.Repository(worktree_path)

        # Stage files
        if files:
            for f in files:
                wt_repo.index.add(f)
        else:
            wt_repo.index.add_all()

        wt_repo.index.write()

        # Create commit
        tree = wt_repo.index.write_tree()
        sig = pygit2.Signature("WAVE Agent", "agent@wave.local")

        parent = wt_repo.head.target
        commit_id = wt_repo.create_commit(
            "HEAD",
            sig,  # author
            sig,  # committer
            message,
            tree,
            [parent]
        )

        return str(commit_id)

    # ═══════════════════════════════════════════════════════════════════════════
    # CONFLICT DETECTION
    # ═══════════════════════════════════════════════════════════════════════════

    def check_conflicts(
        self,
        source_branch: str,
        target_branch: str = "main"
    ) -> tuple[bool, list[str]]:
        """
        Check if merging source into target would cause conflicts.

        Args:
            source_branch: Branch to merge from
            target_branch: Branch to merge into

        Returns:
            Tuple of (has_conflicts, list of conflicting files)
        """
        source_ref = self.repo.branches.get(source_branch)
        target_ref = self.repo.branches.get(target_branch)

        if not source_ref or not target_ref:
            raise ValueError("Branch not found")

        source_commit = source_ref.peel()
        target_commit = target_ref.peel()

        # Perform merge analysis
        merge_result, _ = self.repo.merge_analysis(source_commit.id)

        if merge_result & pygit2.GIT_MERGE_ANALYSIS_FASTFORWARD:
            return False, []

        # Try the merge to detect conflicts
        try:
            self.repo.merge(source_commit.id)
            index = self.repo.index

            conflicts = []
            if index.conflicts:
                for conflict in index.conflicts:
                    if conflict[0]:  # ancestor
                        conflicts.append(conflict[0].path)

            # Reset the merge
            self.repo.state_cleanup()

            return len(conflicts) > 0, conflicts

        except Exception as e:
            self.repo.state_cleanup()
            return True, [str(e)]

    # ═══════════════════════════════════════════════════════════════════════════
    # MERGE OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════

    def merge_to_main(
        self,
        source_branch: str,
        target_branch: str = "main",
        message: Optional[str] = None
    ) -> str:
        """
        Merge a feature branch into main.

        Args:
            source_branch: Branch to merge from
            target_branch: Branch to merge into
            message: Optional merge commit message

        Returns:
            Merge commit SHA
        """
        # First check for conflicts
        has_conflicts, conflict_files = self.check_conflicts(source_branch, target_branch)
        if has_conflicts:
            raise ValueError(f"Cannot merge: conflicts in {conflict_files}")

        source_ref = self.repo.branches.get(source_branch)
        target_ref = self.repo.branches.get(target_branch)

        source_commit = source_ref.peel()
        target_commit = target_ref.peel()

        # Checkout target branch
        self.repo.checkout(target_ref)

        # Perform merge
        self.repo.merge(source_commit.id)

        if message is None:
            message = f"Merge {source_branch} into {target_branch}"

        # Create merge commit
        sig = pygit2.Signature("WAVE Agent", "agent@wave.local")
        tree = self.repo.index.write_tree()

        merge_commit = self.repo.create_commit(
            "HEAD",
            sig,
            sig,
            message,
            tree,
            [target_commit.id, source_commit.id]
        )

        # Cleanup merge state
        self.repo.state_cleanup()

        return str(merge_commit)

    # ═══════════════════════════════════════════════════════════════════════════
    # STATUS OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════

    def get_changed_files(self, worktree_path: str) -> list[str]:
        """Get list of changed files in a worktree."""
        wt_repo = pygit2.Repository(worktree_path)
        status = wt_repo.status()

        changed = []
        for filepath, flags in status.items():
            if flags != pygit2.GIT_STATUS_CURRENT:
                changed.append(filepath)

        return changed

    def get_commit_count(self, branch_name: str, base_branch: str = "main") -> int:
        """Count commits on branch since it diverged from base."""
        branch_ref = self.repo.branches.get(branch_name)
        base_ref = self.repo.branches.get(base_branch)

        if not branch_ref or not base_ref:
            return 0

        # Find merge base
        merge_base = self.repo.merge_base(
            branch_ref.peel().id,
            base_ref.peel().id
        )

        # Count commits from merge base to branch tip
        count = 0
        for commit in self.repo.walk(branch_ref.peel().id, pygit2.GIT_SORT_TOPOLOGICAL):
            if commit.id == merge_base:
                break
            count += 1

        return count
```

---

## LangGraph Workflow

```python
# /orchestrator/graph.py

from typing import Literal
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.prebuilt import ToolNode

from .state import AgentState, Phase, Gate, EscalationLevel
from .nodes import (
    domain_cto_node,
    domain_pm_node,
    developer_node,
    qa_node,
    dev_fix_node,
    cto_master_node,
    human_review_node
)
from .safety.constitutional import ConstitutionalScorer, create_constitutional_node
from .tools.git_tools import GitTools
from .tools.file_tools import safe_file_tools
from .tools.shell_tools import safe_shell_tools

# ═══════════════════════════════════════════════════════════════════════════════
# ROUTING FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def route_after_cto(state: AgentState) -> Literal["domain_pm", "human_review"]:
    """Route after CTO validation."""
    if state["needs_human"]:
        return "human_review"
    if state["safety"].escalation_level == EscalationLevel.CRITICAL:
        return "human_review"
    return "domain_pm"

def route_after_dev(state: AgentState) -> Literal["constitutional", "human_review"]:
    """Route after development - always check constitutional."""
    if state["needs_human"]:
        return "human_review"
    return "constitutional"

def route_after_constitutional(state: AgentState) -> Literal["qa", "dev_fix", "human_review"]:
    """Route after constitutional check."""
    if state["safety"].emergency_stop:
        return "human_review"
    if state["safety"].escalation_level == EscalationLevel.CRITICAL:
        return "human_review"
    if state["safety"].escalation_level == EscalationLevel.WARNING:
        return "dev_fix"
    return "qa"

def route_after_qa(state: AgentState) -> Literal["cto_master", "dev_fix", "human_review"]:
    """Route after QA - retry or proceed."""
    if state["needs_human"]:
        return "human_review"
    if state["phase"] == Phase.FAILED:
        if state["retry"].can_retry:
            return "dev_fix"
        return "human_review"
    return "cto_master"

def route_after_human(state: AgentState) -> Literal["domain_pm", "dev_fix", "end"]:
    """Route after human review."""
    if not state["human_approved"]:
        return "end"
    if state["phase"] in [Phase.DEVELOP, Phase.QA]:
        return "dev_fix"
    return "domain_pm"

# ═══════════════════════════════════════════════════════════════════════════════
# GRAPH BUILDER
# ═══════════════════════════════════════════════════════════════════════════════

def build_wave_graph(
    db_connection_string: str,
    git_repo_path: str,
    anthropic_api_key: str
) -> StateGraph:
    """
    Build the complete WAVE v2 LangGraph workflow.

    Args:
        db_connection_string: PostgreSQL connection string
        git_repo_path: Path to the git repository
        anthropic_api_key: Anthropic API key

    Returns:
        Compiled LangGraph application
    """
    import os
    os.environ["ANTHROPIC_API_KEY"] = anthropic_api_key

    # Initialize tools
    git_tools = GitTools(git_repo_path)
    constitutional_scorer = ConstitutionalScorer()

    # Combine safe tools
    all_tools = safe_file_tools + safe_shell_tools
    tool_node = ToolNode(all_tools)

    # Build graph
    workflow = StateGraph(AgentState)

    # ─────────────────────────────────────────────────────────────────────────
    # ADD NODES
    # ─────────────────────────────────────────────────────────────────────────

    workflow.add_node("domain_cto", domain_cto_node)
    workflow.add_node("domain_pm", domain_pm_node)
    workflow.add_node("developer", developer_node)
    workflow.add_node("tools", tool_node)
    workflow.add_node("constitutional", create_constitutional_node(constitutional_scorer))
    workflow.add_node("qa", qa_node)
    workflow.add_node("dev_fix", dev_fix_node)
    workflow.add_node("cto_master", cto_master_node)
    workflow.add_node("human_review", human_review_node)

    # ─────────────────────────────────────────────────────────────────────────
    # ADD EDGES
    # ─────────────────────────────────────────────────────────────────────────

    # Start -> CTO validation
    workflow.add_edge(START, "domain_cto")

    # CTO -> PM or Human
    workflow.add_conditional_edges("domain_cto", route_after_cto)

    # PM -> Developer
    workflow.add_edge("domain_pm", "developer")

    # Developer -> Tools -> Constitutional
    workflow.add_edge("developer", "tools")
    workflow.add_conditional_edges("tools", route_after_dev)

    # Constitutional -> QA or Dev-Fix or Human
    workflow.add_conditional_edges("constitutional", route_after_constitutional)

    # QA -> CTO Master or Dev-Fix or Human
    workflow.add_conditional_edges("qa", route_after_qa)

    # Dev-Fix -> Developer (retry loop)
    workflow.add_edge("dev_fix", "developer")

    # CTO Master -> END
    workflow.add_edge("cto_master", END)

    # Human Review -> Continue or END
    workflow.add_conditional_edges("human_review", route_after_human)

    # ─────────────────────────────────────────────────────────────────────────
    # COMPILE WITH PERSISTENCE
    # ─────────────────────────────────────────────────────────────────────────

    checkpointer = PostgresSaver.from_conn_string(db_connection_string)

    app = workflow.compile(
        checkpointer=checkpointer,
        interrupt_before=["human_review"]  # Pause before human nodes
    )

    return app


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

async def run_story(
    app,
    project_id: str,
    story_id: str,
    wave_number: int,
    domain: str,
    story_description: str,
    rlm_summary: str = ""
) -> AgentState:
    """
    Execute a story through the WAVE workflow.

    Args:
        app: Compiled LangGraph application
        project_id: Project identifier
        story_id: Story identifier
        wave_number: Wave number
        domain: Domain (authentication, dashboard, etc.)
        story_description: Human description of the story
        rlm_summary: Previous context summary (P-variable)

    Returns:
        Final agent state
    """
    from .state import create_initial_state

    initial_state = create_initial_state(
        project_id=project_id,
        story_id=story_id,
        wave_number=wave_number,
        domain=domain,
        initial_message=story_description,
        rlm_summary=rlm_summary
    )

    config = {
        "configurable": {
            "thread_id": f"{project_id}-{story_id}"
        }
    }

    final_state = None
    async for event in app.astream(initial_state, config, stream_mode="values"):
        final_state = event
        # Emit to Redis pub/sub for real-time dashboard updates
        # await redis_client.publish(f"wave:{project_id}:{story_id}", json.dumps(event))

    return final_state
```

---

## 16-Week Implementation Timeline

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Core orchestration with basic agents

| Week | Deliverables | Exit Criteria |
|------|--------------|---------------|
| 1 | Project setup, dependencies, PostgreSQL/Redis | `docker-compose up` works |
| 2 | State schema, basic LangGraph skeleton | State passes Pydantic validation |
| 3 | CTO, PM, Dev nodes (Claude CLI subprocess) | Single story executes end-to-end |
| 4 | QA node, retry loop, basic routing | Retry loop works on failure |

**Rollback Point:** If Phase 1 fails, continue with bash orchestration.

```bash
# Phase 1 directory structure
/orchestrator/
├── __init__.py
├── state.py              # Week 2
├── graph.py              # Week 3-4
├── nodes/
│   ├── __init__.py
│   ├── cto.py            # Week 3
│   ├── pm.py             # Week 3
│   ├── developer.py      # Week 3
│   └── qa.py             # Week 4
├── tools/
│   └── claude_cli.py     # Week 3 (subprocess wrapper)
└── tests/
    ├── test_state.py     # Week 2
    └── test_graph.py     # Week 4
```

### Phase 2: Safety & Git (Weeks 5-8)

**Goal:** Constitutional AI and native git operations

| Week | Deliverables | Exit Criteria |
|------|--------------|---------------|
| 5 | Constitutional AI scorer node | Safety violations detected |
| 6 | pygit2 GitTools class | Worktree create/commit/cleanup works |
| 7 | Conflict detection, merge operations | Merge to main succeeds |
| 8 | Budget tracking in state, alerts | Budget warnings trigger |

**Rollback Point:** If Phase 2 fails, use Phase 1 with manual git.

```bash
# Phase 2 additions
/orchestrator/
├── safety/
│   ├── __init__.py
│   └── constitutional.py  # Week 5
├── tools/
│   ├── git_tools.py       # Week 6-7
│   └── budget.py          # Week 8
└── tests/
    ├── test_constitutional.py  # Week 5
    └── test_git_tools.py       # Week 6-7
```

### Phase 3: Portal Integration (Weeks 9-12)

**Goal:** Connect orchestrator to existing Portal

| Week | Deliverables | Exit Criteria |
|------|--------------|---------------|
| 9 | Redis pub/sub for state updates | Portal receives real-time events |
| 10 | Portal API `/api/orchestrator/*` endpoints | Start story from UI |
| 11 | LangSmith integration | Traces visible in dashboard |
| 12 | Slack notifications, Supabase audit | Alerts fire correctly |

**Rollback Point:** If Phase 3 fails, orchestrator works standalone.

```bash
# Phase 3: Portal additions
/portal/server/
├── routes/
│   └── orchestrator.js    # Week 10
├── services/
│   ├── redis-pubsub.js    # Week 9
│   └── langsmith.js       # Week 11
└── slack-notifier.js      # Week 12 (from existing plan)
```

### Phase 4: Production Hardening (Weeks 13-14)

**Goal:** gVisor sandboxing and Kubernetes deployment

| Week | Deliverables | Exit Criteria |
|------|--------------|---------------|
| 13 | gVisor sandbox per agent | Agents run in isolated containers |
| 14 | Kubernetes manifests, Helm chart | `helm install wave` works |

**Rollback Point:** If Phase 4 fails, run on Docker without gVisor.

```yaml
# Phase 4: Kubernetes
/deploy/
├── kubernetes/
│   ├── orchestrator-deployment.yaml
│   ├── agent-sandbox-pod.yaml
│   ├── redis-statefulset.yaml
│   └── postgres-statefulset.yaml
└── helm/
    └── wave/
        ├── Chart.yaml
        ├── values.yaml
        └── templates/
```

### Phase 5: Migration & Deprecation (Weeks 15-16)

**Goal:** Migrate WAVE prompts, deprecate bash

| Week | Deliverables | Exit Criteria |
|------|--------------|---------------|
| 15 | Port CLAUDE.md prompts, convert AI Stories | Prompts work in new system |
| 16 | Bash deprecation, documentation | No bash scripts in active use |

**Final Validation:**
- [ ] Run 3 stories through new system
- [ ] Compare output quality with WAVE v1
- [ ] Verify all 8 gates enforced
- [ ] Confirm budget tracking accurate
- [ ] Test crash recovery (kill mid-story, resume)

---

## Risk Mitigation Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LangGraph breaking changes | Medium | High | Pin version, test on upgrade |
| PostgreSQL performance | Low | Medium | Index checkpoints, connection pooling |
| gVisor compatibility | Medium | Medium | Fallback to Docker without gVisor |
| Anthropic SDK changes | Low | High | Abstract behind interface |
| Timeline overrun | Medium | Medium | Each phase is independently valuable |
| Portal integration issues | Low | Medium | Orchestrator works standalone |

---

## Success Metrics

| Metric | WAVE v1 (Bash) | WAVE v2 Target | Measurement |
|--------|----------------|----------------|-------------|
| Crash recovery time | ∞ (no recovery) | < 5 minutes | Time to resume after kill |
| State consistency | Race-prone | 100% ACID | Concurrent story test |
| Parallel stories | 1 | 5+ | Throughput benchmark |
| Test coverage | ~30% | 80%+ | pytest --cov |
| Safety violations | Manual review | 0 (blocked) | Constitutional scorer |
| Mean debug time | Hours | Minutes | Incident response |

---

## Appendix: Quick Start Commands

```bash
# Clone and setup
git clone <repo>
cd wave-v2
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start infrastructure
docker-compose up -d postgres redis

# Run database migrations
alembic upgrade head

# Run tests
pytest orchestrator/tests/ -v --cov

# Start single story (CLI)
python -m orchestrator.cli run \
  --project "my-project" \
  --story "WAVE1-AUTH-001" \
  --domain "authentication" \
  --description "Implement OAuth2 login"

# Start Portal with orchestrator
cd portal && npm run dev
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-24 | Claude + Grok | Initial hybrid plan |

---

*This is the unified WAVE v2.0 implementation plan combining the best of both approaches.*
