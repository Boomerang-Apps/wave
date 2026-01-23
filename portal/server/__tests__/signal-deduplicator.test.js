// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL DEDUPLICATOR TESTS (TDD - Written First)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for IMP-005: Signal idempotency - Prevent duplicate processing
//
// Sources:
// - https://www.morling.dev/blog/on-idempotency-keys/
// - https://www.designgurus.io/blog/idempotency-in-distributed-systems
// - https://blog.algomaster.io/p/idempotency-in-distributed-systems
// - https://airbyte.com/data-engineering-resources/idempotency-in-data-pipelines
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import the module we're going to implement
import {
  SignalDeduplicator,
  generateEventId,
  createSignalWithId,
  DEDUP_DEFAULTS
} from '../utils/signal-deduplicator.js';

describe('SignalDeduplicator', () => {
  let tempDir;
  let deduplicator;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'signal-dedup-test-'));
    deduplicator = new SignalDeduplicator({
      storePath: path.join(tempDir, 'processed-signals.json')
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC1: Generate unique event_id for each signal
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC1: Event ID Generation', () => {
    it('should generate unique event IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateEventId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate valid UUID format', () => {
      const id = generateEventId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should create signal with embedded event_id', () => {
      const signal = createSignalWithId({
        type: 'STORY_COMPLETE',
        story_id: 'STORY-001'
      });

      expect(signal).toHaveProperty('event_id');
      expect(signal.event_id).toBeTruthy();
      expect(signal.type).toBe('STORY_COMPLETE');
    });

    it('should not overwrite existing event_id', () => {
      const existingId = 'existing-event-id-123';
      const signal = createSignalWithId({
        type: 'TEST',
        event_id: existingId
      });

      expect(signal.event_id).toBe(existingId);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC2: Detect duplicate signals before processing
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC2: Duplicate Detection', () => {
    it('should detect first signal as not duplicate', async () => {
      const eventId = generateEventId();
      const result = await deduplicator.check(eventId);

      expect(result.isDuplicate).toBe(false);
    });

    it('should detect second occurrence as duplicate', async () => {
      const eventId = generateEventId();

      // First check and mark
      await deduplicator.checkAndMark(eventId);

      // Second check
      const result = await deduplicator.check(eventId);

      expect(result.isDuplicate).toBe(true);
    });

    it('should return firstSeenAt for duplicates', async () => {
      const eventId = generateEventId();

      // First occurrence
      const first = await deduplicator.checkAndMark(eventId);
      const firstSeenAt = first.processedAt;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second occurrence
      const second = await deduplicator.check(eventId);

      expect(second.isDuplicate).toBe(true);
      expect(second.firstSeenAt).toBe(firstSeenAt);
    });

    it('should handle concurrent checks for same ID', async () => {
      const eventId = generateEventId();

      // Simulate concurrent checks
      const checks = await Promise.all([
        deduplicator.checkAndMark(eventId),
        deduplicator.checkAndMark(eventId),
        deduplicator.checkAndMark(eventId)
      ]);

      // Only one should be non-duplicate
      const nonDuplicates = checks.filter(c => !c.isDuplicate);
      expect(nonDuplicates.length).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC3: Store processed signal IDs persistently
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC3: Persistent Storage', () => {
    it('should persist processed IDs to file', async () => {
      const eventId = generateEventId();
      await deduplicator.checkAndMark(eventId);

      // Check file exists
      const storePath = path.join(tempDir, 'processed-signals.json');
      expect(fs.existsSync(storePath)).toBe(true);

      // Check content
      const content = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      expect(content.processedIds[eventId]).toBeDefined();
    });

    it('should reload state from file on new instance', async () => {
      const eventId = generateEventId();
      await deduplicator.checkAndMark(eventId);

      // Create new instance with same store path
      const newDeduplicator = new SignalDeduplicator({
        storePath: path.join(tempDir, 'processed-signals.json')
      });

      const result = await newDeduplicator.check(eventId);
      expect(result.isDuplicate).toBe(true);
    });

    it('should handle corrupted store file gracefully', async () => {
      const storePath = path.join(tempDir, 'processed-signals.json');
      fs.writeFileSync(storePath, 'invalid json {{{');

      const newDeduplicator = new SignalDeduplicator({ storePath });

      // Should not throw, should start fresh
      const eventId = generateEventId();
      const result = await newDeduplicator.check(eventId);
      expect(result.isDuplicate).toBe(false);
    });

    it('should create store directory if missing', async () => {
      const nestedPath = path.join(tempDir, 'a', 'b', 'c', 'signals.json');
      const newDeduplicator = new SignalDeduplicator({ storePath: nestedPath });

      await newDeduplicator.checkAndMark(generateEventId());

      expect(fs.existsSync(nestedPath)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC4: Skip duplicate signals gracefully
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC4: Graceful Duplicate Handling', () => {
    it('should return isDuplicate without throwing', async () => {
      const eventId = generateEventId();
      await deduplicator.checkAndMark(eventId);

      // Should not throw
      const result = await deduplicator.check(eventId);
      expect(result.isDuplicate).toBe(true);
    });

    it('should provide full result object for duplicates', async () => {
      const eventId = generateEventId();
      await deduplicator.checkAndMark(eventId);

      const result = await deduplicator.check(eventId);

      expect(result).toHaveProperty('isDuplicate', true);
      expect(result).toHaveProperty('eventId', eventId);
      expect(result).toHaveProperty('firstSeenAt');
    });

    it('should provide result object for non-duplicates', async () => {
      const eventId = generateEventId();

      const result = await deduplicator.check(eventId);

      expect(result).toHaveProperty('isDuplicate', false);
      expect(result).toHaveProperty('eventId', eventId);
    });

    it('checkAndMark should mark and return status', async () => {
      const eventId = generateEventId();

      const result = await deduplicator.checkAndMark(eventId);

      expect(result.isDuplicate).toBe(false);
      expect(result.processedAt).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC5: Support sequence numbers for ordering
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC5: Sequence Number Support', () => {
    it('should accept signals with sequence numbers', async () => {
      const eventId = generateEventId();
      const result = await deduplicator.checkAndMark(eventId, { sequence: 1 });

      expect(result.isDuplicate).toBe(false);
    });

    it('should track highest sequence per source', async () => {
      const source = 'agent-1';

      await deduplicator.checkAndMark(generateEventId(), { sequence: 1, source });
      await deduplicator.checkAndMark(generateEventId(), { sequence: 2, source });

      const highestSeq = deduplicator.getHighestSequence(source);
      expect(highestSeq).toBe(2);
    });

    it('should detect out-of-order signals', async () => {
      const source = 'agent-1';

      await deduplicator.checkAndMark(generateEventId(), { sequence: 5, source });

      // Try to process older sequence
      const result = await deduplicator.checkAndMark(generateEventId(), { sequence: 3, source });

      expect(result.outOfOrder).toBe(true);
    });

    it('should allow processing in order', async () => {
      const source = 'agent-1';

      const r1 = await deduplicator.checkAndMark(generateEventId(), { sequence: 1, source });
      const r2 = await deduplicator.checkAndMark(generateEventId(), { sequence: 2, source });
      const r3 = await deduplicator.checkAndMark(generateEventId(), { sequence: 3, source });

      expect(r1.outOfOrder).toBeFalsy();
      expect(r2.outOfOrder).toBeFalsy();
      expect(r3.outOfOrder).toBeFalsy();
    });

    it('should handle gaps in sequence gracefully', async () => {
      const source = 'agent-1';

      await deduplicator.checkAndMark(generateEventId(), { sequence: 1, source });
      // Skip 2, 3, 4
      const result = await deduplicator.checkAndMark(generateEventId(), { sequence: 5, source });

      // Should still process (gaps allowed, just logged)
      expect(result.isDuplicate).toBe(false);
      expect(result.sequenceGap).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC6: TTL-based cleanup of old processed IDs
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC6: TTL Cleanup', () => {
    it('should support configurable TTL', () => {
      const customDedup = new SignalDeduplicator({
        storePath: path.join(tempDir, 'custom.json'),
        ttlMs: 1000 // 1 second
      });

      expect(customDedup.ttlMs).toBe(1000);
    });

    it('should have default TTL of 24 hours', () => {
      expect(DEDUP_DEFAULTS.ttlMs).toBe(24 * 60 * 60 * 1000);
    });

    it('should clean up entries older than TTL', async () => {
      const shortTtlDedup = new SignalDeduplicator({
        storePath: path.join(tempDir, 'ttl-test.json'),
        ttlMs: 50 // 50ms for testing
      });

      const eventId = generateEventId();
      await shortTtlDedup.checkAndMark(eventId);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Run cleanup
      await shortTtlDedup.cleanup();

      // Should no longer be tracked
      const result = await shortTtlDedup.check(eventId);
      expect(result.isDuplicate).toBe(false);
    });

    it('should not remove entries within TTL', async () => {
      const eventId = generateEventId();
      await deduplicator.checkAndMark(eventId);

      // Run cleanup immediately
      await deduplicator.cleanup();

      // Should still be tracked (within default 24h TTL)
      const result = await deduplicator.check(eventId);
      expect(result.isDuplicate).toBe(true);
    });

    it('should return cleanup stats', async () => {
      const shortTtlDedup = new SignalDeduplicator({
        storePath: path.join(tempDir, 'cleanup-stats.json'),
        ttlMs: 50
      });

      // Add some entries
      await shortTtlDedup.checkAndMark(generateEventId());
      await shortTtlDedup.checkAndMark(generateEventId());
      await shortTtlDedup.checkAndMark(generateEventId());

      // Wait and cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      const stats = await shortTtlDedup.cleanup();

      expect(stats.removed).toBe(3);
      expect(stats.remaining).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility Functions
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Utility Functions', () => {
    it('should export DEDUP_DEFAULTS', () => {
      expect(DEDUP_DEFAULTS).toHaveProperty('ttlMs');
      expect(DEDUP_DEFAULTS).toHaveProperty('storePath');
    });

    it('should get store stats', async () => {
      await deduplicator.checkAndMark(generateEventId());
      await deduplicator.checkAndMark(generateEventId());

      const stats = deduplicator.getStats();

      expect(stats.totalProcessed).toBe(2);
      expect(stats.storePath).toBeDefined();
    });

    it('should clear all processed IDs', async () => {
      await deduplicator.checkAndMark(generateEventId());
      await deduplicator.checkAndMark(generateEventId());

      await deduplicator.clear();

      const stats = deduplicator.getStats();
      expect(stats.totalProcessed).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle empty event ID', async () => {
      await expect(deduplicator.check('')).rejects.toThrow(/event.*id/i);
    });

    it('should handle null event ID', async () => {
      await expect(deduplicator.check(null)).rejects.toThrow(/event.*id/i);
    });

    it('should handle very long event IDs', async () => {
      const longId = 'x'.repeat(1000);
      const result = await deduplicator.checkAndMark(longId);
      expect(result.isDuplicate).toBe(false);

      const check = await deduplicator.check(longId);
      expect(check.isDuplicate).toBe(true);
    });

    it('should handle special characters in event ID', async () => {
      const specialId = 'event-id-with-special-chars-!@#$%^&*()';
      const result = await deduplicator.checkAndMark(specialId);
      expect(result.isDuplicate).toBe(false);
    });
  });
});
