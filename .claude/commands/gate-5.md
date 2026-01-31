# Gate 5: PM Validation

Run Gate 5 PM Validation after Gate 4 passes.

## Arguments
- `$ARGUMENTS` - Story ID (e.g., AUTH-BE-001)

## Owner
PM Agent

## Purpose
Validate that implementation meets product requirements and user needs.

## Mandatory Checks

```
□ PM-A: Requirements met as specified in story
   - Compare implementation against story description
   - Verify all stated requirements implemented
   - Check nothing was missed

□ PM-B: User experience matches PRD intent
   - If UI story: compare against mockups/wireframes
   - Verify user flow is intuitive
   - Check consistency with design system

□ PM-C: No scope creep detected
   - Implementation doesn't exceed story scope
   - No unrequested features added
   - No unnecessary complexity introduced

□ PM-D: Traceability complete (L2→L5)
   - Story (L2) → AC (L3) → Test (L4) → Code (L5)
   - All links documented in traceability matrix
   - No orphaned code without requirements

□ PM-E: Documentation updated if needed
   - API documentation updated (if API changed)
   - User documentation updated (if UX changed)
   - README updated if setup changed
```

## Execution

1. Load story file with all requirements
2. Review implementation against requirements
3. Check traceability matrix completeness
4. Verify documentation status
5. Sign off or request changes

## Pass Criteria
5/5 checks GREEN

## Fail Action
- Document which requirements are not met
- Clarify requirements if ambiguous
- Return to appropriate gate for fixes
- Do NOT proceed to Gate 6

## Scope Creep Detection
Signs of scope creep:
- Features not in any AC
- UI elements not in mockups
- API endpoints not in contracts
- Configuration options not requested

## Output Format

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  GATE 5: PM VALIDATION                                                       ║
║  Story: {STORY-ID} | PM Agent                                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  REQUIREMENTS VALIDATION                                                     ║
║  ───────────────────────                                                     ║
║  Story: {title}                                                              ║
║  Description match: ✓ Implementation matches description                     ║
║                                                                              ║
║  □ PM-A: Requirements Met                                                    ║
║          ✓ All {N} requirements implemented                                  ║
║                                                                              ║
║  □ PM-B: UX/PRD Intent                                                       ║
║          ✓ Matches mockup: {mockup-file}                                     ║
║          ✓ User flow verified                                                ║
║                                                                              ║
║  □ PM-C: Scope Check                                                         ║
║          ✓ No scope creep detected                                           ║
║          Implementation stays within story boundaries                        ║
║                                                                              ║
║  □ PM-D: Traceability                                                        ║
║          ✓ L2→L5 complete                                                    ║
║          Matrix: planning/traceability/{wave}-traceability-matrix.json       ║
║                                                                              ║
║  □ PM-E: Documentation                                                       ║
║          ✓ No documentation updates required                                 ║
║          (or: Updated docs/api.md)                                           ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  RESULT: PASSED | Ready for Gate 6 (Architecture)                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```
