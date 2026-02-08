"""
State Externalizer
Story: WAVE-P4-001

Externalizes agent state to persistent storage at checkpoints.
Uses file-based storage (can be swapped for DB backend).
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


class StateExternalizer:
    """
    Externalizes agent state to storage at checkpoints (AC-04).

    Saves context snapshots so agents can clear their context window
    and restore later if needed.
    """

    def __init__(self, storage_path: str):
        """
        Args:
            storage_path: Directory for checkpoint storage.
        """
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)

    def save_checkpoint(
        self,
        state: Dict[str, Any],
        clear_after: bool = False,
    ) -> str:
        """
        Save state to a checkpoint.

        Args:
            state: State dict to save.
            clear_after: If True, signals that context should be cleared.

        Returns:
            Checkpoint ID.
        """
        checkpoint_id = str(uuid4())[:8]
        checkpoint = {
            "id": checkpoint_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "state": state,
            "clear_after": clear_after,
        }

        path = os.path.join(self.storage_path, f"{checkpoint_id}.json")
        with open(path, "w") as f:
            json.dump(checkpoint, f)

        logger.info("Saved checkpoint %s", checkpoint_id)
        return checkpoint_id

    def restore_checkpoint(self, checkpoint_id: str) -> Optional[Dict[str, Any]]:
        """
        Restore state from a checkpoint.

        Args:
            checkpoint_id: ID of checkpoint to restore.

        Returns:
            State dict, or None if not found.
        """
        path = os.path.join(self.storage_path, f"{checkpoint_id}.json")
        if not os.path.exists(path):
            logger.warning("Checkpoint %s not found", checkpoint_id)
            return None

        with open(path, "r") as f:
            checkpoint = json.load(f)

        logger.info("Restored checkpoint %s", checkpoint_id)
        return checkpoint["state"]

    def list_checkpoints(self) -> List[str]:
        """Return list of checkpoint IDs."""
        checkpoints = []
        for fname in os.listdir(self.storage_path):
            if fname.endswith(".json"):
                checkpoints.append(fname.replace(".json", ""))
        return sorted(checkpoints)
