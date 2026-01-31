# Gate 3: Test Verification

Run Gate 3 Test Verification after Gate 2 passes.

## Arguments
- `$ARGUMENTS` - Story ID (e.g., AUTH-BE-001)

## Owner
Executing Agent (BE-Dev / FE-Dev)

## Configuration
Commands read from `.claude/config.json`. Auto-detects if not configured.

## Mandatory Checks

```
□ TV-A: All unit tests pass
   - Run configured test command
   - All tests must pass
   - No skipped tests without documented reason

□ TV-B: Coverage meets threshold
   - Run configured testCoverage command
   - Line coverage ≥ configured threshold (default: 70%)
   - Branch coverage ≥ configured threshold (default: 60%)
   - Check coverage for files in story's ownedPaths

□ TV-C: Integration tests pass (if applicable)
   - Run configured integrationTest command
   - All integration tests pass
   - API contract tests included

□ TV-D: No flaky tests detected
   - Run tests multiple times if CI configured
   - Same results each run
   - No intermittent failures

□ TV-E: Test traceability to AC documented
   - Each AC has corresponding test(s)
   - Test names reference AC IDs (recommended)
   - Traceability matrix updated
```

## Auto-Detection Commands

| Project Type | Test | Coverage | Integration |
|-------------|------|----------|-------------|
| Node.js (Jest) | `pnpm test` | `pnpm test -- --coverage` | `pnpm test:integration` |
| Node.js (Vitest) | `pnpm test` | `pnpm test -- --coverage` | `pnpm test:integration` |
| Python (pytest) | `pytest` | `pytest --cov` | `pytest -m integration` |
| Go | `go test ./...` | `go test -cover ./...` | `go test -tags=integration ./...` |
| Rust | `cargo test` | `cargo tarpaulin` | `cargo test --features integration` |
| Java | `mvn test` | `mvn jacoco:report` | `mvn verify -Pintegration` |

## Execution

1. Read `.claude/config.json` for test commands and thresholds
2. Run unit tests
3. Run coverage analysis
4. Run integration tests if configured
5. Verify test-to-AC traceability

## Pass Criteria
All applicable checks GREEN

## Fail Action
- List failing tests with error messages
- Identify uncovered code paths
- Agent must add tests or fix failures
- Do NOT proceed to Gate 4

## TDD Verification
If running in TDD mode:
- Verify tests were committed before implementation
- Check git history for test-first pattern
- Log deviation if code came first

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GATE 3: TEST VERIFICATION                                                   ║
║  Story: {STORY-ID} | Agent: {agent} | Project: {type}                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  □ TV-A: Unit Tests                                                          ║
║          Command: {test command}                                             ║
║          ✓ {passed}/{total} tests passed                                     ║
║                                                                              ║
║  □ TV-B: Coverage                                                            ║
║          Command: {coverage command}                                         ║
║          ✓ Line: {X}% (threshold: {threshold}%)                              ║
║          ✓ Branch: {Y}% (threshold: {threshold}%)                            ║
║                                                                              ║
║  □ TV-C: Integration Tests                                                   ║
║          Command: {integration command}                                      ║
║          ✓ {passed}/{total} integration tests passed                         ║
║                                                                              ║
║  □ TV-D: Flakiness                                                           ║
║          ✓ Consistent results across runs                                    ║
║                                                                              ║
║  □ TV-E: Traceability                                                        ║
║          ✓ All ACs have test coverage                                        ║
║          Matrix: planning/traceability/                                      ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: PASSED | Ready for Gate 4 (QA)                                      ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
