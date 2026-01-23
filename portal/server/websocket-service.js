/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAVE FRAMEWORK - WebSocket Streaming Service
 * ═══════════════════════════════════════════════════════════════════════════════
 * Real-time event streaming for the WAVE Portal.
 * Provides live updates for agent status, heartbeats, and gate transitions.
 *
 * Features:
 *   - Event-driven updates (no polling)
 *   - Room-based subscriptions (per project/wave)
 *   - Heartbeat monitoring
 *   - Automatic reconnection support
 *   - Message history replay
 *
 * Usage:
 *   // Server
 *   const wss = new WebSocketService(server);
 *   wss.broadcast('agent_update', { agent: 'fe-dev-1', status: 'active' });
 *
 *   // Client
 *   const ws = new WebSocket('ws://localhost:3000/ws');
 *   ws.send(JSON.stringify({ type: 'subscribe', room: 'project-123' }));
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// EVENT TYPES
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_TYPES = {
  // Connection events
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',

  // Subscription events
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',

  // Agent events
  AGENT_READY: 'agent_ready',
  AGENT_HEARTBEAT: 'agent_heartbeat',
  AGENT_PROGRESS: 'agent_progress',
  AGENT_COMPLETE: 'agent_complete',
  AGENT_ERROR: 'agent_error',
  AGENT_STUCK: 'agent_stuck',

  // Gate events
  GATE_ENTERED: 'gate_entered',
  GATE_COMPLETE: 'gate_complete',
  GATE_REJECTED: 'gate_rejected',

  // Story events
  STORY_STARTED: 'story_started',
  STORY_UPDATED: 'story_updated',
  STORY_COMPLETED: 'story_completed',

  // Wave events
  WAVE_STARTED: 'wave_started',
  WAVE_COMPLETED: 'wave_completed',

  // System events
  KILL_SWITCH: 'kill_switch',
  BUDGET_WARNING: 'budget_warning',
  BUDGET_EXCEEDED: 'budget_exceeded',

  // Portal events
  PORTAL_SYNC: 'portal_sync',
  CHECKLIST_UPDATE: 'checklist_update'
};

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKET SERVICE
// ─────────────────────────────────────────────────────────────────────────────

class WebSocketService {
  /**
   * Create WebSocket service
   * @param {http.Server} server - HTTP server to attach to
   * @param {Object} options - Configuration options
   */
  constructor(server, options = {}) {
    this.options = {
      path: options.path || '/ws',
      heartbeatInterval: options.heartbeatInterval || 30000,
      historySize: options.historySize || 100,
      maxClients: options.maxClients || 1000,
      ...options
    };

    // Initialize WebSocket server
    this.wss = new WebSocketServer({
      server,
      path: this.options.path
    });

    // Client tracking
    this.clients = new Map(); // clientId -> { ws, rooms, lastSeen }
    this.rooms = new Map();   // roomName -> Set of clientIds

    // Message history for replay
    this.history = new Map(); // roomName -> Array of recent messages

    // Statistics
    this.stats = {
      connections: 0,
      disconnections: 0,
      messagesIn: 0,
      messagesOut: 0,
      errors: 0
    };

    // Setup event handlers
    this.setupHandlers();

    // Start heartbeat check
    this.heartbeatInterval = setInterval(
      () => this.checkHeartbeats(),
      this.options.heartbeatInterval
    );

    console.log(`[WebSocket] Service initialized on ${this.options.path}`);
  }

  /**
   * Setup WebSocket event handlers
   * @private
   */
  setupHandlers() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientIp = req.socket.remoteAddress;

      // Check max clients
      if (this.clients.size >= this.options.maxClients) {
        ws.close(1013, 'Server at capacity');
        return;
      }

      // Register client
      this.clients.set(clientId, {
        ws,
        rooms: new Set(),
        lastSeen: Date.now(),
        ip: clientIp,
        connectedAt: new Date().toISOString()
      });

      this.stats.connections++;

      // Send welcome message
      this.sendToClient(clientId, {
        type: EVENT_TYPES.CONNECTED,
        clientId,
        timestamp: new Date().toISOString(),
        serverTime: Date.now()
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        this.handleMessage(clientId, data);
      });

      // Handle close
      ws.on('close', (code, reason) => {
        this.handleDisconnect(clientId, code, reason?.toString());
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WebSocket] Client ${clientId} error:`, error.message);
        this.stats.errors++;
      });

      // Setup ping/pong for keepalive
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
        const client = this.clients.get(clientId);
        if (client) client.lastSeen = Date.now();
      });

      console.log(`[WebSocket] Client connected: ${clientId} from ${clientIp}`);
    });

    this.wss.on('error', (error) => {
      console.error('[WebSocket] Server error:', error);
      this.stats.errors++;
    });
  }

  /**
   * Generate unique client ID
   * @private
   */
  generateClientId() {
    return `ws_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Handle incoming message from client
   * @private
   */
  handleMessage(clientId, data) {
    this.stats.messagesIn++;

    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastSeen = Date.now();

    try {
      const message = JSON.parse(data.toString());
      const { type, ...payload } = message;

      switch (type) {
        case 'subscribe':
          this.handleSubscribe(clientId, payload.room || payload.rooms);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(clientId, payload.room || payload.rooms);
          break;

        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
          break;

        case 'history':
          this.handleHistoryRequest(clientId, payload.room, payload.count);
          break;

        default:
          // Forward to room if client is in one
          if (client.rooms.size > 0 && payload.targetRoom) {
            this.broadcastToRoom(payload.targetRoom, {
              type,
              ...payload,
              from: clientId
            }, [clientId]);
          }
      }
    } catch (error) {
      console.error(`[WebSocket] Invalid message from ${clientId}:`, error.message);
      this.sendToClient(clientId, {
        type: EVENT_TYPES.ERROR,
        error: 'Invalid message format'
      });
    }
  }

  /**
   * Handle client subscribe request
   * @private
   */
  handleSubscribe(clientId, rooms) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const roomList = Array.isArray(rooms) ? rooms : [rooms];

    for (const room of roomList) {
      if (!room) continue;

      // Add client to room
      if (!this.rooms.has(room)) {
        this.rooms.set(room, new Set());
      }
      this.rooms.get(room).add(clientId);
      client.rooms.add(room);

      console.log(`[WebSocket] Client ${clientId} subscribed to room: ${room}`);
    }

    this.sendToClient(clientId, {
      type: EVENT_TYPES.SUBSCRIBED,
      rooms: roomList,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle client unsubscribe request
   * @private
   */
  handleUnsubscribe(clientId, rooms) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const roomList = Array.isArray(rooms) ? rooms : [rooms];

    for (const room of roomList) {
      if (!room) continue;

      const roomClients = this.rooms.get(room);
      if (roomClients) {
        roomClients.delete(clientId);
        if (roomClients.size === 0) {
          this.rooms.delete(room);
        }
      }
      client.rooms.delete(room);

      console.log(`[WebSocket] Client ${clientId} unsubscribed from room: ${room}`);
    }

    this.sendToClient(clientId, {
      type: EVENT_TYPES.UNSUBSCRIBED,
      rooms: roomList,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle history replay request
   * @private
   */
  handleHistoryRequest(clientId, room, count = 50) {
    const history = this.history.get(room) || [];
    const messages = history.slice(-Math.min(count, this.options.historySize));

    this.sendToClient(clientId, {
      type: 'history_response',
      room,
      messages,
      count: messages.length
    });
  }

  /**
   * Handle client disconnect
   * @private
   */
  handleDisconnect(clientId, code, reason) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all rooms
    for (const room of client.rooms) {
      const roomClients = this.rooms.get(room);
      if (roomClients) {
        roomClients.delete(clientId);
        if (roomClients.size === 0) {
          this.rooms.delete(room);
        }
      }
    }

    // Remove client
    this.clients.delete(clientId);
    this.stats.disconnections++;

    console.log(`[WebSocket] Client disconnected: ${clientId} (code: ${code}, reason: ${reason || 'none'})`);
  }

  /**
   * Send message to specific client
   * @param {string} clientId - Target client ID
   * @param {Object} message - Message to send
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      this.stats.messagesOut++;
      return true;
    } catch (error) {
      console.error(`[WebSocket] Send error to ${clientId}:`, error.message);
      return false;
    }
  }

  /**
   * Broadcast message to all connected clients
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @param {string[]} [excludeClients] - Client IDs to exclude
   */
  broadcast(eventType, data, excludeClients = []) {
    const message = {
      type: eventType,
      ...data,
      timestamp: new Date().toISOString()
    };

    const messageStr = JSON.stringify(message);
    const excludeSet = new Set(excludeClients);

    for (const [clientId, client] of this.clients) {
      if (excludeSet.has(clientId)) continue;
      if (client.ws.readyState !== WebSocket.OPEN) continue;

      try {
        client.ws.send(messageStr);
        this.stats.messagesOut++;
      } catch (error) {
        console.error(`[WebSocket] Broadcast error to ${clientId}:`, error.message);
      }
    }
  }

  /**
   * Broadcast message to specific room
   * @param {string} room - Room name
   * @param {Object} message - Message to send
   * @param {string[]} [excludeClients] - Client IDs to exclude
   */
  broadcastToRoom(room, message, excludeClients = []) {
    const roomClients = this.rooms.get(room);
    if (!roomClients || roomClients.size === 0) return;

    const fullMessage = {
      ...message,
      room,
      timestamp: message.timestamp || new Date().toISOString()
    };

    // Add to history
    this.addToHistory(room, fullMessage);

    const messageStr = JSON.stringify(fullMessage);
    const excludeSet = new Set(excludeClients);

    for (const clientId of roomClients) {
      if (excludeSet.has(clientId)) continue;

      const client = this.clients.get(clientId);
      if (!client || client.ws.readyState !== WebSocket.OPEN) continue;

      try {
        client.ws.send(messageStr);
        this.stats.messagesOut++;
      } catch (error) {
        console.error(`[WebSocket] Room broadcast error to ${clientId}:`, error.message);
      }
    }
  }

  /**
   * Add message to room history
   * @private
   */
  addToHistory(room, message) {
    if (!this.history.has(room)) {
      this.history.set(room, []);
    }

    const history = this.history.get(room);
    history.push(message);

    // Trim to max size
    while (history.length > this.options.historySize) {
      history.shift();
    }
  }

  /**
   * Check client heartbeats and disconnect stale clients
   * @private
   */
  checkHeartbeats() {
    const now = Date.now();
    const timeout = this.options.heartbeatInterval * 2;

    for (const [clientId, client] of this.clients) {
      if (client.ws.isAlive === false) {
        console.log(`[WebSocket] Terminating stale client: ${clientId}`);
        client.ws.terminate();
        this.handleDisconnect(clientId, 1006, 'Heartbeat timeout');
        continue;
      }

      // Check last seen time
      if (now - client.lastSeen > timeout) {
        console.log(`[WebSocket] Client ${clientId} timed out`);
        client.ws.terminate();
        this.handleDisconnect(clientId, 1006, 'Timeout');
        continue;
      }

      client.ws.isAlive = false;
      client.ws.ping();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WAVE-SPECIFIC EVENTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Emit agent status update
   * @param {string} projectId - Project identifier
   * @param {Object} agentData - Agent status data
   */
  emitAgentUpdate(projectId, agentData) {
    this.broadcastToRoom(`project:${projectId}`, {
      type: EVENT_TYPES.AGENT_HEARTBEAT,
      ...agentData
    });
  }

  /**
   * Emit agent ready event
   * @param {string} projectId - Project identifier
   * @param {string} agent - Agent name
   * @param {Object} data - Additional data
   */
  emitAgentReady(projectId, agent, data = {}) {
    this.broadcastToRoom(`project:${projectId}`, {
      type: EVENT_TYPES.AGENT_READY,
      agent,
      ...data
    });
  }

  /**
   * Emit agent error event
   * @param {string} projectId - Project identifier
   * @param {string} agent - Agent name
   * @param {string} error - Error message
   * @param {Object} data - Additional data
   */
  emitAgentError(projectId, agent, error, data = {}) {
    this.broadcastToRoom(`project:${projectId}`, {
      type: EVENT_TYPES.AGENT_ERROR,
      agent,
      error,
      severity: data.severity || 'error',
      ...data
    });
  }

  /**
   * Emit gate transition event
   * @param {string} projectId - Project identifier
   * @param {Object} gateData - Gate transition data
   */
  emitGateTransition(projectId, gateData) {
    const eventType = gateData.status === 'complete'
      ? EVENT_TYPES.GATE_COMPLETE
      : gateData.status === 'rejected'
        ? EVENT_TYPES.GATE_REJECTED
        : EVENT_TYPES.GATE_ENTERED;

    this.broadcastToRoom(`project:${projectId}`, {
      type: eventType,
      ...gateData
    });
  }

  /**
   * Emit story update event
   * @param {string} projectId - Project identifier
   * @param {Object} storyData - Story update data
   */
  emitStoryUpdate(projectId, storyData) {
    this.broadcastToRoom(`project:${projectId}`, {
      type: EVENT_TYPES.STORY_UPDATED,
      ...storyData
    });
  }

  /**
   * Emit budget warning event
   * @param {string} projectId - Project identifier
   * @param {Object} budgetData - Budget data
   */
  emitBudgetWarning(projectId, budgetData) {
    const eventType = budgetData.percentage >= 100
      ? EVENT_TYPES.BUDGET_EXCEEDED
      : EVENT_TYPES.BUDGET_WARNING;

    this.broadcastToRoom(`project:${projectId}`, {
      type: eventType,
      ...budgetData
    });
  }

  /**
   * Emit kill switch event
   * @param {string} projectId - Project identifier
   * @param {Object} data - Kill switch data
   */
  emitKillSwitch(projectId, data = {}) {
    // Broadcast to all clients (not just project room)
    this.broadcast(EVENT_TYPES.KILL_SWITCH, {
      projectId,
      severity: 'critical',
      ...data
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN / STATS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get service statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      activeClients: this.clients.size,
      activeRooms: this.rooms.size,
      roomDetails: Array.from(this.rooms.entries()).map(([name, clients]) => ({
        name,
        clientCount: clients.size
      }))
    };
  }

  /**
   * Get list of connected clients
   * @returns {Array} Client list
   */
  getClients() {
    return Array.from(this.clients.entries()).map(([id, client]) => ({
      id,
      rooms: Array.from(client.rooms),
      connectedAt: client.connectedAt,
      lastSeen: new Date(client.lastSeen).toISOString(),
      ip: client.ip
    }));
  }

  /**
   * Shutdown WebSocket service
   */
  shutdown() {
    console.log('[WebSocket] Shutting down...');

    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    for (const [clientId, client] of this.clients) {
      client.ws.close(1001, 'Server shutting down');
    }

    // Close server
    this.wss.close();

    console.log('[WebSocket] Shutdown complete');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export { WebSocketService, EVENT_TYPES };
export default WebSocketService;
