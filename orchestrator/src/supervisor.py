"""
WAVE Supervisor - Task Distribution to Domain Agents

The Supervisor is the bridge between LangGraph orchestration and
distributed agent workers. It:
- Dispatches tasks to domain-specific queues
- Waits for results from workers
- Handles parallel execution (FE + BE simultaneously)
- Aggregates results for graph state updates

Grok Modification: Hybrid LangGraph approach
- LangGraph remains the primary orchestrator (state, routing, checkpoints)
- Workers execute node logic via Redis queues
- Results feed back into graph state

Enhancement 1 (Grok): Configurable PM timeout via WAVE_PM_TIMEOUT env var
"""

import os
import sys
import uuid
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime


# ═══════════════════════════════════════════════════════════════════════════
# TIMEOUT CONFIGURATION (Enhancement 1 - Grok)
# ═══════════════════════════════════════════════════════════════════════════

# Default timeout values (seconds)
PM_TIMEOUT_DEFAULT = 300  # 5 minutes (increased from 2 min per Grok recommendation)
PM_TIMEOUT_MIN = 30       # Minimum 30 seconds
PM_TIMEOUT_MAX = 600      # Maximum 10 minutes


def get_pm_timeout() -> int:
    """
    Get PM timeout from environment or use default.

    Environment variable: WAVE_PM_TIMEOUT (seconds)
    Default: 300 seconds (5 minutes)
    Min: 30 seconds
    Max: 600 seconds (10 minutes)

    Returns:
        Timeout value in seconds, clamped to min/max bounds
    """
    try:
        timeout = int(os.getenv('WAVE_PM_TIMEOUT', str(PM_TIMEOUT_DEFAULT)))
    except ValueError:
        timeout = PM_TIMEOUT_DEFAULT

    # Clamp to bounds
    return max(PM_TIMEOUT_MIN, min(PM_TIMEOUT_MAX, timeout))

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.task_queue import (
    TaskQueue, DomainQueue, AgentTask, TaskResult, TaskStatus,
    create_task_id, get_task_queue
)

# Notifications
try:
    from notifications import notify_step
    NOTIFICATIONS_AVAILABLE = True
except ImportError:
    NOTIFICATIONS_AVAILABLE = False
    def notify_step(*args, **kwargs): pass


class Supervisor:
    """
    Supervisor distributes tasks to domain agent workers.

    Usage in LangGraph nodes:
        supervisor = Supervisor()

        # In plan_node:
        task_id = supervisor.dispatch_to_pm(story_id, requirements)
        result = supervisor.wait_for_result(task_id)

        # In develop_node (parallel):
        results = supervisor.dispatch_parallel_dev(story_id, fe_files, be_files, requirements)
    """

    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize Supervisor.

        Args:
            redis_url: Redis connection URL (default: from env)
        """
        self.queue = get_task_queue()
        self._active_tasks: Dict[str, AgentTask] = {}

    def _log(self, message: str):
        """Log supervisor activity"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] [SUPERVISOR] {message}")
        sys.stdout.flush()

    def _notify(self, action: str, story_id: str, **details):
        """Send Slack notification"""
        if NOTIFICATIONS_AVAILABLE:
            notify_step(
                agent="supervisor",
                action=action,
                task=details.get("task", ""),
                run_id=story_id,
                **{k: v for k, v in details.items() if k != "task"}
            )

    # ═══════════════════════════════════════════════════════════════════════════
    # TASK DISPATCH
    # ═══════════════════════════════════════════════════════════════════════════

    def dispatch_to_pm(self, story_id: str, requirements: str,
                       project_path: str = "/project",
                       thread_id: str = "") -> str:
        """
        Dispatch planning task to PM agent.

        Args:
            story_id: Story identifier
            requirements: Story requirements text
            project_path: Path to project root
            thread_id: LangGraph thread ID for continuity

        Returns:
            Task ID for tracking
        """
        task = AgentTask(
            task_id=create_task_id("pm", story_id),
            story_id=story_id,
            domain="pm",
            action="plan",
            payload={
                "requirements": requirements,
                "project_path": project_path
            },
            thread_id=thread_id
        )

        self._log(f"Dispatching to PM: {task.task_id}")
        self._notify("dispatching to PM", story_id, task=requirements[:50])

        self.queue.enqueue(DomainQueue.PM, task)
        self._active_tasks[task.task_id] = task

        return task.task_id

    def dispatch_to_cto(self, story_id: str, code: str,
                        files: List[str], plan: dict,
                        thread_id: str = "") -> str:
        """
        Dispatch architecture review to CTO agent.

        Args:
            story_id: Story identifier
            code: Generated code to review
            files: List of modified files
            plan: Implementation plan
            thread_id: LangGraph thread ID

        Returns:
            Task ID for tracking
        """
        task = AgentTask(
            task_id=create_task_id("cto", story_id),
            story_id=story_id,
            domain="cto",
            action="review",
            payload={
                "code": code,
                "files": files,
                "plan": plan
            },
            thread_id=thread_id
        )

        self._log(f"Dispatching to CTO: {task.task_id}")
        self._notify("dispatching to CTO", story_id, files=len(files))

        self.queue.enqueue(DomainQueue.CTO, task)
        self._active_tasks[task.task_id] = task

        return task.task_id

    def dispatch_to_fe(self, story_id: str, files: List[str],
                       requirements: str, project_path: str = "/project",
                       thread_id: str = "") -> str:
        """
        Dispatch frontend development to FE agent.

        Args:
            story_id: Story identifier
            files: Target files to create/modify
            requirements: Task requirements
            project_path: Path to project root
            thread_id: LangGraph thread ID

        Returns:
            Task ID for tracking
        """
        task = AgentTask(
            task_id=create_task_id("fe", story_id),
            story_id=story_id,
            domain="fe",
            action="develop",
            payload={
                "files": files,
                "requirements": requirements,
                "project_path": project_path
            },
            thread_id=thread_id
        )

        self._log(f"Dispatching to FE: {task.task_id}")
        self._notify("dispatching to FE", story_id, files=len(files))

        self.queue.enqueue(DomainQueue.FE, task)
        self._active_tasks[task.task_id] = task

        return task.task_id

    def dispatch_to_be(self, story_id: str, files: List[str],
                       requirements: str, project_path: str = "/project",
                       thread_id: str = "") -> str:
        """
        Dispatch backend development to BE agent.

        Args:
            story_id: Story identifier
            files: Target files to create/modify
            requirements: Task requirements
            project_path: Path to project root
            thread_id: LangGraph thread ID

        Returns:
            Task ID for tracking
        """
        task = AgentTask(
            task_id=create_task_id("be", story_id),
            story_id=story_id,
            domain="be",
            action="develop",
            payload={
                "files": files,
                "requirements": requirements,
                "project_path": project_path
            },
            thread_id=thread_id
        )

        self._log(f"Dispatching to BE: {task.task_id}")
        self._notify("dispatching to BE", story_id, files=len(files))

        self.queue.enqueue(DomainQueue.BE, task)
        self._active_tasks[task.task_id] = task

        return task.task_id

    def dispatch_to_qa(self, story_id: str, code: str,
                       files: List[str], requirements: str,
                       acceptance_criteria: List[str] = None,
                       thread_id: str = "") -> str:
        """
        Dispatch QA validation to QA agent.

        Args:
            story_id: Story identifier
            code: Code to validate
            files: Files to test
            requirements: Original requirements
            acceptance_criteria: List of acceptance criteria
            thread_id: LangGraph thread ID

        Returns:
            Task ID for tracking
        """
        task = AgentTask(
            task_id=create_task_id("qa", story_id),
            story_id=story_id,
            domain="qa",
            action="validate",
            payload={
                "code": code,
                "files_to_test": files,
                "requirements": requirements,
                "acceptance_criteria": acceptance_criteria or []
            },
            thread_id=thread_id
        )

        self._log(f"Dispatching to QA: {task.task_id}")
        self._notify("dispatching to QA", story_id, files=len(files))

        self.queue.enqueue(DomainQueue.QA, task)
        self._active_tasks[task.task_id] = task

        return task.task_id

    # ═══════════════════════════════════════════════════════════════════════════
    # PARALLEL EXECUTION
    # ═══════════════════════════════════════════════════════════════════════════

    def dispatch_parallel_dev(self, story_id: str,
                              fe_files: List[str], be_files: List[str],
                              requirements: str, project_path: str = "/project",
                              thread_id: str = "") -> Dict[str, str]:
        """
        Dispatch FE and BE development tasks in parallel.

        Args:
            story_id: Story identifier
            fe_files: Frontend files to create/modify
            be_files: Backend files to create/modify
            requirements: Task requirements
            project_path: Path to project root
            thread_id: LangGraph thread ID

        Returns:
            Dict with 'fe_task_id' and 'be_task_id'
        """
        self._log(f"Dispatching parallel dev: FE={len(fe_files)} files, BE={len(be_files)} files")
        self._notify("parallel dispatch FE+BE", story_id,
                     fe_files=len(fe_files), be_files=len(be_files))

        result = {}

        if fe_files:
            result["fe_task_id"] = self.dispatch_to_fe(
                story_id, fe_files, requirements, project_path, thread_id
            )
        else:
            result["fe_task_id"] = None

        if be_files:
            result["be_task_id"] = self.dispatch_to_be(
                story_id, be_files, requirements, project_path, thread_id
            )
        else:
            result["be_task_id"] = None

        return result

    # ═══════════════════════════════════════════════════════════════════════════
    # RESULT HANDLING
    # ═══════════════════════════════════════════════════════════════════════════

    def wait_for_result(self, task_id: str, timeout: int = 300) -> Dict[str, Any]:
        """
        Wait for a single task result.

        Args:
            task_id: Task to wait for
            timeout: Max wait time in seconds

        Returns:
            Result dict or error dict
        """
        if task_id is None:
            return {"status": "skipped", "result": {}}

        self._log(f"Waiting for result: {task_id}")

        result = self.queue.wait_for_result(task_id, timeout)

        if result:
            self._log(f"Result received: {task_id} -> {result.status.value}")

            # Cleanup
            self._active_tasks.pop(task_id, None)

            return {
                "status": result.status.value,
                "domain": result.domain,
                "agent_id": result.agent_id,
                "duration": result.duration_seconds,
                "safety_score": result.safety_score,
                "error": result.error,
                **result.result
            }

        self._log(f"Timeout waiting for: {task_id}")
        return {
            "status": "timeout",
            "error": f"Task {task_id} timed out after {timeout}s"
        }

    def wait_for_parallel_dev(self, task_ids: Dict[str, str],
                              timeout: int = 300) -> Dict[str, Dict[str, Any]]:
        """
        Wait for parallel FE and BE results.

        Args:
            task_ids: Dict with 'fe_task_id' and 'be_task_id'
            timeout: Max wait time for each

        Returns:
            Dict with 'fe_result' and 'be_result'
        """
        results = {}

        if task_ids.get("fe_task_id"):
            results["fe_result"] = self.wait_for_result(task_ids["fe_task_id"], timeout)
        else:
            results["fe_result"] = {"status": "skipped", "code": "", "files_modified": []}

        if task_ids.get("be_task_id"):
            results["be_result"] = self.wait_for_result(task_ids["be_task_id"], timeout)
        else:
            results["be_result"] = {"status": "skipped", "code": "", "files_modified": []}

        return results

    # ═══════════════════════════════════════════════════════════════════════════
    # STATUS & MONITORING
    # ═══════════════════════════════════════════════════════════════════════════

    def get_queue_stats(self) -> Dict[str, int]:
        """Get pending task count for all queues"""
        return self.queue.get_all_queue_stats()

    def get_active_tasks(self) -> List[str]:
        """Get list of active task IDs"""
        return list(self._active_tasks.keys())


# Global singleton
_supervisor: Optional[Supervisor] = None


def get_supervisor() -> Supervisor:
    """Get or create global supervisor instance"""
    global _supervisor
    if _supervisor is None:
        _supervisor = Supervisor()
    return _supervisor
