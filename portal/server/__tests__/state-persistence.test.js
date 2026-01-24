/**
 * TDD Tests for Agent State Persistence (GAP-010)
 *
 * Tests that agent decisions, constraints, and patterns persist across
 * context window resets. Includes memory pruning and queryable history.
 *
 * Based on:
 * - LangChain Memory Patterns
 * - OpenAI Assistants API Threads
 * - Anthropic Context Management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import the module we're testing
import {
  saveDecision,
  loadMemory,
  addConstraint,
  addPattern,
  queryDecisions,
  pruneMemory,
  getMemorySummary,
  clearMemory,
  exportMemory,
  importMemory,
  STATE_PERSISTENCE_ERRORS,
  VALID_AGENTS
} from '../utils/state-persistence.js';

describe('Agent State Persistence (GAP-010)', () => {
  let tempDir;

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'state-persistence-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Helper function to get memory file path
  function getMemoryPath(agent, wave) {
    return path.join(tempDir, '.claude', 'agent-memory', `${agent}-wave${wave}.json`);
  }

  // ============================================
  // UNIT TESTS - Constants & Validation
  // ============================================

  describe('constants', () => {
    it('should define VALID_AGENTS', () => {
      expect(VALID_AGENTS).toBeDefined();
      expect(VALID_AGENTS).toContain('fe-dev');
      expect(VALID_AGENTS).toContain('be-dev');
      expect(VALID_AGENTS).toContain('qa');
    });

    it('should define STATE_PERSISTENCE_ERRORS', () => {
      expect(STATE_PERSISTENCE_ERRORS).toBeDefined();
      expect(STATE_PERSISTENCE_ERRORS.INVALID_AGENT).toBeDefined();
      expect(STATE_PERSISTENCE_ERRORS.MEMORY_NOT_FOUND).toBeDefined();
    });
  });

  // ============================================
  // UNIT TESTS - saveDecision
  // ============================================

  describe('saveDecision', () => {
    it('should create new memory file if not exists', () => {
      const result = saveDecision(tempDir, 'fe-dev', 1, 'Use React Query', 'Better caching');

      expect(result.success).toBe(true);
      expect(fs.existsSync(getMemoryPath('fe-dev', 1))).toBe(true);
    });

    it('should append decision to existing file', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'First decision', 'Reason 1');
      saveDecision(tempDir, 'fe-dev', 1, 'Second decision', 'Reason 2');

      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.decisions.length).toBe(2);
    });

    it('should generate sequential decision IDs', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Decision 1', 'Reason');
      saveDecision(tempDir, 'fe-dev', 1, 'Decision 2', 'Reason');
      saveDecision(tempDir, 'fe-dev', 1, 'Decision 3', 'Reason');

      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.decisions[0].id).toBe('DEC-001');
      expect(memory.decisions[1].id).toBe('DEC-002');
      expect(memory.decisions[2].id).toBe('DEC-003');
    });

    it('should include timestamp in decision', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Decision', 'Reason');

      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.decisions[0].timestamp).toBeDefined();
      expect(new Date(memory.decisions[0].timestamp).getTime()).not.toBeNaN();
    });

    it('should reject invalid agent', () => {
      const result = saveDecision(tempDir, 'invalid-agent', 1, 'Decision', 'Reason');

      expect(result.success).toBe(false);
      expect(result.error).toBe(STATE_PERSISTENCE_ERRORS.INVALID_AGENT);
    });

    it('should handle missing reason gracefully', () => {
      const result = saveDecision(tempDir, 'fe-dev', 1, 'Decision');

      expect(result.success).toBe(true);
      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.decisions[0].reason).toBe('No reason provided');
    });

    it('should return the decision ID', () => {
      const result = saveDecision(tempDir, 'fe-dev', 1, 'Decision', 'Reason');

      expect(result.decisionId).toBe('DEC-001');
    });
  });

  // ============================================
  // UNIT TESTS - loadMemory
  // ============================================

  describe('loadMemory', () => {
    it('should return null for missing file', () => {
      const memory = loadMemory(tempDir, 'fe-dev', 1);

      expect(memory).toBeNull();
    });

    it('should return all data from existing file', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Decision 1', 'Reason');
      addConstraint(tempDir, 'fe-dev', 1, 'No inline styles');
      addPattern(tempDir, 'fe-dev', 1, 'Component pattern', 'src/components/Button.tsx');

      const memory = loadMemory(tempDir, 'fe-dev', 1);

      expect(memory.agent).toBe('fe-dev');
      expect(memory.wave).toBe(1);
      expect(memory.decisions.length).toBe(1);
      expect(memory.constraints.length).toBe(1);
      expect(memory.patterns_used.length).toBe(1);
    });

    it('should handle corrupted JSON gracefully', () => {
      const memoryPath = getMemoryPath('fe-dev', 1);
      fs.mkdirSync(path.dirname(memoryPath), { recursive: true });
      fs.writeFileSync(memoryPath, 'invalid json {{{');

      const memory = loadMemory(tempDir, 'fe-dev', 1);

      expect(memory).toBeNull();
    });

    it('should include created_at and updated_at timestamps', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Decision', 'Reason');

      const memory = loadMemory(tempDir, 'fe-dev', 1);

      expect(memory.created_at).toBeDefined();
      expect(memory.updated_at).toBeDefined();
    });
  });

  // ============================================
  // UNIT TESTS - addConstraint
  // ============================================

  describe('addConstraint', () => {
    it('should add unique constraint', () => {
      addConstraint(tempDir, 'fe-dev', 1, 'No inline styles');

      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.constraints).toContain('No inline styles');
    });

    it('should ignore duplicate constraints', () => {
      addConstraint(tempDir, 'fe-dev', 1, 'No inline styles');
      addConstraint(tempDir, 'fe-dev', 1, 'No inline styles');

      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.constraints.length).toBe(1);
    });

    it('should allow multiple different constraints', () => {
      addConstraint(tempDir, 'fe-dev', 1, 'No inline styles');
      addConstraint(tempDir, 'fe-dev', 1, 'Use TypeScript strict mode');

      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.constraints.length).toBe(2);
    });

    it('should create memory file if not exists', () => {
      addConstraint(tempDir, 'fe-dev', 1, 'Constraint');

      expect(fs.existsSync(getMemoryPath('fe-dev', 1))).toBe(true);
    });
  });

  // ============================================
  // UNIT TESTS - addPattern
  // ============================================

  describe('addPattern', () => {
    it('should add pattern with timestamp', () => {
      addPattern(tempDir, 'fe-dev', 1, 'Button component', 'src/Button.tsx');

      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.patterns_used.length).toBe(1);
      expect(memory.patterns_used[0].name).toBe('Button component');
      expect(memory.patterns_used[0].file).toBe('src/Button.tsx');
      expect(memory.patterns_used[0].added_at).toBeDefined();
    });

    it('should ignore duplicate patterns', () => {
      addPattern(tempDir, 'fe-dev', 1, 'Button component', 'src/Button.tsx');
      addPattern(tempDir, 'fe-dev', 1, 'Button component', 'src/Button.tsx');

      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.patterns_used.length).toBe(1);
    });

    it('should allow same pattern name in different files', () => {
      addPattern(tempDir, 'fe-dev', 1, 'Component pattern', 'src/A.tsx');
      addPattern(tempDir, 'fe-dev', 1, 'Component pattern', 'src/B.tsx');

      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.patterns_used.length).toBe(2);
    });
  });

  // ============================================
  // UNIT TESTS - queryDecisions
  // ============================================

  describe('queryDecisions', () => {
    beforeEach(() => {
      // Create test data across multiple agents and waves
      saveDecision(tempDir, 'fe-dev', 1, 'Frontend decision 1', 'FE reason');
      saveDecision(tempDir, 'fe-dev', 1, 'Frontend decision 2', 'FE reason');
      saveDecision(tempDir, 'be-dev', 1, 'Backend decision', 'BE reason');
      saveDecision(tempDir, 'fe-dev', 2, 'Frontend wave 2', 'Wave 2 reason');
    });

    it('should filter by agent', () => {
      const results = queryDecisions(tempDir, { agent: 'fe-dev' });

      expect(results.length).toBe(3);
      results.forEach(d => expect(d.agent).toBe('fe-dev'));
    });

    it('should filter by wave', () => {
      const results = queryDecisions(tempDir, { wave: 1 });

      expect(results.length).toBe(3);
      results.forEach(d => expect(d.wave).toBe(1));
    });

    it('should filter by agent and wave', () => {
      const results = queryDecisions(tempDir, { agent: 'fe-dev', wave: 1 });

      expect(results.length).toBe(2);
    });

    it('should filter by keyword', () => {
      const results = queryDecisions(tempDir, { keyword: 'Frontend' });

      expect(results.length).toBe(3);
    });

    it('should filter by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const results = queryDecisions(tempDir, {
        startDate: yesterday.toISOString(),
        endDate: tomorrow.toISOString()
      });

      expect(results.length).toBe(4);
    });

    it('should return empty array when no matches', () => {
      const results = queryDecisions(tempDir, { agent: 'qa' });

      expect(results).toEqual([]);
    });

    it('should include agent and wave in results', () => {
      const results = queryDecisions(tempDir, { agent: 'fe-dev', wave: 1 });

      expect(results[0].agent).toBe('fe-dev');
      expect(results[0].wave).toBe(1);
    });
  });

  // ============================================
  // UNIT TESTS - pruneMemory
  // ============================================

  describe('pruneMemory', () => {
    it('should remove old decisions', () => {
      // Save a decision and manually backdate it
      saveDecision(tempDir, 'fe-dev', 1, 'Old decision', 'Old reason');

      const memoryPath = getMemoryPath('fe-dev', 1);
      const memory = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));

      // Set timestamp to 60 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      memory.decisions[0].timestamp = oldDate.toISOString();
      fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));

      // Add a recent decision
      saveDecision(tempDir, 'fe-dev', 1, 'Recent decision', 'Recent reason');

      // Prune with 30 day threshold
      const result = pruneMemory(tempDir, 'fe-dev', 1, { maxAgeDays: 30 });

      expect(result.prunedCount).toBe(1);
      const updatedMemory = loadMemory(tempDir, 'fe-dev', 1);
      expect(updatedMemory.decisions.length).toBe(1);
      expect(updatedMemory.decisions[0].decision).toBe('Recent decision');
    });

    it('should keep recent decisions', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Recent decision', 'Reason');

      const result = pruneMemory(tempDir, 'fe-dev', 1, { maxAgeDays: 30 });

      expect(result.prunedCount).toBe(0);
      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.decisions.length).toBe(1);
    });

    it('should handle missing memory file', () => {
      const result = pruneMemory(tempDir, 'fe-dev', 1);

      expect(result.success).toBe(true);
      expect(result.prunedCount).toBe(0);
    });

    it('should use default threshold of 30 days', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Decision', 'Reason');

      const result = pruneMemory(tempDir, 'fe-dev', 1);

      expect(result.success).toBe(true);
    });

    it('should prune based on max decisions limit', () => {
      for (let i = 0; i < 10; i++) {
        saveDecision(tempDir, 'fe-dev', 1, `Decision ${i}`, 'Reason');
      }

      const result = pruneMemory(tempDir, 'fe-dev', 1, { maxDecisions: 5 });

      expect(result.prunedCount).toBe(5);
      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.decisions.length).toBe(5);
    });
  });

  // ============================================
  // UNIT TESTS - getMemorySummary
  // ============================================

  describe('getMemorySummary', () => {
    it('should return correct counts', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Decision 1', 'Reason');
      saveDecision(tempDir, 'fe-dev', 1, 'Decision 2', 'Reason');
      addConstraint(tempDir, 'fe-dev', 1, 'Constraint 1');
      addPattern(tempDir, 'fe-dev', 1, 'Pattern 1', 'file.ts');

      const summary = getMemorySummary(tempDir, 'fe-dev', 1);

      expect(summary.decisionCount).toBe(2);
      expect(summary.constraintCount).toBe(1);
      expect(summary.patternCount).toBe(1);
    });

    it('should return null for missing memory', () => {
      const summary = getMemorySummary(tempDir, 'fe-dev', 1);

      expect(summary).toBeNull();
    });

    it('should include age in days', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Decision', 'Reason');

      const summary = getMemorySummary(tempDir, 'fe-dev', 1);

      expect(summary.ageDays).toBeDefined();
      expect(typeof summary.ageDays).toBe('number');
    });

    it('should include last updated timestamp', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Decision', 'Reason');

      const summary = getMemorySummary(tempDir, 'fe-dev', 1);

      expect(summary.lastUpdated).toBeDefined();
    });
  });

  // ============================================
  // UNIT TESTS - clearMemory
  // ============================================

  describe('clearMemory', () => {
    it('should remove memory file', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Decision', 'Reason');
      expect(fs.existsSync(getMemoryPath('fe-dev', 1))).toBe(true);

      clearMemory(tempDir, 'fe-dev', 1);

      expect(fs.existsSync(getMemoryPath('fe-dev', 1))).toBe(false);
    });

    it('should handle missing file gracefully', () => {
      const result = clearMemory(tempDir, 'fe-dev', 1);

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // UNIT TESTS - exportMemory / importMemory
  // ============================================

  describe('exportMemory', () => {
    it('should return JSON string', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Decision', 'Reason');

      const exported = exportMemory(tempDir, 'fe-dev', 1);

      expect(typeof exported).toBe('string');
      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('should return null for missing memory', () => {
      const exported = exportMemory(tempDir, 'fe-dev', 1);

      expect(exported).toBeNull();
    });
  });

  describe('importMemory', () => {
    it('should restore from JSON string', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Original decision', 'Reason');
      const exported = exportMemory(tempDir, 'fe-dev', 1);
      clearMemory(tempDir, 'fe-dev', 1);

      const result = importMemory(tempDir, 'fe-dev', 1, exported);

      expect(result.success).toBe(true);
      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.decisions[0].decision).toBe('Original decision');
    });

    it('should reject invalid JSON', () => {
      const result = importMemory(tempDir, 'fe-dev', 1, 'invalid json');

      expect(result.success).toBe(false);
      expect(result.error).toBe(STATE_PERSISTENCE_ERRORS.INVALID_FORMAT);
    });

    it('should merge with existing memory when merge option set', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Existing decision', 'Reason');

      // Use different ID to avoid conflict with existing DEC-001
      const importData = JSON.stringify({
        agent: 'fe-dev',
        wave: 1,
        decisions: [{ id: 'DEC-002', decision: 'Imported decision', reason: 'Reason', timestamp: new Date().toISOString() }],
        constraints: [],
        patterns_used: []
      });

      importMemory(tempDir, 'fe-dev', 1, importData, { merge: true });

      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.decisions.length).toBe(2);
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('integration', () => {
    it('should handle full workflow: save, load, query, prune', () => {
      // Save decisions
      saveDecision(tempDir, 'fe-dev', 1, 'Decision 1', 'Reason 1');
      saveDecision(tempDir, 'fe-dev', 1, 'Decision 2', 'Reason 2');
      addConstraint(tempDir, 'fe-dev', 1, 'Constraint');
      addPattern(tempDir, 'fe-dev', 1, 'Pattern', 'file.ts');

      // Load and verify
      const memory = loadMemory(tempDir, 'fe-dev', 1);
      expect(memory.decisions.length).toBe(2);

      // Query
      const results = queryDecisions(tempDir, { agent: 'fe-dev' });
      expect(results.length).toBe(2);

      // Summary
      const summary = getMemorySummary(tempDir, 'fe-dev', 1);
      expect(summary.decisionCount).toBe(2);

      // Prune (should keep all recent)
      const pruneResult = pruneMemory(tempDir, 'fe-dev', 1);
      expect(pruneResult.prunedCount).toBe(0);
    });

    it('should support multiple agents with separate memory', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'FE decision', 'Reason');
      saveDecision(tempDir, 'be-dev', 1, 'BE decision', 'Reason');

      const feMemory = loadMemory(tempDir, 'fe-dev', 1);
      const beMemory = loadMemory(tempDir, 'be-dev', 1);

      expect(feMemory.decisions[0].decision).toBe('FE decision');
      expect(beMemory.decisions[0].decision).toBe('BE decision');
    });

    it('should support multiple waves for same agent', () => {
      saveDecision(tempDir, 'fe-dev', 1, 'Wave 1 decision', 'Reason');
      saveDecision(tempDir, 'fe-dev', 2, 'Wave 2 decision', 'Reason');

      const wave1Memory = loadMemory(tempDir, 'fe-dev', 1);
      const wave2Memory = loadMemory(tempDir, 'fe-dev', 2);

      expect(wave1Memory.decisions[0].decision).toBe('Wave 1 decision');
      expect(wave2Memory.decisions[0].decision).toBe('Wave 2 decision');
    });
  });

  // ============================================
  // SECURITY TESTS
  // ============================================

  describe('security', () => {
    it('should not allow path traversal in agent name', () => {
      const result = saveDecision(tempDir, '../../../etc/passwd', 1, 'Decision', 'Reason');

      expect(result.success).toBe(false);
      expect(result.error).toBe(STATE_PERSISTENCE_ERRORS.INVALID_AGENT);
    });

    it('should handle invalid JSON in import gracefully', () => {
      const result = importMemory(tempDir, 'fe-dev', 1, '{"unclosed":');

      expect(result.success).toBe(false);
    });

    it('should validate wave number is positive integer', () => {
      const result1 = saveDecision(tempDir, 'fe-dev', -1, 'Decision', 'Reason');
      const result2 = saveDecision(tempDir, 'fe-dev', 0, 'Decision', 'Reason');

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });
  });
});
