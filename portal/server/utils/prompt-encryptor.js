// ═══════════════════════════════════════════════════════════════════════════════
// WAVE FRAMEWORK - Prompt Encryptor
// ═══════════════════════════════════════════════════════════════════════════════
// Implements AES-256-GCM encryption for system prompts at rest
// Based on OWASP Cryptographic Storage & Secrets Management best practices
//
// Sources:
// - https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
// - https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
// - https://nodejs.org/api/crypto.html
// ═══════════════════════════════════════════════════════════════════════════════

import crypto from 'crypto';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const KEY_LENGTH = 32; // 256-bit key
const SALT_LENGTH = 16; // 128-bit salt
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_DIGEST = 'sha256';
const MIN_PASSPHRASE_LENGTH = 8;
const VERSION = '1.0';

// ─────────────────────────────────────────────────────────────────────────────
// KEY DERIVATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive a 256-bit key from passphrase using PBKDF2
 * @param {string} passphrase - The passphrase to derive key from
 * @param {Buffer|string} [salt] - Optional salt (generated if not provided)
 * @returns {{ key: Buffer, salt: Buffer, iterations: number, digest: string }}
 */
export function deriveKeyFromPassphrase(passphrase, salt = null) {
  const saltBuffer = salt
    ? (Buffer.isBuffer(salt) ? salt : Buffer.from(salt, 'base64'))
    : crypto.randomBytes(SALT_LENGTH);

  const key = crypto.pbkdf2Sync(
    passphrase,
    saltBuffer,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    PBKDF2_DIGEST
  );

  return {
    key,
    salt: saltBuffer,
    iterations: PBKDF2_ITERATIONS,
    digest: PBKDF2_DIGEST
  };
}

/**
 * Generate a random 256-bit encryption key
 * @returns {Buffer}
 */
export function generateKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDALONE ENCRYPTION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encrypt a string using AES-256-GCM
 * @param {string} content - Content to encrypt
 * @param {Buffer} key - 256-bit encryption key
 * @returns {{ iv: string, authTag: string, ciphertext: string, algorithm: string }}
 */
export function encryptString(content, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(content, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext,
    algorithm: ALGORITHM
  };
}

/**
 * Decrypt an encrypted object using AES-256-GCM
 * @param {{ iv: string, authTag: string, ciphertext: string }} encrypted - Encrypted data
 * @param {Buffer} key - 256-bit decryption key
 * @returns {string}
 */
export function decryptString(encrypted, key) {
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    if (error.message.includes('Unsupported state') || error.code === 'ERR_CRYPTO_INVALID_AUTH_TAG') {
      throw new Error('Authentication tag verification failed. Data may be tampered or corrupted.');
    }
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT ENCRYPTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PromptEncryptor - Encrypts/decrypts system prompts using AES-256-GCM
 */
export class PromptEncryptor {
  /**
   * Create a new PromptEncryptor
   * @param {Object} options - Configuration options
   * @param {string} [options.passphrase] - Passphrase for key derivation
   * @param {Buffer} [options.key] - Direct 256-bit key (bypasses passphrase)
   * @param {Buffer} [options.salt] - Salt for passphrase derivation (auto-generated if not provided)
   */
  constructor(options = {}) {
    if (options.key) {
      // Direct key provided
      if (options.key.length !== KEY_LENGTH) {
        throw new Error(`Key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 8}-bit)`);
      }
      this.key = options.key;
      this.salt = null;
    } else if (options.passphrase) {
      // Derive key from passphrase
      if (!options.passphrase || options.passphrase.length === 0) {
        throw new Error('Passphrase cannot be empty');
      }
      if (options.passphrase.length < MIN_PASSPHRASE_LENGTH) {
        throw new Error(`Passphrase length must be at least ${MIN_PASSPHRASE_LENGTH} characters`);
      }

      const derived = deriveKeyFromPassphrase(options.passphrase, options.salt);
      this.key = derived.key;
      this.salt = derived.salt;
    } else {
      throw new Error('Either passphrase or key must be provided');
    }
  }

  /**
   * Encrypt content using AES-256-GCM
   * @param {string} content - Content to encrypt
   * @returns {{ iv: string, authTag: string, ciphertext: string, algorithm: string }}
   */
  encrypt(content) {
    return encryptString(content, this.key);
  }

  /**
   * Decrypt content using AES-256-GCM
   * @param {{ iv: string, authTag: string, ciphertext: string }} encrypted - Encrypted data
   * @returns {string}
   */
  decrypt(encrypted) {
    return decryptString(encrypted, this.key);
  }

  /**
   * Encrypt a file and save to .enc extension
   * @param {string} filePath - Path to file to encrypt
   * @param {Object} [options] - Options
   * @param {boolean} [options.removeOriginal=false] - Remove original file after encryption
   * @returns {Promise<string>} Path to encrypted file
   */
  async encryptFile(filePath, options = {}) {
    const content = await readFile(filePath, 'utf8');
    const encrypted = this.encrypt(content);

    const encryptedData = {
      version: VERSION,
      algorithm: encrypted.algorithm,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      ciphertext: encrypted.ciphertext,
      salt: this.salt ? this.salt.toString('base64') : null
    };

    const encryptedPath = filePath + '.enc';
    await writeFile(encryptedPath, JSON.stringify(encryptedData, null, 2));

    if (options.removeOriginal) {
      await unlink(filePath);
    }

    return encryptedPath;
  }

  /**
   * Decrypt a .enc file to memory (never writes plaintext to disk)
   * @param {string} encryptedPath - Path to encrypted file
   * @returns {Promise<string>} Decrypted content
   */
  async decryptFile(encryptedPath) {
    const encryptedContent = await readFile(encryptedPath, 'utf8');
    const encryptedData = JSON.parse(encryptedContent);

    return this.decrypt({
      iv: encryptedData.iv,
      authTag: encryptedData.authTag,
      ciphertext: encryptedData.ciphertext
    });
  }

  /**
   * Decrypt a .enc file synchronously to memory
   * @param {string} encryptedPath - Path to encrypted file
   * @returns {string} Decrypted content
   */
  decryptFileSync(encryptedPath) {
    const encryptedContent = fs.readFileSync(encryptedPath, 'utf8');
    const encryptedData = JSON.parse(encryptedContent);

    return this.decrypt({
      iv: encryptedData.iv,
      authTag: encryptedData.authTag,
      ciphertext: encryptedData.ciphertext
    });
  }

  /**
   * Rotate encryption key for a file
   * @param {string} encryptedPath - Path to encrypted file
   * @param {PromptEncryptor} oldEncryptor - Encryptor with old key
   * @param {PromptEncryptor} newEncryptor - Encryptor with new key
   * @returns {Promise<void>}
   */
  async rotateKey(encryptedPath, oldEncryptor, newEncryptor) {
    // Decrypt with old key
    const content = await oldEncryptor.decryptFile(encryptedPath);

    // Re-encrypt with new key
    const encrypted = newEncryptor.encrypt(content);

    const encryptedData = {
      version: VERSION,
      algorithm: encrypted.algorithm,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      ciphertext: encrypted.ciphertext,
      salt: newEncryptor.salt ? newEncryptor.salt.toString('base64') : null
    };

    await writeFile(encryptedPath, JSON.stringify(encryptedData, null, 2));
  }

  /**
   * Rotate encryption keys for multiple files
   * @param {string[]} encryptedPaths - Array of encrypted file paths
   * @param {PromptEncryptor} oldEncryptor - Encryptor with old key
   * @param {PromptEncryptor} newEncryptor - Encryptor with new key
   * @returns {Promise<{ success: boolean, rotated: number, failed: number, errors: Array }>}
   */
  async rotateKeys(encryptedPaths, oldEncryptor, newEncryptor) {
    const results = {
      success: true,
      rotated: 0,
      failed: 0,
      errors: []
    };

    for (const filePath of encryptedPaths) {
      try {
        await this.rotateKey(filePath, oldEncryptor, newEncryptor);
        results.rotated++;
      } catch (error) {
        results.failed++;
        results.success = false;
        results.errors.push({ file: filePath, error: error.message });
      }
    }

    // Mark as success if all files rotated
    results.success = results.failed === 0;

    return results;
  }
}

export default PromptEncryptor;
