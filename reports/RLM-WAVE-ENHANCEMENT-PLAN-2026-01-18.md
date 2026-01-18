# RLM Enhancement Plan for WAVE Framework
## Recursive Language Models Integration Strategy

**Date:** 2026-01-18
**Framework Version:** WAVE V11.2 Enhanced
**Based on:** MIT CSAIL RLM Research (arXiv:2512.24601)

---

## Executive Summary

This plan integrates Recursive Language Model (RLM) concepts into the WAVE framework to solve **context rot** - the degradation of model performance as context windows fill with accumulated state. By treating the codebase and project state as external variables rather than embedding them in agent prompts, WAVE agents can maintain high-quality output across long-running multi-wave projects.

---

## The Problem: Context Rot in WAVE

### Current State
WAVE agents (fe-dev, be-dev, qa, etc.) accumulate context as they work:
- Story definitions loaded at wave start
- Codebase snippets from exploration
- Signal file history
- Git diff outputs
- Test results and error logs
- Previous conversation history

### Degradation Pattern
```
Wave 1: Fresh context → High quality output
Wave 2: Accumulated context → Good output
Wave 3: Context bloat → Degraded recall
Wave 4+: Context rot → Missed requirements, repeated errors
```

### Evidence
- Agents "forget" constraints from earlier in the wave
- Redundant code exploration (re-reading same files)
- Inconsistent application of project patterns
- Signal timing confusion in long waves

---

## RLM Solution: Context as External Variable

### Core Paradigm Shift
```
BEFORE (Traditional):  [System Prompt] + [Full Context] → LLM → Output
AFTER (RLM):           [System Prompt] + [Variable Reference] → LLM → Code → REPL → Output
                                              ↑                         ↓
                                        P = External Variable (Codebase, State)
```

### Key Insight
The LLM doesn't need the entire codebase in its context window. It needs:
1. **Intelligence** to know what to look for
2. **Tools** to query the external variable
3. **Recursion** to delegate focused sub-tasks

---

## WAVE-RLM Architecture

### 1. External Variable Structure

```python
# P = WAVE Project State (External Variable)
P = {
    "codebase": {
        "files": {...},           # File contents (lazy-loaded)
        "structure": {...},       # Directory tree
        "patterns": {...},        # Detected code patterns
    },
    "wave_state": {
        "current_wave": 3,
        "stories": [...],         # Current wave stories
        "signals": [...],         # Signal history
        "worktree_status": {...}, # Git worktree states
    },
    "agent_memory": {
        "decisions": [...],       # Key decisions made
        "constraints": [...],     # Active constraints
        "patterns_used": [...],   # Code patterns applied
    }
}
```

### 2. Agent Context Reduction

**Current WAVE Agent Prompt (~50k tokens):**
```
[System Instructions] + [Full CLAUDE.md] + [All Stories] + [Codebase Context] + [History]
```

**RLM-Enhanced Agent Prompt (~3k tokens):**
```
[System Instructions] + [Variable Access Pattern] + [Current Task Only]
```

### 3. REPL Integration Points

```bash
# Each WAVE agent gets REPL access
/Volumes/SSD-01/Projects/WAVE/core/rlm/
├── repl-environment.py          # Sandboxed REPL for agents
├── variable-loader.py           # Loads P from project
├── sub-llm-dispatcher.py        # Handles recursive calls
└── answer-extractor.py          # Extracts FINAL() results
```

---

## Implementation Phases

### Phase 1: Variable Loader (Foundation)
**Goal:** Create the external variable P from any WAVE project

```bash
# New script: /Volumes/SSD-01/Projects/WAVE/core/scripts/rlm/load-project-variable.sh
./load-project-variable.sh --project /path/to/project --output /tmp/project-P.json
```

**Captures:**
- Directory structure (lightweight)
- File index with sizes and types
- Current wave state from signals
- Story definitions
- Worktree status

**Does NOT load:** Full file contents (lazy-load on demand)

### Phase 2: Query Interface
**Goal:** Let agents query P without loading full context

```python
# Agent can execute in REPL:
peek(P["codebase"]["files"]["src/components/Button.tsx"])  # Load specific file
search(P["codebase"], "useAuth")                           # Search pattern
list_files(P["codebase"], "*.test.ts")                     # Glob query
get_story(P["wave_state"], "AUTH-FE-001")                  # Get specific story
```

### Phase 3: Sub-LLM Delegation
**Goal:** Agents spawn focused sub-tasks

```python
# Main agent delegates:
result = sub_llm(
    task="Extract all API endpoint definitions",
    context=P["codebase"]["files"]["src/api/"],
    model="haiku"  # Cheaper model for focused work
)

# Sub-LLM returns summary, not full output
# Main agent stays lean
```

### Phase 4: Agent Memory Persistence
**Goal:** Decisions survive context resets

```json
// .claude/agent-memory/fe-dev-wave3.json
{
    "decisions": [
        {"timestamp": "...", "decision": "Use React Query for data fetching", "reason": "..."},
        {"timestamp": "...", "decision": "Component naming: PascalCase", "reason": "..."}
    ],
    "constraints": [
        "No inline styles - use Tailwind",
        "All forms must use react-hook-form"
    ],
    "context_hashes": {
        "src/": "abc123",  // Detect when files changed
        "stories/": "def456"
    }
}
```

---

## Integration with Existing WAVE Components

### Signal System Integration
```bash
# Signals now include context hash
{
    "wave": 3,
    "gate": 3,
    "agent": "fe-dev",
    "status": "COMPLETE",
    "context_hash": "abc123",     # NEW: Tracks what agent saw
    "memory_file": "fe-dev-wave3.json"  # NEW: Links to agent memory
}
```

### Worktree Sync Enhancement
```bash
# merge-watcher-v12.sh additions
# After sync, update P variable
update_project_variable "$PROJECT_ROOT" after worktree sync

# Before QA handoff, snapshot P
snapshot_project_variable "$PROJECT_ROOT" "wave${WAVE}-pre-qa"
```

### Story Processing
```python
# Instead of loading all stories into context:
stories = lazy_load_stories(P["wave_state"]["stories"])

# Agent queries specific story when needed:
story = get_story(P, "AUTH-FE-001")
# Only this story enters context
```

---

## Cost-Benefit Analysis

### Token Usage Comparison

| Operation | Traditional | RLM-Enhanced | Savings |
|-----------|-------------|--------------|---------|
| Agent initialization | 50k tokens | 3k tokens | 94% |
| File exploration | 10k per file | 500 tokens (query) | 95% |
| Cross-wave handoff | 100k tokens | 5k tokens | 95% |
| Full wave cycle | 500k tokens | 50k tokens | 90% |

### Quality Improvements

| Metric | Before RLM | After RLM |
|--------|------------|-----------|
| Context recall accuracy | Degrades over waves | Consistent |
| Pattern consistency | 70% | 95% |
| Redundant file reads | Frequent | Eliminated |
| Decision persistence | Lost between sessions | Preserved |

---

## New Scripts to Create

### Core RLM Scripts
| Script | Location | Purpose |
|--------|----------|---------|
| `load-project-variable.sh` | `core/scripts/rlm/` | Generate P from project |
| `query-variable.py` | `core/scripts/rlm/` | REPL query interface |
| `sub-llm-dispatch.py` | `core/scripts/rlm/` | Manage recursive calls |
| `memory-manager.sh` | `core/scripts/rlm/` | Agent memory persistence |

### Integration Scripts
| Script | Location | Purpose |
|--------|----------|---------|
| `context-hash.sh` | `core/scripts/` | Generate context hashes |
| `snapshot-variable.sh` | `core/scripts/` | Snapshot P at checkpoints |
| `restore-variable.sh` | `core/scripts/` | Restore P from snapshot |

---

## Implementation Priority

### HIGH Priority (Phase 1-2)
1. **Variable Loader** - Foundation for everything
2. **Query Interface** - Enables selective context loading
3. **Agent Memory** - Prevents decision loss

### MEDIUM Priority (Phase 3)
4. **Sub-LLM Delegation** - Cost optimization
5. **Signal Integration** - Context hashes in signals
6. **Snapshot/Restore** - Recovery mechanism

### LOW Priority (Phase 4)
7. **Multi-model optimization** - Haiku for sub-tasks
8. **Training optimization** - RL for better delegation
9. **Analytics dashboard** - Token usage tracking

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| REPL security | High | RestrictedPython sandbox |
| Latency from queries | Medium | Intelligent caching |
| Sub-LLM coordination | Medium | Clear answer protocol |
| Memory file corruption | Low | Checkpoint before updates |

---

## Success Metrics

1. **Token Efficiency**: 80%+ reduction in per-wave token usage
2. **Quality Consistency**: <5% variance in output quality across waves
3. **Decision Persistence**: 100% of key decisions preserved across sessions
4. **Context Recall**: >95% accuracy on constraint application

---

## Next Steps

1. [ ] Create `core/scripts/rlm/` directory structure
2. [ ] Implement `load-project-variable.sh` prototype
3. [ ] Design agent memory JSON schema
4. [ ] Test query interface with fe-dev agent
5. [ ] Update merge-watcher to update P after sync
6. [ ] Create context hash utility
7. [ ] Document RLM patterns for WAVE agents

---

## References

- [MIT CSAIL RLM Paper](https://arxiv.org/abs/2512.24601)
- [Alex Zhang's RLM Blog](https://alexzhang13.github.io/blog/2025/rlm/)
- [recursive-llm GitHub](https://github.com/ysz/recursive-llm)
- [Prime Intellect RLM Overview](https://www.primeintellect.ai/blog/rlm)
- [MarkTechPost RLM Analysis](https://www.marktechpost.com/2026/01/02/recursive-language-models-rlms-from-mits-blueprint-to-prime-intellects-rlmenv-for-long-horizon-llm-agents/)

---

*Plan created: 2026-01-18*
*Framework version: WAVE V11.2 Enhanced*
*Target version: WAVE V12.0 (RLM-Enhanced)*
