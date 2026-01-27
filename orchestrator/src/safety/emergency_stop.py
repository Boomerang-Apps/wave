"""
WAVE v2 Emergency Stop System

Critical safety mechanism for immediate halt of all agent operations.

Trigger Methods:
1. File: Create .claude/EMERGENCY-STOP file
2. Redis: Publish to wave:emergency channel
3. API: POST /api/emergency-stop

All agents must check for emergency stop before each task.
"""

import os
import sys
import json
import time
import threading
from pathlib import Path
from datetime import datetime
from typing import Optional, Callable, Dict, Any
from dataclasses import dataclass, field

# Redis client
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

# File-based emergency stop
EMERGENCY_STOP_FILE = os.getenv(
    "WAVE_EMERGENCY_STOP_FILE",
    ".claude/EMERGENCY-STOP"
)

# Redis channel for broadcast
EMERGENCY_STOP_CHANNEL = "wave:emergency"

# Maximum time to halt all agents
HALT_TIMEOUT_SECONDS = 5


# ═══════════════════════════════════════════════════════════════════════════════
# EXCEPTIONS
# ═══════════════════════════════════════════════════════════════════════════════

class EmergencyStopError(Exception):
    """Raised when emergency stop is triggered."""
    def __init__(self, reason: str = "Emergency stop activated"):
        self.reason = reason
        super().__init__(reason)


# ═══════════════════════════════════════════════════════════════════════════════
# DATA TYPES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class EmergencyStopEvent:
    """Record of an emergency stop event."""
    triggered_at: str
    reason: str
    source: str  # "file", "redis", "api", "safety"
    triggered_by: Optional[str] = None  # Agent/user that triggered
    cleared_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "triggered_at": self.triggered_at,
            "reason": self.reason,
            "source": self.source,
            "triggered_by": self.triggered_by,
            "cleared_at": self.cleared_at,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# REDIS CLIENT HELPER
# ═══════════════════════════════════════════════════════════════════════════════

def get_redis_client() -> Optional["redis.Redis"]:
    """Get Redis client from environment."""
    if not REDIS_AVAILABLE:
        return None

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        return redis.from_url(redis_url, decode_responses=True)
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# EMERGENCY STOP SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

class EmergencyStop:
    """
    Emergency Stop system for WAVE agents.

    Usage:
        es = EmergencyStop()

        # In agent loop:
        if es.check():
            raise EmergencyStopError(es.get_reason())

        # To trigger:
        es.trigger("Safety violation detected")

        # To clear:
        es.clear()
    """

    # Class-level state (shared across instances)
    _active: bool = False
    _reason: str = ""
    _event: Optional[EmergencyStopEvent] = None
    _lock = threading.Lock()
    _callbacks: list[Callable[[str], None]] = []

    def __init__(
        self,
        redis_client: Optional["redis.Redis"] = None,
        halt_timeout: int = HALT_TIMEOUT_SECONDS,
        auto_subscribe: bool = False
    ):
        """
        Initialize Emergency Stop system.

        Args:
            redis_client: Optional Redis client (auto-created if None)
            halt_timeout: Max seconds to halt all agents
            auto_subscribe: Whether to auto-subscribe to Redis channel
        """
        self._redis = redis_client
        self.halt_timeout = halt_timeout
        self._subscribed = False
        self._subscriber_thread: Optional[threading.Thread] = None

        if auto_subscribe:
            self.subscribe()

    # ═══════════════════════════════════════════════════════════════════════════
    # CHECK METHODS
    # ═══════════════════════════════════════════════════════════════════════════

    def check(self) -> bool:
        """
        Check if emergency stop is active.

        Checks:
        1. Class-level state (fastest)
        2. File-based trigger
        3. Redis (if subscribed)

        Returns:
            True if emergency stop is active
        """
        # Fast path: check class state
        if EmergencyStop._active:
            return True

        # Check file-based trigger
        if self.check_file():
            return True

        return False

    def check_file(self) -> bool:
        """Check if emergency stop file exists."""
        stop_file = Path(EMERGENCY_STOP_FILE)
        if stop_file.exists():
            # Read reason if file has content
            try:
                content = stop_file.read_text().strip()
                if content and not EmergencyStop._active:
                    self._activate(content or "File trigger", "file")
            except Exception:
                if not EmergencyStop._active:
                    self._activate("File trigger", "file")
            return True
        return False

    def check_redis(self) -> bool:
        """Check Redis for emergency stop (for manual polling)."""
        if not self._redis:
            self._redis = get_redis_client()

        if not self._redis:
            return False

        try:
            # Check if halt flag is set in Redis
            halt_data = self._redis.get("wave:emergency:active")
            if halt_data:
                data = json.loads(halt_data)
                if not EmergencyStop._active:
                    self._activate(data.get("reason", "Redis trigger"), "redis")
                return True
        except Exception:
            pass

        return False

    # ═══════════════════════════════════════════════════════════════════════════
    # TRIGGER METHODS
    # ═══════════════════════════════════════════════════════════════════════════

    def trigger(self, reason: str = "Manual trigger", source: str = "api") -> None:
        """
        Trigger emergency stop.

        Args:
            reason: Why the stop was triggered
            source: What triggered it (file, redis, api, safety)
        """
        self._activate(reason, source)

        # Create stop file
        self._create_stop_file(reason)

        # Broadcast to Redis
        self.broadcast_halt(reason)

        # Log event
        self._log_event(f"EMERGENCY_STOP triggered: {reason} (source: {source})")

    def _activate(self, reason: str, source: str) -> None:
        """Activate emergency stop state."""
        with EmergencyStop._lock:
            EmergencyStop._active = True
            EmergencyStop._reason = reason
            EmergencyStop._event = EmergencyStopEvent(
                triggered_at=datetime.now().isoformat(),
                reason=reason,
                source=source
            )

        # Call registered callbacks
        for callback in EmergencyStop._callbacks:
            try:
                callback(reason)
            except Exception:
                pass

    def _create_stop_file(self, reason: str) -> None:
        """Create the emergency stop file."""
        stop_file = Path(EMERGENCY_STOP_FILE)
        try:
            stop_file.parent.mkdir(parents=True, exist_ok=True)
            stop_file.write_text(f"{reason}\nTriggered: {datetime.now().isoformat()}")
        except Exception as e:
            self._log_event(f"Failed to create stop file: {e}")

    def broadcast_halt(self, reason: str) -> None:
        """Broadcast halt signal via Redis pub/sub."""
        if not self._redis:
            self._redis = get_redis_client()

        if not self._redis:
            return

        try:
            message = json.dumps({
                "action": "HALT",
                "reason": reason,
                "timestamp": time.time()
            })

            # Publish to channel
            self._redis.publish(EMERGENCY_STOP_CHANNEL, message)

            # Also set a key for polling
            self._redis.setex(
                "wave:emergency:active",
                3600,  # 1 hour TTL
                json.dumps({"reason": reason, "timestamp": time.time()})
            )
        except Exception as e:
            self._log_event(f"Failed to broadcast halt: {e}")

    # ═══════════════════════════════════════════════════════════════════════════
    # CLEAR METHODS
    # ═══════════════════════════════════════════════════════════════════════════

    def clear(self) -> None:
        """
        Clear emergency stop state.

        This should only be done after verifying it's safe to resume.
        """
        with EmergencyStop._lock:
            if EmergencyStop._event:
                EmergencyStop._event.cleared_at = datetime.now().isoformat()
            EmergencyStop._active = False
            EmergencyStop._reason = ""

        # Remove stop file
        stop_file = Path(EMERGENCY_STOP_FILE)
        if stop_file.exists():
            try:
                stop_file.unlink()
            except Exception:
                pass

        # Clear Redis
        if self._redis:
            try:
                self._redis.delete("wave:emergency:active")
                self._redis.publish(EMERGENCY_STOP_CHANNEL, json.dumps({
                    "action": "RESUME",
                    "timestamp": time.time()
                }))
            except Exception:
                pass

        self._log_event("EMERGENCY_STOP cleared")

    # ═══════════════════════════════════════════════════════════════════════════
    # SUBSCRIBE METHODS
    # ═══════════════════════════════════════════════════════════════════════════

    def subscribe(self) -> None:
        """Subscribe to Redis emergency stop channel."""
        if self._subscribed:
            return

        if not self._redis:
            self._redis = get_redis_client()

        if not self._redis:
            return

        def listener():
            try:
                pubsub = self._redis.pubsub()
                pubsub.subscribe(EMERGENCY_STOP_CHANNEL)

                for message in pubsub.listen():
                    if message["type"] == "message":
                        try:
                            data = json.loads(message["data"])
                            if data.get("action") == "HALT":
                                self._activate(
                                    data.get("reason", "Redis broadcast"),
                                    "redis"
                                )
                            elif data.get("action") == "RESUME":
                                with EmergencyStop._lock:
                                    EmergencyStop._active = False
                        except Exception:
                            pass
            except Exception:
                pass

        self._subscriber_thread = threading.Thread(target=listener, daemon=True)
        self._subscriber_thread.start()
        self._subscribed = True

    # ═══════════════════════════════════════════════════════════════════════════
    # STATUS METHODS
    # ═══════════════════════════════════════════════════════════════════════════

    def get_reason(self) -> str:
        """Get the reason for emergency stop."""
        return EmergencyStop._reason

    def is_active(self) -> bool:
        """Check if emergency stop is currently active."""
        return EmergencyStop._active

    def status(self) -> Dict[str, Any]:
        """Get current emergency stop status."""
        return {
            "active": EmergencyStop._active,
            "reason": EmergencyStop._reason,
            "triggered_at": EmergencyStop._event.triggered_at if EmergencyStop._event else None,
            "source": EmergencyStop._event.source if EmergencyStop._event else None,
            "file_exists": Path(EMERGENCY_STOP_FILE).exists(),
        }

    # ═══════════════════════════════════════════════════════════════════════════
    # CALLBACK METHODS
    # ═══════════════════════════════════════════════════════════════════════════

    @classmethod
    def register_callback(cls, callback: Callable[[str], None]) -> None:
        """
        Register a callback to be called when emergency stop triggers.

        Args:
            callback: Function that takes the reason string
        """
        cls._callbacks.append(callback)

    @classmethod
    def unregister_callback(cls, callback: Callable[[str], None]) -> None:
        """Unregister a callback."""
        if callback in cls._callbacks:
            cls._callbacks.remove(callback)

    # ═══════════════════════════════════════════════════════════════════════════
    # LOGGING
    # ═══════════════════════════════════════════════════════════════════════════

    def _log_event(self, message: str) -> None:
        """Log an emergency stop event."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_line = f"[{timestamp}] [E-STOP] {message}"
        print(log_line, file=sys.stderr)
        sys.stderr.flush()

        # Also log to file
        try:
            log_dir = Path(".claude/logs")
            log_dir.mkdir(parents=True, exist_ok=True)
            log_file = log_dir / "emergency_stop.log"
            with open(log_file, "a") as f:
                f.write(log_line + "\n")
        except Exception:
            pass


# ═══════════════════════════════════════════════════════════════════════════════
# AGENT INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════════

def check_emergency_stop() -> bool:
    """
    Quick helper to check emergency stop status.

    Use this in agent loops:
        while not check_emergency_stop():
            process_task()
    """
    es = EmergencyStop()
    return es.check()


def require_no_emergency_stop(func: Callable) -> Callable:
    """
    Decorator to check emergency stop before function execution.

    Usage:
        @require_no_emergency_stop
        def process_task(task):
            ...
    """
    def wrapper(*args, **kwargs):
        es = EmergencyStop()
        if es.check():
            raise EmergencyStopError(es.get_reason())
        return func(*args, **kwargs)
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "EMERGENCY_STOP_FILE",
    "EMERGENCY_STOP_CHANNEL",
    "EmergencyStopError",
    "EmergencyStopEvent",
    "EmergencyStop",
    "check_emergency_stop",
    "require_no_emergency_stop",
    "get_redis_client",
]
