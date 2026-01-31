# /qa - QA Validation Checklist Runner

**Priority:** P0 (CRITICAL)
**Recommended Model:** Haiku
**Aliases:** /test-qa

## Purpose

Execute QA validation checklist against a deployment (preview or production). Load test cases from checklist files, run each validation, and generate a pass/fail report.

## When to Run

- After PR creation, before merge approval
- After deployment to preview
- Before production release
- On-demand for regression testing

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `url` | Preview/deployment URL | Auto-detect from Vercel |
| `checklist` | Path to checklist file | `.claude/QA-WAVE1-CHECKLIST.md` |
| `--wave <n>` | Wave number | Current active wave |
| `--report` | Generate detailed report | true |

## Execution Steps

### 1. Load Checklist
```
Read checklist from: .claude/QA-WAVE1-CHECKLIST.md
Parse test cases into structured format
```

### 2. Detect Preview URL
If URL not provided:
```bash
gh pr view --json url,statusCheckRollup | jq '.statusCheckRollup[] | select(.name=="Vercel") | .targetUrl'
```

### 3. Execute Test Cases

For each test case in checklist:

**UI Tests (WebFetch):**
- Fetch page content
- Check for expected elements
- Validate Hebrew text present
- Check RTL layout markers

**API Tests (if applicable):**
- Check response status codes
- Validate response headers (rate limit headers)
- Check error handling

### 4. Generate Report

## Output Format

```
QA Validation Report
====================
Wave: 1
URL: https://footprint-xxx.vercel.app
Date: 2026-01-29
Checklist: .claude/QA-WAVE1-CHECKLIST.md

FUNCTIONAL TESTING
------------------
[PASS] FE-001: File upload validation errors shown
[PASS] FE-002: 9 styles visible on style page
[PASS] FE-002: Style badges rendering (new/popular)
[FAIL] UP-04: File size > 20MB - no error shown

SECURITY TESTING
----------------
[PASS] SEC-HIGH-01: Rate limit headers present
[PASS] SEC-HIGH-02: Admin routes return 401 for non-admin

UI/UX TESTING
-------------
[PASS] Hebrew RTL layout correct
[PASS] Mobile responsive at 375px
[PASS] Navigation flow works

SUMMARY
-------
Passed: 8/9
Failed: 1
Blocked: 0

BLOCKERS:
- UP-04: Silent failure on oversized files (20MB+)

RECOMMENDATION: FIX BLOCKERS BEFORE MERGE
```

## Test Case Categories

### From QA-WAVE1-CHECKLIST.md:
1. **File Upload Validation** (FE-001)
   - Invalid file type error toast
   - Oversized file error toast
   - Valid upload success

2. **Style Selection** (FE-002)
   - 9 styles visible
   - New styles present (pop_art, vintage, romantic)
   - Badges rendered
   - Selection works

3. **Rate Limiting** (SEC-HIGH-01)
   - Rate limit headers in response
   - 429 handling on rapid requests

4. **General UI/UX**
   - Hebrew RTL layout
   - Mobile responsive
   - Navigation flow

## Failure Handling

On test failures:
1. Log specific failure details
2. Continue running remaining tests
3. Generate complete report
4. Provide `RECOMMENDATION` based on severity:
   - **APPROVE** - All critical tests pass
   - **REJECT** - Blocking issues found
   - **CONDITIONAL** - Minor issues, can merge with follow-up

## Integration

- Reads: `.claude/QA-WAVE1-CHECKLIST.md`
- Reads: `.claude/QA-INSTRUCTIONS-HAIKU.md`
- Uses: WebFetch for URL testing
- Outputs: Report to stdout

## Evidence Sources

- Checklist: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/QA-WAVE1-CHECKLIST.md`
- Instructions: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/QA-INSTRUCTIONS-HAIKU.md`
- Spec: `/Volumes/SSD-01/Projects/Footprint/footprint/.claude/SKILLS-RECOMMENDATION.md` (Section 3.2)
