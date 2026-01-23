// ═══════════════════════════════════════════════════════════════════════════════
// SLACK EVENTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for Slack event schema definitions and formatters
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  SLACK_EVENT_TYPES,
  SEVERITY_LEVELS,
  SEVERITY_TO_CHANNEL,
  EVENT_SEVERITY_MAP,
  createSlackEvent,
  formatSlackBlocks,
  getEventEmoji
} from '../slack-events.js';

describe('Slack Events', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Event Types
  // ─────────────────────────────────────────────────────────────────────────────

  describe('SLACK_EVENT_TYPES', () => {
    it('should define story lifecycle events', () => {
      expect(SLACK_EVENT_TYPES.STORY_START).toBe('story_start');
      expect(SLACK_EVENT_TYPES.STORY_PROGRESS).toBe('story_progress');
      expect(SLACK_EVENT_TYPES.STORY_COMPLETE).toBe('story_complete');
      expect(SLACK_EVENT_TYPES.STORY_FAILED).toBe('story_failed');
    });

    it('should define gate events', () => {
      expect(SLACK_EVENT_TYPES.GATE_ENTERED).toBe('gate_entered');
      expect(SLACK_EVENT_TYPES.GATE_COMPLETE).toBe('gate_complete');
      expect(SLACK_EVENT_TYPES.GATE_REJECTED).toBe('gate_rejected');
      expect(SLACK_EVENT_TYPES.GATE_OVERRIDE).toBe('gate_override');
    });

    it('should define agent events', () => {
      expect(SLACK_EVENT_TYPES.AGENT_START).toBe('agent_start');
      expect(SLACK_EVENT_TYPES.AGENT_COMPLETE).toBe('agent_complete');
      expect(SLACK_EVENT_TYPES.AGENT_ERROR).toBe('agent_error');
    });

    it('should define budget events', () => {
      expect(SLACK_EVENT_TYPES.BUDGET_WARNING).toBe('budget_warning');
      expect(SLACK_EVENT_TYPES.BUDGET_CRITICAL).toBe('budget_critical');
      expect(SLACK_EVENT_TYPES.BUDGET_EXCEEDED).toBe('budget_exceeded');
    });

    it('should define safety events', () => {
      expect(SLACK_EVENT_TYPES.SAFETY_VIOLATION).toBe('safety_violation');
      expect(SLACK_EVENT_TYPES.ESCALATION).toBe('escalation');
    });

    it('should define wave events', () => {
      expect(SLACK_EVENT_TYPES.WAVE_START).toBe('wave_start');
      expect(SLACK_EVENT_TYPES.WAVE_COMPLETE).toBe('wave_complete');
    });

    it('should define validation events', () => {
      expect(SLACK_EVENT_TYPES.VALIDATION_PASS).toBe('validation_pass');
      expect(SLACK_EVENT_TYPES.VALIDATION_FAIL).toBe('validation_fail');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Severity Levels
  // ─────────────────────────────────────────────────────────────────────────────

  describe('SEVERITY_LEVELS', () => {
    it('should define all severity levels', () => {
      expect(SEVERITY_LEVELS.DEBUG).toBe('debug');
      expect(SEVERITY_LEVELS.INFO).toBe('info');
      expect(SEVERITY_LEVELS.WARNING).toBe('warning');
      expect(SEVERITY_LEVELS.CRITICAL).toBe('critical');
      expect(SEVERITY_LEVELS.EMERGENCY).toBe('emergency');
    });
  });

  describe('SEVERITY_TO_CHANNEL', () => {
    it('should route info to default channel', () => {
      expect(SEVERITY_TO_CHANNEL.info).toBe('default');
    });

    it('should route warning and critical to alerts', () => {
      expect(SEVERITY_TO_CHANNEL.warning).toBe('alerts');
      expect(SEVERITY_TO_CHANNEL.critical).toBe('alerts');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Event Severity Mapping
  // ─────────────────────────────────────────────────────────────────────────────

  describe('EVENT_SEVERITY_MAP', () => {
    it('should map info events correctly', () => {
      expect(EVENT_SEVERITY_MAP[SLACK_EVENT_TYPES.STORY_START]).toBe(SEVERITY_LEVELS.INFO);
      expect(EVENT_SEVERITY_MAP[SLACK_EVENT_TYPES.STORY_COMPLETE]).toBe(SEVERITY_LEVELS.INFO);
      expect(EVENT_SEVERITY_MAP[SLACK_EVENT_TYPES.GATE_COMPLETE]).toBe(SEVERITY_LEVELS.INFO);
    });

    it('should map warning events correctly', () => {
      expect(EVENT_SEVERITY_MAP[SLACK_EVENT_TYPES.GATE_REJECTED]).toBe(SEVERITY_LEVELS.WARNING);
      expect(EVENT_SEVERITY_MAP[SLACK_EVENT_TYPES.BUDGET_WARNING]).toBe(SEVERITY_LEVELS.WARNING);
      expect(EVENT_SEVERITY_MAP[SLACK_EVENT_TYPES.VALIDATION_FAIL]).toBe(SEVERITY_LEVELS.WARNING);
    });

    it('should map critical events correctly', () => {
      expect(EVENT_SEVERITY_MAP[SLACK_EVENT_TYPES.STORY_FAILED]).toBe(SEVERITY_LEVELS.CRITICAL);
      expect(EVENT_SEVERITY_MAP[SLACK_EVENT_TYPES.BUDGET_EXCEEDED]).toBe(SEVERITY_LEVELS.CRITICAL);
      expect(EVENT_SEVERITY_MAP[SLACK_EVENT_TYPES.SAFETY_VIOLATION]).toBe(SEVERITY_LEVELS.CRITICAL);
      expect(EVENT_SEVERITY_MAP[SLACK_EVENT_TYPES.ESCALATION]).toBe(SEVERITY_LEVELS.CRITICAL);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // createSlackEvent
  // ─────────────────────────────────────────────────────────────────────────────

  describe('createSlackEvent', () => {
    it('should create event with required fields', () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {
        project: 'test-project',
        storyId: 'STORY-001'
      });

      expect(event.type).toBe('story_start');
      expect(event.project).toBe('test-project');
      expect(event.story_id).toBe('STORY-001');
      expect(event.timestamp).toBeDefined();
    });

    it('should set severity from event type', () => {
      const infoEvent = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {});
      const criticalEvent = createSlackEvent(SLACK_EVENT_TYPES.SAFETY_VIOLATION, {});

      expect(infoEvent.severity).toBe('info');
      expect(criticalEvent.severity).toBe('critical');
    });

    it('should allow severity override', () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {
        severity: 'critical'
      });

      expect(event.severity).toBe('critical');
    });

    it('should set channel based on severity', () => {
      const infoEvent = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {});
      const criticalEvent = createSlackEvent(SLACK_EVENT_TYPES.ESCALATION, {});

      expect(infoEvent.channel).toBe('default');
      expect(criticalEvent.channel).toBe('alerts');
    });

    it('should include wave and gate context', () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.GATE_COMPLETE, {
        wave: 2,
        gate: 3
      });

      expect(event.wave).toBe(2);
      expect(event.gate).toBe(3);
    });

    it('should include agent information', () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.AGENT_START, {
        agent: 'fe-dev-1'
      });

      expect(event.agent).toBe('fe-dev-1');
    });

    it('should include cost and tokens', () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_COMPLETE, {
        cost: 0.0125,
        tokens: { input: 1000, output: 500 }
      });

      expect(event.cost).toBe(0.0125);
      expect(event.tokens.input).toBe(1000);
      expect(event.tokens.output).toBe(500);
      expect(event.tokens.total).toBe(1500);
    });

    it('should merge details object', () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.AGENT_ERROR, {
        details: {
          error: 'Connection timeout',
          retries: 3
        }
      });

      expect(event.details.error).toBe('Connection timeout');
      expect(event.details.retries).toBe(3);
    });

    it('should use alternative field names', () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {
        projectName: 'alt-project',
        story_id: 'ALT-001',
        agentType: 'be-dev-1'
      });

      expect(event.project).toBe('alt-project');
      expect(event.story_id).toBe('ALT-001');
      expect(event.agent).toBe('be-dev-1');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getEventEmoji
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getEventEmoji', () => {
    it('should return success emojis', () => {
      expect(getEventEmoji(SLACK_EVENT_TYPES.STORY_COMPLETE)).toBe(':white_check_mark:');
      expect(getEventEmoji(SLACK_EVENT_TYPES.GATE_COMPLETE)).toBe(':white_check_mark:');
      expect(getEventEmoji(SLACK_EVENT_TYPES.WAVE_COMPLETE)).toBe(':trophy:');
    });

    it('should return progress emojis', () => {
      expect(getEventEmoji(SLACK_EVENT_TYPES.STORY_START)).toBe(':gear:');
      expect(getEventEmoji(SLACK_EVENT_TYPES.AGENT_START)).toBe(':robot_face:');
    });

    it('should return warning emojis', () => {
      expect(getEventEmoji(SLACK_EVENT_TYPES.BUDGET_WARNING)).toBe(':warning:');
      expect(getEventEmoji(SLACK_EVENT_TYPES.GATE_REJECTED)).toBe(':x:');
    });

    it('should return critical emojis', () => {
      expect(getEventEmoji(SLACK_EVENT_TYPES.SAFETY_VIOLATION)).toBe(':rotating_light:');
      expect(getEventEmoji(SLACK_EVENT_TYPES.ESCALATION)).toBe(':sos:');
      expect(getEventEmoji(SLACK_EVENT_TYPES.BUDGET_EXCEEDED)).toBe(':no_entry:');
    });

    it('should return default emoji for unknown type', () => {
      expect(getEventEmoji('unknown_event')).toBe(':bell:');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // formatSlackBlocks
  // ─────────────────────────────────────────────────────────────────────────────

  describe('formatSlackBlocks', () => {
    it('should return array of blocks', () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {
        storyId: 'STORY-001'
      });

      const blocks = formatSlackBlocks(event);

      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should include header for major events', () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.WAVE_START, {
        wave: 1
      });

      const blocks = formatSlackBlocks(event);
      const header = blocks.find(b => b.type === 'header');

      expect(header).toBeDefined();
      expect(header.text.type).toBe('plain_text');
    });

    it('should include section with main content', () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {
        storyId: 'STORY-001',
        details: { title: 'Test Story' }
      });

      const blocks = formatSlackBlocks(event);
      const section = blocks.find(b => b.type === 'section');

      expect(section).toBeDefined();
      expect(section.text.type).toBe('mrkdwn');
    });

    it('should include context footer', () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_START, {
        project: 'test-project',
        storyId: 'STORY-001'
      });

      const blocks = formatSlackBlocks(event);
      const context = blocks.filter(b => b.type === 'context');

      expect(context.length).toBeGreaterThan(0);
    });

    it('should include fields for structured data', () => {
      const event = createSlackEvent(SLACK_EVENT_TYPES.STORY_COMPLETE, {
        agent: 'fe-dev-1',
        wave: 2,
        cost: 0.05
      });

      const blocks = formatSlackBlocks(event);
      const hasFields = blocks.some(b => b.fields && b.fields.length > 0);

      expect(hasFields).toBe(true);
    });
  });
});
