/**
 * Distributed Rate Limiter Tests (SEC-003)
 *
 * TDD tests for distributed rate limiting with pluggable stores.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MemoryStore,
  RedisStore,
  DistributedRateLimiter,
  createMemoryRateLimiter
} from '../utils/distributed-rate-limiter.js';

describe('Distributed Rate Limiter (SEC-003)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // MemoryStore
  // ─────────────────────────────────────────────────────────────────────────────

  describe('MemoryStore', () => {
    let store;

    beforeEach(() => {
      store = new MemoryStore();
    });

    afterEach(() => {
      store.stopCleanup();
    });

    it('should increment counter', async () => {
      const result = await store.increment('test-key', 60000);

      expect(result.count).toBe(1);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should increment counter multiple times', async () => {
      await store.increment('test-key', 60000);
      await store.increment('test-key', 60000);
      const result = await store.increment('test-key', 60000);

      expect(result.count).toBe(3);
    });

    it('should track separate keys independently', async () => {
      await store.increment('key1', 60000);
      await store.increment('key1', 60000);
      await store.increment('key2', 60000);

      const result1 = await store.get('key1');
      const result2 = await store.get('key2');

      expect(result1.count).toBe(2);
      expect(result2.count).toBe(1);
    });

    it('should reset counter after window expires', async () => {
      vi.useFakeTimers();

      await store.increment('test-key', 1000);
      await store.increment('test-key', 1000);

      // Advance past window
      vi.advanceTimersByTime(1001);

      const result = await store.increment('test-key', 1000);

      expect(result.count).toBe(1);

      vi.useRealTimers();
    });

    it('should get current count', async () => {
      await store.increment('test-key', 60000);
      await store.increment('test-key', 60000);

      const result = await store.get('test-key');

      expect(result.count).toBe(2);
    });

    it('should return null for non-existent key', async () => {
      const result = await store.get('non-existent');

      expect(result).toBeNull();
    });

    it('should decrement counter', async () => {
      await store.increment('test-key', 60000);
      await store.increment('test-key', 60000);
      await store.decrement('test-key');

      const result = await store.get('test-key');

      expect(result.count).toBe(1);
    });

    it('should not decrement below zero', async () => {
      await store.increment('test-key', 60000);
      await store.decrement('test-key');
      await store.decrement('test-key');

      const result = await store.get('test-key');

      expect(result.count).toBe(0);
    });

    it('should reset key', async () => {
      await store.increment('test-key', 60000);
      await store.reset('test-key');

      const result = await store.get('test-key');

      expect(result).toBeNull();
    });

    it('should clear all entries', async () => {
      await store.increment('key1', 60000);
      await store.increment('key2', 60000);
      await store.clear();

      expect(store.size).toBe(0);
    });

    it('should cleanup expired entries', async () => {
      vi.useFakeTimers();

      await store.increment('key1', 1000);
      await store.increment('key2', 5000);

      store.startCleanup(500);

      // Advance to expire key1
      vi.advanceTimersByTime(1500);

      // Trigger cleanup
      vi.advanceTimersByTime(500);

      const result1 = await store.get('key1');
      const result2 = await store.get('key2');

      expect(result1).toBeNull();
      expect(result2).not.toBeNull();

      vi.useRealTimers();
    });

    it('should stop cleanup', () => {
      store.startCleanup(1000);
      expect(store.cleanupInterval).not.toBeNull();

      store.stopCleanup();
      expect(store.cleanupInterval).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RedisStore (mock)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('RedisStore', () => {
    it('should throw without client', () => {
      expect(() => new RedisStore()).toThrow('Redis client is required');
    });

    it('should create with client and prefix', () => {
      const mockClient = {};
      const store = new RedisStore({
        client: mockClient,
        prefix: 'myapp:'
      });

      expect(store.client).toBe(mockClient);
      expect(store.prefix).toBe('myapp:');
    });

    it('should use default prefix', () => {
      const mockClient = {};
      const store = new RedisStore({ client: mockClient });

      expect(store.prefix).toBe('ratelimit:');
    });

    it('should generate prefixed keys', () => {
      const mockClient = {};
      const store = new RedisStore({
        client: mockClient,
        prefix: 'test:'
      });

      expect(store._key('mykey')).toBe('test:mykey');
    });

    it('should increment using Redis MULTI', async () => {
      const mockClient = {
        multi: vi.fn().mockReturnThis(),
        incr: vi.fn().mockReturnThis(),
        pttl: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [null, 5],    // incr result
          [null, 30000] // pttl result
        ]),
        pexpire: vi.fn()
      };

      const store = new RedisStore({ client: mockClient });
      const result = await store.increment('test-key', 60000);

      expect(mockClient.multi).toHaveBeenCalled();
      expect(mockClient.incr).toHaveBeenCalledWith('ratelimit:test-key');
      expect(result.count).toBe(5);
    });

    it('should set expiry for new key', async () => {
      const mockClient = {
        multi: vi.fn().mockReturnThis(),
        incr: vi.fn().mockReturnThis(),
        pttl: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [null, 1],  // incr result
          [null, -1]  // pttl result (no expiry)
        ]),
        pexpire: vi.fn().mockResolvedValue(1)
      };

      const store = new RedisStore({ client: mockClient });
      await store.increment('test-key', 60000);

      expect(mockClient.pexpire).toHaveBeenCalledWith('ratelimit:test-key', 60000);
    });

    it('should get current count', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue('10'),
        pttl: vi.fn().mockResolvedValue(30000)
      };

      const store = new RedisStore({ client: mockClient });
      const result = await store.get('test-key');

      expect(result.count).toBe(10);
    });

    it('should return null for missing key', async () => {
      const mockClient = {
        get: vi.fn().mockResolvedValue(null),
        pttl: vi.fn().mockResolvedValue(-2)
      };

      const store = new RedisStore({ client: mockClient });
      const result = await store.get('test-key');

      expect(result).toBeNull();
    });

    it('should reset key', async () => {
      const mockClient = {
        del: vi.fn().mockResolvedValue(1)
      };

      const store = new RedisStore({ client: mockClient });
      await store.reset('test-key');

      expect(mockClient.del).toHaveBeenCalledWith('ratelimit:test-key');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DistributedRateLimiter
  // ─────────────────────────────────────────────────────────────────────────────

  describe('DistributedRateLimiter', () => {
    let store;
    let limiter;

    beforeEach(() => {
      store = new MemoryStore();
      limiter = new DistributedRateLimiter({
        store,
        windowMs: 60000,
        maxRequests: 5
      });
    });

    afterEach(() => {
      store.stopCleanup();
    });

    it('should throw without store', () => {
      expect(() => new DistributedRateLimiter({
        windowMs: 60000,
        maxRequests: 5
      })).toThrow('Store is required');
    });

    it('should throw without windowMs', () => {
      expect(() => new DistributedRateLimiter({
        store: new MemoryStore(),
        maxRequests: 5
      })).toThrow('windowMs must be a positive number');
    });

    it('should throw without maxRequests', () => {
      expect(() => new DistributedRateLimiter({
        store: new MemoryStore(),
        windowMs: 60000
      })).toThrow('maxRequests must be a positive number');
    });

    it('should not limit under threshold', async () => {
      const result = await limiter.check('test-key');

      expect(result.limited).toBe(false);
      expect(result.count).toBe(1);
      expect(result.remaining).toBe(4);
    });

    it('should limit over threshold', async () => {
      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        await limiter.check('test-key');
      }

      // 6th request should be limited
      const result = await limiter.check('test-key');

      expect(result.limited).toBe(true);
      expect(result.count).toBe(6);
      expect(result.remaining).toBe(0);
    });

    it('should track remaining correctly', async () => {
      let result;

      result = await limiter.check('test-key');
      expect(result.remaining).toBe(4);

      result = await limiter.check('test-key');
      expect(result.remaining).toBe(3);

      result = await limiter.check('test-key');
      expect(result.remaining).toBe(2);
    });

    it('should reset rate limit', async () => {
      // Make some requests
      await limiter.check('test-key');
      await limiter.check('test-key');

      // Reset
      await limiter.reset('test-key');

      // Should be fresh
      const result = await limiter.check('test-key');
      expect(result.count).toBe(1);
    });

    it('should get status', async () => {
      await limiter.check('test-key');
      await limiter.check('test-key');

      const status = await limiter.getStatus('test-key');

      expect(status.count).toBe(2);
      expect(status.remaining).toBe(3);
    });

    it('should return null status for unknown key', async () => {
      const status = await limiter.getStatus('unknown');
      expect(status).toBeNull();
    });

    describe('middleware', () => {
      it('should pass through under limit', async () => {
        const middleware = limiter.middleware();
        const req = { ip: '192.168.1.1' };
        const res = {
          setHeader: vi.fn(),
          status: vi.fn().mockReturnThis(),
          json: vi.fn()
        };
        const next = vi.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should set rate limit headers', async () => {
        const middleware = limiter.middleware();
        const req = { ip: '192.168.1.1' };
        const res = {
          setHeader: vi.fn(),
          status: vi.fn().mockReturnThis(),
          json: vi.fn()
        };
        const next = vi.fn();

        await middleware(req, res, next);

        expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
        expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
        expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
      });

      it('should return 429 when limited', async () => {
        const middleware = limiter.middleware();
        const req = { ip: '192.168.1.1' };
        const res = {
          setHeader: vi.fn(),
          status: vi.fn().mockReturnThis(),
          json: vi.fn()
        };
        const next = vi.fn();

        // Exhaust limit
        for (let i = 0; i < 5; i++) {
          await middleware(req, res, next);
        }

        // Reset mocks
        next.mockClear();
        res.status.mockClear();
        res.json.mockClear();

        // Should be limited
        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: expect.any(String),
          retryAfter: expect.any(Number)
        }));
        expect(next).not.toHaveBeenCalled();
      });

      it('should call onLimit callback', async () => {
        const onLimit = vi.fn();
        const customLimiter = new DistributedRateLimiter({
          store,
          windowMs: 60000,
          maxRequests: 1,
          onLimit
        });

        const middleware = customLimiter.middleware();
        const req = { ip: '10.0.0.1' };
        const res = {
          setHeader: vi.fn(),
          status: vi.fn().mockReturnThis(),
          json: vi.fn()
        };

        await middleware(req, res, vi.fn());
        await middleware(req, res, vi.fn());

        expect(onLimit).toHaveBeenCalledWith(req, expect.objectContaining({
          limited: true
        }));
      });

      it('should skip when skip function returns true', async () => {
        const customLimiter = new DistributedRateLimiter({
          store,
          windowMs: 60000,
          maxRequests: 1,
          skip: (req) => req.path === '/health'
        });

        const middleware = customLimiter.middleware();
        const req = { ip: '192.168.1.1', path: '/health' };
        const res = { setHeader: vi.fn() };
        const next = vi.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.setHeader).not.toHaveBeenCalled();
      });

      it('should use custom keyGenerator', async () => {
        const customLimiter = new DistributedRateLimiter({
          store,
          windowMs: 60000,
          maxRequests: 5,
          keyGenerator: (req) => req.user?.id || 'anonymous'
        });

        const middleware = customLimiter.middleware();
        const req1 = { user: { id: 'user1' } };
        const req2 = { user: { id: 'user2' } };
        const res = {
          setHeader: vi.fn(),
          status: vi.fn().mockReturnThis(),
          json: vi.fn()
        };
        const next = vi.fn();

        await middleware(req1, res, next);
        await middleware(req2, res, next);

        // Each user should have their own counter
        const status1 = await customLimiter.getStatus('user1');
        const status2 = await customLimiter.getStatus('user2');

        expect(status1.count).toBe(1);
        expect(status2.count).toBe(1);
      });

      it('should fail open on store error', async () => {
        const errorStore = {
          increment: vi.fn().mockRejectedValue(new Error('Redis connection failed'))
        };

        const errorLimiter = new DistributedRateLimiter({
          store: errorStore,
          windowMs: 60000,
          maxRequests: 5
        });

        const middleware = errorLimiter.middleware();
        const req = { ip: '192.168.1.1' };
        const res = { setHeader: vi.fn() };
        const next = vi.fn();

        // Should not throw, should call next
        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Factory Functions
  // ─────────────────────────────────────────────────────────────────────────────

  describe('createMemoryRateLimiter', () => {
    it('should create rate limiter with memory store', () => {
      const limiter = createMemoryRateLimiter({
        windowMs: 30000,
        maxRequests: 50
      });

      expect(limiter).toBeInstanceOf(DistributedRateLimiter);
      expect(limiter.windowMs).toBe(30000);
      expect(limiter.maxRequests).toBe(50);

      // Cleanup
      limiter.store.stopCleanup();
    });

    it('should use defaults', () => {
      const limiter = createMemoryRateLimiter();

      expect(limiter.windowMs).toBe(60000);
      expect(limiter.maxRequests).toBe(100);

      limiter.store.stopCleanup();
    });
  });
});
