# /prd - PRD Analysis & Compliance

**Priority:** P1 (Critical)
**Aliases:** /prd-check, /requirements, /compliance

## Purpose

Comprehensive analysis of codebase against Product Requirements Document (PRD) and AI Stories. Identifies gaps between planned requirements and actual implementation, finds missing user stories, and ensures alignment with the original product vision.

## When to Run

- Start of new wave/milestone planning
- Before major releases
- Quarterly product review
- When onboarding new team members
- After completing a wave (retrospective)
- When PRD is updated
- When stakeholders ask "are we on track?"

---

## Arguments

| Argument | Description |
|----------|-------------|
| `full` | Complete PRD analysis (all sections) - DEFAULT |
| `quick` | Fast compliance summary (~3 min) |
| `gaps` | Gap analysis only (PRD vs Implementation) |
| `stories` | Story coverage analysis only |
| `missing` | Identify missing stories only |
| `coverage` | Code-to-requirements traceability |
| `drift` | Detect requirement drift from PRD |
| `report` | Generate formal compliance report |

---

## Execution Protocol

### Phase 1: Document Discovery

```bash
# 1. Locate PRD document(s)
find . -name "PRD*.md" -o -name "prd*.md" -o -name "*requirements*.md"
find ./docs -name "*.md" | xargs grep -l "Product Requirements\|PRD\|Requirements Document"
find ./planning -name "*.md"

# 2. Locate AI Stories
find ./stories -name "*.json"
find ./planning/stories -name "*.json"

# 3. Locate implementation
find ./src -name "*.ts" -o -name "*.tsx"
find ./app -name "*.ts" -o -name "*.tsx"
```

### Phase 2: PRD Parsing

Extract from PRD:
- **Epics/Features**: Major product capabilities
- **User Stories**: Individual requirements
- **Acceptance Criteria**: Success conditions
- **Non-Functional Requirements**: Performance, security, accessibility
- **Business Rules**: Domain constraints
- **User Personas**: Target users
- **Success Metrics**: KPIs and targets

### Phase 3: Story Analysis

For each AI Story, check:
- Links to PRD requirement
- Implementation status
- Code file mapping
- Test coverage
- Gate completion status

### Phase 4: Codebase Scanning

```bash
# Scan for implemented features
grep -r "feat:" --include="*.ts" --include="*.tsx" .
grep -r "@implements" --include="*.ts" .
grep -r "// PRD:" --include="*.ts" .

# Scan for feature flags
grep -r "FEATURE_" --include="*.ts" --include="*.env*" .

# Scan for route definitions (features exposed to users)
grep -r "router\|Route\|path:" --include="*.ts" --include="*.tsx" .

# Scan for API endpoints
grep -r "app.get\|app.post\|app.put\|app.delete" --include="*.ts" .
grep -r "export.*function\|export.*const.*=" ./src/api --include="*.ts"
```

### Phase 5: Gap Analysis

Compare three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRD REQUIREMENTS                        │
│  (What stakeholders want)                                       │
├─────────────────────────────────────────────────────────────────┤
│                         AI STORIES                              │
│  (What we planned to build)                                     │
├─────────────────────────────────────────────────────────────────┤
│                      IMPLEMENTATION                             │
│  (What we actually built)                                       │
└─────────────────────────────────────────────────────────────────┘

GAP TYPE A: PRD → Stories (Missing stories for PRD requirements)
GAP TYPE B: Stories → Code (Unimplemented stories)
GAP TYPE C: Code → Stories (Undocumented implementations)
GAP TYPE D: Code → PRD (Implementation drift from PRD)
```

---

## Output Format

### Executive Summary (`/prd quick`)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  PRD COMPLIANCE SUMMARY                                                      ║
║  {Project Name} | {Date}                                                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  OVERALL COMPLIANCE: {XX}%  {EMOJI}                                          ║
║  ████████████████████░░░░░░░░░░                                              ║
║                                                                              ║
║  ┌─────────────────┬─────────────────┬─────────────────┐                     ║
║  │ PRD Coverage    │ Story Coverage  │ Implementation  │                     ║
║  │ {XX}%           │ {XX}%           │ {XX}%           │                     ║
║  └─────────────────┴─────────────────┴─────────────────┘                     ║
║                                                                              ║
║  GAPS DETECTED:                                                              ║
║  • {X} PRD requirements without stories                                      ║
║  • {X} Stories not implemented                                               ║
║  • {X} Implementations without stories (drift)                               ║
║                                                                              ║
║  Run `/prd full` for detailed analysis                                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Full Analysis (`/prd full`)

#### 1. PRD REQUIREMENTS COVERAGE

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  PRD REQUIREMENTS COVERAGE                                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  PRD: {PRD Document Name}                                                    ║
║  Last Updated: {Date}                                                        ║
║  Total Requirements: {XX}                                                    ║
║                                                                              ║
║  COVERAGE BY EPIC                                                            ║
║  ────────────────                                                            ║
║  AUTH - Authentication & Authorization                                       ║
║  ████████████████████  100% ({X}/{X} requirements covered)                   ║
║  ✓ User registration                     Story: AUTH-BE-001  ✓ Implemented   ║
║  ✓ User login                            Story: AUTH-BE-002  ✓ Implemented   ║
║  ✓ Password reset                        Story: AUTH-BE-003  ⚠ In Progress   ║
║  ✓ Session management                    Story: AUTH-BE-004  ✓ Implemented   ║
║                                                                              ║
║  PROFILE - User Profiles                                                     ║
║  ████████████░░░░░░░░   60% ({X}/{X} requirements covered)                   ║
║  ✓ View profile                          Story: PROF-FE-001  ✓ Implemented   ║
║  ✓ Edit profile                          Story: PROF-FE-002  ✓ Implemented   ║
║  ⛔ Profile verification                 Story: MISSING       ✗ No Story     ║
║  ✓ Profile photo upload                  Story: PROF-BE-003  ○ Pending       ║
║  ⛔ Profile sharing                      Story: MISSING       ✗ No Story     ║
║                                                                              ║
║  PAYMENTS - Payment Processing                                               ║
║  ████░░░░░░░░░░░░░░░░   20% ({X}/{X} requirements covered)                   ║
║  ✓ Payment methods                       Story: PAY-BE-001   ○ Pending       ║
║  ⛔ Subscription management              Story: MISSING       ✗ No Story     ║
║  ⛔ Refund processing                    Story: MISSING       ✗ No Story     ║
║  ⛔ Invoice generation                   Story: MISSING       ✗ No Story     ║
║  ⛔ Payment history                      Story: MISSING       ✗ No Story     ║
║                                                                              ║
║  SUMMARY                                                                     ║
║  ───────                                                                     ║
║  Total PRD Requirements:    {XX}                                             ║
║  With Stories:              {XX} ({XX}%)                                     ║
║  Implemented:               {XX} ({XX}%)                                     ║
║  Missing Stories:           {XX} ({XX}%)                                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

#### 2. STORY IMPLEMENTATION STATUS

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  STORY IMPLEMENTATION STATUS                                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  IMPLEMENTATION BY WAVE                                                      ║
║  ──────────────────────                                                      ║
║                                                                              ║
║  Wave 1: Authentication                                                      ║
║  ████████████████████  100% ({X}/{X} stories implemented)                    ║
║  ✓ AUTH-BE-001  User Registration           Implemented  Gate 7 ✓           ║
║  ✓ AUTH-BE-002  User Login                  Implemented  Gate 7 ✓           ║
║  ✓ AUTH-FE-001  Login Form                  Implemented  Gate 7 ✓           ║
║                                                                              ║
║  Wave 2: User Profiles                                                       ║
║  ████████████░░░░░░░░   60% ({X}/{X} stories implemented)                    ║
║  ✓ PROF-BE-001  Profile API                 Implemented  Gate 7 ✓           ║
║  ⚠ PROF-BE-002  Profile Update              In Progress  Gate 3             ║
║  ○ PROF-FE-001  Profile Page                Pending      Gate 0             ║
║                                                                              ║
║  Wave 3: Projects                                                            ║
║  ░░░░░░░░░░░░░░░░░░░░    0% ({X}/{X} stories implemented)                    ║
║  ○ PROJ-BE-001  Project CRUD                Pending      Not Started        ║
║  ○ PROJ-BE-002  Project Search              Pending      Not Started        ║
║  ○ PROJ-FE-001  Project Dashboard           Pending      Not Started        ║
║                                                                              ║
║  IMPLEMENTATION SUMMARY                                                      ║
║  ─────────────────────                                                       ║
║  Total Stories:         {XX}                                                 ║
║  Completed:             {XX} ({XX}%)                                         ║
║  In Progress:           {XX} ({XX}%)                                         ║
║  Pending:               {XX} ({XX}%)                                         ║
║  Blocked:               {XX} ({XX}%)                                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

#### 3. GAP ANALYSIS

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GAP ANALYSIS                                                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  GAP TYPE A: PRD REQUIREMENTS WITHOUT STORIES                                ║
║  ════════════════════════════════════════════                                ║
║  These PRD requirements have no corresponding AI Stories:                    ║
║                                                                              ║
║  ⛔ HIGH PRIORITY (Core Features)                                            ║
║  1. [PRD §3.2.1] User profile verification                                   ║
║     Epic: PROFILE | Priority: P1                                             ║
║     Recommendation: Create story PROF-BE-004                                 ║
║                                                                              ║
║  2. [PRD §4.1.3] Subscription management                                     ║
║     Epic: PAYMENTS | Priority: P1                                            ║
║     Recommendation: Create story PAY-BE-002                                  ║
║                                                                              ║
║  ⚠ MEDIUM PRIORITY (Important Features)                                      ║
║  3. [PRD §3.2.5] Profile sharing                                             ║
║     Epic: PROFILE | Priority: P2                                             ║
║     Recommendation: Create story PROF-FE-003                                 ║
║                                                                              ║
║  ○ LOW PRIORITY (Nice-to-Have)                                               ║
║  4. [PRD §6.2.1] Dark mode support                                           ║
║     Epic: UI | Priority: P3                                                  ║
║     Recommendation: Defer to future wave                                     ║
║                                                                              ║
║  GAP TYPE B: STORIES NOT IMPLEMENTED                                         ║
║  ═══════════════════════════════════                                         ║
║  Stories that exist but have no implementation:                              ║
║                                                                              ║
║  1. PROF-BE-003 - Profile photo upload                                       ║
║     Status: Pending | Wave: 2 | Priority: P2                                 ║
║     Files Expected: src/features/profiles/upload.ts                          ║
║     Action: Schedule for implementation                                      ║
║                                                                              ║
║  2. PROJ-BE-001 - Project CRUD                                               ║
║     Status: Pending | Wave: 3 | Priority: P1                                 ║
║     Files Expected: src/features/projects/*.ts                               ║
║     Action: Include in next wave                                             ║
║                                                                              ║
║  GAP TYPE C: IMPLEMENTATIONS WITHOUT STORIES (DRIFT)                         ║
║  ═══════════════════════════════════════════════════                         ║
║  Code that exists but has no corresponding story:                            ║
║                                                                              ║
║  ⚠ 1. src/features/analytics/tracking.ts                                     ║
║     Appears to implement: User analytics tracking                            ║
║     PRD Reference: Not found                                                 ║
║     Action: Create retroactive story or remove if not needed                 ║
║                                                                              ║
║  ⚠ 2. src/api/webhooks/stripe.ts                                             ║
║     Appears to implement: Stripe webhook handler                             ║
║     PRD Reference: §4.1 (Payments) - partial                                 ║
║     Action: Create story PAY-BE-010 to document                              ║
║                                                                              ║
║  GAP TYPE D: IMPLEMENTATION DRIFT FROM PRD                                   ║
║  ═════════════════════════════════════════                                   ║
║  Implementations that deviate from PRD specifications:                       ║
║                                                                              ║
║  ⚠ 1. Password requirements                                                  ║
║     PRD Spec: Minimum 12 characters, special chars required                  ║
║     Actual: Minimum 8 characters, no special char requirement                ║
║     Story: AUTH-BE-001 | File: src/features/auth/validation.ts:45            ║
║     Action: Update implementation to match PRD                               ║
║                                                                              ║
║  ⚠ 2. Session timeout                                                        ║
║     PRD Spec: 30 minutes of inactivity                                       ║
║     Actual: 7 days fixed expiry                                              ║
║     Story: AUTH-BE-004 | File: src/lib/session.ts:12                         ║
║     Action: Clarify with PM - update PRD or implementation                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

#### 4. MISSING STORIES GENERATOR

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  RECOMMENDED NEW STORIES                                                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Based on gap analysis, create these stories:                                ║
║                                                                              ║
║  PRIORITY 1 (Create Immediately)                                             ║
║  ═══════════════════════════════                                             ║
║                                                                              ║
║  📝 Story: PROF-BE-004                                                       ║
║  ──────────────────────                                                      ║
║  Title: User Profile Verification                                            ║
║  Epic: PROFILE                                                               ║
║  Type: Backend                                                               ║
║  PRD Reference: §3.2.1                                                       ║
║  Suggested ACs:                                                              ║
║  - AC1: User can submit verification documents                               ║
║  - AC2: Admin can review and approve/reject verification                     ║
║  - AC3: User receives notification of verification status                    ║
║                                                                              ║
║  Command to create:                                                          ║
║  /story-create "PROFILE BE User Profile Verification"                        ║
║                                                                              ║
║  📝 Story: PAY-BE-002                                                        ║
║  ──────────────────────                                                      ║
║  Title: Subscription Management                                              ║
║  Epic: PAYMENTS                                                              ║
║  Type: Backend                                                               ║
║  PRD Reference: §4.1.3                                                       ║
║  Suggested ACs:                                                              ║
║  - AC1: User can view current subscription                                   ║
║  - AC2: User can upgrade/downgrade subscription                              ║
║  - AC3: User can cancel subscription                                         ║
║  - AC4: System handles proration correctly                                   ║
║                                                                              ║
║  Command to create:                                                          ║
║  /story-create "PAYMENTS BE Subscription Management"                         ║
║                                                                              ║
║  PRIORITY 2 (Schedule for Next Wave)                                         ║
║  ═══════════════════════════════════                                         ║
║                                                                              ║
║  📝 Story: PROF-FE-003 - Profile Sharing                                     ║
║  📝 Story: PAY-BE-003 - Refund Processing                                    ║
║  📝 Story: PAY-BE-004 - Invoice Generation                                   ║
║                                                                              ║
║  TOTAL: {X} stories recommended                                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

#### 5. COMPLIANCE REPORT (`/prd report`)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  PRD COMPLIANCE REPORT                                                       ║
║  Generated: {Date} | Project: {Name} | Version: {X.X}                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  EXECUTIVE SUMMARY                                                           ║
║  ═════════════════                                                           ║
║  Overall PRD Compliance: {XX}%                                               ║
║  Requirements Covered: {XX}/{XX}                                             ║
║  Stories Implemented: {XX}/{XX}                                              ║
║  Drift Detected: {X} items                                                   ║
║                                                                              ║
║  COMPLIANCE BY EPIC                                                          ║
║  ═════════════════                                                           ║
║  │ Epic          │ PRD Reqs │ Stories │ Implemented │ Compliance │           ║
║  ├───────────────┼──────────┼─────────┼─────────────┼────────────┤           ║
║  │ AUTH          │    8     │    8    │      8      │   100%     │           ║
║  │ PROFILE       │   10     │    6    │      4      │    40%     │           ║
║  │ PROJECTS      │   15     │   12    │      0      │     0%     │           ║
║  │ PAYMENTS      │   12     │    3    │      1      │     8%     │           ║
║  │ MESSAGING     │    8     │    0    │      0      │     0%     │           ║
║  ├───────────────┼──────────┼─────────┼─────────────┼────────────┤           ║
║  │ TOTAL         │   53     │   29    │     13      │    25%     │           ║
║                                                                              ║
║  RISK ASSESSMENT                                                             ║
║  ═══════════════                                                             ║
║  🔴 HIGH RISK: PAYMENTS epic at 8% - critical for revenue                    ║
║  🔴 HIGH RISK: MESSAGING epic at 0% - required for MVP                       ║
║  🟡 MEDIUM: PROJECTS epic not started - Wave 3 dependency                    ║
║                                                                              ║
║  RECOMMENDATIONS                                                             ║
║  ═══════════════                                                             ║
║  1. Prioritize PAYMENTS stories for next wave                                ║
║  2. Create missing stories for MESSAGING epic                                ║
║  3. Address 2 implementation drift issues in AUTH                            ║
║  4. Schedule PROFILE verification story                                      ║
║                                                                              ║
║  SIGN-OFF                                                                    ║
║  ════════                                                                    ║
║  □ CTO Review Required                                                       ║
║  □ PM Acknowledgment Required                                                ║
║  □ Stakeholder Update Required                                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## PRD Document Format

The command expects PRD documents with these sections:

```markdown
# Product Requirements Document

## 1. Overview
- Product vision
- Success metrics

## 2. User Personas
- Persona definitions

## 3. Functional Requirements
### 3.1 Epic: AUTH
#### 3.1.1 User Registration
- Requirement details
- Acceptance criteria

### 3.2 Epic: PROFILE
#### 3.2.1 View Profile
...

## 4. Non-Functional Requirements
### 4.1 Performance
### 4.2 Security
### 4.3 Accessibility

## 5. Business Rules

## 6. Future Considerations
```

---

## Configuration

Create `.claude/prd-config.json` to customize:

```json
{
  "prdPaths": [
    "docs/PRD.md",
    "planning/requirements/*.md"
  ],
  "storyPaths": [
    "stories/**/*.json",
    "planning/stories/**/*.json"
  ],
  "epicMapping": {
    "AUTH": "Authentication",
    "PROF": "Profile",
    "PROJ": "Projects",
    "PAY": "Payments",
    "MSG": "Messaging"
  },
  "complianceThresholds": {
    "minimum": 70,
    "target": 90,
    "critical": 50
  },
  "ignorePaths": [
    "src/test/**",
    "src/**/*.test.ts"
  ]
}
```

---

## Research Validation

### Sources

1. **IEEE 830 - Software Requirements Specification**
   - URL: https://standards.ieee.org/standard/830-1998.html
   - Type: industry-standard
   - Credibility: high
   - Key Insights:
     - Requirements should be complete, consistent, verifiable
     - Traceability matrix essential for compliance
     - Requirements should be uniquely identifiable

2. **BABOK Guide (Business Analysis Body of Knowledge)**
   - URL: https://www.iiba.org/babok-guide/
   - Type: industry-standard
   - Credibility: high
   - Key Insights:
     - Requirements lifecycle management
     - Traceability and coverage analysis
     - Gap analysis techniques

3. **Agile Alliance - User Stories**
   - URL: https://www.agilealliance.org/glossary/user-stories/
   - Type: best-practice-guide
   - Credibility: high
   - Key Insights:
     - INVEST criteria for stories
     - Story mapping to requirements
     - Acceptance criteria patterns

4. **Requirements Traceability Matrix (RTM)**
   - URL: https://www.pmi.org/
   - Type: industry-standard
   - Credibility: high
   - Key Insights:
     - Bidirectional traceability
     - Forward and backward tracking
     - Coverage metrics

---

## Integration

- **Uses:** `/gap-analysis`, `/trace`, `/story-audit`, `/schema-validate`
- **Triggers:** Can trigger `/story-create` for missing stories
- **Outputs:**
  - Compliance report (Markdown)
  - Missing stories list
  - Drift detection report
  - Traceability matrix

---

## Example Usage

```bash
# Full PRD compliance analysis
/prd

# Quick compliance check
/prd quick

# Focus on specific analysis
/prd gaps           # PRD vs Implementation gaps
/prd stories        # Story coverage analysis
/prd missing        # Find missing stories
/prd coverage       # Code-to-requirements trace
/prd drift          # Detect implementation drift

# Generate formal report
/prd report         # Full compliance report

# Aliases
/prd-check
/requirements
/compliance
```

---

## Workflow Integration

### Before Wave Planning
```bash
/prd gaps           # Identify what's missing
/prd missing        # Get list of stories to create
/story-create ...   # Create missing stories
```

### After Wave Completion
```bash
/prd full           # Full compliance check
/prd drift          # Check for drift
/prd report         # Generate stakeholder report
```

### Quarterly Review
```bash
/prd report         # Formal compliance report
/cto roadmap        # Strategic recommendations
```

---

*Command Version: 1.0*
*Last Updated: 2026-02-03*
