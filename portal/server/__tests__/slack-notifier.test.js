// ═══════════════════════════════════════════════════════════════════════════════
// SLACK NOTIFIER TESTS
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for Slack notification service with thread support and retry logic
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SlackNotifier,
  getSlackNotifier,
  resetSlackNotifier
} from '../slack-notifier.js';
import { SLACK_EVENT_TYPES, createSlackEvent } from '../slack-events.js';

// Mock the dependencies
vi.mock('@slack/web-api', () => {
  const mockPostMessage = vi.fn().mockResolvedValue({
    ok: true,
    ts: '1234567890.123456',
    channel: 'C0123456789'
  });
  const mockAuthTest = vi.fn().mockResolvedValue({
    ok: true,
    team: 'test-team',
    user: 'test-bot',
    bot_id: 'B0123456789'
  });

  return {
    WebClient: class MockWebClient {
      constructor() {
        this.chat = { postMessage: mockPostMessage };
        this.auth = { test: mockAuthTest };
      }
    }
  };
});

vi.mock('../utils/secret-redactor.js', () => ({
  secretRedactor: {
    redactSlackPayload: vi.fn((payload) => payload)
  }
}));

describe('SlackNotifier', () => {
  let notifier;

  beforeEach(() => {
    // Reset singleton
    resetSlackNotifier();

    // Create notifier with Web API (bot token)
    notifier = new SlackNotifier({
      botToken: 'xoxb-test-token',
      enabled: true,
      projectName: 'Test Project',
      channels: {
        default: 'C0123456789',
        alerts: 'C0123456789',
        budget: 'C0123456789'
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Constructor and Configuration
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Constructor', () => {
    it('should be enabled with bot token', () => {
      expect(notifier.enabled).toBe(true);
    });

    it('should be disabled without credentials', () => {
      const disabled = new SlackNotifier({ enabled: false });
      expect(disabled.enabled).toBe(false);
    });

    it('should store project name', () => {
      expect(notifier.projectName).toBe('Test Project');
    });

    it('should initialize thread cache', () => {
      expect(notifier.threadCache).toBeInstanceOf(Map);
      expect(notifier.threadCache.size).toBe(0);
    });

    it('should initialize retry manager', () => {
      expect(notifier.retryManager).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Thread Management
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Thread Management', () => {
    it('should store thread info', () => {
      notifier.setThreadTs('STORY-001', '1234567890.123456', 'C0123456789');

      const info = notifier.getThreadInfo('STORY-001');

      expect(info.thread_ts).toBe('1234567890.123456');
      expect(info.channel_id).toBe('C0123456789');
    });

    it('should return thread_ts as string', () => {
      notifier.setThreadTs('STORY-001', 1234567890.123456, 'C0123456789');

      const threadTs = notifier.getThreadTs('STORY-001');

      expect(typeof threadTs).toBe('string');
    });

    it('should return null for unknown story', () => {
      expect(notifier.getThreadTs('UNKNOWN')).toBeNull();
      expect(notifier.getThreadInfo('UNKNOWN')).toBeNull();
    });

    it('should increment thread count', () => {
      notifier.setThreadTs('STORY-001', '1234567890.123456');
      expect(notifier.getThreadInfo('STORY-001').message_count).toBe(1);

      notifier.incrementThreadCount('STORY-001');
      expect(notifier.getThreadInfo('STORY-001').message_count).toBe(2);
    });

    it('should clear thread', () => {
      notifier.setThreadTs('STORY-001', '1234567890.123456');
      expect(notifier.getThreadTs('STORY-001')).toBeDefined();

      notifier.clearThread('STORY-001');
      expect(notifier.getThreadTs('STORY-001')).toBeNull();
    });

    it('should load threads from object', () => {
      const threads = {
        'STORY-001': { thread_ts: '111.111', channel_id: 'C001' },
        'STORY-002': { thread_ts: '222.222', channel_id: 'C002' }
      };

      notifier.loadThreads(threads);

      expect(notifier.threadCache.size).toBe(2);
      expect(notifier.getThreadTs('STORY-001')).toBe('111.111');
      expect(notifier.getThreadTs('STORY-002')).toBe('222.222');
    });

    it('should load threads from Map', () => {
      const threads = new Map();
      threads.set('STORY-001', { thread_ts: '111.111' });

      notifier.loadThreads(threads);

      expect(notifier.getThreadTs('STORY-001')).toBe('111.111');
    });

    it('should call onThreadCreated callback', () => {
      const callback = vi.fn();
      notifier.onThreadCreated = callback;

      notifier.setThreadTs('STORY-001', '1234567890.123456', 'C0123456789');

      expect(callback).toHaveBeenCalledWith('STORY-001', expect.objectContaining({
        thread_ts: '1234567890.123456',
        channel_id: 'C0123456789'
      }));
    });

    it('should call onThreadUpdated callback', () => {
      const callback = vi.fn();
      notifier.onThreadUpdated = callback;

      notifier.setThreadTs('STORY-001', '1234567890.123456');
      notifier.incrementThreadCount('STORY-001');

      expect(callback).toHaveBeenCalledWith('STORY-001', expect.objectContaining({
        message_count: 2
      }));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Status
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Status', () => {
    it('should return status object', () => {
      const status = notifier.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.mode).toBe('web_api');
      expect(status.hasWebApi).toBe(true);
      expect(status.threadingSupported).toBe(true);
    });

    it('should report thread cache size', () => {
      notifier.setThreadTs('STORY-001', '111.111');
      notifier.setThreadTs('STORY-002', '222.222');

      const status = notifier.getStatus();

      expect(status.threadCacheSize).toBe(2);
      expect(status.activeThreads).toContain('STORY-001');
      expect(status.activeThreads).toContain('STORY-002');
    });

    it('should report webhook mode when no bot token', () => {
      const webhookNotifier = new SlackNotifier({
        botToken: undefined,
        webhookUrl: 'https://hooks.slack.com/test',
        enabled: true
      });

      const status = webhookNotifier.getStatus();

      expect(status.mode).toBe('webhook');
      expect(status.threadingSupported).toBe(false);
    });

    it('should report disabled mode', () => {
      const disabled = new SlackNotifier({
        botToken: undefined,
        webhookUrl: undefined,
        enabled: false
      });
      const status = disabled.getStatus();

      expect(status.enabled).toBe(false);
      expect(status.mode).toBe('disabled');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Sending Messages (Web API)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Send Messages', () => {
    it('should return disabled when not enabled', async () => {
      const disabled = new SlackNotifier({ enabled: false });

      const result = await disabled.send({ text: 'test' });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('disabled');
    });

    it('should send text message', async () => {
      const result = await notifier.sendText('Hello World');

      expect(result.success).toBe(true);
      expect(result.thread_ts).toBe('1234567890.123456');
    });

    it('should send blocks message', async () => {
      const blocks = [
        { type: 'section', text: { type: 'mrkdwn', text: 'Test' } }
      ];

      const result = await notifier.sendBlocks(blocks);

      expect(result.success).toBe(true);
    });

    it('should return thread_ts from response', async () => {
      const result = await notifier.send({ text: 'test' });

      expect(result.thread_ts).toBe('1234567890.123456');
      expect(result.channel_id).toBe('C0123456789');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Event Notifications
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Event Notifications', () => {
    it('should route story_start to notifyStoryStart', async () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {
        storyId: 'STORY-001',
        agent: 'fe-dev-1'
      });

      const result = await notifier.notify(event);

      expect(result.success).toBe(true);
    });

    it('should route gate_complete to notifyGateTransition', async () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.GATE_COMPLETE, {
        gate: 3,
        storyId: 'STORY-001'
      });

      const result = await notifier.notify(event);

      expect(result.success).toBe(true);
    });

    it('should route budget_warning to notifyBudgetAlert', async () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.BUDGET_WARNING, {
        details: { percentage: 80, spent: 8, limit: 10 }
      });

      const result = await notifier.notify(event);

      expect(result.success).toBe(true);
    });

    it('should route escalation to notifyEscalation', async () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.ESCALATION, {
        details: { reason: 'Manual review required' }
      });

      const result = await notifier.notify(event);

      expect(result.success).toBe(true);
    });

    it('should route unknown events to notifyGeneric', async () => {
      const event = createSlackEvent('custom_event', {
        details: { message: 'Custom message' }
      });

      const result = await notifier.notify(event);

      expect(result.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Story Lifecycle Threading
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Story Lifecycle Threading', () => {
    it('should create thread on story start', async () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {
        storyId: 'STORY-001',
        agent: 'fe-dev-1'
      });

      await notifier.notify(event);

      expect(notifier.getThreadTs('STORY-001')).toBe('1234567890.123456');
    });

    it('should reply to thread on story progress', async () => {
      // First create thread
      notifier.setThreadTs('STORY-001', '1234567890.123456', 'C0123456789');

      const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_PROGRESS, {
        storyId: 'STORY-001',
        details: { message: 'Working on it...' }
      });

      const result = await notifier.notify(event);

      expect(result.success).toBe(true);
    });

    it('should clear thread on story complete', async () => {
      // First create thread
      notifier.setThreadTs('STORY-001', '1234567890.123456', 'C0123456789');

      const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_COMPLETE, {
        storyId: 'STORY-001',
        agent: 'fe-dev-1',
        cost: 0.05
      });

      await notifier.notify(event);

      // Thread should be cleared after completion
      expect(notifier.getThreadTs('STORY-001')).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Gate Override Notifications
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Gate Override Notifications', () => {
    it('should notify gate override', async () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.GATE_OVERRIDE, {
        gate: 3,
        reason: 'Emergency fix',
        actor: 'admin@example.com'
      });

      const result = await notifier.notifyGateOverride(event);

      expect(result.success).toBe(true);
    });

    it('should also reply to story thread if exists', async () => {
      notifier.setThreadTs('STORY-001', '1234567890.123456', 'C0123456789');

      const event = createSlackEvent(SLACK_EVENT_TYPES.GATE_OVERRIDE, {
        gate: 3,
        storyId: 'STORY-001',
        reason: 'Test bypass'
      });

      const result = await notifier.notifyGateOverride(event);

      expect(result.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Test Connection
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Test Connection', () => {
    it('should test Web API connection', async () => {
      const result = await notifier.testConnection();

      expect(result.success).toBe(true);
      expect(result.mode).toBe('web_api');
      expect(result.team).toBe('test-team');
    });

    it('should return disabled when not enabled', async () => {
      const disabled = new SlackNotifier({ enabled: false });

      const result = await disabled.testConnection();

      expect(result.success).toBe(false);
      expect(result.reason).toBe('disabled');
    });

    it('should send test message', async () => {
      const result = await notifier.sendTest('Test message');

      expect(result.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Singleton Pattern
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Singleton', () => {
    it('should return same instance', () => {
      resetSlackNotifier();

      const first = getSlackNotifier({ botToken: 'xoxb-test' });
      const second = getSlackNotifier({ botToken: 'xoxb-different' });

      expect(first).toBe(second);
    });

    it('should create new instance after reset', () => {
      const first = getSlackNotifier({ botToken: 'xoxb-test' });
      resetSlackNotifier();
      const second = getSlackNotifier({ botToken: 'xoxb-different' });

      expect(first).not.toBe(second);
    });
  });
});
