/**
 * ==============================================================================
 * WAVE FRAMEWORK - Tracing API Routes
 * ==============================================================================
 * Express routes for Portal ↔ Orchestrator tracing integration.
 * Phase LangSmith-5: Portal Integration
 *
 * Routes:
 *   GET /api/tracing/metrics/:runId  - Get run metrics
 *   GET /api/tracing/summary/:runId  - Get run summary
 *   GET /api/tracing/runs            - List all runs with metrics
 *   GET /api/tracing/health          - Tracing health check
 *
 * ==============================================================================
 */

import { Router } from 'express';

// =============================================================================
// ROUTE FACTORY
// =============================================================================

/**
 * Create tracing routes with bridge instance
 * @param {OrchestratorBridge} bridge - OrchestratorBridge instance
 * @returns {Router} Express router
 */
export function createTracingRoutes(bridge) {
  const router = Router();

  // ===========================================================================
  // METRICS ENDPOINTS
  // ===========================================================================

  /**
   * GET /api/tracing/metrics/:runId
   * Get metrics for a specific run
   */
  router.get('/metrics/:runId', async (req, res) => {
    try {
      const { runId } = req.params;

      // Proxy to orchestrator
      const result = await bridge.apiCall('GET', `/tracing/metrics/${runId}`);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[TracingRoutes] Get metrics error:', error.message);

      // Handle 404 from orchestrator
      if (error.message.includes('404') || error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: `Metrics not found for run: ${req.params.runId}`,
        });
      }

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/tracing/summary/:runId
   * Get human-readable summary for a run
   */
  router.get('/summary/:runId', async (req, res) => {
    try {
      const { runId } = req.params;

      // Proxy to orchestrator
      const result = await bridge.apiCall('GET', `/tracing/summary/${runId}`);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[TracingRoutes] Get summary error:', error.message);

      if (error.message.includes('404') || error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: `Summary not found for run: ${req.params.runId}`,
        });
      }

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/tracing/runs
   * List all runs with stored metrics
   */
  router.get('/runs', async (req, res) => {
    try {
      const result = await bridge.apiCall('GET', '/tracing/runs');

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[TracingRoutes] List runs error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // ===========================================================================
  // HEALTH ENDPOINT
  // ===========================================================================

  /**
   * GET /api/tracing/health
   * Check tracing subsystem health
   */
  router.get('/health', async (req, res) => {
    try {
      const result = await bridge.apiCall('GET', '/tracing/health');

      res.json({
        success: true,
        data: result,
        portal: {
          bridgeConnected: bridge.isConnected,
        },
      });
    } catch (error) {
      console.error('[TracingRoutes] Health check error:', error.message);

      // Return degraded status if orchestrator is unreachable
      res.json({
        success: true,
        data: {
          status: 'degraded',
          tracing_enabled: false,
          stored_runs: 0,
          error: error.message,
        },
        portal: {
          bridgeConnected: bridge.isConnected,
        },
      });
    }
  });

  return router;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default createTracingRoutes;
