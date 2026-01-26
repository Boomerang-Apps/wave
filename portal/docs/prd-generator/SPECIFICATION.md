# PRD Generator - Technical Specification

**Version:** 1.0.0
**Date:** 2026-01-26
**Status:** SPECIFICATION COMPLETE
**Author:** WAVE Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Design Goals](#design-goals)
3. [PRD Schema](#prd-schema)
4. [Generation Pipeline](#generation-pipeline)
5. [Validation Rules](#validation-rules)
6. [Scoring System](#scoring-system)
7. [API Reference](#api-reference)
8. [Prompts](#prompts)
9. [Examples](#examples)

---

## Overview

The PRD Generator synthesizes a structured AI PRD (Product Requirements Document) from multiple sources:

- Existing documentation (README, CLAUDE.md, any .md files)
- Design mockups (extracts features from HTML)
- User-provided vision statement
- Code analysis (for existing projects)

### Generation Pipeline

```
Sources → Claude Synthesis → Grok Review → Refinement → Validation → Output
```

### File Location

```
server/utils/prd-generator.js
server/__tests__/prd-generator.test.js
```

---

## Design Goals

### 1. Comprehensive PRD
Generate a complete PRD covering problem, goals, features, technical requirements.

### 2. Source-Based Synthesis
Use all available project sources, don't invent requirements.

### 3. Truthful Review
Use Grok to identify gaps and unrealistic claims.

### 4. Measurable Quality
Score PRD completeness objectively (0-100).

### 5. Actionable Output
Every feature must have clear acceptance criteria.

---

## PRD Schema

### TypeScript Interface

```typescript
interface AIPRD {
  // === METADATA ===
  id: string;                    // Auto-generated UUID
  projectName: string;
  version: string;               // e.g., "1.0.0"
  status: 'draft' | 'review' | 'approved';
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  generatedBy: 'claude' | 'grok' | 'manual';

  // === OVERVIEW ===
  overview: {
    problemStatement: string;    // What problem does this solve?
    targetAudience: string;      // Who is this for?
    valueProposition: string;    // Why should they care?
    successMetrics: SuccessMetric[];
  };

  // === GOALS ===
  goals: {
    primary: Goal[];             // Must-have goals
    secondary: Goal[];           // Nice-to-have goals
    nonGoals: string[];          // Explicitly out of scope
  };

  // === FEATURES ===
  features: {
    core: Feature[];             // MVP features
    enhanced: Feature[];         // Post-MVP features
    future: Feature[];           // Roadmap items
  };

  // === PERSONAS ===
  personas: Persona[];

  // === TECHNICAL ===
  technical: {
    stack: TechStackItem[];
    integrations: Integration[];
    constraints: string[];
    performance: PerformanceRequirement[];
  };

  // === RISKS ===
  risks: Risk[];

  // === DEPENDENCIES ===
  dependencies: Dependency[];

  // === SOURCES ===
  sources: {
    documents: string[];         // Docs used for synthesis
    mockups: string[];           // Mockups analyzed
    userInput: boolean;          // Vision statement provided
  };
}

interface SuccessMetric {
  id: string;                    // "SM-001"
  metric: string;
  target: string;
  measurable: boolean;
}

interface Goal {
  id: string;                    // "G-001"
  description: string;
  measurable: boolean;
  metric?: string;
}

interface Feature {
  id: string;                    // "F-001"
  name: string;
  description: string;
  priority: 'must-have' | 'should-have' | 'nice-to-have';
  domain: string;                // From VALID_DOMAINS
  acceptanceCriteria: string[];
  mockupRefs: string[];          // Mockup files showing this
  estimatedComplexity: 'low' | 'medium' | 'high';
}

interface Persona {
  id: string;                    // "P-001"
  name: string;
  role: string;
  needs: string[];
  painPoints: string[];
}

interface TechStackItem {
  category: 'frontend' | 'backend' | 'database' | 'infrastructure' | 'tool';
  name: string;
  version?: string;
  purpose: string;
}

interface Integration {
  name: string;
  type: 'api' | 'sdk' | 'service';
  purpose: string;
  required: boolean;
}

interface PerformanceRequirement {
  metric: string;
  target: string;
  priority: 'critical' | 'important' | 'nice-to-have';
}

interface Risk {
  id: string;                    // "R-001"
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

interface Dependency {
  type: 'internal' | 'external';
  name: string;
  description: string;
  status: 'available' | 'pending' | 'blocked';
}
```

### JavaScript Schema Definition

```javascript
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
```

---

## Generation Pipeline

### Step 1: Gather Sources

```javascript
async function gatherSources(projectPath) {
  const discovery = await discoverProject(projectPath);

  return {
    // Read all documentation files
    docs: await readDocFiles(discovery.documentation),

    // Extract features from mockups
    mockups: await analyzeMockups(discovery.mockups),

    // Get tech stack
    techStack: discovery.techStack,

    // Project metadata
    projectName: discovery.name,
    vision: discovery.vision,
    description: discovery.description
  };
}
```

### Step 2: Claude Synthesis

Use Claude to synthesize PRD from gathered sources.

**Input:** All sources concatenated with structure
**Output:** Initial PRD JSON

### Step 3: Grok Review

Use Grok to review for:
- Unrealistic claims
- Missing sections
- Vague requirements
- Contradictions

**Input:** Initial PRD + original sources
**Output:** Review with gaps identified

### Step 4: Refinement

Claude refines PRD based on Grok's feedback.

**Input:** Initial PRD + Grok review
**Output:** Refined PRD

### Step 5: Validation

Validate against schema and calculate score.

**Input:** Refined PRD
**Output:** Validation result + score

---

## Validation Rules

### Required Sections

| Section | Rule | Blocking |
|---------|------|----------|
| overview.problemStatement | Min 20 chars | YES |
| overview.targetAudience | Min 10 chars | YES |
| overview.valueProposition | Min 20 chars | YES |
| overview.successMetrics | Min 2 items | YES |
| goals.primary | Min 2 goals | YES |
| features.core | Min 3 features | YES |
| technical.stack | Min 1 item | YES |

### Feature Validation

Each feature must have:
- Unique ID (pattern: F-XXX)
- Name (min 5 chars)
- Description (min 20 chars)
- Priority (enum)
- At least 2 acceptance criteria

### Goal Validation

Each goal must have:
- Unique ID (pattern: G-XXX)
- Description (min 10 chars)
- measurable flag

### Success Metric Validation

Each metric must have:
- Unique ID (pattern: SM-XXX)
- metric name
- target value
- measurable flag

---

## Scoring System

### PRD Score Calculation (0-100)

```javascript
export const PRD_SCORE_WEIGHTS = {
  overview: 25,        // Problem, audience, value prop, metrics
  goals: 15,           // Primary and secondary goals
  features: 30,        // Core features with acceptance criteria
  technical: 15,       // Stack, integrations, constraints
  personas: 5,         // User personas defined
  risks: 5,            // Risks identified with mitigations
  completeness: 5      // All sections present
};
```

### Score Breakdown

```javascript
function calculatePRDScore(prd, validation) {
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

  // Completeness (5 points)
  if (validation.valid) score += 5;

  return Math.min(100, score);
}
```

### Score Thresholds

```javascript
export const PRD_SCORE_THRESHOLDS = {
  excellent: 90,       // Ready for story generation
  good: 80,            // Minor improvements needed
  acceptable: 70,      // Needs work but usable
  minimum: 60,         // Below this is blocked
  failing: 0           // PRD incomplete
};
```

---

## API Reference

### Main Functions

#### generatePRD(projectPath, options)

**Purpose:** Generate a complete AI PRD from project sources.

**Signature:**
```javascript
export async function generatePRD(projectPath, options = {}) {
  // options: { visionStatement?, forceRegenerate?, maxTokens? }
}
```

**Returns:**
```typescript
interface PRDGenerationResult {
  success: boolean;
  prd: AIPRD | null;
  validation: PRDValidationResult;
  score: number;
  sources: {
    documents: string[];
    mockups: string[];
    userInput: boolean;
  };
  cost: {
    synthesis: number;
    review: number;
    refinement: number;
    total: number;
  };
  error?: string;
}
```

#### validatePRD(prd)

**Purpose:** Validate a PRD against schema.

**Signature:**
```javascript
export function validatePRD(prd) {
  // Returns PRDValidationResult
}
```

**Returns:**
```typescript
interface PRDValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  missingRequired: string[];
  score: number;
}
```

#### scorePRD(prd)

**Purpose:** Calculate PRD completeness score.

**Signature:**
```javascript
export function scorePRD(prd) {
  // Returns number 0-100
}
```

#### getPRDScoreBreakdown(prd)

**Purpose:** Get detailed score breakdown.

**Signature:**
```javascript
export function getPRDScoreBreakdown(prd) {
  // Returns PRDScoreBreakdown
}
```

**Returns:**
```typescript
interface PRDScoreBreakdown {
  total: number;
  overview: { score: number; max: 25; details: string[] };
  goals: { score: number; max: 15; details: string[] };
  features: { score: number; max: 30; details: string[] };
  technical: { score: number; max: 15; details: string[] };
  personas: { score: number; max: 5; details: string[] };
  risks: { score: number; max: 5; details: string[] };
  completeness: { score: number; max: 5; details: string[] };
}
```

### Helper Functions

#### gatherPRDSources(projectPath)

Gather all sources for PRD generation.

#### extractFeaturesFromMockups(mockups)

Extract feature hints from HTML mockups.

#### createEmptyPRD(projectName)

Create a blank PRD structure.

#### mergePRDs(existing, generated)

Merge generated PRD with existing PRD.

---

## Prompts

### Claude Synthesis Prompt

```javascript
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
```

### Grok Review Prompt

```javascript
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
```

---

## Examples

### Minimal Valid PRD

```json
{
  "id": "prd-001",
  "projectName": "MyApp",
  "version": "1.0.0",
  "status": "draft",
  "createdAt": "2026-01-26T00:00:00Z",
  "updatedAt": "2026-01-26T00:00:00Z",
  "generatedBy": "claude",

  "overview": {
    "problemStatement": "Users need a way to track their daily tasks efficiently",
    "targetAudience": "Busy professionals",
    "valueProposition": "Simple, fast task management that syncs across devices",
    "successMetrics": [
      { "id": "SM-001", "metric": "Daily active users", "target": "1000", "measurable": true },
      { "id": "SM-002", "metric": "Task completion rate", "target": "80%", "measurable": true }
    ]
  },

  "goals": {
    "primary": [
      { "id": "G-001", "description": "Enable users to create and complete tasks", "measurable": true },
      { "id": "G-002", "description": "Sync tasks across web and mobile", "measurable": true }
    ],
    "secondary": [],
    "nonGoals": ["Calendar integration", "Team collaboration"]
  },

  "features": {
    "core": [
      {
        "id": "F-001",
        "name": "Task Creation",
        "description": "Users can create new tasks with a title and optional description",
        "priority": "must-have",
        "domain": "forms",
        "acceptanceCriteria": [
          "User can enter task title",
          "User can optionally add description",
          "Task is saved to database"
        ],
        "mockupRefs": ["01-task-list.html"],
        "estimatedComplexity": "low"
      },
      {
        "id": "F-002",
        "name": "Task Completion",
        "description": "Users can mark tasks as complete",
        "priority": "must-have",
        "domain": "ui-components",
        "acceptanceCriteria": [
          "Checkbox toggles completion status",
          "Completed tasks show strikethrough"
        ],
        "mockupRefs": ["01-task-list.html"],
        "estimatedComplexity": "low"
      },
      {
        "id": "F-003",
        "name": "User Authentication",
        "description": "Users can sign up and log in",
        "priority": "must-have",
        "domain": "authentication",
        "acceptanceCriteria": [
          "User can register with email",
          "User can log in with credentials",
          "Session persists across browser refresh"
        ],
        "mockupRefs": ["02-login.html"],
        "estimatedComplexity": "medium"
      }
    ],
    "enhanced": [],
    "future": []
  },

  "technical": {
    "stack": [
      { "category": "frontend", "name": "Next.js", "version": "14", "purpose": "React framework" },
      { "category": "database", "name": "Supabase", "purpose": "Backend and auth" }
    ],
    "integrations": [],
    "constraints": ["Must work offline"],
    "performance": []
  },

  "personas": [],
  "risks": [],
  "dependencies": [],

  "sources": {
    "documents": ["README.md"],
    "mockups": ["01-task-list.html", "02-login.html"],
    "userInput": false
  }
}
```

**Expected Score:** ~75/100 (missing personas, risks, secondary goals)

---

## Exports

```javascript
// Schema & Types
export const PRD_SCHEMA;
export const PRD_SCORE_WEIGHTS;
export const PRD_SCORE_THRESHOLDS;

// Prompts
export const PRD_SYNTHESIS_PROMPT;
export const PRD_REVIEW_PROMPT;

// Main Functions
export async function generatePRD(projectPath, options);
export function validatePRD(prd);
export function scorePRD(prd);
export function getPRDScoreBreakdown(prd);

// Helper Functions
export async function gatherPRDSources(projectPath);
export function extractFeaturesFromMockups(mockups);
export function createEmptyPRD(projectName);
export function mergePRDs(existing, generated);

// Default export
export default generatePRD;
```

---

*Specification Version: 1.0.0 | Date: 2026-01-26*
