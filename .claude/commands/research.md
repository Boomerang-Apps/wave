# Research: Validate Story Research (PFC-K)

Perform Gate 0 PFC-K Research Validation.

## Arguments
- `$ARGUMENTS` - Scope: "story {ID}", "wave {N}", or "all"

## Purpose
Research and document credible sources for story acceptance criteria.

## Execution by Scope

### `story {ID}` - Single Story Validation
1. Load story file
2. Research each AC
3. Document sources
4. Update story's researchValidation field

### `wave {N}` - Wave-wide Validation
1. Load all stories in wave
2. Check research status for each
3. Identify gaps
4. Generate validation report

### `all` - Project-wide Validation
1. Scan all waves
2. Aggregate research status
3. Identify stories missing research
4. Calculate coverage metrics

## Research Requirements

### Source Types (by credibility)
```
HIGH CREDIBILITY:
├── official-documentation  # Vendor/framework official docs
├── industry-standard       # OWASP, ISO, IEEE, WCAG
├── government-regulation   # GDPR, PCI-DSS, HIPAA
└── academic-paper          # Peer-reviewed research

MEDIUM CREDIBILITY:
├── best-practice-guide     # Industry guides, whitepapers
├── security-advisory       # CVEs, security bulletins
└── framework-documentation # Community frameworks

LOW CREDIBILITY (use sparingly):
├── blog-post               # Technical blogs
├── forum-answer            # Stack Overflow, etc.
└── tutorial                # Learning resources
```

### Domain-Specific Requirements

| Domain | Required Sources |
|--------|------------------|
| Authentication | OWASP Auth Cheat Sheet, framework auth docs |
| Authorization | OWASP Access Control, RLS documentation |
| Payments | PCI-DSS, payment provider official docs |
| Data Privacy | GDPR, local privacy laws |
| Accessibility | WCAG 2.1 AA minimum |
| API Design | OpenAPI spec, REST/GraphQL standards |
| Security | OWASP Top 10, CWE database |

### Validation Checklist
```
□ Every AC has at least one supporting source
□ At least 1 high-credibility source per story
□ Sources are from credible origins
□ Key insights documented
□ Industry standards identified (if applicable)
□ Local regulations addressed (if applicable)
□ Source URLs are accessible
□ Access dates documented
```

## Schema V4.1 Research Structure

```json
{
  "researchValidation": {
    "status": "validated",
    "completedAt": "2024-01-15T10:30:00Z",
    "validatedBy": "cto",
    "sources": [
      {
        "topic": "Password Hashing Best Practices",
        "url": "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html",
        "type": "industry-standard",
        "credibility": "high",
        "accessedAt": "2024-01-15",
        "keyInsights": [
          "Use Argon2id as preferred algorithm",
          "Minimum 15 bytes salt length",
          "Memory cost at least 19 MiB"
        ],
        "appliedToAC": ["AC2", "AC3"]
      }
    ],
    "industryStandards": [
      {
        "standard": "OWASP Top 10",
        "version": "2021",
        "url": "https://owasp.org/Top10/",
        "compliance": "full",
        "relevantSections": ["A02:2021 - Cryptographic Failures"]
      }
    ],
    "localRegulations": [
      {
        "regulation": "GDPR",
        "jurisdiction": "EU",
        "url": "https://gdpr.eu/",
        "compliance": "full"
      }
    ]
  }
}
```

## Output Format

### Story-Level: `/research story AUTH-BE-001`

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  RESEARCH VALIDATION: AUTH-BE-001                                            ║
║  User Registration Endpoint                                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  SOURCES FOUND                                                               ║
║  ─────────────                                                               ║
║  1. Password Hashing Best Practices                                          ║
║     URL: https://cheatsheetseries.owasp.org/...                              ║
║     Type: industry-standard | Credibility: high                              ║
║     Insights:                                                                ║
║       • Use Argon2id as preferred algorithm                                  ║
║       • Minimum 15 bytes salt length                                         ║
║     Applied to: AC2, AC3                                                     ║
║                                                                              ║
║  2. Supabase Auth Documentation                                              ║
║     URL: https://supabase.com/docs/guides/auth                               ║
║     Type: official-documentation | Credibility: high                         ║
║     Insights:                                                                ║
║       • GoTrue handles password hashing                                      ║
║       • Built-in email verification flow                                     ║
║     Applied to: AC1, AC4, AC5                                                ║
║                                                                              ║
║  INDUSTRY STANDARDS                                                          ║
║  ──────────────────                                                          ║
║  ✓ OWASP Authentication Cheat Sheet (full compliance)                        ║
║  ✓ OWASP Session Management (full compliance)                                ║
║                                                                              ║
║  LOCAL REGULATIONS                                                           ║
║  ─────────────────                                                           ║
║  ✓ Israeli Privacy Protection Law                                            ║
║                                                                              ║
║  AC COVERAGE                                                                 ║
║  ───────────                                                                 ║
║  AC1: ✓ 1 source    AC2: ✓ 2 sources   AC3: ✓ 2 sources                      ║
║  AC4: ✓ 1 source    AC5: ✓ 1 source    AC6: ✓ 1 source                       ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: VALIDATED | 100% AC coverage | 2 high-credibility sources           ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Wave-Level: `/research wave 1`

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  RESEARCH VALIDATION: Wave 1 - Authentication                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  VALIDATION STATUS                                                           ║
║  ─────────────────                                                           ║
║  Overall: ████████████████░░░░  82% (9/11 stories validated)                 ║
║                                                                              ║
║  STORY STATUS                                                                ║
║  ────────────                                                                ║
║  ✓ AUTH-BE-001  Validated   6/6 ACs covered   2 high-cred sources            ║
║  ✓ AUTH-BE-002  Validated   8/8 ACs covered   3 high-cred sources            ║
║  ✓ AUTH-BE-003  Validated   7/7 ACs covered   3 high-cred sources            ║
║  ✓ AUTH-BE-004  Validated   5/5 ACs covered   2 high-cred sources            ║
║  ⚠ AUTH-BE-005  Partial     4/6 ACs covered   1 high-cred source             ║
║      └── AC5, AC6 missing research backing                                   ║
║  ✓ AUTH-FE-001  Validated   5/5 ACs covered   2 high-cred sources            ║
║  ✓ AUTH-FE-002  Validated   6/6 ACs covered   2 high-cred sources            ║
║  ✓ AUTH-FE-003  Validated   5/5 ACs covered   2 high-cred sources            ║
║  ✓ AUTH-FE-004  Validated   4/4 ACs covered   1 high-cred source             ║
║  ✗ AUTH-INT-001 Missing     No research documented                           ║
║  ✗ AUTH-INT-002 Missing     No research documented                           ║
║                                                                              ║
║  COMMON SOURCES USED                                                         ║
║  ──────────────────                                                          ║
║  • OWASP Authentication Cheat Sheet (8 stories)                              ║
║  • Supabase Auth Documentation (11 stories)                                  ║
║  • OWASP Session Management (5 stories)                                      ║
║  • Israeli Privacy Protection Law (3 stories)                                ║
║                                                                              ║
║  GAPS TO ADDRESS                                                             ║
║  ───────────────                                                             ║
║  1. AUTH-BE-005: Add research for AC5 (password history), AC6 (rate limit)   ║
║  2. AUTH-INT-001: Complete research validation                               ║
║  3. AUTH-INT-002: Complete research validation                               ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: 82% VALIDATED | 3 stories need attention                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Project-Level: `/research all`

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  RESEARCH VALIDATION: All Waves                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  PROJECT SUMMARY                                                             ║
║  ───────────────                                                             ║
║  Total Stories: 62                                                           ║
║  Validated:     ████████████████░░░░  78% (48/62)                            ║
║  Partial:       ██░░░░░░░░░░░░░░░░░░   8% (5/62)                             ║
║  Missing:       ███░░░░░░░░░░░░░░░░░  14% (9/62)                             ║
║                                                                              ║
║  BY WAVE                                                                     ║
║  ───────                                                                     ║
║  Wave 1:  ████████████████░░░░  82% (9/11)                                   ║
║  Wave 2:  ████████████████████ 100% (10/10)                                  ║
║  Wave 3:  ████████████████░░░░  80% (12/15)                                  ║
║  Wave 4:  ████████████░░░░░░░░  58% (7/12)                                   ║
║  Wave 5:  ████████████████████ 100% (8/8)                                    ║
║  Wave 6:  ████░░░░░░░░░░░░░░░░  33% (2/6)                                    ║
║                                                                              ║
║  STORIES NEEDING RESEARCH                                                    ║
║  ────────────────────────                                                    ║
║  Missing (9):                                                                ║
║  └── AUTH-INT-001, AUTH-INT-002, PROJ-BE-010, PROJ-FE-005,                   ║
║      PROP-BE-003, PROP-BE-004, MSG-BE-001, MSG-BE-002, MSG-FE-001            ║
║                                                                              ║
║  Partial (5):                                                                ║
║  └── AUTH-BE-005, PROJ-BE-008, PROP-BE-001, PROP-FE-002, MSG-BE-003          ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: 78% VALIDATED | 14 stories need research attention                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
