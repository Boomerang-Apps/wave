/**
 * Rate Limit Configuration Tests (CQ-006)
 *
 * TDD tests for configurable rate limiting.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getRateLimitConfig,
  getAllRateLimitConfigs,
  createRateLimitConfig,
  getAvailablePresets,
  getPresetDefaults
} from '../utils/rate-limit-config.js';

describe('Rate Limit Configuration (CQ-006)', () => {
  // Store original env
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear rate limit env vars before each test
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('RATE_LIMIT_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getRateLimitConfig
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getRateLimitConfig', () => {
    it('should return default config for api preset', () => {
      const config = getRateLimitConfig('api');

      expect(config.enabled).toBe(true);
      expect(config.windowMs).toBe(60000);
      expect(config.maxRequests).toBe(100);
      expect(typeof config.keyGenerator).toBe('function');
    });

    it('should return default config for auth preset', () => {
      const config = getRateLimitConfig('auth');

      expect(config.windowMs).toBe(900000); // 15 minutes
      expect(config.maxRequests).toBe(5);
    });

    it('should return default config for upload preset', () => {
      const config = getRateLimitConfig('upload');

      expect(config.windowMs).toBe(3600000); // 1 hour
      expect(config.maxRequests).toBe(50);
    });

    it('should return default config for webhook preset', () => {
      const config = getRateLimitConfig('webhook');

      expect(config.windowMs).toBe(60000);
      expect(config.maxRequests).toBe(500);
    });

    it('should return default config for heavy preset', () => {
      const config = getRateLimitConfig('heavy');

      expect(config.windowMs).toBe(60000);
      expect(config.maxRequests).toBe(10);
    });

    it('should return default config for health preset', () => {
      const config = getRateLimitConfig('health');

      expect(config.windowMs).toBe(1000);
      expect(config.maxRequests).toBe(100);
    });

    it('should throw for unknown preset', () => {
      expect(() => getRateLimitConfig('unknown')).toThrow('Unknown rate limit preset');
    });

    it('should override with environment variables', () => {
      process.env.RATE_LIMIT_API_WINDOW_MS = '120000';
      process.env.RATE_LIMIT_API_MAX_REQUESTS = '200';

      const config = getRateLimitConfig('api');

      expect(config.windowMs).toBe(120000);
      expect(config.maxRequests).toBe(200);
    });

    it('should override with programmatic values', () => {
      const config = getRateLimitConfig('api', {
        windowMs: 30000,
        maxRequests: 50
      });

      expect(config.windowMs).toBe(30000);
      expect(config.maxRequests).toBe(50);
    });

    it('should prioritize programmatic overrides over env vars', () => {
      process.env.RATE_LIMIT_API_MAX_REQUESTS = '200';

      const config = getRateLimitConfig('api', { maxRequests: 25 });

      expect(config.maxRequests).toBe(25);
    });

    it('should handle disabled preset', () => {
      process.env.RATE_LIMIT_API_ENABLED = 'false';

      const config = getRateLimitConfig('api');

      expect(config.enabled).toBe(false);
    });

    it('should handle disabled preset with 0', () => {
      process.env.RATE_LIMIT_AUTH_ENABLED = '0';

      const config = getRateLimitConfig('auth');

      expect(config.enabled).toBe(false);
    });

    it('should handle invalid env values gracefully', () => {
      process.env.RATE_LIMIT_API_WINDOW_MS = 'invalid';
      process.env.RATE_LIMIT_API_MAX_REQUESTS = 'notanumber';

      const config = getRateLimitConfig('api');

      // Should fall back to defaults
      expect(config.windowMs).toBe(60000);
      expect(config.maxRequests).toBe(100);
    });

    it('should include keyGenerator function', () => {
      const config = getRateLimitConfig('api');

      const mockReq = { ip: '192.168.1.1' };
      expect(config.keyGenerator(mockReq)).toBe('192.168.1.1');
    });

    it('should use connection.remoteAddress as fallback', () => {
      const config = getRateLimitConfig('api');

      const mockReq = { connection: { remoteAddress: '10.0.0.1' } };
      expect(config.keyGenerator(mockReq)).toBe('10.0.0.1');
    });

    it('should return unknown for missing IP', () => {
      const config = getRateLimitConfig('api');

      const mockReq = {};
      expect(config.keyGenerator(mockReq)).toBe('unknown');
    });

    it('should allow custom skip function', () => {
      const skipFn = vi.fn().mockReturnValue(true);
      const config = getRateLimitConfig('api', { skip: skipFn });

      expect(config.skip()).toBe(true);
      expect(skipFn).toHaveBeenCalled();
    });

    it('should allow custom message', () => {
      const config = getRateLimitConfig('api', {
        message: 'Custom rate limit message'
      });

      expect(config.message).toBe('Custom rate limit message');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getAllRateLimitConfigs
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getAllRateLimitConfigs', () => {
    it('should return all preset configurations', () => {
      const configs = getAllRateLimitConfigs();

      expect(configs).toHaveProperty('api');
      expect(configs).toHaveProperty('auth');
      expect(configs).toHaveProperty('upload');
      expect(configs).toHaveProperty('webhook');
      expect(configs).toHaveProperty('heavy');
      expect(configs).toHaveProperty('health');
    });

    it('should apply env vars to all configs', () => {
      process.env.RATE_LIMIT_AUTH_MAX_REQUESTS = '10';

      const configs = getAllRateLimitConfigs();

      expect(configs.auth.maxRequests).toBe(10);
      expect(configs.api.maxRequests).toBe(100); // Unchanged
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // createRateLimitConfig
  // ─────────────────────────────────────────────────────────────────────────────

  describe('createRateLimitConfig', () => {
    it('should create custom configuration', () => {
      const config = createRateLimitConfig({
        windowMs: 30000,
        maxRequests: 25
      });

      expect(config.enabled).toBe(true);
      expect(config.windowMs).toBe(30000);
      expect(config.maxRequests).toBe(25);
    });

    it('should throw for missing windowMs', () => {
      expect(() => createRateLimitConfig({ maxRequests: 10 }))
        .toThrow('windowMs must be a positive number');
    });

    it('should throw for missing maxRequests', () => {
      expect(() => createRateLimitConfig({ windowMs: 60000 }))
        .toThrow('maxRequests must be a positive number');
    });

    it('should throw for invalid windowMs', () => {
      expect(() => createRateLimitConfig({ windowMs: -1, maxRequests: 10 }))
        .toThrow('windowMs must be a positive number');
    });

    it('should throw for invalid maxRequests', () => {
      expect(() => createRateLimitConfig({ windowMs: 60000, maxRequests: 0 }))
        .toThrow('maxRequests must be a positive number');
    });

    it('should allow custom message', () => {
      const config = createRateLimitConfig({
        windowMs: 60000,
        maxRequests: 10,
        message: 'Custom message'
      });

      expect(config.message).toBe('Custom message');
    });

    it('should allow custom keyGenerator', () => {
      const keyGen = vi.fn().mockReturnValue('custom-key');
      const config = createRateLimitConfig({
        windowMs: 60000,
        maxRequests: 10,
        keyGenerator: keyGen
      });

      expect(config.keyGenerator({})).toBe('custom-key');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getAvailablePresets
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getAvailablePresets', () => {
    it('should return list of preset names', () => {
      const presets = getAvailablePresets();

      expect(presets).toContain('api');
      expect(presets).toContain('auth');
      expect(presets).toContain('upload');
      expect(presets).toContain('webhook');
      expect(presets).toContain('heavy');
      expect(presets).toContain('health');
      expect(presets).toHaveLength(6);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getPresetDefaults
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getPresetDefaults', () => {
    it('should return defaults without env overrides', () => {
      process.env.RATE_LIMIT_API_MAX_REQUESTS = '999';

      const defaults = getPresetDefaults('api');

      // Should ignore env var
      expect(defaults.maxRequests).toBe(100);
      expect(defaults.windowMs).toBe(60000);
    });

    it('should throw for unknown preset', () => {
      expect(() => getPresetDefaults('unknown')).toThrow('Unknown rate limit preset');
    });

    it('should return a copy (not reference)', () => {
      const defaults1 = getPresetDefaults('api');
      const defaults2 = getPresetDefaults('api');

      defaults1.maxRequests = 999;

      expect(defaults2.maxRequests).toBe(100);
    });
  });
});
