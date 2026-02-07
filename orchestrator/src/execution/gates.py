"""
WAVE Gate Executor
Story: WAVE-P1-002

Gate execution logic for workflow validation points.
"""

from typing import Dict, Any, Callable, Optional
from dataclasses import dataclass
from enum import Enum

from .state_machine import GateStatus, GateResult


class GateType(str, Enum):
    """Gate types with ownership."""
    GATE_0 = "gate-0"  # Pre-flight (CTO)
    GATE_1 = "gate-1"  # Self-review (Agent)
    GATE_2 = "gate-2"  # Build verification (Agent)
    GATE_3 = "gate-3"  # Test verification (Agent)
    GATE_4 = "gate-4"  # QA acceptance (QA)
    GATE_5 = "gate-5"  # PM validation (PM)
    GATE_6 = "gate-6"  # Architecture review (CTO)
    GATE_7 = "gate-7"  # Merge authorization (CTO)


@dataclass
class GateConfig:
    """Configuration for a gate."""
    gate: str
    name: str
    owner: str
    description: str
    required_ac: int  # Required acceptance criteria
    auto_executable: bool = False  # Can be automated


class GateExecutor:
    """
    Executes gates and validates acceptance criteria.

    Gates are workflow checkpoints that must be passed before proceeding.
    """

    # Gate configurations
    GATES: Dict[str, GateConfig] = {
        "gate-0": GateConfig(
            gate="gate-0",
            name="Pre-Flight Authorization",
            owner="CTO",
            description="CTO pre-approves story requirements and architecture",
            required_ac=1,
            auto_executable=False,
        ),
        "gate-1": GateConfig(
            gate="gate-1",
            name="Self-Verification",
            owner="Agent",
            description="Agent self-reviews code against acceptance criteria",
            required_ac=1,
            auto_executable=True,
        ),
        "gate-2": GateConfig(
            gate="gate-2",
            name="Build Verification",
            owner="Agent",
            description="Code builds successfully without errors",
            required_ac=1,
            auto_executable=True,
        ),
        "gate-3": GateConfig(
            gate="gate-3",
            name="Test Verification",
            owner="Agent",
            description="All tests pass with required coverage",
            required_ac=1,
            auto_executable=True,
        ),
        "gate-4": GateConfig(
            gate="gate-4",
            name="QA Acceptance",
            owner="QA",
            description="QA validates functionality meets requirements",
            required_ac=1,
            auto_executable=False,
        ),
        "gate-5": GateConfig(
            gate="gate-5",
            name="PM Validation",
            owner="PM",
            description="PM confirms requirements are met",
            required_ac=1,
            auto_executable=False,
        ),
        "gate-6": GateConfig(
            gate="gate-6",
            name="Architecture Review",
            owner="CTO",
            description="CTO reviews architectural decisions",
            required_ac=1,
            auto_executable=False,
        ),
        "gate-7": GateConfig(
            gate="gate-7",
            name="Merge Authorization",
            owner="CTO",
            description="CTO authorizes merge to main branch",
            required_ac=1,
            auto_executable=False,
        ),
    }

    def __init__(self):
        """Initialize gate executor."""
        self._validators: Dict[str, Callable] = {}

    def register_validator(
        self,
        gate: str,
        validator: Callable[[Dict[str, Any]], GateResult]
    ) -> None:
        """
        Register a validator function for a gate.

        Args:
            gate: Gate name (e.g., "gate-1")
            validator: Function that takes context and returns GateResult
        """
        if gate not in self.GATES:
            raise ValueError(f"Invalid gate: {gate}")
        self._validators[gate] = validator

    def execute_gate(
        self,
        gate: str,
        context: Dict[str, Any]
    ) -> GateResult:
        """
        Execute gate validation.

        Args:
            gate: Gate name
            context: Execution context with validation data

        Returns:
            GateResult with status and details

        Raises:
            ValueError: If gate is invalid or no validator registered
        """
        if gate not in self.GATES:
            raise ValueError(f"Invalid gate: {gate}")

        gate_config = self.GATES[gate]

        # Check if validator is registered
        if gate not in self._validators:
            if gate_config.auto_executable:
                raise ValueError(
                    f"No validator registered for auto-executable gate {gate}"
                )
            else:
                # Manual gate - requires human approval
                return GateResult(
                    gate=gate,
                    status=GateStatus.PENDING,
                    metadata={"message": f"Manual approval required from {gate_config.owner}"}
                )

        # Execute validator
        try:
            result = self._validators[gate](context)
            result.gate = gate  # Ensure gate is set
            return result
        except Exception as e:
            return GateResult(
                gate=gate,
                status=GateStatus.FAILED,
                error_message=f"Gate validation error: {str(e)}",
            )

    def get_gate_config(self, gate: str) -> GateConfig:
        """
        Get configuration for a gate.

        Args:
            gate: Gate name

        Returns:
            GateConfig
        """
        if gate not in self.GATES:
            raise ValueError(f"Invalid gate: {gate}")
        return self.GATES[gate]

    def is_auto_executable(self, gate: str) -> bool:
        """
        Check if gate can be auto-executed.

        Args:
            gate: Gate name

        Returns:
            True if gate can be automated
        """
        return self.GATES[gate].auto_executable if gate in self.GATES else False


# Example validators (can be customized per project)

def build_validator(context: Dict[str, Any]) -> GateResult:
    """
    Validate build success.

    Args:
        context: Must contain 'build_success' key

    Returns:
        GateResult
    """
    build_success = context.get("build_success", False)
    build_output = context.get("build_output", "")

    if build_success:
        return GateResult(
            gate="gate-2",
            status=GateStatus.PASSED,
            ac_passed=1,
            ac_total=1,
            metadata={"build_output": build_output},
        )
    else:
        return GateResult(
            gate="gate-2",
            status=GateStatus.FAILED,
            ac_passed=0,
            ac_total=1,
            error_message="Build failed",
            metadata={"build_output": build_output},
        )


def test_validator(context: Dict[str, Any]) -> GateResult:
    """
    Validate test success and coverage.

    Args:
        context: Must contain 'tests_passing' and optionally 'coverage'

    Returns:
        GateResult
    """
    tests_passing = context.get("tests_passing", False)
    coverage = context.get("coverage", 0.0)
    required_coverage = context.get("required_coverage", 70.0)

    ac_passed = 0
    ac_total = 2
    errors = []

    if tests_passing:
        ac_passed += 1
    else:
        errors.append("Tests failing")

    if coverage >= required_coverage:
        ac_passed += 1
    else:
        errors.append(f"Coverage {coverage}% < {required_coverage}%")

    if ac_passed == ac_total:
        return GateResult(
            gate="gate-3",
            status=GateStatus.PASSED,
            ac_passed=ac_passed,
            ac_total=ac_total,
            metadata={"coverage": coverage},
        )
    else:
        return GateResult(
            gate="gate-3",
            status=GateStatus.FAILED,
            ac_passed=ac_passed,
            ac_total=ac_total,
            error_message="; ".join(errors),
            metadata={"coverage": coverage},
        )


def self_review_validator(context: Dict[str, Any]) -> GateResult:
    """
    Validate self-review checklist.

    Args:
        context: Must contain 'checklist' with list of completed items

    Returns:
        GateResult
    """
    checklist = context.get("checklist", [])
    required_items = context.get("required_items", [])

    completed = set(checklist)
    required = set(required_items)

    ac_passed = len(completed.intersection(required))
    ac_total = len(required)

    if ac_passed == ac_total:
        return GateResult(
            gate="gate-1",
            status=GateStatus.PASSED,
            ac_passed=ac_passed,
            ac_total=ac_total,
            metadata={"checklist": checklist},
        )
    else:
        missing = required - completed
        return GateResult(
            gate="gate-1",
            status=GateStatus.FAILED,
            ac_passed=ac_passed,
            ac_total=ac_total,
            error_message=f"Missing items: {', '.join(missing)}",
            metadata={"missing": list(missing)},
        )
