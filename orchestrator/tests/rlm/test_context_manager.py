"""
Tests for RLM Context Manager
Story: WAVE-P4-001

Tests the RLM Context Manager that enables efficient context usage
by loading only relevant files, enforcing token limits via LRU eviction,
externalizing state at checkpoints, and enabling on-demand retrieval.

Test Categories:
1. Domain-Scoped Context (AC-01) — 4 tests
2. Story-Specific Context (AC-02) — 3 tests
3. Token Tracking & LRU Eviction (AC-03) — 5 tests
4. State Externalization (AC-04) — 4 tests
5. On-Demand Retrieval (AC-05) — 3 tests
6. Cost Reduction Verification (AC-06) — 3 tests
7. Context Accuracy Retention (AC-07) — 3 tests

Total: 25 tests
"""

import json
import os
import time
import pytest
from pathlib import Path
from typing import Dict, Any, List
from unittest.mock import MagicMock, patch

from src.rlm.context_manager import RLMContextManager, ContextEntry
from src.rlm.lru_cache import LRUContextCache
from src.rlm.token_tracker import TokenTracker
from src.rlm.state_externalizer import StateExternalizer


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def project_dir(tmp_path):
    """Create a project directory with domain-structured files."""
    repo = tmp_path / "project"
    repo.mkdir()

    # Auth domain files
    auth_dir = repo / "src" / "auth"
    auth_dir.mkdir(parents=True)
    (auth_dir / "login.py").write_text("def login(user, password): pass\n" * 20)
    (auth_dir / "logout.py").write_text("def logout(session): pass\n" * 10)
    (auth_dir / "middleware.py").write_text("def auth_middleware(req): pass\n" * 15)

    # Booking domain files
    booking_dir = repo / "src" / "booking"
    booking_dir.mkdir(parents=True)
    (booking_dir / "create.py").write_text("def create_booking(data): pass\n" * 25)
    (booking_dir / "cancel.py").write_text("def cancel_booking(id): pass\n" * 10)

    # Payment domain files
    payment_dir = repo / "src" / "payment"
    payment_dir.mkdir(parents=True)
    (payment_dir / "charge.py").write_text("def charge(amount): pass\n" * 30)
    (payment_dir / "refund.py").write_text("def refund(txn_id): pass\n" * 15)

    # Shared files
    shared_dir = repo / "src" / "shared"
    shared_dir.mkdir(parents=True)
    (shared_dir / "utils.py").write_text("def helper(): pass\n" * 10)

    # Non-domain files (should not be loaded)
    docs_dir = repo / "docs"
    docs_dir.mkdir(parents=True)
    (docs_dir / "README.md").write_text("# Project\n" * 100)

    return repo


@pytest.fixture
def domain_config():
    """Domain config for testing."""
    return {
        "domains": [
            {"id": "auth", "name": "Auth", "file_patterns": ["src/auth/**/*"]},
            {"id": "booking", "name": "Booking", "file_patterns": ["src/booking/**/*"]},
            {"id": "payment", "name": "Payment", "file_patterns": ["src/payment/**/*"]},
            {"id": "shared", "name": "Shared", "file_patterns": ["src/shared/**/*"]},
        ],
    }


@pytest.fixture
def story_with_context():
    """Story JSON with context.read_files."""
    return {
        "story_id": "WAVE-001",
        "domain": "auth",
        "context": {
            "read_files": [
                "src/auth/login.py",
                "src/shared/utils.py",
            ],
        },
    }


@pytest.fixture
def story_no_context():
    """Story JSON without context.read_files."""
    return {
        "story_id": "WAVE-002",
        "domain": "booking",
    }


@pytest.fixture
def context_manager(project_dir, domain_config):
    """RLMContextManager for auth domain."""
    return RLMContextManager(
        domain="auth",
        domain_config=domain_config,
        repo_path=str(project_dir),
        max_tokens=100000,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Domain-Scoped Context (AC-01)
# ═══════════════════════════════════════════════════════════════════════════════

class TestDomainScopedContext:
    """Tests for AC-01: Context manager initialized with domain scope."""

    def test_loads_only_domain_files(self, context_manager, project_dir):
        """AC-01: Only auth domain files are loaded."""
        context_manager.load_domain_context()
        loaded_keys = context_manager.loaded_files()

        # Auth files should be loaded
        assert any("auth/login.py" in k for k in loaded_keys)
        assert any("auth/logout.py" in k for k in loaded_keys)

        # Booking/payment files should NOT be loaded
        assert not any("booking" in k for k in loaded_keys)
        assert not any("payment" in k for k in loaded_keys)

    def test_domain_context_excludes_docs(self, context_manager, project_dir):
        """AC-01: Non-source files excluded from domain context."""
        context_manager.load_domain_context()
        loaded_keys = context_manager.loaded_files()

        assert not any("docs" in k for k in loaded_keys)

    def test_domain_sets_scope_correctly(self, context_manager):
        """AC-01: Domain scope is stored correctly."""
        assert context_manager.domain == "auth"

    def test_different_domain_loads_different_files(self, project_dir, domain_config):
        """AC-01: Booking domain loads booking files."""
        mgr = RLMContextManager(
            domain="booking",
            domain_config=domain_config,
            repo_path=str(project_dir),
        )
        mgr.load_domain_context()
        loaded_keys = mgr.loaded_files()

        assert any("booking/create.py" in k for k in loaded_keys)
        assert not any("auth" in k for k in loaded_keys)


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Story-Specific Context (AC-02)
# ═══════════════════════════════════════════════════════════════════════════════

class TestStorySpecificContext:
    """Tests for AC-02: Story-specific context loaded from AI Story."""

    def test_loads_story_read_files(self, context_manager, story_with_context):
        """AC-02: Files from story context.read_files are loaded."""
        context_manager.load_story_context(story_with_context)
        loaded_keys = context_manager.loaded_files()

        assert any("auth/login.py" in k for k in loaded_keys)
        assert any("shared/utils.py" in k for k in loaded_keys)

    def test_handles_story_without_context(self, context_manager, story_no_context):
        """AC-02: Story without context.read_files handled gracefully."""
        context_manager.load_story_context(story_no_context)
        # Should not raise, loaded files may be empty
        assert isinstance(context_manager.loaded_files(), list)

    def test_story_context_combined_with_domain(
        self, context_manager, story_with_context
    ):
        """AC-02: Story files added to existing domain context."""
        context_manager.load_domain_context()
        count_before = len(context_manager.loaded_files())
        context_manager.load_story_context(story_with_context)
        count_after = len(context_manager.loaded_files())

        # shared/utils.py is outside auth domain, so should be added
        assert count_after >= count_before


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Token Tracking & LRU Eviction (AC-03)
# ═══════════════════════════════════════════════════════════════════════════════

class TestTokenTrackingAndLRU:
    """Tests for AC-03: Context size tracked and limited."""

    def test_lru_cache_basic_put_get(self):
        """AC-03: LRU cache stores and retrieves entries."""
        cache = LRUContextCache(max_tokens=10000)
        cache.put("file_a", "content of file a", tokens=100)
        assert cache.get("file_a") == "content of file a"

    def test_lru_cache_evicts_oldest(self):
        """AC-03: LRU evicts least recently used when over limit."""
        cache = LRUContextCache(max_tokens=200)
        cache.put("file_a", "aaa", tokens=100)
        cache.put("file_b", "bbb", tokens=100)
        # This should evict file_a to make room
        cache.put("file_c", "ccc", tokens=100)

        assert "file_a" not in cache
        assert "file_b" in cache
        assert "file_c" in cache

    def test_lru_cache_access_refreshes_position(self):
        """AC-03: Accessing an entry moves it to most recent."""
        cache = LRUContextCache(max_tokens=200)
        cache.put("file_a", "aaa", tokens=100)
        cache.put("file_b", "bbb", tokens=100)
        # Access file_a to make it recent
        cache.get("file_a")
        # Now adding file_c should evict file_b (oldest)
        cache.put("file_c", "ccc", tokens=100)

        assert "file_a" in cache
        assert "file_b" not in cache
        assert "file_c" in cache

    def test_lru_cache_tracks_total_tokens(self):
        """AC-03: Total tokens tracked correctly."""
        cache = LRUContextCache(max_tokens=10000)
        cache.put("file_a", "aaa", tokens=100)
        cache.put("file_b", "bbb", tokens=200)
        assert cache.total_tokens == 300

    def test_context_manager_enforces_token_limit(self, project_dir, domain_config):
        """AC-03: Context manager respects 100K token limit."""
        mgr = RLMContextManager(
            domain="auth",
            domain_config=domain_config,
            repo_path=str(project_dir),
            max_tokens=500,  # Very small limit for testing
        )
        mgr.load_domain_context()

        # Total tokens should not exceed limit
        assert mgr.total_tokens <= 500


# ═══════════════════════════════════════════════════════════════════════════════
# 4. State Externalization (AC-04)
# ═══════════════════════════════════════════════════════════════════════════════

class TestStateExternalization:
    """Tests for AC-04: State externalized to database at checkpoints."""

    def test_save_checkpoint(self, tmp_path):
        """AC-04: State can be saved to storage."""
        ext = StateExternalizer(storage_path=str(tmp_path / "state"))
        state = {"context": {"file_a": "content"}, "tokens": 1000}
        checkpoint_id = ext.save_checkpoint(state)
        assert checkpoint_id is not None

    def test_restore_checkpoint(self, tmp_path):
        """AC-04: State can be restored from storage."""
        ext = StateExternalizer(storage_path=str(tmp_path / "state"))
        state = {"context": {"file_a": "content"}, "tokens": 1000}
        checkpoint_id = ext.save_checkpoint(state)
        restored = ext.restore_checkpoint(checkpoint_id)
        assert restored["tokens"] == 1000
        assert restored["context"]["file_a"] == "content"

    def test_save_clears_context_when_requested(self, tmp_path):
        """AC-04: Context can be cleared after save."""
        ext = StateExternalizer(storage_path=str(tmp_path / "state"))
        state = {"context": {"file_a": "content"}, "tokens": 1000}
        ext.save_checkpoint(state, clear_after=True)
        # Verify checkpoint exists and state was returned for clearing
        assert ext.list_checkpoints()

    def test_handles_large_state(self, tmp_path):
        """AC-04: Large state objects handled correctly."""
        ext = StateExternalizer(storage_path=str(tmp_path / "state"))
        large_state = {
            "context": {f"file_{i}": "x" * 1000 for i in range(100)},
            "tokens": 50000,
        }
        checkpoint_id = ext.save_checkpoint(large_state)
        restored = ext.restore_checkpoint(checkpoint_id)
        assert restored["tokens"] == 50000
        assert len(restored["context"]) == 100


# ═══════════════════════════════════════════════════════════════════════════════
# 5. On-Demand Retrieval (AC-05)
# ═══════════════════════════════════════════════════════════════════════════════

class TestOnDemandRetrieval:
    """Tests for AC-05: Context retrieval on demand."""

    def test_retrieve_file_not_in_context(self, context_manager, project_dir):
        """AC-05: File outside domain loaded on demand."""
        # booking file is not in auth domain
        content = context_manager.retrieve("src/booking/create.py")
        assert content is not None
        assert "create_booking" in content

    def test_retrieve_caches_result(self, context_manager, project_dir):
        """AC-05: Retrieved file is cached for subsequent access."""
        context_manager.retrieve("src/booking/create.py")
        assert any("booking/create.py" in k for k in context_manager.loaded_files())

    def test_retrieve_nonexistent_file_returns_none(self, context_manager):
        """AC-05: Nonexistent file returns None."""
        result = context_manager.retrieve("nonexistent/file.py")
        assert result is None


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Cost Reduction Verification (AC-06)
# ═══════════════════════════════════════════════════════════════════════════════

class TestCostReduction:
    """Tests for AC-06: Token usage reduced by >50%."""

    def test_tracker_records_baseline(self):
        """AC-06: TokenTracker records baseline token count."""
        tracker = TokenTracker()
        tracker.set_baseline(full_codebase_tokens=200000)
        assert tracker.baseline_tokens == 200000

    def test_tracker_calculates_reduction(self):
        """AC-06: TokenTracker calculates reduction percentage."""
        tracker = TokenTracker()
        tracker.set_baseline(full_codebase_tokens=200000)
        tracker.record_actual(tokens_used=80000)
        assert tracker.reduction_percent == 60.0

    def test_domain_context_under_50_percent_of_full(self, project_dir, domain_config):
        """AC-06: Domain-scoped context is <50% of full codebase."""
        # Calculate full codebase tokens
        full_tokens = 0
        for root, _, files in os.walk(str(project_dir / "src")):
            for f in files:
                fp = os.path.join(root, f)
                full_tokens += len(open(fp).read()) // 4  # ~4 chars/token

        # Load auth-only context
        mgr = RLMContextManager(
            domain="auth",
            domain_config=domain_config,
            repo_path=str(project_dir),
        )
        mgr.load_domain_context()

        # Auth domain should be <50% of total source
        assert mgr.total_tokens < full_tokens * 0.5


# ═══════════════════════════════════════════════════════════════════════════════
# 7. Context Accuracy Retention (AC-07)
# ═══════════════════════════════════════════════════════════════════════════════

class TestContextAccuracyRetention:
    """Tests for AC-07: No context rot after 100K tokens processed."""

    def test_pinned_files_not_evicted(self):
        """AC-07: Pinned (critical) files survive eviction."""
        cache = LRUContextCache(max_tokens=200)
        cache.put("critical_file", "important", tokens=100, pinned=True)
        cache.put("file_b", "bbb", tokens=100)
        # Adding file_c should evict file_b, not critical_file
        cache.put("file_c", "ccc", tokens=100)

        assert "critical_file" in cache
        assert "file_b" not in cache

    def test_cache_hit_rate_tracked(self):
        """AC-07: Cache tracks hit/miss ratio for accuracy."""
        cache = LRUContextCache(max_tokens=10000)
        cache.put("file_a", "aaa", tokens=100)

        cache.get("file_a")  # hit
        cache.get("file_b")  # miss
        cache.get("file_a")  # hit

        assert cache.hits == 2
        assert cache.misses == 1
        assert cache.hit_rate > 0.6

    def test_context_manager_pins_domain_files(self, context_manager):
        """AC-07: Domain files are pinned to prevent eviction."""
        context_manager.load_domain_context()
        # Domain files should be pinned
        pinned_count = context_manager.pinned_count
        assert pinned_count > 0
