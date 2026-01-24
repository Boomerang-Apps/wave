// ═══════════════════════════════════════════════════════════════════════════════
// SLACK VALIDATION MODULE
// ═══════════════════════════════════════════════════════════════════════════════
// Configuration validation for Slack notifications - WAVE5-SLACK-001
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate Slack webhook URL format
 * @param {string} url - Webhook URL to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateWebhookUrl(url) {
  // Check for empty/null
  if (!url || url.trim() === '') {
    return { valid: false, error: 'Webhook URL is required' };
  }

  // Try to parse as URL
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Must be HTTPS
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Webhook URL must use HTTPS' };
  }

  // Must be Slack domain
  if (parsed.hostname !== 'hooks.slack.com') {
    return { valid: false, error: 'URL must be a Slack webhook (https://hooks.slack.com/...)' };
  }

  return { valid: true };
}

/**
 * Validate Slack bot token format
 * @param {string} token - Bot token to validate
 * @returns {{ valid: boolean, optional?: boolean, message?: string, error?: string }}
 */
export function validateBotToken(token) {
  // Bot token is optional
  if (!token || token.trim() === '') {
    return { valid: true, optional: true, message: 'Bot token not configured (optional)' };
  }

  // Check if it looks like a webhook URL (common mistake)
  if (token.startsWith('https://hooks.slack.com')) {
    return { valid: false, error: 'Value appears to be a webhook URL, not a bot token' };
  }

  // Valid token formats: xoxb- (bot) or xoxp- (user)
  if (!token.startsWith('xoxb-') && !token.startsWith('xoxp-')) {
    return { valid: false, error: 'Invalid token format (must start with xoxb- or xoxp-)' };
  }

  return { valid: true };
}

/**
 * Validate channel routing configuration
 * @param {Object} channels - Channel configuration object
 * @returns {{ valid: boolean, configured: string[], missing: string[], warning?: string, error?: string }}
 */
export function validateChannelRouting(channels) {
  const allChannels = ['default', 'alerts', 'budget'];
  const configured = [];
  const missing = [];

  if (!channels || typeof channels !== 'object') {
    return { valid: false, configured: [], missing: allChannels, error: 'At least one channel must be configured' };
  }

  let hasWarning = false;

  for (const channel of allChannels) {
    const value = channels[channel];
    if (value && value.trim() !== '') {
      // Validate channel ID format
      if (value.startsWith('#')) {
        // Channel name format - works but not ideal
        hasWarning = true;
        configured.push(channel);
      } else if (value.startsWith('C') || value.startsWith('G') || value.startsWith('D')) {
        // Valid channel ID format
        configured.push(channel);
      } else {
        return {
          valid: false,
          configured,
          missing: allChannels.filter(c => !configured.includes(c)),
          error: `Invalid channel ID format for ${channel}. Expected C/G/D prefix or #channel-name`
        };
      }
    } else {
      missing.push(channel);
    }
  }

  if (configured.length === 0) {
    return { valid: false, configured: [], missing: allChannels, error: 'At least one channel must be configured' };
  }

  const result = { valid: true, configured, missing };
  if (hasWarning) {
    result.warning = 'Channel names may not work with all API methods. Use channel IDs for reliability.';
  }

  return result;
}

/**
 * Validate full Slack configuration
 * @param {Object} config - Full configuration object
 * @returns {{ checks: Array, passed: number, failed: number, optional: number, total: number, percentage: number, ready: boolean }}
 */
export function validateSlackConfig(config) {
  const checks = [];

  // Check 1: Webhook URL configured
  const hasWebhook = config.webhookUrl && config.webhookUrl.trim() !== '';
  checks.push({
    name: 'Webhook URL configured',
    status: hasWebhook ? 'pass' : 'fail',
    required: true
  });

  // Check 2: Webhook URL valid format
  const webhookResult = validateWebhookUrl(config.webhookUrl);
  checks.push({
    name: 'Webhook URL valid format',
    status: webhookResult.valid ? 'pass' : 'fail',
    required: true,
    error: webhookResult.error
  });

  // Check 3: Bot token configured (optional)
  const tokenResult = validateBotToken(config.botToken);
  checks.push({
    name: 'Bot token configured',
    status: tokenResult.optional ? 'optional' : (tokenResult.valid ? 'pass' : 'fail'),
    required: false,
    error: tokenResult.error
  });

  // Check 4: Channel routing defined
  const channelResult = validateChannelRouting(config.channels);
  checks.push({
    name: 'Channel routing defined',
    status: channelResult.valid ? 'pass' : (channelResult.configured?.length > 0 ? 'optional' : 'fail'),
    required: false,
    error: channelResult.error
  });

  // Check 5: Ping test ready (based on webhook being configured)
  checks.push({
    name: 'Ping test ready',
    status: hasWebhook && webhookResult.valid ? 'pass' : 'fail',
    required: false
  });

  // Check 6: Recent delivery success (placeholder - needs stats integration)
  checks.push({
    name: 'Recent delivery success',
    status: 'optional', // Can't verify without stats
    required: false
  });

  // Calculate totals
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const optional = checks.filter(c => c.status === 'optional').length;
  const total = checks.length;
  const percentage = Math.round((passed / total) * 100);

  // Ready if minimum requirements met (webhook configured and valid)
  const ready = checks[0].status === 'pass' && checks[1].status === 'pass';

  return { checks, passed, failed, optional, total, percentage, ready };
}

/**
 * Run live health check against Slack
 * @param {Object} config - Configuration with webhookUrl
 * @returns {Promise<{ success: boolean, latency?: number, error?: string, skipped?: boolean, reason?: string }>}
 */
export async function runSlackHealthCheck(config) {
  // Check if disabled
  if (config.enabled === false) {
    return { skipped: true, reason: 'Notifications disabled' };
  }

  if (!config.webhookUrl) {
    return { success: false, error: 'No webhook URL configured' };
  }

  const timeout = config.timeout || 5000;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'WAVE Portal health check' }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}`, latency };
    }

    return { success: true, latency };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timeout' };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Get validation status summary for UI display
 * @param {Object} config - Full configuration object
 * @returns {{ ready: boolean, percentage: number, passed: number, failed: number, optional: number, checks: Array, setupGuide: string }}
 */
export function getValidationStatus(config) {
  const validation = validateSlackConfig(config);

  // Generate setup guide markdown
  const setupGuide = `# Slack Notification Setup Guide

## Configuration Status
- Ready: ${validation.ready ? 'Yes' : 'No'}
- Progress: ${validation.percentage}%
- Passed: ${validation.passed}/${validation.total}

## Setup Instructions

### 1. Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" > "From scratch"
3. Name it "WAVE Notifications"
4. Select your workspace

### 2. Enable Incoming Webhooks
1. In your app settings, go to "Incoming Webhooks"
2. Toggle "Activate Incoming Webhooks" ON
3. Click "Add New Webhook to Workspace"
4. Select channel (e.g., #wave-updates)
5. Copy the webhook URL

### 3. Configure in Portal
1. Go to Configurations tab
2. Paste webhook URL in SLACK_WEBHOOK_URL field
3. Save configuration

## Channel Routing
| Event Type | Channel |
|------------|---------|
| Story Start/Complete | #wave-updates |
| Escalations | #wave-alerts |
| Budget Warnings | #wave-budget |

## Troubleshooting
- **401 Error**: Webhook URL is invalid or expired
- **404 Error**: Channel was deleted or app removed
- **Timeout**: Check network connectivity
`;

  return {
    ready: validation.ready,
    percentage: validation.percentage,
    passed: validation.passed,
    failed: validation.failed,
    optional: validation.optional,
    checks: validation.checks,
    setupGuide
  };
}

export default {
  validateWebhookUrl,
  validateBotToken,
  validateChannelRouting,
  validateSlackConfig,
  runSlackHealthCheck,
  getValidationStatus
};
