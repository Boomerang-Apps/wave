/**
 * ==============================================================================
 * WAVE FRAMEWORK - Orchestrator API Routes
 * ==============================================================================
 * Express routes for Portal ↔ Orchestrator v2 integration.
 *
 * Routes:
 *   POST /api/orchestrator/workflows/start  - Start workflow with dependencies
 *   GET  /api/orchestrator/runs/:runId      - Get run status
 *   GET  /api/orchestrator/runs/:runId/:domain - Get domain status
 *   GET  /api/orchestrator/events/:runId    - SSE stream for run events
 *   GET  /api/orchestrator/health           - Bridge health check
 *   GET  /api/orchestrator/stats            - Bridge statistics
 *
 * ==============================================================================
 */

import { Router } from 'express';
import crypto from 'crypto';

// =============================================================================
// ROUTE FACTORY
// =============================================================================

/**
 * Create orchestrator routes with bridge instance
 * @param {OrchestratorBridge} bridge - OrchestratorBridge instance
 * @returns {Router} Express router
 */
export function createOrchestratorRoutes(bridge) {
  const router = Router();

  // ===========================================================================
  // WORKFLOW ENDPOINTS
  // ===========================================================================

  /**
   * POST /api/orchestrator/workflows/start
   * Start a workflow with domain dependencies
   *
   * Body:
   *   - domains: string[] - List of domains
   *   - dependencies: { [domain]: string[] } - Dependency graph
   *   - wave_number: number - Wave number
   *   - story_ids: string[] - Story identifiers
   *   - project_path: string - Project path
   *   - requirements: string - Requirements text
   */
  router.post('/workflows/start', async (req, res) => {
    try {
      const {
        domains,
        dependencies,
        wave_number,
        story_ids,
        project_path,
        requirements,
      } = req.body;

      // Validate required fields
      if (!domains || !Array.isArray(domains) || domains.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'domains must be a non-empty array',
        });
      }

      if (!project_path) {
        return res.status(400).json({
          success: false,
          error: 'project_path is required',
        });
      }

      // Call orchestrator API
      const result = await bridge.startWorkflow({
        domains,
        dependencies: dependencies || {},
        wave_number: wave_number || 1,
        story_ids: story_ids || [],
        project_path,
        requirements: requirements || '',
      });

      // Auto-subscribe to the new run's events
      if (result.run_id) {
        await bridge.subscribeToRun(result.run_id, domains);
      }

      res.json(result);
    } catch (error) {
      console.error('[OrchestratorRoutes] Start workflow error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // ===========================================================================
  // RUN STATUS ENDPOINTS
  // ===========================================================================

  /**
   * GET /api/orchestrator/runs/:runId
   * Get status of an entire run
   */
  router.get('/runs/:runId', async (req, res) => {
    try {
      const { runId } = req.params;
      const result = await bridge.getRunStatus(runId);
      res.json(result);
    } catch (error) {
      console.error('[OrchestratorRoutes] Get run status error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/orchestrator/runs/:runId/:domain
   * Get status of a specific domain in a run
   */
  router.get('/runs/:runId/:domain', async (req, res) => {
    try {
      const { runId, domain } = req.params;
      const result = await bridge.getDomainStatus(runId, domain);
      res.json(result);
    } catch (error) {
      console.error('[OrchestratorRoutes] Get domain status error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // ===========================================================================
  // SERVER-SENT EVENTS (SSE) ENDPOINT
  // ===========================================================================

  /**
   * GET /api/orchestrator/events/:runId
   * SSE stream for real-time run events
   *
   * Query params:
   *   - domains: comma-separated list of domains to filter (optional)
   */
  router.get('/events/:runId', async (req, res) => {
    const { runId } = req.params;
    const domains = req.query.domains?.split(',') || [];
    const clientId = `sse_${crypto.randomBytes(8).toString('hex')}`;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Ensure we don't timeout
    req.socket.setTimeout(0);

    // Subscribe to run if domains provided
    if (domains.length > 0) {
      await bridge.subscribeToRun(runId, domains);
    }

    // Register SSE client
    bridge.registerSSEClient(clientId, res, runId);

    // Send initial status
    try {
      const status = await bridge.getRunStatus(runId);
      res.write(`event: initial_status\n`);
      res.write(`data: ${JSON.stringify(status)}\n\n`);
    } catch (error) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    }

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(`event: heartbeat\n`);
      res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
    }, 30000);

    // Cleanup on close
    req.on('close', () => {
      clearInterval(heartbeat);
      bridge.unregisterSSEClient(clientId);
      console.log(`[OrchestratorRoutes] SSE client disconnected: ${clientId}`);
    });
  });

  /**
   * GET /api/orchestrator/events
   * SSE stream for all events (admin/debug)
   */
  router.get('/events', (req, res) => {
    const clientId = `sse_${crypto.randomBytes(8).toString('hex')}`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    req.socket.setTimeout(0);

    // Subscribe to all events
    bridge.registerSSEClient(clientId, res, '*');

    const heartbeat = setInterval(() => {
      res.write(`event: heartbeat\n`);
      res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      bridge.unregisterSSEClient(clientId);
    });
  });

  // ===========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================================================

  /**
   * POST /api/orchestrator/subscribe/:runId
   * Subscribe to run events (for WebSocket clients that want updates)
   */
  router.post('/subscribe/:runId', async (req, res) => {
    try {
      const { runId } = req.params;
      const { domains } = req.body;

      if (!domains || !Array.isArray(domains)) {
        return res.status(400).json({
          success: false,
          error: 'domains must be an array',
        });
      }

      await bridge.subscribeToRun(runId, domains);

      res.json({
        success: true,
        message: `Subscribed to ${domains.length} domains for run ${runId}`,
      });
    } catch (error) {
      console.error('[OrchestratorRoutes] Subscribe error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/orchestrator/unsubscribe/:runId
   * Unsubscribe from run events
   */
  router.post('/unsubscribe/:runId', async (req, res) => {
    try {
      const { runId } = req.params;
      await bridge.unsubscribeFromRun(runId);

      res.json({
        success: true,
        message: `Unsubscribed from run ${runId}`,
      });
    } catch (error) {
      console.error('[OrchestratorRoutes] Unsubscribe error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // ===========================================================================
  // HEALTH & STATS
  // ===========================================================================

  /**
   * GET /api/orchestrator/health
   * Health check for bridge and orchestrator connection
   */
  router.get('/health', async (req, res) => {
    const bridgeStats = bridge.getStats();

    // Try to ping orchestrator
    let orchestratorHealthy = false;
    try {
      const response = await fetch(`${bridge.config.orchestrator.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      orchestratorHealthy = response.ok;
    } catch (error) {
      orchestratorHealthy = false;
    }

    const status = bridgeStats.isConnected && orchestratorHealthy ? 'healthy' : 'degraded';

    res.json({
      status,
      bridge: {
        connected: bridgeStats.isConnected,
        activeRuns: bridgeStats.activeRuns,
        sseClients: bridgeStats.sseClients,
      },
      orchestrator: {
        healthy: orchestratorHealthy,
        url: bridge.config.orchestrator.baseUrl,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/orchestrator/stats
   * Detailed statistics
   */
  router.get('/stats', (req, res) => {
    res.json({
      success: true,
      stats: bridge.getStats(),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default createOrchestratorRoutes;
