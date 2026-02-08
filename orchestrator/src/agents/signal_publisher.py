"""
WAVE Agent Signal Publisher Mixin
Story: WAVE-P2-003

Provides Redis-based signal publishing for all WAVE agents.
Replaces file-based signaling with real-time event publishing (<100ms).
Non-blocking — Redis failures are logged, not propagated.
"""

import logging
import threading
import time
from typing import Optional
from uuid import uuid4

from src.pubsub.redis_client import RedisClient
from src.pubsub.publisher import Publisher
from src.pubsub.types import EventType, MessagePriority

logger = logging.getLogger(__name__)


class SignalPublisherMixin:
    """
    Mixin that adds signal publishing to any WAVE agent.

    All publishing is non-blocking: Redis failures are caught and logged
    so the agent continues working even if messaging is degraded (AC-06).

    Usage:
        class MyAgent(AgentWorker):
            def __init__(self):
                super().__init__("be", "1")
                self.signals = SignalPublisherMixin(
                    redis_client=redis_client,
                    project="my-project",
                    agent_id=self.full_id,
                    domain=self.domain,
                )
    """

    def __init__(
        self,
        redis_client: Optional[RedisClient],
        project: str,
        agent_id: str,
        domain: str,
        session_id: Optional[str] = None,
    ):
        """
        Initialize signal publisher.

        Args:
            redis_client: Managed Redis client (may be None for graceful degradation).
            project: Project name for channel namespacing.
            agent_id: Agent identity (e.g., "be-dev-1").
            domain: Agent domain (pm, cto, fe, be, qa).
            session_id: Optional session ID (auto-generated if not provided).
        """
        self.project = project
        self.agent_id = agent_id
        self.domain = domain
        self.session_id = session_id or str(uuid4())
        self._publish_count = 0

        # Build publisher if Redis available
        self._publisher: Optional[Publisher] = None
        if redis_client is not None:
            try:
                self._publisher = Publisher(
                    redis_client=redis_client,
                    project=project,
                    source=agent_id,
                )
            except Exception as e:
                logger.warning(
                    "Failed to create signal publisher for %s: %s",
                    agent_id, e,
                )

        # Heartbeat state
        self._heartbeat_thread: Optional[threading.Thread] = None
        self._heartbeat_running = False

    def signal_gate_complete(
        self,
        gate_id: str,
        result: str,
        story_id: str,
    ) -> Optional[str]:
        """
        Publish gate completion signal (AC-02).

        Args:
            gate_id: Gate identifier (e.g., "gate-2").
            result: Gate result ("pass" or "fail").
            story_id: Story ID for tracing.

        Returns:
            Stream entry ID, or None on failure.
        """
        return self._safe_publish(
            EventType.GATE_PASSED,
            {
                "gate_id": gate_id,
                "result": result,
                "agent_id": self.agent_id,
                "domain": self.domain,
            },
            story_id=story_id,
        )

    def signal_gate_failed(
        self,
        gate_id: str,
        error: str,
        story_id: str,
    ) -> Optional[str]:
        """
        Publish gate failure signal (AC-02).

        Args:
            gate_id: Gate identifier.
            error: Failure reason.
            story_id: Story ID for tracing.

        Returns:
            Stream entry ID, or None on failure.
        """
        return self._safe_publish(
            EventType.GATE_FAILED,
            {
                "gate_id": gate_id,
                "error": error,
                "agent_id": self.agent_id,
                "domain": self.domain,
            },
            story_id=story_id,
        )

    def signal_error(
        self,
        error: str,
        story_id: str,
        retry_count: int = 0,
    ) -> Optional[str]:
        """
        Publish agent error signal (AC-03).

        Args:
            error: Error description.
            story_id: Story ID for tracing.
            retry_count: Current retry count.

        Returns:
            Stream entry ID, or None on failure.
        """
        return self._safe_publish(
            EventType.AGENT_ERROR,
            {
                "error": error,
                "retry_count": retry_count,
                "agent_id": self.agent_id,
                "domain": self.domain,
            },
            story_id=story_id,
            priority=MessagePriority.HIGH,
        )

    def signal_progress(
        self,
        story_id: str,
        detail: str = "working",
    ) -> Optional[str]:
        """
        Publish progress/heartbeat signal (AC-04).

        Args:
            story_id: Story ID for tracing.
            detail: Description of current activity.

        Returns:
            Stream entry ID, or None on failure.
        """
        return self._safe_publish(
            EventType.HEALTH_CHECK,
            {
                "agent_id": self.agent_id,
                "domain": self.domain,
                "detail": detail,
                "type": "progress",
            },
            story_id=story_id,
        )

    def signal_ready(self) -> Optional[str]:
        """
        Publish agent ready signal.

        Returns:
            Stream entry ID, or None on failure.
        """
        return self._safe_publish(
            EventType.AGENT_READY,
            {
                "agent_id": self.agent_id,
                "domain": self.domain,
                "status": "ready",
            },
        )

    def signal_busy(self, story_id: str) -> Optional[str]:
        """
        Publish agent busy signal.

        Args:
            story_id: Story being worked on.

        Returns:
            Stream entry ID, or None on failure.
        """
        return self._safe_publish(
            EventType.AGENT_BUSY,
            {
                "agent_id": self.agent_id,
                "domain": self.domain,
                "status": "busy",
            },
            story_id=story_id,
        )

    def start_heartbeat(
        self,
        story_id: str,
        interval: float = 30.0,
    ) -> None:
        """
        Start periodic progress heartbeat (AC-04).

        Args:
            story_id: Story being worked on.
            interval: Seconds between heartbeats (default 30s).
        """
        if self._heartbeat_running:
            return

        self._heartbeat_running = True
        self._heartbeat_thread = threading.Thread(
            target=self._heartbeat_loop,
            args=(story_id, interval),
            name=f"heartbeat-{self.agent_id}",
            daemon=True,
        )
        self._heartbeat_thread.start()

    def stop_heartbeat(self) -> None:
        """Stop the periodic heartbeat."""
        self._heartbeat_running = False
        if self._heartbeat_thread and self._heartbeat_thread.is_alive():
            self._heartbeat_thread.join(timeout=5)

    @property
    def publish_count(self) -> int:
        """Total signals published by this mixin."""
        return self._publish_count

    def _safe_publish(
        self,
        event_type: EventType,
        payload: dict,
        story_id: Optional[str] = None,
        priority: MessagePriority = MessagePriority.NORMAL,
    ) -> Optional[str]:
        """
        Non-blocking publish with graceful error handling (AC-06).

        All Redis errors are caught and logged — never propagated to the agent.
        """
        if self._publisher is None:
            logger.debug(
                "Signal publisher not available for %s — skipping %s",
                self.agent_id, event_type.value,
            )
            return None

        try:
            stream_id = self._publisher.publish(
                event_type=event_type,
                payload=payload,
                session_id=self.session_id,
                story_id=story_id,
                priority=priority,
            )
            self._publish_count += 1
            logger.debug(
                "Published %s from %s (id=%s)",
                event_type.value, self.agent_id, stream_id,
            )
            return stream_id
        except Exception as e:
            logger.warning(
                "Failed to publish %s from %s: %s — continuing execution",
                event_type.value, self.agent_id, e,
            )
            return None

    def _heartbeat_loop(self, story_id: str, interval: float) -> None:
        """Internal heartbeat loop — runs on daemon thread."""
        while self._heartbeat_running:
            self.signal_progress(
                story_id=story_id,
                detail="heartbeat",
            )
            # Sleep in small increments so we can stop quickly
            elapsed = 0.0
            while elapsed < interval and self._heartbeat_running:
                time.sleep(min(0.1, interval - elapsed))
                elapsed += 0.1
