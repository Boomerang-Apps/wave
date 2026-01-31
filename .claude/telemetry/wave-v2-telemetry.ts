/**
 * Wave V2 OpenTelemetry Configuration
 *
 * Provides observability for:
 * - Story execution traces (Gate 0-7 lifecycle)
 * - Agent activity spans
 * - Wave performance metrics
 * - Anomaly and error tracking
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT
} from "@opentelemetry/semantic-conventions";
import {
  trace,
  context,
  SpanStatusCode,
  Span,
  Tracer
} from "@opentelemetry/api";

// =============================================================================
// Configuration
// =============================================================================

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: "development" | "staging" | "production";
  otlpEndpoint?: string;
  enableConsoleExporter?: boolean;
}

const DEFAULT_CONFIG: TelemetryConfig = {
  serviceName: "wave-v2-framework",
  serviceVersion: "2.0.0",
  environment: "development",
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
  enableConsoleExporter: process.env.NODE_ENV !== "production"
};

// =============================================================================
// SDK Initialization
// =============================================================================

let sdk: NodeSDK | null = null;

export function initTelemetry(config: Partial<TelemetryConfig> = {}): void {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: finalConfig.serviceName,
    [ATTR_SERVICE_VERSION]: finalConfig.serviceVersion,
    [ATTR_DEPLOYMENT_ENVIRONMENT]: finalConfig.environment,
    "wave.version": "2.0",
    "wave.protocol": "aerospace-safety"
  });

  const traceExporter = new OTLPTraceExporter({
    url: finalConfig.otlpEndpoint
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false }, // Reduce noise
      })
    ]
  });

  sdk.start();

  console.log(`[Telemetry] Initialized for ${finalConfig.serviceName} (${finalConfig.environment})`);

  // Graceful shutdown
  process.on("SIGTERM", () => shutdown());
  process.on("SIGINT", () => shutdown());
}

export async function shutdown(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    console.log("[Telemetry] Shutdown complete");
  }
}

// =============================================================================
// Wave V2 Tracer
// =============================================================================

const TRACER_NAME = "wave-v2-tracer";

export function getTracer(): Tracer {
  return trace.getTracer(TRACER_NAME, "2.0.0");
}

// =============================================================================
// Story Execution Tracing
// =============================================================================

export interface StorySpanAttributes {
  storyId: string;
  wave: number;
  dalLevel: string;
  epic?: string;
  agent?: string;
}

export interface GateSpanAttributes extends StorySpanAttributes {
  gate: string;
  gateDescription: string;
}

/**
 * Create a span for the entire story execution
 */
export function startStorySpan(attrs: StorySpanAttributes): Span {
  const tracer = getTracer();

  return tracer.startSpan(`story.execute.${attrs.storyId}`, {
    attributes: {
      "story.id": attrs.storyId,
      "story.wave": attrs.wave,
      "story.dal_level": attrs.dalLevel,
      "story.epic": attrs.epic || "unknown",
      "agent.type": attrs.agent || "cto"
    }
  });
}

/**
 * Create a span for a specific gate execution
 */
export function startGateSpan(parentSpan: Span, attrs: GateSpanAttributes): Span {
  const tracer = getTracer();
  const ctx = trace.setSpan(context.active(), parentSpan);

  return tracer.startSpan(
    `gate.${attrs.gate}.${attrs.storyId}`,
    {
      attributes: {
        "gate.name": attrs.gate,
        "gate.description": attrs.gateDescription,
        "story.id": attrs.storyId,
        "story.wave": attrs.wave,
        "story.dal_level": attrs.dalLevel,
        "agent.type": attrs.agent || "unknown"
      }
    },
    ctx
  );
}

/**
 * Record gate success
 */
export function recordGateSuccess(span: Span, details?: Record<string, unknown>): void {
  span.setStatus({ code: SpanStatusCode.OK });
  span.setAttribute("gate.result", "passed");

  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      span.setAttribute(`gate.details.${key}`, String(value));
    });
  }

  span.end();
}

/**
 * Record gate failure
 */
export function recordGateFailure(span: Span, error: Error | string, details?: Record<string, unknown>): void {
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: typeof error === "string" ? error : error.message
  });
  span.setAttribute("gate.result", "failed");

  if (error instanceof Error) {
    span.recordException(error);
  }

  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      span.setAttribute(`gate.details.${key}`, String(value));
    });
  }

  span.end();
}

// =============================================================================
// Agent Activity Tracing
// =============================================================================

export interface AgentSpanAttributes {
  agentType: string;
  action: string;
  storyId?: string;
  toolsUsed?: string[];
}

export function startAgentSpan(attrs: AgentSpanAttributes): Span {
  const tracer = getTracer();

  return tracer.startSpan(`agent.${attrs.agentType}.${attrs.action}`, {
    attributes: {
      "agent.type": attrs.agentType,
      "agent.action": attrs.action,
      "story.id": attrs.storyId || "none",
      "agent.tools": attrs.toolsUsed?.join(",") || ""
    }
  });
}

// =============================================================================
// Wave Execution Tracing
// =============================================================================

export interface WaveSpanAttributes {
  waveNumber: number;
  totalStories: number;
  parallelAgents: number;
}

export function startWaveSpan(attrs: WaveSpanAttributes): Span {
  const tracer = getTracer();

  return tracer.startSpan(`wave.${attrs.waveNumber}.execute`, {
    attributes: {
      "wave.number": attrs.waveNumber,
      "wave.total_stories": attrs.totalStories,
      "wave.parallel_agents": attrs.parallelAgents
    }
  });
}

export function recordWaveComplete(span: Span, stats: {
  storiesCompleted: number;
  storiesFailed: number;
  durationMs: number;
}): void {
  span.setStatus({ code: SpanStatusCode.OK });
  span.setAttribute("wave.stories_completed", stats.storiesCompleted);
  span.setAttribute("wave.stories_failed", stats.storiesFailed);
  span.setAttribute("wave.duration_ms", stats.durationMs);
  span.setAttribute("wave.success_rate", stats.storiesCompleted / (stats.storiesCompleted + stats.storiesFailed));
  span.end();
}

// =============================================================================
// Anomaly Tracking
// =============================================================================

export function recordAnomaly(
  storyId: string,
  anomalyType: string,
  severity: "low" | "medium" | "high" | "critical",
  description: string,
  context?: Record<string, unknown>
): void {
  const tracer = getTracer();

  const span = tracer.startSpan(`anomaly.${anomalyType}`, {
    attributes: {
      "anomaly.type": anomalyType,
      "anomaly.severity": severity,
      "anomaly.description": description,
      "story.id": storyId,
      ...Object.fromEntries(
        Object.entries(context || {}).map(([k, v]) => [`anomaly.context.${k}`, String(v)])
      )
    }
  });

  span.setStatus({
    code: severity === "critical" || severity === "high" ? SpanStatusCode.ERROR : SpanStatusCode.OK,
    message: description
  });

  span.end();
}

// =============================================================================
// Metrics Helpers
// =============================================================================

export interface WaveMetrics {
  waveNumber: number;
  startTime: Date;
  endTime?: Date;
  stories: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
  };
  gates: {
    totalPassed: number;
    totalFailed: number;
    avgDurationMs: number;
  };
  agents: {
    active: number;
    completed: number;
  };
}

/**
 * Calculate and record wave metrics
 */
export function recordWaveMetrics(metrics: WaveMetrics): void {
  const tracer = getTracer();

  const span = tracer.startSpan("wave.metrics", {
    attributes: {
      "metrics.wave_number": metrics.waveNumber,
      "metrics.start_time": metrics.startTime.toISOString(),
      "metrics.end_time": metrics.endTime?.toISOString() || "",
      "metrics.stories_total": metrics.stories.total,
      "metrics.stories_completed": metrics.stories.completed,
      "metrics.stories_failed": metrics.stories.failed,
      "metrics.stories_in_progress": metrics.stories.inProgress,
      "metrics.gates_passed": metrics.gates.totalPassed,
      "metrics.gates_failed": metrics.gates.totalFailed,
      "metrics.gates_avg_duration_ms": metrics.gates.avgDurationMs,
      "metrics.agents_active": metrics.agents.active,
      "metrics.agents_completed": metrics.agents.completed,
      "metrics.completion_rate": metrics.stories.completed / metrics.stories.total
    }
  });

  span.end();
}

// =============================================================================
// Exports
// =============================================================================

export {
  trace,
  context,
  SpanStatusCode,
  Span,
  Tracer
} from "@opentelemetry/api";
