// ═══════════════════════════════════════════════════════════════════════════════
// PER-AGENT RATE LIMITER TESTS (GAP-004)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for per-agent rate limiting functionality
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentRateLimiter, DEFAULT_AGENT_LIMITS } from '../utils/rate-limiter.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('AgentRateLimiter', () => {
  let limiter;
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rate-limit-test-'));
    limiter = new AgentRateLimiter({ projectPath: tempDir });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Basic Limit Checking', () => {
    it('should allow requests within limits', () => {
      const result = limiter.checkLimit('fe-dev-1', 1000);
      expect(result.allowed).toBe(true);
      expect(result.remaining.requests).toBeGreaterThan(0);
      expect(result.remaining.tokens).toBeGreaterThan(0);
    });

    it('should block requests exceeding request rate', () => {
      // Fill up request limit
      const limits = limiter.getLimits('fe-dev-1');
      for (let i = 0; i < limits.requests_per_minute; i++) {
        limiter.recordRequest('fe-dev-1', 100);
      }

      const result = limiter.checkLimit('fe-dev-1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('request_rate_exceeded');
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should block requests exceeding per-request token limit', () => {
      const limits = limiter.getLimits('fe-dev-1');
      const result = limiter.checkLimit('fe-dev-1', limits.max_tokens_per_request + 1000);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('tokens_per_request_exceeded');
    });

    it('should block requests exceeding token rate', () => {
      const limits = limiter.getLimits('fe-dev-1');
      // Use most of the token budget
      limiter.recordRequest('fe-dev-1', limits.tokens_per_minute - 100);

      // Try to use more than remaining
      const result = limiter.checkLimit('fe-dev-1', 500);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('token_rate_exceeded');
    });
  });

  describe('Request Recording', () => {
    it('should record requests correctly', () => {
      const result = limiter.recordRequest('fe-dev-1', 1000);
      expect(result.recorded).toBe(true);
      expect(result.requests).toBe(1);
      expect(result.tokens).toBe(1000);
    });

    it('should accumulate multiple requests', () => {
      limiter.recordRequest('fe-dev-1', 500);
      limiter.recordRequest('fe-dev-1', 600);
      limiter.recordRequest('fe-dev-1', 400);

      const result = limiter.recordRequest('fe-dev-1', 300);
      expect(result.requests).toBe(4);
      expect(result.tokens).toBe(1800);
    });
  });

  describe('Agent Type Recognition', () => {
    it('should extract agent type from numbered ID', () => {
      const feDevLimits = limiter.getLimits('fe-dev-1');
      const feDevLimits2 = limiter.getLimits('fe-dev-2');
      expect(feDevLimits).toEqual(feDevLimits2);
    });

    it('should use default limits for unknown agent types', () => {
      const unknownLimits = limiter.getLimits('unknown-agent-5');
      expect(unknownLimits).toEqual(DEFAULT_AGENT_LIMITS.default);
    });

    it('should have different limits for different agent types', () => {
      const feLimits = limiter.getLimits('fe-dev-1');
      const qaLimits = limiter.getLimits('qa');

      expect(feLimits.requests_per_minute).not.toEqual(qaLimits.requests_per_minute);
      expect(feLimits.budget_usd).not.toEqual(qaLimits.budget_usd);
    });
  });

  describe('Usage Tracking', () => {
    it('should return correct usage stats', () => {
      limiter.recordRequest('be-dev-1', 2000);
      limiter.recordRequest('be-dev-1', 1500);

      const usage = limiter.getUsage('be-dev-1');
      expect(usage.requests.used).toBe(2);
      expect(usage.tokens.used).toBe(3500);
      expect(usage.requests.percent).toBeGreaterThan(0);
    });

    it('should track usage for all agents', () => {
      limiter.recordRequest('fe-dev-1', 1000);
      limiter.recordRequest('be-dev-1', 2000);
      limiter.recordRequest('qa', 500);

      const allUsage = limiter.getAllUsage();
      expect(Object.keys(allUsage)).toHaveLength(3);
      expect(allUsage['fe-dev-1'].tokens.used).toBe(1000);
      expect(allUsage['be-dev-1'].tokens.used).toBe(2000);
      expect(allUsage['qa'].tokens.used).toBe(500);
    });
  });

  describe('Limit Updates', () => {
    it('should allow updating limits for agent types', () => {
      limiter.updateLimits('fe-dev', {
        requests_per_minute: 100,
        tokens_per_minute: 100000
      });

      const limits = limiter.getLimits('fe-dev-1');
      expect(limits.requests_per_minute).toBe(100);
      expect(limits.tokens_per_minute).toBe(100000);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset usage for a single agent', () => {
      limiter.recordRequest('fe-dev-1', 1000);
      limiter.recordRequest('be-dev-1', 2000);

      limiter.resetAgent('fe-dev-1');

      const feUsage = limiter.getUsage('fe-dev-1');
      const beUsage = limiter.getUsage('be-dev-1');

      expect(feUsage.requests.used).toBe(0);
      expect(beUsage.requests.used).toBe(1);
    });

    it('should reset usage for all agents', () => {
      limiter.recordRequest('fe-dev-1', 1000);
      limiter.recordRequest('be-dev-1', 2000);

      limiter.resetAll();

      const allUsage = limiter.getAllUsage();
      expect(Object.keys(allUsage)).toHaveLength(0);
    });
  });

  describe('HTTP Headers', () => {
    it('should return rate limit headers', () => {
      limiter.recordRequest('fe-dev-1', 1000);

      const headers = limiter.getHeaders('fe-dev-1');

      expect(headers['X-RateLimit-Limit']).toBe(DEFAULT_AGENT_LIMITS['fe-dev'].requests_per_minute);
      expect(headers['X-RateLimit-Remaining']).toBeLessThan(headers['X-RateLimit-Limit']);
      expect(headers['X-TokenLimit-Limit']).toBe(DEFAULT_AGENT_LIMITS['fe-dev'].tokens_per_minute);
    });
  });

  describe('Persistence', () => {
    it('should persist state to file', () => {
      limiter.recordRequest('fe-dev-1', 1000);

      const persistFile = path.join(tempDir, '.claude', 'rate-limits.json');
      expect(fs.existsSync(persistFile)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(persistFile, 'utf8'));
      expect(saved.agentWindows['fe-dev-1']).toBeDefined();
    });

    it('should load state from file on initialization', () => {
      // Record some requests
      limiter.recordRequest('fe-dev-1', 1000);
      limiter.recordRequest('fe-dev-1', 500);

      // Create new limiter instance
      const limiter2 = new AgentRateLimiter({ projectPath: tempDir });

      // State should be loaded
      const usage = limiter2.getUsage('fe-dev-1');
      expect(usage.requests.used).toBe(2);
      expect(usage.tokens.used).toBe(1500);
    });
  });

  describe('Sliding Window', () => {
    it('should clean old entries from window', async () => {
      // Use a very short window for testing
      const shortLimiter = new AgentRateLimiter({
        windowSize: 100, // 100ms window
        limits: {
          default: {
            requests_per_minute: 5,
            tokens_per_minute: 10000,
            max_tokens_per_request: 5000,
            budget_usd: 1
          }
        }
      });

      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        shortLimiter.recordRequest('test-agent', 100);
      }

      // Should be at limit
      let check = shortLimiter.checkLimit('test-agent');
      expect(check.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed now
      check = shortLimiter.checkLimit('test-agent');
      expect(check.allowed).toBe(true);
    });
  });

  describe('Default Limits', () => {
    it('should have reasonable defaults for all agent types', () => {
      const agentTypes = ['fe-dev', 'be-dev', 'qa', 'dev-fix', 'code-review', 'pm'];

      for (const type of agentTypes) {
        const limits = DEFAULT_AGENT_LIMITS[type];
        expect(limits).toBeDefined();
        expect(limits.requests_per_minute).toBeGreaterThan(0);
        expect(limits.tokens_per_minute).toBeGreaterThan(0);
        expect(limits.max_tokens_per_request).toBeGreaterThan(0);
        expect(limits.budget_usd).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // GAP-016: Configurable Rate Limits
  // ============================================

  describe('Environment Variable Configuration (GAP-016)', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      // Restore original environment
      for (const key of Object.keys(process.env)) {
        if (key.startsWith('AGENT_RATE_LIMIT_')) {
          delete process.env[key];
        }
      }
      Object.assign(process.env, originalEnv);
    });

    it('should override requests_per_minute from environment variable', () => {
      process.env.AGENT_RATE_LIMIT_FE_DEV_REQUESTS_PER_MINUTE = '100';

      const configuredLimiter = new AgentRateLimiter({ projectPath: tempDir });
      const limits = configuredLimiter.getLimits('fe-dev-1');

      expect(limits.requests_per_minute).toBe(100);
    });

    it('should override tokens_per_minute from environment variable', () => {
      process.env.AGENT_RATE_LIMIT_BE_DEV_TOKENS_PER_MINUTE = '100000';

      const configuredLimiter = new AgentRateLimiter({ projectPath: tempDir });
      const limits = configuredLimiter.getLimits('be-dev-1');

      expect(limits.tokens_per_minute).toBe(100000);
    });

    it('should override max_tokens_per_request from environment variable', () => {
      process.env.AGENT_RATE_LIMIT_QA_MAX_TOKENS_PER_REQUEST = '16000';

      const configuredLimiter = new AgentRateLimiter({ projectPath: tempDir });
      const limits = configuredLimiter.getLimits('qa');

      expect(limits.max_tokens_per_request).toBe(16000);
    });

    it('should override budget_usd from environment variable', () => {
      process.env.AGENT_RATE_LIMIT_DEV_FIX_BUDGET_USD = '2.50';

      const configuredLimiter = new AgentRateLimiter({ projectPath: tempDir });
      const limits = configuredLimiter.getLimits('dev-fix');

      expect(limits.budget_usd).toBe(2.50);
    });

    it('should override default agent type limits', () => {
      process.env.AGENT_RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE = '50';
      process.env.AGENT_RATE_LIMIT_DEFAULT_TOKENS_PER_MINUTE = '80000';

      const configuredLimiter = new AgentRateLimiter({ projectPath: tempDir });
      const limits = configuredLimiter.getLimits('unknown-agent-type');

      expect(limits.requests_per_minute).toBe(50);
      expect(limits.tokens_per_minute).toBe(80000);
    });

    it('should ignore invalid environment variable values', () => {
      process.env.AGENT_RATE_LIMIT_FE_DEV_REQUESTS_PER_MINUTE = 'invalid';

      const configuredLimiter = new AgentRateLimiter({ projectPath: tempDir });
      const limits = configuredLimiter.getLimits('fe-dev-1');

      // Should use default value
      expect(limits.requests_per_minute).toBe(DEFAULT_AGENT_LIMITS['fe-dev'].requests_per_minute);
    });

    it('should support multiple overrides for same agent type', () => {
      process.env.AGENT_RATE_LIMIT_FE_DEV_REQUESTS_PER_MINUTE = '60';
      process.env.AGENT_RATE_LIMIT_FE_DEV_TOKENS_PER_MINUTE = '80000';
      process.env.AGENT_RATE_LIMIT_FE_DEV_MAX_TOKENS_PER_REQUEST = '12000';
      process.env.AGENT_RATE_LIMIT_FE_DEV_BUDGET_USD = '1.00';

      const configuredLimiter = new AgentRateLimiter({ projectPath: tempDir });
      const limits = configuredLimiter.getLimits('fe-dev-1');

      expect(limits.requests_per_minute).toBe(60);
      expect(limits.tokens_per_minute).toBe(80000);
      expect(limits.max_tokens_per_request).toBe(12000);
      expect(limits.budget_usd).toBe(1.00);
    });
  });

  describe('Config File Loading (GAP-016)', () => {
    it('should load limits from config file if present', () => {
      // Create config file
      const configDir = path.join(tempDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });

      const configFile = path.join(configDir, 'rate-limits-config.json');
      const customConfig = {
        'fe-dev': {
          requests_per_minute: 75,
          tokens_per_minute: 90000
        }
      };
      fs.writeFileSync(configFile, JSON.stringify(customConfig, null, 2));

      const configuredLimiter = new AgentRateLimiter({ projectPath: tempDir });
      const limits = configuredLimiter.getLimits('fe-dev-1');

      expect(limits.requests_per_minute).toBe(75);
      expect(limits.tokens_per_minute).toBe(90000);
      // Other values should use defaults
      expect(limits.max_tokens_per_request).toBe(DEFAULT_AGENT_LIMITS['fe-dev'].max_tokens_per_request);
    });

    it('should prefer environment variables over config file', () => {
      // Create config file
      const configDir = path.join(tempDir, '.claude');
      fs.mkdirSync(configDir, { recursive: true });

      const configFile = path.join(configDir, 'rate-limits-config.json');
      const customConfig = {
        'fe-dev': {
          requests_per_minute: 75
        }
      };
      fs.writeFileSync(configFile, JSON.stringify(customConfig, null, 2));

      // Set environment variable (should take precedence)
      process.env.AGENT_RATE_LIMIT_FE_DEV_REQUESTS_PER_MINUTE = '100';

      const configuredLimiter = new AgentRateLimiter({ projectPath: tempDir });
      const limits = configuredLimiter.getLimits('fe-dev-1');

      expect(limits.requests_per_minute).toBe(100);

      delete process.env.AGENT_RATE_LIMIT_FE_DEV_REQUESTS_PER_MINUTE;
    });
  });
});
