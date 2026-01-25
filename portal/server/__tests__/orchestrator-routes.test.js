// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR ROUTES UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════════
// TDD tests for Express API routes that communicate with the Python orchestrator
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createOrchestratorRouter } from '../routes/orchestrator.js';
import { OrchestratorClient } from '../utils/orchestrator-client.js';

// Mock the OrchestratorClient
vi.mock('../utils/orchestrator-client.js', () => ({
  OrchestratorClient: vi.fn().mockImplementation(() => ({
    checkHealth: vi.fn(),
    createRun: vi.fn(),
    getRunStatus: vi.fn(),
    isAvailable: vi.fn()
  }))
}));

describe('Orchestrator Routes', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create a fresh mock client
    mockClient = {
      checkHealth: vi.fn(),
      createRun: vi.fn(),
      getRunStatus: vi.fn(),
      isAvailable: vi.fn()
    };

    // Create Express app with router
    app = express();
    app.use(express.json());
    app.use('/api/orchestrator', createOrchestratorRouter(mockClient));
  });

  describe('GET /api/orchestrator/health', () => {
    it('should return healthy status when orchestrator is available', async () => {
      mockClient.checkHealth.mockResolvedValue({
        healthy: true,
        status: 'healthy',
        version: '0.1.0',
        timestamp: '2026-01-25T12:00:00Z'
      });

      const response = await request(app)
        .get('/api/orchestrator/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.orchestrator.healthy).toBe(true);
      expect(response.body.orchestrator.version).toBe('0.1.0');
    });

    it('should return unhealthy status when orchestrator is down', async () => {
      mockClient.checkHealth.mockResolvedValue({
        healthy: false,
        error: 'Connection refused'
      });

      const response = await request(app)
        .get('/api/orchestrator/health')
        .expect(503);

      expect(response.body.status).toBe('degraded');
      expect(response.body.orchestrator.healthy).toBe(false);
    });
  });

  describe('POST /api/orchestrator/runs', () => {
    it('should create a run and return run_id', async () => {
      mockClient.createRun.mockResolvedValue({
        success: true,
        runId: 'run-uuid-123',
        status: 'running',
        task: 'Build a REST API',
        currentAgent: 'pm',
        actionsCount: 0,
        createdAt: '2026-01-25T12:00:00Z'
      });

      const response = await request(app)
        .post('/api/orchestrator/runs')
        .send({
          task: 'Build a REST API',
          projectPath: '/path/to/project'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.runId).toBe('run-uuid-123');
      expect(response.body.status).toBe('running');
      expect(mockClient.createRun).toHaveBeenCalledWith({
        task: 'Build a REST API',
        repoPath: '/path/to/project',
        branch: undefined,
        tokenLimit: undefined,
        costLimitUsd: undefined
      });
    });

    it('should accept optional parameters', async () => {
      mockClient.createRun.mockResolvedValue({
        success: true,
        runId: 'run-uuid-456',
        status: 'running'
      });

      await request(app)
        .post('/api/orchestrator/runs')
        .send({
          task: 'Complex task',
          projectPath: '/repo',
          branch: 'feature-branch',
          tokenLimit: 50000,
          costLimit: 5.0
        })
        .expect(201);

      expect(mockClient.createRun).toHaveBeenCalledWith({
        task: 'Complex task',
        repoPath: '/repo',
        branch: 'feature-branch',
        tokenLimit: 50000,
        costLimitUsd: 5.0
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/orchestrator/runs')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing task', async () => {
      const response = await request(app)
        .post('/api/orchestrator/runs')
        .send({ projectPath: '/path' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing projectPath', async () => {
      const response = await request(app)
        .post('/api/orchestrator/runs')
        .send({ task: 'Some task' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 500 when orchestrator fails', async () => {
      mockClient.createRun.mockResolvedValue({
        success: false,
        error: 'Orchestrator unavailable'
      });

      const response = await request(app)
        .post('/api/orchestrator/runs')
        .send({
          task: 'Test task',
          projectPath: '/repo'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/orchestrator/runs/:runId', () => {
    it('should return run status for valid runId', async () => {
      mockClient.getRunStatus.mockResolvedValue({
        success: true,
        runId: 'run-123',
        status: 'completed',
        task: 'Build feature',
        currentAgent: 'qa',
        actionsCount: 15,
        createdAt: '2026-01-25T12:00:00Z'
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/run-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.runId).toBe('run-123');
      expect(response.body.status).toBe('completed');
      expect(response.body.actionsCount).toBe(15);
    });

    it('should return 404 for non-existent runId', async () => {
      mockClient.getRunStatus.mockResolvedValue({
        success: false,
        notFound: true,
        error: 'Run not found'
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Run not found');
    });

    it('should return 500 for orchestrator errors', async () => {
      mockClient.getRunStatus.mockResolvedValue({
        success: false,
        error: 'Internal error'
      });

      const response = await request(app)
        .get('/api/orchestrator/runs/run-123')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should reject task with SQL injection patterns', async () => {
      const response = await request(app)
        .post('/api/orchestrator/runs')
        .send({
          task: "'; DROP TABLE users; --",
          projectPath: '/repo'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject projectPath with path traversal', async () => {
      const response = await request(app)
        .post('/api/orchestrator/runs')
        .send({
          task: 'Valid task',
          projectPath: '../../../etc/passwd'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject empty task', async () => {
      const response = await request(app)
        .post('/api/orchestrator/runs')
        .send({
          task: '',
          projectPath: '/repo'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid tokenLimit type', async () => {
      const response = await request(app)
        .post('/api/orchestrator/runs')
        .send({
          task: 'Valid task',
          projectPath: '/repo',
          tokenLimit: 'not-a-number'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});

describe('Router Factory', () => {
  it('should export createOrchestratorRouter function', () => {
    expect(typeof createOrchestratorRouter).toBe('function');
  });

  it('should return an Express router', () => {
    const mockClient = {
      checkHealth: vi.fn(),
      createRun: vi.fn(),
      getRunStatus: vi.fn()
    };
    const router = createOrchestratorRouter(mockClient);
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
  });
});
