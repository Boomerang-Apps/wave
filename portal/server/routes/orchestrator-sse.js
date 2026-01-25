// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR SSE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════
// Server-Sent Events endpoints for real-time orchestrator status updates
// ═══════════════════════════════════════════════════════════════════════════════

import { OrchestratorClient } from '../utils/orchestrator-client.js';

// Terminal states that end the stream
const TERMINAL_STATES = ['completed', 'failed', 'cancelled', 'held'];

/**
 * Send an SSE event
 * @param {Response} res - Express response object
 * @param {string} event - Event type
 * @param {Object} data - Event data
 */
function sendSSEEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Add SSE routes to an Express app
 * @param {Express} app - Express application
 * @param {OrchestratorClient} [client] - Optional client instance (for testing)
 */
export function addSSERoutes(app, client) {
  const orchestratorClient = client || new OrchestratorClient();

  /**
   * GET /api/orchestrator/runs/:runId/stream
   * Stream real-time status updates via SSE
   */
  app.get('/api/orchestrator/runs/:runId/stream', async (req, res) => {
    const { runId } = req.params;

    try {
      // First, check if run exists
      const initialStatus = await orchestratorClient.getRunStatus(runId);

      if (!initialStatus.success) {
        if (initialStatus.notFound) {
          return res.status(404).json({ error: 'Run not found' });
        }
        return res.status(500).json({ error: initialStatus.error });
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Send initial status
      sendSSEEvent(res, 'status', {
        runId: initialStatus.runId,
        status: initialStatus.status,
        currentAgent: initialStatus.currentAgent,
        actionsCount: initialStatus.actionsCount,
        createdAt: initialStatus.createdAt
      });

      // If already in terminal state, send done and close
      if (TERMINAL_STATES.includes(initialStatus.status)) {
        sendSSEEvent(res, 'done', {
          finalStatus: initialStatus.status
        });
        res.end();
        return;
      }

      // Set up polling for updates
      let isActive = true;
      const pollInterval = 2000; // 2 seconds

      const poll = async () => {
        if (!isActive) return;

        try {
          const status = await orchestratorClient.getRunStatus(runId);

          if (!status.success) {
            sendSSEEvent(res, 'error', { error: status.error });
            res.end();
            return;
          }

          // Send status update
          sendSSEEvent(res, 'status', {
            runId: status.runId,
            status: status.status,
            currentAgent: status.currentAgent,
            actionsCount: status.actionsCount
          });

          // Check for terminal state
          if (TERMINAL_STATES.includes(status.status)) {
            sendSSEEvent(res, 'done', {
              finalStatus: status.status
            });
            res.end();
            return;
          }

          // Schedule next poll
          setTimeout(poll, pollInterval);
        } catch (error) {
          sendSSEEvent(res, 'error', { error: error.message });
          res.end();
        }
      };

      // Handle client disconnect
      req.on('close', () => {
        isActive = false;
      });

      // Start polling (after initial status)
      setTimeout(poll, pollInterval);

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

export default addSSERoutes;
