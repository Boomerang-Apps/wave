# WAVE Skills Reference
> Master skills catalog for autonomous agent execution

---

## Overview

This document defines the skills, knowledge, and capabilities required for effective WAVE execution. Agents reference this to understand what expertise to apply at each gate, for each domain, and in each role.

**Usage:** Project CLAUDE.md files should reference relevant skills:
```markdown
## Required Skills
@import WAVE-SKILLS.md#nextjs-app-router
@import WAVE-SKILLS.md#supabase-auth
@import WAVE-SKILLS.md#tdd-workflow
```

---

## 1. DOMAIN SKILLS

### 1.1 Authentication & Authorization
```yaml
skill_id: auth
applies_to: [BE-Dev, CTO]
gates: [2, 3, 4, 5]

knowledge:
  - OAuth 2.0 / OIDC flows (authorization code, PKCE)
  - JWT structure, signing, validation, refresh tokens
  - Session management (stateless vs stateful)
  - Row Level Security (RLS) policy design
  - Role-based access control (RBAC)
  - Multi-tenant isolation patterns

patterns:
  - Never store plain-text passwords
  - Always validate tokens server-side
  - Use httpOnly cookies for session tokens
  - Implement token refresh before expiry
  - Log authentication events for audit

supabase_specific:
  - auth.users() table access
  - auth.uid() in RLS policies
  - Custom claims in JWT
  - Auth hooks and triggers
  - Email/password + social providers

red_flags:
  - Exposing tokens in URLs
  - Client-side only validation
  - Missing RLS on user data tables
  - Hardcoded secrets in code
```

### 1.2 Payments & Billing
```yaml
skill_id: payments
applies_to: [BE-Dev, CTO]
gates: [2, 3, 4, 5, 6]

knowledge:
  - Stripe API (Checkout, Payment Intents, Subscriptions)
  - Webhook signature verification
  - Idempotency keys for retries
  - PCI DSS compliance basics
  - Subscription lifecycle management
  - Proration and billing cycles

patterns:
  - Always verify webhook signatures
  - Store Stripe customer ID, not card details
  - Use idempotency keys for all mutations
  - Handle webhook events idempotently
  - Log all payment events with correlation IDs

error_handling:
  - Card declined scenarios
  - Insufficient funds
  - Expired cards
  - Network timeouts
  - Duplicate webhook delivery

red_flags:
  - Storing raw card numbers
  - Skipping webhook verification
  - Not handling failed payments gracefully
  - Missing idempotency on retries
```

### 1.3 Orders & Inventory
```yaml
skill_id: orders
applies_to: [BE-Dev, FE-Dev]
gates: [3, 4, 5]

knowledge:
  - Order state machines (pending → paid → fulfilled → completed)
  - Inventory reservation patterns
  - Transaction isolation levels
  - Optimistic vs pessimistic locking
  - Event sourcing basics

patterns:
  - Use database transactions for order creation
  - Reserve inventory before payment
  - Release inventory on payment failure
  - Implement idempotent order creation
  - Track state transitions with timestamps

state_machine:
  states: [draft, pending, paid, processing, shipped, delivered, cancelled, refunded]
  transitions:
    - draft → pending (checkout initiated)
    - pending → paid (payment confirmed)
    - pending → cancelled (timeout/user cancel)
    - paid → processing (fulfillment started)
    - paid → refunded (refund requested)
    - processing → shipped (shipment created)
    - shipped → delivered (delivery confirmed)
```

### 1.4 File Upload & Media
```yaml
skill_id: media
applies_to: [FE-Dev, BE-Dev]
gates: [3, 4, 5]

knowledge:
  - Multipart form uploads
  - Presigned URLs for direct upload
  - Image optimization (WebP, AVIF)
  - CDN caching strategies
  - MIME type validation
  - File size limits and chunking

patterns:
  - Validate file type server-side (not just extension)
  - Generate unique filenames (UUID + extension)
  - Use presigned URLs for large files
  - Implement progress tracking
  - Clean up orphaned uploads

security:
  - Scan uploads for malware
  - Restrict allowed MIME types
  - Set maximum file sizes
  - Validate image dimensions
  - Sanitize filenames
```

### 1.5 Search & Filtering
```yaml
skill_id: search
applies_to: [BE-Dev, FE-Dev]
gates: [3, 4]

knowledge:
  - Full-text search (PostgreSQL tsvector)
  - Faceted search patterns
  - Pagination (cursor vs offset)
  - Filter query builders
  - Search result ranking

patterns:
  - Use cursor-based pagination for large datasets
  - Debounce search input (300ms)
  - Cache common search results
  - Implement search suggestions
  - Track search analytics
```

---

## 2. TECHNOLOGY SKILLS

### 2.1 Next.js (App Router)
```yaml
skill_id: nextjs-app-router
applies_to: [FE-Dev, CTO]
gates: [2, 3, 4, 5]

knowledge:
  - App Router directory structure
  - Server Components vs Client Components
  - Route handlers (route.ts)
  - Middleware (middleware.ts)
  - Parallel and intercepting routes
  - Streaming and Suspense
  - Server Actions

patterns:
  server_components:
    - Default to Server Components
    - Fetch data at component level
    - Use 'use client' only when needed
    - Avoid prop drilling with server fetch

  client_components:
    - Interactive elements (onClick, onChange)
    - Browser APIs (localStorage, window)
    - React hooks (useState, useEffect)
    - Third-party client libraries

  data_fetching:
    - Use fetch() with caching options
    - revalidatePath() for on-demand revalidation
    - generateStaticParams() for static generation

file_conventions:
  - page.tsx: Route UI
  - layout.tsx: Shared layout
  - loading.tsx: Loading UI
  - error.tsx: Error boundary
  - not-found.tsx: 404 page
  - route.ts: API endpoint

red_flags:
  - 'use client' at top of every file
  - useEffect for data fetching
  - Mixing server/client in same component
  - Not using Suspense for streaming
```

### 2.2 Supabase
```yaml
skill_id: supabase
applies_to: [BE-Dev, FE-Dev, CTO]
gates: [2, 3, 4, 5]

knowledge:
  - Supabase client setup (createClient patterns)
  - Row Level Security (RLS) policies
  - Database functions and triggers
  - Realtime subscriptions
  - Storage buckets and policies
  - Edge Functions

patterns:
  client_setup:
    server: createServerClient (cookies)
    client: createBrowserClient
    middleware: createServerClient (request/response)

  rls_policies:
    - Enable RLS on all tables with user data
    - Use auth.uid() for user isolation
    - Create policies for SELECT, INSERT, UPDATE, DELETE
    - Test policies with different user contexts

  queries:
    - Use .select() with explicit columns
    - Add .single() for single row expectations
    - Handle errors with try/catch
    - Use .throwOnError() for strict mode

red_flags:
  - Tables without RLS enabled
  - Using service role key on client
  - Not handling query errors
  - Exposing anon key with elevated privileges
```

### 2.3 TypeScript
```yaml
skill_id: typescript
applies_to: [FE-Dev, BE-Dev, CTO]
gates: [2, 3, 4, 5, 6]

knowledge:
  - Strict mode configuration
  - Type inference vs explicit types
  - Generics and utility types
  - Discriminated unions
  - Type guards and narrowing
  - Zod schema validation

patterns:
  strict_mode:
    - Enable all strict flags
    - No 'any' unless absolutely necessary
    - Explicit return types on public APIs
    - Use 'unknown' over 'any' for unknowns

  type_design:
    - Prefer interfaces for objects
    - Use type for unions/intersections
    - Leverage const assertions
    - Create branded types for IDs

  validation:
    - Use Zod for runtime validation
    - Infer types from Zod schemas
    - Validate at system boundaries
    - Never trust external input

red_flags:
  - Disabling strict mode
  - Widespread 'any' usage
  - Type assertions (as) to bypass checks
  - Missing null checks
```

### 2.4 Tailwind CSS
```yaml
skill_id: tailwind
applies_to: [FE-Dev]
gates: [3, 4, 5]

knowledge:
  - Utility-first methodology
  - Responsive design (sm, md, lg, xl, 2xl)
  - Dark mode (class strategy)
  - Custom theme configuration
  - Component extraction patterns
  - RTL support (for Hebrew)

patterns:
  responsive:
    - Mobile-first approach
    - Use breakpoint prefixes consistently
    - Test all breakpoints

  dark_mode:
    - Use dark: prefix
    - Ensure sufficient contrast
    - Test both modes

  rtl_support:
    - Use logical properties (ms-, me-, ps-, pe-)
    - Use rtl: and ltr: variants
    - Test with dir="rtl"

  component_extraction:
    - Extract repeated patterns to components
    - Use @apply sparingly
    - Prefer composition over @apply
```

### 2.5 Testing (Vitest + Playwright)
```yaml
skill_id: testing
applies_to: [QA, FE-Dev, BE-Dev]
gates: [4, 5, 6]

knowledge:
  - Unit testing with Vitest
  - Component testing with Testing Library
  - E2E testing with Playwright
  - Mocking strategies
  - Test fixtures and factories
  - Coverage thresholds

patterns:
  unit_tests:
    - Test pure functions in isolation
    - Mock external dependencies
    - Use describe/it blocks semantically
    - One assertion per test (ideally)

  component_tests:
    - Test user interactions
    - Use getByRole, getByLabelText
    - Avoid testing implementation details
    - Test accessibility

  e2e_tests:
    - Test critical user journeys
    - Use Page Object Model
    - Handle async operations properly
    - Clean up test data

  tdd_workflow:
    - RED: Write failing test first
    - GREEN: Minimal code to pass
    - REFACTOR: Clean up, keep tests green
```

---

## 3. PROCESS SKILLS

### 3.1 Gate Progression
```yaml
skill_id: gate-progression
applies_to: [ALL]
gates: [0-8]

knowledge:
  gate_0_research:
    owner: PM
    artifacts: [gap-analysis.md, feasibility.md]
    exit_criteria: CTO approval

  gate_1_planning:
    owner: PM + CTO
    artifacts: [stories/*.json, architecture.md]
    exit_criteria: Stories locked, architecture approved

  gate_2_specification:
    owner: CTO
    artifacts: [interfaces.ts, api-contracts.md]
    exit_criteria: Types defined, contracts agreed

  gate_3_implementation:
    owner: FE-Dev + BE-Dev
    artifacts: [source code, unit tests]
    exit_criteria: Code complete, tests passing

  gate_4_testing:
    owner: QA
    artifacts: [test results, coverage report]
    exit_criteria: All tests pass, coverage met

  gate_5_review:
    owner: CTO
    artifacts: [review comments, approval]
    exit_criteria: Code approved, no blockers

  gate_6_qa_approval:
    owner: QA
    artifacts: [QA sign-off]
    exit_criteria: Functional testing complete

  gate_7_merge:
    owner: Merge-Watcher
    artifacts: [merged PR, updated main]
    exit_criteria: Clean merge, CI passing

  gate_8_deploy:
    owner: Orchestrator
    artifacts: [deployment, smoke test results]
    exit_criteria: Production verified

rules:
  - Cannot skip gates
  - Must have artifacts before progression
  - Rollback on gate failure
  - Max 3 retries per gate
```

### 3.2 TDD Workflow
```yaml
skill_id: tdd-workflow
applies_to: [FE-Dev, BE-Dev, QA]
gates: [3, 4, 5]

knowledge:
  red_phase:
    - Write test that describes desired behavior
    - Test MUST fail initially
    - Test should be minimal and focused
    - Name test descriptively

  green_phase:
    - Write minimal code to pass test
    - Don't over-engineer
    - Don't add unrequested features
    - Run test to verify it passes

  refactor_phase:
    - Clean up code while keeping tests green
    - Extract common patterns
    - Improve naming
    - Remove duplication

patterns:
  test_naming: "should [expected behavior] when [condition]"
  file_structure:
    - Component.tsx
    - Component.test.tsx (co-located)
    - __tests__/integration/ (integration tests)

red_flags:
  - Writing code before tests
  - Tests that never fail
  - Testing implementation details
  - Skipping refactor phase
```

### 3.3 Safety Protocol
```yaml
skill_id: safety-protocol
applies_to: [ALL]
gates: [ALL]

knowledge:
  kill_switch:
    file: EMERGENCY-STOP
    action: Immediate halt all agents
    recovery: Manual intervention required

  violation_detection:
    - Monitor for forbidden patterns
    - Check for security violations
    - Validate against safety rules
    - Alert on anomalies

  budget_enforcement:
    - Track token usage per agent
    - Enforce per-wave budget limits
    - Alert at 80% threshold
    - Hard stop at 100%

patterns:
  before_action:
    - Check kill switch
    - Verify within budget
    - Validate permissions
    - Log intent

  after_action:
    - Log completion
    - Update cost tracking
    - Verify no violations
    - Signal next step

red_flags:
  - Ignoring kill switch
  - Exceeding budget without approval
  - Bypassing safety checks
  - Unlogged actions
```

### 3.4 RLM Context Management
```yaml
skill_id: rlm-context
applies_to: [ALL]
gates: [ALL]

knowledge:
  p_variable:
    - Project configuration snapshot
    - Updated on context changes
    - Contains: structure, wave_state, worktrees
    - Query interface for agents

  context_hash:
    - Detects file changes
    - Triggers P.json refresh
    - Prevents stale context

  agent_memory:
    - Per-agent persistent state
    - Survives container restarts
    - Contains learned patterns

patterns:
  querying_p:
    - peek(P, 'path/to/file.ts')
    - search(P, 'pattern')
    - list_files(P, '*.test.ts')
    - get_story(P, 'STORY-ID')

  memory_updates:
    - Record decisions made
    - Store learned patterns
    - Track error resolutions
```

---

## 4. TOOL SKILLS

### 4.1 Pre-Flight Validation
```yaml
skill_id: preflight
applies_to: [Orchestrator]
gates: [0]

usage:
  command: ./pre-flight-validator.sh --wave N --project /path

  sections:
    A: Project Structure
    B: Git Configuration
    C: Environment Variables
    D: API Connectivity
    E: Docker Readiness
    F-N: Domain-specific checks
    S: Work Dispatch Validation
    T: Operational Smoke Test

  outcomes:
    GO: All critical checks pass
    CONDITIONAL_GO: Warnings only, review and proceed
    NO_GO: Critical failures, must fix

  interpretation:
    - Green: Passed
    - Yellow: Warning (review)
    - Red: Failed (blocking)
```

### 4.2 Workflow Locker
```yaml
skill_id: workflow-locker
applies_to: [PM, CTO, Orchestrator]
gates: [0, 1, 2]

usage:
  lock_story: ./workflow_locker.py lock --story STORY-ID
  unlock_story: ./workflow_locker.py unlock --story STORY-ID
  verify_lock: ./workflow_locker.py verify --story STORY-ID

  lock_contents:
    - SHA256 signature
    - Timestamp
    - Locked by (agent)
    - Lock reason

  rules:
    - Stories must be locked before Gate 3
    - Only PM/CTO can lock stories
    - Unlock requires CTO approval
    - Lock files are version controlled
```

### 4.3 RLM Auditor
```yaml
skill_id: rlm-auditor
applies_to: [CTO, Orchestrator]
gates: [ALL]

usage:
  audit: ./rlm_auditor.py --project /path

  checks:
    - P.json freshness
    - Context hash validity
    - Agent memory integrity
    - Drift detection

  alerts:
    - Stale P.json (>10 min)
    - Context hash mismatch
    - Memory corruption
    - Unexpected file changes
```

### 4.4 Git Worktree Management
```yaml
skill_id: git-worktrees
applies_to: [FE-Dev, BE-Dev, QA]
gates: [3, 4, 5, 6]

knowledge:
  structure:
    /project (main worktree)
    /project/worktrees/fe-dev-1 (agent worktree)
    /project/worktrees/fe-dev-2 (agent worktree)
    /project/worktrees/be-dev-1 (agent worktree)

  commands:
    list: git worktree list
    add: git worktree add ../worktrees/agent-name branch-name
    remove: git worktree remove ../worktrees/agent-name

  patterns:
    - Each agent works in isolated worktree
    - Branch naming: wave-N/agent-name/story-id
    - Sync from main before starting
    - Clean worktree after merge

  rules:
    - Never work directly in main worktree
    - Always pull latest before branching
    - Resolve conflicts before merge request
    - Delete worktree branch after merge
```

---

## 5. SKILL MATRIX BY ROLE

| Skill | PM | CTO | FE-Dev | BE-Dev | QA |
|-------|:--:|:---:|:------:|:------:|:--:|
| auth | - | R | - | R | - |
| payments | - | R | - | R | - |
| orders | - | - | P | R | - |
| media | - | - | R | P | - |
| search | - | - | P | R | - |
| nextjs-app-router | - | R | R | - | - |
| supabase | - | R | P | R | - |
| typescript | - | R | R | R | P |
| tailwind | - | - | R | - | - |
| testing | - | - | P | P | R |
| gate-progression | R | R | P | P | R |
| tdd-workflow | - | - | R | R | R |
| safety-protocol | P | R | P | P | P |
| rlm-context | P | R | P | P | P |
| preflight | - | P | - | - | - |
| workflow-locker | R | R | - | - | - |
| rlm-auditor | - | R | - | - | - |
| git-worktrees | - | - | R | R | R |

**Legend:** R = Required, P = Partial/Aware, - = Not needed

---

## 6. SKILL MATRIX BY GATE

| Gate | Primary Skills | Supporting Skills |
|------|---------------|-------------------|
| 0 - Research | gate-progression, safety-protocol | rlm-context |
| 1 - Planning | gate-progression, workflow-locker | domain skills |
| 2 - Specification | typescript, supabase, nextjs | gate-progression |
| 3 - Implementation | ALL tech skills, tdd-workflow | git-worktrees |
| 4 - Testing | testing, tdd-workflow | typescript |
| 5 - Review | ALL tech skills, safety-protocol | rlm-auditor |
| 6 - QA Approval | testing, safety-protocol | gate-progression |
| 7 - Merge | git-worktrees, safety-protocol | rlm-context |
| 8 - Deploy | preflight, safety-protocol | gate-progression |

---

## 7. ADDING PROJECT-SPECIFIC SKILLS

In your project's CLAUDE.md, reference skills like this:

```markdown
# Project Skills

## Required Domain Skills
- @skill(auth) - Full OAuth + RLS implementation
- @skill(payments) - Stripe integration
- @skill(media) - Image upload with optimization

## Technology Stack
- @skill(nextjs-app-router) - v14.1+
- @skill(supabase) - Auth + Database + Storage
- @skill(typescript) - Strict mode
- @skill(tailwind) - With RTL support

## Project-Specific Knowledge
### Footprint Custom Patterns
- Artwork model: [id, title, images[], artist_id, price]
- Order flow: cart → checkout → payment → fulfillment
- Image processing: Auto-crop detection API

### Business Rules
- Artists can only edit their own artworks
- Orders lock inventory until payment timeout (15 min)
- Free shipping over 500 ILS
```

---

*Last Updated: 2026-01-28*
*Version: 1.0*
