/**
 * ==============================================================================
 * WAVE FRAMEWORK - useTracingMetrics Hook
 * ==============================================================================
 * React hook for fetching and managing tracing metrics.
 * Phase LangSmith-5: Portal Integration
 *
 * Usage:
 *   const { metrics, summary, loading, error, refetch } = useTracingMetrics(runId);
 *
 * ==============================================================================
 */

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Tracing metrics for a run
 */
export interface TracingMetrics {
  run_id: string;
  start_time: string;
  end_time: string | null;
  total_duration_ms: number;
  node_executions: number;
  node_errors: number;
  tokens_used: number;
  cost_usd: number;
  agent_counts: Record<string, number>;
  agent_durations: Record<string, number>;
  retry_count: number;
  safety_violations: number;
}

/**
 * Human-readable run summary
 */
export interface TracingSummary {
  run_id: string;
  duration: string;
  total_nodes: number;
  error_count: number;
  total_tokens: number;
  total_cost_usd: number;
  retry_count: number;
  safety_violations: number;
  agents_used: string[];
  busiest_agent: string;
}

/**
 * Hook return type
 */
export interface UseTracingMetricsResult {
  metrics: TracingMetrics | null;
  summary: TracingSummary | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

const API_BASE = '/api/tracing';

async function fetchMetrics(runId: string): Promise<TracingMetrics> {
  const response = await fetch(`${API_BASE}/metrics/${runId}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch metrics: ${response.status}`);
  }

  const result = await response.json();
  return result.data || result;
}

async function fetchSummary(runId: string): Promise<TracingSummary> {
  const response = await fetch(`${API_BASE}/summary/${runId}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch summary: ${response.status}`);
  }

  const result = await response.json();
  return result.data || result;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for fetching tracing metrics for a run
 *
 * @param runId - Run identifier to fetch metrics for
 * @param options - Hook options
 * @returns Metrics, summary, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * function RunMetricsDisplay({ runId }: { runId: string }) {
 *   const { metrics, summary, loading, error } = useTracingMetrics(runId);
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!metrics) return <NoData />;
 *
 *   return (
 *     <div>
 *       <h2>Run: {metrics.run_id}</h2>
 *       <p>Duration: {summary?.duration}</p>
 *       <p>Tokens: {metrics.tokens_used}</p>
 *       <p>Cost: ${metrics.cost_usd.toFixed(4)}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTracingMetrics(
  runId: string | null,
  options: {
    /** Auto-fetch on mount (default: true) */
    autoFetch?: boolean;
    /** Polling interval in ms (0 = disabled) */
    pollInterval?: number;
  } = {}
): UseTracingMetricsResult {
  const { autoFetch = true, pollInterval = 0 } = options;

  const [metrics, setMetrics] = useState<TracingMetrics | null>(null);
  const [summary, setSummary] = useState<TracingSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!runId) {
      setMetrics(null);
      setSummary(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch both in parallel
      const [metricsData, summaryData] = await Promise.all([
        fetchMetrics(runId),
        fetchSummary(runId),
      ]);

      setMetrics(metricsData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setMetrics(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  // Auto-fetch on mount and when runId changes
  useEffect(() => {
    if (autoFetch && runId) {
      fetchData();
    }
  }, [autoFetch, runId, fetchData]);

  // Polling
  useEffect(() => {
    if (pollInterval > 0 && runId) {
      const interval = setInterval(fetchData, pollInterval);
      return () => clearInterval(interval);
    }
  }, [pollInterval, runId, fetchData]);

  return {
    metrics,
    summary,
    loading,
    error,
    refetch: fetchData,
  };
}

// =============================================================================
// ADDITIONAL HOOKS
// =============================================================================

/**
 * Hook for fetching tracing health status
 */
export function useTracingHealth(): {
  health: {
    status: string;
    tracing_enabled: boolean;
    stored_runs: number;
  } | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [health, setHealth] = useState<{
    status: string;
    tracing_enabled: boolean;
    stored_runs: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/health`);
      const result = await response.json();
      setHealth(result.data || result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return { health, loading, error, refetch: fetchHealth };
}

/**
 * Hook for listing all runs with metrics
 */
export function useTracingRuns(): {
  runs: string[];
  count: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [runs, setRuns] = useState<string[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/runs`);
      const result = await response.json();
      const data = result.data || result;
      setRuns(data.runs || []);
      setCount(data.count || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return { runs, count, loading, error, refetch: fetchRuns };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useTracingMetrics;
