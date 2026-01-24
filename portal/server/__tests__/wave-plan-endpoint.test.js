/**
 * TDD Tests for Wave Plan Endpoint (Launch Sequence)
 *
 * Phase 4, Step 4.5: Wave Plan Endpoint
 *
 * Tests the endpoint that creates and persists wave plans.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createWavePlanRequest,
  generateWavePlan,
  persistWavePlan,
  getWavePlanStatus
} from '../utils/wave-plan-endpoint.js';

// Mock dependencies
const mockCreateWavePlan = vi.hoisted(() => vi.fn());
const mockValidateWavePlan = vi.hoisted(() => vi.fn());
const mockGetWaveStats = vi.hoisted(() => vi.fn());

vi.mock('../utils/wave-batching.js', () => ({
  createWavePlan: mockCreateWavePlan,
  validateWavePlan: mockValidateWavePlan,
  getWaveStats: mockGetWaveStats
}));

describe('Wave Plan Endpoint', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // createWavePlanRequest Tests
  // ============================================

  describe('createWavePlanRequest', () => {
    it('should create a request object with projectPath', () => {
      const request = createWavePlanRequest('/path/to/project', 'proj-123');

      expect(request.projectPath).toBe('/path/to/project');
    });

    it('should include projectId in request', () => {
      const request = createWavePlanRequest('/path/to/project', 'proj-123');

      expect(request.projectId).toBe('proj-123');
    });

    it('should include timestamp in request', () => {
      const request = createWavePlanRequest('/path/to/project', 'proj-123');

      expect(request.timestamp).toBeDefined();
    });

    it('should include options when provided', () => {
      const request = createWavePlanRequest('/path/to/project', 'proj-123', {
        optimize: true
      });

      expect(request.options.optimize).toBe(true);
    });

    it('should default to empty options if not provided', () => {
      const request = createWavePlanRequest('/path/to/project', 'proj-123');

      expect(request.options).toEqual({});
    });
  });

  // ============================================
  // generateWavePlan Tests
  // ============================================

  describe('generateWavePlan', () => {
    it('should return valid plan for valid stories', async () => {
      const stories = [
        { id: 'S1', title: 'Story 1', domain: 'frontend' }
      ];

      mockCreateWavePlan.mockReturnValue({
        projectId: 'proj-123',
        waves: [{ waveNumber: 1, stories: [{ id: 'S1' }] }],
        totalStories: 1,
        totalWaves: 1,
        valid: true,
        errors: []
      });

      mockValidateWavePlan.mockReturnValue({ valid: true, errors: [] });
      mockGetWaveStats.mockReturnValue({ totalWaves: 1, parallelismFactor: 1 });

      const result = await generateWavePlan(stories, 'proj-123');

      expect(result.status).toBe('ready');
      expect(result.plan).toBeDefined();
    });

    it('should return blocked status for invalid dependencies', async () => {
      const stories = [
        { id: 'S1', title: 'Story 1', dependencies: ['S999'] }
      ];

      mockCreateWavePlan.mockReturnValue({
        projectId: 'proj-123',
        waves: [],
        totalStories: 1,
        totalWaves: 0,
        valid: false,
        errors: ['Missing dependency S999']
      });

      const result = await generateWavePlan(stories, 'proj-123');

      expect(result.status).toBe('blocked');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include wave statistics in result', async () => {
      const stories = [
        { id: 'S1', title: 'Story 1' },
        { id: 'S2', title: 'Story 2' }
      ];

      mockCreateWavePlan.mockReturnValue({
        projectId: 'proj-123',
        waves: [{ waveNumber: 1, stories: [{ id: 'S1' }, { id: 'S2' }] }],
        totalStories: 2,
        totalWaves: 1,
        valid: true,
        errors: []
      });

      mockValidateWavePlan.mockReturnValue({ valid: true, errors: [] });
      mockGetWaveStats.mockReturnValue({
        totalWaves: 1,
        parallelismFactor: 2,
        averagePerWave: 2
      });

      const result = await generateWavePlan(stories, 'proj-123');

      expect(result.stats).toBeDefined();
      expect(result.stats.parallelismFactor).toBe(2);
    });

    it('should handle empty stories array', async () => {
      mockCreateWavePlan.mockReturnValue({
        projectId: 'proj-123',
        waves: [],
        totalStories: 0,
        totalWaves: 0,
        valid: true,
        errors: []
      });

      mockValidateWavePlan.mockReturnValue({ valid: true, errors: [] });
      mockGetWaveStats.mockReturnValue({ totalWaves: 0, parallelismFactor: 0 });

      const result = await generateWavePlan([], 'proj-123');

      expect(result.status).toBe('ready');
      expect(result.plan.totalStories).toBe(0);
    });

    it('should include creation timestamp', async () => {
      mockCreateWavePlan.mockReturnValue({
        projectId: 'proj-123',
        waves: [],
        totalStories: 0,
        totalWaves: 0,
        valid: true,
        errors: [],
        createdAt: new Date().toISOString()
      });

      mockValidateWavePlan.mockReturnValue({ valid: true, errors: [] });
      mockGetWaveStats.mockReturnValue({ totalWaves: 0 });

      const result = await generateWavePlan([], 'proj-123');

      expect(result.plan.createdAt).toBeDefined();
    });
  });

  // ============================================
  // persistWavePlan Tests
  // ============================================

  describe('persistWavePlan', () => {
    it('should return persistence object', async () => {
      const plan = {
        projectId: 'proj-123',
        waves: [{ waveNumber: 1, stories: [] }],
        valid: true
      };

      const result = await persistWavePlan(plan);

      expect(result).toBeDefined();
    });

    it('should include projectId in persistence', async () => {
      const plan = {
        projectId: 'proj-123',
        waves: [],
        valid: true
      };

      const result = await persistWavePlan(plan);

      expect(result.projectId).toBe('proj-123');
    });

    it('should include validation key', async () => {
      const plan = {
        projectId: 'proj-123',
        waves: [],
        valid: true
      };

      const result = await persistWavePlan(plan);

      expect(result.validationKey).toBe('_wavePlan');
    });

    it('should include status based on plan validity', async () => {
      const validPlan = {
        projectId: 'proj-123',
        waves: [{ waveNumber: 1, stories: [{ id: 'S1' }] }],
        valid: true
      };

      const result = await persistWavePlan(validPlan);

      expect(result.status).toBe('ready');
    });

    it('should set blocked status for invalid plan', async () => {
      const invalidPlan = {
        projectId: 'proj-123',
        waves: [],
        valid: false,
        errors: ['Some error']
      };

      const result = await persistWavePlan(invalidPlan);

      expect(result.status).toBe('blocked');
    });

    it('should include wave summary', async () => {
      const plan = {
        projectId: 'proj-123',
        waves: [
          { waveNumber: 1, stories: [{ id: 'S1' }] },
          { waveNumber: 2, stories: [{ id: 'S2' }] }
        ],
        totalWaves: 2,
        totalStories: 2,
        valid: true
      };

      const result = await persistWavePlan(plan);

      expect(result.summary.totalWaves).toBe(2);
      expect(result.summary.totalStories).toBe(2);
    });

    it('should include last_checked timestamp', async () => {
      const plan = {
        projectId: 'proj-123',
        waves: [],
        valid: true
      };

      const result = await persistWavePlan(plan);

      expect(result.last_checked).toBeDefined();
    });
  });

  // ============================================
  // getWavePlanStatus Tests
  // ============================================

  describe('getWavePlanStatus', () => {
    it('should return idle if no plan exists', () => {
      const config = {};

      const status = getWavePlanStatus(config);

      expect(status).toBe('idle');
    });

    it('should return ready if plan is valid', () => {
      const config = {
        _wavePlan: {
          status: 'ready',
          summary: { totalWaves: 2 }
        }
      };

      const status = getWavePlanStatus(config);

      expect(status).toBe('ready');
    });

    it('should return blocked if plan has errors', () => {
      const config = {
        _wavePlan: {
          status: 'blocked',
          errors: ['Circular dependency']
        }
      };

      const status = getWavePlanStatus(config);

      expect(status).toBe('blocked');
    });

    it('should return stale if plan is outdated', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2);

      const config = {
        _wavePlan: {
          status: 'ready',
          last_checked: oldDate.toISOString()
        }
      };

      const status = getWavePlanStatus(config, { maxAge: 86400000 }); // 1 day

      expect(status).toBe('stale');
    });

    it('should not be stale if within maxAge', () => {
      const recentDate = new Date();

      const config = {
        _wavePlan: {
          status: 'ready',
          last_checked: recentDate.toISOString()
        }
      };

      const status = getWavePlanStatus(config, { maxAge: 86400000 }); // 1 day

      expect(status).toBe('ready');
    });
  });

  // ============================================
  // Integration Tests
  // ============================================

  describe('Integration', () => {
    it('should create and persist a complete wave plan', async () => {
      const stories = [
        { id: 'S1', title: 'Auth', domain: 'backend' },
        { id: 'S2', title: 'Login UI', domain: 'frontend', dependencies: ['S1'] }
      ];

      mockCreateWavePlan.mockReturnValue({
        projectId: 'proj-123',
        waves: [
          { waveNumber: 1, stories: [{ id: 'S1', agent: 'be-dev-1' }] },
          { waveNumber: 2, stories: [{ id: 'S2', agent: 'fe-dev-1' }] }
        ],
        totalStories: 2,
        totalWaves: 2,
        domainBreakdown: { frontend: 1, backend: 1 },
        agentWorkload: { 'be-dev-1': 1, 'fe-dev-1': 1 },
        valid: true,
        errors: [],
        createdAt: new Date().toISOString()
      });

      mockValidateWavePlan.mockReturnValue({ valid: true, errors: [] });
      mockGetWaveStats.mockReturnValue({
        totalWaves: 2,
        parallelismFactor: 1,
        averagePerWave: 1
      });

      const generated = await generateWavePlan(stories, 'proj-123');
      const persisted = await persistWavePlan(generated.plan);

      expect(generated.status).toBe('ready');
      expect(persisted.status).toBe('ready');
      expect(persisted.summary.totalWaves).toBe(2);
    });

    it('should reject plan with circular dependencies', async () => {
      const stories = [
        { id: 'S1', title: 'Story 1', dependencies: ['S2'] },
        { id: 'S2', title: 'Story 2', dependencies: ['S1'] }
      ];

      mockCreateWavePlan.mockReturnValue({
        projectId: 'proj-123',
        waves: [],
        totalStories: 2,
        totalWaves: 0,
        valid: false,
        errors: ['Circular dependency detected: S1 -> S2']
      });

      const result = await generateWavePlan(stories, 'proj-123');

      expect(result.status).toBe('blocked');
      expect(result.errors.some(e => e.includes('Circular'))).toBe(true);
    });

    it('should include domain breakdown in persisted plan', async () => {
      const stories = [
        { id: 'S1', title: 'Story 1', domain: 'frontend' },
        { id: 'S2', title: 'Story 2', domain: 'backend' }
      ];

      mockCreateWavePlan.mockReturnValue({
        projectId: 'proj-123',
        waves: [{ waveNumber: 1, stories: [{ id: 'S1' }, { id: 'S2' }] }],
        totalStories: 2,
        totalWaves: 1,
        domainBreakdown: { frontend: 1, backend: 1 },
        valid: true,
        errors: []
      });

      mockValidateWavePlan.mockReturnValue({ valid: true, errors: [] });
      mockGetWaveStats.mockReturnValue({ totalWaves: 1 });

      const generated = await generateWavePlan(stories, 'proj-123');
      const persisted = await persistWavePlan(generated.plan);

      expect(persisted.domainBreakdown).toEqual({ frontend: 1, backend: 1 });
    });
  });
});
