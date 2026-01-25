"""
LangSmith Tracing Manager Module
Phase LangSmith-2: Core Tracing Infrastructure

Provides centralized management for LangSmith tracing.

Features:
    - Singleton pattern for global tracing state
    - Initialize/shutdown lifecycle
    - Active state tracking
    - Configuration management
"""

import os
import threading
from typing import Optional, Any, Dict
from contextlib import contextmanager

from .config import TracingConfig, get_tracing_config


# =============================================================================
# TRACING MANAGER
# =============================================================================

class TracingManager:
    """
    Singleton manager for LangSmith tracing.

    Manages the lifecycle of tracing, including initialization,
    active state tracking, and shutdown.

    Usage:
        manager = TracingManager.get_instance()
        manager.initialize(config)

        if manager.is_active():
            # Tracing is enabled and configured
            pass

        manager.shutdown()
    """

    _instance: Optional["TracingManager"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self):
        """
        Initialize TracingManager.

        Note: Use get_instance() instead of direct instantiation.
        """
        self._config: Optional[TracingConfig] = None
        self._initialized: bool = False
        self._active: bool = False

    @classmethod
    def get_instance(cls) -> "TracingManager":
        """
        Get or create the singleton TracingManager instance.

        Thread-safe singleton pattern.

        Returns:
            TracingManager instance
        """
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """
        Reset the singleton instance.

        Used for testing to ensure clean state.
        """
        with cls._lock:
            if cls._instance is not None:
                cls._instance.shutdown()
            cls._instance = None

    def initialize(self, config: Optional[TracingConfig] = None) -> bool:
        """
        Initialize tracing with the given configuration.

        If no config is provided, loads from environment.

        Args:
            config: Optional TracingConfig instance

        Returns:
            True if initialization successful, False otherwise
        """
        if self._initialized:
            return True

        # Load config from environment if not provided
        self._config = config or get_tracing_config(reload=True)

        # Validate configuration
        valid, errors = self._config.validate()

        if not valid and self._config.enabled:
            # Log errors but don't fail - just disable tracing
            for error in errors:
                print(f"[TracingManager] Config warning: {error}")
            self._active = False
        else:
            # Apply configuration to environment
            self._config.apply()
            self._active = self._config.enabled

        self._initialized = True

        if self._active:
            print(f"[TracingManager] Initialized - Project: {self._config.project}")
        else:
            print("[TracingManager] Initialized - Tracing disabled")

        return True

    def is_active(self) -> bool:
        """
        Check if tracing is currently active.

        Returns True only if:
        - Manager is initialized
        - Tracing is enabled in config
        - Config is valid (has API key)

        Returns:
            True if tracing is active
        """
        return self._initialized and self._active

    def get_config(self) -> Optional[TracingConfig]:
        """
        Get the current tracing configuration.

        Returns:
            TracingConfig or None if not initialized
        """
        return self._config

    def shutdown(self) -> None:
        """
        Shutdown tracing and cleanup resources.

        Resets internal state but preserves singleton.
        """
        if not self._initialized:
            return

        self._active = False
        self._initialized = False
        self._config = None

        print("[TracingManager] Shutdown complete")

    def __repr__(self) -> str:
        """String representation."""
        return (
            f"TracingManager("
            f"initialized={self._initialized}, "
            f"active={self._active}, "
            f"project={self._config.project if self._config else None})"
        )


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_tracing_manager() -> TracingManager:
    """
    Get the global TracingManager instance.

    Convenience function for accessing the singleton.

    Returns:
        TracingManager instance
    """
    return TracingManager.get_instance()


def is_tracing_active() -> bool:
    """
    Check if tracing is currently active.

    Convenience function that doesn't require getting the manager.

    Returns:
        True if tracing is active
    """
    return TracingManager.get_instance().is_active()


def initialize_tracing(config: Optional[TracingConfig] = None) -> bool:
    """
    Initialize global tracing.

    Convenience function for quick initialization.

    Args:
        config: Optional TracingConfig

    Returns:
        True if successful
    """
    return TracingManager.get_instance().initialize(config)


def shutdown_tracing() -> None:
    """
    Shutdown global tracing.

    Convenience function for cleanup.
    """
    TracingManager.get_instance().shutdown()


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "TracingManager",
    "get_tracing_manager",
    "is_tracing_active",
    "initialize_tracing",
    "shutdown_tracing",
]
