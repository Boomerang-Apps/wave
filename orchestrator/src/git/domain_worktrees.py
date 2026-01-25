"""
Domain Worktrees Module
Per-domain git worktree isolation for parallel development.

Based on Grok's Parallel Domain Execution Recommendations

Provides:
- DomainWorktreeInfo: Metadata about a domain worktree
- DomainWorktreeManager: Create, manage, and merge domain worktrees
"""

import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from .tools import GitTools, WorktreeInfo, MergeResult


@dataclass
class DomainWorktreeInfo:
    """
    Information about a domain-specific worktree.

    Extends WorktreeInfo with domain and run context.
    """
    domain: str
    run_id: str
    path: str
    branch: str
    base_branch: str = "main"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    is_valid: bool = True


class DomainWorktreeManager:
    """
    Manages per-domain git worktrees for isolated parallel development.

    Each domain gets its own worktree within a run-specific directory:
    /worktrees/{run_id}/{domain}/

    Branches follow the pattern:
    wave/{run_id}/{domain}
    """

    def __init__(self, repo_path: str):
        """
        Initialize the domain worktree manager.

        Args:
            repo_path: Path to the main git repository
        """
        self.repo_path = Path(repo_path).resolve()
        self.git_tools = GitTools(str(self.repo_path))

        # Worktrees base directory (sibling to repo)
        self.worktrees_base = self.repo_path.parent / "worktrees"

        # Track created worktrees
        self._domain_worktrees: Dict[str, DomainWorktreeInfo] = {}

    def _get_worktree_path(self, run_id: str, domain: str) -> Path:
        """Get the path for a domain worktree."""
        return self.worktrees_base / run_id / domain

    def _get_branch_name(self, run_id: str, domain: str) -> str:
        """Get the branch name for a domain worktree."""
        return f"wave/{run_id}/{domain}"

    def _get_integration_branch(self, run_id: str) -> str:
        """Get the integration branch name for a run."""
        return f"wave/{run_id}/integration"

    def create_domain_worktree(
        self,
        domain: str,
        run_id: str,
        base_branch: str = "main"
    ) -> DomainWorktreeInfo:
        """
        Create an isolated worktree for a domain.

        Args:
            domain: Domain name (e.g., "auth", "payments")
            run_id: Unique run identifier
            base_branch: Branch to base the worktree on

        Returns:
            DomainWorktreeInfo with worktree details
        """
        worktree_path = self._get_worktree_path(run_id, domain)
        branch_name = self._get_branch_name(run_id, domain)

        # Ensure parent directory exists
        worktree_path.parent.mkdir(parents=True, exist_ok=True)

        # Create worktree using underlying GitTools
        # Note: In mock/skeleton mode, we don't actually create git worktrees
        info = DomainWorktreeInfo(
            domain=domain,
            run_id=run_id,
            path=str(worktree_path),
            branch=branch_name,
            base_branch=base_branch,
            is_valid=True,
        )

        # Track the worktree
        key = f"{run_id}:{domain}"
        self._domain_worktrees[key] = info

        return info

    def get_domain_worktree(
        self,
        domain: str,
        run_id: str
    ) -> Optional[DomainWorktreeInfo]:
        """
        Get existing worktree info for a domain.

        Args:
            domain: Domain name
            run_id: Run identifier

        Returns:
            DomainWorktreeInfo if exists, None otherwise
        """
        key = f"{run_id}:{domain}"
        return self._domain_worktrees.get(key)

    def list_run_worktrees(self, run_id: str) -> List[DomainWorktreeInfo]:
        """
        List all worktrees for a specific run.

        Args:
            run_id: Run identifier to filter by

        Returns:
            List of DomainWorktreeInfo for the run
        """
        return [
            info for key, info in self._domain_worktrees.items()
            if info.run_id == run_id
        ]

    def cleanup_domain_worktree(self, domain: str, run_id: str) -> bool:
        """
        Remove a domain worktree.

        Args:
            domain: Domain name
            run_id: Run identifier

        Returns:
            True if cleanup successful
        """
        key = f"{run_id}:{domain}"
        info = self._domain_worktrees.get(key)

        if not info:
            return True  # Nothing to clean up

        # Remove from tracking
        del self._domain_worktrees[key]

        # In real implementation, would call:
        # self.git_tools.cleanup_worktree(info.path)

        return True

    def cleanup_run_worktrees(self, run_id: str) -> bool:
        """
        Remove all worktrees for a run.

        Args:
            run_id: Run identifier

        Returns:
            True if all cleanups successful
        """
        worktrees = self.list_run_worktrees(run_id)
        success = True

        for info in worktrees:
            if not self.cleanup_domain_worktree(info.domain, run_id):
                success = False

        return success

    def create_integration_branch(
        self,
        run_id: str,
        base_branch: str = "main"
    ) -> str:
        """
        Create an integration branch for merging all domains.

        Args:
            run_id: Run identifier
            base_branch: Branch to base integration on

        Returns:
            Integration branch name
        """
        branch_name = self._get_integration_branch(run_id)

        # In real implementation, would create the branch:
        # self.git_tools._run_git("checkout", "-b", branch_name, base_branch)

        return branch_name

    def merge_domain_to_integration(
        self,
        domain: str,
        run_id: str
    ) -> MergeResult:
        """
        Merge a domain branch into the integration branch.

        Args:
            domain: Domain name
            run_id: Run identifier

        Returns:
            MergeResult with merge outcome
        """
        domain_branch = self._get_branch_name(run_id, domain)
        integration_branch = self._get_integration_branch(run_id)

        # In real implementation, would perform:
        # self.git_tools._run_git("checkout", integration_branch)
        # self.git_tools._run_git("merge", domain_branch)

        return MergeResult(
            success=True,
            has_conflicts=False,
            conflict_files=[],
            merged_sha=None,
            message=f"Merged {domain_branch} into {integration_branch}",
        )

    def merge_all_domains(
        self,
        run_id: str,
        domains: List[str]
    ) -> MergeResult:
        """
        Merge all domain branches into integration branch.

        Merges in order provided (should be topologically sorted).

        Args:
            run_id: Run identifier
            domains: List of domains to merge (in order)

        Returns:
            MergeResult with final merge outcome
        """
        # Create integration branch first
        self.create_integration_branch(run_id)

        all_conflict_files = []
        has_any_conflicts = False

        for domain in domains:
            result = self.merge_domain_to_integration(domain, run_id)
            if result.has_conflicts:
                has_any_conflicts = True
                all_conflict_files.extend(result.conflict_files)

        return MergeResult(
            success=not has_any_conflicts,
            has_conflicts=has_any_conflicts,
            conflict_files=all_conflict_files,
            merged_sha=None,
            message=f"Merged {len(domains)} domains into integration",
        )


__all__ = [
    "DomainWorktreeInfo",
    "DomainWorktreeManager",
]
