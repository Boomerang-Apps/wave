# WAVE v2 Tracing Module
#
# LangSmith Integration for Observability
#
# Phase LangSmith-1: Configuration
# Phase LangSmith-2: Core Tracing Infrastructure
# Phase LangSmith-3: Node Instrumentation
# Phase LangSmith-4: Metrics & Export
# Phase LangSmith-5: Portal Integration

from .config import (
    TracingConfig,
    get_tracing_config,
    is_tracing_enabled,
)

from .manager import (
    TracingManager,
    get_tracing_manager,
    is_tracing_active,
    initialize_tracing,
    shutdown_tracing,
)

from .decorators import (
    trace_node,
    trace_tool,
    trace_llm_call,
    with_trace_context,
    get_trace_context,
)

from .node_wrapper import (
    wrap_node,
    get_last_trace_info,
    clear_trace_info,
)

from .metrics import (
    RunMetrics,
    MetricsCollector,
    export_metrics_json,
    get_run_summary,
    attach_metrics_to_trace,
)

from .api import (
    router as tracing_router,
    store_run_metrics,
    get_stored_metrics,
    clear_stored_metrics,
)

__all__ = [
    # Config (Phase 1)
    "TracingConfig",
    "get_tracing_config",
    "is_tracing_enabled",
    # Manager (Phase 2)
    "TracingManager",
    "get_tracing_manager",
    "is_tracing_active",
    "initialize_tracing",
    "shutdown_tracing",
    # Decorators (Phase 2)
    "trace_node",
    "trace_tool",
    "trace_llm_call",
    "with_trace_context",
    "get_trace_context",
    # Node Wrapper (Phase 3)
    "wrap_node",
    "get_last_trace_info",
    "clear_trace_info",
    # Metrics & Export (Phase 4)
    "RunMetrics",
    "MetricsCollector",
    "export_metrics_json",
    "get_run_summary",
    "attach_metrics_to_trace",
    # Portal Integration (Phase 5)
    "tracing_router",
    "store_run_metrics",
    "get_stored_metrics",
    "clear_stored_metrics",
]
