// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC SLACK EVENT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
// Project-agnostic event types and payload schemas for Slack notifications.
// These events can be used by any pipeline, orchestration, or automation system.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard event types for pipeline notifications
 * These are generic enough to work with any CI/CD or automation workflow.
 */
export const SLACK_EVENT_TYPES = {
  // ─────────────────────────────────────────────────────────────────────────────
  // TASK/STORY LIFECYCLE
  // Generic task or work item events
  // ─────────────────────────────────────────────────────────────────────────────
  STORY_START: 'story_start',           // Task/story started
  STORY_PROGRESS: 'story_progress',     // Task/story in progress
  STORY_COMPLETE: 'story_complete',     // Task/story completed
  STORY_FAILED: 'story_failed',         // Task/story failed
  STORY_BLOCKED: 'story_blocked',       // Task/story blocked

  // ─────────────────────────────────────────────────────────────────────────────
  // PIPELINE STAGES (GATES)
  // Generic stage/gate progression events
  // ─────────────────────────────────────────────────────────────────────────────
  GATE_ENTERED: 'gate_entered',         // Entered a pipeline stage
  GATE_COMPLETE: 'gate_complete',       // Stage completed successfully
  GATE_REJECTED: 'gate_rejected',       // Stage failed/rejected
  GATE_SKIPPED: 'gate_skipped',         // Stage skipped

  // ─────────────────────────────────────────────────────────────────────────────
  // WORKER/AGENT EVENTS
  // Events for automated workers (agents, jobs, runners)
  // ─────────────────────────────────────────────────────────────────────────────
  AGENT_START: 'agent_start',           // Worker started
  AGENT_HEARTBEAT: 'agent_heartbeat',   // Worker alive signal
  AGENT_COMPLETE: 'agent_complete',     // Worker finished
  AGENT_ERROR: 'agent_error',           // Worker encountered error
  AGENT_IDLE: 'agent_idle',             // Worker is idle

  // ─────────────────────────────────────────────────────────────────────────────
  // BUDGET/RESOURCE EVENTS
  // Cost and resource tracking events
  // ─────────────────────────────────────────────────────────────────────────────
  BUDGET_WARNING: 'budget_warning',     // Approaching budget limit (75%+)
  BUDGET_CRITICAL: 'budget_critical',   // Near budget limit (90%+)
  BUDGET_EXCEEDED: 'budget_exceeded',   // Budget exceeded

  // ─────────────────────────────────────────────────────────────────────────────
  // SAFETY/SECURITY EVENTS
  // Security and safety-related events
  // ─────────────────────────────────────────────────────────────────────────────
  SAFETY_VIOLATION: 'safety_violation', // Safety rule violated
  SECURITY_ALERT: 'security_alert',     // Security issue detected
  ESCALATION: 'escalation',             // Human intervention required

  // ─────────────────────────────────────────────────────────────────────────────
  // BATCH/WAVE EVENTS
  // Events for batch processing or wave-based execution
  // ─────────────────────────────────────────────────────────────────────────────
  WAVE_START: 'wave_start',             // Batch/wave started
  WAVE_COMPLETE: 'wave_complete',       // Batch/wave completed
  WAVE_FAILED: 'wave_failed',           // Batch/wave failed

  // ─────────────────────────────────────────────────────────────────────────────
  // PIPELINE EVENTS
  // Top-level pipeline events
  // ─────────────────────────────────────────────────────────────────────────────
  PIPELINE_START: 'pipeline_start',     // Pipeline execution started
  PIPELINE_COMPLETE: 'pipeline_complete', // Pipeline completed
  PIPELINE_FAILED: 'pipeline_failed',   // Pipeline failed
  PIPELINE_CANCELLED: 'pipeline_cancelled', // Pipeline cancelled

  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION EVENTS
  // Test, QA, and validation events
  // ─────────────────────────────────────────────────────────────────────────────
  VALIDATION_START: 'validation_start', // Validation started
  VALIDATION_PASS: 'validation_pass',   // Validation passed
  VALIDATION_FAIL: 'validation_fail',   // Validation failed
  TEST_RESULT: 'test_result',           // Test results

  // ─────────────────────────────────────────────────────────────────────────────
  // DEPLOYMENT EVENTS
  // Release and deployment events
  // ─────────────────────────────────────────────────────────────────────────────
  DEPLOY_START: 'deploy_start',         // Deployment started
  DEPLOY_COMPLETE: 'deploy_complete',   // Deployment successful
  DEPLOY_FAILED: 'deploy_failed',       // Deployment failed
  DEPLOY_ROLLBACK: 'deploy_rollback',   // Rollback triggered

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERIC EVENTS
  // General-purpose events
  // ─────────────────────────────────────────────────────────────────────────────
  INFO: 'info',                         // Informational message
  WARNING: 'warning',                   // Warning message
  ERROR: 'error',                       // Error message
  RETRY: 'retry',                       // Retry triggered
  CUSTOM: 'custom'                      // Custom event type
};

/**
 * Severity levels for event routing
 */
export const SEVERITY_LEVELS = {
  DEBUG: 'debug',       // Development/debugging only
  INFO: 'info',         // Normal operational events
  WARNING: 'warning',   // Potential issues, needs attention
  CRITICAL: 'critical', // Severe issues, immediate attention
  EMERGENCY: 'emergency' // System down, requires immediate action
};

/**
 * Channel routing by severity
 */
export const SEVERITY_TO_CHANNEL = {
  debug: 'default',
  info: 'default',
  warning: 'alerts',
  critical: 'alerts',
  emergency: 'alerts'
};

/**
 * Event type to default severity mapping
 */
export const EVENT_SEVERITY_MAP = {
  // Info severity
  [SLACK_EVENT_TYPES.STORY_START]: SEVERITY_LEVELS.INFO,
  [SLACK_EVENT_TYPES.STORY_PROGRESS]: SEVERITY_LEVELS.INFO,
  [SLACK_EVENT_TYPES.STORY_COMPLETE]: SEVERITY_LEVELS.INFO,
  [SLACK_EVENT_TYPES.GATE_ENTERED]: SEVERITY_LEVELS.INFO,
  [SLACK_EVENT_TYPES.GATE_COMPLETE]: SEVERITY_LEVELS.INFO,
  [SLACK_EVENT_TYPES.AGENT_START]: SEVERITY_LEVELS.INFO,
  [SLACK_EVENT_TYPES.AGENT_COMPLETE]: SEVERITY_LEVELS.INFO,
  [SLACK_EVENT_TYPES.WAVE_START]: SEVERITY_LEVELS.INFO,
  [SLACK_EVENT_TYPES.WAVE_COMPLETE]: SEVERITY_LEVELS.INFO,
  [SLACK_EVENT_TYPES.PIPELINE_START]: SEVERITY_LEVELS.INFO,
  [SLACK_EVENT_TYPES.PIPELINE_COMPLETE]: SEVERITY_LEVELS.INFO,
  [SLACK_EVENT_TYPES.VALIDATION_PASS]: SEVERITY_LEVELS.INFO,
  [SLACK_EVENT_TYPES.DEPLOY_COMPLETE]: SEVERITY_LEVELS.INFO,

  // Warning severity
  [SLACK_EVENT_TYPES.STORY_BLOCKED]: SEVERITY_LEVELS.WARNING,
  [SLACK_EVENT_TYPES.GATE_REJECTED]: SEVERITY_LEVELS.WARNING,
  [SLACK_EVENT_TYPES.AGENT_ERROR]: SEVERITY_LEVELS.WARNING,
  [SLACK_EVENT_TYPES.BUDGET_WARNING]: SEVERITY_LEVELS.WARNING,
  [SLACK_EVENT_TYPES.VALIDATION_FAIL]: SEVERITY_LEVELS.WARNING,
  [SLACK_EVENT_TYPES.RETRY]: SEVERITY_LEVELS.WARNING,

  // Critical severity
  [SLACK_EVENT_TYPES.STORY_FAILED]: SEVERITY_LEVELS.CRITICAL,
  [SLACK_EVENT_TYPES.WAVE_FAILED]: SEVERITY_LEVELS.CRITICAL,
  [SLACK_EVENT_TYPES.PIPELINE_FAILED]: SEVERITY_LEVELS.CRITICAL,
  [SLACK_EVENT_TYPES.BUDGET_CRITICAL]: SEVERITY_LEVELS.CRITICAL,
  [SLACK_EVENT_TYPES.BUDGET_EXCEEDED]: SEVERITY_LEVELS.CRITICAL,
  [SLACK_EVENT_TYPES.SAFETY_VIOLATION]: SEVERITY_LEVELS.CRITICAL,
  [SLACK_EVENT_TYPES.SECURITY_ALERT]: SEVERITY_LEVELS.CRITICAL,
  [SLACK_EVENT_TYPES.ESCALATION]: SEVERITY_LEVELS.CRITICAL,
  [SLACK_EVENT_TYPES.DEPLOY_FAILED]: SEVERITY_LEVELS.CRITICAL,
  [SLACK_EVENT_TYPES.DEPLOY_ROLLBACK]: SEVERITY_LEVELS.CRITICAL
};

/**
 * Create a structured Slack event payload
 * @param {string} type - Event type from SLACK_EVENT_TYPES
 * @param {Object} data - Event data
 * @returns {Object} Structured event payload
 */
export function createSlackEvent(type, data = {}) {
  const severity = data.severity || EVENT_SEVERITY_MAP[type] || SEVERITY_LEVELS.INFO;

  return {
    // Event metadata
    type,
    timestamp: data.timestamp || new Date().toISOString(),
    severity,
    channel: SEVERITY_TO_CHANNEL[severity] || 'default',

    // Context identifiers
    project: data.project || data.projectName || null,
    pipeline_id: data.pipelineId || data.pipeline_id || null,
    wave: data.wave || data.waveNumber || null,
    gate: data.gate || data.gateNumber || null,
    story_id: data.storyId || data.story_id || data.taskId || null,
    agent: data.agent || data.agentType || data.worker || null,

    // Event details
    details: {
      title: data.title || null,
      message: data.message || null,
      error: data.error || null,
      reason: data.reason || null,
      ...data.details
    },

    // Resource tracking
    cost: data.cost || null,
    tokens: data.tokens ? {
      input: data.tokens.input || data.tokens.input_tokens || 0,
      output: data.tokens.output || data.tokens.output_tokens || 0,
      total: data.tokens.total || data.tokens.total_tokens ||
             ((data.tokens.input || 0) + (data.tokens.output || 0))
    } : null,

    // Additional metadata
    metadata: data.metadata || {}
  };
}

/**
 * Format Slack blocks based on event type
 * Returns standard Slack block kit format
 */
export function formatSlackBlocks(event) {
  const blocks = [];
  const type = event.type;

  // Header for major events
  if ([SLACK_EVENT_TYPES.WAVE_START, SLACK_EVENT_TYPES.WAVE_COMPLETE,
       SLACK_EVENT_TYPES.PIPELINE_START, SLACK_EVENT_TYPES.PIPELINE_COMPLETE,
       SLACK_EVENT_TYPES.ESCALATION, SLACK_EVENT_TYPES.SAFETY_VIOLATION].includes(type)) {
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: getHeaderText(event),
        emoji: true
      }
    });
  }

  // Main content section
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: getMainText(event)
    }
  });

  // Fields for structured data
  const fields = getEventFields(event);
  if (fields.length > 0) {
    blocks.push({
      type: 'section',
      fields
    });
  }

  // Context footer
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: getContextText(event)
      }
    ]
  });

  return blocks;
}

/**
 * Get emoji for event type
 */
export function getEventEmoji(type) {
  const emojiMap = {
    // Success
    [SLACK_EVENT_TYPES.STORY_COMPLETE]: ':white_check_mark:',
    [SLACK_EVENT_TYPES.GATE_COMPLETE]: ':white_check_mark:',
    [SLACK_EVENT_TYPES.WAVE_COMPLETE]: ':trophy:',
    [SLACK_EVENT_TYPES.PIPELINE_COMPLETE]: ':tada:',
    [SLACK_EVENT_TYPES.VALIDATION_PASS]: ':white_check_mark:',
    [SLACK_EVENT_TYPES.DEPLOY_COMPLETE]: ':rocket:',

    // In progress
    [SLACK_EVENT_TYPES.STORY_START]: ':gear:',
    [SLACK_EVENT_TYPES.STORY_PROGRESS]: ':hourglass_flowing_sand:',
    [SLACK_EVENT_TYPES.GATE_ENTERED]: ':arrow_right:',
    [SLACK_EVENT_TYPES.WAVE_START]: ':ocean:',
    [SLACK_EVENT_TYPES.PIPELINE_START]: ':rocket:',
    [SLACK_EVENT_TYPES.AGENT_START]: ':robot_face:',
    [SLACK_EVENT_TYPES.AGENT_COMPLETE]: ':checkered_flag:',
    [SLACK_EVENT_TYPES.DEPLOY_START]: ':package:',

    // Warnings
    [SLACK_EVENT_TYPES.STORY_BLOCKED]: ':no_entry_sign:',
    [SLACK_EVENT_TYPES.GATE_REJECTED]: ':x:',
    [SLACK_EVENT_TYPES.BUDGET_WARNING]: ':warning:',
    [SLACK_EVENT_TYPES.VALIDATION_FAIL]: ':x:',
    [SLACK_EVENT_TYPES.RETRY]: ':arrows_counterclockwise:',
    [SLACK_EVENT_TYPES.AGENT_ERROR]: ':warning:',

    // Critical
    [SLACK_EVENT_TYPES.STORY_FAILED]: ':x:',
    [SLACK_EVENT_TYPES.WAVE_FAILED]: ':x:',
    [SLACK_EVENT_TYPES.PIPELINE_FAILED]: ':x:',
    [SLACK_EVENT_TYPES.BUDGET_CRITICAL]: ':rotating_light:',
    [SLACK_EVENT_TYPES.BUDGET_EXCEEDED]: ':no_entry:',
    [SLACK_EVENT_TYPES.SAFETY_VIOLATION]: ':rotating_light:',
    [SLACK_EVENT_TYPES.SECURITY_ALERT]: ':rotating_light:',
    [SLACK_EVENT_TYPES.ESCALATION]: ':sos:',
    [SLACK_EVENT_TYPES.DEPLOY_FAILED]: ':x:',
    [SLACK_EVENT_TYPES.DEPLOY_ROLLBACK]: ':rewind:',

    // Generic
    [SLACK_EVENT_TYPES.INFO]: ':information_source:',
    [SLACK_EVENT_TYPES.WARNING]: ':warning:',
    [SLACK_EVENT_TYPES.ERROR]: ':x:'
  };

  return emojiMap[type] || ':bell:';
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getHeaderText(event) {
  const emoji = getEventEmoji(event.type);
  const typeLabels = {
    [SLACK_EVENT_TYPES.WAVE_START]: `Wave ${event.wave || '?'} Starting`,
    [SLACK_EVENT_TYPES.WAVE_COMPLETE]: `Wave ${event.wave || '?'} Complete!`,
    [SLACK_EVENT_TYPES.PIPELINE_START]: 'Pipeline Started',
    [SLACK_EVENT_TYPES.PIPELINE_COMPLETE]: 'Pipeline Complete!',
    [SLACK_EVENT_TYPES.ESCALATION]: 'ESCALATION REQUIRED',
    [SLACK_EVENT_TYPES.SAFETY_VIOLATION]: 'SAFETY VIOLATION'
  };

  return `${emoji} ${typeLabels[event.type] || event.type}`;
}

function getMainText(event) {
  const emoji = getEventEmoji(event.type);
  const storyId = event.story_id || 'N/A';
  const title = event.details?.title || event.details?.message || '';

  switch (event.type) {
    case SLACK_EVENT_TYPES.STORY_START:
      return `${emoji} *Story Started*\n*${storyId}*: ${title}`;
    case SLACK_EVENT_TYPES.STORY_COMPLETE:
      return `${emoji} *Story Complete*\n*${storyId}*: ${title}`;
    case SLACK_EVENT_TYPES.STORY_FAILED:
      return `${emoji} *Story Failed*\n*${storyId}*: ${title}\n*Error:* ${event.details?.error || 'Unknown'}`;
    case SLACK_EVENT_TYPES.GATE_COMPLETE:
      return `${emoji} *Gate Complete*\nGate ${event.gate || '?'} passed`;
    case SLACK_EVENT_TYPES.GATE_REJECTED:
      return `${emoji} *Gate Rejected*\nGate ${event.gate || '?'} failed`;
    case SLACK_EVENT_TYPES.AGENT_START:
      return `${emoji} *Agent Started*\n\`${event.agent || 'unknown'}\` is now active`;
    case SLACK_EVENT_TYPES.ESCALATION:
      return `*Human intervention needed*\n\n*Reason:* ${event.details?.reason || 'Unknown'}`;
    default:
      return `${emoji} *${event.type}*\n${title || event.details?.message || ''}`;
  }
}

function getEventFields(event) {
  const fields = [];

  if (event.agent) {
    fields.push({ type: 'mrkdwn', text: `*Agent:*\n\`${event.agent}\`` });
  }
  if (event.wave) {
    fields.push({ type: 'mrkdwn', text: `*Wave:*\n${event.wave}` });
  }
  if (event.gate) {
    fields.push({ type: 'mrkdwn', text: `*Gate:*\n${event.gate}` });
  }
  if (event.cost) {
    fields.push({ type: 'mrkdwn', text: `*Cost:*\n$${event.cost.toFixed(4)}` });
  }
  if (event.tokens?.total) {
    fields.push({ type: 'mrkdwn', text: `*Tokens:*\n${event.tokens.total}` });
  }
  if (event.details?.duration) {
    fields.push({ type: 'mrkdwn', text: `*Duration:*\n${event.details.duration}` });
  }

  return fields;
}

function getContextText(event) {
  const parts = [];

  if (event.project) {
    parts.push(event.project);
  }
  if (event.story_id) {
    parts.push(`Story: ${event.story_id}`);
  }

  parts.push(new Date(event.timestamp).toLocaleTimeString());

  return parts.join(' | ');
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  SLACK_EVENT_TYPES,
  SEVERITY_LEVELS,
  SEVERITY_TO_CHANNEL,
  EVENT_SEVERITY_MAP,
  createSlackEvent,
  formatSlackBlocks,
  getEventEmoji
};
