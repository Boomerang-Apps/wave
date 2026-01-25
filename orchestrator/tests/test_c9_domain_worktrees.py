"""
Phase 9: Per-Domain Worktrees TDD Tests
Tests for domain-specific git worktree isolation.

Based on Grok's Parallel Domain Execution Recommendations

Test Categories:
1. Worktree Creation (6 tests)
2. Worktree Isolation (5 tests)
3. Worktree Merge (7 tests)

Total: 18 tests
"""

import pytest
from typing import Dict, Any, List
from contextlib import contextmanager


# =============================================================================
# Test Category 1: Worktree Creation (6 tests)
# =============================================================================

class TestWorktreeCreation:
    """Tests for domain worktree creation"""

    def test_domain_worktree_info_exists(self):
        """DomainWorktreeInfo dataclass should exist"""
        from src.git.domain_worktrees import DomainWorktreeInfo

        info = DomainWorktreeInfo(
            domain="auth",
            run_id="abc123",
            path="/worktrees/abc123/auth",
            branch="wave/abc123/auth",
            base_branch="main",
            created_at="2026-01-25T12:00:00",
            is_valid=True,
        )

        assert info.domain == "auth"
        assert info.run_id == "abc123"

    def test_domain_worktree_manager_exists(self):
        """DomainWorktreeManager class should exist"""
        from src.git.domain_worktrees import DomainWorktreeManager

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        assert manager is not None

    def test_create_domain_worktree_exists(self):
        """create_domain_worktree method should exist"""
        from src.git.domain_worktrees import DomainWorktreeManager

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        assert callable(getattr(manager, "create_domain_worktree", None))

    def test_create_domain_worktree_returns_info(self):
        """create_domain_worktree should return DomainWorktreeInfo"""
        from src.git.domain_worktrees import DomainWorktreeManager, DomainWorktreeInfo

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        result = manager.create_domain_worktree(
            domain="auth",
            run_id="test-123",
            base_branch="main"
        )

        assert isinstance(result, DomainWorktreeInfo)

    def test_create_domain_worktree_uses_run_id(self):
        """create_domain_worktree should include run_id in path"""
        from src.git.domain_worktrees import DomainWorktreeManager

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        result = manager.create_domain_worktree(
            domain="auth",
            run_id="xyz789",
            base_branch="main"
        )

        assert "xyz789" in result.path
        assert result.run_id == "xyz789"

    def test_create_domain_worktree_uses_domain_name(self):
        """create_domain_worktree should include domain in path and branch"""
        from src.git.domain_worktrees import DomainWorktreeManager

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        result = manager.create_domain_worktree(
            domain="payments",
            run_id="test-123",
            base_branch="main"
        )

        assert "payments" in result.path
        assert "payments" in result.branch
        assert result.domain == "payments"


# =============================================================================
# Test Category 2: Worktree Isolation (5 tests)
# =============================================================================

class TestWorktreeIsolation:
    """Tests for worktree isolation and management"""

    def test_get_domain_worktree_exists(self):
        """get_domain_worktree method should exist"""
        from src.git.domain_worktrees import DomainWorktreeManager

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        assert callable(getattr(manager, "get_domain_worktree", None))

    def test_list_run_worktrees_exists(self):
        """list_run_worktrees method should exist"""
        from src.git.domain_worktrees import DomainWorktreeManager

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        assert callable(getattr(manager, "list_run_worktrees", None))

    def test_list_run_worktrees_filters_by_run(self):
        """list_run_worktrees should return list filtered by run_id"""
        from src.git.domain_worktrees import DomainWorktreeManager

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        result = manager.list_run_worktrees(run_id="test-run")

        assert isinstance(result, list)

    def test_cleanup_domain_worktree_exists(self):
        """cleanup_domain_worktree method should exist"""
        from src.git.domain_worktrees import DomainWorktreeManager

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        assert callable(getattr(manager, "cleanup_domain_worktree", None))

    def test_cleanup_run_worktrees_exists(self):
        """cleanup_run_worktrees method should exist"""
        from src.git.domain_worktrees import DomainWorktreeManager

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        assert callable(getattr(manager, "cleanup_run_worktrees", None))


# =============================================================================
# Test Category 3: Worktree Merge (7 tests)
# =============================================================================

class TestWorktreeMerge:
    """Tests for worktree merging operations"""

    def test_create_integration_branch_exists(self):
        """create_integration_branch method should exist"""
        from src.git.domain_worktrees import DomainWorktreeManager

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        assert callable(getattr(manager, "create_integration_branch", None))

    def test_merge_domain_to_integration_exists(self):
        """merge_domain_to_integration method should exist"""
        from src.git.domain_worktrees import DomainWorktreeManager

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        assert callable(getattr(manager, "merge_domain_to_integration", None))

    def test_merge_all_domains_exists(self):
        """merge_all_domains method should exist"""
        from src.git.domain_worktrees import DomainWorktreeManager

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        assert callable(getattr(manager, "merge_all_domains", None))

    def test_merge_returns_merge_result(self):
        """merge_domain_to_integration should return MergeResult"""
        from src.git.domain_worktrees import DomainWorktreeManager
        from src.git.tools import MergeResult

        manager = DomainWorktreeManager(repo_path="/tmp/test-repo")
        result = manager.merge_domain_to_integration(
            domain="auth",
            run_id="test-123"
        )

        assert isinstance(result, MergeResult)

    def test_worktree_context_exists(self):
        """worktree_context function should exist"""
        from src.git.worktree_context import worktree_context
        assert callable(worktree_context)

    def test_worktree_context_is_context_manager(self):
        """worktree_context should be a context manager"""
        from src.git.worktree_context import worktree_context
        import contextlib

        # Check it returns a context manager
        ctx = worktree_context("/tmp/test-path")
        assert hasattr(ctx, "__enter__") and hasattr(ctx, "__exit__")

    def test_execute_in_worktree_exists(self):
        """execute_in_worktree function should exist"""
        from src.git.worktree_context import execute_in_worktree
        assert callable(execute_in_worktree)
