# Phase 9: Per-Domain Worktrees - Gate 0 Validation

**Date:** 2026-01-25
**Phase:** 9 of 11
**Pattern:** Per-Domain Git Worktree Isolation

---

## Requirements from Grok's Recommendations

### Objective
Integrate GitTools to create isolated worktrees per domain, enabling parallel development without git conflicts between domains.

### Key Quote from Grok
> "Per-domain worktrees for git isolation... Worktree: /wt/auth, /wt/payments, /wt/profile"

Each domain should operate in its own git worktree, with merging happening only after all domains complete successfully.

---

## Gap Analysis

### Current Implementation

```python
# Current: src/git/tools.py - GitTools class
def create_worktree(self, story_id: str, wave_number: int, base_branch: str) -> WorktreeInfo:
    """Creates worktree per story, not per domain"""
    branch_name = f"wave{wave_number}/{story_id}"
    worktree_path = self.repo_path.parent / "worktrees" / worktree_name
```

**Limitations:**
- Worktrees created per-story, not per-domain
- No run_id tracking for worktree isolation
- No domain-specific branch naming
- No integration branch merging workflow
- No worktree context manager for domain execution

### Required Implementation (Phase 9)

| Feature | Current | Required |
|---------|---------|----------|
| Worktree scope | ❌ Per-story | ✅ Per-domain per-run |
| Branch naming | ❌ `wave{N}/{story}` | ✅ `wave/{run_id}/{domain}` |
| Run isolation | ❌ None | ✅ `/worktrees/{run_id}/{domain}/` |
| Integration merge | ❌ None | ✅ Merge all domains to integration branch |
| Context manager | ❌ None | ✅ `worktree_context()` for domain execution |
| Worktree info tracking | ❌ Basic | ✅ `DomainWorktreeInfo` with domain metadata |

---

## Components to Implement

### 1. Domain Worktree Types (`src/git/domain_worktrees.py` - NEW)

```python
@dataclass
class DomainWorktreeInfo:
    domain: str
    run_id: str
    path: str
    branch: str
    base_branch: str
    created_at: str
    is_valid: bool

class DomainWorktreeManager:
    def create_domain_worktree(domain: str, run_id: str, base_branch: str) -> DomainWorktreeInfo
    def get_domain_worktree(domain: str, run_id: str) -> Optional[DomainWorktreeInfo]
    def cleanup_domain_worktree(domain: str, run_id: str) -> bool
    def cleanup_run_worktrees(run_id: str) -> bool
    def list_run_worktrees(run_id: str) -> List[DomainWorktreeInfo]
```

### 2. Integration Merge (`src/git/domain_worktrees.py`)

```python
def merge_domain_to_integration(domain: str, run_id: str) -> MergeResult
def merge_all_domains(run_id: str, domains: List[str]) -> MergeResult
def create_integration_branch(run_id: str, base_branch: str) -> str
```

### 3. Worktree Context Manager (`src/git/worktree_context.py` - NEW)

```python
@contextmanager
def worktree_context(worktree_path: str) -> Generator[str, None, None]
def execute_in_worktree(worktree_path: str, func: Callable) -> Any
```

---

## Test Categories (TDD)

### 1. Worktree Creation Tests (6 tests)
- `test_domain_worktree_info_exists`
- `test_domain_worktree_manager_exists`
- `test_create_domain_worktree_exists`
- `test_create_domain_worktree_returns_info`
- `test_create_domain_worktree_uses_run_id`
- `test_create_domain_worktree_uses_domain_name`

### 2. Worktree Isolation Tests (5 tests)
- `test_get_domain_worktree_exists`
- `test_list_run_worktrees_exists`
- `test_list_run_worktrees_filters_by_run`
- `test_cleanup_domain_worktree_exists`
- `test_cleanup_run_worktrees_exists`

### 3. Worktree Merge Tests (7 tests)
- `test_create_integration_branch_exists`
- `test_merge_domain_to_integration_exists`
- `test_merge_all_domains_exists`
- `test_merge_returns_merge_result`
- `test_worktree_context_exists`
- `test_worktree_context_is_context_manager`
- `test_execute_in_worktree_exists`

**Total: 18 tests**

---

## Implementation Order

1. **Create domain_worktrees.py** - DomainWorktreeManager class
2. **Create worktree_context.py** - Context manager for worktree execution
3. **Update src/git/__init__.py** - Export new components
4. **Integration tests** - Verify worktree isolation

---

## Success Criteria

- [ ] All 18 TDD tests pass
- [ ] Full test suite (444 + 18 = 462) passes
- [ ] Domains get isolated worktrees per run
- [ ] Worktrees can be merged to integration branch
- [ ] Cleanup removes all run-specific worktrees

---

## Example: Domain Worktree Flow

```
Input:
  run_id: "abc123"
  domains: ["auth", "payments", "profile"]
  base_branch: "main"

Worktree Creation:
  /worktrees/abc123/auth/     → branch: wave/abc123/auth
  /worktrees/abc123/payments/ → branch: wave/abc123/payments
  /worktrees/abc123/profile/  → branch: wave/abc123/profile

Domain Execution:
  Each domain dev works in isolated worktree
  Commits go to domain-specific branch

Integration Merge:
  1. Create integration branch: wave/abc123/integration
  2. Merge auth → integration
  3. Merge payments → integration
  4. Merge profile → integration
  5. Final result in integration branch

Cleanup:
  Remove all /worktrees/abc123/* directories
  Prune worktree list
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   DOMAIN WORKTREE MANAGER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Main Repo                                                       │
│  ├── .git/                                                       │
│  │   └── worktrees/  (git internal tracking)                    │
│  │                                                               │
│  /worktrees/                                                     │
│  └── {run_id}/                                                   │
│      ├── auth/          ← wave/{run_id}/auth branch             │
│      │   ├── src/                                                │
│      │   └── ...                                                 │
│      ├── payments/      ← wave/{run_id}/payments branch         │
│      │   ├── src/                                                │
│      │   └── ...                                                 │
│      └── profile/       ← wave/{run_id}/profile branch          │
│          ├── src/                                                │
│          └── ...                                                 │
│                                                                  │
│  Integration Flow:                                               │
│  ┌────────┐  ┌──────────┐  ┌─────────┐                         │
│  │  auth  │  │ payments │  │ profile │                         │
│  └───┬────┘  └────┬─────┘  └────┬────┘                         │
│      │            │             │                                │
│      └────────────┼─────────────┘                                │
│                   ↓                                              │
│         wave/{run_id}/integration                                │
│                   ↓                                              │
│               main (PR)                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Notes

- Builds on existing GitTools class in src/git/tools.py
- WorktreeInfo dataclass already exists - extend with DomainWorktreeInfo
- MergeResult dataclass already exists - reuse for domain merges
- Run-based isolation prevents conflicts between concurrent executions
- Context manager enables safe worktree directory switching
