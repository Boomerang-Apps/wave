/**
 * Cleanup Handler Tests (CQ-012)
 *
 * TDD tests for cleanup utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import {
  CleanupStack,
  createDisposable,
  withDisposable,
  managedTimeout,
  managedInterval,
  managedListener,
  trackAsync,
  withCleanup,
  withCleanupSync,
  ResourcePool
} from '../utils/cleanup-handler.js';

describe('Cleanup Handler (CQ-012)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // CleanupStack
  // ─────────────────────────────────────────────────────────────────────────────

  describe('CleanupStack', () => {
    it('should add cleanup callbacks', () => {
      const cleanup = new CleanupStack();

      cleanup.push(() => {});
      cleanup.push(() => {});

      expect(cleanup.size).toBe(2);
    });

    it('should throw for non-function', () => {
      const cleanup = new CleanupStack();

      expect(() => cleanup.push('not a function')).toThrow('must be a function');
    });

    it('should run cleanups in LIFO order', async () => {
      const cleanup = new CleanupStack();
      const order = [];

      cleanup.push(() => order.push('first'));
      cleanup.push(() => order.push('second'));
      cleanup.push(() => order.push('third'));

      await cleanup.runAll();

      expect(order).toEqual(['third', 'second', 'first']);
    });

    it('should continue on errors', async () => {
      const cleanup = new CleanupStack();
      const order = [];

      cleanup.push(() => order.push('first'));
      cleanup.push(() => { throw new Error('oops'); });
      cleanup.push(() => order.push('third'));

      const { errors } = await cleanup.runAll();

      expect(order).toEqual(['third', 'first']);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('oops');
    });

    it('should handle async cleanups', async () => {
      const cleanup = new CleanupStack();
      const order = [];

      cleanup.push(async () => {
        await new Promise(r => setTimeout(r, 10));
        order.push('async');
      });
      cleanup.push(() => order.push('sync'));

      await cleanup.runAll();

      expect(order).toEqual(['sync', 'async']);
    });

    it('should remove specific cleanup', () => {
      const cleanup = new CleanupStack();
      const fn1 = () => {};
      const fn2 = () => {};

      cleanup.push(fn1);
      cleanup.push(fn2);

      expect(cleanup.remove(fn1)).toBe(true);
      expect(cleanup.size).toBe(1);
    });

    it('should return false for non-existent removal', () => {
      const cleanup = new CleanupStack();

      expect(cleanup.remove(() => {})).toBe(false);
    });

    it('should clear all cleanups', () => {
      const cleanup = new CleanupStack();

      cleanup.push(() => {});
      cleanup.push(() => {});
      cleanup.clear();

      expect(cleanup.size).toBe(0);
    });

    it('should run cleanups synchronously', () => {
      const cleanup = new CleanupStack();
      const order = [];

      cleanup.push(() => order.push('first'));
      cleanup.push(() => order.push('second'));

      cleanup.runAllSync();

      expect(order).toEqual(['second', 'first']);
    });

    it('should use add as alias for push', () => {
      const cleanup = new CleanupStack();

      cleanup.add(() => {});

      expect(cleanup.size).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Disposable Pattern
  // ─────────────────────────────────────────────────────────────────────────────

  describe('createDisposable', () => {
    it('should create disposable resource', async () => {
      const dispose = vi.fn();

      const { resource, dispose: disposeFn } = await createDisposable(async () => ({
        resource: 'myResource',
        dispose
      }));

      expect(resource).toBe('myResource');

      await disposeFn();
      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it('should only dispose once', async () => {
      const dispose = vi.fn();

      const { dispose: disposeFn } = await createDisposable(async () => ({
        resource: 'myResource',
        dispose
      }));

      await disposeFn();
      await disposeFn();

      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it('should throw for invalid setup', async () => {
      await expect(createDisposable(async () => ({
        resource: 'x'
        // missing dispose
      }))).rejects.toThrow('must return { resource, dispose }');
    });
  });

  describe('withDisposable', () => {
    it('should execute with resource and dispose', async () => {
      const dispose = vi.fn();

      const result = await withDisposable(
        async () => ({
          resource: { value: 42 },
          dispose
        }),
        async (resource) => resource.value * 2
      );

      expect(result).toBe(84);
      expect(dispose).toHaveBeenCalled();
    });

    it('should dispose even on error', async () => {
      const dispose = vi.fn();

      await expect(withDisposable(
        async () => ({
          resource: 'x',
          dispose
        }),
        async () => { throw new Error('boom'); }
      )).rejects.toThrow('boom');

      expect(dispose).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Timer Management
  // ─────────────────────────────────────────────────────────────────────────────

  describe('managedTimeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create clearable timeout', () => {
      const callback = vi.fn();
      const { id, clear } = managedTimeout(callback, 1000);

      expect(id).toBeDefined();
      expect(typeof clear).toBe('function');

      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalled();
    });

    it('should clear timeout before firing', () => {
      const callback = vi.fn();
      const { clear } = managedTimeout(callback, 1000);

      vi.advanceTimersByTime(500);
      clear();
      vi.advanceTimersByTime(1000);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('managedInterval', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create clearable interval', () => {
      const callback = vi.fn();
      const { clear } = managedInterval(callback, 100);

      vi.advanceTimersByTime(350);
      expect(callback).toHaveBeenCalledTimes(3);

      clear();
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Event Listener Management
  // ─────────────────────────────────────────────────────────────────────────────

  describe('managedListener', () => {
    it('should add and remove Node.js EventEmitter listener', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      const { remove } = managedListener(emitter, 'test', handler);

      emitter.emit('test', 'data');
      expect(handler).toHaveBeenCalledWith('data');

      remove();
      emitter.emit('test', 'more');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should add and remove DOM-like event listener', () => {
      const handler = vi.fn();
      const target = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };

      const { remove } = managedListener(target, 'click', handler, { once: true });

      expect(target.addEventListener).toHaveBeenCalledWith('click', handler, { once: true });

      remove();
      expect(target.removeEventListener).toHaveBeenCalledWith('click', handler, { once: true });
    });

    it('should throw for invalid target', () => {
      expect(() => managedListener({}, 'event', () => {}))
        .toThrow('must be an EventTarget or EventEmitter');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Async Operation Tracking
  // ─────────────────────────────────────────────────────────────────────────────

  describe('trackAsync', () => {
    it('should track async operation', async () => {
      const { promise } = trackAsync(async () => {
        await new Promise(r => setTimeout(r, 10));
        return 'result';
      });

      const result = await promise;
      expect(result).toBe('result');
    });

    it('should cancel operation', async () => {
      const { promise, cancel } = trackAsync(async (signal) => {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 1000);
          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
        return 'result';
      });

      cancel();

      // Should resolve to undefined when cancelled
      const result = await promise;
      expect(result).toBeUndefined();
    });

    it('should propagate non-abort errors', async () => {
      const { promise } = trackAsync(async () => {
        throw new Error('real error');
      });

      await expect(promise).rejects.toThrow('real error');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Scope Guard
  // ─────────────────────────────────────────────────────────────────────────────

  describe('withCleanup', () => {
    it('should run cleanup after function', async () => {
      const cleanup = vi.fn();

      await withCleanup(
        async () => 'result',
        cleanup
      );

      expect(cleanup).toHaveBeenCalled();
    });

    it('should run cleanup on error', async () => {
      const cleanup = vi.fn();

      await expect(withCleanup(
        async () => { throw new Error('boom'); },
        cleanup
      )).rejects.toThrow('boom');

      expect(cleanup).toHaveBeenCalled();
    });

    it('should return function result', async () => {
      const result = await withCleanup(
        async () => 42,
        async () => {}
      );

      expect(result).toBe(42);
    });
  });

  describe('withCleanupSync', () => {
    it('should run cleanup synchronously', () => {
      const cleanup = vi.fn();

      const result = withCleanupSync(
        () => 'result',
        cleanup
      );

      expect(result).toBe('result');
      expect(cleanup).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Resource Pool
  // ─────────────────────────────────────────────────────────────────────────────

  describe('ResourcePool', () => {
    it('should throw for invalid constructor args', () => {
      expect(() => new ResourcePool('not a fn', () => {})).toThrow('must be functions');
      expect(() => new ResourcePool(() => {}, 'not a fn')).toThrow('must be functions');
    });

    it('should acquire and release resources', async () => {
      const create = vi.fn().mockResolvedValue({ id: 1 });
      const destroy = vi.fn();

      const pool = new ResourcePool(create, destroy);

      const resource = await pool.acquire();
      expect(resource).toEqual({ id: 1 });
      expect(pool.inUseCount).toBe(1);

      pool.release(resource);
      expect(pool.inUseCount).toBe(0);
      expect(pool.availableCount).toBe(1);
    });

    it('should reuse released resources', async () => {
      const create = vi.fn()
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });
      const destroy = vi.fn();

      const pool = new ResourcePool(create, destroy);

      const r1 = await pool.acquire();
      pool.release(r1);

      const r2 = await pool.acquire();

      expect(r2.id).toBe(1); // Same resource reused
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('should respect maxSize', async () => {
      const destroy = vi.fn();
      const pool = new ResourcePool(
        () => ({}),
        destroy,
        { maxSize: 2 }
      );

      const r1 = await pool.acquire();
      const r2 = await pool.acquire();
      const r3 = await pool.acquire();

      pool.release(r1);
      pool.release(r2);
      pool.release(r3); // Should be destroyed (exceeds max)

      expect(pool.availableCount).toBe(2);
      expect(destroy).toHaveBeenCalledTimes(1);
    });

    it('should execute withResource', async () => {
      const pool = new ResourcePool(
        () => ({ value: 42 }),
        () => {}
      );

      const result = await pool.withResource(async (resource) => {
        return resource.value * 2;
      });

      expect(result).toBe(84);
      expect(pool.availableCount).toBe(1);
    });

    it('should release on error in withResource', async () => {
      const pool = new ResourcePool(
        () => ({}),
        () => {}
      );

      await expect(pool.withResource(async () => {
        throw new Error('boom');
      })).rejects.toThrow('boom');

      expect(pool.availableCount).toBe(1);
      expect(pool.inUseCount).toBe(0);
    });

    it('should dispose all resources', async () => {
      const destroy = vi.fn();
      const pool = new ResourcePool(
        () => ({}),
        destroy
      );

      const r1 = await pool.acquire();
      const r2 = await pool.acquire();
      pool.release(r1);
      pool.release(r2);

      await pool.dispose();

      expect(destroy).toHaveBeenCalledTimes(2);
      expect(pool.availableCount).toBe(0);
    });

    it('should throw on acquire after dispose', async () => {
      const pool = new ResourcePool(
        () => ({}),
        () => {}
      );

      await pool.dispose();

      await expect(pool.acquire()).rejects.toThrow('disposed');
    });

    it('should destroy released resources after dispose', async () => {
      const destroy = vi.fn();
      const pool = new ResourcePool(
        () => ({}),
        destroy
      );

      const resource = await pool.acquire();
      await pool.dispose();

      pool.release(resource);

      // Give time for async destroy
      await new Promise(r => setTimeout(r, 10));

      expect(destroy).toHaveBeenCalledWith(resource);
    });
  });
});
