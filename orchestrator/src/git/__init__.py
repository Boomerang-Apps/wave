# WAVE v2 Git Tools
#
# Phase 9 Enhancement: Per-Domain Worktrees
# Phase 10 Enhancement: Conflict Detection

from .tools import (
    GitTools,
    WorktreeInfo,
    CommitInfo,
    MergeResult,
    create_worktree,
    cleanup_worktree,
    commit_changes,
    check_conflicts,
    create_git_node,
)
# Phase 9: Domain Worktrees
from .domain_worktrees import (
    DomainWorktreeInfo,
    DomainWorktreeManager,
)
from .worktree_context import (
    worktree_context,
    execute_in_worktree,
)
# Phase 10: Conflict Detection
from .conflict_detector import (
    ConflictResult,
    check_cross_domain_conflicts,
    detect_file_conflicts,
    detect_schema_conflicts,
    detect_api_conflicts,
)

__all__ = [
    "GitTools",
    "WorktreeInfo",
    "CommitInfo",
    "MergeResult",
    "create_worktree",
    "cleanup_worktree",
    "commit_changes",
    "check_conflicts",
    "create_git_node",
    # Phase 9: Domain Worktrees
    "DomainWorktreeInfo",
    "DomainWorktreeManager",
    "worktree_context",
    "execute_in_worktree",
    # Phase 10: Conflict Detection
    "ConflictResult",
    "check_cross_domain_conflicts",
    "detect_file_conflicts",
    "detect_schema_conflicts",
    "detect_api_conflicts",
]
