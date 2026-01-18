# AI Stories Methodology for WAVE Framework

**Version:** 1.0.0
**Based on:** MAF AI Stories Implementation Plan
**Framework:** WAVE (Workflow Automation for Verified Execution)

---

## Overview

AI Stories are structured JSON specifications that define work for WAVE agents. They provide unambiguous, measurable requirements that agents can execute autonomously.

---

## Schema V4 Specification

### Required Fields

```json
{
  "id": "WAVE1-FE-001",
  "title": "Create PhotoGallery component with grid layout",
  "domain": "frontend",
  "objective": {
    "as_a": "user",
    "i_want": "to view photos in a grid layout",
    "so_that": "I can browse my photo collection easily"
  },
  "acceptance_criteria": [...],
  "files": {
    "create": [...],
    "modify": [...],
    "forbidden": [...]
  },
  "safety": {
    "stop_conditions": [...]
  }
}
```

---

## Field Definitions

### 1. ID Format

Support two patterns:

| Pattern | Example | Use Case |
|---------|---------|----------|
| Domain format | `AUTH-FE-001` | Domain-specific work |
| Wave format | `WAVE1-FE-001` | Wave-parallel work |

```json
"id": {
  "type": "string",
  "oneOf": [
    { "pattern": "^[A-Z]+-[A-Z]+-[0-9]{3}$" },
    { "pattern": "^WAVE[0-9]+-[A-Z]+-[0-9]+$" }
  ]
}
```

---

### 2. Title with Action Verb

Titles MUST start with one of these 16 action verbs:

| Verb | Use Case |
|------|----------|
| **Create** | New component/file |
| **Add** | New feature to existing |
| **Update** | Modify existing |
| **Fix** | Bug fix |
| **Remove** | Delete functionality |
| **Implement** | Complex feature |
| **Configure** | Setup/config |
| **Enable** | Turn on feature |
| **Disable** | Turn off feature |
| **Refactor** | Code improvement |
| **Migrate** | Move/upgrade |
| **Build** | Construct system |
| **Setup** | Initial configuration |
| **Initialize** | First-time setup |
| **Delete** | Remove entirely |
| **Modify** | Change behavior |

```json
"title": {
  "type": "string",
  "minLength": 10,
  "maxLength": 100,
  "pattern": "^(Create|Add|Update|Fix|Remove|Implement|Configure|Enable|Disable|Refactor|Migrate|Build|Setup|Initialize|Delete|Modify)"
}
```

---

### 3. Domain

Business domains for story ownership:

```json
"domain": {
  "type": "string",
  "enum": [
    "auth",
    "client",
    "pilot",
    "project",
    "proposal",
    "messaging",
    "payment",
    "deliverables",
    "admin",
    "layout",
    "general",
    "public"
  ]
}
```

Optional technical domain for agent routing:

```json
"technical_domain": {
  "type": "string",
  "enum": ["frontend", "backend", "database", "infrastructure", "testing", "documentation"]
}
```

---

### 4. Agent Assignment

Agent ID pattern: `domain-type-role`

```json
"agent": {
  "type": "string",
  "pattern": "^[a-z]+-[a-z]+-[a-z]+$",
  "examples": ["auth-fe-dev", "payment-be-dev", "client-qa"]
}
```

**WAVE Agent Mapping:**
| Agent | Assigned Stories |
|-------|------------------|
| `fe-dev-1` | Wave 1 frontend stories |
| `fe-dev-2` | Wave 2 frontend stories |
| `be-dev-1` | Wave 1 backend stories |
| `be-dev-2` | Wave 2 backend stories |
| `qa` | Validation stories |
| `dev-fix` | Fix stories (retry loop) |

---

### 5. Priority & Complexity

```json
"priority": {
  "type": "string",
  "enum": ["P0-Critical", "P1-High", "P2-Medium", "P3-Low"],
  "default": "P2-Medium"
},
"complexity": {
  "type": "string",
  "enum": ["S", "M", "L", "XL"],
  "description": "S(1-2h), M(2-4h), L(4-8h), XL(8+h)"
},
"estimate_hours": {
  "type": "number",
  "minimum": 0.5,
  "maximum": 40
}
```

---

### 6. Objective (User Story Format)

```json
"objective": {
  "type": "object",
  "required": ["as_a", "i_want", "so_that"],
  "properties": {
    "as_a": {
      "type": "string",
      "minLength": 5,
      "description": "User persona"
    },
    "i_want": {
      "type": "string",
      "minLength": 10,
      "description": "Desired capability"
    },
    "so_that": {
      "type": "string",
      "minLength": 10,
      "description": "Business benefit"
    }
  }
}
```

---

### 7. Scope Definition

```json
"scope": {
  "type": "object",
  "properties": {
    "in_scope": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Explicitly included items"
    },
    "out_of_scope": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Explicitly excluded items"
    },
    "definitions": {
      "type": "object",
      "additionalProperties": { "type": "string" },
      "description": "Term glossary"
    }
  }
}
```

---

### 8. Acceptance Criteria (EARS + Traceability)

Minimum 3 acceptance criteria per story.

```json
"acceptance_criteria": {
  "type": "array",
  "minItems": 3,
  "items": {
    "type": "object",
    "required": ["id", "description"],
    "properties": {
      "id": { "pattern": "^AC-[0-9]+$" },
      "title": { "type": "string" },
      "ears_pattern": {
        "enum": ["ubiquitous", "event-driven", "state-driven", "unwanted", "complex"]
      },
      "given": { "type": "string" },
      "when": { "type": "string" },
      "then": { "type": "string" },
      "threshold": { "type": "string", "description": "Measurable value (ms, %, count)" },
      "description": { "type": "string" },
      "implementation_file": { "type": "string" },
      "implementation_function": { "type": "string" },
      "test_file": { "type": "string" },
      "test_function": { "type": "string" },
      "verified": { "type": "boolean", "default": false },
      "coverage": { "type": "number", "minimum": 0, "maximum": 100 }
    }
  }
}
```

---

### 9. Files (with Required Forbidden)

```json
"files": {
  "type": "object",
  "required": ["create", "forbidden"],
  "properties": {
    "create": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Files to create"
    },
    "modify": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Files to modify"
    },
    "forbidden": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string" },
      "description": "Files agent must NOT touch"
    }
  }
}
```

**Default Forbidden Patterns:**
- `.env*` - Environment files
- `*.key`, `*.pem` - Credentials
- `supabase/migrations/*` - Unless DB story
- `src/lib/core/**` - Core utilities
- Other domain paths

---

### 10. API Contract

```json
"api_contract": {
  "type": "object",
  "properties": {
    "endpoint": {
      "type": "string",
      "pattern": "^(GET|POST|PUT|PATCH|DELETE) /",
      "description": "HTTP method and path"
    },
    "request": {
      "type": "object",
      "properties": {
        "type_name": { "type": "string" },
        "fields": { "type": "object" }
      }
    },
    "response": {
      "type": "object",
      "properties": {
        "success_type": { "type": "string" },
        "error_codes": { "type": "array" }
      }
    }
  }
}
```

---

### 11. Tests

```json
"tests": {
  "type": "object",
  "required": ["commands"],
  "properties": {
    "commands": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string" },
      "description": "Test execution commands"
    },
    "coverage_threshold": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "default": 80
    },
    "unit_tests": { "type": "array" },
    "integration_tests": { "type": "array" }
  }
}
```

---

### 12. Dependencies

```json
"dependencies": {
  "type": "object",
  "properties": {
    "stories": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Story IDs that must complete first"
    },
    "contracts": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Contract names required"
    },
    "infrastructure": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Infrastructure requirements"
    }
  }
}
```

---

### 13. Safety (Required)

```json
"safety": {
  "type": "object",
  "required": ["stop_conditions"],
  "properties": {
    "max_iterations": {
      "type": "integer",
      "minimum": 5,
      "maximum": 50,
      "default": 25
    },
    "token_budget": {
      "type": "integer",
      "minimum": 10000,
      "maximum": 500000,
      "default": 200000
    },
    "timeout_minutes": {
      "type": "integer",
      "minimum": 10,
      "maximum": 480,
      "default": 120
    },
    "stop_conditions": {
      "type": "array",
      "minItems": 3,
      "items": { "type": "string" }
    },
    "escalation_triggers": {
      "type": "array",
      "items": { "type": "string" }
    },
    "dal_level": {
      "type": "string",
      "enum": ["A", "B", "C", "D", "E"],
      "description": "Design Assurance Level (DO-178C)"
    },
    "requires_human_approval": {
      "type": "boolean",
      "default": false
    }
  }
}
```

---

### 14. Additional Fields

```json
"implementation_hints": {
  "type": "array",
  "items": { "type": "string" },
  "description": "Guidance for implementing agent"
},

"rollback_plan": {
  "type": "object",
  "properties": {
    "git_strategy": { "type": "string" },
    "database_rollback": { "type": "string" },
    "recovery_steps": { "type": "array" }
  }
},

"definition_of_done": {
  "type": "array",
  "items": { "type": "string" },
  "description": "Checklist for completion"
},

"traceability": {
  "type": "object",
  "properties": {
    "requirement_source": { "type": "string" },
    "parent_requirement": { "type": "string" },
    "verification_method": {
      "enum": ["test", "inspection", "analysis", "demonstration"]
    },
    "verification_status": {
      "enum": ["not_started", "in_progress", "passed", "failed"]
    }
  }
},

"status": {
  "type": "string",
  "enum": ["backlog", "ready", "in_progress", "review", "done", "blocked"]
},

"gate": {
  "type": "integer",
  "minimum": 0,
  "maximum": 7
}
```

---

## EARS Patterns Reference

| Pattern | Template | When to Use |
|---------|----------|-------------|
| **Ubiquitous** | The system SHALL [behavior] | Always true |
| **Event-Driven** | WHEN [trigger] THEN SHALL [behavior] | On event |
| **State-Driven** | WHILE [state] SHALL [behavior] | During state |
| **Unwanted** | IF [condition] THEN SHALL [handling] | Error cases |
| **Complex** | Combination of above | Complex flows |

### Measurability Examples

| Type | Example |
|------|---------|
| Time | "within 2000ms", "under 500ms" |
| Status | "return 200", "respond with 401" |
| Count | "maximum 5 attempts", "at least 3 items" |
| Message | 'display "Invalid email"' |
| Percentage | ">=80% coverage" |

---

## Story Linter Score System

```typescript
function calculateScore(story: Story, errors: LintError[]): number {
  let score = 100;

  // Deduct for errors
  errors.forEach(e => {
    if (e.severity === 'error') score -= 20;
    if (e.severity === 'warning') score -= 5;
  });

  // Bonus for completeness
  if (story.scope) score += 5;
  if (story.api_contract) score += 5;
  if (story.rollback_plan) score += 5;
  if (story.implementation_hints?.length) score += 5;

  return Math.max(0, Math.min(100, score));
}
```

### Score Thresholds

| Score | Status | Action |
|-------|--------|--------|
| 95-100 | Ready for execution | Proceed |
| 80-94 | Minor fixes needed | Quick review |
| 60-79 | Significant gaps | Rework required |
| 0-59 | Not ready | Major revision |

---

## Anti-Pattern Detection

Stories must NOT contain these vague terms:

| Anti-Pattern | Fix |
|--------------|-----|
| "make it fast" | Use "within 200ms" |
| "handle errors" | Use "return 400 with {code, message}" |
| "use best practices" | Reference specific file |
| "good test coverage" | Use ">=80% coverage" |
| "should be secure" | Specify: bcrypt, no plaintext |
| "improve performance" | Use "reduce to <500ms" |
| "properly validate" | Specify validation rules |

---

## WAVE Story Quality Checks

Before PM assigns a story to agents, validate:

| Check | Requirement |
|-------|-------------|
| R1 | Title starts with action verb |
| R2 | files.forbidden is populated |
| R3 | Minimum 3 acceptance criteria |
| R4 | All ACs have measurable thresholds |
| R5 | No anti-patterns detected |
| R6 | stop_conditions defined |
| R7 | Story score >= 95 |
| R8 | domain is assigned |
| R9 | agent follows pattern |
| R10 | All dependencies exist |

---

## Example: Frontend Story

```json
{
  "id": "WAVE1-FE-001",
  "title": "Create LoginForm component with email validation",
  "domain": "auth",
  "technical_domain": "frontend",
  "agent": "fe-dev-1",
  "priority": "P1-High",
  "complexity": "M",
  "estimate_hours": 3,

  "objective": {
    "as_a": "registered user",
    "i_want": "to log into my account",
    "so_that": "I can access my personalized dashboard"
  },

  "scope": {
    "in_scope": [
      "Email input with validation",
      "Password input with show/hide toggle",
      "Submit button with loading state",
      "Error message display"
    ],
    "out_of_scope": [
      "Password reset flow",
      "Social login",
      "Remember me functionality"
    ]
  },

  "acceptance_criteria": [
    {
      "id": "AC-1",
      "title": "Email validation",
      "ears_pattern": "event-driven",
      "given": "user enters email",
      "when": "email format is invalid",
      "then": "display 'Please enter a valid email'",
      "threshold": "validation within 100ms"
    },
    {
      "id": "AC-2",
      "title": "Form submission",
      "ears_pattern": "event-driven",
      "given": "user fills valid credentials",
      "when": "user clicks submit",
      "then": "call POST /api/auth/login within 200ms"
    },
    {
      "id": "AC-3",
      "title": "Error handling",
      "ears_pattern": "unwanted",
      "given": "API returns 401",
      "when": "credentials are invalid",
      "then": "display 'Invalid email or password'"
    }
  ],

  "files": {
    "create": [
      "src/components/auth/LoginForm.tsx",
      "src/components/auth/LoginForm.test.tsx"
    ],
    "modify": [
      "src/app/(auth)/login/page.tsx"
    ],
    "forbidden": [
      ".env*",
      "src/app/api/**",
      "src/lib/db/**"
    ]
  },

  "tests": {
    "commands": [
      "pnpm test src/components/auth/LoginForm.test.tsx"
    ],
    "coverage_threshold": 80,
    "unit_tests": [
      "renders email and password inputs",
      "validates email format",
      "shows loading state on submit",
      "displays error messages"
    ]
  },

  "safety": {
    "max_iterations": 25,
    "token_budget": 100000,
    "timeout_minutes": 60,
    "stop_conditions": [
      "Component fails to render",
      "TypeScript errors > 0",
      "Test coverage < 80%"
    ],
    "escalation_triggers": [
      "Cannot import required dependencies",
      "API contract mismatch"
    ]
  },

  "definition_of_done": [
    "Component renders without errors",
    "All acceptance criteria verified",
    "Tests pass with >= 80% coverage",
    "No TypeScript errors",
    "No ESLint errors"
  ]
}
```

---

## Example: Backend Story

```json
{
  "id": "WAVE1-BE-001",
  "title": "Implement login API endpoint with JWT",
  "domain": "auth",
  "technical_domain": "backend",
  "agent": "be-dev-1",
  "priority": "P1-High",
  "complexity": "M",
  "estimate_hours": 4,

  "objective": {
    "as_a": "frontend application",
    "i_want": "to authenticate users via API",
    "so_that": "users can securely access protected resources"
  },

  "api_contract": {
    "endpoint": "POST /api/auth/login",
    "request": {
      "type_name": "LoginRequest",
      "fields": {
        "email": {
          "type": "string",
          "required": true,
          "validation": "email format"
        },
        "password": {
          "type": "string",
          "required": true,
          "validation": "min 8 chars"
        }
      }
    },
    "response": {
      "success_type": "LoginResponse",
      "error_codes": [
        { "code": "INVALID_CREDENTIALS", "status": 401, "message": "Invalid email or password" },
        { "code": "VALIDATION_ERROR", "status": 400, "message": "Invalid request body" },
        { "code": "RATE_LIMITED", "status": 429, "message": "Too many attempts" }
      ]
    }
  },

  "acceptance_criteria": [
    {
      "id": "AC-1",
      "title": "Valid login",
      "ears_pattern": "event-driven",
      "given": "valid credentials",
      "when": "POST /api/auth/login called",
      "then": "return 200 with JWT token",
      "threshold": "response within 500ms"
    },
    {
      "id": "AC-2",
      "title": "Invalid credentials",
      "ears_pattern": "unwanted",
      "given": "invalid credentials",
      "when": "POST /api/auth/login called",
      "then": "return 401 with INVALID_CREDENTIALS error"
    },
    {
      "id": "AC-3",
      "title": "Rate limiting",
      "ears_pattern": "state-driven",
      "given": "more than 5 failed attempts in 15 minutes",
      "when": "user attempts login",
      "then": "return 429 RATE_LIMITED"
    }
  ],

  "files": {
    "create": [
      "src/app/api/auth/login/route.ts",
      "src/lib/auth/jwt.ts"
    ],
    "modify": [
      "src/lib/auth/index.ts"
    ],
    "forbidden": [
      ".env*",
      "src/components/**",
      "prisma/schema.prisma"
    ]
  },

  "dependencies": {
    "infrastructure": [
      "JWT_SECRET configured",
      "Database connection available"
    ]
  },

  "safety": {
    "max_iterations": 25,
    "token_budget": 150000,
    "timeout_minutes": 90,
    "stop_conditions": [
      "Build fails",
      "Security vulnerability detected",
      "API returns wrong status codes"
    ],
    "escalation_triggers": [
      "Database schema change needed",
      "New environment variable required"
    ],
    "dal_level": "C",
    "requires_human_approval": false
  }
}
```

---

## Story Template

```json
{
  "id": "WAVE{{WAVE}}-{{DOMAIN}}-{{NUMBER}}",
  "title": "{{ACTION_VERB}} {{feature}} with {{capability}}",
  "domain": "{{domain}}",
  "technical_domain": "{{frontend|backend|database}}",
  "agent": "{{agent-type}}",
  "priority": "P2-Medium",
  "complexity": "M",
  "estimate_hours": 0,

  "objective": {
    "as_a": "{{user persona}}",
    "i_want": "{{desired capability}}",
    "so_that": "{{business benefit}}"
  },

  "scope": {
    "in_scope": [],
    "out_of_scope": []
  },

  "acceptance_criteria": [
    {
      "id": "AC-1",
      "title": "",
      "ears_pattern": "event-driven",
      "given": "",
      "when": "",
      "then": "",
      "threshold": ""
    }
  ],

  "files": {
    "create": [],
    "modify": [],
    "forbidden": [".env*"]
  },

  "tests": {
    "commands": [],
    "coverage_threshold": 80
  },

  "safety": {
    "max_iterations": 25,
    "token_budget": 100000,
    "timeout_minutes": 60,
    "stop_conditions": [
      "Build fails",
      "TypeScript errors > 0",
      "Test failures"
    ]
  },

  "definition_of_done": [
    "All acceptance criteria verified",
    "Tests pass with >= 80% coverage",
    "No TypeScript errors",
    "No ESLint errors"
  ]
}
```

---

## Integration with WAVE Gates

| Gate | Story Status |
|------|--------------|
| Gate 0 | PM assigns stories → `ready` |
| Gate 1 | CTO reviews → `ready` or `blocked` |
| Gate 2 | Agents execute → `in_progress` |
| Gate 3 | Agents complete → `review` |
| Gate 4 | QA validates → `done` or `blocked` |
| Gate 4.5 | Dev-Fix resolves → `review` |
| Gate 5 | Merge approved → `done` |

---

*WAVE Framework | AI Stories Methodology | Version 1.0.0*
