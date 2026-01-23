// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL DEDUPLICATOR - IDEMPOTENCY FOR SIGNAL PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════
// IMP-005: Prevent duplicate signal processing
//
// Sources:
// - https://www.morling.dev/blog/on-idempotency-keys/
// - https://www.designgurus.io/blog/idempotency-in-distributed-systems
// - https://blog.algomaster.io/p/idempotency-in-distributed-systems
// - https://airbyte.com/data-engineering-resources/idempotency-in-data-pipelines
//
// Key principle: "Exactly-once is an illusion - idempotency is the practical path"
// ═══════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const DEDUP_DEFAULTS = {
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  storePath: '.claude/processed-signals.json'
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique event ID (UUID v4)
 * @returns {string} UUID string
 */
export function generateEventId() {
  return crypto.randomUUID();
}

/**
 * Create a signal object with an embedded event_id
 * @param {Object} signalData - Signal data
 * @returns {Object} Signal with event_id
 */
export function createSignalWithId(signalData) {
  if (signalData.event_id) {
    return signalData;
  }
  return {
    ...signalData,
    event_id: generateEventId()
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SignalDeduplicator Class
// ─────────────────────────────────────────────────────────────────────────────

export class SignalDeduplicator {
  constructor(options = {}) {
    this.storePath = options.storePath ?? DEDUP_DEFAULTS.storePath;
    this.ttlMs = options.ttlMs ?? DEDUP_DEFAULTS.ttlMs;

    // In-memory store with persistence
    this.processedIds = {};
    this.sequences = {}; // source -> highest sequence

    // Lock for concurrent operations
    this._lock = false;

    // Load existing state
    this._loadState();
  }

  /**
   * Load state from persistent store
   */
  _loadState() {
    try {
      if (fs.existsSync(this.storePath)) {
        const content = fs.readFileSync(this.storePath, 'utf8');
        const data = JSON.parse(content);
        this.processedIds = data.processedIds || {};
        this.sequences = data.sequences || {};
      }
    } catch {
      // Start fresh on any error (corrupted file, etc.)
      this.processedIds = {};
      this.sequences = {};
    }
  }

  /**
   * Save state to persistent store
   */
  async _saveState() {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const content = JSON.stringify({
        processedIds: this.processedIds,
        sequences: this.sequences
      }, null, 2);

      fs.writeFileSync(this.storePath, content, 'utf8');
    } catch (error) {
      console.error('[SignalDeduplicator] Failed to save state:', error.message);
    }
  }

  /**
   * Check if an event ID has been processed
   * @param {string} eventId - Event ID to check
   * @returns {Object} Check result { isDuplicate, eventId, firstSeenAt }
   */
  async check(eventId) {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    const existing = this.processedIds[eventId];

    if (existing) {
      return {
        isDuplicate: true,
        eventId,
        firstSeenAt: existing.processedAt
      };
    }

    return {
      isDuplicate: false,
      eventId
    };
  }

  /**
   * Check and mark an event ID as processed
   * @param {string} eventId - Event ID to check and mark
   * @param {Object} options - Options including sequence and source
   * @returns {Object} Result with isDuplicate, outOfOrder, sequenceGap
   */
  async checkAndMark(eventId, options = {}) {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    // Check for duplicate
    const existing = this.processedIds[eventId];
    if (existing) {
      return {
        isDuplicate: true,
        eventId,
        firstSeenAt: existing.processedAt
      };
    }

    // Acquire lock for concurrent safety
    while (this._lock) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    this._lock = true;

    try {
      // Double-check after acquiring lock
      if (this.processedIds[eventId]) {
        return {
          isDuplicate: true,
          eventId,
          firstSeenAt: this.processedIds[eventId].processedAt
        };
      }

      const now = Date.now();
      const result = {
        isDuplicate: false,
        eventId,
        processedAt: now
      };

      // Handle sequence numbers if provided
      if (options.sequence !== undefined && options.source) {
        const highestSeq = this.sequences[options.source] || 0;

        if (options.sequence < highestSeq) {
          result.outOfOrder = true;
        } else if (options.sequence > highestSeq + 1) {
          result.sequenceGap = true;
          this.sequences[options.source] = options.sequence;
        } else {
          this.sequences[options.source] = options.sequence;
        }
      }

      // Mark as processed
      this.processedIds[eventId] = {
        processedAt: now,
        sequence: options.sequence,
        source: options.source
      };

      // Persist
      await this._saveState();

      return result;

    } finally {
      this._lock = false;
    }
  }

  /**
   * Get highest processed sequence for a source
   * @param {string} source - Source identifier
   * @returns {number} Highest sequence number
   */
  getHighestSequence(source) {
    return this.sequences[source] || 0;
  }

  /**
   * Clean up entries older than TTL
   * @returns {Object} Cleanup stats { removed, remaining }
   */
  async cleanup() {
    const now = Date.now();
    const cutoff = now - this.ttlMs;
    let removed = 0;

    for (const [eventId, data] of Object.entries(this.processedIds)) {
      if (data.processedAt < cutoff) {
        delete this.processedIds[eventId];
        removed++;
      }
    }

    const remaining = Object.keys(this.processedIds).length;

    await this._saveState();

    return { removed, remaining };
  }

  /**
   * Get store statistics
   * @returns {Object} Stats
   */
  getStats() {
    return {
      totalProcessed: Object.keys(this.processedIds).length,
      storePath: this.storePath,
      ttlMs: this.ttlMs,
      sources: Object.keys(this.sequences).length
    };
  }

  /**
   * Clear all processed IDs
   */
  async clear() {
    this.processedIds = {};
    this.sequences = {};
    await this._saveState();
  }
}

export default SignalDeduplicator;
