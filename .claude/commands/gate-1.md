# Gate 1: Self-Verification

Run Gate 1 Self-Verification checks after story implementation.

## Arguments
- `$ARGUMENTS` - Story ID (e.g., AUTH-BE-001)

## Owner
Executing Agent (BE-Dev / FE-Dev)

## Mandatory Checks

```
□ SV-A: All acceptance criteria addressed in code
   - Read story file, extract all ACs
   - For each AC, verify code implements the requirement
   - Check test exists for each AC

□ SV-B: Contract types match implementation
   - Verify imports from contracts/ directory
   - TypeScript strict mode catches mismatches
   - No manual type definitions that duplicate contracts

□ SV-C: No files modified outside owned paths
   - Check story's ownedPaths array
   - Verify all changes are within ownership
   - Report any violations

□ SV-D: No TODO/FIXME comments left
   - Grep for TODO, FIXME, XXX, HACK
   - All must be resolved before gate passes
   - Document any intentional deferrals

□ SV-E: Code compiles without errors
   - Run: pnpm tsc --noEmit
   - Zero TypeScript errors required
   - Warnings acceptable but logged
```

## Execution

1. Load story file for $ARGUMENTS
2. Get list of changed files: `git diff --name-only`
3. Run each verification check
4. Collect results

## Pass Criteria
5/5 checks GREEN

## Fail Action
- List failing checks
- Provide specific remediation for each
- Do NOT proceed to Gate 2
- Agent must fix issues and re-run Gate 1

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GATE 1: SELF-VERIFICATION                                                   ║
║  Story: {STORY-ID} | Agent: {agent}                                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  □ SV-A: All ACs Addressed                                                   ║
║          AC1: ✓ Implemented in src/lib/auth.ts:45                            ║
║          AC2: ✓ Implemented in src/lib/auth.ts:78                            ║
║          AC3: ✗ NOT FOUND - missing rate limiting                            ║
║                                                                              ║
║  □ SV-B: Contract Compliance                                                 ║
║          ✓ Imports contracts/auth.ts correctly                               ║
║          ✓ No duplicate type definitions                                     ║
║                                                                              ║
║  □ SV-C: Ownership Compliance                                                ║
║          ✓ All changes within ownedPaths                                     ║
║                                                                              ║
║  □ SV-D: No TODO/FIXME                                                       ║
║          ✓ No outstanding TODOs found                                        ║
║                                                                              ║
║  □ SV-E: Compilation                                                         ║
║          ✓ TypeScript compiles without errors                                ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: BLOCKED | Pass Rate: 80% (4/5)                                      ║
║  Action: Implement AC3 rate limiting before proceeding                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
