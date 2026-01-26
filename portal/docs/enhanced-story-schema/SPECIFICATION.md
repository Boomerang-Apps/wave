# Enhanced Story Schema - Technical Specification

**Version:** 1.0.0
**Date:** 2026-01-26
**Status:** SPECIFICATION COMPLETE
**Author:** WAVE Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Design Goals](#design-goals)
3. [Schema Definition](#schema-definition)
4. [Enums and Constants](#enums-and-constants)
5. [Validation Functions](#validation-functions)
6. [Detail Scoring](#detail-scoring)
7. [Examples](#examples)
8. [API Reference](#api-reference)
9. [Migration Guide](#migration-guide)

---

## Overview

The Enhanced Story Schema extends the base `story-schema.js` to support **agent-executable stories** with:

- **Given/When/Then (GWT)** format for clear behavior specification
- **Domain categorization** for routing to appropriate agents
- **User Story structure** (As a... I want... So that...)
- **Technical notes** for implementation guidance
- **Mockup references** for UI alignment
- **Detail scoring** for executability assessment

### File Location

```
server/utils/enhanced-story-schema.js
server/__tests__/enhanced-story-schema.test.js
```

### Relationship to Base Schema

```
┌─────────────────────────────────────┐
│     story-schema.js (BASE)          │
│  - Basic validation                 │
│  - Required: id, title, description │
│  - Optional: status, priority, etc. │
└──────────────┬──────────────────────┘
               │ extends
               ▼
┌─────────────────────────────────────┐
│  enhanced-story-schema.js (NEW)     │
│  - All base fields PLUS:            │
│  - epic, domain (required)          │
│  - userStory { asA, iWant, soThat } │
│  - gwt { given, when, then }        │
│  - acceptanceCriteria (min 3)       │
│  - technicalNotes                   │
│  - mockupRefs                       │
│  - safety                           │
│  - Detail scoring functions         │
└─────────────────────────────────────┘
```

---

## Design Goals

### 1. Agent Executability
Stories must be detailed enough that an AI agent can implement without clarification.

### 2. Strict Enforcement
Missing critical fields (GWT, acceptance criteria) blocks progression.

### 3. Backward Compatibility
Stories valid under base schema remain valid; enhanced validation is additive.

### 4. Measurable Quality
Detail scoring provides objective assessment of story completeness.

---

## Schema Definition

### Complete Enhanced Schema

```javascript
export const ENHANCED_STORY_SCHEMA = {
  // ═══════════════════════════════════════════════════════════════
  // IDENTIFICATION (Required)
  // ═══════════════════════════════════════════════════════════════
  id: {
    type: 'string',
    required: true,
    pattern: /^[A-Z]+-\d+-[A-Z]+-\d+$/,  // PROJECT-WAVE-DOMAIN-NUM
    minLength: 8,
    maxLength: 50,
    description: 'Unique story identifier: PROJECT-WAVE-DOMAIN-NUMBER'
  },

  title: {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 100,
    description: 'Concise story title describing the feature'
  },

  epic: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 100,
    description: 'Parent epic name (e.g., "User Authentication")'
  },

  domain: {
    type: 'string',
    required: true,
    enum: 'VALID_DOMAINS',
    description: 'Functional domain for agent routing'
  },

  priority: {
    type: 'string',
    required: true,
    enum: 'VALID_PRIORITIES',
    description: 'Story priority level'
  },

  // ═══════════════════════════════════════════════════════════════
  // USER STORY FORMAT (Required)
  // ═══════════════════════════════════════════════════════════════
  userStory: {
    type: 'object',
    required: true,
    properties: {
      asA: {
        type: 'string',
        required: true,
        minLength: 3,
        description: 'User role (e.g., "registered user")'
      },
      iWant: {
        type: 'string',
        required: true,
        minLength: 10,
        description: 'Desired action (e.g., "to log in with my email")'
      },
      soThat: {
        type: 'string',
        required: true,
        minLength: 10,
        description: 'Benefit (e.g., "I can access my account")'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // GIVEN/WHEN/THEN (Required - Critical for Agent Execution)
  // ═══════════════════════════════════════════════════════════════
  gwt: {
    type: 'object',
    required: true,
    properties: {
      given: {
        type: 'string',
        required: true,
        minLength: 20,
        description: 'Initial context/preconditions'
      },
      when: {
        type: 'string',
        required: true,
        minLength: 20,
        description: 'Action/trigger'
      },
      then: {
        type: 'string',
        required: true,
        minLength: 20,
        description: 'Expected outcome'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ACCEPTANCE CRITERIA (Required - Minimum 3)
  // ═══════════════════════════════════════════════════════════════
  acceptanceCriteria: {
    type: 'array',
    required: true,
    minItems: 3,
    items: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          required: true,
          pattern: /^AC-\d+$/,
          description: 'Acceptance criteria ID (e.g., AC-001)'
        },
        description: {
          type: 'string',
          required: true,
          minLength: 10,
          description: 'Clear, testable criterion'
        },
        testable: {
          type: 'boolean',
          required: true,
          description: 'Whether this can be objectively verified'
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // MOCKUP REFERENCES (Required for UI domains)
  // ═══════════════════════════════════════════════════════════════
  mockupRefs: {
    type: 'array',
    required: false,  // Required only if domain is UI-related
    conditionalRequired: {
      field: 'domain',
      values: ['ui-components', 'forms', 'navigation']
    },
    items: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          required: true,
          description: 'Mockup filename (e.g., "01-login.html")'
        },
        elements: {
          type: 'array',
          required: false,
          items: { type: 'string' },
          description: 'DOM elements referenced (e.g., ["#email-input"])'
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // TECHNICAL NOTES (Required)
  // ═══════════════════════════════════════════════════════════════
  technicalNotes: {
    type: 'object',
    required: true,
    properties: {
      suggestedApproach: {
        type: 'string',
        required: false,
        description: 'Recommended implementation approach'
      },
      filesLikelyModified: {
        type: 'array',
        required: false,
        items: { type: 'string' },
        description: 'Files that will likely be changed'
      },
      apiEndpoints: {
        type: 'array',
        required: false,
        items: { type: 'string' },
        description: 'API endpoints involved'
      },
      databaseTables: {
        type: 'array',
        required: false,
        items: { type: 'string' },
        description: 'Database tables affected'
      },
      externalServices: {
        type: 'array',
        required: false,
        items: { type: 'string' },
        description: 'External services/APIs used'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // SAFETY & RISK (Optional but tracked)
  // ═══════════════════════════════════════════════════════════════
  safety: {
    type: 'object',
    required: false,
    properties: {
      riskLevel: {
        type: 'string',
        enum: 'VALID_RISK_LEVELS',
        description: 'Risk assessment'
      },
      requiresApproval: {
        type: 'boolean',
        description: 'Whether human approval needed before execution'
      },
      approver: {
        type: 'string',
        description: 'Who must approve (e.g., "security-lead")'
      },
      safetyTags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Safety-related tags (e.g., ["auth", "pii"])'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DEPENDENCIES (Required)
  // ═══════════════════════════════════════════════════════════════
  dependencies: {
    type: 'array',
    required: true,
    items: { type: 'string' },
    description: 'Story IDs this depends on (empty array if none)'
  },

  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  status: {
    type: 'string',
    required: true,
    enum: 'VALID_STATUSES',
    default: 'draft'
  },

  assignedAgent: {
    type: 'string',
    required: false,
    enum: 'VALID_AGENTS',
    description: 'Agent type assigned to implement'
  },

  estimatedTokens: {
    type: 'number',
    required: false,
    min: 0,
    description: 'Estimated tokens for implementation'
  },

  estimatedHours: {
    type: 'number',
    required: false,
    min: 0,
    description: 'Estimated human-equivalent hours'
  },

  wave: {
    type: 'number',
    required: false,
    min: 1,
    description: 'Wave number for execution ordering'
  },

  createdAt: {
    type: 'string',
    required: false,
    format: 'date-time'
  },

  updatedAt: {
    type: 'string',
    required: false,
    format: 'date-time'
  }
};
```

---

## Enums and Constants

### VALID_DOMAINS

```javascript
export const VALID_DOMAINS = [
  'authentication',     // Login, logout, session management
  'authorization',      // Permissions, roles, access control
  'database',          // Schema, migrations, queries
  'api',               // REST/GraphQL endpoints
  'ui-components',     // Reusable UI components
  'forms',             // Form handling, validation
  'navigation',        // Routing, menus, breadcrumbs
  'state-management',  // Redux, Context, stores
  'integrations',      // Third-party service integration
  'payments',          // Payment processing
  'notifications',     // Email, push, in-app notifications
  'search',            // Search functionality
  'media',             // Images, videos, file uploads
  'analytics',         // Tracking, reporting
  'admin',             // Admin panel features
  'settings',          // User/app settings
  'infrastructure'     // DevOps, deployment, config
];
```

### VALID_PRIORITIES

```javascript
export const VALID_PRIORITIES = [
  'critical',  // Blocking other work, must be done first
  'high',      // Important, should be done soon
  'medium',    // Standard priority
  'low'        // Nice to have, can be deferred
];
```

### VALID_RISK_LEVELS

```javascript
export const VALID_RISK_LEVELS = [
  'critical',  // Could cause data loss, security breach, or system failure
  'high',      // Significant impact if something goes wrong
  'medium',    // Moderate impact, recoverable
  'low'        // Minimal impact
];
```

### VALID_STATUSES

```javascript
export const VALID_STATUSES = [
  'draft',        // Being written, not ready for implementation
  'ready',        // Approved and ready for agent execution
  'in-progress',  // Currently being implemented
  'completed',    // Implementation finished
  'blocked'       // Cannot proceed due to dependency or issue
];
```

### VALID_AGENTS

```javascript
export const VALID_AGENTS = [
  'fe-dev',      // Frontend developer agent
  'be-dev',      // Backend developer agent
  'qa',          // QA/testing agent
  'devops',      // DevOps/infrastructure agent
  'fullstack',   // Full-stack developer agent
  'unassigned'   // Not yet assigned
];
```

### UI_DOMAINS (For mockup requirement check)

```javascript
export const UI_DOMAINS = [
  'ui-components',
  'forms',
  'navigation'
];
```

---

## Validation Functions

### validateEnhancedStory(story)

**Purpose:** Validate a story against the enhanced schema.

**Signature:**
```javascript
export function validateEnhancedStory(story: object): EnhancedValidationResult
```

**Returns:**
```typescript
interface EnhancedValidationResult {
  valid: boolean;
  storyId: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  detailScore: number;  // 0-100
}

interface ValidationError {
  field: string;
  error: string;
  code: string;  // e.g., 'MISSING_REQUIRED', 'INVALID_TYPE', 'MIN_LENGTH'
}

interface ValidationWarning {
  field: string;
  warning: string;
  suggestion: string;
}
```

**Validation Rules:**

| Field | Rule | Error Code |
|-------|------|------------|
| id | Required, pattern match | INVALID_ID_FORMAT |
| title | Required, 10-100 chars | TITLE_TOO_SHORT |
| epic | Required, min 3 chars | MISSING_EPIC |
| domain | Required, must be in VALID_DOMAINS | INVALID_DOMAIN |
| userStory | Required, all 3 fields | INCOMPLETE_USER_STORY |
| gwt | Required, each field min 20 chars | GWT_TOO_SHORT |
| acceptanceCriteria | Required, min 3 items | INSUFFICIENT_AC |
| technicalNotes | Required (can be empty object) | MISSING_TECH_NOTES |
| dependencies | Required (can be empty array) | MISSING_DEPENDENCIES |
| mockupRefs | Required if domain is UI-related | MISSING_MOCKUP_REFS |

### validateEnhancedStoryField(fieldName, value, schema)

**Purpose:** Validate a single field against its schema definition.

**Signature:**
```javascript
export function validateEnhancedStoryField(
  fieldName: string,
  value: any,
  schema: FieldSchema
): FieldValidationResult
```

### validateGWT(gwt)

**Purpose:** Specifically validate the Given/When/Then structure.

**Signature:**
```javascript
export function validateGWT(gwt: object): GWTValidationResult
```

**Rules:**
- `given` must be at least 20 characters
- `when` must be at least 20 characters
- `then` must be at least 20 characters
- All three fields are required

### validateAcceptanceCriteria(criteria)

**Purpose:** Validate acceptance criteria array.

**Signature:**
```javascript
export function validateAcceptanceCriteria(
  criteria: AcceptanceCriterion[]
): ACValidationResult
```

**Rules:**
- Minimum 3 criteria required
- Each must have id, description, testable fields
- id must match pattern `AC-\d+`
- description minimum 10 characters

---

## Detail Scoring

### scoreStoryDetail(story)

**Purpose:** Calculate a 0-100 score for story executability.

**Signature:**
```javascript
export function scoreStoryDetail(story: object): number
```

**Scoring Breakdown (100 points total):**

| Category | Points | Criteria |
|----------|--------|----------|
| **Identification** | 20 | id (5), title (5), epic (5), domain (5) |
| **User Story** | 10 | All 3 fields present and valid |
| **GWT** | 20 | given (7), when (6), then (7) - each min 20 chars |
| **Acceptance Criteria** | 25 | 3+ criteria (15), all testable (10) |
| **Technical Notes** | 15 | approach (5), files (5), apis/db (5) |
| **Mockup Refs** | 5 | Present for UI domains |
| **Metadata** | 5 | dependencies (2), status (1), estimates (2) |

**Thresholds:**
```javascript
export const DETAIL_SCORE_THRESHOLDS = {
  excellent: 95,    // Green - Agent can execute immediately
  good: 85,         // Green - Minor clarifications possible
  acceptable: 70,   // Yellow - Needs some improvement
  minimum: 60,      // Orange - Below this is blocked
  failing: 0        // Red - Story incomplete
};
```

### getDetailScoreBreakdown(story)

**Purpose:** Return detailed breakdown of scoring.

**Signature:**
```javascript
export function getDetailScoreBreakdown(story: object): ScoreBreakdown
```

**Returns:**
```typescript
interface ScoreBreakdown {
  total: number;
  identification: { score: number; max: 20; details: string[] };
  userStory: { score: number; max: 10; details: string[] };
  gwt: { score: number; max: 20; details: string[] };
  acceptanceCriteria: { score: number; max: 25; details: string[] };
  technicalNotes: { score: number; max: 15; details: string[] };
  mockupRefs: { score: number; max: 5; details: string[] };
  metadata: { score: number; max: 5; details: string[] };
}
```

---

## Examples

### Valid Enhanced Story

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
    "given": "I am on the login page and have a registered account with email 'user@example.com' and a valid password",
    "when": "I enter my email in the email field, my password in the password field, and click the 'Sign In' button",
    "then": "I am authenticated successfully, my session is created, and I am redirected to my dashboard with a welcome message"
  },
  "acceptanceCriteria": [
    { "id": "AC-001", "description": "Login form displays email and password input fields with proper labels", "testable": true },
    { "id": "AC-002", "description": "Form validates email format before allowing submission", "testable": true },
    { "id": "AC-003", "description": "Error message displayed for invalid credentials within 3 seconds", "testable": true },
    { "id": "AC-004", "description": "Successful login creates session token stored in httpOnly cookie", "testable": true },
    { "id": "AC-005", "description": "User redirected to /dashboard after successful login", "testable": true }
  ],
  "mockupRefs": [
    { "file": "01-login.html", "elements": ["#email-input", "#password-input", "#login-btn", "#error-message"] }
  ],
  "technicalNotes": {
    "suggestedApproach": "Use NextAuth.js with Credentials provider and Supabase adapter for session management",
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

**Expected Detail Score: 100/100**

### Minimal Valid Story (Score ~70)

```json
{
  "id": "WAVE-001-API-002",
  "title": "Create User Profile API Endpoint",
  "epic": "User Management",
  "domain": "api",
  "priority": "medium",
  "userStory": {
    "asA": "frontend application",
    "iWant": "to fetch user profile data via API",
    "soThat": "I can display user information"
  },
  "gwt": {
    "given": "A user is authenticated with a valid session token",
    "when": "A GET request is made to /api/users/profile with the auth token",
    "then": "The API returns the user's profile data as JSON with 200 status"
  },
  "acceptanceCriteria": [
    { "id": "AC-001", "description": "Endpoint returns 401 for unauthenticated requests", "testable": true },
    { "id": "AC-002", "description": "Endpoint returns user profile JSON for valid requests", "testable": true },
    { "id": "AC-003", "description": "Response includes id, email, name, createdAt fields", "testable": true }
  ],
  "technicalNotes": {},
  "dependencies": ["WAVE-001-AUTH-001"],
  "status": "draft"
}
```

**Expected Detail Score: ~70/100** (missing mockupRefs acceptable for API, minimal technicalNotes)

### Invalid Story (Would Fail Validation)

```json
{
  "id": "001",
  "title": "Login",
  "description": "User can login"
}
```

**Errors:**
- `INVALID_ID_FORMAT`: id must match pattern PROJECT-WAVE-DOMAIN-NUM
- `TITLE_TOO_SHORT`: title must be at least 10 characters
- `MISSING_EPIC`: epic is required
- `INVALID_DOMAIN`: domain is required and must be valid
- `MISSING_PRIORITY`: priority is required
- `INCOMPLETE_USER_STORY`: userStory object is required
- `MISSING_GWT`: gwt object is required
- `INSUFFICIENT_AC`: minimum 3 acceptance criteria required
- `MISSING_TECH_NOTES`: technicalNotes object is required
- `MISSING_DEPENDENCIES`: dependencies array is required

---

## API Reference

### Exports

```javascript
// Schema
export const ENHANCED_STORY_SCHEMA;

// Enums
export const VALID_DOMAINS;
export const VALID_PRIORITIES;
export const VALID_RISK_LEVELS;
export const VALID_STATUSES;
export const VALID_AGENTS;
export const UI_DOMAINS;

// Thresholds
export const DETAIL_SCORE_THRESHOLDS;

// Validation Functions
export function validateEnhancedStory(story);
export function validateEnhancedStoryField(fieldName, value, schema);
export function validateGWT(gwt);
export function validateAcceptanceCriteria(criteria);

// Scoring Functions
export function scoreStoryDetail(story);
export function getDetailScoreBreakdown(story);

// Utility Functions
export function isUIRelatedDomain(domain);
export function getRequiredFieldsForDomain(domain);

// Default export
export default validateEnhancedStory;
```

---

## Migration Guide

### From Base Schema to Enhanced Schema

Stories using the base schema can be migrated by adding required fields:

```javascript
function migrateToEnhancedSchema(baseStory) {
  return {
    ...baseStory,
    // Add required fields with defaults/placeholders
    epic: baseStory.epicId || 'Unassigned Epic',
    domain: inferDomainFromTitle(baseStory.title) || 'api',
    userStory: {
      asA: 'user',
      iWant: baseStory.description,
      soThat: 'I can achieve my goal'
    },
    gwt: {
      given: `Context for: ${baseStory.title}`,
      when: `User performs: ${baseStory.title}`,
      then: `Expected result: ${baseStory.title} works`
    },
    acceptanceCriteria: baseStory.acceptanceCriteria?.map((ac, i) => ({
      id: `AC-${String(i + 1).padStart(3, '0')}`,
      description: ac,
      testable: true
    })) || [
      { id: 'AC-001', description: 'Feature works as expected', testable: true },
      { id: 'AC-002', description: 'No errors thrown', testable: true },
      { id: 'AC-003', description: 'UI updates correctly', testable: true }
    ],
    technicalNotes: {},
    dependencies: baseStory.dependencies || []
  };
}
```

---

## Specification Complete

This document serves as the source of truth for:
1. TDD test cases (Step 3)
2. Implementation (Step 4)
3. API documentation

---

*Specification Version: 1.0.0 | Date: 2026-01-26*
