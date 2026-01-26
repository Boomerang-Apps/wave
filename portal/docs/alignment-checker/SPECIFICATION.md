# Alignment Checker - Technical Specification

**Version:** 1.0.0
**Date:** 2026-01-26
**Status:** SPECIFICATION COMPLETE
**Author:** WAVE Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Design Goals](#design-goals)
3. [Alignment Checks](#alignment-checks)
4. [Output Schema](#output-schema)
5. [Scoring System](#scoring-system)
6. [API Reference](#api-reference)
7. [Examples](#examples)

---

## Overview

The Alignment Checker validates consistency between three artifacts:
- **PRD** (Product Requirements Document)
- **Stories** (Enhanced Stories with GWT)
- **Mockups** (HTML design files)

### Purpose

Ensure that:
1. Every PRD feature has corresponding stories
2. UI stories reference relevant mockups
3. Mockups reflect PRD features
4. Domain categorization is consistent
5. Priority levels align between PRD and stories

### File Location

```
server/utils/alignment-checker.js
server/__tests__/alignment-checker.test.js
```

---

## Design Goals

### 1. Complete Coverage Check
Identify PRD features without stories and stories without PRD features.

### 2. Mockup Reference Validation
Ensure UI-related stories reference mockups and those mockups exist.

### 3. Domain Consistency
Validate that story domains match PRD feature domains.

### 4. Priority Alignment
Check that story priorities match PRD feature priorities.

### 5. Actionable Gaps
Provide specific, actionable recommendations to fix alignment issues.

---

## Alignment Checks

### 1. PRD ↔ Stories Alignment

**Check:** Every PRD core feature has at least one story.

| Check | Description | Score Impact |
|-------|-------------|--------------|
| Feature Coverage | % of PRD features with stories | 40 points |
| Story Orphans | Stories without PRD feature | -5 per orphan |
| Domain Match | Story domain matches feature domain | 5 points |
| Priority Match | Story priority matches feature priority | 5 points |

**Calculation:**
```javascript
prdStoriesScore = (coveredFeatures / totalFeatures) * 40 +
                  domainMatchBonus +
                  priorityMatchBonus -
                  (orphanStories * 5);
```

### 2. Stories ↔ Mockups Alignment

**Check:** UI stories reference existing mockups.

| Check | Description | Score Impact |
|-------|-------------|--------------|
| UI Coverage | % of UI stories with mockupRefs | 30 points |
| Ref Validity | % of mockupRefs that exist | 10 points |
| Missing Refs | UI stories without mockupRefs | -10 per story |

**UI Domains:** `ui-components`, `forms`, `navigation`

**Calculation:**
```javascript
storyMockupScore = (uiStoriesWithRefs / totalUIStories) * 30 +
                   (validRefs / totalRefs) * 10 -
                   (missingRefCount * 10);
```

### 3. PRD ↔ Mockups Alignment

**Check:** PRD features are reflected in mockups.

| Check | Description | Score Impact |
|-------|-------------|--------------|
| Feature Visibility | Features detectable in mockups | 20 points |
| Mockup Orphans | Mockups not referenced by any story | -2 per orphan |

**Detection:** Check if mockup content contains feature keywords.

**Calculation:**
```javascript
prdMockupScore = (visibleFeatures / uiFeatures) * 20 -
                 (orphanMockups * 2);
```

---

## Output Schema

### AlignmentReport

```typescript
interface AlignmentReport {
  // Overall
  valid: boolean;              // true if score >= 70
  score: number;               // 0-100
  timestamp: string;           // ISO timestamp

  // Individual Scores
  scores: {
    prdStories: number;        // 0-50
    storyMockups: number;      // 0-40
    prdMockups: number;        // 0-20
  };

  // Coverage
  coverage: {
    featuresWithStories: number;
    totalFeatures: number;
    featureCoverage: number;   // percentage

    uiStoriesWithMockups: number;
    totalUIStories: number;
    mockupCoverage: number;    // percentage
  };

  // Issues
  gaps: {
    featuresWithoutStories: FeatureGap[];
    storiesWithoutFeatures: StoryGap[];
    uiStoriesWithoutMockups: StoryGap[];
    missingMockupRefs: MissingRef[];
    domainMismatches: DomainMismatch[];
    priorityMismatches: PriorityMismatch[];
  };

  // Recommendations
  recommendations: Recommendation[];
}

interface FeatureGap {
  featureId: string;
  featureName: string;
  domain: string;
  priority: string;
}

interface StoryGap {
  storyId: string;
  title: string;
  domain: string;
}

interface MissingRef {
  storyId: string;
  missingFile: string;
}

interface DomainMismatch {
  featureId: string;
  storyId: string;
  featureDomain: string;
  storyDomain: string;
}

interface PriorityMismatch {
  featureId: string;
  storyId: string;
  featurePriority: string;
  storyPriority: string;
}

interface Recommendation {
  type: 'create_story' | 'add_mockup_ref' | 'fix_domain' | 'fix_priority' | 'remove_orphan';
  priority: 'high' | 'medium' | 'low';
  message: string;
  target: string;              // ID of affected item
}
```

---

## Scoring System

### Score Breakdown (Total: 100)

| Category | Max Points | Weight |
|----------|------------|--------|
| PRD ↔ Stories | 50 | 50% |
| Stories ↔ Mockups | 30 | 30% |
| PRD ↔ Mockups | 20 | 20% |

### Score Thresholds

```javascript
export const ALIGNMENT_THRESHOLDS = {
  excellent: 90,    // Ready for development
  good: 80,         // Minor gaps to address
  acceptable: 70,   // Usable but needs work
  poor: 50,         // Significant gaps
  failing: 0        // Major alignment issues
};
```

### Detailed Scoring

```javascript
function calculateAlignmentScore(prd, stories, mockups) {
  let score = 0;

  // PRD ↔ Stories (50 points)
  const featureCoverage = getFeatureCoverage(prd, stories);
  score += featureCoverage.percentage * 0.4;  // 40 points max

  const domainMatches = getDomainMatches(prd, stories);
  score += domainMatches.matches * 0.5;        // 5 points max

  const priorityMatches = getPriorityMatches(prd, stories);
  score += priorityMatches.matches * 0.5;      // 5 points max

  // Stories ↔ Mockups (30 points)
  const mockupCoverage = getMockupCoverage(stories, mockups);
  score += mockupCoverage.percentage * 0.3;   // 30 points max

  // PRD ↔ Mockups (20 points)
  const featureVisibility = getFeatureVisibility(prd, mockups);
  score += featureVisibility.percentage * 0.2; // 20 points max

  // Penalties
  score -= getOrphanCount(stories, prd) * 2;
  score -= getMissingRefCount(stories, mockups) * 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}
```

---

## API Reference

### Main Functions

#### checkAlignment(prd, stories, projectPath)

**Purpose:** Perform full alignment check.

**Signature:**
```javascript
export async function checkAlignment(prd, stories, projectPath) {
  // Returns AlignmentReport
}
```

**Returns:** `Promise<AlignmentReport>`

#### checkPRDStoriesAlignment(prd, stories)

**Purpose:** Check alignment between PRD and stories.

**Signature:**
```javascript
export function checkPRDStoriesAlignment(prd, stories) {
  // Returns PRDStoriesCheck
}
```

**Returns:**
```typescript
interface PRDStoriesCheck {
  score: number;
  featuresWithStories: string[];
  featuresWithoutStories: FeatureGap[];
  storiesWithoutFeatures: StoryGap[];
  domainMismatches: DomainMismatch[];
  priorityMismatches: PriorityMismatch[];
}
```

#### checkStoryMockupsAlignment(stories, mockups)

**Purpose:** Check alignment between stories and mockups.

**Signature:**
```javascript
export function checkStoryMockupsAlignment(stories, mockups) {
  // Returns StoryMockupsCheck
}
```

**Returns:**
```typescript
interface StoryMockupsCheck {
  score: number;
  uiStoriesWithMockups: string[];
  uiStoriesWithoutMockups: StoryGap[];
  missingMockupRefs: MissingRef[];
  orphanMockups: string[];
}
```

#### checkPRDMockupsAlignment(prd, mockups)

**Purpose:** Check alignment between PRD and mockups.

**Signature:**
```javascript
export function checkPRDMockupsAlignment(prd, mockups) {
  // Returns PRDMockupsCheck
}
```

**Returns:**
```typescript
interface PRDMockupsCheck {
  score: number;
  featuresInMockups: string[];
  featuresNotInMockups: string[];
  orphanMockups: string[];
}
```

### Helper Functions

#### findStoryForFeature(feature, stories)

Find story that corresponds to a PRD feature.

#### isUIRelatedStory(story)

Check if story requires mockup references.

#### validateMockupRef(ref, mockups)

Check if a mockup reference exists.

#### generateRecommendations(gaps)

Generate actionable recommendations from gaps.

#### calculateCoveragePercentage(covered, total)

Calculate coverage as percentage.

---

## Examples

### Input Data

**PRD Features:**
```json
{
  "features": {
    "core": [
      { "id": "F-001", "name": "Login", "domain": "authentication", "priority": "must-have" },
      { "id": "F-002", "name": "Dashboard", "domain": "ui-components", "priority": "must-have" },
      { "id": "F-003", "name": "API", "domain": "api", "priority": "should-have" }
    ]
  }
}
```

**Stories:**
```json
[
  { "id": "WAVE-001-AUTH-001", "title": "Login", "domain": "authentication", "priority": "high" },
  { "id": "WAVE-001-UICO-002", "title": "Dashboard", "domain": "ui-components", "priority": "high", "mockupRefs": [{ "file": "dashboard.html" }] }
]
```

**Mockups:**
```json
[
  { "name": "login.html", "content": "<form>...</form>" },
  { "name": "dashboard.html", "content": "<div>...</div>" }
]
```

### Output: AlignmentReport

```json
{
  "valid": true,
  "score": 85,
  "timestamp": "2026-01-26T08:30:00Z",

  "scores": {
    "prdStories": 40,
    "storyMockups": 25,
    "prdMockups": 20
  },

  "coverage": {
    "featuresWithStories": 2,
    "totalFeatures": 3,
    "featureCoverage": 66.7,
    "uiStoriesWithMockups": 1,
    "totalUIStories": 1,
    "mockupCoverage": 100
  },

  "gaps": {
    "featuresWithoutStories": [
      { "featureId": "F-003", "featureName": "API", "domain": "api", "priority": "should-have" }
    ],
    "storiesWithoutFeatures": [],
    "uiStoriesWithoutMockups": [],
    "missingMockupRefs": [],
    "domainMismatches": [],
    "priorityMismatches": []
  },

  "recommendations": [
    {
      "type": "create_story",
      "priority": "medium",
      "message": "Create story for feature 'API' (F-003)",
      "target": "F-003"
    }
  ]
}
```

---

## Exports

```javascript
// Constants
export const ALIGNMENT_THRESHOLDS;
export const UI_DOMAINS;

// Main Functions
export async function checkAlignment(prd, stories, projectPath);
export function checkPRDStoriesAlignment(prd, stories);
export function checkStoryMockupsAlignment(stories, mockups);
export function checkPRDMockupsAlignment(prd, mockups);

// Helper Functions
export function findStoryForFeature(feature, stories);
export function isUIRelatedStory(story);
export function validateMockupRef(ref, mockups);
export function generateRecommendations(gaps);
export function calculateCoveragePercentage(covered, total);

// Default export
export default checkAlignment;
```

---

*Specification Version: 1.0.0 | Date: 2026-01-26*
