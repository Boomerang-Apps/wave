# Senior Dev Handoff: WAVE-P2-002

## Assignment

**Story:** WAVE-P2-002 — Refactor Orchestrator to Event-Driven Architecture
**Priority:** P0 (Critical) | **Points:** 13 | **Risk:** High
**Branch:** `feat/wave-p2-002-event-driven-orchestrator`

## Objective

Replace polling-based signal detection in the orchestrator with event-driven Redis Streams pub/sub. This is the largest refactor in the plan — signal latency drops from 10s to <100ms (100x improvement).

## Context

**You are working in:** `/Volumes/SSD-01/Projects/WAVE/orchestrator`
**Python venv:** `source venv/bin/activate`
**Test command:** `PYTHONPATH=. pytest tests/ -v --tb=short`
**Codebase:** Python (LangGraph + FastAPI + SQLAlchemy). The story JSON says TypeScript — **ignore that, implement in Python**.

### What's Already Built (P2-001, merged to main)

The pub/sub infrastructure is ready in `orchestrator/src/pubsub/`:

| File | What It Does |
|------|-------------|
| `pubsub/redis_client.py` | RedisClient with connection pooling, auto-reconnect, exponential backoff |
| `pubsub/publisher.py` | Publisher using XADD for durable message publishing, batch support |
| `pubsub/subscriber.py` | Subscriber using XREADGROUP consumer groups, ack, DLQ, listen loop |
| `pubsub/channels.py` | ChannelManager with project-scoped namespacing (`wave:{type}:{project}`) |
| `pubsub/types.py` | WaveMessage, EventType enum (18 events), MessagePriority, StreamEntry |

**Import pattern:**
```python
from src.pubsub import (
    RedisClient, Publisher, Subscriber,
    ChannelManager, EventType, WaveMessage, MessagePriority,
)
```

## Acceptance Criteria (7)

| AC | Description | Key Test |
|----|-------------|----------|
| AC-01 | Orchestrator subscribes to Redis channels on startup | Start orchestrator, verify subscription exists |
| AC-02 | Agent completion signals received via pub/sub (<100ms) | Publish signal, measure handler invocation time |
| AC-03 | All polling loops removed from codebase | Grep for polling patterns, verify none exist |
| AC-04 | Signal handlers process messages correctly | Send gate_complete, verify gate transition |
| AC-05 | Error signals trigger retry/escalation | Send agent_error, verify retry or escalation |
| AC-06 | Backward compatible with existing session format | Old session continues with new event system |
| AC-07 | Graceful degradation if Redis unavailable | Kill Redis, verify graceful handling |

## Files to Create

All in `orchestrator/src/events/` (Python, not TypeScript):

```
orchestrator/src/events/__init__.py          # Package exports
orchestrator/src/events/signal_handler.py    # Command pattern signal handlers
orchestrator/src/events/event_dispatcher.py  # Central event routing & lifecycle
orchestrator/src/events/signal_types.py      # Signal type definitions & schemas
orchestrator/tests/events/__init__.py        # Test package
orchestrator/tests/events/test_signal_handler.py
orchestrator/tests/events/test_event_dispatcher.py
orchestrator/tests/events/test_integration.py
```

## Architecture Design

### Signal Handler (Command Pattern)

```python
class SignalHandler(ABC):
    """Base signal handler — one per signal type."""
    @abstractmethod
    def handle(self, message: WaveMessage) -> HandlerResult: ...

class GateCompleteHandler(SignalHandler):
    """WHEN gate_complete received THEN advance to next gate."""

class AgentErrorHandler(SignalHandler):
    """WHEN agent_error received THEN trigger retry/escalation."""

class AgentBlockedHandler(SignalHandler):
    """WHEN agent_blocked received THEN pause and escalate."""

class SessionPauseHandler(SignalHandler):
    """WHEN session_pause received THEN gracefully pause."""

class EmergencyStopHandler(SignalHandler):
    """WHEN emergency_stop received THEN halt immediately."""
```

### Event Dispatcher (Central Hub)

```python
class EventDispatcher:
    """Routes incoming events to registered handlers."""

    def __init__(self, redis_client, project, group, consumer):
        self.subscriber = Subscriber(redis_client, project, group, consumer)
        self._handlers: Dict[EventType, List[SignalHandler]] = {}

    def register(self, event_type: EventType, handler: SignalHandler): ...
    def start(self): ...  # Begins listening, replaces polling
    def stop(self): ...   # Graceful shutdown
    def dispatch(self, entry: StreamEntry) -> HandlerResult: ...
```

### Integration Points (What to Refactor)

These are the **polling patterns** you must replace:

1. **`src/task_queue.py` lines 302-368** — `wait_for_result()` and `wait_for_multiple()` use `time.sleep(0.5)` polling loops. Replace with event-driven result notification.

2. **`src/supervisor.py` lines 351-415** — `wait_for_result()` and `wait_for_parallel_dev()` call the polling task queue. Replace with pub/sub event waiting.

3. **`src/graph.py` lines 361-373** — Graph nodes call `supervisor.wait_for_result()`. These should await events instead.

4. **`src/safety/emergency_stop.py` lines 190-209** — `check_redis()` polls for emergency stop key. Replace with subscription to `wave:system:{project}` channel.

### Graceful Degradation (AC-07)

When Redis is unavailable:
- Log warning, don't crash
- Fall back to cached state / in-memory operation
- Use circuit breaker pattern (after N failures, stop attempting Redis for a cooldown period)
- Resume event processing when Redis reconnects

## Testing Strategy

**Framework:** pytest | **Coverage target:** 85% | **Estimated tests:** 15+
**Use `fakeredis`** for unit tests (already in requirements.txt)

### Test Categories

**Signal Handling (6 tests):**
- should handle gate_complete signal → advances gate
- should handle agent_error signal → triggers retry
- should handle agent_blocked signal → pauses execution
- should handle session_pause signal → pauses session
- should handle emergency_stop signal → halts workflow
- should ignore unknown signal types → no-op, ack

**Event Dispatching (4 tests):**
- should route signals to correct handlers
- should maintain handler registration
- should support multiple handlers per event
- should handle handler errors gracefully (send to DLQ)

**Integration (5+ tests):**
- should complete full gate cycle via events
- should handle agent handoff via events
- should process multiple signals in sequence
- should recover from Redis disconnect (AC-07)
- should maintain backward compatibility (AC-06)

## Protocol

### Branch & Commit

```bash
git checkout -b feat/wave-p2-002-event-driven-orchestrator main
# ... implement ...
git add <files>
git commit -m "feat(orchestrator): Refactor orchestrator to event-driven architecture

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### TDD Flow

1. Write test for signal handler → make it pass
2. Write test for event dispatcher → make it pass
3. Write integration tests → make them pass
4. Verify no regressions: `PYTHONPATH=. pytest tests/ -v --tb=short`

### Safety Rules

- **DO NOT** modify `core/safety/*`, `core/scripts/merge-watcher*.sh`, or `portal/*`
- **DO NOT** break existing tests (98 tests must still pass)
- **DO** use the existing pubsub package from P2-001 (don't reimplement)
- **DO** include idempotent handlers (duplicate signals should be safe)
- **DO** include sequence numbers for ordering

### When Done

Report to CTO (this terminal) with:
1. Files created/modified
2. Test count and pass rate
3. Which ACs are covered
4. Any concerns or decisions made

## Key Imports Available

```python
# From P2-001 (pubsub)
from src.pubsub import RedisClient, Publisher, Subscriber, ChannelManager
from src.pubsub import EventType, WaveMessage, MessagePriority, StreamEntry

# From P1 (state persistence)
from src.db import SessionRepository, CheckpointRepository, StoryExecutionRepository
from src.db import WaveSession, WaveCheckpoint, WaveStoryExecution
from src.db.client import get_db, init_db

# From P1-002 (execution engine)
from src.execution import StoryExecutionEngine, ExecutionContext, GateStatus, GateResult

# From P1-003 (recovery)
from src.recovery import RecoveryManager, RecoveryStrategy, RecoveryPoint
```
