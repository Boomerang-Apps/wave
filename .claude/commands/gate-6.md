# Gate 6: Architecture Review

Run Gate 6 Architecture Review after Gate 5 passes.

## Arguments
- `$ARGUMENTS` - Story ID (e.g., AUTH-BE-001)

## Owner
CTO Master Agent

## Purpose
Ensure implementation follows architectural standards and best practices.

## Mandatory Checks

```
□ AR-A: Design patterns followed
   - Code follows project's established patterns
   - Consistent with existing architecture
   - No anti-patterns introduced

□ AR-B: No technical debt introduced
   - No shortcuts that compromise maintainability
   - No copied code that should be abstracted
   - No magic numbers or hardcoded values

□ AR-C: Contracts not violated
   - All imports from contracts/ directory
   - No local type redefinitions
   - API responses match contract schemas

□ AR-D: Security best practices followed
   - Input validation at boundaries
   - No SQL injection vulnerabilities
   - No XSS vulnerabilities
   - Secrets not hardcoded
   - Proper authentication/authorization

□ AR-E: Performance implications acceptable
   - No N+1 query patterns
   - Appropriate caching strategy
   - No blocking operations on critical path
   - Resource cleanup (connections, file handles)

□ AR-F: Maintainability preserved
   - Code is readable and well-structured
   - Functions have single responsibility
   - Appropriate error handling
   - Logging for debugging
```

## Execution

1. Review all changed files in the story
2. Check against architectural guidelines
3. Verify security practices
4. Assess performance implications
5. Sign off or request refactoring

## Pass Criteria
6/6 checks GREEN

## Fail Action
- Document architectural concerns
- Provide specific refactoring guidance
- Return to Gate 1 for improvements
- Do NOT proceed to Gate 7

## Common Issues to Check

| Category | Red Flags |
|----------|-----------|
| Patterns | God objects, circular dependencies, tight coupling |
| Security | Raw SQL, unvalidated input, exposed secrets |
| Performance | Synchronous I/O, missing indexes, memory leaks |
| Maintainability | Long functions, deep nesting, unclear naming |

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GATE 6: ARCHITECTURE REVIEW                                                 ║
║  Story: {STORY-ID} | CTO Agent                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  FILES REVIEWED                                                              ║
║  ──────────────                                                              ║
║  • src/features/auth/lib/login.ts (modified)                                 ║
║  • src/features/auth/hooks/useLogin.ts (new)                                 ║
║  • tests/auth/login.test.ts (new)                                            ║
║                                                                              ║
║  ARCHITECTURE CHECKS                                                         ║
║  ───────────────────                                                         ║
║  □ AR-A: Design Patterns        ✓ Follows repository pattern                 ║
║  □ AR-B: Technical Debt         ✓ No debt introduced                         ║
║  □ AR-C: Contract Compliance    ✓ Uses shared contracts                      ║
║  □ AR-D: Security               ✓ Input validated, no vulnerabilities        ║
║  □ AR-E: Performance            ✓ Queries optimized, proper caching          ║
║  □ AR-F: Maintainability        ✓ Clean code, good structure                 ║
║                                                                              ║
║  NOTES                                                                       ║
║  ─────                                                                       ║
║  • Good use of dependency injection                                          ║
║  • Consider extracting validation to shared utility (future)                 ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: PASSED | Ready for Gate 7 (Merge)                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
