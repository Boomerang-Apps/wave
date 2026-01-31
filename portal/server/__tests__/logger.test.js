// ═══════════════════════════════════════════════════════════════════════════════
// LOGGER ABSTRACTION TESTS (GAP-017)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for centralized logging abstraction to replace console.log calls
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLogger, Logger, LOG_LEVELS } from '../utils/logger.js';

describe('Logger (GAP-017)', () => {
  let originalEnv;
  let consoleSpy;

  beforeEach(() => {
    originalEnv = { ...process.env };
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Log Levels', () => {
    it('should export log level constants', () => {
      expect(LOG_LEVELS).toBeDefined();
      expect(LOG_LEVELS.DEBUG).toBe(0);
      expect(LOG_LEVELS.INFO).toBe(1);
      expect(LOG_LEVELS.WARN).toBe(2);
      expect(LOG_LEVELS.ERROR).toBe(3);
      expect(LOG_LEVELS.SILENT).toBe(4);
    });

    it('should default to INFO level', () => {
      const logger = createLogger();
      expect(logger.level).toBe(LOG_LEVELS.INFO);
    });

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'debug';
      const logger = createLogger();
      expect(logger.level).toBe(LOG_LEVELS.DEBUG);
    });

    it('should handle uppercase LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'WARN';
      const logger = createLogger();
      expect(logger.level).toBe(LOG_LEVELS.WARN);
    });

    it('should fall back to INFO for invalid LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'invalid';
      const logger = createLogger();
      expect(logger.level).toBe(LOG_LEVELS.INFO);
    });

    it('should allow setting level via constructor option', () => {
      const logger = createLogger({ level: 'error' });
      expect(logger.level).toBe(LOG_LEVELS.ERROR);
    });

    it('should prefer constructor option over environment variable', () => {
      process.env.LOG_LEVEL = 'debug';
      const logger = createLogger({ level: 'error' });
      expect(logger.level).toBe(LOG_LEVELS.ERROR);
    });
  });

  describe('Logging Methods', () => {
    it('should log debug messages when level is DEBUG', () => {
      const logger = createLogger({ level: 'debug' });
      logger.debug('debug message');
      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it('should NOT log debug messages when level is INFO', () => {
      const logger = createLogger({ level: 'info' });
      logger.debug('debug message');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('should log info messages when level is INFO', () => {
      const logger = createLogger({ level: 'info' });
      logger.info('info message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should NOT log info messages when level is WARN', () => {
      const logger = createLogger({ level: 'warn' });
      logger.info('info message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log warn messages when level is WARN', () => {
      const logger = createLogger({ level: 'warn' });
      logger.warn('warn message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should log error messages at all levels except SILENT', () => {
      const logger = createLogger({ level: 'debug' });
      logger.error('error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should NOT log anything when level is SILENT', () => {
      const logger = createLogger({ level: 'silent' });
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('Prefix/Context Support', () => {
    it('should support prefix option', () => {
      const logger = createLogger({ prefix: '[MyModule]', level: 'info' });
      logger.info('test message');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[MyModule]'),
        expect.anything()
      );
    });

    it('should include timestamp in output', () => {
      const logger = createLogger({ level: 'info' });
      logger.info('test message');
      // Should have ISO timestamp format
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        expect.anything()
      );
    });

    it('should include level indicator in output', () => {
      const logger = createLogger({ level: 'info' });
      logger.info('test message');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.anything()
      );
    });
  });

  describe('Child Loggers', () => {
    it('should create child logger with additional prefix', () => {
      const parent = createLogger({ prefix: '[Parent]', level: 'info' });
      const child = parent.child('[Child]');
      child.info('test message');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[Parent][Child]'),
        expect.anything()
      );
    });

    it('should inherit log level from parent', () => {
      const parent = createLogger({ level: 'error' });
      const child = parent.child('[Child]');
      child.info('should not log');
      child.error('should log');
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('Structured Logging', () => {
    it('should support logging objects', () => {
      const logger = createLogger({ level: 'info' });
      const data = { userId: 123, action: 'login' };
      logger.info('User action', data);
      // Format: header, message, ...args
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.any(String),
        'User action',
        expect.objectContaining({ userId: 123, action: 'login' })
      );
    });

    it('should support multiple arguments', () => {
      const logger = createLogger({ level: 'info' });
      logger.info('Message', 'arg1', 'arg2');
      // Format: header, message, ...args
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.any(String),
        'Message',
        'arg1',
        'arg2'
      );
    });

    it('should handle Error objects specially', () => {
      const logger = createLogger({ level: 'error' });
      const error = new Error('Test error');
      logger.error('An error occurred', error);
      // Format: header, message, ...args (with Error converted to object)
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.any(String),
        'An error occurred',
        expect.objectContaining({
          message: 'Test error',
          stack: expect.any(String)
        })
      );
    });
  });

  describe('JSON Format Mode', () => {
    it('should output JSON when format is json', () => {
      const logger = createLogger({ level: 'info', format: 'json' });
      logger.info('test message');
      const output = consoleSpy.log.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should include all fields in JSON output', () => {
      const logger = createLogger({ level: 'info', format: 'json', prefix: '[Test]' });
      logger.info('test message', { extra: 'data' });
      const output = JSON.parse(consoleSpy.log.mock.calls[0][0]);
      expect(output).toMatchObject({
        level: 'INFO',
        message: 'test message',
        prefix: '[Test]',
        timestamp: expect.any(String),
        data: { extra: 'data' }
      });
    });

    it('should respect LOG_FORMAT environment variable', () => {
      process.env.LOG_FORMAT = 'json';
      const logger = createLogger({ level: 'info' });
      logger.info('test');
      const output = consoleSpy.log.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();
    });
  });

  describe('setLevel', () => {
    it('should allow changing log level at runtime', () => {
      const logger = createLogger({ level: 'info' });
      logger.debug('should not log');
      expect(consoleSpy.debug).not.toHaveBeenCalled();

      logger.setLevel('debug');
      logger.debug('should log now');
      expect(consoleSpy.debug).toHaveBeenCalled();
    });
  });

  describe('Default Export', () => {
    it('should provide a default logger instance', async () => {
      const { default: defaultLogger } = await import('../utils/logger.js');
      expect(defaultLogger).toBeDefined();
      expect(typeof defaultLogger.info).toBe('function');
      expect(typeof defaultLogger.warn).toBe('function');
      expect(typeof defaultLogger.error).toBe('function');
      expect(typeof defaultLogger.debug).toBe('function');
    });
  });
});
