/**
 * ==============================================================================
 * WAVE FRAMEWORK - Orchestrator Integration
 * ==============================================================================
 * Initializes and configures the Portal ↔ Orchestrator v2 bridge.
 *
 * Usage in server/index.js:
 *   import { initializeOrchestratorBridge } from './orchestrator-integration.js';
 *   const { bridge, router } = await initializeOrchestratorBridge(app, websocketService);
 *
 * Environment Variables:
 *   REDIS_URL          - Redis connection URL (default: redis://localhost:6379)
 *   ORCHESTRATOR_URL   - Python orchestrator URL (default: http://localhost:8000)
 *   ENABLE_ORCHESTRATOR_BRIDGE - Enable/disable bridge (default: true)
 *
 * ==============================================================================
 */

import { OrchestratorBridge } from './utils/orchestrator-bridge.js';
import { createOrchestratorRoutes } from './routes/orchestrator-routes.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Get bridge configuration from environment
 * @returns {Object} Bridge configuration
 */
function getBridgeConfig() {
  return {
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY_MS, 10) || 1000,
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES, 10) || 10,
    },
    orchestrator: {
      baseUrl: process.env.ORCHESTRATOR_URL || 'http://localhost:8000',
      timeout: parseInt(process.env.ORCHESTRATOR_TIMEOUT_MS, 10) || 30000,
    },
  };
}

/**
 * Check if orchestrator bridge is enabled
 * @returns {boolean}
 */
function isBridgeEnabled() {
  const enabled = process.env.ENABLE_ORCHESTRATOR_BRIDGE;
  // Default to true unless explicitly disabled
  return enabled !== 'false' && enabled !== '0';
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the orchestrator bridge and routes
 * @param {Express} app - Express application
 * @param {WebSocketService} [websocketService] - WebSocket service for event forwarding
 * @returns {Promise<{bridge: OrchestratorBridge|null, router: Router|null}>}
 */
export async function initializeOrchestratorBridge(app, websocketService = null) {
  // Check if bridge is enabled
  if (!isBridgeEnabled()) {
    console.log('[OrchestratorIntegration] Bridge disabled via ENABLE_ORCHESTRATOR_BRIDGE');
    return { bridge: null, router: null };
  }

  const config = getBridgeConfig();
  console.log('[OrchestratorIntegration] Initializing bridge...');
  console.log(`[OrchestratorIntegration] Redis URL: ${config.redis.url}`);
  console.log(`[OrchestratorIntegration] Orchestrator URL: ${config.orchestrator.baseUrl}`);

  // Create bridge instance
  const bridge = new OrchestratorBridge(config, websocketService);

  // Setup event logging
  bridge.on('connected', () => {
    console.log('[OrchestratorIntegration] Bridge connected to Redis');
  });

  bridge.on('disconnected', () => {
    console.log('[OrchestratorIntegration] Bridge disconnected from Redis');
  });

  bridge.on('error', ({ type, error }) => {
    console.error(`[OrchestratorIntegration] Bridge error (${type}):`, error.message);
  });

  bridge.on('domainEvent', (event) => {
    console.log(`[OrchestratorIntegration] Domain event: ${event.event} for ${event.domain}`);
  });

  // Attempt initial connection (non-blocking)
  bridge.connect().catch((error) => {
    console.warn('[OrchestratorIntegration] Initial Redis connection failed:', error.message);
    console.warn('[OrchestratorIntegration] Bridge will retry connection when needed');
  });

  // Create routes
  const router = createOrchestratorRoutes(bridge);

  // Mount routes
  app.use('/api/orchestrator', router);
  console.log('[OrchestratorIntegration] Routes mounted at /api/orchestrator');

  // Graceful shutdown handler
  const shutdown = async () => {
    console.log('[OrchestratorIntegration] Shutting down bridge...');
    await bridge.disconnect();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return { bridge, router };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a standalone bridge instance (for testing or custom usage)
 * @param {Object} [config] - Custom configuration
 * @param {WebSocketService} [websocketService] - WebSocket service
 * @returns {OrchestratorBridge}
 */
export function createBridge(config = {}, websocketService = null) {
  const fullConfig = {
    ...getBridgeConfig(),
    ...config,
  };
  return new OrchestratorBridge(fullConfig, websocketService);
}

/**
 * Check orchestrator health
 * @param {string} [baseUrl] - Orchestrator base URL
 * @returns {Promise<{healthy: boolean, latency?: number, error?: string}>}
 */
export async function checkOrchestratorHealth(baseUrl = null) {
  const url = baseUrl || process.env.ORCHESTRATOR_URL || 'http://localhost:8000';
  const startTime = Date.now();

  try {
    const response = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return { healthy: true, latency };
    } else {
      return { healthy: false, error: `HTTP ${response.status}`, latency };
    }
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { OrchestratorBridge } from './utils/orchestrator-bridge.js';
export { createOrchestratorRoutes } from './routes/orchestrator-routes.js';
export { getBridgeConfig, isBridgeEnabled };
