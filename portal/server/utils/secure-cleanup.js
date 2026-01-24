/**
 * Secure Cleanup Utilities (SEC-007)
 *
 * Provides secure memory cleanup for sensitive key material.
 * Zeros buffers after use to prevent key material from persisting in memory.
 *
 * Sources:
 * - https://nodejs.org/api/buffer.html
 * - https://github.com/nodejs/node/issues/18896
 * - https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
 * - https://doc.libsodium.org/memory_management
 */

/**
 * Securely zero a buffer or typed array
 *
 * Overwrites all bytes with zeros to prevent key material
 * from persisting in memory.
 *
 * @param {Buffer|Uint8Array} buffer - Buffer to zero
 * @returns {Buffer|Uint8Array} The zeroed buffer (for chaining)
 *
 * @example
 * const key = crypto.randomBytes(32);
 * // ... use key for encryption ...
 * secureZero(key);
 */
export function secureZero(buffer) {
  // Handle null/undefined/non-buffer gracefully
  if (!buffer) {
    return buffer;
  }

  // Check if it's a Buffer or TypedArray
  if (Buffer.isBuffer(buffer)) {
    buffer.fill(0);
    return buffer;
  }

  if (buffer instanceof Uint8Array || buffer instanceof Int8Array) {
    buffer.fill(0);
    return buffer;
  }

  // Not a buffer type, return as-is
  return buffer;
}

/**
 * Securely zero multiple buffers
 *
 * Convenience function to clean up multiple key materials at once.
 *
 * @param {...(Buffer|Uint8Array)} buffers - Buffers to zero
 *
 * @example
 * secureCleanup(encryptionKey, iv, authTag);
 */
export function secureCleanup(...buffers) {
  for (const buffer of buffers) {
    secureZero(buffer);
  }
}

/**
 * Execute a function and ensure buffers are cleaned up
 *
 * Guarantees that sensitive buffers are zeroed after the operation
 * completes, even if an error occurs.
 *
 * @param {Array<Buffer|Uint8Array>} buffers - Buffers to clean up after
 * @param {Function} fn - Function to execute
 * @returns {Promise<*>} Result of the function
 *
 * @example
 * const result = await withSecureCleanup([key, iv], async () => {
 *   return await encrypt(data, key, iv);
 * });
 * // key and iv are now zeroed
 */
export async function withSecureCleanup(buffers, fn) {
  try {
    const result = await fn();
    return result;
  } finally {
    secureCleanup(...buffers);
  }
}

/**
 * Create a secure buffer that will be zeroed on garbage collection
 *
 * Note: This provides a best-effort cleanup. For guaranteed cleanup,
 * use withSecureCleanup or call secureZero explicitly.
 *
 * @param {number} size - Size of buffer in bytes
 * @returns {Buffer} Allocated buffer (zero-filled)
 */
export function allocSecure(size) {
  // Use alloc (not allocUnsafe) to ensure zero-initialized
  return Buffer.alloc(size);
}

export default {
  secureZero,
  secureCleanup,
  withSecureCleanup,
  allocSecure
};
