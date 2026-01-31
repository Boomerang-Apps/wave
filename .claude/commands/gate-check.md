# Gate Check - Verify Specific Gate

Run verification checks for a specific gate on a story.

## Arguments
- `$ARGUMENTS` - Gate number and Story ID (e.g., "0 AUTH-BE-001" or "4 AUTH-FE-001")

## Gates

### Gate 0: Pre-Flight
```
□ PFC-A: Documentation complete
□ PFC-B: Contracts validated
□ PFC-C: Story schema valid (V4.1)
□ PFC-D: Traceability exists
□ PFC-E: DAL classification assigned
□ PFC-F: Hazard analysis reviewed
□ PFC-G: Rollback procedure documented
□ PFC-H: Agent ownership confirmed
□ PFC-I: Dependencies resolved
□ PFC-J: Signal file path verified
□ PFC-K: Research validation complete
```

### Gate 1: Self-Verification
```
□ SV-A: All ACs addressed in code
□ SV-B: Contract types match implementation
□ SV-C: No files outside owned paths
□ SV-D: No TODO/FIXME comments
□ SV-E: Code compiles without errors
```

### Gate 2: Build
```
□ BV-A: pnpm build succeeds
□ BV-B: No TypeScript errors
□ BV-C: No ESLint errors
□ BV-D: Bundle size within limits
□ BV-E: No security vulnerabilities
```

### Gate 3: Test
```
□ TV-A: All unit tests pass
□ TV-B: Coverage ≥70%
□ TV-C: Integration tests pass
□ TV-D: No flaky tests
□ TV-E: Test traceability documented
```

### Gate 4: QA Acceptance
```
□ QA-A: Each AC manually verified
□ QA-B: Edge cases tested
□ QA-C: Error handling verified
□ QA-D: Performance thresholds met
□ QA-E: Security requirements validated
□ QA-F: Accessibility checked
```

### Gate 5: PM Validation
```
□ PM-A: Requirements met
□ PM-B: UX matches PRD
□ PM-C: No scope creep
□ PM-D: Traceability complete
□ PM-E: Documentation updated
```

### Gate 6: Architecture Review
```
□ AR-A: Design patterns followed
□ AR-B: No technical debt
□ AR-C: Contracts not violated
□ AR-D: Security best practices
□ AR-E: Performance acceptable
□ AR-F: Maintainability preserved
```

### Gate 7: Merge Authorization
```
□ MA-A: All previous gates passed
□ MA-B: No merge conflicts
□ MA-C: Commit history clean
□ MA-D: PR description complete
□ MA-E: Traceability artifacts updated
□ MA-F: Release notes drafted
```

## Execution

1. Parse gate number and story ID from $ARGUMENTS
2. Load story file
3. Run all checks for specified gate
4. Report PASS/FAIL for each check
5. Overall gate status: PASSED or BLOCKED
