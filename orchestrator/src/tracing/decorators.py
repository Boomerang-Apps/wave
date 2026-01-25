"""
LangSmith Tracing Decorators Module
Phase LangSmith-2: Core Tracing Infrastructure

Provides decorators for tracing WAVE components:
    - trace_node: For LangGraph nodes
    - trace_tool: For tool/function calls
    - trace_llm_call: For LLM invocations

All decorators are no-op when tracing is disabled.
"""

import functools
import asyncio
from typing import Optional, Dict, List, Any, Callable, TypeVar, Union
from contextlib import contextmanager

from .manager import TracingManager, is_tracing_active

# Type variables for generic decorators
F = TypeVar("F", bound=Callable[..., Any])


# =============================================================================
# TRACE NODE DECORATOR
# =============================================================================

def trace_node(
    name: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
) -> Callable[[F], F]:
    """
    Decorator for tracing LangGraph nodes.

    Wraps a node function to automatically create trace spans
    when tracing is active.

    Args:
        name: Custom name for the trace (default: function name)
        metadata: Additional metadata to attach to trace
        tags: Tags for categorization

    Returns:
        Decorated function

    Example:
        @trace_node(tags=["agent", "developer"])
        def developer_node(state: WAVEState) -> WAVEState:
            # Node implementation
            pass
    """
    def decorator(func: F) -> F:
        trace_name = name or func.__name__
        trace_metadata = metadata or {}
        trace_tags = tags or ["node"]

        # Add node-specific metadata
        trace_metadata["run_type"] = "chain"
        trace_metadata["node_name"] = trace_name

        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            if not is_tracing_active():
                return func(*args, **kwargs)

            # When tracing is active, use langsmith traceable
            try:
                from langsmith import traceable

                traced_func = traceable(
                    run_type="chain",
                    name=trace_name,
                    metadata=trace_metadata,
                    tags=trace_tags,
                )(func)
                return traced_func(*args, **kwargs)
            except ImportError:
                # langsmith not installed, run without tracing
                return func(*args, **kwargs)

        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            if not is_tracing_active():
                return await func(*args, **kwargs)

            try:
                from langsmith import traceable

                traced_func = traceable(
                    run_type="chain",
                    name=trace_name,
                    metadata=trace_metadata,
                    tags=trace_tags,
                )(func)
                return await traced_func(*args, **kwargs)
            except ImportError:
                return await func(*args, **kwargs)

        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return sync_wrapper  # type: ignore

    return decorator


# =============================================================================
# TRACE TOOL DECORATOR
# =============================================================================

def trace_tool(
    name: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
) -> Callable[[F], F]:
    """
    Decorator for tracing tool/function calls.

    Sets run_type to "tool" for proper categorization in LangSmith.

    Args:
        name: Custom name for the trace (default: function name)
        metadata: Additional metadata to attach to trace
        tags: Tags for categorization

    Returns:
        Decorated function

    Example:
        @trace_tool(name="search_documents")
        def search(query: str) -> List[Document]:
            # Tool implementation
            pass
    """
    def decorator(func: F) -> F:
        trace_name = name or func.__name__
        trace_metadata = metadata or {}
        trace_tags = tags or ["tool"]

        # Add tool-specific metadata
        trace_metadata["run_type"] = "tool"
        trace_metadata["tool_name"] = trace_name

        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            if not is_tracing_active():
                return func(*args, **kwargs)

            try:
                from langsmith import traceable

                traced_func = traceable(
                    run_type="tool",
                    name=trace_name,
                    metadata=trace_metadata,
                    tags=trace_tags,
                )(func)
                return traced_func(*args, **kwargs)
            except ImportError:
                return func(*args, **kwargs)

        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            if not is_tracing_active():
                return await func(*args, **kwargs)

            try:
                from langsmith import traceable

                traced_func = traceable(
                    run_type="tool",
                    name=trace_name,
                    metadata=trace_metadata,
                    tags=trace_tags,
                )(func)
                return await traced_func(*args, **kwargs)
            except ImportError:
                return await func(*args, **kwargs)

        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return sync_wrapper  # type: ignore

    return decorator


# =============================================================================
# TRACE LLM CALL DECORATOR
# =============================================================================

def trace_llm_call(
    model: Optional[str] = None,
    name: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
) -> Callable[[F], F]:
    """
    Decorator for tracing LLM calls.

    Sets run_type to "llm" and captures model information.

    Args:
        model: Model identifier (e.g., "claude-3-opus", "gpt-4")
        name: Custom name for the trace (default: function name)
        metadata: Additional metadata to attach to trace
        tags: Tags for categorization

    Returns:
        Decorated function

    Example:
        @trace_llm_call(model="claude-3-opus")
        async def call_claude(messages: List[dict]) -> str:
            # LLM call implementation
            pass
    """
    def decorator(func: F) -> F:
        trace_name = name or func.__name__
        trace_metadata = metadata or {}
        trace_tags = tags or ["llm"]

        # Add LLM-specific metadata
        trace_metadata["run_type"] = "llm"
        if model:
            trace_metadata["model"] = model
            trace_metadata["ls_model_name"] = model

        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            if not is_tracing_active():
                return func(*args, **kwargs)

            try:
                from langsmith import traceable

                traced_func = traceable(
                    run_type="llm",
                    name=trace_name,
                    metadata=trace_metadata,
                    tags=trace_tags,
                )(func)
                return traced_func(*args, **kwargs)
            except ImportError:
                return func(*args, **kwargs)

        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
            if not is_tracing_active():
                return await func(*args, **kwargs)

            try:
                from langsmith import traceable

                traced_func = traceable(
                    run_type="llm",
                    name=trace_name,
                    metadata=trace_metadata,
                    tags=trace_tags,
                )(func)
                return await traced_func(*args, **kwargs)
            except ImportError:
                return await func(*args, **kwargs)

        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return sync_wrapper  # type: ignore

    return decorator


# =============================================================================
# CONTEXT HELPERS
# =============================================================================

@contextmanager
def with_trace_context(
    project_name: Optional[str] = None,
    tags: Optional[List[str]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    enabled: Optional[bool] = None,
):
    """
    Context manager for setting trace context.

    All traced functions called within this context will inherit
    the specified project, tags, and metadata.

    Args:
        project_name: Project name for traces
        tags: Tags to apply to all traces
        metadata: Metadata to apply to all traces
        enabled: Override enabled state

    Example:
        with with_trace_context(project_name="my-project", tags=["test"]):
            # All traces here use "my-project"
            my_traced_function()
    """
    if not is_tracing_active():
        yield
        return

    try:
        from langsmith import tracing_context

        with tracing_context(
            project_name=project_name,
            tags=tags,
            metadata=metadata,
            enabled=enabled,
        ):
            yield
    except ImportError:
        yield


def get_trace_context() -> Optional[Any]:
    """
    Get the current trace context (run tree).

    Returns the active RunTree if tracing is active,
    otherwise returns None.

    Returns:
        Current RunTree or None

    Example:
        ctx = get_trace_context()
        if ctx:
            ctx.metadata["custom_key"] = "value"
    """
    if not is_tracing_active():
        return None

    try:
        from langsmith import get_current_run_tree

        return get_current_run_tree()
    except ImportError:
        return None


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Decorators
    "trace_node",
    "trace_tool",
    "trace_llm_call",
    # Context helpers
    "with_trace_context",
    "get_trace_context",
]
