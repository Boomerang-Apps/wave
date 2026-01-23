// ═══════════════════════════════════════════════════════════════════════════════
// BUDGET ENFORCER - AUTOMATIC PIPELINE HALT ON BUDGET EXCEEDED
// ═══════════════════════════════════════════════════════════════════════════════
// IMP-009: Implements automatic emergency stop when budget is exceeded
//
// Sources:
// - Portkey: https://portkey.ai/blog/budget-limits-and-alerts-in-llm-apps/
// - LiteLLM: https://docs.litellm.ai/docs/proxy/users
// - TrueFoundry: https://www.truefoundry.com/blog/llm-cost-tracking-solution
//
// Key Requirements:
// - Hard stop at 100% budget (create EMERGENCY-STOP file)
// - Return 503 on all subsequent API calls
// - Alert at 70%, 90%, 100% thresholds
// - Prevent race conditions with atomic file operations
// ═══════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const renameAsync = promisify(fs.rename);

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const BUDGET_STATUS = {
  OK: 'ok',
  WARNING: 'warning',
  CRITICAL: 'critical',
  EXCEEDED: 'exceeded'
};

export const ALERT_THRESHOLDS = {
  WARNING: 0.70,
  CRITICAL: 0.90,
  EXCEEDED: 1.00
};

// ─────────────────────────────────────────────────────────────────────────────
// BudgetEnforcer Class
// ─────────────────────────────────────────────────────────────────────────────

export class BudgetEnforcer {
  constructor(options = {}) {
    this.budgetLimit = options.budgetLimit || 100;
    this.claudeDir = options.claudeDir || '.claude';
    this.thresholds = {
      warning: options.alertThresholds?.warning ?? ALERT_THRESHOLDS.WARNING,
      critical: options.alertThresholds?.critical ?? ALERT_THRESHOLDS.CRITICAL,
      exceeded: options.alertThresholds?.exceeded ?? ALERT_THRESHOLDS.EXCEEDED
    };

    this.spent = 0;
    this.notifyCallback = null;
    this.logCallback = null;
    this.context = {};

    // Lock for concurrent operations
    this._stopFileLock = false;
    this._emergencyStopTriggered = false;
  }

  /**
   * Record spending amount
   * @param {number} amount - Amount spent in dollars
   */
  recordSpend(amount) {
    this.spent += amount;
  }

  /**
   * Get current spent amount
   * @returns {number} Total spent
   */
  getSpent() {
    return this.spent;
  }

  /**
   * Get current percentage of budget used
   * @returns {number} Percentage (0-100+)
   */
  getPercentage() {
    return Math.round((this.spent / this.budgetLimit) * 100);
  }

  /**
   * Get current budget status based on thresholds
   * @returns {string} Status from BUDGET_STATUS
   */
  getStatus() {
    const ratio = this.spent / this.budgetLimit;

    if (ratio >= this.thresholds.exceeded) {
      return BUDGET_STATUS.EXCEEDED;
    } else if (ratio >= this.thresholds.critical) {
      return BUDGET_STATUS.CRITICAL;
    } else if (ratio >= this.thresholds.warning) {
      return BUDGET_STATUS.WARNING;
    }
    return BUDGET_STATUS.OK;
  }

  /**
   * Set notification callback for Slack alerts
   * @param {Function} callback - Notification function
   */
  setNotifyCallback(callback) {
    this.notifyCallback = callback;
  }

  /**
   * Set logging callback for audit trail
   * @param {Function} callback - Logging function
   */
  setLogCallback(callback) {
    this.logCallback = callback;
  }

  /**
   * Set context for logging (agent, wave, story)
   * @param {Object} context - Context object
   */
  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Check budget and enforce limits
   * Main method that handles all enforcement logic
   * @returns {Object} Status result with blocked, statusCode, error, headers
   */
  async checkAndEnforce() {
    const status = this.getStatus();
    const percentage = this.getPercentage();
    const ratio = this.spent / this.budgetLimit;

    // Build base result
    const result = {
      status,
      spent: this.spent,
      budget: this.budgetLimit,
      percentage,
      blocked: false,
      statusCode: 200,
      headers: {}
    };

    // Handle based on status
    if (status === BUDGET_STATUS.EXCEEDED) {
      // Create EMERGENCY-STOP file
      await this._createEmergencyStop();

      // Set blocked status
      result.blocked = true;
      result.statusCode = 503;
      result.error = {
        type: 'budget_exceeded',
        message: `Budget exceeded: $${this.spent.toFixed(2)} spent of $${this.budgetLimit.toFixed(2)} limit (${percentage}%)`
      };
      result.headers['Retry-After'] = '3600'; // 1 hour

      // Send critical notification
      await this._notify({
        severity: 'critical',
        type: 'budget_exceeded',
        spent: this.spent,
        budget: this.budgetLimit,
        percentage
      });

      // Log the event
      await this._log({
        event: 'budget_exceeded',
        action: 'emergency_stop_triggered',
        spent: this.spent,
        budget: this.budgetLimit,
        percentage
      });

    } else if (status === BUDGET_STATUS.CRITICAL) {
      // Send critical notification (approaching limit)
      await this._notify({
        severity: 'critical',
        type: 'budget_critical',
        spent: this.spent,
        budget: this.budgetLimit,
        percentage
      });

    } else if (status === BUDGET_STATUS.WARNING) {
      // Send warning notification
      await this._notify({
        severity: 'warning',
        type: 'budget_warning',
        spent: this.spent,
        budget: this.budgetLimit,
        percentage
      });
    }

    return result;
  }

  /**
   * Create EMERGENCY-STOP file atomically
   * Uses lock to prevent race conditions
   */
  async _createEmergencyStop() {
    // Prevent duplicate creation
    if (this._emergencyStopTriggered || this._stopFileLock) {
      return;
    }

    this._stopFileLock = true;

    try {
      const stopFile = path.join(this.claudeDir, 'EMERGENCY-STOP');
      const tmpFile = path.join(this.claudeDir, `EMERGENCY-STOP.tmp.${Date.now()}`);

      // Check if already exists
      if (fs.existsSync(stopFile)) {
        this._emergencyStopTriggered = true;
        return;
      }

      // Prepare content
      const content = [
        '═══════════════════════════════════════════════════════════════════',
        'BUDGET EXCEEDED - EMERGENCY STOP',
        '═══════════════════════════════════════════════════════════════════',
        '',
        `Timestamp: ${new Date().toISOString()}`,
        `Spent: $${this.spent.toFixed(2)}`,
        `Budget: $${this.budgetLimit.toFixed(2)}`,
        `Percentage: ${this.getPercentage()}%`,
        '',
        this.context.agent ? `Agent: ${this.context.agent}` : '',
        this.context.wave ? `Wave: ${this.context.wave}` : '',
        this.context.story ? `Story: ${this.context.story}` : '',
        '',
        'All pipeline operations have been halted.',
        'Manual intervention required to resume.',
        '═══════════════════════════════════════════════════════════════════'
      ].filter(Boolean).join('\n');

      // Atomic write: write to temp, then rename
      await writeFileAsync(tmpFile, content, 'utf8');
      await renameAsync(tmpFile, stopFile);

      this._emergencyStopTriggered = true;

    } finally {
      this._stopFileLock = false;
    }
  }

  /**
   * Send notification via callback
   */
  async _notify(data) {
    if (this.notifyCallback) {
      try {
        await this.notifyCallback(data);
      } catch (err) {
        console.error('[BudgetEnforcer] Notification failed:', err.message);
      }
    }
  }

  /**
   * Log event via callback
   */
  async _log(data) {
    if (this.logCallback) {
      try {
        await this.logCallback({
          ...data,
          ...this.context,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error('[BudgetEnforcer] Logging failed:', err.message);
      }
    }
  }

  /**
   * Reset spent amount
   */
  reset() {
    this.spent = 0;
    this._emergencyStopTriggered = false;
  }

  /**
   * Clear EMERGENCY-STOP file (requires confirmation)
   * @param {Object} options - Options with confirm: true required
   */
  async clearEmergencyStop(options = {}) {
    if (!options.confirm) {
      throw new Error('Confirmation required to clear emergency stop. Pass { confirm: true }');
    }

    const stopFile = path.join(this.claudeDir, 'EMERGENCY-STOP');

    if (fs.existsSync(stopFile)) {
      await unlinkAsync(stopFile);
    }

    this._emergencyStopTriggered = false;
  }

  /**
   * Check if EMERGENCY-STOP file exists
   * @returns {boolean} Whether emergency stop is active
   */
  isEmergencyStopped() {
    const stopFile = path.join(this.claudeDir, 'EMERGENCY-STOP');
    return fs.existsSync(stopFile);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Express Middleware
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create Express middleware for budget enforcement
 * @param {BudgetEnforcer} enforcer - Budget enforcer instance
 * @returns {Function} Express middleware
 */
export function createBudgetMiddleware(enforcer) {
  return async function budgetMiddleware(req, res, next) {
    // Check for existing EMERGENCY-STOP file first
    if (enforcer.isEmergencyStopped()) {
      res.set('Retry-After', '3600');
      return res.status(503).json({
        error: {
          type: 'budget_exceeded',
          message: 'Service unavailable: Budget exceeded. Emergency stop is active.'
        }
      });
    }

    // Check current budget status
    const status = await enforcer.checkAndEnforce();

    if (status.blocked) {
      if (status.headers) {
        Object.entries(status.headers).forEach(([key, value]) => {
          res.set(key, value);
        });
      }
      return res.status(status.statusCode).json({
        error: status.error
      });
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get current budget status from enforcer
 * @param {BudgetEnforcer} enforcer - Budget enforcer instance
 * @returns {Object} Status object
 */
export function checkBudgetStatus(enforcer) {
  return {
    spent: enforcer.getSpent(),
    budget: enforcer.budgetLimit,
    percentage: enforcer.getPercentage(),
    status: enforcer.getStatus()
  };
}

/**
 * Manually trigger emergency stop
 * @param {string} dir - Directory for EMERGENCY-STOP file
 * @param {string} reason - Reason for stop
 * @returns {Object} Result with success status
 */
export async function triggerEmergencyStop(dir, reason) {
  const stopFile = path.join(dir, 'EMERGENCY-STOP');
  const tmpFile = path.join(dir, `EMERGENCY-STOP.tmp.${Date.now()}`);

  const content = [
    '═══════════════════════════════════════════════════════════════════',
    'EMERGENCY STOP - MANUALLY TRIGGERED',
    '═══════════════════════════════════════════════════════════════════',
    '',
    `Timestamp: ${new Date().toISOString()}`,
    `Reason: ${reason}`,
    '',
    'All pipeline operations have been halted.',
    'Manual intervention required to resume.',
    '═══════════════════════════════════════════════════════════════════'
  ].join('\n');

  try {
    // Atomic write
    await writeFileAsync(tmpFile, content, 'utf8');
    await renameAsync(tmpFile, stopFile);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default BudgetEnforcer;
