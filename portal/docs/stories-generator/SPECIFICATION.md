# Stories Generator - Technical Specification

**Version:** 1.0.0
**Date:** 2026-01-26
**Status:** SPECIFICATION COMPLETE
**Author:** WAVE Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Design Goals](#design-goals)
3. [Generation Pipeline](#generation-pipeline)
4. [Output Schema](#output-schema)
5. [Validation Loop](#validation-loop)
6. [Prompts](#prompts)
7. [API Reference](#api-reference)
8. [Examples](#examples)

---

## Overview

The Stories Generator synthesizes detailed AI Stories from a PRD (Product Requirements Document). Each story follows the Enhanced Story Schema with:

- Given/When/Then (GWT) format for clear execution steps
- Domain categorization for agent routing
- User Story structure (As a/I want/So that)
- Detailed acceptance criteria
- Mockup references for UI-related stories

### Generation Pipeline

```
PRD → Feature Analysis → Story Generation → Validation Loop → Output
         ↓                    ↓                   ↓
    Map features         Claude + Grok      Score >= 70%
    to stories           review cycle       OR max retries
```

### File Location

```
server/utils/stories-generator.js
server/__tests__/stories-generator.test.js
```

---

## Design Goals

### 1. PRD-Driven Stories
Generate stories directly from PRD features, maintaining traceability.

### 2. Detailed GWT Format
Every story must have complete Given/When/Then with min 20 chars each.

### 3. Quality Assurance
Validate and refine until stories score >= 70% (DETAIL_SCORE_THRESHOLDS.acceptable).

### 4. Mockup Alignment
UI stories must reference mockup files that show the feature.

### 5. Agent-Ready
Stories ready for autonomous agent execution without human clarification.

---

## Generation Pipeline

### Step 1: Feature Analysis

Analyze PRD features and map to stories:

```javascript
function analyzeFeatures(prd) {
  const stories = [];

  for (const feature of prd.features.core) {
    // One story per core feature
    stories.push({
      featureId: feature.id,
      featureName: feature.name,
      featureDescription: feature.description,
      domain: feature.domain,
      priority: mapPriority(feature.priority),
      acceptanceCriteria: feature.acceptanceCriteria,
      mockupRefs: feature.mockupRefs,
      complexity: feature.estimatedComplexity
    });
  }

  return stories;
}

function mapPriority(prdPriority) {
  const mapping = {
    'must-have': 'high',
    'should-have': 'medium',
    'nice-to-have': 'low'
  };
  return mapping[prdPriority] || 'medium';
}
```

### Step 2: Story Generation (Claude)

Generate detailed stories for each feature using Claude.

**Input:** Feature data from PRD
**Output:** EnhancedStory object

### Step 3: Story Review (Grok)

Review generated stories for:
- GWT completeness
- Acceptance criteria testability
- Technical feasibility
- Mockup alignment (for UI)

**Input:** Generated story + original feature
**Output:** Review with suggestions

### Step 4: Story Refinement

Refine stories based on Grok's feedback.

**Input:** Story + Grok review
**Output:** Improved story

### Step 5: Validation Loop

Validate and score until acceptable:

```
while (score < 70 && attempts < maxRetries) {
  validate(story)
  if (score < 70) {
    story = refine(story, validation.errors)
  }
  attempts++
}
```

---

## Output Schema

### StoriesGenerationResult

```typescript
interface StoriesGenerationResult {
  success: boolean;
  stories: EnhancedStory[];
  validation: {
    totalStories: number;
    validStories: number;
    invalidStories: number;
    averageScore: number;
    storyResults: StoryValidationResult[];
  };
  metrics: {
    generationTime: number;
    tokensUsed: number;
    cost: number;
    retryCount: number;
  };
  error?: string;
}

interface StoryValidationResult {
  storyId: string;
  valid: boolean;
  score: number;
  errors: ValidationError[];
  warnings: string[];
}
```

### EnhancedStory (from enhanced-story-schema.js)

```typescript
interface EnhancedStory {
  // Identity
  id: string;                    // "STORY-001"
  title: string;                 // Story title
  epic: string;                  // Parent epic name
  domain: ValidDomain;           // From VALID_DOMAINS

  // Priority & Status
  priority: ValidPriority;       // critical, high, medium, low
  status: ValidStatus;           // draft, ready, in-progress, review, done, blocked

  // User Story
  userStory: {
    asA: string;                 // As a [persona]
    iWant: string;               // I want [action]
    soThat: string;              // So that [benefit]
  };

  // Given/When/Then
  gwt: {
    given: string;               // Initial context (min 20 chars)
    when: string;                // Action taken (min 20 chars)
    then: string;                // Expected outcome (min 20 chars)
  };

  // Acceptance Criteria
  acceptanceCriteria: {
    id: string;                  // "AC-001"
    description: string;
    testable: boolean;
  }[];

  // Technical
  technicalNotes: string;        // Implementation guidance
  dependencies: string[];        // Story IDs this depends on

  // UI Reference (required for UI_DOMAINS)
  mockupRefs?: string[];         // Mockup files showing this

  // Safety
  safety?: {
    level: ValidRiskLevel;
    notes: string;
  };

  // Assignment
  assignedAgent?: ValidAgent;

  // Estimates
  estimates?: {
    complexity: 'low' | 'medium' | 'high';
    hours?: number;
  };
}
```

---

## Validation Loop

### Quality Thresholds

From `enhanced-story-schema.js`:

```javascript
DETAIL_SCORE_THRESHOLDS = {
  excellent: 95,    // Optimal for execution
  good: 85,         // Ready for execution
  acceptable: 70,   // Minimum for execution
  minimum: 60,      // Needs improvement
  failing: 0        // Not executable
};
```

### Validation Rules

| Field | Rule | Blocking |
|-------|------|----------|
| id | Pattern: STORY-XXX | YES |
| title | Min 10 chars | YES |
| epic | Min 3 chars | YES |
| domain | Must be in VALID_DOMAINS | YES |
| priority | Must be in VALID_PRIORITIES | YES |
| userStory.asA | Min 5 chars | YES |
| userStory.iWant | Min 10 chars | YES |
| userStory.soThat | Min 10 chars | YES |
| gwt.given | Min 20 chars | YES |
| gwt.when | Min 20 chars | YES |
| gwt.then | Min 20 chars | YES |
| acceptanceCriteria | Min 3 items, all testable | YES |
| technicalNotes | Min 20 chars | YES |
| mockupRefs | Required for UI_DOMAINS | CONDITIONAL |

### Retry Strategy

```javascript
const MAX_RETRIES = 3;
const MIN_ACCEPTABLE_SCORE = 70;

async function generateWithValidation(feature) {
  let story = await generateStory(feature);
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    const validation = validateEnhancedStory(story);
    const score = scoreStoryDetail(story);

    if (score >= MIN_ACCEPTABLE_SCORE && validation.valid) {
      return { story, score, attempts };
    }

    // Refine based on errors
    story = await refineStory(story, validation.errors);
    attempts++;
  }

  // Return best attempt
  return { story, score: scoreStoryDetail(story), attempts };
}
```

---

## Prompts

### Story Generation Prompt (Claude)

```javascript
export const STORY_GENERATION_PROMPT = `You are generating a detailed AI Story for autonomous agent execution.

## Feature to Convert
{feature}

## Project Context
{context}

## Required Output Format

Generate a complete story with ALL these fields:

### Identity
- id: "STORY-{featureNumber}" (e.g., STORY-001)
- title: Clear, action-oriented title (min 10 chars)
- epic: Group name for related features
- domain: One of: {domains}

### Priority
- priority: Based on feature priority (critical, high, medium, low)
- status: "draft" (will be updated later)

### User Story (REQUIRED)
- asA: Who benefits (min 5 chars, e.g., "As a registered user")
- iWant: What action (min 10 chars, e.g., "I want to view my dashboard")
- soThat: Why/benefit (min 10 chars, e.g., "So that I can see my progress")

### Given/When/Then (REQUIRED - min 20 chars each)
- given: Complete initial state/preconditions
- when: Specific user action or trigger
- then: Expected system behavior and outcome

### Acceptance Criteria (REQUIRED - min 3, all testable)
Each AC must have:
- id: "AC-001", "AC-002", etc.
- description: Clear, specific, measurable criterion
- testable: true (must be verifiable)

### Technical Notes (REQUIRED - min 20 chars)
Implementation guidance for developers:
- Key components/files to modify
- Data models involved
- API endpoints if applicable
- Edge cases to handle

### Dependencies
- List of story IDs this depends on (empty array if none)

### Mockup References (REQUIRED for UI domains)
- List mockup files that show this feature

### Safety (if applicable)
- level: risk level (critical, high, medium, low)
- notes: what could go wrong and how to prevent it

### Estimates
- complexity: low, medium, or high
- hours: optional estimate

## Valid Domains
{domains}

## Output Format
Return a valid JSON object. Do not include markdown code blocks.

## Critical Rules
1. GWT must be SPECIFIC - vague GWT leads to vague implementations
2. Every AC must be TESTABLE - can be verified true/false
3. Technical notes must guide actual implementation
4. UI domains REQUIRE mockupRefs
`;

export const VALID_DOMAINS_FOR_PROMPT = [
  'authentication', 'authorization', 'database', 'api',
  'ui-components', 'forms', 'navigation', 'state-management',
  'integrations', 'payments', 'notifications', 'search',
  'media', 'analytics', 'admin', 'settings', 'infrastructure'
].join(', ');
```

### Story Review Prompt (Grok)

```javascript
export const STORY_REVIEW_PROMPT = `You are reviewing an AI Story for completeness and executability.

## Story to Review
{story}

## Original Feature
{feature}

## Review Checklist

1. **GWT Quality**
   - Is "given" specific about initial state? (min 20 chars)
   - Is "when" a clear action trigger? (min 20 chars)
   - Is "then" a measurable outcome? (min 20 chars)

2. **Acceptance Criteria**
   - Are there at least 3 criteria?
   - Is each criterion testable (can verify true/false)?
   - Do they cover the feature completely?

3. **Technical Feasibility**
   - Are technical notes actionable?
   - Are dependencies identified?
   - Is complexity estimate realistic?

4. **Mockup Alignment** (for UI domains)
   - Are mockups referenced?
   - Do mockups show this feature?

5. **Agent Readiness**
   - Can an AI agent execute this without clarification?
   - Are edge cases considered?
   - Are error states handled?

## Output Format

Return JSON:
{
  "score": 0-100,
  "issues": ["list of problems found"],
  "suggestions": ["specific improvements needed"],
  "gwtFeedback": {
    "given": "feedback on given clause",
    "when": "feedback on when clause",
    "then": "feedback on then clause"
  },
  "acFeedback": ["feedback per acceptance criterion"],
  "recommendation": "approve | refine | reject"
}
`;
```

### Story Refinement Prompt

```javascript
export const STORY_REFINEMENT_PROMPT = `Refine this AI Story based on the review feedback.

## Current Story
{story}

## Review Feedback
{feedback}

## Specific Issues to Fix
{issues}

## Instructions
1. Address each issue in the feedback
2. Improve GWT to be more specific
3. Ensure all ACs are testable
4. Add missing technical details
5. Maintain consistency with original feature intent

Return the improved story as a valid JSON object.
`;
```

---

## API Reference

### Main Functions

#### generateStories(prd, projectPath, options)

**Purpose:** Generate all stories from a PRD.

**Signature:**
```javascript
export async function generateStories(prd, projectPath, options = {}) {
  // options: { maxStories?, minScore?, maxRetries?, skipLLM? }
}
```

**Returns:**
```typescript
interface StoriesGenerationResult {
  success: boolean;
  stories: EnhancedStory[];
  validation: ValidationSummary;
  metrics: GenerationMetrics;
  error?: string;
}
```

#### generateSingleStory(feature, context, options)

**Purpose:** Generate a single story from a feature.

**Signature:**
```javascript
export async function generateSingleStory(feature, context, options = {}) {
  // Returns single EnhancedStory
}
```

#### validateStories(stories)

**Purpose:** Validate an array of stories.

**Signature:**
```javascript
export function validateStories(stories) {
  // Returns ValidationSummary
}
```

**Returns:**
```typescript
interface ValidationSummary {
  totalStories: number;
  validStories: number;
  invalidStories: number;
  averageScore: number;
  storyResults: StoryValidationResult[];
}
```

### Helper Functions

#### featuresToStories(features)

Map PRD features to story templates.

#### assignMockupRefs(story, mockups)

Match story with relevant mockups based on domain and feature.

#### generateStoryId(index)

Generate story ID in STORY-XXX format.

#### calculateAverageScore(stories)

Calculate average detail score across stories.

---

## Examples

### Input: PRD Feature

```json
{
  "id": "F-001",
  "name": "User Login",
  "description": "Users can log in to access their personalized dashboard",
  "priority": "must-have",
  "domain": "authentication",
  "acceptanceCriteria": [
    "User can enter email and password",
    "Invalid credentials show error message",
    "Successful login redirects to dashboard"
  ],
  "mockupRefs": ["02-login.html"],
  "estimatedComplexity": "medium"
}
```

### Output: Enhanced Story

```json
{
  "id": "STORY-001",
  "title": "Implement User Login Authentication",
  "epic": "User Authentication",
  "domain": "authentication",
  "priority": "high",
  "status": "draft",

  "userStory": {
    "asA": "registered user",
    "iWant": "to log in with my email and password",
    "soThat": "I can access my personalized dashboard and data"
  },

  "gwt": {
    "given": "I am on the login page and have valid account credentials stored in the database",
    "when": "I enter my email and password and click the login button",
    "then": "I am authenticated and redirected to my dashboard with my session persisted"
  },

  "acceptanceCriteria": [
    { "id": "AC-001", "description": "Login form displays email and password fields", "testable": true },
    { "id": "AC-002", "description": "Email field validates proper email format", "testable": true },
    { "id": "AC-003", "description": "Invalid credentials display 'Invalid email or password' error", "testable": true },
    { "id": "AC-004", "description": "Successful login redirects to /dashboard", "testable": true },
    { "id": "AC-005", "description": "Session token is stored and persists across page refresh", "testable": true }
  ],

  "technicalNotes": "Use Supabase Auth signInWithPassword method. Store session in localStorage. Redirect using Next.js router.push('/dashboard'). Handle auth state with AuthContext provider.",

  "dependencies": [],

  "mockupRefs": ["02-login.html"],

  "safety": {
    "level": "high",
    "notes": "Credentials must be transmitted over HTTPS. Rate limit login attempts to prevent brute force. Hash passwords server-side."
  },

  "estimates": {
    "complexity": "medium",
    "hours": 4
  }
}
```

**Expected Score:** ~95/100

---

## Exports

```javascript
// Prompts
export const STORY_GENERATION_PROMPT;
export const STORY_REVIEW_PROMPT;
export const STORY_REFINEMENT_PROMPT;
export const VALID_DOMAINS_FOR_PROMPT;

// Constants
export const MIN_ACCEPTABLE_SCORE;
export const MAX_RETRIES;

// Main Functions
export async function generateStories(prd, projectPath, options);
export async function generateSingleStory(feature, context, options);
export function validateStories(stories);

// Helper Functions
export function featuresToStories(features);
export function assignMockupRefs(story, mockups);
export function generateStoryId(index);
export function calculateAverageScore(stories);

// Default export
export default generateStories;
```

---

*Specification Version: 1.0.0 | Date: 2026-01-26*
