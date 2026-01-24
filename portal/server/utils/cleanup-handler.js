/**
 * Cleanup Handler (CQ-012)
 *
 * Provides utilities for ensuring callbacks, timers, and other cleanup
 * functions are always executed in finally blocks.
 *
 * Sources:
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch#the_finally_block
 */

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP STACK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CleanupStack - manages multiple cleanup callbacks
 * Ensures all cleanups run even if one throws
 *
 * @example
 * const cleanup = new CleanupStack();
 *
 * const timer = setTimeout(() => {}, 1000);
 * cleanup.push(() => clearTimeout(timer));
 *
 * const listener = () => {};
 * emitter.on('event', listener);
 * cleanup.push(() => emitter.off('event', listener));
 *
 * try {
 *   // ... operations
 * } finally {
 *   await cleanup.runAll();
 * }
 */
export class CleanupStack {
  constructor() {
    this._cleanups = [];
  }

  /**
   * Get number of registered cleanups
   * @returns {number}
   */
  get size() {
    return this._cleanups.length;
  }

  /**
   * Add a cleanup callback
   * @param {Function} fn - Cleanup function (can be async)
   * @returns {Function} The same function for chaining
   */
  push(fn) {
    if (typeof fn !== 'function') {
      throw new Error('Cleanup must be a function');
    }
    this._cleanups.push(fn);
    return fn;
  }

  /**
   * Add a cleanup callback (alias for push)
   * @param {Function} fn - Cleanup function
   * @returns {Function}
   */
  add(fn) {
    return this.push(fn);
  }

  /**
   * Remove a specific cleanup callback
   * @param {Function} fn - Cleanup function to remove
   * @returns {boolean} True if found and removed
   */
  remove(fn) {
    const index = this._cleanups.indexOf(fn);
    if (index !== -1) {
      this._cleanups.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Run all cleanup callbacks (LIFO order)
   * Continues even if individual cleanups throw
   * @returns {Promise<{ errors: Error[] }>}
   */
  async runAll() {
    const errors = [];

    // Run in reverse order (LIFO)
    while (this._cleanups.length > 0) {
      const fn = this._cleanups.pop();
      try {
        await fn();
      } catch (error) {
        errors.push(error);
      }
    }

    return { errors };
  }

  /**
   * Run all cleanup callbacks synchronously (LIFO order)
   * @returns {{ errors: Error[] }}
   */
  runAllSync() {
    const errors = [];

    while (this._cleanups.length > 0) {
      const fn = this._cleanups.pop();
      try {
        fn();
      } catch (error) {
        errors.push(error);
      }
    }

    return { errors };
  }

  /**
   * Clear all registered cleanups without running them
   */
  clear() {
    this._cleanups = [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPOSABLE PATTERN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a disposable resource with automatic cleanup
 *
 * @param {Function} setup - Setup function that returns { resource, dispose }
 * @returns {Promise<{ resource: *, dispose: Function }>}
 *
 * @example
 * const { resource: connection, dispose } = await createDisposable(async () => {
 *   const conn = await db.connect();
 *   return {
 *     resource: conn,
 *     dispose: () => conn.close()
 *   };
 * });
 *
 * try {
 *   await connection.query('SELECT 1');
 * } finally {
 *   await dispose();
 * }
 */
export async function createDisposable(setup) {
  const result = await setup();

  if (!result || typeof result.dispose !== 'function') {
    throw new Error('Setup must return { resource, dispose }');
  }

  let disposed = false;

  const dispose = async () => {
    if (disposed) return;
    disposed = true;
    await result.dispose();
  };

  return {
    resource: result.resource,
    dispose
  };
}

/**
 * Execute a function with automatic disposal
 *
 * @param {Function} setup - Setup function returning { resource, dispose }
 * @param {Function} fn - Function to execute with resource
 * @returns {Promise<*>} Result of fn
 *
 * @example
 * const result = await withDisposable(
 *   async () => ({
 *     resource: await db.connect(),
 *     dispose: (conn) => conn.close()
 *   }),
 *   async (connection) => {
 *     return await connection.query('SELECT 1');
 *   }
 * );
 */
export async function withDisposable(setup, fn) {
  const result = await setup();

  if (!result || typeof result.dispose !== 'function') {
    throw new Error('Setup must return { resource, dispose }');
  }

  try {
    return await fn(result.resource);
  } finally {
    await result.dispose(result.resource);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a managed timer that can be easily cleaned up
 *
 * @param {Function} callback - Timer callback
 * @param {number} delay - Delay in milliseconds
 * @param {Object} [options] - Options
 * @param {boolean} [options.interval=false] - Use setInterval instead of setTimeout
 * @returns {{ id: number, clear: Function }}
 *
 * @example
 * const cleanup = new CleanupStack();
 *
 * const timer = managedTimeout(() => console.log('tick'), 1000);
 * cleanup.push(timer.clear);
 */
export function managedTimeout(callback, delay, options = {}) {
  const isInterval = options.interval === true;

  const id = isInterval
    ? setInterval(callback, delay)
    : setTimeout(callback, delay);

  return {
    id,
    clear: () => {
      if (isInterval) {
        clearInterval(id);
      } else {
        clearTimeout(id);
      }
    }
  };
}

/**
 * Create a managed interval
 *
 * @param {Function} callback - Interval callback
 * @param {number} delay - Interval delay in milliseconds
 * @returns {{ id: number, clear: Function }}
 */
export function managedInterval(callback, delay) {
  return managedTimeout(callback, delay, { interval: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT LISTENER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add an event listener with automatic cleanup support
 *
 * @param {EventTarget|EventEmitter} target - Event target
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} [options] - addEventListener options
 * @returns {{ remove: Function }}
 *
 * @example
 * const cleanup = new CleanupStack();
 *
 * const listener = managedListener(window, 'resize', handleResize);
 * cleanup.push(listener.remove);
 */
export function managedListener(target, event, handler, options = {}) {
  // Handle both DOM EventTarget and Node.js EventEmitter
  if (typeof target.addEventListener === 'function') {
    target.addEventListener(event, handler, options);
  } else if (typeof target.on === 'function') {
    target.on(event, handler);
  } else {
    throw new Error('Target must be an EventTarget or EventEmitter');
  }

  return {
    remove: () => {
      if (typeof target.removeEventListener === 'function') {
        target.removeEventListener(event, handler, options);
      } else if (typeof target.off === 'function') {
        target.off(event, handler);
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ASYNC OPERATION TRACKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Track an async operation with cancellation support
 *
 * @param {Function} operation - Async operation that receives AbortSignal
 * @returns {{ promise: Promise, cancel: Function }}
 *
 * @example
 * const cleanup = new CleanupStack();
 *
 * const { promise, cancel } = trackAsync(async (signal) => {
 *   const response = await fetch(url, { signal });
 *   return response.json();
 * });
 * cleanup.push(cancel);
 *
 * try {
 *   const result = await promise;
 * } finally {
 *   await cleanup.runAll();
 * }
 */
export function trackAsync(operation) {
  const controller = new AbortController();
  let cancelled = false;

  const promise = operation(controller.signal).catch(error => {
    if (cancelled && error.name === 'AbortError') {
      return undefined;
    }
    throw error;
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      controller.abort();
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE GUARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a function with guaranteed cleanup
 * Similar to RAII in C++ or using statement in C#
 *
 * @param {Function} fn - Function to execute
 * @param {Function} cleanup - Cleanup function to run after
 * @returns {Promise<*>} Result of fn
 *
 * @example
 * await withCleanup(
 *   async () => {
 *     await doSomething();
 *   },
 *   async () => {
 *     await releaseResources();
 *   }
 * );
 */
export async function withCleanup(fn, cleanup) {
  try {
    return await fn();
  } finally {
    await cleanup();
  }
}

/**
 * Run a synchronous function with guaranteed cleanup
 *
 * @param {Function} fn - Function to execute
 * @param {Function} cleanup - Cleanup function to run after
 * @returns {*} Result of fn
 */
export function withCleanupSync(fn, cleanup) {
  try {
    return fn();
  } finally {
    cleanup();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE POOL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple resource pool with automatic cleanup
 *
 * @example
 * const pool = new ResourcePool(
 *   () => createConnection(),  // create
 *   (conn) => conn.close()     // destroy
 * );
 *
 * const conn = await pool.acquire();
 * try {
 *   await conn.query('SELECT 1');
 * } finally {
 *   pool.release(conn);
 * }
 *
 * // Clean up all resources
 * await pool.dispose();
 */
export class ResourcePool {
  /**
   * @param {Function} create - Factory function to create resources
   * @param {Function} destroy - Function to destroy resources
   * @param {Object} [options] - Pool options
   * @param {number} [options.maxSize=10] - Maximum pool size
   */
  constructor(create, destroy, options = {}) {
    if (typeof create !== 'function' || typeof destroy !== 'function') {
      throw new Error('Create and destroy must be functions');
    }

    this._create = create;
    this._destroy = destroy;
    this._maxSize = options.maxSize || 10;
    this._available = [];
    this._inUse = new Set();
    this._disposed = false;
  }

  /**
   * Get number of available resources
   * @returns {number}
   */
  get availableCount() {
    return this._available.length;
  }

  /**
   * Get number of resources in use
   * @returns {number}
   */
  get inUseCount() {
    return this._inUse.size;
  }

  /**
   * Get total resource count
   * @returns {number}
   */
  get size() {
    return this._available.length + this._inUse.size;
  }

  /**
   * Acquire a resource from the pool
   * @returns {Promise<*>} Resource
   */
  async acquire() {
    if (this._disposed) {
      throw new Error('Pool has been disposed');
    }

    let resource;

    if (this._available.length > 0) {
      resource = this._available.pop();
    } else {
      resource = await this._create();
    }

    this._inUse.add(resource);
    return resource;
  }

  /**
   * Release a resource back to the pool
   * @param {*} resource - Resource to release
   */
  release(resource) {
    if (!this._inUse.has(resource)) {
      return;
    }

    this._inUse.delete(resource);

    if (this._disposed) {
      // Pool disposed, destroy the resource
      Promise.resolve(this._destroy(resource)).catch(() => {});
      return;
    }

    if (this._available.length < this._maxSize) {
      this._available.push(resource);
    } else {
      // Pool full, destroy excess
      Promise.resolve(this._destroy(resource)).catch(() => {});
    }
  }

  /**
   * Execute a function with an acquired resource
   * @param {Function} fn - Function to execute
   * @returns {Promise<*>}
   */
  async withResource(fn) {
    const resource = await this.acquire();
    try {
      return await fn(resource);
    } finally {
      this.release(resource);
    }
  }

  /**
   * Dispose of all resources
   * @returns {Promise<{ errors: Error[] }>}
   */
  async dispose() {
    this._disposed = true;
    const errors = [];

    // Destroy available resources
    while (this._available.length > 0) {
      const resource = this._available.pop();
      try {
        await this._destroy(resource);
      } catch (error) {
        errors.push(error);
      }
    }

    // Note: In-use resources will be destroyed when released

    return { errors };
  }
}

export default {
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
};
