# /safety - Constitutional AI Check

**Priority:** P2 (MEDIUM)
**Recommended Model:** Haiku
**Aliases:** /constitutional, /sec

## Purpose

Scan code changes against Constitutional AI safety principles (DO-178C probes). Flags potential violations and calculates safety score before commits to sensitive areas.

## When to Run

- Before commits touching auth, payments, or security
- After implementing sensitive features
- During code review
- When safety score needed

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `<files>` | Files to check | Staged changes |
| `--strict` | Fail on any warning | false |
| `--score-only` | Only show score | false |
| `--principles` | List all principles | false |

## Safety Principles (DO-178C Probes)

| ID | Principle | Description |
|----|-----------|-------------|
| P001 | No Hardcoded Secrets | API keys, passwords must use env vars |
| P002 | Auth Verification | All protected routes verify auth |
| P003 | Input Validation | User input sanitized before use |
| P004 | SQL Injection Prevention | Parameterized queries only |
| P005 | XSS Prevention | Output encoding for user content |
| P006 | Rate Limiting | API endpoints have rate limits |

## Execution

### Scan Staged Changes
```bash
# Get staged files
git diff --cached --name-only

# Run constitutional checker
python -c "
from src.safety.constitutional import ConstitutionalChecker
checker = ConstitutionalChecker()
result = checker.check_files(['file1.ts', 'file2.ts'])
print(result)
"
```

### Pattern Checks

#### P001: Hardcoded Secrets
```regex
(api[_-]?key|password|secret|token)\s*[:=]\s*['"][^'"]+['"]
```

#### P002: Auth Verification
```regex
# Routes without auth check
export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE).*
# Should have: getUser() or verifyAuth()
```

#### P003: Input Validation
```regex
# Direct use of request body/params without validation
request\.(body|query|params)\.[a-z]+
# Without: zod, yup, or validation function
```

#### P004: SQL Injection
```regex
# String concatenation in queries
\.(query|execute)\s*\(\s*[`'"].*\$\{
```

#### P005: XSS Prevention
```regex
# dangerouslySetInnerHTML without sanitization
dangerouslySetInnerHTML.*\{.*__html:
```

#### P006: Rate Limiting
```regex
# API routes without checkRateLimit
export\s+async\s+function\s+(GET|POST)(?!.*checkRateLimit)
```

## Output Format

### Clean Scan
```
Constitutional AI Safety Check
==============================
Files Scanned: 5
Principles Checked: 6

Results:
[✓] P001: No hardcoded secrets
[✓] P002: Auth verification present
[✓] P003: Input validation present
[✓] P004: Parameterized queries used
[✓] P005: No unsafe HTML injection
[✓] P006: Rate limiting implemented

Safety Score: 1.00 (threshold: 0.85)
Status: PASS
```

### With Violations
```
Constitutional AI Safety Check
==============================
Files Scanned: 5
Principles Checked: 6

Results:
[✓] P001: No hardcoded secrets
[✗] P002: Auth verification MISSING
    File: app/api/admin/users/route.ts:15
    Issue: POST handler lacks auth check
    Fix: Add verifyAdmin() or getUser() check

[✓] P003: Input validation present
[✓] P004: Parameterized queries used
[!] P005: Potential XSS risk
    File: src/components/Comment.tsx:28
    Issue: dangerouslySetInnerHTML used
    Fix: Sanitize with DOMPurify before rendering

[✓] P006: Rate limiting implemented

Violations: 1 critical, 1 warning

Safety Score: 0.72 (threshold: 0.85)
Status: FAIL

ACTION REQUIRED:
Fix critical violations before commit.
Run /escalate if unable to resolve.
```

### Score Only
```bash
/safety --score-only
```

Output:
```
Safety Score: 0.92
```

### List Principles
```bash
/safety --principles
```

Output:
```
WAVE Safety Principles (DO-178C)
================================

P001: No Hardcoded Secrets
  Severity: CRITICAL
  Check: API keys, passwords, tokens in code

P002: Auth Verification
  Severity: CRITICAL
  Check: Protected routes verify authentication

P003: Input Validation
  Severity: HIGH
  Check: User input sanitized before processing

P004: SQL Injection Prevention
  Severity: CRITICAL
  Check: No string concatenation in queries

P005: XSS Prevention
  Severity: HIGH
  Check: User content encoded before rendering

P006: Rate Limiting
  Severity: MEDIUM
  Check: API endpoints have rate limits

Threshold: 0.85 (must pass 85% of weighted checks)
```

## Scoring Algorithm

```python
weights = {
    "P001": 1.0,  # Critical
    "P002": 1.0,  # Critical
    "P003": 0.8,  # High
    "P004": 1.0,  # Critical
    "P005": 0.8,  # High
    "P006": 0.6,  # Medium
}

score = sum(passed[p] * weights[p] for p in principles) / sum(weights.values())
```

## Integration

- Used by: `/commit` (pre-commit for sensitive files)
- Used by: `/escalate` (on score < 0.85)
- Reads: `src/safety/constitutional.py`
- Threshold: 0.85 minimum score

## Evidence Sources

- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.9)
- Checker: `src/safety/constitutional.py`
- Principles: DO-178C aviation safety standard adapted
