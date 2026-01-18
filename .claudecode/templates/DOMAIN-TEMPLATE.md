# WAVE Domain Template

**Version:** 1.0.0
**Purpose:** Template for defining domain boundaries in WAVE projects
**Usage:** Copy and customize for each domain in your project

---

## How to Use This Template

1. Copy this entire file
2. Save as `{domain-name}-domain.md` in your `.claudecode/domains/` folder
3. Replace all `[PLACEHOLDER]` values with your specific configuration
4. Define file patterns specific to your project structure
5. Map agents to this domain

---

# [DOMAIN_NAME] Domain Definition

## Domain Identity

| Property | Value |
|----------|-------|
| **Domain ID** | [DOMAIN_ID] (e.g., `frontend`, `backend`, `shared`) |
| **Domain Name** | [DOMAIN_NAME] (e.g., "Frontend", "Backend API") |
| **Primary Language** | [TypeScript / Python / Go / etc.] |
| **Framework** | [Next.js / Express / Django / etc.] |
| **Assigned Agents** | [List agents that work in this domain] |

## Purpose

[Describe the domain's purpose and scope in 2-3 sentences]

---

## File Ownership

### Owned Files (This Domain Controls)

Files that ONLY this domain's agents can modify:

```
[DOMAIN_ID]/
├── src/
│   ├── [specific paths]
│   ├── [specific paths]
│   └── [specific paths]
├── tests/
│   └── [specific paths]
└── [other paths]
```

**Glob Patterns:**
```
# Include patterns (agents CAN modify)
src/components/**/*
src/hooks/**/*
src/styles/**/*
src/app/**/*
!src/app/api/**/*          # Exclude API routes (backend domain)
public/**/*
tests/frontend/**/*
__tests__/components/**/*
```

### Read-Only Files (Can Read, Cannot Modify)

Files this domain can read but not change:

```
# Shared configuration
package.json
tsconfig.json
next.config.js
tailwind.config.js

# Backend contracts
src/lib/types/api-types.ts
src/lib/types/db-types.ts

# Environment (read for reference, never modify)
.env.example

# Other domain's code (for understanding, not modification)
src/app/api/**/*
prisma/schema.prisma
```

### Forbidden Files (Cannot Access)

Files this domain must NEVER access:

```
# Secrets
.env
.env.local
.env.production
*.pem
*.key

# Other domain's internal files
src/lib/server/**/*
prisma/migrations/**/*
supabase/functions/**/*

# CI/CD (infrastructure domain only)
.github/workflows/**/*
Dockerfile*
docker-compose*.yml
```

---

## Cross-Domain Contracts

### Interfaces This Domain Exposes

Files that other domains depend on:

| File | Consumers | Change Process |
|------|-----------|----------------|
| `src/lib/types/component-props.ts` | Backend (for SSR) | L2 (CTO approval) |
| `src/lib/hooks/useApi.ts` | Shared | L2 (CTO approval) |

### Interfaces This Domain Consumes

Files this domain depends on from other domains:

| File | Provider | Change Notification |
|------|----------|---------------------|
| `src/lib/types/api-types.ts` | Backend | Via signal |
| `prisma/schema.prisma` | Backend | Via signal |
| `src/app/api/**/*` | Backend | API contract |

### Contract Change Protocol

When changing shared interfaces:

1. Create signal: `signal-[DOMAIN_ID]-contract-change.json`
2. Wait for dependent domains to acknowledge
3. Coordinate via PM agent
4. Make change only after all domains ready

---

## Agent Assignment

### Primary Agents

| Agent | Wave | Responsibilities |
|-------|------|------------------|
| [agent-1] | 1 | [specific tasks] |
| [agent-2] | 2 | [specific tasks] |

### Supporting Agents

| Agent | Role | Access Level |
|-------|------|--------------|
| QA | Validation | Read all, write tests only |
| Dev-Fix | Bug fixes | Targeted modifications |
| PM | Coordination | Read only |
| CTO | Architecture | Read + approve changes |

---

## Technology Stack

### Languages & Runtimes
- [Language 1] ([version])
- [Language 2] ([version])

### Frameworks & Libraries
- [Framework 1] ([version]) - [purpose]
- [Library 1] ([version]) - [purpose]

### Build Tools
- [Tool 1] - [purpose]
- [Tool 2] - [purpose]

### Testing Tools
- [Tool 1] - [test type]
- [Tool 2] - [test type]

---

## Quality Gates

### Build Requirements

```bash
# All must pass before Gate 3 complete
npm run build          # Build succeeds
npm run typecheck      # No TypeScript errors
npm run lint           # No lint errors (warnings OK)
```

### Test Requirements

```bash
# Minimum coverage and pass rate
npm run test -- --coverage

# Thresholds
- Statement coverage: >= 70%
- Branch coverage: >= 60%
- All tests passing
```

### Code Quality Rules

| Rule | Enforcement | Severity |
|------|-------------|----------|
| No `any` types | TypeScript strict | Error |
| No console.log in production | ESLint | Warning |
| Imports from allowed paths only | ESLint | Error |
| Max file size 500 lines | ESLint | Warning |

---

## Domain Boundaries Enforcement

### Pre-Commit Checks

```bash
# Verify agent hasn't modified files outside domain
./core/scripts/workspace-validator.sh \
  --project . \
  --agent [AGENT_ID] \
  --domain [DOMAIN_ID]
```

### Gate 0.5 Validation

Before QA validation, workspace-validator checks:
1. All modified files are in allowed paths
2. No forbidden files touched
3. Contract changes properly signaled
4. No cross-domain pollution

### Violation Handling

If domain boundary violated:
1. Gate 0.5 fails
2. Signal created: `signal-[DOMAIN_ID]-boundary-violation.json`
3. Agent must revert unauthorized changes
4. Re-submit for validation

---

## Common Operations

### Adding a New Component

```bash
# Allowed location
src/components/[ComponentName]/
├── [ComponentName].tsx
├── [ComponentName].test.tsx
├── [ComponentName].styles.ts  # or .css/.scss
└── index.ts

# Export from domain index
# src/components/index.ts
export { ComponentName } from './[ComponentName]';
```

### Adding a New Hook

```bash
# Allowed location
src/hooks/use[HookName].ts
src/hooks/use[HookName].test.ts

# Export from hooks index
# src/hooks/index.ts
export { use[HookName] } from './use[HookName]';
```

### Adding Tests

```bash
# Co-located tests (preferred)
src/components/Button/Button.test.tsx

# Or in tests directory
tests/frontend/components/Button.test.tsx
__tests__/components/Button.test.tsx
```

---

## Dependency Management

### Allowed Dependencies

This domain can add dependencies in these categories:
- UI components (e.g., radix-ui, headlessui)
- Styling (e.g., tailwindcss, clsx)
- State management (e.g., zustand, jotai)
- Form handling (e.g., react-hook-form, zod)
- Utilities (e.g., date-fns, lodash-es)

### Forbidden Dependencies

This domain must NOT add:
- Server-side only packages
- Database clients
- File system access
- Network utilities (except fetch)

### Adding Dependencies

1. Check if dependency is allowed for domain
2. Run `npm install [package]`
3. Update package.json
4. QA will review in Gate 4

---

## Signal Protocol

### Domain-Specific Signals

| Signal | When Created | Purpose |
|--------|--------------|---------|
| `signal-[DOMAIN_ID]-ready.json` | After setup | Domain ready for work |
| `signal-[DOMAIN_ID]-complete.json` | After Gate 3 | Domain work done |
| `signal-[DOMAIN_ID]-contract-change.json` | Interface change | Notify dependents |
| `signal-[DOMAIN_ID]-boundary-violation.json` | Validation fail | Violation detected |

### Signal Templates

**Domain Complete:**
```json
{
  "signal_type": "domain-complete",
  "domain": "[DOMAIN_ID]",
  "wave": 1,
  "agents": ["fe-dev-1"],
  "files_modified": 15,
  "tests_added": 8,
  "coverage": "78%",
  "timestamp": "2026-01-16T12:00:00Z"
}
```

**Contract Change:**
```json
{
  "signal_type": "contract-change",
  "domain": "[DOMAIN_ID]",
  "contract_file": "src/lib/types/api-types.ts",
  "change_type": "breaking|non-breaking",
  "description": "Added new field to UserResponse",
  "affected_domains": ["frontend"],
  "timestamp": "2026-01-16T12:00:00Z"
}
```

---

## Example Domain Configurations

### Frontend Domain

```yaml
domain_id: frontend
domain_name: Frontend
agents: [fe-dev-1, fe-dev-2]
language: TypeScript
framework: Next.js

owned_paths:
  - src/app/**/* (except src/app/api)
  - src/components/**/*
  - src/hooks/**/*
  - src/styles/**/*
  - src/lib/client/**/*
  - public/**/*
  - tests/frontend/**/*

forbidden_paths:
  - src/app/api/**/*
  - src/lib/server/**/*
  - prisma/**/*
  - supabase/**/*
  - .env*
```

### Backend Domain

```yaml
domain_id: backend
domain_name: Backend API
agents: [be-dev-1, be-dev-2]
language: TypeScript
framework: Next.js API Routes

owned_paths:
  - src/app/api/**/*
  - src/lib/server/**/*
  - src/lib/db/**/*
  - prisma/schema.prisma
  - supabase/functions/**/*
  - tests/backend/**/*

forbidden_paths:
  - src/components/**/*
  - src/hooks/**/*
  - src/styles/**/*
  - public/**/*
  - prisma/migrations/**/* (CTO approval required)
```

### Shared Domain

```yaml
domain_id: shared
domain_name: Shared Types & Utilities
agents: [cto] # Only CTO can modify
language: TypeScript

owned_paths:
  - src/lib/types/**/*
  - src/lib/utils/**/*
  - src/lib/constants/**/*

consumers:
  - frontend
  - backend

change_approval: L2 (CTO)
```

---

## Customization Checklist

When creating a new domain from this template:

```
□ Replace all [PLACEHOLDER] values
□ Define specific file ownership patterns
□ Map agents to domain
□ Define cross-domain contracts
□ Set quality gate thresholds
□ Configure allowed dependencies
□ Add to workspace-validator domain list
□ Test domain isolation
```

---

**Template Version:** 1.0.0
**Last Updated:** 2026-01-16

*WAVE Framework | Domain Template | For use with WAVE 1.0.0+*
