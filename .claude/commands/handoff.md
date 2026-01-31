# /handoff - Session Handoff Generator

**Priority:** P1 (Important)
**Aliases:** /ho, /session-end, /eod

## Purpose

Generate a comprehensive session handoff document for seamless continuation in a new Claude session. Creates a markdown file with restart command, context summary, and next steps.

## When to Run

- End of every development session
- Before context window fills up
- When switching to a different task/project
- Before taking a break
- When handing off to another team member

---

## Arguments

- `$ARGUMENTS` - Optional: Brief description of session focus (e.g., "auth-feature", "bug-fixes")

---

## Generated Document Structure

The handoff document will be created at:
```
.claude/SESSION-HANDOFF-{DATE}-{FOCUS}.md
```

Example: `.claude/SESSION-HANDOFF-2026-01-31-auth-feature.md`

---

## Document Template

Generate the following sections:

### 1. Quick Restart Block (REQUIRED)

```markdown
## Quick Restart

\`\`\`bash
cd {PROJECT_PATH} && claude --dangerously-skip-permissions
\`\`\`

**First command after restart:**
\`\`\`
/preflight
\`\`\`
```

### 2. Session Summary (REQUIRED)

Summarize what was accomplished:
- Main task/focus of the session
- Key decisions made
- Problems solved

### 3. Completed Work (REQUIRED)

List all completed items:
- Files created/modified
- Features implemented
- Bugs fixed
- Tests written
- Commits made (with hashes)

### 4. Current State (REQUIRED)

Document the current state:
- Git branch and status
- Test status (passing/failing)
- Build status
- Any uncommitted changes

### 5. In Progress / Incomplete (IF APPLICABLE)

List anything started but not finished:
- Partial implementations
- Known issues discovered
- TODOs identified

### 6. Next Steps (REQUIRED)

Clear instructions for the next session:
- Prioritized task list
- Specific commands to run
- Files to review
- Decisions needed

### 7. Context for Claude (REQUIRED)

Key information Claude needs to know:
- Active story/wave being worked on
- Important file paths
- Technical decisions made
- Patterns being followed

### 8. Related Files (REQUIRED)

List important files for context:
- Recently modified files
- Config files
- Test files
- Story/spec files

---

## Execution Steps

1. **Gather Information**
   ```bash
   # Get current date
   date +%Y-%m-%d

   # Get project path
   pwd

   # Get git status
   git status --short
   git branch --show-current
   git log --oneline -5

   # Get recent commits
   git log --oneline -10 --since="8 hours ago"

   # Check for uncommitted changes
   git diff --stat
   ```

2. **Identify Session Work**
   - Review conversation history
   - List files modified in session
   - Summarize key accomplishments

3. **Generate Document**
   - Create markdown file with template
   - Fill in all sections
   - Include specific file paths and commands

4. **Validate Output**
   - Ensure restart command is correct
   - Verify next steps are actionable
   - Check that context is complete

---

## Output Format

```markdown
# Session Handoff - {DATE} ({FOCUS})

## Quick Restart

\`\`\`bash
cd {PROJECT_PATH} && claude --dangerously-skip-permissions
\`\`\`

**First command after restart:**
\`\`\`
/preflight
\`\`\`

---

## Session Summary

{Brief 2-3 sentence summary of what this session accomplished}

---

## Completed Work

### {Category 1}
- [x] {Task 1}
- [x] {Task 2}

### {Category 2}
- [x] {Task 3}

**Commits:**
| Hash | Message |
|------|---------|
| `abc1234` | feat: {description} |
| `def5678` | fix: {description} |

---

## Current State

| Item | Status |
|------|--------|
| Branch | `{branch-name}` |
| Tests | {passing/failing} |
| Build | {passing/failing} |
| Uncommitted | {count} files |

---

## In Progress

- [ ] {Incomplete task 1}
- [ ] {Incomplete task 2}

**Blockers:**
- {Any blocking issues}

---

## Next Steps

**Priority 1 (Do First):**
1. {Most important next action}
2. {Second priority}

**Priority 2 (Follow-up):**
- {Additional tasks}

**Commands to run:**
\`\`\`bash
{specific commands}
\`\`\`

---

## Context for Claude

**Active Work:**
- Story: `{STORY-ID}` - {title}
- Wave: {wave number}
- Mode: {Autonomous/Single-Thread}

**Key Decisions:**
- {Decision 1}
- {Decision 2}

**Patterns Being Used:**
- {Pattern 1}
- {Pattern 2}

---

## Related Files

**Modified this session:**
- `{path/to/file1}`
- `{path/to/file2}`

**Important configs:**
- `.claude/config.json`
- `planning/schemas/story-schema-v4.1.json`

**Active story files:**
- `stories/wave{N}/{STORY-ID}.json`

---

*Session ended: {TIMESTAMP}*
*Handoff created by: Claude Opus 4.5*
```

---

## Example Usage

```bash
# Basic handoff
/handoff

# With session focus
/handoff auth-implementation

# Aliases
/ho preflight-enhancement
/session-end wave3-stories
/eod bug-fixes
```

---

## Post-Generation

After generating the handoff:

1. **Display restart command prominently:**
   ```
   ╔════════════════════════════════════════════════════════════════╗
   ║  SESSION HANDOFF CREATED                                       ║
   ╠════════════════════════════════════════════════════════════════╣
   ║                                                                ║
   ║  Restart command:                                              ║
   ║  cd {PATH} && claude --dangerously-skip-permissions            ║
   ║                                                                ║
   ║  First command: /preflight                                     ║
   ║                                                                ║
   ║  Handoff file:                                                 ║
   ║  .claude/SESSION-HANDOFF-{DATE}-{FOCUS}.md                     ║
   ║                                                                ║
   ╚════════════════════════════════════════════════════════════════╝
   ```

2. **Remind user to review** the generated document

3. **Offer to commit** the handoff file if desired

---

## Integration

- **Creates:** `.claude/SESSION-HANDOFF-{DATE}-{FOCUS}.md`
- **Reads:** Git history, conversation context, project state
- **Uses:** `/preflight` reference for restart flow
