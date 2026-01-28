"""
WAVE Container Completeness Validator

Validates that all required Docker containers are running and healthy.
Part of Gate 0 Research Item #3: Container Completeness Validation.

Usage:
    validator = ContainerValidator()
    result = validator.validate_all()
    if result.go_status == "GO":
        print("All containers healthy!")
    else:
        print(f"Issues: {result.missing + result.unhealthy}")
"""

import json
import subprocess
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict, Any
import yaml


class ContainerLevel(Enum):
    """Criticality levels for containers."""
    CRITICAL = "critical"
    REQUIRED = "required"
    OPTIONAL = "optional"

    @property
    def importance(self) -> int:
        """Numeric importance for ordering."""
        return {"critical": 3, "required": 2, "optional": 1}[self.value]


@dataclass
class ContainerStatus:
    """Status of a single container."""
    name: str
    running: bool
    healthy: bool
    level: str
    error: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "running": self.running,
            "healthy": self.healthy,
            "level": self.level,
            "error": self.error,
        }


@dataclass
class ValidationResult:
    """Result of container validation."""
    all_healthy: bool
    missing: List[str]
    unhealthy: List[str]
    warnings: List[str]
    go_status: str
    details: List[ContainerStatus] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "all_healthy": self.all_healthy,
            "missing": self.missing,
            "unhealthy": self.unhealthy,
            "warnings": self.warnings,
            "go_status": self.go_status,
            "details": [d.to_dict() for d in self.details],
        }


@dataclass
class ContainerConfig:
    """Configuration for a required container."""
    name: str
    level: ContainerLevel = ContainerLevel.REQUIRED
    aliases: List[str] = field(default_factory=list)


# Default required containers for WAVE
DEFAULT_CONTAINERS = [
    # Critical - must be running
    ContainerConfig("wave-orchestrator", ContainerLevel.CRITICAL),
    ContainerConfig("wave-redis", ContainerLevel.CRITICAL),
    ContainerConfig("wave-dozzle", ContainerLevel.CRITICAL),

    # Required - should be running
    ContainerConfig("wave-merge-watcher", ContainerLevel.REQUIRED),
    ContainerConfig("wave-pm-agent", ContainerLevel.REQUIRED, aliases=["wave-pm"]),
    ContainerConfig("wave-fe-agent-1", ContainerLevel.REQUIRED, aliases=["wave-fe-dev-1"]),
    ContainerConfig("wave-be-agent-1", ContainerLevel.REQUIRED, aliases=["wave-be-dev-1"]),
    ContainerConfig("wave-qa-agent", ContainerLevel.REQUIRED, aliases=["wave-qa"]),

    # Optional - nice to have
    ContainerConfig("wave-fe-agent-2", ContainerLevel.OPTIONAL, aliases=["wave-fe-dev-2"]),
    ContainerConfig("wave-be-agent-2", ContainerLevel.OPTIONAL, aliases=["wave-be-dev-2"]),
    ContainerConfig("wave-cto", ContainerLevel.OPTIONAL),
    ContainerConfig("wave-dev-fix", ContainerLevel.OPTIONAL),
]


class ContainerValidator:
    """
    Validates Docker container health and completeness.

    Checks that all required WAVE containers are:
    1. Defined in docker-compose
    2. Running
    3. Healthy (if healthcheck defined)
    """

    def __init__(self, containers: Optional[List[ContainerConfig]] = None):
        """
        Initialize validator.

        Args:
            containers: Custom container list (uses defaults if None)
        """
        self._containers = containers if containers else DEFAULT_CONTAINERS.copy()

    def get_required_containers(self) -> List[ContainerConfig]:
        """Get list of required containers."""
        return self._containers

    def add_container(self, name: str, level: str = "required") -> None:
        """
        Add a container to check.

        Args:
            name: Container name
            level: Criticality level (critical, required, optional)
        """
        level_enum = ContainerLevel(level)
        self._containers.append(ContainerConfig(name, level_enum))

    def remove_container(self, name: str) -> None:
        """
        Remove a container from checks.

        Args:
            name: Container name to remove
        """
        self._containers = [c for c in self._containers if c.name != name]

    def _docker_inspect(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Inspect a Docker container.

        Args:
            name: Container name

        Returns:
            Inspection data or None if not found
        """
        try:
            result = subprocess.run(
                ["docker", "inspect", name],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                return data[0] if data else None
            return None
        except (subprocess.TimeoutExpired, json.JSONDecodeError, IndexError):
            return None

    def _container_exists(self, name: str) -> bool:
        """Check if container exists (running or not)."""
        try:
            result = subprocess.run(
                ["docker", "ps", "-a", "--filter", f"name=^{name}$", "--format", "{{.Names}}"],
                capture_output=True,
                text=True,
                timeout=10
            )
            return name in result.stdout.strip().split('\n')
        except subprocess.TimeoutExpired:
            return False

    def check_container(self, name: str) -> ContainerStatus:
        """
        Check status of a single container.

        Args:
            name: Container name

        Returns:
            ContainerStatus with running/healthy flags
        """
        # Find container config to get level
        config = next((c for c in self._containers if c.name == name), None)
        level = config.level.value if config else "required"

        # Try primary name and aliases
        names_to_try = [name]
        if config and config.aliases:
            names_to_try.extend(config.aliases)

        for try_name in names_to_try:
            inspect_data = self._docker_inspect(try_name)
            if inspect_data:
                state = inspect_data.get("State", {})
                running = state.get("Status") == "running"

                # Check health if healthcheck exists
                health = state.get("Health", {})
                health_status = health.get("Status", "none")

                # "none" means no healthcheck defined, consider healthy if running
                healthy = running and (health_status in ["healthy", "none"])

                return ContainerStatus(
                    name=name,
                    running=running,
                    healthy=healthy,
                    level=level
                )

        # Container not found
        return ContainerStatus(
            name=name,
            running=False,
            healthy=False,
            level=level,
            error="Container not found"
        )

    def validate_all(self) -> ValidationResult:
        """
        Validate all required containers.

        Returns:
            ValidationResult with overall status
        """
        missing: List[str] = []
        unhealthy: List[str] = []
        warnings: List[str] = []
        details: List[ContainerStatus] = []
        critical_missing = False

        for config in self._containers:
            status = self.check_container(config.name)
            details.append(status)

            if not status.running:
                missing.append(config.name)
                if config.level == ContainerLevel.CRITICAL:
                    critical_missing = True
                    warnings.append(f"CRITICAL: {config.name} is not running")
                elif config.level == ContainerLevel.REQUIRED:
                    warnings.append(f"Required container {config.name} is not running")
            elif not status.healthy:
                unhealthy.append(config.name)
                if config.level == ContainerLevel.CRITICAL:
                    warnings.append(f"CRITICAL: {config.name} is unhealthy")
                else:
                    warnings.append(f"Container {config.name} is unhealthy")

        # Determine go status
        if critical_missing:
            go_status = "NO-GO"
        elif missing or unhealthy:
            go_status = "CONDITIONAL-GO"
        else:
            go_status = "GO"

        all_healthy = len(missing) == 0 and len(unhealthy) == 0

        return ValidationResult(
            all_healthy=all_healthy,
            missing=missing,
            unhealthy=unhealthy,
            warnings=warnings,
            go_status=go_status,
            details=details
        )

    @classmethod
    def from_compose_file(cls, path: str) -> "ContainerValidator":
        """
        Create validator from docker-compose.yml.

        Args:
            path: Path to docker-compose.yml

        Returns:
            ContainerValidator configured with containers from file
        """
        try:
            with open(path, 'r') as f:
                compose = yaml.safe_load(f)
        except (FileNotFoundError, yaml.YAMLError):
            return cls()  # Return default validator

        containers = []
        services = compose.get("services", {})

        for service_name, service_config in services.items():
            container_name = service_config.get("container_name", service_name)

            # Determine level based on service name
            if service_name in ["orchestrator", "redis", "dozzle"]:
                level = ContainerLevel.CRITICAL
            elif service_name in ["merge-watcher", "pm", "fe-agent-1", "be-agent-1", "qa"]:
                level = ContainerLevel.REQUIRED
            else:
                level = ContainerLevel.OPTIONAL

            containers.append(ContainerConfig(container_name, level))

        return cls(containers)


def validate_containers() -> ValidationResult:
    """
    Quick helper to validate all containers.

    Returns:
        ValidationResult
    """
    validator = ContainerValidator()
    return validator.validate_all()


__all__ = [
    "ContainerValidator",
    "ContainerStatus",
    "ContainerConfig",
    "ContainerLevel",
    "ValidationResult",
    "validate_containers",
    "DEFAULT_CONTAINERS",
]
