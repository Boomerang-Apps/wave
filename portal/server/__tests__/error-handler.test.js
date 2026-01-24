/**
 * TDD Tests for Error Handler (GAP-011)
 *
 * Tests that errors are properly logged with correlation IDs,
 * context, and severity levels. Eliminates silent failures.
 *
 * Based on:
 * - OWASP A09:2021 Security Logging Failures
 * - 12-Factor App - Logs
 * - Node.js Error Handling Best Practices
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the module we're testing
import {
  logError,
  logWarn,
  logInfo,
  generateCorrelationId,
  trySafe,
  trySafeAsync,
  createErrorContext,
  sanitizeForLog,
  wrapAsync,
  ErrorHandler,
  LOG_LEVELS
} from '../utils/error-handler.js';

describe('Error Handler (GAP-011)', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleInfoSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // UNIT TESTS - Constants
  // ============================================

  describe('constants', () => {
    it('should define LOG_LEVELS', () => {
      expect(LOG_LEVELS).toBeDefined();
      expect(LOG_LEVELS.ERROR).toBe('ERROR');
      expect(LOG_LEVELS.WARN).toBe('WARN');
      expect(LOG_LEVELS.INFO).toBe('INFO');
    });
  });

  // ============================================
  // UNIT TESTS - generateCorrelationId
  // ============================================

  describe('generateCorrelationId', () => {
    it('should return valid UUID format', () => {
      const id = generateCorrelationId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should return unique IDs on each call', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      const id3 = generateCorrelationId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
    });
  });

  // ============================================
  // UNIT TESTS - sanitizeForLog
  // ============================================

  describe('sanitizeForLog', () => {
    it('should remove newlines', () => {
      const input = 'Error\nwith\nnewlines';
      const result = sanitizeForLog(input);
      expect(result).not.toContain('\n');
    });

    it('should remove carriage returns', () => {
      const input = 'Error\rwith\rreturns';
      const result = sanitizeForLog(input);
      expect(result).not.toContain('\r');
    });

    it('should escape special characters for log injection', () => {
      const input = 'Error with ${injection} and `backticks`';
      const result = sanitizeForLog(input);
      // Should escape or remove potentially dangerous characters
      expect(result).not.toContain('${');
    });

    it('should truncate very long messages', () => {
      const input = 'A'.repeat(10000);
      const result = sanitizeForLog(input);
      expect(result.length).toBeLessThan(5000);
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeForLog(null)).toBe('null');
      expect(sanitizeForLog(undefined)).toBe('undefined');
      expect(sanitizeForLog(123)).toBe('123');
      expect(sanitizeForLog({ foo: 'bar' })).toContain('foo');
    });
  });

  // ============================================
  // UNIT TESTS - createErrorContext
  // ============================================

  describe('createErrorContext', () => {
    it('should include operation name', () => {
      const context = createErrorContext('database_query', {});
      expect(context.operation).toBe('database_query');
    });

    it('should include metadata', () => {
      const context = createErrorContext('api_call', { userId: 123, endpoint: '/api/test' });
      expect(context.metadata.userId).toBe(123);
      expect(context.metadata.endpoint).toBe('/api/test');
    });

    it('should include timestamp', () => {
      const context = createErrorContext('test_op', {});
      expect(context.timestamp).toBeDefined();
      expect(new Date(context.timestamp).getTime()).not.toBeNaN();
    });

    it('should generate correlation ID if not provided', () => {
      const context = createErrorContext('test_op', {});
      expect(context.correlationId).toBeDefined();
      expect(context.correlationId.length).toBe(36); // UUID length
    });

    it('should use provided correlation ID', () => {
      const customId = 'custom-correlation-id-123';
      const context = createErrorContext('test_op', {}, customId);
      expect(context.correlationId).toBe(customId);
    });
  });

  // ============================================
  // UNIT TESTS - logError
  // ============================================

  describe('logError', () => {
    it('should output to console.error', () => {
      logError(new Error('Test error'), 'test_operation');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include correlation ID in output', () => {
      logError(new Error('Test error'), 'test_operation');
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('correlation_id');
    });

    it('should include timestamp in output', () => {
      logError(new Error('Test error'), 'test_operation');
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('timestamp');
    });

    it('should include operation name', () => {
      logError(new Error('Test error'), 'database_save');
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('database_save');
    });

    it('should include error message', () => {
      logError(new Error('Specific error message'), 'test_op');
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('Specific error message');
    });

    it('should return correlation ID for tracking', () => {
      const correlationId = logError(new Error('Test'), 'test_op');
      expect(correlationId).toBeDefined();
      expect(correlationId.length).toBe(36);
    });

    it('should handle string errors', () => {
      logError('String error message', 'test_op');
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('String error message');
    });

    it('should include metadata when provided', () => {
      logError(new Error('Test'), 'test_op', { userId: 456 });
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('456');
    });
  });

  // ============================================
  // UNIT TESTS - logWarn
  // ============================================

  describe('logWarn', () => {
    it('should output to console.warn', () => {
      logWarn('Warning message', 'test_operation');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should include WARN level', () => {
      logWarn('Warning message', 'test_operation');
      const output = consoleWarnSpy.mock.calls[0][0];
      expect(output).toContain('WARN');
    });

    it('should include correlation ID', () => {
      logWarn('Warning', 'test_op');
      const output = consoleWarnSpy.mock.calls[0][0];
      expect(output).toContain('correlation_id');
    });
  });

  // ============================================
  // UNIT TESTS - logInfo
  // ============================================

  describe('logInfo', () => {
    it('should output to console.info', () => {
      logInfo('Info message', 'test_operation');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should include INFO level', () => {
      logInfo('Info message', 'test_operation');
      const output = consoleInfoSpy.mock.calls[0][0];
      expect(output).toContain('INFO');
    });
  });

  // ============================================
  // UNIT TESTS - trySafe
  // ============================================

  describe('trySafe', () => {
    it('should return value on success', () => {
      const result = trySafe(() => 'success', 'test_op');
      expect(result).toBe('success');
    });

    it('should return null on error', () => {
      const result = trySafe(() => { throw new Error('fail'); }, 'test_op');
      expect(result).toBeNull();
    });

    it('should log error when operation fails', () => {
      trySafe(() => { throw new Error('Operation failed'); }, 'risky_operation');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('Operation failed');
    });

    it('should accept custom default value', () => {
      const result = trySafe(() => { throw new Error('fail'); }, 'test_op', { defaultValue: 'fallback' });
      expect(result).toBe('fallback');
    });

    it('should accept custom default value of different types', () => {
      const result = trySafe(() => { throw new Error('fail'); }, 'test_op', { defaultValue: [] });
      expect(result).toEqual([]);
    });

    it('should not log if silent option is true', () => {
      trySafe(() => { throw new Error('fail'); }, 'test_op', { silent: true });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should include operation in error log', () => {
      trySafe(() => { throw new Error('fail'); }, 'parse_json');
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('parse_json');
    });
  });

  // ============================================
  // UNIT TESTS - trySafeAsync
  // ============================================

  describe('trySafeAsync', () => {
    it('should return value on success', async () => {
      const result = await trySafeAsync(async () => 'async success', 'test_op');
      expect(result).toBe('async success');
    });

    it('should return null on error', async () => {
      const result = await trySafeAsync(async () => { throw new Error('async fail'); }, 'test_op');
      expect(result).toBeNull();
    });

    it('should log error when async operation fails', async () => {
      await trySafeAsync(async () => { throw new Error('Async failed'); }, 'async_operation');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle rejected promises', async () => {
      const result = await trySafeAsync(() => Promise.reject(new Error('rejected')), 'test_op');
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ============================================
  // UNIT TESTS - wrapAsync
  // ============================================

  describe('wrapAsync', () => {
    it('should return value on success', async () => {
      const wrapped = wrapAsync(async () => 'result', 'test_op');
      const result = await wrapped();
      expect(result).toBe('result');
    });

    it('should log and re-throw on error', async () => {
      const wrapped = wrapAsync(async () => { throw new Error('wrapped error'); }, 'test_op');

      await expect(wrapped()).rejects.toThrow('wrapped error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include operation name in log', async () => {
      const wrapped = wrapAsync(async () => { throw new Error('fail'); }, 'database_query');

      try {
        await wrapped();
      } catch (e) {
        // Expected
      }

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('database_query');
    });

    it('should pass arguments through', async () => {
      const wrapped = wrapAsync(async (a, b) => a + b, 'add_op');
      const result = await wrapped(2, 3);
      expect(result).toBe(5);
    });
  });

  // ============================================
  // UNIT TESTS - ErrorHandler class
  // ============================================

  describe('ErrorHandler class', () => {
    it('should be a singleton', () => {
      const handler1 = ErrorHandler.getInstance();
      const handler2 = ErrorHandler.getInstance();
      expect(handler1).toBe(handler2);
    });

    it('should provide logError method', () => {
      const handler = ErrorHandler.getInstance();
      expect(typeof handler.logError).toBe('function');
    });

    it('should provide logWarn method', () => {
      const handler = ErrorHandler.getInstance();
      expect(typeof handler.logWarn).toBe('function');
    });

    it('should provide logInfo method', () => {
      const handler = ErrorHandler.getInstance();
      expect(typeof handler.logInfo).toBe('function');
    });

    it('should track error count', () => {
      const handler = ErrorHandler.getInstance();
      const initialCount = handler.getErrorCount();
      handler.logError(new Error('test'), 'test_op');
      expect(handler.getErrorCount()).toBe(initialCount + 1);
    });

    it('should support custom output handler', () => {
      const customOutput = vi.fn();
      const handler = ErrorHandler.getInstance();
      handler.setOutputHandler(customOutput);

      handler.logError(new Error('custom test'), 'test_op');
      expect(customOutput).toHaveBeenCalled();

      // Reset to default
      handler.setOutputHandler(null);
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('security', () => {
    it('should not log sensitive patterns', () => {
      const error = new Error('Connection failed with password=secret123');
      logError(error, 'db_connect');
      const output = consoleErrorSpy.mock.calls[0][0];
      // Should redact or not include raw password
      expect(output).not.toContain('secret123');
    });

    it('should prevent log injection via newlines', () => {
      const maliciousMessage = 'Normal log\n[ERROR] Fake injected log entry';
      logError(new Error(maliciousMessage), 'test_op');
      const output = consoleErrorSpy.mock.calls[0][0];
      // Should be on single line or escaped
      const lines = output.split('\n').filter(l => l.trim());
      expect(lines.length).toBeLessThanOrEqual(1);
    });

    it('should sanitize potentially dangerous characters', () => {
      const maliciousMessage = 'Error with ${process.env.SECRET} injection';
      const sanitized = sanitizeForLog(maliciousMessage);
      expect(sanitized).not.toContain('${');
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('integration', () => {
    it('should handle complete error workflow', () => {
      const error = new Error('Database connection timeout');
      const operation = 'connect_to_database';
      const metadata = { host: 'localhost', port: 5432 };

      const correlationId = logError(error, operation, metadata);

      expect(correlationId).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalled();

      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain(correlationId);
      expect(output).toContain('connect_to_database');
      expect(output).toContain('Database connection timeout');
    });

    it('should work with nested try-catch', () => {
      const innerFn = () => {
        return trySafe(() => {
          throw new Error('inner error');
        }, 'inner_operation');
      };

      const outerFn = () => {
        return trySafe(() => {
          innerFn();
          return 'outer success';
        }, 'outer_operation');
      };

      const result = outerFn();
      expect(result).toBe('outer success');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
