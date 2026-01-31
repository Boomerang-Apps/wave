# Validate Research - Schema V4.1 Research Validation

Validate that a story has proper research validation per Schema V4.1 requirements.

## Arguments
- `$ARGUMENTS` - Story ID (e.g., AUTH-BE-001)

## Validation Checks

1. **Research Status**: Must be "validated"
2. **Sources Present**: At least 1 credible source required
3. **Source Structure** (for each source):
   - topic: Descriptive topic name
   - url: Valid URL to credible source
   - type: One of (official-documentation, industry-standard, academic-paper, best-practice-guide, security-advisory, government-regulation, framework-documentation)
   - credibility: high, medium, or low
   - keyInsights: Array of findings (min 1)
   - appliedToAC: Array of AC IDs this research applies to

4. **Industry Standards**: Check if applicable standards documented
   - OWASP for security
   - WCAG for accessibility
   - ISO for data handling

5. **Local Regulations**: Check if applicable
   - Israeli Privacy Protection Law for user data
   - Payment regulations for financial features

6. **AC Coverage**: Every AC should have research backing

## Execution

1. Read story file from `stories/wave{N}/{STORY-ID}.json`
2. Extract `researchValidation` section
3. Run all validation checks
4. Report any missing or invalid research
5. Suggest sources if research is incomplete

## Output

```
RESEARCH VALIDATION: AUTH-BE-001
================================

Status: validated ✓

Sources (5):
✓ Supabase Authentication Architecture (high credibility)
  → Applied to: AC1, AC9
✓ Supabase Row Level Security (high credibility)
  → Applied to: AC5, AC6, AC7
...

Industry Standards:
✓ OWASP Authentication Cheat Sheet (full compliance)
✓ OWASP Session Management (full compliance)

Local Regulations:
✓ Israeli Privacy Protection Law (full compliance)

AC Coverage:
✓ AC1: Covered by 2 sources
✓ AC2: Covered by 1 source
...

RESULT: PASS - All research validation requirements met
```
