// ═══════════════════════════════════════════════════════════════════════════════
// WAVE FRAMEWORK - Adaptive Model Router
// ═══════════════════════════════════════════════════════════════════════════════
// Routes tasks to optimal Claude model (Haiku/Sonnet/Opus) based on complexity
// Uses rule-based pattern matching for zero-latency classification
//
// Sources:
// - https://arxiv.org/html/2406.18665v4 (RouteLLM Framework, ICLR 2025)
// - https://github.com/0xrdan/claude-router
// - https://platform.claude.com/docs/en/about-claude/models/choosing-a-model
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const COMPLEXITY_TIERS = {
  SIMPLE: 'simple',
  MEDIUM: 'medium',
  COMPLEX: 'complex'
};

export const MODEL_TIERS = {
  HAIKU: 'haiku',
  SONNET: 'sonnet',
  OPUS: 'opus'
};

// Model pricing per 1M tokens (USD)
const MODEL_PRICING = {
  haiku: { input: 0.25, output: 1.25 },
  sonnet: { input: 3.00, output: 15.00 },
  opus: { input: 15.00, output: 75.00 }
};

// Complexity to model mapping
const COMPLEXITY_TO_MODEL = {
  [COMPLEXITY_TIERS.SIMPLE]: MODEL_TIERS.HAIKU,
  [COMPLEXITY_TIERS.MEDIUM]: MODEL_TIERS.SONNET,
  [COMPLEXITY_TIERS.COMPLEX]: MODEL_TIERS.OPUS
};

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

// Simple task patterns (route to Haiku)
const SIMPLE_PATTERNS = [
  // Extraction & parsing
  /\b(extract|parse|get|fetch|read|load)\b.*\b(from|the)\b/i,
  /\bextract\b/i,
  /\bparse\b/i,
  // Formatting & conversion
  /\b(format|convert|transform)\b.*\b(to|into)\b/i,
  /\bformat\b/i,
  /\bconvert\b/i,
  // Simple questions
  /\bwhat is\b/i,
  /\bexplain\b.*\b(what|how|why)\b/i,
  /\bexplain\b/i,
  // Minor edits
  /\b(fix|correct)\b.*\b(typo|spelling|grammar)\b/i,
  /\btypo\b/i,
  /\brename\b/i,
  // Config changes
  /\b(update|change|set)\b.*\b(config|setting|port|value)\b/i,
  /\bupdate config\b/i,
  // Listing & counting
  /\b(list|count|enumerate|show)\b/i,
  // Classification
  /\bclassify\b/i,
  /\bcategorize\b/i
];

// Complex task patterns (route to Opus)
const COMPLEX_PATTERNS = [
  // Architecture & design
  /\b(design|architect)\b.*\b(system|architecture|platform)\b/i,
  /\bdesign\b/i,
  /\barchitect\b/i,
  // Strategic planning
  /\b(plan|strategy)\b.*\b(migration|implementation|deployment)\b/i,
  /\bplan\b/i,
  /\bstrategy\b/i,
  // Security analysis
  /\b(analyze|audit)\b.*\b(security|vulnerabilities|threats)\b/i,
  /\banalyze security\b/i,
  // Comprehensive tasks
  /\bcomprehensive\b/i,
  /\bscalable\b/i,
  /\benterprise\b/i,
  // Multi-step complex tasks
  /\b(research|design|implement)\b.*\b(and|,)\b.*\b(design|implement|deploy)\b/i,
  // Migration & orchestration
  /\bmigrate\b/i,
  /\borchestrate\b/i,
  /\bcoordinate\b.*\b(multiple|agents)\b/i,
  // System-level thinking
  /\b(entire|whole|full)\b.*\b(codebase|system|application)\b/i
];

// Medium task patterns (route to Sonnet) - these are checked if no strong match
const MEDIUM_PATTERNS = [
  // Feature implementation
  /\b(implement|add|create)\b.*\b(feature|functionality|endpoint)\b/i,
  /\bimplement\b/i,
  // Refactoring
  /\brefactor\b/i,
  // Testing
  /\b(write|create|add)\b.*\b(test|tests|spec)\b/i,
  /\btest\b/i,
  // Debugging
  /\bdebug\b/i,
  /\bfix\b.*\b(bug|error|issue)\b/i,
  // General coding (but not "format this code" - that's simple)
  /\b(build|develop)\b/i,
  /\bcode\b(?!.*\bformat\b)/i
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPLEXITY CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify task complexity based on pattern matching
 * @param {string} task - The task description
 * @returns {{ tier: string, confidence: number, matchedPatterns: string[] }}
 */
export function classifyComplexity(task) {
  if (!task || task.trim() === '') {
    return {
      tier: COMPLEXITY_TIERS.MEDIUM,
      confidence: 0.5,
      matchedPatterns: []
    };
  }

  const normalizedTask = task.toLowerCase();
  const matchedPatterns = [];

  // Count pattern matches for each tier
  let simpleScore = 0;
  let mediumScore = 0;
  let complexScore = 0;

  // Check simple patterns
  for (const pattern of SIMPLE_PATTERNS) {
    if (pattern.test(normalizedTask)) {
      simpleScore++;
      matchedPatterns.push(`simple:${pattern.source.substring(0, 30)}`);
    }
  }

  // Check complex patterns
  for (const pattern of COMPLEX_PATTERNS) {
    if (pattern.test(normalizedTask)) {
      complexScore++;
      matchedPatterns.push(`complex:${pattern.source.substring(0, 30)}`);
    }
  }

  // Check medium patterns
  for (const pattern of MEDIUM_PATTERNS) {
    if (pattern.test(normalizedTask)) {
      mediumScore++;
      matchedPatterns.push(`medium:${pattern.source.substring(0, 30)}`);
    }
  }

  // Determine tier based on scores
  const totalScore = simpleScore + mediumScore + complexScore;

  if (totalScore === 0) {
    // No patterns matched, default to medium
    return {
      tier: COMPLEXITY_TIERS.MEDIUM,
      confidence: 0.5,
      matchedPatterns
    };
  }

  // Complex patterns take precedence if they have significant matches
  // and clearly outweigh simple patterns
  if (complexScore > 0 && complexScore > simpleScore) {
    const confidence = Math.min(0.5 + (complexScore * 0.15), 1.0);
    return {
      tier: COMPLEXITY_TIERS.COMPLEX,
      confidence,
      matchedPatterns
    };
  }

  // Simple patterns win if they match and aren't outweighed by complex
  // Prefer simple over medium when tied (cost optimization)
  if (simpleScore > 0 && simpleScore >= mediumScore && complexScore === 0) {
    const confidence = Math.min(0.5 + (simpleScore * 0.1), 1.0);
    return {
      tier: COMPLEXITY_TIERS.SIMPLE,
      confidence,
      matchedPatterns
    };
  }

  // Default to medium
  const confidence = Math.min(0.5 + (mediumScore * 0.1), 0.9);
  return {
    tier: COMPLEXITY_TIERS.MEDIUM,
    confidence,
    matchedPatterns
  };
}

/**
 * Select the optimal model for a task
 * @param {string} task - The task description
 * @returns {string} The model to use (haiku, sonnet, opus)
 */
export function selectModel(task) {
  const classification = classifyComplexity(task);
  return COMPLEXITY_TO_MODEL[classification.tier];
}

/**
 * Calculate cost savings based on routing statistics
 * @param {Object} stats - Routing statistics by model
 * @returns {{ actualCost: number, opusCost: number, estimated: number, savingsPercent: number }}
 */
export function calculateCostSavings(stats) {
  let actualCost = 0;
  let opusCost = 0;

  for (const [model, data] of Object.entries(stats)) {
    const pricing = MODEL_PRICING[model];
    if (pricing && data.inputTokens !== undefined) {
      actualCost += (data.inputTokens / 1_000_000) * pricing.input;
      actualCost += (data.outputTokens / 1_000_000) * pricing.output;

      // Calculate what it would cost with Opus
      opusCost += (data.inputTokens / 1_000_000) * MODEL_PRICING.opus.input;
      opusCost += (data.outputTokens / 1_000_000) * MODEL_PRICING.opus.output;
    }
  }

  const estimated = opusCost - actualCost;
  const savingsPercent = opusCost > 0 ? (estimated / opusCost) * 100 : 0;

  return {
    actualCost,
    opusCost,
    estimated,
    savingsPercent
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL ROUTER CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ModelRouter - Adaptive model routing with tracking
 */
export class ModelRouter {
  constructor() {
    this.history = [];
    this.stats = {
      totalRouted: 0,
      autoRouted: 0,
      overrides: 0,
      byModel: {
        haiku: 0,
        sonnet: 0,
        opus: 0
      },
      tokensByModel: {
        haiku: { inputTokens: 0, outputTokens: 0 },
        sonnet: { inputTokens: 0, outputTokens: 0 },
        opus: { inputTokens: 0, outputTokens: 0 }
      }
    };
  }

  /**
   * Route a task to the optimal model
   * @param {string} task - The task description
   * @param {Object} [options] - Routing options
   * @param {string} [options.model] - Force specific model (override)
   * @param {string} [options.forceModel] - Alias for model override
   * @param {number} [options.inputTokens] - Estimated input tokens
   * @param {number} [options.outputTokens] - Estimated output tokens
   * @param {number} [options.contextLength] - Context length for complexity adjustment
   * @param {string[]} [options.tools] - Tools being used for complexity adjustment
   * @returns {{ model: string, complexity: Object, override: boolean }}
   */
  route(task, options = {}) {
    const complexity = this.classifyWithContext(task, options);

    let model;
    let override = false;

    // Check for manual override
    if (options.model || options.forceModel) {
      model = options.model || options.forceModel;
      override = true;
      this.stats.overrides++;
    } else {
      model = COMPLEXITY_TO_MODEL[complexity.tier];
      this.stats.autoRouted++;
    }

    // Update statistics
    this.stats.totalRouted++;
    this.stats.byModel[model]++;

    // Track tokens if provided
    const inputTokens = options.inputTokens || 0;
    const outputTokens = options.outputTokens || 0;
    this.stats.tokensByModel[model].inputTokens += inputTokens;
    this.stats.tokensByModel[model].outputTokens += outputTokens;

    // Record history
    const record = {
      task,
      model,
      complexity,
      override,
      timestamp: new Date().toISOString(),
      inputTokens,
      outputTokens
    };
    this.history.push(record);

    return {
      model,
      complexity,
      override
    };
  }

  /**
   * Classify complexity with context awareness
   * @private
   */
  classifyWithContext(task, options) {
    const baseClassification = classifyComplexity(task);

    // Adjust based on context length
    if (options.contextLength && options.contextLength > 50000) {
      // Long context suggests more complex task
      if (baseClassification.tier === COMPLEXITY_TIERS.SIMPLE) {
        return {
          ...baseClassification,
          tier: COMPLEXITY_TIERS.MEDIUM,
          adjustedBy: 'contextLength'
        };
      }
    }

    // Adjust based on tool usage
    if (options.tools && options.tools.length > 2) {
      // Many tools suggests more complex task - upgrade one tier
      if (baseClassification.tier === COMPLEXITY_TIERS.SIMPLE) {
        return {
          ...baseClassification,
          tier: COMPLEXITY_TIERS.MEDIUM,
          adjustedBy: 'toolCount'
        };
      }
      if (baseClassification.tier === COMPLEXITY_TIERS.MEDIUM) {
        return {
          ...baseClassification,
          tier: COMPLEXITY_TIERS.COMPLEX,
          adjustedBy: 'toolCount'
        };
      }
    }

    return baseClassification;
  }

  /**
   * Get routing statistics
   * @returns {Object}
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get routing history
   * @returns {Array}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Get cost savings analysis
   * @returns {Object}
   */
  getCostSavings() {
    const statsWithTokens = {};

    for (const [model, data] of Object.entries(this.stats.tokensByModel)) {
      statsWithTokens[model] = {
        count: this.stats.byModel[model],
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens
      };
    }

    return calculateCostSavings(statsWithTokens);
  }

  /**
   * Reset statistics
   */
  reset() {
    this.history = [];
    this.stats = {
      totalRouted: 0,
      autoRouted: 0,
      overrides: 0,
      byModel: { haiku: 0, sonnet: 0, opus: 0 },
      tokensByModel: {
        haiku: { inputTokens: 0, outputTokens: 0 },
        sonnet: { inputTokens: 0, outputTokens: 0 },
        opus: { inputTokens: 0, outputTokens: 0 }
      }
    };
  }
}

export default ModelRouter;
