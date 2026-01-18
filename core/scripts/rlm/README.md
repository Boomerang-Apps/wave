# WAVE RLM Integration

**Recursive Language Model Support for WAVE Framework**

Based on MIT CSAIL research: [arXiv:2512.24601](https://arxiv.org/abs/2512.24601)

---

## Overview

This module implements RLM (Recursive Language Model) patterns for WAVE agents, enabling:

- **Context as external variable** - Codebase stored in P, not in agent prompts
- **Selective context loading** - Agents query what they need, when they need it
- **Agent memory persistence** - Decisions survive context resets
- **Reduced token usage** - 80-90% reduction in per-wave token consumption

---

## Quick Start

```bash
# Generate P variable from any project
./load-project-variable.sh --project /path/to/project --output /tmp/P.json

# Query the variable
python3 query-variable.py /tmp/P.json summary
python3 query-variable.py /tmp/P.json peek src/App.tsx
python3 query-variable.py /tmp/P.json search "useAuth"
python3 query-variable.py /tmp/P.json list "*.test.ts"
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `load-project-variable.sh` | Generate P variable from WAVE project |
| `query-variable.py` | REPL-style query interface for P |

---

## The P Variable Structure

```json
{
    "meta": {
        "project_name": "my-app",
        "project_root": "/path/to/project",
        "generated_at": "2026-01-18T...",
        "context_hash": "src:abc123,stories:def456"
    },
    "codebase": {
        "structure": ["src/", "src/components/", ...],
        "file_count": 150,
        "source_extensions": ["ts", "tsx", "js", "py"]
    },
    "wave_state": {
        "current_wave": 3,
        "wave_type": "FE_ONLY",
        "stories": ["AUTH-FE-001.json", ...],
        "signals": ["signal-wave3-gate3-fe-complete.json", ...]
    },
    "worktrees": [
        {"name": "fe-dev", "branch": "wave3-fe", "uncommitted_changes": 5}
    ],
    "agent_memory": {
        "memory_dir": "/path/.claude/agent-memory",
        "available_memories": []
    }
}
```

---

## Query Functions

### `peek(P, path, start, end)`
View file contents without loading full file into context.

```python
# View entire file
content = peek(P, "src/components/Button.tsx")

# View lines 50-100
content = peek(P, "src/App.tsx", 50, 100)
```

### `search(P, pattern)`
Search for regex pattern across source files.

```python
matches = search(P, "useAuth")
# Returns: [{"file": "...", "line": 42, "content": "..."}]
```

### `list_files(P, pattern)`
List files matching glob pattern.

```python
files = list_files(P, "*.test.ts")
files = list_files(P, "src/**/*.tsx")
```

### `get_story(P, story_id)`
Retrieve story definition by ID.

```python
story = get_story(P, "AUTH-FE-001")
```

### `get_memory(P, agent)`
Get agent's persisted memory.

```python
memory = get_memory(P, "fe-dev")
# Returns decisions, constraints, patterns used
```

### `save_decision(P, agent, decision, reason)`
Persist a decision to agent memory.

```python
save_decision(P, "fe-dev", "Use React Query", "Better caching")
```

---

## Agent Memory

Agent memories are stored in `.claude/agent-memory/`:

```json
// .claude/agent-memory/fe-dev-wave3.json
{
    "decisions": [
        {
            "timestamp": "2026-01-18T15:30:00Z",
            "decision": "Use React Query for data fetching",
            "reason": "Better caching and automatic refetching"
        }
    ],
    "constraints": [
        "No inline styles - use Tailwind",
        "All forms must use react-hook-form"
    ],
    "patterns_used": [
        "src/components/Button.tsx - button pattern",
        "src/hooks/useAuth.ts - auth hook pattern"
    ]
}
```

---

## Integration with WAVE

### In merge-watcher

```bash
# After worktree sync, regenerate P
./load-project-variable.sh --project "$PROJECT_ROOT" --output "$PROJECT_ROOT/.claude/P.json"
```

### In Signals

```json
{
    "wave": 3,
    "gate": 3,
    "agent": "fe-dev",
    "status": "COMPLETE",
    "context_hash": "abc123",
    "memory_file": "fe-dev-wave3.json"
}
```

---

## References

- [MIT CSAIL RLM Paper](https://arxiv.org/abs/2512.24601)
- [recursive-llm GitHub](https://github.com/ysz/recursive-llm)
- [Prime Intellect Blog](https://www.primeintellect.ai/blog/rlm)
