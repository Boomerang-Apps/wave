"""
Tests for Domain Worktree Manager
Story: WAVE-P3-001

Tests the DomainWorktreeManager with real git worktree operations.
Uses temporary git repositories for isolation.

Test Categories:
1. Worktree Lifecycle (AC-01, AC-02, AC-04, AC-05) — 10 tests
2. Command Execution (AC-03) — 4 tests
3. Concurrent Operations (AC-06) — 4 tests
4. Crash Recovery (AC-07) — 4 tests
5. Error Handling — 4 tests
6. Integration Branch & Merge — 5 tests

Total: 31 tests
"""

import os
import subprocess
import threading
import pytest
from pathlib import Path

from src.git.domain_worktrees import DomainWorktreeManager, DomainWorktreeInfo
from src.git.worktree_context import worktree_context, execute_in_worktree
from src.git.tools import MergeResult


# ═══════════════════════════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

def _run(cmd, cwd):
    """Run a shell command, raise on failure."""
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\n{result.stderr}")
    return result.stdout


@pytest.fixture
def git_repo(tmp_path):
    """
    Create a real git repository with an initial commit on main.

    Returns the repo path.
    """
    repo = tmp_path / "repo"
    repo.mkdir()

    _run(["git", "init", "--initial-branch=main"], cwd=str(repo))
    _run(["git", "config", "user.name", "Test"], cwd=str(repo))
    _run(["git", "config", "user.email", "test@test.com"], cwd=str(repo))

    # Create initial commit
    readme = repo / "README.md"
    readme.write_text("# Test Project\n")
    _run(["git", "add", "."], cwd=str(repo))
    _run(["git", "commit", "-m", "Initial commit"], cwd=str(repo))

    return repo


@pytest.fixture
def manager(git_repo):
    """DomainWorktreeManager backed by a real git repo."""
    return DomainWorktreeManager(repo_path=str(git_repo))


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Worktree Lifecycle (AC-01, AC-02, AC-04, AC-05)
# ═══════════════════════════════════════════════════════════════════════════════

class TestWorktreeLifecycle:
    """Tests for AC-01/02/04/05: create, branch naming, sync, cleanup."""

    def test_create_worktree_creates_directory(self, manager, git_repo):
        """AC-01: Worktree directory is created on disk."""
        info = manager.create_domain_worktree(
            domain="be", run_id="run-001"
        )
        assert Path(info.path).exists()
        assert Path(info.path).is_dir()

    def test_create_worktree_returns_valid_info(self, manager):
        """AC-01: Returns DomainWorktreeInfo with correct fields."""
        info = manager.create_domain_worktree(
            domain="fe", run_id="run-002"
        )
        assert isinstance(info, DomainWorktreeInfo)
        assert info.domain == "fe"
        assert info.run_id == "run-002"
        assert info.is_valid is True

    def test_worktree_branch_naming_convention(self, manager):
        """AC-02: Branch follows wave/{run_id}/{domain} pattern."""
        info = manager.create_domain_worktree(
            domain="auth", run_id="story-XYZ"
        )
        assert info.branch == "wave/story-XYZ/auth"

    def test_worktree_has_isolated_branch(self, manager, git_repo):
        """AC-02: Worktree is on its own branch, not main."""
        info = manager.create_domain_worktree(
            domain="be", run_id="run-003"
        )
        # Check the branch in the worktree
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=info.path, capture_output=True, text=True,
        )
        assert result.stdout.strip() == "wave/run-003/be"

    def test_worktree_synced_from_main(self, manager, git_repo):
        """AC-04: Worktree HEAD matches main HEAD at creation time."""
        # Get main HEAD
        main_sha = _run(
            ["git", "rev-parse", "HEAD"], cwd=str(git_repo)
        ).strip()

        info = manager.create_domain_worktree(
            domain="be", run_id="run-004"
        )

        # Get worktree HEAD
        wt_sha = _run(
            ["git", "rev-parse", "HEAD"], cwd=info.path
        ).strip()

        assert wt_sha == main_sha

    def test_worktree_synced_from_custom_base(self, manager, git_repo):
        """AC-04: Can sync from a branch other than main."""
        # Create a develop branch with an extra commit
        _run(["git", "checkout", "-b", "develop"], cwd=str(git_repo))
        (git_repo / "dev.txt").write_text("dev content\n")
        _run(["git", "add", "."], cwd=str(git_repo))
        _run(["git", "commit", "-m", "dev commit"], cwd=str(git_repo))
        dev_sha = _run(["git", "rev-parse", "HEAD"], cwd=str(git_repo)).strip()
        _run(["git", "checkout", "main"], cwd=str(git_repo))

        info = manager.create_domain_worktree(
            domain="fe", run_id="run-005", base_branch="develop"
        )

        wt_sha = _run(["git", "rev-parse", "HEAD"], cwd=info.path).strip()
        assert wt_sha == dev_sha

    def test_cleanup_removes_worktree(self, manager, git_repo):
        """AC-05: Cleanup removes worktree directory."""
        info = manager.create_domain_worktree(
            domain="be", run_id="run-006"
        )
        wt_path = info.path
        assert Path(wt_path).exists()

        result = manager.cleanup_domain_worktree("be", "run-006")
        assert result is True
        assert not Path(wt_path).exists()

    def test_cleanup_removes_from_tracking(self, manager):
        """AC-05: Cleanup removes worktree from internal tracking."""
        manager.create_domain_worktree(domain="qa", run_id="run-007")
        assert manager.get_domain_worktree("qa", "run-007") is not None

        manager.cleanup_domain_worktree("qa", "run-007")
        assert manager.get_domain_worktree("qa", "run-007") is None

    def test_cleanup_run_removes_all(self, manager):
        """AC-05: cleanup_run_worktrees removes all worktrees for a run."""
        for domain in ["fe", "be", "qa"]:
            manager.create_domain_worktree(domain=domain, run_id="run-008")

        assert len(manager.list_run_worktrees("run-008")) == 3

        result = manager.cleanup_run_worktrees("run-008")
        assert result is True
        assert len(manager.list_run_worktrees("run-008")) == 0

    def test_create_handles_existing_worktree(self, manager):
        """AC-01: Re-creating a worktree for the same domain/run succeeds."""
        info1 = manager.create_domain_worktree(domain="be", run_id="run-009")
        info2 = manager.create_domain_worktree(domain="be", run_id="run-009")
        assert info2.is_valid is True
        assert Path(info2.path).exists()


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Command Execution in Worktree (AC-03)
# ═══════════════════════════════════════════════════════════════════════════════

class TestCommandExecution:
    """Tests for AC-03: Commands execute in the correct worktree."""

    def test_worktree_context_changes_directory(self, manager):
        """AC-03: worktree_context sets CWD to worktree path."""
        info = manager.create_domain_worktree(domain="be", run_id="run-010")

        with worktree_context(info.path) as path:
            assert os.getcwd() == str(Path(info.path).resolve())

    def test_worktree_context_restores_directory(self, manager):
        """AC-03: CWD is restored after exiting context."""
        original = os.getcwd()
        info = manager.create_domain_worktree(domain="fe", run_id="run-011")

        with worktree_context(info.path):
            pass

        assert os.getcwd() == original

    def test_execute_in_worktree_runs_function(self, manager):
        """AC-03: execute_in_worktree runs callable in correct directory."""
        info = manager.create_domain_worktree(domain="qa", run_id="run-012")
        expected_path = str(Path(info.path).resolve())

        result = execute_in_worktree(info.path, os.getcwd)
        assert result == expected_path

    def test_worktree_context_restores_on_error(self, manager):
        """AC-03: CWD is restored even if an exception occurs."""
        original = os.getcwd()
        info = manager.create_domain_worktree(domain="be", run_id="run-013")

        with pytest.raises(ValueError):
            with worktree_context(info.path):
                raise ValueError("test error")

        assert os.getcwd() == original


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Concurrent Operations (AC-06)
# ═══════════════════════════════════════════════════════════════════════════════

class TestConcurrentOperations:
    """Tests for AC-06: Concurrent worktrees do not conflict."""

    def test_four_worktrees_created(self, manager):
        """AC-06: Can create 4 concurrent worktrees."""
        domains = ["fe", "be", "qa", "pm"]
        infos = []
        for domain in domains:
            info = manager.create_domain_worktree(
                domain=domain, run_id="run-014"
            )
            infos.append(info)

        assert len(infos) == 4
        assert all(i.is_valid for i in infos)
        assert all(Path(i.path).exists() for i in infos)

    def test_concurrent_commits_no_lock_conflicts(self, manager, git_repo):
        """AC-06: 4 worktrees can commit independently without lock conflicts."""
        domains = ["fe", "be", "qa", "pm"]
        infos = {}
        for domain in domains:
            info = manager.create_domain_worktree(
                domain=domain, run_id="run-015"
            )
            infos[domain] = info

        errors = []

        def commit_in_worktree(domain, wt_info):
            try:
                # Create a domain-specific file and commit
                fpath = Path(wt_info.path) / f"{domain}-file.txt"
                fpath.write_text(f"{domain} content\n")
                _run(["git", "add", "."], cwd=wt_info.path)
                _run(
                    ["git", "-c", "user.name=Test", "-c", "user.email=t@t.com",
                     "commit", "-m", f"{domain} commit"],
                    cwd=wt_info.path,
                )
            except Exception as e:
                errors.append(f"{domain}: {e}")

        threads = []
        for domain, info in infos.items():
            t = threading.Thread(
                target=commit_in_worktree, args=(domain, info)
            )
            threads.append(t)

        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=30)

        assert len(errors) == 0, f"Concurrent commit errors: {errors}"

    def test_worktrees_have_isolated_files(self, manager):
        """AC-06: File changes in one worktree don't appear in another."""
        info_fe = manager.create_domain_worktree(
            domain="fe", run_id="run-016"
        )
        info_be = manager.create_domain_worktree(
            domain="be", run_id="run-016"
        )

        # Write file in FE worktree
        (Path(info_fe.path) / "fe-only.txt").write_text("fe content\n")

        # File should NOT exist in BE worktree
        assert not (Path(info_be.path) / "fe-only.txt").exists()

    def test_different_runs_have_separate_worktrees(self, manager):
        """AC-06: Different runs create separate worktree directories."""
        info_a = manager.create_domain_worktree(
            domain="be", run_id="run-A"
        )
        info_b = manager.create_domain_worktree(
            domain="be", run_id="run-B"
        )

        assert info_a.path != info_b.path
        assert Path(info_a.path).exists()
        assert Path(info_b.path).exists()


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Crash Recovery (AC-07)
# ═══════════════════════════════════════════════════════════════════════════════

class TestCrashRecovery:
    """Tests for AC-07: Worktree state persists across crashes."""

    def test_worktree_survives_manager_restart(self, git_repo):
        """AC-07: Worktree persists when manager is recreated."""
        # First manager creates a worktree
        m1 = DomainWorktreeManager(repo_path=str(git_repo))
        info = m1.create_domain_worktree(domain="be", run_id="run-017")
        wt_path = info.path

        # Simulate crash: drop m1 and create new manager
        del m1
        m2 = DomainWorktreeManager(repo_path=str(git_repo))

        # Worktree directory should still exist
        assert Path(wt_path).exists()

        # New manager can discover it
        discovered = m2.discover_worktrees()
        wt_paths = [d.path for d in discovered]
        assert wt_path in wt_paths

    def test_discovered_worktrees_have_correct_branches(self, git_repo):
        """AC-07: Discovered worktrees report correct branch names."""
        m1 = DomainWorktreeManager(repo_path=str(git_repo))
        m1.create_domain_worktree(domain="fe", run_id="run-018")

        m2 = DomainWorktreeManager(repo_path=str(git_repo))
        discovered = m2.discover_worktrees()

        # Find the fe worktree
        fe_wts = [d for d in discovered if d.domain == "fe"]
        assert len(fe_wts) == 1
        assert fe_wts[0].branch == "wave/run-018/fe"

    def test_committed_work_persists_across_restart(self, git_repo):
        """AC-07: Committed work in worktree survives manager restart."""
        m1 = DomainWorktreeManager(repo_path=str(git_repo))
        info = m1.create_domain_worktree(domain="be", run_id="run-019")

        # Commit a file in the worktree
        (Path(info.path) / "work.txt").write_text("important work\n")
        _run(["git", "add", "."], cwd=info.path)
        _run(
            ["git", "-c", "user.name=Test", "-c", "user.email=t@t.com",
             "commit", "-m", "save work"],
            cwd=info.path,
        )

        # Simulate crash
        del m1

        # Work should still be there
        assert (Path(info.path) / "work.txt").read_text() == "important work\n"

    def test_cleanup_nonexistent_worktree_succeeds(self, manager):
        """AC-07: Cleanup of a worktree that doesn't exist returns True."""
        result = manager.cleanup_domain_worktree("nonexistent", "no-run")
        assert result is True


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Error Handling
# ═══════════════════════════════════════════════════════════════════════════════

class TestErrorHandling:
    """Tests for error conditions."""

    def test_create_with_invalid_base_branch(self, manager):
        """Creating from a non-existent base branch sets is_valid=False."""
        info = manager.create_domain_worktree(
            domain="be", run_id="run-020",
            base_branch="nonexistent-branch"
        )
        assert info.is_valid is False

    def test_get_nonexistent_worktree_returns_none(self, manager):
        """get_domain_worktree returns None for unknown worktree."""
        result = manager.get_domain_worktree("unknown", "no-run")
        assert result is None

    def test_list_empty_run_returns_empty(self, manager):
        """list_run_worktrees returns [] for run with no worktrees."""
        result = manager.list_run_worktrees("nonexistent-run")
        assert result == []

    def test_max_worktrees_tracked(self, manager):
        """Manager tracks all created worktrees correctly."""
        for i in range(8):
            manager.create_domain_worktree(
                domain=f"d{i}", run_id="run-021"
            )
        result = manager.list_run_worktrees("run-021")
        assert len(result) == 8


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Integration Branch & Merge
# ═══════════════════════════════════════════════════════════════════════════════

class TestIntegrationMerge:
    """Tests for integration branch creation and domain merging."""

    def test_create_integration_branch(self, manager, git_repo):
        """Integration branch is created as a real git branch."""
        branch_name = manager.create_integration_branch(
            run_id="run-022"
        )
        assert branch_name == "wave/run-022/integration"

        # Verify branch exists in git
        output = _run(
            ["git", "branch", "--list", branch_name],
            cwd=str(git_repo),
        )
        assert branch_name in output

    def test_merge_domain_to_integration(self, manager, git_repo):
        """Merge domain branch into integration branch succeeds."""
        # Create integration branch
        manager.create_integration_branch(run_id="run-023")

        # Create domain worktree and commit a file
        info = manager.create_domain_worktree(
            domain="be", run_id="run-023"
        )
        (Path(info.path) / "be-feature.txt").write_text("backend work\n")
        _run(["git", "add", "."], cwd=info.path)
        _run(
            ["git", "-c", "user.name=Test", "-c", "user.email=t@t.com",
             "commit", "-m", "be feature"],
            cwd=info.path,
        )

        result = manager.merge_domain_to_integration("be", "run-023")
        assert isinstance(result, MergeResult)
        assert result.success is True
        assert result.has_conflicts is False

    def test_merge_all_domains(self, manager, git_repo):
        """Merge multiple domains into integration branch."""
        run_id = "run-024"
        manager.create_integration_branch(run_id=run_id)

        # Create two domain worktrees with non-overlapping files
        for domain, filename in [("fe", "frontend.txt"), ("be", "backend.txt")]:
            info = manager.create_domain_worktree(domain=domain, run_id=run_id)
            (Path(info.path) / filename).write_text(f"{domain} work\n")
            _run(["git", "add", "."], cwd=info.path)
            _run(
                ["git", "-c", "user.name=Test", "-c", "user.email=t@t.com",
                 "commit", "-m", f"{domain} commit"],
                cwd=info.path,
            )

        result = manager.merge_all_domains(run_id, ["fe", "be"])
        assert result.success is True
        assert result.has_conflicts is False

    def test_merge_detects_conflicts(self, manager, git_repo):
        """Merge detects file-level conflicts between domains."""
        run_id = "run-025"
        manager.create_integration_branch(run_id=run_id)

        # Two domains edit the same file
        for domain in ["fe", "be"]:
            info = manager.create_domain_worktree(domain=domain, run_id=run_id)
            (Path(info.path) / "shared.txt").write_text(f"{domain} version\n")
            _run(["git", "add", "."], cwd=info.path)
            _run(
                ["git", "-c", "user.name=Test", "-c", "user.email=t@t.com",
                 "commit", "-m", f"{domain} changes to shared file"],
                cwd=info.path,
            )

        # First merge succeeds
        result1 = manager.merge_domain_to_integration("fe", run_id)
        assert result1.success is True

        # Second merge should have conflicts
        result2 = manager.merge_domain_to_integration("be", run_id)
        assert result2.has_conflicts is True

    def test_integration_branch_includes_merged_files(self, manager, git_repo):
        """After merge, integration branch contains domain files."""
        run_id = "run-026"
        manager.create_integration_branch(run_id=run_id)

        info = manager.create_domain_worktree(
            domain="fe", run_id=run_id
        )
        (Path(info.path) / "new-component.tsx").write_text("export default () => {}\n")
        _run(["git", "add", "."], cwd=info.path)
        _run(
            ["git", "-c", "user.name=Test", "-c", "user.email=t@t.com",
             "commit", "-m", "add component"],
            cwd=info.path,
        )

        manager.merge_domain_to_integration("fe", run_id)

        # Check out integration branch in a temp worktree
        int_branch = f"wave/{run_id}/integration"
        int_path = Path(git_repo).parent / "worktrees" / run_id / "verify"
        int_path.parent.mkdir(parents=True, exist_ok=True)
        _run(
            ["git", "worktree", "add", str(int_path), int_branch],
            cwd=str(git_repo),
        )
        assert (int_path / "new-component.tsx").exists()

        # Cleanup
        _run(
            ["git", "worktree", "remove", str(int_path), "--force"],
            cwd=str(git_repo),
        )
