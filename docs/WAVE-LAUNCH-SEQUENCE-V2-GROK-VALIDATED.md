# WAVE Agent Launch Sequence v2.0 - Grok Validated

**Version:** 2.0 (Post-Grok Validation)
**Date:** 2026-01-24
**Status:** APPROVED WITH CHANGES - All recommendations incorporated
**Validators:** Claude Code + Grok (xAI)

---

## IMPLEMENTATION PROGRESS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION PROGRESS TRACKER                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1-4: COMPLETED (554 tests)                                           │
│  ████████████████████████████████████████ 100%                              │
│                                                                              │
│  GROK RECOMMENDATIONS:                                                       │
│                                                                              │
│  [G1] Stage-Gate Kill/Hold States                                           │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  ◄── CURRENT                │
│                                                                              │
│  [G2] Independent/Human Review Gates                                         │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%                              │
│                                                                              │
│  [G3] User Testing Validation                                                │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%                              │
│                                                                              │
│  [G4] PRINCE2 PID Artifacts                                                  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%                              │
│                                                                              │
│  [G5] Manager Delegation/Consensus                                           │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%                              │
│                                                                              │
│  [G6] Rollback Mechanism                                                     │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%                              │
│                                                                              │
│  PHASE 5-6: PENDING (after Grok recommendations)                            │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%                              │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│  OVERALL: ████████████████░░░░░░░░░░░░░░░░░░░░░░░░  40%                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## VALIDATION SUMMARY (From Grok)

| Claim | Grok Status | Action |
|-------|-------------|--------|
| NASA Pre-Flight | ENHANCE | Add independent review, conditional bypasses |
| Stage-Gate (Cooper) | **REJECT** | Add Kill/Hold/Recycle states |
| Design Sprints | ENHANCE | Add user testing validation |
| PRINCE2 PID | ENHANCE | Add Business Case, Risk Register |
| Terraform Validation | CONFIRM | None needed |
| CrewAI/LangGraph | CONFIRM | Add manager delegation |

---

## ENHANCED GATE STATUS MODEL

### Before (Binary - Rejected by Grok)
```
idle → ready | blocked
```

### After (Stage-Gate Compliant)
```
┌─────────────────────────────────────────────────────────────────┐
│                    GATE STATUS STATE MACHINE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                         ┌──────────┐                             │
│                         │   idle   │                             │
│                         └────┬─────┘                             │
│                              │                                   │
│                         [validate]                               │
│                              │                                   │
│              ┌───────────────┼───────────────┐                   │
│              ▼               ▼               ▼                   │
│        ┌──────────┐   ┌──────────┐   ┌──────────┐               │
│        │  ready   │   │  hold    │   │ blocked  │               │
│        │  (GO)    │   │ (PAUSE)  │   │  (FAIL)  │               │
│        └────┬─────┘   └────┬─────┘   └────┬─────┘               │
│             │              │              │                      │
│             │         [more data]    [3 retries]                 │
│             │              │              │                      │
│             │              ▼              ▼                      │
│             │        ┌──────────┐   ┌──────────┐                │
│             │        │ validate │   │  killed  │                │
│             │        │  again   │   │ (ABANDON)│                │
│             │        └──────────┘   └──────────┘                │
│             │                                                    │
│             ▼                                                    │
│   [requires_human_review?]───YES───► ┌──────────────┐           │
│             │                        │ pending_     │           │
│             NO                       │ human_review │           │
│             │                        └──────┬───────┘           │
│             │                               │                    │
│             │                        [human approves]            │
│             │                               │                    │
│             ▼                               ▼                    │
│        ┌─────────────────────────────────────┐                  │
│        │            GATE PASSED              │                  │
│        │         (unlock next step)          │                  │
│        └─────────────────────────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## G1: STAGE-GATE KILL/HOLD STATES

### G1.1 Enhanced Status Types

**File:** `portal/server/utils/gate-status-types.js`

```javascript
/**
 * Gate Status Types (Stage-Gate Compliant)
 * Based on Dr. Robert Cooper's Stage-Gate methodology
 */

export const GATE_STATUSES = {
  // Initial state
  IDLE: 'idle',

  // GO decision - proceed to next gate
  READY: 'ready',

  // HOLD decision - pause for more information
  HOLD: 'hold',

  // BLOCKED decision - validation failed, can retry
  BLOCKED: 'blocked',

  // KILL decision - abandon this item
  KILLED: 'killed',

  // RECYCLE decision - go back to previous gate
  RECYCLE: 'recycle',

  // Awaiting human review (for critical gates)
  PENDING_HUMAN_REVIEW: 'pending_human_review',

  // Currently validating
  VALIDATING: 'validating'
};

export const GATE_DECISIONS = {
  GO: 'go',           // Proceed to next gate
  KILL: 'kill',       // Abandon - not viable
  HOLD: 'hold',       // Pause - need more data
  RECYCLE: 'recycle'  // Go back - rework needed
};
```

### G1.2 Kill Criteria Definition

**File:** `portal/server/utils/kill-criteria.js`

```javascript
/**
 * Kill Criteria - When to abandon a gate/story
 */

export const KILL_CRITERIA = {
  // Step 0: Mockup Design
  mockup: {
    maxRetries: 3,
    killConditions: [
      'No mockups after 3 validation attempts',
      'Mockups fail accessibility audit 3 times',
      'Human explicitly marks as abandoned'
    ]
  },

  // Step 1: PRD & Stories
  stories: {
    maxRetries: 3,
    killConditions: [
      'No PRD found after 3 attempts',
      'Story schema validation fails 3 times',
      'Alignment score < 25% after fixes',
      'Human explicitly marks as abandoned'
    ]
  },

  // Step 2: Wave Plan
  wavePlan: {
    maxRetries: 3,
    killConditions: [
      'Circular dependencies cannot be resolved',
      'No valid execution order possible',
      'Human explicitly marks as abandoned'
    ]
  },

  // Global kill criteria
  global: {
    budgetExceeded: true,
    timeoutHours: 48,
    humanEscalationIgnored: 24 // hours
  }
};

export function shouldKill(stepId, retryCount, conditions) {
  const criteria = KILL_CRITERIA[stepId] || {};

  if (retryCount >= (criteria.maxRetries || 3)) {
    return { kill: true, reason: `Max retries (${criteria.maxRetries}) exceeded` };
  }

  for (const condition of conditions) {
    if (criteria.killConditions?.includes(condition)) {
      return { kill: true, reason: condition };
    }
  }

  return { kill: false };
}
```

### G1.3 Hold Criteria Definition

**File:** `portal/server/utils/hold-criteria.js`

```javascript
/**
 * Hold Criteria - When to pause for more information
 */

export const HOLD_REASONS = {
  AWAITING_HUMAN_INPUT: 'awaiting_human_input',
  AWAITING_EXTERNAL_DATA: 'awaiting_external_data',
  DEPENDENCY_NOT_READY: 'dependency_not_ready',
  BUDGET_REVIEW_NEEDED: 'budget_review_needed',
  RISK_ASSESSMENT_NEEDED: 'risk_assessment_needed',
  CLARIFICATION_NEEDED: 'clarification_needed'
};

export function shouldHold(stepId, context) {
  const holdConditions = [];

  // Check for missing human input
  if (context.requiresHumanDecision && !context.humanDecisionProvided) {
    holdConditions.push({
      reason: HOLD_REASONS.AWAITING_HUMAN_INPUT,
      message: 'Waiting for human decision on ambiguous requirement'
    });
  }

  // Check for budget concerns
  if (context.estimatedCost > context.budgetThreshold * 0.8) {
    holdConditions.push({
      reason: HOLD_REASONS.BUDGET_REVIEW_NEEDED,
      message: `Estimated cost (${context.estimatedCost}) approaching budget limit`
    });
  }

  // Check for high-risk items
  if (context.riskScore > 0.7) {
    holdConditions.push({
      reason: HOLD_REASONS.RISK_ASSESSMENT_NEEDED,
      message: `High risk score (${context.riskScore}) requires review`
    });
  }

  return {
    hold: holdConditions.length > 0,
    conditions: holdConditions
  };
}
```

### G1.4 Gate Decision Engine

**File:** `portal/server/utils/gate-decision-engine.js`

```javascript
/**
 * Gate Decision Engine
 * Makes Go/Kill/Hold/Recycle decisions at each gate
 */

import { GATE_STATUSES, GATE_DECISIONS } from './gate-status-types.js';
import { shouldKill } from './kill-criteria.js';
import { shouldHold } from './hold-criteria.js';

export function makeGateDecision(stepId, validationResult, context) {
  const { passed, errors, warnings, retryCount } = validationResult;

  // Check for KILL first
  const killCheck = shouldKill(stepId, retryCount, errors);
  if (killCheck.kill) {
    return {
      decision: GATE_DECISIONS.KILL,
      status: GATE_STATUSES.KILLED,
      reason: killCheck.reason,
      timestamp: new Date().toISOString()
    };
  }

  // Check for HOLD
  const holdCheck = shouldHold(stepId, context);
  if (holdCheck.hold) {
    return {
      decision: GATE_DECISIONS.HOLD,
      status: GATE_STATUSES.HOLD,
      reasons: holdCheck.conditions,
      timestamp: new Date().toISOString()
    };
  }

  // Check for RECYCLE (need to go back)
  if (validationResult.requiresRework && retryCount > 0) {
    return {
      decision: GATE_DECISIONS.RECYCLE,
      status: GATE_STATUSES.RECYCLE,
      recycleToStep: validationResult.recycleTarget,
      timestamp: new Date().toISOString()
    };
  }

  // Check for GO
  if (passed) {
    // Check if human review required for this gate
    if (context.requiresHumanReview) {
      return {
        decision: null, // Pending human decision
        status: GATE_STATUSES.PENDING_HUMAN_REVIEW,
        timestamp: new Date().toISOString()
      };
    }

    return {
      decision: GATE_DECISIONS.GO,
      status: GATE_STATUSES.READY,
      timestamp: new Date().toISOString()
    };
  }

  // Default: BLOCKED (can retry)
  return {
    decision: null,
    status: GATE_STATUSES.BLOCKED,
    errors,
    warnings,
    canRetry: retryCount < 3,
    timestamp: new Date().toISOString()
  };
}
```

### G1 Tests Required

```
portal/server/__tests__/
├── gate-status-types.test.js      # Status enum tests
├── kill-criteria.test.js          # Kill decision tests
├── hold-criteria.test.js          # Hold decision tests
└── gate-decision-engine.test.js   # Decision engine tests
```

**Estimated Tests:** 45

---

## G2: INDEPENDENT/HUMAN REVIEW GATES

### G2.1 Human Review Requirements

**File:** `portal/server/utils/human-review-config.js`

```javascript
/**
 * Human Review Configuration
 * Defines which gates require independent human verification
 */

export const HUMAN_REVIEW_GATES = {
  // Step 0: Mockup Design - Human locks mockups
  'mockup-design': {
    required: true,
    reviewer: 'product_owner',
    description: 'Lock mockups before development',
    bypassable: false
  },

  // Step 2: Wave Plan - Human approves agent assignments
  'execution-plan': {
    required: true,
    reviewer: 'tech_lead',
    description: 'Approve wave plan and agent assignments',
    bypassable: true,
    bypassApprover: 'cto'
  },

  // Step 5: Safety Protocol - Independent safety review
  'compliance-safety': {
    required: true,
    reviewer: 'safety_officer',
    description: 'Verify safety guardrails active',
    bypassable: false
  },

  // Step 9: Launch - Final human authorization
  'agent-dispatch': {
    required: true,
    reviewer: 'cto',
    description: 'Authorize autonomous agent launch',
    bypassable: false,
    requiresAllPreviousGreen: true
  }
};

export const REVIEWER_ROLES = {
  product_owner: { level: 1, canBypass: [] },
  tech_lead: { level: 2, canBypass: ['product_owner'] },
  safety_officer: { level: 3, canBypass: [] },
  cto: { level: 4, canBypass: ['product_owner', 'tech_lead'] }
};
```

### G2.2 Human Review Request System

**File:** `portal/server/utils/human-review-request.js`

```javascript
/**
 * Human Review Request System
 * Creates and tracks human review requests
 */

export function createHumanReviewRequest(stepId, validationResult, context) {
  const config = HUMAN_REVIEW_GATES[stepId];
  if (!config?.required) {
    return null;
  }

  return {
    id: `hr-${stepId}-${Date.now()}`,
    stepId,
    reviewer: config.reviewer,
    description: config.description,
    status: 'pending',
    validationSummary: {
      passed: validationResult.passed,
      warnings: validationResult.warnings?.length || 0,
      errors: validationResult.errors?.length || 0
    },
    context: {
      projectId: context.projectId,
      projectName: context.projectName,
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    bypassable: config.bypassable,
    bypassApprover: config.bypassApprover
  };
}

export function resolveHumanReview(reviewId, decision, reviewer) {
  return {
    reviewId,
    decision, // 'approved' | 'rejected' | 'bypassed'
    reviewer,
    resolvedAt: new Date().toISOString(),
    notes: decision.notes || null
  };
}
```

### G2.3 Independent Verification Check

**File:** `portal/server/utils/independent-verification.js`

```javascript
/**
 * Independent Verification
 * Ensures critical checks are verified by someone other than creator
 */

export function requiresIndependentVerification(stepId, context) {
  const INDEPENDENT_VERIFICATION_STEPS = [
    'compliance-safety',  // Safety must be independently verified
    'agent-dispatch'      // Launch must be independently verified
  ];

  return INDEPENDENT_VERIFICATION_STEPS.includes(stepId);
}

export function validateIndependentReviewer(stepId, originalAuthor, reviewer) {
  if (originalAuthor === reviewer) {
    return {
      valid: false,
      error: 'Independent verification requires different reviewer than original author'
    };
  }

  return { valid: true };
}
```

### G2 Tests Required

```
portal/server/__tests__/
├── human-review-config.test.js        # Config tests
├── human-review-request.test.js       # Request lifecycle tests
└── independent-verification.test.js   # Verification tests
```

**Estimated Tests:** 35

---

## G3: USER TESTING VALIDATION

### G3.1 User Testing Step Definition

**File:** `portal/server/utils/user-testing-validation.js`

```javascript
/**
 * User Testing Validation (Design Sprint Day 5)
 * Validates mockups/stories with real user feedback
 */

export const USER_TESTING_CONFIG = {
  // Minimum requirements
  minTesters: 3,
  minFeedbackScore: 3.5, // out of 5
  requiredQuestions: [
    'usability',
    'clarity',
    'completeness'
  ],

  // Optional but recommended
  recommended: {
    testers: 5,
    includeAccessibility: true,
    includePerformanceExpectations: true
  }
};

export function createUserTestingSession(mockups, stories) {
  return {
    id: `ut-${Date.now()}`,
    status: 'pending',
    mockups: mockups.map(m => ({
      id: m.id,
      name: m.name,
      feedbackCollected: false
    })),
    stories: stories.map(s => ({
      id: s.id,
      title: s.title,
      feedbackCollected: false
    })),
    testers: [],
    createdAt: new Date().toISOString()
  };
}

export function recordUserFeedback(sessionId, testerId, feedback) {
  return {
    sessionId,
    testerId,
    feedback: {
      usability: feedback.usability, // 1-5
      clarity: feedback.clarity,     // 1-5
      completeness: feedback.completeness, // 1-5
      comments: feedback.comments,
      suggestions: feedback.suggestions,
      blockers: feedback.blockers || []
    },
    recordedAt: new Date().toISOString()
  };
}

export function evaluateUserTesting(session) {
  const { testers, mockups, stories } = session;

  if (testers.length < USER_TESTING_CONFIG.minTesters) {
    return {
      passed: false,
      status: 'insufficient_testers',
      message: `Need ${USER_TESTING_CONFIG.minTesters} testers, have ${testers.length}`
    };
  }

  // Calculate average scores
  const avgUsability = average(testers.map(t => t.feedback.usability));
  const avgClarity = average(testers.map(t => t.feedback.clarity));
  const avgCompleteness = average(testers.map(t => t.feedback.completeness));
  const overallScore = (avgUsability + avgClarity + avgCompleteness) / 3;

  // Check for blockers
  const blockers = testers.flatMap(t => t.feedback.blockers);

  if (blockers.length > 0) {
    return {
      passed: false,
      status: 'blockers_found',
      blockers,
      scores: { avgUsability, avgClarity, avgCompleteness, overallScore }
    };
  }

  if (overallScore < USER_TESTING_CONFIG.minFeedbackScore) {
    return {
      passed: false,
      status: 'low_score',
      message: `Score ${overallScore.toFixed(2)} below minimum ${USER_TESTING_CONFIG.minFeedbackScore}`,
      scores: { avgUsability, avgClarity, avgCompleteness, overallScore }
    };
  }

  return {
    passed: true,
    status: 'approved',
    scores: { avgUsability, avgClarity, avgCompleteness, overallScore },
    testerCount: testers.length
  };
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
```

### G3.2 User Testing as Optional Gate

**File:** `portal/server/utils/user-testing-gate.js`

```javascript
/**
 * User Testing Gate
 * Optional but recommended between mockups and development
 */

export const USER_TESTING_GATE = {
  id: 'user-testing',
  step: 1.5, // Between Step 1 and Step 2
  label: 'User Testing',
  required: false, // Optional
  recommendedFor: [
    'new_product',
    'major_redesign',
    'user_facing_features'
  ],

  canSkip: true,
  skipRequires: 'tech_lead_approval',
  skipReason: null
};

export function shouldRequireUserTesting(projectContext) {
  const { projectType, hasUserFacing, isRedesign } = projectContext;

  if (USER_TESTING_GATE.recommendedFor.includes(projectType)) {
    return { required: true, reason: `Recommended for ${projectType}` };
  }

  if (hasUserFacing && isRedesign) {
    return { required: true, reason: 'User-facing redesign benefits from testing' };
  }

  return { required: false, reason: 'Optional for this project type' };
}
```

### G3 Tests Required

```
portal/server/__tests__/
├── user-testing-validation.test.js  # Validation tests
└── user-testing-gate.test.js        # Gate integration tests
```

**Estimated Tests:** 30

---

## G4: PRINCE2 PID ARTIFACTS

### G4.1 Business Case Validation

**File:** `portal/server/utils/business-case.js`

```javascript
/**
 * Business Case Validation (PRINCE2)
 * Validates business justification exists
 */

export const BUSINESS_CASE_SCHEMA = {
  required: [
    'executive_summary',
    'reasons',
    'business_options',
    'expected_benefits',
    'expected_costs',
    'risks'
  ],
  optional: [
    'timescale',
    'investment_appraisal',
    'major_risks'
  ]
};

export function validateBusinessCase(businessCase) {
  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of BUSINESS_CASE_SCHEMA.required) {
    if (!businessCase[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check optional fields
  for (const field of BUSINESS_CASE_SCHEMA.optional) {
    if (!businessCase[field]) {
      warnings.push(`Recommended field missing: ${field}`);
    }
  }

  // Validate benefits vs costs
  if (businessCase.expected_benefits && businessCase.expected_costs) {
    const roi = businessCase.expected_benefits / businessCase.expected_costs;
    if (roi < 1) {
      warnings.push(`ROI < 1 (${roi.toFixed(2)}) - costs exceed benefits`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function detectBusinessCase(projectRoot) {
  const BUSINESS_CASE_PATTERNS = [
    /business[-_]?case/i,
    /justification/i,
    /roi[-_]?analysis/i
  ];

  const SEARCH_LOCATIONS = [
    'docs',
    'documentation',
    '.claude',
    '.claudecode',
    '.'
  ];

  // Implementation: search for business case documents
  return { found: false, path: null };
}
```

### G4.2 Risk Register

**File:** `portal/server/utils/risk-register.js`

```javascript
/**
 * Risk Register (PRINCE2)
 * Tracks and validates project risks
 */

export const RISK_CATEGORIES = {
  TECHNICAL: 'technical',
  SCHEDULE: 'schedule',
  BUDGET: 'budget',
  RESOURCE: 'resource',
  SECURITY: 'security',
  COMPLIANCE: 'compliance'
};

export const RISK_LEVELS = {
  LOW: { value: 1, label: 'Low', color: 'green' },
  MEDIUM: { value: 2, label: 'Medium', color: 'yellow' },
  HIGH: { value: 3, label: 'High', color: 'orange' },
  CRITICAL: { value: 4, label: 'Critical', color: 'red' }
};

export const RISK_SCHEMA = {
  id: { type: 'string', required: true },
  category: { type: 'enum', values: Object.values(RISK_CATEGORIES), required: true },
  description: { type: 'string', required: true },
  probability: { type: 'number', min: 0, max: 1, required: true },
  impact: { type: 'enum', values: Object.keys(RISK_LEVELS), required: true },
  mitigation: { type: 'string', required: true },
  owner: { type: 'string', required: true },
  status: { type: 'enum', values: ['open', 'mitigated', 'closed', 'accepted'], required: true }
};

export function validateRiskRegister(risks) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(risks) || risks.length === 0) {
    errors.push('Risk register must contain at least one risk');
    return { valid: false, errors, warnings };
  }

  // Validate each risk
  for (const risk of risks) {
    for (const [field, schema] of Object.entries(RISK_SCHEMA)) {
      if (schema.required && !risk[field]) {
        errors.push(`Risk ${risk.id || 'unknown'}: missing ${field}`);
      }
    }
  }

  // Check for high/critical risks without mitigation
  const unmitgatedHighRisks = risks.filter(r =>
    ['HIGH', 'CRITICAL'].includes(r.impact) &&
    r.status === 'open' &&
    !r.mitigation
  );

  if (unmitgatedHighRisks.length > 0) {
    errors.push(`${unmitgatedHighRisks.length} high/critical risks without mitigation`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      total: risks.length,
      byCategory: groupBy(risks, 'category'),
      byStatus: groupBy(risks, 'status'),
      highRiskCount: risks.filter(r => ['HIGH', 'CRITICAL'].includes(r.impact)).length
    }
  };
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}
```

### G4.3 Enhanced PRD Validation

**File:** `portal/server/utils/prd-prince2-enhanced.js`

```javascript
/**
 * Enhanced PRD Validation (PRINCE2 PID Compliant)
 * Extends basic PRD validation with PRINCE2 requirements
 */

import { validateBusinessCase, detectBusinessCase } from './business-case.js';
import { validateRiskRegister } from './risk-register.js';

export const PRINCE2_PID_SECTIONS = {
  required: [
    'project_definition',    // What are we building
    'business_case',         // Why are we building it
    'project_approach',      // How will we build it
    'project_controls',      // How will we manage it
    'risk_register'          // What could go wrong
  ],
  optional: [
    'quality_plan',
    'communication_plan',
    'team_structure',
    'stakeholder_analysis'
  ]
};

export async function validatePRDWithPrince2(projectRoot, projectId) {
  const checks = [];

  // Standard PRD checks
  const prdResult = await detectPRD(projectRoot);
  checks.push({
    name: 'PRD Document',
    status: prdResult.found ? 'pass' : 'fail',
    message: prdResult.found ? `Found: ${prdResult.path}` : 'No PRD found'
  });

  // Business Case check
  const businessCaseResult = await detectBusinessCase(projectRoot);
  checks.push({
    name: 'Business Case (PRINCE2)',
    status: businessCaseResult.found ? 'pass' : 'warn',
    message: businessCaseResult.found
      ? `Found: ${businessCaseResult.path}`
      : 'No business case found (recommended)'
  });

  // Risk Register check
  const riskRegisterResult = await detectRiskRegister(projectRoot);
  checks.push({
    name: 'Risk Register (PRINCE2)',
    status: riskRegisterResult.found ? 'pass' : 'warn',
    message: riskRegisterResult.found
      ? `Found ${riskRegisterResult.riskCount} risks`
      : 'No risk register found (recommended)'
  });

  // Determine overall status
  const hasFailures = checks.some(c => c.status === 'fail');
  const hasWarnings = checks.some(c => c.status === 'warn');

  return {
    status: hasFailures ? 'blocked' : hasWarnings ? 'warn' : 'ready',
    checks,
    prince2Compliant: !hasFailures && !hasWarnings
  };
}
```

### G4 Tests Required

```
portal/server/__tests__/
├── business-case.test.js           # Business case tests
├── risk-register.test.js           # Risk register tests
└── prd-prince2-enhanced.test.js    # Enhanced PRD tests
```

**Estimated Tests:** 40

---

## G5: MANAGER DELEGATION/CONSENSUS

### G5.1 Manager Agent Configuration

**File:** `portal/server/utils/manager-agent.js`

```javascript
/**
 * Manager Agent (CrewAI Hierarchical Pattern)
 * Coordinates agent delegation and consensus
 */

export const MANAGER_AGENT = {
  id: 'manager',
  type: 'orchestrator',
  capabilities: [
    'delegate_tasks',
    'resolve_conflicts',
    'escalate_to_human',
    'reassign_work',
    'approve_completion'
  ],

  // Delegation rules
  delegation: {
    frontend: ['fe-dev-1', 'fe-dev-2'],
    backend: ['be-dev-1', 'be-dev-2'],
    qa: ['qa'],
    devops: ['devops'],

    // Fallback chain
    fallback: {
      'fe-dev-1': 'fe-dev-2',
      'fe-dev-2': 'fe-dev-1',
      'be-dev-1': 'be-dev-2',
      'be-dev-2': 'be-dev-1'
    }
  }
};

export function delegateTask(task, context) {
  const { domain, complexity, currentWorkload } = task;

  // Get eligible agents
  const eligible = MANAGER_AGENT.delegation[domain] ||
                   MANAGER_AGENT.delegation.fullstack;

  // Select least loaded
  const selected = selectLeastLoaded(eligible, currentWorkload);

  return {
    taskId: task.id,
    assignedTo: selected,
    delegatedBy: 'manager',
    delegatedAt: new Date().toISOString(),
    fallback: MANAGER_AGENT.delegation.fallback[selected]
  };
}

export function handleAgentFailure(agentId, taskId, context) {
  const fallback = MANAGER_AGENT.delegation.fallback[agentId];

  if (fallback) {
    return {
      action: 'reassign',
      from: agentId,
      to: fallback,
      taskId,
      reason: 'Agent failure - automatic fallback'
    };
  }

  return {
    action: 'escalate',
    to: 'human',
    taskId,
    reason: `No fallback available for ${agentId}`
  };
}
```

### G5.2 Consensus Mechanism

**File:** `portal/server/utils/consensus-mechanism.js`

```javascript
/**
 * Consensus Mechanism (LangGraph Multi-Actor)
 * For decisions requiring multiple agent agreement
 */

export const CONSENSUS_TYPES = {
  UNANIMOUS: 'unanimous',     // All must agree
  MAJORITY: 'majority',       // >50% must agree
  WEIGHTED: 'weighted',       // Based on agent expertise
  MANAGER_FINAL: 'manager'    // Manager decides if tie
};

export const CONSENSUS_DECISIONS = {
  // QA approval requires consensus
  qa_approval: {
    type: CONSENSUS_TYPES.WEIGHTED,
    voters: ['qa', 'manager'],
    weights: { qa: 2, manager: 1 },
    threshold: 0.6
  },

  // Merge approval
  merge_approval: {
    type: CONSENSUS_TYPES.UNANIMOUS,
    voters: ['qa', 'manager'],
    requiresHuman: true
  },

  // Architecture decisions
  architecture_decision: {
    type: CONSENSUS_TYPES.MANAGER_FINAL,
    voters: ['fe-dev-1', 'be-dev-1', 'manager'],
    managerOverride: true
  }
};

export function requestConsensus(decisionType, proposal, context) {
  const config = CONSENSUS_DECISIONS[decisionType];
  if (!config) {
    throw new Error(`Unknown consensus type: ${decisionType}`);
  }

  return {
    id: `consensus-${Date.now()}`,
    type: decisionType,
    proposal,
    config,
    votes: {},
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}

export function submitVote(consensusId, agentId, vote, rationale) {
  return {
    consensusId,
    agentId,
    vote, // 'approve' | 'reject' | 'abstain'
    rationale,
    votedAt: new Date().toISOString()
  };
}

export function evaluateConsensus(consensus) {
  const { config, votes } = consensus;
  const voterCount = config.voters.length;
  const voteCount = Object.keys(votes).length;

  // Check if all voters have voted
  if (voteCount < voterCount) {
    return { decided: false, reason: 'Awaiting votes' };
  }

  switch (config.type) {
    case CONSENSUS_TYPES.UNANIMOUS:
      const allApprove = Object.values(votes).every(v => v.vote === 'approve');
      return {
        decided: true,
        result: allApprove ? 'approved' : 'rejected',
        reason: allApprove ? 'Unanimous approval' : 'Not unanimous'
      };

    case CONSENSUS_TYPES.MAJORITY:
      const approvals = Object.values(votes).filter(v => v.vote === 'approve').length;
      const majority = approvals > voterCount / 2;
      return {
        decided: true,
        result: majority ? 'approved' : 'rejected',
        reason: `${approvals}/${voterCount} approved`
      };

    case CONSENSUS_TYPES.WEIGHTED:
      let weightedScore = 0;
      let totalWeight = 0;
      for (const [agentId, voteData] of Object.entries(votes)) {
        const weight = config.weights[agentId] || 1;
        totalWeight += weight;
        if (voteData.vote === 'approve') {
          weightedScore += weight;
        }
      }
      const ratio = weightedScore / totalWeight;
      return {
        decided: true,
        result: ratio >= config.threshold ? 'approved' : 'rejected',
        reason: `Weighted score: ${(ratio * 100).toFixed(0)}%`
      };

    case CONSENSUS_TYPES.MANAGER_FINAL:
      // Manager's vote is final if others disagree
      if (votes.manager) {
        return {
          decided: true,
          result: votes.manager.vote === 'approve' ? 'approved' : 'rejected',
          reason: 'Manager final decision'
        };
      }
      return { decided: false, reason: 'Awaiting manager vote' };

    default:
      return { decided: false, reason: 'Unknown consensus type' };
  }
}
```

### G5 Tests Required

```
portal/server/__tests__/
├── manager-agent.test.js         # Manager delegation tests
└── consensus-mechanism.test.js   # Consensus tests
```

**Estimated Tests:** 35

---

## G6: ROLLBACK MECHANISM

### G6.1 State Versioning

**File:** `portal/server/utils/state-versioning.js`

```javascript
/**
 * State Versioning
 * Tracks gate status history for rollback
 */

export function createStateVersion(stepId, status, context) {
  return {
    id: `v-${stepId}-${Date.now()}`,
    stepId,
    status,
    context: {
      ...context,
      versionedAt: new Date().toISOString()
    },
    checksum: generateChecksum({ stepId, status, context })
  };
}

export function getStateHistory(stepId, limit = 10) {
  // Returns last N versions of step state
  return {
    stepId,
    versions: [], // Retrieved from database
    currentVersion: null
  };
}

function generateChecksum(data) {
  // Simple hash for integrity verification
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
```

### G6.2 Rollback Engine

**File:** `portal/server/utils/rollback-engine.js`

```javascript
/**
 * Rollback Engine
 * Handles reverting gate status when failures occur
 */

export const ROLLBACK_TRIGGERS = {
  VALIDATION_FAILURE_AFTER_PASS: 'validation_failure_after_pass',
  DEPENDENT_GATE_FAILED: 'dependent_gate_failed',
  HUMAN_REQUESTED: 'human_requested',
  SECURITY_VIOLATION: 'security_violation',
  BUDGET_EXCEEDED: 'budget_exceeded'
};

export function canRollback(stepId, currentStatus) {
  // Can only rollback from certain states
  const rollbackableStates = ['ready', 'hold', 'pending_human_review'];
  return rollbackableStates.includes(currentStatus);
}

export function createRollbackRequest(stepId, trigger, context) {
  return {
    id: `rb-${stepId}-${Date.now()}`,
    stepId,
    trigger,
    fromStatus: context.currentStatus,
    toStatus: 'idle', // Reset to idle
    requestedBy: context.requestedBy,
    requestedAt: new Date().toISOString(),
    reason: context.reason,
    affectedSteps: getAffectedSteps(stepId)
  };
}

export function executeRollback(rollbackRequest) {
  const { stepId, affectedSteps } = rollbackRequest;

  const results = [];

  // Rollback the requested step
  results.push({
    stepId,
    action: 'rollback',
    newStatus: 'idle',
    success: true
  });

  // Rollback all dependent steps (cascade)
  for (const affectedStep of affectedSteps) {
    results.push({
      stepId: affectedStep,
      action: 'cascade_rollback',
      newStatus: 'blocked',
      success: true,
      reason: `Dependency ${stepId} rolled back`
    });
  }

  return {
    rollbackId: rollbackRequest.id,
    results,
    completedAt: new Date().toISOString()
  };
}

export function getAffectedSteps(stepId) {
  // Get all steps that depend on this step
  const dependencies = {
    'mockup-design': ['project-overview', 'execution-plan', 'system-config', 'infrastructure', 'compliance-safety', 'rlm-protocol', 'notifications', 'build-qa', 'agent-dispatch'],
    'project-overview': ['execution-plan', 'system-config', 'infrastructure', 'compliance-safety', 'rlm-protocol', 'notifications', 'build-qa', 'agent-dispatch'],
    'execution-plan': ['system-config', 'infrastructure', 'compliance-safety', 'rlm-protocol', 'notifications', 'build-qa', 'agent-dispatch'],
    // ... etc
  };

  return dependencies[stepId] || [];
}
```

### G6.3 Rollback Notifications

**File:** `portal/server/utils/rollback-notifications.js`

```javascript
/**
 * Rollback Notifications
 * Alerts stakeholders when rollback occurs
 */

export function createRollbackNotification(rollbackResult, context) {
  return {
    type: 'rollback',
    severity: 'warning',
    title: `Gate Rollback: ${rollbackResult.stepId}`,
    message: `Step "${rollbackResult.stepId}" has been rolled back. ${rollbackResult.results.length} steps affected.`,
    details: {
      trigger: rollbackResult.trigger,
      affectedSteps: rollbackResult.results.map(r => r.stepId),
      requestedBy: context.requestedBy,
      timestamp: rollbackResult.completedAt
    },
    actions: [
      { label: 'View Details', action: 'view_rollback', data: rollbackResult.rollbackId },
      { label: 'Re-validate', action: 'revalidate', data: rollbackResult.stepId }
    ]
  };
}

export function notifyRollback(notification, channels) {
  const notifications = [];

  if (channels.includes('slack')) {
    notifications.push({
      channel: 'slack',
      payload: formatSlackRollbackMessage(notification)
    });
  }

  if (channels.includes('email')) {
    notifications.push({
      channel: 'email',
      payload: formatEmailRollbackMessage(notification)
    });
  }

  if (channels.includes('dashboard')) {
    notifications.push({
      channel: 'dashboard',
      payload: notification
    });
  }

  return notifications;
}

function formatSlackRollbackMessage(notification) {
  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `⚠️ ${notification.title}` }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: notification.message }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Trigger:* ${notification.details.trigger}` },
          { type: 'mrkdwn', text: `*Affected:* ${notification.details.affectedSteps.length} steps` }
        ]
      }
    ]
  };
}
```

### G6 Tests Required

```
portal/server/__tests__/
├── state-versioning.test.js       # Versioning tests
├── rollback-engine.test.js        # Rollback tests
└── rollback-notifications.test.js # Notification tests
```

**Estimated Tests:** 40

---

## UPDATED 10-STEP LAUNCH SEQUENCE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              WAVE AGENT LAUNCH SEQUENCE v2.0 (GROK VALIDATED)               │
│                    Sequential Gates - Stage-Gate Compliant                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────┐  STEP 0: MOCKUP DESIGN                                             │
│  │  0  │  ├── HTML mockups validated                                        │
│  └──┬──┘  ├── [NEW] User testing (optional)                                 │
│     │     └── Human locks mockups                    [HUMAN REVIEW]         │
│     ▼         → Decision: GO / HOLD / KILL                                  │
│                                                                              │
│  ┌─────┐  STEP 1: PRD & STORIES                                             │
│  │  1  │  ├── PRD detected and parsed                                       │
│  └──┬──┘  ├── Stories validated against schema                              │
│     │     ├── [NEW] Business Case checked (PRINCE2)                         │
│     │     ├── [NEW] Risk Register checked (PRINCE2)                         │
│     │     └── Mockup-story alignment verified                               │
│     ▼         → Decision: GO / HOLD / KILL                                  │
│                                                                              │
│  ┌─────┐  STEP 2: WAVE EXECUTION PLAN                                       │
│  │  2  │  ├── Stories assigned to agents                                    │
│  └──┬──┘  ├── Dependencies resolved (topological sort)                      │
│     │     ├── Wave batches created                                          │
│     │     ├── [NEW] Manager delegation configured                           │
│     │     └── Tech lead approves plan              [HUMAN REVIEW]           │
│     ▼         → Decision: GO / HOLD / KILL / RECYCLE                        │
│                                                                              │
│  ┌─────┐  STEP 3: CONFIGURATION                                             │
│  │  3  │  ├── API keys verified                                             │
│  └──┬──┘  ├── Database connections tested                                   │
│     │     └── All required values present                                   │
│     ▼         → Decision: GO / HOLD                                         │
│                                                                              │
│  ┌─────┐  STEP 4: INFRASTRUCTURE                                            │
│  │  4  │  ├── Docker validated                                              │
│  └──┬──┘  ├── Git worktrees ready                                           │
│     │     └── External services responding                                  │
│     ▼         → Decision: GO / HOLD                                         │
│                                                                              │
│  ┌─────┐  STEP 5: SAFETY PROTOCOL                                           │
│  │  5  │  ├── 108 forbidden operations blocked                              │
│  └──┬──┘  ├── Safety scripts verified                                       │
│     │     ├── Guardrails active                                             │
│     │     └── [NEW] Independent safety review      [HUMAN REVIEW]           │
│     ▼         → Decision: GO / KILL (no HOLD for safety)                    │
│                                                                              │
│  ┌─────┐  STEP 6: RLM PROTOCOL                                              │
│  │  6  │  ├── P Variable loaded                                             │
│  └──┬──┘  ├── Agent memory accessible                                       │
│     │     └── Gate 0 certified                                              │
│     ▼         → Decision: GO / HOLD                                         │
│                                                                              │
│  ┌─────┐  STEP 7: NOTIFICATIONS                                             │
│  │  7  │  ├── Slack webhook tested                                          │
│  └──┬──┘  ├── [NEW] Rollback notifications configured                       │
│     │     └── Alert channels verified                                       │
│     ▼         → Decision: GO / HOLD                                         │
│                                                                              │
│  ┌─────┐  STEP 8: BUILD QA                                                  │
│  │  8  │  ├── Docker build passes                                           │
│  └──┬──┘  ├── TypeScript compiles                                           │
│     │     ├── Tests pass                                                    │
│     │     └── [NEW] Consensus: QA + Manager approve                         │
│     ▼         → Decision: GO / HOLD / RECYCLE                               │
│                                                                              │
│  ┌─────┐  STEP 9: LAUNCH                                                    │
│  │  9  │  ├── All 9 previous gates GREEN                                    │
│  └─────┘  ├── [NEW] Pre-flight checklist complete                           │
│           ├── [NEW] Rollback mechanism ready                                │
│           └── CTO authorizes launch                [HUMAN REVIEW]           │
│               → Decision: GO / KILL (no HOLD at launch)                     │
│                                                                              │
│                    🚀 ALL GREEN = LAUNCH AUTHORIZED                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION CHECKLIST

### G1: Stage-Gate Kill/Hold States
- [ ] G1.1: Create gate-status-types.js
- [ ] G1.2: Create kill-criteria.js
- [ ] G1.3: Create hold-criteria.js
- [ ] G1.4: Create gate-decision-engine.js
- [ ] G1.5: Write tests (45 tests)
- [ ] G1.6: Update UI to show new states

### G2: Independent/Human Review Gates
- [ ] G2.1: Create human-review-config.js
- [ ] G2.2: Create human-review-request.js
- [ ] G2.3: Create independent-verification.js
- [ ] G2.4: Write tests (35 tests)
- [ ] G2.5: Add human review UI component

### G3: User Testing Validation
- [ ] G3.1: Create user-testing-validation.js
- [ ] G3.2: Create user-testing-gate.js
- [ ] G3.3: Write tests (30 tests)
- [ ] G3.4: Add user testing UI (optional step)

### G4: PRINCE2 PID Artifacts
- [ ] G4.1: Create business-case.js
- [ ] G4.2: Create risk-register.js
- [ ] G4.3: Create prd-prince2-enhanced.js
- [ ] G4.4: Write tests (40 tests)
- [ ] G4.5: Update PRD validation UI

### G5: Manager Delegation/Consensus
- [ ] G5.1: Create manager-agent.js
- [ ] G5.2: Create consensus-mechanism.js
- [ ] G5.3: Write tests (35 tests)
- [ ] G5.4: Integrate with wave batching

### G6: Rollback Mechanism
- [ ] G6.1: Create state-versioning.js
- [ ] G6.2: Create rollback-engine.js
- [ ] G6.3: Create rollback-notifications.js
- [ ] G6.4: Write tests (40 tests)
- [ ] G6.5: Add rollback UI controls

### Phase 5-6: Original Plan (After Grok)
- [ ] Phase 5: Enhanced Validations
- [ ] Phase 6: Progress Visualization

---

## TEST SUMMARY

| Component | Estimated Tests |
|-----------|-----------------|
| G1: Stage-Gate States | 45 |
| G2: Human Review | 35 |
| G3: User Testing | 30 |
| G4: PRINCE2 PID | 40 |
| G5: Manager/Consensus | 35 |
| G6: Rollback | 40 |
| **Grok Recommendations Total** | **225** |
| Previous Phases 1-4 | 554 |
| **Grand Total** | **779** |

---

## REFERENCES (From Grok)

- **NASA Checklists**: https://ntrs.nasa.gov/api/citations/19910017830/downloads/19910017830.pdf
- **Stage-Gate (Cooper)**: https://www.stage-gate.com/blog/the-stage-gate-model-an-overview
- **GV Design Sprint**: https://www.gv.com/sprint
- **PRINCE2 PID**: https://prince2.wiki/management-products/baselines/project-initiation-documentation
- **Terraform Conditions**: https://developer.hashicorp.com/terraform/tutorials/configuration-language/custom-conditions
- **CrewAI/LangGraph**: https://docs.crewai.com/en/concepts/agents
- **AI Agent Safety**: OWASP AI Agent Top 10 (2026)

---

*Plan v2.0 - Grok Validated - 2026-01-24*
