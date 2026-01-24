"""
WAVE v2 Persistence Module

Provides PostgreSQL-based checkpointing for crash recovery.
Uses LangGraph's PostgresSaver for durable state storage.
"""

import os
from typing import Optional, Any
from datetime import datetime

# Try to import PostgreSQL checkpointer
try:
    from langgraph.checkpoint.postgres import PostgresSaver
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False

# Try to import memory checkpointer for fallback
try:
    from langgraph.checkpoint.memory import MemorySaver
    MEMORY_AVAILABLE = True
except ImportError:
    MEMORY_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_DB_URI = "postgresql://wave:wave@localhost:5432/wave_orchestrator"


class CheckpointConfig:
    """Configuration for checkpoint storage."""

    def __init__(
        self,
        db_uri: Optional[str] = None,
        pool_size: int = 5,
        max_overflow: int = 10,
        echo: bool = False
    ):
        self.db_uri = db_uri or os.getenv("DATABASE_URL", DEFAULT_DB_URI)
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.echo = echo


# ═══════════════════════════════════════════════════════════════════════════════
# CHECKPOINT MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class CheckpointManager:
    """
    Manages checkpoint storage for WAVE workflows.

    Provides:
    - PostgreSQL-based durable checkpoints
    - Memory fallback for development
    - Checkpoint listing and recovery
    """

    def __init__(self, config: Optional[CheckpointConfig] = None):
        self.config = config or CheckpointConfig()
        self._saver = None
        self._connection = None

    def get_saver(self, use_memory: bool = False):
        """
        Get a checkpoint saver instance.

        Args:
            use_memory: Force memory saver (for testing)

        Returns:
            PostgresSaver or MemorySaver instance
        """
        if use_memory or not POSTGRES_AVAILABLE:
            if MEMORY_AVAILABLE:
                return MemorySaver()
            else:
                raise RuntimeError("No checkpoint saver available")

        if self._saver is None:
            self._saver = PostgresSaver.from_conn_string(self.config.db_uri)

        return self._saver

    def setup_database(self) -> bool:
        """
        Set up the checkpoint database tables.

        Returns:
            True if setup successful
        """
        if not POSTGRES_AVAILABLE:
            return False

        try:
            saver = self.get_saver()
            saver.setup()
            return True
        except Exception as e:
            print(f"Database setup failed: {e}")
            return False

    def list_checkpoints(self, thread_id: str) -> list:
        """
        List all checkpoints for a thread.

        Args:
            thread_id: The workflow thread ID

        Returns:
            List of checkpoint metadata
        """
        saver = self.get_saver()
        checkpoints = []

        try:
            for checkpoint in saver.list({"configurable": {"thread_id": thread_id}}):
                checkpoints.append({
                    "thread_id": thread_id,
                    "checkpoint_id": checkpoint.config.get("configurable", {}).get("checkpoint_id"),
                    "ts": checkpoint.metadata.get("created_at"),
                })
        except Exception as e:
            print(f"Failed to list checkpoints: {e}")

        return checkpoints

    def get_latest_checkpoint(self, thread_id: str) -> Optional[dict]:
        """
        Get the latest checkpoint for a thread.

        Args:
            thread_id: The workflow thread ID

        Returns:
            Latest checkpoint data or None
        """
        saver = self.get_saver()

        try:
            checkpoint = saver.get({"configurable": {"thread_id": thread_id}})
            if checkpoint:
                return {
                    "thread_id": thread_id,
                    "checkpoint_id": checkpoint.config.get("configurable", {}).get("checkpoint_id"),
                    "values": checkpoint.values,
                    "metadata": checkpoint.metadata,
                }
        except Exception as e:
            print(f"Failed to get checkpoint: {e}")

        return None


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def create_checkpointer(
    db_uri: Optional[str] = None,
    use_memory: bool = False
):
    """
    Create a checkpointer for use with LangGraph.

    Args:
        db_uri: PostgreSQL connection URI
        use_memory: Use in-memory storage (for testing)

    Returns:
        Configured checkpointer instance
    """
    if use_memory:
        if MEMORY_AVAILABLE:
            return MemorySaver()
        else:
            raise RuntimeError("MemorySaver not available")

    if not POSTGRES_AVAILABLE:
        if MEMORY_AVAILABLE:
            print("[WARNING] PostgreSQL not available, using memory storage")
            return MemorySaver()
        else:
            raise RuntimeError("No checkpointer available")

    uri = db_uri or os.getenv("DATABASE_URL", DEFAULT_DB_URI)
    return PostgresSaver.from_conn_string(uri)


def test_database_connection(db_uri: Optional[str] = None) -> bool:
    """
    Test if the database is accessible.

    Args:
        db_uri: PostgreSQL connection URI

    Returns:
        True if connection successful
    """
    if not POSTGRES_AVAILABLE:
        return False

    uri = db_uri or os.getenv("DATABASE_URL", DEFAULT_DB_URI)

    try:
        import psycopg2
        conn = psycopg2.connect(uri)
        conn.close()
        return True
    except Exception:
        return False


def generate_thread_id(story_id: str, wave_number: int = 1) -> str:
    """
    Generate a unique thread ID for a story.

    Args:
        story_id: The story identifier
        wave_number: The wave number

    Returns:
        Unique thread ID string
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"wave{wave_number}-{story_id}-{timestamp}"


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "CheckpointConfig",
    "CheckpointManager",
    "create_checkpointer",
    "test_database_connection",
    "generate_thread_id",
    "POSTGRES_AVAILABLE",
    "MEMORY_AVAILABLE",
]
