# Gate 4: QA Acceptance

Run Gate 4 QA Acceptance testing after Gate 3 passes.

## Arguments
- `$ARGUMENTS` - Story ID (e.g., AUTH-BE-001)

## Owner
QA Agent

## Purpose
Independent verification that implementation meets acceptance criteria.

## Mandatory Checks

```
□ QA-A: Each AC manually verified against implementation
   - Load story file, extract all acceptance criteria
   - For each AC in EARS format (WHEN x THEN y):
     - Verify the trigger condition can be met
     - Verify the expected behavior occurs
     - Document verification steps taken

□ QA-B: Edge cases tested
   - Identify boundary conditions from ACs
   - Test minimum/maximum values
   - Test empty/null inputs
   - Test concurrent access (if applicable)

□ QA-C: Error handling verified
   - Trigger each documented error condition
   - Verify correct error codes returned
   - Verify user-friendly error messages
   - Verify no sensitive data in error responses

□ QA-D: Performance thresholds met
   - Check any ACs with thresholds (e.g., "latency: <500ms")
   - Run performance measurements
   - Document actual vs. required metrics

□ QA-E: Security requirements validated
   - Review story's securityRequirements section
   - Verify authentication enforced if required
   - Verify authorization rules applied
   - Check for OWASP Top 10 vulnerabilities

□ QA-F: Accessibility/UX checked (if applicable)
   - Keyboard navigation works
   - Screen reader compatible
   - Color contrast sufficient
   - RTL/LTR layout correct
```

## Execution

1. Load story file and extract all ACs
2. Create verification checklist from ACs
3. Execute each verification manually or via E2E tests
4. Document results with evidence (screenshots, logs)
5. Create defect tickets for any failures

## Pass Criteria
6/6 checks GREEN (or N/A where not applicable)

## Fail Action
- Create detailed defect report
- Link defects to specific ACs
- Return story to Gate 1 for remediation
- Do NOT proceed to Gate 5

## Defect Report Format
```json
{
  "id": "DEF-{STORY-ID}-001",
  "storyId": "{STORY-ID}",
  "acId": "AC3",
  "severity": "Major|Minor|Critical",
  "summary": "Brief description",
  "stepsToReproduce": ["Step 1", "Step 2"],
  "expected": "What should happen",
  "actual": "What actually happened",
  "evidence": "screenshot/log path"
}
```

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GATE 4: QA ACCEPTANCE                                                       ║
║  Story: {STORY-ID} | QA Agent                                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ACCEPTANCE CRITERIA VERIFICATION                                            ║
║  ─────────────────────────────────                                           ║
║  AC1: WHEN user submits valid form THEN data saved                           ║
║       ✓ Verified - form submission creates database record                   ║
║                                                                              ║
║  AC2: WHEN user submits invalid email THEN error displayed                   ║
║       ✓ Verified - validation message shown                                  ║
║                                                                              ║
║  AC3: WHEN rate limit exceeded THEN 429 returned                             ║
║       ✗ FAILED - returns 500 instead of 429                                  ║
║       Defect: DEF-AUTH-BE-001-001                                            ║
║                                                                              ║
║  QUALITY CHECKS                                                              ║
║  ──────────────                                                              ║
║  □ QA-A: AC Verification      ✗ 5/6 passed                                   ║
║  □ QA-B: Edge Cases           ✓ All edge cases covered                       ║
║  □ QA-C: Error Handling       ✗ See defect above                             ║
║  □ QA-D: Performance          ✓ All thresholds met                           ║
║  □ QA-E: Security             ✓ Requirements validated                       ║
║  □ QA-F: Accessibility        ○ N/A (backend story)                          ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: BLOCKED | 1 defect(s) require resolution                            ║
║  Action: Return to Gate 1 with defect report                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
