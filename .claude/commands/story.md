# /story - Story Execution Workflow

**Tier:** 1 (Core Command)
**Priority:** P1 (HIGH)
**Recommended Model:** Sonnet (implementation), Opus (complex logic)
**Aliases:** /s

## Purpose

Load and execute a story from definition to completion. Manages the full TDD workflow: parse acceptance criteria, create feature branch, write tests, implement, validate, and track progress.

## When to Run

- When assigned a story to implement
- Starting work on a new feature
- Resuming work on an in-progress story

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `story-id` | Story identifier (required) | - |
| `--resume` | Resume in-progress story | false |
| `--status` | Show story status only | false |
| `--complete` | Mark story as complete | false |

## Story Sources

### 1. Local Files
```
stories/
├── wave1/
│   ├── WAVE1-FE-001.json
│   ├── WAVE1-FE-002.json
│   └── ...
└── wave2/
    └── ...
```

### 2. Supabase (if configured)
```sql
SELECT * FROM stories WHERE id = 'WAVE1-FE-001'
```

## Story Format (JSON)

```json
{
  "id": "WAVE1-FE-001",
  "title": "Photo Upload Flow",
  "domain": "frontend",
  "wave": 1,
  "priority": "P0",
  "status": "pending",
  "acceptance_criteria": [
    {
      "id": "AC-001",
      "description": "User can upload from gallery",
      "status": "pending"
    },
    {
      "id": "AC-002",
      "description": "User can capture from camera",
      "status": "pending"
    }
  ],
  "technical_notes": "Use react-dropzone for file handling",
  "dependencies": [],
  "assigned_to": "fe-dev-1"
}
```

## Execution Workflow

### Phase 1: Setup
```
1. Load story definition
2. Validate story exists and is assigned
3. Check dependencies are complete
4. Create feature branch: wave1/WAVE1-FE-001
5. Initialize TDD mode
```

### Phase 2: RED (Write Failing Tests)
```
1. Parse acceptance criteria
2. Generate test cases for each AC
3. Write test files
4. Run tests - verify they FAIL
5. Commit: "test(WAVE1-FE-001): Add failing tests for AC-001"
```

### Phase 3: GREEN (Implement)
```
1. Implement minimum code to pass tests
2. Run tests after each change
3. Continue until all tests pass
4. Commit: "feat(WAVE1-FE-001): Implement AC-001"
```

### Phase 4: REFACTOR
```
1. Review code for improvements
2. Refactor without changing behavior
3. Ensure tests still pass
4. Commit: "refactor(WAVE1-FE-001): Clean up implementation"
```

### Phase 5: Validation
```
1. Run full test suite
2. Run type-check
3. Run linter
4. Run build
5. Mark ACs as complete
6. Update story status
```

## Output Format

### Story Load
```
Story Loaded: WAVE1-FE-001
==========================
Title: Photo Upload Flow
Domain: frontend
Wave: 1
Priority: P0
Status: pending

Acceptance Criteria:
- [ ] AC-001: User can upload from gallery
- [ ] AC-002: User can capture from camera
- [ ] AC-003: Preview shown after upload
- [ ] AC-004: File size validation (max 20MB)
- [ ] AC-005: File type validation (JPG, PNG, HEIC)

Dependencies: None
Technical Notes: Use react-dropzone for file handling

Branch Created: wave1/WAVE1-FE-001
TDD Mode: ACTIVE

Starting RED phase...
```

### Progress Update
```
Story Progress: WAVE1-FE-001
============================
Phase: GREEN (Implementation)

Acceptance Criteria:
- [x] AC-001: User can upload from gallery
- [x] AC-002: User can capture from camera
- [ ] AC-003: Preview shown after upload (IN PROGRESS)
- [ ] AC-004: File size validation
- [ ] AC-005: File type validation

Progress: 2/5 (40%)
Tests: 12 passing, 8 failing
Time Elapsed: 45 minutes
Tokens Used: 23,450 / 100,000
```

### Story Complete
```
Story Complete: WAVE1-FE-001
============================
Title: Photo Upload Flow
Duration: 2 hours 15 minutes

Acceptance Criteria: 5/5 COMPLETE
- [x] AC-001: User can upload from gallery
- [x] AC-002: User can capture from camera
- [x] AC-003: Preview shown after upload
- [x] AC-004: File size validation
- [x] AC-005: File type validation

Tests: 20 passing
Coverage: 85%
Tokens Used: 45,230 / 100,000

Commits: 8
Files Changed: 12

Next Steps:
1. Run /pr to create pull request
2. Request code review
3. Address review feedback
```

## TDD Enforcement

### Test-First Requirement
```
[ERROR] No test file found for AC-001

TDD MODE requires writing tests first.
Create test file: __tests__/upload.test.tsx

Example:
describe('Photo Upload', () => {
  it('should allow upload from gallery', () => {
    // Test implementation
  });
});
```

### Test Coverage Minimum
```yaml
minimum_coverage: 80%
```

If below threshold:
```
[WARNING] Coverage at 72% (minimum: 80%)
Add more tests before completing story.
```

## Story State Management

States: `pending` → `in_progress` → `review` → `complete`

Updates stored in:
- Local: `stories/wave1/WAVE1-FE-001.json`
- P.json: `wave_state.current_story`
- Supabase: `stories` table (if configured)

## Integration

- Uses: `/preflight` before starting
- Uses: `/commit` for commits
- Uses: `/pr` on completion
- Uses: `/rlm` for budget tracking
- Updates: `P.json` story state

## Evidence Sources

- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.3)
- Stories: `/Volumes/SSD-01/Projects/Footprint/footprint/stories/`
- TDD: Test-Driven Development methodology
