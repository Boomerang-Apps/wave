/**
 * TDD Tests for Agent Heartbeat Manager (GAP-013)
 *
 * Tests heartbeat tracking, stale detection, auto-restart, and health status.
 */

import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  HeartbeatManager,
  DEFAULT_TIMEOUT,
  DEFAULT_WARNING,
  DEFAULT_CHECK_INTERVAL,
  DEFAULT_MAX_RESTARTS,
  DEFAULT_RESTART_COOLDOWN,
  AGENT_STATUS
} from '../utils/heartbeat-manager.js';

describe('HeartbeatManager (GAP-013)', () => {
  let manager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new HeartbeatManager();
  });

  afterEach(() => {
    manager.stopMonitoring();
    vi.useRealTimers();
  });

  // ============================================
  // Default Configuration Tests
  // ============================================

  describe('Default Configuration', () => {
    test('DEFAULT_TIMEOUT should be 60000ms (reduced from 120s)', () => {
      expect(DEFAULT_TIMEOUT).toBe(60000);
    });

    test('DEFAULT_WARNING should be 45000ms', () => {
      expect(DEFAULT_WARNING).toBe(45000);
    });

    test('DEFAULT_CHECK_INTERVAL should be 10000ms', () => {
      expect(DEFAULT_CHECK_INTERVAL).toBe(10000);
    });

    test('DEFAULT_MAX_RESTARTS should be 3', () => {
      expect(DEFAULT_MAX_RESTARTS).toBe(3);
    });

    test('DEFAULT_RESTART_COOLDOWN should be 30000ms', () => {
      expect(DEFAULT_RESTART_COOLDOWN).toBe(30000);
    });

    test('AGENT_STATUS should have all required values', () => {
      expect(AGENT_STATUS.HEALTHY).toBe('healthy');
      expect(AGENT_STATUS.WARNING).toBe('warning');
      expect(AGENT_STATUS.STALE).toBe('stale');
      expect(AGENT_STATUS.RESTARTING).toBe('restarting');
    });
  });

  // ============================================
  // Heartbeat Recording Tests
  // ============================================

  describe('recordHeartbeat', () => {
    test('should update last-seen timestamp', () => {
      const agentId = 'fe-dev-1';
      const before = Date.now();

      manager.recordHeartbeat(agentId);

      const status = manager.getAgentStatus(agentId);
      expect(status.lastHeartbeat).toBeGreaterThanOrEqual(before);
      expect(status.lastHeartbeat).toBeLessThanOrEqual(Date.now());
    });

    test('should create entry for new agent', () => {
      const agentId = 'be-dev-1';

      // Agent doesn't exist yet
      expect(manager.getAgentStatus(agentId)).toBeNull();

      manager.recordHeartbeat(agentId);

      // Now it exists
      const status = manager.getAgentStatus(agentId);
      expect(status).not.toBeNull();
      expect(status.agentId).toBe(agentId);
    });

    test('should set initial status to healthy', () => {
      const agentId = 'qa-agent-1';

      manager.recordHeartbeat(agentId);

      const status = manager.getAgentStatus(agentId);
      expect(status.status).toBe(AGENT_STATUS.HEALTHY);
    });

    test('should reset restart count on heartbeat', () => {
      const agentId = 'fe-dev-1';
      manager.recordHeartbeat(agentId);

      // Simulate some restarts
      manager._setRestartCount(agentId, 2);
      expect(manager.getAgentStatus(agentId).restartCount).toBe(2);

      // Record heartbeat should not reset restart count
      // (only successful operation after restart should reset)
      manager.recordHeartbeat(agentId);
      expect(manager.getAgentStatus(agentId).restartCount).toBe(2);
    });

    test('should accept optional metadata', () => {
      const agentId = 'fe-dev-1';
      const metadata = { task: 'building', progress: 50 };

      manager.recordHeartbeat(agentId, metadata);

      const status = manager.getAgentStatus(agentId);
      expect(status.metadata).toEqual(metadata);
    });
  });

  // ============================================
  // Agent Health Check Tests
  // ============================================

  describe('checkAgentHealth', () => {
    test('should return healthy for recent heartbeat', () => {
      const agentId = 'fe-dev-1';
      manager.recordHeartbeat(agentId);

      const health = manager.checkAgentHealth(agentId);
      expect(health.status).toBe(AGENT_STATUS.HEALTHY);
    });

    test('should return warning near timeout', () => {
      const agentId = 'fe-dev-1';
      manager.recordHeartbeat(agentId);

      // Advance time to warning threshold
      vi.advanceTimersByTime(DEFAULT_WARNING + 1000);

      const health = manager.checkAgentHealth(agentId);
      expect(health.status).toBe(AGENT_STATUS.WARNING);
    });

    test('should return stale after timeout', () => {
      const agentId = 'fe-dev-1';
      manager.recordHeartbeat(agentId);

      // Advance time past timeout
      vi.advanceTimersByTime(DEFAULT_TIMEOUT + 1000);

      const health = manager.checkAgentHealth(agentId);
      expect(health.status).toBe(AGENT_STATUS.STALE);
    });

    test('should return null for unknown agent', () => {
      const health = manager.checkAgentHealth('unknown-agent');
      expect(health).toBeNull();
    });

    test('should include time since last heartbeat', () => {
      const agentId = 'fe-dev-1';
      manager.recordHeartbeat(agentId);

      vi.advanceTimersByTime(30000);

      const health = manager.checkAgentHealth(agentId);
      expect(health.timeSinceHeartbeat).toBeGreaterThanOrEqual(30000);
    });
  });

  // ============================================
  // Per-Agent Configuration Tests
  // ============================================

  describe('setAgentTimeout', () => {
    test('should configure per-agent timeout', () => {
      const agentId = 'slow-agent';
      manager.recordHeartbeat(agentId);
      manager.setAgentTimeout(agentId, 120000);

      const config = manager.getAgentConfig(agentId);
      expect(config.timeout).toBe(120000);
    });

    test('should use per-agent timeout for health checks', () => {
      const agentId = 'slow-agent';
      manager.recordHeartbeat(agentId);
      manager.setAgentTimeout(agentId, 120000);

      // With 120s timeout, warning is at 75% = 90s
      // At 91 seconds, should be WARNING (past 90s warning threshold)
      vi.advanceTimersByTime(91000);

      const health = manager.checkAgentHealth(agentId);
      expect(health.status).toBe(AGENT_STATUS.WARNING);
    });

    test('should reject negative timeout', () => {
      const agentId = 'fe-dev-1';
      manager.recordHeartbeat(agentId);

      expect(() => manager.setAgentTimeout(agentId, -1000)).toThrow();
    });

    test('should reject zero timeout', () => {
      const agentId = 'fe-dev-1';
      manager.recordHeartbeat(agentId);

      expect(() => manager.setAgentTimeout(agentId, 0)).toThrow();
    });
  });

  describe('setWarningThreshold', () => {
    test('should configure warning level', () => {
      const agentId = 'fe-dev-1';
      manager.recordHeartbeat(agentId);
      manager.setWarningThreshold(agentId, 30000);

      const config = manager.getAgentConfig(agentId);
      expect(config.warning).toBe(30000);
    });

    test('should trigger warning at custom threshold', () => {
      const agentId = 'fe-dev-1';
      manager.recordHeartbeat(agentId);
      manager.setWarningThreshold(agentId, 20000);

      // At 25 seconds, should be warning with 20s threshold
      vi.advanceTimersByTime(25000);

      const health = manager.checkAgentHealth(agentId);
      expect(health.status).toBe(AGENT_STATUS.WARNING);
    });
  });

  describe('getAgentConfig', () => {
    test('should return current configuration', () => {
      const agentId = 'fe-dev-1';
      manager.recordHeartbeat(agentId);

      const config = manager.getAgentConfig(agentId);
      expect(config).toEqual({
        timeout: DEFAULT_TIMEOUT,
        warning: DEFAULT_WARNING,
        maxRestarts: DEFAULT_MAX_RESTARTS,
        restartCooldown: DEFAULT_RESTART_COOLDOWN,
        autoRestart: false
      });
    });

    test('should return null for unknown agent', () => {
      const config = manager.getAgentConfig('unknown');
      expect(config).toBeNull();
    });
  });

  // ============================================
  // Health Status API Tests
  // ============================================

  describe('getHealthStatus', () => {
    test('should return empty object when no agents', () => {
      const status = manager.getHealthStatus();
      expect(status).toEqual({});
    });

    test('should return all agents', () => {
      manager.recordHeartbeat('agent-1');
      manager.recordHeartbeat('agent-2');
      manager.recordHeartbeat('agent-3');

      const status = manager.getHealthStatus();
      expect(Object.keys(status)).toHaveLength(3);
      expect(status['agent-1']).toBeDefined();
      expect(status['agent-2']).toBeDefined();
      expect(status['agent-3']).toBeDefined();
    });

    test('should include status for each agent', () => {
      manager.recordHeartbeat('agent-1');
      manager.recordHeartbeat('agent-2');

      // Make agent-2 stale
      vi.advanceTimersByTime(DEFAULT_TIMEOUT + 1000);
      manager.recordHeartbeat('agent-1'); // Refresh agent-1

      const status = manager.getHealthStatus();
      expect(status['agent-1'].status).toBe(AGENT_STATUS.HEALTHY);
      expect(status['agent-2'].status).toBe(AGENT_STATUS.STALE);
    });

    test('should include lastHeartbeat timestamp', () => {
      manager.recordHeartbeat('agent-1');

      const status = manager.getHealthStatus();
      expect(status['agent-1'].lastHeartbeat).toBeDefined();
      expect(typeof status['agent-1'].lastHeartbeat).toBe('number');
    });
  });

  describe('getStaleAgents', () => {
    test('should return empty array when no stale agents', () => {
      manager.recordHeartbeat('agent-1');
      manager.recordHeartbeat('agent-2');

      const stale = manager.getStaleAgents();
      expect(stale).toEqual([]);
    });

    test('should return only stale agents', () => {
      manager.recordHeartbeat('agent-1');
      manager.recordHeartbeat('agent-2');

      // Make both stale
      vi.advanceTimersByTime(DEFAULT_TIMEOUT + 1000);

      // Refresh only agent-1
      manager.recordHeartbeat('agent-1');

      const stale = manager.getStaleAgents();
      expect(stale).toHaveLength(1);
      expect(stale[0]).toBe('agent-2');
    });
  });

  // ============================================
  // Callback Tests
  // ============================================

  describe('onStaleAgent callback', () => {
    test('should be invoked when agent goes stale', () => {
      const callback = vi.fn();
      manager.onStaleAgent(callback);

      manager.recordHeartbeat('agent-1');
      manager.startMonitoring();

      // Advance past timeout
      vi.advanceTimersByTime(DEFAULT_TIMEOUT + DEFAULT_CHECK_INTERVAL + 1000);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent-1',
          status: AGENT_STATUS.STALE
        })
      );
    });

    test('should only invoke once per stale transition', () => {
      const callback = vi.fn();
      manager.onStaleAgent(callback);

      manager.recordHeartbeat('agent-1');
      manager.startMonitoring();

      // Advance past timeout multiple check intervals
      vi.advanceTimersByTime(DEFAULT_TIMEOUT + DEFAULT_CHECK_INTERVAL * 3);

      // Should only be called once when transitioning to stale
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('onWarning callback', () => {
    test('should be invoked at warning threshold', () => {
      const callback = vi.fn();
      manager.onWarning(callback);

      manager.recordHeartbeat('agent-1');
      manager.startMonitoring();

      // Advance to warning threshold
      vi.advanceTimersByTime(DEFAULT_WARNING + DEFAULT_CHECK_INTERVAL + 1000);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent-1',
          status: AGENT_STATUS.WARNING
        })
      );
    });
  });

  // ============================================
  // Auto-Restart Tests
  // ============================================

  describe('enableAutoRestart', () => {
    test('should trigger restart callback when agent stales', () => {
      const restartCallback = vi.fn().mockResolvedValue(true);
      manager.enableAutoRestart('agent-1', restartCallback);

      manager.recordHeartbeat('agent-1');
      manager.startMonitoring();

      // Advance past timeout
      vi.advanceTimersByTime(DEFAULT_TIMEOUT + DEFAULT_CHECK_INTERVAL + 1000);

      expect(restartCallback).toHaveBeenCalledWith('agent-1');
    });

    test('should respect max restart limit', async () => {
      const restartCallback = vi.fn().mockResolvedValue(true);
      manager.enableAutoRestart('agent-1', restartCallback);

      manager.recordHeartbeat('agent-1');
      manager.startMonitoring();

      // Trigger multiple restarts
      for (let i = 0; i < DEFAULT_MAX_RESTARTS + 2; i++) {
        vi.advanceTimersByTime(DEFAULT_TIMEOUT + DEFAULT_CHECK_INTERVAL + 1000);
        await Promise.resolve(); // Let async callbacks complete
        vi.advanceTimersByTime(DEFAULT_RESTART_COOLDOWN + 1000);
      }

      // Should only restart max times
      expect(restartCallback).toHaveBeenCalledTimes(DEFAULT_MAX_RESTARTS);
    });

    test('should respect cooldown period', async () => {
      const restartCallback = vi.fn().mockResolvedValue(true);
      manager.enableAutoRestart('agent-1', restartCallback);

      manager.recordHeartbeat('agent-1');
      manager.startMonitoring();

      // Trigger first restart (happens at ~60000ms when timeout exceeded)
      vi.advanceTimersByTime(DEFAULT_TIMEOUT + DEFAULT_CHECK_INTERVAL + 1000);
      await Promise.resolve();

      expect(restartCallback).toHaveBeenCalledTimes(1);

      // Advance but stay within cooldown (cooldown is 30000ms)
      // First restart was at ~60000ms, we're at ~71000ms
      // Advance 15000ms to ~86000ms (26000ms since restart < 30000ms cooldown)
      vi.advanceTimersByTime(15000);

      // Should not restart yet (still in cooldown: 86000 - 60000 = 26000 < 30000)
      expect(restartCallback).toHaveBeenCalledTimes(1);
    });

    test('should set status to restarting during restart', async () => {
      let resolveRestart;
      const restartCallback = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          resolveRestart = resolve;
        });
      });

      manager.enableAutoRestart('agent-1', restartCallback);
      manager.recordHeartbeat('agent-1');
      manager.startMonitoring();

      // Trigger restart
      vi.advanceTimersByTime(DEFAULT_TIMEOUT + DEFAULT_CHECK_INTERVAL + 1000);
      await Promise.resolve();

      const status = manager.getAgentStatus('agent-1');
      expect(status.status).toBe(AGENT_STATUS.RESTARTING);

      // Complete restart
      resolveRestart(true);
    });
  });

  describe('disableAutoRestart', () => {
    test('should stop auto-restart for agent', () => {
      const restartCallback = vi.fn().mockResolvedValue(true);
      manager.enableAutoRestart('agent-1', restartCallback);
      manager.disableAutoRestart('agent-1');

      manager.recordHeartbeat('agent-1');
      manager.startMonitoring();

      // Advance past timeout
      vi.advanceTimersByTime(DEFAULT_TIMEOUT + DEFAULT_CHECK_INTERVAL + 1000);

      expect(restartCallback).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Monitoring Tests
  // ============================================

  describe('startMonitoring', () => {
    test('should begin periodic checks', () => {
      const callback = vi.fn();
      manager.onStaleAgent(callback);

      manager.recordHeartbeat('agent-1');
      manager.startMonitoring();

      // Advance multiple intervals
      vi.advanceTimersByTime(DEFAULT_CHECK_INTERVAL * 3);

      // Monitoring should be running (no stale yet)
      expect(manager.isMonitoring()).toBe(true);
    });

    test('should detect stale agents during monitoring', () => {
      const callback = vi.fn();
      manager.onStaleAgent(callback);

      manager.recordHeartbeat('agent-1');
      manager.startMonitoring();

      // Advance past timeout
      vi.advanceTimersByTime(DEFAULT_TIMEOUT + DEFAULT_CHECK_INTERVAL + 1000);

      expect(callback).toHaveBeenCalled();
    });

    test('should return manager for chaining', () => {
      const result = manager.startMonitoring();
      expect(result).toBe(manager);
    });
  });

  describe('stopMonitoring', () => {
    test('should clear interval', () => {
      manager.startMonitoring();
      expect(manager.isMonitoring()).toBe(true);

      manager.stopMonitoring();
      expect(manager.isMonitoring()).toBe(false);
    });

    test('should stop detecting stale agents', () => {
      const callback = vi.fn();
      manager.onStaleAgent(callback);

      manager.recordHeartbeat('agent-1');
      manager.startMonitoring();
      manager.stopMonitoring();

      // Advance past timeout
      vi.advanceTimersByTime(DEFAULT_TIMEOUT + DEFAULT_CHECK_INTERVAL * 5);

      // Callback should not be called since monitoring stopped
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Agent Management Tests
  // ============================================

  describe('removeAgent', () => {
    test('should remove agent from tracking', () => {
      manager.recordHeartbeat('agent-1');
      expect(manager.getAgentStatus('agent-1')).not.toBeNull();

      manager.removeAgent('agent-1');
      expect(manager.getAgentStatus('agent-1')).toBeNull();
    });

    test('should not error for unknown agent', () => {
      expect(() => manager.removeAgent('unknown')).not.toThrow();
    });
  });

  describe('reset', () => {
    test('should clear all tracking data', () => {
      manager.recordHeartbeat('agent-1');
      manager.recordHeartbeat('agent-2');
      manager.recordHeartbeat('agent-3');

      manager.reset();

      expect(manager.getHealthStatus()).toEqual({});
    });

    test('should stop monitoring', () => {
      manager.startMonitoring();
      manager.reset();

      expect(manager.isMonitoring()).toBe(false);
    });
  });

  // ============================================
  // Multiple Agent Tests
  // ============================================

  describe('Multiple Agents', () => {
    test('should track agents independently', () => {
      manager.recordHeartbeat('agent-1');
      vi.advanceTimersByTime(30000);
      manager.recordHeartbeat('agent-2');

      const status1 = manager.checkAgentHealth('agent-1');
      const status2 = manager.checkAgentHealth('agent-2');

      expect(status1.timeSinceHeartbeat).toBeGreaterThan(status2.timeSinceHeartbeat);
    });

    test('should allow different timeouts per agent', () => {
      manager.recordHeartbeat('fast-agent');
      manager.recordHeartbeat('slow-agent');

      manager.setAgentTimeout('fast-agent', 30000);
      manager.setAgentTimeout('slow-agent', 120000);

      vi.advanceTimersByTime(50000);

      const fastHealth = manager.checkAgentHealth('fast-agent');
      const slowHealth = manager.checkAgentHealth('slow-agent');

      expect(fastHealth.status).toBe(AGENT_STATUS.STALE);
      expect(slowHealth.status).toBe(AGENT_STATUS.HEALTHY);
    });
  });

  // ============================================
  // Validation Tests
  // ============================================

  describe('Input Validation', () => {
    test('should reject empty agent ID', () => {
      expect(() => manager.recordHeartbeat('')).toThrow();
    });

    test('should reject null agent ID', () => {
      expect(() => manager.recordHeartbeat(null)).toThrow();
    });

    test('should reject agent ID with invalid characters', () => {
      expect(() => manager.recordHeartbeat('agent/../../../etc/passwd')).toThrow();
    });

    test('should accept valid agent IDs', () => {
      expect(() => manager.recordHeartbeat('fe-dev-1')).not.toThrow();
      expect(() => manager.recordHeartbeat('be_dev_2')).not.toThrow();
      expect(() => manager.recordHeartbeat('agent123')).not.toThrow();
    });
  });

  // ============================================
  // Acknowledgment Tests
  // ============================================

  describe('acknowledgeAgent', () => {
    test('should reset restart count after successful acknowledgment', () => {
      manager.recordHeartbeat('agent-1');
      manager._setRestartCount('agent-1', 2);

      manager.acknowledgeAgent('agent-1');

      const status = manager.getAgentStatus('agent-1');
      expect(status.restartCount).toBe(0);
    });

    test('should update lastHeartbeat', () => {
      manager.recordHeartbeat('agent-1');
      const firstHeartbeat = manager.getAgentStatus('agent-1').lastHeartbeat;

      vi.advanceTimersByTime(5000);
      manager.acknowledgeAgent('agent-1');

      const status = manager.getAgentStatus('agent-1');
      expect(status.lastHeartbeat).toBeGreaterThan(firstHeartbeat);
    });
  });
});
