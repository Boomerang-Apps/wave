# TDD Proof: Stories Generator

**Date:** 2026-01-26
**Status:** TESTS WRITTEN - AWAITING IMPLEMENTATION

---

## TDD Process Followed

### Step 1: Gate 0 Validation
- Verified all dependencies exist (enhanced-story-schema, prd-generator, llm-client)
- Documented in `GATE-0-VALIDATION.md`

### Step 2: Documentation
- Created comprehensive `SPECIFICATION.md`
- Defined generation pipeline, validation loop, prompts

### Step 3: TDD Tests Written (THIS STEP)
- 80+ test cases written BEFORE implementation
- Tests MUST fail initially (file doesn't exist)

---

## Test Failure Proof

**Command Run:**
```bash
npm test -- stories-generator
```

**Expected Error:**
```
Error: Failed to resolve import "../utils/stories-generator.js" from
"server/__tests__/stories-generator.test.js". Does the file exist?
```

**Test Output:**
```
RUN v4.0.18 /Volumes/SSD-01/Projects/WAVE/portal

 ❯ server/__tests__/stories-generator.test.js (0 test)

⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯

FAIL server/__tests__/stories-generator.test.js
Error: Failed to resolve import "../utils/stories-generator.js"
  41 |    generateStoryId,
  42 |    calculateAverageScore
  43 |  } from '../utils/stories-generator.js';
     |          ^

 Test Files  1 failed (1)
       Tests  no tests
    Duration  462ms
```

---

## Test Categories Written

| Category | Tests | Description |
|----------|-------|-------------|
| STORY_GENERATION_PROMPT | 8 | Generation prompt validation |
| STORY_REVIEW_PROMPT | 5 | Review prompt validation |
| STORY_REFINEMENT_PROMPT | 4 | Refinement prompt validation |
| VALID_DOMAINS_FOR_PROMPT | 2 | Domains string validation |
| MIN_ACCEPTABLE_SCORE | 2 | Constant validation |
| MAX_RETRIES | 2 | Constant validation |
| generateStories | 8 | Main generation function |
| generateSingleStory | 7 | Single story generation |
| validateStories | 9 | Batch validation |
| featuresToStories | 11 | Feature mapping |
| assignMockupRefs | 5 | Mockup matching |
| generateStoryId | 7 | ID generation |
| calculateAverageScore | 8 | Score averaging |
| Integration Tests | 4 | Cross-function tests |
| Edge Cases | 4 | Edge case handling |
| **TOTAL** | **~86** | All categories covered |

---

## Test Fixtures

### SAMPLE_PRD
PRD with 3 core features for testing:
- F-001: User Login (authentication)
- F-002: Task Creation (forms)
- F-003: API Endpoints (api)

### VALID_STORY
Complete EnhancedStory with all fields:
- GWT format (20+ chars each)
- 5 acceptance criteria (all testable)
- Technical notes
- Mockup references
- Expected score: ~95/100

### SAMPLE_FEATURE
Single PRD feature for testing single story generation.

### SAMPLE_MOCKUPS
Array of mockup files for testing mockup assignment.

---

## Functions Under Test

### Synchronous Functions
| Function | Purpose | Test Count |
|----------|---------|------------|
| `validateStories(stories)` | Batch validation | 9 |
| `featuresToStories(features)` | Feature to story mapping | 11 |
| `assignMockupRefs(story, mockups)` | Mockup matching | 5 |
| `generateStoryId(index)` | ID generation | 7 |
| `calculateAverageScore(stories)` | Score calculation | 8 |

### Asynchronous Functions
| Function | Purpose | Test Count |
|----------|---------|------------|
| `generateStories(prd, path, options)` | Main generation | 8 |
| `generateSingleStory(feature, context, options)` | Single story | 7 |

---

## Expected Exports

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

## Next Step

**Step 4: Implementation**
- Create `server/utils/stories-generator.js`
- Implement all exported functions
- All tests MUST pass after implementation

---

*TDD Proof created: 2026-01-26 08:22:17*
