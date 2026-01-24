"""
WAVE v2 Git Tools Module

Provides isolated git operations using pygit2 for worktree management.
Supports worktree creation, commits, conflict detection, and merging.
"""

import os
import subprocess
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Callable, Tuple

# Import state types
import sys
_src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

try:
    from src.graph import WAVEState, Phase, Gate
except ImportError:
    from graph import WAVEState, Phase, Gate

# Try to import pygit2
try:
    import pygit2
    PYGIT2_AVAILABLE = True
except ImportError:
    PYGIT2_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════
# DATA TYPES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class WorktreeInfo:
    """Information about a git worktree."""
    path: str
    branch: str
    name: str
    base_branch: str = "main"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    is_valid: bool = True


@dataclass
class CommitInfo:
    """Information about a git commit."""
    sha: str
    message: str
    author: str
    timestamp: str
    files_changed: List[str] = field(default_factory=list)


@dataclass
class MergeResult:
    """Result of a merge operation."""
    success: bool
    has_conflicts: bool
    conflict_files: List[str] = field(default_factory=list)
    merged_sha: Optional[str] = None
    message: str = ""


# ═══════════════════════════════════════════════════════════════════════════════
# GIT TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

class GitTools:
    """
    Git operations manager for WAVE workflows.

    Uses pygit2 when available, falls back to subprocess git commands.
    Provides isolated worktree operations for parallel development.
    """

    def __init__(self, repo_path: str):
        """
        Initialize git tools for a repository.

        Args:
            repo_path: Path to the git repository
        """
        self.repo_path = Path(repo_path).resolve()
        self._repo = None

        if PYGIT2_AVAILABLE:
            try:
                self._repo = pygit2.Repository(str(self.repo_path))
            except Exception:
                pass

    def _run_git(self, *args, cwd: Optional[str] = None) -> Tuple[bool, str]:
        """Run a git command via subprocess."""
        try:
            result = subprocess.run(
                ["git"] + list(args),
                cwd=cwd or str(self.repo_path),
                capture_output=True,
                text=True,
                timeout=60
            )
            return result.returncode == 0, result.stdout + result.stderr
        except Exception as e:
            return False, str(e)

    def create_worktree(
        self,
        story_id: str,
        wave_number: int = 1,
        base_branch: str = "main"
    ) -> WorktreeInfo:
        """
        Create an isolated worktree for a story.

        Args:
            story_id: Story identifier
            wave_number: Wave number
            base_branch: Branch to base the worktree on

        Returns:
            WorktreeInfo with worktree details
        """
        # Generate branch and path names
        branch_name = f"wave{wave_number}/{story_id}"
        worktree_name = f"wave{wave_number}-{story_id}"
        worktree_path = self.repo_path.parent / "worktrees" / worktree_name

        # Ensure worktrees directory exists
        worktree_path.parent.mkdir(parents=True, exist_ok=True)

        # Remove existing worktree if it exists
        if worktree_path.exists():
            self.cleanup_worktree(str(worktree_path))

        # Create worktree
        success, output = self._run_git(
            "worktree", "add",
            "-b", branch_name,
            str(worktree_path),
            base_branch
        )

        if not success:
            # Try without -b if branch already exists
            success, output = self._run_git(
                "worktree", "add",
                str(worktree_path),
                branch_name
            )

        return WorktreeInfo(
            path=str(worktree_path),
            branch=branch_name,
            name=worktree_name,
            base_branch=base_branch,
            is_valid=success
        )

    def cleanup_worktree(self, worktree_path: str) -> bool:
        """
        Remove a worktree and optionally its branch.

        Args:
            worktree_path: Path to the worktree

        Returns:
            True if cleanup successful
        """
        path = Path(worktree_path)

        # Remove worktree registration
        success, _ = self._run_git("worktree", "remove", str(path), "--force")

        # Also remove directory if it still exists
        if path.exists():
            try:
                shutil.rmtree(path)
            except Exception:
                pass

        # Prune worktree list
        self._run_git("worktree", "prune")

        return success or not path.exists()

    def list_worktrees(self) -> List[WorktreeInfo]:
        """List all worktrees for the repository."""
        success, output = self._run_git("worktree", "list", "--porcelain")

        if not success:
            return []

        worktrees = []
        current = {}

        for line in output.strip().split("\n"):
            if line.startswith("worktree "):
                current["path"] = line[9:]
            elif line.startswith("branch "):
                current["branch"] = line[7:].replace("refs/heads/", "")
            elif line == "":
                if current.get("path"):
                    worktrees.append(WorktreeInfo(
                        path=current.get("path", ""),
                        branch=current.get("branch", ""),
                        name=Path(current.get("path", "")).name
                    ))
                current = {}

        return worktrees

    def commit_changes(
        self,
        worktree_path: str,
        message: str,
        author: str = "WAVE Agent",
        email: str = "wave@wave.dev"
    ) -> Optional[CommitInfo]:
        """
        Commit all changes in a worktree.

        Args:
            worktree_path: Path to the worktree
            message: Commit message
            author: Author name
            email: Author email

        Returns:
            CommitInfo if successful, None otherwise
        """
        # Stage all changes
        success, _ = self._run_git("add", "-A", cwd=worktree_path)
        if not success:
            return None

        # Check if there are changes to commit
        success, status = self._run_git("status", "--porcelain", cwd=worktree_path)
        if not status.strip():
            return None  # Nothing to commit

        # Commit
        success, output = self._run_git(
            "-c", f"user.name={author}",
            "-c", f"user.email={email}",
            "commit", "-m", message,
            cwd=worktree_path
        )

        if not success:
            return None

        # Get commit info
        success, sha = self._run_git(
            "rev-parse", "HEAD",
            cwd=worktree_path
        )

        # Get changed files
        success, files = self._run_git(
            "diff", "--name-only", "HEAD~1", "HEAD",
            cwd=worktree_path
        )

        return CommitInfo(
            sha=sha.strip() if success else "",
            message=message,
            author=author,
            timestamp=datetime.now().isoformat(),
            files_changed=files.strip().split("\n") if files.strip() else []
        )

    def check_conflicts(
        self,
        worktree_path: str,
        target_branch: str = "main"
    ) -> Tuple[bool, List[str]]:
        """
        Check if merging would cause conflicts.

        Args:
            worktree_path: Path to the worktree
            target_branch: Branch to check against

        Returns:
            Tuple of (has_conflicts, conflict_files)
        """
        # Fetch latest
        self._run_git("fetch", "origin", cwd=worktree_path)

        # Try merge with --no-commit
        success, output = self._run_git(
            "merge", "--no-commit", "--no-ff",
            f"origin/{target_branch}",
            cwd=worktree_path
        )

        # Abort the merge
        self._run_git("merge", "--abort", cwd=worktree_path)

        if success:
            return False, []

        # Parse conflict files
        conflict_files = []
        if "CONFLICT" in output:
            for line in output.split("\n"):
                if "CONFLICT" in line and ":" in line:
                    # Extract filename
                    parts = line.split(":")
                    if len(parts) > 1:
                        conflict_files.append(parts[-1].strip())

        return True, conflict_files

    def merge_branch(
        self,
        worktree_path: str,
        target_branch: str = "main",
        message: Optional[str] = None
    ) -> MergeResult:
        """
        Merge worktree branch into target branch.

        Args:
            worktree_path: Path to the worktree
            target_branch: Branch to merge into
            message: Optional merge commit message

        Returns:
            MergeResult with merge outcome
        """
        # First check for conflicts
        has_conflicts, conflict_files = self.check_conflicts(worktree_path, target_branch)

        if has_conflicts:
            return MergeResult(
                success=False,
                has_conflicts=True,
                conflict_files=conflict_files,
                message="Merge conflicts detected"
            )

        # Get current branch
        success, branch = self._run_git(
            "rev-parse", "--abbrev-ref", "HEAD",
            cwd=worktree_path
        )
        branch = branch.strip()

        # Switch to target branch in main repo
        success, _ = self._run_git("checkout", target_branch)
        if not success:
            return MergeResult(
                success=False,
                has_conflicts=False,
                message=f"Failed to checkout {target_branch}"
            )

        # Merge the branch
        merge_msg = message or f"Merge {branch} into {target_branch}"
        success, output = self._run_git(
            "merge", "--no-ff",
            "-m", merge_msg,
            branch
        )

        if not success:
            return MergeResult(
                success=False,
                has_conflicts="CONFLICT" in output,
                message=output
            )

        # Get merge commit SHA
        success, sha = self._run_git("rev-parse", "HEAD")

        return MergeResult(
            success=True,
            has_conflicts=False,
            merged_sha=sha.strip() if success else None,
            message=f"Successfully merged {branch} into {target_branch}"
        )

    def get_changed_files(self, worktree_path: str) -> List[str]:
        """Get list of changed files in worktree."""
        success, output = self._run_git(
            "status", "--porcelain",
            cwd=worktree_path
        )

        if not success:
            return []

        files = []
        for line in output.strip().split("\n"):
            if line.strip():
                # Status is first 2 chars, filename follows
                files.append(line[3:].strip())

        return files


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def create_worktree(
    repo_path: str,
    story_id: str,
    wave_number: int = 1,
    base_branch: str = "main"
) -> WorktreeInfo:
    """
    Quick helper to create a worktree.

    Args:
        repo_path: Path to repository
        story_id: Story identifier
        wave_number: Wave number
        base_branch: Base branch

    Returns:
        WorktreeInfo
    """
    tools = GitTools(repo_path)
    return tools.create_worktree(story_id, wave_number, base_branch)


def cleanup_worktree(repo_path: str, worktree_path: str) -> bool:
    """Quick helper to cleanup a worktree."""
    tools = GitTools(repo_path)
    return tools.cleanup_worktree(worktree_path)


def commit_changes(
    worktree_path: str,
    message: str,
    author: str = "WAVE Agent"
) -> Optional[CommitInfo]:
    """Quick helper to commit changes."""
    # Get repo path from worktree
    repo_path = Path(worktree_path).parent.parent
    tools = GitTools(str(repo_path))
    return tools.commit_changes(worktree_path, message, author)


def check_conflicts(
    repo_path: str,
    worktree_path: str,
    target_branch: str = "main"
) -> Tuple[bool, List[str]]:
    """Quick helper to check for conflicts."""
    tools = GitTools(repo_path)
    return tools.check_conflicts(worktree_path, target_branch)


def create_git_node(
    repo_path: Optional[str] = None
) -> Callable[[WAVEState], dict]:
    """
    Create a git operations node for the WAVE graph.

    Args:
        repo_path: Optional repository path

    Returns:
        Node function for the graph
    """
    def git_node(state: WAVEState) -> dict:
        """Manage git state for the workflow."""
        git_state = state.get("git", {})
        project_path = state.get("project_path", repo_path or "")

        if not project_path:
            return {"git": git_state}

        tools = GitTools(project_path)

        # If no worktree, create one
        if not git_state.get("worktree_path"):
            worktree = tools.create_worktree(
                story_id=state.get("story_id", "unknown"),
                wave_number=state.get("wave_number", 1),
                base_branch=git_state.get("base_branch", "main")
            )

            return {
                "git": {
                    **git_state,
                    "worktree_path": worktree.path,
                    "branch_name": worktree.branch,
                    "worktree_name": worktree.name,
                }
            }

        # Check for changes
        worktree_path = git_state.get("worktree_path", "")
        if worktree_path:
            files = tools.get_changed_files(worktree_path)
            has_conflicts, conflict_files = tools.check_conflicts(
                worktree_path,
                git_state.get("base_branch", "main")
            )

            return {
                "git": {
                    **git_state,
                    "files_changed": files,
                    "has_conflicts": has_conflicts,
                }
            }

        return {"git": git_state}

    return git_node


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "WorktreeInfo",
    "CommitInfo",
    "MergeResult",
    "GitTools",
    "create_worktree",
    "cleanup_worktree",
    "commit_changes",
    "check_conflicts",
    "create_git_node",
    "PYGIT2_AVAILABLE",
]
