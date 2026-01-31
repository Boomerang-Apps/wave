# Gate 2: Build Verification

Run Gate 2 Build Verification after Gate 1 passes.

## Arguments
- `$ARGUMENTS` - Story ID (e.g., AUTH-BE-001)

## Owner
Executing Agent (BE-Dev / FE-Dev)

## Configuration
Commands are read from `.claude/config.json`. If not present, auto-detect from project type.

## Mandatory Checks

```
□ BV-A: Build succeeds
   - Run configured build command
   - Exit code must be 0
   - No build errors

□ BV-B: No type errors (if applicable)
   - Run configured typeCheck command
   - TypeScript, MyPy, or language-specific type checker
   - Zero errors required

□ BV-C: No linter errors
   - Run configured lint command
   - Exit code must be 0
   - Warnings logged but acceptable

□ BV-D: Bundle/artifact size within limits (if applicable)
   - Check build output size
   - Compare against configured maxBundleSize
   - Skip for libraries/backends without bundles

□ BV-E: No security vulnerabilities
   - Run configured securityAudit command
   - No high/critical vulnerabilities
   - Medium acceptable with documented reason
```

## Auto-Detection Commands

| Project Type | Build | Type Check | Lint | Security |
|-------------|-------|------------|------|----------|
| Node.js (pnpm) | `pnpm build` | `pnpm tsc --noEmit` | `pnpm lint` | `pnpm audit` |
| Node.js (npm) | `npm run build` | `npx tsc --noEmit` | `npm run lint` | `npm audit` |
| Python | `python -m build` | `mypy .` | `ruff check .` | `safety check` |
| Go | `go build ./...` | N/A (compiled) | `golangci-lint run` | `govulncheck ./...` |
| Rust | `cargo build` | N/A (compiled) | `cargo clippy` | `cargo audit` |
| Java (Maven) | `mvn package` | N/A (compiled) | `mvn checkstyle:check` | `mvn dependency-check:check` |

## Execution

1. Read `.claude/config.json` for project-specific commands
2. If no config, auto-detect from project files
3. Run each check sequentially
4. Collect results and exit codes

## Pass Criteria
All applicable checks GREEN (some checks N/A for certain project types)

## Fail Action
- Identify specific build error
- Provide fix suggestion based on error message
- Do NOT proceed to Gate 3
- Agent must fix and re-run Gate 2

## Retry Limit
Configurable in config.json (default: 3 attempts before escalation)

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GATE 2: BUILD VERIFICATION                                                  ║
║  Story: {STORY-ID} | Agent: {agent} | Project: {type}                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  □ BV-A: Build Success                                                       ║
║          Command: {configured build command}                                 ║
║          ✓ Build completed (exit code 0)                                     ║
║                                                                              ║
║  □ BV-B: Type Check                                                          ║
║          Command: {configured typeCheck command}                             ║
║          ✓ No type errors                                                    ║
║                                                                              ║
║  □ BV-C: Lint                                                                ║
║          Command: {configured lint command}                                  ║
║          ✓ No lint errors                                                    ║
║                                                                              ║
║  □ BV-D: Artifact Size                                                       ║
║          ○ N/A (backend service)                                             ║
║                                                                              ║
║  □ BV-E: Security Audit                                                      ║
║          Command: {configured securityAudit command}                         ║
║          ✓ No high/critical vulnerabilities                                  ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: PASSED | Ready for Gate 3                                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
