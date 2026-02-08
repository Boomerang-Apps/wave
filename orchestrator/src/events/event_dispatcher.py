"""
WAVE Event Dispatcher
Story: WAVE-P2-002

Central event routing hub. Subscribes to Redis Streams and dispatches
incoming events to registered signal handlers. Replaces polling loops.
"""

import logging
import threading
from typing import Dict, List, Optional, Callable

from src.pubsub import (
    RedisClient,
    Subscriber,
    ChannelManager,
    EventType,
    WaveMessage,
    StreamEntry,
)
from .signal_handler import SignalHandler
from .signal_types import HandlerResult

logger = logging.getLogger(__name__)


class EventDispatcher:
    """
    Routes incoming events to registered handlers.

    Replaces polling-based signal detection with event-driven processing.
    Uses Redis Streams consumer groups for durable, load-balanced delivery.
    """

    def __init__(
        self,
        redis_client: RedisClient,
        project: str,
        group: str = "orchestrator",
        consumer: str = "main",
    ):
        self._redis = redis_client
        self._project = project
        self._subscriber = Subscriber(
            redis_client, project, group, consumer,
            block_ms=2000,
        )
        self._channels = ChannelManager(project)
        self._handlers: Dict[EventType, List[SignalHandler]] = {}
        self._global_handlers: List[SignalHandler] = []
        self._listen_thread: Optional[threading.Thread] = None
        self._running = False
        self._dispatch_count = 0
        self._error_count = 0
        self._on_dispatch: Optional[Callable[[EventType, HandlerResult], None]] = None

    def register(self, event_type: EventType, handler: SignalHandler) -> None:
        """
        Register a handler for a specific event type.

        Multiple handlers can be registered per event type — all will be called.

        Args:
            event_type: The event type to handle.
            handler: The handler to invoke.
        """
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        logger.info(
            "Registered %s for %s",
            handler.name, event_type.value,
        )

    def register_global(self, handler: SignalHandler) -> None:
        """Register a handler that receives ALL events."""
        self._global_handlers.append(handler)

    def on_dispatch(self, callback: Callable[[EventType, HandlerResult], None]) -> None:
        """Set a callback invoked after every successful dispatch."""
        self._on_dispatch = callback

    def start(self, channel: Optional[str] = None, daemon: bool = True) -> None:
        """
        Begin listening for events on a background thread.

        Replaces polling loops — events are processed as they arrive.

        Args:
            channel: Stream to listen on (defaults to project signals).
            daemon: Whether the listener thread is a daemon thread.
        """
        if self._running:
            logger.warning("Dispatcher already running")
            return

        self._running = True
        target_channel = channel or self._channels.signals()

        self._listen_thread = threading.Thread(
            target=self._listen_loop,
            args=(target_channel,),
            name=f"event-dispatcher-{self._project}",
            daemon=daemon,
        )
        self._listen_thread.start()
        logger.info("Event dispatcher started on %s", target_channel)

    def stop(self) -> None:
        """Gracefully stop the dispatcher."""
        self._running = False
        self._subscriber.stop()
        if self._listen_thread and self._listen_thread.is_alive():
            self._listen_thread.join(timeout=5)
        logger.info(
            "Event dispatcher stopped (dispatched=%d, errors=%d)",
            self._dispatch_count, self._error_count,
        )

    def dispatch(self, entry: StreamEntry) -> HandlerResult:
        """
        Route a single event to its registered handlers.

        Args:
            entry: The stream entry containing the event.

        Returns:
            Combined HandlerResult from all matched handlers.
        """
        message = entry.message
        event_type = message.event_type
        handlers = self._handlers.get(event_type, []) + self._global_handlers

        if not handlers:
            logger.debug("No handler for %s — acknowledging", event_type.value)
            return HandlerResult(
                success=True,
                action_taken="no_handler",
            )

        combined = HandlerResult(success=True, action_taken="")
        actions = []

        for handler in handlers:
            try:
                result = handler.handle(message)
                if result.failed:
                    combined.success = False
                    combined.errors.extend(result.errors)
                actions.append(result.action_taken)
                combined.data.update(result.data)
            except Exception as e:
                logger.error(
                    "Handler %s failed for %s: %s",
                    handler.name, event_type.value, e,
                )
                combined.success = False
                combined.errors.append(f"{handler.name}: {e}")
                self._error_count += 1

        combined.action_taken = "; ".join(a for a in actions if a)
        self._dispatch_count += 1

        if self._on_dispatch:
            try:
                self._on_dispatch(event_type, combined)
            except Exception as e:
                logger.error("on_dispatch callback failed: %s", e)

        return combined

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def dispatch_count(self) -> int:
        return self._dispatch_count

    @property
    def error_count(self) -> int:
        return self._error_count

    @property
    def registered_events(self) -> List[EventType]:
        """List of event types that have at least one handler."""
        return list(self._handlers.keys())

    def _listen_loop(self, channel: str) -> None:
        """Internal listen loop — runs on background thread."""
        self._subscriber.ensure_group(channel)

        while self._running:
            try:
                entries = self._subscriber.read(channel=channel, block=2000)
                for entry in entries:
                    result = self.dispatch(entry)
                    if result.should_ack:
                        self._subscriber.ack(channel, entry.stream_id)
                    if not result.success:
                        logger.warning(
                            "Dispatch failed for %s: %s",
                            entry.message.event_type.value,
                            result.errors,
                        )
            except Exception as e:
                if self._running:
                    logger.error("Listen loop error: %s", e)
                    self._error_count += 1


class ResultWaiter:
    """
    Event-driven replacement for polling wait_for_result().

    Uses a threading.Event to block until a matching signal arrives,
    instead of polling with time.sleep().
    """

    def __init__(self):
        self._events: Dict[str, threading.Event] = {}
        self._results: Dict[str, Dict] = {}
        self._lock = threading.Lock()

    def expect(self, task_id: str) -> None:
        """Register expectation for a task result."""
        with self._lock:
            self._events[task_id] = threading.Event()

    def notify(self, task_id: str, result: Dict) -> None:
        """Notify that a task result has arrived."""
        with self._lock:
            self._results[task_id] = result
            event = self._events.get(task_id)
            if event:
                event.set()

    def wait(self, task_id: str, timeout: float = 300.0) -> Optional[Dict]:
        """
        Wait for a task result (event-driven, no polling).

        Args:
            task_id: The task to wait for.
            timeout: Max seconds to wait.

        Returns:
            The task result dict, or None on timeout.
        """
        event = self._events.get(task_id)
        if not event:
            return None

        event.wait(timeout=timeout)

        with self._lock:
            result = self._results.pop(task_id, None)
            self._events.pop(task_id, None)
            return result

    def wait_multiple(
        self,
        task_ids: List[str],
        timeout: float = 300.0,
    ) -> Dict[str, Dict]:
        """
        Wait for multiple task results concurrently.

        Args:
            task_ids: Tasks to wait for.
            timeout: Max seconds to wait for all.

        Returns:
            Dict mapping task_id to result.
        """
        import time

        results = {}
        start = time.time()

        for task_id in task_ids:
            remaining = max(0, timeout - (time.time() - start))
            if remaining <= 0:
                break
            result = self.wait(task_id, timeout=remaining)
            if result:
                results[task_id] = result

        return results

    def clear(self, task_id: str) -> None:
        """Remove a pending expectation."""
        with self._lock:
            self._events.pop(task_id, None)
            self._results.pop(task_id, None)

    @property
    def pending_count(self) -> int:
        """Number of pending expectations."""
        with self._lock:
            return len(self._events)
