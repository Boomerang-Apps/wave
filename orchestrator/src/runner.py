"""
WAVE v2 End-to-End Workflow Runner
==================================

Provides a complete workflow execution engine that:
1. Coordinates all components (graph, nodes, safety, git)
2. Manages state through all 8 gates
3. Handles errors and escalations
4. Reports progress via pub/sub and Slack
"""

import os
import sys
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List, Callable

# Local imports
try:
    from src.graph import (
        WAVEState,
        Phase,
        Gate,
        EscalationLevel,
        create_initial_state,
        compile_wave_graph,
    )
    from src.persistence import create_checkpointer, generate_thread_id
    from src.safety.constitutional import ConstitutionalChecker, ESTOP
    from src.safety.budget import BudgetTracker, BudgetAlertLevel
    from src.api.redis_pubsub import (
        MemoryPubSub,
        WorkflowEvent,
        EventType,
        get_pubsub,
    )
    from src.api.slack import SlackNotifier, get_notifier
except ImportError:
    # Fallback for direct execution
    _src_dir = os.path.dirname(os.path.abspath(__file__))
    if _src_dir not in sys.path:
        sys.path.insert(0, _src_dir)
    from graph import (
        WAVEState,
        Phase,
        Gate,
        EscalationLevel,
        create_initial_state,
        compile_wave_graph,
    )
    from persistence import create_checkpointer, generate_thread_id
    from safety.constitutional import ConstitutionalChecker, ESTOP
    from safety.budget import BudgetTracker, BudgetAlertLevel
    from api.redis_pubsub import (
        MemoryPubSub,
        WorkflowEvent,
        EventType,
        get_pubsub,
    )
    from api.slack import SlackNotifier, get_notifier


# ═══════════════════════════════════════════════════════════════════════════════
# TYPES
# ═══════════════════════════════════════════════════════════════════════════════

class RunnerStatus(str, Enum):
    """Workflow runner status."""
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    ESCALATED = "escalated"


@dataclass
class RunnerConfig:
    """Configuration for workflow runner."""
    # Checkpointing
    use_memory_checkpointer: bool = True
    postgres_url: Optional[str] = None

    # Safety
    enable_constitutional: bool = True
    enable_budget_tracking: bool = True
    enable_estop: bool = True

    # Notifications
    enable_slack: bool = False
    enable_pubsub: bool = True

    # Execution
    max_retries: int = 3
    simulate_llm: bool = True  # Use simulation mode for testing

    # Callbacks
    on_gate_enter: Optional[Callable[[int, WAVEState], None]] = None
    on_gate_complete: Optional[Callable[[int, WAVEState], None]] = None
    on_error: Optional[Callable[[Exception, WAVEState], None]] = None


@dataclass
class RunnerResult:
    """Result from workflow execution."""
    success: bool
    thread_id: str
    story_id: str
    final_phase: str
    final_gate: int
    duration_seconds: float
    tokens_used: int
    cost_usd: float
    error: Optional[str] = None
    escalation: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "thread_id": self.thread_id,
            "story_id": self.story_id,
            "final_phase": self.final_phase,
            "final_gate": self.final_gate,
            "duration_seconds": self.duration_seconds,
            "tokens_used": self.tokens_used,
            "cost_usd": self.cost_usd,
            "error": self.error,
            "escalation": self.escalation,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# WORKFLOW RUNNER
# ═══════════════════════════════════════════════════════════════════════════════

class WorkflowRunner:
    """
    End-to-end workflow execution engine.

    Coordinates all WAVE components to execute a complete story
    through all 8 gates from requirements to merge.
    """

    def __init__(self, config: Optional[RunnerConfig] = None):
        """
        Initialize workflow runner.

        Args:
            config: Runner configuration
        """
        self.config = config or RunnerConfig()

        # Initialize components
        self._checkpointer = create_checkpointer(
            use_memory=self.config.use_memory_checkpointer
        )
        self._constitutional = ConstitutionalChecker() if self.config.enable_constitutional else None
        self._budget_tracker = BudgetTracker() if self.config.enable_budget_tracking else None
        self._pubsub = MemoryPubSub() if self.config.enable_pubsub else None
        self._notifier = SlackNotifier() if self.config.enable_slack else None

        # State tracking
        self._status = RunnerStatus.PENDING
        self._current_thread: Optional[str] = None
        self._start_time: Optional[datetime] = None

    @property
    def status(self) -> RunnerStatus:
        """Get current runner status."""
        return self._status

    def run(
        self,
        story_id: str,
        project_path: str,
        requirements: str,
        wave_number: int = 1,
        token_limit: int = 100_000,
        cost_limit_usd: float = 10.0,
    ) -> RunnerResult:
        """
        Execute a complete workflow for a story.

        Args:
            story_id: Story identifier
            project_path: Path to project
            requirements: Story requirements
            wave_number: Wave number
            token_limit: Token budget
            cost_limit_usd: Cost budget

        Returns:
            RunnerResult with execution details
        """
        self._start_time = datetime.now()
        self._status = RunnerStatus.RUNNING

        # Generate thread ID
        thread_id = generate_thread_id(story_id, wave_number)
        self._current_thread = thread_id

        # Create initial state
        state = create_initial_state(
            story_id=story_id,
            project_path=project_path,
            wave_number=wave_number,
            requirements=requirements,
            token_limit=token_limit,
            cost_limit_usd=cost_limit_usd,
        )

        # Publish start event
        self._publish_event(EventType.WORKFLOW_STARTED, thread_id, story_id, state)

        try:
            # Run through all gates
            final_state = self._execute_gates(state, thread_id)

            # Determine success
            success = final_state["phase"] == Phase.DONE.value
            error = final_state.get("error")

            # Publish completion event
            event_type = EventType.WORKFLOW_COMPLETE if success else EventType.WORKFLOW_FAILED
            self._publish_event(event_type, thread_id, story_id, final_state)

            self._status = RunnerStatus.COMPLETED if success else RunnerStatus.FAILED

            return RunnerResult(
                success=success,
                thread_id=thread_id,
                story_id=story_id,
                final_phase=final_state["phase"],
                final_gate=final_state["gate"],
                duration_seconds=self._get_duration(),
                tokens_used=final_state.get("budget", {}).get("tokens_used", 0),
                cost_usd=final_state.get("budget", {}).get("cost_usd", 0.0),
                error=error,
            )

        except Exception as e:
            self._status = RunnerStatus.FAILED
            self._publish_event(EventType.WORKFLOW_FAILED, thread_id, story_id, state)

            if self.config.on_error:
                self.config.on_error(e, state)

            return RunnerResult(
                success=False,
                thread_id=thread_id,
                story_id=story_id,
                final_phase=state.get("phase", "unknown"),
                final_gate=state.get("gate", 0),
                duration_seconds=self._get_duration(),
                tokens_used=state.get("budget", {}).get("tokens_used", 0),
                cost_usd=state.get("budget", {}).get("cost_usd", 0.0),
                error=str(e),
            )

    def _execute_gates(self, state: WAVEState, thread_id: str) -> WAVEState:
        """Execute workflow through all gates."""
        current_state = state
        config = {"configurable": {"thread_id": thread_id}}

        # Compile graph
        graph = compile_wave_graph(checkpointer=self._checkpointer)

        # In simulation mode, we manually advance through gates
        if self.config.simulate_llm:
            return self._simulate_execution(current_state, thread_id)

        # Real execution
        for gate in range(1, 9):
            # Check E-STOP
            if self.config.enable_estop and ESTOP.is_triggered():
                current_state["phase"] = Phase.FAILED.value
                current_state["error"] = "E-STOP triggered"
                break

            # Callback: gate enter
            if self.config.on_gate_enter:
                self.config.on_gate_enter(gate, current_state)

            # Publish gate enter event
            self._publish_event(EventType.GATE_ENTERED, thread_id, current_state["story_id"], current_state)

            # Execute graph step
            current_state = graph.invoke(current_state, config)

            # Check for failure
            if current_state["phase"] == Phase.FAILED.value:
                break

            # Callback: gate complete
            if self.config.on_gate_complete:
                self.config.on_gate_complete(gate, current_state)

            # Publish gate complete event
            self._publish_event(EventType.GATE_COMPLETE, thread_id, current_state["story_id"], current_state)

            # Check for completion
            if current_state["phase"] == Phase.DONE.value:
                break

        return current_state

    def _simulate_execution(self, state: WAVEState, thread_id: str) -> WAVEState:
        """Simulate workflow execution for testing."""
        current_state = dict(state)

        # Simulate progression through phases
        phases = [
            (Phase.VALIDATE, 1),
            (Phase.PLAN, 2),
            (Phase.DEVELOP, 3),
            (Phase.QA, 5),
            (Phase.MERGE, 7),
            (Phase.DONE, 8),
        ]

        for phase, gate in phases:
            # Update state
            current_state["phase"] = phase.value
            current_state["gate"] = gate
            current_state["updated_at"] = datetime.now().isoformat()

            # Simulate token usage
            current_state["budget"] = current_state.get("budget", {})
            current_state["budget"]["tokens_used"] = gate * 5000
            current_state["budget"]["cost_usd"] = gate * 0.50

            # Callback: gate enter
            if self.config.on_gate_enter:
                self.config.on_gate_enter(gate, current_state)

            # Publish gate event
            self._publish_event(EventType.GATE_ENTERED, thread_id, current_state["story_id"], current_state)
            self._publish_event(EventType.GATE_COMPLETE, thread_id, current_state["story_id"], current_state)

            # Callback: gate complete
            if self.config.on_gate_complete:
                self.config.on_gate_complete(gate, current_state)

        return current_state

    def _publish_event(
        self,
        event_type: EventType,
        thread_id: str,
        story_id: str,
        state: WAVEState
    ):
        """Publish event to pub/sub."""
        if not self._pubsub:
            return

        event = WorkflowEvent(
            event_type=event_type.value,
            thread_id=thread_id,
            story_id=story_id,
            timestamp=datetime.now().isoformat(),
            data={
                "phase": state.get("phase"),
                "gate": state.get("gate"),
                "budget": state.get("budget", {}),
            },
            wave=state.get("wave_number", 1),
            gate=state.get("gate", 1),
            phase=state.get("phase", ""),
        )

        self._pubsub.publish(event)

    def _get_duration(self) -> float:
        """Get execution duration in seconds."""
        if not self._start_time:
            return 0.0
        return (datetime.now() - self._start_time).total_seconds()

    def get_events(self) -> List[WorkflowEvent]:
        """Get all published events (for testing)."""
        if isinstance(self._pubsub, MemoryPubSub):
            return self._pubsub.get_events()
        return []


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def run_story(
    story_id: str,
    project_path: str,
    requirements: str,
    wave_number: int = 1,
    token_limit: int = 100_000,
    cost_limit_usd: float = 10.0,
    **kwargs
) -> RunnerResult:
    """
    Quick helper to run a story through the workflow.

    Args:
        story_id: Story identifier
        project_path: Path to project
        requirements: Story requirements
        wave_number: Wave number
        token_limit: Token budget
        cost_limit_usd: Cost budget
        **kwargs: Additional runner config options

    Returns:
        RunnerResult
    """
    config = RunnerConfig(**kwargs)
    runner = WorkflowRunner(config)
    return runner.run(
        story_id=story_id,
        project_path=project_path,
        requirements=requirements,
        wave_number=wave_number,
        token_limit=token_limit,
        cost_limit_usd=cost_limit_usd,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "RunnerStatus",
    "RunnerConfig",
    "RunnerResult",
    "WorkflowRunner",
    "run_story",
]
