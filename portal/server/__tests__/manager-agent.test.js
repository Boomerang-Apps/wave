/**
 * TDD Tests for Manager Agent (Grok Recommendation G5.1)
 *
 * Coordinates agent delegation and consensus (CrewAI Hierarchical Pattern)
 */

import { describe, it, expect } from 'vitest';

import {
  MANAGER_AGENT,
  delegateTask,
  handleAgentFailure,
  getEligibleAgents,
  selectLeastLoaded
} from '../utils/manager-agent.js';

describe('Manager Agent (G5.1)', () => {

  // ============================================
  // MANAGER_AGENT Constants Tests
  // ============================================

  describe('MANAGER_AGENT', () => {
    it('should have id of manager', () => {
      expect(MANAGER_AGENT.id).toBe('manager');
    });

    it('should have type of orchestrator', () => {
      expect(MANAGER_AGENT.type).toBe('orchestrator');
    });

    it('should have delegate_tasks capability', () => {
      expect(MANAGER_AGENT.capabilities).toContain('delegate_tasks');
    });

    it('should have resolve_conflicts capability', () => {
      expect(MANAGER_AGENT.capabilities).toContain('resolve_conflicts');
    });

    it('should have escalate_to_human capability', () => {
      expect(MANAGER_AGENT.capabilities).toContain('escalate_to_human');
    });

    it('should have frontend agents in delegation', () => {
      expect(MANAGER_AGENT.delegation.frontend).toContain('fe-dev-1');
      expect(MANAGER_AGENT.delegation.frontend).toContain('fe-dev-2');
    });

    it('should have backend agents in delegation', () => {
      expect(MANAGER_AGENT.delegation.backend).toContain('be-dev-1');
      expect(MANAGER_AGENT.delegation.backend).toContain('be-dev-2');
    });

    it('should have qa agents in delegation', () => {
      expect(MANAGER_AGENT.delegation.qa).toContain('qa');
    });

    it('should have fallback chain', () => {
      expect(MANAGER_AGENT.delegation.fallback['fe-dev-1']).toBe('fe-dev-2');
      expect(MANAGER_AGENT.delegation.fallback['fe-dev-2']).toBe('fe-dev-1');
    });
  });

  // ============================================
  // delegateTask Tests
  // ============================================

  describe('delegateTask', () => {
    it('should delegate frontend task to fe-dev agent', () => {
      const task = {
        id: 'task-1',
        domain: 'frontend',
        complexity: 'medium'
      };
      const context = { currentWorkload: {} };

      const result = delegateTask(task, context);

      expect(result.assignedTo).toMatch(/^fe-dev-/);
    });

    it('should delegate backend task to be-dev agent', () => {
      const task = {
        id: 'task-2',
        domain: 'backend',
        complexity: 'medium'
      };
      const context = { currentWorkload: {} };

      const result = delegateTask(task, context);

      expect(result.assignedTo).toMatch(/^be-dev-/);
    });

    it('should include taskId in result', () => {
      const task = { id: 'task-1', domain: 'frontend' };
      const context = { currentWorkload: {} };

      const result = delegateTask(task, context);

      expect(result.taskId).toBe('task-1');
    });

    it('should include delegatedBy manager', () => {
      const task = { id: 'task-1', domain: 'frontend' };
      const context = { currentWorkload: {} };

      const result = delegateTask(task, context);

      expect(result.delegatedBy).toBe('manager');
    });

    it('should include delegatedAt timestamp', () => {
      const task = { id: 'task-1', domain: 'frontend' };
      const context = { currentWorkload: {} };

      const result = delegateTask(task, context);

      expect(result.delegatedAt).toBeDefined();
    });

    it('should include fallback agent', () => {
      const task = { id: 'task-1', domain: 'frontend' };
      const context = { currentWorkload: {} };

      const result = delegateTask(task, context);

      expect(result.fallback).toBeDefined();
    });

    it('should select least loaded agent', () => {
      const task = { id: 'task-1', domain: 'frontend' };
      const context = {
        currentWorkload: {
          'fe-dev-1': 5,
          'fe-dev-2': 2
        }
      };

      const result = delegateTask(task, context);

      expect(result.assignedTo).toBe('fe-dev-2');
    });
  });

  // ============================================
  // handleAgentFailure Tests
  // ============================================

  describe('handleAgentFailure', () => {
    it('should reassign to fallback agent', () => {
      const result = handleAgentFailure('fe-dev-1', 'task-1', {});

      expect(result.action).toBe('reassign');
      expect(result.to).toBe('fe-dev-2');
    });

    it('should include original agent in from', () => {
      const result = handleAgentFailure('fe-dev-1', 'task-1', {});

      expect(result.from).toBe('fe-dev-1');
    });

    it('should include taskId', () => {
      const result = handleAgentFailure('fe-dev-1', 'task-1', {});

      expect(result.taskId).toBe('task-1');
    });

    it('should include reason for reassignment', () => {
      const result = handleAgentFailure('fe-dev-1', 'task-1', {});

      expect(result.reason).toBeDefined();
    });

    it('should escalate to human when no fallback', () => {
      const result = handleAgentFailure('qa', 'task-1', {});

      expect(result.action).toBe('escalate');
      expect(result.to).toBe('human');
    });
  });

  // ============================================
  // getEligibleAgents Tests
  // ============================================

  describe('getEligibleAgents', () => {
    it('should return frontend agents for frontend domain', () => {
      const eligible = getEligibleAgents('frontend');

      expect(eligible).toContain('fe-dev-1');
      expect(eligible).toContain('fe-dev-2');
    });

    it('should return backend agents for backend domain', () => {
      const eligible = getEligibleAgents('backend');

      expect(eligible).toContain('be-dev-1');
      expect(eligible).toContain('be-dev-2');
    });

    it('should return qa agents for qa domain', () => {
      const eligible = getEligibleAgents('qa');

      expect(eligible).toContain('qa');
    });

    it('should return empty array for unknown domain', () => {
      const eligible = getEligibleAgents('unknown');

      expect(eligible).toEqual([]);
    });
  });

  // ============================================
  // selectLeastLoaded Tests
  // ============================================

  describe('selectLeastLoaded', () => {
    it('should select agent with lowest workload', () => {
      const agents = ['agent-1', 'agent-2'];
      const workload = { 'agent-1': 5, 'agent-2': 2 };

      const selected = selectLeastLoaded(agents, workload);

      expect(selected).toBe('agent-2');
    });

    it('should select first agent when workloads equal', () => {
      const agents = ['agent-1', 'agent-2'];
      const workload = { 'agent-1': 3, 'agent-2': 3 };

      const selected = selectLeastLoaded(agents, workload);

      expect(selected).toBe('agent-1');
    });

    it('should treat missing workload as 0', () => {
      const agents = ['agent-1', 'agent-2'];
      const workload = { 'agent-1': 5 };

      const selected = selectLeastLoaded(agents, workload);

      expect(selected).toBe('agent-2');
    });
  });
});
