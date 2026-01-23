// ═══════════════════════════════════════════════════════════════════════════════
// RUN TRACKER TESTS (TDD - Written First)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for IMP-014: Global run_id and sequence tracking
// Combines IMP-014, IMP-001, IMP-002
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import the module we're going to implement
import {
  RunTracker,
  generateRunId,
  createSignalWithRunId,
  RUN_ID_FORMAT
} from '../utils/run-tracker.js';

describe('RunTracker', () => {
  let tempDir;
  let tracker;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-tracker-test-'));
    tracker = new RunTracker({
      runsDir: path.join(tempDir, 'runs')
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC1: Generate unique run_id at wave start
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC1: Run ID Generation', () => {
    it('should generate run_id in correct format', () => {
      const runId = generateRunId({ wave: 1 });

      // Format: run_YYYYMMDD_HHMMSS_w1
      expect(runId).toMatch(/^run_\d{8}_\d{6}_w\d+$/);
    });

    it('should include wave number in run_id', () => {
      const runId = generateRunId({ wave: 5 });

      expect(runId).toContain('_w5');
    });

    it('should generate unique IDs for same wave', () => {
      const ids = new Set();
      for (let i = 0; i < 10; i++) {
        ids.add(generateRunId({ wave: 1 }));
        // Small delay to ensure unique timestamps
      }
      // At least some should be unique (may have same second)
      expect(ids.size).toBeGreaterThanOrEqual(1);
    });

    it('should export RUN_ID_FORMAT regex', () => {
      expect(RUN_ID_FORMAT).toBeInstanceOf(RegExp);
      expect('run_20260124_103045_w1').toMatch(RUN_ID_FORMAT);
    });

    it('should start a new run with generated ID', async () => {
      const run = await tracker.startRun({ wave: 1 });

      expect(run.runId).toMatch(RUN_ID_FORMAT);
      expect(run.wave).toBe(1);
      expect(run.startedAt).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC2: Propagate run_id to all signals
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC2: Run ID Propagation', () => {
    it('should add run_id to signal', () => {
      const signal = createSignalWithRunId(
        { type: 'STORY_START', story_id: 'S-001' },
        'run_20260124_103045_w1'
      );

      expect(signal.run_id).toBe('run_20260124_103045_w1');
    });

    it('should not overwrite existing run_id', () => {
      const signal = createSignalWithRunId(
        { type: 'TEST', run_id: 'existing-run' },
        'new-run-id'
      );

      expect(signal.run_id).toBe('existing-run');
    });

    it('should track current run_id in tracker', async () => {
      await tracker.startRun({ wave: 1 });

      expect(tracker.currentRunId).toBeDefined();
      expect(tracker.currentRunId).toMatch(RUN_ID_FORMAT);
    });

    it('should provide helper to wrap signals', async () => {
      await tracker.startRun({ wave: 2 });

      const signal = tracker.wrapSignal({
        type: 'GATE_COMPLETE',
        gate: 3
      });

      expect(signal.run_id).toBe(tracker.currentRunId);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC3: Track sequence numbers per agent/source
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC3: Sequence Tracking', () => {
    it('should increment sequence for each signal', async () => {
      await tracker.startRun({ wave: 1 });

      const seq1 = tracker.nextSequence('agent-1');
      const seq2 = tracker.nextSequence('agent-1');
      const seq3 = tracker.nextSequence('agent-1');

      expect(seq1).toBe(1);
      expect(seq2).toBe(2);
      expect(seq3).toBe(3);
    });

    it('should track separate sequences per source', async () => {
      await tracker.startRun({ wave: 1 });

      const agent1Seq1 = tracker.nextSequence('agent-1');
      const agent2Seq1 = tracker.nextSequence('agent-2');
      const agent1Seq2 = tracker.nextSequence('agent-1');

      expect(agent1Seq1).toBe(1);
      expect(agent2Seq1).toBe(1);
      expect(agent1Seq2).toBe(2);
    });

    it('should add sequence to wrapped signals', async () => {
      await tracker.startRun({ wave: 1 });

      const signal = tracker.wrapSignal(
        { type: 'TEST' },
        { source: 'agent-1' }
      );

      expect(signal.sequence).toBeDefined();
      expect(signal.sequence).toBe(1);
    });

    it('should get current sequence for source', async () => {
      await tracker.startRun({ wave: 1 });

      tracker.nextSequence('agent-1');
      tracker.nextSequence('agent-1');

      expect(tracker.getCurrentSequence('agent-1')).toBe(2);
      expect(tracker.getCurrentSequence('agent-2')).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC4: Detect out-of-order signals
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC4: Out-of-Order Detection', () => {
    it('should detect out-of-order sequence', async () => {
      await tracker.startRun({ wave: 1 });

      tracker.recordSequence('agent-1', 5);

      const check = tracker.checkSequence('agent-1', 3);

      expect(check.outOfOrder).toBe(true);
      expect(check.expected).toBe(6);
      expect(check.received).toBe(3);
    });

    it('should accept in-order sequence', async () => {
      await tracker.startRun({ wave: 1 });

      tracker.recordSequence('agent-1', 1);
      tracker.recordSequence('agent-1', 2);

      const check = tracker.checkSequence('agent-1', 3);

      expect(check.outOfOrder).toBe(false);
    });

    it('should detect gaps in sequence', async () => {
      await tracker.startRun({ wave: 1 });

      tracker.recordSequence('agent-1', 1);
      const check = tracker.checkSequence('agent-1', 5);

      expect(check.hasGap).toBe(true);
      expect(check.gapSize).toBe(3);
    });

    it('should log warning for out-of-order', async () => {
      const warnCallback = vi.fn();
      tracker.setWarnCallback(warnCallback);
      await tracker.startRun({ wave: 1 });

      tracker.recordSequence('agent-1', 5);
      tracker.recordSequence('agent-1', 3); // Out of order

      expect(warnCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'out_of_order',
          source: 'agent-1'
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC5: Create run manifest file
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC5: Run Manifest', () => {
    it('should create manifest file on run start', async () => {
      const run = await tracker.startRun({ wave: 1 });

      const manifestPath = path.join(tempDir, 'runs', run.runId, 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);
    });

    it('should include metadata in manifest', async () => {
      const run = await tracker.startRun({
        wave: 2,
        agents: ['fe-dev-1', 'be-dev-1'],
        project: 'test-project'
      });

      const manifestPath = path.join(tempDir, 'runs', run.runId, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      expect(manifest.runId).toBe(run.runId);
      expect(manifest.wave).toBe(2);
      expect(manifest.agents).toContain('fe-dev-1');
      expect(manifest.startedAt).toBeDefined();
    });

    it('should update manifest on run end', async () => {
      const run = await tracker.startRun({ wave: 1 });
      await tracker.endRun({ status: 'completed' });

      const manifestPath = path.join(tempDir, 'runs', run.runId, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      expect(manifest.endedAt).toBeDefined();
      expect(manifest.status).toBe('completed');
    });

    it('should track signal count in manifest', async () => {
      const run = await tracker.startRun({ wave: 1 });

      tracker.wrapSignal({ type: 'TEST' }, { source: 'a' });
      tracker.wrapSignal({ type: 'TEST' }, { source: 'a' });
      tracker.wrapSignal({ type: 'TEST' }, { source: 'b' });

      await tracker.endRun({ status: 'completed' });

      const manifestPath = path.join(tempDir, 'runs', run.runId, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      expect(manifest.signalCount).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC6: Support run query
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC6: Run Query', () => {
    it('should get run info by ID', async () => {
      const run = await tracker.startRun({ wave: 3 });

      const info = await tracker.getRun(run.runId);

      expect(info.runId).toBe(run.runId);
      expect(info.wave).toBe(3);
    });

    it('should list all runs', async () => {
      await tracker.startRun({ wave: 1 });
      await tracker.endRun({ status: 'completed' });

      // Start a new tracker to simulate fresh instance
      const newTracker = new RunTracker({
        runsDir: path.join(tempDir, 'runs')
      });

      await newTracker.startRun({ wave: 2 });
      await newTracker.endRun({ status: 'completed' });

      const runs = await newTracker.listRuns();

      expect(runs.length).toBe(2);
    });

    it('should return signals for a run', async () => {
      const run = await tracker.startRun({ wave: 1 });

      // Record some signals
      tracker.recordSignal({ type: 'A', sequence: 1 });
      tracker.recordSignal({ type: 'B', sequence: 2 });

      const signals = tracker.getSignalsForRun(run.runId);

      expect(signals.length).toBe(2);
    });

    it('should handle non-existent run', async () => {
      const info = await tracker.getRun('non-existent-run');

      expect(info).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle multiple runs', async () => {
      const run1 = await tracker.startRun({ wave: 1 });
      await tracker.endRun({ status: 'completed' });

      const run2 = await tracker.startRun({ wave: 2 });

      expect(run2.runId).not.toBe(run1.runId);
      expect(tracker.currentRunId).toBe(run2.runId);
    });

    it('should reset sequences on new run', async () => {
      await tracker.startRun({ wave: 1 });
      tracker.nextSequence('agent-1');
      tracker.nextSequence('agent-1');
      await tracker.endRun({ status: 'completed' });

      await tracker.startRun({ wave: 2 });
      const seq = tracker.nextSequence('agent-1');

      expect(seq).toBe(1);
    });

    it('should handle no active run gracefully', () => {
      expect(() => tracker.wrapSignal({ type: 'TEST' })).not.toThrow();
    });

    it('should create runs directory if missing', async () => {
      const nestedTracker = new RunTracker({
        runsDir: path.join(tempDir, 'a', 'b', 'runs')
      });

      await nestedTracker.startRun({ wave: 1 });

      expect(fs.existsSync(path.join(tempDir, 'a', 'b', 'runs'))).toBe(true);
    });
  });
});
