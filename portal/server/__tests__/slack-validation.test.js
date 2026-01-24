// ═══════════════════════════════════════════════════════════════════════════════
// SLACK VALIDATION TESTS (TDD)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for Slack configuration validation - written BEFORE implementation
// per TDD methodology for WAVE5-SLACK-001 redesign
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// These will be implemented after tests are written
import {
  validateSlackConfig,
  validateWebhookUrl,
  validateBotToken,
  validateChannelRouting,
  runSlackHealthCheck,
  getValidationStatus
} from '../slack-validation.js';

describe('Slack Configuration Validation', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Webhook URL Validation
  // ─────────────────────────────────────────────────────────────────────────────

  describe('validateWebhookUrl', () => {
    it('should pass for valid Slack webhook URL', () => {
      const result = validateWebhookUrl('https://hooks.slack.com/services/T00/B00/xxx');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for empty URL', () => {
      const result = validateWebhookUrl('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Webhook URL is required');
    });

    it('should fail for null URL', () => {
      const result = validateWebhookUrl(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Webhook URL is required');
    });

    it('should fail for non-Slack URL', () => {
      const result = validateWebhookUrl('https://example.com/webhook');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('URL must be a Slack webhook (https://hooks.slack.com/...)');
    });

    it('should fail for HTTP (non-HTTPS) URL', () => {
      const result = validateWebhookUrl('http://hooks.slack.com/services/T00/B00/xxx');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Webhook URL must use HTTPS');
    });

    it('should fail for malformed URL', () => {
      const result = validateWebhookUrl('not-a-url');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    it('should accept workflow webhook URLs', () => {
      const result = validateWebhookUrl('https://hooks.slack.com/workflows/T00/xxx');

      expect(result.valid).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Bot Token Validation
  // ─────────────────────────────────────────────────────────────────────────────

  describe('validateBotToken', () => {
    it('should pass for valid bot token format', () => {
      const result = validateBotToken('xoxb-123456789-123456789-abcdefghijklmnop');

      expect(result.valid).toBe(true);
    });

    it('should pass for user token format', () => {
      const result = validateBotToken('xoxp-123456789-123456789-abcdefghijklmnop');

      expect(result.valid).toBe(true);
    });

    it('should return optional=true when empty (not required)', () => {
      const result = validateBotToken('');

      expect(result.valid).toBe(true);
      expect(result.optional).toBe(true);
      expect(result.message).toBe('Bot token not configured (optional)');
    });

    it('should fail for invalid token format', () => {
      const result = validateBotToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token format (must start with xoxb- or xoxp-)');
    });

    it('should warn if token looks like a webhook', () => {
      const result = validateBotToken('https://hooks.slack.com/services/xxx');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('appears to be a webhook URL');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Channel Routing Validation
  // ─────────────────────────────────────────────────────────────────────────────

  describe('validateChannelRouting', () => {
    it('should pass when all channels are configured', () => {
      const result = validateChannelRouting({
        default: 'C0123456789',
        alerts: 'C0123456789',
        budget: 'C0123456789'
      });

      expect(result.valid).toBe(true);
      expect(result.configured).toEqual(['default', 'alerts', 'budget']);
    });

    it('should pass with only default channel (minimum config)', () => {
      const result = validateChannelRouting({
        default: 'C0123456789'
      });

      expect(result.valid).toBe(true);
      expect(result.configured).toEqual(['default']);
      expect(result.missing).toEqual(['alerts', 'budget']);
    });

    it('should fail when no channels configured', () => {
      const result = validateChannelRouting({});

      expect(result.valid).toBe(false);
      expect(result.error).toBe('At least one channel must be configured');
    });

    it('should validate channel ID format (starts with C)', () => {
      const result = validateChannelRouting({
        default: 'invalid-channel'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid channel ID format');
    });

    it('should accept channel names with # prefix', () => {
      const result = validateChannelRouting({
        default: '#wave-updates'
      });

      expect(result.valid).toBe(true);
      expect(result.warning).toBe('Channel names may not work with all API methods. Use channel IDs for reliability.');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Full Configuration Validation
  // ─────────────────────────────────────────────────────────────────────────────

  describe('validateSlackConfig', () => {
    it('should return all checks with pass/fail status', () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
        botToken: 'xoxb-123-456-abc',
        channels: {
          default: 'C0123456789',
          alerts: 'C0123456789'
        }
      };

      const result = validateSlackConfig(config);

      expect(result.checks).toHaveLength(6);
      expect(result.checks.map(c => c.name)).toEqual([
        'Webhook URL configured',
        'Webhook URL valid format',
        'Bot token configured',
        'Channel routing defined',
        'Ping test ready',
        'Recent delivery success'
      ]);
    });

    it('should calculate overall status correctly', () => {
      const validConfig = {
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
        channels: { default: 'C0123456789' }
      };

      const result = validateSlackConfig(validConfig);

      expect(result.passed).toBeGreaterThan(0);
      expect(result.total).toBe(6);
      expect(result.percentage).toBeGreaterThan(0);
    });

    it('should mark optional checks differently', () => {
      const minimalConfig = {
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx'
      };

      const result = validateSlackConfig(minimalConfig);

      const botTokenCheck = result.checks.find(c => c.name === 'Bot token configured');
      expect(botTokenCheck.status).toBe('optional');
    });

    it('should return ready=true when minimum requirements met', () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx'
      };

      const result = validateSlackConfig(config);

      expect(result.ready).toBe(true);
    });

    it('should return ready=false when webhook missing', () => {
      const result = validateSlackConfig({});

      expect(result.ready).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Health Check (Live Test)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('runSlackHealthCheck', () => {
    it('should return success for valid webhook', async () => {
      // Mock successful fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      });

      const result = await runSlackHealthCheck({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx'
      });

      expect(result.success).toBe(true);
      expect(result.latency).toBeDefined();
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return failure for invalid webhook', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await runSlackHealthCheck({
        webhookUrl: 'https://hooks.slack.com/services/invalid'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await runSlackHealthCheck({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should timeout after specified duration', async () => {
      // Mock fetch that respects AbortSignal
      global.fetch = vi.fn().mockImplementation((url, options) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve({ ok: true }), 10000);
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              clearTimeout(timer);
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }
        });
      });

      const result = await runSlackHealthCheck({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
        timeout: 100
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    }, 2000);

    it('should skip health check when disabled', async () => {
      const result = await runSlackHealthCheck({
        enabled: false
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('Notifications disabled');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Validation Status Summary
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getValidationStatus', () => {
    it('should return structured status for UI display', () => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
        botToken: 'xoxb-123-456-abc',
        channels: { default: 'C0123456789' }
      };

      const status = getValidationStatus(config);

      expect(status).toMatchObject({
        ready: expect.any(Boolean),
        percentage: expect.any(Number),
        passed: expect.any(Number),
        failed: expect.any(Number),
        optional: expect.any(Number),
        checks: expect.any(Array)
      });
    });

    it('should include download guide content', () => {
      const status = getValidationStatus({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx'
      });

      expect(status.setupGuide).toBeDefined();
      expect(status.setupGuide).toContain('# Slack');
    });
  });
});
