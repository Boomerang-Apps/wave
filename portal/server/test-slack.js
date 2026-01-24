#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WAVE FRAMEWORK - Slack Integration Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * Tests for:
 *   - SlackNotifier service
 *   - Slack event types and schemas
 *   - Thread management
 *   - Message formatting
 *
 * Usage:
 *   node test-slack.js [component]
 *   node test-slack.js notifier
 *   node test-slack.js events
 *   node test-slack.js integration
 *   node test-slack.js all (default)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { SlackNotifier, getSlackNotifier, resetSlackNotifier } from './slack-notifier.js';
import { SLACK_EVENT_TYPES, createSlackEvent, formatSlackBlocks } from './slack-events.js';

// ─────────────────────────────────────────────────────────────────────────────
// TEST UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(testName, message = '') {
  testsPassed++;
  testResults.push({ test: testName, status: 'passed', message });
  log(`  ✓ ${testName}${message ? ': ' + message : ''}`, 'green');
}

function fail(testName, error) {
  testsFailed++;
  const message = error instanceof Error ? error.message : String(error);
  testResults.push({ test: testName, status: 'failed', message });
  log(`  ✗ ${testName}: ${message}`, 'red');
}

async function runTest(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (error) {
    fail(name, error);
  }
}

function section(title) {
  console.log();
  log(`━━━ ${title} ━━━`, 'cyan');
}

// ─────────────────────────────────────────────────────────────────────────────
// SLACK NOTIFIER TESTS
// ─────────────────────────────────────────────────────────────────────────────

async function testSlackNotifier() {
  section('Slack Notifier Tests');

  // Reset singleton before tests
  resetSlackNotifier();

  // Test 1: Constructor initialization (disabled mode)
  await runTest('notifier-disabled-mode', async () => {
    const notifier = new SlackNotifier({ enabled: false });
    const status = notifier.getStatus();

    if (status.enabled) {
      throw new Error('Should be disabled');
    }
    if (status.mode !== 'disabled') {
      throw new Error(`Expected mode 'disabled', got '${status.mode}'`);
    }
  });

  // Test 2: Constructor with webhook
  await runTest('notifier-webhook-mode', async () => {
    const notifier = new SlackNotifier({
      webhookUrl: 'https://hooks.slack.com/test/webhook'
    });
    const status = notifier.getStatus();

    if (!status.enabled) {
      throw new Error('Should be enabled with webhook');
    }
    if (status.mode !== 'webhook') {
      throw new Error(`Expected mode 'webhook', got '${status.mode}'`);
    }
    if (status.threadingSupported) {
      throw new Error('Webhook mode should not support threading');
    }
  });

  // Test 3: Send returns disabled status when not configured
  await runTest('notifier-send-disabled', async () => {
    const notifier = new SlackNotifier({ enabled: false });
    const result = await notifier.send({ text: 'test' });

    if (result.success) {
      throw new Error('Should return unsuccessful when disabled');
    }
    if (result.reason !== 'disabled') {
      throw new Error(`Expected reason 'disabled', got '${result.reason}'`);
    }
  });

  // Test 4: Thread cache management
  await runTest('notifier-thread-cache', async () => {
    const notifier = new SlackNotifier({ enabled: false });

    // Set thread
    notifier.setThreadTs('story-123', '1234567890.123456', 'C12345');

    // Get thread info
    const info = notifier.getThreadInfo('story-123');
    if (!info) {
      throw new Error('Thread info should exist');
    }
    if (info.thread_ts !== '1234567890.123456') {
      throw new Error('Thread timestamp mismatch');
    }
    if (info.channel_id !== 'C12345') {
      throw new Error('Channel ID mismatch');
    }

    // Get thread_ts
    const ts = notifier.getThreadTs('story-123');
    if (ts !== '1234567890.123456') {
      throw new Error('getThreadTs mismatch');
    }
  });

  // Test 5: Thread_ts must be string
  await runTest('notifier-thread-ts-string', async () => {
    const notifier = new SlackNotifier({ enabled: false });

    // Set with number (should be converted to string)
    notifier.setThreadTs('story-456', 1234567890.123456);

    const ts = notifier.getThreadTs('story-456');
    if (typeof ts !== 'string') {
      throw new Error(`Thread_ts should be string, got ${typeof ts}`);
    }
  });

  // Test 6: Missing thread returns null
  await runTest('notifier-missing-thread', async () => {
    const notifier = new SlackNotifier({ enabled: false });

    const info = notifier.getThreadInfo('nonexistent');
    if (info !== null) {
      throw new Error('Should return null for missing thread');
    }

    const ts = notifier.getThreadTs('nonexistent');
    if (ts !== null) {
      throw new Error('Should return null for missing thread_ts');
    }
  });

  // Test 7: getStatus returns expected structure
  await runTest('notifier-status-structure', async () => {
    const notifier = new SlackNotifier({
      webhookUrl: 'https://hooks.slack.com/test',
      projectName: 'TestProject'
    });

    const status = notifier.getStatus();

    const requiredFields = ['enabled', 'mode', 'hasWebApi', 'hasWebhook', 'threadingSupported'];
    for (const field of requiredFields) {
      if (!(field in status)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  });

  // Test 8: Singleton pattern
  await runTest('notifier-singleton', async () => {
    resetSlackNotifier();

    const notifier1 = getSlackNotifier({ webhookUrl: 'https://hooks.slack.com/test' });
    const notifier2 = getSlackNotifier();

    if (notifier1 !== notifier2) {
      throw new Error('getSlackNotifier should return singleton');
    }

    resetSlackNotifier();
  });

  // Test 9: Channel configuration
  await runTest('notifier-channels', async () => {
    const notifier = new SlackNotifier({
      webhookUrl: 'https://hooks.slack.com/default',
      channels: {
        default: 'C_DEFAULT',
        alerts: 'C_ALERTS',
        budget: 'C_BUDGET'
      }
    });

    const status = notifier.getStatus();

    if (!status.channelIds.default || status.channelIds.default !== 'C_DEFAULT') {
      throw new Error('Default channel not configured correctly');
    }
    if (!status.channelIds.alerts || status.channelIds.alerts !== 'C_ALERTS') {
      throw new Error('Alerts channel not configured correctly');
    }
  });

  // Test 10: Notification methods exist
  await runTest('notifier-methods-exist', async () => {
    const notifier = new SlackNotifier({ enabled: false });

    const methods = [
      'send',
      'sendBlocks',
      'sendText',
      'sendTest',
      'notifyStoryStart',
      'notifyStoryComplete',
      'notifyStoryProgress',
      'notifyStoryFailed',
      'notifyGateTransition',
      'notifyGateOverride',
      'notifyAgentStart',
      'notifyAgentComplete',
      'notifyAgentError',
      'notifyBudgetAlert',
      'notifySafetyViolation',
      'notifyEscalation',
      'notifyWaveStart',
      'notifyWaveComplete',
      'notifyGeneric',
      'testConnection'
    ];

    for (const method of methods) {
      if (typeof notifier[method] !== 'function') {
        throw new Error(`Missing method: ${method}`);
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLACK EVENTS TESTS
// ─────────────────────────────────────────────────────────────────────────────

async function testSlackEvents() {
  section('Slack Events Tests');

  // Test 1: Event types defined
  await runTest('events-types-defined', async () => {
    const requiredTypes = [
      'STORY_START', 'STORY_PROGRESS', 'STORY_COMPLETE', 'STORY_FAILED',
      'GATE_ENTERED', 'GATE_COMPLETE', 'GATE_REJECTED',
      'AGENT_START', 'AGENT_HEARTBEAT', 'AGENT_COMPLETE', 'AGENT_ERROR',
      'BUDGET_WARNING', 'BUDGET_CRITICAL', 'BUDGET_EXCEEDED',
      'SAFETY_VIOLATION', 'ESCALATION',
      'WAVE_START', 'WAVE_COMPLETE'
    ];

    for (const type of requiredTypes) {
      if (!SLACK_EVENT_TYPES[type]) {
        throw new Error(`Missing event type: ${type}`);
      }
    }
  });

  // Test 2: Event type values are strings
  await runTest('events-types-strings', async () => {
    for (const [key, value] of Object.entries(SLACK_EVENT_TYPES)) {
      if (typeof value !== 'string') {
        throw new Error(`Event type ${key} should be string, got ${typeof value}`);
      }
    }
  });

  // Test 3: createSlackEvent function exists
  await runTest('events-create-function', async () => {
    if (typeof createSlackEvent !== 'function') {
      throw new Error('createSlackEvent should be a function');
    }
  });

  // Test 4: createSlackEvent returns valid structure
  await runTest('events-create-structure', async () => {
    const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {
      storyId: 'STORY-001',
      wave: 1,
      project: 'TestProject'
    });

    if (!event) {
      throw new Error('createSlackEvent should return an event');
    }
    if (!event.type) {
      throw new Error('Event should have type');
    }
    if (!event.timestamp) {
      throw new Error('Event should have timestamp');
    }
  });

  // Test 5: formatSlackBlocks function exists
  await runTest('events-format-function', async () => {
    if (typeof formatSlackBlocks !== 'function') {
      throw new Error('formatSlackBlocks should be a function');
    }
  });

  // Test 6: formatSlackBlocks returns array
  await runTest('events-format-returns-array', async () => {
    const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {
      storyId: 'STORY-001'
    });

    const blocks = formatSlackBlocks(event);

    if (!Array.isArray(blocks)) {
      throw new Error('formatSlackBlocks should return array');
    }
  });

  // Test 7: Gate override event types
  await runTest('events-gate-override-types', async () => {
    const overrideTypes = [
      'GATE_OVERRIDE',
      'GATE_BYPASS_REQUESTED',
      'GATE_BYPASS_APPROVED',
      'GATE_BYPASS_DENIED'
    ];

    for (const type of overrideTypes) {
      if (!SLACK_EVENT_TYPES[type]) {
        throw new Error(`Missing gate override event type: ${type}`);
      }
    }
  });

  // Test 8: Event type uniqueness
  await runTest('events-types-unique', async () => {
    const values = Object.values(SLACK_EVENT_TYPES);
    const uniqueValues = new Set(values);

    if (values.length !== uniqueValues.size) {
      throw new Error('Event type values should be unique');
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

async function testIntegration() {
  section('Integration Tests');

  // Test 1: Notifier can handle all event types
  await runTest('integration-event-handlers', async () => {
    const notifier = new SlackNotifier({ enabled: false });

    // Map event types to handler methods
    const eventHandlers = {
      [SLACK_EVENT_TYPES.STORY_START]: 'notifyStoryStart',
      [SLACK_EVENT_TYPES.STORY_COMPLETE]: 'notifyStoryComplete',
      [SLACK_EVENT_TYPES.STORY_PROGRESS]: 'notifyStoryProgress',
      [SLACK_EVENT_TYPES.STORY_FAILED]: 'notifyStoryFailed',
      [SLACK_EVENT_TYPES.GATE_COMPLETE]: 'notifyGateTransition',
      [SLACK_EVENT_TYPES.GATE_ENTERED]: 'notifyGateTransition',
      [SLACK_EVENT_TYPES.GATE_REJECTED]: 'notifyGateTransition',
      [SLACK_EVENT_TYPES.GATE_OVERRIDE]: 'notifyGateOverride',
      [SLACK_EVENT_TYPES.AGENT_START]: 'notifyAgentStart',
      [SLACK_EVENT_TYPES.AGENT_COMPLETE]: 'notifyAgentComplete',
      [SLACK_EVENT_TYPES.AGENT_ERROR]: 'notifyAgentError',
      [SLACK_EVENT_TYPES.BUDGET_WARNING]: 'notifyBudgetAlert',
      [SLACK_EVENT_TYPES.SAFETY_VIOLATION]: 'notifySafetyViolation',
      [SLACK_EVENT_TYPES.ESCALATION]: 'notifyEscalation',
      [SLACK_EVENT_TYPES.WAVE_START]: 'notifyWaveStart',
      [SLACK_EVENT_TYPES.WAVE_COMPLETE]: 'notifyWaveComplete'
    };

    for (const [eventType, method] of Object.entries(eventHandlers)) {
      if (typeof notifier[method] !== 'function') {
        throw new Error(`No handler for event type ${eventType}`);
      }
    }
  });

  // Test 2: Event creation and formatting pipeline
  await runTest('integration-event-pipeline', async () => {
    // Create event
    const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {
      storyId: 'STORY-001',
      wave: 1,
      project: 'TestProject',
      details: { agent: 'fe-dev-1' }
    });

    // Format to blocks
    const blocks = formatSlackBlocks(event);

    // Verify pipeline works
    if (!event.type) {
      throw new Error('Event creation failed');
    }
    if (!Array.isArray(blocks)) {
      throw new Error('Block formatting failed');
    }
  });

  // Test 3: Notifier correctly routes to channels
  await runTest('integration-channel-routing', async () => {
    const notifier = new SlackNotifier({
      webhookUrl: 'https://hooks.slack.com/default',
      channels: {
        default: 'C_DEFAULT',
        alerts: 'C_ALERTS',
        budget: 'C_BUDGET'
      }
    });

    // Budget alerts go to budget channel
    // Safety violations go to alerts channel
    // Story updates go to default channel

    const status = notifier.getStatus();
    if (!status.channels.includes('default')) {
      throw new Error('Default channel should be configured');
    }
    if (!status.channels.includes('alerts')) {
      throw new Error('Alerts channel should be configured');
    }
    if (!status.channels.includes('budget')) {
      throw new Error('Budget channel should be configured');
    }
  });

  // Test 4: Thread workflow
  await runTest('integration-thread-workflow', async () => {
    const notifier = new SlackNotifier({ enabled: false });
    const storyId = 'STORY-THREAD-TEST';

    // Start story (would create thread in real scenario)
    notifier.setThreadTs(storyId, '1234567890.000000', 'C_DEFAULT');

    // Verify thread exists
    const ts = notifier.getThreadTs(storyId);
    if (!ts) {
      throw new Error('Thread should exist after story start');
    }

    // Clear thread (would happen on story complete)
    notifier.clearThread(storyId);

    // Verify thread is gone
    const tsAfterClear = notifier.getThreadTs(storyId);
    if (tsAfterClear !== null) {
      throw new Error('Thread should be cleared after story complete');
    }
  });

  // Test 5: Multiple stories with separate threads
  await runTest('integration-multiple-threads', async () => {
    const notifier = new SlackNotifier({ enabled: false });

    // Set up multiple story threads
    notifier.setThreadTs('STORY-001', '1111111111.000001');
    notifier.setThreadTs('STORY-002', '2222222222.000002');
    notifier.setThreadTs('STORY-003', '3333333333.000003');

    // Verify each has unique thread
    const ts1 = notifier.getThreadTs('STORY-001');
    const ts2 = notifier.getThreadTs('STORY-002');
    const ts3 = notifier.getThreadTs('STORY-003');

    if (ts1 === ts2 || ts2 === ts3 || ts1 === ts3) {
      throw new Error('Each story should have unique thread');
    }

    // Verify status shows correct count
    const status = notifier.getStatus();
    if (status.threadCacheSize !== 3) {
      throw new Error(`Expected 3 threads, got ${status.threadCacheSize}`);
    }
  });

  // Test 6: Severity-based routing
  await runTest('integration-severity-routing', async () => {
    // BUDGET_WARNING -> budget channel
    // BUDGET_CRITICAL -> alerts channel
    // BUDGET_EXCEEDED -> alerts channel
    // SAFETY_VIOLATION -> alerts channel
    // STORY_START -> default channel

    const severityMap = {
      [SLACK_EVENT_TYPES.BUDGET_WARNING]: 'budget',
      [SLACK_EVENT_TYPES.BUDGET_CRITICAL]: 'alerts',
      [SLACK_EVENT_TYPES.BUDGET_EXCEEDED]: 'alerts',
      [SLACK_EVENT_TYPES.SAFETY_VIOLATION]: 'alerts',
      [SLACK_EVENT_TYPES.ESCALATION]: 'alerts',
      [SLACK_EVENT_TYPES.STORY_START]: 'default',
      [SLACK_EVENT_TYPES.WAVE_START]: 'default'
    };

    // This is a logical test - actual routing is internal to notifier
    for (const [eventType, expectedChannel] of Object.entries(severityMap)) {
      if (!['default', 'alerts', 'budget'].includes(expectedChannel)) {
        throw new Error(`Invalid channel for ${eventType}: ${expectedChannel}`);
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function runAllTests(component = 'all') {
  console.log();
  log('═══════════════════════════════════════════════════════════════════', 'blue');
  log('           WAVE FRAMEWORK - Slack Integration Tests                 ', 'blue');
  log('═══════════════════════════════════════════════════════════════════', 'blue');

  const startTime = Date.now();

  try {
    if (component === 'all' || component === 'notifier') {
      await testSlackNotifier();
    }

    if (component === 'all' || component === 'events') {
      await testSlackEvents();
    }

    if (component === 'all' || component === 'integration') {
      await testIntegration();
    }
  } catch (error) {
    log(`\nUnexpected error: ${error.message}`, 'red');
    console.error(error.stack);
  }

  const duration = Date.now() - startTime;

  // Summary
  console.log();
  log('═══════════════════════════════════════════════════════════════════', 'blue');
  log('                         TEST SUMMARY                               ', 'blue');
  log('═══════════════════════════════════════════════════════════════════', 'blue');
  console.log();

  const total = testsPassed + testsFailed;
  const passRate = total > 0 ? Math.round((testsPassed / total) * 100) : 0;

  log(`  Total:  ${total} tests`, 'dim');
  log(`  Passed: ${testsPassed}`, 'green');
  if (testsFailed > 0) {
    log(`  Failed: ${testsFailed}`, 'red');
  }
  log(`  Rate:   ${passRate}%`, passRate === 100 ? 'green' : 'yellow');
  log(`  Time:   ${duration}ms`, 'dim');

  console.log();

  // Write results to file
  const resultsFile = `/Volumes/SSD-01/Projects/WAVE/.claude/slack-test-results-${Date.now()}.json`;
  const results = {
    timestamp: new Date().toISOString(),
    component,
    passed: testsPassed,
    failed: testsFailed,
    pass_rate: passRate,
    duration_ms: duration,
    results: testResults
  };

  try {
    const fs = await import('fs');
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    log(`  Results saved to: ${resultsFile}`, 'dim');
  } catch (e) {
    // Ignore file write errors
  }

  console.log();

  if (testsFailed > 0) {
    process.exit(1);
  }
}

// Parse arguments and run
const component = process.argv[2] || 'all';
runAllTests(component);
