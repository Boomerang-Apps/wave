// ═══════════════════════════════════════════════════════════════════════════════
// BUDGET ENFORCER TESTS (TDD - Written First)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for IMP-009: Automatic pipeline halt on budget exceeded
// Based on Portkey, LiteLLM, and TrueFoundry best practices
//
// Sources:
// - https://portkey.ai/blog/budget-limits-and-alerts-in-llm-apps/
// - https://docs.litellm.ai/docs/proxy/users
// - https://www.truefoundry.com/blog/llm-cost-tracking-solution
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import the module we're going to implement
import {
  BudgetEnforcer,
  BUDGET_STATUS,
  ALERT_THRESHOLDS,
  createBudgetMiddleware,
  checkBudgetStatus,
  triggerEmergencyStop
} from '../utils/budget-enforcer.js';

describe('BudgetEnforcer', () => {
  let enforcer;
  let tempDir;
  const TEST_BUDGET = 10.00; // $10 test budget

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-test-'));
    enforcer = new BudgetEnforcer({
      budgetLimit: TEST_BUDGET,
      claudeDir: tempDir,
      alertThresholds: { warning: 0.70, critical: 0.90, exceeded: 1.00 }
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC1: Create EMERGENCY-STOP file when budget >= 100%
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC1: Emergency Stop File Creation', () => {
    it('should create EMERGENCY-STOP file when budget exceeded', async () => {
      enforcer.recordSpend(10.00); // 100% of budget

      await enforcer.checkAndEnforce();

      const stopFile = path.join(tempDir, 'EMERGENCY-STOP');
      expect(fs.existsSync(stopFile)).toBe(true);
    });

    it('should create EMERGENCY-STOP file within 1 second', async () => {
      enforcer.recordSpend(10.01); // Over budget

      const start = Date.now();
      await enforcer.checkAndEnforce();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(fs.existsSync(path.join(tempDir, 'EMERGENCY-STOP'))).toBe(true);
    });

    it('should include reason in EMERGENCY-STOP file', async () => {
      enforcer.recordSpend(12.00); // 120% of budget

      await enforcer.checkAndEnforce();

      const stopFile = path.join(tempDir, 'EMERGENCY-STOP');
      const content = fs.readFileSync(stopFile, 'utf8');

      expect(content).toContain('BUDGET EXCEEDED');
      expect(content).toContain('12.00');
      expect(content).toContain('10.00');
    });

    it('should NOT create EMERGENCY-STOP when under budget', async () => {
      enforcer.recordSpend(5.00); // 50% of budget

      await enforcer.checkAndEnforce();

      const stopFile = path.join(tempDir, 'EMERGENCY-STOP');
      expect(fs.existsSync(stopFile)).toBe(false);
    });

    it('should NOT create EMERGENCY-STOP at exactly warning threshold', async () => {
      enforcer.recordSpend(7.00); // 70% of budget

      await enforcer.checkAndEnforce();

      const stopFile = path.join(tempDir, 'EMERGENCY-STOP');
      expect(fs.existsSync(stopFile)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC2: Return 503 on all API calls after budget exceeded
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC2: API Blocking (503 Response)', () => {
    it('should return blocked=true when budget exceeded', async () => {
      enforcer.recordSpend(10.00);

      const status = await enforcer.checkAndEnforce();

      expect(status.blocked).toBe(true);
      expect(status.statusCode).toBe(503);
    });

    it('should include budget_exceeded error type', async () => {
      enforcer.recordSpend(11.00);

      const status = await enforcer.checkAndEnforce();

      expect(status.error).toBeDefined();
      expect(status.error.type).toBe('budget_exceeded');
      expect(status.error.message).toContain('exceeded');
    });

    it('should include Retry-After header suggestion', async () => {
      enforcer.recordSpend(10.00);

      const status = await enforcer.checkAndEnforce();

      expect(status.headers).toBeDefined();
      expect(status.headers['Retry-After']).toBeDefined();
    });

    it('should allow requests when under budget', async () => {
      enforcer.recordSpend(5.00);

      const status = await enforcer.checkAndEnforce();

      expect(status.blocked).toBe(false);
      expect(status.statusCode).toBe(200);
    });

    it('should block even at exactly 100%', async () => {
      enforcer.recordSpend(10.00); // Exactly 100%

      const status = await enforcer.checkAndEnforce();

      expect(status.blocked).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC3: Send CRITICAL Slack notification on budget exceeded
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC3: Slack Notifications', () => {
    it('should trigger critical notification on exceeded', async () => {
      const notifyCallback = vi.fn();
      enforcer.setNotifyCallback(notifyCallback);
      enforcer.recordSpend(10.00);

      await enforcer.checkAndEnforce();

      expect(notifyCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          type: 'budget_exceeded'
        })
      );
    });

    it('should include spent and budget amounts in notification', async () => {
      const notifyCallback = vi.fn();
      enforcer.setNotifyCallback(notifyCallback);
      enforcer.recordSpend(12.50);

      await enforcer.checkAndEnforce();

      expect(notifyCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          spent: 12.50,
          budget: 10.00,
          percentage: 125
        })
      );
    });

    it('should send warning notification at 70%', async () => {
      const notifyCallback = vi.fn();
      enforcer.setNotifyCallback(notifyCallback);
      enforcer.recordSpend(7.00);

      await enforcer.checkAndEnforce();

      expect(notifyCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warning',
          type: 'budget_warning'
        })
      );
    });

    it('should send critical notification at 90%', async () => {
      const notifyCallback = vi.fn();
      enforcer.setNotifyCallback(notifyCallback);
      enforcer.recordSpend(9.00);

      await enforcer.checkAndEnforce();

      expect(notifyCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          type: 'budget_critical'
        })
      );
    });

    it('should not send notification under 70%', async () => {
      const notifyCallback = vi.fn();
      enforcer.setNotifyCallback(notifyCallback);
      enforcer.recordSpend(5.00);

      await enforcer.checkAndEnforce();

      expect(notifyCallback).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC4: Log budget exceeded event with full context
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC4: Audit Logging', () => {
    it('should log exceeded event with timestamp', async () => {
      const logCallback = vi.fn();
      enforcer.setLogCallback(logCallback);
      enforcer.recordSpend(10.00);

      await enforcer.checkAndEnforce();

      expect(logCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          event: 'budget_exceeded'
        })
      );
    });

    it('should include agent context in log', async () => {
      const logCallback = vi.fn();
      enforcer.setLogCallback(logCallback);
      enforcer.setContext({ agent: 'fe-dev-1', wave: 1, story: 'STORY-001' });
      enforcer.recordSpend(10.00);

      await enforcer.checkAndEnforce();

      expect(logCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: 'fe-dev-1',
          wave: 1,
          story: 'STORY-001'
        })
      );
    });

    it('should log action taken', async () => {
      const logCallback = vi.fn();
      enforcer.setLogCallback(logCallback);
      enforcer.recordSpend(10.00);

      await enforcer.checkAndEnforce();

      expect(logCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'emergency_stop_triggered'
        })
      );
    });

    it('should include spent and budget in log', async () => {
      const logCallback = vi.fn();
      enforcer.setLogCallback(logCallback);
      enforcer.recordSpend(15.00);

      await enforcer.checkAndEnforce();

      expect(logCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          spent: 15.00,
          budget: 10.00,
          percentage: 150
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC5: Prevent race conditions on concurrent budget checks
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC5: Concurrency & Race Conditions', () => {
    it('should only create one EMERGENCY-STOP file with concurrent checks', async () => {
      enforcer.recordSpend(10.00);

      // Simulate 10 concurrent budget checks
      const checks = Array(10).fill(null).map(() => enforcer.checkAndEnforce());
      await Promise.all(checks);

      const stopFile = path.join(tempDir, 'EMERGENCY-STOP');
      expect(fs.existsSync(stopFile)).toBe(true);

      // Verify only one file exists (no duplicates)
      const files = fs.readdirSync(tempDir).filter(f => f.includes('EMERGENCY'));
      expect(files.length).toBe(1);
    });

    it('should handle concurrent spend recording', async () => {
      // Simulate concurrent spend recordings
      const recordings = Array(5).fill(null).map(() => enforcer.recordSpend(2.00));

      expect(enforcer.getSpent()).toBe(10.00);
    });

    it('should use atomic file operations', async () => {
      enforcer.recordSpend(10.00);

      // Check should use atomic write (write to temp, then rename)
      await enforcer.checkAndEnforce();

      // No partial files should exist
      const files = fs.readdirSync(tempDir);
      expect(files.every(f => !f.endsWith('.tmp'))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC6: Support alert thresholds at 70%, 90%, 100%
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC6: Alert Thresholds', () => {
    it('should return OK status under 70%', async () => {
      enforcer.recordSpend(6.99);

      const status = await enforcer.checkAndEnforce();

      expect(status.status).toBe(BUDGET_STATUS.OK);
    });

    it('should return WARNING status at 70-89%', async () => {
      enforcer.recordSpend(7.50);

      const status = await enforcer.checkAndEnforce();

      expect(status.status).toBe(BUDGET_STATUS.WARNING);
    });

    it('should return CRITICAL status at 90-99%', async () => {
      enforcer.recordSpend(9.50);

      const status = await enforcer.checkAndEnforce();

      expect(status.status).toBe(BUDGET_STATUS.CRITICAL);
    });

    it('should return EXCEEDED status at 100%+', async () => {
      enforcer.recordSpend(10.00);

      const status = await enforcer.checkAndEnforce();

      expect(status.status).toBe(BUDGET_STATUS.EXCEEDED);
    });

    it('should support custom thresholds', () => {
      const customEnforcer = new BudgetEnforcer({
        budgetLimit: 100,
        claudeDir: tempDir,
        alertThresholds: { warning: 0.50, critical: 0.80, exceeded: 1.00 }
      });

      customEnforcer.recordSpend(50);
      expect(customEnforcer.getStatus()).toBe(BUDGET_STATUS.WARNING);

      customEnforcer.recordSpend(30);
      expect(customEnforcer.getStatus()).toBe(BUDGET_STATUS.CRITICAL);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Middleware Integration
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Middleware Integration', () => {
    it('should create Express middleware', () => {
      const middleware = createBudgetMiddleware(enforcer);

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    it('should call next() when under budget', async () => {
      const middleware = createBudgetMiddleware(enforcer);
      enforcer.recordSpend(5.00);

      const req = {};
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 503 when budget exceeded', async () => {
      const middleware = createBudgetMiddleware(enforcer);
      enforcer.recordSpend(10.00);
      await enforcer.checkAndEnforce(); // Trigger emergency stop

      const req = {};
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        set: vi.fn()
      };
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            type: 'budget_exceeded'
          })
        })
      );
    });

    it('should check EMERGENCY-STOP file existence', async () => {
      const middleware = createBudgetMiddleware(enforcer);

      // Manually create EMERGENCY-STOP file
      fs.writeFileSync(path.join(tempDir, 'EMERGENCY-STOP'), 'Manual stop');

      const req = {};
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        set: vi.fn()
      };
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility Functions
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Utility Functions', () => {
    it('checkBudgetStatus should return current status', () => {
      enforcer.recordSpend(9.50); // 95% - in CRITICAL range (90-99%)

      const status = checkBudgetStatus(enforcer);

      expect(status).toHaveProperty('spent', 9.50);
      expect(status).toHaveProperty('budget', 10.00);
      expect(status).toHaveProperty('percentage', 95);
      expect(status).toHaveProperty('status', BUDGET_STATUS.CRITICAL);
    });

    it('triggerEmergencyStop should force stop', async () => {
      const result = await triggerEmergencyStop(tempDir, 'Manual trigger for testing');

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'EMERGENCY-STOP'))).toBe(true);
    });

    it('should export ALERT_THRESHOLDS constants', () => {
      expect(ALERT_THRESHOLDS).toHaveProperty('WARNING', 0.70);
      expect(ALERT_THRESHOLDS).toHaveProperty('CRITICAL', 0.90);
      expect(ALERT_THRESHOLDS).toHaveProperty('EXCEEDED', 1.00);
    });

    it('should export BUDGET_STATUS constants', () => {
      expect(BUDGET_STATUS).toHaveProperty('OK');
      expect(BUDGET_STATUS).toHaveProperty('WARNING');
      expect(BUDGET_STATUS).toHaveProperty('CRITICAL');
      expect(BUDGET_STATUS).toHaveProperty('EXCEEDED');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Recovery & Reset
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Recovery & Reset', () => {
    it('should support manual budget reset', () => {
      enforcer.recordSpend(10.00);
      expect(enforcer.getSpent()).toBe(10.00);

      enforcer.reset();

      expect(enforcer.getSpent()).toBe(0);
    });

    it('should support clearing EMERGENCY-STOP', async () => {
      enforcer.recordSpend(10.00);
      await enforcer.checkAndEnforce();

      expect(fs.existsSync(path.join(tempDir, 'EMERGENCY-STOP'))).toBe(true);

      await enforcer.clearEmergencyStop({ confirm: true });

      expect(fs.existsSync(path.join(tempDir, 'EMERGENCY-STOP'))).toBe(false);
    });

    it('should require explicit confirmation to clear stop', async () => {
      enforcer.recordSpend(10.00);
      await enforcer.checkAndEnforce();

      // Without confirmation, should not clear
      await expect(enforcer.clearEmergencyStop()).rejects.toThrow(/confirm/i);

      // With confirmation, should clear
      await enforcer.clearEmergencyStop({ confirm: true });
      expect(fs.existsSync(path.join(tempDir, 'EMERGENCY-STOP'))).toBe(false);
    });
  });
});
