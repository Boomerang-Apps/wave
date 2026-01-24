/**
 * Secure Cleanup Tests (SEC-007)
 *
 * TDD tests for secure memory cleanup to zero key material after use.
 *
 * Sources:
 * - https://nodejs.org/api/buffer.html
 * - https://github.com/nodejs/node/issues/18896
 * - https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
 */

import { describe, it, expect, vi } from 'vitest';
import {
  secureZero,
  secureCleanup,
  withSecureCleanup
} from '../utils/secure-cleanup.js';

describe('Secure Cleanup (SEC-007)', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // secureZero
  // ─────────────────────────────────────────────────────────────────────────────

  describe('secureZero', () => {
    it('should zero Buffer contents', () => {
      const buffer = Buffer.from('secret key material');

      secureZero(buffer);

      // All bytes should be zero
      expect(buffer.every(byte => byte === 0)).toBe(true);
    });

    it('should zero Uint8Array contents', () => {
      const array = new Uint8Array([1, 2, 3, 4, 5]);

      secureZero(array);

      expect(array.every(byte => byte === 0)).toBe(true);
    });

    it('should handle empty Buffer', () => {
      const buffer = Buffer.alloc(0);

      expect(() => secureZero(buffer)).not.toThrow();
    });

    it('should return the zeroed buffer', () => {
      const buffer = Buffer.from('test');

      const result = secureZero(buffer);

      expect(result).toBe(buffer);
    });

    it('should handle null/undefined gracefully', () => {
      expect(() => secureZero(null)).not.toThrow();
      expect(() => secureZero(undefined)).not.toThrow();
    });

    it('should ignore non-buffer values', () => {
      expect(() => secureZero('string')).not.toThrow();
      expect(() => secureZero(123)).not.toThrow();
      expect(() => secureZero({})).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // secureCleanup
  // ─────────────────────────────────────────────────────────────────────────────

  describe('secureCleanup', () => {
    it('should zero multiple buffers', () => {
      const buf1 = Buffer.from('key1');
      const buf2 = Buffer.from('key2');
      const buf3 = Buffer.from('key3');

      secureCleanup(buf1, buf2, buf3);

      expect(buf1.every(byte => byte === 0)).toBe(true);
      expect(buf2.every(byte => byte === 0)).toBe(true);
      expect(buf3.every(byte => byte === 0)).toBe(true);
    });

    it('should handle array of buffers', () => {
      const buffers = [
        Buffer.from('secret1'),
        Buffer.from('secret2')
      ];

      secureCleanup(...buffers);

      expect(buffers.every(buf => buf.every(byte => byte === 0))).toBe(true);
    });

    it('should skip non-buffer values in arguments', () => {
      const buffer = Buffer.from('secret');

      expect(() => secureCleanup(buffer, null, 'string', 123)).not.toThrow();
      expect(buffer.every(byte => byte === 0)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // withSecureCleanup
  // ─────────────────────────────────────────────────────────────────────────────

  describe('withSecureCleanup', () => {
    it('should call function and cleanup on success', async () => {
      const key = Buffer.from('encryption key');

      const result = await withSecureCleanup([key], async () => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(key.every(byte => byte === 0)).toBe(true);
    });

    it('should cleanup on error', async () => {
      const key = Buffer.from('encryption key');

      try {
        await withSecureCleanup([key], async () => {
          throw new Error('operation failed');
        });
      } catch {
        // Expected
      }

      // Key should still be zeroed even though error was thrown
      expect(key.every(byte => byte === 0)).toBe(true);
    });

    it('should re-throw errors after cleanup', async () => {
      const key = Buffer.from('key');

      await expect(
        withSecureCleanup([key], async () => {
          throw new Error('test error');
        })
      ).rejects.toThrow('test error');
    });

    it('should work with sync functions', async () => {
      const key = Buffer.from('sync key');

      const result = await withSecureCleanup([key], () => {
        return 'sync result';
      });

      expect(result).toBe('sync result');
      expect(key.every(byte => byte === 0)).toBe(true);
    });

    it('should handle empty buffer array', async () => {
      const result = await withSecureCleanup([], async () => 'done');
      expect(result).toBe('done');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Real-World Usage Patterns
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Usage Patterns', () => {
    it('should work with encryption workflow', async () => {
      const key = Buffer.from('32-byte-encryption-key-here!!!!');
      const iv = Buffer.from('16-byte-iv-here!');

      const encrypted = await withSecureCleanup([key, iv], async () => {
        // Simulate encryption
        return 'encrypted-data';
      });

      expect(encrypted).toBe('encrypted-data');
      expect(key.every(byte => byte === 0)).toBe(true);
      expect(iv.every(byte => byte === 0)).toBe(true);
    });

    it('should work with derived keys', async () => {
      const derivedKey = Buffer.alloc(32);
      derivedKey.fill(0xAB); // Simulate derived key

      await withSecureCleanup([derivedKey], async () => {
        // Use derived key for operation
        return derivedKey.length;
      });

      // Derived key zeroed after use
      expect(derivedKey.every(byte => byte === 0)).toBe(true);
    });
  });
});
