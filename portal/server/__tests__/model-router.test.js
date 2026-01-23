// ═══════════════════════════════════════════════════════════════════════════════
// MODEL ROUTER TESTS (TDD - Written First)
// ═══════════════════════════════════════════════════════════════════════════════
// Tests for GAP-008: Adaptive Model Routing
// Based on RouteLLM (ICLR 2025) and Anthropic model selection best practices
//
// Sources:
// - https://arxiv.org/html/2406.18665v4 (RouteLLM Framework)
// - https://github.com/0xrdan/claude-router
// - https://platform.claude.com/docs/en/about-claude/models/choosing-a-model
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';

// Import the module we're going to implement
import {
  ModelRouter,
  classifyComplexity,
  selectModel,
  COMPLEXITY_TIERS,
  MODEL_TIERS,
  calculateCostSavings
} from '../utils/model-router.js';

describe('ModelRouter', () => {
  let router;

  beforeEach(() => {
    router = new ModelRouter();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC1: Classify task complexity into three tiers
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC1: Complexity Classification', () => {
    it('should classify simple extraction tasks as SIMPLE', () => {
      const tasks = [
        'Extract the email from this text',
        'What is JSON?',
        'Parse this CSV file',
        'Format this code',
        'Fix this typo in the README'
      ];

      for (const task of tasks) {
        const result = classifyComplexity(task);
        expect(result.tier).toBe(COMPLEXITY_TIERS.SIMPLE);
      }
    });

    it('should classify coding tasks as MEDIUM', () => {
      const tasks = [
        'Add a new endpoint for user authentication',
        'Refactor this function to use async/await',
        'Write unit tests for the user service',
        'Debug why the API returns 500 error',
        'Implement form validation'
      ];

      for (const task of tasks) {
        const result = classifyComplexity(task);
        expect(result.tier).toBe(COMPLEXITY_TIERS.MEDIUM);
      }
    });

    it('should classify architecture tasks as COMPLEX', () => {
      const tasks = [
        'Design the system architecture for a microservices platform',
        'Plan the migration strategy from monolith to microservices',
        'Analyze security vulnerabilities in the authentication system',
        'Create a comprehensive testing strategy for the entire codebase',
        'Architect a real-time event-driven system'
      ];

      for (const task of tasks) {
        const result = classifyComplexity(task);
        expect(result.tier).toBe(COMPLEXITY_TIERS.COMPLEX);
      }
    });

    it('should return confidence score with classification', () => {
      const result = classifyComplexity('Extract the name from this JSON');

      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return matched patterns for transparency', () => {
      const result = classifyComplexity('Design the database schema');

      expect(result).toHaveProperty('matchedPatterns');
      expect(Array.isArray(result.matchedPatterns)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC2: Route simple tasks to Haiku
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC2: Haiku Routing', () => {
    it('should route extraction tasks to haiku', () => {
      const model = selectModel('Extract all URLs from this HTML');
      expect(model).toBe(MODEL_TIERS.HAIKU);
    });

    it('should route classification tasks to haiku', () => {
      const model = selectModel('Classify this support ticket as bug or feature');
      expect(model).toBe(MODEL_TIERS.HAIKU);
    });

    it('should route simple formatting to haiku', () => {
      const model = selectModel('Convert this JSON to YAML');
      expect(model).toBe(MODEL_TIERS.HAIKU);
    });

    it('should route typo fixes to haiku', () => {
      const model = selectModel('Fix the typo in line 42');
      expect(model).toBe(MODEL_TIERS.HAIKU);
    });

    it('should route config changes to haiku', () => {
      const model = selectModel('Update the port number in config.json');
      expect(model).toBe(MODEL_TIERS.HAIKU);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC3: Route complex tasks to Opus
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC3: Opus Routing', () => {
    it('should route architecture design to opus', () => {
      const model = selectModel('Design a scalable architecture for handling 1M concurrent users');
      expect(model).toBe(MODEL_TIERS.OPUS);
    });

    it('should route strategic planning to opus', () => {
      const model = selectModel('Plan the implementation strategy for migrating to Kubernetes');
      expect(model).toBe(MODEL_TIERS.OPUS);
    });

    it('should route security analysis to opus', () => {
      const model = selectModel('Analyze the codebase for potential security vulnerabilities');
      expect(model).toBe(MODEL_TIERS.OPUS);
    });

    it('should route multi-step complex tasks to opus', () => {
      const model = selectModel('Research, design, and implement a new caching layer with Redis');
      expect(model).toBe(MODEL_TIERS.OPUS);
    });

    it('should route agent orchestration to opus', () => {
      const model = selectModel('Coordinate multiple agents to complete the feature implementation');
      expect(model).toBe(MODEL_TIERS.OPUS);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC4: Default balanced tasks to Sonnet
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC4: Sonnet Routing', () => {
    it('should route feature implementation to sonnet', () => {
      const model = selectModel('Implement user login functionality');
      expect(model).toBe(MODEL_TIERS.SONNET);
    });

    it('should route refactoring to sonnet', () => {
      const model = selectModel('Refactor the payment module to use dependency injection');
      expect(model).toBe(MODEL_TIERS.SONNET);
    });

    it('should route test writing to sonnet', () => {
      const model = selectModel('Write integration tests for the API endpoints');
      expect(model).toBe(MODEL_TIERS.SONNET);
    });

    it('should route debugging to sonnet', () => {
      const model = selectModel('Debug the race condition in the async handler');
      expect(model).toBe(MODEL_TIERS.SONNET);
    });

    it('should default ambiguous tasks to sonnet', () => {
      const model = selectModel('Help me with this code');
      expect(model).toBe(MODEL_TIERS.SONNET);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC5: Track routing decisions and cost savings
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC5: Tracking & Cost Savings', () => {
    it('should track routing decisions', () => {
      router.route('Extract email from text');
      router.route('Design system architecture');
      router.route('Implement login feature');

      const stats = router.getStats();

      expect(stats.totalRouted).toBe(3);
      expect(stats.byModel.haiku).toBe(1);
      expect(stats.byModel.opus).toBe(1);
      expect(stats.byModel.sonnet).toBe(1);
    });

    it('should calculate estimated cost savings', () => {
      // Route 10 simple tasks that would normally go to opus
      for (let i = 0; i < 10; i++) {
        router.route('Extract data from JSON', { inputTokens: 1000, outputTokens: 500 });
      }

      const savings = router.getCostSavings();

      expect(savings).toHaveProperty('estimated');
      expect(savings).toHaveProperty('actualCost');
      expect(savings).toHaveProperty('opusCost');
      expect(savings.estimated).toBeGreaterThan(0);
    });

    it('should provide routing history', () => {
      router.route('Fix typo');
      router.route('Design architecture');

      const history = router.getHistory();

      expect(history.length).toBe(2);
      expect(history[0]).toHaveProperty('task');
      expect(history[0]).toHaveProperty('model');
      expect(history[0]).toHaveProperty('complexity');
      expect(history[0]).toHaveProperty('timestamp');
    });

    it('should calculate savings percentage', () => {
      const savings = calculateCostSavings({
        haiku: { count: 50, inputTokens: 50000, outputTokens: 25000 },
        sonnet: { count: 30, inputTokens: 30000, outputTokens: 15000 },
        opus: { count: 20, inputTokens: 20000, outputTokens: 10000 }
      });

      expect(savings).toHaveProperty('savingsPercent');
      expect(savings.savingsPercent).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC6: Support manual model override
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC6: Manual Override', () => {
    it('should allow explicit model selection', () => {
      const result = router.route('Simple task', { model: MODEL_TIERS.OPUS });

      expect(result.model).toBe(MODEL_TIERS.OPUS);
      expect(result.override).toBe(true);
    });

    it('should track overrides separately', () => {
      router.route('Task 1', { model: MODEL_TIERS.OPUS });
      router.route('Task 2'); // Auto-routed

      const stats = router.getStats();

      expect(stats.overrides).toBe(1);
      expect(stats.autoRouted).toBe(1);
    });

    it('should support force-haiku option for cost-sensitive scenarios', () => {
      const result = router.route('Design architecture', { forceModel: 'haiku' });

      expect(result.model).toBe(MODEL_TIERS.HAIKU);
    });

    it('should support force-opus option for quality-critical scenarios', () => {
      const result = router.route('Fix typo', { forceModel: 'opus' });

      expect(result.model).toBe(MODEL_TIERS.OPUS);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AC7: Classification latency under 10ms
  // ─────────────────────────────────────────────────────────────────────────────

  describe('AC7: Performance', () => {
    it('should classify complexity in under 10ms', () => {
      const task = 'Design a comprehensive microservices architecture with event sourcing';

      const start = performance.now();
      classifyComplexity(task);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should route in under 10ms', () => {
      const task = 'Implement user authentication with OAuth2';

      const start = performance.now();
      selectModel(task);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should handle batch classification efficiently', () => {
      const tasks = Array(100).fill('Implement feature X');

      const start = performance.now();
      tasks.forEach(task => classifyComplexity(task));
      const duration = performance.now() - start;

      // 100 classifications should take < 100ms (avg < 1ms each)
      expect(duration).toBeLessThan(100);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Edge Cases & Pattern Matching
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle empty task gracefully', () => {
      const result = classifyComplexity('');

      expect(result.tier).toBe(COMPLEXITY_TIERS.MEDIUM); // Default
    });

    it('should handle very long tasks', () => {
      const longTask = 'Implement '.repeat(1000) + 'feature';

      const start = performance.now();
      const result = classifyComplexity(longTask);
      const duration = performance.now() - start;

      expect(result.tier).toBeDefined();
      expect(duration).toBeLessThan(50); // Still fast
    });

    it('should be case-insensitive', () => {
      const lower = classifyComplexity('design architecture');
      const upper = classifyComplexity('DESIGN ARCHITECTURE');
      const mixed = classifyComplexity('Design Architecture');

      expect(lower.tier).toBe(upper.tier);
      expect(lower.tier).toBe(mixed.tier);
    });

    it('should handle special characters', () => {
      const result = classifyComplexity('Fix bug in @user/package-name#123');

      expect(result.tier).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Pattern Recognition
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Pattern Recognition', () => {
    it('should recognize SIMPLE patterns', () => {
      const simplePatterns = [
        'extract', 'parse', 'format', 'convert', 'list', 'count',
        'what is', 'explain', 'typo', 'rename', 'update config'
      ];

      for (const pattern of simplePatterns) {
        const result = classifyComplexity(`${pattern} something`);
        expect(result.tier).toBe(COMPLEXITY_TIERS.SIMPLE);
      }
    });

    it('should recognize COMPLEX patterns', () => {
      const complexPatterns = [
        'design', 'architect', 'plan', 'strategy', 'analyze security',
        'migrate', 'orchestrate', 'comprehensive', 'scalable'
      ];

      for (const pattern of complexPatterns) {
        const result = classifyComplexity(`${pattern} the system`);
        expect(result.tier).toBe(COMPLEXITY_TIERS.COMPLEX);
      }
    });

    it('should weight multiple indicators', () => {
      // Multiple complex indicators should increase confidence
      const result = classifyComplexity(
        'Design and architect a scalable, comprehensive migration strategy'
      );

      expect(result.tier).toBe(COMPLEXITY_TIERS.COMPLEX);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Context-Aware Routing
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Context-Aware Routing', () => {
    it('should consider context length in routing', () => {
      const shortContext = { contextLength: 1000 };
      const longContext = { contextLength: 100000 };

      const shortResult = router.route('Help with this', shortContext);
      const longResult = router.route('Help with this', longContext);

      // Longer context suggests more complex task
      expect(longResult.complexity.tier).not.toBe(COMPLEXITY_TIERS.SIMPLE);
    });

    it('should consider tool usage hints', () => {
      const withTools = { tools: ['read', 'write', 'execute', 'search'] };
      const noTools = { tools: [] };

      const toolResult = router.route('Do something', withTools);
      const noToolResult = router.route('Do something', noTools);

      // More tools suggests more complex task
      expect(toolResult.complexity.tier).not.toBe(noToolResult.complexity.tier);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Constants & Types
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Constants', () => {
    it('should export COMPLEXITY_TIERS', () => {
      expect(COMPLEXITY_TIERS).toHaveProperty('SIMPLE');
      expect(COMPLEXITY_TIERS).toHaveProperty('MEDIUM');
      expect(COMPLEXITY_TIERS).toHaveProperty('COMPLEX');
    });

    it('should export MODEL_TIERS', () => {
      expect(MODEL_TIERS).toHaveProperty('HAIKU');
      expect(MODEL_TIERS).toHaveProperty('SONNET');
      expect(MODEL_TIERS).toHaveProperty('OPUS');
    });

    it('should map complexity to models correctly', () => {
      expect(MODEL_TIERS.HAIKU).toBe('haiku');
      expect(MODEL_TIERS.SONNET).toBe('sonnet');
      expect(MODEL_TIERS.OPUS).toBe('opus');
    });
  });
});
