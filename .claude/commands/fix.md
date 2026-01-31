# /fix - Research-Driven Fix Protocol

**Priority:** P1 (CRITICAL - Must run before fixing any issue)
**Aliases:** /f, /repair

## Purpose

Execute a disciplined, gate-driven approach to fixing issues. Enforces research validation, documented proof, and TDD before writing any solution code. Prevents "quick fixes" that introduce new problems.

## Arguments
- `$ARGUMENTS` - Optional: "build" | "lint" | "test" | "security" | "{file-pattern}" | "all"

---

## FIX PROTOCOL OVERVIEW

```
+----------------------------------------------------------------------------+
|                         /FIX PROTOCOL FLOW                                  |
+----------------------------------------------------------------------------+
|                                                                             |
|  PHASE 1: DETECT        Identify and categorize all issues                  |
|      |                                                                      |
|      v                                                                      |
|  PHASE 2: RESEARCH      Gate 0 PFC-K style research validation              |
|      |                  - Root cause analysis                               |
|      |                  - Document credible sources                         |
|      |                  - Verify correct solution approach                  |
|      |                                                                      |
|      v                                                                      |
|  PHASE 3: IMPACT        Analyze affected files and components               |
|      |                  - Dependency mapping                                |
|      |                  - Blast radius assessment                           |
|      |                                                                      |
|      v                                                                      |
|  PHASE 4: TDD           Test-Driven Development approach                    |
|      |                  - Write/update tests exposing the issue             |
|      |                  - Verify tests fail (RED)                           |
|      |                                                                      |
|      v                                                                      |
|  PHASE 5: IMPLEMENT     Apply minimal fix                                   |
|      |                  - Follow minimal change principle                   |
|      |                  - Stay within affected scope                        |
|      |                                                                      |
|      v                                                                      |
|  PHASE 6: VERIFY        Confirm fix works                                   |
|      |                  - Tests pass (GREEN)                                |
|      |                  - Build passes                                      |
|      |                  - No regressions                                    |
|      |                                                                      |
|      v                                                                      |
|  PHASE 7: DOCUMENT      Create rollback plan and close                      |
|                                                                             |
+----------------------------------------------------------------------------+
```

---

## PHASE 1: DETECT - Issue Identification

### 1.1 Run Detection Based on Argument

```bash
# For "build" argument
npm run build 2>&1 | grep -E "(error|Error)"

# For "lint" argument
npm run lint 2>&1

# For "test" argument
npm run test:run 2>&1 | grep -E "(FAIL|Error|failed)"

# For "security" argument
npm audit 2>&1

# For "all" or no argument
npm run build && npm run lint && npm run test:run
```

### 1.2 Categorize Each Issue

For each detected issue, classify:

| Category | Description | Severity | TDD Required |
|----------|-------------|----------|--------------|
| `type-error` | TypeScript compilation error | HIGH | Optional |
| `unused-import` | Unused import/variable (lint) | LOW | No |
| `type-import` | Type-only import syntax error | MEDIUM | No |
| `property-error` | Property does not exist | HIGH | Yes |
| `logic-bug` | Runtime logic error | CRITICAL | Yes |
| `security-vuln` | Security vulnerability | CRITICAL | Yes |
| `test-failure` | Failing test | HIGH | N/A |
| `style-violation` | Code style issue | LOW | No |

### 1.3 Output Detection Report

```
+----------------------------------------------------------------------------+
|  PHASE 1: ISSUE DETECTION                                                   |
+----------------------------------------------------------------------------+
|                                                                             |
|  SCAN TYPE: build                                                           |
|  TOTAL ISSUES: {N}                                                          |
|                                                                             |
|  BY CATEGORY                                                                |
|  -----------                                                                |
|  [CRITICAL]  0  logic-bug, security-vuln                                    |
|  [HIGH]      5  type-error, property-error                                  |
|  [MEDIUM]    3  type-import                                                 |
|  [LOW]      22  unused-import, style-violation                              |
|                                                                             |
|  BY FILE                                                                    |
|  -------                                                                    |
|  src/pages/ProjectChecklist.tsx .............. 12 issues                    |
|  src/pages/NewStory.tsx ...................... 6 issues                     |
|  src/pages/FoundationChecklist.tsx ........... 6 issues                     |
|  src/components/ReadinessCircle.tsx .......... 2 issues                     |
|  src/components/SecondarySidebar.tsx ......... 2 issues                     |
|  src/components/pages/FileOrganizationPage.tsx 1 issue                      |
|  src/contexts/ModeContext.tsx ................ 1 issue                      |
|                                                                             |
+----------------------------------------------------------------------------+
```

---

## PHASE 2: RESEARCH - Root Cause Analysis

### 2.1 Research Requirements

For each issue category, document:

```
RESEARCH CHECKLIST (per issue type):
[ ] Root cause identified
[ ] Correct solution approach documented
[ ] Source credibility verified (official docs preferred)
[ ] Pattern matches codebase conventions
[ ] No side effects identified
```

### 2.2 Source Credibility Hierarchy

```
HIGH CREDIBILITY (required for CRITICAL/HIGH):
+-- Official TypeScript documentation
+-- Framework official docs (React, Next.js, etc.)
+-- Language specification
+-- Compiler/linter documentation

MEDIUM CREDIBILITY (acceptable for MEDIUM/LOW):
+-- Stack Overflow verified answers
+-- Community best practices
+-- Popular library documentation

LOW CREDIBILITY (supplementary only):
+-- Blog posts
+-- Tutorials
+-- Forum discussions
```

### 2.3 Research Template

For each issue requiring research:

```
+----------------------------------------------------------------------------+
|  RESEARCH VALIDATION: {Issue ID}                                            |
+----------------------------------------------------------------------------+
|                                                                             |
|  ISSUE                                                                      |
|  -----                                                                      |
|  File: src/contexts/ModeContext.tsx                                         |
|  Line: 8                                                                    |
|  Error: TS1484 - 'ReactNode' is a type and must be imported using           |
|         type-only import when 'verbatimModuleSyntax' is enabled             |
|                                                                             |
|  ROOT CAUSE ANALYSIS                                                        |
|  -------------------                                                        |
|  TypeScript 5.0+ with verbatimModuleSyntax requires explicit type           |
|  imports for type-only values to ensure proper erasure at compile time.     |
|                                                                             |
|  SOLUTION APPROACH                                                          |
|  -----------------                                                          |
|  Change: import { ReactNode } from 'react'                                  |
|  To:     import type { ReactNode } from 'react'                             |
|  Or:     import { type ReactNode } from 'react'                             |
|                                                                             |
|  SOURCES                                                                    |
|  -------                                                                    |
|  1. TypeScript 5.0 Release Notes (official)                                 |
|     URL: https://devblogs.microsoft.com/typescript/typescript-5-0/          |
|     Credibility: HIGH                                                       |
|     Key Insight: verbatimModuleSyntax enforces type-only imports            |
|                                                                             |
|  2. TypeScript Handbook - Type-Only Imports (official)                      |
|     URL: https://www.typescriptlang.org/docs/handbook/modules.html          |
|     Credibility: HIGH                                                       |
|     Key Insight: Use 'import type' for types that don't exist at runtime    |
|                                                                             |
|  CODEBASE PATTERN CHECK                                                     |
|  ----------------------                                                     |
|  Searched: "import type.*from 'react'"                                      |
|  Found: 15 files already use this pattern                                   |
|  Conclusion: Solution aligns with existing codebase conventions             |
|                                                                             |
+----------------------------------------------------------------------------+
```

### 2.4 Bulk Research for Similar Issues

For issues of the same type, create a single research entry:

```
+----------------------------------------------------------------------------+
|  BULK RESEARCH: Unused Imports (22 instances)                               |
+----------------------------------------------------------------------------+
|                                                                             |
|  PATTERN                                                                    |
|  -------                                                                    |
|  Error: TS6133 - '{name}' is declared but its value is never read           |
|                                                                             |
|  ROOT CAUSE                                                                 |
|  ----------                                                                 |
|  Imports were added but functionality using them was removed or             |
|  never implemented. TypeScript strict mode flags these as errors.           |
|                                                                             |
|  SOLUTION                                                                   |
|  --------                                                                   |
|  Remove the unused import statement entirely.                               |
|  Verify no references exist before removal.                                 |
|                                                                             |
|  SIDE EFFECTS                                                               |
|  ------------                                                               |
|  None - removing unused code has no runtime impact.                         |
|                                                                             |
|  TDD REQUIRED: No (lint cleanup, no behavior change)                        |
|                                                                             |
+----------------------------------------------------------------------------+
```

---

## PHASE 3: IMPACT - Blast Radius Analysis

### 3.1 Dependency Mapping

For each file to be modified:

```bash
# Find files that import the affected file
grep -r "from.*{filename}" --include="*.ts" --include="*.tsx"

# Check for re-exports
grep -r "export.*from.*{filename}" --include="*.ts" --include="*.tsx"
```

### 3.2 Impact Assessment Matrix

```
+----------------------------------------------------------------------------+
|  IMPACT ANALYSIS                                                            |
+----------------------------------------------------------------------------+
|                                                                             |
|  FILE: src/contexts/ModeContext.tsx                                         |
|  ----                                                                       |
|  Change Type: Import syntax modification                                    |
|  Risk Level: LOW                                                            |
|                                                                             |
|  Imported By:                                                               |
|  +-- src/App.tsx                                                            |
|  +-- src/components/Layout.tsx                                              |
|                                                                             |
|  Exports Used:                                                              |
|  +-- ModeContext (no change)                                                |
|  +-- ModeProvider (no change)                                               |
|  +-- useMode (no change)                                                    |
|                                                                             |
|  Blast Radius: CONTAINED (import-only change, no API modification)          |
|                                                                             |
+----------------------------------------------------------------------------+
```

### 3.3 Risk Classification

| Risk Level | Criteria | Action Required |
|------------|----------|-----------------|
| LOW | Import-only, no API change | Proceed directly |
| MEDIUM | Internal implementation change | Run related tests |
| HIGH | API signature change | Full test suite + review |
| CRITICAL | Breaking change | Stakeholder approval required |

---

## PHASE 4: TDD - Test-First Approach

### 4.1 TDD Decision Matrix

| Issue Category | TDD Required | Reason |
|----------------|--------------|--------|
| unused-import | NO | No behavior to test |
| type-import | NO | Compile-time only |
| style-violation | NO | No behavior to test |
| type-error | OPTIONAL | If affects runtime |
| property-error | YES | Runtime behavior |
| logic-bug | YES | Must prove fix works |
| security-vuln | YES | Must verify mitigation |
| test-failure | N/A | Test already exists |

### 4.2 TDD Execution (When Required)

```
+----------------------------------------------------------------------------+
|  TDD CYCLE: {Issue ID}                                                      |
+----------------------------------------------------------------------------+
|                                                                             |
|  PHASE: RED (Write Failing Test)                                            |
|  -----                                                                      |
|  [ ] Identify test file location                                            |
|  [ ] Write test that exposes the issue                                      |
|  [ ] Run test - confirm FAILS                                               |
|  [ ] Failure is for the RIGHT reason                                        |
|                                                                             |
|  Test Location: src/{path}/__tests__/{file}.test.ts                         |
|                                                                             |
|  Example Test:                                                              |
|  +-----------------------------------------------------------------+       |
|  | describe('FoundationChecklist', () => {                         |       |
|  |   it('should access projectStructure property correctly', () => {|       |
|  |     const data = { projectStructure: { status: 'complete' } };  |       |
|  |     expect(data.projectStructure.status).toBe('complete');      |       |
|  |   });                                                           |       |
|  | });                                                             |       |
|  +-----------------------------------------------------------------+       |
|                                                                             |
|  Test Result: FAILED (expected - proves issue exists)                       |
|                                                                             |
+----------------------------------------------------------------------------+
```

### 4.3 Skip TDD Justification

For issues where TDD is skipped, document reason:

```
TDD SKIP JUSTIFICATION:
Issue: Unused import 'FileText' in FileOrganizationPage.tsx
Reason: Removing unused import has no runtime behavior to test
Verification: Grep confirms no usages of FileText in file
```

---

## PHASE 5: IMPLEMENT - Apply Minimal Fix

### 5.1 Minimal Change Principle

```
FIX RULES:
[ ] Change ONLY what is necessary to resolve the issue
[ ] Do NOT refactor surrounding code
[ ] Do NOT add comments unless critical for understanding
[ ] Do NOT "improve" unrelated code
[ ] Preserve existing formatting where possible
[ ] Match existing codebase patterns
```

### 5.2 Fix Application Order

1. **CRITICAL** issues first (security, data loss risk)
2. **HIGH** issues second (type errors breaking build)
3. **MEDIUM** issues third (type imports)
4. **LOW** issues last (unused imports, style)

### 5.3 Fix Documentation

For each fix applied:

```
+----------------------------------------------------------------------------+
|  FIX APPLIED: {Issue ID}                                                    |
+----------------------------------------------------------------------------+
|                                                                             |
|  File: src/contexts/ModeContext.tsx                                         |
|  Line: 8                                                                    |
|                                                                             |
|  Before:                                                                    |
|  +-----------------------------------------------------------------+       |
|  | import { createContext, useContext, useState, ReactNode } from   |       |
|  |   'react';                                                       |       |
|  +-----------------------------------------------------------------+       |
|                                                                             |
|  After:                                                                     |
|  +-----------------------------------------------------------------+       |
|  | import { createContext, useContext, useState } from 'react';     |       |
|  | import type { ReactNode } from 'react';                          |       |
|  +-----------------------------------------------------------------+       |
|                                                                             |
|  Rationale: Separated type import per TypeScript 5.0 verbatimModuleSyntax   |
|                                                                             |
+----------------------------------------------------------------------------+
```

---

## PHASE 6: VERIFY - Confirm Fix Works

### 6.1 Verification Checklist

```
VERIFICATION STEPS:
[ ] Build passes: npm run build
[ ] Lint passes: npm run lint (if applicable)
[ ] Tests pass: npm run test:run
[ ] TDD test passes (GREEN) - if TDD was required
[ ] No new errors introduced
[ ] No regressions in related functionality
```

### 6.2 Verification Report

```
+----------------------------------------------------------------------------+
|  VERIFICATION REPORT                                                        |
+----------------------------------------------------------------------------+
|                                                                             |
|  BUILD CHECK                                                                |
|  -----------                                                                |
|  Before: 30 errors                                                          |
|  After:  0 errors                                                           |
|  Status: PASS                                                               |
|                                                                             |
|  TEST CHECK                                                                 |
|  ----------                                                                 |
|  Total:  3771 tests                                                         |
|  Passed: 3769                                                               |
|  Failed: 0                                                                  |
|  Skipped: 1                                                                 |
|  Status: PASS                                                               |
|                                                                             |
|  REGRESSION CHECK                                                           |
|  ----------------                                                           |
|  New errors introduced: 0                                                   |
|  Status: PASS                                                               |
|                                                                             |
|  OVERALL: VERIFIED                                                          |
|                                                                             |
+----------------------------------------------------------------------------+
```

---

## PHASE 7: DOCUMENT - Rollback Plan

### 7.1 Rollback Documentation

```
+----------------------------------------------------------------------------+
|  ROLLBACK PLAN                                                              |
+----------------------------------------------------------------------------+
|                                                                             |
|  FIX SESSION: {timestamp}                                                   |
|  FILES MODIFIED: 7                                                          |
|                                                                             |
|  ROLLBACK COMMANDS:                                                         |
|  ------------------                                                         |
|  # Option 1: Git revert (if committed)                                      |
|  git revert {commit-hash}                                                   |
|                                                                             |
|  # Option 2: Git checkout specific files                                    |
|  git checkout HEAD~1 -- src/contexts/ModeContext.tsx                        |
|  git checkout HEAD~1 -- src/pages/ProjectChecklist.tsx                      |
|  git checkout HEAD~1 -- src/pages/NewStory.tsx                              |
|  git checkout HEAD~1 -- src/pages/FoundationChecklist.tsx                   |
|  git checkout HEAD~1 -- src/components/ReadinessCircle.tsx                  |
|  git checkout HEAD~1 -- src/components/SecondarySidebar.tsx                 |
|  git checkout HEAD~1 -- src/components/pages/FileOrganizationPage.tsx       |
|                                                                             |
|  ROLLBACK TRIGGER CONDITIONS:                                               |
|  ----------------------------                                               |
|  - New runtime errors appear after deployment                               |
|  - Performance degradation observed                                         |
|  - User reports related to fixed functionality                              |
|                                                                             |
+----------------------------------------------------------------------------+
```

---

## SIGNAL FILE OUTPUT

On completion, create `.claude/signals/fix-session-{timestamp}.json`:

```json
{
  "command": "/fix",
  "timestamp": "2026-01-31T17:00:00Z",
  "argument": "build",
  "phases": {
    "detect": {
      "status": "complete",
      "issuesFound": 30,
      "byCategory": {
        "unused-import": 22,
        "type-import": 1,
        "property-error": 3,
        "type-error": 4
      }
    },
    "research": {
      "status": "complete",
      "researchEntries": 3,
      "sourcesDocumented": 5
    },
    "impact": {
      "status": "complete",
      "filesAffected": 7,
      "riskLevel": "LOW"
    },
    "tdd": {
      "status": "skipped",
      "reason": "No behavior-affecting issues"
    },
    "implement": {
      "status": "complete",
      "fixesApplied": 30
    },
    "verify": {
      "status": "pass",
      "buildPassing": true,
      "testsPassing": true,
      "regressions": 0
    },
    "document": {
      "status": "complete",
      "rollbackPlanCreated": true
    }
  },
  "result": "SUCCESS"
}
```

---

## COMPLETE OUTPUT FORMAT

```
+============================================================================+
|                                                                             |
|   ███████╗██╗██╗  ██╗    ██████╗ ██████╗  ██████╗ ████████╗ ██████╗  ██████╗ |
|   ██╔════╝██║╚██╗██╔╝    ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗██╔════╝|
|   █████╗  ██║ ╚███╔╝     ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║██║     |
|   ██╔══╝  ██║ ██╔██╗     ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║██║     |
|   ██║     ██║██╔╝ ██╗    ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝╚██████╗|
|   ╚═╝     ╚═╝╚═╝  ╚═╝    ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝  ╚═════╝|
|                                                                             |
+============================================================================+
|                                                                             |
|  TARGET: build                                                              |
|  PROJECT: WAVE - AirView Marketplace                                        |
|  TIMESTAMP: 2026-01-31T17:00:00Z                                            |
|                                                                             |
+----------------------------------------------------------------------------+
|  PHASE 1: DETECT                                                 COMPLETE  |
+----------------------------------------------------------------------------+
|  Issues Found: 30                                                           |
|  - unused-import: 22 (LOW)                                                  |
|  - type-import: 1 (MEDIUM)                                                  |
|  - property-error: 3 (HIGH)                                                 |
|  - type-error: 4 (HIGH)                                                     |
+----------------------------------------------------------------------------+
|  PHASE 2: RESEARCH                                               COMPLETE  |
+----------------------------------------------------------------------------+
|  Research Entries: 3                                                        |
|  - Unused imports: bulk research (22 issues)                                |
|  - Type-only imports: TypeScript 5.0 docs (1 issue)                         |
|  - Property access: Type definition review (7 issues)                       |
+----------------------------------------------------------------------------+
|  PHASE 3: IMPACT                                                 COMPLETE  |
+----------------------------------------------------------------------------+
|  Files Affected: 7                                                          |
|  Risk Level: LOW (import-only and type fixes)                               |
|  Blast Radius: CONTAINED                                                    |
+----------------------------------------------------------------------------+
|  PHASE 4: TDD                                                    SKIPPED   |
+----------------------------------------------------------------------------+
|  Reason: No behavior-affecting issues detected                              |
|  All issues are compile-time type/lint errors                               |
+----------------------------------------------------------------------------+
|  PHASE 5: IMPLEMENT                                              COMPLETE  |
+----------------------------------------------------------------------------+
|  Fixes Applied: 30/30                                                       |
|  Files Modified: 7                                                          |
+----------------------------------------------------------------------------+
|  PHASE 6: VERIFY                                                   PASS    |
+----------------------------------------------------------------------------+
|  Build: PASSING (0 errors)                                                  |
|  Tests: 3769 passed, 1 skipped                                              |
|  Regressions: 0                                                             |
+----------------------------------------------------------------------------+
|  PHASE 7: DOCUMENT                                               COMPLETE  |
+----------------------------------------------------------------------------+
|  Rollback Plan: Created                                                     |
|  Signal File: .claude/signals/fix-session-20260131T170000Z.json             |
|                                                                             |
+============================================================================+
|                                                                             |
|  RESULT: SUCCESS - All 30 issues fixed                                      |
|                                                                             |
|  Next Steps:                                                                |
|  - Run /preflight to verify GO status                                       |
|  - Proceed with /execute-story or other commands                            |
|                                                                             |
+============================================================================+
```

---

## Usage Examples

```bash
# Fix all build errors (most common)
/fix build

# Fix lint issues
/fix lint

# Fix failing tests
/fix test

# Fix security vulnerabilities
/fix security

# Fix specific file pattern
/fix src/pages/*.tsx

# Fix everything
/fix all

# Quick alias
/f build
```

---

## Integration with Other Commands

- **Before /preflight**: Run `/fix build` if preflight shows build errors
- **Before /execute-story**: Ensure `/fix all` passes
- **After /tdd**: Run `/fix test` if tests added but failing
- **After /gate-2**: Run `/fix build` if build verification fails

---

## Failure Handling

If any phase fails:

1. **DETECT fails**: Check if project is properly configured
2. **RESEARCH fails**: Document what research is missing, ask user
3. **IMPACT fails**: Risk too high - escalate to human
4. **TDD fails**: Cannot write test - document why and proceed with caution
5. **IMPLEMENT fails**: Revert changes, re-analyze
6. **VERIFY fails**: Rollback immediately, re-research solution
7. **DOCUMENT fails**: Non-critical, warn user

```
+----------------------------------------------------------------------------+
|  FIX PROTOCOL: FAILED                                                       |
+----------------------------------------------------------------------------+
|                                                                             |
|  Failed Phase: VERIFY                                                       |
|  Reason: Build still has 2 errors after fixes applied                       |
|                                                                             |
|  ACTION REQUIRED:                                                           |
|  ----------------                                                           |
|  1. Rollback applied fixes: git checkout -- {files}                         |
|  2. Re-analyze failing issues                                               |
|  3. Research alternative solutions                                          |
|  4. Re-run /fix with updated approach                                       |
|                                                                             |
|  ROLLBACK COMMAND:                                                          |
|  git checkout HEAD -- src/pages/FoundationChecklist.tsx                     |
|                                                                             |
+----------------------------------------------------------------------------+
```
