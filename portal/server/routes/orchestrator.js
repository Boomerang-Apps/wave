// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR API ROUTES
// ═══════════════════════════════════════════════════════════════════════════════
// Express routes for communicating with the Python LangGraph orchestrator
// ═══════════════════════════════════════════════════════════════════════════════

import { Router } from 'express';
import { OrchestratorClient } from '../utils/orchestrator-client.js';
import { createValidator } from '../middleware/validation.js';

// Validation schema for creating a run
const createRunSchema = {
  type: 'object',
  required: ['task', 'projectPath'],
  properties: {
    task: {
      type: 'string',
      minLength: 1,
      maxLength: 10000
    },
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    branch: {
      type: 'string',
      maxLength: 200
    },
    tokenLimit: {
      type: 'number',
      minimum: 1000,
      maximum: 1000000
    },
    costLimit: {
      type: 'number',
      minimum: 0.01,
      maximum: 100
    }
  },
  additionalProperties: false
};

/**
 * Create orchestrator router
 * @param {OrchestratorClient} [client] - Optional client instance (for testing)
 * @returns {Router} Express router
 */
export function createOrchestratorRouter(client) {
  const router = Router();
  const orchestratorClient = client || new OrchestratorClient();

  // Input validation middleware
  const validateCreateRun = createValidator(createRunSchema, {
    source: 'body',
    detectInjection: true,
    detectXSS: true,
    detectPathTraversal: true
  });

  /**
   * GET /health
   * Check orchestrator health status
   */
  router.get('/health', async (req, res) => {
    try {
      const health = await orchestratorClient.checkHealth();

      if (health.healthy) {
        res.status(200).json({
          status: 'ok',
          orchestrator: {
            healthy: true,
            status: health.status,
            version: health.version,
            timestamp: health.timestamp
          }
        });
      } else {
        res.status(503).json({
          status: 'degraded',
          orchestrator: {
            healthy: false,
            error: health.error
          }
        });
      }
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  });

  /**
   * POST /runs
   * Create a new orchestrator run
   */
  router.post('/runs', validateCreateRun, async (req, res) => {
    try {
      const { task, projectPath, branch, tokenLimit, costLimit } = req.body;

      const result = await orchestratorClient.createRun({
        task,
        repoPath: projectPath,
        branch,
        tokenLimit,
        costLimitUsd: costLimit
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          runId: result.runId,
          status: result.status,
          task: result.task,
          currentAgent: result.currentAgent,
          actionsCount: result.actionsCount,
          createdAt: result.createdAt
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /runs/:runId
   * Get status of a specific run
   */
  router.get('/runs/:runId', async (req, res) => {
    try {
      const { runId } = req.params;

      const result = await orchestratorClient.getRunStatus(runId);

      if (result.success) {
        res.status(200).json({
          success: true,
          runId: result.runId,
          status: result.status,
          task: result.task,
          currentAgent: result.currentAgent,
          actionsCount: result.actionsCount,
          createdAt: result.createdAt
        });
      } else if (result.notFound) {
        res.status(404).json({
          success: false,
          error: result.error
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

export default createOrchestratorRouter;
