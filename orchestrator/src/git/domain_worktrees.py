"""
Domain Worktrees Module
Story: WAVE-P3-001

Per-domain git worktree isolation for parallel development.
Each domain agent gets its own worktree with an isolated branch,
enabling parallel development without merge conflicts.

Provides:
- DomainWorktreeInfo: Metadata about a domain worktree
- DomainWorktreeManager: Create, manage, merge, and discover domain worktrees
"""

import logging
import re
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict

from .tools import GitTools, MergeResult

logger = logging.getLogger(__name__)


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
    {worktrees_base}/{run_id}/{domain}/

    Branches follow the pattern:
    wave/{run_id}/{domain}

    All git operations use real subprocess calls via GitTools._run_git().
    """

    # Branch name pattern for parsing discovered worktrees
    BRANCH_PATTERN = re.compile(r"^wave/([^/]+)/([^/]+)$")

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
        Create an isolated worktree for a domain (AC-01, AC-02, AC-04).

        Args:
            domain: Domain name (e.g., "fe", "be", "qa", "pm")
            run_id: Unique run identifier
            base_branch: Branch to base the worktree on (default: main)

        Returns:
            DomainWorktreeInfo with worktree details
        """
        worktree_path = self._get_worktree_path(run_id, domain)
        branch_name = self._get_branch_name(run_id, domain)

        # Ensure parent directory exists
        worktree_path.parent.mkdir(parents=True, exist_ok=True)

        # If worktree already exists, clean it up first
        key = f"{run_id}:{domain}"
        if worktree_path.exists():
            self._remove_worktree(str(worktree_path))

        # Delete the branch if it already exists (leftover from previous run)
        self.git_tools._run_git("branch", "-D", branch_name)

        # Create worktree with new branch from base
        success, output = self.git_tools._run_git(
            "worktree", "add",
            "-b", branch_name,
            str(worktree_path),
            base_branch,
        )

        if not success:
            logger.warning(
                "Failed to create worktree %s: %s", branch_name, output
            )
            info = DomainWorktreeInfo(
                domain=domain,
                run_id=run_id,
                path=str(worktree_path),
                branch=branch_name,
                base_branch=base_branch,
                is_valid=False,
            )
            self._domain_worktrees[key] = info
            return info

        info = DomainWorktreeInfo(
            domain=domain,
            run_id=run_id,
            path=str(worktree_path),
            branch=branch_name,
            base_branch=base_branch,
            is_valid=True,
        )
        self._domain_worktrees[key] = info

        logger.info(
            "Created worktree for %s/%s at %s (branch: %s)",
            run_id, domain, worktree_path, branch_name,
        )
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
        Remove a domain worktree (AC-05).

        Removes the git worktree registration, deletes the directory,
        and prunes stale worktree references.

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

        wt_path = info.path
        success = self._remove_worktree(wt_path)

        # Remove from tracking
        del self._domain_worktrees[key]

        logger.info("Cleaned up worktree %s/%s", run_id, domain)
        return success

    def cleanup_run_worktrees(self, run_id: str) -> bool:
        """
        Remove all worktrees for a run (AC-05).

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

    def discover_worktrees(self) -> List[DomainWorktreeInfo]:
        """
        Discover existing worktrees from git (AC-07).

        Scans `git worktree list` for worktrees matching the
        wave/{run_id}/{domain} branch pattern. Re-populates internal
        tracking so that a new manager instance can resume after a crash.

        Returns:
            List of discovered DomainWorktreeInfo
        """
        success, output = self.git_tools._run_git(
            "worktree", "list", "--porcelain"
        )
        if not success:
            return []

        discovered = []
        current_path = None
        current_branch = None

        for line in output.strip().split("\n"):
            if line.startswith("worktree "):
                current_path = line[9:]
            elif line.startswith("branch "):
                current_branch = line[7:].replace("refs/heads/", "")
            elif line == "":
                if current_path and current_branch:
                    match = self.BRANCH_PATTERN.match(current_branch)
                    if match:
                        run_id = match.group(1)
                        domain = match.group(2)
                        # Skip integration branches
                        if domain != "integration":
                            info = DomainWorktreeInfo(
                                domain=domain,
                                run_id=run_id,
                                path=current_path,
                                branch=current_branch,
                                is_valid=Path(current_path).exists(),
                            )
                            # Re-register in tracking
                            key = f"{run_id}:{domain}"
                            self._domain_worktrees[key] = info
                            discovered.append(info)

                current_path = None
                current_branch = None

        # Handle last entry (no trailing newline)
        if current_path and current_branch:
            match = self.BRANCH_PATTERN.match(current_branch)
            if match:
                run_id = match.group(1)
                domain = match.group(2)
                if domain != "integration":
                    info = DomainWorktreeInfo(
                        domain=domain,
                        run_id=run_id,
                        path=current_path,
                        branch=current_branch,
                        is_valid=Path(current_path).exists(),
                    )
                    key = f"{run_id}:{domain}"
                    self._domain_worktrees[key] = info
                    discovered.append(info)

        logger.info("Discovered %d worktrees", len(discovered))
        return discovered

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

        # Delete if it already exists
        self.git_tools._run_git("branch", "-D", branch_name)

        # Create branch from base
        success, output = self.git_tools._run_git(
            "branch", branch_name, base_branch
        )

        if not success:
            logger.warning(
                "Failed to create integration branch %s: %s",
                branch_name, output,
            )

        return branch_name

    def merge_domain_to_integration(
        self,
        domain: str,
        run_id: str
    ) -> MergeResult:
        """
        Merge a domain branch into the integration branch.

        Uses a temporary worktree for the integration branch to avoid
        disrupting the main repo checkout.

        Args:
            domain: Domain name
            run_id: Run identifier

        Returns:
            MergeResult with merge outcome
        """
        domain_branch = self._get_branch_name(run_id, domain)
        integration_branch = self._get_integration_branch(run_id)

        # Use a temporary worktree for the integration branch
        int_path = self.worktrees_base / run_id / "_integration"
        int_path.parent.mkdir(parents=True, exist_ok=True)

        # Clean up any existing integration worktree
        if int_path.exists():
            self._remove_worktree(str(int_path))

        # Create worktree for integration branch
        success, output = self.git_tools._run_git(
            "worktree", "add", str(int_path), integration_branch
        )
        if not success:
            return MergeResult(
                success=False,
                has_conflicts=False,
                message=f"Failed to checkout integration branch: {output}",
            )

        try:
            # Perform the merge
            success, output = self.git_tools._run_git(
                "-c", "user.name=WAVE Merge",
                "-c", "user.email=wave@wave.dev",
                "merge", "--no-ff",
                "-m", f"Merge {domain_branch} into {integration_branch}",
                domain_branch,
                cwd=str(int_path),
            )

            if not success:
                # Check if it's a conflict
                has_conflicts = "CONFLICT" in output
                conflict_files = []
                if has_conflicts:
                    for line in output.split("\n"):
                        if "CONFLICT" in line:
                            # Extract filename from merge conflict output
                            parts = line.split("Merge conflict in ")
                            if len(parts) > 1:
                                conflict_files.append(parts[1].strip())

                    # Abort the failed merge
                    self.git_tools._run_git("merge", "--abort", cwd=str(int_path))

                return MergeResult(
                    success=False,
                    has_conflicts=has_conflicts,
                    conflict_files=conflict_files,
                    message=output,
                )

            # Get merge commit SHA
            _, sha = self.git_tools._run_git(
                "rev-parse", "HEAD", cwd=str(int_path)
            )

            return MergeResult(
                success=True,
                has_conflicts=False,
                merged_sha=sha.strip() if sha else None,
                message=f"Merged {domain_branch} into {integration_branch}",
            )
        finally:
            # Always clean up the integration worktree
            self._remove_worktree(str(int_path))

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
        all_conflict_files = []
        has_any_conflicts = False

        for domain in domains:
            result = self.merge_domain_to_integration(domain, run_id)
            if result.has_conflicts:
                has_any_conflicts = True
                all_conflict_files.extend(result.conflict_files)
            elif not result.success:
                return result  # Non-conflict failure — abort

        return MergeResult(
            success=not has_any_conflicts,
            has_conflicts=has_any_conflicts,
            conflict_files=all_conflict_files,
            merged_sha=None,
            message=f"Merged {len(domains)} domains into integration",
        )

    def _remove_worktree(self, worktree_path: str) -> bool:
        """Remove a git worktree, cleaning up directory and pruning."""
        path = Path(worktree_path)

        # Try git worktree remove
        success, _ = self.git_tools._run_git(
            "worktree", "remove", str(path), "--force"
        )

        # Also remove directory if it still exists
        if path.exists():
            try:
                shutil.rmtree(path)
            except Exception:
                pass

        # Prune stale worktree refs
        self.git_tools._run_git("worktree", "prune")

        return success or not path.exists()


__all__ = [
    "DomainWorktreeInfo",
    "DomainWorktreeManager",
]
