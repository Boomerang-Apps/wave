"""
Tests for Domain Scoper
Story: WAVE-P4-002

Tests the Domain Scoper that analyzes codebases to determine
which files are relevant per domain using config patterns,
import graph analysis, shared dependency detection, caching,
relevance ranking, and invalidation.

Test Categories:
1. Scope Computation (AC-01) — 3 tests
2. Import Graph Analysis (AC-02) — 4 tests
3. Shared Dependencies (AC-03) — 2 tests
4. Scope Caching (AC-04) — 2 tests
5. Relevance Ranking (AC-05) — 3 tests
6. Invalidation (AC-06) — 2 tests

Total: 16 tests
"""

import os
import time
import pytest
from pathlib import Path

from src.rlm.scoper.domain_scoper import DomainScoper, ScopedFile
from src.rlm.scoper.import_analyzer import ImportAnalyzer
from src.rlm.scoper.scope_cache import ScopeCache


# ═══════════════════════════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def project_dir(tmp_path):
    """Create a project with cross-domain imports."""
    repo = tmp_path / "project"
    repo.mkdir()

    # Auth domain
    auth_dir = repo / "src" / "auth"
    auth_dir.mkdir(parents=True)
    (auth_dir / "login.py").write_text(
        "from src.shared.utils import helper\n"
        "from src.auth.session import create_session\n"
        "def login(user): pass\n"
    )
    (auth_dir / "session.py").write_text(
        "from src.shared.db import get_connection\n"
        "def create_session(user_id): pass\n"
    )
    (auth_dir / "middleware.py").write_text(
        "from src.auth.session import create_session\n"
        "def auth_check(req): pass\n"
    )

    # Booking domain
    booking_dir = repo / "src" / "booking"
    booking_dir.mkdir(parents=True)
    (booking_dir / "create.py").write_text(
        "from src.shared.utils import helper\n"
        "from src.shared.db import get_connection\n"
        "def create_booking(data): pass\n"
    )
    (booking_dir / "cancel.py").write_text(
        "from src.booking.create import create_booking\n"
        "def cancel_booking(id): pass\n"
    )

    # Shared files (used by multiple domains)
    shared_dir = repo / "src" / "shared"
    shared_dir.mkdir(parents=True)
    (shared_dir / "utils.py").write_text("def helper(): pass\n")
    (shared_dir / "db.py").write_text("def get_connection(): pass\n")

    # Payment domain (no cross-domain imports)
    payment_dir = repo / "src" / "payment"
    payment_dir.mkdir(parents=True)
    (payment_dir / "charge.py").write_text(
        "from src.shared.db import get_connection\n"
        "def charge(amount): pass\n"
    )

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
def scoper(project_dir, domain_config):
    """DomainScoper instance."""
    return DomainScoper(
        repo_path=str(project_dir),
        domain_config=domain_config,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Scope Computation (AC-01)
# ═══════════════════════════════════════════════════════════════════════════════

class TestScopeComputation:
    """Tests for AC-01: Domain scope computed from configuration."""

    def test_scope_from_config_patterns(self, scoper):
        """AC-01: Scope includes files matching domain patterns."""
        scope = scoper.compute_scope("auth")
        paths = [s.path for s in scope]
        assert any("auth/login.py" in p for p in paths)
        assert any("auth/session.py" in p for p in paths)
        assert any("auth/middleware.py" in p for p in paths)

    def test_scope_excludes_other_domains(self, scoper):
        """AC-01: Scope excludes files from other domains."""
        scope = scoper.compute_scope("auth")
        paths = [s.path for s in scope]
        assert not any("booking" in p for p in paths if "shared" not in p)

    def test_scope_returns_scoped_file_objects(self, scoper):
        """AC-01: Scope returns ScopedFile objects with metadata."""
        scope = scoper.compute_scope("auth")
        assert len(scope) > 0
        assert all(isinstance(s, ScopedFile) for s in scope)
        assert all(hasattr(s, "path") for s in scope)
        assert all(hasattr(s, "relevance") for s in scope)


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Import Graph Analysis (AC-02)
# ═══════════════════════════════════════════════════════════════════════════════

class TestImportGraphAnalysis:
    """Tests for AC-02: Import graph analyzed for dependencies."""

    def test_direct_imports_included(self, scoper):
        """AC-02: Direct imports added to scope."""
        scope = scoper.compute_scope("auth")
        paths = [s.path for s in scope]
        # login.py imports from shared/utils → should be in scope
        assert any("shared/utils.py" in p for p in paths)

    def test_transitive_imports_included(self, scoper):
        """AC-02: Transitive imports (imports of imports) added."""
        scope = scoper.compute_scope("auth")
        paths = [s.path for s in scope]
        # login.py → session.py → shared/db.py
        assert any("shared/db.py" in p for p in paths)

    def test_import_analyzer_parses_python_imports(self, project_dir):
        """AC-02: ImportAnalyzer parses Python import statements."""
        analyzer = ImportAnalyzer(str(project_dir))
        imports = analyzer.get_imports("src/auth/login.py")
        assert "src.shared.utils" in imports or "src/shared/utils.py" in imports

    def test_circular_imports_handled(self, tmp_path):
        """AC-02: Circular imports don't cause infinite loop."""
        repo = tmp_path / "circ"
        repo.mkdir()
        mod_dir = repo / "src" / "mod"
        mod_dir.mkdir(parents=True)
        (mod_dir / "a.py").write_text("from src.mod.b import func_b\n")
        (mod_dir / "b.py").write_text("from src.mod.a import func_a\n")

        analyzer = ImportAnalyzer(str(repo))
        # Should not hang
        deps = analyzer.get_transitive_imports("src/mod/a.py", max_depth=10)
        assert isinstance(deps, set)


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Shared Dependencies (AC-03)
# ═══════════════════════════════════════════════════════════════════════════════

class TestSharedDependencies:
    """Tests for AC-03: Shared dependencies identified correctly."""

    def test_shared_files_marked(self, scoper):
        """AC-03: Files imported by multiple domains marked as shared."""
        shared = scoper.find_shared_files()
        shared_paths = [s.path for s in shared]
        # shared/utils.py imported by auth AND booking
        assert any("shared/utils.py" in p for p in shared_paths)

    def test_domain_only_files_not_shared(self, scoper):
        """AC-03: Files used by only one domain not marked as shared."""
        shared = scoper.find_shared_files()
        shared_paths = [s.path for s in shared]
        # auth/middleware.py only used by auth domain
        assert not any("auth/middleware.py" in p for p in shared_paths)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Scope Caching (AC-04)
# ═══════════════════════════════════════════════════════════════════════════════

class TestScopeCaching:
    """Tests for AC-04: Scope caching for performance."""

    def test_second_call_uses_cache(self, scoper):
        """AC-04: Second compute_scope call uses cached result."""
        scope1 = scoper.compute_scope("auth")
        scope2 = scoper.compute_scope("auth")
        # Same object reference means cache hit
        assert scope1 is scope2

    def test_cache_stores_per_domain(self, scoper):
        """AC-04: Different domains have independent caches."""
        scope_auth = scoper.compute_scope("auth")
        scope_booking = scoper.compute_scope("booking")
        assert scope_auth is not scope_booking


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Relevance Ranking (AC-05)
# ═══════════════════════════════════════════════════════════════════════════════

class TestRelevanceRanking:
    """Tests for AC-05: Scope provides file relevance ranking."""

    def test_relevance_scores_present(self, scoper):
        """AC-05: Each scoped file has a relevance score."""
        scope = scoper.compute_scope("auth")
        for s in scope:
            assert 0.0 <= s.relevance <= 1.0

    def test_domain_files_ranked_higher(self, scoper):
        """AC-05: Domain-native files ranked higher than imports."""
        scope = scoper.compute_scope("auth")
        domain_files = [s for s in scope if "auth/" in s.path]
        imported_files = [s for s in scope if "shared/" in s.path]

        if domain_files and imported_files:
            max_imported = max(s.relevance for s in imported_files)
            min_domain = min(s.relevance for s in domain_files)
            assert min_domain >= max_imported

    def test_scope_sorted_by_relevance(self, scoper):
        """AC-05: Scope returned sorted by relevance (descending)."""
        scope = scoper.compute_scope("auth")
        scores = [s.relevance for s in scope]
        assert scores == sorted(scores, reverse=True)


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Invalidation (AC-06)
# ═══════════════════════════════════════════════════════════════════════════════

class TestInvalidation:
    """Tests for AC-06: Scope invalidated on file changes."""

    def test_invalidate_clears_cache(self, scoper):
        """AC-06: Invalidation clears cached scope."""
        scope1 = scoper.compute_scope("auth")
        scoper.invalidate("auth")
        scope2 = scoper.compute_scope("auth")
        # After invalidation, should be a new object
        assert scope1 is not scope2

    def test_file_change_detected(self, scoper, project_dir):
        """AC-06: Modified file triggers scope recomputation."""
        scoper.compute_scope("auth")
        # Modify a file
        login_file = project_dir / "src" / "auth" / "login.py"
        login_file.write_text(
            "from src.shared.utils import helper\n"
            "from src.auth.session import create_session\n"
            "from src.payment.charge import charge\n"  # New import
            "def login(user): pass\n"
        )
        scoper.invalidate("auth")
        scope = scoper.compute_scope("auth")
        paths = [s.path for s in scope]
        # New import should now be in scope
        assert any("payment/charge.py" in p for p in paths)
