# Schema Validate: AI Story Schema V4.1 Validation

Validate stories against the Schema V4.1 specification.

## Arguments
- `$ARGUMENTS` - Scope: "all", "wave {N}", or Story ID

## Purpose
Ensure all stories comply with Schema V4.1 including research validation requirements.

## Schema V4.1 Requirements

### Required Fields (21)
```json
{
  "id": "EPIC-TYPE-NNN pattern",
  "title": "5-100 characters",
  "epic": "Parent epic name",
  "wave": "Integer >= 1",
  "priority": "P0|P1|P2|P3",
  "storyPoints": "1|2|3|5|8|13|21 (Fibonacci)",
  "agent": "be-dev|fe-dev|pm|qa|cto",
  "domain": "auth|profiles|projects|...",
  "dal": "DAL-A|DAL-B|DAL-C|DAL-D|DAL-E",
  "description": "Min 20 characters",
  "contracts": "Array of contract paths",
  "ownedPaths": "Array of owned file paths",
  "acceptanceCriteria": "Min 3 ACs in EARS format",
  "technicalNotes": "Array of implementation notes",
  "dependencies": "Array of story IDs (soft)",
  "blockedBy": "Array of story IDs (hard)",
  "securityRequirements": "Security config object",
  "testStrategy": "Testing config object",
  "rollbackPlan": "Rollback config object",
  "researchValidation": "Research sources object",
  "createdAt": "ISO date",
  "status": "draft|pending|in_progress|..."
}
```

### Acceptance Criteria Format (EARS)
```
Pattern: "WHEN {trigger} THEN {behavior}"

Valid Examples:
✓ "WHEN user submits valid login form THEN redirect to dashboard"
✓ "WHEN password is less than 8 characters THEN display error AUTH_003"
✓ "WHEN API request exceeds rate limit THEN return 429 status"

Invalid Examples:
✗ "User should be able to login" (no WHEN/THEN)
✗ "WHEN user logs in" (missing THEN)
✗ "Display error message" (no WHEN/THEN)
```

### Research Validation (V4.1 Addition)
```json
{
  "researchValidation": {
    "status": "pending|in_progress|validated|rejected",
    "completedAt": "ISO datetime or null",
    "validatedBy": "agent name",
    "sources": [
      {
        "topic": "Required",
        "url": "Valid URL",
        "type": "official-documentation|industry-standard|...",
        "credibility": "high|medium|low",
        "keyInsights": ["At least 1 insight"],
        "appliedToAC": ["AC1", "AC2"]
      }
    ],
    "industryStandards": [...],
    "localRegulations": [...]
  }
}
```

## Validation Checks

### Structure Validation
```
□ Valid JSON syntax
□ $schema reference present
□ All 21 required fields present
□ Field types correct
□ Enum values valid
```

### ID Pattern Validation
```
□ Story ID: ^[A-Z]+-[A-Z]+-\d{3}$
□ AC IDs: ^AC\d+$
□ Dependency IDs match pattern
```

### EARS Format Validation
```
□ All ACs match: ^WHEN\s+.+\s+THEN\s+.+$
□ Trigger is specific
□ Behavior is measurable
```

### Research Validation (V4.1)
```
□ researchValidation object present
□ At least 1 source with high credibility
□ Every AC has research backing
□ Industry standards documented (if applicable)
```

### Cross-Reference Validation
```
□ Contracts exist at referenced paths
□ Dependencies reference valid story IDs
□ Agent matches domain ownership
```

## Execution

1. Load schema from `planning/schemas/story-schema.json`
2. Find all story files in scope
3. Validate each story against schema
4. Check EARS format for all ACs
5. Validate research sources
6. Report results

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  SCHEMA V4.1 VALIDATION: {scope}                                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  VALIDATION SUMMARY                                                          ║
║  ──────────────────                                                          ║
║  Stories Scanned: {N}                                                        ║
║  Valid: {N}                                                                  ║
║  Invalid: {N}                                                                ║
║  Warnings: {N}                                                               ║
║                                                                              ║
║  DETAILED RESULTS                                                            ║
║  ────────────────                                                            ║
║                                                                              ║
║  AUTH-BE-001: ✓ VALID                                                        ║
║  ├── Structure: ✓ All 21 fields present                                      ║
║  ├── EARS Format: ✓ 9/9 ACs valid                                            ║
║  ├── Research: ✓ 5 sources, all ACs covered                                  ║
║  └── Cross-refs: ✓ Contracts exist                                           ║
║                                                                              ║
║  AUTH-BE-002: ⚠ VALID WITH WARNINGS                                          ║
║  ├── Structure: ✓ All fields present                                         ║
║  ├── EARS Format: ✓ 8/8 ACs valid                                            ║
║  ├── Research: ⚠ AC7 has no source coverage                                  ║
║  └── Cross-refs: ✓ Valid                                                     ║
║                                                                              ║
║  AUTH-BE-003: ✗ INVALID                                                      ║
║  ├── Structure: ✗ Missing 'rollbackPlan'                                     ║
║  ├── EARS Format: ✗ AC4 missing THEN clause                                  ║
║  ├── Research: ✗ No sources documented                                       ║
║  └── Cross-refs: ✓ Valid                                                     ║
║                                                                              ║
║  EARS VIOLATIONS                                                             ║
║  ───────────────                                                             ║
║  AUTH-BE-003/AC4: "WHEN user uploads license"                                ║
║                   Missing THEN clause                                        ║
║                   Suggested: "WHEN user uploads license THEN ..."            ║
║                                                                              ║
║  MISSING RESEARCH                                                            ║
║  ────────────────                                                            ║
║  AUTH-BE-002/AC7: No source covers this AC                                   ║
║  AUTH-BE-003: No research validation section                                 ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: {N}/{N} VALID | {N} warnings                                        ║
║  Action: Fix invalid stories before Gate 0                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
