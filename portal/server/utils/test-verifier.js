// ═══════════════════════════════════════════════════════════════════════════════
// TEST VERIFIER - INDEPENDENT TEST VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════
// IMP-011: Don't trust agent output - verify independently
//
// Sources:
// - https://itea.org/journals/volume-46-1/innovation-independent-automated-verification-and-validation-testbed/
// - https://testpros.com/independent-verification-and-validation/ivv-testing/
// - https://testgrid.io/blog/ci-cd-test-automation/
//
// Key principle: "Independent Verification and Validation (IV&V) improves
// credibility as the assessing organization is distinct from development"
// ═══════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const FORBIDDEN_FLAGS = [
  '--passWithNoTests',
  '--testPathIgnorePatterns',
  '--testNamePattern'  // Blocks all testNamePattern as it can be used to skip tests
];

// ─────────────────────────────────────────────────────────────────────────────
// GAP-012: Promise.race with Cleanup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Race promises with proper cleanup using AbortController
 * Aborts all remaining promises when one wins the race
 *
 * @param {Array<Promise|Function>} promises - Promises or functions that accept AbortSignal
 * @param {AbortSignal} [externalSignal] - Optional external abort signal
 * @returns {Promise<*>} Result of winning promise
 */
export async function raceWithCleanup(promises, externalSignal) {
  const controller = new AbortController();

  // Link external signal if provided
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    return await Promise.race(
      promises.map(p => typeof p === 'function' ? p(controller.signal) : p)
    );
  } finally {
    // Abort all remaining promises
    controller.abort();
  }
}

export const VERIFICATION_STATUS = {
  PASSED: 'passed',
  FAILED: 'failed',
  REJECTED: 'rejected',
  ERROR: 'error'
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare agent-reported results with actual results
 * @param {Object} agentResults - Results reported by agent
 * @param {Object} actualResults - Actual test results
 * @returns {Object} Comparison result
 */
export function compareResults(agentResults, actualResults) {
  const passedDiff = actualResults.passed - agentResults.passed;
  const failedDiff = actualResults.failed - agentResults.failed;
  const totalDiff = actualResults.total - agentResults.total;

  const match = passedDiff === 0 && failedDiff === 0 && totalDiff === 0;
  const emptyTestSuite = actualResults.total === 0 && agentResults.total === 0;

  const result = {
    match,
    mismatchCount: Math.abs(passedDiff) + Math.abs(failedDiff),
    emptyTestSuite,
    details: {
      passedDiff,
      failedDiff,
      totalDiff,
      agentOverreported: passedDiff < 0
    },
    testMismatches: []
  };

  // Compare individual tests if available
  if (agentResults.tests && actualResults.tests) {
    const actualMap = new Map(actualResults.tests.map(t => [t.name, t.status]));

    for (const agentTest of agentResults.tests) {
      const actualStatus = actualMap.get(agentTest.name);
      if (actualStatus && actualStatus !== agentTest.status) {
        result.testMismatches.push({
          name: agentTest.name,
          agentStatus: agentTest.status,
          actualStatus
        });
      }
    }
  }

  return result;
}

/**
 * Detect forbidden test flags in command
 * @param {string} command - Test command to check
 * @returns {Object} Detection result
 */
export function detectForbiddenFlags(command) {
  const detected = [];

  for (const flag of FORBIDDEN_FLAGS) {
    if (command.includes(flag)) {
      detected.push(flag);
    }
  }

  return {
    hasForbidden: detected.length > 0,
    detected: [...new Set(detected)]
  };
}

/**
 * Generate SHA-256 hash of test output
 * @param {string} output - Test output string
 * @returns {string} Hash hex string
 */
export function hashTestOutput(output) {
  return crypto.createHash('sha256').update(output).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// TestVerifier Class
// ─────────────────────────────────────────────────────────────────────────────

export class TestVerifier {
  constructor(options = {}) {
    this.artifactsDir = options.artifactsDir || '.claude/validation-artifacts';
    this.testCommand = options.testCommand || 'npm test -- --json';
    this.timeout = options.timeout || 300000; // 5 minutes default
    this.strictMode = options.strictMode || false;
  }

  /**
   * Run test command and capture output
   * GAP-012: Uses proper Promise.race cleanup with AbortController
   * @param {Object} options - Run options
   * @returns {Object} Test run result
   */
  async runTests(options = {}) {
    const { cwd, saveArtifact, runId } = options;

    const result = {
      executed: false,
      stdout: '',
      stderr: '',
      exitCode: null,
      rawOutput: null,
      outputHash: null,
      artifactPath: null,
      parseError: false,
      timedOut: false
    };

    // GAP-012: Use AbortController for proper cleanup
    const controller = new AbortController();
    let timeoutId = null;

    try {
      // Create timeout promise that cleans up properly
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          result.timedOut = true;
          controller.abort(); // Abort the running command
          reject(new Error('Test execution timed out'));
        }, this.timeout);
      });

      // Run tests with abort signal
      const runPromise = this._runTestCommand(this.testCommand, cwd, controller.signal);

      const cmdResult = await Promise.race([runPromise, timeoutPromise]);

      // GAP-012: Clear timeout on successful completion
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      result.executed = true;
      result.stdout = cmdResult.stdout;
      result.stderr = cmdResult.stderr;
      result.exitCode = cmdResult.exitCode;
      result.rawOutput = cmdResult.stdout;
      result.outputHash = hashTestOutput(cmdResult.stdout);

      // Try to parse JSON output
      try {
        result.parsed = JSON.parse(cmdResult.stdout);
      } catch {
        result.parseError = true;
      }

      // Save artifact if requested
      if (saveArtifact && runId) {
        result.artifactPath = await this._saveArtifact(result, runId);
      }

    } catch (error) {
      // GAP-012: Always clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (!result.timedOut) {
        result.error = error.message;
      }
    }

    return result;
  }

  /**
   * Run test command (internal, mockable)
   * GAP-012: Accepts abort signal for proper cleanup
   * @param {string} command - Command to run
   * @param {string} cwd - Working directory
   * @param {AbortSignal} [signal] - Optional abort signal
   */
  async _runTestCommand(command, cwd, signal) {
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ');
      const proc = spawn(cmd, args, { cwd, shell: true });

      let stdout = '';
      let stderr = '';
      let aborted = false;

      // GAP-012: Handle abort signal
      if (signal) {
        const abortHandler = () => {
          aborted = true;
          proc.kill('SIGTERM');
        };
        signal.addEventListener('abort', abortHandler);

        // Cleanup listener when process ends
        proc.on('close', () => {
          signal.removeEventListener('abort', abortHandler);
        });
      }

      proc.stdout?.on('data', (data) => { stdout += data; });
      proc.stderr?.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: aborted ? null : code, aborted });
      });

      proc.on('error', () => {
        resolve({ stdout, stderr, exitCode: 1, aborted });
      });
    });
  }

  /**
   * Save test result artifact
   */
  async _saveArtifact(result, runId) {
    // Ensure directory exists
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${runId}-${timestamp}.json`;
    const artifactPath = path.join(this.artifactsDir, filename);

    const artifact = {
      timestamp: new Date().toISOString(),
      runId,
      output: result.rawOutput,
      outputHash: result.outputHash,
      exitCode: result.exitCode,
      parsed: result.parsed
    };

    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

    return artifactPath;
  }

  /**
   * Verify hash matches output
   */
  verifyHash(output, expectedHash) {
    const actualHash = hashTestOutput(output);
    return {
      valid: actualHash === expectedHash,
      actualHash,
      expectedHash
    };
  }

  /**
   * Generate human-readable mismatch report
   */
  generateReport(comparison) {
    const lines = [];

    if (comparison.match) {
      lines.push('✓ VERIFICATION PASSED: Results match');
    } else {
      lines.push('✗ VERIFICATION MISMATCH');
      lines.push(`  Passed diff: ${comparison.details.passedDiff}`);
      lines.push(`  Failed diff: ${comparison.details.failedDiff}`);

      if (comparison.testMismatches.length > 0) {
        lines.push('  Test mismatches:');
        for (const mismatch of comparison.testMismatches) {
          lines.push(`    - ${mismatch.name}: agent=${mismatch.agentStatus}, actual=${mismatch.actualStatus}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Full verification of agent claims
   */
  async verify(agentClaim, options = {}) {
    const result = {
      status: VERIFICATION_STATUS.ERROR,
      agentTrusted: false,
      reason: null,
      warnings: [],
      comparison: null,
      artifact: null
    };

    // Check for forbidden flags
    if (agentClaim.command) {
      const flagCheck = detectForbiddenFlags(agentClaim.command);
      if (flagCheck.hasForbidden) {
        result.status = VERIFICATION_STATUS.REJECTED;
        result.reason = `Forbidden flags detected: ${flagCheck.detected.join(', ')}`;
        return result;
      }
    }

    // Run tests independently
    const testResult = await this.runTests({
      cwd: options.cwd,
      saveArtifact: true,
      runId: options.runId || `verify-${Date.now()}`
    });

    result.artifact = testResult.artifactPath;

    if (testResult.timedOut) {
      result.status = VERIFICATION_STATUS.ERROR;
      result.reason = 'Test execution timed out';
      return result;
    }

    if (testResult.parseError) {
      result.status = VERIFICATION_STATUS.ERROR;
      result.reason = 'Failed to parse test output';
      return result;
    }

    // Parse actual results
    const actualResults = {
      passed: testResult.parsed?.numPassedTests ?? 0,
      failed: testResult.parsed?.numFailedTests ?? 0,
      total: testResult.parsed?.numTotalTests ?? 0,
      tests: testResult.parsed?.testResults ?? []
    };

    // Compare with agent claims
    const comparison = compareResults(agentClaim, actualResults);
    result.comparison = comparison;

    // Check for empty test suite in strict mode
    if (comparison.emptyTestSuite && this.strictMode) {
      result.warnings.push('empty test suite');
    }

    // Determine verification status
    if (comparison.match) {
      result.status = VERIFICATION_STATUS.PASSED;
      result.agentTrusted = true;
    } else {
      result.status = VERIFICATION_STATUS.FAILED;
      result.agentTrusted = false;
      result.reason = `Results mismatch: agent reported ${agentClaim.passed} passed but actual was ${actualResults.passed}`;
    }

    return result;
  }
}

export default TestVerifier;
