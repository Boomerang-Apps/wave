# TDD Proof: PRD Generator

**Date:** 2026-01-26
**Status:** TESTS WRITTEN - AWAITING IMPLEMENTATION

---

## TDD Process Followed

### Step 1: Gate 0 Validation
- Verified all dependencies exist and are functional
- Documented in `GATE-0-VALIDATION.md`

### Step 2: Documentation
- Created comprehensive `SPECIFICATION.md`
- Defined all interfaces, schemas, and validation rules

### Step 3: TDD Tests Written (THIS STEP)
- 100+ test cases written BEFORE implementation
- Tests MUST fail initially (file doesn't exist)

---

## Test Failure Proof

**Command Run:**
```bash
npm test -- prd-generator
```

**Expected Error:**
```
Error: Failed to resolve import "../utils/prd-generator.js" from
"server/__tests__/prd-generator.test.js". Does the file exist?
```

**Test Output:**
```
RUN v4.0.18 /Volumes/SSD-01/Projects/WAVE/portal

 ❯ server/__tests__/prd-generator.test.js (0 test)

⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯

FAIL server/__tests__/prd-generator.test.js
Error: Failed to resolve import "../utils/prd-generator.js"
  42 |    createEmptyPRD,
  43 |    mergePRDs
  44 |  } from '../utils/prd-generator.js';
     |          ^

 Test Files  1 failed (1)
       Tests  no tests
    Duration  479ms
```

---

## Test Categories Written

| Category | Tests | Description |
|----------|-------|-------------|
| PRD_SCHEMA | 12 | Schema definition validation |
| PRD_SCORE_WEIGHTS | 9 | Weight constants (total 100) |
| PRD_SCORE_THRESHOLDS | 5 | Threshold constants |
| PRD_SYNTHESIS_PROMPT | 6 | Synthesis prompt validation |
| PRD_REVIEW_PROMPT | 5 | Review prompt validation |
| validatePRD | 32 | PRD validation against schema |
| scorePRD | 25 | PRD scoring (0-100) |
| getPRDScoreBreakdown | 11 | Detailed score breakdown |
| createEmptyPRD | 8 | Empty PRD creation |
| mergePRDs | 10 | PRD merging logic |
| extractFeaturesFromMockups | 9 | Feature extraction from HTML |
| gatherPRDSources | 3 | Source gathering (async) |
| generatePRD | 6 | Main generation (async) |
| Integration Tests | 6 | Cross-function validation |
| **TOTAL** | **~125** | All categories covered |

---

## Test Fixtures

### VALID_COMPLETE_PRD
Complete PRD with all sections filled:
- All required fields present
- 5 core features with acceptance criteria
- 3 primary goals, 1 secondary goal
- Tech stack with 4 items
- 1 persona, 2 risks
- Expected score: >= 90/100

### MINIMAL_VALID_PRD
Minimum viable PRD:
- Only required fields
- 3 core features (minimum)
- 2 primary goals (minimum)
- 1 tech stack item (minimum)
- Expected score: ~65/100

---

## Functions Under Test

### Synchronous Functions
| Function | Purpose | Test Count |
|----------|---------|------------|
| `validatePRD(prd)` | Validate PRD against schema | 32 |
| `scorePRD(prd)` | Calculate score 0-100 | 25 |
| `getPRDScoreBreakdown(prd)` | Detailed category breakdown | 11 |
| `createEmptyPRD(name)` | Create blank PRD structure | 8 |
| `mergePRDs(existing, generated)` | Merge two PRDs | 10 |
| `extractFeaturesFromMockups(mockups)` | Extract features from HTML | 9 |

### Asynchronous Functions
| Function | Purpose | Test Count |
|----------|---------|------------|
| `gatherPRDSources(path)` | Gather project sources | 3 |
| `generatePRD(path, options)` | Main generation pipeline | 6 |

---

## Expected Exports

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
```

---

## Next Step

**Step 4: Implementation**
- Create `server/utils/prd-generator.js`
- Implement all exported functions
- All tests MUST pass after implementation

---

*TDD Proof created: 2026-01-26 08:15:28*
