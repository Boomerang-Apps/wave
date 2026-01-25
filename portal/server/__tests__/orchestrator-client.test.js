// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR CLIENT UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for the client that communicates with the Python orchestrator
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrchestratorClient } from '../utils/orchestrator-client.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OrchestratorClient', () => {
  let client;

  beforeEach(() => {
    client = new OrchestratorClient({
      baseUrl: 'http://localhost:8000',
      timeout: 5000
    });
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default baseUrl when not provided', () => {
      const defaultClient = new OrchestratorClient();
      expect(defaultClient.baseUrl).toBe('http://localhost:8000');
    });

    it('should use provided baseUrl', () => {
      const customClient = new OrchestratorClient({
        baseUrl: 'http://orchestrator:9000'
      });
      expect(customClient.baseUrl).toBe('http://orchestrator:9000');
    });

    it('should have default timeout', () => {
      const defaultClient = new OrchestratorClient();
      expect(defaultClient.timeout).toBeGreaterThan(0);
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status when orchestrator is up', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          version: '0.1.0',
          timestamp: '2026-01-25T12:00:00Z'
        })
      });

      const result = await client.checkHealth();

      expect(result.healthy).toBe(true);
      expect(result.status).toBe('healthy');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/health',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return unhealthy when orchestrator is down', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.checkHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return unhealthy on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await client.checkHealth();

      expect(result.healthy).toBe(false);
    });
  });

  describe('createRun', () => {
    it('should create a run and return run_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          run_id: 'test-uuid-123',
          status: 'completed',
          task: 'Test task',
          current_agent: 'qa',
          actions_count: 10,
          created_at: '2026-01-25T12:00:00Z'
        })
      });

      const result = await client.createRun({
        task: 'Test task',
        repoPath: '/path/to/repo'
      });

      expect(result.success).toBe(true);
      expect(result.runId).toBe('test-uuid-123');
      expect(result.status).toBe('completed');
    });

    it('should include optional parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          run_id: 'test-uuid-456',
          status: 'running',
          task: 'Complex task'
        })
      });

      await client.createRun({
        task: 'Complex task',
        repoPath: '/repo',
        branch: 'feature-branch',
        tokenLimit: 50000,
        costLimitUsd: 5.0
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/runs',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('feature-branch')
        })
      );
    });

    it('should handle creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          detail: 'Invalid task'
        })
      });

      const result = await client.createRun({
        task: '',
        repoPath: '/repo'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      // Mock enough rejections for initial + all retries (maxRetries=3)
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await client.createRun({
        task: 'Test',
        repoPath: '/repo'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('getRunStatus', () => {
    it('should get run status by id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          run_id: 'run-123',
          status: 'completed',
          task: 'Build feature',
          current_agent: 'qa',
          actions_count: 15,
          created_at: '2026-01-25T12:00:00Z'
        })
      });

      const result = await client.getRunStatus('run-123');

      expect(result.success).toBe(true);
      expect(result.runId).toBe('run-123');
      expect(result.status).toBe('completed');
      expect(result.actionsCount).toBe(15);
    });

    it('should handle not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          detail: 'Run not found'
        })
      });

      const result = await client.getRunStatus('nonexistent-run');

      expect(result.success).toBe(false);
      expect(result.notFound).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('should return true when health check passes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' })
      });

      const available = await client.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false when health check fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const available = await client.isAvailable();
      expect(available).toBe(false);
    });
  });
});

describe('OrchestratorClient retry behavior', () => {
  let client;

  beforeEach(() => {
    client = new OrchestratorClient({
      baseUrl: 'http://localhost:8000',
      maxRetries: 2,
      retryDelayMs: 10 // Fast for tests
    });
    mockFetch.mockReset();
  });

  it('should retry on transient failures', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Connection reset'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' })
      });

    const result = await client.checkHealth();

    expect(result.healthy).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should give up after max retries', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'));

    const result = await client.checkHealth();

    expect(result.healthy).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
});
