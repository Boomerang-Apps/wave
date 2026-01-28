# WAVE V2 Multi-Agent Workflow Specification
## Summary Report for Architecture Review

**Version:** 2.0
**Date:** January 28, 2026
**Status:** Implementation in Progress

---

## Executive Summary

WAVE (Workflow Automation Via Execution) V2 is a multi-agent AI system for autonomous software development. It enforces a 9-gate process from story definition through deployment, with safety controls, TDD, and human oversight at critical points.

### Current State vs. Required State

| Component | Current | Required | Status |
|-----------|---------|----------|--------|
| Story Definition (Gate 0) | Basic form | Full spec with design sources | Partial |
| Pre-flight Validation | 11 checks in orchestrator | Exposed in UI | Missing |
| Project Research | Tech stack detection | Deep codebase analysis | Partial |
| TDD Gate | In orchestrator | Visible in UI workflow | Missing |
| Git Branching | Manual | Automated branch creation | Missing |
| Safety Scoring | Backend only | Real-time display | Missing |
| Human Review Holds | Configured | UI integration | Missing |

---

## Complete 9-Gate Workflow

### Gate 0: Define & Research
**Purpose:** Capture story requirements and analyze target project

#### 0.1 Story Definition
```
Input:
  - Feature Name (required)
  - Description (required)
  - Domain: FE | BE | FULLSTACK
  - Design Source: None | Image | HTML Mockup | Figma URL

Output:
  - Story draft with user intent captured
```

#### 0.2 Project Research (MISSING IN UI)
```
Current Implementation:
  - Tech stack detection from package.json
  - Supabase project ID from .env.local
  - Existing storage buckets scan
  - App/Pages router detection

Required Additions:
  - Database schema analysis (Prisma/Drizzle models)
  - Existing API routes inventory
  - Component library detection
  - Authentication pattern detection
  - Test framework detection (Jest, Vitest, Playwright)
  - CI/CD configuration review
```

#### 0.3 Design Analysis
```
Sources:
  - Image Upload → Claude Vision analysis
  - HTML Mockup → DOM parser extraction
  - Figma → MCP integration (planned)

Extracted Data:
  - UI components list
  - User actions/interactions
  - Data displayed
  - Navigation structure
  - Form fields and validation hints
```

---

### Gate 1: Pre-flight Validation (MISSING IN UI)
**Purpose:** Ensure system readiness before story creation

#### Pre-flight Checks (11 Required)
```python
PREFLIGHT_CHECKS = [
    "anthropic_api_key_valid",      # API key configured and valid
    "orchestrator_reachable",        # Orchestrator service responding
    "redis_connected",               # Redis for state management
    "supabase_connected",            # Database connectivity
    "git_repo_clean",                # No uncommitted changes
    "branch_protection_verified",    # Main branch protected
    "docker_services_running",       # PM, FE, BE, QA agents ready
    "token_budget_available",        # Under cost limits
    "project_path_accessible",       # Target project exists
    "write_permissions_verified",    # Can write to project
    "test_framework_detected"        # Tests can be executed
]
```

#### Pre-flight UI Requirements
```
Display:
  - Checklist with pass/fail status
  - Blocking errors highlighted
  - Warnings for non-critical issues
  - "All checks passed" confirmation before proceeding
```

---

### Gate 2: Planning & AI Story Generation
**Purpose:** Create V4 AI Story schema with AI assistance

#### V4 Story Schema
```json
{
  "story_id": "WAVE-FEATURE-20260128",
  "wave_number": 1,
  "title": "Feature Name",
  "description": "User-provided description",
  "acceptance_criteria": [
    "AC-001: Specific, measurable criterion",
    "AC-002: ...",
    "... (minimum 5)"
  ],
  "story_data": {
    "objective": {
      "as_a": "user",
      "i_want": "to do X",
      "so_that": "I can achieve Y"
    },
    "files": {
      "create": ["app/feature/page.tsx", "..."],
      "modify": [],
      "forbidden": [".env", ".env.local", "node_modules/**"]
    },
    "safety": {
      "stop_conditions": [
        "Safety score below 0.85",
        "Exposes API keys or secrets",
        "Direct commits to main branch"
      ],
      "escalation_triggers": [
        "Database schema changes",
        "Authentication modifications",
        "Payment/billing changes"
      ]
    },
    "tdd": {
      "test_files": ["__tests__/feature.test.ts"],
      "coverage_target": 80,
      "test_framework": "vitest"
    },
    "context": {
      "project_path": "/path/to/project",
      "tech_stack": ["Next.js", "React", "Supabase"],
      "supabase_project": "project-id",
      "existing_routes": ["api", "dashboard", "..."]
    }
  }
}
```

#### AI-Generated Content
```
From Description + Design Analysis:
  - 7-10 Acceptance Criteria (specific, testable)
  - File structure based on project patterns
  - Test file locations
  - API route suggestions
```

---

### Gate 3: Git Branching (MISSING)
**Purpose:** Create isolated branch for feature development

#### Branching Strategy
```
Branch Naming: feature/{story-id}
Example: feature/WAVE-BILLING-20260128

Flow:
1. Verify main branch is up to date
2. Create feature branch from main
3. Set branch as working branch for agents
4. Configure branch protection (no direct push to main)

Commands:
  git checkout main
  git pull origin main
  git checkout -b feature/WAVE-BILLING-20260128
  git push -u origin feature/WAVE-BILLING-20260128
```

#### Branch Validation
```
Pre-conditions:
  - Clean working directory
  - Main branch up to date
  - No existing branch with same name

Post-conditions:
  - Branch created and pushed
  - Agent workspace set to feature branch
```

---

### Gate 4: TDD - Test First (PARTIAL)
**Purpose:** Write failing tests before implementation

#### TDD Process
```
1. PM Agent analyzes acceptance criteria
2. QA Agent generates test specifications
3. Test files created with failing tests
4. Tests verified to fail (red phase)

Test Structure:
  describe('Feature: {story_name}')
    describe('AC-001: {criterion}')
      it('should {expected behavior}')
      it('should handle {edge case}')
```

#### Test Requirements
```yaml
coverage_target: 80%
test_types:
  - unit: Component/function tests
  - integration: API route tests
  - e2e: User flow tests (if applicable)

frameworks:
  - vitest: Unit tests
  - playwright: E2E tests
  - testing-library: Component tests
```

---

### Gate 5: Develop
**Purpose:** Implement code to pass tests

#### Agent Responsibilities
```
PM Agent:
  - Breaks story into tasks
  - Coordinates FE/BE agents
  - Validates task completion

FE Agent:
  - React components
  - Client-side logic
  - UI styling (Tailwind)

BE Agent:
  - API routes
  - Database operations
  - Server-side logic
  - Supabase integration
```

#### Development Rules
```
MUST:
  - Follow existing code patterns
  - Use project's tech stack
  - Implement only what's needed for AC
  - Run tests after each file change

MUST NOT:
  - Modify forbidden files
  - Add unnecessary dependencies
  - Change unrelated code
  - Commit directly to main
```

---

### Gate 6: Refactor
**Purpose:** Clean up code while maintaining test coverage

#### Refactoring Scope
```
Allowed:
  - Extract repeated code
  - Improve naming
  - Add TypeScript types
  - Optimize performance

Not Allowed:
  - Change functionality
  - Reduce test coverage
  - Add new features
```

---

### Gate 7: Safety Validation
**Purpose:** Verify code meets safety requirements

#### Safety Score Calculation
```python
safety_score = calculate_safety({
    "no_secrets_exposed": 0.25,
    "no_forbidden_files_modified": 0.20,
    "tests_passing": 0.20,
    "coverage_met": 0.15,
    "no_security_vulnerabilities": 0.10,
    "code_review_passed": 0.10
})

# Must score >= 0.85 to proceed
```

#### Safety Checks
```
Static Analysis:
  - Secret detection (API keys, passwords)
  - Dependency vulnerabilities (npm audit)
  - TypeScript errors
  - ESLint violations

Runtime Validation:
  - All tests pass
  - No console errors
  - No unhandled exceptions
```

---

### Gate 8: QA & Human Review
**Purpose:** Final validation before merge

#### Automated QA
```
Coverage Report:
  - Line coverage >= 80%
  - Branch coverage >= 70%
  - All AC mapped to tests

Build Verification:
  - npm run build succeeds
  - No TypeScript errors
  - Bundle size within limits
```

#### Human Review Triggers
```yaml
requires_human_review:
  - database_schema_changes: true
  - authentication_changes: true
  - payment_integration: true
  - third_party_api_changes: true
  - security_sensitive_code: true
```

#### Review Interface (NEEDED)
```
Display:
  - Diff of all changes
  - Test results summary
  - Coverage report
  - Safety score breakdown
  - Accept / Request Changes / Reject buttons
```

---

### Gate 9: Merge & Notify
**Purpose:** Complete the workflow

#### Merge Process
```
1. Create PR from feature branch to main
2. Run CI checks
3. Squash and merge
4. Delete feature branch
5. Tag release (if applicable)
```

#### Notifications
```
Slack Message:
  - Story ID and title
  - Files created/modified
  - Test coverage achieved
  - Safety score
  - PR link
  - Time to completion
```

---

## Missing UI Components

### 1. Pre-flight Panel
```tsx
<PreflightPanel>
  <CheckItem status="pass" label="API Key Valid" />
  <CheckItem status="pass" label="Orchestrator Ready" />
  <CheckItem status="fail" label="Git Clean" error="3 uncommitted files" />
  ...
</PreflightPanel>
```

### 2. Branch Creation Step
```tsx
<BranchCreation>
  <Input label="Branch Name" value={`feature/${storyId}`} />
  <Button onClick={createBranch}>Create Branch</Button>
  <Status>{branchStatus}</Status>
</BranchCreation>
```

### 3. TDD Visualization
```tsx
<TDDProgress>
  <Phase name="Red" status="complete" description="Tests written, failing" />
  <Phase name="Green" status="in_progress" description="Implementing..." />
  <Phase name="Refactor" status="pending" />
</TDDProgress>
```

### 4. Safety Dashboard
```tsx
<SafetyDashboard>
  <ScoreDisplay score={0.92} threshold={0.85} />
  <CheckList>
    <Check label="No secrets exposed" pass />
    <Check label="Tests passing" pass />
    <Check label="Coverage 84%" pass />
  </CheckList>
</SafetyDashboard>
```

### 5. Human Review Queue
```tsx
<ReviewQueue>
  <ReviewRequest story={story} changes={changes} />
  <Actions>
    <Button variant="approve">Approve</Button>
    <Button variant="request-changes">Request Changes</Button>
    <Button variant="reject">Reject</Button>
  </Actions>
</ReviewQueue>
```

---

## API Endpoints Required

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/story/research` | POST | Analyze project | Done |
| `/api/story/suggest-ac` | POST | AI acceptance criteria | Done |
| `/api/story/analyze-mockup` | POST | HTML analysis | Done |
| `/api/story/analyze-image` | POST | Vision analysis | Done |
| `/api/story/validate` | POST | Schema validation | Done |
| `/api/story/dispatch` | POST | Start workflow | Done |
| `/api/story/preflight` | POST | Run pre-flight checks | **MISSING** |
| `/api/story/create-branch` | POST | Git branch creation | **MISSING** |
| `/api/story/tdd-status` | GET | TDD phase status | **MISSING** |
| `/api/story/safety-score` | GET | Safety calculation | **MISSING** |
| `/api/story/review` | POST | Human review decision | **MISSING** |

---

## Recommended Gate Flow for UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Gate 0: Define                                                  │
│  ├── Feature Name, Description, Domain                          │
│  └── Design Source (Image/HTML/Figma/None)                      │
├─────────────────────────────────────────────────────────────────┤
│  Gate 1: Pre-flight  ⚠️ MISSING                                  │
│  ├── System checks (11 items)                                   │
│  ├── Project research (deep analysis)                           │
│  └── All green → proceed                                        │
├─────────────────────────────────────────────────────────────────┤
│  Gate 2: Plan                                                    │
│  ├── AI generates acceptance criteria                           │
│  ├── File mappings suggested                                    │
│  └── User reviews/edits                                         │
├─────────────────────────────────────────────────────────────────┤
│  Gate 3: Branch  ⚠️ MISSING                                      │
│  ├── Create feature/{story-id} branch                           │
│  └── Verify branch ready                                        │
├─────────────────────────────────────────────────────────────────┤
│  Gate 4-6: TDD Cycle  ⚠️ PARTIAL                                 │
│  ├── RED: Write failing tests                                   │
│  ├── GREEN: Implement to pass                                   │
│  └── REFACTOR: Clean up                                         │
├─────────────────────────────────────────────────────────────────┤
│  Gate 7: Safety  ⚠️ MISSING UI                                   │
│  ├── Safety score >= 0.85                                       │
│  └── Security scan pass                                         │
├─────────────────────────────────────────────────────────────────┤
│  Gate 8: Review  ⚠️ MISSING UI                                   │
│  ├── Automated QA results                                       │
│  └── Human review (if triggered)                                │
├─────────────────────────────────────────────────────────────────┤
│  Gate 9: Merge & Notify                                         │
│  ├── PR created                                                 │
│  ├── Merge to main                                              │
│  └── Slack notification                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Phase 1 (Critical)
1. Pre-flight checks endpoint + UI
2. Git branching integration
3. TDD status visualization

### Phase 2 (Important)
4. Safety score dashboard
5. Human review queue
6. Real-time workflow progress

### Phase 3 (Enhancement)
7. Figma MCP integration
8. Coverage trend tracking
9. Historical story analytics

---

## Technical Architecture

```
┌──────────────────┐     ┌──────────────────┐
│   Wave Portal    │────▶│   Story Routes   │
│   (React/Vite)   │     │   (Express.js)   │
└──────────────────┘     └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ Anthropic │ │ Supabase │ │   Git    │
              │   API     │ │    DB    │ │  Repos   │
              └──────────┘ └──────────┘ └──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │    Orchestrator     │
         │  (FastAPI/Docker)   │
         └──────────┬──────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌────────┐    ┌────────┐    ┌────────┐
│   PM   │    │   FE   │    │   BE   │
│ Agent  │    │ Agent  │    │ Agent  │
└────────┘    └────────┘    └────────┘
                    │
                    ▼
              ┌────────┐
              │   QA   │
              │ Agent  │
              └────────┘
```

---

## Next Steps

1. **Fix current "fetch failed" error** - Backend endpoint issue
2. **Add Pre-flight UI** - Show 11 checks before story creation
3. **Add Git branching** - Auto-create feature branches
4. **Add TDD visualization** - Show red/green/refactor phases
5. **Add Safety dashboard** - Real-time safety score display
6. **Add Review queue** - Human review interface

---

*Document generated for WAVE V2 architecture review*
