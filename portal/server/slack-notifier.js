// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC SLACK NOTIFIER SERVICE
// ═══════════════════════════════════════════════════════════════════════════════
// A project-agnostic Slack notification service that can be used by any project.
// Provides event-driven notifications, severity-based routing, and thread support.
//
// Validated: Slack Developer Docs - https://docs.slack.dev/reference/methods/chat.postMessage/
// - thread_ts MUST be stored as string (Slack timestamp format: "1234567890.123456")
// - Use Channel IDs (C0123456789) not channel names (#channel-name)
// - Web API required for threading support (webhooks cannot retrieve thread_ts)
// ═══════════════════════════════════════════════════════════════════════════════

import { WebClient } from '@slack/web-api';
import { SLACK_EVENT_TYPES, createSlackEvent, formatSlackBlocks } from './slack-events.js';
import { RetryManager } from './utils/retry-manager.js';
import { secretRedactor } from './utils/secret-redactor.js';

/**
 * SlackNotifier - Generic Slack notification service
 * Project-agnostic design that can be used by any application.
 */
class SlackNotifier {
  constructor(config = {}) {
    // Web API (preferred - enables threading)
    this.botToken = config.botToken || process.env.SLACK_BOT_TOKEN;
    this.webClient = this.botToken ? new WebClient(this.botToken) : null;

    // Legacy webhook (fallback - no threading support)
    this.webhookUrl = config.webhookUrl || process.env.SLACK_WEBHOOK_URL;

    // Enabled if either Web API or webhook is configured
    this.enabled = config.enabled !== false && (!!this.botToken || !!this.webhookUrl);

    // Project identification (for multi-project support)
    this.projectName = config.projectName || process.env.PROJECT_NAME || 'Project';

    // Channel routing - use Channel IDs (C0123456789) not names (#channel)
    // Validated: Slack Developer Docs requires Channel IDs for API methods
    this.channels = {
      default: config.channels?.default || process.env.SLACK_CHANNEL_UPDATES || null,
      alerts: config.channels?.alerts || process.env.SLACK_CHANNEL_ALERTS || null,
      budget: config.channels?.budget || process.env.SLACK_CHANNEL_BUDGET || null
    };

    // Legacy webhook URLs (fallback)
    this.webhooks = {
      default: config.webhooks?.default || this.webhookUrl,
      alerts: config.webhooks?.alerts || this.webhookUrl,
      budget: config.webhooks?.budget || this.webhookUrl
    };

    // Thread cache: storyId -> { thread_ts: string, channel_id: string }
    // Validated: thread_ts MUST be string (Slack timestamp format)
    this.threadCache = new Map();

    // Callback for thread persistence (to be set by caller for database storage)
    this.onThreadCreated = config.onThreadCreated || null;
    this.onThreadUpdated = config.onThreadUpdated || null;

    // Rate limiting
    this.lastSentTime = 0;
    this.minInterval = config.minInterval || 500; // ms between messages

    // Retry manager with exponential backoff
    // Validated: AWS Builders Library pattern with full jitter
    this.retryManager = new RetryManager({
      maxRetries: config.maxRetries || 5,
      baseDelayMs: config.baseDelayMs || 1000,
      maxDelayMs: config.maxDelayMs || 30000,
      jitter: 'full',
      // Circuit breaker to prevent overwhelming a failing service
      circuitThreshold: config.circuitThreshold || 10,
      circuitResetMs: config.circuitResetMs || 60000
    });

    if (!this.enabled) {
      console.log('[SlackNotifier] Disabled - no bot token or webhook URL configured');
    } else if (this.webClient) {
      console.log('[SlackNotifier] Enabled with Web API (threading + retry supported)');
    } else {
      console.log('[SlackNotifier] Enabled with webhook fallback (retry supported, no threading)');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CORE SEND METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Send a message to Slack using Web API (preferred) or webhook (fallback)
   * @param {Object} payload - Slack message payload (blocks, text, etc.)
   * @param {string} channel - Channel key: 'default', 'alerts', or 'budget'
   * @param {Object} options - Additional options (thread_ts for replies)
   * @returns {Promise<Object>} Response with success status and thread_ts if available
   */
  async send(payload, channel = 'default', options = {}) {
    if (!this.enabled) {
      return { success: false, reason: 'disabled' };
    }

    // OWASP-compliant secret redaction before sending
    // Validated: OWASP Secrets Management Cheat Sheet - "Secrets should never be logged"
    const safePayload = secretRedactor.redactSlackPayload(payload);

    // Rate limiting
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSentTime;
    if (timeSinceLastSend < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastSend));
    }

    // Use Web API if available (enables threading)
    if (this.webClient) {
      return this._sendViaWebApi(safePayload, channel, options);
    }

    // Fallback to webhook (no threading support)
    return this._sendViaWebhook(safePayload, channel);
  }

  /**
   * Send message via Slack Web API (preferred method) with retry
   * Validated: Slack Developer Docs - chat.postMessage
   * Validated: AWS Builders Library - Exponential backoff with jitter
   * @private
   */
  async _sendViaWebApi(payload, channel = 'default', options = {}) {
    const channelId = this.channels[channel] || this.channels.default;
    if (!channelId) {
      console.warn(`[SlackNotifier] No channel ID configured for '${channel}', using webhook fallback`);
      return this._sendViaWebhook(payload, channel);
    }

    // Build API request
    // Validated: thread_ts must be string type per Slack docs
    const apiPayload = {
      channel: channelId,
      text: payload.text || 'Notification',
      blocks: payload.blocks,
      unfurl_links: false,
      unfurl_media: false
    };

    // Add thread_ts for replies (must be string)
    if (options.thread_ts) {
      apiPayload.thread_ts = String(options.thread_ts);
    }

    // Execute with retry (AWS exponential backoff pattern)
    const result = await this.retryManager.execute(async () => {
      const response = await this.webClient.chat.postMessage(apiPayload);
      this.lastSentTime = Date.now();

      if (response.ok) {
        return {
          success: true,
          thread_ts: response.ts,
          channel_id: response.channel,
          message_ts: response.ts
        };
      } else {
        // Throw to trigger retry
        const error = new Error(response.error);
        error.data = { error: response.error };
        throw error;
      }
    }, {
      // Custom retry logic for Slack-specific errors
      shouldRetry: (error) => {
        // Don't retry permanent auth/channel errors
        const permanentErrors = [
          'invalid_auth',
          'account_inactive',
          'token_revoked',
          'channel_not_found',
          'not_in_channel',
          'missing_scope'
        ];
        if (permanentErrors.includes(error.data?.error)) {
          return false;
        }
        // Retry rate limits and transient errors
        return true;
      }
    });

    if (result.success) {
      return result.result;
    }

    // All retries exhausted
    console.error(`[SlackNotifier] Web API failed after ${result.attempts} attempts: ${result.error}`);
    return {
      success: false,
      reason: result.error,
      attempts: result.attempts,
      exhausted: result.exhausted
    };
  }

  /**
   * Send message via webhook (fallback - no threading) with retry
   * Validated: AWS Builders Library - Exponential backoff with jitter
   * @private
   */
  async _sendViaWebhook(payload, channel = 'default') {
    const webhookUrl = this.webhooks[channel] || this.webhooks.default;
    if (!webhookUrl) {
      return { success: false, reason: 'no_webhook' };
    }

    // Execute with retry (AWS exponential backoff pattern)
    const result = await this.retryManager.execute(async () => {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.lastSentTime = Date.now();

      if (response.ok) {
        return { success: true, thread_ts: null };
      } else {
        const errorText = await response.text();
        const error = new Error(errorText);
        error.status = response.status;
        throw error;
      }
    });

    if (result.success) {
      return result.result;
    }

    // All retries exhausted
    console.error(`[SlackNotifier] Webhook failed after ${result.attempts} attempts: ${result.error}`);
    return {
      success: false,
      reason: result.error,
      attempts: result.attempts,
      exhausted: result.exhausted
    };
  }

  /**
   * Send blocks-based message
   * @param {Array} blocks - Slack Block Kit blocks
   * @param {string} channel - Channel key
   * @param {Object} options - Additional options (thread_ts, text fallback)
   */
  async sendBlocks(blocks, channel = 'default', options = {}) {
    const payload = {
      blocks,
      text: options.text || 'Notification' // Fallback for notifications
    };
    return this.send(payload, channel, options);
  }

  /**
   * Send simple text message
   */
  async sendText(text, channel = 'default', options = {}) {
    return this.send({ text }, channel, options);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // THREAD MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get thread info for a story
   * @param {string} storyId - Story identifier
   * @returns {Object|null} Thread info { thread_ts: string, channel_id: string }
   */
  getThreadInfo(storyId) {
    return this.threadCache.get(storyId) || null;
  }

  /**
   * Get thread_ts for a story (convenience method)
   * @param {string} storyId - Story identifier
   * @returns {string|null} Thread timestamp
   */
  getThreadTs(storyId) {
    const info = this.threadCache.get(storyId);
    return info?.thread_ts || null;
  }

  /**
   * Store thread info for a story
   * Validated: thread_ts must be stored as string
   * @param {string} storyId - Story identifier
   * @param {string} threadTs - Slack thread timestamp (string)
   * @param {string} channelId - Channel ID where thread was created
   */
  setThreadTs(storyId, threadTs, channelId = null) {
    const threadInfo = {
      thread_ts: String(threadTs), // Ensure string type
      channel_id: channelId,
      created_at: new Date().toISOString(),
      message_count: 1
    };
    this.threadCache.set(storyId, threadInfo);

    // Callback for database persistence
    if (this.onThreadCreated) {
      this.onThreadCreated(storyId, threadInfo);
    }
  }

  /**
   * Update thread message count
   */
  incrementThreadCount(storyId) {
    const info = this.threadCache.get(storyId);
    if (info) {
      info.message_count = (info.message_count || 1) + 1;
      info.updated_at = new Date().toISOString();

      if (this.onThreadUpdated) {
        this.onThreadUpdated(storyId, info);
      }
    }
  }

  /**
   * Clear thread from cache
   */
  clearThread(storyId) {
    this.threadCache.delete(storyId);
  }

  /**
   * Create a new thread for a story
   * @param {string} storyId - Story identifier
   * @param {Array} blocks - Initial message blocks
   * @param {string} channel - Channel key
   * @returns {Promise<Object>} Result with thread_ts
   */
  async createThread(storyId, blocks, channel = 'default') {
    const result = await this.sendBlocks(blocks, channel, {
      text: `Thread for ${storyId}`
    });

    if (result.success && result.thread_ts) {
      this.setThreadTs(storyId, result.thread_ts, result.channel_id);
    }

    return result;
  }

  /**
   * Reply to an existing thread
   * @param {string} storyId - Story identifier
   * @param {Array} blocks - Reply message blocks
   * @returns {Promise<Object>} Result
   */
  async replyToThread(storyId, blocks, channel = 'default') {
    const threadInfo = this.getThreadInfo(storyId);

    if (!threadInfo?.thread_ts) {
      // No existing thread, create new one
      return this.createThread(storyId, blocks, channel);
    }

    const result = await this.sendBlocks(blocks, channel, {
      thread_ts: threadInfo.thread_ts,
      text: `Update for ${storyId}`
    });

    if (result.success) {
      this.incrementThreadCount(storyId);
    }

    return result;
  }

  /**
   * Load threads from external source (e.g., database)
   * @param {Map|Object} threads - Map or object of storyId -> threadInfo
   */
  loadThreads(threads) {
    if (threads instanceof Map) {
      threads.forEach((info, storyId) => {
        this.threadCache.set(storyId, info);
      });
    } else if (typeof threads === 'object') {
      Object.entries(threads).forEach(([storyId, info]) => {
        this.threadCache.set(storyId, info);
      });
    }
    console.log(`[SlackNotifier] Loaded ${this.threadCache.size} threads from storage`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EVENT NOTIFICATION METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Route event to appropriate notification method
   */
  async notify(event) {
    if (!this.enabled) return { success: false, reason: 'disabled' };

    const eventType = event.type || event.eventType;

    switch (eventType) {
      // Story lifecycle
      case SLACK_EVENT_TYPES.STORY_START:
        return this.notifyStoryStart(event);
      case SLACK_EVENT_TYPES.STORY_PROGRESS:
        return this.notifyStoryProgress(event);
      case SLACK_EVENT_TYPES.STORY_COMPLETE:
        return this.notifyStoryComplete(event);
      case SLACK_EVENT_TYPES.STORY_FAILED:
        return this.notifyStoryFailed(event);

      // Gate events
      case SLACK_EVENT_TYPES.GATE_ENTERED:
      case SLACK_EVENT_TYPES.GATE_COMPLETE:
      case SLACK_EVENT_TYPES.GATE_REJECTED:
        return this.notifyGateTransition(event);

      // Gate override events (validated: SonarSource audit logging)
      case SLACK_EVENT_TYPES.GATE_OVERRIDE:
      case SLACK_EVENT_TYPES.GATE_BYPASS_REQUESTED:
      case SLACK_EVENT_TYPES.GATE_BYPASS_APPROVED:
      case SLACK_EVENT_TYPES.GATE_BYPASS_DENIED:
        return this.notifyGateOverride(event);

      // Agent events
      case SLACK_EVENT_TYPES.AGENT_START:
        return this.notifyAgentStart(event);
      case SLACK_EVENT_TYPES.AGENT_COMPLETE:
        return this.notifyAgentComplete(event);
      case SLACK_EVENT_TYPES.AGENT_ERROR:
        return this.notifyAgentError(event);

      // Budget events
      case SLACK_EVENT_TYPES.BUDGET_WARNING:
      case SLACK_EVENT_TYPES.BUDGET_CRITICAL:
      case SLACK_EVENT_TYPES.BUDGET_EXCEEDED:
        return this.notifyBudgetAlert(event);

      // Safety events
      case SLACK_EVENT_TYPES.SAFETY_VIOLATION:
        return this.notifySafetyViolation(event);
      case SLACK_EVENT_TYPES.ESCALATION:
        return this.notifyEscalation(event);

      // Wave events
      case SLACK_EVENT_TYPES.WAVE_START:
        return this.notifyWaveStart(event);
      case SLACK_EVENT_TYPES.WAVE_COMPLETE:
        return this.notifyWaveComplete(event);

      default:
        // Generic notification
        return this.notifyGeneric(event);
    }
  }

  /**
   * Story started notification - Creates new thread
   * Validated: Thread-per-story pattern
   */
  async notifyStoryStart(event) {
    const storyId = event.story_id || event.storyId;
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:gear: *Story Started*\n*${storyId}*: ${event.details?.title || 'Story'}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Agent: \`${event.agent || 'unknown'}\` | Wave: ${event.wave || 'N/A'} | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    // Create new thread for this story
    return this.createThread(storyId, blocks, 'default');
  }

  /**
   * Story progress notification - Replies to thread
   * Validated: Thread-per-story pattern
   */
  async notifyStoryProgress(event) {
    const storyId = event.story_id || event.storyId;
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:hourglass_flowing_sand: *Progress*\n${event.details?.message || 'Working...'}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Gate: ${event.gate || 'N/A'} | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    // Reply to existing thread or create new one
    return this.replyToThread(storyId, blocks, 'default');
  }

  /**
   * Story completed notification - Final reply to thread
   * Validated: Thread-per-story pattern
   */
  async notifyStoryComplete(event) {
    const storyId = event.story_id || event.storyId;
    const cost = event.cost ? `$${event.cost.toFixed(4)}` : 'N/A';
    const tokens = event.tokens ? `${event.tokens.total || (event.tokens.input + event.tokens.output)}` : 'N/A';

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:white_check_mark: *Complete*`
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Agent:*\n\`${event.agent || 'unknown'}\`` },
          { type: 'mrkdwn', text: `*Duration:*\n${event.details?.duration || 'N/A'}` },
          { type: 'mrkdwn', text: `*Tokens:*\n${tokens}` },
          { type: 'mrkdwn', text: `*Cost:*\n${cost}` }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Wave ${event.wave || 'N/A'} | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    // Reply to thread and optionally clear from cache
    const result = await this.replyToThread(storyId, blocks, 'default');

    // Clear thread from cache after completion (can be restored from DB if needed)
    this.clearThread(storyId);

    return result;
  }

  /**
   * Story failed notification - Reply to thread + alert channel
   * Validated: Thread-per-story pattern + severity routing
   */
  async notifyStoryFailed(event) {
    const storyId = event.story_id || event.storyId;
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:x: *Failed*`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error:*\n${event.details?.error || 'Unknown error'}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Agent: \`${event.agent || 'unknown'}\` | Wave: ${event.wave || 'N/A'} | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    // Reply to story thread
    await this.replyToThread(storyId, blocks, 'default');

    // Also send to alerts channel (severity routing)
    const alertBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:x: *Story Failed*\n*${storyId}*: ${event.details?.title || 'Story'}\n\n*Error:* ${event.details?.error || 'Unknown error'}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Agent: \`${event.agent || 'unknown'}\` | Wave: ${event.wave || 'N/A'} | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    return this.sendBlocks(alertBlocks, 'alerts');
  }

  /**
   * Gate transition notification - Reply to story thread
   * Validated: Thread-per-story pattern
   */
  async notifyGateTransition(event) {
    const storyId = event.story_id || event.storyId;
    const eventType = event.type || event.eventType;
    let emoji = ':arrow_right:';
    let statusText = 'Transition';

    if (eventType === SLACK_EVENT_TYPES.GATE_COMPLETE) {
      emoji = ':white_check_mark:';
      statusText = 'Complete';
    } else if (eventType === SLACK_EVENT_TYPES.GATE_REJECTED) {
      emoji = ':x:';
      statusText = 'Rejected';
    }

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *Gate ${statusText}*\nGate ${event.details?.fromGate || '?'} → Gate ${event.gate || '?'}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    // Reply to story thread if storyId exists
    if (storyId) {
      const result = await this.replyToThread(storyId, blocks, 'default');

      // Also send to alerts channel for rejections
      if (eventType === SLACK_EVENT_TYPES.GATE_REJECTED) {
        const alertBlocks = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${emoji} *Gate ${statusText}*\nStory: ${storyId}\nGate ${event.details?.fromGate || '?'} → Gate ${event.gate || '?'}`
            }
          }
        ];
        await this.sendBlocks(alertBlocks, 'alerts');
      }

      return result;
    }

    // No story context, send directly
    const channel = eventType === SLACK_EVENT_TYPES.GATE_REJECTED ? 'alerts' : 'default';
    return this.sendBlocks(blocks, channel);
  }

  /**
   * Gate override notification
   * Validated: SonarSource audit logging requirements
   * Always sends to alerts channel for visibility
   */
  async notifyGateOverride(event) {
    const storyId = event.story_id || event.storyId;
    const action = event.action || 'override';

    let emoji = ':shield:';
    let actionText = 'Override';

    if (action === 'bypass_requested') {
      emoji = ':raised_hand:';
      actionText = 'Bypass Requested';
    } else if (action === 'bypass_approved') {
      emoji = ':white_check_mark:';
      actionText = 'Bypass Approved';
    } else if (action === 'bypass_denied') {
      emoji = ':no_entry:';
      actionText = 'Bypass Denied';
    }

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} GATE ${actionText.toUpperCase()}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Gate ${event.gate || '?'}* was ${actionText.toLowerCase()}`
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Reason:*\n${event.reason || event.details?.reason || 'No reason provided'}` },
          { type: 'mrkdwn', text: `*Actor:*\n${event.actor || event.actor_id || 'unknown'}` },
          { type: 'mrkdwn', text: `*Wave:*\n${event.wave || 'N/A'}` },
          { type: 'mrkdwn', text: `*Story:*\n${storyId || 'N/A'}` }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `:warning: Requires review | ${new Date().toISOString()}`
          }
        ]
      }
    ];

    // Always send to alerts channel for gate overrides
    const result = await this.sendBlocks(blocks, 'alerts', { text: `Gate ${event.gate} ${actionText}` });

    // Also reply to story thread if exists
    if (storyId) {
      const threadBlocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *Gate ${event.gate} ${actionText}*\n_Reason:_ ${event.reason || event.details?.reason || 'No reason provided'}`
          }
        }
      ];
      await this.replyToThread(storyId, threadBlocks, 'default');
    }

    return result;
  }

  /**
   * Agent started notification
   */
  async notifyAgentStart(event) {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:robot_face: *Agent Started*\n\`${event.agent || 'unknown'}\` is now active`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Wave: ${event.wave || 'N/A'} | Task: ${event.details?.task || 'N/A'} | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    return this.sendBlocks(blocks, 'default');
  }

  /**
   * Agent completed notification
   */
  async notifyAgentComplete(event) {
    const cost = event.cost ? `$${event.cost.toFixed(4)}` : 'N/A';

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:checkered_flag: *Agent Complete*\n\`${event.agent || 'unknown'}\` finished work`
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Stories:*\n${event.details?.storiesCompleted || 'N/A'}` },
          { type: 'mrkdwn', text: `*Cost:*\n${cost}` }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Wave: ${event.wave || 'N/A'} | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    return this.sendBlocks(blocks, 'default');
  }

  /**
   * Agent error notification
   */
  async notifyAgentError(event) {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:warning: *Agent Error*\n\`${event.agent || 'unknown'}\` encountered an error`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error:*\n${event.details?.error || 'Unknown error'}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Wave: ${event.wave || 'N/A'} | Story: ${event.story_id || event.storyId || 'N/A'} | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    return this.sendBlocks(blocks, 'alerts');
  }

  /**
   * Budget alert notification
   */
  async notifyBudgetAlert(event) {
    const eventType = event.type || event.eventType;
    const percentage = event.details?.percentage || 0;
    const spent = event.details?.spent || 0;
    const limit = event.details?.limit || 0;

    let emoji = ':warning:';
    let title = 'Budget Warning';
    let channel = 'budget';

    if (eventType === SLACK_EVENT_TYPES.BUDGET_CRITICAL || percentage >= 90) {
      emoji = ':rotating_light:';
      title = 'Budget Critical';
      channel = 'alerts';
    }
    if (eventType === SLACK_EVENT_TYPES.BUDGET_EXCEEDED || percentage >= 100) {
      emoji = ':no_entry:';
      title = 'Budget Exceeded';
      channel = 'alerts';
    }

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${title}*\nSpent $${spent.toFixed(2)} of $${limit.toFixed(2)} (${percentage.toFixed(1)}%)`
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Wave:*\n${event.wave || 'N/A'}` },
          { type: 'mrkdwn', text: `*Agent:*\n\`${event.agent || 'all'}\`` },
          { type: 'mrkdwn', text: `*Remaining:*\n$${(limit - spent).toFixed(2)}` }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    return this.sendBlocks(blocks, channel);
  }

  /**
   * Safety violation notification
   */
  async notifySafetyViolation(event) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':rotating_light: SAFETY VIOLATION',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Violation Type:*\n${event.details?.violationType || 'Unknown'}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Details:*\n${event.details?.message || 'A safety violation was detected'}`
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Agent:*\n\`${event.agent || 'unknown'}\`` },
          { type: 'mrkdwn', text: `*Story:*\n${event.story_id || event.storyId || 'N/A'}` }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `:sos: Immediate review required | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    return this.sendBlocks(blocks, 'alerts');
  }

  /**
   * Escalation notification
   */
  async notifyEscalation(event) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':rotating_light: ESCALATION REQUIRED',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Human intervention needed*\n\n*Wave:* ${event.wave || 'N/A'}\n*Story:* ${event.story_id || event.storyId || 'N/A'}\n*Reason:* ${event.details?.reason || 'Unknown'}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `:sos: Pipeline halted | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    return this.sendBlocks(blocks, 'alerts');
  }

  /**
   * Wave started notification
   */
  async notifyWaveStart(event) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Wave ${event.wave || '?'} Starting`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Project:*\n${event.project || 'Unknown'}` },
          { type: 'mrkdwn', text: `*Wave:*\n${event.wave || 'N/A'}` },
          { type: 'mrkdwn', text: `*Stories:*\n${event.details?.storyCount || 'N/A'}` },
          { type: 'mrkdwn', text: `*Budget:*\n$${event.details?.budget || 'N/A'}` }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `:rocket: Wave ${event.wave} initiated | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    return this.sendBlocks(blocks, 'default');
  }

  /**
   * Wave completed notification
   */
  async notifyWaveComplete(event) {
    const cost = event.cost ? `$${event.cost.toFixed(2)}` : 'N/A';

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Wave ${event.wave || '?'} Complete!`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Stories:*\n${event.details?.storiesCompleted || 'N/A'} completed` },
          { type: 'mrkdwn', text: `*Duration:*\n${event.details?.duration || 'N/A'}` },
          { type: 'mrkdwn', text: `*Total Cost:*\n${cost}` },
          { type: 'mrkdwn', text: `*Files Created:*\n${event.details?.filesCreated || 'N/A'}` }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `:trophy: Wave ${event.wave} deployed successfully | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    return this.sendBlocks(blocks, 'default');
  }

  /**
   * Generic notification for unhandled event types
   */
  async notifyGeneric(event) {
    const eventType = event.type || event.eventType || 'unknown';
    const severity = event.severity || 'info';
    const channel = severity === 'critical' ? 'alerts' : 'default';

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:bell: *Event: ${eventType}*\n${event.details?.message || JSON.stringify(event.details || {})}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Severity: ${severity} | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    return this.sendBlocks(blocks, channel);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST & DEBUG
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Send a test message to verify Slack connection
   */
  async sendTest(message) {
    const testMessage = message || `Test message from ${this.projectName}`;
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:test_tube: *Test Notification*\n${testMessage}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Slack integration test | ${this.projectName} | ${new Date().toISOString()}`
          }
        ]
      }
    ];

    return this.sendBlocks(blocks, 'default');
  }

  /**
   * Get notifier status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      mode: this.webClient ? 'web_api' : (this.webhookUrl ? 'webhook' : 'disabled'),
      hasWebApi: !!this.webClient,
      hasWebhook: !!this.webhookUrl,
      threadingSupported: !!this.webClient,
      retryEnabled: !!this.retryManager,
      circuitBreaker: this.retryManager ? this.retryManager.getCircuitStatus() : null,
      channels: Object.entries(this.channels)
        .filter(([_, v]) => !!v)
        .map(([k, _]) => k),
      channelIds: this.channels,
      threadCacheSize: this.threadCache.size,
      activeThreads: Array.from(this.threadCache.keys())
    };
  }

  /**
   * Test connection to Slack
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    if (!this.enabled) {
      return { success: false, reason: 'disabled' };
    }

    if (this.webClient) {
      try {
        // Test Web API auth
        const authResult = await this.webClient.auth.test();
        return {
          success: true,
          mode: 'web_api',
          team: authResult.team,
          user: authResult.user,
          bot_id: authResult.bot_id
        };
      } catch (error) {
        return {
          success: false,
          mode: 'web_api',
          reason: error.message
        };
      }
    }

    // Test webhook with a test message
    return this.sendTest('Connection test');
  }
}

// Export singleton instance and class
let instance = null;

export function getSlackNotifier(config) {
  if (!instance) {
    instance = new SlackNotifier(config);
  }
  return instance;
}

export function resetSlackNotifier() {
  instance = null;
}

export { SlackNotifier };
export default SlackNotifier;
