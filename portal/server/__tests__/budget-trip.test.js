// ═══════════════════════════════════════════════════════════════════════════════
// BUDGET TRIP TEST - END-TO-END BUDGET ENFORCEMENT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════
// IMP-010: Integration test that validates the complete budget enforcement pipeline
//
// Sources:
// - https://langfuse.com/blog/2025-10-21-testing-llm-applications
// - https://www.truefoundry.com/blog/llm-cost-tracking-solution
// - https://gatling.io/use-cases/ai-llms
//
// Purpose: Verify that budget enforcement triggers correctly end-to-end
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  BudgetEnforcer,
  createBudgetMiddleware,
  BUDGET_STATUS
} from '../utils/budget-enforcer.js';
import {
  runBudgetTripTest,
  BudgetTripTestRunner,
  TRIP_TEST_DEFAULTS
} from '../utils/budget-trip-runner.js';

describe('Budget Trip Test', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-trip-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC1: Trip test triggers emergency stop within 5 seconds
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC1: Latency Requirements', () => {
    it('should complete trip test within 5 seconds', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir
      });

      const result = await runner.run();

      expect(result.totalLatency).toBeLessThan(5000);
      expect(result.success).toBe(true);
    });

    it('should measure spend-to-detect latency', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir
      });

      const result = await runner.run();

      expect(result.latencies).toHaveProperty('spendToDetect');
      expect(result.latencies.spendToDetect).toBeLessThan(1000);
    });

    it('should measure detect-to-stop latency', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir
      });

      const result = await runner.run();

      expect(result.latencies).toHaveProperty('detectToStop');
      expect(result.latencies.detectToStop).toBeLessThan(1000);
    });

    it('should measure stop-to-verified latency', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir
      });

      const result = await runner.run();

      expect(result.latencies).toHaveProperty('stopToVerified');
      expect(result.latencies.stopToVerified).toBeLessThan(100);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC2: Trip test verifies EMERGENCY-STOP file created
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC2: EMERGENCY-STOP File Verification', () => {
    it('should create EMERGENCY-STOP file during trip test', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir
      });

      const result = await runner.run();

      expect(result.emergencyStopCreated).toBe(true);
    });

    it('should verify EMERGENCY-STOP file contains budget info', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.05,
        claudeDir: tempDir,
        skipCleanup: true // Keep file for inspection
      });

      const result = await runner.run();

      const stopFile = path.join(tempDir, 'EMERGENCY-STOP');
      expect(fs.existsSync(stopFile)).toBe(true);

      const content = fs.readFileSync(stopFile, 'utf8');
      expect(content).toContain('BUDGET EXCEEDED');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC3: Trip test verifies 503 responses returned
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC3: 503 Response Verification', () => {
    it('should verify middleware returns 503 after trip', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir
      });

      const result = await runner.run();

      expect(result.middlewareBlocked).toBe(true);
      expect(result.responseCode).toBe(503);
    });

    it('should verify error type is budget_exceeded', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir
      });

      const result = await runner.run();

      expect(result.errorType).toBe('budget_exceeded');
    });

    it('should verify Retry-After header is set', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir
      });

      const result = await runner.run();

      expect(result.retryAfterSet).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC4: Trip test logs detailed latency metrics
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC4: Latency Logging', () => {
    it('should include all latency metrics in result', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir
      });

      const result = await runner.run();

      expect(result.latencies).toHaveProperty('spendToDetect');
      expect(result.latencies).toHaveProperty('detectToStop');
      expect(result.latencies).toHaveProperty('stopToVerified');
      expect(result).toHaveProperty('totalLatency');
    });

    it('should log latencies via callback', async () => {
      const logCallback = vi.fn();
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir,
        logCallback
      });

      await runner.run();

      expect(logCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'budget_trip_test',
          latencies: expect.any(Object)
        })
      );
    });

    it('should include timestamp in log', async () => {
      const logCallback = vi.fn();
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir,
        logCallback
      });

      await runner.run();

      expect(logCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC5: Trip test supports configurable budget amount
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC5: Configurable Budget', () => {
    it('should support custom budget of $0.01', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir
      });

      const result = await runner.run();

      expect(result.budgetUsed).toBe(0.01);
      expect(result.success).toBe(true);
    });

    it('should support custom budget of $1.00', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 1.00,
        claudeDir: tempDir
      });

      const result = await runner.run();

      expect(result.budgetUsed).toBe(1.00);
      expect(result.success).toBe(true);
    });

    it('should have default budget from TRIP_TEST_DEFAULTS', () => {
      expect(TRIP_TEST_DEFAULTS).toHaveProperty('budget');
      expect(TRIP_TEST_DEFAULTS.budget).toBe(0.01);
    });

    it('should support convenience function with defaults', async () => {
      const result = await runBudgetTripTest({
        claudeDir: tempDir
      });

      expect(result.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC6: Trip test cleans up after itself
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC6: Cleanup', () => {
    it('should remove EMERGENCY-STOP file after test by default', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir
      });

      await runner.run();

      const stopFile = path.join(tempDir, 'EMERGENCY-STOP');
      expect(fs.existsSync(stopFile)).toBe(false);
    });

    it('should support skipCleanup option', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir,
        skipCleanup: true
      });

      await runner.run();

      const stopFile = path.join(tempDir, 'EMERGENCY-STOP');
      expect(fs.existsSync(stopFile)).toBe(true);

      // Manual cleanup for test
      fs.unlinkSync(stopFile);
    });

    it('should not leave temp files', async () => {
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir
      });

      await runner.run();

      const files = fs.readdirSync(tempDir);
      const tempFiles = files.filter(f => f.endsWith('.tmp'));
      expect(tempFiles.length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Additional Integration Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Integration Scenarios', () => {
    it('should handle concurrent trip tests', async () => {
      // Create separate temp dirs for each runner
      const tempDirs = [1, 2, 3].map(() =>
        fs.mkdtempSync(path.join(os.tmpdir(), 'budget-trip-concurrent-'))
      );

      const runners = tempDirs.map(dir =>
        new BudgetTripTestRunner({ budget: 0.01, claudeDir: dir })
      );

      const results = await Promise.all(runners.map(r => r.run()));

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Cleanup
      tempDirs.forEach(dir => {
        fs.rmSync(dir, { recursive: true, force: true });
      });
    });

    it('should handle notification callback during trip', async () => {
      const notifyCallback = vi.fn();
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir,
        notifyCallback
      });

      await runner.run();

      expect(notifyCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          type: 'budget_exceeded'
        })
      );
    });

    it('should report test failure when enforcement fails', async () => {
      // Create a runner that simulates a failure scenario
      const runner = new BudgetTripTestRunner({
        budget: 0.01,
        claudeDir: tempDir,
        simulateFailure: true
      });

      const result = await runner.run();

      expect(result.success).toBe(false);
      expect(result.failureReason).toBeDefined();
    });
  });
});
