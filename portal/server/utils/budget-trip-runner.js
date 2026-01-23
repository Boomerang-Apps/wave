// ═══════════════════════════════════════════════════════════════════════════════
// BUDGET TRIP TEST RUNNER - END-TO-END BUDGET ENFORCEMENT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════
// IMP-010: Integration test runner for validating budget enforcement pipeline
//
// Sources:
// - https://langfuse.com/blog/2025-10-21-testing-llm-applications
// - https://www.truefoundry.com/blog/llm-cost-tracking-solution
// - https://gatling.io/use-cases/ai-llms
//
// Purpose: Simulate budget exceeded scenario and verify all safety mechanisms
// ═══════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import {
  BudgetEnforcer,
  createBudgetMiddleware,
  BUDGET_STATUS
} from './budget-enforcer.js';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const TRIP_TEST_DEFAULTS = {
  budget: 0.01,
  maxLatency: 5000,
  skipCleanup: false
};

// ─────────────────────────────────────────────────────────────────────────────
// BudgetTripTestRunner Class
// ─────────────────────────────────────────────────────────────────────────────

export class BudgetTripTestRunner {
  constructor(options = {}) {
    this.budget = options.budget ?? TRIP_TEST_DEFAULTS.budget;
    this.claudeDir = options.claudeDir || '.claude';
    this.skipCleanup = options.skipCleanup ?? TRIP_TEST_DEFAULTS.skipCleanup;
    this.logCallback = options.logCallback || null;
    this.notifyCallback = options.notifyCallback || null;
    this.simulateFailure = options.simulateFailure || false;
  }

  /**
   * Run the budget trip test
   * @returns {Object} Test result with latencies and verification status
   */
  async run() {
    const startTime = Date.now();
    const result = {
      success: false,
      budgetUsed: this.budget,
      emergencyStopCreated: false,
      middlewareBlocked: false,
      responseCode: 200,
      errorType: null,
      retryAfterSet: false,
      latencies: {
        spendToDetect: 0,
        detectToStop: 0,
        stopToVerified: 0
      },
      totalLatency: 0,
      failureReason: null
    };

    // Simulate failure if requested
    if (this.simulateFailure) {
      result.success = false;
      result.failureReason = 'Simulated failure for testing';
      result.totalLatency = Date.now() - startTime;
      return result;
    }

    try {
      // Create enforcer with tiny budget
      const enforcer = new BudgetEnforcer({
        budgetLimit: this.budget,
        claudeDir: this.claudeDir
      });

      // Set callbacks if provided
      if (this.notifyCallback) {
        enforcer.setNotifyCallback(this.notifyCallback);
      }

      if (this.logCallback) {
        enforcer.setLogCallback(this.logCallback);
      }

      // Phase 1: Record spend that exceeds budget
      const spendStart = Date.now();
      enforcer.recordSpend(this.budget); // Record exactly 100%
      const spendEnd = Date.now();

      // Phase 2: Trigger budget check (this creates EMERGENCY-STOP)
      const detectStart = Date.now();
      const enforceResult = await enforcer.checkAndEnforce();
      const detectEnd = Date.now();

      result.latencies.spendToDetect = detectEnd - spendStart;

      // Phase 3: Verify EMERGENCY-STOP file was created
      const stopFile = path.join(this.claudeDir, 'EMERGENCY-STOP');
      const stopStart = Date.now();
      result.emergencyStopCreated = fs.existsSync(stopFile);
      result.latencies.detectToStop = stopStart - detectStart;

      // Phase 4: Test middleware blocking
      const middleware = createBudgetMiddleware(enforcer);
      const mockReq = {};
      const mockRes = {
        _statusCode: 200,
        _headers: {},
        _jsonData: null,
        status(code) {
          this._statusCode = code;
          return this;
        },
        set(key, value) {
          this._headers[key] = value;
          return this;
        },
        json(data) {
          this._jsonData = data;
          return this;
        }
      };
      const mockNext = () => {
        result.middlewareBlocked = false;
      };

      // Initialize as blocked (will be unset if next() is called)
      result.middlewareBlocked = true;

      await middleware(mockReq, mockRes, mockNext);

      // Capture middleware response
      result.responseCode = mockRes._statusCode;
      result.retryAfterSet = 'Retry-After' in mockRes._headers;

      if (mockRes._jsonData?.error?.type) {
        result.errorType = mockRes._jsonData.error.type;
      }

      // Phase 5: Final verification
      const verifyEnd = Date.now();
      result.latencies.stopToVerified = verifyEnd - stopStart;
      result.totalLatency = verifyEnd - startTime;

      // Determine success
      result.success = (
        result.emergencyStopCreated &&
        result.middlewareBlocked &&
        result.responseCode === 503 &&
        result.errorType === 'budget_exceeded'
      );

      // Cleanup unless skipped
      if (!this.skipCleanup) {
        await this._cleanup();
      }

      // Log results
      if (this.logCallback) {
        this.logCallback({
          event: 'budget_trip_test',
          timestamp: new Date().toISOString(),
          success: result.success,
          latencies: result.latencies,
          totalLatency: result.totalLatency
        });
      }

    } catch (error) {
      result.success = false;
      result.failureReason = error.message;
      result.totalLatency = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Clean up test artifacts
   */
  async _cleanup() {
    const stopFile = path.join(this.claudeDir, 'EMERGENCY-STOP');
    if (fs.existsSync(stopFile)) {
      fs.unlinkSync(stopFile);
    }

    // Remove any temp files
    if (fs.existsSync(this.claudeDir)) {
      const files = fs.readdirSync(this.claudeDir);
      for (const file of files) {
        if (file.endsWith('.tmp')) {
          fs.unlinkSync(path.join(this.claudeDir, file));
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a budget trip test with default or custom options
 * @param {Object} options - Test options
 * @returns {Object} Test result
 */
export async function runBudgetTripTest(options = {}) {
  const runner = new BudgetTripTestRunner({
    budget: options.budget ?? TRIP_TEST_DEFAULTS.budget,
    claudeDir: options.claudeDir || '.claude',
    skipCleanup: options.skipCleanup ?? false,
    logCallback: options.logCallback || null,
    notifyCallback: options.notifyCallback || null
  });

  return runner.run();
}

export default BudgetTripTestRunner;
