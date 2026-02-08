"""
State Preserver
Story: WAVE-P5-003

Saves emergency checkpoints when stop is triggered,
enabling recovery after restart.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


class StatePreserver:
    """
    Preserves state during emergency stop (AC-03, AC-05, AC-07).

    Saves emergency checkpoints that can be used to resume
    the pipeline after recovery.
    """

    def __init__(self, storage_path: str):
        self.storage_path = storage_path
        os.makedirs(storage_path, exist_ok=True)

    def save_emergency(
        self,
        state: Dict[str, Any],
        reason: str,
    ) -> str:
        """
        Save emergency checkpoint.

        Args:
            state: Current pipeline state to preserve.
            reason: Reason for the emergency stop.

        Returns:
            Checkpoint ID.
        """
        checkpoint_id = f"emg-{str(uuid4())[:8]}"
        checkpoint = {
            "id": checkpoint_id,
            "type": "emergency",
            "reason": reason,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "state": state,
        }

        path = os.path.join(self.storage_path, f"{checkpoint_id}.json")
        with open(path, "w") as f:
            json.dump(checkpoint, f)

        logger.info("Emergency checkpoint saved: %s", checkpoint_id)
        return checkpoint_id

    def restore(self, checkpoint_id: str) -> Optional[Dict[str, Any]]:
        """
        Restore state from an emergency checkpoint.

        Args:
            checkpoint_id: ID of checkpoint to restore.

        Returns:
            State dict, or None if not found.
        """
        path = os.path.join(self.storage_path, f"{checkpoint_id}.json")
        if not os.path.exists(path):
            return None

        with open(path, "r") as f:
            checkpoint = json.load(f)

        return checkpoint["state"]

    def get_checkpoint_metadata(self, checkpoint_id: str) -> Optional[Dict]:
        """Get metadata for a checkpoint (without full state)."""
        path = os.path.join(self.storage_path, f"{checkpoint_id}.json")
        if not os.path.exists(path):
            return None

        with open(path, "r") as f:
            checkpoint = json.load(f)

        return {
            "id": checkpoint["id"],
            "type": checkpoint["type"],
            "reason": checkpoint["reason"],
            "timestamp": checkpoint["timestamp"],
        }

    def list_checkpoints(self) -> List[str]:
        """List all emergency checkpoint IDs."""
        checkpoints = []
        for fname in os.listdir(self.storage_path):
            if fname.endswith(".json"):
                checkpoints.append(fname.replace(".json", ""))
        return sorted(checkpoints)
