"""
WAVE v2 gVisor Sandbox Module

Provides secure container isolation for agent execution.
Uses gVisor (runsc) for VM-level isolation without VM overhead.
"""

import os
import json
import subprocess
import tempfile
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════
# AVAILABILITY CHECK
# ═══════════════════════════════════════════════════════════════════════════════

def _check_gvisor_available() -> bool:
    """Check if gVisor (runsc) is available."""
    try:
        result = subprocess.run(
            ["runsc", "--version"],
            capture_output=True,
            timeout=5
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def _check_docker_available() -> bool:
    """Check if Docker is available."""
    try:
        result = subprocess.run(
            ["docker", "--version"],
            capture_output=True,
            timeout=5
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


GVISOR_AVAILABLE = _check_gvisor_available()
DOCKER_AVAILABLE = _check_docker_available()


# ═══════════════════════════════════════════════════════════════════════════════
# TYPES
# ═══════════════════════════════════════════════════════════════════════════════

class SandboxRuntime(str, Enum):
    """Available sandbox runtimes."""
    GVISOR = "runsc"          # gVisor (most secure)
    DOCKER = "runc"           # Standard Docker (fallback)
    PROCESS = "process"       # Direct process (development only)


class IsolationLevel(str, Enum):
    """Isolation levels for sandboxes."""
    STRICT = "strict"         # No network, read-only root
    STANDARD = "standard"     # Limited network, workspace write
    PERMISSIVE = "permissive" # Full network, workspace write


@dataclass
class SandboxConfig:
    """Configuration for a sandbox container."""
    name: str
    image: str = "python:3.11-slim"
    runtime: SandboxRuntime = SandboxRuntime.GVISOR
    isolation: IsolationLevel = IsolationLevel.STANDARD

    # Resource limits
    memory_limit: str = "2g"
    cpu_limit: float = 1.0
    timeout_seconds: int = 300

    # Filesystem mounts
    workspace_path: Optional[str] = None
    read_only_mounts: List[str] = field(default_factory=list)

    # Network settings
    network_enabled: bool = False
    allowed_hosts: List[str] = field(default_factory=list)

    # Environment
    environment: Dict[str, str] = field(default_factory=dict)

    def to_docker_args(self) -> List[str]:
        """Convert config to Docker run arguments."""
        args = [
            "--rm",
            f"--name={self.name}",
            f"--memory={self.memory_limit}",
            f"--cpus={self.cpu_limit}",
        ]

        # Runtime selection
        if self.runtime == SandboxRuntime.GVISOR and GVISOR_AVAILABLE:
            args.append("--runtime=runsc")

        # Network settings
        if not self.network_enabled:
            args.append("--network=none")

        # Read-only root for strict isolation
        if self.isolation == IsolationLevel.STRICT:
            args.append("--read-only")

        # Workspace mount
        if self.workspace_path:
            mount_opt = "ro" if self.isolation == IsolationLevel.STRICT else "rw"
            args.append(f"--volume={self.workspace_path}:/workspace:{mount_opt}")

        # Read-only mounts
        for mount in self.read_only_mounts:
            args.append(f"--volume={mount}:/mnt/{Path(mount).name}:ro")

        # Environment variables
        for key, value in self.environment.items():
            args.append(f"--env={key}={value}")

        # Security options
        args.extend([
            "--security-opt=no-new-privileges",
            "--cap-drop=ALL",
        ])

        # Add specific capabilities if needed
        if self.isolation != IsolationLevel.STRICT:
            args.append("--cap-add=CHOWN")
            args.append("--cap-add=SETUID")
            args.append("--cap-add=SETGID")

        return args


@dataclass
class SandboxResult:
    """Result from sandbox execution."""
    success: bool
    exit_code: int
    stdout: str
    stderr: str
    duration_seconds: float
    sandbox_id: str
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "exit_code": self.exit_code,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "duration_seconds": self.duration_seconds,
            "sandbox_id": self.sandbox_id,
            "error": self.error
        }


# ═══════════════════════════════════════════════════════════════════════════════
# SANDBOX MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class SandboxManager:
    """
    Manages sandbox containers for agent execution.

    Features:
    - gVisor isolation (with Docker fallback)
    - Resource limits (memory, CPU, time)
    - Network isolation
    - Filesystem restrictions
    """

    def __init__(self, default_runtime: Optional[SandboxRuntime] = None):
        """
        Initialize sandbox manager.

        Args:
            default_runtime: Default runtime to use
        """
        # Auto-select best available runtime
        if default_runtime:
            self.default_runtime = default_runtime
        elif GVISOR_AVAILABLE:
            self.default_runtime = SandboxRuntime.GVISOR
        elif DOCKER_AVAILABLE:
            self.default_runtime = SandboxRuntime.DOCKER
        else:
            self.default_runtime = SandboxRuntime.PROCESS

        self._active_sandboxes: Dict[str, SandboxConfig] = {}

    def get_runtime_info(self) -> Dict[str, Any]:
        """Get information about available runtimes."""
        return {
            "gvisor_available": GVISOR_AVAILABLE,
            "docker_available": DOCKER_AVAILABLE,
            "default_runtime": self.default_runtime.value,
            "active_sandboxes": len(self._active_sandboxes)
        }

    def create_config(
        self,
        name: str,
        workspace_path: Optional[str] = None,
        isolation: IsolationLevel = IsolationLevel.STANDARD,
        **kwargs
    ) -> SandboxConfig:
        """
        Create a sandbox configuration.

        Args:
            name: Unique sandbox name
            workspace_path: Path to mount as workspace
            isolation: Isolation level
            **kwargs: Additional config options

        Returns:
            SandboxConfig
        """
        config = SandboxConfig(
            name=name,
            runtime=self.default_runtime,
            workspace_path=workspace_path,
            isolation=isolation,
            **kwargs
        )
        return config

    def run(
        self,
        config: SandboxConfig,
        command: List[str],
        stdin: Optional[str] = None
    ) -> SandboxResult:
        """
        Run a command in a sandbox.

        Args:
            config: Sandbox configuration
            command: Command to run
            stdin: Optional stdin input

        Returns:
            SandboxResult
        """
        start_time = datetime.now()
        sandbox_id = f"{config.name}-{start_time.strftime('%Y%m%d%H%M%S')}"

        # Track active sandbox
        self._active_sandboxes[sandbox_id] = config

        try:
            if config.runtime == SandboxRuntime.PROCESS:
                result = self._run_process(config, command, stdin, sandbox_id)
            else:
                result = self._run_docker(config, command, stdin, sandbox_id)

            return result
        finally:
            # Remove from active sandboxes
            self._active_sandboxes.pop(sandbox_id, None)

    def _run_docker(
        self,
        config: SandboxConfig,
        command: List[str],
        stdin: Optional[str],
        sandbox_id: str
    ) -> SandboxResult:
        """Run command in Docker container."""
        if not DOCKER_AVAILABLE:
            return SandboxResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr="",
                duration_seconds=0,
                sandbox_id=sandbox_id,
                error="Docker not available"
            )

        start_time = datetime.now()

        # Build docker command
        docker_args = ["docker", "run"]
        docker_args.extend(config.to_docker_args())
        docker_args.append(config.image)
        docker_args.extend(command)

        try:
            process = subprocess.run(
                docker_args,
                input=stdin.encode() if stdin else None,
                capture_output=True,
                timeout=config.timeout_seconds
            )

            duration = (datetime.now() - start_time).total_seconds()

            return SandboxResult(
                success=process.returncode == 0,
                exit_code=process.returncode,
                stdout=process.stdout.decode(errors="replace"),
                stderr=process.stderr.decode(errors="replace"),
                duration_seconds=duration,
                sandbox_id=sandbox_id
            )
        except subprocess.TimeoutExpired:
            duration = (datetime.now() - start_time).total_seconds()
            return SandboxResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr="",
                duration_seconds=duration,
                sandbox_id=sandbox_id,
                error=f"Timeout after {config.timeout_seconds}s"
            )
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            return SandboxResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr="",
                duration_seconds=duration,
                sandbox_id=sandbox_id,
                error=str(e)
            )

    def _run_process(
        self,
        config: SandboxConfig,
        command: List[str],
        stdin: Optional[str],
        sandbox_id: str
    ) -> SandboxResult:
        """Run command as direct process (development only)."""
        start_time = datetime.now()

        # Set up environment
        env = os.environ.copy()
        env.update(config.environment)

        # Set working directory
        cwd = config.workspace_path if config.workspace_path else None

        try:
            process = subprocess.run(
                command,
                input=stdin.encode() if stdin else None,
                capture_output=True,
                timeout=config.timeout_seconds,
                env=env,
                cwd=cwd
            )

            duration = (datetime.now() - start_time).total_seconds()

            return SandboxResult(
                success=process.returncode == 0,
                exit_code=process.returncode,
                stdout=process.stdout.decode(errors="replace"),
                stderr=process.stderr.decode(errors="replace"),
                duration_seconds=duration,
                sandbox_id=sandbox_id
            )
        except subprocess.TimeoutExpired:
            duration = (datetime.now() - start_time).total_seconds()
            return SandboxResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr="",
                duration_seconds=duration,
                sandbox_id=sandbox_id,
                error=f"Timeout after {config.timeout_seconds}s"
            )
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            return SandboxResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr="",
                duration_seconds=duration,
                sandbox_id=sandbox_id,
                error=str(e)
            )

    def stop(self, sandbox_id: str) -> bool:
        """
        Stop a running sandbox.

        Args:
            sandbox_id: Sandbox to stop

        Returns:
            True if stopped successfully
        """
        if sandbox_id not in self._active_sandboxes:
            return False

        config = self._active_sandboxes[sandbox_id]

        if config.runtime != SandboxRuntime.PROCESS and DOCKER_AVAILABLE:
            try:
                subprocess.run(
                    ["docker", "stop", config.name],
                    capture_output=True,
                    timeout=10
                )
                return True
            except Exception:
                return False

        return False

    def cleanup(self) -> int:
        """
        Clean up any orphaned sandbox containers.

        Returns:
            Number of containers cleaned up
        """
        if not DOCKER_AVAILABLE:
            return 0

        try:
            # List WAVE sandbox containers
            result = subprocess.run(
                ["docker", "ps", "-a", "--filter", "name=wave-sandbox-", "-q"],
                capture_output=True,
                timeout=10
            )

            if result.returncode != 0:
                return 0

            container_ids = result.stdout.decode().strip().split("\n")
            container_ids = [c for c in container_ids if c]

            if not container_ids:
                return 0

            # Remove containers
            subprocess.run(
                ["docker", "rm", "-f"] + container_ids,
                capture_output=True,
                timeout=30
            )

            return len(container_ids)
        except Exception:
            return 0


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

# Global sandbox manager
_manager: Optional[SandboxManager] = None


def get_manager() -> SandboxManager:
    """Get or create global sandbox manager."""
    global _manager
    if _manager is None:
        _manager = SandboxManager()
    return _manager


def create_sandbox(
    name: str,
    workspace_path: Optional[str] = None,
    isolation: IsolationLevel = IsolationLevel.STANDARD,
    **kwargs
) -> SandboxConfig:
    """
    Quick helper to create a sandbox config.

    Args:
        name: Sandbox name
        workspace_path: Workspace to mount
        isolation: Isolation level
        **kwargs: Additional options

    Returns:
        SandboxConfig
    """
    manager = get_manager()
    return manager.create_config(name, workspace_path, isolation, **kwargs)


def run_in_sandbox(
    command: List[str],
    workspace_path: Optional[str] = None,
    isolation: IsolationLevel = IsolationLevel.STANDARD,
    stdin: Optional[str] = None,
    timeout: int = 300
) -> SandboxResult:
    """
    Quick helper to run a command in a sandbox.

    Args:
        command: Command to run
        workspace_path: Workspace to mount
        isolation: Isolation level
        stdin: Optional stdin
        timeout: Timeout in seconds

    Returns:
        SandboxResult
    """
    manager = get_manager()

    config = manager.create_config(
        name=f"wave-sandbox-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        workspace_path=workspace_path,
        isolation=isolation,
        timeout_seconds=timeout
    )

    return manager.run(config, command, stdin)


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "SandboxRuntime",
    "IsolationLevel",
    "SandboxConfig",
    "SandboxResult",
    "SandboxManager",
    "get_manager",
    "create_sandbox",
    "run_in_sandbox",
    "GVISOR_AVAILABLE",
    "DOCKER_AVAILABLE",
]
