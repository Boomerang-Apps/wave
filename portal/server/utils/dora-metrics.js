// ═══════════════════════════════════════════════════════════════════════════════
// DORA METRICS TRACKER
// ═══════════════════════════════════════════════════════════════════════════════
// Tracks the four key DORA DevOps metrics for delivery performance
// Based on Google DORA Research: https://dora.dev/guides/dora-metrics-four-keys/
// ═══════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';

/**
 * DORA Metrics Tracker
 *
 * The four key metrics:
 * 1. Deployment Frequency - How often code is deployed to production
 * 2. Lead Time for Changes - Time from commit to production
 * 3. Mean Time to Recovery (MTTR) - Time from failure to recovery
 * 4. Change Failure Rate - Percentage of deployments causing failures
 */
class DORAMetricsTracker {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.metricsDir = projectPath ? path.join(projectPath, '.claude', 'metrics') : null;
    this.metricsFile = this.metricsDir ? path.join(this.metricsDir, 'dora.jsonl') : null;
  }

  /**
   * Set project path (for dynamic configuration)
   */
  setProjectPath(projectPath) {
    this.projectPath = projectPath;
    this.metricsDir = path.join(projectPath, '.claude', 'metrics');
    this.metricsFile = path.join(this.metricsDir, 'dora.jsonl');
  }

  /**
   * Ensure metrics directory exists
   */
  ensureDir() {
    if (!this.metricsDir) return false;
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
    return true;
  }

  /**
   * Record a DORA event
   */
  recordEvent(event) {
    if (!this.ensureDir()) return null;

    const record = {
      id: `dora-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...event,
      recorded_at: new Date().toISOString()
    };

    fs.appendFileSync(this.metricsFile, JSON.stringify(record) + '\n');
    return record;
  }

  /**
   * Record a deployment event
   */
  recordDeployment(data) {
    return this.recordEvent({
      type: 'deployment',
      wave: data.wave,
      story_id: data.storyId,
      commit_sha: data.commitSha,
      environment: data.environment || 'production',
      success: data.success !== false,
      timestamp: data.timestamp || new Date().toISOString()
    });
  }

  /**
   * Record lead time (commit to deploy)
   */
  recordLeadTime(data) {
    const firstCommitAt = new Date(data.firstCommitAt);
    const deployedAt = new Date(data.deployedAt || new Date());
    const leadTimeSeconds = Math.round((deployedAt - firstCommitAt) / 1000);

    return this.recordEvent({
      type: 'commit_to_deploy',
      wave: data.wave,
      story_id: data.storyId,
      first_commit_at: data.firstCommitAt,
      deployed_at: deployedAt.toISOString(),
      lead_time_seconds: leadTimeSeconds,
      gates_traversed: data.gatesTraversed || [],
      retries: data.retries || 0,
      timestamp: data.timestamp || deployedAt.toISOString()
    });
  }

  /**
   * Record a failure event
   */
  recordFailure(data) {
    const timestamp = data.timestamp || new Date().toISOString();
    return this.recordEvent({
      type: 'failure',
      failure_id: `failure-${Date.now()}`,
      wave: data.wave,
      story_id: data.storyId,
      failure_type: data.failureType || 'deployment_failed',
      gate: data.gate,
      error: data.error,
      rollback_required: data.rollbackRequired || false,
      started_at: data.startedAt || timestamp,
      timestamp: timestamp
    });
  }

  /**
   * Record a recovery event (MTTR)
   */
  recordRecovery(data) {
    const failedAt = new Date(data.failedAt);
    const recoveredAt = new Date(data.recoveredAt || new Date());
    const mttrSeconds = Math.round((recoveredAt - failedAt) / 1000);

    return this.recordEvent({
      type: 'recovery',
      wave: data.wave,
      story_id: data.storyId,
      failure_id: data.failureId,
      failed_at: data.failedAt,
      recovered_at: recoveredAt.toISOString(),
      mttr_seconds: mttrSeconds,
      resolution: data.resolution,
      timestamp: data.timestamp || recoveredAt.toISOString()
    });
  }

  /**
   * Read all events from the metrics file
   */
  readEvents() {
    if (!this.metricsFile || !fs.existsSync(this.metricsFile)) {
      return [];
    }

    const content = fs.readFileSync(this.metricsFile, 'utf8');
    return content.trim().split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Get events within a date range
   */
  getEventsInRange(startDate, endDate) {
    const events = this.readEvents();
    const start = new Date(startDate);
    const end = new Date(endDate);

    return events.filter(e => {
      const ts = new Date(e.timestamp);
      return ts >= start && ts <= end;
    });
  }

  /**
   * Calculate DORA metrics for a period
   */
  calculateMetrics(startDate, endDate) {
    const events = this.getEventsInRange(startDate, endDate);

    const deployments = events.filter(e => e.type === 'deployment');
    const successfulDeployments = deployments.filter(e => e.success);
    const failures = events.filter(e => e.type === 'failure');
    const leadTimes = events.filter(e => e.type === 'commit_to_deploy');
    const recoveries = events.filter(e => e.type === 'recovery');

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = (end - start) / (1000 * 60 * 60 * 24);

    // Deployment Frequency
    const deploymentFrequency = {
      total_deployments: successfulDeployments.length,
      per_day: days > 0 ? (successfulDeployments.length / days).toFixed(2) : 0,
      rating: this.rateDeploymentFrequency(successfulDeployments.length / Math.max(days, 1))
    };

    // Lead Time
    const leadTimeSeconds = leadTimes.map(e => e.lead_time_seconds);
    const avgLeadTime = leadTimeSeconds.length > 0
      ? leadTimeSeconds.reduce((a, b) => a + b, 0) / leadTimeSeconds.length
      : 0;
    const sortedLeadTimes = [...leadTimeSeconds].sort((a, b) => a - b);

    const leadTime = {
      avg: Math.round(avgLeadTime),
      median: sortedLeadTimes.length > 0 ? sortedLeadTimes[Math.floor(sortedLeadTimes.length / 2)] : 0,
      p95: sortedLeadTimes.length > 0 ? sortedLeadTimes[Math.floor(sortedLeadTimes.length * 0.95)] : 0,
      rating: this.rateLeadTime(avgLeadTime)
    };

    // MTTR
    const mttrSeconds = recoveries.map(e => e.mttr_seconds);
    const avgMttr = mttrSeconds.length > 0
      ? mttrSeconds.reduce((a, b) => a + b, 0) / mttrSeconds.length
      : 0;

    const mttr = {
      avg: Math.round(avgMttr),
      median: mttrSeconds.length > 0 ? mttrSeconds.sort((a, b) => a - b)[Math.floor(mttrSeconds.length / 2)] : 0,
      incidents: failures.length,
      rating: this.rateMTTR(avgMttr)
    };

    // Change Failure Rate
    const totalDeployments = deployments.length;
    const failureRate = totalDeployments > 0 ? failures.length / totalDeployments : 0;

    const changeFailureRate = {
      failures: failures.length,
      total: totalDeployments,
      rate: parseFloat(failureRate.toFixed(3)),
      rating: this.rateChangeFailureRate(failureRate)
    };

    return {
      period: {
        start: startDate,
        end: endDate,
        days: Math.round(days)
      },
      metrics: {
        deployment_frequency: deploymentFrequency,
        lead_time_seconds: leadTime,
        mttr_seconds: mttr,
        change_failure_rate: changeFailureRate
      },
      waves_completed: [...new Set(successfulDeployments.map(e => e.wave))],
      stories_deployed: [...new Set(successfulDeployments.map(e => e.story_id))],
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Generate weekly summary
   */
  generateWeeklySummary(weekOffset = 0) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek - (weekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const year = startOfWeek.getFullYear();
    const weekNum = this.getWeekNumber(startOfWeek);

    const calculated = this.calculateMetrics(startOfWeek.toISOString(), endOfWeek.toISOString());
    const summary = {
      period: `${year}-W${String(weekNum).padStart(2, '0')}`,
      start_date: startOfWeek.toISOString().split('T')[0],
      end_date: endOfWeek.toISOString().split('T')[0],
      metrics: calculated.metrics,
      waves_completed: calculated.waves_completed,
      stories_deployed: calculated.stories_deployed,
      generated_at: calculated.generated_at
    };

    // Save summary
    if (this.metricsDir) {
      const summaryFile = path.join(this.metricsDir, `dora-summary-${summary.period}.json`);
      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    }

    return summary;
  }

  /**
   * Get week number
   */
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Rating functions based on DORA benchmarks

  rateDeploymentFrequency(perDay) {
    if (perDay >= 1) return 'elite';
    if (perDay >= 0.14) return 'high'; // ~weekly
    if (perDay >= 0.033) return 'medium'; // ~monthly
    return 'low';
  }

  rateLeadTime(seconds) {
    if (seconds === 0) return 'unknown';
    if (seconds < 3600) return 'elite'; // < 1 hour
    if (seconds < 86400 * 7) return 'high'; // < 1 week
    if (seconds < 86400 * 30) return 'medium'; // < 1 month
    return 'low';
  }

  rateMTTR(seconds) {
    if (seconds === 0) return 'unknown';
    if (seconds < 3600) return 'elite'; // < 1 hour
    if (seconds < 86400) return 'high'; // < 1 day
    if (seconds < 86400 * 7) return 'medium'; // < 1 week
    return 'low';
  }

  rateChangeFailureRate(rate) {
    if (rate < 0.05) return 'elite'; // < 5%
    if (rate < 0.10) return 'high'; // < 10%
    if (rate < 0.15) return 'medium'; // < 15%
    return 'low';
  }

  /**
   * Get overall DORA performance level
   */
  getOverallRating(metrics) {
    const ratings = {
      elite: 4,
      high: 3,
      medium: 2,
      low: 1,
      unknown: 0
    };

    const scores = [
      ratings[metrics.deployment_frequency.rating] || 0,
      ratings[metrics.lead_time_seconds.rating] || 0,
      ratings[metrics.mttr_seconds.rating] || 0,
      ratings[metrics.change_failure_rate.rating] || 0
    ];

    const avg = scores.reduce((a, b) => a + b, 0) / 4;

    if (avg >= 3.5) return 'elite';
    if (avg >= 2.5) return 'high';
    if (avg >= 1.5) return 'medium';
    return 'low';
  }
}

// Export
export { DORAMetricsTracker };
export default DORAMetricsTracker;
