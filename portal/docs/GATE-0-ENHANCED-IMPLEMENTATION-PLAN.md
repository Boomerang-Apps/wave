# Gate 0: Enhanced Design Foundation - Implementation Plan

**Date:** 2026-01-26
**Status:** PLANNING
**Based on:** Grok Architecture Review + Existing AI Stories Schema
**Goal:** Professional wizard-style foundation validation with strict AI PRD & Stories enforcement

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Principles](#core-principles)
3. [Enhanced Story Schema](#enhanced-story-schema)
4. [PRD Schema & Format](#prd-schema--format)
5. [Wizard UX Flow (7 Screens)](#wizard-ux-flow-7-screens)
6. [Backend Architecture](#backend-architecture)
7. [Frontend Components](#frontend-components)
8. [Validation & Scoring](#validation--scoring)
9. [Implementation Tasks](#implementation-tasks)
10. [File Structure](#file-structure)
11. [API Specifications](#api-specifications)
12. [Testing Strategy](#testing-strategy)

---

## Executive Summary

This plan enhances Gate 0 to be a **professional, wizard-style onboarding experience** that:

1. **Guides non-technical users** through project setup
2. **Auto-generates AI PRD** from vision/docs/mockups
3. **Generates detailed AI Stories** with strict schema enforcement (GWT format)
4. **Validates alignment** between PRD, Stories, and Mockups
5. **Blocks progression** until 100% compliance achieved

### End State

User completes Gate 0 with:
- Validated project foundation
- Auto-generated/updated AI PRD (structured sections)
- Complete AI Stories set (detailed, agent-ready)
- Enhancement report with prioritized fixes
- **100% readiness → Unlock Gate 1**

---

## Core Principles

| Principle | Implementation |
|-----------|----------------|
| **User-Friendly** | Wizard flow, no confusion, clear instructions |
| **Comprehensive Analysis** | Local + remote (GitHub/Vercel/Supabase) |
| **Automated Yet Controllable** | LLM generates, human approves |
| **Safety-First** | OAuth, redaction, no auto-commits |
| **Strict Compliance** | Block until PRD & Stories meet thresholds |
| **Professional Output** | Polished reports, actionable fixes |

---

## Enhanced Story Schema

### Current Schema (Existing)

```javascript
// From server/utils/story-schema.js
{
  id: { type: 'string', required: true },
  title: { type: 'string', required: true },
  description: { type: 'string', required: true },
  status: { enum: ['draft', 'ready', 'in-progress', 'completed', 'blocked'] },
  priority: { enum: ['high', 'medium', 'low'] },
  assignedAgent: { enum: ['fe-dev', 'be-dev', 'qa', 'devops', 'fullstack'] },
  acceptanceCriteria: { type: 'array' },
  dependencies: { type: 'array' },
  epicId: { type: 'string' },
  estimatedHours: { type: 'number' },
  mockupRef: { type: 'string' }
}
```

### Enhanced Schema (Required for AI LLM Implementation)

```javascript
// Enhanced story-schema.js
export const ENHANCED_STORY_SCHEMA = {
  // === REQUIRED FIELDS (Agent Execution Critical) ===
  id: {
    type: 'string',
    required: true,
    pattern: /^[A-Z]+-\d{3,}-[A-Z]+-\d+$/,  // e.g., WAVE-001-AUTH-001
    description: 'Unique story ID: PROJECT-WAVE-DOMAIN-NUMBER'
  },
  title: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 100
  },
  epic: {
    type: 'string',
    required: true,
    description: 'Parent epic name (e.g., "User Authentication")'
  },
  domain: {
    type: 'string',
    required: true,
    enum: [
      'authentication', 'authorization', 'database', 'api',
      'ui-components', 'forms', 'navigation', 'state-management',
      'integrations', 'payments', 'notifications', 'search',
      'media', 'analytics', 'admin', 'settings', 'infrastructure'
    ]
  },
  priority: {
    type: 'string',
    required: true,
    enum: ['critical', 'high', 'medium', 'low']
  },

  // === USER STORY FORMAT (Required) ===
  userStory: {
    type: 'object',
    required: true,
    properties: {
      asA: { type: 'string', required: true },      // "registered user"
      iWant: { type: 'string', required: true },    // "to log in with my email"
      soThat: { type: 'string', required: true }    // "I can access my account"
    }
  },

  // === GIVEN/WHEN/THEN (Required for Agent Execution) ===
  gwt: {
    type: 'object',
    required: true,
    properties: {
      given: { type: 'string', required: true, minLength: 20 },
      when: { type: 'string', required: true, minLength: 20 },
      then: { type: 'string', required: true, minLength: 20 }
    }
  },

  // === ACCEPTANCE CRITERIA (3+ Required) ===
  acceptanceCriteria: {
    type: 'array',
    required: true,
    minItems: 3,
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },       // "AC-001"
        description: { type: 'string', required: true },
        testable: { type: 'boolean', required: true } // Must be verifiable
      }
    }
  },

  // === MOCKUP REFERENCES (Required for UI Stories) ===
  mockupRefs: {
    type: 'array',
    required: false,  // Required only if domain is UI-related
    items: {
      type: 'object',
      properties: {
        file: { type: 'string', required: true },     // "01-login.html"
        elements: { type: 'array', items: { type: 'string' } }  // ["#email-input", "#submit-btn"]
      }
    }
  },

  // === TECHNICAL NOTES (Agent Guidance) ===
  technicalNotes: {
    type: 'object',
    required: true,
    properties: {
      suggestedApproach: { type: 'string' },
      filesLikelyModified: { type: 'array', items: { type: 'string' } },
      apiEndpoints: { type: 'array', items: { type: 'string' } },
      databaseTables: { type: 'array', items: { type: 'string' } },
      externalServices: { type: 'array', items: { type: 'string' } }
    }
  },

  // === SAFETY & RISK ===
  safety: {
    type: 'object',
    required: false,
    properties: {
      riskLevel: { enum: ['critical', 'high', 'medium', 'low'] },
      requiresApproval: { type: 'boolean' },
      approver: { type: 'string' },
      safetyTags: { type: 'array', items: { type: 'string' } }
    }
  },

  // === DEPENDENCIES ===
  dependencies: {
    type: 'array',
    required: true,
    items: { type: 'string' }  // Story IDs this depends on
  },

  // === METADATA ===
  status: {
    type: 'string',
    required: true,
    enum: ['draft', 'ready', 'in-progress', 'completed', 'blocked']
  },
  assignedAgent: {
    type: 'string',
    enum: ['fe-dev', 'be-dev', 'qa', 'devops', 'fullstack', 'unassigned']
  },
  estimatedTokens: { type: 'number' },
  estimatedHours: { type: 'number' },
  wave: { type: 'number' },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' }
};

// Detail score thresholds
export const STORY_DETAIL_THRESHOLDS = {
  minimum: 70,      // Warn if below
  blocking: 60,     // Block if below
  recommended: 85,  // Target score
  excellent: 95     // Full marks
};
```

### Example Detailed Story

```json
{
  "id": "WAVE-001-AUTH-001",
  "title": "User Login with Email and Password",
  "epic": "User Authentication",
  "domain": "authentication",
  "priority": "high",
  "userStory": {
    "asA": "registered user",
    "iWant": "to log in with my email and password",
    "soThat": "I can access my personalized dashboard"
  },
  "gwt": {
    "given": "I am on the login page and have a registered account with email 'user@example.com'",
    "when": "I enter my email, password, and click the 'Sign In' button",
    "then": "I am authenticated and redirected to my dashboard with a welcome message"
  },
  "acceptanceCriteria": [
    { "id": "AC-001", "description": "Login form displays email and password fields", "testable": true },
    { "id": "AC-002", "description": "Form validates email format before submission", "testable": true },
    { "id": "AC-003", "description": "Error message shown for invalid credentials", "testable": true },
    { "id": "AC-004", "description": "Successful login stores session token", "testable": true },
    { "id": "AC-005", "description": "User redirected to dashboard after login", "testable": true }
  ],
  "mockupRefs": [
    { "file": "01-login.html", "elements": ["#email-input", "#password-input", "#login-btn", "#error-message"] }
  ],
  "technicalNotes": {
    "suggestedApproach": "Use NextAuth.js with Credentials provider and Supabase adapter",
    "filesLikelyModified": [
      "src/app/login/page.tsx",
      "src/lib/auth.ts",
      "src/components/LoginForm.tsx"
    ],
    "apiEndpoints": ["/api/auth/signin", "/api/auth/session"],
    "databaseTables": ["users", "sessions"],
    "externalServices": ["Supabase Auth"]
  },
  "safety": {
    "riskLevel": "high",
    "requiresApproval": true,
    "approver": "security-lead",
    "safetyTags": ["auth", "credentials", "session"]
  },
  "dependencies": [],
  "status": "ready",
  "assignedAgent": "fullstack",
  "estimatedTokens": 15000,
  "estimatedHours": 4,
  "wave": 1
}
```

---

## PRD Schema & Format

### AI PRD Structure

```typescript
interface AIPRD {
  // === HEADER ===
  projectName: string;
  version: string;
  lastUpdated: string;
  status: 'draft' | 'review' | 'approved';

  // === EXECUTIVE SUMMARY ===
  overview: {
    problemStatement: string;      // What problem does this solve?
    targetAudience: string;        // Who is this for?
    valueProposition: string;      // Why should they care?
    successMetrics: string[];      // How do we measure success?
  };

  // === GOALS ===
  goals: {
    primary: Goal[];               // Must-have goals
    secondary: Goal[];             // Nice-to-have goals
    nonGoals: string[];            // Explicitly out of scope
  };

  // === FEATURES ===
  features: {
    core: Feature[];               // MVP features
    enhanced: Feature[];           // Post-MVP features
    future: Feature[];             // Roadmap items
  };

  // === USER PERSONAS ===
  personas: Persona[];

  // === USER JOURNEYS ===
  journeys: UserJourney[];

  // === TECHNICAL REQUIREMENTS ===
  technical: {
    stack: TechStackItem[];
    integrations: Integration[];
    constraints: string[];
    performance: PerformanceRequirement[];
  };

  // === RISKS & MITIGATIONS ===
  risks: Risk[];

  // === DEPENDENCIES ===
  dependencies: Dependency[];

  // === TIMELINE (Optional - No estimates, just phases) ===
  phases: Phase[];
}

interface Feature {
  id: string;                      // "F-001"
  name: string;
  description: string;
  priority: 'must-have' | 'should-have' | 'nice-to-have';
  userStories: string[];           // Story IDs that implement this
  mockupRefs: string[];            // Mockup files that show this
  acceptanceCriteria: string[];
}

interface Goal {
  id: string;
  description: string;
  measurable: boolean;
  metric?: string;
}
```

### PRD Validation Rules

```javascript
export const PRD_VALIDATION_RULES = {
  // Completeness checks
  requiredSections: [
    'overview.problemStatement',
    'overview.targetAudience',
    'goals.primary',
    'features.core',
    'technical.stack'
  ],

  // Quality thresholds
  minimumCoreFeatures: 3,
  minimumPrimaryGoals: 2,
  minimumSuccessMetrics: 2,

  // Blocking conditions
  blockingIfMissing: [
    'overview.problemStatement',
    'features.core'
  ],

  // Score weights
  weights: {
    overview: 25,
    goals: 15,
    features: 30,
    personas: 10,
    technical: 15,
    risks: 5
  }
};
```

---

## Wizard UX Flow (7 Screens)

### Screen 1: Welcome & Project Type

```typescript
interface Screen1State {
  projectPath: string | null;
  detectedMode: 'new' | 'existing' | 'monorepo' | null;
  selectedMode: 'new' | 'existing' | 'monorepo' | null;
  connectRemote: boolean;
}

// UI Elements:
// - Title: "Start Your Project Foundation"
// - Auto-detect indicator showing detected mode
// - Mode override buttons (New / Existing / Monorepo)
// - Checkbox: "Connect to remote services (GitHub, Vercel, Supabase)"
// - Non-tech tip card explaining each mode
```

### Screen 2: Local Directory Selection

```typescript
interface Screen2State {
  projectPath: string;
  scanResult: {
    tree: FolderNode[];
    techStack: string[];
    docsFound: string[];
    mockupsFound: string[];
  };
  validationErrors: string[];
}

// UI Elements:
// - Native folder picker
// - Real-time scan preview (folder tree)
// - Detected tech stack badges
// - Validation status (blocks Next if invalid)
```

### Screen 3: Remote Integrations (Optional)

```typescript
interface Screen3State {
  github: {
    connected: boolean;
    repo?: string;
    branch?: string;
  };
  vercel: {
    connected: boolean;
    projectId?: string;
    deployments?: Deployment[];
  };
  supabase: {
    connected: boolean;
    projectRef?: string;
    tables?: string[];
  };
}

// UI Elements:
// - OAuth connect buttons for each service
// - Connection status indicators
// - Data preview (repo structure, deployments, DB schema)
// - "Skip - Local Only" button
```

### Screen 4: Foundation Analysis

```typescript
interface Screen4State {
  analysisRunning: boolean;
  currentStep: number;
  steps: AnalysisStep[];
  enableAiReview: boolean;
  aiReviewDepth: 'quick' | 'deep';
  costEstimate: CostEstimate | null;
  results: FoundationReport | null;
}

// UI Elements:
// - Progress bar with step names
// - Real-time step status (SSE)
// - AI Review toggle with cost estimate
// - Scorecard KPIs (Structure, Docs, Mockups, etc.)
```

### Screen 5: AI PRD Generation & Validation

```typescript
interface Screen5State {
  prdSource: 'existing' | 'generated' | 'none';
  existingPrd: AIPRD | null;
  generatedPrd: AIPRD | null;
  prdScore: number;           // 0-100
  prdValidation: PRDValidationResult;
  editMode: boolean;
  approved: boolean;
}

// UI Elements:
// - PRD preview (collapsible sections)
// - Completeness score gauge
// - Missing sections warnings
// - "Generate PRD" button (if none exists)
// - "Edit PRD" inline editor
// - "Approve PRD" button (required to proceed)
// - BLOCKS if score < 90% or missing required sections
```

### Screen 6: AI Stories Generation & Validation

```typescript
interface Screen6State {
  storiesSource: 'existing' | 'generated' | 'partial';
  stories: EnhancedStory[];
  storyValidation: {
    total: number;
    valid: number;
    invalid: number;
    detailScores: { storyId: string; score: number }[];
    averageDetailScore: number;
  };
  coverageCheck: {
    prdFeaturesCovered: string[];
    prdFeaturesUncovered: string[];
    mockupsCovered: string[];
    mockupsUncovered: string[];
  };
  generating: boolean;
  refinementIteration: number;  // Auto-refine up to 3x
  approved: boolean;
}

// UI Elements:
// - Stories list with expandable details
// - Detail score per story (badge: green/yellow/red)
// - Coverage matrix (PRD features → Stories → Mockups)
// - "Generate Stories" button
// - "Refine Stories" button (improves detail)
// - Individual story editor
// - "Approve All Stories" button
// - BLOCKS if:
//   - Any story detail score < 60
//   - PRD coverage < 100%
//   - Average detail score < 70
```

### Screen 7: Readiness Review & Kickoff

```typescript
interface Screen7State {
  finalScore: number;
  scoreBreakdown: {
    structure: number;
    documentation: number;
    prd: number;
    stories: number;
    alignment: number;
  };
  blockingReasons: string[];
  kickoffPlan: KickoffPlan;
  ready: boolean;
}

interface KickoffPlan {
  estimatedWaves: number;
  domainBreakdown: { domain: string; storyCount: number }[];
  criticalPath: string[];     // Story IDs in execution order
  risks: string[];
}

// UI Elements:
// - Final scorecard (0-100%)
// - Score breakdown chart
// - Blocking reasons list (if any)
// - Kickoff plan preview
// - "Mark Ready" button (only enabled if score = 100)
// - Override option (requires reason, audited)
```

---

## Backend Architecture

### New Files to Create

```
server/
├── utils/
│   ├── enhanced-story-schema.js      # Enhanced schema with GWT
│   ├── prd-generator.js              # AI PRD generation
│   ├── stories-generator.js          # AI Stories generation
│   ├── alignment-checker.js          # PRD ↔ Stories ↔ Mockups
│   ├── detail-scorer.js              # Story detail scoring
│   └── kickoff-planner.js            # Generate kickoff plan
├── integrations/
│   ├── github-oauth.js               # GitHub OAuth flow
│   ├── vercel-client.js              # Vercel API client
│   └── supabase-remote.js            # Remote Supabase introspection
```

### PRD Generator (`prd-generator.js`)

```javascript
/**
 * PRD Generator - Synthesizes AI PRD from all available sources
 *
 * Sources:
 * - Existing docs (README, CLAUDE.md, any .md files)
 * - Mockups (extracts features from HTML)
 * - Code comments (existing projects)
 * - User-provided vision statement
 *
 * Uses: Claude (creative synthesis) + Grok (gap analysis)
 */

export async function generatePRD(projectPath, options = {}) {
  const { existingDocs, mockups, codeComments, visionStatement } = await gatherSources(projectPath);

  // Step 1: Claude synthesizes initial PRD
  const synthesisPrompt = buildSynthesisPrompt(existingDocs, mockups, visionStatement);
  const initialPrd = await callClaude(synthesisPrompt, { maxTokens: 4000 });

  // Step 2: Grok reviews for gaps and truthfulness
  const reviewPrompt = buildReviewPrompt(initialPrd, codeComments);
  const grokReview = await callGrok(reviewPrompt, { maxTokens: 2000 });

  // Step 3: Claude refines based on Grok feedback
  const refinedPrd = await refinePRD(initialPrd, grokReview);

  // Step 4: Validate against schema
  const validation = validatePRD(refinedPrd);

  return {
    prd: refinedPrd,
    validation,
    score: calculatePRDScore(refinedPrd, validation),
    sources: { docs: existingDocs.length, mockups: mockups.length }
  };
}

const PRD_SYNTHESIS_PROMPT = `You are creating a comprehensive AI PRD (Product Requirements Document).

## Available Sources
{sources}

## Instructions
1. Synthesize a complete PRD with these REQUIRED sections:
   - Overview (problem, audience, value prop, success metrics)
   - Goals (primary, secondary, non-goals)
   - Features (core MVP features with acceptance criteria)
   - Technical Requirements (stack, integrations, constraints)
   - Risks and Mitigations

2. Every feature MUST have:
   - Unique ID (F-001, F-002, etc.)
   - Clear acceptance criteria
   - Reference to mockups (if applicable)

3. Be specific and actionable - vague PRDs lead to vague implementations.

Output in JSON format matching this schema:
{schema}
`;
```

### Stories Generator (`stories-generator.js`)

```javascript
/**
 * Stories Generator - Creates detailed AI Stories from PRD + Mockups
 *
 * STRICT ENFORCEMENT:
 * - Must use enhanced schema (GWT format required)
 * - Minimum 3 acceptance criteria per story
 * - Mockup references required for UI stories
 * - Technical notes required for all stories
 *
 * Validation Loop:
 * - LLM self-scores detail level
 * - Auto-refine if score < 95% (up to 3 iterations)
 * - Flag for user edit if still below threshold
 */

export async function generateStories(prd, mockups, options = {}) {
  const { maxIterations = 3, targetScore = 95 } = options;

  // Step 1: Extract features and mockup elements
  const features = prd.features.core.concat(prd.features.enhanced || []);
  const mockupElements = await extractMockupElements(mockups);

  // Step 2: Generate stories for each feature
  let stories = [];
  for (const feature of features) {
    const featureStories = await generateFeatureStories(feature, mockupElements, prd);
    stories.push(...featureStories);
  }

  // Step 3: Topological sort by dependencies
  stories = topologicalSort(stories);

  // Step 4: Validation and refinement loop
  let iteration = 0;
  let validation = validateStories(stories);

  while (validation.averageDetailScore < targetScore && iteration < maxIterations) {
    const lowScoreStories = validation.storyScores
      .filter(s => s.score < targetScore)
      .map(s => s.storyId);

    stories = await refineStories(stories, lowScoreStories);
    validation = validateStories(stories);
    iteration++;
  }

  // Step 5: Check PRD coverage
  const coverage = checkPRDCoverage(prd, stories, mockups);

  return {
    stories,
    validation,
    coverage,
    iterations: iteration,
    readyForApproval: validation.averageDetailScore >= 70 && coverage.prdCoverage === 100
  };
}

const STORY_GENERATION_PROMPT = `Generate detailed AI Stories for this feature.

## Feature
{feature}

## PRD Context
{prdContext}

## Available Mockups
{mockups}

## STRICT REQUIREMENTS
1. Each story MUST have:
   - ID format: {PROJECT}-{WAVE}-{DOMAIN}-{NUMBER}
   - Complete User Story (As a... I want... So that...)
   - Complete GWT (Given... When... Then...) - MINIMUM 20 chars each
   - At least 3 testable acceptance criteria
   - Technical notes with suggested approach
   - Mockup references (if UI-related)

2. Stories must be agent-executable:
   - Specific enough that an AI agent can implement without clarification
   - Include file paths likely to be modified
   - Include API endpoints if applicable

3. Self-rate each story's detail level (1-10):
   - 10 = Perfect, agent can execute immediately
   - 7-9 = Good, minor clarifications might be needed
   - 4-6 = Needs improvement
   - 1-3 = Incomplete, requires major revision

Output JSON array matching this schema:
{schema}

Include a self-assessment score for each story.
`;
```

### Alignment Checker (`alignment-checker.js`)

```javascript
/**
 * Alignment Checker - Validates PRD ↔ Stories ↔ Mockups consistency
 *
 * Checks:
 * 1. Every PRD feature has at least one implementing story
 * 2. Every story references valid mockups (if UI-related)
 * 3. Mockup elements are covered by story acceptance criteria
 * 4. No orphan stories (stories without PRD feature)
 */

export function checkAlignment(prd, stories, mockups) {
  const results = {
    prdToStories: checkPRDToStoriesCoverage(prd, stories),
    storiesToMockups: checkStoriesToMockupsCoverage(stories, mockups),
    mockupsToStories: checkMockupsToStoriesCoverage(mockups, stories),
    orphanStories: findOrphanStories(prd, stories),
    score: 0,
    issues: [],
    blocking: []
  };

  // Calculate alignment score
  results.score = calculateAlignmentScore(results);

  // Identify issues
  if (results.prdToStories.uncoveredFeatures.length > 0) {
    results.issues.push(`${results.prdToStories.uncoveredFeatures.length} PRD features without stories`);
    results.blocking.push('PRD features must have implementing stories');
  }

  if (results.orphanStories.length > 0) {
    results.issues.push(`${results.orphanStories.length} stories not linked to PRD features`);
  }

  return results;
}
```

---

## Validation & Scoring

### Story Detail Scorer

```javascript
/**
 * Score story detail level for agent executability
 */
export function scoreStoryDetail(story) {
  let score = 0;
  const maxScore = 100;

  // Required fields (40 points)
  if (story.id) score += 5;
  if (story.title?.length >= 10) score += 5;
  if (story.epic) score += 5;
  if (story.domain) score += 5;
  if (story.userStory?.asA && story.userStory?.iWant && story.userStory?.soThat) score += 10;
  if (story.gwt?.given?.length >= 20 && story.gwt?.when?.length >= 20 && story.gwt?.then?.length >= 20) score += 10;

  // Acceptance Criteria (25 points)
  const acCount = story.acceptanceCriteria?.length || 0;
  if (acCount >= 3) score += 15;
  else if (acCount >= 1) score += acCount * 5;

  const testableAc = story.acceptanceCriteria?.filter(ac => ac.testable).length || 0;
  score += Math.min(10, testableAc * 2);

  // Technical Notes (20 points)
  if (story.technicalNotes?.suggestedApproach) score += 5;
  if (story.technicalNotes?.filesLikelyModified?.length > 0) score += 5;
  if (story.technicalNotes?.apiEndpoints?.length > 0) score += 5;
  if (story.technicalNotes?.databaseTables?.length > 0) score += 5;

  // Mockup References (10 points for UI stories)
  const isUiDomain = ['ui-components', 'forms', 'navigation'].includes(story.domain);
  if (isUiDomain) {
    if (story.mockupRefs?.length > 0) score += 10;
  } else {
    score += 10; // Non-UI stories get full points
  }

  // Dependencies & Metadata (5 points)
  if (Array.isArray(story.dependencies)) score += 2;
  if (story.status) score += 1;
  if (story.estimatedHours || story.estimatedTokens) score += 2;

  return Math.round((score / maxScore) * 100);
}
```

### Blocking Thresholds

```javascript
export const GATE0_BLOCKING_THRESHOLDS = {
  // PRD Requirements
  prd: {
    scoreMinimum: 90,
    requiredSections: ['overview.problemStatement', 'features.core'],
    minimumFeatures: 3
  },

  // Stories Requirements
  stories: {
    averageDetailScoreMinimum: 70,
    individualScoreMinimum: 60,
    prdCoverageMinimum: 100,  // All PRD features must have stories
    gwtRequired: true,
    minimumAcceptanceCriteria: 3
  },

  // Alignment Requirements
  alignment: {
    scoreMinimum: 80,
    allowOrphanStories: false
  },

  // Overall
  overallScoreMinimum: 80
};
```

---

## Implementation Tasks

### Phase 1: Schema & Validation (Day 1)

1. **Enhance story-schema.js**
   - Add GWT fields
   - Add domain enum
   - Add technical notes structure
   - Update validation functions

2. **Create detail-scorer.js**
   - Implement `scoreStoryDetail()`
   - Add threshold configuration

3. **Create prd-schema.js**
   - Define PRD interfaces
   - Implement `validatePRD()`
   - Add score calculation

### Phase 2: Generators (Days 2-3)

4. **Create prd-generator.js**
   - Source gathering
   - Claude synthesis prompt
   - Grok review integration
   - Refinement loop

5. **Create stories-generator.js**
   - Feature → Stories mapping
   - GWT generation prompts
   - Validation loop
   - Topological sort

6. **Create alignment-checker.js**
   - PRD ↔ Stories coverage
   - Stories ↔ Mockups coverage
   - Orphan detection

### Phase 3: Wizard UX (Days 3-4)

7. **Create WizardContainer.tsx**
   - Step navigation
   - State management
   - Progress persistence

8. **Create Screen components**
   - Screen1Welcome.tsx
   - Screen2DirectorySelect.tsx
   - Screen3RemoteIntegrations.tsx
   - Screen4FoundationAnalysis.tsx
   - Screen5PRDEditor.tsx
   - Screen6StoriesEditor.tsx
   - Screen7ReadinessReview.tsx

### Phase 4: API Endpoints (Day 4)

9. **Add new endpoints**
   - POST /api/gate0/generate-prd
   - POST /api/gate0/generate-stories
   - POST /api/gate0/validate-alignment
   - POST /api/gate0/calculate-readiness
   - POST /api/gate0/approve-and-save

### Phase 5: Testing & Polish (Day 5)

10. **Write tests**
    - Schema validation tests
    - Generator tests
    - Alignment checker tests
    - E2E wizard flow test

11. **Polish**
    - Loading states
    - Error handling
    - Tooltips for non-tech users

---

## File Structure

```
portal/
├── server/
│   ├── utils/
│   │   ├── enhanced-story-schema.js    # NEW
│   │   ├── prd-schema.js               # NEW
│   │   ├── prd-generator.js            # NEW
│   │   ├── stories-generator.js        # NEW
│   │   ├── alignment-checker.js        # NEW
│   │   ├── detail-scorer.js            # NEW
│   │   ├── kickoff-planner.js          # NEW
│   │   ├── foundation-analyzer.js      # MODIFY
│   │   └── story-schema.js             # MODIFY (backwards compat)
│   ├── integrations/                   # NEW
│   │   ├── github-oauth.js
│   │   ├── vercel-client.js
│   │   └── supabase-remote.js
│   └── index.js                        # MODIFY (add endpoints)
├── src/
│   └── components/
│       ├── gate0/                      # NEW
│       │   ├── WizardContainer.tsx
│       │   ├── Screen1Welcome.tsx
│       │   ├── Screen2DirectorySelect.tsx
│       │   ├── Screen3RemoteIntegrations.tsx
│       │   ├── Screen4FoundationAnalysis.tsx
│       │   ├── Screen5PRDEditor.tsx
│       │   ├── Screen6StoriesEditor.tsx
│       │   ├── Screen7ReadinessReview.tsx
│       │   └── components/
│       │       ├── StoryCard.tsx
│       │       ├── PRDSection.tsx
│       │       ├── AlignmentMatrix.tsx
│       │       └── DetailScoreBadge.tsx
│       └── MockupDesignTab.tsx         # MODIFY (integrate wizard)
└── docs/
    └── GATE-0-ENHANCED-IMPLEMENTATION-PLAN.md  # THIS DOC
```

---

## API Specifications

### POST /api/gate0/generate-prd

```typescript
// Request
{
  projectPath: string;
  visionStatement?: string;
  forceRegenerate?: boolean;
}

// Response
{
  success: boolean;
  prd: AIPRD;
  validation: PRDValidationResult;
  score: number;
  sources: { docs: number; mockups: number };
}
```

### POST /api/gate0/generate-stories

```typescript
// Request
{
  projectPath: string;
  prd: AIPRD;
  targetDetailScore?: number;  // Default: 95
  maxIterations?: number;      // Default: 3
}

// Response
{
  success: boolean;
  stories: EnhancedStory[];
  validation: StoriesValidationResult;
  coverage: CoverageResult;
  iterations: number;
  readyForApproval: boolean;
}
```

### POST /api/gate0/validate-alignment

```typescript
// Request
{
  prd: AIPRD;
  stories: EnhancedStory[];
  mockups: MockupFile[];
}

// Response
{
  success: boolean;
  alignment: AlignmentResult;
  score: number;
  issues: string[];
  blocking: string[];
}
```

---

## Testing Strategy

### Unit Tests

```javascript
// enhanced-story-schema.test.js
describe('Enhanced Story Schema', () => {
  it('should validate complete story with GWT');
  it('should reject story without GWT');
  it('should require 3+ acceptance criteria');
  it('should validate mockupRefs for UI domains');
  it('should score story detail correctly');
});

// prd-generator.test.js
describe('PRD Generator', () => {
  it('should gather sources from project');
  it('should synthesize PRD from docs');
  it('should validate PRD schema');
  it('should score PRD completeness');
});

// alignment-checker.test.js
describe('Alignment Checker', () => {
  it('should detect uncovered PRD features');
  it('should detect orphan stories');
  it('should validate mockup references');
});
```

### Integration Tests

```javascript
// gate0-wizard.test.js
describe('Gate 0 Wizard Flow', () => {
  it('should complete new project flow');
  it('should complete existing project flow');
  it('should block on low PRD score');
  it('should block on low story detail');
  it('should generate kickoff plan on completion');
});
```

---

## Success Criteria

### Gate 0 Enhancement Checklist

- [ ] Enhanced story schema with GWT enforced
- [ ] PRD generator creates structured AI PRD
- [ ] Stories generator produces detailed, agent-ready stories
- [ ] Alignment checker validates PRD ↔ Stories ↔ Mockups
- [ ] Wizard UX guides non-technical users
- [ ] Detail scorer rates story executability
- [ ] Blocking thresholds prevent low-quality progression
- [ ] 100% PRD coverage required for approval
- [ ] Kickoff plan generated on completion
- [ ] All tests pass

### Acceptance Criteria

1. Non-technical user can complete Gate 0 without confusion
2. Generated PRD covers all detected features
3. Generated stories are detailed enough for agent execution (score >= 70)
4. No PRD feature left without implementing story
5. Wizard blocks progression until quality thresholds met
6. Kickoff plan shows realistic wave breakdown

---

*Implementation plan ready for development. This document serves as the source of truth for Gate 0 enhancement.*
