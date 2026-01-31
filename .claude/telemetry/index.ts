/**
 * Wave V2 Telemetry - Main Export
 */

export {
  // Configuration
  initTelemetry,
  shutdown,
  getTracer,
  type TelemetryConfig,

  // Story tracing
  startStorySpan,
  startGateSpan,
  recordGateSuccess,
  recordGateFailure,
  type StorySpanAttributes,
  type GateSpanAttributes,

  // Agent tracing
  startAgentSpan,
  type AgentSpanAttributes,

  // Wave tracing
  startWaveSpan,
  recordWaveComplete,
  type WaveSpanAttributes,

  // Anomaly tracking
  recordAnomaly,

  // Metrics
  recordWaveMetrics,
  type WaveMetrics,

  // Re-exports from OpenTelemetry
  trace,
  context,
  SpanStatusCode,
  type Span,
  type Tracer
} from "./wave-v2-telemetry";
