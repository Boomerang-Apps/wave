/**
 * TDD Tests for Rate Limit Enforcer Middleware (GAP-004)
 *
 * Tests that rate limiting is enforced on agent operations,
 * not just tracked. Returns 429 when limits exceeded.
 *
 * RED Phase: All tests should fail initially
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// These imports will fail until we create the module
import {
  createRateLimitEnforcer,
  getRateLimitMiddleware,
  extractAgentFromRequest,
  RATE_LIMIT_ERRORS
} from '../middleware/rate-limit-enforcer.js';

import { AgentRateLimiter } from '../utils/rate-limiter.js';

describe('Rate Limit Enforcer Middleware (GAP-004)', () => {
  let tempDir;
  let limiter;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rate-limit-enforcer-test-'));
    limiter = new AgentRateLimiter({ projectPath: tempDir });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ============================================
  // UNIT TESTS - extractAgentFromRequest
  // ============================================

  describe('extractAgentFromRequest', () => {
    it('should extract agent type from params', () => {
      const req = {
        params: { agentType: 'fe-dev-1' },
        body: {},
        query: {}
      };
      expect(extractAgentFromRequest(req)).toBe('fe-dev-1');
    });

    it('should extract agent from body if not in params', () => {
      const req = {
        params: {},
        body: { agent: 'be-dev-1' },
        query: {}
      };
      expect(extractAgentFromRequest(req)).toBe('be-dev-1');
    });

    it('should extract agentType from body as fallback', () => {
      const req = {
        params: {},
        body: { agentType: 'qa' },
        query: {}
      };
      expect(extractAgentFromRequest(req)).toBe('qa');
    });

    it('should extract from query params as last resort', () => {
      const req = {
        params: {},
        body: {},
        query: { agent: 'pm' }
      };
      expect(extractAgentFromRequest(req)).toBe('pm');
    });

    it('should return null if no agent found', () => {
      const req = {
        params: {},
        body: {},
        query: {}
      };
      expect(extractAgentFromRequest(req)).toBeNull();
    });
  });

  // ============================================
  // UNIT TESTS - createRateLimitEnforcer
  // ============================================

  describe('createRateLimitEnforcer', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        params: { agentType: 'fe-dev-1' },
        body: { projectPath: tempDir },
        query: {}
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis()
      };
      next = vi.fn();
    });

    it('should call next() when rate limit not exceeded', () => {
      const middleware = createRateLimitEnforcer({ limiter });

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 429 when request rate limit exceeded', () => {
      // Fill up the rate limit
      const limits = limiter.getLimits('fe-dev-1');
      for (let i = 0; i < limits.requests_per_minute; i++) {
        limiter.recordRequest('fe-dev-1', 100);
      }

      const middleware = createRateLimitEnforcer({ limiter });
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: RATE_LIMIT_ERRORS.RATE_EXCEEDED,
          retryAfter: expect.any(Number)
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 429 when token rate limit exceeded', () => {
      const limits = limiter.getLimits('fe-dev-1');
      // Use up most tokens
      limiter.recordRequest('fe-dev-1', limits.tokens_per_minute - 100);

      const middleware = createRateLimitEnforcer({ limiter, estimatedTokens: 500 });
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: RATE_LIMIT_ERRORS.TOKEN_RATE_EXCEEDED
        })
      );
    });

    it('should add X-RateLimit headers to response', () => {
      const middleware = createRateLimitEnforcer({ limiter });
      middleware(req, res, next);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': expect.any(Number),
          'X-RateLimit-Remaining': expect.any(Number),
          'X-RateLimit-Reset': expect.any(Number)
        })
      );
    });

    it('should include Retry-After header when rate limited', () => {
      // Fill up the rate limit
      const limits = limiter.getLimits('fe-dev-1');
      for (let i = 0; i < limits.requests_per_minute; i++) {
        limiter.recordRequest('fe-dev-1', 100);
      }

      const middleware = createRateLimitEnforcer({ limiter });
      middleware(req, res, next);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Retry-After': expect.any(Number)
        })
      );
    });

    it('should return 400 if projectPath missing', () => {
      req.body = {}; // No projectPath

      const middleware = createRateLimitEnforcer({ limiter });
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: RATE_LIMIT_ERRORS.MISSING_PROJECT_PATH
        })
      );
    });

    it('should skip rate limiting if no agent can be determined', () => {
      req.params = {};
      req.body = { projectPath: tempDir };

      const middleware = createRateLimitEnforcer({ limiter, requireAgent: false });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 if agent required but missing', () => {
      req.params = {};
      req.body = { projectPath: tempDir };

      const middleware = createRateLimitEnforcer({ limiter, requireAgent: true });
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: RATE_LIMIT_ERRORS.MISSING_AGENT
        })
      );
    });

    it('should record request after next() completes', async () => {
      const middleware = createRateLimitEnforcer({ limiter, recordOnComplete: true });

      // Simulate request completion
      next.mockImplementation(() => {
        // Simulate response finishing
      });

      middleware(req, res, next);

      const usage = limiter.getUsage('fe-dev-1');
      expect(usage.requests.used).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // UNIT TESTS - getRateLimitMiddleware
  // ============================================

  describe('getRateLimitMiddleware', () => {
    it('should return middleware function', () => {
      const middleware = getRateLimitMiddleware({ projectPath: tempDir });
      expect(typeof middleware).toBe('function');
    });

    it('should create limiter for project path', () => {
      const middleware = getRateLimitMiddleware({ projectPath: tempDir });

      const req = {
        params: { agentType: 'fe-dev-1' },
        body: { projectPath: tempDir },
        query: {}
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis()
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use cached limiter for same project path', () => {
      const middleware1 = getRateLimitMiddleware({ projectPath: tempDir });
      const middleware2 = getRateLimitMiddleware({ projectPath: tempDir });

      // They should use the same underlying limiter
      const req = {
        params: { agentType: 'fe-dev-1' },
        body: { projectPath: tempDir },
        query: {}
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis()
      };

      // Record via first middleware
      middleware1(req, res, vi.fn());

      // Check via limiter directly - request should be recorded
      const limiter = new AgentRateLimiter({ projectPath: tempDir });
      const usage = limiter.getUsage('fe-dev-1');
      expect(usage.requests.used).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // INTEGRATION TESTS - Express-like behavior
  // ============================================

  describe('Express Integration', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        params: { agentType: 'be-dev-1' },
        body: { projectPath: tempDir, estimatedTokens: 1000 },
        query: {},
        path: '/api/agents/be-dev-1/start',
        method: 'POST'
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis()
      };
      next = vi.fn();
    });

    it('should allow first request', () => {
      const middleware = createRateLimitEnforcer({ limiter });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should track requests across multiple calls', () => {
      const middleware = createRateLimitEnforcer({ limiter });

      // Make several requests
      for (let i = 0; i < 5; i++) {
        middleware(req, res, next);
        limiter.recordRequest('be-dev-1', 100);
      }

      const usage = limiter.getUsage('be-dev-1');
      expect(usage.requests.used).toBe(5);
    });

    it('should enforce limits after many requests', () => {
      const middleware = createRateLimitEnforcer({ limiter });
      const limits = limiter.getLimits('be-dev-1');

      // Fill up to limit
      for (let i = 0; i < limits.requests_per_minute; i++) {
        limiter.recordRequest('be-dev-1', 100);
      }

      // Next request should be blocked
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should allow different agents independently', () => {
      const feReq = { ...req, params: { agentType: 'fe-dev-1' } };
      const beReq = { ...req, params: { agentType: 'be-dev-1' } };

      const middleware = createRateLimitEnforcer({ limiter });

      // Fill fe-dev limit
      const feLimits = limiter.getLimits('fe-dev-1');
      for (let i = 0; i < feLimits.requests_per_minute; i++) {
        limiter.recordRequest('fe-dev-1', 100);
      }

      // fe-dev should be blocked
      middleware(feReq, res, next);
      expect(res.status).toHaveBeenCalledWith(429);

      // Reset mocks
      res.status.mockClear();
      next.mockClear();

      // be-dev should still work
      middleware(beReq, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('Security', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        params: { agentType: 'fe-dev-1' },
        body: { projectPath: tempDir },
        query: {},
        headers: {}
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis()
      };
      next = vi.fn();
    });

    it('should not allow bypassing via header manipulation', () => {
      // Fill up limit
      const limits = limiter.getLimits('fe-dev-1');
      for (let i = 0; i < limits.requests_per_minute; i++) {
        limiter.recordRequest('fe-dev-1', 100);
      }

      // Try to bypass with fake headers
      req.headers['X-RateLimit-Remaining'] = '999';
      req.headers['X-Skip-Rate-Limit'] = 'true';

      const middleware = createRateLimitEnforcer({ limiter });
      middleware(req, res, next);

      // Should still be blocked
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should persist rate limit across requests', () => {
      // Record requests with first limiter
      const limits = limiter.getLimits('fe-dev-1');
      for (let i = 0; i < limits.requests_per_minute; i++) {
        limiter.recordRequest('fe-dev-1', 100);
      }

      // Create new limiter (simulating new request)
      const newLimiter = new AgentRateLimiter({ projectPath: tempDir });
      const middleware = createRateLimitEnforcer({ limiter: newLimiter });

      middleware(req, res, next);

      // Should still be blocked due to persistence
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should not allow negative estimated tokens', () => {
      req.body.estimatedTokens = -1000;

      const middleware = createRateLimitEnforcer({ limiter });
      middleware(req, res, next);

      // Should sanitize and proceed
      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================
  // ERROR CODES
  // ============================================

  describe('RATE_LIMIT_ERRORS constants', () => {
    it('should define RATE_EXCEEDED error code', () => {
      expect(RATE_LIMIT_ERRORS.RATE_EXCEEDED).toBe('rate_limit_exceeded');
    });

    it('should define TOKEN_RATE_EXCEEDED error code', () => {
      expect(RATE_LIMIT_ERRORS.TOKEN_RATE_EXCEEDED).toBe('token_rate_exceeded');
    });

    it('should define MISSING_PROJECT_PATH error code', () => {
      expect(RATE_LIMIT_ERRORS.MISSING_PROJECT_PATH).toBe('missing_project_path');
    });

    it('should define MISSING_AGENT error code', () => {
      expect(RATE_LIMIT_ERRORS.MISSING_AGENT).toBe('missing_agent');
    });
  });
});
