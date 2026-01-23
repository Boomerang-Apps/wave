// ═══════════════════════════════════════════════════════════════════════════════
// DORA METRICS TRACKER TESTS
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for the four key DORA DevOps metrics
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DORAMetricsTracker } from '../utils/dora-metrics.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('DORAMetricsTracker', () => {
  let tracker;
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dora-test-'));
    tracker = new DORAMetricsTracker(tempDir);
    tracker.ensureDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Deployment Recording', () => {
    it('should record a successful deployment', () => {
      const event = tracker.recordDeployment({
        wave: 1,
        storyId: 'STORY-001',
        commitSha: 'abc123',
        environment: 'production',
        success: true
      });

      expect(event.type).toBe('deployment');
      expect(event.wave).toBe(1);
      expect(event.story_id).toBe('STORY-001');
      expect(event.success).toBe(true);
      expect(event.id).toMatch(/^dora-/);
    });

    it('should record a failed deployment', () => {
      const event = tracker.recordDeployment({
        wave: 1,
        storyId: 'STORY-002',
        commitSha: 'def456',
        success: false
      });

      expect(event.success).toBe(false);
    });

    it('should persist deployments to file', () => {
      tracker.recordDeployment({
        wave: 1,
        storyId: 'STORY-001',
        commitSha: 'abc123'
      });

      const events = tracker.readEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('deployment');
    });
  });

  describe('Lead Time Recording', () => {
    it('should calculate lead time in seconds', () => {
      const firstCommit = '2026-01-23T09:00:00Z';
      const deployed = '2026-01-23T12:00:00Z';

      const event = tracker.recordLeadTime({
        wave: 1,
        storyId: 'STORY-001',
        firstCommitAt: firstCommit,
        deployedAt: deployed
      });

      expect(event.type).toBe('commit_to_deploy');
      expect(event.lead_time_seconds).toBe(10800); // 3 hours
    });

    it('should record gates traversed', () => {
      const event = tracker.recordLeadTime({
        wave: 1,
        storyId: 'STORY-001',
        firstCommitAt: '2026-01-23T09:00:00Z',
        deployedAt: '2026-01-23T12:00:00Z',
        gatesTraversed: [0, 1, 2, 3, 4, 5, 6, 7],
        retries: 1
      });

      expect(event.gates_traversed).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(event.retries).toBe(1);
    });
  });

  describe('Failure Recording', () => {
    it('should record a failure event', () => {
      const event = tracker.recordFailure({
        wave: 1,
        storyId: 'STORY-001',
        failureType: 'deployment_failed',
        gate: 7,
        error: 'Build failed',
        rollbackRequired: true
      });

      expect(event.type).toBe('failure');
      expect(event.failure_type).toBe('deployment_failed');
      expect(event.rollback_required).toBe(true);
      expect(event.failure_id).toMatch(/^failure-/);
    });
  });

  describe('Recovery Recording (MTTR)', () => {
    it('should calculate MTTR in seconds', () => {
      const failedAt = '2026-01-23T12:00:00Z';
      const recoveredAt = '2026-01-23T12:30:00Z';

      const event = tracker.recordRecovery({
        wave: 1,
        storyId: 'STORY-001',
        failureId: 'failure-12345',
        failedAt,
        recoveredAt,
        resolution: 'Hotfix deployed'
      });

      expect(event.type).toBe('recovery');
      expect(event.mttr_seconds).toBe(1800); // 30 minutes
      expect(event.resolution).toBe('Hotfix deployed');
    });
  });

  describe('Metrics Calculation', () => {
    beforeEach(() => {
      // Add sample events for a week
      const baseDate = new Date('2026-01-20T00:00:00Z');

      // Day 1: 2 successful deployments
      tracker.recordDeployment({
        wave: 1,
        storyId: 'STORY-001',
        timestamp: new Date(baseDate.getTime() + 1000 * 3600 * 10).toISOString()
      });
      tracker.recordDeployment({
        wave: 1,
        storyId: 'STORY-002',
        timestamp: new Date(baseDate.getTime() + 1000 * 3600 * 14).toISOString()
      });

      // Day 2: 1 deployment
      tracker.recordDeployment({
        wave: 1,
        storyId: 'STORY-003',
        timestamp: new Date(baseDate.getTime() + 1000 * 3600 * 34).toISOString()
      });

      // Lead times
      tracker.recordLeadTime({
        wave: 1,
        storyId: 'STORY-001',
        firstCommitAt: new Date(baseDate.getTime()).toISOString(),
        deployedAt: new Date(baseDate.getTime() + 1000 * 3600 * 10).toISOString()
      });
      tracker.recordLeadTime({
        wave: 1,
        storyId: 'STORY-002',
        firstCommitAt: new Date(baseDate.getTime() + 1000 * 3600 * 5).toISOString(),
        deployedAt: new Date(baseDate.getTime() + 1000 * 3600 * 14).toISOString()
      });

      // 1 failure and recovery
      tracker.recordFailure({
        wave: 1,
        storyId: 'STORY-003',
        error: 'Test failure',
        timestamp: new Date(baseDate.getTime() + 1000 * 3600 * 35).toISOString()
      });
      tracker.recordRecovery({
        wave: 1,
        storyId: 'STORY-003',
        failedAt: new Date(baseDate.getTime() + 1000 * 3600 * 35).toISOString(),
        recoveredAt: new Date(baseDate.getTime() + 1000 * 3600 * 36).toISOString(),
        timestamp: new Date(baseDate.getTime() + 1000 * 3600 * 36).toISOString()
      });
    });

    it('should calculate deployment frequency', () => {
      const metrics = tracker.calculateMetrics('2026-01-20T00:00:00Z', '2026-01-27T23:59:59Z');

      expect(metrics.metrics.deployment_frequency.total_deployments).toBe(3);
      expect(parseFloat(metrics.metrics.deployment_frequency.per_day)).toBeGreaterThan(0);
    });

    it('should calculate average lead time', () => {
      const metrics = tracker.calculateMetrics('2026-01-20T00:00:00Z', '2026-01-27T23:59:59Z');

      expect(metrics.metrics.lead_time_seconds.avg).toBeGreaterThan(0);
      expect(metrics.metrics.lead_time_seconds.median).toBeGreaterThan(0);
    });

    it('should calculate MTTR', () => {
      const metrics = tracker.calculateMetrics('2026-01-20T00:00:00Z', '2026-01-27T23:59:59Z');

      expect(metrics.metrics.mttr_seconds.avg).toBe(3600); // 1 hour
      expect(metrics.metrics.mttr_seconds.incidents).toBe(1);
    });

    it('should calculate change failure rate', () => {
      const metrics = tracker.calculateMetrics('2026-01-20T00:00:00Z', '2026-01-27T23:59:59Z');

      expect(metrics.metrics.change_failure_rate.failures).toBe(1);
      expect(metrics.metrics.change_failure_rate.total).toBe(3);
      expect(metrics.metrics.change_failure_rate.rate).toBeCloseTo(0.333, 2);
    });

    it('should list waves completed', () => {
      const metrics = tracker.calculateMetrics('2026-01-20T00:00:00Z', '2026-01-27T23:59:59Z');

      expect(metrics.waves_completed).toContain(1);
    });

    it('should list stories deployed', () => {
      const metrics = tracker.calculateMetrics('2026-01-20T00:00:00Z', '2026-01-27T23:59:59Z');

      expect(metrics.stories_deployed).toContain('STORY-001');
      expect(metrics.stories_deployed).toContain('STORY-002');
      expect(metrics.stories_deployed).toContain('STORY-003');
    });
  });

  describe('Rating Functions', () => {
    it('should rate deployment frequency correctly', () => {
      expect(tracker.rateDeploymentFrequency(2)).toBe('elite');
      expect(tracker.rateDeploymentFrequency(0.5)).toBe('high');
      expect(tracker.rateDeploymentFrequency(0.1)).toBe('medium');
      expect(tracker.rateDeploymentFrequency(0.01)).toBe('low');
    });

    it('should rate lead time correctly', () => {
      expect(tracker.rateLeadTime(1800)).toBe('elite'); // 30 minutes
      expect(tracker.rateLeadTime(86400 * 3)).toBe('high'); // 3 days
      expect(tracker.rateLeadTime(86400 * 20)).toBe('medium'); // 20 days
      expect(tracker.rateLeadTime(86400 * 60)).toBe('low'); // 60 days
    });

    it('should rate MTTR correctly', () => {
      expect(tracker.rateMTTR(1800)).toBe('elite'); // 30 minutes
      expect(tracker.rateMTTR(43200)).toBe('high'); // 12 hours
      expect(tracker.rateMTTR(86400 * 3)).toBe('medium'); // 3 days
      expect(tracker.rateMTTR(86400 * 14)).toBe('low'); // 14 days
    });

    it('should rate change failure rate correctly', () => {
      expect(tracker.rateChangeFailureRate(0.03)).toBe('elite');
      expect(tracker.rateChangeFailureRate(0.07)).toBe('high');
      expect(tracker.rateChangeFailureRate(0.12)).toBe('medium');
      expect(tracker.rateChangeFailureRate(0.25)).toBe('low');
    });
  });

  describe('Overall Rating', () => {
    it('should calculate overall rating', () => {
      const eliteMetrics = {
        deployment_frequency: { rating: 'elite' },
        lead_time_seconds: { rating: 'elite' },
        mttr_seconds: { rating: 'elite' },
        change_failure_rate: { rating: 'elite' }
      };
      expect(tracker.getOverallRating(eliteMetrics)).toBe('elite');

      const mixedMetrics = {
        deployment_frequency: { rating: 'high' },
        lead_time_seconds: { rating: 'high' },
        mttr_seconds: { rating: 'medium' },
        change_failure_rate: { rating: 'high' }
      };
      expect(tracker.getOverallRating(mixedMetrics)).toBe('high');

      const lowMetrics = {
        deployment_frequency: { rating: 'low' },
        lead_time_seconds: { rating: 'low' },
        mttr_seconds: { rating: 'low' },
        change_failure_rate: { rating: 'low' }
      };
      expect(tracker.getOverallRating(lowMetrics)).toBe('low');
    });
  });

  describe('Weekly Summary', () => {
    it('should generate weekly summary file', () => {
      tracker.recordDeployment({
        wave: 1,
        storyId: 'STORY-001'
      });

      const summary = tracker.generateWeeklySummary(0);

      expect(summary.period).toMatch(/^\d{4}-W\d{2}$/);
      expect(summary.start_date).toBeTruthy();
      expect(summary.end_date).toBeTruthy();
      expect(summary.metrics).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty metrics', () => {
      const emptyTracker = new DORAMetricsTracker(tempDir);
      const metrics = emptyTracker.calculateMetrics('2026-01-01', '2026-01-31');

      expect(metrics.metrics.deployment_frequency.total_deployments).toBe(0);
      expect(metrics.metrics.lead_time_seconds.avg).toBe(0);
      expect(metrics.metrics.mttr_seconds.avg).toBe(0);
      expect(metrics.metrics.change_failure_rate.rate).toBe(0);
    });

    it('should handle missing project path', () => {
      const noPathTracker = new DORAMetricsTracker(null);
      const result = noPathTracker.recordDeployment({ wave: 1, storyId: 'TEST' });

      expect(result).toBeNull();
    });

    it('should allow setting project path dynamically', () => {
      const dynamicTracker = new DORAMetricsTracker(null);
      dynamicTracker.setProjectPath(tempDir);

      const event = dynamicTracker.recordDeployment({
        wave: 1,
        storyId: 'STORY-001'
      });

      expect(event).not.toBeNull();
      expect(event.story_id).toBe('STORY-001');
    });
  });
});
