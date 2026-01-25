"""
LangSmith Tracing Configuration Module
Phase LangSmith-1: Configuration

Provides configuration management for LangSmith tracing integration.

Environment Variables:
    LANGSMITH_TRACING: Enable/disable tracing (true/false)
    LANGSMITH_API_KEY: LangSmith API key
    LANGSMITH_ENDPOINT: API endpoint (default: https://api.smith.langchain.com)
    LANGSMITH_PROJECT: Project name (default: wave-orchestrator)
    LANGSMITH_SAMPLE_RATE: Sampling rate 0.0-1.0 (default: 1.0)
"""

import os
from dataclasses import dataclass, field
from typing import Optional, Tuple, List


# =============================================================================
# CONSTANTS
# =============================================================================

DEFAULT_ENDPOINT = "https://api.smith.langchain.com"
DEFAULT_PROJECT = "wave-orchestrator"
DEFAULT_SAMPLE_RATE = 1.0


# =============================================================================
# TRACING CONFIG
# =============================================================================

@dataclass
class TracingConfig:
    """
    Configuration for LangSmith tracing.

    Attributes:
        enabled: Whether tracing is enabled
        api_key: LangSmith API key
        endpoint: LangSmith API endpoint
        project: Project name for grouping traces
        sample_rate: Sampling rate (0.0 to 1.0)
    """
    enabled: bool = True
    api_key: Optional[str] = None
    endpoint: str = DEFAULT_ENDPOINT
    project: str = DEFAULT_PROJECT
    sample_rate: float = DEFAULT_SAMPLE_RATE

    @classmethod
    def from_env(cls) -> "TracingConfig":
        """
        Load configuration from environment variables.

        Environment Variables:
            LANGSMITH_TRACING: Enable/disable tracing (true/false)
            LANGSMITH_API_KEY: LangSmith API key
            LANGSMITH_ENDPOINT: API endpoint
            LANGSMITH_PROJECT: Project name
            LANGSMITH_SAMPLE_RATE: Sampling rate (0.0-1.0)

        Returns:
            TracingConfig instance
        """
        # Parse enabled flag
        tracing_env = os.environ.get("LANGSMITH_TRACING", "true").lower()
        enabled = tracing_env in ("true", "1", "yes", "on")

        # Parse sample rate
        sample_rate_str = os.environ.get("LANGSMITH_SAMPLE_RATE", str(DEFAULT_SAMPLE_RATE))
        try:
            sample_rate = float(sample_rate_str)
        except ValueError:
            sample_rate = DEFAULT_SAMPLE_RATE

        return cls(
            enabled=enabled,
            api_key=os.environ.get("LANGSMITH_API_KEY"),
            endpoint=os.environ.get("LANGSMITH_ENDPOINT", DEFAULT_ENDPOINT),
            project=os.environ.get("LANGSMITH_PROJECT", DEFAULT_PROJECT),
            sample_rate=sample_rate,
        )

    def validate(self) -> Tuple[bool, List[str]]:
        """
        Validate the configuration.

        Checks:
            1. API key is present when tracing is enabled
            2. Sample rate is between 0.0 and 1.0
            3. Endpoint is not empty

        Returns:
            Tuple of (valid: bool, errors: List[str])
        """
        errors: List[str] = []

        # Check API key (only required when enabled)
        if self.enabled and not self.api_key:
            errors.append("LANGSMITH_API_KEY is required when tracing is enabled")

        # Check sample rate bounds
        if self.sample_rate < 0.0 or self.sample_rate > 1.0:
            errors.append(f"LANGSMITH_SAMPLE_RATE must be between 0.0 and 1.0, got {self.sample_rate}")

        # Check endpoint
        if self.enabled and not self.endpoint:
            errors.append("LANGSMITH_ENDPOINT cannot be empty when tracing is enabled")

        return (len(errors) == 0, errors)

    def apply(self) -> None:
        """
        Apply configuration to environment variables.

        Sets the LANGSMITH_* environment variables based on this config.
        """
        # Set tracing flag
        os.environ["LANGSMITH_TRACING"] = "true" if self.enabled else "false"

        # Set other variables
        if self.api_key:
            os.environ["LANGSMITH_API_KEY"] = self.api_key

        os.environ["LANGSMITH_ENDPOINT"] = self.endpoint
        os.environ["LANGSMITH_PROJECT"] = self.project
        os.environ["LANGSMITH_SAMPLE_RATE"] = str(self.sample_rate)

    def __repr__(self) -> str:
        """Safe representation (hides API key)."""
        masked_key = f"{self.api_key[:4]}...{self.api_key[-4:]}" if self.api_key else None
        return (
            f"TracingConfig("
            f"enabled={self.enabled}, "
            f"api_key={masked_key}, "
            f"endpoint={self.endpoint}, "
            f"project={self.project}, "
            f"sample_rate={self.sample_rate})"
        )


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Global cached config
_config: Optional[TracingConfig] = None


def get_tracing_config(reload: bool = False) -> TracingConfig:
    """
    Get the tracing configuration.

    Loads from environment on first call, caches for subsequent calls.

    Args:
        reload: Force reload from environment

    Returns:
        TracingConfig instance
    """
    global _config

    if _config is None or reload:
        _config = TracingConfig.from_env()

    return _config


def is_tracing_enabled() -> bool:
    """
    Check if tracing is enabled.

    Returns:
        True if tracing is enabled and valid
    """
    config = get_tracing_config()
    valid, _ = config.validate()
    return config.enabled and valid


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "TracingConfig",
    "get_tracing_config",
    "is_tracing_enabled",
    "DEFAULT_ENDPOINT",
    "DEFAULT_PROJECT",
    "DEFAULT_SAMPLE_RATE",
]
