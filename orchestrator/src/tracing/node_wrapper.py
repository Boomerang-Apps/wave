"""
LangSmith Node Wrapper Module
Phase LangSmith-3: Node Instrumentation

Provides utilities for wrapping WAVE nodes with tracing:
    - wrap_node: Generic node wrapper function
    - get_last_trace_info: Retrieve trace info from last execution
    - clear_trace_info: Clear stored trace info

All wrappers are transparent when tracing is disabled.
"""

import functools
import asyncio
import time
import threading
from typing import Optional, Dict, List, Any, Callable, TypeVar

from .manager import is_tracing_active

# Type variable for generic wrapper
F = TypeVar("F", bound=Callable[..., Any])

# Thread-local storage for trace info
_trace_info_storage = threading.local()


# =============================================================================
# TRACE INFO FUNCTIONS
# =============================================================================


def get_last_trace_info() -> Optional[Dict[str, Any]]:
    """
    Get trace info from the last wrapped node execution.

    Returns:
        Dict with trace info or None if no trace recorded

    Trace info contains:
        - node_name: Name of the node
        - duration_ms: Execution time in milliseconds
        - input_state: Input state (if capture_state=True)
        - output_state: Output state (if capture_state=True)
        - error: Error message (if exception occurred)
    """
    return getattr(_trace_info_storage, "last_trace_info", None)


def clear_trace_info() -> None:
    """
    Clear stored trace info.

    Use this between tests or when you want to reset state.
    """
    _trace_info_storage.last_trace_info = None


def _store_trace_info(info: Dict[str, Any]) -> None:
    """Store trace info in thread-local storage."""
    _trace_info_storage.last_trace_info = info


# =============================================================================
# WRAP NODE FUNCTION
# =============================================================================


def wrap_node(
    node_fn: Callable[[Dict[str, Any]], Dict[str, Any]],
    name: Optional[str] = None,
    capture_state: bool = False,
    tags: Optional[List[str]] = None,
) -> Callable[[Dict[str, Any]], Dict[str, Any]]:
    """
    Wrap a WAVE node function with tracing.

    Creates a transparent wrapper that:
    - Preserves original node output
    - Works with sync and async nodes
    - Captures execution time
    - Optionally captures input/output state
    - Handles and traces errors
    - Works when tracing is disabled

    Args:
        node_fn: The node function to wrap
        name: Custom name for the trace (default: function name)
        capture_state: Whether to capture input/output state
        tags: Tags for categorization

    Returns:
        Wrapped function with same signature

    Example:
        wrapped_node = wrap_node(my_node, name="my_node", capture_state=True)
        result = wrapped_node(state)
    """
    node_name = name or node_fn.__name__
    node_tags = tags or ["node"]

    if asyncio.iscoroutinefunction(node_fn):
        return _wrap_async_node(node_fn, node_name, capture_state, node_tags)
    else:
        return _wrap_sync_node(node_fn, node_name, capture_state, node_tags)


def _wrap_sync_node(
    node_fn: Callable[[Dict[str, Any]], Dict[str, Any]],
    node_name: str,
    capture_state: bool,
    tags: List[str],
) -> Callable[[Dict[str, Any]], Dict[str, Any]]:
    """Wrap a synchronous node function."""

    @functools.wraps(node_fn)
    def wrapper(state: Dict[str, Any]) -> Dict[str, Any]:
        # Always track timing for trace info
        start_time = time.perf_counter()
        trace_info: Dict[str, Any] = {"node_name": node_name}

        # Capture input state if enabled
        if capture_state:
            trace_info["input_state"] = _safe_copy_state(state)

        error_occurred = None
        result = None

        try:
            # Execute with tracing if active
            if is_tracing_active():
                result = _execute_with_tracing(
                    node_fn, state, node_name, tags, is_async=False
                )
            else:
                result = node_fn(state)

            return result

        except Exception as e:
            error_occurred = e
            trace_info["error"] = f"{type(e).__name__}: {str(e)}"
            raise

        finally:
            # Calculate duration
            end_time = time.perf_counter()
            trace_info["duration_ms"] = (end_time - start_time) * 1000

            # Capture output state if enabled and no error
            if capture_state and result is not None:
                trace_info["output_state"] = _safe_copy_state(result)

            # Store trace info
            _store_trace_info(trace_info)

    return wrapper


def _wrap_async_node(
    node_fn: Callable[[Dict[str, Any]], Any],
    node_name: str,
    capture_state: bool,
    tags: List[str],
) -> Callable[[Dict[str, Any]], Any]:
    """Wrap an asynchronous node function."""

    @functools.wraps(node_fn)
    async def wrapper(state: Dict[str, Any]) -> Dict[str, Any]:
        # Always track timing for trace info
        start_time = time.perf_counter()
        trace_info: Dict[str, Any] = {"node_name": node_name}

        # Capture input state if enabled
        if capture_state:
            trace_info["input_state"] = _safe_copy_state(state)

        error_occurred = None
        result = None

        try:
            # Execute with tracing if active
            if is_tracing_active():
                result = await _execute_with_tracing_async(
                    node_fn, state, node_name, tags
                )
            else:
                result = await node_fn(state)

            return result

        except Exception as e:
            error_occurred = e
            trace_info["error"] = f"{type(e).__name__}: {str(e)}"
            raise

        finally:
            # Calculate duration
            end_time = time.perf_counter()
            trace_info["duration_ms"] = (end_time - start_time) * 1000

            # Capture output state if enabled and no error
            if capture_state and result is not None:
                trace_info["output_state"] = _safe_copy_state(result)

            # Store trace info
            _store_trace_info(trace_info)

    return wrapper


# =============================================================================
# TRACING EXECUTION HELPERS
# =============================================================================


def _execute_with_tracing(
    node_fn: Callable,
    state: Dict[str, Any],
    node_name: str,
    tags: List[str],
    is_async: bool = False,
) -> Dict[str, Any]:
    """Execute a sync node with LangSmith tracing."""
    try:
        from langsmith import traceable

        traced_fn = traceable(
            run_type="chain",
            name=node_name,
            tags=tags,
            metadata={"node_name": node_name, "run_type": "chain"},
        )(node_fn)

        return traced_fn(state)

    except ImportError:
        # LangSmith not installed, run without tracing
        return node_fn(state)


async def _execute_with_tracing_async(
    node_fn: Callable,
    state: Dict[str, Any],
    node_name: str,
    tags: List[str],
) -> Dict[str, Any]:
    """Execute an async node with LangSmith tracing."""
    try:
        from langsmith import traceable

        traced_fn = traceable(
            run_type="chain",
            name=node_name,
            tags=tags,
            metadata={"node_name": node_name, "run_type": "chain"},
        )(node_fn)

        return await traced_fn(state)

    except ImportError:
        # LangSmith not installed, run without tracing
        return await node_fn(state)


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================


def _safe_copy_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a safe copy of state for tracing.

    Performs a shallow copy to avoid modifying original state.
    For deep nested objects, this provides a reference.
    """
    if state is None:
        return {}

    try:
        # Shallow copy for simple state objects
        return dict(state)
    except Exception:
        # If copy fails, return empty dict
        return {}


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "wrap_node",
    "get_last_trace_info",
    "clear_trace_info",
]
