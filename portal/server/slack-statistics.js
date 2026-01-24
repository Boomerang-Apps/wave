// ═══════════════════════════════════════════════════════════════════════════════
// SLACK STATISTICS MODULE
// ═══════════════════════════════════════════════════════════════════════════════
// Delivery statistics tracking for Slack notifications - WAVE5-SLACK-001
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_STORED_DELIVERIES = 10000;
const RETENTION_DAYS = 7;

/**
 * Slack delivery statistics tracker
 */
export class SlackStatistics {
  constructor() {
    this.deliveries = [];
    this.byType = {};
    this.byChannel = {};
    this.errors = [];
    this.latencies = [];
  }

  /**
   * Record a delivery attempt
   * @param {{ success: boolean, type: string, latency?: number, error?: string, channel?: string }}
   */
  recordDelivery({ success, type, latency, error, channel = 'default' }) {
    const timestamp = Date.now();
    const delivery = { success, type, latency, error, channel, timestamp };

    this.deliveries.push(delivery);

    // Track by type
    if (!this.byType[type]) {
      this.byType[type] = { total: 0, success: 0, failed: 0 };
    }
    this.byType[type].total++;
    if (success) {
      this.byType[type].success++;
    } else {
      this.byType[type].failed++;
    }

    // Track by channel
    if (!this.byChannel[channel]) {
      this.byChannel[channel] = 0;
    }
    this.byChannel[channel]++;

    // Track latency (only for successful deliveries)
    if (success && typeof latency === 'number') {
      this.latencies.push(latency);
    }

    // Track errors
    if (!success && error) {
      this.errors.push({ error, timestamp, type });
    }

    // Enforce max storage
    if (this.deliveries.length > MAX_STORED_DELIVERIES) {
      this.deliveries = this.deliveries.slice(-MAX_STORED_DELIVERIES);
    }
  }

  /**
   * Add delivery with custom timestamp (for testing)
   * @internal
   */
  _addDeliveryWithTimestamp(delivery, timestamp) {
    this.deliveries.push({ ...delivery, timestamp });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Basic Counts
  // ─────────────────────────────────────────────────────────────────────────────

  getTotalSent() {
    return this.deliveries.length;
  }

  getTotalSuccess() {
    return this.deliveries.filter(d => d.success).length;
  }

  getTotalFailed() {
    return this.deliveries.filter(d => !d.success).length;
  }

  getSuccessRate() {
    const total = this.getTotalSent();
    if (total === 0) return null;
    const rate = (this.getTotalSuccess() / total) * 100;
    return Math.round(rate * 100) / 100; // Round to 2 decimal places
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Latency Statistics
  // ─────────────────────────────────────────────────────────────────────────────

  getAverageLatency() {
    if (this.latencies.length === 0) return null;
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencies.length);
  }

  getMinLatency() {
    if (this.latencies.length === 0) return null;
    return Math.min(...this.latencies);
  }

  getMaxLatency() {
    if (this.latencies.length === 0) return null;
    return Math.max(...this.latencies);
  }

  getP95Latency() {
    if (this.latencies.length === 0) return null;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[Math.max(0, index)];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // By-Type Breakdown
  // ─────────────────────────────────────────────────────────────────────────────

  getByType() {
    const counts = {};
    for (const [type, stats] of Object.entries(this.byType)) {
      counts[type] = stats.total;
    }
    return counts;
  }

  getTypeBreakdown() {
    return { ...this.byType };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // By-Channel Breakdown
  // ─────────────────────────────────────────────────────────────────────────────

  getByChannel() {
    return { ...this.byChannel };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Time Window Statistics
  // ─────────────────────────────────────────────────────────────────────────────

  getLast24Hours() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    const recent = this.deliveries.filter(d => d.timestamp > cutoff);
    return {
      total: recent.length,
      success: recent.filter(d => d.success).length,
      failed: recent.filter(d => !d.success).length
    };
  }

  getLastHour() {
    const cutoff = Date.now() - (60 * 60 * 1000);
    const recent = this.deliveries.filter(d => d.timestamp > cutoff);
    return {
      total: recent.length,
      success: recent.filter(d => d.success).length,
      failed: recent.filter(d => !d.success).length
    };
  }

  getHourlyBreakdown() {
    const now = Date.now();
    const hours = [];

    for (let i = 23; i >= 0; i--) {
      const hourStart = now - ((i + 1) * 60 * 60 * 1000);
      const hourEnd = now - (i * 60 * 60 * 1000);
      const inHour = this.deliveries.filter(d => d.timestamp > hourStart && d.timestamp <= hourEnd);

      hours.push({
        hour: 23 - i,
        count: inHour.length,
        success: inHour.filter(d => d.success).length,
        failed: inHour.filter(d => !d.success).length
      });
    }

    return hours;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Error Tracking
  // ─────────────────────────────────────────────────────────────────────────────

  getErrorBreakdown() {
    const counts = {};
    for (const e of this.errors) {
      counts[e.error] = (counts[e.error] || 0) + 1;
    }
    return counts;
  }

  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit).reverse();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Management
  // ─────────────────────────────────────────────────────────────────────────────

  getStoredDeliveriesCount() {
    return this.deliveries.length;
  }

  pruneOldData() {
    const cutoff = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
    this.deliveries = this.deliveries.filter(d => d.timestamp > cutoff);
    this.errors = this.errors.filter(e => e.timestamp > cutoff);

    // Rebuild byType and byChannel from remaining deliveries
    this.byType = {};
    this.byChannel = {};
    this.latencies = [];

    for (const d of this.deliveries) {
      if (!this.byType[d.type]) {
        this.byType[d.type] = { total: 0, success: 0, failed: 0 };
      }
      this.byType[d.type].total++;
      if (d.success) {
        this.byType[d.type].success++;
        if (typeof d.latency === 'number') {
          this.latencies.push(d.latency);
        }
      } else {
        this.byType[d.type].failed++;
      }

      const channel = d.channel || 'default';
      this.byChannel[channel] = (this.byChannel[channel] || 0) + 1;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Summary for UI
  // ─────────────────────────────────────────────────────────────────────────────

  getSummary() {
    return {
      total: this.getTotalSent(),
      success: this.getTotalSuccess(),
      failed: this.getTotalFailed(),
      successRate: this.getSuccessRate(),
      averageLatency: this.getAverageLatency(),
      minLatency: this.getMinLatency(),
      maxLatency: this.getMaxLatency(),
      p95Latency: this.getP95Latency(),
      byType: this.getByType(),
      byChannel: this.getByChannel(),
      last24h: this.getLast24Hours(),
      lastHour: this.getLastHour(),
      recentErrors: this.getRecentErrors(5)
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Pattern
// ─────────────────────────────────────────────────────────────────────────────

let instance = null;

/**
 * Get singleton instance of SlackStatistics
 * @returns {SlackStatistics}
 */
export function getSlackStatistics() {
  if (!instance) {
    instance = new SlackStatistics();
  }
  return instance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetSlackStatistics() {
  instance = null;
}

export default {
  SlackStatistics,
  getSlackStatistics,
  resetSlackStatistics
};
