/**
 * API Endpoint Schemas (GAP-003)
 *
 * Schema definitions for all POST/PUT/PATCH endpoints requiring validation.
 * Based on JSON Schema draft-07 specification.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
 */

// Common patterns
const PATTERNS = {
  STORY_ID: '^[A-Z]+-\\d+$',
  UUID: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  EMAIL: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
  SLACK_CHANNEL: '^#[a-z0-9-_]+$',
  FILE_PATH: '^[a-zA-Z0-9/_.-]+$',
  AGENT_TYPE: '^(fe-dev|be-dev|qa|devops|arch)-?\\d*$'
};

// Audit log event types
const AUDIT_EVENT_TYPES = [
  'STORY_STARTED',
  'STORY_COMPLETED',
  'STORY_FAILED',
  'GATE_ENTERED',
  'GATE_COMPLETED',
  'GATE_REJECTED',
  'AGENT_STARTED',
  'AGENT_STOPPED',
  'AGENT_ERROR',
  'BUDGET_WARNING',
  'BUDGET_EXCEEDED',
  'SAFETY_VIOLATION',
  'ESCALATION',
  'VALIDATION_PASSED',
  'VALIDATION_FAILED',
  'CONFIG_CHANGED'
];

// Severity levels
const SEVERITY_LEVELS = ['info', 'warning', 'error', 'critical'];

// Agent types
const AGENT_TYPES = ['fe-dev', 'be-dev', 'qa', 'devops', 'arch', 'fe-dev-1', 'fe-dev-2', 'be-dev-1', 'be-dev-2', 'qa-1'];

// Gate numbers
const GATE_RANGE = { minimum: 0, maximum: 6 };

/**
 * Budget creation/update schema
 * POST /api/budgets
 */
export const budgetSchema = {
  type: 'object',
  required: ['projectPath'],
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    config: {
      type: 'object',
      properties: {
        totalBudget: { type: 'number', minimum: 0, maximum: 10000 },
        perAgentBudget: { type: 'number', minimum: 0, maximum: 1000 },
        perStoryBudget: { type: 'number', minimum: 0, maximum: 500 },
        warningThreshold: { type: 'number', minimum: 0, maximum: 100 },
        criticalThreshold: { type: 'number', minimum: 0, maximum: 100 }
      }
    }
  }
};

/**
 * Budget tracking schema
 * POST /api/budgets/track
 */
export const budgetTrackSchema = {
  type: 'object',
  required: ['projectPath', 'wave', 'agent'],
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    wave: {
      type: 'integer',
      minimum: 1,
      maximum: 100
    },
    agent: {
      type: 'string',
      minLength: 1,
      maxLength: 50
    },
    storyId: {
      type: 'string',
      maxLength: 100
    },
    tokens: {
      type: 'integer',
      minimum: 0,
      maximum: 10000000
    },
    cost: {
      type: 'number',
      minimum: 0,
      maximum: 1000
    }
  }
};

/**
 * Gate override schema
 * POST /api/gate-override
 */
export const gateOverrideSchema = {
  type: 'object',
  required: ['gateNumber', 'reason'],
  properties: {
    gateNumber: {
      type: 'integer',
      ...GATE_RANGE
    },
    action: {
      type: 'string',
      enum: ['override', 'bypass_requested', 'bypass_approved', 'bypass_denied']
    },
    reason: {
      type: 'string',
      minLength: 10,
      maxLength: 2000
    },
    reason_code: {
      type: 'string',
      enum: ['emergency', 'false_positive', 'approved_exception']
    },
    actor_type: {
      type: 'string',
      maxLength: 50
    },
    actor_id: {
      type: 'string',
      maxLength: 200
    },
    projectId: {
      type: 'string',
      maxLength: 200
    },
    projectPath: {
      type: 'string',
      maxLength: 500
    },
    wave_number: {
      type: 'integer',
      minimum: 1,
      maximum: 100
    },
    story_id: {
      type: 'string',
      maxLength: 100
    },
    previous_status: {
      type: 'string',
      maxLength: 50
    },
    new_status: {
      type: 'string',
      maxLength: 50
    },
    bypassed_checks: {
      type: 'array',
      items: { type: 'string', maxLength: 100 },
      maxItems: 50
    },
    approval_reference: {
      type: 'string',
      maxLength: 200
    },
    validation_mode: {
      type: 'string',
      maxLength: 50
    }
  }
};

/**
 * Agent start schema
 * POST /api/agents/:agentType/start
 */
export const agentStartSchema = {
  type: 'object',
  required: ['storyId', 'projectPath'],
  additionalProperties: false,
  properties: {
    storyId: {
      type: 'string',
      pattern: PATTERNS.STORY_ID,
      maxLength: 50
    },
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    waveNumber: {
      type: 'integer',
      minimum: 1,
      maximum: 100
    },
    config: {
      type: 'object',
      additionalProperties: true
    }
  }
};

/**
 * Agent stop schema
 * POST /api/agents/:agentType/stop
 */
export const agentStopSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reason: {
      type: 'string',
      maxLength: 500
    },
    force: {
      type: 'boolean'
    }
  }
};

/**
 * Agent type path parameter schema
 */
export const agentTypeParamSchema = {
  type: 'object',
  required: ['agentType'],
  properties: {
    agentType: {
      type: 'string',
      enum: AGENT_TYPES
    }
  }
};

/**
 * Audit log schema
 * POST /api/audit-log
 */
export const auditLogSchema = {
  type: 'object',
  required: ['action'],
  properties: {
    action: {
      type: 'string',
      minLength: 1,
      maxLength: 200
    },
    eventType: {
      type: 'string',
      maxLength: 100
    },
    actorType: {
      type: 'string',
      maxLength: 50
    },
    actorId: {
      type: 'string',
      maxLength: 200
    },
    storyId: {
      type: 'string',
      maxLength: 100
    },
    agent: {
      type: 'string',
      maxLength: 50
    },
    gate: {
      type: 'integer',
      ...GATE_RANGE
    },
    details: {
      type: 'object',
      additionalProperties: true
    },
    severity: {
      type: 'string',
      enum: SEVERITY_LEVELS
    },
    projectPath: {
      type: 'string',
      maxLength: 500
    },
    resourceId: {
      type: 'string',
      maxLength: 200
    },
    resourceType: {
      type: 'string',
      maxLength: 100
    }
  }
};

/**
 * Slack notify schema
 * POST /api/slack/notify
 */
export const slackNotifySchema = {
  type: 'object',
  required: ['type'],
  properties: {
    type: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    data: {
      type: 'object',
      additionalProperties: true
    }
  }
};

/**
 * Slack send schema
 * POST /api/slack/send
 */
export const slackSendSchema = {
  type: 'object',
  properties: {
    channel: {
      type: 'string',
      maxLength: 100
    },
    text: {
      type: 'string',
      maxLength: 4000
    },
    blocks: {
      type: 'array',
      maxItems: 50
    }
  }
};

/**
 * Slack test schema
 * POST /api/slack/test
 */
export const slackTestSchema = {
  type: 'object',
  properties: {
    message: {
      type: 'string',
      maxLength: 1000
    }
  }
};

/**
 * Rate limit check schema
 * POST /api/rate-limits/check
 */
export const rateLimitCheckSchema = {
  type: 'object',
  required: ['projectPath', 'agent'],
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    agent: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    estimatedTokens: {
      type: 'integer',
      minimum: 0,
      maximum: 10000000
    }
  }
};

/**
 * Rate limit record schema
 * POST /api/rate-limits/record
 */
export const rateLimitRecordSchema = {
  type: 'object',
  required: ['projectPath', 'agent'],
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    agent: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    tokensUsed: {
      type: 'integer',
      minimum: 0,
      maximum: 10000000
    }
  }
};

/**
 * Rate limit config schema
 * PUT /api/rate-limits/config
 */
export const rateLimitConfigSchema = {
  type: 'object',
  required: ['projectPath', 'agentType', 'limits'],
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    agentType: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    limits: {
      type: 'object',
      properties: {
        maxTokensPerMinute: { type: 'integer', minimum: 0 },
        maxTokensPerHour: { type: 'integer', minimum: 0 },
        maxRequestsPerMinute: { type: 'integer', minimum: 0 }
      }
    }
  }
};

/**
 * Rate limit reset schema
 * POST /api/rate-limits/reset
 */
export const rateLimitResetSchema = {
  type: 'object',
  properties: {
    projectPath: {
      type: 'string',
      maxLength: 500
    },
    agent: {
      type: 'string',
      maxLength: 100
    }
  }
};

/**
 * Analyze schema
 * POST /api/analyze, POST /api/analyze-stream
 */
export const analyzeSchema = {
  type: 'object',
  required: ['projectPath'],
  additionalProperties: false,
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    includeFiles: {
      type: 'array',
      items: { type: 'string', maxLength: 200 },
      maxItems: 100
    },
    excludeFiles: {
      type: 'array',
      items: { type: 'string', maxLength: 200 },
      maxItems: 100
    },
    analysisType: {
      type: 'string',
      enum: ['full', 'quick', 'security', 'performance']
    }
  }
};

/**
 * Sync stories schema
 * POST /api/sync-stories
 */
export const syncStoriesSchema = {
  type: 'object',
  required: ['projectPath'],
  additionalProperties: false,
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    waveNumber: {
      type: 'integer',
      minimum: 1,
      maximum: 100
    },
    force: {
      type: 'boolean'
    }
  }
};

/**
 * Validation schemas (safety, RLM, foundation, etc.)
 * POST /api/validate-safety, POST /api/validate-rlm, etc.
 */
export const validationSchema = {
  type: 'object',
  required: ['projectPath'],
  additionalProperties: false,
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    storyId: {
      type: 'string',
      pattern: PATTERNS.STORY_ID,
      maxLength: 50
    },
    waveNumber: {
      type: 'integer',
      minimum: 1,
      maximum: 100
    },
    strict: {
      type: 'boolean'
    }
  }
};

/**
 * Build QA thresholds schema
 * POST /api/build-qa/thresholds
 */
export const buildQAThresholdsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    testCoverage: {
      type: 'number',
      minimum: 0,
      maximum: 100
    },
    lintErrors: {
      type: 'integer',
      minimum: 0
    },
    typeErrors: {
      type: 'integer',
      minimum: 0
    },
    buildTime: {
      type: 'integer',
      minimum: 0,
      maximum: 3600000
    }
  }
};

/**
 * Drift report schemas
 * POST /api/drift-report/reset-memory, POST /api/drift-report/generate-baseline
 */
export const driftReportSchema = {
  type: 'object',
  required: ['projectPath'],
  additionalProperties: false,
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    baseline: {
      type: 'string',
      maxLength: 100
    }
  }
};

/**
 * Watchdog heartbeat schema
 * POST /api/watchdog/heartbeat
 */
export const watchdogHeartbeatSchema = {
  type: 'object',
  required: ['agentId'],
  additionalProperties: false,
  properties: {
    agentId: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    status: {
      type: 'string',
      enum: ['healthy', 'warning', 'error']
    },
    metrics: {
      type: 'object',
      additionalProperties: true
    }
  }
};

/**
 * DORA metrics schemas
 * POST /api/dora/deployment, POST /api/dora/lead-time, etc.
 */
export const doraDeploymentSchema = {
  type: 'object',
  required: ['projectPath', 'environment'],
  additionalProperties: false,
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    environment: {
      type: 'string',
      enum: ['development', 'staging', 'production']
    },
    version: {
      type: 'string',
      maxLength: 100
    },
    commitSha: {
      type: 'string',
      pattern: '^[a-f0-9]{40}$'
    }
  }
};

export const doraLeadTimeSchema = {
  type: 'object',
  required: ['projectPath', 'commitSha'],
  additionalProperties: false,
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    commitSha: {
      type: 'string',
      pattern: '^[a-f0-9]{40}$'
    },
    deployedAt: {
      type: 'string',
      maxLength: 50
    }
  }
};

export const doraFailureSchema = {
  type: 'object',
  required: ['projectPath', 'environment'],
  additionalProperties: false,
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    environment: {
      type: 'string',
      enum: ['development', 'staging', 'production']
    },
    description: {
      type: 'string',
      maxLength: 1000
    },
    severity: {
      type: 'string',
      enum: SEVERITY_LEVELS
    }
  }
};

export const doraRecoverySchema = {
  type: 'object',
  required: ['projectPath', 'failureId'],
  additionalProperties: false,
  properties: {
    projectPath: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    failureId: {
      type: 'string',
      maxLength: 100
    },
    resolution: {
      type: 'string',
      maxLength: 1000
    }
  }
};

/**
 * Test connection schemas
 * POST /api/test-anthropic, POST /api/test-slack
 */
export const testConnectionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    apiKey: {
      type: 'string',
      maxLength: 200
    },
    timeout: {
      type: 'integer',
      minimum: 1000,
      maximum: 60000
    }
  }
};

/**
 * Query parameter schema for GET /api/audit-log
 */
export const auditLogQuerySchema = {
  type: 'object',
  properties: {
    limit: {
      type: 'number',
      minimum: 1,
      maximum: 1000
    },
    offset: {
      type: 'number',
      minimum: 0
    },
    eventType: {
      type: 'string',
      enum: AUDIT_EVENT_TYPES
    },
    storyId: {
      type: 'string',
      maxLength: 50
    },
    startDate: {
      type: 'string',
      maxLength: 50
    },
    endDate: {
      type: 'string',
      maxLength: 50
    }
  }
};

/**
 * All schemas indexed by endpoint
 */
export const schemas = {
  // POST endpoints
  'POST /api/budgets': budgetSchema,
  'POST /api/budgets/track': budgetTrackSchema,
  'POST /api/gate-override': gateOverrideSchema,
  'POST /api/agents/:agentType/start': agentStartSchema,
  'POST /api/agents/:agentType/stop': agentStopSchema,
  'POST /api/audit-log': auditLogSchema,
  'POST /api/slack/notify': slackNotifySchema,
  'POST /api/slack/send': slackSendSchema,
  'POST /api/slack/test': slackTestSchema,
  'POST /api/rate-limits/check': rateLimitCheckSchema,
  'POST /api/rate-limits/record': rateLimitRecordSchema,
  'POST /api/rate-limits/reset': rateLimitResetSchema,
  'POST /api/analyze': analyzeSchema,
  'POST /api/analyze-stream': analyzeSchema,
  'POST /api/sync-stories': syncStoriesSchema,
  'POST /api/validate-safety': validationSchema,
  'POST /api/validate-rlm': validationSchema,
  'POST /api/validate-foundation': validationSchema,
  'POST /api/validate-all': validationSchema,
  'POST /api/validate-behavioral': validationSchema,
  'POST /api/validate-story-risk': validationSchema,
  'POST /api/validate-build-qa': validationSchema,
  'POST /api/build-qa/thresholds': buildQAThresholdsSchema,
  'POST /api/drift-report/reset-memory': driftReportSchema,
  'POST /api/drift-report/generate-baseline': driftReportSchema,
  'POST /api/watchdog/heartbeat': watchdogHeartbeatSchema,
  'POST /api/dora/deployment': doraDeploymentSchema,
  'POST /api/dora/lead-time': doraLeadTimeSchema,
  'POST /api/dora/failure': doraFailureSchema,
  'POST /api/dora/recovery': doraRecoverySchema,
  'POST /api/test-anthropic': testConnectionSchema,
  'POST /api/test-slack': testConnectionSchema,

  // PUT endpoints
  'PUT /api/rate-limits/config': rateLimitConfigSchema,

  // Query schemas
  'GET /api/audit-log': { query: auditLogQuerySchema },

  // Path parameter schemas
  'PARAMS /api/agents/:agentType/*': agentTypeParamSchema
};

/**
 * Get schema for a specific endpoint
 *
 * @param {string} method - HTTP method
 * @param {string} path - Endpoint path
 * @param {string} type - Schema type ('body', 'query', 'params')
 * @returns {Object|null} Schema or null if not found
 */
export function getSchemaForEndpoint(method, path, type = 'body') {
  const key = `${method} ${path}`;
  const schema = schemas[key];

  if (!schema) return null;

  // Handle query schemas
  if (type === 'query' && schema.query) {
    return schema.query;
  }

  // Handle body schemas
  if (type === 'body' && schema.type === 'object') {
    return schema;
  }

  return schema.type === 'object' ? schema : null;
}

export default {
  schemas,
  getSchemaForEndpoint,
  budgetSchema,
  budgetTrackSchema,
  gateOverrideSchema,
  agentStartSchema,
  agentStopSchema,
  auditLogSchema,
  slackNotifySchema,
  slackSendSchema,
  slackTestSchema,
  rateLimitConfigSchema,
  analyzeSchema,
  validationSchema,
  PATTERNS
};
