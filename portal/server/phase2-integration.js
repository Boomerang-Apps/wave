/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAVE FRAMEWORK - Phase 2 Integration Module
 * ═══════════════════════════════════════════════════════════════════════════════
 * Integrates all Phase 2 features:
 *   - Response Caching
 *   - WebSocket Streaming
 *   - OWASP Security Middleware
 *
 * Usage:
 *   import { initializePhase2, phase2Middleware } from './phase2-integration.js';
 *
 *   // Apply middleware
 *   app.use(phase2Middleware());
 *
 *   // Initialize with server (for WebSocket)
 *   const { wss, cache, security } = initializePhase2(server, app);
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import http from 'http';
import { CacheService, APIResponseCache, createCacheMiddleware } from './cache-service.js';
import { WebSocketService, EVENT_TYPES } from './websocket-service.js';
import {
  securityMiddleware,
  validateInput,
  sanitize,
  rateLimit,
  SecurityLogger,
  generateOWASPReport
} from './security-middleware.js';

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  cache: {
    enabled: true,
    maxSize: 1000,
    maxMemory: 100 * 1024 * 1024, // 100MB
    defaultTTL: 300 // 5 minutes
  },
  websocket: {
    enabled: true,
    path: '/ws',
    heartbeatInterval: 30000,
    historySize: 100
  },
  security: {
    enabled: true,
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100
    },
    headers: {}
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 SERVICES
// ─────────────────────────────────────────────────────────────────────────────

let cacheService = null;
let apiCache = null;
let websocketService = null;
let securityLogger = null;

/**
 * Get or create cache service
 * @param {Object} options - Cache options
 * @returns {CacheService}
 */
function getCacheService(options = {}) {
  if (!cacheService) {
    cacheService = new CacheService({
      ...DEFAULT_CONFIG.cache,
      ...options
    });
  }
  return cacheService;
}

/**
 * Get or create API response cache
 * @param {Object} options - Cache options
 * @returns {APIResponseCache}
 */
function getAPICache(options = {}) {
  if (!apiCache) {
    apiCache = new APIResponseCache({
      ...DEFAULT_CONFIG.cache,
      ...options
    });
  }
  return apiCache;
}

/**
 * Get WebSocket service (must be initialized first)
 * @returns {WebSocketService|null}
 */
function getWebSocketService() {
  return websocketService;
}

/**
 * Get security logger
 * @returns {SecurityLogger}
 */
function getSecurityLogger() {
  if (!securityLogger) {
    securityLogger = new SecurityLogger({
      onEvent: (event) => {
        // Optionally forward to WebSocket
        if (websocketService) {
          websocketService.broadcast('security_event', event);
        }
      }
    });
  }
  return securityLogger;
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create Phase 2 middleware stack
 * @param {Object} options - Configuration options
 * @returns {Function[]} Array of middleware functions
 */
function phase2Middleware(options = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...options
  };

  const middlewares = [];

  // Security middleware
  if (config.security.enabled !== false) {
    middlewares.push(...securityMiddleware({
      headers: config.security.headers,
      rateLimit: config.security.rateLimit
    }));
  }

  // Request timing
  middlewares.push((req, res, next) => {
    req.startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - req.startTime;
      res.setHeader('X-Response-Time', `${duration}ms`);
    });
    next();
  });

  return middlewares;
}

/**
 * Create cache middleware for specific routes
 * @param {Object} options - Cache options
 * @returns {Function} Express middleware
 */
function cacheMiddleware(options = {}) {
  const cache = getCacheService();
  return createCacheMiddleware(cache, {
    ttl: options.ttl || 60,
    methods: options.methods || ['GET'],
    keyGenerator: options.keyGenerator,
    condition: options.condition
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize all Phase 2 services
 * @param {http.Server} server - HTTP server instance
 * @param {express.Application} app - Express app instance
 * @param {Object} options - Configuration options
 * @returns {Object} Initialized services
 */
function initializePhase2(server, app, options = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...options
  };

  const services = {
    cache: null,
    apiCache: null,
    wss: null,
    security: null
  };

  console.log('[Phase2] Initializing Phase 2 services...');

  // Initialize cache
  if (config.cache.enabled !== false) {
    services.cache = getCacheService(config.cache);
    services.apiCache = getAPICache(config.cache);
    console.log('[Phase2] ✓ Cache service initialized');
  }

  // Initialize WebSocket
  if (config.websocket.enabled !== false && server) {
    websocketService = new WebSocketService(server, config.websocket);
    services.wss = websocketService;
    console.log(`[Phase2] ✓ WebSocket service initialized on ${config.websocket.path}`);

    // Add WebSocket stats endpoint
    if (app) {
      app.get('/api/ws/stats', (req, res) => {
        res.json(websocketService.getStats());
      });

      app.get('/api/ws/clients', (req, res) => {
        res.json(websocketService.getClients());
      });
    }
  }

  // Initialize security
  services.security = {
    logger: getSecurityLogger(),
    validate: validateInput,
    sanitize,
    rateLimit
  };
  console.log('[Phase2] ✓ Security services initialized');

  // Add Phase 2 status endpoint
  if (app) {
    app.get('/api/phase2/status', (req, res) => {
      res.json({
        status: 'active',
        services: {
          cache: {
            enabled: !!services.cache,
            stats: services.cache?.getStats() || null
          },
          websocket: {
            enabled: !!services.wss,
            stats: services.wss?.getStats() || null
          },
          security: {
            enabled: true,
            owasp: generateOWASPReport()
          }
        },
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/phase2/cache/stats', (req, res) => {
      if (!services.cache) {
        return res.status(404).json({ error: 'Cache not enabled' });
      }
      res.json(services.cache.getStats());
    });

    app.post('/api/phase2/cache/clear', (req, res) => {
      if (!services.cache) {
        return res.status(404).json({ error: 'Cache not enabled' });
      }
      services.cache.clear();
      res.json({ status: 'cleared' });
    });

    app.get('/api/phase2/owasp', (req, res) => {
      res.json(generateOWASPReport());
    });
  }

  console.log('[Phase2] All services initialized successfully');

  return services;
}

/**
 * Create HTTP server from Express app and initialize Phase 2
 * @param {express.Application} app - Express app
 * @param {number} port - Port number
 * @param {Object} options - Configuration options
 * @returns {Object} Server and services
 */
function createPhase2Server(app, port, options = {}) {
  // Create HTTP server
  const server = http.createServer(app);

  // Initialize Phase 2
  const services = initializePhase2(server, app, options);

  // Start server
  server.listen(port, () => {
    console.log(`\n🚀 Server running on http://localhost:${port}`);
    console.log(`📡 WebSocket available at ws://localhost:${port}/ws`);
    console.log(`🔒 OWASP security active\n`);
  });

  return { server, ...services };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emit event to WebSocket clients
 * @param {string} projectId - Project identifier
 * @param {string} eventType - Event type
 * @param {Object} data - Event data
 */
function emitEvent(projectId, eventType, data = {}) {
  if (!websocketService) {
    console.warn('[Phase2] WebSocket not initialized, event not emitted');
    return;
  }

  websocketService.broadcastToRoom(`project:${projectId}`, {
    type: eventType,
    ...data
  });
}

/**
 * Cache API response
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - TTL in seconds
 */
async function cacheResponse(key, value, ttl = 300) {
  const cache = getCacheService();
  await cache.set(key, value, { ttl });
}

/**
 * Get cached response
 * @param {string} key - Cache key
 * @returns {Promise<*>} Cached value or undefined
 */
async function getCached(key) {
  const cache = getCacheService();
  return await cache.get(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Initialization
  initializePhase2,
  createPhase2Server,
  phase2Middleware,
  cacheMiddleware,

  // Services
  getCacheService,
  getAPICache,
  getWebSocketService,
  getSecurityLogger,

  // Utilities
  emitEvent,
  cacheResponse,
  getCached,

  // Security exports
  validateInput,
  sanitize,
  rateLimit,
  generateOWASPReport,

  // WebSocket event types
  EVENT_TYPES
};

export default {
  initializePhase2,
  createPhase2Server,
  phase2Middleware
};
