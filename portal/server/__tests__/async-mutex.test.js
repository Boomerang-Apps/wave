/**
 * Async Mutex Tests (CQ-007)
 *
 * TDD tests for async mutex and synchronization primitives.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  AsyncMutex,
  ReadWriteLock,
  Semaphore,
  KeyedMutex
} from '../utils/async-mutex.js';

describe('Async Mutex (CQ-007)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // AsyncMutex
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AsyncMutex', () => {
    it('should acquire lock immediately when unlocked', async () => {
      const mutex = new AsyncMutex();

      const release = await mutex.acquire();

      expect(mutex.isLocked).toBe(true);
      expect(typeof release).toBe('function');

      release();
    });

    it('should release lock', async () => {
      const mutex = new AsyncMutex();

      const release = await mutex.acquire();
      expect(mutex.isLocked).toBe(true);

      release();
      expect(mutex.isLocked).toBe(false);
    });

    it('should queue waiters when locked', async () => {
      const mutex = new AsyncMutex();
      const order = [];

      const release1 = await mutex.acquire();
      order.push('first acquired');

      // This will wait
      const waitPromise = mutex.acquire().then(release => {
        order.push('second acquired');
        release();
      });

      expect(mutex.waitingCount).toBe(1);

      // Release first lock
      release1();
      order.push('first released');

      await waitPromise;

      expect(order).toEqual([
        'first acquired',
        'first released',
        'second acquired'
      ]);
    });

    it('should process waiters in FIFO order', async () => {
      const mutex = new AsyncMutex();
      const order = [];

      const release1 = await mutex.acquire();

      const wait2 = mutex.acquire().then(release => {
        order.push('second');
        release();
      });

      const wait3 = mutex.acquire().then(release => {
        order.push('third');
        release();
      });

      release1();

      await Promise.all([wait2, wait3]);

      expect(order).toEqual(['second', 'third']);
    });

    it('should timeout when waiting too long', async () => {
      const mutex = new AsyncMutex();

      // Hold the lock
      await mutex.acquire();

      // Try to acquire with short timeout
      await expect(mutex.acquire(50)).rejects.toThrow('timed out');
    });

    it('should cancel all waiters', async () => {
      const mutex = new AsyncMutex();

      await mutex.acquire();

      const wait1 = mutex.acquire();
      const wait2 = mutex.acquire();

      expect(mutex.waitingCount).toBe(2);

      mutex.cancelAll(new Error('Cancelled'));

      await expect(wait1).rejects.toThrow('Cancelled');
      await expect(wait2).rejects.toThrow('Cancelled');
      expect(mutex.waitingCount).toBe(0);
    });

    it('should tryAcquire when unlocked', () => {
      const mutex = new AsyncMutex();

      const release = mutex.tryAcquire();

      expect(release).not.toBeNull();
      expect(mutex.isLocked).toBe(true);

      release();
    });

    it('should return null from tryAcquire when locked', async () => {
      const mutex = new AsyncMutex();

      await mutex.acquire();
      const result = mutex.tryAcquire();

      expect(result).toBeNull();
    });

    it('should execute function with withLock', async () => {
      const mutex = new AsyncMutex();

      const result = await mutex.withLock(async () => {
        expect(mutex.isLocked).toBe(true);
        return 'result';
      });

      expect(result).toBe('result');
      expect(mutex.isLocked).toBe(false);
    });

    it('should release lock even on error in withLock', async () => {
      const mutex = new AsyncMutex();

      await expect(mutex.withLock(async () => {
        throw new Error('Test error');
      })).rejects.toThrow('Test error');

      expect(mutex.isLocked).toBe(false);
    });

    it('should handle concurrent withLock calls', async () => {
      const mutex = new AsyncMutex();
      const results = [];

      await Promise.all([
        mutex.withLock(async () => {
          await new Promise(r => setTimeout(r, 10));
          results.push('first');
        }),
        mutex.withLock(async () => {
          results.push('second');
        })
      ]);

      expect(results).toEqual(['first', 'second']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ReadWriteLock
  // ─────────────────────────────────────────────────────────────────────────────

  describe('ReadWriteLock', () => {
    it('should allow multiple concurrent readers', async () => {
      const rwLock = new ReadWriteLock();

      const release1 = await rwLock.acquireRead();
      const release2 = await rwLock.acquireRead();
      const release3 = await rwLock.acquireRead();

      expect(rwLock.readerCount).toBe(3);

      release1();
      release2();
      release3();

      expect(rwLock.readerCount).toBe(0);
    });

    it('should block readers when writer holds lock', async () => {
      const rwLock = new ReadWriteLock();
      const order = [];

      const releaseWrite = await rwLock.acquireWrite();
      order.push('write acquired');

      // This should wait
      const readPromise = rwLock.acquireRead().then(release => {
        order.push('read acquired');
        release();
      });

      await new Promise(r => setTimeout(r, 10));
      expect(order).toEqual(['write acquired']);

      releaseWrite();
      await readPromise;

      expect(order).toEqual(['write acquired', 'read acquired']);
    });

    it('should block writer when readers hold lock', async () => {
      const rwLock = new ReadWriteLock();
      const order = [];

      const releaseRead = await rwLock.acquireRead();
      order.push('read acquired');

      // This should wait
      const writePromise = rwLock.acquireWrite().then(release => {
        order.push('write acquired');
        release();
      });

      await new Promise(r => setTimeout(r, 10));
      expect(order).toEqual(['read acquired']);

      releaseRead();
      await writePromise;

      expect(order).toEqual(['read acquired', 'write acquired']);
    });

    it('should give writer priority over new readers', async () => {
      const rwLock = new ReadWriteLock();
      const order = [];

      const releaseRead1 = await rwLock.acquireRead();

      // Writer starts waiting
      const writePromise = rwLock.acquireWrite().then(release => {
        order.push('write');
        release();
      });

      // New reader should wait for writer
      const readPromise = rwLock.acquireRead().then(release => {
        order.push('read2');
        release();
      });

      releaseRead1();

      await Promise.all([writePromise, readPromise]);

      expect(order).toEqual(['write', 'read2']);
    });

    it('should execute withReadLock', async () => {
      const rwLock = new ReadWriteLock();

      const result = await rwLock.withReadLock(async () => {
        expect(rwLock.readerCount).toBe(1);
        return 'read result';
      });

      expect(result).toBe('read result');
      expect(rwLock.readerCount).toBe(0);
    });

    it('should execute withWriteLock', async () => {
      const rwLock = new ReadWriteLock();

      const result = await rwLock.withWriteLock(async () => {
        expect(rwLock.isWriteLocked).toBe(true);
        return 'write result';
      });

      expect(result).toBe('write result');
      expect(rwLock.isWriteLocked).toBe(false);
    });

    it('should timeout on read lock', async () => {
      const rwLock = new ReadWriteLock();

      await rwLock.acquireWrite();

      await expect(rwLock.acquireRead(50)).rejects.toThrow('timed out');
    });

    it('should timeout on write lock', async () => {
      const rwLock = new ReadWriteLock();

      await rwLock.acquireRead();

      await expect(rwLock.acquireWrite(50)).rejects.toThrow('timed out');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Semaphore
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Semaphore', () => {
    it('should throw for invalid permits', () => {
      expect(() => new Semaphore(0)).toThrow('positive integer');
      expect(() => new Semaphore(-1)).toThrow('positive integer');
      expect(() => new Semaphore(1.5)).toThrow('positive integer');
    });

    it('should allow up to max permits', async () => {
      const semaphore = new Semaphore(3);

      const r1 = await semaphore.acquire();
      const r2 = await semaphore.acquire();
      const r3 = await semaphore.acquire();

      expect(semaphore.availablePermits).toBe(0);

      r1();
      r2();
      r3();

      expect(semaphore.availablePermits).toBe(3);
    });

    it('should queue when permits exhausted', async () => {
      const semaphore = new Semaphore(2);
      const order = [];

      const r1 = await semaphore.acquire();
      const r2 = await semaphore.acquire();

      expect(semaphore.availablePermits).toBe(0);

      const waitPromise = semaphore.acquire().then(release => {
        order.push('acquired');
        release();
      });

      expect(semaphore.waitingCount).toBe(1);

      r1();
      await waitPromise;

      expect(order).toEqual(['acquired']);
      r2();
    });

    it('should tryAcquire when permits available', () => {
      const semaphore = new Semaphore(2);

      const r1 = semaphore.tryAcquire();
      const r2 = semaphore.tryAcquire();
      const r3 = semaphore.tryAcquire();

      expect(r1).not.toBeNull();
      expect(r2).not.toBeNull();
      expect(r3).toBeNull();

      r1();
      r2();
    });

    it('should timeout when waiting for permit', async () => {
      const semaphore = new Semaphore(1);

      await semaphore.acquire();

      await expect(semaphore.acquire(50)).rejects.toThrow('timed out');
    });

    it('should execute withPermit', async () => {
      const semaphore = new Semaphore(2);

      const result = await semaphore.withPermit(async () => {
        expect(semaphore.availablePermits).toBe(1);
        return 'result';
      });

      expect(result).toBe('result');
      expect(semaphore.availablePermits).toBe(2);
    });

    it('should limit concurrency', async () => {
      const semaphore = new Semaphore(2);
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const tasks = Array.from({ length: 5 }, () =>
        semaphore.withPermit(async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise(r => setTimeout(r, 20));
          currentConcurrent--;
        })
      );

      await Promise.all(tasks);

      expect(maxConcurrent).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // KeyedMutex
  // ─────────────────────────────────────────────────────────────────────────────

  describe('KeyedMutex', () => {
    it('should create separate mutexes per key', async () => {
      const keyedMutex = new KeyedMutex();

      const release1 = await keyedMutex.acquire('key1');
      const release2 = await keyedMutex.acquire('key2');

      expect(keyedMutex.isLocked('key1')).toBe(true);
      expect(keyedMutex.isLocked('key2')).toBe(true);
      expect(keyedMutex.keyCount).toBe(2);

      release1();
      release2();
    });

    it('should queue for same key', async () => {
      const keyedMutex = new KeyedMutex();
      const order = [];

      const release1 = await keyedMutex.acquire('key1');
      order.push('first');

      const wait2 = keyedMutex.acquire('key1').then(release => {
        order.push('second');
        release();
      });

      release1();
      await wait2;

      expect(order).toEqual(['first', 'second']);
    });

    it('should not block different keys', async () => {
      const keyedMutex = new KeyedMutex();
      const order = [];

      await keyedMutex.acquire('key1');

      // Different key should not wait
      const release2 = await keyedMutex.acquire('key2');
      order.push('key2 acquired');

      release2();

      expect(order).toEqual(['key2 acquired']);
    });

    it('should cleanup unused keys', async () => {
      const keyedMutex = new KeyedMutex();

      const release = await keyedMutex.acquire('temp-key');
      expect(keyedMutex.keyCount).toBe(1);

      release();
      expect(keyedMutex.keyCount).toBe(0);
    });

    it('should execute withLock', async () => {
      const keyedMutex = new KeyedMutex();

      const result = await keyedMutex.withLock('mykey', async () => {
        expect(keyedMutex.isLocked('mykey')).toBe(true);
        return 'done';
      });

      expect(result).toBe('done');
      expect(keyedMutex.isLocked('mykey')).toBe(false);
    });

    it('should timeout for specific key', async () => {
      const keyedMutex = new KeyedMutex();

      await keyedMutex.acquire('blocked');

      await expect(keyedMutex.acquire('blocked', 50)).rejects.toThrow('timed out');
    });

    it('should handle concurrent operations on different keys', async () => {
      const keyedMutex = new KeyedMutex();
      const results = [];

      await Promise.all([
        keyedMutex.withLock('user1', async () => {
          await new Promise(r => setTimeout(r, 20));
          results.push('user1');
        }),
        keyedMutex.withLock('user2', async () => {
          await new Promise(r => setTimeout(r, 10));
          results.push('user2');
        })
      ]);

      // user2 should finish first (shorter delay)
      expect(results).toEqual(['user2', 'user1']);
    });
  });
});
