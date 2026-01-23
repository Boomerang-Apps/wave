// ═══════════════════════════════════════════════════════════════════════════════
// RETRY MANAGER UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════════
// Validates AWS Builders Library exponential backoff pattern implementation
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryManager, withRetry, retryable } from '../utils/retry-manager.js';

describe('RetryManager', () => {
  let retryManager;

  beforeEach(() => {
    retryManager = new RetryManager({
      maxRetries: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      jitter: 'none' // Disable jitter for predictable tests
    });
  });

  describe('constructor', () => {
    it('should use default values when no options provided', () => {
      const manager = new RetryManager();
      expect(manager.config.maxRetries).toBe(5);
      expect(manager.config.baseDelayMs).toBe(1000);
      expect(manager.config.maxDelayMs).toBe(30000);
    });

    it('should override defaults with provided options', () => {
      const manager = new RetryManager({
        maxRetries: 10,
        baseDelayMs: 500
      });
      expect(manager.config.maxRetries).toBe(10);
      expect(manager.config.baseDelayMs).toBe(500);
    });
  });

  describe('execute', () => {
    it('should return success on first attempt when function succeeds', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retryManager.execute(fn);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed eventually', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retryManager.execute(fn);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should fail after all retries exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));

      const result = await retryManager.execute(fn);

      expect(result.success).toBe(false);
      expect(result.exhausted).toBe(true);
      expect(result.attempts).toBe(4); // 1 initial + 3 retries
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue({
        message: 'auth error',
        data: { error: 'invalid_auth' }
      });

      const result = await retryManager.execute(fn);

      expect(result.success).toBe(false);
      expect(result.retryable).toBe(false);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should track duration', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retryManager.execute(fn);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isRetryable', () => {
    it('should retry network errors', () => {
      const errors = [
        { code: 'ECONNRESET' },
        { code: 'ETIMEDOUT' },
        { code: 'ENOTFOUND' }
      ];

      errors.forEach(error => {
        expect(retryManager.isRetryable(error, {})).toBe(true);
      });
    });

    it('should retry HTTP 5xx errors', () => {
      const errors = [
        { status: 500 },
        { status: 502 },
        { status: 503 },
        { status: 504 }
      ];

      errors.forEach(error => {
        expect(retryManager.isRetryable(error, {})).toBe(true);
      });
    });

    it('should retry rate limited errors', () => {
      const error = { data: { error: 'rate_limited' } };
      expect(retryManager.isRetryable(error, {})).toBe(true);
    });

    it('should not retry permanent auth errors', () => {
      const errors = [
        { data: { error: 'invalid_auth' } },
        { data: { error: 'token_revoked' } },
        { data: { error: 'channel_not_found' } }
      ];

      errors.forEach(error => {
        expect(retryManager.isRetryable(error, {})).toBe(false);
      });
    });

    it('should use custom shouldRetry function', () => {
      const config = {
        shouldRetry: (error) => error.customRetry === true
      };

      expect(retryManager.isRetryable({ customRetry: true }, config)).toBe(true);
      expect(retryManager.isRetryable({ customRetry: false }, config)).toBe(false);
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after threshold failures', async () => {
      const manager = new RetryManager({
        maxRetries: 0,
        circuitThreshold: 2,
        circuitResetMs: 1000
      });

      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await manager.execute(fn);
      await manager.execute(fn);

      const status = manager.getCircuitStatus();
      expect(status.open).toBe(true);
    });

    it('should reject calls when circuit is open', async () => {
      const manager = new RetryManager({
        maxRetries: 0,
        circuitThreshold: 1,
        circuitResetMs: 10000
      });

      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await manager.execute(fn);
      const result = await manager.execute(fn);

      expect(result.success).toBe(false);
      expect(result.circuitOpen).toBe(true);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset circuit manually', () => {
      const manager = new RetryManager({
        circuitThreshold: 1
      });

      manager.failures = 5;
      manager.circuitOpen = true;

      manager.resetCircuit();

      expect(manager.circuitOpen).toBe(false);
      expect(manager.failures).toBe(0);
    });
  });
});

describe('withRetry', () => {
  it('should execute function with retry logic', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3 });

    expect(result.success).toBe(true);
    expect(result.result).toBe('success');
  });
});

describe('retryable', () => {
  it('should create a retry-wrapped function', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const wrapped = retryable(fn, { maxRetries: 3 });

    const result = await wrapped('arg1', 'arg2');

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should throw after retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    const wrapped = retryable(fn, { maxRetries: 2, jitter: 'none', baseDelayMs: 10 });

    await expect(wrapped()).rejects.toThrow('always fails');
  });
});
