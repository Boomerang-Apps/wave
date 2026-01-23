// ═══════════════════════════════════════════════════════════════════════════════
// RUN TRACKER - GLOBAL RUN ID AND SEQUENCE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════
// IMP-014: Global run_id and sequence tracking for end-to-end traceability
// Combines IMP-014, IMP-001, IMP-002
//
// Run ID format: run_YYYYMMDD_HHMMSS_w{wave}
// Sequence: monotonically increasing per (run_id, source)
// ═══════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const RUN_ID_FORMAT = /^run_\d{8}_\d{6}_w\d+$/;

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique run ID
 * @param {Object} options - Options including wave number
 * @returns {string} Run ID in format run_YYYYMMDD_HHMMSS_wN
 */
export function generateRunId(options = {}) {
  const now = new Date();
  const wave = options.wave || 1;

  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toISOString().slice(11, 19).replace(/:/g, '');

  return `run_${date}_${time}_w${wave}`;
}

/**
 * Create a signal with run_id added
 * @param {Object} signal - Signal object
 * @param {string} runId - Run ID to add
 * @returns {Object} Signal with run_id
 */
export function createSignalWithRunId(signal, runId) {
  if (signal.run_id) {
    return signal;
  }
  return {
    ...signal,
    run_id: runId
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RunTracker Class
// ─────────────────────────────────────────────────────────────────────────────

export class RunTracker {
  constructor(options = {}) {
    this.runsDir = options.runsDir || '.claude/runs';
    this.currentRunId = null;
    this.currentRun = null;
    this.sequences = {};
    this.signals = [];
    this.warnCallback = null;
  }

  /**
   * Start a new run
   * @param {Object} options - Run options (wave, agents, project)
   * @returns {Object} Run info
   */
  async startRun(options = {}) {
    const runId = generateRunId({ wave: options.wave || 1 });
    const startedAt = new Date().toISOString();

    this.currentRunId = runId;
    this.currentRun = {
      runId,
      wave: options.wave || 1,
      agents: options.agents || [],
      project: options.project || null,
      startedAt,
      status: 'running'
    };

    // Reset sequences for new run
    this.sequences = {};
    this.signals = [];

    // Create manifest
    await this._saveManifest();

    return {
      runId,
      wave: options.wave || 1,
      startedAt
    };
  }

  /**
   * End current run
   * @param {Object} options - End options (status)
   */
  async endRun(options = {}) {
    if (!this.currentRun) return;

    this.currentRun.endedAt = new Date().toISOString();
    this.currentRun.status = options.status || 'completed';
    this.currentRun.signalCount = this.signals.length;

    await this._saveManifest();

    const runId = this.currentRunId;
    this.currentRunId = null;
    this.currentRun = null;

    return { runId, status: options.status };
  }

  /**
   * Save manifest file
   */
  async _saveManifest() {
    if (!this.currentRun) return;

    const runDir = path.join(this.runsDir, this.currentRunId);

    // Ensure directory exists
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    const manifestPath = path.join(runDir, 'manifest.json');
    const manifest = {
      ...this.currentRun,
      signalCount: this.signals.length
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Get next sequence number for a source
   * @param {string} source - Source identifier (agent)
   * @returns {number} Next sequence number
   */
  nextSequence(source) {
    if (!this.sequences[source]) {
      this.sequences[source] = 0;
    }
    this.sequences[source]++;
    return this.sequences[source];
  }

  /**
   * Get current sequence for a source
   * @param {string} source - Source identifier
   * @returns {number} Current sequence (0 if none)
   */
  getCurrentSequence(source) {
    return this.sequences[source] || 0;
  }

  /**
   * Record a sequence number received
   * @param {string} source - Source identifier
   * @param {number} sequence - Sequence number
   */
  recordSequence(source, sequence) {
    const current = this.sequences[source] || 0;

    if (sequence < current) {
      // Out of order
      if (this.warnCallback) {
        this.warnCallback({
          type: 'out_of_order',
          source,
          expected: current + 1,
          received: sequence
        });
      }
    }

    if (sequence > (this.sequences[source] || 0)) {
      this.sequences[source] = sequence;
    }
  }

  /**
   * Check if a sequence is valid
   * @param {string} source - Source identifier
   * @param {number} sequence - Sequence to check
   * @returns {Object} Check result
   */
  checkSequence(source, sequence) {
    const current = this.sequences[source] || 0;
    const expected = current + 1;

    const result = {
      outOfOrder: sequence < expected,
      hasGap: sequence > expected,
      expected,
      received: sequence,
      gapSize: sequence > expected ? sequence - expected : 0
    };

    return result;
  }

  /**
   * Set warning callback
   * @param {Function} callback - Warning callback
   */
  setWarnCallback(callback) {
    this.warnCallback = callback;
  }

  /**
   * Wrap a signal with run_id and sequence
   * @param {Object} signal - Signal to wrap
   * @param {Object} options - Options (source)
   * @returns {Object} Wrapped signal
   */
  wrapSignal(signal, options = {}) {
    const wrapped = { ...signal };

    if (this.currentRunId) {
      wrapped.run_id = this.currentRunId;
    }

    if (options.source) {
      wrapped.sequence = this.nextSequence(options.source);
      wrapped.source = options.source;
    }

    // Record the wrapped signal for tracking
    this.recordSignal(wrapped);

    return wrapped;
  }

  /**
   * Record a signal for the current run
   * @param {Object} signal - Signal to record
   */
  recordSignal(signal) {
    this.signals.push(signal);
  }

  /**
   * Get signals for a run
   * @param {string} runId - Run ID
   * @returns {Array} Signals
   */
  getSignalsForRun(runId) {
    if (runId === this.currentRunId) {
      return [...this.signals];
    }
    return [];
  }

  /**
   * Get run info by ID
   * @param {string} runId - Run ID
   * @returns {Object|null} Run info
   */
  async getRun(runId) {
    const manifestPath = path.join(this.runsDir, runId, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }

  /**
   * List all runs
   * @returns {Array} List of run info
   */
  async listRuns() {
    if (!fs.existsSync(this.runsDir)) {
      return [];
    }

    const dirs = fs.readdirSync(this.runsDir);
    const runs = [];

    for (const dir of dirs) {
      const manifestPath = path.join(this.runsDir, dir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        runs.push(manifest);
      }
    }

    return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
}

export default RunTracker;
