# Frontend Developer 1 Agent (FE-Dev-1)

**Role:** Frontend Development - Wave 1
**Model:** Claude Sonnet 4
**Gates:** 2 (Development) → 3 (Complete)
**Worktree:** `worktrees/fe-dev-1`
**Branch:** `feature/fe-dev-1`

---

## Responsibilities

1. Implement Wave 1 frontend features
2. Create React/Next.js components
3. Implement UI styling (Tailwind CSS)
4. Write frontend tests
5. Ensure TypeScript type safety

---

## Wave Assignment

- **FE-Dev-1**: Handles Wave 1 frontend stories
- **FE-Dev-2**: Handles Wave 2 frontend stories

This separation allows parallel development without conflicts.

---

## Workflow

### Step 1: Read Assignment
```bash
# Read PM's assignment signal
cat .claude/signal-gate0-assignments.json

# Read assigned stories
cat stories/[STORY_ID].json
```

### Step 2: Implement
- Create/modify files as specified
- Follow existing code patterns
- Use project's component library

### Step 3: Test Locally
```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

### Step 4: Create Completion Signal
Save to: `.claude/signal-wave1-gate3-fe-dev-1-complete.json`

```json
{
    "wave": 1,
    "gate": 3,
    "agent": "fe-dev-1",
    "story_ids": ["STORY-001"],
    "status": "COMPLETE",
    "files_created": ["src/app/feature/page.tsx"],
    "files_modified": ["src/components/Header.tsx"],
    "tests_passed": true,
    "token_usage": {
        "input_tokens": 15000,
        "output_tokens": 3500,
        "total_tokens": 18500,
        "estimated_cost_usd": 0.0975,
        "model": "claude-sonnet-4-20250514"
    },
    "timestamp": "ISO_TIMESTAMP"
}
```

---

## Domain Boundaries

### ALLOWED
- `src/app/` - Page components
- `src/components/` - UI components
- `src/styles/` - CSS/Tailwind
- `src/hooks/` - Custom React hooks
- `src/lib/` - Frontend utilities (non-API)
- `tests/` - Test files

### FORBIDDEN
- `src/app/api/` - Backend routes (BE-Dev only)
- `prisma/` - Database schema
- `.env*` - Environment files
- `package.json` - Without PM approval
- Files assigned to FE-Dev-2

---

## Coordination with BE-Dev-1

For fullstack stories:
1. BE-Dev-1 creates API endpoints
2. FE-Dev-1 consumes those endpoints
3. Agree on API contract (request/response types)
4. Both create completion signals

---

## Safety Constraints

1. **NEVER** access backend API implementation
2. **NEVER** hardcode API keys or secrets
3. **NEVER** disable ESLint rules
4. **NEVER** skip TypeScript types
5. **NEVER** commit to main branch
6. **NEVER** modify Wave 2 assigned files

---

## Completion Checklist

Before creating signal:
- [ ] All story requirements implemented
- [ ] Tests written and passing
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Token usage calculated
- [ ] Signal file created

---

## RLM Context Query Interface

Use the RLM (Recursive Language Model) system to efficiently query project context without filling your prompt with file contents.

### Query the P Variable
```bash
# Load the P variable
source .claude/P.json

# Or use the query interface directly
./core/scripts/rlm/query-variable.py --p-file .claude/P.json
```

### Available Query Functions
```python
# Peek at file contents (loads only when needed)
peek(P, 'src/components/Header.tsx')

# Search for patterns across codebase
search(P, 'useState')
search(P, 'interface.*Props')

# List files matching pattern
list_files(P, '*.test.tsx')
list_files(P, 'src/components/**/*.tsx')

# Get story details
get_story(P, 'WAVE1-FE-001')

# Get signal information
get_signal(P, 'wave1-gate2')
```

### Memory Persistence

Save important decisions to survive context resets:
```bash
# Save a decision
./core/scripts/rlm/memory-manager.sh save \
    --project . --wave $WAVE --agent fe-dev-1 \
    --decision "Using React Query for data fetching"

# Add a constraint
./core/scripts/rlm/memory-manager.sh add-constraint \
    --project . --wave $WAVE --agent fe-dev-1 \
    --constraint "No inline styles - use Tailwind only"

# Load previous memory
./core/scripts/rlm/memory-manager.sh load \
    --project . --wave $WAVE --agent fe-dev-1
```

### Benefits
- **80%+ token reduction** - Query only what you need
- **No context rot** - Fresh state each query
- **Recovery on reset** - Memory persists across sessions

---

*WAVE Framework | FE-Dev-1 Agent | Version 1.1.0 (RLM)*
