/**
 * ==============================================================================
 * WAVE FRAMEWORK - useOrchestratorEvents Hook
 * ==============================================================================
 * React hook for consuming real-time domain events from the orchestrator bridge.
 *
 * Features:
 *   - SSE connection to /api/orchestrator/events/:runId
 *   - Automatic reconnection on disconnect
 *   - Event filtering by domain
 *   - TypeScript types for domain events
 *
 * Usage:
 *   const { events, status, domains } = useOrchestratorEvents('run-123', ['auth', 'payments']);
 *
 * ==============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type DomainEventType = 'domain.started' | 'domain.progress' | 'domain.complete';

export interface DomainEvent {
  event: DomainEventType;
  domain: string;
  run_id: string;
  timestamp: string;
  received_at: string;
  // Progress fields
  current_node?: string;
  files_modified?: string[];
  tests_status?: string;
  // Complete fields
  qa_passed?: boolean;
  safety_score?: number;
}

export interface DomainStatus {
  domain: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  progress: number;
  current_node?: string;
  layer: number;
  error?: string;
}

export interface RunStatus {
  run_id: string;
  status: string;
  domains: string[];
  overall_progress: number;
  domain_statuses: Record<string, DomainStatus>;
  created_at: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseOrchestratorEventsResult {
  events: DomainEvent[];
  runStatus: RunStatus | null;
  domainStatuses: Record<string, DomainStatus>;
  connectionStatus: ConnectionStatus;
  error: string | null;
  reconnect: () => void;
  clearEvents: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for consuming orchestrator domain events via SSE
 * @param runId - Run identifier to subscribe to
 * @param domains - Optional list of domains to filter
 * @param options - Hook options
 */
export function useOrchestratorEvents(
  runId: string | null,
  domains: string[] = [],
  options: {
    maxEvents?: number;
    reconnectDelay?: number;
    autoReconnect?: boolean;
  } = {}
): UseOrchestratorEventsResult {
  const {
    maxEvents = 100,
    reconnectDelay = 3000,
    autoReconnect = true,
  } = options;

  // State
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [domainStatuses, setDomainStatuses] = useState<Record<string, DomainStatus>>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Process incoming domain event
   */
  const handleDomainEvent = useCallback((event: DomainEvent) => {
    // Add to events list
    setEvents((prev) => {
      const newEvents = [...prev, event];
      // Trim to max events
      if (newEvents.length > maxEvents) {
        return newEvents.slice(-maxEvents);
      }
      return newEvents;
    });

    // Update domain status based on event type
    setDomainStatuses((prev) => {
      const status = prev[event.domain] || {
        domain: event.domain,
        status: 'pending',
        progress: 0,
        layer: 0,
      };

      switch (event.event) {
        case 'domain.started':
          return {
            ...prev,
            [event.domain]: { ...status, status: 'running', progress: 0 },
          };
        case 'domain.progress':
          return {
            ...prev,
            [event.domain]: {
              ...status,
              status: 'running',
              current_node: event.current_node,
              progress: Math.min((status.progress || 0) + 10, 90), // Incremental progress
            },
          };
        case 'domain.complete':
          return {
            ...prev,
            [event.domain]: {
              ...status,
              status: event.qa_passed ? 'complete' : 'failed',
              progress: 100,
            },
          };
        default:
          return prev;
      }
    });
  }, [maxEvents]);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (!runId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    setError(null);

    // Build URL with domains filter
    const params = domains.length > 0 ? `?domains=${domains.join(',')}` : '';
    const url = `/api/orchestrator/events/${runId}${params}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // Connection opened
    eventSource.onopen = () => {
      setConnectionStatus('connected');
      setError(null);
    };

    // Handle errors
    eventSource.onerror = () => {
      setConnectionStatus('error');
      setError('Connection lost');
      eventSource.close();

      // Auto-reconnect
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectDelay);
      }
    };

    // Handle connection event
    eventSource.addEventListener('connected', (e) => {
      const data = JSON.parse(e.data);
      console.log('[useOrchestratorEvents] Connected:', data);
    });

    // Handle initial status
    eventSource.addEventListener('initial_status', (e) => {
      const status: RunStatus = JSON.parse(e.data);
      setRunStatus(status);
      if (status.domain_statuses) {
        setDomainStatuses(status.domain_statuses);
      }
    });

    // Handle domain events
    eventSource.addEventListener('domain.started', (e) => {
      handleDomainEvent(JSON.parse(e.data));
    });

    eventSource.addEventListener('domain.progress', (e) => {
      handleDomainEvent(JSON.parse(e.data));
    });

    eventSource.addEventListener('domain.complete', (e) => {
      handleDomainEvent(JSON.parse(e.data));
    });

    // Handle run status updates
    eventSource.addEventListener('run_status', (e) => {
      const status: RunStatus = JSON.parse(e.data);
      setRunStatus(status);
    });

    // Handle heartbeat (keep connection alive)
    eventSource.addEventListener('heartbeat', () => {
      // Connection is still alive
    });

    // Handle errors from server
    eventSource.addEventListener('error', (e) => {
      if (e.data) {
        const errorData = JSON.parse(e.data);
        setError(errorData.error || 'Unknown error');
      }
    });
  }, [runId, domains, autoReconnect, reconnectDelay, handleDomainEvent]);

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    connect();
  }, [connect]);

  /**
   * Clear all events
   */
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Connect when runId changes
  useEffect(() => {
    if (runId) {
      connect();
    }

    return () => {
      // Cleanup on unmount or runId change
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [runId, connect]);

  return {
    events,
    runStatus,
    domainStatuses,
    connectionStatus,
    error,
    reconnect,
    clearEvents,
  };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to start a workflow and automatically subscribe to events
 */
export function useStartWorkflow() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  const startWorkflow = useCallback(async (request: {
    domains: string[];
    dependencies?: Record<string, string[]>;
    wave_number?: number;
    story_ids?: string[];
    project_path: string;
    requirements?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/orchestrator/workflows/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to start workflow');
      }

      setRunId(data.run_id);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { startWorkflow, isLoading, error, runId };
}

/**
 * Hook to check orchestrator bridge health
 */
export function useOrchestratorHealth(pollInterval = 30000) {
  const [health, setHealth] = useState<{
    status: 'healthy' | 'degraded' | 'unknown';
    bridge: { connected: boolean; activeRuns: number };
    orchestrator: { healthy: boolean };
  } | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/orchestrator/health');
        const data = await response.json();
        setHealth(data);
      } catch {
        setHealth({
          status: 'unknown',
          bridge: { connected: false, activeRuns: 0 },
          orchestrator: { healthy: false },
        });
      }
    };

    // Initial check
    checkHealth();

    // Poll periodically
    const interval = setInterval(checkHealth, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval]);

  return health;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useOrchestratorEvents;
