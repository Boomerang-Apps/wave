// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC SLACK NOTIFIER SERVICE
// ═══════════════════════════════════════════════════════════════════════════════
// A project-agnostic Slack notification service that can be used by any project.
// Provides event-driven notifications, severity-based routing, and thread support.
// ═══════════════════════════════════════════════════════════════════════════════

import { SLACK_EVENT_TYPES, createSlackEvent, formatSlackBlocks } from './slack-events.js';

/**
 * SlackNotifier - Generic Slack notification service
 * Project-agnostic design that can be used by any application.
 */
class SlackNotifier {
  constructor(config = {}) {
    this.webhookUrl = config.webhookUrl || process.env.SLACK_WEBHOOK_URL;
    this.enabled = config.enabled !== false && !!this.webhookUrl;

    // Project identification (for multi-project support)
    this.projectName = config.projectName || process.env.PROJECT_NAME || 'Project';

    // Channel routing (can use different webhooks for different channels)
    this.channels = {
      default: config.channels?.default || this.webhookUrl,
      alerts: config.channels?.alerts || this.webhookUrl,
      budget: config.channels?.budget || this.webhookUrl
    };

    // Thread cache: storyId -> { thread_ts, channel_id }
    this.threadCache = new Map();

    // Rate limiting
    this.lastSentTime = 0;
    this.minInterval = config.minInterval || 500; // ms between messages

    if (!this.enabled) {
      console.log('[SlackNotifier] Disabled - no webhook URL configured');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CORE SEND METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Send a message to Slack
   * @param {Object} payload - Slack message payload (blocks, text, etc.)
   * @param {string} channel - Channel key: 'default', 'alerts', or 'budget'
   * @returns {Promise<Object>} Response with success status and thread_ts if available
   */
  async send(payload, channel = 'default') {
    if (!this.enabled) {
      return { success: false, reason: 'disabled' };
    }

    const webhookUrl = this.channels[channel] || this.channels.default;
    if (!webhookUrl) {
      return { success: false, reason: 'no_webhook' };
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSentTime;
    if (timeSinceLastSend < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastSend));
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.lastSentTime = Date.now();

      if (response.ok) {
        // Webhooks don't return thread_ts, but Slack API does
        // For full thread support, would need to use Slack Web API
        return { success: true };
      } else {
        const errorText = await response.text();
        console.error(`[SlackNotifier] Send failed: ${response.status} ${errorText}`);
        return { success: false, reason: errorText };
      }
    } catch (error) {
      console.error('[SlackNotifier] Send error:', error.message);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Send blocks-based message
   */
  async sendBlocks(blocks, channel = 'default', options = {}) {
    const payload = {
      blocks,
      ...options
    };
    return this.send(payload, channel);
  }

  /**
   * Send simple text message
   */
  async sendText(text, channel = 'default') {
    return this.send({ text }, channel);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // THREAD MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get or create a thread for a story
   * Note: Full thread support requires Slack Web API with OAuth
   */
  getThreadTs(storyId) {
    return this.threadCache.get(storyId);
  }

  setThreadTs(storyId, threadTs) {
    this.threadCache.set(storyId, threadTs);
  }

  clearThread(storyId) {
    this.threadCache.delete(storyId);
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
   * Story started notification
   */
  async notifyStoryStart(event) {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:gear: *Story Started*\n*${event.story_id || event.storyId}*: ${event.details?.title || 'Story'}`
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

    return this.sendBlocks(blocks, 'default');
  }

  /**
   * Story progress notification
   */
  async notifyStoryProgress(event) {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:hourglass_flowing_sand: *Story Progress*\n*${event.story_id || event.storyId}*: ${event.details?.message || 'Working...'}`
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

    return this.sendBlocks(blocks, 'default');
  }

  /**
   * Story completed notification
   */
  async notifyStoryComplete(event) {
    const cost = event.cost ? `$${event.cost.toFixed(4)}` : 'N/A';
    const tokens = event.tokens ? `${event.tokens.total || (event.tokens.input + event.tokens.output)}` : 'N/A';

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:white_check_mark: *Story Complete*\n*${event.story_id || event.storyId}*: ${event.details?.title || 'Story'}`
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

    return this.sendBlocks(blocks, 'default');
  }

  /**
   * Story failed notification
   */
  async notifyStoryFailed(event) {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:x: *Story Failed*\n*${event.story_id || event.storyId}*: ${event.details?.title || 'Story'}`
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

    return this.sendBlocks(blocks, 'alerts');
  }

  /**
   * Gate transition notification
   */
  async notifyGateTransition(event) {
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
          text: `${emoji} *Gate ${statusText}*\nWave ${event.wave || 'N/A'}: Gate ${event.details?.fromGate || '?'} → Gate ${event.gate || '?'}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Story: ${event.story_id || event.storyId || 'N/A'} | ${new Date().toLocaleTimeString()}`
          }
        ]
      }
    ];

    const channel = eventType === SLACK_EVENT_TYPES.GATE_REJECTED ? 'alerts' : 'default';
    return this.sendBlocks(blocks, channel);
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
      hasWebhook: !!this.webhookUrl,
      channels: Object.keys(this.channels).filter(k => !!this.channels[k]),
      threadCacheSize: this.threadCache.size
    };
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
