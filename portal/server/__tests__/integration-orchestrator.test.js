// ═══════════════════════════════════════════════════════════════════════════════
// PORTAL-ORCHESTRATOR INTEGRATION TESTS (Phase F.1)
// ═══════════════════════════════════════════════════════════════════════════════
// Verifies all components work together: Client, Routes, SSE
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { OrchestratorClient } from '../utils/orchestrator-client.js';
import { createOrchestratorRouter } from '../routes/orchestrator.js';
import { addSSERoutes } from '../routes/orchestrator-sse.js';

describe('Portal-Orchestrator Integration', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      checkHealth: vi.fn(),
      createRun: vi.fn(),
      getRunStatus: vi.fn(),
      isAvailable: vi.fn(),
      pollRunStatus: vi.fn()
    };

    app = express();
    app.use(express.json());
    app.use('/api/orchestrator', createOrchestratorRouter(mockClient));
    addSSERoutes(app, mockClient);
  });

  describe('Full Workflow: Create Run → Poll Status → Complete', () => {
    it('should create run and track to completion', async () => {
      // Step 1: Create a run
      mockClient.createRun.mockResolvedValue({
        success: true,
        runId: 'integration-run-001',
        status: 'running',
        task: 'Build REST API',
        currentAgent: 'pm',
        actionsCount: 0,
        createdAt: '2026-01-25T12:00:00Z'
      });

      const createResponse = await request(app)
        .post('/api/orchestrator/runs')
        .send({
          task: 'Build REST API',
          projectPath: '/test/project'
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.runId).toBe('integration-run-001');

      // Step 2: Get status (still running)
      mockClient.getRunStatus.mockResolvedValue({
        success: true,
        runId: 'integration-run-001',
        status: 'running',
        currentAgent: 'dev',
        actionsCount: 5
      });

      const statusResponse = await request(app)
        .get('/api/orchestrator/runs/integration-run-001')
        .expect(200);

      expect(statusResponse.body.status).toBe('running');
      expect(statusResponse.body.currentAgent).toBe('dev');

      // Step 3: Get status (completed)
      mockClient.getRunStatus.mockResolvedValue({
        success: true,
        runId: 'integration-run-001',
        status: 'completed',
        currentAgent: 'qa',
        actionsCount: 15
      });

      const finalResponse = await request(app)
        .get('/api/orchestrator/runs/integration-run-001')
        .expect(200);

      expect(finalResponse.body.status).toBe('completed');
      expect(finalResponse.body.actionsCount).toBe(15);
    });
  });

  describe('Health Check Integration', () => {
    it('should report healthy when orchestrator is available', async () => {
      mockClient.checkHealth.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        version: '0.1.0'
      });

      const response = await request(app)
        .get('/api/orchestrator/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.orchestrator.healthy).toBe(true);
    });

    it('should report degraded when orchestrator is unavailable', async () => {
      mockClient.checkHealth.mockResolvedValue({
        healthy: false,
        error: 'Connection refused'
      });

      const response = await request(app)
        .get('/api/orchestrator/health')
        .expect(503);

      expect(response.body.status).toBe('degraded');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle orchestrator failures gracefully', async () => {
      mockClient.createRun.mockResolvedValue({
        success: false,
        error: 'Orchestrator overloaded'
      });

      const response = await request(app)
        .post('/api/orchestrator/runs')
        .send({
          task: 'Test task',
          projectPath: '/test'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Orchestrator overloaded');
    });

    it('should handle not found runs', async () => {
      mockClient.getRunStatus.mockResolvedValue({
        success: false,
        notFound: true,
        error: 'Run not found'
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Run not found');
    });
  });

  describe('SSE Stream Integration', () => {
    it('should stream completed run status', async () => {
      mockClient.getRunStatus.mockResolvedValue({
        success: true,
        runId: 'stream-run-001',
        status: 'completed',
        currentAgent: 'qa',
        actionsCount: 20
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/stream-run-001/stream')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.text).toContain('event: status');
      expect(response.text).toContain('event: done');
    });

    it('should handle SSE stream errors', async () => {
      mockClient.getRunStatus.mockResolvedValue({
        success: false,
        notFound: true,
        error: 'Run not found'
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/nonexistent/stream')
        .expect(404);

      expect(response.body.error).toBe('Run not found');
    });
  });

  describe('Validation Integration', () => {
    it('should reject invalid requests at route level', async () => {
      const response = await request(app)
        .post('/api/orchestrator/runs')
        .send({
          task: '', // Empty task
          projectPath: '/test'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject path traversal attempts', async () => {
      const response = await request(app)
        .post('/api/orchestrator/runs')
        .send({
          task: 'Valid task',
          projectPath: '../../../etc/passwd'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});

describe('OrchestratorClient Unit Integration', () => {
  it('should be importable and instantiable', () => {
    const client = new OrchestratorClient({
      baseUrl: 'http://localhost:8000',
      timeout: 5000
    });

    expect(client).toBeDefined();
    expect(client.baseUrl).toBe('http://localhost:8000');
  });

  it('should have all required methods', () => {
    const client = new OrchestratorClient();

    expect(typeof client.checkHealth).toBe('function');
    expect(typeof client.createRun).toBe('function');
    expect(typeof client.getRunStatus).toBe('function');
    expect(typeof client.isAvailable).toBe('function');
    expect(typeof client.pollRunStatus).toBe('function');
  });
});

describe('Route Factory Integration', () => {
  it('should create router with custom client', () => {
    const mockClient = {
      checkHealth: vi.fn(),
      createRun: vi.fn(),
      getRunStatus: vi.fn()
    };

    const router = createOrchestratorRouter(mockClient);
    expect(router).toBeDefined();
  });

  it('should add SSE routes to app', () => {
    const app = express();
    const mockClient = { getRunStatus: vi.fn() };

    addSSERoutes(app, mockClient);

    // Verify routes were added (app._router.stack should have the route)
    expect(app._router).toBeDefined();
  });
});
