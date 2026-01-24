// ═══════════════════════════════════════════════════════════════════════════════
// SLACK STATISTICS TESTS (TDD)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for Slack delivery statistics tracking - written BEFORE implementation
// per TDD methodology for WAVE5-SLACK-001 redesign
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';

// These will be implemented after tests are written
import {
  SlackStatistics,
  getSlackStatistics,
  resetSlackStatistics
} from '../slack-statistics.js';

describe('Slack Delivery Statistics', () => {
  let stats;

  beforeEach(() => {
    resetSlackStatistics();
    stats = new SlackStatistics();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Basic Tracking
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Basic Tracking', () => {
    it('should track successful delivery', () => {
      stats.recordDelivery({
        success: true,
        type: 'story_start',
        latency: 150
      });

      expect(stats.getTotalSent()).toBe(1);
      expect(stats.getTotalSuccess()).toBe(1);
      expect(stats.getTotalFailed()).toBe(0);
    });

    it('should track failed delivery', () => {
      stats.recordDelivery({
        success: false,
        type: 'story_start',
        error: 'Network error'
      });

      expect(stats.getTotalSent()).toBe(1);
      expect(stats.getTotalSuccess()).toBe(0);
      expect(stats.getTotalFailed()).toBe(1);
    });

    it('should calculate success rate', () => {
      stats.recordDelivery({ success: true, type: 'info' });
      stats.recordDelivery({ success: true, type: 'info' });
      stats.recordDelivery({ success: false, type: 'info' });

      expect(stats.getSuccessRate()).toBe(66.67); // 2/3 * 100
    });

    it('should return 100% success rate when no failures', () => {
      stats.recordDelivery({ success: true, type: 'info' });
      stats.recordDelivery({ success: true, type: 'info' });

      expect(stats.getSuccessRate()).toBe(100);
    });

    it('should return 0% success rate when all fail', () => {
      stats.recordDelivery({ success: false, type: 'info' });
      stats.recordDelivery({ success: false, type: 'info' });

      expect(stats.getSuccessRate()).toBe(0);
    });

    it('should return null success rate when no deliveries', () => {
      expect(stats.getSuccessRate()).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Latency Tracking
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Latency Tracking', () => {
    it('should track average latency', () => {
      stats.recordDelivery({ success: true, type: 'info', latency: 100 });
      stats.recordDelivery({ success: true, type: 'info', latency: 200 });
      stats.recordDelivery({ success: true, type: 'info', latency: 300 });

      expect(stats.getAverageLatency()).toBe(200);
    });

    it('should track minimum latency', () => {
      stats.recordDelivery({ success: true, type: 'info', latency: 150 });
      stats.recordDelivery({ success: true, type: 'info', latency: 50 });
      stats.recordDelivery({ success: true, type: 'info', latency: 300 });

      expect(stats.getMinLatency()).toBe(50);
    });

    it('should track maximum latency', () => {
      stats.recordDelivery({ success: true, type: 'info', latency: 150 });
      stats.recordDelivery({ success: true, type: 'info', latency: 50 });
      stats.recordDelivery({ success: true, type: 'info', latency: 300 });

      expect(stats.getMaxLatency()).toBe(300);
    });

    it('should track p95 latency', () => {
      // Add 100 samples
      for (let i = 1; i <= 100; i++) {
        stats.recordDelivery({ success: true, type: 'info', latency: i * 10 });
      }

      // p95 should be around 950ms (95th percentile)
      expect(stats.getP95Latency()).toBeGreaterThanOrEqual(940);
      expect(stats.getP95Latency()).toBeLessThanOrEqual(960);
    });

    it('should ignore latency from failed deliveries', () => {
      stats.recordDelivery({ success: true, type: 'info', latency: 100 });
      stats.recordDelivery({ success: false, type: 'info', latency: 5000 });

      expect(stats.getAverageLatency()).toBe(100);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // By-Type Breakdown
  // ─────────────────────────────────────────────────────────────────────────────

  describe('By-Type Breakdown', () => {
    it('should track counts by event type', () => {
      stats.recordDelivery({ success: true, type: 'story_start' });
      stats.recordDelivery({ success: true, type: 'story_start' });
      stats.recordDelivery({ success: true, type: 'story_complete' });
      stats.recordDelivery({ success: true, type: 'escalation' });

      const byType = stats.getByType();

      expect(byType.story_start).toBe(2);
      expect(byType.story_complete).toBe(1);
      expect(byType.escalation).toBe(1);
    });

    it('should track success/failure by type', () => {
      stats.recordDelivery({ success: true, type: 'story_start' });
      stats.recordDelivery({ success: false, type: 'story_start' });
      stats.recordDelivery({ success: true, type: 'escalation' });

      const breakdown = stats.getTypeBreakdown();

      expect(breakdown.story_start.total).toBe(2);
      expect(breakdown.story_start.success).toBe(1);
      expect(breakdown.story_start.failed).toBe(1);
      expect(breakdown.escalation.total).toBe(1);
      expect(breakdown.escalation.success).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // By-Channel Breakdown
  // ─────────────────────────────────────────────────────────────────────────────

  describe('By-Channel Breakdown', () => {
    it('should track counts by channel', () => {
      stats.recordDelivery({ success: true, type: 'info', channel: 'default' });
      stats.recordDelivery({ success: true, type: 'escalation', channel: 'alerts' });
      stats.recordDelivery({ success: true, type: 'budget_warning', channel: 'budget' });

      const byChannel = stats.getByChannel();

      expect(byChannel.default).toBe(1);
      expect(byChannel.alerts).toBe(1);
      expect(byChannel.budget).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Time Window Statistics
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Time Window Statistics', () => {
    it('should track stats for last 24 hours', () => {
      // Add old delivery (should be excluded)
      const oldTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      stats._addDeliveryWithTimestamp({ success: true, type: 'info' }, oldTime);

      // Add recent delivery
      stats.recordDelivery({ success: true, type: 'info' });

      const last24h = stats.getLast24Hours();

      expect(last24h.total).toBe(1);
    });

    it('should track stats for last hour', () => {
      stats.recordDelivery({ success: true, type: 'info' });

      const lastHour = stats.getLastHour();

      expect(lastHour.total).toBe(1);
    });

    it('should return hourly breakdown', () => {
      stats.recordDelivery({ success: true, type: 'info' });

      const hourly = stats.getHourlyBreakdown();

      expect(Array.isArray(hourly)).toBe(true);
      expect(hourly.length).toBe(24);
      expect(hourly[hourly.length - 1].count).toBeGreaterThanOrEqual(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Tracking
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Error Tracking', () => {
    it('should track error messages', () => {
      stats.recordDelivery({ success: false, type: 'info', error: 'Network timeout' });
      stats.recordDelivery({ success: false, type: 'info', error: '401 Unauthorized' });
      stats.recordDelivery({ success: false, type: 'info', error: 'Network timeout' });

      const errors = stats.getErrorBreakdown();

      expect(errors['Network timeout']).toBe(2);
      expect(errors['401 Unauthorized']).toBe(1);
    });

    it('should return recent errors', () => {
      stats.recordDelivery({ success: false, type: 'info', error: 'Test error' });

      const recent = stats.getRecentErrors(5);

      expect(recent.length).toBe(1);
      expect(recent[0].error).toBe('Test error');
      expect(recent[0].timestamp).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Summary for UI
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Summary for UI', () => {
    it('should return structured summary', () => {
      stats.recordDelivery({ success: true, type: 'story_start', latency: 100 });
      stats.recordDelivery({ success: true, type: 'story_complete', latency: 150 });
      stats.recordDelivery({ success: false, type: 'escalation', error: 'Failed' });

      const summary = stats.getSummary();

      expect(summary).toMatchObject({
        total: 3,
        success: 2,
        failed: 1,
        successRate: expect.any(Number),
        averageLatency: expect.any(Number),
        byType: expect.any(Object),
        byChannel: expect.any(Object),
        last24h: expect.any(Object)
      });
    });

    it('should return empty summary when no data', () => {
      const summary = stats.getSummary();

      expect(summary.total).toBe(0);
      expect(summary.successRate).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Singleton Pattern
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Singleton', () => {
    it('should return same instance', () => {
      const first = getSlackStatistics();
      const second = getSlackStatistics();

      expect(first).toBe(second);
    });

    it('should persist data across calls', () => {
      const first = getSlackStatistics();
      first.recordDelivery({ success: true, type: 'info' });

      const second = getSlackStatistics();

      expect(second.getTotalSent()).toBe(1);
    });

    it('should reset on resetSlackStatistics', () => {
      const instance = getSlackStatistics();
      instance.recordDelivery({ success: true, type: 'info' });

      resetSlackStatistics();
      const newInstance = getSlackStatistics();

      expect(newInstance.getTotalSent()).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Retention
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Data Retention', () => {
    it('should limit stored deliveries to prevent memory leak', () => {
      // Add more than the limit
      for (let i = 0; i < 15000; i++) {
        stats.recordDelivery({ success: true, type: 'info' });
      }

      // Should be capped at max retention (e.g., 10000)
      expect(stats.getStoredDeliveriesCount()).toBeLessThanOrEqual(10000);
    });

    it('should prune old deliveries periodically', () => {
      // Add old delivery
      const oldTime = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      stats._addDeliveryWithTimestamp({ success: true, type: 'info' }, oldTime);

      // Trigger prune (keeps last 7 days)
      stats.pruneOldData();

      expect(stats.getTotalSent()).toBe(0);
    });
  });
});
