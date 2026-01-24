/**
 * Async Mutex (CQ-007)
 *
 * Provides proper mutex lock mechanism for protecting critical sections
 * in asynchronous code. Prevents race conditions in shared resource access.
 *
 * Sources:
 * - https://en.wikipedia.org/wiki/Mutual_exclusion
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
 */

// ─────────────────────────────────────────────────────────────────────────────
// MUTEX IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Async Mutex - mutual exclusion lock for async operations
 *
 * @example
 * const mutex = new AsyncMutex();
 *
 * async function criticalSection() {
 *   const release = await mutex.acquire();
 *   try {
 *     // ... protected code
 *   } finally {
 *     release();
 *   }
 * }
 *
 * // Or using withLock helper:
 * await mutex.withLock(async () => {
 *   // ... protected code
 * });
 */
export class AsyncMutex {
  constructor() {
    this._locked = false;
    this._waitQueue = [];
  }

  /**
   * Check if mutex is currently locked
   * @returns {boolean}
   */
  get isLocked() {
    return this._locked;
  }

  /**
   * Get number of waiters in queue
   * @returns {number}
   */
  get waitingCount() {
    return this._waitQueue.length;
  }

  /**
   * Acquire the mutex lock
   * Returns a release function that must be called to release the lock
   *
   * @param {number} [timeout] - Optional timeout in milliseconds
   * @returns {Promise<Function>} Release function
   * @throws {Error} If timeout is exceeded
   *
   * @example
   * const release = await mutex.acquire();
   * try {
   *   // critical section
   * } finally {
   *   release();
   * }
   */
  acquire(timeout = null) {
    return new Promise((resolve, reject) => {
      // Create release function
      const release = () => {
        this._locked = false;

        // Process next waiter
        if (this._waitQueue.length > 0) {
          const next = this._waitQueue.shift();
          this._locked = true;
          next.resolve(next.release);
        }
      };

      // If not locked, acquire immediately
      if (!this._locked) {
        this._locked = true;
        return resolve(release);
      }

      // Create waiter entry
      const waiter = { resolve, reject, release };
      this._waitQueue.push(waiter);

      // Handle timeout
      if (timeout !== null && timeout > 0) {
        const timeoutId = setTimeout(() => {
          // Remove from queue
          const index = this._waitQueue.indexOf(waiter);
          if (index !== -1) {
            this._waitQueue.splice(index, 1);
            reject(new Error(`Mutex acquire timed out after ${timeout}ms`));
          }
        }, timeout);

        // Store timeout ID for cleanup
        waiter.timeoutId = timeoutId;

        // Wrap resolve to clear timeout
        const originalResolve = waiter.resolve;
        waiter.resolve = (release) => {
          clearTimeout(timeoutId);
          originalResolve(release);
        };
      }
    });
  }

  /**
   * Try to acquire the lock without waiting
   * Returns release function if acquired, null otherwise
   *
   * @returns {Function|null} Release function or null if lock unavailable
   *
   * @example
   * const release = mutex.tryAcquire();
   * if (release) {
   *   try {
   *     // critical section
   *   } finally {
   *     release();
   *   }
   * } else {
   *   console.log('Lock not available');
   * }
   */
  tryAcquire() {
    if (this._locked) {
      return null;
    }

    this._locked = true;

    const release = () => {
      this._locked = false;

      // Process next waiter
      if (this._waitQueue.length > 0) {
        const next = this._waitQueue.shift();
        this._locked = true;
        next.resolve(next.release);
      }
    };

    return release;
  }

  /**
   * Execute a function while holding the lock
   * Automatically acquires and releases the lock
   *
   * @param {Function} fn - Async function to execute
   * @param {number} [timeout] - Optional timeout for acquiring lock
   * @returns {Promise<*>} Result of fn
   *
   * @example
   * const result = await mutex.withLock(async () => {
   *   return await doSomethingAsync();
   * });
   */
  async withLock(fn, timeout = null) {
    const release = await this.acquire(timeout);
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /**
   * Cancel all waiting acquires
   * @param {Error} [error] - Error to reject waiters with
   */
  cancelAll(error = new Error('Mutex cancelled')) {
    while (this._waitQueue.length > 0) {
      const waiter = this._waitQueue.shift();
      if (waiter.timeoutId) {
        clearTimeout(waiter.timeoutId);
      }
      waiter.reject(error);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ-WRITE LOCK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read-Write Lock - allows multiple readers or single writer
 *
 * @example
 * const rwLock = new ReadWriteLock();
 *
 * // Multiple readers can read simultaneously
 * await rwLock.withReadLock(async () => {
 *   return await readData();
 * });
 *
 * // Writers get exclusive access
 * await rwLock.withWriteLock(async () => {
 *   await writeData();
 * });
 */
export class ReadWriteLock {
  constructor() {
    this._readers = 0;
    this._writerLocked = false;
    this._readQueue = [];
    this._writeQueue = [];
    this._writerWaiting = false;
  }

  /**
   * Get current reader count
   * @returns {number}
   */
  get readerCount() {
    return this._readers;
  }

  /**
   * Check if writer is active
   * @returns {boolean}
   */
  get isWriteLocked() {
    return this._writerLocked;
  }

  /**
   * Acquire read lock
   * @param {number} [timeout] - Optional timeout in milliseconds
   * @returns {Promise<Function>} Release function
   */
  acquireRead(timeout = null) {
    return new Promise((resolve, reject) => {
      const release = () => {
        this._readers--;

        // If no more readers and writer waiting, let writer proceed
        if (this._readers === 0 && this._writeQueue.length > 0) {
          const writer = this._writeQueue.shift();
          this._writerLocked = true;
          this._writerWaiting = this._writeQueue.length > 0;
          writer.resolve(writer.release);
        }
      };

      // Can acquire if no writer active and no writer waiting (writer priority)
      if (!this._writerLocked && !this._writerWaiting) {
        this._readers++;
        return resolve(release);
      }

      // Queue reader
      const waiter = { resolve, reject, release };
      this._readQueue.push(waiter);

      if (timeout !== null && timeout > 0) {
        const timeoutId = setTimeout(() => {
          const index = this._readQueue.indexOf(waiter);
          if (index !== -1) {
            this._readQueue.splice(index, 1);
            reject(new Error(`Read lock acquire timed out after ${timeout}ms`));
          }
        }, timeout);

        const originalResolve = waiter.resolve;
        waiter.resolve = (release) => {
          clearTimeout(timeoutId);
          originalResolve(release);
        };
      }
    });
  }

  /**
   * Acquire write lock
   * @param {number} [timeout] - Optional timeout in milliseconds
   * @returns {Promise<Function>} Release function
   */
  acquireWrite(timeout = null) {
    return new Promise((resolve, reject) => {
      const release = () => {
        this._writerLocked = false;

        // First check for waiting writers (writer priority)
        if (this._writeQueue.length > 0) {
          const writer = this._writeQueue.shift();
          this._writerLocked = true;
          this._writerWaiting = this._writeQueue.length > 0;
          return writer.resolve(writer.release);
        }

        // Then release waiting readers
        this._writerWaiting = false;
        while (this._readQueue.length > 0) {
          const reader = this._readQueue.shift();
          this._readers++;
          reader.resolve(reader.release);
        }
      };

      // Can acquire if no readers and no writer active
      if (this._readers === 0 && !this._writerLocked) {
        this._writerLocked = true;
        return resolve(release);
      }

      // Queue writer
      this._writerWaiting = true;
      const waiter = { resolve, reject, release };
      this._writeQueue.push(waiter);

      if (timeout !== null && timeout > 0) {
        const timeoutId = setTimeout(() => {
          const index = this._writeQueue.indexOf(waiter);
          if (index !== -1) {
            this._writeQueue.splice(index, 1);
            this._writerWaiting = this._writeQueue.length > 0;
            reject(new Error(`Write lock acquire timed out after ${timeout}ms`));
          }
        }, timeout);

        const originalResolve = waiter.resolve;
        waiter.resolve = (release) => {
          clearTimeout(timeoutId);
          originalResolve(release);
        };
      }
    });
  }

  /**
   * Execute a function while holding read lock
   * @param {Function} fn - Async function to execute
   * @param {number} [timeout] - Optional timeout
   * @returns {Promise<*>}
   */
  async withReadLock(fn, timeout = null) {
    const release = await this.acquireRead(timeout);
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /**
   * Execute a function while holding write lock
   * @param {Function} fn - Async function to execute
   * @param {number} [timeout] - Optional timeout
   * @returns {Promise<*>}
   */
  async withWriteLock(fn, timeout = null) {
    const release = await this.acquireWrite(timeout);
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEMAPHORE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semaphore - allows limited concurrent access
 *
 * @example
 * const semaphore = new Semaphore(3); // Allow 3 concurrent operations
 *
 * await semaphore.withPermit(async () => {
 *   await doLimitedConcurrencyOperation();
 * });
 */
export class Semaphore {
  /**
   * @param {number} permits - Maximum concurrent permits
   */
  constructor(permits) {
    if (!Number.isInteger(permits) || permits < 1) {
      throw new Error('Permits must be a positive integer');
    }
    this._maxPermits = permits;
    this._availablePermits = permits;
    this._waitQueue = [];
  }

  /**
   * Get number of available permits
   * @returns {number}
   */
  get availablePermits() {
    return this._availablePermits;
  }

  /**
   * Get number of waiters
   * @returns {number}
   */
  get waitingCount() {
    return this._waitQueue.length;
  }

  /**
   * Acquire a permit
   * @param {number} [timeout] - Optional timeout in milliseconds
   * @returns {Promise<Function>} Release function
   */
  acquire(timeout = null) {
    return new Promise((resolve, reject) => {
      const release = () => {
        this._availablePermits++;

        // Grant permit to next waiter
        if (this._waitQueue.length > 0) {
          const waiter = this._waitQueue.shift();
          this._availablePermits--;
          waiter.resolve(waiter.release);
        }
      };

      // If permits available, acquire immediately
      if (this._availablePermits > 0) {
        this._availablePermits--;
        return resolve(release);
      }

      // Queue waiter
      const waiter = { resolve, reject, release };
      this._waitQueue.push(waiter);

      if (timeout !== null && timeout > 0) {
        const timeoutId = setTimeout(() => {
          const index = this._waitQueue.indexOf(waiter);
          if (index !== -1) {
            this._waitQueue.splice(index, 1);
            reject(new Error(`Semaphore acquire timed out after ${timeout}ms`));
          }
        }, timeout);

        const originalResolve = waiter.resolve;
        waiter.resolve = (release) => {
          clearTimeout(timeoutId);
          originalResolve(release);
        };
      }
    });
  }

  /**
   * Try to acquire a permit without waiting
   * @returns {Function|null} Release function or null
   */
  tryAcquire() {
    if (this._availablePermits <= 0) {
      return null;
    }

    this._availablePermits--;

    return () => {
      this._availablePermits++;

      if (this._waitQueue.length > 0) {
        const waiter = this._waitQueue.shift();
        this._availablePermits--;
        waiter.resolve(waiter.release);
      }
    };
  }

  /**
   * Execute a function while holding a permit
   * @param {Function} fn - Async function to execute
   * @param {number} [timeout] - Optional timeout
   * @returns {Promise<*>}
   */
  async withPermit(fn, timeout = null) {
    const release = await this.acquire(timeout);
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYED MUTEX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keyed Mutex - separate mutex per key
 * Useful for per-resource locking (e.g., per-user, per-file)
 *
 * @example
 * const keyedMutex = new KeyedMutex();
 *
 * // Each user gets their own lock
 * await keyedMutex.withLock(userId, async () => {
 *   await updateUserBalance(userId);
 * });
 */
export class KeyedMutex {
  constructor() {
    this._mutexes = new Map();
  }

  /**
   * Get number of active keys
   * @returns {number}
   */
  get keyCount() {
    return this._mutexes.size;
  }

  /**
   * Get or create mutex for a key
   * @private
   */
  _getMutex(key) {
    let mutex = this._mutexes.get(key);
    if (!mutex) {
      mutex = new AsyncMutex();
      this._mutexes.set(key, mutex);
    }
    return mutex;
  }

  /**
   * Acquire lock for a key
   * @param {string} key - Key to lock
   * @param {number} [timeout] - Optional timeout
   * @returns {Promise<Function>} Release function
   */
  async acquire(key, timeout = null) {
    const mutex = this._getMutex(key);
    const release = await mutex.acquire(timeout);

    // Cleanup when released and no waiters
    return () => {
      release();
      if (!mutex.isLocked && mutex.waitingCount === 0) {
        this._mutexes.delete(key);
      }
    };
  }

  /**
   * Execute a function while holding lock for key
   * @param {string} key - Key to lock
   * @param {Function} fn - Async function to execute
   * @param {number} [timeout] - Optional timeout
   * @returns {Promise<*>}
   */
  async withLock(key, fn, timeout = null) {
    const release = await this.acquire(key, timeout);
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /**
   * Check if a key is locked
   * @param {string} key
   * @returns {boolean}
   */
  isLocked(key) {
    const mutex = this._mutexes.get(key);
    return mutex ? mutex.isLocked : false;
  }
}

export default {
  AsyncMutex,
  ReadWriteLock,
  Semaphore,
  KeyedMutex
};
