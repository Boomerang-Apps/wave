/**
 * Promise Utilities (CQ-002)
 *
 * Provides Promise.race with proper cleanup to prevent dangling promises
 * and memory leaks from unresolved timers.
 *
 * Sources:
 * - https://developer.mozilla.org/en-US/docs/Web/API/AbortController
 * - https://nearform.com/insights/using-abortsignal-in-node-js/
 * - https://openjsf.org/blog/using-abortsignal-in-node-js
 */

/**
 * Race a promise against a timeout with proper cleanup
 *
 * Unlike basic Promise.race, this cleans up the timeout when the promise
 * resolves first, preventing dangling timers.
 *
 * @param {Promise} promise - The promise to race
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {Object} options - Configuration options
 * @param {boolean} options.returnResult - Return result object instead of throwing
 * @param {string} options.timeoutMessage - Custom timeout message
 * @returns {Promise} Resolves with promise result or rejects on timeout
 *
 * @example
 * try {
 *   const result = await raceWithTimeout(fetchData(), 5000);
 * } catch (err) {
 *   if (err.message.includes('timeout')) {
 *     console.log('Operation timed out');
 *   }
 * }
 */
export async function raceWithTimeout(promise, timeoutMs, options = {}) {
  const {
    returnResult = false,
    timeoutMessage = 'Operation timed out'
  } = options;

  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);

    // Clean up timeout since promise won
    clearTimeout(timeoutId);

    if (returnResult) {
      return { data: result, timedOut: false, error: null };
    }
    return result;
  } catch (error) {
    // Clean up timeout (might have been the one that rejected)
    clearTimeout(timeoutId);

    const isTimeout = error.message === timeoutMessage ||
                     error.message.toLowerCase().includes('timeout');

    if (returnResult && isTimeout) {
      return { data: null, timedOut: true, error };
    }
    throw error;
  }
}

/**
 * Race multiple promises with AbortController cleanup
 *
 * Provides AbortSignal to promise factories so they can clean up
 * when another promise wins the race.
 *
 * @param {Array<Promise|Function>} promisesOrFactories - Promises or functions that return promises
 * @returns {Promise} Resolves with the first promise result
 *
 * @example
 * const result = await raceWithCleanup([
 *   (signal) => fetchWithSignal('/api/data', { signal }),
 *   (signal) => new Promise((_, reject) => {
 *     setTimeout(() => reject(new Error('timeout')), 5000);
 *     signal.addEventListener('abort', () => clearTimeout(...));
 *   })
 * ]);
 */
export async function raceWithCleanup(promisesOrFactories) {
  if (!promisesOrFactories || promisesOrFactories.length === 0) {
    throw new Error('At least one promise is required');
  }

  const controller = new AbortController();
  const { signal } = controller;

  // Convert factories to promises, passing abort signal
  const promises = promisesOrFactories.map(item => {
    if (typeof item === 'function') {
      return item(signal);
    }
    return item;
  });

  try {
    const result = await Promise.race(promises);
    return result;
  } finally {
    // Abort any pending operations
    controller.abort();
  }
}

/**
 * Create a timeout promise that can be cleaned up
 *
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Error message on timeout
 * @returns {{ promise: Promise, cleanup: Function }} Promise and cleanup function
 */
export function createCleanableTimeout(ms, message = 'Timeout') {
  let timeoutId;

  const promise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { promise, cleanup };
}

export default {
  raceWithTimeout,
  raceWithCleanup,
  createCleanableTimeout
};
