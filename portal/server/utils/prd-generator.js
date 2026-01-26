/**
 * PRD Generator Module
 *
 * Synthesizes AI PRD (Product Requirements Document) from multiple sources:
 * - Documentation files (README, CLAUDE.md, etc.)
 * - Design mockups (HTML files)
 * - User-provided vision statement
 * - Code analysis (for existing projects)
 *
 * Pipeline: Sources → Claude Synthesis → Grok Review → Refinement → Validation
 *
 * Based on: docs/prd-generator/SPECIFICATION.md
 * Date: 2026-01-26
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { discoverProject } from './project-discovery.js';
import { VALID_DOMAINS } from './enhanced-story-schema.js';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

/**
 * PRD Schema definition with validation rules
 */
export const PRD_SCHEMA = {
  id: { type: 'string', required: true },
  projectName: { type: 'string', required: true, minLength: 1 },
  version: { type: 'string', required: true, pattern: /^\d+\.\d+\.\d+$/ },
  status: { type: 'string', required: true, enum: ['draft', 'review', 'approved'] },

  overview: {
    type: 'object',
    required: true,
    properties: {
      problemStatement: { type: 'string', required: true, minLength: 20 },
      targetAudience: { type: 'string', required: true, minLength: 10 },
      valueProposition: { type: 'string', required: true, minLength: 20 },
      successMetrics: { type: 'array', required: true, minItems: 2 }
    }
  },

  goals: {
    type: 'object',
    required: true,
    properties: {
      primary: { type: 'array', required: true, minItems: 2 },
      secondary: { type: 'array', required: false },
      nonGoals: { type: 'array', required: false }
    }
  },

  features: {
    type: 'object',
    required: true,
    properties: {
      core: { type: 'array', required: true, minItems: 3 },
      enhanced: { type: 'array', required: false },
      future: { type: 'array', required: false }
    }
  },

  technical: {
    type: 'object',
    required: true,
    properties: {
      stack: { type: 'array', required: true, minItems: 1 },
      integrations: { type: 'array', required: false },
      constraints: { type: 'array', required: false },
      performance: { type: 'array', required: false }
    }
  },

  risks: { type: 'array', required: false },
  dependencies: { type: 'array', required: false },
  personas: { type: 'array', required: false },
  sources: { type: 'object', required: true }
};

/**
 * Score weights for each PRD section (total: 100)
 */
export const PRD_SCORE_WEIGHTS = {
  overview: 25,        // Problem, audience, value prop, metrics
  goals: 15,           // Primary and secondary goals
  features: 30,        // Core features with acceptance criteria
  technical: 15,       // Stack, integrations, constraints
  personas: 5,         // User personas defined
  risks: 5,            // Risks identified with mitigations
  completeness: 5      // All sections present
};

/**
 * Score thresholds for PRD quality assessment
 */
export const PRD_SCORE_THRESHOLDS = {
  excellent: 90,       // Ready for story generation
  good: 80,            // Minor improvements needed
  acceptable: 70,      // Needs work but usable
  minimum: 60,         // Below this is blocked
  failing: 0           // PRD incomplete
};

// ============================================================================
// PROMPTS
// ============================================================================

/**
 * Claude synthesis prompt for PRD generation
 */
export const PRD_SYNTHESIS_PROMPT = `You are creating a comprehensive AI PRD (Product Requirements Document) for autonomous agent implementation.

## Available Sources
{sources}

## Instructions

Generate a complete, structured PRD with these REQUIRED sections:

### 1. Overview (REQUIRED)
- problemStatement: What problem does this product solve? (min 20 chars)
- targetAudience: Who will use this product? (min 10 chars)
- valueProposition: Why should they use it? (min 20 chars)
- successMetrics: How do we measure success? (min 2 metrics)

### 2. Goals (REQUIRED)
- primary: Must-have goals (min 2)
- secondary: Nice-to-have goals
- nonGoals: What we're explicitly NOT doing

### 3. Features (REQUIRED)
- core: MVP features with acceptance criteria (min 3)
- enhanced: Post-MVP features
- future: Roadmap items

Each feature MUST have:
- id: Unique ID (F-001, F-002, etc.)
- name: Feature name
- description: What it does
- priority: must-have | should-have | nice-to-have
- domain: One of the valid domains
- acceptanceCriteria: At least 2 testable criteria
- estimatedComplexity: low | medium | high

### 4. Technical (REQUIRED)
- stack: Technologies used
- integrations: External services
- constraints: Technical limitations
- performance: Performance requirements

### 5. Personas (RECOMMENDED)
- At least one user persona with needs and pain points

### 6. Risks (RECOMMENDED)
- Potential issues with likelihood, impact, and mitigation

## Valid Domains
{domains}

## Output Format
Return a valid JSON object matching the PRD schema. Do not include markdown code blocks.

## Critical Rules
1. Be SPECIFIC - vague PRDs lead to vague implementations
2. Every feature needs testable acceptance criteria
3. Base features on the provided sources, don't invent new requirements
4. If information is missing, note it in constraints rather than making it up
`;

/**
 * Grok review prompt for PRD validation
 */
export const PRD_REVIEW_PROMPT = `You are a senior product manager reviewing a PRD for completeness and accuracy.

## PRD to Review
{prd}

## Original Sources
{sources}

## Review Checklist

1. **Completeness**
   - Are all required sections present?
   - Do features have acceptance criteria?
   - Are success metrics measurable?

2. **Accuracy**
   - Do features match the mockups?
   - Is the tech stack consistent with package.json?
   - Are claims realistic?

3. **Clarity**
   - Can an engineer implement features from descriptions?
   - Are acceptance criteria testable?
   - Are priorities clear?

4. **Gaps**
   - What's missing that should be included?
   - Are there contradictions?
   - Are there unrealistic expectations?

## Output Format

Return JSON:
{
  "score": 0-100,
  "gaps": ["list of missing items"],
  "issues": ["list of problems found"],
  "suggestions": ["list of improvements"],
  "unrealisticClaims": ["claims that seem unrealistic"],
  "recommendation": "approve | revise | reject"
}
`;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate a PRD against the schema
 * @param {Object} prd - PRD to validate
 * @returns {Object} Validation result with errors, warnings, missingRequired
 */
export function validatePRD(prd) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    missingRequired: [],
    score: 0
  };

  // Handle null/undefined/empty input
  if (!prd || typeof prd !== 'object' || Object.keys(prd).length === 0) {
    result.valid = false;
    result.errors.push({ field: 'prd', code: 'INVALID_INPUT', message: 'PRD is null, undefined, or empty' });
    return result;
  }

  // Check required top-level fields
  const requiredFields = ['id', 'projectName', 'version', 'overview', 'goals', 'features', 'technical', 'sources'];
  for (const field of requiredFields) {
    if (prd[field] === undefined || prd[field] === null) {
      result.valid = false;
      result.missingRequired.push(field);
      result.errors.push({ field, code: 'MISSING_REQUIRED', message: `Missing required field: ${field}` });
    }
  }

  // If missing required fields, return early
  if (result.missingRequired.length > 0) {
    return result;
  }

  // Validate version format
  if (prd.version && !PRD_SCHEMA.version.pattern.test(prd.version)) {
    result.valid = false;
    result.errors.push({ field: 'version', code: 'INVALID_FORMAT', message: 'Version must be in X.Y.Z format' });
  }

  // Validate status enum
  if (prd.status && !PRD_SCHEMA.status.enum.includes(prd.status)) {
    result.valid = false;
    result.errors.push({ field: 'status', code: 'INVALID_ENUM', message: 'Invalid status value' });
  }

  // Validate overview section
  if (prd.overview) {
    const overview = prd.overview;

    if (!overview.problemStatement || overview.problemStatement.length < 20) {
      result.valid = false;
      result.errors.push({ field: 'overview.problemStatement', code: 'MIN_LENGTH', message: 'Problem statement must be at least 20 characters' });
    }

    if (!overview.targetAudience || overview.targetAudience.length < 10) {
      result.valid = false;
      result.errors.push({ field: 'overview.targetAudience', code: 'MIN_LENGTH', message: 'Target audience must be at least 10 characters' });
    }

    if (!overview.valueProposition || overview.valueProposition.length < 20) {
      result.valid = false;
      result.errors.push({ field: 'overview.valueProposition', code: 'MIN_LENGTH', message: 'Value proposition must be at least 20 characters' });
    }

    if (!overview.successMetrics || !Array.isArray(overview.successMetrics) || overview.successMetrics.length < 2) {
      result.valid = false;
      result.errors.push({ field: 'overview.successMetrics', code: 'MIN_ITEMS', message: 'At least 2 success metrics required' });
    }
  }

  // Validate goals section
  if (prd.goals) {
    const goals = prd.goals;

    if (!goals.primary || !Array.isArray(goals.primary) || goals.primary.length < 2) {
      result.valid = false;
      result.errors.push({ field: 'goals.primary', code: 'MIN_ITEMS', message: 'At least 2 primary goals required' });
    }
  }

  // Validate features section
  if (prd.features) {
    const features = prd.features;

    if (!features.core || !Array.isArray(features.core) || features.core.length < 3) {
      result.valid = false;
      result.errors.push({ field: 'features.core', code: 'MIN_ITEMS', message: 'At least 3 core features required' });
    }

    // Validate each core feature
    if (features.core && Array.isArray(features.core)) {
      features.core.forEach((feature, index) => {
        // Validate feature ID format (F-XXX)
        if (feature.id && !/^F-\d{3}$/.test(feature.id)) {
          result.errors.push({ field: `features.core[${index}].id`, code: 'INVALID_FORMAT', message: 'Feature ID must be in F-XXX format' });
        }

        // Validate feature name (min 5 chars)
        if (!feature.name || feature.name.length < 5) {
          result.valid = false;
          result.errors.push({ field: `features.core[${index}].name`, code: 'MIN_LENGTH', message: 'Feature name must be at least 5 characters' });
        }

        // Validate feature description (min 20 chars)
        if (!feature.description || feature.description.length < 20) {
          result.valid = false;
          result.errors.push({ field: `features.core[${index}].description`, code: 'MIN_LENGTH', message: 'Feature description must be at least 20 characters' });
        }

        // Validate priority enum
        const validPriorities = ['must-have', 'should-have', 'nice-to-have'];
        if (feature.priority && !validPriorities.includes(feature.priority)) {
          result.valid = false;
          result.errors.push({ field: `features.core[${index}].priority`, code: 'INVALID_ENUM', message: 'Invalid priority value' });
        }

        // Validate acceptance criteria (min 2)
        if (!feature.acceptanceCriteria || !Array.isArray(feature.acceptanceCriteria) || feature.acceptanceCriteria.length < 2) {
          result.valid = false;
          result.errors.push({ field: `features.core[${index}].acceptanceCriteria`, code: 'MIN_ITEMS', message: 'At least 2 acceptance criteria required' });
        }
      });
    }
  }

  // Validate technical section
  if (prd.technical) {
    const technical = prd.technical;

    if (!technical.stack || !Array.isArray(technical.stack) || technical.stack.length < 1) {
      result.valid = false;
      result.errors.push({ field: 'technical.stack', code: 'MIN_ITEMS', message: 'At least 1 tech stack item required' });
    }
  }

  // Add warnings for recommended but missing sections
  if (!prd.personas || !Array.isArray(prd.personas) || prd.personas.length === 0) {
    result.warnings.push({ field: 'personas', code: 'RECOMMENDED', message: 'Personas are recommended but missing' });
  }

  if (!prd.risks || !Array.isArray(prd.risks) || prd.risks.length === 0) {
    result.warnings.push({ field: 'risks', code: 'RECOMMENDED', message: 'Risks are recommended but missing' });
  }

  // Calculate score
  result.score = scorePRD(prd);

  return result;
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate PRD completeness score (0-100)
 * @param {Object} prd - PRD to score
 * @returns {number} Score 0-100
 */
export function scorePRD(prd) {
  if (!prd || typeof prd !== 'object') {
    return 0;
  }

  let score = 0;

  // Overview (25 points)
  if (prd.overview?.problemStatement?.length >= 20) score += 7;
  if (prd.overview?.targetAudience?.length >= 10) score += 6;
  if (prd.overview?.valueProposition?.length >= 20) score += 6;
  if (prd.overview?.successMetrics?.length >= 2) score += 6;

  // Goals (15 points)
  if (prd.goals?.primary?.length >= 2) score += 10;
  if (prd.goals?.secondary?.length > 0) score += 3;
  if (prd.goals?.nonGoals?.length > 0) score += 2;

  // Features (30 points)
  const coreCount = prd.features?.core?.length || 0;
  score += Math.min(15, coreCount * 3);  // Up to 15 for 5+ features

  const featuresWithAC = prd.features?.core?.filter(f =>
    f.acceptanceCriteria?.length >= 2
  ).length || 0;
  score += Math.min(10, featuresWithAC * 2);  // Up to 10 for AC

  const featuresWithDomain = prd.features?.core?.filter(f =>
    f.domain
  ).length || 0;
  score += Math.min(5, featuresWithDomain);  // Up to 5 for domains

  // Technical (15 points)
  if (prd.technical?.stack?.length > 0) score += 8;
  if (prd.technical?.integrations?.length > 0) score += 4;
  if (prd.technical?.constraints?.length > 0) score += 3;

  // Personas (5 points)
  if (prd.personas?.length > 0) score += 5;

  // Risks (5 points)
  if (prd.risks?.length > 0) score += 3;
  if (prd.risks?.some(r => r.mitigation)) score += 2;

  // Completeness (5 points) - based on validation
  const validation = validatePRDBasic(prd);
  if (validation.valid) score += 5;

  return Math.min(100, score);
}

/**
 * Basic validation for scoring (avoids recursion with scorePRD)
 */
function validatePRDBasic(prd) {
  if (!prd || typeof prd !== 'object') return { valid: false };

  const requiredFields = ['id', 'projectName', 'version', 'overview', 'goals', 'features', 'technical', 'sources'];
  for (const field of requiredFields) {
    if (!prd[field]) return { valid: false };
  }

  // Check minimum requirements
  if (!prd.overview?.problemStatement || prd.overview.problemStatement.length < 20) return { valid: false };
  if (!prd.overview?.targetAudience || prd.overview.targetAudience.length < 10) return { valid: false };
  if (!prd.overview?.valueProposition || prd.overview.valueProposition.length < 20) return { valid: false };
  if (!prd.overview?.successMetrics || prd.overview.successMetrics.length < 2) return { valid: false };
  if (!prd.goals?.primary || prd.goals.primary.length < 2) return { valid: false };
  if (!prd.features?.core || prd.features.core.length < 3) return { valid: false };
  if (!prd.technical?.stack || prd.technical.stack.length < 1) return { valid: false };

  return { valid: true };
}

/**
 * Get detailed score breakdown by category
 * @param {Object} prd - PRD to analyze
 * @returns {Object} Score breakdown with details
 */
export function getPRDScoreBreakdown(prd) {
  if (!prd || typeof prd !== 'object') {
    return {
      total: 0,
      overview: { score: 0, max: 25, details: [] },
      goals: { score: 0, max: 15, details: [] },
      features: { score: 0, max: 30, details: [] },
      technical: { score: 0, max: 15, details: [] },
      personas: { score: 0, max: 5, details: [] },
      risks: { score: 0, max: 5, details: [] },
      completeness: { score: 0, max: 5, details: [] }
    };
  }

  const breakdown = {
    total: 0,
    overview: { score: 0, max: 25, details: [] },
    goals: { score: 0, max: 15, details: [] },
    features: { score: 0, max: 30, details: [] },
    technical: { score: 0, max: 15, details: [] },
    personas: { score: 0, max: 5, details: [] },
    risks: { score: 0, max: 5, details: [] },
    completeness: { score: 0, max: 5, details: [] }
  };

  // Overview (25 points)
  if (prd.overview?.problemStatement?.length >= 20) {
    breakdown.overview.score += 7;
    breakdown.overview.details.push('+7 Problem statement (>=20 chars)');
  }
  if (prd.overview?.targetAudience?.length >= 10) {
    breakdown.overview.score += 6;
    breakdown.overview.details.push('+6 Target audience (>=10 chars)');
  }
  if (prd.overview?.valueProposition?.length >= 20) {
    breakdown.overview.score += 6;
    breakdown.overview.details.push('+6 Value proposition (>=20 chars)');
  }
  if (prd.overview?.successMetrics?.length >= 2) {
    breakdown.overview.score += 6;
    breakdown.overview.details.push('+6 Success metrics (>=2)');
  }

  // Goals (15 points)
  if (prd.goals?.primary?.length >= 2) {
    breakdown.goals.score += 10;
    breakdown.goals.details.push('+10 Primary goals (>=2)');
  }
  if (prd.goals?.secondary?.length > 0) {
    breakdown.goals.score += 3;
    breakdown.goals.details.push('+3 Secondary goals defined');
  }
  if (prd.goals?.nonGoals?.length > 0) {
    breakdown.goals.score += 2;
    breakdown.goals.details.push('+2 Non-goals defined');
  }

  // Features (30 points)
  const coreCount = prd.features?.core?.length || 0;
  const corePoints = Math.min(15, coreCount * 3);
  if (corePoints > 0) {
    breakdown.features.score += corePoints;
    breakdown.features.details.push(`+${corePoints} Core features (${coreCount} * 3, max 15)`);
  }

  const featuresWithAC = prd.features?.core?.filter(f =>
    f.acceptanceCriteria?.length >= 2
  ).length || 0;
  const acPoints = Math.min(10, featuresWithAC * 2);
  if (acPoints > 0) {
    breakdown.features.score += acPoints;
    breakdown.features.details.push(`+${acPoints} Features with AC (${featuresWithAC} * 2, max 10)`);
  }

  const featuresWithDomain = prd.features?.core?.filter(f => f.domain).length || 0;
  const domainPoints = Math.min(5, featuresWithDomain);
  if (domainPoints > 0) {
    breakdown.features.score += domainPoints;
    breakdown.features.details.push(`+${domainPoints} Features with domains (max 5)`);
  }

  // Technical (15 points)
  if (prd.technical?.stack?.length > 0) {
    breakdown.technical.score += 8;
    breakdown.technical.details.push('+8 Tech stack defined');
  }
  if (prd.technical?.integrations?.length > 0) {
    breakdown.technical.score += 4;
    breakdown.technical.details.push('+4 Integrations defined');
  }
  if (prd.technical?.constraints?.length > 0) {
    breakdown.technical.score += 3;
    breakdown.technical.details.push('+3 Constraints defined');
  }

  // Personas (5 points)
  if (prd.personas?.length > 0) {
    breakdown.personas.score += 5;
    breakdown.personas.details.push('+5 Personas defined');
  }

  // Risks (5 points)
  if (prd.risks?.length > 0) {
    breakdown.risks.score += 3;
    breakdown.risks.details.push('+3 Risks defined');
  }
  if (prd.risks?.some(r => r.mitigation)) {
    breakdown.risks.score += 2;
    breakdown.risks.details.push('+2 Risks have mitigations');
  }

  // Completeness (5 points)
  const validation = validatePRDBasic(prd);
  if (validation.valid) {
    breakdown.completeness.score += 5;
    breakdown.completeness.details.push('+5 All required sections valid');
  }

  // Calculate total
  breakdown.total =
    breakdown.overview.score +
    breakdown.goals.score +
    breakdown.features.score +
    breakdown.technical.score +
    breakdown.personas.score +
    breakdown.risks.score +
    breakdown.completeness.score;

  return breakdown;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an empty PRD structure
 * @param {string} projectName - Project name
 * @returns {Object} Empty PRD
 */
export function createEmptyPRD(projectName = 'Untitled Project') {
  const now = new Date().toISOString();

  return {
    id: `prd-${randomUUID().slice(0, 8)}`,
    projectName,
    version: '1.0.0',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    generatedBy: 'claude',

    overview: {
      problemStatement: '',
      targetAudience: '',
      valueProposition: '',
      successMetrics: []
    },

    goals: {
      primary: [],
      secondary: [],
      nonGoals: []
    },

    features: {
      core: [],
      enhanced: [],
      future: []
    },

    technical: {
      stack: [],
      integrations: [],
      constraints: [],
      performance: []
    },

    personas: [],
    risks: [],
    dependencies: [],

    sources: {
      documents: [],
      mockups: [],
      userInput: false
    }
  };
}

/**
 * Merge two PRDs, preferring generated content but preserving existing IDs
 * @param {Object} existing - Existing PRD
 * @param {Object} generated - Newly generated PRD
 * @returns {Object} Merged PRD
 */
export function mergePRDs(existing, generated) {
  if (!existing) {
    return generated;
  }

  const merged = {
    ...generated,
    id: existing.id, // Preserve existing ID
    createdAt: existing.createdAt, // Preserve original creation date
    updatedAt: new Date().toISOString()
  };

  // Merge overview - prefer longer/more complete values
  merged.overview = {
    problemStatement: (generated.overview?.problemStatement?.length || 0) >
                      (existing.overview?.problemStatement?.length || 0)
      ? generated.overview.problemStatement
      : existing.overview?.problemStatement || generated.overview?.problemStatement || '',
    targetAudience: (generated.overview?.targetAudience?.length || 0) >
                    (existing.overview?.targetAudience?.length || 0)
      ? generated.overview.targetAudience
      : existing.overview?.targetAudience || generated.overview?.targetAudience || '',
    valueProposition: (generated.overview?.valueProposition?.length || 0) >
                      (existing.overview?.valueProposition?.length || 0)
      ? generated.overview.valueProposition
      : existing.overview?.valueProposition || generated.overview?.valueProposition || '',
    successMetrics: mergeArraysById(
      existing.overview?.successMetrics || [],
      generated.overview?.successMetrics || []
    )
  };

  // Merge goals
  merged.goals = {
    primary: mergeArraysById(
      existing.goals?.primary || [],
      generated.goals?.primary || []
    ),
    secondary: mergeArraysById(
      existing.goals?.secondary || [],
      generated.goals?.secondary || []
    ),
    nonGoals: mergeUniqueStrings(
      existing.goals?.nonGoals || [],
      generated.goals?.nonGoals || []
    )
  };

  // Merge features
  merged.features = {
    core: mergeArraysById(
      existing.features?.core || [],
      generated.features?.core || []
    ),
    enhanced: mergeArraysById(
      existing.features?.enhanced || [],
      generated.features?.enhanced || []
    ),
    future: mergeArraysById(
      existing.features?.future || [],
      generated.features?.future || []
    )
  };

  // Merge technical
  merged.technical = {
    stack: mergeArraysByName(
      existing.technical?.stack || [],
      generated.technical?.stack || []
    ),
    integrations: mergeArraysByName(
      existing.technical?.integrations || [],
      generated.technical?.integrations || []
    ),
    constraints: mergeUniqueStrings(
      existing.technical?.constraints || [],
      generated.technical?.constraints || []
    ),
    performance: mergeArraysByMetric(
      existing.technical?.performance || [],
      generated.technical?.performance || []
    )
  };

  // Merge personas
  merged.personas = mergeArraysById(
    existing.personas || [],
    generated.personas || []
  );

  // Merge risks
  merged.risks = mergeArraysById(
    existing.risks || [],
    generated.risks || []
  );

  // Merge dependencies
  merged.dependencies = mergeArraysByName(
    existing.dependencies || [],
    generated.dependencies || []
  );

  return merged;
}

/**
 * Merge arrays by ID, preferring new items but keeping unique existing ones
 */
function mergeArraysById(existing, generated) {
  const merged = new Map();

  // Add existing items
  for (const item of existing) {
    if (item.id) {
      merged.set(item.id, item);
    }
  }

  // Add/update with generated items
  for (const item of generated) {
    if (item.id) {
      merged.set(item.id, item); // Overwrites existing
    }
  }

  return Array.from(merged.values());
}

/**
 * Merge arrays by name field
 */
function mergeArraysByName(existing, generated) {
  const merged = new Map();

  for (const item of existing) {
    if (item.name) {
      merged.set(item.name, item);
    }
  }

  for (const item of generated) {
    if (item.name) {
      merged.set(item.name, item);
    }
  }

  return Array.from(merged.values());
}

/**
 * Merge arrays by metric field
 */
function mergeArraysByMetric(existing, generated) {
  const merged = new Map();

  for (const item of existing) {
    if (item.metric) {
      merged.set(item.metric, item);
    }
  }

  for (const item of generated) {
    if (item.metric) {
      merged.set(item.metric, item);
    }
  }

  return Array.from(merged.values());
}

/**
 * Merge unique strings
 */
function mergeUniqueStrings(existing, generated) {
  return [...new Set([...existing, ...generated])];
}

/**
 * Extract features from HTML mockups
 * @param {Array} mockups - Mockup files with content
 * @returns {Array} Extracted features
 */
export function extractFeaturesFromMockups(mockups) {
  if (!mockups || !Array.isArray(mockups) || mockups.length === 0) {
    return [];
  }

  const features = [];
  let featureIndex = 1;

  for (const mockup of mockups) {
    if (!mockup?.content) continue;

    const content = mockup.content.toLowerCase();
    const name = mockup.name || 'unknown';

    // Detect forms
    if (content.includes('<form') || content.includes('type="submit"')) {
      const isLogin = content.includes('login') || content.includes('password') ||
                      content.includes('email') || content.includes('sign');
      features.push({
        id: `F-${String(featureIndex++).padStart(3, '0')}`,
        name: isLogin ? 'User Authentication' : 'Form Submission',
        description: isLogin
          ? 'User can authenticate using credentials provided in the form'
          : 'User can submit form data for processing',
        priority: 'must-have',
        domain: isLogin ? 'authentication' : 'forms',
        acceptanceCriteria: isLogin
          ? ['User can enter credentials', 'Form validates input', 'User receives feedback on submission']
          : ['Form fields are validated', 'Data is submitted successfully', 'User receives confirmation'],
        mockupRefs: [name],
        estimatedComplexity: 'medium'
      });
    }

    // Detect navigation
    if (content.includes('<nav') || (content.includes('<a') && content.includes('href'))) {
      features.push({
        id: `F-${String(featureIndex++).padStart(3, '0')}`,
        name: 'Navigation System',
        description: 'User can navigate between different sections of the application',
        priority: 'must-have',
        domain: 'navigation',
        acceptanceCriteria: ['Navigation links are visible', 'Links navigate to correct pages', 'Current page is highlighted'],
        mockupRefs: [name],
        estimatedComplexity: 'low'
      });
    }

    // Detect tables/lists
    if (content.includes('<table') || content.includes('<ul') || content.includes('<ol')) {
      features.push({
        id: `F-${String(featureIndex++).padStart(3, '0')}`,
        name: 'Data Display',
        description: 'System displays data in organized tables or lists for user viewing',
        priority: 'should-have',
        domain: 'ui-components',
        acceptanceCriteria: ['Data is displayed in organized format', 'Headers/labels are clear', 'Empty state is handled'],
        mockupRefs: [name],
        estimatedComplexity: 'low'
      });
    }

    // Detect buttons (actions)
    const buttonMatches = content.match(/<button[^>]*>[^<]*<\/button>/gi);
    if (buttonMatches && buttonMatches.length > 0) {
      const buttonTexts = buttonMatches.map(b => b.replace(/<[^>]+>/g, '').trim()).filter(t => t);
      if (buttonTexts.length > 0 && !features.some(f => f.name === 'Action Buttons')) {
        features.push({
          id: `F-${String(featureIndex++).padStart(3, '0')}`,
          name: 'Action Buttons',
          description: `User can perform actions via buttons: ${buttonTexts.slice(0, 3).join(', ')}`,
          priority: 'must-have',
          domain: 'ui-components',
          acceptanceCriteria: ['Buttons are clickable', 'Actions are performed on click', 'Loading states are shown'],
          mockupRefs: [name],
          estimatedComplexity: 'low'
        });
      }
    }
  }

  return features;
}

/**
 * Gather all sources for PRD generation
 * @param {string} projectPath - Project path
 * @returns {Promise<Object>} Sources object
 */
export async function gatherPRDSources(projectPath) {
  const sources = {
    docs: [],
    mockups: [],
    techStack: [],
    projectName: 'Unknown Project',
    vision: '',
    description: ''
  };

  try {
    // Check if path exists
    await fs.access(projectPath);

    // Use project discovery
    const discovery = await discoverProject(projectPath);

    sources.projectName = discovery.name || 'Unknown Project';
    sources.vision = discovery.vision || '';
    sources.description = discovery.description || '';
    sources.techStack = discovery.techStack || [];

    // Read documentation files
    for (const doc of discovery.documentation || []) {
      try {
        const content = await fs.readFile(doc.path, 'utf-8');
        sources.docs.push({
          name: doc.filename,
          type: doc.type,
          content
        });
      } catch (e) {
        // Skip files that can't be read
      }
    }

    // Read mockup files
    for (const mockup of discovery.mockups || []) {
      try {
        const content = await fs.readFile(mockup.path, 'utf-8');
        sources.mockups.push({
          name: mockup.filename,
          content
        });
      } catch (e) {
        // Skip files that can't be read
      }
    }
  } catch (e) {
    // Path doesn't exist or other error - return empty sources
  }

  return sources;
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate a complete AI PRD from project sources
 * @param {string} projectPath - Path to project
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result
 */
export async function generatePRD(projectPath, options = {}) {
  const {
    visionStatement = '',
    forceRegenerate = false,
    maxTokens = 4000,
    skipLLM = false
  } = options;

  const result = {
    success: false,
    prd: null,
    validation: { valid: false, errors: [], warnings: [], missingRequired: [] },
    score: 0,
    sources: {
      documents: [],
      mockups: [],
      userInput: !!visionStatement
    },
    cost: {
      synthesis: 0,
      review: 0,
      refinement: 0,
      total: 0
    },
    error: null
  };

  try {
    // Gather sources
    const sources = await gatherPRDSources(projectPath);

    result.sources.documents = sources.docs.map(d => d.name);
    result.sources.mockups = sources.mockups.map(m => m.name);

    // If no sources and no vision statement, return error
    if (sources.docs.length === 0 && sources.mockups.length === 0 && !visionStatement) {
      result.error = 'No sources found for PRD generation. Add documentation, mockups, or provide a vision statement.';
      return result;
    }

    // If skipLLM mode (for testing), create a basic PRD from sources
    if (skipLLM) {
      const prd = createEmptyPRD(sources.projectName);

      // Populate from sources
      prd.overview.problemStatement = sources.vision || sources.description || visionStatement || 'Problem to be defined';
      prd.overview.targetAudience = 'Target users to be defined';
      prd.overview.valueProposition = 'Value proposition to be defined';

      // Extract features from mockups
      const extractedFeatures = extractFeaturesFromMockups(sources.mockups);
      prd.features.core = extractedFeatures;

      prd.sources = result.sources;

      result.prd = prd;
      result.validation = validatePRD(prd);
      result.score = scorePRD(prd);
      result.success = true;

      return result;
    }

    // TODO: Implement LLM-based generation
    // For now, create basic PRD
    const prd = createEmptyPRD(sources.projectName);
    prd.sources = result.sources;

    result.prd = prd;
    result.validation = validatePRD(prd);
    result.score = scorePRD(prd);
    result.success = true;

    return result;
  } catch (e) {
    result.error = e.message;
    return result;
  }
}

// Default export
export default generatePRD;
