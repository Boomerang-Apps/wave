# Story Create: Create a New Story

Create a new story following Schema V4.1 with research validation.

## Arguments
- `$ARGUMENTS` - Story details: "{ID} {TITLE}" (e.g., "AUTH-BE-006 Session Management")

## Purpose
Create a properly formatted story file with all required fields.

## Execution

### 1. Parse Arguments
Extract story ID and title from `$ARGUMENTS`.

### 2. Determine Metadata
From the story ID pattern `{EPIC}-{TYPE}-{NUM}`:
- **EPIC**: Domain (AUTH, PROF, PROJ, PAY, etc.)
- **TYPE**: Agent type (BE=backend, FE=frontend, INT=integration)
- **NUM**: Story number

### 3. Interactive Prompts (if needed)
Ask user for:
- Wave number (1-N)
- Priority (P0, P1, P2, P3)
- Story points (1, 2, 3, 5, 8, 13, 21)
- Description
- Owned paths

### 4. Generate Story File

```json
{
  "$schema": "../../../planning/schemas/story-schema.json",
  "id": "{STORY-ID}",
  "title": "{TITLE}",
  "epic": "{EPIC}",
  "wave": {N},
  "priority": "{P0-P3}",
  "storyPoints": {fibonacci},
  "agent": "{be-dev|fe-dev|qa|pm}",
  "domain": "{domain}",
  "dal": "DAL-{A-E}",
  "description": "{description}",
  "contracts": [],
  "ownedPaths": [],
  "acceptanceCriteria": [
    {
      "id": "AC1",
      "ears": "WHEN {trigger} THEN {behavior}",
      "threshold": null,
      "testable": true,
      "verificationMethod": "unit-test",
      "testCaseId": null
    }
  ],
  "technicalNotes": [],
  "dependencies": [],
  "blockedBy": [],
  "securityRequirements": {
    "authentication": false,
    "authorization": [],
    "dataClassification": "internal",
    "inputValidation": true,
    "auditLogging": false
  },
  "testStrategy": {
    "unitTests": true,
    "integrationTests": false,
    "e2eTests": false,
    "coverageTarget": 70,
    "performanceTests": false,
    "securityTests": false
  },
  "rollbackPlan": {
    "canRollback": true,
    "rollbackSteps": [],
    "dataImpact": "none"
  },
  "researchValidation": {
    "status": "pending",
    "completedAt": null,
    "validatedBy": null,
    "sources": [],
    "industryStandards": [],
    "localRegulations": []
  },
  "createdAt": "{today}",
  "status": "draft",
  "completedAt": null,
  "verifiedAt": null,
  "validatedAt": null
}
```

### 5. Save File
Save to `stories/wave{N}/{STORY-ID}.json`

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  STORY CREATED                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ID: {STORY-ID}                                                              ║
║  Title: {title}                                                              ║
║  Wave: {N}                                                                   ║
║  Agent: {agent}                                                              ║
║  Domain: {domain}                                                            ║
║  DAL: {DAL level}                                                            ║
║                                                                              ║
║  File: stories/wave{N}/{STORY-ID}.json                                       ║
║                                                                              ║
║  Next steps:                                                                 ║
║    1. Add acceptance criteria (EARS format)                                  ║
║    2. Define owned paths                                                     ║
║    3. Add contracts references                                               ║
║    4. Run /research {STORY-ID} for research validation                       ║
║    5. Run /gate-0 {STORY-ID} for pre-flight check                            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
