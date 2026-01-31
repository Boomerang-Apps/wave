// ═══════════════════════════════════════════════════════════════════════════════
// TEST VERIFIER TESTS (TDD - Written First)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for IMP-011: Independent test verification
//
// Sources:
// - https://itea.org/journals/volume-46-1/innovation-independent-automated-verification-and-validation-testbed/
// - https://testpros.com/independent-verification-and-validation/ivv-testing/
// - https://testgrid.io/blog/ci-cd-test-automation/
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import the module we're going to implement
import {
  TestVerifier,
  compareResults,
  detectForbiddenFlags,
  hashTestOutput,
  FORBIDDEN_FLAGS,
  VERIFICATION_STATUS
} from '../utils/test-verifier.js';

describe('TestVerifier', () => {
  let tempDir;
  let verifier;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-verifier-test-'));
    verifier = new TestVerifier({
      artifactsDir: path.join(tempDir, 'artifacts')
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC1: Validator executes tests independently
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC1: Independent Test Execution', () => {
    it('should execute test command and capture output', async () => {
      // Mock successful test run
      const mockResult = {
        numPassedTests: 5,
        numFailedTests: 0,
        numTotalTests: 5,
        success: true,
        testResults: []
      };

      vi.spyOn(verifier, '_runTestCommand').mockResolvedValue({
        stdout: JSON.stringify(mockResult),
        stderr: '',
        exitCode: 0
      });

      const result = await verifier.runTests({ cwd: tempDir });

      expect(result.executed).toBe(true);
      expect(result.rawOutput).toBeDefined();
    });

    it('should support custom test commands', async () => {
      const customVerifier = new TestVerifier({
        artifactsDir: tempDir,
        testCommand: 'yarn test --json'
      });

      expect(customVerifier.testCommand).toBe('yarn test --json');
    });

    it('should capture both stdout and stderr', async () => {
      vi.spyOn(verifier, '_runTestCommand').mockResolvedValue({
        stdout: '{"success": true}',
        stderr: 'Warning: deprecated API',
        exitCode: 0
      });

      const result = await verifier.runTests({ cwd: tempDir });

      expect(result.stdout).toContain('success');
      expect(result.stderr).toContain('Warning');
    });

    it('should handle test execution failure', async () => {
      vi.spyOn(verifier, '_runTestCommand').mockResolvedValue({
        stdout: '',
        stderr: 'Error: Cannot find module',
        exitCode: 1
      });

      const result = await verifier.runTests({ cwd: tempDir });

      expect(result.executed).toBe(true);
      expect(result.exitCode).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC2: Compare agent results with actual results
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC2: Result Comparison', () => {
    it('should pass when results match', () => {
      const agentResults = { passed: 10, failed: 0, total: 10 };
      const actualResults = { passed: 10, failed: 0, total: 10 };

      const comparison = compareResults(agentResults, actualResults);

      expect(comparison.match).toBe(true);
      expect(comparison.mismatchCount).toBe(0);
    });

    it('should fail when passed count differs', () => {
      const agentResults = { passed: 10, failed: 0, total: 10 };
      const actualResults = { passed: 8, failed: 2, total: 10 };

      const comparison = compareResults(agentResults, actualResults);

      expect(comparison.match).toBe(false);
      expect(comparison.mismatchCount).toBeGreaterThan(0);
    });

    it('should detect agent claiming more passes than actual', () => {
      const agentResults = { passed: 15, failed: 0, total: 15 };
      const actualResults = { passed: 10, failed: 5, total: 15 };

      const comparison = compareResults(agentResults, actualResults);

      expect(comparison.match).toBe(false);
      expect(comparison.details.passedDiff).toBe(-5);
      expect(comparison.details.agentOverreported).toBe(true);
    });

    it('should report detailed mismatch information', () => {
      const agentResults = { passed: 10, failed: 0, total: 10 };
      const actualResults = { passed: 7, failed: 3, total: 10 };

      const comparison = compareResults(agentResults, actualResults);

      expect(comparison.details).toHaveProperty('passedDiff');
      expect(comparison.details).toHaveProperty('failedDiff');
      expect(comparison.details.passedDiff).toBe(-3);
      expect(comparison.details.failedDiff).toBe(3);
    });

    it('should handle test-level comparison', () => {
      const agentResults = {
        passed: 2,
        failed: 0,
        total: 2,
        tests: [
          { name: 'test1', status: 'passed' },
          { name: 'test2', status: 'passed' }
        ]
      };
      const actualResults = {
        passed: 1,
        failed: 1,
        total: 2,
        tests: [
          { name: 'test1', status: 'passed' },
          { name: 'test2', status: 'failed' }
        ]
      };

      const comparison = compareResults(agentResults, actualResults);

      expect(comparison.testMismatches).toHaveLength(1);
      expect(comparison.testMismatches[0].name).toBe('test2');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC3: Store raw test output as artifact
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC3: Artifact Storage', () => {
    it('should save test output to artifacts directory', async () => {
      vi.spyOn(verifier, '_runTestCommand').mockResolvedValue({
        stdout: '{"numPassedTests": 5}',
        stderr: '',
        exitCode: 0
      });

      const result = await verifier.runTests({
        cwd: tempDir,
        saveArtifact: true,
        runId: 'test-run-001'
      });

      expect(result.artifactPath).toBeDefined();
      expect(fs.existsSync(result.artifactPath)).toBe(true);
    });

    it('should include timestamp in artifact filename', async () => {
      vi.spyOn(verifier, '_runTestCommand').mockResolvedValue({
        stdout: '{}',
        stderr: '',
        exitCode: 0
      });

      const result = await verifier.runTests({
        cwd: tempDir,
        saveArtifact: true,
        runId: 'run-123'
      });

      expect(result.artifactPath).toMatch(/run-123/);
    });

    it('should create artifacts directory if missing', async () => {
      const nestedVerifier = new TestVerifier({
        artifactsDir: path.join(tempDir, 'a', 'b', 'c', 'artifacts')
      });

      vi.spyOn(nestedVerifier, '_runTestCommand').mockResolvedValue({
        stdout: '{}',
        stderr: '',
        exitCode: 0
      });

      await nestedVerifier.runTests({
        cwd: tempDir,
        saveArtifact: true,
        runId: 'test'
      });

      expect(fs.existsSync(path.join(tempDir, 'a', 'b', 'c', 'artifacts'))).toBe(true);
    });

    it('should store structured artifact with metadata', async () => {
      vi.spyOn(verifier, '_runTestCommand').mockResolvedValue({
        stdout: '{"numPassedTests": 3}',
        stderr: '',
        exitCode: 0
      });

      const result = await verifier.runTests({
        cwd: tempDir,
        saveArtifact: true,
        runId: 'meta-test'
      });

      const artifact = JSON.parse(fs.readFileSync(result.artifactPath, 'utf8'));
      expect(artifact).toHaveProperty('timestamp');
      expect(artifact).toHaveProperty('runId');
      expect(artifact).toHaveProperty('output');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC4: Detect test skip flags
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC4: Forbidden Flag Detection', () => {
    it('should detect --passWithNoTests flag', () => {
      const command = 'npm test -- --passWithNoTests';
      const result = detectForbiddenFlags(command);

      expect(result.hasForbidden).toBe(true);
      expect(result.detected).toContain('--passWithNoTests');
    });

    it('should detect --testPathIgnorePatterns flag', () => {
      const command = 'npm test -- --testPathIgnorePatterns=".*"';
      const result = detectForbiddenFlags(command);

      expect(result.hasForbidden).toBe(true);
      expect(result.detected).toContain('--testPathIgnorePatterns');
    });

    it('should detect --testNamePattern with skip-all pattern', () => {
      const command = 'npm test -- --testNamePattern="^$"';
      const result = detectForbiddenFlags(command);

      expect(result.hasForbidden).toBe(true);
    });

    it('should allow normal test flags', () => {
      const command = 'npm test -- --coverage --verbose';
      const result = detectForbiddenFlags(command);

      expect(result.hasForbidden).toBe(false);
    });

    it('should export FORBIDDEN_FLAGS constant', () => {
      expect(FORBIDDEN_FLAGS).toContain('--passWithNoTests');
      expect(FORBIDDEN_FLAGS).toContain('--testPathIgnorePatterns');
      expect(FORBIDDEN_FLAGS).toContain('--testNamePattern');
    });

    it('should detect multiple forbidden flags', () => {
      const command = 'npm test -- --passWithNoTests --testPathIgnorePatterns="test"';
      const result = detectForbiddenFlags(command);

      expect(result.detected.length).toBeGreaterThan(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC5: Hash verification of test output
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC5: Hash Verification', () => {
    it('should generate hash of test output', () => {
      const output = '{"numPassedTests": 5, "numFailedTests": 0}';
      const hash = hashTestOutput(output);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 hex
    });

    it('should generate consistent hash for same output', () => {
      const output = '{"test": "data"}';
      const hash1 = hashTestOutput(output);
      const hash2 = hashTestOutput(output);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different output', () => {
      const hash1 = hashTestOutput('{"passed": 5}');
      const hash2 = hashTestOutput('{"passed": 6}');

      expect(hash1).not.toBe(hash2);
    });

    it('should verify hash matches', async () => {
      vi.spyOn(verifier, '_runTestCommand').mockResolvedValue({
        stdout: '{"test": "output"}',
        stderr: '',
        exitCode: 0
      });

      const result = await verifier.runTests({ cwd: tempDir });
      const expectedHash = hashTestOutput('{"test": "output"}');

      expect(result.outputHash).toBe(expectedHash);
    });

    it('should detect hash mismatch when verifying', () => {
      const output = '{"test": "output"}';
      const correctHash = hashTestOutput(output);
      const wrongHash = 'incorrect_hash_value';

      const verification = verifier.verifyHash(output, correctHash);
      expect(verification.valid).toBe(true);

      const badVerification = verifier.verifyHash(output, wrongHash);
      expect(badVerification.valid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC6: Report detailed mismatch information
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC6: Mismatch Reporting', () => {
    it('should report which tests passed differently', () => {
      const agentResults = {
        passed: 3,
        failed: 0,
        total: 3,
        tests: [
          { name: 'auth.test', status: 'passed' },
          { name: 'api.test', status: 'passed' },
          { name: 'db.test', status: 'passed' }
        ]
      };
      const actualResults = {
        passed: 1,
        failed: 2,
        total: 3,
        tests: [
          { name: 'auth.test', status: 'passed' },
          { name: 'api.test', status: 'failed' },
          { name: 'db.test', status: 'failed' }
        ]
      };

      const comparison = compareResults(agentResults, actualResults);

      expect(comparison.testMismatches).toHaveLength(2);
      expect(comparison.testMismatches.map(t => t.name)).toContain('api.test');
      expect(comparison.testMismatches.map(t => t.name)).toContain('db.test');
    });

    it('should include agent vs actual status in mismatch', () => {
      const agentResults = {
        passed: 1, failed: 0, total: 1,
        tests: [{ name: 'test1', status: 'passed' }]
      };
      const actualResults = {
        passed: 0, failed: 1, total: 1,
        tests: [{ name: 'test1', status: 'failed' }]
      };

      const comparison = compareResults(agentResults, actualResults);

      expect(comparison.testMismatches[0]).toHaveProperty('agentStatus', 'passed');
      expect(comparison.testMismatches[0]).toHaveProperty('actualStatus', 'failed');
    });

    it('should generate human-readable report', () => {
      const comparison = {
        match: false,
        mismatchCount: 2,
        details: { passedDiff: -2, failedDiff: 2 },
        testMismatches: [
          { name: 'test1', agentStatus: 'passed', actualStatus: 'failed' },
          { name: 'test2', agentStatus: 'passed', actualStatus: 'failed' }
        ]
      };

      const report = verifier.generateReport(comparison);

      expect(report).toContain('MISMATCH');
      expect(report).toContain('test1');
      expect(report).toContain('test2');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Full Verification Flow
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Full Verification Flow', () => {
    it('should verify agent claims against actual results', async () => {
      const agentClaim = {
        passed: 5,
        failed: 0,
        total: 5,
        command: 'npm test'
      };

      vi.spyOn(verifier, '_runTestCommand').mockResolvedValue({
        stdout: JSON.stringify({
          numPassedTests: 5,
          numFailedTests: 0,
          numTotalTests: 5
        }),
        stderr: '',
        exitCode: 0
      });

      const result = await verifier.verify(agentClaim, { cwd: tempDir });

      expect(result.status).toBe(VERIFICATION_STATUS.PASSED);
      expect(result.agentTrusted).toBe(true);
    });

    it('should fail verification when agent overreports', async () => {
      const agentClaim = {
        passed: 10,
        failed: 0,
        total: 10,
        command: 'npm test'
      };

      vi.spyOn(verifier, '_runTestCommand').mockResolvedValue({
        stdout: JSON.stringify({
          numPassedTests: 7,
          numFailedTests: 3,
          numTotalTests: 10
        }),
        stderr: '',
        exitCode: 1
      });

      const result = await verifier.verify(agentClaim, { cwd: tempDir });

      expect(result.status).toBe(VERIFICATION_STATUS.FAILED);
      expect(result.agentTrusted).toBe(false);
      expect(result.reason).toContain('mismatch');
    });

    it('should reject when forbidden flags detected', async () => {
      const agentClaim = {
        passed: 5,
        failed: 0,
        total: 5,
        command: 'npm test -- --passWithNoTests'
      };

      const result = await verifier.verify(agentClaim, { cwd: tempDir });

      expect(result.status).toBe(VERIFICATION_STATUS.REJECTED);
      expect(result.reason.toLowerCase()).toContain('forbidden');
    });

    it('should export VERIFICATION_STATUS constants', () => {
      expect(VERIFICATION_STATUS).toHaveProperty('PASSED');
      expect(VERIFICATION_STATUS).toHaveProperty('FAILED');
      expect(VERIFICATION_STATUS).toHaveProperty('REJECTED');
      expect(VERIFICATION_STATUS).toHaveProperty('ERROR');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle empty test suites', () => {
      const agentResults = { passed: 0, failed: 0, total: 0 };
      const actualResults = { passed: 0, failed: 0, total: 0 };

      const comparison = compareResults(agentResults, actualResults);

      expect(comparison.match).toBe(true);
      expect(comparison.emptyTestSuite).toBe(true);
    });

    it('should warn on empty test suite in strict mode', async () => {
      const strictVerifier = new TestVerifier({
        artifactsDir: tempDir,
        strictMode: true
      });

      vi.spyOn(strictVerifier, '_runTestCommand').mockResolvedValue({
        stdout: JSON.stringify({ numPassedTests: 0, numFailedTests: 0, numTotalTests: 0 }),
        stderr: '',
        exitCode: 0
      });

      const result = await strictVerifier.verify(
        { passed: 0, failed: 0, total: 0 },
        { cwd: tempDir }
      );

      expect(result.warnings).toContain('empty test suite');
    });

    it('should handle malformed test output', async () => {
      vi.spyOn(verifier, '_runTestCommand').mockResolvedValue({
        stdout: 'not valid json',
        stderr: '',
        exitCode: 0
      });

      const result = await verifier.runTests({ cwd: tempDir });

      expect(result.parseError).toBe(true);
    });

    it('should handle timeout', async () => {
      const timeoutVerifier = new TestVerifier({
        artifactsDir: tempDir,
        timeout: 100
      });

      vi.spyOn(timeoutVerifier, '_runTestCommand').mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );

      const result = await timeoutVerifier.runTests({ cwd: tempDir });

      expect(result.timedOut).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GAP-012: Promise.race Cleanup
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GAP-012: Promise.race Cleanup', () => {
    it('should export raceWithCleanup function', async () => {
      const { raceWithCleanup } = await import('../utils/test-verifier.js');
      expect(typeof raceWithCleanup).toBe('function');
    });

    it('raceWithCleanup should return the winning promise result', async () => {
      const { raceWithCleanup } = await import('../utils/test-verifier.js');

      const fast = Promise.resolve('fast');
      const slow = new Promise(resolve => setTimeout(() => resolve('slow'), 100));

      const result = await raceWithCleanup([fast, slow]);
      expect(result).toBe('fast');
    });

    it('raceWithCleanup should abort remaining promises via signal', async () => {
      const { raceWithCleanup } = await import('../utils/test-verifier.js');

      let signalAborted = false;

      const fast = Promise.resolve('fast');
      const slowWithSignal = (signal) => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => resolve('slow'), 100);
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          signalAborted = true;
          reject(new Error('aborted'));
        });
      });

      await raceWithCleanup([fast, slowWithSignal]);

      // Wait a tick for abort to propagate
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(signalAborted).toBe(true);
    });

    it('raceWithCleanup should handle all promises rejecting', async () => {
      const { raceWithCleanup } = await import('../utils/test-verifier.js');

      const failing = Promise.reject(new Error('fail'));

      await expect(raceWithCleanup([failing])).rejects.toThrow('fail');
    });

    it('raceWithCleanup should accept external abort signal', async () => {
      const { raceWithCleanup } = await import('../utils/test-verifier.js');

      const controller = new AbortController();
      let taskStarted = false;

      const slowTask = (signal) => new Promise((resolve, reject) => {
        taskStarted = true;
        signal.addEventListener('abort', () => reject(new Error('external abort')));
      });

      // Start the race
      const racePromise = raceWithCleanup([slowTask], controller.signal);

      // Abort externally
      controller.abort();

      await expect(racePromise).rejects.toThrow();
      expect(taskStarted).toBe(true);
    });

    it('TestVerifier should clear timeout timer on successful completion', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const fastVerifier = new TestVerifier({
        artifactsDir: tempDir,
        timeout: 5000
      });

      vi.spyOn(fastVerifier, '_runTestCommand').mockResolvedValue({
        stdout: '{"numPassedTests": 1, "numFailedTests": 0, "numTotalTests": 1}',
        stderr: '',
        exitCode: 0
      });

      await fastVerifier.runTests({ cwd: tempDir });

      // Timeout should have been cleared
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('TestVerifier should abort child process on timeout', async () => {
      const timeoutVerifier = new TestVerifier({
        artifactsDir: tempDir,
        timeout: 50
      });

      let abortSignalReceived = false;

      vi.spyOn(timeoutVerifier, '_runTestCommand').mockImplementation(
        (cmd, cwd, signal) => new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve({ stdout: '', stderr: '', exitCode: 0 }), 200);
          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              abortSignalReceived = true;
              reject(new Error('aborted'));
            });
          }
        })
      );

      const result = await timeoutVerifier.runTests({ cwd: tempDir });

      expect(result.timedOut).toBe(true);
      expect(abortSignalReceived).toBe(true);
    });
  });
});
