/**
 * Emergency Handler Tests (GAP-015)
 *
 * TDD tests for emergency level automation (E1-E4).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  EMERGENCY_LEVELS,
  EmergencyHandler,
  getAgentsInDomain,
  getAgentsInWave
} from '../utils/emergency-handler.js';

// Test directory for signal files
const TEST_CLAUDE_DIR = '/tmp/test-emergency-handler';

describe('Emergency Handler (GAP-015)', () => {
  let handler;

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_CLAUDE_DIR)) {
      fs.mkdirSync(TEST_CLAUDE_DIR, { recursive: true });
    }

    // Create handler with test directory
    handler = new EmergencyHandler({
      claudeDir: TEST_CLAUDE_DIR
    });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_CLAUDE_DIR)) {
      const files = fs.readdirSync(TEST_CLAUDE_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(TEST_CLAUDE_DIR, file));
      }
    }
  });

  // =========================================================================
  // EMERGENCY_LEVELS Constant Tests
  // =========================================================================

  describe('EMERGENCY_LEVELS constant', () => {
    it('should have E1-E5 entries', () => {
      expect(EMERGENCY_LEVELS).toHaveProperty('E1');
      expect(EMERGENCY_LEVELS).toHaveProperty('E2');
      expect(EMERGENCY_LEVELS).toHaveProperty('E3');
      expect(EMERGENCY_LEVELS).toHaveProperty('E4');
      expect(EMERGENCY_LEVELS).toHaveProperty('E5');
    });

    it('should have level, name, description for each entry', () => {
      for (const [key, level] of Object.entries(EMERGENCY_LEVELS)) {
        expect(level).toHaveProperty('level', key);
        expect(level).toHaveProperty('name');
        expect(level).toHaveProperty('description');
        expect(typeof level.name).toBe('string');
        expect(typeof level.description).toBe('string');
      }
    });
  });

  // =========================================================================
  // Domain Agent Mapping Tests
  // =========================================================================

  describe('getAgentsInDomain()', () => {
    it('should return frontend agents', () => {
      const agents = getAgentsInDomain('frontend');
      expect(agents).toEqual(['fe-dev-1', 'fe-dev-2']);
    });

    it('should return backend agents', () => {
      const agents = getAgentsInDomain('backend');
      expect(agents).toEqual(['be-dev-1', 'be-dev-2']);
    });

    it('should return qa agents', () => {
      const agents = getAgentsInDomain('qa');
      expect(agents).toEqual(['qa']);
    });

    it('should return devfix agents', () => {
      const agents = getAgentsInDomain('devfix');
      expect(agents).toEqual(['dev-fix']);
    });

    it('should return management agents', () => {
      const agents = getAgentsInDomain('management');
      expect(agents).toEqual(['cto', 'pm']);
    });

    it('should return null for unknown domain', () => {
      const agents = getAgentsInDomain('unknown');
      expect(agents).toBeNull();
    });
  });

  // =========================================================================
  // Wave Agent Mapping Tests
  // =========================================================================

  describe('getAgentsInWave()', () => {
    it('should return wave 1 agents', () => {
      const agents = getAgentsInWave(1);
      expect(agents).toEqual(['fe-dev-1', 'be-dev-1']);
    });

    it('should return wave 2 agents', () => {
      const agents = getAgentsInWave(2);
      expect(agents).toEqual(['fe-dev-2', 'be-dev-2']);
    });

    it('should return null for unknown wave', () => {
      const agents = getAgentsInWave(99);
      expect(agents).toBeNull();
    });
  });

  // =========================================================================
  // E1: Agent Stop Tests
  // =========================================================================

  describe('triggerE1() - Agent Stop', () => {
    it('should create agent stop signal file', async () => {
      await handler.triggerE1('fe-dev-1', 'Test stop');

      const signalFile = path.join(TEST_CLAUDE_DIR, 'signal-fe-dev-1-stop.json');
      expect(fs.existsSync(signalFile)).toBe(true);

      const content = JSON.parse(fs.readFileSync(signalFile, 'utf8'));
      expect(content.signal_type).toBe('stop');
      expect(content.target_agent).toBe('fe-dev-1');
      expect(content.emergency_level).toBe('E1');
      expect(content.reason).toBe('Test stop');
    });

    it('should record event in history', async () => {
      await handler.triggerE1('fe-dev-1', 'Test stop');

      const history = handler.getEscalationHistory();
      expect(history.length).toBe(1);
      expect(history[0].level).toBe('E1');
      expect(history[0].target).toBe('fe-dev-1');
      expect(history[0].reason).toBe('Test stop');
    });

    it('should invoke callback with details', async () => {
      const callback = vi.fn();
      handler.onEmergency(callback);

      await handler.triggerE1('fe-dev-1', 'Test stop');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        level: 'E1',
        target: 'fe-dev-1',
        reason: 'Test stop',
        affectedAgents: ['fe-dev-1']
      }));
    });

    it('should return affected agent list', async () => {
      const result = await handler.triggerE1('fe-dev-1', 'Test stop');

      expect(result.affectedAgents).toEqual(['fe-dev-1']);
      expect(result.level).toBe('E1');
    });
  });

  // =========================================================================
  // E2: Domain Stop Tests
  // =========================================================================

  describe('triggerE2() - Domain Stop', () => {
    it('should create stop signals for domain agents', async () => {
      await handler.triggerE2('frontend', 'Domain maintenance');

      const signal1 = path.join(TEST_CLAUDE_DIR, 'signal-fe-dev-1-stop.json');
      const signal2 = path.join(TEST_CLAUDE_DIR, 'signal-fe-dev-2-stop.json');

      expect(fs.existsSync(signal1)).toBe(true);
      expect(fs.existsSync(signal2)).toBe(true);

      const content1 = JSON.parse(fs.readFileSync(signal1, 'utf8'));
      expect(content1.emergency_level).toBe('E2');
    });

    it('should record domain in history', async () => {
      await handler.triggerE2('frontend', 'Domain maintenance');

      const history = handler.getEscalationHistory();
      expect(history.length).toBe(1);
      expect(history[0].level).toBe('E2');
      expect(history[0].target).toBe('frontend');
    });

    it('should return all affected agents', async () => {
      const result = await handler.triggerE2('frontend', 'Domain maintenance');

      expect(result.affectedAgents).toEqual(['fe-dev-1', 'fe-dev-2']);
    });

    it('should throw for unknown domain', async () => {
      await expect(handler.triggerE2('unknown', 'Test'))
        .rejects.toThrow('Unknown domain: unknown');
    });
  });

  // =========================================================================
  // E3: Wave Stop Tests
  // =========================================================================

  describe('triggerE3() - Wave Stop', () => {
    it('should create stop signals for wave agents', async () => {
      await handler.triggerE3(1, 'Wave blocked');

      const signal1 = path.join(TEST_CLAUDE_DIR, 'signal-fe-dev-1-stop.json');
      const signal2 = path.join(TEST_CLAUDE_DIR, 'signal-be-dev-1-stop.json');

      expect(fs.existsSync(signal1)).toBe(true);
      expect(fs.existsSync(signal2)).toBe(true);
    });

    it('should create wave stop signal file', async () => {
      await handler.triggerE3(1, 'Wave blocked');

      const waveSignal = path.join(TEST_CLAUDE_DIR, 'signal-wave1-stop.json');
      expect(fs.existsSync(waveSignal)).toBe(true);

      const content = JSON.parse(fs.readFileSync(waveSignal, 'utf8'));
      expect(content.signal_type).toBe('wave-stop');
      expect(content.wave).toBe(1);
    });

    it('should return all affected agents', async () => {
      const result = await handler.triggerE3(1, 'Wave blocked');

      expect(result.affectedAgents).toEqual(['fe-dev-1', 'be-dev-1']);
    });

    it('should throw for unknown wave', async () => {
      await expect(handler.triggerE3(99, 'Test'))
        .rejects.toThrow('Unknown wave: 99');
    });
  });

  // =========================================================================
  // E4: System Stop Tests
  // =========================================================================

  describe('triggerE4() - System Stop', () => {
    it('should create EMERGENCY-STOP file', async () => {
      await handler.triggerE4('System maintenance');

      const stopFile = path.join(TEST_CLAUDE_DIR, 'EMERGENCY-STOP');
      expect(fs.existsSync(stopFile)).toBe(true);

      const content = fs.readFileSync(stopFile, 'utf8');
      expect(content).toContain('System maintenance');
      expect(content).toContain('E4');
    });

    it('should create stop signals for all agents', async () => {
      await handler.triggerE4('System maintenance');

      const allAgents = ['cto', 'pm', 'fe-dev-1', 'fe-dev-2', 'be-dev-1', 'be-dev-2', 'qa', 'dev-fix'];

      for (const agent of allAgents) {
        const signalFile = path.join(TEST_CLAUDE_DIR, `signal-${agent}-stop.json`);
        expect(fs.existsSync(signalFile)).toBe(true);
      }
    });

    it('should record system stop in history', async () => {
      await handler.triggerE4('System maintenance');

      const history = handler.getEscalationHistory();
      expect(history.length).toBe(1);
      expect(history[0].level).toBe('E4');
      expect(history[0].target).toBe('system');
    });

    it('should return all affected agents', async () => {
      const result = await handler.triggerE4('System maintenance');

      expect(result.affectedAgents).toHaveLength(8);
      expect(result.affectedAgents).toContain('fe-dev-1');
      expect(result.affectedAgents).toContain('be-dev-1');
      expect(result.affectedAgents).toContain('qa');
    });

    it('should require non-empty reason', async () => {
      await expect(handler.triggerE4(''))
        .rejects.toThrow('Reason required for E4 system stop');
    });
  });

  // =========================================================================
  // Emergency Status Tests
  // =========================================================================

  describe('getEmergencyStatus()', () => {
    it('should return current level', async () => {
      await handler.triggerE1('fe-dev-1', 'Test');

      const status = handler.getEmergencyStatus();
      expect(status.currentLevel).toBe('E1');
    });

    it('should return affected agents', async () => {
      await handler.triggerE2('frontend', 'Test');

      const status = handler.getEmergencyStatus();
      expect(status.affectedAgents).toEqual(['fe-dev-1', 'fe-dev-2']);
    });

    it('should return isActive boolean', async () => {
      expect(handler.getEmergencyStatus().isActive).toBe(false);

      await handler.triggerE1('fe-dev-1', 'Test');

      expect(handler.getEmergencyStatus().isActive).toBe(true);
    });

    it('should return highest level when multiple triggers', async () => {
      await handler.triggerE1('fe-dev-1', 'Test 1');
      await handler.triggerE3(1, 'Test 3');

      const status = handler.getEmergencyStatus();
      expect(status.currentLevel).toBe('E3');
    });
  });

  // =========================================================================
  // Escalation History Tests
  // =========================================================================

  describe('getEscalationHistory()', () => {
    it('should return events in order', async () => {
      await handler.triggerE1('fe-dev-1', 'First');
      await handler.triggerE2('backend', 'Second');

      const history = handler.getEscalationHistory();
      expect(history.length).toBe(2);
      expect(history[0].reason).toBe('First');
      expect(history[1].reason).toBe('Second');
    });

    it('should have timestamp for each entry', async () => {
      await handler.triggerE1('fe-dev-1', 'Test');

      const history = handler.getEscalationHistory();
      expect(history[0]).toHaveProperty('timestamp');
      expect(typeof history[0].timestamp).toBe('string');
    });
  });

  // =========================================================================
  // Clear Emergency Tests
  // =========================================================================

  describe('clearEmergency()', () => {
    it('should require confirmation object', async () => {
      await handler.triggerE1('fe-dev-1', 'Test');

      await expect(handler.clearEmergency('E1'))
        .rejects.toThrow('Confirmation required');
    });

    it('should remove agent stop signal for E1', async () => {
      await handler.triggerE1('fe-dev-1', 'Test');

      const signalFile = path.join(TEST_CLAUDE_DIR, 'signal-fe-dev-1-stop.json');
      expect(fs.existsSync(signalFile)).toBe(true);

      await handler.clearEmergency('E1', { confirm: true, agentId: 'fe-dev-1' });

      expect(fs.existsSync(signalFile)).toBe(false);
    });

    it('should remove domain signals for E2', async () => {
      await handler.triggerE2('frontend', 'Test');

      await handler.clearEmergency('E2', { confirm: true, domain: 'frontend' });

      const signal1 = path.join(TEST_CLAUDE_DIR, 'signal-fe-dev-1-stop.json');
      const signal2 = path.join(TEST_CLAUDE_DIR, 'signal-fe-dev-2-stop.json');

      expect(fs.existsSync(signal1)).toBe(false);
      expect(fs.existsSync(signal2)).toBe(false);
    });

    it('should remove wave signals for E3', async () => {
      await handler.triggerE3(1, 'Test');

      await handler.clearEmergency('E3', { confirm: true, wave: 1 });

      const signal1 = path.join(TEST_CLAUDE_DIR, 'signal-fe-dev-1-stop.json');
      const signal2 = path.join(TEST_CLAUDE_DIR, 'signal-be-dev-1-stop.json');
      const waveSignal = path.join(TEST_CLAUDE_DIR, 'signal-wave1-stop.json');

      expect(fs.existsSync(signal1)).toBe(false);
      expect(fs.existsSync(signal2)).toBe(false);
      expect(fs.existsSync(waveSignal)).toBe(false);
    });

    it('should remove EMERGENCY-STOP for E4', async () => {
      await handler.triggerE4('Test');

      const stopFile = path.join(TEST_CLAUDE_DIR, 'EMERGENCY-STOP');
      expect(fs.existsSync(stopFile)).toBe(true);

      await handler.clearEmergency('E4', { confirm: true });

      expect(fs.existsSync(stopFile)).toBe(false);
    });

    it('should update history with clear event', async () => {
      await handler.triggerE1('fe-dev-1', 'Test');
      await handler.clearEmergency('E1', { confirm: true, agentId: 'fe-dev-1' });

      const history = handler.getEscalationHistory();
      expect(history.length).toBe(2);
      expect(history[1].action).toBe('clear');
    });
  });

  // =========================================================================
  // isEmergencyActive Tests
  // =========================================================================

  describe('isEmergencyActive()', () => {
    it('should return true when E4 triggered', async () => {
      await handler.triggerE4('Test');

      expect(handler.isEmergencyActive()).toBe(true);
    });

    it('should return false when cleared', async () => {
      await handler.triggerE4('Test');
      await handler.clearEmergency('E4', { confirm: true });

      expect(handler.isEmergencyActive()).toBe(false);
    });

    it('should return true when any emergency is active', async () => {
      expect(handler.isEmergencyActive()).toBe(false);

      await handler.triggerE1('fe-dev-1', 'Test');

      expect(handler.isEmergencyActive()).toBe(true);
    });
  });

  // =========================================================================
  // Reset Tests
  // =========================================================================

  describe('reset()', () => {
    it('should clear all state and history', async () => {
      await handler.triggerE1('fe-dev-1', 'Test');
      await handler.triggerE2('backend', 'Test');

      handler.reset();

      expect(handler.getEscalationHistory()).toEqual([]);
      expect(handler.getEmergencyStatus().isActive).toBe(false);
    });
  });
});
