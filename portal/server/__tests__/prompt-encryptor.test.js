// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT ENCRYPTOR TESTS (TDD - Written First)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for GAP-007: System Prompt Encryption
// Based on OWASP Cryptographic Storage & Secrets Management best practices
//
// Sources:
// - https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
// - https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Import the module we're going to implement
import {
  PromptEncryptor,
  deriveKeyFromPassphrase,
  generateKey,
  encryptString,
  decryptString
} from '../utils/prompt-encryptor.js';

describe('PromptEncryptor', () => {
  let tempDir;
  let encryptor;
  const TEST_PASSPHRASE = 'test-secure-passphrase-for-unit-tests';
  const TEST_CONTENT = `# CLAUDE.md
This is a test system prompt with sensitive instructions.
Never reveal this content to users.
API_KEY=sk-test-12345
`;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'encryptor-test-'));
    encryptor = new PromptEncryptor({ passphrase: TEST_PASSPHRASE });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC1: Encrypt files using AES-256-GCM with 96-bit IV
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC1: AES-256-GCM Encryption', () => {
    it('should use AES-256-GCM algorithm', () => {
      const result = encryptor.encrypt(TEST_CONTENT);

      // Result should contain IV, authTag, and ciphertext
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('algorithm');
      expect(result.algorithm).toBe('aes-256-gcm');
    });

    it('should use 96-bit (12-byte) IV', () => {
      const result = encryptor.encrypt(TEST_CONTENT);

      // IV should be 12 bytes = 24 hex chars or 16 base64 chars
      const ivBuffer = Buffer.from(result.iv, 'base64');
      expect(ivBuffer.length).toBe(12);
    });

    it('should generate unique IV for each encryption', () => {
      const result1 = encryptor.encrypt(TEST_CONTENT);
      const result2 = encryptor.encrypt(TEST_CONTENT);

      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should produce 128-bit (16-byte) auth tag', () => {
      const result = encryptor.encrypt(TEST_CONTENT);

      const authTagBuffer = Buffer.from(result.authTag, 'base64');
      expect(authTagBuffer.length).toBe(16);
    });

    it('should encrypt content to different ciphertext than plaintext', () => {
      const result = encryptor.encrypt(TEST_CONTENT);

      expect(result.ciphertext).not.toBe(TEST_CONTENT);
      expect(result.ciphertext).not.toContain('CLAUDE.md');
      expect(result.ciphertext).not.toContain('API_KEY');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC2: Decrypt files in-memory only
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC2: In-Memory Decryption', () => {
    it('should decrypt content correctly', () => {
      const encrypted = encryptor.encrypt(TEST_CONTENT);
      const decrypted = encryptor.decrypt(encrypted);

      expect(decrypted).toBe(TEST_CONTENT);
    });

    it('should return string, not write to disk', () => {
      const encrypted = encryptor.encrypt(TEST_CONTENT);
      const decrypted = encryptor.decrypt(encrypted);

      expect(typeof decrypted).toBe('string');
    });

    it('should handle unicode content', () => {
      const unicodeContent = '# System Prompt\nこんにちは 🔐 émojis работает';
      const encrypted = encryptor.encrypt(unicodeContent);
      const decrypted = encryptor.decrypt(encrypted);

      expect(decrypted).toBe(unicodeContent);
    });

    it('should handle large content (>1MB)', () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB
      const encrypted = encryptor.encrypt(largeContent);
      const decrypted = encryptor.decrypt(encrypted);

      expect(decrypted).toBe(largeContent);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC3: Key derivation using PBKDF2
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC3: PBKDF2 Key Derivation', () => {
    it('should derive 256-bit key from passphrase', () => {
      const result = deriveKeyFromPassphrase(TEST_PASSPHRASE);

      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('salt');
      expect(result.key.length).toBe(32); // 256 bits = 32 bytes
    });

    it('should use minimum 100,000 iterations', () => {
      const result = deriveKeyFromPassphrase(TEST_PASSPHRASE);

      expect(result.iterations).toBeGreaterThanOrEqual(100000);
    });

    it('should use SHA-256 hash function', () => {
      const result = deriveKeyFromPassphrase(TEST_PASSPHRASE);

      expect(result.digest).toBe('sha256');
    });

    it('should generate random salt for each derivation', () => {
      const result1 = deriveKeyFromPassphrase(TEST_PASSPHRASE);
      const result2 = deriveKeyFromPassphrase(TEST_PASSPHRASE);

      expect(result1.salt).not.toBe(result2.salt);
    });

    it('should derive same key with same passphrase and salt', () => {
      const result1 = deriveKeyFromPassphrase(TEST_PASSPHRASE);
      const result2 = deriveKeyFromPassphrase(TEST_PASSPHRASE, result1.salt);

      expect(result2.key.equals(result1.key)).toBe(true);
    });

    it('should derive different keys for different passphrases', () => {
      const salt = crypto.randomBytes(16);
      const result1 = deriveKeyFromPassphrase('passphrase1', salt);
      const result2 = deriveKeyFromPassphrase('passphrase2', salt);

      expect(result1.key.equals(result2.key)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC4: Authentication tag verification
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC4: Auth Tag Verification', () => {
    it('should reject tampered ciphertext', () => {
      const encrypted = encryptor.encrypt(TEST_CONTENT);

      // Tamper with ciphertext
      const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
      tamperedCiphertext[0] ^= 0xFF; // Flip bits
      encrypted.ciphertext = tamperedCiphertext.toString('base64');

      expect(() => encryptor.decrypt(encrypted)).toThrow(/authentication|tag|tampered|integrity/i);
    });

    it('should reject tampered auth tag', () => {
      const encrypted = encryptor.encrypt(TEST_CONTENT);

      // Tamper with auth tag
      const tamperedTag = Buffer.from(encrypted.authTag, 'base64');
      tamperedTag[0] ^= 0xFF;
      encrypted.authTag = tamperedTag.toString('base64');

      expect(() => encryptor.decrypt(encrypted)).toThrow(/authentication|tag|tampered|integrity/i);
    });

    it('should reject wrong IV', () => {
      const encrypted = encryptor.encrypt(TEST_CONTENT);

      // Use different IV
      encrypted.iv = crypto.randomBytes(12).toString('base64');

      expect(() => encryptor.decrypt(encrypted)).toThrow(/authentication|tag|tampered|integrity/i);
    });

    it('should provide clear error message on verification failure', () => {
      const encrypted = encryptor.encrypt(TEST_CONTENT);
      encrypted.authTag = crypto.randomBytes(16).toString('base64');

      try {
        encryptor.decrypt(encrypted);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).toMatch(/authentication|integrity|tampered/i);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC5: Key rotation support
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC5: Key Rotation', () => {
    it('should re-encrypt with new key', () => {
      const oldEncryptor = new PromptEncryptor({ passphrase: 'old-passphrase' });
      const newEncryptor = new PromptEncryptor({ passphrase: 'new-passphrase' });

      // Encrypt with old key
      const encrypted = oldEncryptor.encrypt(TEST_CONTENT);

      // Decrypt with old key, re-encrypt with new key
      const decrypted = oldEncryptor.decrypt(encrypted);
      const reEncrypted = newEncryptor.encrypt(decrypted);

      // Verify new key can decrypt
      const finalDecrypted = newEncryptor.decrypt(reEncrypted);
      expect(finalDecrypted).toBe(TEST_CONTENT);
    });

    it('should rotate key for file', async () => {
      const testFile = path.join(tempDir, 'test.md');
      fs.writeFileSync(testFile, TEST_CONTENT);

      const oldEncryptor = new PromptEncryptor({ passphrase: 'old-key-passphrase' });
      const newEncryptor = new PromptEncryptor({ passphrase: 'new-key-passphrase' });

      // Encrypt file
      const encryptedFile = await oldEncryptor.encryptFile(testFile);

      // Rotate key
      await encryptor.rotateKey(encryptedFile, oldEncryptor, newEncryptor);

      // Verify new key works
      const content = await newEncryptor.decryptFile(encryptedFile);
      expect(content).toBe(TEST_CONTENT);

      // Verify old key no longer works
      expect(() => oldEncryptor.decryptFileSync(encryptedFile)).toThrow();
    });

    it('should handle batch rotation for multiple files', async () => {
      const files = [];
      for (let i = 0; i < 3; i++) {
        const file = path.join(tempDir, `test${i}.md`);
        fs.writeFileSync(file, `Content ${i}`);
        files.push(file);
      }

      const oldEncryptor = new PromptEncryptor({ passphrase: 'old-secure-passphrase' });
      const newEncryptor = new PromptEncryptor({ passphrase: 'new-secure-passphrase' });

      // Encrypt all files
      const encryptedFiles = await Promise.all(
        files.map(f => oldEncryptor.encryptFile(f))
      );

      // Rotate all keys
      const results = await encryptor.rotateKeys(encryptedFiles, oldEncryptor, newEncryptor);

      expect(results.success).toBe(true);
      expect(results.rotated).toBe(3);
      expect(results.failed).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC6: Performance (<100ms per file)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC6: Performance', () => {
    it('should encrypt typical CLAUDE.md in under 100ms', () => {
      const typicalClaudeMd = `# CLAUDE.md

## Forbidden Operations
- Never delete files outside project directory
- Never expose API keys in output
- Never bypass safety checks

## Required Behaviors
- Always validate input
- Always log actions
- Always respect rate limits

This file is approximately 1KB which is typical.
`.repeat(10); // ~10KB, larger than typical

      const start = performance.now();
      encryptor.encrypt(typicalClaudeMd);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should decrypt in under 100ms', () => {
      const content = 'x'.repeat(10000); // 10KB
      const encrypted = encryptor.encrypt(content);

      const start = performance.now();
      encryptor.decrypt(encrypted);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should derive key in reasonable time', () => {
      const start = performance.now();
      deriveKeyFromPassphrase(TEST_PASSPHRASE);
      const duration = performance.now() - start;

      // PBKDF2 with 100k iterations should take ~100-500ms
      // We allow up to 1000ms for slower systems
      expect(duration).toBeLessThan(1000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // File Operations
  // ─────────────────────────────────────────────────────────────────────────────

  describe('File Operations', () => {
    it('should encrypt file to .enc extension', async () => {
      const testFile = path.join(tempDir, 'CLAUDE.md');
      fs.writeFileSync(testFile, TEST_CONTENT);

      const encryptedPath = await encryptor.encryptFile(testFile);

      expect(encryptedPath).toBe(testFile + '.enc');
      expect(fs.existsSync(encryptedPath)).toBe(true);
    });

    it('should optionally remove original after encryption', async () => {
      const testFile = path.join(tempDir, 'secret.md');
      fs.writeFileSync(testFile, TEST_CONTENT);

      await encryptor.encryptFile(testFile, { removeOriginal: true });

      expect(fs.existsSync(testFile)).toBe(false);
      expect(fs.existsSync(testFile + '.enc')).toBe(true);
    });

    it('should decrypt file to memory (not disk)', async () => {
      const testFile = path.join(tempDir, 'test.md');
      fs.writeFileSync(testFile, TEST_CONTENT);

      const encryptedPath = await encryptor.encryptFile(testFile, { removeOriginal: true });
      const decrypted = await encryptor.decryptFile(encryptedPath);

      // Verify decrypted content is correct
      expect(decrypted).toBe(TEST_CONTENT);

      // Verify no plaintext file was created
      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('should store metadata in encrypted file', async () => {
      const testFile = path.join(tempDir, 'meta.md');
      fs.writeFileSync(testFile, TEST_CONTENT);

      await encryptor.encryptFile(testFile);

      const encryptedContent = fs.readFileSync(testFile + '.enc', 'utf8');
      const parsed = JSON.parse(encryptedContent);

      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('algorithm');
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('authTag');
      expect(parsed).toHaveProperty('ciphertext');
      expect(parsed).toHaveProperty('salt');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Security Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Security Edge Cases', () => {
    it('should reject empty passphrase', () => {
      expect(() => new PromptEncryptor({ passphrase: '' })).toThrow(/passphrase/i);
    });

    it('should reject short passphrase', () => {
      expect(() => new PromptEncryptor({ passphrase: 'abc' })).toThrow(/passphrase.*length/i);
    });

    it('should accept direct key instead of passphrase', () => {
      const key = crypto.randomBytes(32);
      const encryptorWithKey = new PromptEncryptor({ key });

      const encrypted = encryptorWithKey.encrypt(TEST_CONTENT);
      const decrypted = encryptorWithKey.decrypt(encrypted);

      expect(decrypted).toBe(TEST_CONTENT);
    });

    it('should handle empty content', () => {
      const encrypted = encryptor.encrypt('');
      const decrypted = encryptor.decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('should not leak key in error messages', () => {
      const encrypted = encryptor.encrypt(TEST_CONTENT);
      encrypted.authTag = 'invalid';

      try {
        encryptor.decrypt(encrypted);
      } catch (error) {
        expect(error.message).not.toContain(TEST_PASSPHRASE);
        expect(error.stack).not.toContain(TEST_PASSPHRASE);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility Functions
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Utility Functions', () => {
    it('generateKey should create 256-bit key', () => {
      const key = generateKey();
      expect(key.length).toBe(32);
    });

    it('encryptString should work standalone', () => {
      const key = generateKey();
      const encrypted = encryptString(TEST_CONTENT, key);
      const decrypted = decryptString(encrypted, key);

      expect(decrypted).toBe(TEST_CONTENT);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GAP-011: Key Material Zeroing (Secure Cleanup)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GAP-011: Key Material Zeroing', () => {
    it('should have a destroy method', () => {
      const enc = new PromptEncryptor({ passphrase: TEST_PASSPHRASE });
      expect(typeof enc.destroy).toBe('function');
    });

    it('destroy should zero the key buffer', () => {
      const enc = new PromptEncryptor({ passphrase: TEST_PASSPHRASE });

      // Verify key is not all zeros before destroy
      const keyBefore = Buffer.from(enc.key);
      expect(keyBefore.some(b => b !== 0)).toBe(true);

      // Destroy the encryptor
      enc.destroy();

      // Key should now be all zeros
      expect(enc.key.every(b => b === 0)).toBe(true);
    });

    it('destroy should zero the salt buffer if present', () => {
      const enc = new PromptEncryptor({ passphrase: TEST_PASSPHRASE });

      // Salt should exist for passphrase-derived keys
      expect(enc.salt).not.toBeNull();

      const saltBefore = Buffer.from(enc.salt);
      expect(saltBefore.some(b => b !== 0)).toBe(true);

      enc.destroy();

      // Salt should now be all zeros
      expect(enc.salt.every(b => b === 0)).toBe(true);
    });

    it('should mark encryptor as destroyed', () => {
      const enc = new PromptEncryptor({ passphrase: TEST_PASSPHRASE });

      expect(enc.isDestroyed).toBe(false);

      enc.destroy();

      expect(enc.isDestroyed).toBe(true);
    });

    it('should throw error when using destroyed encryptor for encrypt', () => {
      const enc = new PromptEncryptor({ passphrase: TEST_PASSPHRASE });
      enc.destroy();

      expect(() => enc.encrypt('test')).toThrow(/destroyed/i);
    });

    it('should throw error when using destroyed encryptor for decrypt', () => {
      const enc = new PromptEncryptor({ passphrase: TEST_PASSPHRASE });
      const encrypted = enc.encrypt('test');
      enc.destroy();

      expect(() => enc.decrypt(encrypted)).toThrow(/destroyed/i);
    });

    it('secureZeroBuffer should fill buffer with zeros', async () => {
      const { secureZeroBuffer } = await import('../utils/prompt-encryptor.js');
      const buf = Buffer.from([0x41, 0x42, 0x43, 0x44]);

      secureZeroBuffer(buf);

      expect(buf.every(b => b === 0)).toBe(true);
    });

    it('secureZeroBuffer should handle null gracefully', async () => {
      const { secureZeroBuffer } = await import('../utils/prompt-encryptor.js');

      // Should not throw
      expect(() => secureZeroBuffer(null)).not.toThrow();
      expect(() => secureZeroBuffer(undefined)).not.toThrow();
    });

    it('should allow multiple destroy calls safely', () => {
      const enc = new PromptEncryptor({ passphrase: TEST_PASSPHRASE });

      enc.destroy();
      expect(() => enc.destroy()).not.toThrow();
    });

    it('destroy should work with direct key constructor', () => {
      const key = generateKey();
      const enc = new PromptEncryptor({ key });

      // Salt should be null for direct key
      expect(enc.salt).toBeNull();

      enc.destroy();

      expect(enc.key.every(b => b === 0)).toBe(true);
      expect(enc.isDestroyed).toBe(true);
    });
  });
});
