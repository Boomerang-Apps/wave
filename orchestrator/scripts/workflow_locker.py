"""
Workflow Locker - Enforces Sequential Gate Execution
Gate 0 Enhancement - Grok Improvement Request

Locks the WAVE workflow to ensure gates are followed sequentially.
Any skip or out-of-order execution is blocked and logged.

Usage:
    python workflow_locker.py --lock          # Initialize lock
    python workflow_locker.py --check         # Check current gate
    python workflow_locker.py --advance       # Advance to next gate
    python workflow_locker.py --reset --confirm  # Reset workflow
    python workflow_locker.py --history       # View gate history
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from typing import Dict, Any, List, Optional

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Gate definitions (LOCKED SEQUENCE)
GATES = [
    "Gate 0: Research",
    "Gate 1: Planning",
    "Gate 2: TDD",
    "Gate 3: Branching",
    "Gate 4: Develop",
    "Gate 5: Refactor",
    "Gate 6: Safety Gate",
    "Gate 7: QA",
    "Gate 8: Merge/Deploy"
]


class WorkflowLocker:
    """
    Enforces sequential gate execution in WAVE workflow.

    Prevents:
    - Skipping gates
    - Out-of-order execution
    - Unauthorized resets
    """

    def __init__(self, project_path: str):
        """
        Initialize WorkflowLocker.

        Args:
            project_path: Path to project root
        """
        self.project_path = project_path
        self.gates = GATES
        self.claude_dir = os.path.join(project_path, ".claude")
        self.p_json_path = os.path.join(self.claude_dir, "P.json")
        self.lock_file_path = os.path.join(self.claude_dir, "WORKFLOW.lock")

        # Ensure .claude directory exists (only if project path exists)
        if os.path.exists(project_path):
            os.makedirs(self.claude_dir, exist_ok=True)

    def _load_p_json(self) -> Dict[str, Any]:
        """Load P.json or return default."""
        if os.path.exists(self.p_json_path):
            try:
                with open(self.p_json_path) as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return {"wave_state": {"current_wave": 1, "current_gate": 0, "gate_history": []}}

    def _save_p_json(self, data: Dict[str, Any]):
        """Save P.json."""
        with open(self.p_json_path, "w") as f:
            json.dump(data, f, indent=2)

    def get_current_gate(self) -> int:
        """Get current gate number from P.json."""
        p_data = self._load_p_json()
        return p_data.get("wave_state", {}).get("current_gate", 0)

    def update_gate(self, gate_num: int):
        """
        Update current gate in P.json.

        Args:
            gate_num: Gate number to set
        """
        p_data = self._load_p_json()
        if "wave_state" not in p_data:
            p_data["wave_state"] = {}
        p_data["wave_state"]["current_gate"] = gate_num
        self._save_p_json(p_data)

    def lock_workflow(self) -> Dict[str, Any]:
        """
        Lock the workflow with current gate sequence.

        Creates WORKFLOW.lock file with gate definitions.
        """
        lock_data = {
            "gates": self.gates,
            "locked_at": datetime.now().isoformat(),
            "timestamp": time.time()
        }

        with open(self.lock_file_path, "w") as f:
            json.dump(lock_data, f, indent=2)

        return {"success": True, "message": "Workflow LOCKED", "lock_file": self.lock_file_path}

    def check_gate(self, expected_gate: int) -> Dict[str, Any]:
        """
        Check if current gate matches expected.

        Args:
            expected_gate: The gate number that should be current

        Returns:
            Dict with valid status and any errors
        """
        current = self.get_current_gate()

        if current == expected_gate:
            return {
                "valid": True,
                "current_gate": current,
                "expected_gate": expected_gate,
                "gate_name": self.gates[current] if current < len(self.gates) else "Unknown"
            }
        else:
            return {
                "valid": False,
                "current_gate": current,
                "expected_gate": expected_gate,
                "drift_detected": True,
                "error": f"Drift detected: Expected Gate {expected_gate}, found Gate {current}"
            }

    def advance_gate(self) -> Dict[str, Any]:
        """
        Advance to the next gate (increment by 1 only).

        Returns:
            Dict with success status
        """
        current = self.get_current_gate()
        next_gate = current + 1

        if next_gate >= len(self.gates):
            return {
                "success": False,
                "error": "Already at final gate",
                "current_gate": current
            }

        # Record history
        self._record_gate_transition(current, next_gate)

        # Update gate
        self.update_gate(next_gate)

        return {
            "success": True,
            "previous_gate": current,
            "current_gate": next_gate,
            "gate_name": self.gates[next_gate]
        }

    def set_gate(self, target_gate: int) -> Dict[str, Any]:
        """
        Attempt to set a specific gate (blocked if skipping).

        Args:
            target_gate: Gate number to set

        Returns:
            Dict with success status
        """
        current = self.get_current_gate()

        # Can only advance by 1
        if target_gate != current + 1 and target_gate != current:
            return {
                "success": False,
                "error": f"Cannot skip gates. Sequential advancement only. Current: {current}, Target: {target_gate}"
            }

        if target_gate == current:
            return {"success": True, "message": "Already at target gate"}

        return self.advance_gate()

    def _record_gate_transition(self, from_gate: int, to_gate: int):
        """Record gate transition in history."""
        p_data = self._load_p_json()
        if "wave_state" not in p_data:
            p_data["wave_state"] = {}
        if "gate_history" not in p_data["wave_state"]:
            p_data["wave_state"]["gate_history"] = []

        transition = {
            "from_gate": from_gate,
            "to_gate": to_gate,
            "gate": to_gate,
            "timestamp": datetime.now().isoformat(),
            "status": "passed"
        }
        p_data["wave_state"]["gate_history"].append(transition)
        self._save_p_json(p_data)

    def get_gate_history(self) -> List[Dict[str, Any]]:
        """Get gate transition history."""
        p_data = self._load_p_json()
        return p_data.get("wave_state", {}).get("gate_history", [])

    def reset_workflow(self, confirm: bool = False) -> Dict[str, Any]:
        """
        Reset workflow to Gate 0.

        Args:
            confirm: Must be True to proceed

        Returns:
            Dict with success status
        """
        if not confirm:
            return {
                "success": False,
                "error": "Reset requires confirmation. Use --confirm flag."
            }

        # Reset gate to 0
        p_data = self._load_p_json()
        previous_gate = p_data.get("wave_state", {}).get("current_gate", 0)
        if "wave_state" not in p_data:
            p_data["wave_state"] = {}
        p_data["wave_state"]["current_gate"] = 0
        if "gate_history" not in p_data["wave_state"]:
            p_data["wave_state"]["gate_history"] = []
        p_data["wave_state"]["gate_history"].append({
            "action": "RESET",
            "timestamp": datetime.now().isoformat(),
            "previous_gate": previous_gate
        })
        self._save_p_json(p_data)

        return {
            "success": True,
            "message": "Workflow reset to Gate 0",
            "current_gate": 0
        }

    def detect_drift(self, expected_gate: int) -> Dict[str, Any]:
        """
        Detect if there's drift between expected and actual gate.

        Args:
            expected_gate: Expected gate number

        Returns:
            Dict with drift information
        """
        actual = self.get_current_gate()
        has_drift = actual != expected_gate

        return {
            "has_drift": has_drift,
            "expected": expected_gate,
            "actual": actual,
            "expected_name": self.gates[expected_gate] if expected_gate < len(self.gates) else "Unknown",
            "actual_name": self.gates[actual] if actual < len(self.gates) else "Unknown"
        }

    def run_workflow(self):
        """
        Run through all gates sequentially (for testing).
        """
        self.lock_workflow()
        print(f"Workflow LOCKED with {len(self.gates)} gates")

        for gate_num in range(len(self.gates)):
            current = self.get_current_gate()
            if current != gate_num:
                print(f"DRIFT DETECTED at Gate {gate_num}! Current: {current}")
                return {"success": False, "error": "Drift detected", "gate": gate_num}

            print(f"Executing {self.gates[gate_num]}...")
            time.sleep(0.1)  # Simulate work

            if gate_num < len(self.gates) - 1:
                self.advance_gate()

        print("Workflow COMPLETE")
        return {"success": True, "message": "All gates passed"}


def main():
    parser = argparse.ArgumentParser(description="WAVE Workflow Locker")
    parser.add_argument("--project", "-p", default=".", help="Project path")
    parser.add_argument("--lock", action="store_true", help="Lock workflow")
    parser.add_argument("--check", action="store_true", help="Check current gate")
    parser.add_argument("--advance", action="store_true", help="Advance to next gate")
    parser.add_argument("--reset", action="store_true", help="Reset workflow")
    parser.add_argument("--confirm", action="store_true", help="Confirm reset")
    parser.add_argument("--history", action="store_true", help="Show gate history")
    parser.add_argument("--run", action="store_true", help="Run full workflow")
    args = parser.parse_args()

    locker = WorkflowLocker(project_path=args.project)

    if args.lock:
        result = locker.lock_workflow()
        print(json.dumps(result, indent=2))

    elif args.check:
        current = locker.get_current_gate()
        print(f"Current Gate: {current} - {GATES[current] if current < len(GATES) else 'Unknown'}")

    elif args.advance:
        result = locker.advance_gate()
        print(json.dumps(result, indent=2))

    elif args.reset:
        result = locker.reset_workflow(confirm=args.confirm)
        print(json.dumps(result, indent=2))

    elif args.history:
        history = locker.get_gate_history()
        print(json.dumps(history, indent=2))

    elif args.run:
        result = locker.run_workflow()
        print(json.dumps(result, indent=2))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
