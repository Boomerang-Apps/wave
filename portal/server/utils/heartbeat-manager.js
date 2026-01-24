/**
 * Agent Heartbeat Manager (GAP-013)
 *
 * Manages heartbeat tracking with configurable timeouts, stale detection,
 * and optional auto-restart capability.
 *
 * Based on:
 * - Kubernetes Liveness Probe patterns
 * - AWS ECS Health Check patterns
 * - Distributed Systems Heartbeat patterns
 *
 * @see https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
 */

// Default configuration (reduced from 120s to 60s per GAP requirements)
export const DEFAULT_TIMEOUT = 60000; // 60 seconds
export const DEFAULT_WARNING = 45000; // 45 seconds (75% of timeout)
export const DEFAULT_CHECK_INTERVAL = 10000; // 10 seconds
export const DEFAULT_MAX_RESTARTS = 3;
export const DEFAULT_RESTART_COOLDOWN = 30000; // 30 seconds

// Agent status values
export const AGENT_STATUS = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  STALE: 'stale',
  RESTARTING: 'restarting'
};

// Valid agent ID pattern (alphanumeric, hyphens, underscores)
const VALID_AGENT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate agent ID
 *
 * @param {string} agentId - Agent identifier
 * @throws {Error} If agent ID is invalid
 */
function validateAgentId(agentId) {
  if (!agentId || typeof agentId !== 'string') {
    throw new Error('Agent ID must be a non-empty string');
  }

  if (!VALID_AGENT_ID_PATTERN.test(agentId)) {
    throw new Error(`Invalid agent ID: ${agentId}. Must contain only alphanumeric characters, hyphens, and underscores`);
  }
}

/**
 * HeartbeatManager class
 * Tracks agent heartbeats and detects stale agents
 */
export class HeartbeatManager {
  #agents = new Map(); // agentId -> agent data
  #configs = new Map(); // agentId -> config
  #callbacks = {
    onStale: null,
    onWarning: null
  };
  #monitorInterval = null;
  #notifiedStale = new Set(); // Track which agents we've notified as stale
  #notifiedWarning = new Set(); // Track which agents we've notified as warning
  #restartCallbacks = new Map(); // agentId -> restart callback
  #lastRestartTime = new Map(); // agentId -> timestamp

  constructor() {
    this.#agents = new Map();
    this.#configs = new Map();
  }

  /**
   * Record a heartbeat from an agent
   *
   * @param {string} agentId - Agent identifier
   * @param {Object} metadata - Optional metadata
   * @returns {this} For chaining
   */
  recordHeartbeat(agentId, metadata = null) {
    validateAgentId(agentId);

    const now = Date.now();
    const existing = this.#agents.get(agentId);

    const agentData = {
      agentId,
      lastHeartbeat: now,
      status: AGENT_STATUS.HEALTHY,
      restartCount: existing?.restartCount || 0,
      metadata: metadata || existing?.metadata || null
    };

    this.#agents.set(agentId, agentData);

    // Initialize config if not exists
    if (!this.#configs.has(agentId)) {
      this.#configs.set(agentId, {
        timeout: DEFAULT_TIMEOUT,
        warning: DEFAULT_WARNING,
        maxRestarts: DEFAULT_MAX_RESTARTS,
        restartCooldown: DEFAULT_RESTART_COOLDOWN,
        autoRestart: false
      });
    }

    // Clear notification flags since agent is healthy
    this.#notifiedStale.delete(agentId);
    this.#notifiedWarning.delete(agentId);

    return this;
  }

  /**
   * Get agent status
   *
   * @param {string} agentId - Agent identifier
   * @returns {Object|null} Agent status or null
   */
  getAgentStatus(agentId) {
    const agent = this.#agents.get(agentId);
    if (!agent) return null;

    return { ...agent };
  }

  /**
   * Check health of a specific agent
   *
   * @param {string} agentId - Agent identifier
   * @returns {Object|null} Health status or null
   */
  checkAgentHealth(agentId) {
    const agent = this.#agents.get(agentId);
    if (!agent) return null;

    const config = this.#configs.get(agentId);
    const now = Date.now();
    const timeSinceHeartbeat = now - agent.lastHeartbeat;

    let status;
    if (agent.status === AGENT_STATUS.RESTARTING) {
      status = AGENT_STATUS.RESTARTING;
    } else if (timeSinceHeartbeat >= config.timeout) {
      status = AGENT_STATUS.STALE;
    } else if (timeSinceHeartbeat >= config.warning) {
      status = AGENT_STATUS.WARNING;
    } else {
      status = AGENT_STATUS.HEALTHY;
    }

    // Update stored status
    agent.status = status;

    return {
      agentId,
      status,
      lastHeartbeat: agent.lastHeartbeat,
      timeSinceHeartbeat,
      metadata: agent.metadata
    };
  }

  /**
   * Set timeout for a specific agent
   *
   * @param {string} agentId - Agent identifier
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {this} For chaining
   */
  setAgentTimeout(agentId, timeoutMs) {
    if (timeoutMs <= 0) {
      throw new Error('Timeout must be a positive number');
    }

    const config = this.#configs.get(agentId);
    if (config) {
      // Scale warning proportionally (maintain 75% ratio)
      const warningRatio = DEFAULT_WARNING / DEFAULT_TIMEOUT;
      config.timeout = timeoutMs;
      config.warning = Math.floor(timeoutMs * warningRatio);
    }

    return this;
  }

  /**
   * Set warning threshold for a specific agent
   *
   * @param {string} agentId - Agent identifier
   * @param {number} warningMs - Warning threshold in milliseconds
   * @returns {this} For chaining
   */
  setWarningThreshold(agentId, warningMs) {
    const config = this.#configs.get(agentId);
    if (config) {
      config.warning = warningMs;
    }

    return this;
  }

  /**
   * Get configuration for an agent
   *
   * @param {string} agentId - Agent identifier
   * @returns {Object|null} Configuration or null
   */
  getAgentConfig(agentId) {
    const config = this.#configs.get(agentId);
    if (!config) return null;

    return { ...config };
  }

  /**
   * Get health status of all agents
   *
   * @returns {Object} Map of agent IDs to health status
   */
  getHealthStatus() {
    const status = {};

    for (const agentId of this.#agents.keys()) {
      status[agentId] = this.checkAgentHealth(agentId);
    }

    return status;
  }

  /**
   * Get list of stale agents
   *
   * @returns {string[]} Array of stale agent IDs
   */
  getStaleAgents() {
    const stale = [];

    for (const agentId of this.#agents.keys()) {
      const health = this.checkAgentHealth(agentId);
      if (health && health.status === AGENT_STATUS.STALE) {
        stale.push(agentId);
      }
    }

    return stale;
  }

  /**
   * Register callback for stale agent events
   *
   * @param {Function} callback - Callback function(healthStatus)
   * @returns {this} For chaining
   */
  onStaleAgent(callback) {
    this.#callbacks.onStale = callback;
    return this;
  }

  /**
   * Register callback for warning events
   *
   * @param {Function} callback - Callback function(healthStatus)
   * @returns {this} For chaining
   */
  onWarning(callback) {
    this.#callbacks.onWarning = callback;
    return this;
  }

  /**
   * Internal: Ensure config exists for an agent
   *
   * @param {string} agentId - Agent identifier
   * @returns {Object} Config object
   */
  #ensureConfig(agentId) {
    if (!this.#configs.has(agentId)) {
      this.#configs.set(agentId, {
        timeout: DEFAULT_TIMEOUT,
        warning: DEFAULT_WARNING,
        maxRestarts: DEFAULT_MAX_RESTARTS,
        restartCooldown: DEFAULT_RESTART_COOLDOWN,
        autoRestart: false
      });
    }
    return this.#configs.get(agentId);
  }

  /**
   * Enable auto-restart for an agent
   *
   * @param {string} agentId - Agent identifier
   * @param {Function} restartCallback - Async function to restart agent
   * @returns {this} For chaining
   */
  enableAutoRestart(agentId, restartCallback) {
    this.#restartCallbacks.set(agentId, restartCallback);

    const config = this.#ensureConfig(agentId);
    config.autoRestart = true;

    return this;
  }

  /**
   * Disable auto-restart for an agent
   *
   * @param {string} agentId - Agent identifier
   * @returns {this} For chaining
   */
  disableAutoRestart(agentId) {
    this.#restartCallbacks.delete(agentId);

    const config = this.#configs.get(agentId);
    if (config) {
      config.autoRestart = false;
    }

    return this;
  }

  /**
   * Start periodic health monitoring
   *
   * @param {number} intervalMs - Check interval (default: DEFAULT_CHECK_INTERVAL)
   * @returns {this} For chaining
   */
  startMonitoring(intervalMs = DEFAULT_CHECK_INTERVAL) {
    if (this.#monitorInterval) {
      return this; // Already monitoring
    }

    this.#monitorInterval = setInterval(() => {
      this.#checkAllAgents();
    }, intervalMs);

    return this;
  }

  /**
   * Stop health monitoring
   *
   * @returns {this} For chaining
   */
  stopMonitoring() {
    if (this.#monitorInterval) {
      clearInterval(this.#monitorInterval);
      this.#monitorInterval = null;
    }

    return this;
  }

  /**
   * Check if monitoring is active
   *
   * @returns {boolean} True if monitoring
   */
  isMonitoring() {
    return this.#monitorInterval !== null;
  }

  /**
   * Remove an agent from tracking
   *
   * @param {string} agentId - Agent identifier
   * @returns {this} For chaining
   */
  removeAgent(agentId) {
    this.#agents.delete(agentId);
    this.#configs.delete(agentId);
    this.#notifiedStale.delete(agentId);
    this.#notifiedWarning.delete(agentId);
    this.#restartCallbacks.delete(agentId);
    this.#lastRestartTime.delete(agentId);

    return this;
  }

  /**
   * Reset all tracking data
   *
   * @returns {this} For chaining
   */
  reset() {
    this.stopMonitoring();
    this.#agents.clear();
    this.#configs.clear();
    this.#notifiedStale.clear();
    this.#notifiedWarning.clear();
    this.#restartCallbacks.clear();
    this.#lastRestartTime.clear();

    return this;
  }

  /**
   * Acknowledge agent is operational (reset restart count)
   *
   * @param {string} agentId - Agent identifier
   * @returns {this} For chaining
   */
  acknowledgeAgent(agentId) {
    const agent = this.#agents.get(agentId);
    if (agent) {
      agent.restartCount = 0;
      agent.lastHeartbeat = Date.now();
      agent.status = AGENT_STATUS.HEALTHY;
    }

    this.#notifiedStale.delete(agentId);
    this.#notifiedWarning.delete(agentId);

    return this;
  }

  /**
   * Internal: Set restart count (for testing)
   *
   * @param {string} agentId - Agent identifier
   * @param {number} count - Restart count
   */
  _setRestartCount(agentId, count) {
    const agent = this.#agents.get(agentId);
    if (agent) {
      agent.restartCount = count;
    }
  }

  /**
   * Internal: Check all agents and trigger callbacks
   */
  #checkAllAgents() {
    for (const agentId of this.#agents.keys()) {
      const agent = this.#agents.get(agentId);
      const config = this.#configs.get(agentId);

      // Handle agents in RESTARTING state - check if cooldown passed
      if (agent?.status === AGENT_STATUS.RESTARTING) {
        const lastRestart = this.#lastRestartTime.get(agentId);
        const now = Date.now();
        if (lastRestart && (now - lastRestart) >= config?.restartCooldown) {
          // Cooldown passed, reset status to allow re-evaluation
          agent.status = AGENT_STATUS.STALE;
          this.#notifiedStale.delete(agentId);
        }
      }

      const health = this.checkAgentHealth(agentId);
      if (!health) continue;

      // Handle warning state
      if (health.status === AGENT_STATUS.WARNING && !this.#notifiedWarning.has(agentId)) {
        this.#notifiedWarning.add(agentId);
        if (this.#callbacks.onWarning) {
          this.#callbacks.onWarning(health);
        }
      }

      // Handle stale state
      if (health.status === AGENT_STATUS.STALE && !this.#notifiedStale.has(agentId)) {
        this.#notifiedStale.add(agentId);

        if (this.#callbacks.onStale) {
          this.#callbacks.onStale(health);
        }

        // Trigger auto-restart if enabled
        this.#handleAutoRestart(agentId);
      }
    }
  }

  /**
   * Internal: Handle auto-restart for an agent
   */
  async #handleAutoRestart(agentId) {
    const config = this.#configs.get(agentId);
    const agent = this.#agents.get(agentId);
    const restartCallback = this.#restartCallbacks.get(agentId);

    if (!config?.autoRestart || !restartCallback || !agent) {
      return;
    }

    // Check if we've exceeded max restarts
    if (agent.restartCount >= config.maxRestarts) {
      return;
    }

    // Check cooldown
    const lastRestart = this.#lastRestartTime.get(agentId);
    const now = Date.now();
    if (lastRestart && (now - lastRestart) < config.restartCooldown) {
      return;
    }

    // Set status to restarting
    agent.status = AGENT_STATUS.RESTARTING;
    agent.restartCount++;
    this.#lastRestartTime.set(agentId, now);

    try {
      await restartCallback(agentId);
    } catch (e) {
      // Restart failed, status remains restarting
    }
  }
}

export default {
  HeartbeatManager,
  DEFAULT_TIMEOUT,
  DEFAULT_WARNING,
  DEFAULT_CHECK_INTERVAL,
  DEFAULT_MAX_RESTARTS,
  DEFAULT_RESTART_COOLDOWN,
  AGENT_STATUS
};
