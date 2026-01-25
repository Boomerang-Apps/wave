// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR CLIENT
// ═══════════════════════════════════════════════════════════════════════════════
// HTTP client for communicating with the Python LangGraph orchestrator
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Client for interacting with the WAVE Python Orchestrator
 *
 * Features:
 * - Health checking
 * - Run creation and status polling
 * - Retry logic with exponential backoff
 * - Timeout handling
 */
export class OrchestratorClient {
  /**
   * @param {Object} options Configuration options
   * @param {string} options.baseUrl Base URL of the orchestrator (default: http://localhost:8000)
   * @param {number} options.timeout Request timeout in ms (default: 30000)
   * @param {number} options.maxRetries Max retry attempts (default: 3)
   * @param {number} options.retryDelayMs Base delay between retries (default: 1000)
   */
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.ORCHESTRATOR_URL || 'http://localhost:8000';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs || 1000;
  }

  /**
   * Make an HTTP request with retry logic
   * @private
   */
  async _fetchWithRetry(url, options = {}, retries = 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (retries < this.maxRetries) {
        // Exponential backoff
        const delay = this.retryDelayMs * Math.pow(2, retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._fetchWithRetry(url, options, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Check if the orchestrator is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    const health = await this.checkHealth();
    return health.healthy;
  }

  /**
   * Check orchestrator health
   * @returns {Promise<{healthy: boolean, status?: string, version?: string, error?: string}>}
   */
  async checkHealth() {
    try {
      const response = await this._fetchWithRetry(`${this.baseUrl}/health`, {
        method: 'GET'
      });

      if (!response.ok) {
        return {
          healthy: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        healthy: true,
        status: data.status,
        version: data.version,
        timestamp: data.timestamp
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Create a new orchestrator run
   * @param {Object} params Run parameters
   * @param {string} params.task Task description
   * @param {string} params.repoPath Repository path
   * @param {string} [params.branch] Git branch (default: main)
   * @param {number} [params.tokenLimit] Token budget limit
   * @param {number} [params.costLimitUsd] Cost limit in USD
   * @returns {Promise<{success: boolean, runId?: string, status?: string, error?: string}>}
   */
  async createRun({ task, repoPath, branch, tokenLimit, costLimitUsd }) {
    try {
      const body = {
        task,
        repo_path: repoPath
      };

      if (branch) body.branch = branch;
      if (tokenLimit) body.token_limit = tokenLimit;
      if (costLimitUsd) body.cost_limit_usd = costLimitUsd;

      const response = await this._fetchWithRetry(`${this.baseUrl}/runs`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        runId: data.run_id,
        status: data.status,
        task: data.task,
        currentAgent: data.current_agent,
        actionsCount: data.actions_count,
        createdAt: data.created_at
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get the status of a run
   * @param {string} runId Run ID
   * @returns {Promise<{success: boolean, runId?: string, status?: string, notFound?: boolean, error?: string}>}
   */
  async getRunStatus(runId) {
    try {
      const response = await this._fetchWithRetry(`${this.baseUrl}/runs/${runId}`, {
        method: 'GET'
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            notFound: true,
            error: 'Run not found'
          };
        }
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `HTTP ${response.status}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        runId: data.run_id,
        status: data.status,
        task: data.task,
        currentAgent: data.current_agent,
        actionsCount: data.actions_count,
        createdAt: data.created_at
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Poll for run completion with callback
   * @param {string} runId Run ID
   * @param {Function} onUpdate Callback for status updates
   * @param {Object} options Polling options
   * @param {number} options.intervalMs Poll interval (default: 2000)
   * @param {number} options.timeoutMs Max polling time (default: 300000)
   * @returns {Promise<{success: boolean, finalStatus?: string, error?: string}>}
   */
  async pollRunStatus(runId, onUpdate, options = {}) {
    const intervalMs = options.intervalMs || 2000;
    const timeoutMs = options.timeoutMs || 300000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const result = await this.getRunStatus(runId);

      if (!result.success) {
        return result;
      }

      if (onUpdate) {
        onUpdate(result);
      }

      // Check for terminal states
      if (['completed', 'failed', 'cancelled', 'held'].includes(result.status)) {
        return {
          success: true,
          finalStatus: result.status,
          ...result
        };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return {
      success: false,
      error: 'Polling timeout exceeded'
    };
  }
}

// Default singleton instance
export const orchestratorClient = new OrchestratorClient();

export default OrchestratorClient;
