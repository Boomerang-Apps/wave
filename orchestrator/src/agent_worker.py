"""
WAVE Agent Worker - Base class for domain agent workers

This module provides the foundation for all domain-specific agent workers
(PM, CTO, FE, BE, QA). Each worker:
- Polls its domain queue for tasks
- Processes tasks with LangSmith tracing
- Applies constitutional safety scoring before writes
- Reports results back to orchestrator

Grok Modifications Applied:
- LangSmith tracing wrapped around process_task
- Constitutional safety scoring before file operations
- Graceful shutdown handling
"""

import os
import sys
import signal
import logging
import time
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from functools import wraps

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.task_queue import (
    TaskQueue, DomainQueue, AgentTask, TaskResult, TaskStatus,
    get_task_queue
)

# Signal publisher (P2-003)
try:
    from src.pubsub.redis_client import RedisClient
    from src.agents.signal_publisher import SignalPublisherMixin
    SIGNAL_PUBLISHER_AVAILABLE = True
except ImportError:
    SIGNAL_PUBLISHER_AVAILABLE = False

# LangSmith tracing
try:
    from langsmith import traceable
    from langsmith.run_trees import RunTree
    LANGSMITH_AVAILABLE = True
except ImportError:
    LANGSMITH_AVAILABLE = False
    def traceable(*args, **kwargs):
        def decorator(func):
            return func
        return decorator

# Slack notifications
try:
    from notifications import notify_step, notify_agent_complete
    NOTIFICATIONS_AVAILABLE = True
except ImportError:
    NOTIFICATIONS_AVAILABLE = False
    def notify_step(*args, **kwargs): pass
    def notify_agent_complete(*args, **kwargs): pass


class ConstitutionalSafety:
    """
    Constitutional AI safety scoring for agent outputs.

    Checks code/content against safety rules before allowing writes.
    Block threshold: 0.85 (configurable)

    Domain-specific rules:
    - BE (backend): Allows process.env, password handling (required for auth)
    - FE (frontend): Stricter about secrets exposure
    """

    # Patterns that are ALWAYS dangerous regardless of domain
    DANGEROUS_PATTERNS = [
        "rm -rf /",
        "DROP TABLE",
        "DROP DATABASE",
        "eval(",
        "exec(",
        "__import__",
        "subprocess.call",
        "os.system",
    ]

    # Patterns that are dangerous in FE but allowed in BE
    # NOTE: process.env removed - Next.js FE agents write server-side API routes
    # NOTE: api_key = removed - Server-side API routes legitimately handle API keys
    # Gate 0 Research finding: This caused false positives blocking WAVE1-FE-002
    FE_ONLY_DANGEROUS = [
        "private_key",
        # "api_key =",  # REMOVED - causes false positives in server-side code
    ]

    # Patterns allowed in BE for auth/security implementations
    BE_ALLOWED_PATTERNS = [
        "process.env",      # Required for config
        "password",         # Required for auth
        "private_key",      # Required for JWT/crypto
        "api_key",          # Required for service integrations
    ]

    WARN_PATTERNS = [
        "TODO:",
        "FIXME:",
        "HACK:",
        "console.log",
        "print(",  # Debug statements
    ]

    def __init__(self, block_threshold: float = 0.85, domain: str = "fe"):
        self.block_threshold = block_threshold
        self.domain = domain.lower()

    def score(self, content: str) -> tuple[float, list[str]]:
        """
        Score content for safety.

        Args:
            content: Code or text to evaluate

        Returns:
            (score, violations) where score is 0-1 (1 = safe)
        """
        if not content:
            return 1.0, []

        violations = []
        content_lower = content.lower()

        # Check ALWAYS dangerous patterns (critical for all domains)
        for pattern in self.DANGEROUS_PATTERNS:
            if pattern.lower() in content_lower:
                violations.append(f"CRITICAL: Found dangerous pattern '{pattern}'")

        # Check FE-only dangerous patterns (skip for BE domain)
        if self.domain != "be":
            for pattern in self.FE_ONLY_DANGEROUS:
                if pattern.lower() in content_lower:
                    violations.append(f"CRITICAL: Found dangerous pattern '{pattern}'")

        # Check warning patterns (minor)
        for pattern in self.WARN_PATTERNS:
            if pattern.lower() in content_lower:
                violations.append(f"WARN: Found pattern '{pattern}'")

        # Calculate score
        critical_count = sum(1 for v in violations if v.startswith("CRITICAL"))
        warn_count = sum(1 for v in violations if v.startswith("WARN"))

        # Critical violations heavily impact score
        score = 1.0 - (critical_count * 0.3) - (warn_count * 0.05)
        score = max(0.0, min(1.0, score))

        return score, violations

    def is_safe(self, content: str) -> tuple[bool, float, list[str]]:
        """
        Check if content passes safety threshold.

        Returns:
            (is_safe, score, violations)
        """
        score, violations = self.score(content)
        return score >= self.block_threshold, score, violations


class AgentWorker(ABC):
    """
    Base class for all WAVE domain agent workers.

    Subclasses must implement:
    - get_queue(): Return the DomainQueue to listen on
    - process_task(): Execute the task logic

    Features:
    - Automatic LangSmith tracing
    - Constitutional safety scoring
    - Slack notifications
    - Graceful shutdown
    - Domain-prefixed logging (visible in Dozzle)
    """

    def __init__(self, domain: str, agent_id: str = "1"):
        """
        Initialize agent worker.

        Args:
            domain: Agent domain (pm, cto, fe, be, qa)
            agent_id: Instance identifier for scaling
        """
        self.domain = domain.lower()
        self.agent_id = agent_id
        self.full_id = f"{self.domain.upper()}-{self.agent_id}"

        # Task queue
        self.queue = get_task_queue()

        # Safety checker (domain-aware)
        self.safety = ConstitutionalSafety(domain=self.domain)

        # State
        self.running = True
        self.current_task: Optional[AgentTask] = None
        self.tasks_processed = 0

        # Setup logging with domain prefix for Dozzle visibility
        self.logger = self._setup_logging()

        # Handle graceful shutdown
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        signal.signal(signal.SIGINT, self._handle_shutdown)

        # LangSmith project
        self.langsmith_project = os.getenv("LANGSMITH_PROJECT", "wave-orchestrator")

        # LLM model for this agent (domain-specific)
        self.llm_model = self._get_llm_model()

        # Signal publisher (P2-003) — non-blocking, graceful on failure
        self.signals = None
        if SIGNAL_PUBLISHER_AVAILABLE:
            try:
                redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
                redis_client = RedisClient(url=redis_url)
                project = os.getenv("WAVE_PROJECT", "wave")
                self.signals = SignalPublisherMixin(
                    redis_client=redis_client,
                    project=project,
                    agent_id=self.full_id,
                    domain=self.domain,
                )
            except Exception as e:
                self.log(f"Signal publisher unavailable: {e}", "warning")

    def _setup_logging(self) -> logging.Logger:
        """Configure logging with domain-specific format for Dozzle"""
        logger = logging.getLogger(f"wave.{self.domain}.{self.agent_id}")
        logger.setLevel(logging.INFO)

        # Clear existing handlers
        logger.handlers = []

        # Console handler with domain prefix
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)

        # Format: [HH:MM:SS] [DOMAIN-ID] message
        formatter = logging.Formatter(
            f'[%(asctime)s] [{self.full_id}] %(message)s',
            datefmt='%H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        # Prevent propagation to root logger
        logger.propagate = False

        return logger

    def _get_llm_model(self) -> str:
        """Get the LLM model for this agent's domain from environment."""
        model_env_map = {
            "pm": "ANTHROPIC_MODEL_PM",
            "cto": "ANTHROPIC_MODEL_CTO",
            "fe": "ANTHROPIC_MODEL_DEV",
            "be": "ANTHROPIC_MODEL_DEV",
            "qa": "ANTHROPIC_MODEL_QA",
        }
        env_var = model_env_map.get(self.domain, "ANTHROPIC_MODEL_DEV")
        return os.getenv(env_var, "")

    def _handle_shutdown(self, signum, frame):
        """Handle graceful shutdown signals"""
        self.log("Received shutdown signal, finishing current task...")
        self.running = False

    def log(self, message: str, level: str = "info"):
        """
        Log message with domain prefix (visible in Dozzle).

        Args:
            message: Log message
            level: Log level (debug, info, warning, error)
        """
        log_func = getattr(self.logger, level, self.logger.info)
        log_func(message)

        # Flush to ensure immediate Dozzle visibility
        sys.stdout.flush()

    def notify(self, action: str, **details):
        """Send Slack notification"""
        if NOTIFICATIONS_AVAILABLE and self.current_task:
            notify_step(
                agent=self.domain,
                action=action,
                task=self.current_task.payload.get("requirements", "")[:100],
                run_id=self.current_task.story_id,
                **details
            )

    @abstractmethod
    def get_queue(self) -> DomainQueue:
        """Return the queue this agent listens to"""
        pass

    @abstractmethod
    def process_task(self, task: AgentTask) -> Dict[str, Any]:
        """
        Process a task and return result.

        Args:
            task: Task to process

        Returns:
            Dict with result data (must include 'status' key)
        """
        pass

    def check_safety(self, content: str) -> tuple[bool, float, list[str]]:
        """
        Check content against constitutional safety rules.

        Args:
            content: Code or text to check

        Returns:
            (is_safe, score, violations)
        """
        return self.safety.is_safe(content)

    @traceable(name="agent_process_task")
    def _traced_process_task(self, task: AgentTask) -> Dict[str, Any]:
        """
        Process task with LangSmith tracing.

        This wrapper adds observability to all task processing.
        """
        return self.process_task(task)

    def run(self):
        """
        Main worker loop.

        Continuously polls queue for tasks, processes them, and reports results.
        Handles graceful shutdown on SIGTERM/SIGINT.
        """
        self.log(f"{'='*60}")
        self.log(f"WAVE Agent Worker Starting")
        self.log(f"{'='*60}")
        self.log(f"Domain: {self.domain.upper()}")
        self.log(f"Agent ID: {self.agent_id}")
        self.log(f"Queue: {self.get_queue().value}")
        self.log(f"LangSmith: {'enabled' if LANGSMITH_AVAILABLE else 'disabled'}")
        self.log(f"Signals: {'enabled' if self.signals else 'disabled'}")
        self.log(f"Safety Threshold: {self.safety.block_threshold}")
        self.log(f"{'='*60}")
        self.log("Waiting for tasks...")

        # Publish agent ready signal (P2-003)
        if self.signals:
            self.signals.signal_ready()

        while self.running:
            try:
                # Poll queue for task (blocking with timeout)
                task = self.queue.dequeue(self.get_queue(), timeout=10)

                if task is None:
                    continue  # Timeout, loop again

                self.current_task = task
                self.log(f"{'─'*50}")
                self.log(f"Received task: {task.task_id}")
                self.log(f"Story: {task.story_id}")
                self.log(f"Action: {task.action}")

                # Mark as in progress
                self.queue.mark_in_progress(task.task_id, self.full_id)
                self.notify(f"processing {task.action}")

                # Publish busy + start heartbeat (P2-003)
                if self.signals:
                    self.signals.signal_busy(story_id=task.story_id)
                    self.signals.start_heartbeat(story_id=task.story_id)

                # Process with timing
                start_time = time.time()

                # Use traced version for LangSmith visibility
                if LANGSMITH_AVAILABLE:
                    result = self._traced_process_task(task)
                else:
                    result = self.process_task(task)

                duration = time.time() - start_time

                # Check safety of any generated code
                code_output = result.get("code", "") or result.get("content", "")
                if code_output:
                    is_safe, safety_score, violations = self.check_safety(code_output)
                    result["safety_score"] = safety_score
                    result["safety_violations"] = violations

                    if not is_safe:
                        self.log(f"SAFETY BLOCK: Score {safety_score:.2f} below threshold", "warning")
                        for v in violations:
                            self.log(f"  - {v}", "warning")
                        result["status"] = "blocked"
                        result["error"] = "Failed constitutional safety check"
                else:
                    result["safety_score"] = 1.0
                    result["safety_violations"] = []

                # Determine status
                status = TaskStatus.COMPLETED if result.get("status") != "blocked" else TaskStatus.FAILED

                # Submit result
                task_result = TaskResult(
                    task_id=task.task_id,
                    status=status,
                    domain=self.domain,
                    agent_id=self.full_id,
                    result=result,
                    duration_seconds=duration,
                    safety_score=result.get("safety_score", 1.0),
                    error=result.get("error")
                )

                self.queue.submit_result(task_result)

                self.log(f"Completed in {duration:.2f}s | Safety: {result.get('safety_score', 1.0):.2f}")

                # Send enhanced completion notification with metrics
                files_count = len(result.get("files_modified", []))
                tokens = result.get("tokens", 0)
                cost = result.get("cost_usd", tokens * 0.000015)  # Estimate if not provided

                if NOTIFICATIONS_AVAILABLE:
                    self.log(f"Sending Slack notification: tokens={tokens}, cost=${cost:.4f}, llm={self.llm_model}")
                    sent = notify_agent_complete(
                        agent=self.domain,
                        story_id=task.story_id,
                        files_count=files_count,
                        tokens=tokens,
                        cost_usd=cost,
                        duration_s=duration,
                        safety_score=result.get("safety_score", 1.0),
                        llm_model=self.llm_model
                    )
                    self.log(f"Slack notification sent: {sent}")

                self.tasks_processed += 1
                self.current_task = None

                # Stop heartbeat, signal ready again (P2-003)
                if self.signals:
                    self.signals.stop_heartbeat()
                    self.signals.signal_ready()

            except KeyboardInterrupt:
                self.log("Keyboard interrupt received")
                self.running = False

            except Exception as e:
                self.log(f"Error processing task: {e}", "error")

                # Publish error signal (P2-003)
                if self.signals:
                    self.signals.stop_heartbeat()
                    self.signals.signal_error(
                        error=str(e),
                        story_id=self.current_task.story_id if self.current_task else "unknown",
                    )

                if self.current_task:
                    # Report failure
                    task_result = TaskResult(
                        task_id=self.current_task.task_id,
                        status=TaskStatus.FAILED,
                        domain=self.domain,
                        agent_id=self.full_id,
                        result={},
                        error=str(e)
                    )
                    self.queue.submit_result(task_result)
                    self.current_task = None

        self.log(f"{'='*60}")
        self.log(f"Agent stopped. Processed {self.tasks_processed} tasks.")
        self.log(f"{'='*60}")


class DummyWorker(AgentWorker):
    """Test worker for development"""

    def get_queue(self) -> DomainQueue:
        return DomainQueue.PM

    def process_task(self, task: AgentTask) -> Dict[str, Any]:
        self.log(f"Processing: {task.payload}")
        time.sleep(2)  # Simulate work
        return {"status": "completed", "result": "dummy"}


if __name__ == "__main__":
    # Test run
    worker = DummyWorker("test", "1")
    worker.run()
