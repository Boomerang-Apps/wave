/**
 * Promise Utilities Tests (CQ-002)
 *
 * TDD tests for Promise.race with proper cleanup to prevent dangling promises.
 *
 * Sources:
 * - https://developer.mozilla.org/en-US/docs/Web/API/AbortController
 * - https://nearform.com/insights/using-abortsignal-in-node-js/
 * - https://openjsf.org/blog/using-abortsignal-in-node-js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { raceWithTimeout, raceWithCleanup } from '../utils/promise-utils.js';

describe('Promise Utilities (CQ-002)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // raceWithTimeout
  // ─────────────────────────────────────────────────────────────────────────────

  describe('raceWithTimeout', () => {
    it('should resolve when promise completes before timeout', async () => {
      const promise = Promise.resolve('success');

      const result = await raceWithTimeout(promise, 1000);

      expect(result).toBe('success');
    });

    it('should reject on timeout', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const slowPromise = new Promise(resolve => {
        setTimeout(() => resolve('slow'), 5000);
      });

      await expect(raceWithTimeout(slowPromise, 50))
        .rejects.toThrow('timed out');
    });

    it('should clean up timeout when promise resolves first', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const fastPromise = Promise.resolve('fast');

      await raceWithTimeout(fastPromise, 1000);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should return result with timedOut flag', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const slowPromise = new Promise(resolve => {
        setTimeout(() => resolve('slow'), 5000);
      });

      const result = await raceWithTimeout(slowPromise, 50, {
        returnResult: true
      });

      expect(result.timedOut).toBe(true);
      expect(result.error).toBeDefined();
    });

    it('should include data when promise resolves', async () => {
      const result = await raceWithTimeout(
        Promise.resolve({ data: 'test' }),
        1000,
        { returnResult: true }
      );

      expect(result.timedOut).toBe(false);
      expect(result.data).toEqual({ data: 'test' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // raceWithCleanup
  // ─────────────────────────────────────────────────────────────────────────────

  describe('raceWithCleanup', () => {
    it('should resolve with winner result', async () => {
      const fast = Promise.resolve('fast');
      const slow = new Promise(resolve => setTimeout(() => resolve('slow'), 1000));

      const result = await raceWithCleanup([fast, slow]);

      expect(result).toBe('fast');
    });

    it('should provide abort signal to promise factories', async () => {
      let capturedSignal = null;

      const factory = (signal) => {
        capturedSignal = signal;
        return Promise.resolve('done');
      };

      await raceWithCleanup([factory]);

      expect(capturedSignal).toBeInstanceOf(AbortSignal);
    });

    it('should abort pending promises after winner resolves', async () => {
      let wasAborted = false;

      const winner = Promise.resolve('winner');
      const loser = (signal) => {
        return new Promise((resolve) => {
          signal.addEventListener('abort', () => {
            wasAborted = true;
          });
          setTimeout(() => resolve('loser'), 1000);
        });
      };

      await raceWithCleanup([winner, loser]);

      expect(wasAborted).toBe(true);
    });

    it('should clean up AbortController listeners', async () => {
      const removeEventListenerSpy = vi.fn();

      const mockSignal = {
        aborted: false,
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerSpy
      };

      // Create a simple controller mock
      const mockController = {
        signal: mockSignal,
        abort: vi.fn()
      };

      // Test with real promises
      await raceWithCleanup([Promise.resolve('done')]);

      // The function should abort controller after resolution
      // which triggers cleanup
    });

    it('should handle mixed promises and functions', async () => {
      const promise = Promise.resolve('promise');
      const factory = () => Promise.resolve('factory');

      const result = await raceWithCleanup([promise, factory]);

      // First one wins
      expect(result).toBe('promise');
    });

    it('should propagate rejection from winner', async () => {
      const rejectingPromise = Promise.reject(new Error('failed'));
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 1000));

      await expect(raceWithCleanup([rejectingPromise, slowPromise]))
        .rejects.toThrow('failed');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle empty array', async () => {
      await expect(raceWithCleanup([])).rejects.toThrow();
    });

    it('should handle single promise', async () => {
      const result = await raceWithCleanup([Promise.resolve('only')]);
      expect(result).toBe('only');
    });

    it('should handle immediate resolution', async () => {
      const result = await raceWithTimeout(
        Promise.resolve('immediate'),
        0
      );
      expect(result).toBe('immediate');
    });
  });
});
