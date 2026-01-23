// ═══════════════════════════════════════════════════════════════════════════════
// SECRET REDACTOR UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════════════
// Validates OWASP-compliant secret redaction patterns
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { SecretRedactor, secretRedactor } from '../utils/secret-redactor.js';

describe('SecretRedactor', () => {
  let redactor;

  beforeEach(() => {
    redactor = new SecretRedactor();
  });

  describe('redactString', () => {
    it('should return non-string input unchanged', () => {
      expect(redactor.redactString(null)).toBe(null);
      expect(redactor.redactString(undefined)).toBe(undefined);
      expect(redactor.redactString(123)).toBe(123);
    });

    it('should return empty string unchanged', () => {
      expect(redactor.redactString('')).toBe('');
    });

    it('should redact Anthropic API keys', () => {
      const input = 'Key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF';
      const result = redactor.redactString(input);
      expect(result).toBe('Key: [REDACTED]');
    });

    it('should redact OpenAI API keys', () => {
      const input = 'Key: sk-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMN';
      const result = redactor.redactString(input);
      expect(result).toBe('Key: [REDACTED]');
    });

    it('should redact Slack bot tokens', () => {
      // Using pattern that matches xoxb- format but is clearly fake
      const input = 'Token: xoxb-FAKE-TOKEN-FOR-TESTING-ONLY';
      const result = redactor.redactString(input);
      expect(result).toBe('Token: [REDACTED]');
    });

    it('should redact AWS access keys', () => {
      const input = 'AWS Key: AKIAIOSFODNN7EXAMPLE';
      const result = redactor.redactString(input);
      expect(result).toBe('AWS Key: [REDACTED]');
    });

    it('should redact PostgreSQL URLs with credentials', () => {
      const input = 'postgres://user:password123@localhost:5432/mydb';
      const result = redactor.redactString(input);
      expect(result).toBe('[REDACTED]');
    });

    it('should redact MongoDB URLs with credentials', () => {
      const input = 'mongodb+srv://user:pass@cluster.mongodb.net/db';
      const result = redactor.redactString(input);
      expect(result).toBe('[REDACTED]');
    });

    it('should redact Bearer tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig';
      const result = redactor.redactString(input);
      expect(result).toContain('[REDACTED]');
    });

    it('should redact JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const result = redactor.redactString(jwt);
      expect(result).toBe('[REDACTED]');
    });

    it('should redact GitHub tokens', () => {
      const input = 'Token: ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890';
      const result = redactor.redactString(input);
      expect(result).toBe('Token: [REDACTED]');
    });

    it('should redact Stripe keys', () => {
      // Using sk_test_ prefix with placeholder value (24+ chars)
      const input = 'Stripe: sk_test_' + 'X'.repeat(24);
      const result = redactor.redactString(input);
      expect(result).toBe('Stripe: [REDACTED]');
    });

    it('should redact password JSON fields', () => {
      const input = '{"password": "secret123"}';
      const result = redactor.redactString(input);
      expect(result).toBe('{[REDACTED]}');
    });

    it('should redact private keys', () => {
      const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----';
      const result = redactor.redactString(input);
      expect(result).toBe('[REDACTED]');
    });

    it('should handle multiple secrets in same string', () => {
      const input = 'Keys: sk-ant-api03-abc123def456 and xoxb-123-456-abc';
      const result = redactor.redactString(input);
      expect(result).not.toContain('sk-ant');
      expect(result).not.toContain('xoxb-');
    });
  });

  describe('isSensitiveKey', () => {
    it('should identify password keys', () => {
      expect(redactor.isSensitiveKey('password')).toBe(true);
      expect(redactor.isSensitiveKey('PASSWORD')).toBe(true);
      expect(redactor.isSensitiveKey('user_password')).toBe(true);
    });

    it('should identify secret keys', () => {
      expect(redactor.isSensitiveKey('secret')).toBe(true);
      expect(redactor.isSensitiveKey('client_secret')).toBe(true);
      expect(redactor.isSensitiveKey('SECRET_KEY')).toBe(true);
    });

    it('should identify token keys', () => {
      expect(redactor.isSensitiveKey('token')).toBe(true);
      expect(redactor.isSensitiveKey('access_token')).toBe(true);
      expect(redactor.isSensitiveKey('refresh_token')).toBe(true);
    });

    it('should identify API key keys', () => {
      expect(redactor.isSensitiveKey('api_key')).toBe(true);
      expect(redactor.isSensitiveKey('apiKey')).toBe(true);
      expect(redactor.isSensitiveKey('API_KEY')).toBe(true);
    });

    it('should not flag normal keys', () => {
      expect(redactor.isSensitiveKey('name')).toBe(false);
      expect(redactor.isSensitiveKey('email')).toBe(false);
      expect(redactor.isSensitiveKey('id')).toBe(false);
      expect(redactor.isSensitiveKey('status')).toBe(false);
    });

    it('should handle null/undefined keys', () => {
      expect(redactor.isSensitiveKey(null)).toBe(false);
      expect(redactor.isSensitiveKey(undefined)).toBe(false);
    });
  });

  describe('redactObject', () => {
    it('should handle null/undefined', () => {
      expect(redactor.redactObject(null)).toBe(null);
      expect(redactor.redactObject(undefined)).toBe(undefined);
    });

    it('should redact strings in objects', () => {
      const obj = {
        message: 'Token: xoxb-123-456-abc',
        count: 42
      };
      const result = redactor.redactObject(obj);
      expect(result.message).toBe('Token: [REDACTED]');
      expect(result.count).toBe(42);
    });

    it('should redact sensitive keys entirely', () => {
      const obj = {
        username: 'john',
        password: 'secret123',
        api_key: 'key-value'
      };
      const result = redactor.redactObject(obj);
      expect(result.username).toBe('john');
      expect(result.password).toBe('[REDACTED]');
      expect(result.api_key).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          settings: {
            password: 'secret'
          }
        }
      };
      const result = redactor.redactObject(obj);
      expect(result.user.name).toBe('John');
      expect(result.user.settings.password).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const arr = [
        { key: 'sk-ant-api03-abc123def456' },
        { name: 'safe' }
      ];
      const result = redactor.redactObject(arr);
      expect(result[0].key).toBe('[REDACTED]');
      expect(result[1].name).toBe('safe');
    });

    it('should prevent infinite recursion', () => {
      const obj = { a: 1 };
      let current = obj;
      for (let i = 0; i < 25; i++) {
        current.nested = { level: i };
        current = current.nested;
      }

      // Should not throw
      const result = redactor.redactObject(obj);
      expect(result).toBeDefined();
    });

    it('should preserve primitives', () => {
      expect(redactor.redactObject(42)).toBe(42);
      expect(redactor.redactObject(true)).toBe(true);
    });
  });

  describe('detectSecrets', () => {
    it('should detect secrets in string', () => {
      const input = 'Key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF';
      const result = redactor.detectSecrets(input);
      expect(result.hasSecrets).toBe(true);
      expect(result.detected.length).toBeGreaterThan(0);
    });

    it('should return empty for safe strings', () => {
      const result = redactor.detectSecrets('Hello, this is a safe message');
      expect(result.hasSecrets).toBe(false);
      expect(result.detected).toHaveLength(0);
    });

    it('should handle non-string input', () => {
      const result = redactor.detectSecrets(123);
      expect(result.hasSecrets).toBe(false);
    });
  });

  describe('addPattern', () => {
    it('should add custom patterns', () => {
      redactor.addPattern('Custom Key', /CUSTOM_[A-Z0-9]{10}/g);

      const input = 'Key: CUSTOM_ABCD123456';
      const result = redactor.redactString(input);
      expect(result).toBe('Key: [REDACTED]');
    });
  });

  describe('getPatternNames', () => {
    it('should return list of pattern names', () => {
      const names = redactor.getPatternNames();
      expect(names).toContain('Anthropic API Key');
      expect(names).toContain('Slack Bot Token');
      expect(names.length).toBeGreaterThan(10);
    });
  });
});

describe('secretRedactor singleton', () => {
  it('should export singleton instance', () => {
    expect(secretRedactor).toBeInstanceOf(SecretRedactor);
  });

  it('should redact Slack payloads', () => {
    const payload = {
      blocks: [{
        text: {
          text: 'Token: xoxb-123-456-abc'
        }
      }]
    };
    const result = secretRedactor.redactSlackPayload(payload);
    expect(result.blocks[0].text.text).toBe('Token: [REDACTED]');
  });
});
