"""
Domain Events Module
Per-domain event publishing for real-time Portal updates.

Based on Grok's Parallel Domain Execution Recommendations

Publishes events to Redis channels:
- wave:{run_id}:domain:{domain}

Event types:
- domain.started
- domain.progress
- domain.complete
"""

import json
from datetime import datetime
from typing import Dict, Any, List, Optional

from .portal_models import DomainProgressEvent


class DomainEventPublisher:
    """
    Publishes per-domain events for Portal real-time updates.

    Uses Redis pub/sub pattern with domain-specific channels.
    """

    def __init__(self, redis_client: Optional[Any] = None):
        """
        Initialize the event publisher.

        Args:
            redis_client: Optional Redis client for publishing.
                         If None, events are stored in memory (for testing).
        """
        self._redis = redis_client
        self._events: List[Dict[str, Any]] = []  # For testing without Redis

    def get_domain_channel(self, run_id: str, domain: str) -> str:
        """
        Get the Redis channel name for a domain.

        Channel format: wave:{run_id}:domain:{domain}

        Args:
            run_id: Run identifier
            domain: Domain name

        Returns:
            Channel name string
        """
        return f"wave:{run_id}:domain:{domain}"

    async def _publish(self, channel: str, event: Dict[str, Any]) -> None:
        """
        Publish an event to a Redis channel.

        Args:
            channel: Channel name
            event: Event data dict
        """
        if self._redis:
            await self._redis.publish(channel, json.dumps(event))
        else:
            # Store locally for testing
            self._events.append({"channel": channel, "event": event})

    async def publish_domain_started(self, run_id: str, domain: str) -> None:
        """
        Publish a domain started event.

        Args:
            run_id: Run identifier
            domain: Domain name
        """
        event = DomainProgressEvent.create_started(domain, run_id)
        channel = self.get_domain_channel(run_id, domain)
        await self._publish(channel, event.to_dict())

    async def publish_domain_progress(
        self,
        run_id: str,
        domain: str,
        progress: Dict[str, Any],
    ) -> None:
        """
        Publish a domain progress event.

        Args:
            run_id: Run identifier
            domain: Domain name
            progress: Progress data dict with current_node, files_modified, tests_status
        """
        event = DomainProgressEvent.create_progress(
            domain=domain,
            run_id=run_id,
            current_node=progress.get("current_node", "unknown"),
            files_modified=progress.get("files_modified", []),
            tests_status=progress.get("tests_status", "pending"),
        )
        channel = self.get_domain_channel(run_id, domain)
        await self._publish(channel, event.to_dict())

    async def publish_domain_complete(
        self,
        run_id: str,
        domain: str,
        result: Dict[str, Any],
    ) -> None:
        """
        Publish a domain complete event.

        Args:
            run_id: Run identifier
            domain: Domain name
            result: Result data dict with qa_passed, safety_score
        """
        event = DomainProgressEvent.create_complete(
            domain=domain,
            run_id=run_id,
            qa_passed=result.get("qa_passed", False),
            safety_score=result.get("safety_score", 0.0),
        )
        channel = self.get_domain_channel(run_id, domain)
        await self._publish(channel, event.to_dict())

    def get_published_events(self) -> List[Dict[str, Any]]:
        """
        Get all published events (for testing).

        Returns:
            List of published events
        """
        return self._events.copy()

    def clear_events(self) -> None:
        """Clear all stored events (for testing)."""
        self._events.clear()


__all__ = [
    "DomainEventPublisher",
]
