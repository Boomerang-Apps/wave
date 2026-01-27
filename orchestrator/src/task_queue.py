"""
WAVE Task Queue - Redis-based task distribution for multi-agent orchestration

This module provides the task queue infrastructure for distributing work
to domain-specific agent workers (PM, CTO, FE, BE, QA).

Features:
- Redis-backed queues with AOF persistence
- Pub/sub notifications for real-time updates
- Blocking dequeue for efficient worker polling
- Result aggregation with timeout handling
"""

import json
import os
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class TaskStatus(str, Enum):
    """Task lifecycle states"""
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


class DomainQueue(str, Enum):
    """Redis queue names for each domain"""
    PM = "wave:tasks:pm"
    CTO = "wave:tasks:cto"
    FE = "wave:tasks:fe"
    BE = "wave:tasks:be"
    QA = "wave:tasks:qa"
    SAFETY = "wave:tasks:safety"
    HUMAN = "wave:tasks:human"  # HITL escalation queue
    RESULTS = "wave:results"


@dataclass
class AgentTask:
    """
    Task payload for domain agents.

    Attributes:
        task_id: Unique identifier for tracking
        story_id: Parent story this task belongs to
        domain: Target domain (pm, cto, fe, be, qa)
        action: Action to perform (plan, review, develop, test, etc.)
        payload: Domain-specific data
        priority: Higher = more urgent (0-10)
        created_at: ISO timestamp
        timeout_seconds: Max execution time
    """
    task_id: str
    story_id: str
    domain: str
    action: str
    payload: Dict[str, Any]
    priority: int = 5
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    timeout_seconds: int = 300
    thread_id: str = ""  # LangGraph thread for state continuity

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, data: str) -> "AgentTask":
        return cls(**json.loads(data))


@dataclass
class TaskResult:
    """
    Result from agent task execution.

    Attributes:
        task_id: Original task identifier
        status: Completion status
        domain: Agent domain that processed
        agent_id: Specific agent instance
        result: Output data
        duration_seconds: Execution time
        safety_score: Constitutional AI score (0-1)
        error: Error message if failed
    """
    task_id: str
    status: TaskStatus
    domain: str
    agent_id: str
    result: Dict[str, Any]
    duration_seconds: float = 0.0
    safety_score: float = 1.0
    error: Optional[str] = None
    completed_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_json(self) -> str:
        data = asdict(self)
        data["status"] = self.status.value
        return json.dumps(data)

    @classmethod
    def from_json(cls, data: str) -> "TaskResult":
        parsed = json.loads(data)
        parsed["status"] = TaskStatus(parsed["status"])
        return cls(**parsed)


class TaskQueue:
    """
    Redis-backed task queue for WAVE multi-agent orchestration.

    Provides reliable task distribution with:
    - Priority queues per domain
    - Blocking dequeue for workers
    - Pub/sub for real-time notifications
    - Result aggregation
    - Timeout handling
    """

    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize task queue.

        Args:
            redis_url: Redis connection URL (default: from env or localhost)
        """
        if not REDIS_AVAILABLE:
            raise RuntimeError("redis package not installed. Run: pip install redis")

        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis = redis.from_url(self.redis_url, decode_responses=True)
        self._pubsub = None

    def ping(self) -> bool:
        """Check Redis connection"""
        try:
            return self.redis.ping()
        except Exception:
            return False

    # ═══════════════════════════════════════════════════════════════════════════
    # TASK ENQUEUE/DEQUEUE
    # ═══════════════════════════════════════════════════════════════════════════

    def enqueue(self, queue: DomainQueue, task: AgentTask) -> bool:
        """
        Add task to domain queue.

        Args:
            queue: Target domain queue
            task: Task to enqueue

        Returns:
            True if enqueued successfully
        """
        try:
            # Store task data
            task_key = f"wave:task:{task.task_id}"
            self.redis.hset(task_key, mapping={
                "data": task.to_json(),
                "status": TaskStatus.PENDING.value,
                "queue": queue.value,
                "enqueued_at": datetime.now().isoformat()
            })
            self.redis.expire(task_key, 86400)  # 24h TTL

            # Add to queue (LPUSH for FIFO with BRPOP)
            self.redis.lpush(queue.value, task.task_id)

            # Publish notification
            self.redis.publish(f"{queue.value}:notify", json.dumps({
                "event": "task_enqueued",
                "task_id": task.task_id,
                "story_id": task.story_id,
                "action": task.action
            }))

            return True
        except Exception as e:
            print(f"[TaskQueue] Enqueue error: {e}")
            return False

    def dequeue(self, queue: DomainQueue, timeout: int = 30) -> Optional[AgentTask]:
        """
        Pop task from queue (blocking).

        Args:
            queue: Domain queue to poll
            timeout: Max wait time in seconds

        Returns:
            AgentTask or None if timeout
        """
        try:
            # Blocking pop from queue
            result = self.redis.brpop(queue.value, timeout=timeout)

            if result is None:
                return None

            _, task_id = result

            # Get task data
            task_key = f"wave:task:{task_id}"
            task_data = self.redis.hget(task_key, "data")

            if not task_data:
                return None

            # Update status
            self.redis.hset(task_key, "status", TaskStatus.ASSIGNED.value)
            self.redis.hset(task_key, "assigned_at", datetime.now().isoformat())

            return AgentTask.from_json(task_data)

        except Exception as e:
            print(f"[TaskQueue] Dequeue error: {e}")
            return None

    def mark_in_progress(self, task_id: str, agent_id: str):
        """Mark task as in progress"""
        task_key = f"wave:task:{task_id}"
        self.redis.hset(task_key, mapping={
            "status": TaskStatus.IN_PROGRESS.value,
            "agent_id": agent_id,
            "started_at": datetime.now().isoformat()
        })

    # ═══════════════════════════════════════════════════════════════════════════
    # RESULTS
    # ═══════════════════════════════════════════════════════════════════════════

    def submit_result(self, result: TaskResult) -> bool:
        """
        Submit task completion result.

        Args:
            result: Task result to store

        Returns:
            True if stored successfully
        """
        try:
            # Store result
            result_key = f"wave:result:{result.task_id}"
            self.redis.set(result_key, result.to_json(), ex=86400)

            # Update task status
            task_key = f"wave:task:{result.task_id}"
            self.redis.hset(task_key, mapping={
                "status": result.status.value,
                "completed_at": result.completed_at,
                "duration": result.duration_seconds
            })

            # Publish completion notification
            self.redis.publish(DomainQueue.RESULTS.value, json.dumps({
                "event": "task_completed",
                "task_id": result.task_id,
                "status": result.status.value,
                "domain": result.domain,
                "agent_id": result.agent_id
            }))

            return True
        except Exception as e:
            print(f"[TaskQueue] Submit result error: {e}")
            return False

    def get_result(self, task_id: str) -> Optional[TaskResult]:
        """
        Get result for a completed task.

        Args:
            task_id: Task identifier

        Returns:
            TaskResult or None
        """
        try:
            result_key = f"wave:result:{task_id}"
            data = self.redis.get(result_key)
            return TaskResult.from_json(data) if data else None
        except Exception as e:
            print(f"[TaskQueue] Get result error: {e}")
            return None

    def wait_for_result(self, task_id: str, timeout: int = 300,
                        poll_interval: float = 0.5) -> Optional[TaskResult]:
        """
        Wait for task result with timeout.

        Args:
            task_id: Task to wait for
            timeout: Max wait time in seconds
            poll_interval: Check frequency

        Returns:
            TaskResult or None if timeout
        """
        start = time.time()
        while time.time() - start < timeout:
            result = self.get_result(task_id)
            if result:
                return result
            time.sleep(poll_interval)

        # Timeout - mark task as timed out
        return TaskResult(
            task_id=task_id,
            status=TaskStatus.TIMEOUT,
            domain="unknown",
            agent_id="unknown",
            result={},
            error=f"Task timed out after {timeout}s"
        )

    def wait_for_multiple(self, task_ids: List[str], timeout: int = 300) -> Dict[str, TaskResult]:
        """
        Wait for multiple tasks to complete.

        Args:
            task_ids: List of task IDs
            timeout: Total timeout for all tasks

        Returns:
            Dict mapping task_id to result
        """
        results = {}
        start = time.time()
        pending = set(task_ids)

        while pending and (time.time() - start < timeout):
            for task_id in list(pending):
                result = self.get_result(task_id)
                if result:
                    results[task_id] = result
                    pending.discard(task_id)

            if pending:
                time.sleep(0.5)

        # Mark remaining as timeout
        for task_id in pending:
            results[task_id] = TaskResult(
                task_id=task_id,
                status=TaskStatus.TIMEOUT,
                domain="unknown",
                agent_id="unknown",
                result={},
                error=f"Task timed out"
            )

        return results

    # ═══════════════════════════════════════════════════════════════════════════
    # QUEUE STATS
    # ═══════════════════════════════════════════════════════════════════════════

    def get_queue_length(self, queue: DomainQueue) -> int:
        """Get number of pending tasks in queue"""
        return self.redis.llen(queue.value)

    def get_all_queue_stats(self) -> Dict[str, int]:
        """Get pending task count for all queues"""
        return {
            q.name: self.get_queue_length(q)
            for q in DomainQueue
            if q != DomainQueue.RESULTS
        }

    def clear_queue(self, queue: DomainQueue):
        """Clear all tasks from a queue (use carefully)"""
        self.redis.delete(queue.value)


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def create_task_id(domain: str, story_id: str) -> str:
    """Generate unique task ID"""
    return f"{domain}-{story_id}-{uuid.uuid4().hex[:8]}"


def get_queue_for_domain(domain: str) -> DomainQueue:
    """Map domain string to queue enum"""
    mapping = {
        "pm": DomainQueue.PM,
        "cto": DomainQueue.CTO,
        "fe": DomainQueue.FE,
        "be": DomainQueue.BE,
        "qa": DomainQueue.QA,
        "safety": DomainQueue.SAFETY,
        "human": DomainQueue.HUMAN
    }
    return mapping.get(domain.lower(), DomainQueue.PM)


# Global singleton
_task_queue: Optional[TaskQueue] = None


def get_task_queue() -> TaskQueue:
    """Get or create global task queue instance"""
    global _task_queue
    if _task_queue is None:
        _task_queue = TaskQueue()
    return _task_queue
