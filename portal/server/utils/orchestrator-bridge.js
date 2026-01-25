/**
 * ==============================================================================
 * WAVE FRAMEWORK - Orchestrator Bridge
 * ==============================================================================
 * Connects Portal to the v2 Python Orchestrator via Redis pub/sub and HTTP API.
 *
 * Features:
 *   - Redis subscriber for real-time domain events
 *   - HTTP proxy to orchestrator API endpoints
 *   - WebSocket integration for Portal UI updates
 *   - SSE fallback for simpler clients
 *
 * Redis Channels (from orchestrator):
 *   - wave:{run_id}:domain:{domain} - Per-domain progress events
 *
 * Event Types:
 *   - domain.started   - Domain execution began
 *   - domain.progress  - Domain progress update (current_node, files)
 *   - domain.complete  - Domain finished (qa_passed, safety_score)
 *
 * ==============================================================================
 */

import { createClient } from 'redis';
import { EventEmitter } from 'events';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG = {
  // Redis connection
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    retryDelayMs: 1000,
    maxRetries: 10,
  },
  // Orchestrator API
  orchestrator: {
    baseUrl: process.env.ORCHESTRATOR_URL || 'http://localhost:8000',
    timeout: 30000,
  },
  // Channel patterns
  channels: {
    domainPattern: 'wave:*:domain:*',
    runPattern: 'wave:*:status',
  },
};

// =============================================================================
// ORCHESTRATOR BRIDGE CLASS
// =============================================================================

class OrchestratorBridge extends EventEmitter {
  /**
   * Create an OrchestratorBridge instance
   * @param {Object} config - Configuration options
   * @param {Object} websocketService - WebSocketService instance for forwarding events
   */
  constructor(config = {}, websocketService = null) {
    super();

    this.config = { ...DEFAULT_CONFIG, ...config };
    this.websocketService = websocketService;

    // Redis clients (subscriber is separate from publisher)
    this.subscriber = null;
    this.publisher = null;

    // Connection state
    this.isConnected = false;
    this.reconnectAttempts = 0;

    // Active run subscriptions
    this.activeRuns = new Map(); // run_id -> { domains: Set, subscribedAt: Date }

    // SSE clients for fallback
    this.sseClients = new Map(); // clientId -> { res, run_id }

    // Statistics
    this.stats = {
      eventsReceived: 0,
      eventsForwarded: 0,
      apiCallsMade: 0,
      apiErrors: 0,
      reconnections: 0,
    };

    console.log('[OrchestratorBridge] Initialized');
  }

  // ===========================================================================
  // REDIS CONNECTION
  // ===========================================================================

  /**
   * Connect to Redis
   * @returns {Promise<boolean>} Connection success
   */
  async connect() {
    if (this.isConnected) {
      console.log('[OrchestratorBridge] Already connected');
      return true;
    }

    try {
      // Create subscriber client
      this.subscriber = createClient({ url: this.config.redis.url });

      // Create publisher client (for sending commands if needed)
      this.publisher = createClient({ url: this.config.redis.url });

      // Setup error handlers
      this.subscriber.on('error', (err) => {
        console.error('[OrchestratorBridge] Subscriber error:', err.message);
        this.emit('error', { type: 'subscriber', error: err });
      });

      this.publisher.on('error', (err) => {
        console.error('[OrchestratorBridge] Publisher error:', err.message);
        this.emit('error', { type: 'publisher', error: err });
      });

      // Connect both clients
      await Promise.all([
        this.subscriber.connect(),
        this.publisher.connect(),
      ]);

      this.isConnected = true;
      this.reconnectAttempts = 0;

      console.log('[OrchestratorBridge] Connected to Redis');
      this.emit('connected');

      return true;
    } catch (error) {
      console.error('[OrchestratorBridge] Connection failed:', error.message);
      this.emit('error', { type: 'connection', error });

      // Attempt reconnection
      await this.attemptReconnect();
      return false;
    }
  }

  /**
   * Attempt to reconnect to Redis
   * @private
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.config.redis.maxRetries) {
      console.error('[OrchestratorBridge] Max reconnection attempts reached');
      this.emit('maxRetriesReached');
      return;
    }

    this.reconnectAttempts++;
    this.stats.reconnections++;

    console.log(`[OrchestratorBridge] Reconnection attempt ${this.reconnectAttempts}/${this.config.redis.maxRetries}`);

    await new Promise(resolve =>
      setTimeout(resolve, this.config.redis.retryDelayMs * this.reconnectAttempts)
    );

    await this.connect();
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (!this.isConnected) return;

    try {
      // Unsubscribe from all patterns
      if (this.subscriber) {
        await this.subscriber.pUnsubscribe();
        await this.subscriber.quit();
      }

      if (this.publisher) {
        await this.publisher.quit();
      }

      this.isConnected = false;
      this.activeRuns.clear();

      console.log('[OrchestratorBridge] Disconnected from Redis');
      this.emit('disconnected');
    } catch (error) {
      console.error('[OrchestratorBridge] Disconnect error:', error.message);
    }
  }

  // ===========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================================================

  /**
   * Subscribe to domain events for a specific run
   * @param {string} runId - Run identifier
   * @param {string[]} domains - List of domains to subscribe to
   */
  async subscribeToRun(runId, domains = []) {
    if (!this.isConnected) {
      await this.connect();
    }

    // Track active run
    if (!this.activeRuns.has(runId)) {
      this.activeRuns.set(runId, {
        domains: new Set(domains),
        subscribedAt: new Date(),
      });
    } else {
      domains.forEach(d => this.activeRuns.get(runId).domains.add(d));
    }

    // Subscribe to domain channels
    for (const domain of domains) {
      const channel = `wave:${runId}:domain:${domain}`;

      await this.subscriber.pSubscribe(channel, (message, channel) => {
        this.handleDomainEvent(channel, message);
      });

      console.log(`[OrchestratorBridge] Subscribed to ${channel}`);
    }

    // Subscribe to run status channel
    const statusChannel = `wave:${runId}:status`;
    await this.subscriber.pSubscribe(statusChannel, (message, channel) => {
      this.handleRunStatusEvent(channel, message);
    });

    console.log(`[OrchestratorBridge] Subscribed to run ${runId} with ${domains.length} domains`);
  }

  /**
   * Unsubscribe from a run's events
   * @param {string} runId - Run identifier
   */
  async unsubscribeFromRun(runId) {
    const runData = this.activeRuns.get(runId);
    if (!runData) return;

    // Unsubscribe from all domain channels
    for (const domain of runData.domains) {
      const channel = `wave:${runId}:domain:${domain}`;
      await this.subscriber.pUnsubscribe(channel);
    }

    // Unsubscribe from status channel
    await this.subscriber.pUnsubscribe(`wave:${runId}:status`);

    this.activeRuns.delete(runId);
    console.log(`[OrchestratorBridge] Unsubscribed from run ${runId}`);
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  /**
   * Handle incoming domain event from Redis
   * @private
   */
  handleDomainEvent(channel, message) {
    this.stats.eventsReceived++;

    try {
      const event = JSON.parse(message);
      const [, runId, , domain] = channel.split(':');

      const enrichedEvent = {
        ...event,
        run_id: runId,
        domain: domain,
        received_at: new Date().toISOString(),
      };

      console.log(`[OrchestratorBridge] Domain event: ${event.event} for ${domain} in run ${runId}`);

      // Emit locally for any listeners
      this.emit('domainEvent', enrichedEvent);

      // Forward to WebSocket clients
      this.forwardToWebSocket(runId, enrichedEvent);

      // Forward to SSE clients
      this.forwardToSSE(runId, enrichedEvent);

      this.stats.eventsForwarded++;
    } catch (error) {
      console.error('[OrchestratorBridge] Event parse error:', error.message);
    }
  }

  /**
   * Handle run status event from Redis
   * @private
   */
  handleRunStatusEvent(channel, message) {
    this.stats.eventsReceived++;

    try {
      const event = JSON.parse(message);
      const [, runId] = channel.split(':');

      const enrichedEvent = {
        type: 'run_status',
        ...event,
        run_id: runId,
        received_at: new Date().toISOString(),
      };

      this.emit('runStatus', enrichedEvent);
      this.forwardToWebSocket(runId, enrichedEvent);
      this.forwardToSSE(runId, enrichedEvent);

      this.stats.eventsForwarded++;
    } catch (error) {
      console.error('[OrchestratorBridge] Status event parse error:', error.message);
    }
  }

  /**
   * Forward event to WebSocket service
   * @private
   */
  forwardToWebSocket(runId, event) {
    if (!this.websocketService) return;

    // Map orchestrator events to WebSocket event types
    const wsEventType = this.mapEventType(event.event || event.type);

    // Broadcast to run-specific room
    this.websocketService.broadcastToRoom(`run:${runId}`, {
      type: wsEventType,
      ...event,
    });

    // Also broadcast to project room if we have project info
    if (event.project_id) {
      this.websocketService.broadcastToRoom(`project:${event.project_id}`, {
        type: wsEventType,
        ...event,
      });
    }
  }

  /**
   * Forward event to SSE clients
   * @private
   */
  forwardToSSE(runId, event) {
    for (const [clientId, client] of this.sseClients) {
      if (client.run_id === runId || client.run_id === '*') {
        try {
          client.res.write(`event: ${event.event || event.type}\n`);
          client.res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (error) {
          // Client disconnected
          this.sseClients.delete(clientId);
        }
      }
    }
  }

  /**
   * Map orchestrator event types to WebSocket event types
   * @private
   */
  mapEventType(orchestratorEvent) {
    const mapping = {
      'domain.started': 'DOMAIN_STARTED',
      'domain.progress': 'DOMAIN_PROGRESS',
      'domain.complete': 'DOMAIN_COMPLETE',
      'run_status': 'RUN_STATUS',
    };
    return mapping[orchestratorEvent] || orchestratorEvent?.toUpperCase() || 'UNKNOWN';
  }

  // ===========================================================================
  // ORCHESTRATOR API PROXY
  // ===========================================================================

  /**
   * Start a workflow with dependencies
   * @param {Object} request - PortalWorkflowRequest
   * @returns {Promise<Object>} Response from orchestrator
   */
  async startWorkflow(request) {
    return this.apiCall('POST', '/workflows/start', request);
  }

  /**
   * Get run status
   * @param {string} runId - Run identifier
   * @returns {Promise<Object>} Run status
   */
  async getRunStatus(runId) {
    return this.apiCall('GET', `/runs/${runId}`);
  }

  /**
   * Get domain status
   * @param {string} runId - Run identifier
   * @param {string} domain - Domain name
   * @returns {Promise<Object>} Domain status
   */
  async getDomainStatus(runId, domain) {
    return this.apiCall('GET', `/runs/${runId}/${domain}`);
  }

  /**
   * Make API call to orchestrator
   * @private
   */
  async apiCall(method, path, body = null) {
    this.stats.apiCallsMade++;

    const url = `${this.config.orchestrator.baseUrl}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.config.orchestrator.timeout),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      this.stats.apiErrors++;
      console.error(`[OrchestratorBridge] API error (${method} ${path}):`, error.message);
      throw error;
    }
  }

  // ===========================================================================
  // SSE MANAGEMENT
  // ===========================================================================

  /**
   * Register an SSE client
   * @param {string} clientId - Client identifier
   * @param {Response} res - Express response object
   * @param {string} runId - Run to subscribe to ('*' for all)
   */
  registerSSEClient(clientId, res, runId = '*') {
    this.sseClients.set(clientId, { res, run_id: runId });

    // Send initial connection event
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ clientId, runId })}\n\n`);

    console.log(`[OrchestratorBridge] SSE client registered: ${clientId} for run ${runId}`);
  }

  /**
   * Unregister an SSE client
   * @param {string} clientId - Client identifier
   */
  unregisterSSEClient(clientId) {
    this.sseClients.delete(clientId);
    console.log(`[OrchestratorBridge] SSE client unregistered: ${clientId}`);
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get bridge statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      isConnected: this.isConnected,
      activeRuns: this.activeRuns.size,
      sseClients: this.sseClients.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { OrchestratorBridge, DEFAULT_CONFIG };
export default OrchestratorBridge;
