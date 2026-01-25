/**
 * ==============================================================================
 * WAVE FRAMEWORK - Orchestrator Bridge Tests
 * ==============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrchestratorBridge, DEFAULT_CONFIG } from '../utils/orchestrator-bridge.js';

// =============================================================================
// MOCKS
// =============================================================================

// Mock Redis client
const mockRedisClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn().mockResolvedValue(undefined),
  pSubscribe: vi.fn().mockResolvedValue(undefined),
  pUnsubscribe: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// =============================================================================
// TESTS
// =============================================================================

describe('OrchestratorBridge', () => {
  let bridge;

  beforeEach(() => {
    vi.clearAllMocks();
    bridge = new OrchestratorBridge();
  });

  afterEach(async () => {
    if (bridge.isConnected) {
      await bridge.disconnect();
    }
  });

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  describe('initialization', () => {
    it('should create with default config', () => {
      expect(bridge.config.redis.url).toBe(DEFAULT_CONFIG.redis.url);
      expect(bridge.config.orchestrator.baseUrl).toBe(DEFAULT_CONFIG.orchestrator.baseUrl);
    });

    it('should merge custom config', () => {
      const customBridge = new OrchestratorBridge({
        redis: { url: 'redis://custom:6380' },
      });
      expect(customBridge.config.redis.url).toBe('redis://custom:6380');
    });

    it('should initialize statistics', () => {
      expect(bridge.stats.eventsReceived).toBe(0);
      expect(bridge.stats.eventsForwarded).toBe(0);
      expect(bridge.stats.apiCallsMade).toBe(0);
    });

    it('should not be connected initially', () => {
      expect(bridge.isConnected).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Connection
  // ---------------------------------------------------------------------------

  describe('connect', () => {
    it('should connect to Redis', async () => {
      const result = await bridge.connect();
      expect(result).toBe(true);
      expect(bridge.isConnected).toBe(true);
    });

    it('should emit connected event', async () => {
      const connectedHandler = vi.fn();
      bridge.on('connected', connectedHandler);

      await bridge.connect();

      expect(connectedHandler).toHaveBeenCalled();
    });

    it('should not reconnect if already connected', async () => {
      await bridge.connect();
      const result = await bridge.connect();

      expect(result).toBe(true);
      // createClient should only be called once per client type
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      await bridge.connect();
      await bridge.disconnect();

      expect(bridge.isConnected).toBe(false);
    });

    it('should emit disconnected event', async () => {
      await bridge.connect();

      const disconnectedHandler = vi.fn();
      bridge.on('disconnected', disconnectedHandler);

      await bridge.disconnect();

      expect(disconnectedHandler).toHaveBeenCalled();
    });

    it('should clear active runs on disconnect', async () => {
      await bridge.connect();
      bridge.activeRuns.set('test-run', { domains: new Set(['auth']) });

      await bridge.disconnect();

      expect(bridge.activeRuns.size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------------

  describe('subscribeToRun', () => {
    beforeEach(async () => {
      await bridge.connect();
    });

    it('should subscribe to domain channels', async () => {
      await bridge.subscribeToRun('run-123', ['auth', 'payments']);

      expect(mockRedisClient.pSubscribe).toHaveBeenCalledWith(
        'wave:run-123:domain:auth',
        expect.any(Function)
      );
      expect(mockRedisClient.pSubscribe).toHaveBeenCalledWith(
        'wave:run-123:domain:payments',
        expect.any(Function)
      );
    });

    it('should track active runs', async () => {
      await bridge.subscribeToRun('run-123', ['auth']);

      expect(bridge.activeRuns.has('run-123')).toBe(true);
      expect(bridge.activeRuns.get('run-123').domains.has('auth')).toBe(true);
    });

    it('should add domains to existing subscription', async () => {
      await bridge.subscribeToRun('run-123', ['auth']);
      await bridge.subscribeToRun('run-123', ['payments']);

      const runData = bridge.activeRuns.get('run-123');
      expect(runData.domains.has('auth')).toBe(true);
      expect(runData.domains.has('payments')).toBe(true);
    });
  });

  describe('unsubscribeFromRun', () => {
    beforeEach(async () => {
      await bridge.connect();
      await bridge.subscribeToRun('run-123', ['auth', 'payments']);
    });

    it('should unsubscribe from all domain channels', async () => {
      await bridge.unsubscribeFromRun('run-123');

      expect(mockRedisClient.pUnsubscribe).toHaveBeenCalledWith('wave:run-123:domain:auth');
      expect(mockRedisClient.pUnsubscribe).toHaveBeenCalledWith('wave:run-123:domain:payments');
    });

    it('should remove run from active runs', async () => {
      await bridge.unsubscribeFromRun('run-123');

      expect(bridge.activeRuns.has('run-123')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // API Proxy
  // ---------------------------------------------------------------------------

  describe('startWorkflow', () => {
    it('should call orchestrator API', async () => {
      const mockResponse = { run_id: 'new-run', status: 'started' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await bridge.startWorkflow({
        domains: ['auth'],
        dependencies: {},
        wave_number: 1,
        story_ids: [],
        project_path: '/test',
        requirements: 'Test',
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        `${DEFAULT_CONFIG.orchestrator.baseUrl}/workflows/start`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should increment API call stats', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await bridge.startWorkflow({ domains: ['auth'] });

      expect(bridge.stats.apiCallsMade).toBe(1);
    });

    it('should increment error stats on failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(bridge.startWorkflow({ domains: ['auth'] })).rejects.toThrow();

      expect(bridge.stats.apiErrors).toBe(1);
    });
  });

  describe('getRunStatus', () => {
    it('should fetch run status', async () => {
      const mockStatus = { run_id: 'run-123', status: 'running' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });

      const result = await bridge.getRunStatus('run-123');

      expect(result).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith(
        `${DEFAULT_CONFIG.orchestrator.baseUrl}/runs/run-123`,
        expect.any(Object)
      );
    });
  });

  describe('getDomainStatus', () => {
    it('should fetch domain status', async () => {
      const mockStatus = { domain: 'auth', status: 'complete' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });

      const result = await bridge.getDomainStatus('run-123', 'auth');

      expect(result).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith(
        `${DEFAULT_CONFIG.orchestrator.baseUrl}/runs/run-123/auth`,
        expect.any(Object)
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Event Handling
  // ---------------------------------------------------------------------------

  describe('event handling', () => {
    it('should emit domainEvent when receiving Redis message', () => {
      const eventHandler = vi.fn();
      bridge.on('domainEvent', eventHandler);

      const event = {
        event: 'domain.started',
        domain: 'auth',
        timestamp: new Date().toISOString(),
      };

      bridge.handleDomainEvent('wave:run-123:domain:auth', JSON.stringify(event));

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'domain.started',
          domain: 'auth',
          run_id: 'run-123',
        })
      );
    });

    it('should increment event stats', () => {
      const event = { event: 'domain.progress' };
      bridge.handleDomainEvent('wave:run-123:domain:auth', JSON.stringify(event));

      expect(bridge.stats.eventsReceived).toBe(1);
      expect(bridge.stats.eventsForwarded).toBe(1);
    });

    it('should forward to WebSocket service if available', () => {
      const mockWsService = {
        broadcastToRoom: vi.fn(),
      };
      bridge.websocketService = mockWsService;

      const event = { event: 'domain.complete' };
      bridge.handleDomainEvent('wave:run-123:domain:auth', JSON.stringify(event));

      expect(mockWsService.broadcastToRoom).toHaveBeenCalledWith(
        'run:run-123',
        expect.objectContaining({
          type: 'DOMAIN_COMPLETE',
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // SSE Management
  // ---------------------------------------------------------------------------

  describe('SSE management', () => {
    it('should register SSE client', () => {
      const mockRes = { write: vi.fn() };
      bridge.registerSSEClient('client-1', mockRes, 'run-123');

      expect(bridge.sseClients.has('client-1')).toBe(true);
      expect(bridge.sseClients.get('client-1').run_id).toBe('run-123');
    });

    it('should send connection event on register', () => {
      const mockRes = { write: vi.fn() };
      bridge.registerSSEClient('client-1', mockRes, 'run-123');

      expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining('event: connected'));
    });

    it('should unregister SSE client', () => {
      const mockRes = { write: vi.fn() };
      bridge.registerSSEClient('client-1', mockRes, 'run-123');
      bridge.unregisterSSEClient('client-1');

      expect(bridge.sseClients.has('client-1')).toBe(false);
    });

    it('should forward events to SSE clients', () => {
      const mockRes = { write: vi.fn() };
      bridge.registerSSEClient('client-1', mockRes, 'run-123');

      const event = { event: 'domain.progress', domain: 'auth' };
      bridge.handleDomainEvent('wave:run-123:domain:auth', JSON.stringify(event));

      expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining('event: domain.progress'));
    });
  });

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  describe('getStats', () => {
    it('should return comprehensive stats', async () => {
      await bridge.connect();
      bridge.activeRuns.set('run-1', { domains: new Set() });

      const mockRes = { write: vi.fn() };
      bridge.registerSSEClient('sse-1', mockRes, '*');

      const stats = bridge.getStats();

      expect(stats.isConnected).toBe(true);
      expect(stats.activeRuns).toBe(1);
      expect(stats.sseClients).toBe(1);
      expect(stats).toHaveProperty('eventsReceived');
      expect(stats).toHaveProperty('eventsForwarded');
      expect(stats).toHaveProperty('apiCallsMade');
    });
  });
});

// =============================================================================
// ROUTE TESTS
// =============================================================================

describe('OrchestratorRoutes', () => {
  // Route tests would go here - requires setting up express test environment
  // For now, the bridge tests cover the core functionality
});
