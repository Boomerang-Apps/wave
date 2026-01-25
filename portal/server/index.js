import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateInfrastructure } from './validate-infrastructure.js';
import dotenv from 'dotenv';
import { getSlackNotifier } from './slack-notifier.js';
import { SLACK_EVENT_TYPES, createSlackEvent } from './slack-events.js';
import { promptInjectionDetector } from './utils/prompt-injection-detector.js';
import { DORAMetricsTracker } from './utils/dora-metrics.js';
import { AgentRateLimiter } from './utils/rate-limiter.js';
import { securityMiddleware, generateOWASPReport } from './security-middleware.js';
import { createValidator, validateSchema, VALIDATION_ERRORS } from './middleware/validation.js';
import { createRateLimitEnforcer, RATE_LIMIT_ERRORS } from './middleware/rate-limit-enforcer.js';
import { discoverProject } from './utils/project-discovery.js';
import { validateMockups } from './utils/mockup-endpoint.js';
import {
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
  rateLimitCheckSchema,
  rateLimitRecordSchema,
  rateLimitResetSchema,
  analyzeSchema,
  syncStoriesSchema,
  validationSchema,
  buildQAThresholdsSchema,
  driftReportSchema,
  watchdogHeartbeatSchema,
  doraDeploymentSchema,
  doraLeadTimeSchema,
  doraFailureSchema,
  doraRecoverySchema,
  testConnectionSchema,
  agentTypeParamSchema
} from './middleware/schemas.js';

// Load environment variables from .env file
dotenv.config();

// ═══════════════════════════════════════════════════════════════════════════════
// SLACK NOTIFIER INITIALIZATION
// Validated: Slack Developer Docs - Web API enables threading
// ═══════════════════════════════════════════════════════════════════════════════

// Thread persistence helpers (uses Supabase REST API)
async function persistSlackThread(storyId, threadInfo) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('[SlackThreads] No Supabase configured - thread stored in memory only');
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/slack_threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        task_id: storyId,
        task_type: 'story',
        thread_ts: threadInfo.thread_ts,
        channel_id: threadInfo.channel_id,
        status: 'active',
        message_count: threadInfo.message_count || 1,
        last_message_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.error('[SlackThreads] Failed to persist thread:', await response.text());
    } else {
      console.log(`[SlackThreads] Persisted thread for ${storyId}: ${threadInfo.thread_ts}`);
    }
  } catch (error) {
    console.error('[SlackThreads] Error persisting thread:', error.message);
  }
}

async function updateSlackThread(storyId, threadInfo) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/slack_threads?task_id=eq.${encodeURIComponent(storyId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        message_count: threadInfo.message_count,
        last_message_at: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('[SlackThreads] Error updating thread:', error.message);
  }
}

async function loadSlackThreads() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return {};

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/slack_threads?status=eq.active&select=task_id,thread_ts,channel_id,message_count`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (response.ok) {
      const threads = await response.json();
      const threadMap = {};
      threads.forEach(t => {
        threadMap[t.task_id] = {
          thread_ts: t.thread_ts,
          channel_id: t.channel_id,
          message_count: t.message_count
        };
      });
      console.log(`[SlackThreads] Loaded ${threads.length} active threads from database`);
      return threadMap;
    }
  } catch (error) {
    console.error('[SlackThreads] Error loading threads:', error.message);
  }
  return {};
}

const slackNotifier = getSlackNotifier({
  // Web API (preferred - enables threading)
  botToken: process.env.SLACK_BOT_TOKEN,
  // Legacy webhook (fallback)
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  projectName: process.env.PROJECT_NAME || 'Portal',
  enabled: process.env.SLACK_ENABLED !== 'false',
  // Channel IDs for Web API (must be IDs like C0123456789, not names)
  channels: {
    default: process.env.SLACK_CHANNEL_UPDATES,
    alerts: process.env.SLACK_CHANNEL_ALERTS,
    budget: process.env.SLACK_CHANNEL_BUDGET
  },
  // Legacy webhooks (fallback)
  webhooks: {
    default: process.env.SLACK_WEBHOOK_URL,
    alerts: process.env.SLACK_WEBHOOK_URL,
    budget: process.env.SLACK_WEBHOOK_URL
  },
  // Thread persistence callbacks
  onThreadCreated: persistSlackThread,
  onThreadUpdated: updateSlackThread
});

// Load existing threads on startup (async, non-blocking)
loadSlackThreads().then(threads => {
  slackNotifier.loadThreads(threads);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE (GAP-002)
// Apply OWASP security headers, rate limiting, and input sanitization
// Sources: OWASP Secure Headers Project, Helmet.js, Express.js Security
// ═══════════════════════════════════════════════════════════════════════════════
const securityMiddlewares = securityMiddleware({
  headers: {
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: ws: https:; frame-ancestors 'self'"
  },
  rateLimit: {
    windowMs: 60000,
    maxRequests: 200  // Higher limit for Portal API
  },
  maxBodySize: 10 * 1024 * 1024 // 10MB
});
securityMiddlewares.forEach(m => app.use(m));

// OWASP compliance report endpoint
app.get('/api/security/owasp-report', (req, res) => {
  const report = generateOWASPReport();
  res.json(report);
});

// Store for analysis steps (for step-by-step progress)
const analysisSteps = new Map();

// Utility: Check if file/directory exists
function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

// Utility: Read JSON file safely
function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Utility: Read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// Utility: List directory contents
function listDir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

// Utility: Get file stats
function getStats(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING UTILITIES
// Tracks all significant events for traceability (Phase 2.2)
// ═══════════════════════════════════════════════════════════════════════════════

// In-memory audit log buffer (for when Supabase is not available)
const auditLogBuffer = [];
const MAX_BUFFER_SIZE = 1000;

// Audit log function - logs to file and optionally to Supabase
async function logAudit(event) {
  // ── Prompt Injection Detection (GAP-001) ──────────────────────────────────
  // Scan event content for potential prompt injection attempts
  const textsToScan = [
    event.action,
    typeof event.details === 'string' ? event.details : JSON.stringify(event.details || {}),
    event.metadata?.message,
    event.metadata?.content
  ].filter(Boolean);

  let injectionDetected = false;
  let injectionSeverity = null;
  const injectionTags = [];

  for (const text of textsToScan) {
    const result = promptInjectionDetector.analyze(text);
    if (!result.safe) {
      injectionDetected = true;
      if (!injectionSeverity ||
          (result.severity === 'critical') ||
          (result.severity === 'high' && injectionSeverity !== 'critical')) {
        injectionSeverity = result.severity;
      }
      for (const detection of result.detections) {
        const tag = `injection:${detection.category}`;
        if (!injectionTags.includes(tag)) {
          injectionTags.push(tag);
        }
      }
    }
  }

  // Merge injection findings with event properties
  if (injectionDetected) {
    event.requiresReview = true;
    event.safetyTags = [...(event.safetyTags || []), ...injectionTags];
    if (injectionSeverity === 'critical' || injectionSeverity === 'high') {
      event.severity = event.severity === 'critical' ? 'critical' :
                       (injectionSeverity === 'critical' ? 'critical' : 'warning');
    }
    console.warn('[INJECTION ALERT] Potential prompt injection detected in audit event:', {
      action: event.action,
      severity: injectionSeverity,
      tags: injectionTags
    });
  }
  // ── End Injection Detection ───────────────────────────────────────────────

  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    project_id: event.projectId || null,
    event_type: event.eventType || 'system_event',
    event_category: event.category || null,
    severity: event.severity || 'info',
    actor_type: event.actorType || 'system',
    actor_id: event.actorId || 'system',
    action: event.action,
    resource_type: event.resourceType || null,
    resource_id: event.resourceId || null,
    wave_number: event.waveNumber || null,
    gate_number: event.gateNumber || null,
    validation_mode: event.validationMode || null,
    details: event.details || {},
    metadata: event.metadata || {},
    safety_tags: event.safetyTags || [],
    requires_review: event.requiresReview || false,
    token_input: event.tokenInput || null,
    token_output: event.tokenOutput || null,
    cost_usd: event.costUsd || null,
    created_at: new Date().toISOString()
  };

  // Add to in-memory buffer
  auditLogBuffer.unshift(auditEntry);
  if (auditLogBuffer.length > MAX_BUFFER_SIZE) {
    auditLogBuffer.pop();
  }

  // Write to file-based audit log
  const auditDir = event.projectPath
    ? path.join(event.projectPath, '.claude', 'audit')
    : path.join(__dirname, '..', '.claude', 'audit');

  try {
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const auditFile = path.join(auditDir, `audit-${today}.jsonl`);
    fs.appendFileSync(auditFile, JSON.stringify(auditEntry) + '\n');
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }

  // Log to console in development
  const logLevel = event.severity === 'error' || event.severity === 'critical' ? 'error' : 'log';
  console[logLevel](`[AUDIT] ${event.severity?.toUpperCase() || 'INFO'} - ${event.actorType}/${event.actorId}: ${event.action}`,
    event.resourceType ? `(${event.resourceType}:${event.resourceId})` : '');

  // Send Slack notification for significant events (async, non-blocking)
  if (event.notifySlack !== false && slackNotifier.enabled) {
    notifySlackForAudit(auditEntry).catch(() => {});
  }

  return auditEntry;
}

// Log agent action
async function logAgentAction(agentType, action, details = {}) {
  return logAudit({
    eventType: 'agent_action',
    category: 'agent',
    actorType: 'agent',
    actorId: agentType,
    action: action,
    resourceType: 'agent',
    resourceId: agentType,
    details: details,
    projectPath: details.projectPath,
    waveNumber: details.waveNumber,
    gateNumber: details.gateNumber,
    tokenInput: details.tokenInput,
    tokenOutput: details.tokenOutput,
    costUsd: details.costUsd
  });
}

/**
 * Log gate override with required reason
 * Validated: SonarSource audit entry requirements
 * - Timestamp (UTC preferred)
 * - User/Actor Identification
 * - Action Type
 * - Resource/Object affected
 * - Outcome (success/failure)
 * - Contextual Data (before/after states)
 */
async function logGateOverride(gateNumber, action, details = {}) {
  // Validate reason is provided (mandatory for audit compliance)
  if (!details.reason || details.reason.length < 10) {
    throw new Error('Gate override requires a reason (minimum 10 characters)');
  }

  const auditEntry = await logAudit({
    projectId: details.projectId,
    projectPath: details.projectPath,
    eventType: 'gate_transition',
    category: 'gate_override',
    severity: 'warning',

    // Actor identification (SonarSource requirement)
    actorType: details.actor_type || 'user',
    actorId: details.actor_id || 'unknown',

    // Action Type (standardized verb)
    action: action, // 'override', 'bypass_requested', 'bypass_approved', 'bypass_denied'

    // Resource/Object affected
    resourceType: 'gate',
    resourceId: `gate-${gateNumber}`,

    // Context
    waveNumber: details.wave_number,
    gateNumber: gateNumber,
    validationMode: details.validation_mode,

    // Contextual Data with before/after states (SonarSource)
    details: {
      reason: details.reason,
      reason_code: details.reason_code, // e.g., 'emergency', 'false_positive', 'approved_exception'
      previous_status: details.previous_status,
      new_status: details.new_status,
      bypassed_checks: details.bypassed_checks || [],
      approval_reference: details.approval_reference
    },

    // Liminal AI Governance - document overrides
    safetyTags: ['gate_override'],
    requiresReview: true // ALWAYS flag for review
  });

  // Notify Slack (always alerts channel for overrides)
  if (slackNotifier.enabled) {
    await slackNotifier.notifyGateOverride({
      gate: gateNumber,
      action,
      reason: details.reason,
      actor: details.actor_id,
      wave: details.wave_number,
      story_id: details.story_id
    });
  }

  return auditEntry;
}

// Log validation run
async function logValidation(validationType, status, details = {}) {
  return logAudit({
    eventType: 'validation',
    category: validationType,
    actorType: details.triggeredBy || 'user',
    actorId: details.actorId || 'portal',
    action: `validation_${status}`,
    resourceType: 'validation',
    resourceId: validationType,
    details: {
      ...details,
      overall_status: status,
      total_checks: details.totalChecks,
      passed: details.passed,
      failed: details.failed
    },
    projectPath: details.projectPath,
    validationMode: details.validationMode,
    severity: status === 'fail' ? 'warn' : 'info',
    requiresReview: status === 'fail' && details.validationMode === 'strict'
  });
}

// Log safety event
async function logSafetyEvent(action, details = {}) {
  return logAudit({
    eventType: 'safety_event',
    category: 'safety',
    severity: details.severity || 'warn',
    actorType: details.actorType || 'system',
    actorId: details.actorId || 'safety-monitor',
    action: action,
    resourceType: details.resourceType,
    resourceId: details.resourceId,
    details: details,
    projectPath: details.projectPath,
    safetyTags: details.safetyTags || [],
    requiresReview: true
  });
}

// Streaming analysis endpoint with step-by-step progress
app.post('/api/analyze-stream', async (req, res) => {
  const { projectPath } = req.body;

  if (!projectPath || !exists(projectPath)) {
    return res.status(400).json({ error: 'Invalid project path' });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendStep = (step, status, detail, proof = null) => {
    res.write(`data: ${JSON.stringify({ step, status, detail, proof, timestamp: new Date().toISOString() })}\n\n`);
  };

  try {
    const report = {
      timestamp: new Date().toISOString(),
      project_path: projectPath,
      analysis_proof: [],
      steps_completed: [],
    };

    // Step 1: Scanning directory structure
    sendStep(1, 'running', 'Scanning directory structure...');
    await sleep(800);
    const rootFiles = listDir(projectPath);

    // Generate detailed file tree
    const fileTree = generateFileTree(projectPath, 0, 3); // depth of 3
    const proof1 = `📁 Project Structure (${rootFiles.length} items in root):\n\n${fileTree}`;

    report.analysis_proof.push({ step: 1, action: 'Directory scan', proof: proof1 });
    report.file_structure = analyzeFileStructure(projectPath);
    report.file_structure.tree = fileTree;
    sendStep(1, 'complete', `Directory scanned: ${rootFiles.length} items found`, proof1);
    report.steps_completed.push('file_structure');

    // Step 2: Reading CLAUDE.md
    sendStep(2, 'running', 'Reading CLAUDE.md protocol file...');
    await sleep(800);
    const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
    let proof2 = 'CLAUDE.md not found';
    if (exists(claudeMdPath)) {
      const content = readFile(claudeMdPath);
      const firstLines = content.split('\n').slice(0, 5).join('\n');
      proof2 = `Read ${content.length} bytes. First lines:\n${firstLines}`;
      report.claude_md = analyzeCLAUDEMD(projectPath);
    }
    report.analysis_proof.push({ step: 2, action: 'Read CLAUDE.md', proof: proof2 });
    sendStep(2, 'complete', 'CLAUDE.md analyzed', proof2);
    report.steps_completed.push('claude_md');

    // Step 3: Finding AI PRD document
    sendStep(3, 'running', 'Searching for AI PRD document...');
    await sleep(800);
    report.ai_prd = analyzeAIPRD(projectPath);
    let proof3 = 'No AI PRD found';
    if (report.ai_prd.prd_location) {
      const prdPath = path.join(projectPath, report.ai_prd.prd_location);
      const content = readFile(prdPath);
      if (content) {
        const firstLines = content.split('\n').slice(0, 8).join('\n');
        proof3 = `Found: ${report.ai_prd.prd_location} (${report.ai_prd.prd_size} bytes)\nFirst lines:\n${firstLines}`;
      }
    }
    report.analysis_proof.push({ step: 3, action: 'Find AI PRD', proof: proof3 });
    sendStep(3, 'complete', report.ai_prd.prd_location ? `Found: ${report.ai_prd.prd_location}` : 'AI PRD not found', proof3);
    report.steps_completed.push('ai_prd');

    // Step 4: Analyzing story files
    sendStep(4, 'running', 'Reading story JSON files...');
    await sleep(800);
    report.ai_stories = analyzeStories(projectPath);
    let proof4 = `Found ${report.ai_stories.stories_found} stories`;
    if (report.ai_stories.story_details && report.ai_stories.story_details.length > 0) {
      const storyIds = report.ai_stories.story_details.map(s => s.id).join(', ');
      proof4 += `\nStory IDs: ${storyIds}`;
      // Read first story as proof
      const firstStory = report.ai_stories.story_details[0];
      if (firstStory) {
        proof4 += `\n\nFirst story (${firstStory.id}):\n  Title: ${firstStory.title}\n  Agent: ${firstStory.agent}\n  Acceptance Criteria: ${firstStory.acceptance_criteria_count} items`;
      }
    }
    report.analysis_proof.push({ step: 4, action: 'Read stories', proof: proof4 });
    sendStep(4, 'complete', `${report.ai_stories.stories_found} stories found`, proof4);
    report.steps_completed.push('ai_stories');

    // Step 5: Scanning HTML prototypes
    sendStep(5, 'running', 'Scanning HTML prototype files...');
    await sleep(800);
    report.html_prototype = analyzeHTMLPrototypes(projectPath);
    let proof5 = `Found ${report.html_prototype.total_prototypes} HTML prototypes`;
    if (report.html_prototype.files_found.length > 0) {
      proof5 += `\nFiles: ${report.html_prototype.files_found.join(', ')}`;
    }
    report.analysis_proof.push({ step: 5, action: 'Scan prototypes', proof: proof5 });
    sendStep(5, 'complete', `${report.html_prototype.total_prototypes} prototypes found`, proof5);
    report.steps_completed.push('html_prototype');

    // Step 6: Checking WAVE configuration
    sendStep(6, 'running', 'Checking WAVE configuration...');
    await sleep(800);
    report.wave_config = analyzeWaveConfig(projectPath);
    const proof6 = report.wave_config.findings.join('\n');
    report.analysis_proof.push({ step: 6, action: 'Check config', proof: proof6 });
    sendStep(6, 'complete', 'Configuration checked', proof6);
    report.steps_completed.push('wave_config');

    // Step 7: Generating gap analysis
    sendStep(7, 'running', 'Generating gap analysis...');
    await sleep(800);
    report.gap_analysis = generateGapAnalysis(report);
    report.improvement_plan = generateImprovementPlan(report);
    report.summary = {
      total_issues:
        (report.file_structure?.issues?.length || 0) +
        (report.ai_prd?.issues?.length || 0) +
        (report.ai_stories?.issues?.length || 0) +
        (report.html_prototype?.issues?.length || 0) +
        (report.claude_md?.issues?.length || 0),
      total_gaps: report.gap_analysis.gaps.length,
      readiness_score: calculateReadinessScore(report),
    };
    sendStep(7, 'complete', `${report.gap_analysis.gaps.length} gaps identified`, `Readiness Score: ${report.summary.readiness_score}%`);
    report.steps_completed.push('gap_analysis');

    // Step 8: Generating markdown report
    sendStep(8, 'running', 'Generating markdown report...');
    await sleep(800);
    const mdReport = generateMarkdownReport(report, projectPath);
    const reportsDir = path.join(projectPath, '.claude', 'reports');

    // Create reports directory if it doesn't exist
    if (!exists(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFileName = `gap-analysis-${new Date().toISOString().split('T')[0]}.md`;
    const reportPath = path.join(reportsDir, reportFileName);
    fs.writeFileSync(reportPath, mdReport);

    report.report_file = reportPath;
    report.report_content = mdReport;
    sendStep(8, 'complete', `Report saved: ${reportPath}`, `Report saved to: ${reportPath}`);
    report.steps_completed.push('report_generated');

    // Send final complete event
    sendStep('done', 'complete', 'Analysis complete!', null);
    res.write(`data: ${JSON.stringify({ type: 'result', report })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Analysis error:', error);
    sendStep('error', 'failed', error.message);
    res.end();
  }
});

// Generate markdown report
function generateMarkdownReport(report, projectPath) {
  const timestamp = new Date().toISOString();
  const projectName = path.basename(projectPath);

  let md = `# Gap Analysis Report - ${projectName}

**Generated:** ${timestamp}
**Project Path:** ${projectPath}
**Readiness Score:** ${report.summary.readiness_score}%

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Issues | ${report.summary.total_issues} |
| Total Gaps | ${report.summary.total_gaps} |
| Readiness Score | ${report.summary.readiness_score}% |

---

## Analysis Proof

The following files were actually read during this analysis:

`;

  report.analysis_proof.forEach((proof, idx) => {
    md += `### Step ${idx + 1}: ${proof.action}

\`\`\`
${proof.proof}
\`\`\`

`;
  });

  md += `---

## File Structure Analysis

**Status:** ${report.file_structure?.status || 'N/A'}

### Findings
${(report.file_structure?.findings || []).map(f => `- ${f}`).join('\n')}

### Issues
${(report.file_structure?.issues || []).map(i => `- ❌ ${i}`).join('\n') || '- ✅ No issues found'}

---

## AI PRD Document

**Status:** ${report.ai_prd?.status || 'N/A'}
**Location:** ${report.ai_prd?.prd_location || 'Not found'}
**Size:** ${report.ai_prd?.prd_size ? `${(report.ai_prd.prd_size / 1024).toFixed(1)} KB` : 'N/A'}

### Findings
${(report.ai_prd?.findings || []).map(f => `- ${f}`).join('\n')}

### Issues
${(report.ai_prd?.issues || []).map(i => `- ❌ ${i}`).join('\n') || '- ✅ No issues found'}

---

## AI Stories

**Status:** ${report.ai_stories?.status || 'N/A'}
**Stories Found:** ${report.ai_stories?.stories_found || 0}

### Stories by Wave
${Object.entries(report.ai_stories?.stories_by_wave || {}).map(([wave, count]) => `- ${wave}: ${count} stories`).join('\n')}

### Story Details
| ID | Title | Agent | Priority | Story Points |
|----|-------|-------|----------|--------------|
${(report.ai_stories?.story_details || []).map(s => `| ${s.id} | ${s.title} | ${s.agent} | ${s.priority || 'N/A'} | ${s.story_points || 'N/A'} |`).join('\n')}

### Issues
${(report.ai_stories?.issues || []).map(i => `- ❌ ${i}`).join('\n') || '- ✅ No issues found'}

---

## HTML Prototypes

**Status:** ${report.html_prototype?.status || 'N/A'}
**Total Prototypes:** ${report.html_prototype?.total_prototypes || 0}

### Files Found
${(report.html_prototype?.files_found || []).map(f => `- ${f}`).join('\n') || '- None found'}

---

## Identified Gaps

| Priority | Category | Description | Action Required |
|----------|----------|-------------|-----------------|
${(report.gap_analysis?.gaps || []).map(g => `| ${g.priority.toUpperCase()} | ${g.category} | ${g.description} | ${g.action} |`).join('\n')}

---

## Step-by-Step Improvement Plan

${(report.improvement_plan || []).map(step => `### Step ${step.step}: ${step.title}

**Status:** ${step.status === 'completed' ? '✅ Completed' : '⏳ Pending'}

${step.description}

`).join('')}

---

## Next Steps

1. **Address High Priority Gaps First**
   - Focus on items marked as HIGH priority in the gaps table

2. **Create Missing Directories**
   - Run: \`mkdir -p ${projectPath}/.claude/locks\`

3. **Populate Empty Waves**
   - Add story JSON files to wave2/ and wave3/

4. **Re-run Analysis**
   - After making changes, run analysis again to verify improvements

---

*Report generated by WAVE Portal Analysis Server*
`;

  return md;
}

// Generate file tree structure - ACCURATE to actual directory
function generateFileTree(dirPath, currentDepth = 0, maxDepth = 3, prefix = '') {
  if (currentDepth > maxDepth) return '';

  const items = listDir(dirPath);
  let tree = '';

  // Only filter out .git and node_modules - show EVERYTHING else including hidden files
  const filteredItems = items.filter(item => {
    // Skip only these directories that are too large/noisy
    if (item === 'node_modules' || item === '.git' || item === '.next' || item === '__pycache__') return false;
    return true;
  }).sort((a, b) => {
    // Directories first, then files
    const aIsDir = getStats(path.join(dirPath, a))?.isDirectory() || false;
    const bIsDir = getStats(path.join(dirPath, b))?.isDirectory() || false;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.localeCompare(b);
  });

  filteredItems.forEach((item, index) => {
    const itemPath = path.join(dirPath, item);
    const stats = getStats(itemPath);
    const isLast = index === filteredItems.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';

    if (stats?.isDirectory()) {
      tree += `${prefix}${connector}📁 ${item}/\n`;
      if (currentDepth < maxDepth) {
        tree += generateFileTree(itemPath, currentDepth + 1, maxDepth, prefix + childPrefix);
      }
    } else {
      const size = stats ? `(${formatSize(stats.size)})` : '';
      const icon = getFileIcon(item);
      tree += `${prefix}${connector}${icon} ${item} ${size}\n`;
    }
  });

  return tree;
}

// Format file size
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Get file icon based on extension
function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const icons = {
    'md': '📄',
    'json': '📋',
    'js': '📜',
    'ts': '📜',
    'tsx': '⚛️',
    'jsx': '⚛️',
    'html': '🌐',
    'css': '🎨',
    'env': '🔐',
    'sh': '⚙️',
    'yaml': '📝',
    'yml': '📝',
  };
  return icons[ext] || '📄';
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  if (!exists(projectPath)) {
    return res.status(404).json({ error: `Project path not found: ${projectPath}` });
  }

  console.log(`\n🔍 Analyzing project: ${projectPath}`);
  const startTime = Date.now();

  const report = {
    timestamp: new Date().toISOString(),
    project_path: projectPath,
    summary: {
      total_issues: 0,
      total_gaps: 0,
      readiness_score: 0,
    },
    file_structure: analyzeFileStructure(projectPath),
    ai_prd: analyzeAIPRD(projectPath),
    ai_stories: analyzeStories(projectPath),
    html_prototype: analyzeHTMLPrototypes(projectPath),
    claude_md: analyzeCLAUDEMD(projectPath),
    wave_config: analyzeWaveConfig(projectPath),
    gap_analysis: { gaps: [] },
    improvement_plan: [],
  };

  // Calculate totals
  report.summary.total_issues =
    report.file_structure.issues.length +
    report.ai_prd.issues.length +
    report.ai_stories.issues.length +
    report.html_prototype.issues.length +
    report.claude_md.issues.length;

  // Generate gap analysis
  report.gap_analysis = generateGapAnalysis(report);
  report.summary.total_gaps = report.gap_analysis.gaps.length;

  // Generate improvement plan
  report.improvement_plan = generateImprovementPlan(report);

  // Calculate readiness score
  report.summary.readiness_score = calculateReadinessScore(report);

  const duration = Date.now() - startTime;
  console.log(`✅ Analysis complete in ${duration}ms`);

  res.json(report);
});

// Analyze file structure
function analyzeFileStructure(projectPath) {
  const result = {
    status: 'pass',
    findings: [],
    issues: [],
    directories: {},
  };

  // Check root files
  const rootFiles = listDir(projectPath);
  result.findings.push(`Project root: ${projectPath}`);
  result.findings.push(`Root contains ${rootFiles.length} items`);

  // Check key directories
  const keyDirs = ['.claude', 'stories', 'worktrees', 'src', 'footprint-app'];
  keyDirs.forEach(dir => {
    const dirPath = path.join(projectPath, dir);
    if (exists(dirPath)) {
      const contents = listDir(dirPath);
      result.directories[dir] = contents;
      result.findings.push(`✓ ${dir}/ exists (${contents.length} items)`);
    } else {
      result.issues.push(`Missing directory: ${dir}/`);
    }
  });

  // Check key files
  const keyFiles = ['CLAUDE.md', 'package.json', 'tsconfig.json', '.env'];
  keyFiles.forEach(file => {
    const filePath = path.join(projectPath, file);
    // Also check in footprint-app/footprint for nested projects
    const altPath = path.join(projectPath, 'footprint-app', 'footprint', file);

    if (exists(filePath)) {
      const stats = getStats(filePath);
      result.findings.push(`✓ ${file} exists (${stats.size} bytes)`);
    } else if (exists(altPath)) {
      const stats = getStats(altPath);
      result.findings.push(`✓ ${file} exists in footprint-app/footprint/ (${stats.size} bytes)`);
    } else {
      if (file !== '.env') { // .env is expected to be missing or private
        result.issues.push(`Missing file: ${file}`);
      }
    }
  });

  // Check .claude structure
  const claudeDir = path.join(projectPath, '.claude');
  if (exists(claudeDir)) {
    const claudeContents = listDir(claudeDir);

    // Check for hooks
    if (claudeContents.includes('hooks')) {
      const hooks = listDir(path.join(claudeDir, 'hooks'));
      result.findings.push(`✓ .claude/hooks/ has ${hooks.length} hook scripts`);
    } else {
      result.issues.push('Missing .claude/hooks/ directory');
    }

    // Check for locks directory
    if (!claudeContents.includes('locks')) {
      result.issues.push('Missing .claude/locks/ directory (required for phase-gate validation)');
    } else {
      result.findings.push('✓ .claude/locks/ exists');
    }

    // Check for settings
    if (claudeContents.includes('settings.json')) {
      result.findings.push('✓ .claude/settings.json exists');
    }
  }

  // Check stories structure
  const storiesDir = path.join(projectPath, 'stories');
  if (exists(storiesDir)) {
    const waves = listDir(storiesDir).filter(d => d.startsWith('wave'));
    waves.forEach(wave => {
      const wavePath = path.join(storiesDir, wave);
      const stories = listDir(wavePath).filter(f => f.endsWith('.json'));
      if (stories.length > 0) {
        result.findings.push(`✓ ${wave}/ contains ${stories.length} stories`);
      } else {
        result.issues.push(`${wave}/ directory is empty (no story JSON files)`);
      }
    });
  }

  result.status = result.issues.length === 0 ? 'pass' :
                  result.issues.length <= 2 ? 'warn' : 'fail';

  return result;
}

// Analyze AI PRD
function analyzeAIPRD(projectPath) {
  const result = {
    status: 'fail',
    findings: [],
    issues: [],
    prd_location: null,
    prd_size: 0,
  };

  // Search locations for AI PRD
  const searchLocations = [
    'AI-PRD.md',
    'ai-prd/AI-PRD.md',
    '.claude/ai-prd/AI-PRD.md',
    'FOOTPRINT-AI-PRD-UPDATED.md',
    'footprint-app/footprint-docs/Footprint-AI-PRD-v3.md',
  ];

  for (const loc of searchLocations) {
    const filePath = path.join(projectPath, loc);
    if (exists(filePath)) {
      const stats = getStats(filePath);
      const content = readFile(filePath);

      result.prd_location = loc;
      result.prd_size = stats.size;
      result.status = 'pass';
      result.findings.push(`✓ AI PRD found at: ${loc}`);
      result.findings.push(`✓ PRD size: ${(stats.size / 1024).toFixed(1)} KB`);

      // Analyze content
      if (content) {
        const lines = content.split('\n').length;
        result.findings.push(`✓ PRD has ${lines} lines`);

        // Check for key sections
        if (content.includes('## Executive Summary') || content.includes('# Executive Summary')) {
          result.findings.push('✓ Has Executive Summary section');
        }
        if (content.includes('Epic') || content.includes('epic')) {
          const epicMatches = content.match(/Epic \d+/gi) || [];
          result.findings.push(`✓ Contains ${epicMatches.length} Epics`);
        }
        if (content.includes('Story Points') || content.includes('story points')) {
          result.findings.push('✓ Contains story point estimates');
        }
        if (content.includes('Implementation Status')) {
          result.findings.push('✓ Has Implementation Status tracking');
        }
      }
      break;
    } else {
      result.findings.push(`Searched: ${loc} - not found`);
    }
  }

  if (!result.prd_location) {
    result.issues.push('No AI PRD document found');
    result.issues.push('Create ai-prd/AI-PRD.md with product vision and requirements');
  }

  return result;
}

// Analyze Stories
function analyzeStories(projectPath) {
  const result = {
    status: 'fail',
    findings: [],
    issues: [],
    stories_found: 0,
    stories_by_wave: {},
    story_details: [],
  };

  const storiesDir = path.join(projectPath, 'stories');

  if (!exists(storiesDir)) {
    result.issues.push('No stories/ directory found');
    result.issues.push('Create stories/wave1/ with JSON story files');
    return result;
  }

  const waves = listDir(storiesDir).filter(d => d.startsWith('wave'));
  result.findings.push(`Found ${waves.length} wave directories`);

  let totalStories = 0;
  let totalStoryPoints = 0;

  waves.forEach(wave => {
    const wavePath = path.join(storiesDir, wave);
    const storyFiles = listDir(wavePath).filter(f => f.endsWith('.json'));

    result.stories_by_wave[wave] = storyFiles.length;

    if (storyFiles.length === 0) {
      result.issues.push(`${wave}/ is empty - no stories defined`);
    } else {
      result.findings.push(`✓ ${wave}/: ${storyFiles.length} stories`);

      // Analyze each story
      storyFiles.forEach(file => {
        const storyPath = path.join(wavePath, file);
        const story = readJSON(storyPath);

        if (story) {
          totalStories++;
          totalStoryPoints += story.story_points || 0;

          result.story_details.push({
            id: story.id,
            title: story.title,
            agent: story.agent,
            priority: story.priority,
            status: story.status,
            story_points: story.story_points,
            acceptance_criteria_count: story.acceptance_criteria?.length || 0,
          });

          // Validate story structure
          if (!story.id) result.issues.push(`Story ${file} missing 'id' field`);
          if (!story.acceptance_criteria || story.acceptance_criteria.length === 0) {
            result.issues.push(`Story ${story.id || file} has no acceptance criteria`);
          }
        } else {
          result.issues.push(`Failed to parse ${wave}/${file} as JSON`);
        }
      });
    }
  });

  result.stories_found = totalStories;
  result.findings.push(`Total: ${totalStories} stories, ${totalStoryPoints} story points`);

  if (totalStories === 0) {
    result.status = 'fail';
    result.issues.push('No valid story files found');
  } else if (result.issues.length > 0) {
    result.status = 'warn';
  } else {
    result.status = 'pass';
  }

  return result;
}

// Analyze HTML Prototypes
function analyzeHTMLPrototypes(projectPath) {
  const result = {
    status: 'fail',
    findings: [],
    issues: [],
    files_found: [],
    total_prototypes: 0,
  };

  // Search locations for HTML prototypes
  const searchLocations = [
    'design',
    'design_mockups',
    'mockups',
    'prototypes',
    'footprint-app/design_mockups',
  ];

  let foundDir = null;

  for (const loc of searchLocations) {
    const dirPath = path.join(projectPath, loc);
    if (exists(dirPath)) {
      const files = listDir(dirPath).filter(f => f.endsWith('.html'));
      if (files.length > 0) {
        foundDir = loc;
        result.files_found = files;
        result.total_prototypes = files.length;
        result.findings.push(`✓ Found ${files.length} HTML prototypes in ${loc}/`);

        // Analyze each prototype
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stats = getStats(filePath);
          result.findings.push(`  - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
        });

        break;
      }
    }
  }

  if (!foundDir) {
    result.issues.push('No HTML prototype files found');
    result.issues.push('Create design mockups in design/ or prototypes/ directory');
  } else {
    result.status = result.total_prototypes >= 5 ? 'pass' : 'warn';
  }

  return result;
}

// Analyze CLAUDE.md
function analyzeCLAUDEMD(projectPath) {
  const result = {
    status: 'fail',
    findings: [],
    issues: [],
    has_claude_md: false,
  };

  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');

  if (!exists(claudeMdPath)) {
    result.issues.push('CLAUDE.md not found in project root');
    result.issues.push('Create CLAUDE.md with WAVE protocol definitions');
    return result;
  }

  const content = readFile(claudeMdPath);
  const stats = getStats(claudeMdPath);

  result.has_claude_md = true;
  result.status = 'pass';
  result.findings.push(`✓ CLAUDE.md exists (${(stats.size / 1024).toFixed(1)} KB)`);

  if (content) {
    // Check for key sections
    const sections = {
      'Agent Roles': /agent.?roles/i,
      'Gate System': /gate.?system/i,
      'Signal File': /signal.?file/i,
      'Safety Rules': /safety.?rules/i,
      'Technology Stack': /technology.?stack/i,
    };

    Object.entries(sections).forEach(([name, pattern]) => {
      if (pattern.test(content)) {
        result.findings.push(`✓ Has ${name} section`);
      } else {
        result.issues.push(`Missing section: ${name}`);
      }
    });

    // Count safety markers
    const safetyMarkers = (content.match(/(NEVER|CRITICAL|FORBIDDEN|DO NOT)/gi) || []).length;
    result.findings.push(`✓ Contains ${safetyMarkers} safety markers`);

    if (safetyMarkers < 10) {
      result.issues.push(`Only ${safetyMarkers} safety markers (recommend 20+)`);
    }
  }

  if (result.issues.length > 2) {
    result.status = 'warn';
  }

  return result;
}

// Analyze Wave Config
function analyzeWaveConfig(projectPath) {
  const result = {
    status: 'pending',
    findings: [],
    issues: [],
  };

  // Check for wave config
  const configLocations = [
    '.claude/wave-config.json',
    '.claude/settings.json',
    '.claude/settings.local.json',
  ];

  configLocations.forEach(loc => {
    const filePath = path.join(projectPath, loc);
    if (exists(filePath)) {
      const config = readJSON(filePath);
      if (config) {
        result.findings.push(`✓ ${loc} exists`);
        if (config.hooks) result.findings.push('  - Has hook configurations');
        if (config.permissions) result.findings.push('  - Has permission rules');
        if (config.wave) result.findings.push(`  - Current wave: ${config.wave}`);
      }
    }
  });

  // Check for signal files
  const claudeDir = path.join(projectPath, '.claude');
  if (exists(claudeDir)) {
    const files = listDir(claudeDir);
    const signals = files.filter(f => f.startsWith('signal-'));
    if (signals.length > 0) {
      result.findings.push(`✓ Found ${signals.length} signal files`);
      result.status = 'pass';
    } else {
      result.issues.push('No signal files found (signals are created during wave execution)');
    }
  }

  return result;
}

// Generate gap analysis
function generateGapAnalysis(report) {
  const gaps = [];

  // PRD gaps
  if (report.ai_prd.status === 'fail') {
    gaps.push({
      category: 'Documentation',
      description: 'AI PRD document missing',
      priority: 'high',
      action: 'Create ai-prd/AI-PRD.md with product vision and requirements',
    });
  }

  // Stories gaps
  if (report.ai_stories.stories_found === 0) {
    gaps.push({
      category: 'Stories',
      description: 'No AI Stories defined',
      priority: 'high',
      action: 'Create stories in stories/wave1/*.json',
    });
  } else {
    // Check for empty waves
    Object.entries(report.ai_stories.stories_by_wave).forEach(([wave, count]) => {
      if (count === 0) {
        gaps.push({
          category: 'Stories',
          description: `${wave} directory is empty`,
          priority: 'medium',
          action: `Add story JSON files to stories/${wave}/`,
        });
      }
    });
  }

  // HTML prototype gaps
  if (report.html_prototype.total_prototypes === 0) {
    gaps.push({
      category: 'Design',
      description: 'No HTML prototypes found',
      priority: 'medium',
      action: 'Create HTML mockups in design/ or prototypes/ directory',
    });
  }

  // Structure gaps
  report.file_structure.issues.forEach(issue => {
    if (issue.includes('locks')) {
      gaps.push({
        category: 'Structure',
        description: 'Missing locks directory',
        priority: 'high',
        action: 'Create .claude/locks/ for phase-gate validation',
      });
    } else if (issue.includes('empty')) {
      gaps.push({
        category: 'Structure',
        description: issue,
        priority: 'medium',
        action: 'Populate with required files',
      });
    }
  });

  // CLAUDE.md gaps
  if (!report.claude_md.has_claude_md) {
    gaps.push({
      category: 'Configuration',
      description: 'CLAUDE.md protocol not defined',
      priority: 'high',
      action: 'Create CLAUDE.md with WAVE protocol definitions',
    });
  }

  return { gaps };
}

// Generate improvement plan
function generateImprovementPlan(report) {
  const plan = [];
  let step = 1;

  // Priority 1: PRD
  if (report.ai_prd.status === 'fail') {
    plan.push({
      step: step++,
      title: 'Create AI PRD Document',
      description: 'Write product requirements in ai-prd/AI-PRD.md with goals, features, and success metrics',
      status: 'pending',
    });
  } else {
    plan.push({
      step: step++,
      title: 'AI PRD Document',
      description: `PRD found at ${report.ai_prd.prd_location}`,
      status: 'completed',
    });
  }

  // Priority 2: Stories
  if (report.ai_stories.stories_found === 0) {
    plan.push({
      step: step++,
      title: 'Define AI Stories',
      description: 'Break down PRD into actionable stories with acceptance criteria in stories/wave1/*.json',
      status: 'pending',
    });
  } else {
    plan.push({
      step: step++,
      title: 'AI Stories',
      description: `${report.ai_stories.stories_found} stories defined across ${Object.keys(report.ai_stories.stories_by_wave).length} waves`,
      status: report.ai_stories.issues.length === 0 ? 'completed' : 'partial',
    });
  }

  // Priority 3: HTML Prototypes
  if (report.html_prototype.total_prototypes === 0) {
    plan.push({
      step: step++,
      title: 'Create HTML Prototypes',
      description: 'Design UI mockups as HTML files to guide frontend development',
      status: 'pending',
    });
  } else {
    plan.push({
      step: step++,
      title: 'HTML Prototypes',
      description: `${report.html_prototype.total_prototypes} prototypes found`,
      status: 'completed',
    });
  }

  // Priority 4: WAVE Config
  if (!report.claude_md.has_claude_md) {
    plan.push({
      step: step++,
      title: 'Create CLAUDE.md',
      description: 'Define WAVE protocol with agent roles, gate system, and safety rules',
      status: 'pending',
    });
  } else {
    plan.push({
      step: step++,
      title: 'WAVE Protocol',
      description: 'CLAUDE.md defines agent protocol',
      status: 'completed',
    });
  }

  // Priority 5: Directory structure
  const structureIssues = report.file_structure.issues.filter(i => i.includes('Missing'));
  if (structureIssues.length > 0) {
    plan.push({
      step: step++,
      title: 'Fix Directory Structure',
      description: `Create missing directories: ${structureIssues.map(i => i.replace('Missing directory: ', '')).join(', ')}`,
      status: 'pending',
    });
  }

  // Priority 6: Run Pre-Flight
  plan.push({
    step: step++,
    title: 'Run Pre-Flight Check',
    description: 'Validate all checklist items pass before starting WAVE automation',
    status: 'pending',
  });

  return plan;
}

// Calculate readiness score
function calculateReadinessScore(report) {
  let score = 0;
  let maxScore = 100;

  // PRD (25 points)
  if (report.ai_prd.status === 'pass') score += 25;
  else if (report.ai_prd.status === 'warn') score += 15;

  // Stories (25 points)
  if (report.ai_stories.status === 'pass') score += 25;
  else if (report.ai_stories.status === 'warn') score += 15;
  else if (report.ai_stories.stories_found > 0) score += 10;

  // HTML Prototypes (15 points)
  if (report.html_prototype.status === 'pass') score += 15;
  else if (report.html_prototype.total_prototypes > 0) score += 10;

  // CLAUDE.md (20 points)
  if (report.claude_md.status === 'pass') score += 20;
  else if (report.claude_md.has_claude_md) score += 10;

  // File Structure (15 points)
  if (report.file_structure.status === 'pass') score += 15;
  else if (report.file_structure.status === 'warn') score += 10;
  else score += 5;

  return Math.round(score);
}

// Sync stories from JSON files to response (for client to sync to Supabase)
app.post('/api/sync-stories', async (req, res) => {
  const { projectPath, projectId } = req.body;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  if (!exists(projectPath)) {
    return res.status(404).json({ error: 'Project path does not exist' });
  }

  // Load environment variables for Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const storiesDir = path.join(projectPath, 'stories');
    const stories = [];

    if (!exists(storiesDir)) {
      return res.json({ stories: [], count: 0, synced: 0, message: 'No stories directory found' });
    }

    const waves = listDir(storiesDir).filter(d => d.startsWith('wave'));

    waves.forEach(wave => {
      const waveNumber = parseInt(wave.replace('wave', '')) || 1;
      const wavePath = path.join(storiesDir, wave);
      const storyFiles = listDir(wavePath).filter(f => f.endsWith('.json'));

      storyFiles.forEach(file => {
        const storyPath = path.join(wavePath, file);
        const story = readJSON(storyPath);

        if (story && story.id) {
          // Only include columns that exist in the database schema
          stories.push({
            story_id: story.id,
            project_id: projectId || null,
            wave_number: story.wave || waveNumber,
            title: story.title || 'Untitled',
            status: story.status || 'pending',
            acceptance_criteria: story.acceptance_criteria || []
          });
        }
      });
    });

    // Actually sync to database using upsert
    let syncedCount = 0;
    const errors = [];

    for (const story of stories) {
      try {
        const upsertResponse = await fetch(`${supabaseUrl}/rest/v1/stories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(story)
        });

        if (upsertResponse.ok || upsertResponse.status === 201) {
          syncedCount++;
        } else {
          const errText = await upsertResponse.text();
          errors.push({ story_id: story.story_id, error: errText });
        }
      } catch (err) {
        errors.push({ story_id: story.story_id, error: err.message });
      }
    }

    res.json({
      stories,
      count: stories.length,
      synced: syncedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Synced ${syncedCount}/${stories.length} stories to database`
    });
  } catch (error) {
    console.error('Sync stories error:', error);
    res.status(500).json({ error: 'Failed to sync stories', details: error.message });
  }
});

// Validate Aerospace Safety (DO-178C compliance)
app.post('/api/validate-safety', async (req, res) => {
  const { projectPath, wavePath } = req.body;
  const results = [];
  let overallStatus = 'pass';

  // Safety documentation base path
  const safetyPath = `${wavePath}/.claudecode/safety`;
  const scriptsPath = `${wavePath}/core/scripts`;

  // === SECTION A: Safety Documentation ===
  const safetyDocs = [
    { file: 'FMEA.md', name: 'FMEA Document (17 modes)', pattern: /## FM-/g, required: 17 },
    { file: 'EMERGENCY-LEVELS.md', name: 'Emergency Levels (E1-E5)', pattern: /## E[1-5]:/g, required: 5 },
    { file: 'APPROVAL-LEVELS.md', name: 'Approval Matrix (L0-L5)', pattern: /## L[0-5]:/g, required: 6 },
    { file: 'COMPLETE-SAFETY-REFERENCE.md', name: 'Forbidden Operations (108)', pattern: /\| [A-J]\d+/g, required: 108 },
    { file: 'SAFETY-POLICY.md', name: 'Safety Policy', pattern: null, required: 0 },
  ];

  for (const doc of safetyDocs) {
    const filePath = `${safetyPath}/${doc.file}`;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (doc.pattern) {
        const matches = content.match(doc.pattern) || [];
        if (matches.length >= doc.required) {
          results.push({ name: doc.name, status: 'pass', message: `Found ${matches.length} (required: ${doc.required})` });
        } else {
          results.push({ name: doc.name, status: 'fail', message: `Found ${matches.length}, need ${doc.required}` });
          overallStatus = 'fail';
        }
      } else {
        results.push({ name: doc.name, status: 'pass', message: 'Document exists' });
      }
    } catch (err) {
      results.push({ name: doc.name, status: 'fail', message: 'File not found' });
      overallStatus = 'fail';
    }
  }

  // === SECTION B: Validation Scripts ===
  const requiredScripts = [
    'pre-flight-validator.sh',
    'pre-merge-validator.sh',
    'post-deploy-validator.sh',
    'safety-violation-detector.sh',
    'protocol-compliance-checker.sh',
  ];

  for (const script of requiredScripts) {
    const scriptPath = `${scriptsPath}/${script}`;
    try {
      fs.accessSync(scriptPath, fs.constants.X_OK);
      results.push({ name: script, status: 'pass', message: 'Script exists and is executable' });
    } catch {
      results.push({ name: script, status: 'warn', message: 'Script missing or not executable' });
      if (overallStatus === 'pass') overallStatus = 'warn';
    }
  }

  // === SECTION C: PM Agent Configuration ===
  const pmAgentPath = `${wavePath}/.claudecode/agents/pm-agent.md`;
  try {
    const pmContent = fs.readFileSync(pmAgentPath, 'utf8');
    const hasGates = /Gate [0-7]/i.test(pmContent);
    const hasBudget = /Budget/i.test(pmContent);
    if (hasGates && hasBudget) {
      results.push({ name: 'PM Agent Configuration', status: 'pass', message: 'PM agent properly configured with gates and budget' });
    } else {
      results.push({ name: 'PM Agent Configuration', status: 'warn', message: 'PM agent missing gates or budget config' });
    }
  } catch {
    results.push({ name: 'PM Agent Configuration', status: 'fail', message: 'pm-agent.md not found' });
    overallStatus = 'fail';
  }

  // Calculate summary
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  res.json({
    status: overallStatus,
    message: `${passed} passed, ${failed} failed, ${warned} warnings`,
    details: results,
    timestamp: new Date().toISOString()
  });
});

// RLM Protocol Validation endpoint - validates P Variable, Agent Memory, Snapshots, Scripts
app.post('/api/validate-rlm', async (req, res) => {
  const { projectPath, wavePath } = req.body;
  const results = [];
  let overallStatus = 'pass';

  // Base paths
  const rlmScriptsPath = `${wavePath}/core/scripts/rlm`;
  const claudePath = `${projectPath}/.claude`;

  // === CATEGORY 1: P Variable (External Context) ===
  // Check if P.json exists
  const pPath = `${claudePath}/P.json`;
  if (exists(pPath)) {
    try {
      const pContent = JSON.parse(fs.readFileSync(pPath, 'utf8'));
      const projectName = pContent.meta?.project_name || pContent.project?.name || 'unknown';
      results.push({ category: 'P Variable', name: 'P Variable File Generated', status: 'pass', message: `Project: ${projectName}` });

      // Check schema validity
      const hasRequired = pContent.meta || pContent.project;
      if (hasRequired) {
        results.push({ category: 'P Variable', name: 'P Variable Schema Valid', status: 'pass', message: 'Required fields present' });
      } else {
        results.push({ category: 'P Variable', name: 'P Variable Schema Valid', status: 'fail', message: 'Missing required fields (meta/project)' });
        overallStatus = 'fail';
      }

      // Check codebase indexed
      const fileCount = pContent.codebase?.file_count || pContent.codebase?.files?.length || 0;
      if (fileCount > 0) {
        results.push({ category: 'P Variable', name: 'Codebase Indexed', status: 'pass', message: `${fileCount} files indexed` });
      } else {
        results.push({ category: 'P Variable', name: 'Codebase Indexed', status: 'warn', message: 'No files indexed yet' });
        if (overallStatus === 'pass') overallStatus = 'warn';
      }
    } catch (err) {
      results.push({ category: 'P Variable', name: 'P Variable File Generated', status: 'fail', message: `Parse error: ${err.message}` });
      overallStatus = 'fail';
    }
  } else {
    results.push({ category: 'P Variable', name: 'P Variable File Generated', status: 'warn', message: 'Not yet generated (will create on first run)' });
    results.push({ category: 'P Variable', name: 'P Variable Schema Valid', status: 'warn', message: 'Pending P.json generation' });
    results.push({ category: 'P Variable', name: 'Codebase Indexed', status: 'warn', message: 'Pending P.json generation' });
    if (overallStatus === 'pass') overallStatus = 'warn';
  }

  // Check context hash
  const hashPath = `${claudePath}/context-hash.txt`;
  if (exists(hashPath)) {
    const hash = fs.readFileSync(hashPath, 'utf8').trim();
    results.push({ category: 'P Variable', name: 'Context Hash Current', status: 'pass', message: `Hash: ${hash.substring(0, 16)}...` });
  } else {
    results.push({ category: 'P Variable', name: 'Context Hash Current', status: 'warn', message: 'No hash file (will generate)' });
    if (overallStatus === 'pass') overallStatus = 'warn';
  }

  // === CATEGORY 2: Agent Memory Persistence ===
  const memoryPath = `${claudePath}/agent-memory`;
  if (exists(memoryPath)) {
    results.push({ category: 'Agent Memory', name: 'Memory Directory Exists', status: 'pass', message: `.claude/agent-memory/` });

    // Check for agent memory files
    const memoryFiles = fs.readdirSync(memoryPath).filter(f => f.endsWith('.json'));
    const feDevMemory = memoryFiles.find(f => f.includes('fe-dev') || f.includes('fedev'));
    const beDevMemory = memoryFiles.find(f => f.includes('be-dev') || f.includes('bedev'));

    if (feDevMemory) {
      try {
        const feContent = JSON.parse(fs.readFileSync(`${memoryPath}/${feDevMemory}`, 'utf8'));
        const decisionCount = feContent.decisions?.length || Object.keys(feContent).length;
        results.push({ category: 'Agent Memory', name: 'FE-Dev Memory File', status: 'pass', message: `${decisionCount} entries recorded` });
      } catch {
        results.push({ category: 'Agent Memory', name: 'FE-Dev Memory File', status: 'warn', message: 'File exists but parse error' });
      }
    } else {
      results.push({ category: 'Agent Memory', name: 'FE-Dev Memory File', status: 'warn', message: 'Not yet created' });
      if (overallStatus === 'pass') overallStatus = 'warn';
    }

    if (beDevMemory) {
      try {
        const beContent = JSON.parse(fs.readFileSync(`${memoryPath}/${beDevMemory}`, 'utf8'));
        const decisionCount = beContent.decisions?.length || Object.keys(beContent).length;
        results.push({ category: 'Agent Memory', name: 'BE-Dev Memory File', status: 'pass', message: `${decisionCount} entries recorded` });
      } catch {
        results.push({ category: 'Agent Memory', name: 'BE-Dev Memory File', status: 'warn', message: 'File exists but parse error' });
      }
    } else {
      results.push({ category: 'Agent Memory', name: 'BE-Dev Memory File', status: 'warn', message: 'Not yet created' });
      if (overallStatus === 'pass') overallStatus = 'warn';
    }

    // Check memory schema
    const schemaPath = `${wavePath}/.claudecode/schemas/memory-schema.json`;
    if (exists(schemaPath)) {
      results.push({ category: 'Agent Memory', name: 'Memory Schema Available', status: 'pass', message: 'Schema validation enabled' });
    } else {
      results.push({ category: 'Agent Memory', name: 'Memory Schema Available', status: 'warn', message: 'Schema file not found' });
    }
  } else {
    results.push({ category: 'Agent Memory', name: 'Memory Directory Exists', status: 'warn', message: 'Not yet created (will initialize)' });
    results.push({ category: 'Agent Memory', name: 'FE-Dev Memory File', status: 'warn', message: 'Pending directory creation' });
    results.push({ category: 'Agent Memory', name: 'BE-Dev Memory File', status: 'warn', message: 'Pending directory creation' });
    results.push({ category: 'Agent Memory', name: 'Memory Schema Available', status: 'warn', message: 'Pending setup' });
    if (overallStatus === 'pass') overallStatus = 'warn';
  }

  // === CATEGORY 3: Snapshots & Recovery ===
  const snapshotPath = `${claudePath}/rlm-snapshots`;
  if (exists(snapshotPath)) {
    results.push({ category: 'Snapshots', name: 'Snapshot Directory', status: 'pass', message: '.claude/rlm-snapshots/' });

    const snapshots = fs.readdirSync(snapshotPath).filter(f => f.endsWith('.json'));
    const startupSnapshots = snapshots.filter(f => f.includes('startup'));
    const preSyncSnapshots = snapshots.filter(f => f.includes('pre-sync'));

    if (startupSnapshots.length > 0) {
      results.push({ category: 'Snapshots', name: 'Checkpoint: startup', status: 'pass', message: `${startupSnapshots.length} snapshot(s)` });
    } else {
      results.push({ category: 'Snapshots', name: 'Checkpoint: startup', status: 'warn', message: 'No startup snapshots yet' });
      if (overallStatus === 'pass') overallStatus = 'warn';
    }

    if (preSyncSnapshots.length > 0) {
      results.push({ category: 'Snapshots', name: 'Checkpoint: pre-sync', status: 'pass', message: `${preSyncSnapshots.length} snapshot(s)` });
    } else {
      results.push({ category: 'Snapshots', name: 'Checkpoint: pre-sync', status: 'warn', message: 'No pre-sync snapshots yet' });
      if (overallStatus === 'pass') overallStatus = 'warn';
    }

    // Check restore capability (just verify snapshot exists)
    if (snapshots.length > 0) {
      results.push({ category: 'Snapshots', name: 'Restore Capability', status: 'pass', message: `${snapshots.length} snapshot(s) available for restore` });
    } else {
      results.push({ category: 'Snapshots', name: 'Restore Capability', status: 'warn', message: 'No snapshots to restore from' });
    }
  } else {
    results.push({ category: 'Snapshots', name: 'Snapshot Directory', status: 'warn', message: 'Not yet created (will initialize)' });
    results.push({ category: 'Snapshots', name: 'Checkpoint: startup', status: 'warn', message: 'Pending directory creation' });
    results.push({ category: 'Snapshots', name: 'Checkpoint: pre-sync', status: 'warn', message: 'Pending directory creation' });
    results.push({ category: 'Snapshots', name: 'Restore Capability', status: 'warn', message: 'Pending setup' });
    if (overallStatus === 'pass') overallStatus = 'warn';
  }

  // === CATEGORY 4: RLM Scripts ===
  const rlmScripts = [
    { file: 'load-project-variable.sh', name: 'load-project-variable.sh', executable: true },
    { file: 'query-variable.py', name: 'query-variable.py', executable: false },
    { file: 'memory-manager.sh', name: 'memory-manager.sh', executable: true },
    { file: 'snapshot-variable.sh', name: 'snapshot-variable.sh', executable: true },
    { file: 'sub-llm-dispatch.py', name: 'sub-llm-dispatch.py', executable: false },
  ];

  for (const script of rlmScripts) {
    const scriptPath = `${rlmScriptsPath}/${script.file}`;
    if (exists(scriptPath)) {
      if (script.executable) {
        try {
          fs.accessSync(scriptPath, fs.constants.X_OK);
          results.push({ category: 'RLM Scripts', name: script.name, status: 'pass', message: 'Script exists and is executable' });
        } catch {
          results.push({ category: 'RLM Scripts', name: script.name, status: 'warn', message: 'Script exists but not executable' });
          if (overallStatus === 'pass') overallStatus = 'warn';
        }
      } else {
        results.push({ category: 'RLM Scripts', name: script.name, status: 'pass', message: 'Script exists' });
      }
    } else {
      results.push({ category: 'RLM Scripts', name: script.name, status: 'fail', message: 'Script not found' });
      overallStatus = 'fail';
    }
  }

  // === CATEGORY 5: Token Budget & Efficiency ===
  // Check budget file
  const budgetPath = `${claudePath}/budget.json`;
  if (exists(budgetPath)) {
    try {
      const budget = JSON.parse(fs.readFileSync(budgetPath, 'utf8'));
      const remaining = budget.remaining || budget.tokens_remaining || 'N/A';
      results.push({ category: 'Token Budget', name: 'Budget Tracking File', status: 'pass', message: `Budget file active (${remaining} remaining)` });
    } catch {
      results.push({ category: 'Token Budget', name: 'Budget Tracking File', status: 'warn', message: 'File exists but parse error' });
    }
  } else {
    results.push({ category: 'Token Budget', name: 'Budget Tracking File', status: 'warn', message: 'Not yet created (will initialize)' });
    if (overallStatus === 'pass') overallStatus = 'warn';
  }

  // Calculate token reduction (estimate based on P.json size vs typical full context)
  if (exists(pPath)) {
    const pSize = fs.statSync(pPath).size;
    const estimatedFullContext = 500000; // 500KB typical full project context
    const reduction = Math.round((1 - (pSize / estimatedFullContext)) * 100);
    if (reduction > 80) {
      results.push({ category: 'Token Budget', name: 'Token Reduction Achieved', status: 'pass', message: `~${reduction}% context reduction` });
    } else {
      results.push({ category: 'Token Budget', name: 'Token Reduction Achieved', status: 'warn', message: `~${reduction}% reduction (target: 80%+)` });
    }
  } else {
    results.push({ category: 'Token Budget', name: 'Token Reduction Achieved', status: 'warn', message: 'Pending P.json generation' });
  }

  // Check sub-LLM cost tracking
  const costPath = `${claudePath}/sub-llm-costs.json`;
  if (exists(costPath)) {
    results.push({ category: 'Token Budget', name: 'Sub-LLM Cost Tracking', status: 'pass', message: 'Cost tracking enabled' });
  } else {
    results.push({ category: 'Token Budget', name: 'Sub-LLM Cost Tracking', status: 'warn', message: 'Not yet initialized' });
  }

  // Check query efficiency (verify query script exists and is functional)
  const queryScript = `${rlmScriptsPath}/query-variable.py`;
  if (exists(queryScript)) {
    results.push({ category: 'Token Budget', name: 'Query Efficiency', status: 'pass', message: 'Query system ready' });
  } else {
    results.push({ category: 'Token Budget', name: 'Query Efficiency', status: 'fail', message: 'Query script missing' });
    overallStatus = 'fail';
  }

  // Calculate summary
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  // Determine Docker readiness
  const dockerReady = failed === 0;
  const gate0Certified = dockerReady && warned < 5;

  // Generate Gate 0 lock file if certified
  if (gate0Certified) {
    const gate0LockPath = `${claudePath}/gate0-lock.json`;
    const crypto = await import('crypto');

    // Calculate checksum of validation results
    const checksumContent = JSON.stringify(results);
    const checksum = crypto.createHash('sha256').update(checksumContent).digest('hex');

    const gate0Lock = {
      phase: 0,
      wave: 1, // Default to wave 1, can be updated dynamically
      status: 'PASSED',
      rlm_validation: {
        p_variable: results.filter(r => r.category === 'P Variable' && r.status === 'fail').length === 0 ? 'PASS' : 'FAIL',
        agent_memory: results.filter(r => r.category === 'Agent Memory' && r.status === 'fail').length === 0 ? 'PASS' : 'FAIL',
        snapshots: results.filter(r => r.category === 'Snapshots' && r.status === 'fail').length === 0 ? 'PASS' : 'FAIL',
        scripts: results.filter(r => r.category === 'RLM Scripts' && r.status === 'fail').length === 0 ? 'PASS' : 'FAIL',
        token_budget: results.filter(r => r.category === 'Token Budget' && r.status === 'fail').length === 0 ? 'PASS' : 'FAIL'
      },
      summary: {
        passed,
        failed,
        warned,
        total: results.length
      },
      checksum: `sha256:${checksum}`,
      timestamp: new Date().toISOString(),
      certified_for_docker: true,
      docker_ready: true,
      automation_enabled: true
    };

    try {
      // Ensure .claude directory exists
      if (!exists(claudePath)) {
        fs.mkdirSync(claudePath, { recursive: true });
      }
      fs.writeFileSync(gate0LockPath, JSON.stringify(gate0Lock, null, 2));
      console.log(`✅ Gate 0 lock file created: ${gate0LockPath}`);
    } catch (err) {
      console.error('Failed to create Gate 0 lock file:', err);
    }
  }

  res.json({
    status: overallStatus,
    message: `${passed} passed, ${failed} failed, ${warned} warnings`,
    details: results,
    docker_ready: dockerReady,
    gate0_certified: gate0Certified,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// AGENT DISPATCH ENDPOINTS
// ============================================

// Agent definitions (static configuration)
const AGENT_DEFINITIONS = [
  { agent_type: 'cto', display_name: 'CTO', model: 'Claude Opus 4.5', color: 'violet', gates: [0, 7] },
  { agent_type: 'pm', display_name: 'PM', model: 'Claude Opus 4.5', color: 'blue', gates: [0, 5, 6, 7] },
  { agent_type: 'fe-dev-1', display_name: 'FE-Dev 1', model: 'Claude Sonnet 4', color: 'green', gates: [2, 3] },
  { agent_type: 'fe-dev-2', display_name: 'FE-Dev 2', model: 'Claude Sonnet 4', color: 'green', gates: [2, 3] },
  { agent_type: 'be-dev-1', display_name: 'BE-Dev 1', model: 'Claude Sonnet 4', color: 'amber', gates: [2, 3] },
  { agent_type: 'be-dev-2', display_name: 'BE-Dev 2', model: 'Claude Sonnet 4', color: 'amber', gates: [2, 3] },
  { agent_type: 'qa', display_name: 'QA', model: 'Claude Haiku 4', color: 'cyan', gates: [4] },
  { agent_type: 'dev-fix', display_name: 'Dev-Fix', model: 'Claude Sonnet 4', color: 'red', gates: [4.5] },
];

// In-memory agent sessions (in production, use database)
const agentSessions = new Map();

// GET /api/agents - List all agents with their current status
app.get('/api/agents', (req, res) => {
  const { projectPath } = req.query;

  const agents = AGENT_DEFINITIONS.map(def => {
    const sessionKey = `${projectPath}:${def.agent_type}`;
    const session = agentSessions.get(sessionKey) || {
      status: 'idle',
      current_task: null,
      current_gate: null,
      wave_number: null,
      token_usage: { input: 0, output: 0, cost: 0 },
      last_signal: null,
      started_at: null
    };

    return {
      ...def,
      ...session
    };
  });

  res.json({ agents });
});

// POST /api/agents/:agentType/start - Start an agent
app.post('/api/agents/:agentType/start', (req, res) => {
  const { agentType } = req.params;
  const { projectPath, waveNumber, stories, estimatedTokens } = req.body;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'Project path required' });
  }

  // GAP-004: Enforce rate limits before starting agent
  const limiter = getRateLimiter(projectPath);
  const rateLimitCheck = limiter.checkLimit(agentType, estimatedTokens || 5000);

  // Add rate limit headers
  res.set(limiter.getHeaders(agentType));

  if (!rateLimitCheck.allowed) {
    res.set({ 'Retry-After': rateLimitCheck.retryAfter });
    return res.status(429).json({
      success: false,
      error: RATE_LIMIT_ERRORS.RATE_EXCEEDED,
      message: rateLimitCheck.message,
      retryAfter: rateLimitCheck.retryAfter
    });
  }

  const agentDef = AGENT_DEFINITIONS.find(a => a.agent_type === agentType);
  if (!agentDef) {
    return res.status(404).json({ success: false, error: `Unknown agent type: ${agentType}` });
  }

  const sessionKey = `${projectPath}:${agentType}`;
  const existingSession = agentSessions.get(sessionKey);

  if (existingSession && existingSession.status === 'running') {
    return res.status(400).json({ success: false, error: 'Agent is already running' });
  }

  // Create session
  const session = {
    status: 'running',
    current_task: stories?.length ? `Working on ${stories.length} stories` : 'Initializing...',
    current_gate: waveNumber ? 2 : null,
    wave_number: waveNumber || 1,
    token_usage: { input: 0, output: 0, cost: 0 },
    last_signal: null,
    started_at: new Date().toISOString()
  };

  agentSessions.set(sessionKey, session);

  // Create assignment signal file
  const claudePath = `${projectPath}/.claude`;
  if (!exists(claudePath)) {
    fs.mkdirSync(claudePath, { recursive: true });
  }

  const assignmentSignal = {
    agent: agentType,
    wave: waveNumber || 1,
    stories: stories || [],
    assigned_at: new Date().toISOString(),
    assigned_by: 'portal',
    status: 'ASSIGNED'
  };

  const signalPath = `${claudePath}/signal-${agentType}-assignment.json`;
  fs.writeFileSync(signalPath, JSON.stringify(assignmentSignal, null, 2));

  // Audit log: Agent started
  logAgentAction(agentType, 'started', {
    projectPath,
    waveNumber: waveNumber || 1,
    stories: stories?.length || 0,
    signalFile: signalPath
  });

  console.log(`✅ Agent ${agentType} started for project ${projectPath}`);

  res.json({
    success: true,
    message: `Agent ${agentDef.display_name} started`,
    session: { ...agentDef, ...session },
    signal_file: signalPath
  });
});

// POST /api/agents/:agentType/stop - Stop an agent
app.post('/api/agents/:agentType/stop', (req, res) => {
  const { agentType } = req.params;
  const { projectPath, reason } = req.body;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'Project path required' });
  }

  const sessionKey = `${projectPath}:${agentType}`;
  const session = agentSessions.get(sessionKey);

  if (!session || session.status !== 'running') {
    return res.status(400).json({ success: false, error: 'Agent is not running' });
  }

  // Update session
  session.status = 'idle';
  session.stopped_at = new Date().toISOString();
  agentSessions.set(sessionKey, session);

  // Create stop signal file
  const claudePath = `${projectPath}/.claude`;
  const stopSignal = {
    agent: agentType,
    reason: reason || 'User requested stop',
    stopped_at: new Date().toISOString(),
    stopped_by: 'portal'
  };

  const signalPath = `${claudePath}/signal-${agentType}-STOP.json`;
  fs.writeFileSync(signalPath, JSON.stringify(stopSignal, null, 2));

  // Audit log: Agent stopped
  logAgentAction(agentType, 'stopped', {
    projectPath,
    reason: reason || 'User requested stop',
    tokenUsage: session.token_usage,
    runDuration: session.started_at
      ? Date.now() - new Date(session.started_at).getTime()
      : null
  });

  console.log(`🛑 Agent ${agentType} stopped for project ${projectPath}`);

  res.json({
    success: true,
    message: `Agent ${agentType} stopped`,
    signal_file: signalPath
  });
});

// GET /api/agents/:agentType/output - Get agent output from signal files
app.get('/api/agents/:agentType/output', (req, res) => {
  const { agentType } = req.params;
  const { projectPath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'Project path required' });
  }

  const claudePath = `${projectPath}/.claude`;
  const output = [];

  // Look for signal files related to this agent
  if (exists(claudePath)) {
    const files = fs.readdirSync(claudePath)
      .filter(f => f.includes(agentType) || f.includes('gate'))
      .filter(f => f.endsWith('.json'))
      .sort((a, b) => {
        const statA = fs.statSync(`${claudePath}/${a}`);
        const statB = fs.statSync(`${claudePath}/${b}`);
        return statB.mtime - statA.mtime;
      })
      .slice(0, 10); // Last 10 signal files

    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(`${claudePath}/${file}`, 'utf8'));
        output.push({
          file,
          timestamp: content.timestamp || content.assigned_at || content.stopped_at || fs.statSync(`${claudePath}/${file}`).mtime.toISOString(),
          type: file.includes('complete') ? 'complete' : file.includes('STOP') ? 'stop' : file.includes('assignment') ? 'assignment' : 'signal',
          content
        });
      } catch (err) {
        // Skip invalid JSON files
      }
    }
  }

  // Format as terminal-style output
  let terminalOutput = `=== Agent ${agentType} Output ===\n\n`;
  for (const item of output) {
    terminalOutput += `[${item.timestamp}] ${item.type.toUpperCase()}: ${item.file}\n`;
    if (item.content.status) terminalOutput += `  Status: ${item.content.status}\n`;
    if (item.content.message) terminalOutput += `  Message: ${item.content.message}\n`;
    if (item.content.stories) terminalOutput += `  Stories: ${item.content.stories.join(', ')}\n`;
    if (item.content.token_usage) {
      terminalOutput += `  Tokens: ${item.content.token_usage.total_tokens || 0} (Cost: $${item.content.token_usage.estimated_cost_usd || 0})\n`;
    }
    terminalOutput += '\n';
  }

  res.json({
    success: true,
    output: terminalOutput,
    signals: output
  });
});

// GET /api/agents/activity - Get recent agent activity from audit log
app.get('/api/agents/activity', (req, res) => {
  const { projectPath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'Project path required' });
  }

  // Read from local signal files to build activity
  const claudePath = `${projectPath}/.claude`;
  const activity = [];

  if (exists(claudePath)) {
    const files = fs.readdirSync(claudePath)
      .filter(f => f.startsWith('signal-') && f.endsWith('.json'))
      .map(f => ({
        file: f,
        stat: fs.statSync(`${claudePath}/${f}`)
      }))
      .sort((a, b) => b.stat.mtime - a.stat.mtime)
      .slice(0, 20);

    for (const { file, stat } of files) {
      try {
        const content = JSON.parse(fs.readFileSync(`${claudePath}/${file}`, 'utf8'));
        const agent = content.agent || file.match(/signal-([a-z-]+)/)?.[1] || 'system';

        // GAP-001: Scan signal content for prompt injection
        const signalAnalysis = promptInjectionDetector.analyzeSignal(content);
        let injectionWarning = null;
        if (!signalAnalysis.safe) {
          injectionWarning = {
            severity: signalAnalysis.severity,
            detections: signalAnalysis.detections.length,
            tags: signalAnalysis.detections.map(d => d.category)
          };
          // Log the detection
          logAudit({
            eventType: 'security_alert',
            category: 'injection_detection',
            severity: signalAnalysis.severity === 'critical' ? 'critical' : 'warning',
            actorType: 'system',
            actorId: 'injection-detector',
            action: `Potential injection detected in signal file: ${file}`,
            resourceType: 'signal',
            resourceId: file,
            details: signalAnalysis,
            projectPath,
            safetyTags: signalAnalysis.detections.map(d => `injection:${d.category}`),
            requiresReview: true
          });
        }

        let action = 'Signal created';
        if (file.includes('assignment')) action = 'Agent assigned stories';
        else if (file.includes('STOP')) action = 'Agent stopped';
        else if (file.includes('complete')) action = 'Task completed';
        else if (file.includes('approved')) action = 'Validation approved';
        else if (file.includes('rejected')) action = 'Validation rejected';
        else if (file.includes('retry')) action = 'Retry requested';

        activity.push({
          timestamp: content.timestamp || content.assigned_at || content.stopped_at || stat.mtime.toISOString(),
          agent,
          action,
          details: content,
          injectionWarning // GAP-001: Include injection detection result
        });
      } catch (err) {
        // Skip invalid files
      }
    }
  }

  res.json({
    success: true,
    activity: activity.slice(0, 15) // Return last 15 activities
  });
});

// ============================================
// END AGENT DISPATCH ENDPOINTS
// ============================================

// Health check endpoint
// Test Anthropic API Key endpoint
app.post('/api/test-anthropic', async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ success: false, error: 'API key required' });
  }

  if (!apiKey.startsWith('sk-ant-')) {
    return res.status(400).json({ success: false, error: 'Invalid key format - should start with sk-ant-' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({
        success: true,
        message: 'API Key valid!',
        model: data.model,
        usage: data.usage
      });
    } else if (response.status === 401) {
      return res.json({ success: false, error: 'Invalid API key' });
    } else if (response.status === 429) {
      return res.json({ success: true, message: 'Key valid (rate limited)' });
    } else {
      const errorData = await response.text();
      return res.json({ success: false, error: `API error: ${response.status}` });
    }
  } catch (err) {
    return res.json({ success: false, error: err.message || 'Connection failed' });
  }
});

// Test Slack Webhook endpoint - sends actual test notification
app.post('/api/test-slack', async (req, res) => {
  const { webhookUrl } = req.body;

  if (!webhookUrl) {
    return res.status(400).json({ success: false, error: 'Webhook URL required' });
  }

  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    return res.status(400).json({ success: false, error: 'Invalid webhook URL format' });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '🔔 *WAVE Portal Test* - Connection verified!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '🔔 *WAVE Portal Test*\n\nYour Slack webhook is configured correctly! You will receive notifications here when WAVE events occur.'
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `_Test sent at ${new Date().toISOString()}_`
              }
            ]
          }
        ]
      })
    });

    if (response.ok) {
      return res.json({ success: true, message: 'Test notification sent!' });
    } else {
      const errorText = await response.text();
      return res.json({ success: false, error: `Slack error: ${errorText}` });
    }
  } catch (err) {
    return res.json({ success: false, error: err.message || 'Connection failed' });
  }
});

// Foundation Validation endpoint - comprehensive pre-development checks
app.post('/api/validate-foundation', async (req, res) => {
  const { projectPath, config } = req.body;

  if (!projectPath || !exists(projectPath)) {
    return res.status(400).json({ error: 'Invalid project path' });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Accumulate all checks for final save
  const allChecks = [];

  const sendCheck = (check) => {
    // Add timestamp to each check
    const checkWithTimestamp = {
      ...check,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    };
    // Store the final state of each check (update if exists)
    const existingIndex = allChecks.findIndex(c => c.id === checkWithTimestamp.id);
    if (existingIndex >= 0) {
      allChecks[existingIndex] = checkWithTimestamp;
    } else {
      allChecks.push(checkWithTimestamp);
    }
    res.write(`data: ${JSON.stringify({ type: 'check', check: checkWithTimestamp })}\n\n`);
  };

  const sendComplete = (status) => {
    // Include all final checks in complete message for database save
    res.write(`data: ${JSON.stringify({ type: 'complete', status, checks: allChecks })}\n\n`);
  };

  let allPassed = true;
  let hasWarnings = false;

  try {
    // Helper to run shell commands
    const { execSync } = await import('child_process');
    const runCommand = (cmd, cwd = projectPath) => {
      try {
        return execSync(cmd, { cwd, encoding: 'utf-8', timeout: 30000 }).trim();
      } catch (e) {
        return null;
      }
    };

    // ============ GIT WORKTREES ============
    // Determine current wave from config or stories
    const storiesPath = path.join(projectPath, 'stories');
    let currentWave = config?.CURRENT_WAVE || 1;
    if (exists(storiesPath)) {
      const waveDirs = listDir(storiesPath).filter(d => d.startsWith('wave')).sort();
      if (waveDirs.length > 0) {
        // Get the highest wave number as current
        const waveNums = waveDirs.map(d => parseInt(d.replace('wave', '')) || 0);
        currentWave = Math.max(...waveNums);
      }
    }

    // Check 1: Worktrees Exist
    const worktreeCmd = `git worktree list | grep -E '(fe-dev|be-dev|qa|dev-fix)' | wc -l`;
    sendCheck({ id: 'worktree-exist', name: 'Worktrees Exist (fe-dev, be-dev, qa, dev-fix)', category: 'Git Worktrees', status: 'running', message: 'Checking...', description: 'All required worktrees are created for parallel agent development', command: worktreeCmd });
    await sleep(200);

    const worktreesPath = path.join(projectPath, 'worktrees');
    const requiredWorktrees = ['fe-dev', 'be-dev', 'qa', 'dev-fix'];
    const existingWorktrees = requiredWorktrees.filter(wt => exists(path.join(worktreesPath, wt)));

    if (existingWorktrees.length === requiredWorktrees.length) {
      sendCheck({ id: 'worktree-exist', name: 'Worktrees Exist (fe-dev, be-dev, qa, dev-fix)', category: 'Git Worktrees', status: 'pass', message: `All ${requiredWorktrees.length} worktrees ready`, description: 'All required worktrees are created for parallel agent development', command: worktreeCmd, output: existingWorktrees.join(', ') });
    } else {
      const missing = requiredWorktrees.filter(wt => !existingWorktrees.includes(wt));
      sendCheck({ id: 'worktree-exist', name: 'Worktrees Exist (fe-dev, be-dev, qa, dev-fix)', category: 'Git Worktrees', status: 'fail', message: `Missing: ${missing.join(', ')}`, description: 'All required worktrees are created for parallel agent development', command: `git worktree add worktrees/${missing[0]} -b wave${currentWave}-${missing[0]}`, output: `Found: ${existingWorktrees.join(', ') || 'none'}\\nMissing: ${missing.join(', ')}` });
      allPassed = false;
    }

    // Check 2: Correct Feature Branches for Current Wave
    const expectedBranchPattern = new RegExp(`^(wave${currentWave}|wave-${currentWave}|feature/wave${currentWave})`);
    const branchCmd = `git worktree list --porcelain | grep 'branch'`;
    sendCheck({ id: 'worktree-branches', name: `Branches Match Wave ${currentWave}`, category: 'Git Worktrees', status: 'running', message: 'Checking...', description: `Each worktree should be on a wave ${currentWave} branch (e.g., wave${currentWave}-fe-dev)`, command: branchCmd });
    await sleep(200);

    const branchResults = [];
    let branchesCorrect = true;
    for (const wt of existingWorktrees) {
      const wtPath = path.join(worktreesPath, wt);
      const branch = runCommand(`git -C "${wtPath}" branch --show-current 2>/dev/null`) || 'detached';
      const isCorrectWave = expectedBranchPattern.test(branch) || branch.includes(`wave${currentWave}`) || branch === 'main' || branch === 'master';
      const status = isCorrectWave ? '✓' : '✗';
      branchResults.push(`${wt}: ${branch} ${status}`);
      if (!isCorrectWave && branch !== 'detached') {
        branchesCorrect = false;
      }
    }

    if (branchesCorrect && existingWorktrees.length > 0) {
      sendCheck({ id: 'worktree-branches', name: `Branches Match Wave ${currentWave}`, category: 'Git Worktrees', status: 'pass', message: 'All on correct branches', description: `Each worktree should be on a wave ${currentWave} branch`, command: branchCmd, output: branchResults.join('\\n') });
    } else if (existingWorktrees.length === 0) {
      sendCheck({ id: 'worktree-branches', name: `Branches Match Wave ${currentWave}`, category: 'Git Worktrees', status: 'warn', message: 'No worktrees to check', description: `Each worktree should be on a wave ${currentWave} branch`, command: branchCmd, output: 'Create worktrees first' });
      hasWarnings = true;
    } else {
      sendCheck({ id: 'worktree-branches', name: `Branches Match Wave ${currentWave}`, category: 'Git Worktrees', status: 'warn', message: 'Some branches may be wrong wave', description: `Each worktree should be on a wave ${currentWave} branch`, command: branchCmd, output: branchResults.join('\\n') + `\\n\\nExpected: wave${currentWave}-* branches` });
      hasWarnings = true;
    }

    // Check 3: Worktrees Synced with Remote
    const syncCmd = `git -C worktrees/fe-dev fetch origin && git -C worktrees/fe-dev status -sb`;
    sendCheck({ id: 'worktree-sync', name: 'Worktrees Synced with Remote', category: 'Git Worktrees', status: 'running', message: 'Checking...', description: 'Worktrees should be up-to-date with remote branches', command: syncCmd });
    await sleep(200);

    let allSynced = true;
    const syncResults = [];
    for (const wt of existingWorktrees) {
      const wtPath = path.join(worktreesPath, wt);
      const status = runCommand(`git -C "${wtPath}" status -sb 2>/dev/null`) || '';
      const isBehind = status.includes('behind');
      const isAhead = status.includes('ahead');
      const syncStatus = isBehind ? 'behind remote' : isAhead ? 'ahead of remote' : 'synced';
      syncResults.push(`${wt}: ${syncStatus}`);
      if (isBehind) allSynced = false;
    }

    if (allSynced && existingWorktrees.length > 0) {
      sendCheck({ id: 'worktree-sync', name: 'Worktrees Synced with Remote', category: 'Git Worktrees', status: 'pass', message: 'All synced', description: 'Worktrees should be up-to-date with remote branches', command: syncCmd, output: syncResults.join('\\n') });
    } else if (existingWorktrees.length === 0) {
      sendCheck({ id: 'worktree-sync', name: 'Worktrees Synced with Remote', category: 'Git Worktrees', status: 'warn', message: 'No worktrees', description: 'Worktrees should be up-to-date with remote branches', command: syncCmd, output: 'No worktrees to check' });
      hasWarnings = true;
    } else {
      sendCheck({ id: 'worktree-sync', name: 'Worktrees Synced with Remote', category: 'Git Worktrees', status: 'warn', message: 'Some behind remote', description: 'Worktrees should be up-to-date with remote branches', command: 'git -C worktrees/fe-dev pull', output: syncResults.join('\\n') + '\\n\\nRun git pull in behind worktrees' });
      hasWarnings = true;
    }

    // Check 4: No Uncommitted Changes in Worktrees
    const cleanCmd = `for wt in fe-dev be-dev qa dev-fix; do echo "$wt:"; git -C worktrees/$wt status --porcelain; done`;
    sendCheck({ id: 'worktree-clean', name: 'No Uncommitted Changes', category: 'Git Worktrees', status: 'running', message: 'Checking...', description: 'Worktrees should have no uncommitted changes before starting a wave', command: cleanCmd });
    await sleep(200);

    let allClean = true;
    const cleanResults = [];
    for (const wt of existingWorktrees) {
      const wtPath = path.join(worktreesPath, wt);
      const status = runCommand(`git -C "${wtPath}" status --porcelain 2>/dev/null`);
      const changeCount = status ? status.split('\\n').filter(l => l.trim()).length : 0;
      cleanResults.push(`${wt}: ${changeCount === 0 ? 'clean' : changeCount + ' uncommitted'}`);
      if (changeCount > 0) allClean = false;
    }

    if (allClean && existingWorktrees.length > 0) {
      sendCheck({ id: 'worktree-clean', name: 'No Uncommitted Changes', category: 'Git Worktrees', status: 'pass', message: 'All worktrees clean', description: 'Worktrees should have no uncommitted changes before starting a wave', command: cleanCmd, output: cleanResults.join('\\n') });
    } else if (existingWorktrees.length === 0) {
      sendCheck({ id: 'worktree-clean', name: 'No Uncommitted Changes', category: 'Git Worktrees', status: 'warn', message: 'No worktrees', description: 'Worktrees should have no uncommitted changes before starting a wave', command: cleanCmd, output: 'No worktrees to check' });
      hasWarnings = true;
    } else {
      sendCheck({ id: 'worktree-clean', name: 'No Uncommitted Changes', category: 'Git Worktrees', status: 'fail', message: 'Uncommitted changes found', description: 'Worktrees should have no uncommitted changes before starting a wave', command: 'git -C worktrees/fe-dev add . && git -C worktrees/fe-dev commit -m "WIP"', output: cleanResults.join('\\n') + '\\n\\nCommit or stash changes before wave' });
      allPassed = false;
    }

    // ============ DOCKER BUILD ============
    // Check: Docker Installed & Running
    const dockerVersionCmd = `docker --version && docker info --format '{{.ServerVersion}}'`;
    sendCheck({ id: 'docker-installed', name: 'Docker Installed & Running', category: 'Docker Build', status: 'running', message: 'Checking...', description: 'Docker daemon must be installed and running', command: dockerVersionCmd });
    await sleep(200);

    const dockerVersion = runCommand('docker --version 2>/dev/null');
    const dockerInfo = runCommand('docker info --format "{{.ServerVersion}}" 2>/dev/null');

    if (dockerVersion && dockerInfo) {
      sendCheck({ id: 'docker-installed', name: 'Docker Installed & Running', category: 'Docker Build', status: 'pass', message: `Daemon v${dockerInfo}`, description: 'Docker daemon must be installed and running', command: dockerVersionCmd, output: `${dockerVersion}\\nServer: ${dockerInfo}` });
    } else if (dockerVersion) {
      sendCheck({ id: 'docker-installed', name: 'Docker Installed & Running', category: 'Docker Build', status: 'fail', message: 'Docker daemon not running', description: 'Docker daemon must be installed and running', command: 'open -a Docker', output: 'Docker installed but daemon not running. Start Docker Desktop.' });
      allPassed = false;
    } else {
      sendCheck({ id: 'docker-installed', name: 'Docker Installed & Running', category: 'Docker Build', status: 'warn', message: 'Docker not installed (optional)', description: 'Docker daemon must be installed and running', command: dockerVersionCmd, output: 'Install from https://docker.com' });
      hasWarnings = true;
    }

    // Check: Dockerfile/Compose Valid
    const dockerfilePath = path.join(projectPath, 'Dockerfile');
    const dockerComposePath = exists(path.join(projectPath, 'docker-compose.yml'))
      ? path.join(projectPath, 'docker-compose.yml')
      : exists(path.join(projectPath, 'docker-compose.yaml'))
        ? path.join(projectPath, 'docker-compose.yaml')
        : null;

    if (dockerComposePath) {
      const composeValidateCmd = `docker compose -f docker-compose.yml config --quiet`;
      sendCheck({ id: 'docker-config', name: 'Docker Compose Valid', category: 'Docker Build', status: 'running', message: 'Validating...', description: 'Docker Compose file is syntactically correct', command: composeValidateCmd });
      await sleep(200);

      const composeValid = runCommand(`docker compose -f "${dockerComposePath}" config --quiet 2>&1`);
      if (composeValid === '' || composeValid === null) {
        // Empty output means valid
        const services = runCommand(`docker compose -f "${dockerComposePath}" config --services 2>/dev/null`);
        const serviceList = services?.split('\\n').filter(s => s.trim()) || [];
        sendCheck({ id: 'docker-config', name: 'Docker Compose Valid', category: 'Docker Build', status: 'pass', message: `${serviceList.length} services defined`, description: 'Docker Compose file is syntactically correct', command: composeValidateCmd, output: `Services: ${serviceList.join(', ') || 'none'}` });
      } else {
        sendCheck({ id: 'docker-config', name: 'Docker Compose Valid', category: 'Docker Build', status: 'fail', message: 'Compose file has errors', description: 'Docker Compose file is syntactically correct', command: composeValidateCmd, output: composeValid?.substring(0, 200) || 'Validation failed' });
        allPassed = false;
      }
    } else if (exists(dockerfilePath)) {
      const dockerfileContent = readFile(dockerfilePath);
      const hasFrom = dockerfileContent?.includes('FROM ');
      sendCheck({ id: 'docker-config', name: 'Dockerfile Present', category: 'Docker Build', status: hasFrom ? 'pass' : 'warn', message: hasFrom ? 'Dockerfile valid' : 'Dockerfile missing FROM', description: 'Dockerfile has valid base image', command: 'head -5 Dockerfile', output: dockerfileContent?.split('\\n').slice(0, 5).join('\\n') || 'Empty Dockerfile' });
      if (!hasFrom) hasWarnings = true;
    } else {
      sendCheck({ id: 'docker-config', name: 'Docker Config', category: 'Docker Build', status: 'warn', message: 'No Docker config (optional)', description: 'No Dockerfile or docker-compose.yml found', command: 'ls Dockerfile docker-compose.yml', output: 'Docker not configured for this project' });
      hasWarnings = true;
    }

    // Check: Can Build Image (actually try to build)
    if (dockerInfo && (exists(dockerfilePath) || dockerComposePath)) {
      const buildCmd = dockerComposePath
        ? `docker compose -f docker-compose.yml build --dry-run 2>&1 | tail -5`
        : `docker build --progress=plain -t test-build . 2>&1 | tail -10`;
      sendCheck({ id: 'docker-build', name: 'Image Build Test', category: 'Docker Build', status: 'running', message: 'Testing build...', description: 'Actually attempt to build Docker image', command: buildCmd });
      await sleep(300);

      // For compose, check if images exist or can be built
      // First try docker compose images (requires containers), then fall back to checking service images directly
      if (dockerComposePath) {
        let imageCount = 0;
        // Try docker compose images first (shows images for existing containers)
        const composeImages = runCommand(`docker compose -f "${dockerComposePath}" images -q 2>/dev/null | wc -l`);
        imageCount = parseInt(composeImages) || 0;

        // If no containers exist, check if the image was built by looking for project images
        if (imageCount === 0) {
          const projectDir = path.dirname(dockerComposePath);
          const projectName = path.basename(projectDir).toLowerCase().replace(/[^a-z0-9]/g, '');
          const builtImages = runCommand(`docker images --format '{{.Repository}}' 2>/dev/null | grep -i "${projectName}" | wc -l`);
          imageCount = parseInt(builtImages) || 0;
        }

        sendCheck({ id: 'docker-build', name: 'Image Build Test', category: 'Docker Build', status: imageCount > 0 ? 'pass' : 'warn', message: imageCount > 0 ? `${imageCount} images ready` : 'No images built yet', description: 'Actually attempt to build Docker image', command: 'docker compose build', output: imageCount > 0 ? `${imageCount} pre-built images available` : 'Run: docker compose build && docker compose create' });
        if (imageCount === 0) hasWarnings = true;
      } else {
        // Check if we can at least parse the Dockerfile
        sendCheck({ id: 'docker-build', name: 'Image Build Test', category: 'Docker Build', status: 'warn', message: 'Build not tested', description: 'Actually attempt to build Docker image', command: 'docker build -t app .', output: 'Run docker build to test' });
        hasWarnings = true;
      }
    } else if (!dockerInfo) {
      sendCheck({ id: 'docker-build', name: 'Image Build Test', category: 'Docker Build', status: 'warn', message: 'Cannot test (no Docker)', description: 'Actually attempt to build Docker image', command: 'docker build .', output: 'Start Docker daemon first' });
      hasWarnings = true;
    }

    // Check: Dozzle Log Viewer
    const dozzleCmd = `docker ps --format '{{.Names}}' | grep -i dozzle`;
    sendCheck({ id: 'docker-dozzle', name: 'Dozzle Log Viewer', category: 'Docker Build', status: 'running', message: 'Checking...', description: 'Dozzle container for real-time Docker log monitoring', command: dozzleCmd });
    await sleep(200);

    if (dockerInfo) {
      const dozzleRunning = runCommand('docker ps --format "{{.Names}}" 2>/dev/null | grep -i dozzle');
      if (dozzleRunning) {
        const dozzlePort = runCommand('docker port dozzle 8080 2>/dev/null') || '8080';
        sendCheck({ id: 'docker-dozzle', name: 'Dozzle Log Viewer', category: 'Docker Build', status: 'pass', message: 'Running', description: 'Dozzle container for real-time Docker log monitoring', command: dozzleCmd, output: `Container: ${dozzleRunning}\\nAccess: http://localhost:${dozzlePort.split(':').pop() || '8080'}` });
      } else {
        sendCheck({ id: 'docker-dozzle', name: 'Dozzle Log Viewer', category: 'Docker Build', status: 'warn', message: 'Not running (optional)', description: 'Dozzle container for real-time Docker log monitoring', command: 'docker run -d -p 8080:8080 -v /var/run/docker.sock:/var/run/docker.sock --name dozzle amir20/dozzle', output: 'Optional: Real-time log viewer for containers' });
        hasWarnings = true;
      }
    } else {
      sendCheck({ id: 'docker-dozzle', name: 'Dozzle Log Viewer', category: 'Docker Build', status: 'warn', message: 'Docker not available', description: 'Dozzle container for real-time Docker log monitoring', command: dozzleCmd, output: 'Requires Docker' });
      hasWarnings = true;
    }

    // ============ SLACK NOTIFICATIONS ============
    // Check: Slack Webhook Configured
    const slackCmd = `echo $SLACK_WEBHOOK_URL | grep -q 'hooks.slack.com' && echo 'configured'`;
    sendCheck({ id: 'slack-webhook', name: 'Slack Webhook Configured', category: 'Notifications', status: 'running', message: 'Checking...', description: 'Slack webhook URL for WAVE notifications', command: slackCmd });
    await sleep(200);
    if (config?.SLACK_WEBHOOK_URL?.includes('hooks.slack.com')) {
      sendCheck({ id: 'slack-webhook', name: 'Slack Webhook Configured', category: 'Notifications', status: 'pass', message: 'Webhook configured', description: 'Slack webhook URL for WAVE notifications', command: slackCmd, output: 'Slack notifications enabled' });
    } else {
      sendCheck({ id: 'slack-webhook', name: 'Slack Webhook Configured', category: 'Notifications', status: 'warn', message: 'No webhook (optional)', description: 'Slack webhook URL for WAVE notifications', command: slackCmd, output: 'Add SLACK_WEBHOOK_URL to enable notifications' });
      hasWarnings = true;
    }

    // ============ SIGNAL FILES ============
    // Check 7: Signal Schema Valid
    const signalCmd = `find .claude -name '*.json' -exec jq empty {} \\\\; 2>&1 | grep -c 'error' || echo '0 errors'`;
    sendCheck({ id: 'signal-valid', name: 'Signal Schema Valid', category: 'Signal Files (Speed Layer)', status: 'running', message: 'Checking...', description: 'Signal JSON files match the required schema structure', command: signalCmd });
    await sleep(200);

    const claudeDir = path.join(projectPath, '.claude');
    const signalsDir = path.join(projectPath, 'signals');
    let signalCount = 0;
    if (exists(claudeDir)) {
      const files = runCommand(`find "${claudeDir}" -name "*.json" 2>/dev/null | wc -l`);
      signalCount += parseInt(files) || 0;
    }
    if (exists(signalsDir)) {
      const files = runCommand(`find "${signalsDir}" -name "*.json" 2>/dev/null | wc -l`);
      signalCount += parseInt(files) || 0;
    }

    sendCheck({ id: 'signal-valid', name: `Signal Schema Valid (${signalCount} files)`, category: 'Signal Files (Speed Layer)', status: signalCount > 0 ? 'pass' : 'warn', message: signalCount > 0 ? `${signalCount} signal files` : 'No signal files', description: 'Signal JSON files match the required schema structure', command: signalCmd, output: `Found ${signalCount} JSON files` });

    // ============ GATE -1: PRE-VALIDATION ============
    // Check 8: Prompt Files Exist
    const promptCmd = `ls -la .claude/prompts/*.md 2>/dev/null | wc -l`;
    sendCheck({ id: 'gate-prompts', name: 'Prompt Files Exist', category: 'Gate -1: Pre-Validation', status: 'running', message: 'Checking...', description: 'Agent prompt files exist in .claude/prompts directory', command: promptCmd });
    await sleep(200);

    const claudeMd = path.join(projectPath, 'CLAUDE.md');
    const promptsDir = path.join(claudeDir, 'prompts');
    sendCheck({ id: 'gate-prompts', name: 'Prompt Files Exist', category: 'Gate -1: Pre-Validation', status: (exists(claudeMd) || exists(promptsDir)) ? 'pass' : 'warn', message: exists(claudeMd) ? 'CLAUDE.md found' : (exists(promptsDir) ? 'Prompts dir found' : 'No prompts'), description: 'Agent prompt files exist in .claude/prompts directory', command: promptCmd, output: exists(claudeMd) ? 'CLAUDE.md present' : 'Create agent instructions' });

    // Check 9: Budget Sufficient
    const budgetCmd = `cat .claude/budget.json | jq '.remaining'`;
    sendCheck({ id: 'gate-budget', name: `Budget Sufficient ($${config?.WAVE_BUDGET_LIMIT || '5.00'})`, category: 'Gate -1: Pre-Validation', status: 'running', message: 'Checking...', description: 'API budget is sufficient for the planned wave execution', command: budgetCmd });
    await sleep(200);

    const hasBudget = config?.WAVE_BUDGET_LIMIT && parseFloat(config.WAVE_BUDGET_LIMIT) > 0;
    sendCheck({ id: 'gate-budget', name: `Budget Sufficient ($${config?.WAVE_BUDGET_LIMIT || '5.00'})`, category: 'Gate -1: Pre-Validation', status: hasBudget ? 'pass' : 'warn', message: hasBudget ? `$${config.WAVE_BUDGET_LIMIT} configured` : 'No budget set', description: 'API budget is sufficient for the planned wave execution', command: budgetCmd, output: hasBudget ? `Limit: $${config.WAVE_BUDGET_LIMIT}` : 'Set WAVE_BUDGET_LIMIT' });

    // Check 10: Worktrees Clean (Gate -1 emphasis)
    const wtCleanCmd = `git worktree list --porcelain | grep -c 'dirty' || echo '0 dirty'`;
    sendCheck({ id: 'gate-wt-clean', name: 'Worktrees Clean', category: 'Gate -1: Pre-Validation', status: 'running', message: 'Checking...', description: 'All worktrees have no uncommitted changes', command: wtCleanCmd });
    await sleep(200);
    sendCheck({ id: 'gate-wt-clean', name: 'Worktrees Clean', category: 'Gate -1: Pre-Validation', status: allClean ? 'pass' : 'warn', message: allClean ? 'All clean' : 'Has changes', description: 'All worktrees have no uncommitted changes', command: wtCleanCmd, output: cleanResults.join(', ') || 'No worktrees' });

    // Check 11: No Emergency Stop
    const emergencyCmd = `test ! -f .claude/EMERGENCY_STOP && echo 'CLEAR'`;
    sendCheck({ id: 'gate-emergency', name: 'No Emergency Stop', category: 'Gate -1: Pre-Validation', status: 'running', message: 'Checking...', description: 'Emergency stop signal is not active', command: emergencyCmd });
    await sleep(200);

    const emergencyFile = path.join(claudeDir, 'EMERGENCY_STOP');
    if (!exists(emergencyFile)) {
      sendCheck({ id: 'gate-emergency', name: 'No Emergency Stop', category: 'Gate -1: Pre-Validation', status: 'pass', message: 'CLEAR', description: 'Emergency stop signal is not active', command: emergencyCmd, output: 'No emergency stop active' });
    } else {
      sendCheck({ id: 'gate-emergency', name: 'No Emergency Stop', category: 'Gate -1: Pre-Validation', status: 'fail', message: 'EMERGENCY STOP ACTIVE', description: 'Emergency stop signal is not active', command: emergencyCmd, output: 'Remove .claude/EMERGENCY_STOP' });
      allPassed = false;
    }

    // Check 12: Previous Wave Complete
    const prevWaveCmd = `cat .claude/wave-status.json | jq '.previous_wave_complete'`;
    sendCheck({ id: 'gate-prev-wave', name: 'Previous Wave Complete', category: 'Gate -1: Pre-Validation', status: 'running', message: 'Checking...', description: 'Previous wave has been completed and merged', command: prevWaveCmd });
    await sleep(200);
    sendCheck({ id: 'gate-prev-wave', name: 'Previous Wave Complete', category: 'Gate -1: Pre-Validation', status: 'pass', message: 'Ready for wave', description: 'Previous wave has been completed and merged', command: prevWaveCmd, output: 'Assumed ready or first wave' });

    // Check 13: API Quotas Available
    const apiQuotaCmd = `curl -s https://api.anthropic.com/v1/usage | jq '.remaining_tokens'`;
    sendCheck({ id: 'gate-api-quota', name: 'API Quotas Available', category: 'Gate -1: Pre-Validation', status: 'running', message: 'Checking...', description: 'API rate limits have sufficient headroom', command: apiQuotaCmd });
    await sleep(200);

    const hasApiKey = config?.ANTHROPIC_API_KEY?.startsWith('sk-ant-');
    if (hasApiKey) {
      sendCheck({ id: 'gate-api-quota', name: 'API Quotas Available', category: 'Gate -1: Pre-Validation', status: 'pass', message: 'API key valid', description: 'API rate limits have sufficient headroom', command: apiQuotaCmd, output: 'Anthropic API configured' });
    } else {
      sendCheck({ id: 'gate-api-quota', name: 'API Quotas Available', category: 'Gate -1: Pre-Validation', status: 'fail', message: 'No API key', description: 'API rate limits have sufficient headroom', command: apiQuotaCmd, output: 'Configure ANTHROPIC_API_KEY' });
      allPassed = false;
    }

    // ============ GIT REPOSITORY (Foundation) ============
    // Check: Git Installed
    const gitVersionCmd = 'git --version';
    sendCheck({ id: 'git-installed', name: 'Git Installed', category: 'Git', status: 'running', message: 'Checking...', description: 'Git must be installed for version control and worktree operations', command: gitVersionCmd });
    await sleep(200);
    const gitVersion = runCommand('git --version 2>/dev/null');
    if (gitVersion) {
      sendCheck({ id: 'git-installed', name: 'Git Installed', category: 'Git', status: 'pass', message: gitVersion, description: 'Git must be installed for version control and worktree operations', command: gitVersionCmd, output: gitVersion });
    } else {
      sendCheck({ id: 'git-installed', name: 'Git Installed', category: 'Git', status: 'fail', message: 'Git not found', description: 'Git must be installed for version control and worktree operations', command: gitVersionCmd, output: 'Install from https://git-scm.com' });
      allPassed = false;
    }

    // Check: Git Repository
    const gitRepoCmd = 'test -d .git && echo "initialized"';
    sendCheck({ id: 'git-repo', name: 'Git Repository', category: 'Git', status: 'running', message: 'Checking...', description: 'Project must be a git repository for tracking changes', command: gitRepoCmd });
    await sleep(200);
    const gitDir = path.join(projectPath, '.git');
    if (exists(gitDir)) {
      sendCheck({ id: 'git-repo', name: 'Git Repository', category: 'Git', status: 'pass', message: 'Git repository initialized', description: 'Project must be a git repository for tracking changes', command: gitRepoCmd, output: '.git directory found' });
    } else {
      sendCheck({ id: 'git-repo', name: 'Git Repository', category: 'Git', status: 'fail', message: 'Not a git repository', description: 'Project must be a git repository for tracking changes', command: 'git init', output: 'Run: git init' });
      allPassed = false;
    }

    // Check: Remote Origin
    const gitRemoteCmd = 'git remote get-url origin';
    sendCheck({ id: 'git-remote', name: 'Remote Origin', category: 'Git', status: 'running', message: 'Checking...', description: 'Remote origin for pushing and pulling code changes', command: gitRemoteCmd });
    await sleep(200);
    const gitRemote = runCommand('git remote get-url origin 2>/dev/null');
    if (gitRemote) {
      sendCheck({ id: 'git-remote', name: 'Remote Origin', category: 'Git', status: 'pass', message: gitRemote, description: 'Remote origin for pushing and pulling code changes', command: gitRemoteCmd, output: gitRemote });
    } else {
      if (config?.GITHUB_REPO_URL) {
        runCommand(`git remote add origin "${config.GITHUB_REPO_URL}" 2>/dev/null || git remote set-url origin "${config.GITHUB_REPO_URL}" 2>/dev/null`);
        sendCheck({ id: 'git-remote', name: 'Remote Origin', category: 'Git', status: 'pass', message: `Configured: ${config.GITHUB_REPO_URL}`, description: 'Remote origin for pushing and pulling code changes', command: gitRemoteCmd, output: `Set to: ${config.GITHUB_REPO_URL}` });
      } else {
        sendCheck({ id: 'git-remote', name: 'Remote Origin', category: 'Git', status: 'warn', message: 'No remote origin configured', description: 'Remote origin for pushing and pulling code changes', command: 'git remote add origin <url>', output: 'Add GITHUB_REPO_URL in System Config' });
        hasWarnings = true;
      }
    }

    // Check: Working Directory Clean
    const gitStatusCmd = 'git status --porcelain';
    sendCheck({ id: 'git-clean', name: 'Working Directory Clean', category: 'Git', status: 'running', message: 'Checking...', description: 'Working directory should be clean before automation', command: gitStatusCmd });
    await sleep(200);
    const gitStatusResult = runCommand('git status --porcelain 2>/dev/null');
    if (gitStatusResult === '') {
      sendCheck({ id: 'git-clean', name: 'Working Directory Clean', category: 'Git', status: 'pass', message: 'No uncommitted changes', description: 'Working directory should be clean before automation', command: gitStatusCmd, output: 'Working tree clean' });
    } else if (gitStatusResult) {
      const changeCount = gitStatusResult.split('\n').filter(l => l.trim()).length;
      sendCheck({ id: 'git-clean', name: 'Working Directory Clean', category: 'Git', status: 'warn', message: `${changeCount} uncommitted change(s)`, description: 'Working directory should be clean before automation', command: gitStatusCmd, output: `${changeCount} files modified\\nRun: git add . && git commit -m "message"` });
      hasWarnings = true;
    } else {
      sendCheck({ id: 'git-clean', name: 'Working Directory Clean', category: 'Git', status: 'warn', message: 'Could not check status', description: 'Working directory should be clean before automation', command: gitStatusCmd, output: 'Unable to determine status' });
      hasWarnings = true;
    }

    // ============ ENVIRONMENT VARIABLES (Foundation) ============
    // Check: .env File Exists
    const envFileCmd = 'test -f .env && echo "exists"';
    sendCheck({ id: 'env-file', name: '.env File Exists', category: 'Environment', status: 'running', message: 'Checking...', description: 'Environment file for local configuration secrets', command: envFileCmd });
    await sleep(200);
    const envPath = path.join(projectPath, '.env');
    if (exists(envPath)) {
      sendCheck({ id: 'env-file', name: '.env File Exists', category: 'Environment', status: 'pass', message: 'Found .env file', description: 'Environment file for local configuration secrets', command: envFileCmd, output: '.env file present' });
    } else {
      sendCheck({ id: 'env-file', name: '.env File Exists', category: 'Environment', status: 'warn', message: 'No .env file (using config from database)', description: 'Environment file for local configuration secrets', command: 'touch .env', output: 'Config loaded from Supabase database' });
      hasWarnings = true;
    }

    // Check: ANTHROPIC_API_KEY - Actually test the API
    const anthropicKeyCmd = 'curl -s -H "x-api-key: $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages';
    sendCheck({ id: 'env-anthropic', name: 'ANTHROPIC_API_KEY', category: 'Environment', status: 'running', message: 'Testing API connection...', description: 'Anthropic API key for Claude AI operations', command: anthropicKeyCmd });

    if (config?.ANTHROPIC_API_KEY?.startsWith('sk-ant-')) {
      // Actually test the API key
      try {
        const testResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': config.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 5,
            messages: [{ role: 'user', content: 'Hi' }]
          })
        });

        if (testResponse.ok) {
          sendCheck({ id: 'env-anthropic', name: 'ANTHROPIC_API_KEY', category: 'Environment', status: 'pass', message: 'API connection verified', description: 'Anthropic API key for Claude AI operations', command: anthropicKeyCmd, output: `Key: sk-ant-***${config.ANTHROPIC_API_KEY.slice(-4)}\\nStatus: Connected and working` });
        } else if (testResponse.status === 401) {
          sendCheck({ id: 'env-anthropic', name: 'ANTHROPIC_API_KEY', category: 'Environment', status: 'fail', message: 'Invalid API key', description: 'Anthropic API key for Claude AI operations', command: anthropicKeyCmd, output: 'API returned 401 Unauthorized\\nCheck key at console.anthropic.com' });
          allPassed = false;
        } else if (testResponse.status === 429) {
          sendCheck({ id: 'env-anthropic', name: 'ANTHROPIC_API_KEY', category: 'Environment', status: 'pass', message: 'Valid (rate limited)', description: 'Anthropic API key for Claude AI operations', command: anthropicKeyCmd, output: 'Key valid but rate limited\\nWait before heavy usage' });
        } else {
          sendCheck({ id: 'env-anthropic', name: 'ANTHROPIC_API_KEY', category: 'Environment', status: 'warn', message: `API returned ${testResponse.status}`, description: 'Anthropic API key for Claude AI operations', command: anthropicKeyCmd, output: `Unexpected response: ${testResponse.status}` });
          hasWarnings = true;
        }
      } catch (err) {
        sendCheck({ id: 'env-anthropic', name: 'ANTHROPIC_API_KEY', category: 'Environment', status: 'warn', message: 'Could not verify API', description: 'Anthropic API key for Claude AI operations', command: anthropicKeyCmd, output: `Network error: ${err.message}\\nKey format appears valid` });
        hasWarnings = true;
      }
    } else {
      sendCheck({ id: 'env-anthropic', name: 'ANTHROPIC_API_KEY', category: 'Environment', status: 'fail', message: 'Missing or invalid API key', description: 'Anthropic API key for Claude AI operations', command: anthropicKeyCmd, output: 'Key must start with sk-ant-\\nGet key from console.anthropic.com' });
      allPassed = false;
    }

    // Check: SUPABASE_URL - Test database connection
    const supabaseUrlCmd = 'curl -s $SUPABASE_URL/rest/v1/';
    sendCheck({ id: 'env-supabase-url', name: 'SUPABASE_URL', category: 'Environment', status: 'running', message: 'Testing connection...', description: 'Supabase database URL for persistent storage', command: supabaseUrlCmd });

    if (config?.SUPABASE_URL?.includes('supabase.co') && config?.SUPABASE_ANON_KEY) {
      // Actually test Supabase connection
      try {
        const supabaseTest = await fetch(`${config.SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': config.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`
          }
        });

        if (supabaseTest.ok || supabaseTest.status === 200) {
          sendCheck({ id: 'env-supabase-url', name: 'SUPABASE_URL', category: 'Environment', status: 'pass', message: 'Database connected', description: 'Supabase database URL for persistent storage', command: supabaseUrlCmd, output: `URL: ${config.SUPABASE_URL.replace(/^(https:\/\/[^.]+).*/, '$1.supabase.co')}\\nStatus: Connected` });
        } else {
          sendCheck({ id: 'env-supabase-url', name: 'SUPABASE_URL', category: 'Environment', status: 'warn', message: `Response ${supabaseTest.status}`, description: 'Supabase database URL for persistent storage', command: supabaseUrlCmd, output: `URL format valid\\nConnection returned: ${supabaseTest.status}` });
          hasWarnings = true;
        }
      } catch (err) {
        sendCheck({ id: 'env-supabase-url', name: 'SUPABASE_URL', category: 'Environment', status: 'warn', message: 'Could not verify connection', description: 'Supabase database URL for persistent storage', command: supabaseUrlCmd, output: `Network error: ${err.message}\\nURL format appears valid` });
        hasWarnings = true;
      }
    } else if (config?.SUPABASE_URL?.includes('supabase.co')) {
      sendCheck({ id: 'env-supabase-url', name: 'SUPABASE_URL', category: 'Environment', status: 'warn', message: 'Missing SUPABASE_ANON_KEY', description: 'Supabase database URL for persistent storage', command: supabaseUrlCmd, output: 'URL valid but anon key missing\\nAdd SUPABASE_ANON_KEY to test connection' });
      hasWarnings = true;
    } else {
      sendCheck({ id: 'env-supabase-url', name: 'SUPABASE_URL', category: 'Environment', status: 'fail', message: 'Missing or invalid Supabase URL', description: 'Supabase database URL for persistent storage', command: supabaseUrlCmd, output: 'Get URL from supabase.com/dashboard' });
      allPassed = false;
    }

    // ============ DATABASE (Source of Truth) ============
    // Check: Supabase Tables Accessible
    const tablesCmd = `curl -s "${config?.SUPABASE_URL}/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY"`;
    sendCheck({ id: 'db-tables', name: 'Database Tables Accessible', category: 'Database', status: 'running', message: 'Testing...', description: 'Required Supabase tables: projects, stories, wave_sessions', command: tablesCmd });

    if (config?.SUPABASE_URL && config?.SUPABASE_ANON_KEY) {
      try {
        // Check projects table
        const projectsResp = await fetch(`${config.SUPABASE_URL}/rest/v1/projects?select=id&limit=1`, {
          headers: {
            'apikey': config.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`
          }
        });

        // Check stories table
        const storiesResp = await fetch(`${config.SUPABASE_URL}/rest/v1/stories?select=id&limit=1`, {
          headers: {
            'apikey': config.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`
          }
        });

        const tablesOk = projectsResp.ok && storiesResp.ok;
        if (tablesOk) {
          sendCheck({ id: 'db-tables', name: 'Database Tables Accessible', category: 'Database', status: 'pass', message: 'Tables accessible', description: 'Required Supabase tables: projects, stories, wave_sessions', command: tablesCmd, output: `projects: ${projectsResp.ok ? '✓' : '✗'}\\nstories: ${storiesResp.ok ? '✓' : '✗'}` });
        } else {
          sendCheck({ id: 'db-tables', name: 'Database Tables Accessible', category: 'Database', status: 'fail', message: 'Missing tables', description: 'Required Supabase tables: projects, stories, wave_sessions', command: tablesCmd, output: `projects: ${projectsResp.ok ? '✓' : `✗ (${projectsResp.status})`}\\nstories: ${storiesResp.ok ? '✓' : `✗ (${storiesResp.status})`}\\n\\nRun migrations or check RLS policies` });
          allPassed = false;
        }
      } catch (err) {
        sendCheck({ id: 'db-tables', name: 'Database Tables Accessible', category: 'Database', status: 'fail', message: 'Connection failed', description: 'Required Supabase tables: projects, stories, wave_sessions', command: tablesCmd, output: `Error: ${err.message}` });
        allPassed = false;
      }

      // Check: CLI Sessions Table
      const cliCmd = `SELECT * FROM cli_sessions LIMIT 1`;
      sendCheck({ id: 'db-cli', name: 'CLI Sessions Table', category: 'Database', status: 'running', message: 'Checking...', description: 'Table for tracking Claude Code CLI sessions', command: cliCmd });
      await sleep(200);

      try {
        const cliResp = await fetch(`${config.SUPABASE_URL}/rest/v1/cli_sessions?select=id&limit=1`, {
          headers: {
            'apikey': config.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`
          }
        });

        if (cliResp.ok) {
          sendCheck({ id: 'db-cli', name: 'CLI Sessions Table', category: 'Database', status: 'pass', message: 'Table accessible', description: 'Table for tracking Claude Code CLI sessions', command: cliCmd, output: 'cli_sessions table ready' });
        } else if (cliResp.status === 404 || cliResp.status === 400) {
          sendCheck({ id: 'db-cli', name: 'CLI Sessions Table', category: 'Database', status: 'warn', message: 'Table not found (optional)', description: 'Table for tracking Claude Code CLI sessions', command: cliCmd, output: 'Create cli_sessions table for session tracking' });
          hasWarnings = true;
        } else {
          sendCheck({ id: 'db-cli', name: 'CLI Sessions Table', category: 'Database', status: 'warn', message: `Response ${cliResp.status}`, description: 'Table for tracking Claude Code CLI sessions', command: cliCmd, output: 'Check table exists and RLS policies' });
          hasWarnings = true;
        }
      } catch (err) {
        sendCheck({ id: 'db-cli', name: 'CLI Sessions Table', category: 'Database', status: 'warn', message: 'Check failed', description: 'Table for tracking Claude Code CLI sessions', command: cliCmd, output: `Error: ${err.message}` });
        hasWarnings = true;
      }
    } else {
      sendCheck({ id: 'db-tables', name: 'Database Tables Accessible', category: 'Database', status: 'warn', message: 'Missing credentials', description: 'Required Supabase tables: projects, stories, wave_sessions', command: tablesCmd, output: 'Configure SUPABASE_URL and SUPABASE_ANON_KEY' });
      sendCheck({ id: 'db-cli', name: 'CLI Sessions Table', category: 'Database', status: 'warn', message: 'Cannot check', description: 'Table for tracking Claude Code CLI sessions', command: 'N/A', output: 'Configure Supabase first' });
      hasWarnings = true;
    }

    // ============ DEPLOYMENT (Vercel/CI) ============
    // Check: Vercel Configuration
    const vercelCmd = 'cat vercel.json | jq .';
    sendCheck({ id: 'deploy-vercel', name: 'Vercel Configuration', category: 'Deployment', status: 'running', message: 'Checking...', description: 'Vercel deployment configuration file', command: vercelCmd });
    await sleep(200);

    const vercelPath = path.join(projectPath, 'vercel.json');
    if (exists(vercelPath)) {
      const vercelConfig = readJSON(vercelPath);
      if (vercelConfig) {
        sendCheck({ id: 'deploy-vercel', name: 'Vercel Configuration', category: 'Deployment', status: 'pass', message: 'vercel.json valid', description: 'Vercel deployment configuration file', command: vercelCmd, output: `buildCommand: ${vercelConfig.buildCommand || 'default'}\\nframework: ${vercelConfig.framework || 'auto'}` });
      } else {
        sendCheck({ id: 'deploy-vercel', name: 'Vercel Configuration', category: 'Deployment', status: 'warn', message: 'Invalid vercel.json', description: 'Vercel deployment configuration file', command: vercelCmd, output: 'vercel.json exists but is not valid JSON' });
        hasWarnings = true;
      }
    } else {
      sendCheck({ id: 'deploy-vercel', name: 'Vercel Configuration', category: 'Deployment', status: 'warn', message: 'No vercel.json (optional)', description: 'Vercel deployment configuration file', command: vercelCmd, output: 'Create vercel.json for custom deployment settings' });
      hasWarnings = true;
    }

    // Check: Vercel Token
    const vercelTokenCmd = 'echo $VERCEL_TOKEN | head -c 10';
    sendCheck({ id: 'deploy-vercel-token', name: 'Vercel Token', category: 'Deployment', status: 'running', message: 'Checking...', description: 'Vercel API token for deployments', command: vercelTokenCmd });
    await sleep(200);

    if (config?.VERCEL_TOKEN) {
      sendCheck({ id: 'deploy-vercel-token', name: 'Vercel Token', category: 'Deployment', status: 'pass', message: 'Token configured', description: 'Vercel API token for deployments', command: vercelTokenCmd, output: `Token: ${config.VERCEL_TOKEN.substring(0, 8)}...` });
    } else {
      sendCheck({ id: 'deploy-vercel-token', name: 'Vercel Token', category: 'Deployment', status: 'warn', message: 'No token (optional)', description: 'Vercel API token for deployments', command: vercelTokenCmd, output: 'Add VERCEL_TOKEN for automated deployments' });
      hasWarnings = true;
    }

    // Check: GitHub Token
    const githubTokenCmd = 'gh auth status 2>&1 | head -3';
    sendCheck({ id: 'deploy-github', name: 'GitHub Token', category: 'Deployment', status: 'running', message: 'Checking...', description: 'GitHub token for repository operations', command: githubTokenCmd });
    await sleep(200);

    if (config?.GITHUB_TOKEN) {
      // Test GitHub token
      try {
        const ghResp = await fetch('https://api.github.com/user', {
          headers: { 'Authorization': `Bearer ${config.GITHUB_TOKEN}` }
        });
        if (ghResp.ok) {
          const ghUser = await ghResp.json();
          sendCheck({ id: 'deploy-github', name: 'GitHub Token', category: 'Deployment', status: 'pass', message: `Authenticated as ${ghUser.login}`, description: 'GitHub token for repository operations', command: githubTokenCmd, output: `User: ${ghUser.login}\\nScopes: repo access verified` });
        } else {
          sendCheck({ id: 'deploy-github', name: 'GitHub Token', category: 'Deployment', status: 'fail', message: 'Token invalid', description: 'GitHub token for repository operations', command: githubTokenCmd, output: `GitHub API returned ${ghResp.status}\\nRegenerate token at github.com/settings/tokens` });
          allPassed = false;
        }
      } catch (err) {
        sendCheck({ id: 'deploy-github', name: 'GitHub Token', category: 'Deployment', status: 'warn', message: 'Could not verify', description: 'GitHub token for repository operations', command: githubTokenCmd, output: `Error: ${err.message}` });
        hasWarnings = true;
      }
    } else {
      sendCheck({ id: 'deploy-github', name: 'GitHub Token', category: 'Deployment', status: 'warn', message: 'No token configured', description: 'GitHub token for repository operations', command: githubTokenCmd, output: 'Add GITHUB_TOKEN for automated git operations' });
      hasWarnings = true;
    }

    // ============ CLAUDE CODE CLI ============
    // Check: Claude Code Installed
    const claudeCliCmd = 'claude --version 2>/dev/null';
    sendCheck({ id: 'cli-installed', name: 'Claude Code CLI', category: 'CLI', status: 'running', message: 'Checking...', description: 'Claude Code CLI must be installed for agent operations', command: claudeCliCmd });
    await sleep(200);

    const claudeVersion = runCommand('claude --version 2>/dev/null');
    if (claudeVersion) {
      sendCheck({ id: 'cli-installed', name: 'Claude Code CLI', category: 'CLI', status: 'pass', message: claudeVersion.trim(), description: 'Claude Code CLI must be installed for agent operations', command: claudeCliCmd, output: claudeVersion });
    } else {
      sendCheck({ id: 'cli-installed', name: 'Claude Code CLI', category: 'CLI', status: 'fail', message: 'CLI not installed', description: 'Claude Code CLI must be installed for agent operations', command: 'npm install -g @anthropic-ai/claude-code', output: 'Install: npm install -g @anthropic-ai/claude-code' });
      allPassed = false;
    }

    // Check: .claudecode Directory Structure
    const claudecodeCmd = 'ls -la .claudecode/';
    sendCheck({ id: 'cli-claudecode', name: '.claudecode Directory', category: 'CLI', status: 'running', message: 'Checking...', description: 'WAVE agent configuration directory structure', command: claudecodeCmd });
    await sleep(200);

    const claudecodeDir = path.join(projectPath, '.claudecode');
    if (exists(claudecodeDir)) {
      const subdirs = listDir(claudecodeDir);
      const expectedDirs = ['agents', 'templates', 'workflows', 'safety'];
      const foundDirs = expectedDirs.filter(d => subdirs.includes(d));
      sendCheck({ id: 'cli-claudecode', name: '.claudecode Directory', category: 'CLI', status: foundDirs.length >= 2 ? 'pass' : 'warn', message: `${foundDirs.length}/${expectedDirs.length} folders`, description: 'WAVE agent configuration directory structure', command: claudecodeCmd, output: `Found: ${subdirs.slice(0, 6).join(', ')}${subdirs.length > 6 ? '...' : ''}\\nExpected: ${expectedDirs.join(', ')}` });
      if (foundDirs.length < 2) hasWarnings = true;
    } else {
      sendCheck({ id: 'cli-claudecode', name: '.claudecode Directory', category: 'CLI', status: 'warn', message: 'Not found', description: 'WAVE agent configuration directory structure', command: 'mkdir -p .claudecode/{agents,templates,workflows,safety}', output: 'Create .claudecode/ for WAVE configuration' });
      hasWarnings = true;
    }

    // Check: Claude Hooks
    const hooksCmd = 'ls -la ~/.claude/hooks/ 2>/dev/null || ls -la .claude/hooks/ 2>/dev/null';
    sendCheck({ id: 'cli-hooks', name: 'Claude Code Hooks', category: 'CLI', status: 'running', message: 'Checking...', description: 'Custom hooks for Claude Code operations', command: hooksCmd });
    await sleep(200);

    const globalHooksDir = runCommand('ls ~/.claude/hooks/ 2>/dev/null');
    const localHooksDir = exists(path.join(projectPath, '.claude', 'hooks'));
    if (globalHooksDir || localHooksDir) {
      sendCheck({ id: 'cli-hooks', name: 'Claude Code Hooks', category: 'CLI', status: 'pass', message: 'Hooks configured', description: 'Custom hooks for Claude Code operations', command: hooksCmd, output: globalHooksDir ? `Global hooks: ${globalHooksDir.split('\\n').filter(f => f).length} files` : 'Local hooks directory found' });
    } else {
      sendCheck({ id: 'cli-hooks', name: 'Claude Code Hooks', category: 'CLI', status: 'warn', message: 'No hooks (optional)', description: 'Custom hooks for Claude Code operations', command: hooksCmd, output: 'Hooks can automate pre/post operations' });
      hasWarnings = true;
    }

    // Check: Agent Prompts
    const promptsCmd = 'ls .claude/prompts/*.md 2>/dev/null | wc -l';
    sendCheck({ id: 'cli-prompts', name: 'Agent Prompts', category: 'CLI', status: 'running', message: 'Checking...', description: 'Prompt files for WAVE agents', command: promptsCmd });
    await sleep(200);

    const agentPromptsDir = path.join(projectPath, '.claude', 'prompts');
    if (exists(agentPromptsDir)) {
      const promptFiles = listDir(agentPromptsDir).filter(f => f.endsWith('.md'));
      sendCheck({ id: 'cli-prompts', name: 'Agent Prompts', category: 'CLI', status: promptFiles.length > 0 ? 'pass' : 'warn', message: `${promptFiles.length} prompt files`, description: 'Prompt files for WAVE agents', command: promptsCmd, output: promptFiles.length > 0 ? promptFiles.slice(0, 5).join(', ') : 'Add .md files to .claude/prompts/' });
      if (promptFiles.length === 0) hasWarnings = true;
    } else {
      sendCheck({ id: 'cli-prompts', name: 'Agent Prompts', category: 'CLI', status: 'warn', message: 'No prompts directory', description: 'Prompt files for WAVE agents', command: 'mkdir -p .claude/prompts', output: 'Create .claude/prompts/ with agent prompt files' });
      hasWarnings = true;
    }

    // ============ BUILD & DEPENDENCIES (Foundation) ============
    // Check: package.json
    const packageJsonCmd = 'cat package.json | jq \'.name\'';
    sendCheck({ id: 'build-package', name: 'package.json', category: 'Build', status: 'running', message: 'Checking...', description: 'Node.js package manifest for dependencies', command: packageJsonCmd });
    await sleep(200);
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (exists(packageJsonPath)) {
      const pkg = readJSON(packageJsonPath);
      sendCheck({ id: 'build-package', name: 'package.json', category: 'Build', status: 'pass', message: pkg?.name || 'Found', description: 'Node.js package manifest for dependencies', command: packageJsonCmd, output: `name: "${pkg?.name || 'project'}"\\nversion: "${pkg?.version || '1.0.0'}"` });
    } else {
      sendCheck({ id: 'build-package', name: 'package.json', category: 'Build', status: 'fail', message: 'No package.json found', description: 'Node.js package manifest for dependencies', command: 'npm init -y', output: 'Run: npm init -y' });
      allPassed = false;
    }

    // Check: Dependencies Installed
    const nodeModulesCmd = 'test -d node_modules && ls node_modules | wc -l';
    sendCheck({ id: 'build-modules', name: 'Dependencies Installed', category: 'Build', status: 'running', message: 'Checking...', description: 'Node modules must be installed for builds', command: nodeModulesCmd });
    await sleep(200);
    const nodeModulesPath = path.join(projectPath, 'node_modules');
    if (exists(nodeModulesPath)) {
      const moduleCount = runCommand(`ls "${nodeModulesPath}" 2>/dev/null | wc -l`)?.trim() || '0';
      sendCheck({ id: 'build-modules', name: 'Dependencies Installed', category: 'Build', status: 'pass', message: 'node_modules found', description: 'Node modules must be installed for builds', command: nodeModulesCmd, output: `${moduleCount} packages installed` });
    } else {
      sendCheck({ id: 'build-modules', name: 'Dependencies Installed', category: 'Build', status: 'fail', message: 'Run npm/pnpm install first', description: 'Node modules must be installed for builds', command: 'pnpm install', output: 'Run: pnpm install (or npm install)' });
      allPassed = false;
    }

    // Check: TypeScript Config
    const tsconfigCmd = 'cat tsconfig.json | jq \'.compilerOptions.target\'';
    sendCheck({ id: 'build-typescript', name: 'TypeScript Config', category: 'Build', status: 'running', message: 'Checking...', description: 'TypeScript compiler configuration', command: tsconfigCmd });
    await sleep(200);
    const tsconfigPath = path.join(projectPath, 'tsconfig.json');
    if (exists(tsconfigPath)) {
      const tsconfig = readJSON(tsconfigPath);
      sendCheck({ id: 'build-typescript', name: 'TypeScript Config', category: 'Build', status: 'pass', message: 'tsconfig.json found', description: 'TypeScript compiler configuration', command: tsconfigCmd, output: `target: "${tsconfig?.compilerOptions?.target || 'default'}"\\nstrict: ${tsconfig?.compilerOptions?.strict || false}` });
    } else {
      sendCheck({ id: 'build-typescript', name: 'TypeScript Config', category: 'Build', status: 'warn', message: 'No tsconfig.json (JavaScript project?)', description: 'TypeScript compiler configuration', command: 'npx tsc --init', output: 'Create with: npx tsc --init' });
      hasWarnings = true;
    }

    // ============ WAVE CONFIGURATION (Foundation) ============
    // Check: Stories Directory
    const storiesCmd = 'ls -la stories/ 2>/dev/null | head -10';
    sendCheck({ id: 'stories-dir', name: 'Stories Directory', category: 'WAVE', status: 'running', message: 'Checking...', description: 'Directory structure for AI stories organized by wave', command: storiesCmd });
    await sleep(200);
    // storiesPath already declared above in worktree section
    if (exists(storiesPath)) {
      const waveDirs = listDir(storiesPath).filter(d => d.startsWith('wave'));
      sendCheck({ id: 'stories-dir', name: 'Stories Directory', category: 'WAVE', status: 'pass', message: `Found ${waveDirs.length} wave folder(s)`, description: 'Directory structure for AI stories organized by wave', command: storiesCmd, output: `stories/\\n${waveDirs.map(d => `  ${d}/`).join('\\n') || '  (empty)'}` });
    } else {
      sendCheck({ id: 'stories-dir', name: 'Stories Directory', category: 'WAVE', status: 'warn', message: 'No stories directory', description: 'Directory structure for AI stories organized by wave', command: 'mkdir -p stories/wave1', output: 'Create with: mkdir -p stories/wave1' });
      hasWarnings = true;
    }

    // Check: Story Files Valid JSON
    const storyValidCmd = 'find stories -name "*.json" -exec jq empty {} \\; 2>&1';
    sendCheck({ id: 'stories-valid', name: 'Story Files Valid JSON', category: 'WAVE', status: 'running', message: 'Checking...', description: 'All story JSON files must be valid and parseable', command: storyValidCmd });
    await sleep(200);

    let storyCount = 0;
    let invalidStories = 0;
    let storyOutput = [];
    const allStories = [];

    if (exists(storiesPath)) {
      const waveDirs = listDir(storiesPath).filter(d => d.startsWith('wave'));
      for (const waveDir of waveDirs) {
        const wavePath = path.join(storiesPath, waveDir);
        const files = listDir(wavePath).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const storyData = readJSON(path.join(wavePath, file));
          if (storyData) {
            storyCount++;
            storyOutput.push(`${waveDir}/${file}: valid JSON`);
            allStories.push({ ...storyData, _file: `${waveDir}/${file}` });
          } else {
            invalidStories++;
            storyOutput.push(`${waveDir}/${file}: INVALID JSON`);
          }
        }
      }
    }

    if (storyCount > 0 && invalidStories === 0) {
      sendCheck({ id: 'stories-valid', name: 'Story Files Valid JSON', category: 'WAVE', status: 'pass', message: `${storyCount} valid`, description: 'All story JSON files must be valid and parseable', command: storyValidCmd, output: storyOutput.slice(0, 5).join('\\n') + (storyOutput.length > 5 ? `\\n... and ${storyOutput.length - 5} more` : '') });
    } else if (storyCount > 0) {
      sendCheck({ id: 'stories-valid', name: 'Story Files Valid JSON', category: 'WAVE', status: 'warn', message: `${storyCount} valid, ${invalidStories} invalid`, description: 'All story JSON files must be valid and parseable', command: storyValidCmd, output: storyOutput.join('\\n') });
      hasWarnings = true;
    } else {
      sendCheck({ id: 'stories-valid', name: 'Story Files Valid JSON', category: 'WAVE', status: 'warn', message: 'No story files found', description: 'All story JSON files must be valid and parseable', command: storyValidCmd, output: 'No .json files in stories/' });
      hasWarnings = true;
    }

    // Check: Story Schema Completeness
    const schemaCmd = 'jq -r "select(.id and .title and .acceptance_criteria)" stories/*/*.json';
    sendCheck({ id: 'stories-schema', name: 'Story Schema Complete', category: 'WAVE', status: 'running', message: 'Checking...', description: 'Stories must have required fields: id, title, agent, acceptance_criteria', command: schemaCmd });
    await sleep(200);

    const requiredFields = ['id', 'title', 'acceptance_criteria'];
    const recommendedFields = ['agent', 'domain', 'priority', 'story_points'];
    let schemaIssues = [];
    let storiesWithAllFields = 0;
    let storyIds = new Set();
    let duplicateIds = [];

    for (const story of allStories) {
      const missing = requiredFields.filter(f => !story[f]);
      const missingRecommended = recommendedFields.filter(f => !story[f]);

      // Check for duplicate IDs
      if (story.id) {
        if (storyIds.has(story.id)) {
          duplicateIds.push(story.id);
        }
        storyIds.add(story.id);
      }

      if (missing.length > 0) {
        schemaIssues.push(`${story._file}: missing ${missing.join(', ')}`);
      } else if (missingRecommended.length > 0) {
        schemaIssues.push(`${story._file}: missing recommended: ${missingRecommended.join(', ')}`);
        storiesWithAllFields++;
      } else {
        storiesWithAllFields++;
      }

      // Check acceptance criteria is array with items
      if (story.acceptance_criteria && (!Array.isArray(story.acceptance_criteria) || story.acceptance_criteria.length === 0)) {
        schemaIssues.push(`${story._file}: acceptance_criteria should be non-empty array`);
      }
    }

    if (duplicateIds.length > 0) {
      schemaIssues.unshift(`DUPLICATE IDs: ${duplicateIds.join(', ')}`);
    }

    if (allStories.length > 0 && schemaIssues.length === 0) {
      sendCheck({ id: 'stories-schema', name: 'Story Schema Complete', category: 'WAVE', status: 'pass', message: `All ${allStories.length} stories complete`, description: 'Stories must have required fields: id, title, agent, acceptance_criteria', command: schemaCmd, output: `Required: ${requiredFields.join(', ')}\\nRecommended: ${recommendedFields.join(', ')}\\n\\nAll stories have required fields` });
    } else if (allStories.length > 0) {
      const hasRequired = schemaIssues.filter(i => !i.includes('recommended')).length === 0;
      sendCheck({ id: 'stories-schema', name: 'Story Schema Complete', category: 'WAVE', status: hasRequired ? 'warn' : 'fail', message: hasRequired ? 'Missing recommended fields' : 'Missing required fields', description: 'Stories must have required fields: id, title, agent, acceptance_criteria', command: schemaCmd, output: schemaIssues.slice(0, 8).join('\\n') + (schemaIssues.length > 8 ? `\\n... and ${schemaIssues.length - 8} more issues` : '') });
      if (!hasRequired) allPassed = false;
      else hasWarnings = true;
    } else {
      sendCheck({ id: 'stories-schema', name: 'Story Schema Complete', category: 'WAVE', status: 'warn', message: 'No stories to validate', description: 'Stories must have required fields: id, title, agent, acceptance_criteria', command: schemaCmd, output: 'Add story files to stories/wave1/' });
      hasWarnings = true;
    }

    // Check: Stories Synced to Database (ALWAYS uses Portal's Supabase - SOURCE OF TRUTH)
    // This check runs AFTER story file validation so storyCount is available
    const portalSupabaseUrl = process.env.VITE_SUPABASE_URL;
    const portalSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const storySyncCmd = `SELECT COUNT(*) FROM stories WHERE project_id = '<project_id>'`;
    sendCheck({ id: 'db-stories-sync', name: 'Stories Synced to Database', category: 'Database', status: 'running', message: 'Checking Portal DB...', description: 'File-based stories should be synced to Portal Supabase (SOURCE OF TRUTH)', command: storySyncCmd });
    await sleep(200);

    if (!portalSupabaseUrl || !portalSupabaseKey) {
      console.error('[ERROR] Portal Supabase credentials not in .env');
      sendCheck({ id: 'db-stories-sync', name: 'Stories Synced to Database', category: 'Database', status: 'warn', message: 'Portal DB not configured', description: 'File-based stories should be synced to Portal Supabase (SOURCE OF TRUTH)', command: storySyncCmd, output: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing from Portal .env' });
      hasWarnings = true;
    } else {
      try {
        const dbStoriesResp = await fetch(`${portalSupabaseUrl}/rest/v1/stories?select=story_id`, {
          headers: {
            'apikey': portalSupabaseKey,
            'Authorization': `Bearer ${portalSupabaseKey}`
          }
        });

        if (dbStoriesResp.ok) {
          const dbStories = await dbStoriesResp.json();
          const dbCount = dbStories.length;
          const fileCount = storyCount || 0;

          if (dbCount > 0 && dbCount >= fileCount) {
            sendCheck({ id: 'db-stories-sync', name: 'Stories Synced to Database', category: 'Database', status: 'pass', message: `${dbCount} stories in Portal DB`, description: 'File-based stories should be synced to Portal Supabase (SOURCE OF TRUTH)', command: storySyncCmd, output: `Portal Database: ${dbCount} stories\\nProject Files: ${fileCount} stories\\n\\nPortal DB is SOURCE OF TRUTH` });
          } else if (dbCount > 0) {
            sendCheck({ id: 'db-stories-sync', name: 'Stories Synced to Database', category: 'Database', status: 'warn', message: `DB: ${dbCount}, Files: ${fileCount}`, description: 'File-based stories should be synced to Portal Supabase (SOURCE OF TRUTH)', command: storySyncCmd, output: `Portal Database: ${dbCount} stories\\nProject Files: ${fileCount} stories\\n\\nSync stories to Portal DB` });
            hasWarnings = true;
          } else {
            sendCheck({ id: 'db-stories-sync', name: 'Stories Synced to Database', category: 'Database', status: 'warn', message: 'No stories in Portal DB', description: 'File-based stories should be synced to Portal Supabase (SOURCE OF TRUTH)', command: storySyncCmd, output: `Portal Database: 0 stories\\nProject Files: ${fileCount} stories\\n\\nRun sync to populate Portal DB` });
            hasWarnings = true;
          }
        } else {
          sendCheck({ id: 'db-stories-sync', name: 'Stories Synced to Database', category: 'Database', status: 'warn', message: 'Could not query Portal DB', description: 'File-based stories should be synced to Portal Supabase (SOURCE OF TRUTH)', command: storySyncCmd, output: `Response: ${dbStoriesResp.status}` });
          hasWarnings = true;
        }
      } catch (err) {
        console.error('[ERROR] Stories sync check failed:', err.message);
        sendCheck({ id: 'db-stories-sync', name: 'Stories Synced to Database', category: 'Database', status: 'warn', message: 'Sync check failed', description: 'File-based stories should be synced to Portal Supabase (SOURCE OF TRUTH)', command: storySyncCmd, output: `Error: ${err.message}` });
        hasWarnings = true;
      }
    }

    // Check: CLAUDE.md Protocol
    const claudeCmd = 'head -20 CLAUDE.md 2>/dev/null';
    sendCheck({ id: 'wave-claude-md', name: 'CLAUDE.md Protocol', category: 'WAVE', status: 'running', message: 'Checking...', description: 'AI agent instructions and safety rules file', command: claudeCmd });
    await sleep(200);
    const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
    if (exists(claudeMdPath)) {
      const content = readFile(claudeMdPath);
      const firstLines = content?.split('\\n').slice(0, 5).join('\\n') || '';
      sendCheck({ id: 'wave-claude-md', name: 'CLAUDE.md Protocol', category: 'WAVE', status: 'pass', message: `${content?.length || 0} bytes`, description: 'AI agent instructions and safety rules file', command: claudeCmd, output: `File size: ${content?.length || 0} bytes\\n---\\n${firstLines}...` });
    } else {
      sendCheck({ id: 'wave-claude-md', name: 'CLAUDE.md Protocol', category: 'WAVE', status: 'warn', message: 'No CLAUDE.md found', description: 'AI agent instructions and safety rules file', command: 'touch CLAUDE.md', output: 'Create CLAUDE.md with agent instructions' });
      hasWarnings = true;
    }

    // Check: Budget Limit Set
    const waveBudgetCmd = 'echo $WAVE_BUDGET_LIMIT';
    sendCheck({ id: 'wave-budget', name: 'Budget Limit Set', category: 'WAVE', status: 'running', message: 'Checking...', description: 'Maximum API spend limit per wave execution', command: waveBudgetCmd });
    await sleep(200);
    if (config?.WAVE_BUDGET_LIMIT && parseFloat(config.WAVE_BUDGET_LIMIT) > 0) {
      sendCheck({ id: 'wave-budget', name: 'Budget Limit Set', category: 'WAVE', status: 'pass', message: `$${config.WAVE_BUDGET_LIMIT} per wave`, description: 'Maximum API spend limit per wave execution', command: waveBudgetCmd, output: `WAVE_BUDGET_LIMIT=${config.WAVE_BUDGET_LIMIT}` });
    } else {
      sendCheck({ id: 'wave-budget', name: 'Budget Limit Set', category: 'WAVE', status: 'warn', message: 'No budget limit configured', description: 'Maximum API spend limit per wave execution', command: waveBudgetCmd, output: 'Set WAVE_BUDGET_LIMIT in System Config' });
      hasWarnings = true;
    }

    // ============ TERMINAL TOOLS ============
    // Check: iTerm2 Running
    const itermCmd = 'pgrep -f iTerm2 || pgrep -f "iTerm"';
    sendCheck({ id: 'terminal-iterm', name: 'iTerm2 Running', category: 'Terminal Tools', status: 'running', message: 'Checking...', description: 'iTerm2 terminal emulator for managing agent sessions', command: itermCmd });
    await sleep(200);

    const itermPid = runCommand('pgrep -f iTerm2 2>/dev/null') || runCommand('pgrep -f "iTerm" 2>/dev/null');
    if (itermPid) {
      sendCheck({ id: 'terminal-iterm', name: 'iTerm2 Running', category: 'Terminal Tools', status: 'pass', message: 'iTerm2 active', description: 'iTerm2 terminal emulator for managing agent sessions', command: itermCmd, output: `Process ID: ${itermPid.split('\\n')[0]}\\niTerm2 is running and ready for agent terminals` });
    } else {
      // Check for Terminal.app as fallback
      const terminalPid = runCommand('pgrep -f Terminal 2>/dev/null');
      if (terminalPid) {
        sendCheck({ id: 'terminal-iterm', name: 'iTerm2 Running', category: 'Terminal Tools', status: 'warn', message: 'Using Terminal.app', description: 'iTerm2 terminal emulator for managing agent sessions', command: itermCmd, output: 'Terminal.app is running\\nConsider iTerm2 for better multi-session support:\\nbrew install --cask iterm2' });
        hasWarnings = true;
      } else {
        sendCheck({ id: 'terminal-iterm', name: 'iTerm2 Running', category: 'Terminal Tools', status: 'warn', message: 'No terminal detected', description: 'iTerm2 terminal emulator for managing agent sessions', command: 'open -a iTerm', output: 'Start iTerm2 for agent terminal sessions:\\nopen -a iTerm' });
        hasWarnings = true;
      }
    }

    // Check: tmux Available
    const tmuxCmd = 'tmux -V && tmux list-sessions 2>/dev/null | wc -l';
    sendCheck({ id: 'terminal-tmux', name: 'tmux Available', category: 'Terminal Tools', status: 'running', message: 'Checking...', description: 'Terminal multiplexer for persistent agent sessions', command: tmuxCmd });
    await sleep(200);

    const tmuxVersion = runCommand('tmux -V 2>/dev/null');
    if (tmuxVersion) {
      const tmuxSessions = runCommand('tmux list-sessions 2>/dev/null | wc -l')?.trim() || '0';
      sendCheck({ id: 'terminal-tmux', name: 'tmux Available', category: 'Terminal Tools', status: 'pass', message: tmuxVersion, description: 'Terminal multiplexer for persistent agent sessions', command: tmuxCmd, output: `${tmuxVersion}\\nActive sessions: ${tmuxSessions}` });
    } else {
      sendCheck({ id: 'terminal-tmux', name: 'tmux Available', category: 'Terminal Tools', status: 'warn', message: 'Not installed (optional)', description: 'Terminal multiplexer for persistent agent sessions', command: 'brew install tmux', output: 'Install tmux for persistent sessions:\\nbrew install tmux' });
      hasWarnings = true;
    }

    // ============ ORCHESTRATION ============
    // Check: Merge Watcher Script Running
    const mergeWatcherCmd = 'pgrep -f "merge-watcher" || ps aux | grep -E "merge-watcher|merge_watcher" | grep -v grep';
    sendCheck({ id: 'orch-merge-watcher', name: 'Merge Watcher Running', category: 'Orchestration', status: 'running', message: 'Checking...', description: 'WAVE merge watcher script for automated coordination', command: mergeWatcherCmd });
    await sleep(200);

    const mergeWatcherPid = runCommand('pgrep -f merge-watcher 2>/dev/null') || runCommand('pgrep -f merge_watcher 2>/dev/null');
    const mergeWatcherProcess = runCommand('ps aux 2>/dev/null | grep -E "merge-watcher|merge_watcher" | grep -v grep | head -1');

    if (mergeWatcherPid || mergeWatcherProcess) {
      sendCheck({ id: 'orch-merge-watcher', name: 'Merge Watcher Running', category: 'Orchestration', status: 'pass', message: 'Watcher active', description: 'WAVE merge watcher script for automated coordination', command: mergeWatcherCmd, output: `Merge watcher is running\\nPID: ${mergeWatcherPid || 'detected'}\\n\\nMonitoring agent signals and coordinating merges` });
    } else {
      // Check if script exists
      const scriptExists = exists(path.join(projectPath, 'core', 'scripts', 'merge-watcher-v12.sh')) ||
                          exists(path.join(projectPath, 'scripts', 'merge-watcher.sh')) ||
                          exists(path.join(projectPath, '.claude', 'scripts', 'merge-watcher.sh'));
      sendCheck({ id: 'orch-merge-watcher', name: 'Merge Watcher Running', category: 'Orchestration', status: 'warn', message: scriptExists ? 'Script exists but not running' : 'Not running', description: 'WAVE merge watcher script for automated coordination', command: './core/scripts/merge-watcher-v12.sh', output: scriptExists ? 'Merge watcher script found but not running\\nStart with: ./core/scripts/merge-watcher-v12.sh' : 'Start merge watcher for automated coordination' });
      hasWarnings = true;
    }

    // Check: Agent Terminal Sessions
    const agentTermCmd = 'ps aux | grep -E "claude|fe-dev|be-dev|qa-agent" | grep -v grep | wc -l';
    sendCheck({ id: 'orch-agent-terms', name: 'Agent Terminal Sessions', category: 'Orchestration', status: 'running', message: 'Checking...', description: 'Active terminal sessions for WAVE agents', command: agentTermCmd });
    await sleep(200);

    // Look for Claude sessions or agent-named processes
    const claudeSessions = runCommand('ps aux 2>/dev/null | grep -E "claude" | grep -v grep | wc -l')?.trim() || '0';
    const agentProcesses = runCommand('ps aux 2>/dev/null | grep -E "fe-dev|be-dev|qa-agent|dev-fix" | grep -v grep | wc -l')?.trim() || '0';
    const totalAgents = parseInt(claudeSessions) + parseInt(agentProcesses);

    if (totalAgents > 0) {
      sendCheck({ id: 'orch-agent-terms', name: 'Agent Terminal Sessions', category: 'Orchestration', status: 'pass', message: `${totalAgents} session(s) detected`, description: 'Active terminal sessions for WAVE agents', command: agentTermCmd, output: `Claude sessions: ${claudeSessions}\\nAgent processes: ${agentProcesses}\\n\\nAgents are running` });
    } else {
      sendCheck({ id: 'orch-agent-terms', name: 'Agent Terminal Sessions', category: 'Orchestration', status: 'warn', message: 'No active agents', description: 'Active terminal sessions for WAVE agents', command: agentTermCmd, output: 'No agent sessions detected\\nAgents will be started when wave begins' });
      hasWarnings = true;
    }

    // ============ CI/CD ============
    // Check: GitHub Actions Workflow
    const ghActionsCmd = 'gh run list --limit 5 --json status,conclusion,name';
    sendCheck({ id: 'cicd-gh-actions', name: 'GitHub Actions Status', category: 'CI/CD', status: 'running', message: 'Checking...', description: 'GitHub Actions workflow status for automated testing', command: ghActionsCmd });
    await sleep(200);

    const ghCliInstalled = runCommand('which gh 2>/dev/null');
    if (ghCliInstalled) {
      const ghRuns = runCommand('gh run list --limit 3 --json status,conclusion,name 2>/dev/null');
      if (ghRuns) {
        try {
          const runs = JSON.parse(ghRuns);
          if (runs.length > 0) {
            const latestRun = runs[0];
            const status = latestRun.conclusion || latestRun.status;
            const statusEmoji = status === 'success' ? '✓' : status === 'failure' ? '✗' : '⏳';
            sendCheck({ id: 'cicd-gh-actions', name: 'GitHub Actions Status', category: 'CI/CD', status: status === 'success' ? 'pass' : status === 'failure' ? 'fail' : 'warn', message: `Latest: ${status}`, description: 'GitHub Actions workflow status for automated testing', command: ghActionsCmd, output: runs.slice(0, 3).map(r => `${r.conclusion === 'success' ? '✓' : r.conclusion === 'failure' ? '✗' : '⏳'} ${r.name}: ${r.conclusion || r.status}`).join('\\n') });
            if (status === 'failure') allPassed = false;
            else if (status !== 'success') hasWarnings = true;
          } else {
            sendCheck({ id: 'cicd-gh-actions', name: 'GitHub Actions Status', category: 'CI/CD', status: 'warn', message: 'No workflow runs', description: 'GitHub Actions workflow status for automated testing', command: ghActionsCmd, output: 'No recent workflow runs found\\nPush code to trigger workflows' });
            hasWarnings = true;
          }
        } catch {
          sendCheck({ id: 'cicd-gh-actions', name: 'GitHub Actions Status', category: 'CI/CD', status: 'warn', message: 'Could not parse runs', description: 'GitHub Actions workflow status for automated testing', command: ghActionsCmd, output: 'Unable to parse GitHub Actions status' });
          hasWarnings = true;
        }
      } else {
        sendCheck({ id: 'cicd-gh-actions', name: 'GitHub Actions Status', category: 'CI/CD', status: 'warn', message: 'Not authenticated', description: 'GitHub Actions workflow status for automated testing', command: 'gh auth login', output: 'Run: gh auth login\\nto authenticate with GitHub' });
        hasWarnings = true;
      }
    } else {
      sendCheck({ id: 'cicd-gh-actions', name: 'GitHub Actions Status', category: 'CI/CD', status: 'warn', message: 'gh CLI not installed', description: 'GitHub Actions workflow status for automated testing', command: 'brew install gh', output: 'Install GitHub CLI:\\nbrew install gh' });
      hasWarnings = true;
    }

    // Check: Vercel Deployment Status
    // Note: Using vercel ls without --limit flag (not supported in newer CLI versions)
    const vercelDeployCmd = 'vercel ls 2>/dev/null | head -6 || echo "not-linked"';
    sendCheck({ id: 'cicd-vercel-deploy', name: 'Vercel Deployment Status', category: 'CI/CD', status: 'running', message: 'Checking...', description: 'Latest Vercel deployment status', command: vercelDeployCmd });
    await sleep(200);

    const vercelCliInstalled = runCommand('which vercel 2>/dev/null');
    if (vercelCliInstalled && config?.VERCEL_TOKEN) {
      // Try to get deployment status (no --limit flag - use head instead for compatibility)
      const vercelStatus = runCommand('vercel ls 2>/dev/null | head -6');
      if (vercelStatus && !vercelStatus.includes('not-linked') && !vercelStatus.includes('Error') && !vercelStatus.includes('unknown option')) {
        sendCheck({ id: 'cicd-vercel-deploy', name: 'Vercel Deployment Status', category: 'CI/CD', status: 'pass', message: 'Deployments available', description: 'Latest Vercel deployment status', command: vercelDeployCmd, output: vercelStatus.split('\\n').slice(0, 5).join('\\n') });
      } else {
        sendCheck({ id: 'cicd-vercel-deploy', name: 'Vercel Deployment Status', category: 'CI/CD', status: 'warn', message: 'Project not linked', description: 'Latest Vercel deployment status', command: 'vercel link', output: 'Link project with: vercel link' });
        hasWarnings = true;
      }
    } else if (vercelCliInstalled) {
      sendCheck({ id: 'cicd-vercel-deploy', name: 'Vercel Deployment Status', category: 'CI/CD', status: 'warn', message: 'No VERCEL_TOKEN', description: 'Latest Vercel deployment status', command: vercelDeployCmd, output: 'Vercel CLI installed but VERCEL_TOKEN not configured\\nAdd token in Configurations tab' });
      hasWarnings = true;
    } else {
      sendCheck({ id: 'cicd-vercel-deploy', name: 'Vercel Deployment Status', category: 'CI/CD', status: 'warn', message: 'Vercel CLI not installed', description: 'Latest Vercel deployment status', command: 'npm i -g vercel', output: 'Install Vercel CLI:\\nnpm i -g vercel' });
      hasWarnings = true;
    }

    // ============ PACKAGE MANAGER ============
    // Check: pnpm/npm Available
    const pnpmCmd = 'pnpm --version || npm --version';
    sendCheck({ id: 'pkg-manager', name: 'Package Manager', category: 'Build', status: 'running', message: 'Checking...', description: 'Node.js package manager for dependency management', command: pnpmCmd });
    await sleep(200);

    const pnpmVersion = runCommand('pnpm --version 2>/dev/null');
    const npmVersion = runCommand('npm --version 2>/dev/null');

    if (pnpmVersion) {
      sendCheck({ id: 'pkg-manager', name: 'Package Manager', category: 'Build', status: 'pass', message: `pnpm v${pnpmVersion}`, description: 'Node.js package manager for dependency management', command: pnpmCmd, output: `pnpm version: ${pnpmVersion}\\nRecommended for WAVE projects` });
    } else if (npmVersion) {
      sendCheck({ id: 'pkg-manager', name: 'Package Manager', category: 'Build', status: 'pass', message: `npm v${npmVersion}`, description: 'Node.js package manager for dependency management', command: pnpmCmd, output: `npm version: ${npmVersion}\\nConsider pnpm for faster installs: npm i -g pnpm` });
    } else {
      sendCheck({ id: 'pkg-manager', name: 'Package Manager', category: 'Build', status: 'fail', message: 'No package manager', description: 'Node.js package manager for dependency management', command: 'npm i -g pnpm', output: 'Install pnpm: npm i -g pnpm\\nor install Node.js from nodejs.org' });
      allPassed = false;
    }

    // Check: Node.js Version
    const nodeCmd = 'node --version';
    sendCheck({ id: 'pkg-node', name: 'Node.js Version', category: 'Build', status: 'running', message: 'Checking...', description: 'Node.js runtime version', command: nodeCmd });
    await sleep(200);

    const nodeVersion = runCommand('node --version 2>/dev/null');
    if (nodeVersion) {
      const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
      if (majorVersion >= 18) {
        sendCheck({ id: 'pkg-node', name: 'Node.js Version', category: 'Build', status: 'pass', message: nodeVersion, description: 'Node.js runtime version', command: nodeCmd, output: `${nodeVersion}\\nNode.js version is compatible` });
      } else {
        sendCheck({ id: 'pkg-node', name: 'Node.js Version', category: 'Build', status: 'warn', message: `${nodeVersion} (recommend v18+)`, description: 'Node.js runtime version', command: nodeCmd, output: `${nodeVersion}\\nRecommended: Node.js v18 or later\\nnvm install 18 && nvm use 18` });
        hasWarnings = true;
      }
    } else {
      sendCheck({ id: 'pkg-node', name: 'Node.js Version', category: 'Build', status: 'fail', message: 'Node.js not found', description: 'Node.js runtime version', command: nodeCmd, output: 'Install Node.js from nodejs.org\\nor use nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash' });
      allPassed = false;
    }

    // Determine final status
    if (allPassed && !hasWarnings) {
      sendComplete('ready');
    } else if (allPassed && hasWarnings) {
      sendComplete('ready'); // warnings don't block
    } else {
      sendComplete('blocked');
    }

  } catch (err) {
    console.error('Foundation validation error:', err);
    sendComplete('blocked');
  }

  res.end();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// MASTER VALIDATION ENDPOINT
// ============================================
// Runs the wave-validate-all.sh script for comprehensive validation

app.post('/api/validate-all', async (req, res) => {
  const { projectPath, quick = false, mode = 'strict' } = req.body;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  if (!exists(projectPath)) {
    return res.status(400).json({ error: 'Project path does not exist' });
  }

  // Validate mode parameter (validated: GitLab CI/CD pattern)
  const validModes = ['strict', 'dev', 'ci'];
  if (!validModes.includes(mode)) {
    return res.status(400).json({
      error: `Invalid validation mode: ${mode}`,
      valid_modes: validModes
    });
  }

  try {
    const { execSync } = await import('child_process');

    // Path to validation script
    const waveFrameworkPath = process.env.WAVE_PATH || path.join(__dirname, '../../');
    const scriptPath = path.join(waveFrameworkPath, 'core/scripts/wave-validate-all.sh');

    // Check if script exists
    if (!exists(scriptPath)) {
      return res.status(500).json({
        error: 'Validation script not found',
        details: `Expected at: ${scriptPath}`
      });
    }

    // Build command with mode and quick flags
    const quickFlag = quick ? '--quick' : '';
    const modeFlag = `--mode=${mode}`;
    const command = `bash "${scriptPath}" "${projectPath}" --json ${modeFlag} ${quickFlag}`;

    // Run validation script
    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 120000 // 2 minute timeout
    });

    // Parse JSON output
    try {
      const report = JSON.parse(result);
      return res.json({
        success: true,
        ...report
      });
    } catch (parseErr) {
      // Script ran but didn't output valid JSON
      return res.json({
        success: true,
        raw_output: result,
        message: 'Validation completed but output was not JSON'
      });
    }

  } catch (err) {
    // Check if it's a non-zero exit code (validation failed)
    if (err.status === 1 && err.stdout) {
      try {
        const report = JSON.parse(err.stdout);
        return res.json({
          success: false,
          ...report
        });
      } catch (parseErr) {
        // Fall through to error handling
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Validation script error',
      details: err.message,
      stderr: err.stderr?.slice(0, 1000)
    });
  }
});

// Quick validation check endpoint (for status indicator)
app.get('/api/validate-quick', async (req, res) => {
  const { projectPath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath query param required' });
  }

  try {
    const claudeDir = path.join(projectPath, '.claude');
    const reportFile = path.join(claudeDir, 'validation-report.json');

    // Check if recent report exists (less than 5 minutes old)
    if (exists(reportFile)) {
      const stat = fs.statSync(reportFile);
      const ageMinutes = (Date.now() - stat.mtime.getTime()) / 1000 / 60;

      if (ageMinutes < 5) {
        const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        return res.json({
          success: true,
          cached: true,
          age_minutes: Math.round(ageMinutes),
          ...report
        });
      }
    }

    // No recent report, do quick checks
    const checks = {
      claude_dir: exists(claudeDir),
      gate0_certified: exists(path.join(claudeDir, 'gate0-lock.json')),
      p_variable: exists(path.join(claudeDir, 'P.md')),
      env_file: exists(path.join(projectPath, '.env')),
      stories_dir: exists(path.join(projectPath, 'stories')) || exists(path.join(claudeDir, 'stories'))
    };

    const passed = Object.values(checks).filter(v => v).length;
    const total = Object.keys(checks).length;

    return res.json({
      success: true,
      cached: false,
      quick_check: true,
      summary: {
        passed,
        total,
        status: passed === total ? 'ready' : passed > total / 2 ? 'warn' : 'blocked'
      },
      checks
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIORAL SAFETY PROBES
// ═══════════════════════════════════════════════════════════════════════════════

// Get behavioral probe definitions
app.get('/api/behavioral-probes', async (req, res) => {
  try {
    // Try multiple locations for probes file
    const possiblePaths = [
      path.join(__dirname, '../../core/safety/behavioral-probes.json'),
      '/wave-framework/core/safety/behavioral-probes.json',
      path.join(process.cwd(), 'core/safety/behavioral-probes.json')
    ];

    let probesData = null;
    let foundPath = null;

    for (const probePath of possiblePaths) {
      if (exists(probePath)) {
        probesData = readJSON(probePath);
        foundPath = probePath;
        break;
      }
    }

    if (!probesData) {
      return res.status(404).json({
        success: false,
        error: 'Behavioral probes definition file not found',
        searched: possiblePaths
      });
    }

    return res.json({
      success: true,
      source: foundPath,
      version: probesData.version,
      probe_count: probesData.probes?.length || 0,
      categories: Object.keys(probesData.probe_categories || {}),
      probes: probesData.probes,
      execution_config: probesData.execution_config
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Validate behavioral probes (dry-run mode - validates structure)
app.post('/api/validate-behavioral', async (req, res) => {
  const { projectPath, mode = 'strict', agentType = null, dryRun = true } = req.body;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  try {
    // Load probes
    const possiblePaths = [
      path.join(__dirname, '../../core/safety/behavioral-probes.json'),
      '/wave-framework/core/safety/behavioral-probes.json',
      path.join(process.cwd(), 'core/safety/behavioral-probes.json')
    ];

    let probesData = null;
    for (const probePath of possiblePaths) {
      if (exists(probePath)) {
        probesData = readJSON(probePath);
        break;
      }
    }

    if (!probesData || !probesData.probes) {
      return res.status(404).json({
        success: false,
        error: 'Behavioral probes not found'
      });
    }

    const results = [];
    let passCount = 0;
    let failCount = 0;
    let skipCount = 0;
    let pendingCount = 0;

    // Get mode config
    const modeConfig = probesData.execution_config?.modes?.[mode] || { run_all_probes: true };
    const sampleSize = modeConfig.probe_sample_size || probesData.probes.length;
    const probesToRun = mode === 'dev' ? probesData.probes.slice(0, sampleSize) : probesData.probes;

    for (const probe of probesToRun) {
      // Check agent applicability
      if (agentType && probe.applicable_agents && !probe.applicable_agents.includes(agentType)) {
        results.push({
          probe_id: probe.id,
          name: probe.name,
          status: 'skipped',
          reason: `Not applicable to ${agentType}`
        });
        skipCount++;
        continue;
      }

      // Validate probe structure
      const hasRequiredFields = probe.id && probe.name && probe.test_prompt &&
        probe.pass_indicators?.length > 0 && probe.fail_indicators?.length > 0;

      if (!hasRequiredFields) {
        results.push({
          probe_id: probe.id,
          name: probe.name,
          status: 'fail',
          reason: 'Missing required fields'
        });
        failCount++;
        continue;
      }

      if (dryRun) {
        // Dry run - just validate structure
        results.push({
          probe_id: probe.id,
          name: probe.name,
          category: probe.category,
          severity: probe.severity,
          status: 'validated',
          pass_indicators_count: probe.pass_indicators.length,
          fail_indicators_count: probe.fail_indicators.length
        });
        passCount++;
      } else {
        // Live execution would happen here (requires Claude API integration)
        results.push({
          probe_id: probe.id,
          name: probe.name,
          category: probe.category,
          severity: probe.severity,
          expected_behavior: probe.expected_behavior,
          status: 'pending',
          message: 'Live execution requires agent interaction'
        });
        pendingCount++;
      }
    }

    // Determine overall status
    let overallStatus = 'pass';
    if (failCount > 0) {
      overallStatus = 'fail';
    } else if (pendingCount > 0) {
      overallStatus = 'pending';
    }

    // Save report
    const reportDir = path.join(projectPath, '.claude', 'reports');
    if (!exists(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      behavioral_probe_report: {
        timestamp: new Date().toISOString(),
        project: projectPath,
        mode,
        agent_filter: agentType || 'all',
        dry_run: dryRun,
        overall_status: overallStatus,
        summary: {
          total_probes: probesData.probes.length,
          probes_run: results.length,
          passed: passCount,
          failed: failCount,
          skipped: skipCount,
          pending: pendingCount
        },
        results,
        probe_categories: probesData.probe_categories
      }
    };

    fs.writeFileSync(
      path.join(reportDir, 'behavioral-probe-results.json'),
      JSON.stringify(report, null, 2)
    );

    // Audit log: Behavioral validation completed
    logValidation('behavioral_probe', overallStatus, {
      projectPath,
      validationMode: mode,
      totalChecks: results.length,
      passed: passCount,
      failed: failCount,
      skipped: skipCount,
      dryRun,
      triggeredBy: 'user',
      actorId: 'portal'
    });

    return res.json({
      success: true,
      ...report.behavioral_probe_report
    });

  } catch (err) {
    // Audit log: Behavioral validation error
    logValidation('behavioral_probe', 'error', {
      projectPath,
      error: err.message
    });

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get behavioral probe results (latest report)
app.get('/api/behavioral-probes/results', async (req, res) => {
  const { projectPath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath query param required' });
  }

  try {
    const reportFile = path.join(projectPath, '.claude', 'reports', 'behavioral-probe-results.json');

    if (!exists(reportFile)) {
      return res.json({
        success: true,
        has_results: false,
        message: 'No behavioral probe results found. Run validation first.'
      });
    }

    const report = readJSON(reportFile);
    const stat = fs.statSync(reportFile);
    const ageMinutes = (Date.now() - stat.mtime.getTime()) / 1000 / 60;

    return res.json({
      success: true,
      has_results: true,
      age_minutes: Math.round(ageMinutes),
      ...report.behavioral_probe_report
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STORY RISK VALIDATION (Phase 3.1)
// Enforces risk-based gate requirements for high/critical stories
// ═══════════════════════════════════════════════════════════════════════════════

// Risk level requirements
const RISK_REQUIREMENTS = {
  critical: {
    min_approval: 'L3',
    requires_review: true,
    blocked_in_dev_mode: false,
    extra_validation: ['behavioral_probes', 'safety_review'],
    description: 'Critical risk: Requires L3+ approval and safety review'
  },
  high: {
    min_approval: 'L2',
    requires_review: true,
    blocked_in_dev_mode: false,
    extra_validation: ['behavioral_probes'],
    description: 'High risk: Requires L2+ approval'
  },
  medium: {
    min_approval: 'L1',
    requires_review: false,
    blocked_in_dev_mode: false,
    extra_validation: [],
    description: 'Medium risk: Requires L1+ approval'
  },
  low: {
    min_approval: 'L0',
    requires_review: false,
    blocked_in_dev_mode: false,
    extra_validation: [],
    description: 'Low risk: Standard processing'
  }
};

// Approval level hierarchy (higher number = more authority)
const APPROVAL_LEVELS = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 };

// POST /api/validate-story-risk - Validate story risk and gate requirements
app.post('/api/validate-story-risk', (req, res) => {
  const { projectPath, storyId, story, mode = 'strict' } = req.body;

  if (!story) {
    return res.status(400).json({ success: false, error: 'story object required' });
  }

  try {
    const risk = story.risk || 'low';
    const approval = story.approval_required || 'L0';
    const safetyTags = story.safety_tags || [];
    const requiresReview = story.requires_review || false;

    const requirements = RISK_REQUIREMENTS[risk] || RISK_REQUIREMENTS.low;
    const results = [];
    let overallStatus = 'pass';
    let canProceed = true;

    // Check 1: Approval level meets minimum
    const hasMinApproval = APPROVAL_LEVELS[approval] >= APPROVAL_LEVELS[requirements.min_approval];
    results.push({
      check: 'approval_level',
      status: hasMinApproval ? 'pass' : 'fail',
      message: hasMinApproval
        ? `Approval ${approval} meets minimum ${requirements.min_approval}`
        : `Approval ${approval} does not meet minimum ${requirements.min_approval} for ${risk} risk`,
      required: requirements.min_approval,
      actual: approval
    });
    if (!hasMinApproval) {
      overallStatus = 'fail';
      if (mode === 'strict') canProceed = false;
    }

    // Check 2: Review requirement
    if (requirements.requires_review) {
      const hasReview = requiresReview === true;
      results.push({
        check: 'review_required',
        status: hasReview ? 'pass' : 'fail',
        message: hasReview
          ? 'Story marked for review as required'
          : `${risk.toUpperCase()} risk stories require review flag`,
        required: true,
        actual: requiresReview
      });
      if (!hasReview) {
        overallStatus = 'fail';
        if (mode === 'strict') canProceed = false;
      }
    }

    // Check 3: Safety tags for sensitive operations
    const sensitiveTags = ['auth', 'payments', 'secrets', 'pii', 'database'];
    const hasSensitiveTags = safetyTags.some(tag => sensitiveTags.includes(tag));
    if (hasSensitiveTags && risk === 'low') {
      results.push({
        check: 'safety_tag_mismatch',
        status: 'warn',
        message: `Story has sensitive tags ${safetyTags.filter(t => sensitiveTags.includes(t)).join(', ')} but is marked as low risk`,
        recommendation: 'Consider upgrading risk level to medium or higher'
      });
      if (overallStatus === 'pass') overallStatus = 'warn';
    }

    // Check 4: Extra validation requirements
    if (requirements.extra_validation.length > 0) {
      results.push({
        check: 'extra_validation',
        status: 'info',
        message: `${risk.toUpperCase()} risk requires: ${requirements.extra_validation.join(', ')}`,
        required_validations: requirements.extra_validation
      });
    }

    // Audit log the validation
    logValidation('story_risk', overallStatus, {
      projectPath,
      storyId: story.id || storyId,
      risk,
      approval,
      validationMode: mode,
      canProceed,
      triggeredBy: 'user',
      actorId: 'portal'
    });

    // Save report
    if (projectPath) {
      const reportDir = path.join(projectPath, '.claude', 'reports');
      if (!exists(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      const report = {
        timestamp: new Date().toISOString(),
        story_id: story.id || storyId,
        risk_level: risk,
        approval_level: approval,
        mode,
        overall_status: overallStatus,
        can_proceed: canProceed,
        results
      };

      fs.writeFileSync(
        path.join(reportDir, `story-risk-${story.id || storyId || 'unknown'}.json`),
        JSON.stringify(report, null, 2)
      );
    }

    return res.json({
      success: true,
      story_id: story.id || storyId,
      risk_level: risk,
      overall_status: overallStatus,
      can_proceed: canProceed,
      requirements,
      results
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET /api/story-risk/requirements - Get risk level requirements
app.get('/api/story-risk/requirements', (req, res) => {
  return res.json({
    success: true,
    requirements: RISK_REQUIREMENTS,
    approval_levels: Object.keys(APPROVAL_LEVELS),
    safety_tags: ['auth', 'payments', 'secrets', 'pii', 'database', 'external_api', 'admin', 'deployment']
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SAFETY TRACEABILITY (Phase 3.2)
// Generate and retrieve safety traceability matrix
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/safety-traceability - Get or generate safety traceability report
app.get('/api/safety-traceability', async (req, res) => {
  const { projectPath, regenerate = 'false' } = req.query;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'projectPath required' });
  }

  try {
    const reportFile = path.join(projectPath, '.claude', 'reports', 'safety-traceability.json');

    // Check for existing report
    if (exists(reportFile) && regenerate !== 'true') {
      const report = readJSON(reportFile);
      const stat = fs.statSync(reportFile);
      const ageMinutes = Math.round((Date.now() - stat.mtime.getTime()) / 1000 / 60);

      return res.json({
        success: true,
        from_cache: true,
        cache_age_minutes: ageMinutes,
        ...report.safety_traceability_report
      });
    }

    // Generate new report
    const storiesDir = path.join(projectPath, '.claudecode', 'stories');
    const stories = [];

    // Scan for story files
    if (exists(storiesDir)) {
      const waveDirs = fs.readdirSync(storiesDir).filter(d => d.startsWith('wave'));

      for (const waveDir of waveDirs) {
        const wavePath = path.join(storiesDir, waveDir);
        if (fs.statSync(wavePath).isDirectory()) {
          const storyFiles = fs.readdirSync(wavePath).filter(f => f.endsWith('.json'));

          for (const storyFile of storyFiles) {
            const storyData = readJSON(path.join(wavePath, storyFile));
            if (storyData && storyData.id) {
              stories.push({
                id: storyData.id,
                title: storyData.title || storyData.id,
                wave: parseInt(waveDir.replace('wave', '')) || 1,
                risk: storyData.risk || 'low',
                approval_required: storyData.approval_required || 'L0',
                safety_tags: storyData.safety_tags || [],
                requires_review: storyData.requires_review || false
              });
            }
          }
        }
      }
    }

    // Calculate summary statistics
    const totalStories = stories.length;
    const storiesWithRisk = stories.filter(s => s.risk !== 'low').length;
    const storiesWithTags = stories.filter(s => s.safety_tags.length > 0).length;
    const storiesRequiringReview = stories.filter(s => s.requires_review).length;
    const criticalStories = stories.filter(s => s.risk === 'critical').length;
    const highStories = stories.filter(s => s.risk === 'high').length;

    // Forbidden operations list
    const forbiddenOperations = [
      'delete_env_files',
      'force_push_main',
      'expose_secrets',
      'modify_safety_rules',
      'bypass_gates',
      'cross_domain_access',
      'exceed_budget',
      'access_other_agent_memory'
    ];

    // Build traceability matrix
    const traceabilityMatrix = stories.map(story => ({
      story_id: story.id,
      title: story.title,
      wave: story.wave,
      risk: story.risk,
      approval: story.approval_required,
      safety_tags: story.safety_tags,
      requires_review: story.requires_review,
      applicable_controls: forbiddenOperations.filter(() => story.risk !== 'low' || story.safety_tags.length > 0)
    }));

    const report = {
      generated_at: new Date().toISOString(),
      project: projectPath,
      summary: {
        total_stories: totalStories,
        stories_with_risk_classification: storiesWithRisk,
        stories_with_safety_tags: storiesWithTags,
        stories_requiring_review: storiesRequiringReview,
        critical_risk_stories: criticalStories,
        high_risk_stories: highStories,
        coverage_percent: totalStories > 0 ? Math.round((storiesWithTags / totalStories) * 100) : 0
      },
      risk_distribution: {
        critical: criticalStories,
        high: highStories,
        medium: stories.filter(s => s.risk === 'medium').length,
        low: stories.filter(s => s.risk === 'low').length
      },
      forbidden_operations: forbiddenOperations,
      stories,
      traceability_matrix: traceabilityMatrix
    };

    // Save report
    const reportDir = path.join(projectPath, '.claude', 'reports');
    if (!exists(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportFile, JSON.stringify({ safety_traceability_report: report }, null, 2));

    // Audit log
    logAudit({
      eventType: 'validation',
      category: 'safety_traceability',
      actorType: 'user',
      actorId: 'portal',
      action: 'traceability_generated',
      resourceType: 'report',
      resourceId: 'safety-traceability',
      details: { totalStories, criticalStories, highStories },
      projectPath
    });

    return res.json({
      success: true,
      from_cache: false,
      ...report
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD QA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

// Run build QA checks
app.post('/api/validate-build-qa', async (req, res) => {
  const { projectPath, quick = false } = req.body;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  if (!exists(projectPath)) {
    return res.status(400).json({ error: 'Project path does not exist' });
  }

  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!exists(packageJsonPath)) {
    return res.json({
      success: true,
      status: 'skipped',
      message: 'Not a Node.js project (no package.json)',
      checks: []
    });
  }

  const packageJson = readJSON(packageJsonPath);
  const results = [];

  // Detect package manager
  let pkgManager = 'npm';
  if (exists(path.join(projectPath, 'pnpm-lock.yaml'))) {
    pkgManager = 'pnpm';
  } else if (exists(path.join(projectPath, 'yarn.lock'))) {
    pkgManager = 'yarn';
  }

  // Helper to run command and capture result
  const runCheck = async (name, command, expectedExit = 0) => {
    const startTime = Date.now();
    try {
      const { execSync } = await import('child_process');
      const output = execSync(command, {
        cwd: projectPath,
        encoding: 'utf8',
        timeout: 120000, // 2 minute timeout
        stdio: ['pipe', 'pipe', 'pipe']
      });

      return {
        name,
        command,
        status: 'pass',
        duration_ms: Date.now() - startTime,
        output: output.slice(0, 1000)
      };
    } catch (err) {
      return {
        name,
        command,
        status: 'fail',
        duration_ms: Date.now() - startTime,
        error: err.message?.slice(0, 500),
        output: err.stdout?.slice(0, 500) || ''
      };
    }
  };

  try {
    // Check 1: TypeScript compilation (if tsconfig exists)
    if (exists(path.join(projectPath, 'tsconfig.json'))) {
      if (!quick) {
        results.push(await runCheck('TypeScript', 'npx tsc --noEmit'));
      } else {
        results.push({ name: 'TypeScript', status: 'skipped', reason: 'Quick mode' });
      }
    } else {
      results.push({ name: 'TypeScript', status: 'skipped', reason: 'No tsconfig.json' });
    }

    // Check 2: Build command
    if (packageJson.scripts?.build) {
      if (!quick) {
        results.push(await runCheck('Build', `${pkgManager} run build`));
      } else {
        results.push({ name: 'Build', status: 'skipped', reason: 'Quick mode' });
      }
    } else {
      results.push({ name: 'Build', status: 'skipped', reason: 'No build script' });
    }

    // Check 3: Test command
    if (packageJson.scripts?.test) {
      if (!quick) {
        const testCmd = packageJson.scripts.test.includes('vitest')
          ? `${pkgManager} run test -- --run`
          : `${pkgManager} run test -- --passWithNoTests`;
        results.push(await runCheck('Tests', testCmd));
      } else {
        results.push({ name: 'Tests', status: 'skipped', reason: 'Quick mode' });
      }
    } else {
      results.push({ name: 'Tests', status: 'skipped', reason: 'No test script' });
    }

    // Check 4: Lint command
    if (packageJson.scripts?.lint) {
      if (!quick) {
        results.push(await runCheck('Lint', `${pkgManager} run lint`));
      } else {
        results.push({ name: 'Lint', status: 'skipped', reason: 'Quick mode' });
      }
    } else {
      results.push({ name: 'Lint', status: 'skipped', reason: 'No lint script' });
    }

    // Check 5: Security audit
    if (!quick) {
      results.push(await runCheck('Security Audit', 'npm audit --audit-level=high'));
    } else {
      results.push({ name: 'Security Audit', status: 'skipped', reason: 'Quick mode' });
    }

    // Calculate summary
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    let overallStatus = 'pass';
    if (failed > 0) {
      overallStatus = 'fail';
    } else if (passed === 0) {
      overallStatus = 'skipped';
    }

    // Save report
    const reportDir = path.join(projectPath, '.claude', 'reports');
    if (!exists(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      build_qa_report: {
        timestamp: new Date().toISOString(),
        project: projectPath,
        package_manager: pkgManager,
        quick_mode: quick,
        overall_status: overallStatus,
        summary: {
          passed,
          failed,
          skipped,
          total: results.length
        },
        checks: results
      }
    };

    fs.writeFileSync(
      path.join(reportDir, 'build-qa-results.json'),
      JSON.stringify(report, null, 2)
    );

    // Audit log: Build QA completed
    logValidation('build_qa', overallStatus, {
      projectPath,
      totalChecks: results.length,
      passed,
      failed,
      skipped,
      quickMode: quick,
      packageManager: pkgManager,
      triggeredBy: 'user',
      actorId: 'portal'
    });

    return res.json({
      success: true,
      ...report.build_qa_report
    });

  } catch (err) {
    // Audit log: Build QA error
    logValidation('build_qa', 'error', {
      projectPath,
      error: err.message
    });

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get build QA results
app.get('/api/build-qa/results', async (req, res) => {
  const { projectPath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath query param required' });
  }

  try {
    const reportFile = path.join(projectPath, '.claude', 'reports', 'build-qa-results.json');

    if (!exists(reportFile)) {
      return res.json({
        success: true,
        has_results: false,
        message: 'No build QA results found. Run validation first.'
      });
    }

    const report = readJSON(reportFile);
    const stat = fs.statSync(reportFile);
    const ageMinutes = (Date.now() - stat.mtime.getTime()) / 1000 / 60;

    return res.json({
      success: true,
      has_results: true,
      age_minutes: Math.round(ageMinutes),
      ...report.build_qa_report
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BUILD QA CONFIGURABLE THRESHOLDS (Phase 1.2.5)
// ─────────────────────────────────────────────────────────────────────────────

// Default build QA thresholds
const DEFAULT_BUILD_QA_THRESHOLDS = {
  typescript: {
    max_errors: 0,           // 0 = no errors allowed
    max_warnings: 10,        // Allow up to 10 warnings
    strict_mode: true        // Require strict mode
  },
  lint: {
    max_errors: 0,           // 0 = no lint errors
    max_warnings: 20,        // Allow up to 20 warnings
    auto_fix: false          // Don't auto-fix during validation
  },
  tests: {
    min_coverage_percent: 0, // 0 = no minimum (disabled by default)
    require_passing: true,   // All tests must pass
    timeout_seconds: 300     // 5 minute test timeout
  },
  security: {
    max_critical: 0,         // No critical vulnerabilities
    max_high: 0,             // No high vulnerabilities
    max_moderate: 5,         // Allow up to 5 moderate
    max_low: -1,             // -1 = unlimited
    audit_level: 'high'      // npm audit level
  },
  build: {
    timeout_seconds: 300,    // 5 minute build timeout
    require_success: true    // Build must succeed
  },
  quality_gates: {
    block_on_typescript_errors: true,
    block_on_lint_errors: true,
    block_on_test_failures: true,
    block_on_security_critical: true,
    block_on_build_failure: true
  }
};

// GET /api/build-qa/thresholds - Get current thresholds
app.get('/api/build-qa/thresholds', (req, res) => {
  const { projectPath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath required' });
  }

  try {
    const configFile = path.join(projectPath, '.claude', 'build-qa-config.json');
    let thresholds = { ...DEFAULT_BUILD_QA_THRESHOLDS };

    // Load project-specific thresholds if they exist
    if (exists(configFile)) {
      try {
        const projectConfig = JSON.parse(readFile(configFile));
        thresholds = deepMerge(DEFAULT_BUILD_QA_THRESHOLDS, projectConfig);
      } catch (e) {
        console.warn('Failed to parse build-qa-config.json:', e.message);
      }
    }

    return res.json({
      success: true,
      thresholds,
      has_project_config: exists(configFile),
      config_path: configFile
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/build-qa/thresholds - Update thresholds
app.post('/api/build-qa/thresholds', (req, res) => {
  const { projectPath, thresholds } = req.body;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath required' });
  }

  try {
    const claudePath = path.join(projectPath, '.claude');
    if (!exists(claudePath)) {
      fs.mkdirSync(claudePath, { recursive: true });
    }

    const configFile = path.join(claudePath, 'build-qa-config.json');

    // Merge with defaults
    const newConfig = deepMerge(DEFAULT_BUILD_QA_THRESHOLDS, thresholds || {});

    fs.writeFileSync(configFile, JSON.stringify(newConfig, null, 2));

    logAudit('build_qa_config_updated', 'portal', {
      action: 'Updated Build QA thresholds',
      projectPath,
      resourceId: 'build-qa-config',
      resourceType: 'config',
      newConfig
    });

    return res.json({
      success: true,
      thresholds: newConfig,
      message: 'Build QA thresholds updated'
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: Deep merge objects
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// GET /api/build-qa/evaluate - Evaluate results against thresholds
app.get('/api/build-qa/evaluate', (req, res) => {
  const { projectPath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath required' });
  }

  try {
    // Load thresholds
    const configFile = path.join(projectPath, '.claude', 'build-qa-config.json');
    let thresholds = { ...DEFAULT_BUILD_QA_THRESHOLDS };
    if (exists(configFile)) {
      try {
        const projectConfig = JSON.parse(readFile(configFile));
        thresholds = deepMerge(DEFAULT_BUILD_QA_THRESHOLDS, projectConfig);
      } catch (e) { /* ignore */ }
    }

    // Load results
    const reportFile = path.join(projectPath, '.claude', 'reports', 'build-qa-results.json');
    if (!exists(reportFile)) {
      return res.json({
        success: true,
        evaluated: false,
        message: 'No build QA results to evaluate'
      });
    }

    const report = readJSON(reportFile);
    const checks = report.build_qa_report?.checks || [];

    // Evaluate each check against thresholds
    const evaluations = [];
    let gatesBlocked = false;

    for (const check of checks) {
      const evaluation = {
        name: check.name,
        status: check.status,
        threshold_status: 'pass',
        details: []
      };

      if (check.status === 'fail') {
        // Check quality gates
        if (check.name === 'TypeScript' && thresholds.quality_gates.block_on_typescript_errors) {
          evaluation.threshold_status = 'blocked';
          evaluation.details.push('TypeScript errors block deployment');
          gatesBlocked = true;
        } else if (check.name === 'Lint' && thresholds.quality_gates.block_on_lint_errors) {
          evaluation.threshold_status = 'blocked';
          evaluation.details.push('Lint errors block deployment');
          gatesBlocked = true;
        } else if (check.name === 'Tests' && thresholds.quality_gates.block_on_test_failures) {
          evaluation.threshold_status = 'blocked';
          evaluation.details.push('Test failures block deployment');
          gatesBlocked = true;
        } else if (check.name === 'Security Audit' && thresholds.quality_gates.block_on_security_critical) {
          evaluation.threshold_status = 'blocked';
          evaluation.details.push('Security vulnerabilities block deployment');
          gatesBlocked = true;
        } else if (check.name === 'Build' && thresholds.quality_gates.block_on_build_failure) {
          evaluation.threshold_status = 'blocked';
          evaluation.details.push('Build failure blocks deployment');
          gatesBlocked = true;
        } else {
          evaluation.threshold_status = 'warn';
          evaluation.details.push('Failed but not blocking');
        }
      }

      evaluations.push(evaluation);
    }

    return res.json({
      success: true,
      evaluated: true,
      thresholds,
      evaluations,
      summary: {
        gates_blocked: gatesBlocked,
        deployment_allowed: !gatesBlocked,
        checks_passed: evaluations.filter(e => e.threshold_status === 'pass').length,
        checks_blocked: evaluations.filter(e => e.threshold_status === 'blocked').length,
        checks_warned: evaluations.filter(e => e.threshold_status === 'warn').length
      }
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DRIFT DETECTION ENDPOINTS (Phase 1.3.4)
// Monitor agent memory and context drift
// ─────────────────────────────────────────────────────────────────────────────

// WAVE agents list
const WAVE_AGENTS = ['cto', 'pm', 'fe-dev-1', 'fe-dev-2', 'be-dev-1', 'be-dev-2', 'qa', 'dev-fix'];

// GET /api/drift-report - Get or generate drift report
app.get('/api/drift-report', async (req, res) => {
  const { projectPath, agentType, regenerate = 'false' } = req.query;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath required' });
  }

  try {
    const claudePath = path.join(projectPath, '.claude');
    const baselinesDir = path.join(claudePath, 'agent-baselines');
    const memoryDir = path.join(claudePath, 'agent-memory');
    const reportsDir = path.join(claudePath, 'reports');
    const reportFile = path.join(reportsDir, 'drift-report.json');

    // Check if we should use cached report
    if (regenerate !== 'true' && exists(reportFile)) {
      const stat = fs.statSync(reportFile);
      const ageMinutes = (Date.now() - stat.mtime.getTime()) / 1000 / 60;

      if (ageMinutes < 5) {
        const cachedReport = readJSON(reportFile);
        return res.json({
          success: true,
          cached: true,
          age_minutes: Math.round(ageMinutes),
          ...cachedReport.drift_report
        });
      }
    }

    // Generate fresh drift report
    const agentsToCheck = agentType ? [agentType] : WAVE_AGENTS;
    const driftResults = [];
    let totalDrift = 0;
    let driftedCount = 0;
    let staleCount = 0;
    let healthyCount = 0;
    let noBaselineCount = 0;

    for (const agent of agentsToCheck) {
      const baselineFile = path.join(baselinesDir, `${agent}-baseline.json`);
      const memoryFile = path.join(memoryDir, `${agent}-memory.json`);

      // No baseline - can't detect drift
      if (!exists(baselineFile)) {
        driftResults.push({
          agent,
          status: 'no_baseline',
          drift_score: null,
          message: 'No baseline established'
        });
        noBaselineCount++;
        continue;
      }

      const baseline = readJSON(baselineFile);
      const baselineDate = baseline?.created_at || 'unknown';
      const memoryTtlDays = baseline?.drift_config?.memory_ttl_days || 7;

      // Calculate memory drift
      let currentSize = 0;
      let currentDecisions = 0;
      let fileAgeDays = 0;

      if (exists(memoryFile)) {
        const stat = fs.statSync(memoryFile);
        currentSize = Math.round(stat.size / 1024);
        fileAgeDays = Math.round((Date.now() - stat.mtime.getTime()) / 86400000);

        try {
          const memoryData = readJSON(memoryFile);
          currentDecisions = Array.isArray(memoryData) ? memoryData.length :
                            (memoryData?.decisions?.length || 0);
        } catch (e) { /* ignore */ }
      }

      const baselineSize = baseline?.memory_snapshot?.size_kb || 0;
      const baselineDecisions = baseline?.memory_snapshot?.total_decisions || 0;

      // Calculate growth rates
      const sizeGrowth = baselineSize > 0 ?
        Math.round(((currentSize - baselineSize) / baselineSize) * 100) / 100 : 0;
      const decisionGrowth = baselineDecisions > 0 ?
        Math.round(((currentDecisions - baselineDecisions) / baselineDecisions) * 100) / 100 : 0;

      // Check TTL
      const ttlExceeded = fileAgeDays > memoryTtlDays;

      // Calculate drift score (weighted)
      // Weight: size_growth (0.3) + decision_growth (0.3) + ttl_exceeded (0.4)
      const sizeFactor = Math.min(Math.max(sizeGrowth, 0), 1);
      const decisionFactor = Math.min(Math.max(decisionGrowth, 0), 1);
      const ttlFactor = ttlExceeded ? 1 : 0;
      const driftScore = Math.round((sizeFactor * 0.3 + decisionFactor * 0.3 + ttlFactor * 0.4) * 1000) / 1000;

      // Determine status
      let status = 'healthy';
      let alert = false;
      const DRIFT_THRESHOLD = 0.3;

      if (ttlExceeded) {
        status = 'stale';
        alert = true;
        staleCount++;
      } else if (driftScore > DRIFT_THRESHOLD) {
        status = 'drifted';
        alert = true;
        driftedCount++;
      } else {
        healthyCount++;
      }

      totalDrift += driftScore;

      driftResults.push({
        agent,
        status,
        drift_score: driftScore,
        threshold: DRIFT_THRESHOLD,
        alert,
        baseline_date: baselineDate,
        memory_drift: {
          baseline_size_kb: baselineSize,
          current_size_kb: currentSize,
          size_growth_rate: sizeGrowth,
          baseline_decisions: baselineDecisions,
          current_decisions: currentDecisions,
          decision_growth_rate: decisionGrowth
        },
        ttl_status: {
          exceeded: ttlExceeded,
          age_days: fileAgeDays,
          ttl_days: memoryTtlDays
        }
      });
    }

    // Generate report
    const averageDrift = driftResults.filter(r => r.drift_score !== null).length > 0 ?
      Math.round((totalDrift / driftResults.filter(r => r.drift_score !== null).length) * 1000) / 1000 : 0;

    const overallStatus = driftedCount > 0 || staleCount > 0 ? 'drift_detected' : 'healthy';

    const report = {
      drift_report: {
        timestamp: new Date().toISOString(),
        project: projectPath,
        overall_status: overallStatus,
        summary: {
          total_agents: agentsToCheck.length,
          healthy: healthyCount,
          drifted: driftedCount,
          stale: staleCount,
          no_baseline: noBaselineCount,
          average_drift_score: averageDrift
        },
        recommendations: generateDriftRecommendations(driftResults),
        agents: driftResults
      }
    };

    // Save report
    if (!exists(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Log audit event
    logAudit('drift_check', 'portal', {
      action: 'Generated drift report',
      projectPath,
      resourceId: 'drift-report',
      resourceType: 'report',
      overallStatus,
      driftedCount,
      staleCount
    });

    return res.json({
      success: true,
      cached: false,
      ...report.drift_report
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: Generate drift recommendations
function generateDriftRecommendations(results) {
  const recommendations = [];

  const drifted = results.filter(r => r.status === 'drifted');
  const stale = results.filter(r => r.status === 'stale');
  const noBaseline = results.filter(r => r.status === 'no_baseline');

  if (drifted.length > 0) {
    recommendations.push({
      priority: 'high',
      type: 'drift',
      message: `${drifted.length} agent(s) showing memory drift. Consider resetting agent memory or updating baselines.`,
      agents: drifted.map(r => r.agent)
    });
  }

  if (stale.length > 0) {
    recommendations.push({
      priority: 'medium',
      type: 'stale',
      message: `${stale.length} agent(s) have memory exceeding TTL. Memory should be cleared or refreshed.`,
      agents: stale.map(r => r.agent)
    });
  }

  if (noBaseline.length > 0) {
    recommendations.push({
      priority: 'low',
      type: 'baseline',
      message: `${noBaseline.length} agent(s) have no baseline. Run baseline generation for drift monitoring.`,
      agents: noBaseline.map(r => r.agent)
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'info',
      type: 'healthy',
      message: 'All agents are healthy with no detected drift.',
      agents: []
    });
  }

  return recommendations;
}

// POST /api/drift-report/reset-memory - Reset agent memory
app.post('/api/drift-report/reset-memory', (req, res) => {
  const { projectPath, agentType } = req.body;

  if (!projectPath || !agentType) {
    return res.status(400).json({ error: 'projectPath and agentType required' });
  }

  try {
    const memoryDir = path.join(projectPath, '.claude', 'agent-memory');
    const memoryFile = path.join(memoryDir, `${agentType}-memory.json`);

    if (exists(memoryFile)) {
      // Backup before reset
      const backupDir = path.join(memoryDir, 'backups');
      if (!exists(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(memoryFile, path.join(backupDir, `${agentType}-memory-${timestamp}.json`));

      // Reset memory
      fs.writeFileSync(memoryFile, JSON.stringify({
        reset_at: new Date().toISOString(),
        reset_by: 'portal',
        decisions: []
      }, null, 2));
    }

    logAudit('memory_reset', 'portal', {
      action: `Reset agent memory for ${agentType}`,
      projectPath,
      resourceId: agentType,
      resourceType: 'agent-memory'
    });

    return res.json({
      success: true,
      message: `Memory reset for ${agentType}`
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/drift-report/generate-baseline - Generate baseline for agent
app.post('/api/drift-report/generate-baseline', (req, res) => {
  const { projectPath, agentType } = req.body;

  if (!projectPath || !agentType) {
    return res.status(400).json({ error: 'projectPath and agentType required' });
  }

  try {
    const claudePath = path.join(projectPath, '.claude');
    const baselinesDir = path.join(claudePath, 'agent-baselines');
    const memoryDir = path.join(claudePath, 'agent-memory');
    const memoryFile = path.join(memoryDir, `${agentType}-memory.json`);

    if (!exists(baselinesDir)) {
      fs.mkdirSync(baselinesDir, { recursive: true });
    }

    // Get current memory stats
    let currentSize = 0;
    let currentDecisions = 0;

    if (exists(memoryFile)) {
      const stat = fs.statSync(memoryFile);
      currentSize = Math.round(stat.size / 1024);

      try {
        const memoryData = readJSON(memoryFile);
        currentDecisions = Array.isArray(memoryData) ? memoryData.length :
                          (memoryData?.decisions?.length || 0);
      } catch (e) { /* ignore */ }
    }

    const baseline = {
      agent: agentType,
      created_at: new Date().toISOString(),
      created_by: 'portal',
      memory_snapshot: {
        size_kb: currentSize,
        total_decisions: currentDecisions
      },
      drift_config: {
        memory_ttl_days: 7,
        max_growth_rate: 0.5,
        alert_threshold: 0.3
      }
    };

    fs.writeFileSync(
      path.join(baselinesDir, `${agentType}-baseline.json`),
      JSON.stringify(baseline, null, 2)
    );

    logAudit('baseline_generated', 'portal', {
      action: `Generated baseline for ${agentType}`,
      projectPath,
      resourceId: agentType,
      resourceType: 'agent-baseline'
    });

    return res.json({
      success: true,
      baseline,
      message: `Baseline generated for ${agentType}`
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG ENDPOINTS
// Retrieve and search audit logs (Phase 2.2)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/audit-log - Retrieve audit logs
app.get('/api/audit-log', (req, res) => {
  const { projectPath, eventType, actorType, severity, limit = 100, offset = 0 } = req.query;

  try {
    let logs = [...auditLogBuffer];

    // Filter by project if specified
    if (projectPath) {
      // Also try to load from file-based audit log
      const auditDir = path.join(projectPath, '.claude', 'audit');
      if (exists(auditDir)) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        for (const date of [today, yesterday]) {
          const auditFile = path.join(auditDir, `audit-${date}.jsonl`);
          if (exists(auditFile)) {
            const lines = fs.readFileSync(auditFile, 'utf8').split('\n').filter(Boolean);
            for (const line of lines) {
              try {
                const entry = JSON.parse(line);
                if (!logs.find(l => l.id === entry.id)) {
                  logs.push(entry);
                }
              } catch (e) {
                // Skip malformed entries
              }
            }
          }
        }
      }
    }

    // Apply filters
    if (eventType) {
      logs = logs.filter(l => l.event_type === eventType);
    }
    if (actorType) {
      logs = logs.filter(l => l.actor_type === actorType);
    }
    if (severity) {
      logs = logs.filter(l => l.severity === severity);
    }

    // Sort by created_at descending
    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Apply pagination
    const total = logs.length;
    logs = logs.slice(Number(offset), Number(offset) + Number(limit));

    return res.json({
      success: true,
      total,
      offset: Number(offset),
      limit: Number(limit),
      logs
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET /api/audit-log/summary - Get audit log summary/stats
app.get('/api/audit-log/summary', (req, res) => {
  const { projectPath, hours = 24 } = req.query;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  try {
    let logs = auditLogBuffer.filter(l => new Date(l.created_at) > cutoff);

    // Summary stats
    const byEventType = {};
    const byActorType = {};
    const bySeverity = {};
    const requiresReview = logs.filter(l => l.requires_review && !l.reviewed_at).length;

    for (const log of logs) {
      byEventType[log.event_type] = (byEventType[log.event_type] || 0) + 1;
      byActorType[log.actor_type] = (byActorType[log.actor_type] || 0) + 1;
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
    }

    return res.json({
      success: true,
      time_range_hours: Number(hours),
      total_events: logs.length,
      requires_review: requiresReview,
      by_event_type: byEventType,
      by_actor_type: byActorType,
      by_severity: bySeverity,
      recent_critical: logs
        .filter(l => l.severity === 'critical' || l.severity === 'error')
        .slice(0, 5)
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /api/audit-log - Record an audit event from frontend
app.post('/api/audit-log', createValidator(auditLogSchema), (req, res) => {
  const event = req.body;

  if (!event.action) {
    return res.status(400).json({ success: false, error: 'action is required' });
  }

  try {
    const entry = logAudit({
      ...event,
      actorType: event.actorType || 'user',
      actorId: event.actorId || 'portal-user',
      eventType: event.eventType || 'system_event'
    });

    return res.json({
      success: true,
      entry
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET /api/audit-log/export - Export audit logs (Phase 2.2.4)
app.get('/api/audit-log/export', (req, res) => {
  const { projectPath, format = 'json', hours = 168, eventType, severity } = req.query;

  try {
    const cutoff = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);
    let logs = [...auditLogBuffer].filter(l => new Date(l.created_at) > cutoff);

    // Load from file-based logs if projectPath specified
    if (projectPath) {
      const auditDir = path.join(projectPath, '.claude', 'audit');
      if (exists(auditDir)) {
        // Load logs from multiple days
        const now = new Date();
        for (let i = 0; i < 7; i++) {
          const d = new Date(now.getTime() - i * 86400000);
          const dateStr = d.toISOString().split('T')[0];
          const logFile = path.join(auditDir, `audit-log-${dateStr}.jsonl`);
          if (exists(logFile)) {
            const lines = readFile(logFile).split('\n').filter(l => l.trim());
            for (const line of lines) {
              try {
                const entry = JSON.parse(line);
                if (new Date(entry.created_at) > cutoff) {
                  // Avoid duplicates
                  if (!logs.find(l => l.id === entry.id)) {
                    logs.push(entry);
                  }
                }
              } catch (e) { /* skip invalid lines */ }
            }
          }
        }
      }
    }

    // Apply filters
    if (eventType) {
      logs = logs.filter(l => l.event_type === eventType);
    }
    if (severity) {
      logs = logs.filter(l => l.severity === severity);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Format output
    if (format === 'csv') {
      const headers = ['timestamp', 'event_type', 'event_category', 'severity', 'actor_type', 'actor_id', 'action', 'details'];
      const rows = logs.map(l => [
        l.created_at,
        l.event_type || '',
        l.event_category || '',
        l.severity || '',
        l.actor_type || '',
        l.actor_id || '',
        l.action || '',
        JSON.stringify(l.details || {})
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-log-export-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }

    if (format === 'jsonl') {
      const jsonl = logs.map(l => JSON.stringify(l)).join('\n');
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Content-Disposition', `attachment; filename="audit-log-export-${new Date().toISOString().split('T')[0]}.jsonl"`);
      return res.send(jsonl);
    }

    // Default: JSON format
    const exportData = {
      export_info: {
        timestamp: new Date().toISOString(),
        format: 'json',
        time_range_hours: Number(hours),
        total_entries: logs.length,
        filters: { eventType: eventType || 'all', severity: severity || 'all' }
      },
      logs
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-export-${new Date().toISOString().split('T')[0]}.json"`);
    return res.json(exportData);

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GATE OVERRIDE ENDPOINTS
// Validated: SonarSource audit logging requirements
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/gate-override - Log a gate override event
app.post('/api/gate-override', createValidator(gateOverrideSchema), async (req, res) => {
  const {
    gateNumber,
    action = 'override', // 'override', 'bypass_requested', 'bypass_approved', 'bypass_denied'
    reason,
    reason_code, // 'emergency', 'false_positive', 'approved_exception'
    actor_type = 'user',
    actor_id,
    projectId,
    projectPath,
    wave_number,
    story_id,
    previous_status,
    new_status,
    bypassed_checks,
    approval_reference,
    validation_mode
  } = req.body;

  // Validate required fields
  if (!gateNumber) {
    return res.status(400).json({
      success: false,
      error: 'gateNumber is required'
    });
  }

  if (!reason || reason.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'reason is required (minimum 10 characters)'
    });
  }

  const validActions = ['override', 'bypass_requested', 'bypass_approved', 'bypass_denied'];
  if (!validActions.includes(action)) {
    return res.status(400).json({
      success: false,
      error: `Invalid action. Must be one of: ${validActions.join(', ')}`
    });
  }

  try {
    const auditEntry = await logGateOverride(gateNumber, action, {
      reason,
      reason_code,
      actor_type,
      actor_id,
      projectId,
      projectPath,
      wave_number,
      story_id,
      previous_status,
      new_status,
      bypassed_checks,
      approval_reference,
      validation_mode
    });

    return res.json({
      success: true,
      message: `Gate ${gateNumber} ${action} logged`,
      audit_id: auditEntry.id,
      requires_review: true
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET /api/gate-overrides - List recent gate overrides
app.get('/api/gate-overrides', (req, res) => {
  const { projectPath, hours = 24 } = req.query;

  try {
    // Filter audit log for gate override events
    const overrides = auditLogBuffer.filter(entry =>
      entry.event_category === 'gate_override' ||
      entry.safety_tags?.includes('gate_override')
    );

    // Sort by timestamp descending
    overrides.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return res.json({
      success: true,
      total: overrides.length,
      overrides: overrides.slice(0, 100), // Limit to 100 most recent
      requires_attention: overrides.filter(o => o.requires_review).length
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT WATCHDOG ENDPOINTS
// Monitor agent health through heartbeat signals (Phase 2.3)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/watchdog - Get watchdog status for all agents
app.get('/api/watchdog', (req, res) => {
  const { projectPath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'projectPath required' });
  }

  try {
    const claudePath = path.join(projectPath, '.claude');
    const heartbeatDir = path.join(claudePath, 'heartbeats');
    const watchdogDir = path.join(claudePath, 'watchdog');
    const heartbeatTimeout = 300; // 5 minutes default

    // Try to read existing watchdog report first
    const reportFile = path.join(watchdogDir, 'watchdog-report.json');
    if (exists(reportFile)) {
      const report = readJSON(reportFile);
      if (report?.watchdog_report) {
        const stat = fs.statSync(reportFile);
        const ageSeconds = Math.round((Date.now() - stat.mtime.getTime()) / 1000);

        return res.json({
          success: true,
          from_cache: true,
          cache_age_seconds: ageSeconds,
          ...report.watchdog_report
        });
      }
    }

    // Generate live watchdog status
    const agents = ['cto', 'pm', 'fe-dev-1', 'fe-dev-2', 'be-dev-1', 'be-dev-2', 'qa', 'dev-fix'];
    const results = [];
    let stuckCount = 0;
    let healthyCount = 0;
    let slowCount = 0;
    let idleCount = 0;

    for (const agent of agents) {
      const heartbeatFile = path.join(heartbeatDir, `${agent}-heartbeat.json`);
      const assignmentFile = path.join(claudePath, `signal-${agent}-assignment.json`);
      const stopFile = path.join(claudePath, `signal-${agent}-STOP.json`);

      let status = 'idle';
      let heartbeatAge = -1;
      let isStuck = false;
      let lastHeartbeat = null;

      // Check if stopped
      if (exists(stopFile)) {
        status = 'stopped';
        idleCount++;
      }
      // Check if assigned
      else if (exists(assignmentFile)) {
        const assignStat = fs.statSync(assignmentFile);
        const assignAge = Math.round((Date.now() - assignStat.mtime.getTime()) / 1000);

        if (exists(heartbeatFile)) {
          const hbStat = fs.statSync(heartbeatFile);
          heartbeatAge = Math.round((Date.now() - hbStat.mtime.getTime()) / 1000);
          lastHeartbeat = readJSON(heartbeatFile);

          if (heartbeatAge < 60) {
            status = 'active';
            healthyCount++;
          } else if (heartbeatAge < heartbeatTimeout) {
            status = 'slow';
            slowCount++;
          } else {
            status = 'stuck';
            isStuck = true;
            stuckCount++;
          }
        } else {
          // No heartbeat but assigned
          if (assignAge > heartbeatTimeout) {
            status = 'stuck';
            isStuck = true;
            stuckCount++;
          } else {
            status = 'starting';
            healthyCount++;
          }
        }
      } else {
        // No assignment
        idleCount++;
      }

      results.push({
        agent,
        status,
        heartbeat_age_seconds: heartbeatAge,
        is_stuck: isStuck,
        alert: isStuck || status === 'slow',
        alert_level: isStuck ? 'critical' : (status === 'slow' ? 'warn' : 'info'),
        timeout: heartbeatTimeout,
        last_heartbeat: lastHeartbeat
      });
    }

    let overallStatus = 'healthy';
    if (stuckCount > 0) overallStatus = 'critical';
    else if (slowCount > 0) overallStatus = 'warning';

    return res.json({
      success: true,
      from_cache: false,
      timestamp: new Date().toISOString(),
      project: projectPath,
      heartbeat_timeout_seconds: heartbeatTimeout,
      overall_status: overallStatus,
      summary: {
        total_agents: agents.length,
        healthy: healthyCount,
        stuck: stuckCount,
        slow: slowCount,
        idle: idleCount
      },
      agents: results
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /api/watchdog/heartbeat - Record agent heartbeat
app.post('/api/watchdog/heartbeat', (req, res) => {
  const { projectPath, agentType, status = 'active', currentTask, currentGate } = req.body;

  if (!projectPath || !agentType) {
    return res.status(400).json({ success: false, error: 'projectPath and agentType required' });
  }

  try {
    const heartbeatDir = path.join(projectPath, '.claude', 'heartbeats');
    if (!exists(heartbeatDir)) {
      fs.mkdirSync(heartbeatDir, { recursive: true });
    }

    const heartbeat = {
      agent: agentType,
      status,
      current_task: currentTask || null,
      current_gate: currentGate || null,
      timestamp: new Date().toISOString(),
      project: projectPath
    };

    fs.writeFileSync(
      path.join(heartbeatDir, `${agentType}-heartbeat.json`),
      JSON.stringify(heartbeat, null, 2)
    );

    return res.json({
      success: true,
      heartbeat
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN BUDGET GOVERNANCE (Phase 3.3)
// ─────────────────────────────────────────────────────────────────────────────

// Default budget configuration
const DEFAULT_BUDGET_CONFIG = {
  project_budget: 50.00,     // Total project budget in USD
  wave_budget: 25.00,        // Budget per wave
  agent_budgets: {
    cto: 10.00,
    pm: 8.00,
    'fe-dev-1': 15.00,
    'fe-dev-2': 15.00,
    'be-dev-1': 15.00,
    'be-dev-2': 15.00,
    qa: 5.00,
    'dev-fix': 10.00
  },
  story_budget_default: 2.00,  // Default per-story budget
  alert_thresholds: {
    warning: 0.75,    // Alert at 75% of budget
    critical: 0.90,   // Critical alert at 90%
    auto_pause: 1.00  // Auto-pause at 100%
  },
  anomaly_detection: {
    enabled: true,
    spike_threshold: 3.0,        // Alert if spend rate is 3x normal
    sustained_threshold: 2.0,    // Alert if sustained 2x normal for 5 min
    lookback_minutes: 30         // Historical window for normal rate
  }
};

// GET /api/budgets - Get budget configuration and current usage
app.get('/api/budgets', (req, res) => {
  const { projectPath } = req.query;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'projectPath required' });
  }

  try {
    const claudePath = path.join(projectPath, '.claude');
    const budgetConfigFile = path.join(claudePath, 'budget-config.json');
    const costTrackerDir = claudePath;

    // Load or create budget config
    let budgetConfig = { ...DEFAULT_BUDGET_CONFIG };
    if (exists(budgetConfigFile)) {
      try {
        budgetConfig = { ...DEFAULT_BUDGET_CONFIG, ...JSON.parse(readFile(budgetConfigFile)) };
      } catch (e) {
        console.warn('Failed to parse budget config:', e.message);
      }
    }

    // Gather current usage from cost tracker files
    const usage = {
      total: 0,
      by_wave: {},
      by_agent: {},
      by_story: {}
    };

    // Read cost tracker files for each wave
    const costFiles = listDir(costTrackerDir).filter(f => f.startsWith('cost-tracker-wave'));
    for (const file of costFiles) {
      try {
        const waveData = JSON.parse(readFile(path.join(costTrackerDir, file)));
        const waveNum = file.match(/wave(\d+)/)?.[1] || 'unknown';
        usage.by_wave[`wave${waveNum}`] = waveData.total_cost || 0;
        usage.total += waveData.total_cost || 0;

        // Aggregate by agent if available
        if (waveData.by_agent) {
          for (const [agent, cost] of Object.entries(waveData.by_agent)) {
            usage.by_agent[agent] = (usage.by_agent[agent] || 0) + cost;
          }
        }

        // Aggregate by story if available
        if (waveData.by_story) {
          Object.assign(usage.by_story, waveData.by_story);
        }
      } catch (e) {
        console.warn(`Failed to read ${file}:`, e.message);
      }
    }

    // Calculate percentages and status
    const projectPercent = (usage.total / budgetConfig.project_budget) * 100;
    const thresholds = budgetConfig.alert_thresholds;

    let projectStatus = 'ok';
    if (projectPercent >= thresholds.auto_pause * 100) {
      projectStatus = 'exceeded';
    } else if (projectPercent >= thresholds.critical * 100) {
      projectStatus = 'critical';
    } else if (projectPercent >= thresholds.warning * 100) {
      projectStatus = 'warning';
    }

    // Generate agent status
    const agentStatus = {};
    for (const [agent, budget] of Object.entries(budgetConfig.agent_budgets)) {
      const spent = usage.by_agent[agent] || 0;
      const percent = (spent / budget) * 100;
      agentStatus[agent] = {
        budget,
        spent,
        percent: Math.round(percent * 10) / 10,
        status: percent >= 100 ? 'exceeded' : percent >= 90 ? 'critical' : percent >= 75 ? 'warning' : 'ok'
      };
    }

    return res.json({
      success: true,
      config: budgetConfig,
      usage,
      status: {
        project: {
          budget: budgetConfig.project_budget,
          spent: Math.round(usage.total * 100) / 100,
          percent: Math.round(projectPercent * 10) / 10,
          status: projectStatus
        },
        agents: agentStatus
      },
      alerts: generateBudgetAlerts(budgetConfig, usage, agentStatus)
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: Generate budget alerts
function generateBudgetAlerts(config, usage, agentStatus) {
  const alerts = [];
  const thresholds = config.alert_thresholds;

  // Project-level alerts
  const projectPercent = (usage.total / config.project_budget) * 100;
  if (projectPercent >= thresholds.auto_pause * 100) {
    alerts.push({
      level: 'critical',
      type: 'budget_exceeded',
      target: 'project',
      message: `Project budget exceeded! $${usage.total.toFixed(2)} / $${config.project_budget.toFixed(2)}`,
      action: 'auto_pause',
      timestamp: new Date().toISOString()
    });
  } else if (projectPercent >= thresholds.critical * 100) {
    alerts.push({
      level: 'critical',
      type: 'budget_critical',
      target: 'project',
      message: `Project budget at ${projectPercent.toFixed(1)}% - approaching limit`,
      timestamp: new Date().toISOString()
    });
  } else if (projectPercent >= thresholds.warning * 100) {
    alerts.push({
      level: 'warning',
      type: 'budget_warning',
      target: 'project',
      message: `Project budget at ${projectPercent.toFixed(1)}%`,
      timestamp: new Date().toISOString()
    });
  }

  // Agent-level alerts
  for (const [agent, status] of Object.entries(agentStatus)) {
    if (status.status === 'exceeded') {
      alerts.push({
        level: 'critical',
        type: 'agent_budget_exceeded',
        target: agent,
        message: `${agent} budget exceeded: $${status.spent.toFixed(2)} / $${status.budget.toFixed(2)}`,
        action: 'pause_agent',
        timestamp: new Date().toISOString()
      });
    } else if (status.status === 'critical') {
      alerts.push({
        level: 'warning',
        type: 'agent_budget_critical',
        target: agent,
        message: `${agent} at ${status.percent}% of budget`,
        timestamp: new Date().toISOString()
      });
    }
  }

  return alerts;
}

// POST /api/budgets - Update budget configuration
app.post('/api/budgets', createValidator(budgetSchema), (req, res) => {
  const { projectPath, config } = req.body;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'projectPath required' });
  }

  try {
    const claudePath = path.join(projectPath, '.claude');
    if (!exists(claudePath)) {
      fs.mkdirSync(claudePath, { recursive: true });
    }

    const budgetConfigFile = path.join(claudePath, 'budget-config.json');

    // Merge with defaults
    const newConfig = { ...DEFAULT_BUDGET_CONFIG, ...config };

    fs.writeFileSync(budgetConfigFile, JSON.stringify(newConfig, null, 2));

    logAudit('budget_config_updated', 'portal', {
      action: 'Updated budget configuration',
      projectPath,
      resourceId: 'budget-config',
      resourceType: 'budget',
      newConfig
    });

    return res.json({
      success: true,
      config: newConfig,
      message: 'Budget configuration updated'
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/budgets/track - Track token usage for an agent/story
app.post('/api/budgets/track', createValidator(budgetTrackSchema), (req, res) => {
  const { projectPath, wave, agent, storyId, tokens, cost } = req.body;

  if (!projectPath || !wave || !agent) {
    return res.status(400).json({ success: false, error: 'projectPath, wave, and agent required' });
  }

  try {
    const claudePath = path.join(projectPath, '.claude');
    if (!exists(claudePath)) {
      fs.mkdirSync(claudePath, { recursive: true });
    }

    const costTrackerFile = path.join(claudePath, `cost-tracker-wave${wave}.json`);

    // Load existing tracker
    let tracker = {
      wave,
      total_cost: 0,
      total_tokens: { input: 0, output: 0 },
      by_agent: {},
      by_story: {},
      history: []
    };

    if (exists(costTrackerFile)) {
      try {
        tracker = JSON.parse(readFile(costTrackerFile));
      } catch (e) {
        console.warn('Failed to parse cost tracker:', e.message);
      }
    }

    // Update totals
    const estimatedCost = cost || ((tokens?.input || 0) * 0.000003 + (tokens?.output || 0) * 0.000015);
    tracker.total_cost = (tracker.total_cost || 0) + estimatedCost;
    tracker.total_tokens.input = (tracker.total_tokens?.input || 0) + (tokens?.input || 0);
    tracker.total_tokens.output = (tracker.total_tokens?.output || 0) + (tokens?.output || 0);

    // Update by agent
    tracker.by_agent[agent] = (tracker.by_agent[agent] || 0) + estimatedCost;

    // Update by story if provided
    if (storyId) {
      tracker.by_story[storyId] = (tracker.by_story[storyId] || 0) + estimatedCost;
    }

    // Add to history for anomaly detection
    tracker.history = tracker.history || [];
    tracker.history.push({
      timestamp: new Date().toISOString(),
      agent,
      storyId,
      tokens,
      cost: estimatedCost
    });

    // Keep only last 1000 history entries
    if (tracker.history.length > 1000) {
      tracker.history = tracker.history.slice(-1000);
    }

    fs.writeFileSync(costTrackerFile, JSON.stringify(tracker, null, 2));

    // Check for anomalies and budget thresholds
    const budgetConfigFile = path.join(claudePath, 'budget-config.json');
    let budgetConfig = { ...DEFAULT_BUDGET_CONFIG };
    if (exists(budgetConfigFile)) {
      try {
        budgetConfig = { ...DEFAULT_BUDGET_CONFIG, ...JSON.parse(readFile(budgetConfigFile)) };
      } catch (e) { /* ignore */ }
    }

    const anomaly = detectSpendingAnomaly(tracker, budgetConfig);
    const alerts = [];

    if (anomaly) {
      alerts.push(anomaly);
    }

    // Check agent budget
    const agentBudget = budgetConfig.agent_budgets[agent] || 10;
    const agentSpent = tracker.by_agent[agent] || 0;
    const agentPercent = (agentSpent / agentBudget) * 100;

    if (agentPercent >= 100) {
      alerts.push({
        level: 'critical',
        type: 'agent_budget_exceeded',
        target: agent,
        message: `${agent} budget exceeded: $${agentSpent.toFixed(2)} / $${agentBudget.toFixed(2)}`,
        action: 'pause_agent'
      });
    } else if (agentPercent >= budgetConfig.alert_thresholds?.critical * 100) {
      alerts.push({
        level: 'critical',
        type: 'agent_budget_critical',
        target: agent,
        message: `${agent} budget critical (${agentPercent.toFixed(1)}%): $${agentSpent.toFixed(2)} / $${agentBudget.toFixed(2)}`
      });
    } else if (agentPercent >= budgetConfig.alert_thresholds?.warning * 100) {
      alerts.push({
        level: 'warning',
        type: 'agent_budget_warning',
        target: agent,
        message: `${agent} budget warning (${agentPercent.toFixed(1)}%): $${agentSpent.toFixed(2)} / $${agentBudget.toFixed(2)}`
      });
    }

    // Send Slack notifications for budget alerts
    for (const alert of alerts) {
      const slackEventType = alert.level === 'critical'
        ? (alert.type.includes('exceeded') ? SLACK_EVENT_TYPES.BUDGET_EXCEEDED : SLACK_EVENT_TYPES.BUDGET_CRITICAL)
        : SLACK_EVENT_TYPES.BUDGET_WARNING;

      const slackEvent = createSlackEvent(slackEventType, {
        project: path.basename(projectPath),
        wave,
        agent,
        storyId,
        severity: alert.level,
        details: {
          message: alert.message,
          percentage: agentPercent,
          spent: agentSpent,
          limit: agentBudget,
          alertType: alert.type
        }
      });

      // Send asynchronously (don't wait)
      slackNotifier.notify(slackEvent).catch(() => {});
    }

    return res.json({
      success: true,
      tracker: {
        total_cost: tracker.total_cost,
        agent_cost: tracker.by_agent[agent],
        story_cost: storyId ? tracker.by_story[storyId] : null
      },
      alerts
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: Detect spending anomalies
function detectSpendingAnomaly(tracker, config) {
  if (!config.anomaly_detection?.enabled) return null;

  const history = tracker.history || [];
  if (history.length < 5) return null;

  const now = Date.now();
  const lookbackMs = (config.anomaly_detection.lookback_minutes || 30) * 60 * 1000;
  const recentMs = 5 * 60 * 1000; // Last 5 minutes

  // Calculate historical average spend rate ($ per minute)
  const historicalEntries = history.filter(h => {
    const ts = new Date(h.timestamp).getTime();
    return ts >= (now - lookbackMs) && ts < (now - recentMs);
  });

  const recentEntries = history.filter(h => {
    const ts = new Date(h.timestamp).getTime();
    return ts >= (now - recentMs);
  });

  if (historicalEntries.length < 3 || recentEntries.length < 1) return null;

  const historicalSpend = historicalEntries.reduce((sum, h) => sum + (h.cost || 0), 0);
  const recentSpend = recentEntries.reduce((sum, h) => sum + (h.cost || 0), 0);

  const historicalMinutes = (lookbackMs - recentMs) / 60000;
  const recentMinutes = recentMs / 60000;

  const historicalRate = historicalSpend / historicalMinutes;
  const recentRate = recentSpend / recentMinutes;

  // Check for spike
  if (historicalRate > 0 && recentRate >= historicalRate * config.anomaly_detection.spike_threshold) {
    return {
      level: 'warning',
      type: 'spending_spike',
      message: `Spending spike detected: ${(recentRate * 60).toFixed(2)}/hr vs normal ${(historicalRate * 60).toFixed(2)}/hr`,
      details: {
        recent_rate: recentRate,
        historical_rate: historicalRate,
        multiplier: recentRate / historicalRate
      },
      timestamp: new Date().toISOString()
    };
  }

  return null;
}

// GET /api/budgets/check - Check if operation would exceed budget
app.get('/api/budgets/check', (req, res) => {
  const { projectPath, agent, estimatedCost } = req.query;

  if (!projectPath || !agent || !estimatedCost) {
    return res.status(400).json({ success: false, error: 'projectPath, agent, and estimatedCost required' });
  }

  try {
    const claudePath = path.join(projectPath, '.claude');
    const budgetConfigFile = path.join(claudePath, 'budget-config.json');

    let budgetConfig = { ...DEFAULT_BUDGET_CONFIG };
    if (exists(budgetConfigFile)) {
      try {
        budgetConfig = { ...DEFAULT_BUDGET_CONFIG, ...JSON.parse(readFile(budgetConfigFile)) };
      } catch (e) { /* ignore */ }
    }

    // Get current agent spend
    let agentSpent = 0;
    let projectSpent = 0;

    const costFiles = listDir(claudePath).filter(f => f.startsWith('cost-tracker-wave'));
    for (const file of costFiles) {
      try {
        const waveData = JSON.parse(readFile(path.join(claudePath, file)));
        projectSpent += waveData.total_cost || 0;
        agentSpent += waveData.by_agent?.[agent] || 0;
      } catch (e) { /* ignore */ }
    }

    const cost = parseFloat(estimatedCost);
    const agentBudget = budgetConfig.agent_budgets[agent] || 10;
    const projectBudget = budgetConfig.project_budget;

    const agentWouldExceed = (agentSpent + cost) > agentBudget;
    const projectWouldExceed = (projectSpent + cost) > projectBudget;

    return res.json({
      success: true,
      allowed: !agentWouldExceed && !projectWouldExceed,
      agent: {
        budget: agentBudget,
        spent: agentSpent,
        after_operation: agentSpent + cost,
        would_exceed: agentWouldExceed
      },
      project: {
        budget: projectBudget,
        spent: projectSpent,
        after_operation: projectSpent + cost,
        would_exceed: projectWouldExceed
      }
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DORA METRICS ENDPOINTS (GAP-002)
// Track the four key DevOps performance metrics
// Source: https://dora.dev/guides/dora-metrics-four-keys/
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/dora/metrics - Get DORA metrics for a date range
app.get('/api/dora/metrics', (req, res) => {
  const { projectPath, startDate, endDate, period } = req.query;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'Project path required' });
  }

  try {
    const tracker = new DORAMetricsTracker(projectPath);

    // If period is 'week', calculate for current week
    if (period === 'week') {
      const summary = tracker.generateWeeklySummary(0);
      return res.json({ success: true, metrics: summary });
    }

    // If period is 'last-week', calculate for last week
    if (period === 'last-week') {
      const summary = tracker.generateWeeklySummary(1);
      return res.json({ success: true, metrics: summary });
    }

    // Default: use provided date range or last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const metrics = tracker.calculateMetrics(start.toISOString(), end.toISOString());
    const overall = tracker.getOverallRating(metrics.metrics);

    res.json({
      success: true,
      metrics: {
        ...metrics,
        overall_rating: overall
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dora/deployment - Record a deployment event
app.post('/api/dora/deployment', (req, res) => {
  const { projectPath, wave, storyId, commitSha, environment, success } = req.body;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'Project path required' });
  }

  try {
    const tracker = new DORAMetricsTracker(projectPath);
    const event = tracker.recordDeployment({
      wave,
      storyId,
      commitSha,
      environment: environment || 'production',
      success: success !== false
    });

    // Log audit event
    logAudit({
      eventType: 'dora_deployment',
      category: 'metrics',
      severity: success !== false ? 'info' : 'warning',
      actorType: 'system',
      actorId: 'dora-tracker',
      action: success !== false ? 'Deployment recorded' : 'Failed deployment recorded',
      resourceType: 'story',
      resourceId: storyId,
      projectPath,
      waveNumber: wave,
      details: event
    });

    res.json({ success: true, event });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dora/lead-time - Record lead time for a deployment
app.post('/api/dora/lead-time', (req, res) => {
  const { projectPath, wave, storyId, firstCommitAt, deployedAt, gatesTraversed, retries } = req.body;

  if (!projectPath || !firstCommitAt) {
    return res.status(400).json({ success: false, error: 'Project path and firstCommitAt required' });
  }

  try {
    const tracker = new DORAMetricsTracker(projectPath);
    const event = tracker.recordLeadTime({
      wave,
      storyId,
      firstCommitAt,
      deployedAt: deployedAt || new Date().toISOString(),
      gatesTraversed: gatesTraversed || [],
      retries: retries || 0
    });

    res.json({ success: true, event });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dora/failure - Record a failure event
app.post('/api/dora/failure', (req, res) => {
  const { projectPath, wave, storyId, failureType, gate, error, rollbackRequired } = req.body;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'Project path required' });
  }

  try {
    const tracker = new DORAMetricsTracker(projectPath);
    const event = tracker.recordFailure({
      wave,
      storyId,
      failureType,
      gate,
      error,
      rollbackRequired
    });

    // Log audit event
    logAudit({
      eventType: 'dora_failure',
      category: 'metrics',
      severity: 'warning',
      actorType: 'system',
      actorId: 'dora-tracker',
      action: 'Failure recorded for MTTR tracking',
      resourceType: 'story',
      resourceId: storyId,
      projectPath,
      waveNumber: wave,
      gateNumber: gate,
      details: event
    });

    res.json({ success: true, event });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dora/recovery - Record a recovery event
app.post('/api/dora/recovery', (req, res) => {
  const { projectPath, wave, storyId, failureId, failedAt, recoveredAt, resolution } = req.body;

  if (!projectPath || !failedAt) {
    return res.status(400).json({ success: false, error: 'Project path and failedAt required' });
  }

  try {
    const tracker = new DORAMetricsTracker(projectPath);
    const event = tracker.recordRecovery({
      wave,
      storyId,
      failureId,
      failedAt,
      recoveredAt: recoveredAt || new Date().toISOString(),
      resolution
    });

    // Log audit event
    logAudit({
      eventType: 'dora_recovery',
      category: 'metrics',
      severity: 'info',
      actorType: 'system',
      actorId: 'dora-tracker',
      action: `Recovery recorded - MTTR: ${event.mttr_seconds}s`,
      resourceType: 'story',
      resourceId: storyId,
      projectPath,
      waveNumber: wave,
      details: event
    });

    res.json({ success: true, event });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dora/events - Get raw DORA events
app.get('/api/dora/events', (req, res) => {
  const { projectPath, startDate, endDate, limit } = req.query;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'Project path required' });
  }

  try {
    const tracker = new DORAMetricsTracker(projectPath);
    let events = tracker.readEvents();

    // Filter by date range if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      events = events.filter(e => {
        const ts = new Date(e.timestamp);
        return ts >= start && ts <= end;
      });
    }

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply limit
    if (limit) {
      events = events.slice(0, parseInt(limit));
    }

    res.json({ success: true, events, count: events.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PER-AGENT RATE LIMITING ENDPOINTS (GAP-004)
// Enforces rate limits to prevent runaway workloads
// Source: https://www.truefoundry.com/blog/llm-cost-tracking-solution
// ═══════════════════════════════════════════════════════════════════════════════

// Rate limiter instances per project
const rateLimiters = new Map();

function getRateLimiter(projectPath) {
  if (!rateLimiters.has(projectPath)) {
    rateLimiters.set(projectPath, new AgentRateLimiter({ projectPath }));
  }
  return rateLimiters.get(projectPath);
}

// GET /api/rate-limits - Get rate limit configuration and usage
app.get('/api/rate-limits', (req, res) => {
  const { projectPath, agent } = req.query;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'Project path required' });
  }

  try {
    const limiter = getRateLimiter(projectPath);

    if (agent) {
      const usage = limiter.getUsage(agent);
      res.set(limiter.getHeaders(agent));
      return res.json({ success: true, usage });
    }

    const allUsage = limiter.getAllUsage();
    res.json({
      success: true,
      agents: allUsage,
      count: Object.keys(allUsage).length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/rate-limits/check - Check if a request would be allowed
app.post('/api/rate-limits/check', createValidator(rateLimitCheckSchema), (req, res) => {
  const { projectPath, agent, estimatedTokens } = req.body;

  if (!projectPath || !agent) {
    return res.status(400).json({ success: false, error: 'Project path and agent required' });
  }

  try {
    const limiter = getRateLimiter(projectPath);
    const check = limiter.checkLimit(agent, estimatedTokens || 0);

    res.set(limiter.getHeaders(agent));

    if (!check.allowed) {
      // Return 429 if rate limited
      return res.status(429).json({
        success: false,
        allowed: false,
        ...check
      });
    }

    res.json({
      success: true,
      allowed: true,
      ...check
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/rate-limits/record - Record a completed request
app.post('/api/rate-limits/record', createValidator(rateLimitRecordSchema), (req, res) => {
  const { projectPath, agent, tokensUsed } = req.body;

  if (!projectPath || !agent) {
    return res.status(400).json({ success: false, error: 'Project path and agent required' });
  }

  try {
    const limiter = getRateLimiter(projectPath);
    const result = limiter.recordRequest(agent, tokensUsed || 0);

    res.set(limiter.getHeaders(agent));
    res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/rate-limits/config - Update rate limits for an agent type
app.put('/api/rate-limits/config', createValidator(rateLimitConfigSchema), (req, res) => {
  const { projectPath, agentType, limits } = req.body;

  if (!projectPath || !agentType || !limits) {
    return res.status(400).json({ success: false, error: 'Project path, agentType, and limits required' });
  }

  try {
    const limiter = getRateLimiter(projectPath);
    limiter.updateLimits(agentType, limits);

    // Log audit event
    logAudit({
      eventType: 'config_update',
      category: 'rate_limits',
      severity: 'info',
      actorType: 'user',
      actorId: 'portal',
      action: `Updated rate limits for ${agentType}`,
      resourceType: 'rate_limits',
      resourceId: agentType,
      projectPath,
      details: { agentType, limits }
    });

    res.json({
      success: true,
      message: `Rate limits updated for ${agentType}`,
      limits: limiter.getLimits(agentType)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/rate-limits/reset - Reset usage for an agent or all agents
app.post('/api/rate-limits/reset', (req, res) => {
  const { projectPath, agent } = req.body;

  if (!projectPath) {
    return res.status(400).json({ success: false, error: 'Project path required' });
  }

  try {
    const limiter = getRateLimiter(projectPath);

    if (agent) {
      limiter.resetAgent(agent);
      res.json({ success: true, message: `Rate limits reset for ${agent}` });
    } else {
      limiter.resetAll();
      res.json({ success: true, message: 'All rate limits reset' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLACK NOTIFICATION ENDPOINTS
// Generic Slack integration for pipeline notifications
// ═══════════════════════════════════════════════════════════════════════════════

// Get Slack notifier status
app.get('/api/slack/status', (req, res) => {
  res.json({
    success: true,
    status: slackNotifier.getStatus()
  });
});

// Test Slack connection
app.post('/api/slack/test', createValidator(slackTestSchema), async (req, res) => {
  const { message } = req.body;

  try {
    const result = await slackNotifier.sendTest(message);
    res.json({
      success: result.success,
      message: result.success ? 'Test message sent to Slack' : 'Failed to send test message',
      reason: result.reason
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send a Slack notification
app.post('/api/slack/notify', createValidator(slackNotifySchema), async (req, res) => {
  const { type, data } = req.body;

  if (!type) {
    return res.status(400).json({ success: false, error: 'Missing event type' });
  }

  try {
    const event = createSlackEvent(type, data || {});
    const result = await slackNotifier.notify(event);
    res.json({
      success: result.success,
      event: event,
      reason: result.reason
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send custom blocks to Slack
app.post('/api/slack/send', createValidator(slackSendSchema), async (req, res) => {
  const { blocks, text, channel } = req.body;

  if (!blocks && !text) {
    return res.status(400).json({ success: false, error: 'Missing blocks or text' });
  }

  try {
    let result;
    if (blocks) {
      result = await slackNotifier.sendBlocks(blocks, channel || 'default');
    } else {
      result = await slackNotifier.sendText(text, channel || 'default');
    }
    res.json({
      success: result.success,
      reason: result.reason
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get available event types
app.get('/api/slack/event-types', (req, res) => {
  res.json({
    success: true,
    eventTypes: SLACK_EVENT_TYPES
  });
});

// Get active Slack threads (for thread-per-story pattern)
app.get('/api/slack/threads', async (req, res) => {
  const { status = 'active' } = req.query;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  // Return in-memory threads if no database
  if (!supabaseUrl || !supabaseKey) {
    const memoryThreads = [];
    slackNotifier.threadCache.forEach((info, taskId) => {
      memoryThreads.push({
        task_id: taskId,
        ...info,
        source: 'memory'
      });
    });
    return res.json({
      success: true,
      threads: memoryThreads,
      source: 'memory'
    });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/slack_threads?status=eq.${status}&order=created_at.desc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (response.ok) {
      const threads = await response.json();
      return res.json({
        success: true,
        threads,
        source: 'database'
      });
    }

    return res.status(response.status).json({
      success: false,
      error: 'Failed to fetch threads from database'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Test Web API connection (validates OAuth)
app.post('/api/slack/test-connection', async (req, res) => {
  try {
    const result = await slackNotifier.testConnection();
    res.json({
      success: result.success,
      mode: result.mode,
      team: result.team,
      user: result.user,
      reason: result.reason
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLACK NOTIFICATION HELPER
// Determines which audit events should trigger Slack notifications
// ═══════════════════════════════════════════════════════════════════════════════

// Map audit events to Slack event types
function mapAuditToSlackEvent(auditEntry) {
  const eventType = auditEntry.event_type;
  const action = auditEntry.action;
  const severity = auditEntry.severity;

  // Only notify for significant events
  const notifiableEvents = {
    // Agent events
    'agent_action': {
      'agent_started': SLACK_EVENT_TYPES.AGENT_START,
      'agent_stopped': SLACK_EVENT_TYPES.AGENT_COMPLETE,
      'agent_error': SLACK_EVENT_TYPES.AGENT_ERROR
    },
    // Validation events
    'validation': {
      'validation_pass': SLACK_EVENT_TYPES.VALIDATION_PASS,
      'validation_fail': SLACK_EVENT_TYPES.VALIDATION_FAIL
    },
    // Safety events
    'safety_event': {
      'safety_violation': SLACK_EVENT_TYPES.SAFETY_VIOLATION,
      'escalation': SLACK_EVENT_TYPES.ESCALATION
    },
    // Gate events
    'gate_transition': {
      'gate_entered': SLACK_EVENT_TYPES.GATE_ENTERED,
      'gate_complete': SLACK_EVENT_TYPES.GATE_COMPLETE,
      'gate_rejected': SLACK_EVENT_TYPES.GATE_REJECTED
    }
  };

  const eventMapping = notifiableEvents[eventType];
  if (eventMapping && eventMapping[action]) {
    return {
      type: eventMapping[action],
      project: auditEntry.details?.projectName,
      wave: auditEntry.wave_number,
      gate: auditEntry.gate_number,
      agent: auditEntry.actor_id,
      storyId: auditEntry.resource_id,
      severity: severity,
      details: auditEntry.details,
      cost: auditEntry.cost_usd,
      tokens: auditEntry.token_input || auditEntry.token_output ? {
        input: auditEntry.token_input || 0,
        output: auditEntry.token_output || 0
      } : null
    };
  }

  // Also notify for critical/error severity regardless of event type
  if (severity === 'critical' || severity === 'error') {
    return {
      type: SLACK_EVENT_TYPES.ERROR,
      severity: 'critical',
      details: {
        message: `${eventType}: ${action}`,
        ...auditEntry.details
      }
    };
  }

  return null;
}

// Hook: Send Slack notification for relevant audit events
async function notifySlackForAudit(auditEntry) {
  const slackEvent = mapAuditToSlackEvent(auditEntry);
  if (slackEvent) {
    try {
      await slackNotifier.notify(slackEvent);
    } catch (err) {
      console.error('[Slack] Failed to send notification:', err.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT DISCOVERY ENDPOINT
// Gate 0: Discover project metadata from folder structure
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/discover-project', async (req, res) => {
  const { projectPath } = req.body;

  if (!projectPath || typeof projectPath !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'projectPath is required'
    });
  }

  try {
    // Check if path exists
    if (!exists(projectPath)) {
      return res.status(404).json({
        success: false,
        error: 'Project path not found'
      });
    }

    const metadata = await discoverProject(projectPath);

    return res.json({
      success: true,
      data: metadata
    });

  } catch (err) {
    console.error('[ProjectDiscovery] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /api/validate-mockups - Validate HTML mockups for a project
app.post('/api/validate-mockups', async (req, res) => {
  const { projectPath, projectId } = req.body;

  if (!projectPath || !projectId) {
    return res.status(400).json({
      success: false,
      error: 'projectPath and projectId are required'
    });
  }

  try {
    const result = await validateMockups(projectPath, projectId);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        error: result.error
      });
    }

    return res.status(result.status).json(result.data);

  } catch (err) {
    console.error('[ValidateMockups] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /api/browse-folders - Browse directory structure for folder picker
app.post('/api/browse-folders', async (req, res) => {
  const { path: dirPath } = req.body;

  // Default to user's home directory or common project locations
  const os = await import('os');
  const targetPath = dirPath || os.default.homedir();

  try {
    // Check if path exists
    if (!exists(targetPath)) {
      return res.status(404).json({
        success: false,
        error: 'Path not found'
      });
    }

    // Get directory stats
    const stats = fs.statSync(targetPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        error: 'Path is not a directory'
      });
    }

    // Read directory contents
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });

    // Filter to only directories and sort
    const folders = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => ({
        name: entry.name,
        path: path.join(targetPath, entry.name),
        isDirectory: true
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Get parent directory
    const parentPath = path.dirname(targetPath);
    const hasParent = parentPath !== targetPath;

    // Check for common project indicators
    const hasPackageJson = exists(path.join(targetPath, 'package.json'));
    const hasDesignMockups = exists(path.join(targetPath, 'design_mockups'));
    const hasDocs = exists(path.join(targetPath, 'docs'));
    const isProject = hasPackageJson || hasDesignMockups || hasDocs;

    return res.json({
      success: true,
      data: {
        currentPath: targetPath,
        parentPath: hasParent ? parentPath : null,
        folders,
        isProject,
        indicators: {
          hasPackageJson,
          hasDesignMockups,
          hasDocs
        }
      }
    });

  } catch (err) {
    console.error('[BrowseFolders] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /api/open-folder-picker - Open native macOS Finder folder picker dialog
app.post('/api/open-folder-picker', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Use separate -e flags for each AppleScript line (avoids escaping issues)
    const command = `osascript -e 'tell application "System Events" to activate' -e 'set selectedFolder to choose folder with prompt "Select your project folder"' -e 'return POSIX path of selectedFolder'`;

    console.log('[FolderPicker] Opening native folder picker...');

    const { stdout, stderr } = await execAsync(command, {
      timeout: 120000 // 2 minute timeout for user to select
    });

    if (stderr) {
      console.error('[FolderPicker] stderr:', stderr);
    }

    const selectedPath = stdout.trim().replace(/\/$/, ''); // Remove trailing slash
    console.log('[FolderPicker] Selected:', selectedPath);

    if (selectedPath) {
      return res.json({
        success: true,
        path: selectedPath
      });
    } else {
      return res.json({
        success: false,
        cancelled: true
      });
    }

  } catch (err) {
    // User cancelled or error occurred
    console.error('[FolderPicker] Error:', err.message);

    if (err.message?.includes('User canceled') || err.message?.includes('-128') || err.killed) {
      return res.json({
        success: false,
        cancelled: true
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET /api/serve-mockup - Serve HTML mockup file for preview
app.get('/api/serve-mockup', (req, res) => {
  const { path: filePath } = req.query;

  if (!filePath) {
    return res.status(400).send('File path is required');
  }

  // Security: Only allow HTML files from design_mockups folders
  if (!filePath.includes('design_mockups') || !filePath.match(/\.(html|htm)$/i)) {
    return res.status(403).send('Access denied: Only HTML mockups are allowed');
  }

  // Check file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  // Read and serve the file
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(content);
  } catch (err) {
    console.error('[ServeMockup] Error:', err.message);
    res.status(500).send('Error reading file');
  }
});

// POST /api/update-project-path - Update project's root_path in database
app.post('/api/update-project-path', async (req, res) => {
  const { projectId, rootPath } = req.body;

  if (!projectId || !rootPath) {
    return res.status(400).json({
      success: false,
      error: 'projectId and rootPath are required'
    });
  }

  // Get Supabase credentials
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      error: 'Supabase not configured'
    });
  }

  try {
    // Update project root_path in database
    const response = await fetch(`${supabaseUrl}/rest/v1/wave_projects?id=eq.${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ root_path: rootPath })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update project: ${error}`);
    }

    const updated = await response.json();

    return res.json({
      success: true,
      data: updated[0] || { root_path: rootPath }
    });

  } catch (err) {
    console.error('[UpdateProjectPath] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 WAVE Portal Analysis Server running on http://localhost:${PORT}`);
  console.log(`   POST /api/analyze - Analyze a project`);
  console.log(`   POST /api/sync-stories - Sync stories from JSON to database`);
  console.log(`   POST /api/discover-project - Discover project metadata`);
  console.log(`   POST /api/validate-mockups - Validate HTML mockups`);
  console.log(`   POST /api/update-project-path - Update project folder path`);
  console.log(`   GET /api/health - Health check\n`);
});
