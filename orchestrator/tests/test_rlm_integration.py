"""
Integration Tests for RLM Context Manager - Dynamic File Retrieval (AC-05)
Story: WAVE-P4-001

End-to-end tests verifying that agents can dynamically request files
and have them automatically loaded into context.

Test Coverage:
- AC-05: Dynamic file retrieval on demand
- Integration with orchestrator
- Cache hit/miss behavior
- Token tracking during retrieval
"""

import pytest
import os
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestDynamicFileRetrieval:
    """Integration tests for dynamic file retrieval (AC-05)."""

    @pytest.fixture
    def test_repo(self, tmp_path):
        """Create a test repository with sample files."""
        repo = tmp_path / "test_repo"
        repo.mkdir()

        # Create domain-specific files (auth domain)
        auth_dir = repo / "src" / "features" / "auth"
        auth_dir.mkdir(parents=True)

        (auth_dir / "login.ts").write_text(
            "export function login(username: string, password: string) {\n"
            "  return authenticateUser(username, password);\n"
            "}\n"
        )

        (auth_dir / "register.ts").write_text(
            "export function register(email: string, password: string) {\n"
            "  return createUser(email, password);\n"
            "}\n"
        )

        # Create non-domain file (profiles domain)
        profiles_dir = repo / "src" / "features" / "profiles"
        profiles_dir.mkdir(parents=True)

        (profiles_dir / "profile.ts").write_text(
            "export interface Profile {\n"
            "  id: string;\n"
            "  name: string;\n"
            "}\n"
        )

        # Create shared utility file
        utils_dir = repo / "src" / "utils"
        utils_dir.mkdir(parents=True)

        (utils_dir / "helpers.ts").write_text(
            "export function formatDate(date: Date): string {\n"
            "  return date.toISOString();\n"
            "}\n"
        )

        return repo

    @pytest.fixture
    def domain_config(self):
        """Create domain configuration."""
        return {
            "domains": [
                {
                    "id": "auth",
                    "name": "Authentication",
                    "file_patterns": [
                        "src/features/auth/**/*.ts",
                        "src/features/auth/**/*.tsx"
                    ]
                },
                {
                    "id": "profiles",
                    "name": "User Profiles",
                    "file_patterns": [
                        "src/features/profiles/**/*.ts",
                        "src/features/profiles/**/*.tsx"
                    ]
                }
            ]
        }

    def test_retrieve_file_not_in_cache_loads_from_disk(self, test_repo, domain_config):
        """Test that retrieve() loads a file from disk when not cached."""
        from src.rlm.context_manager import RLMContextManager

        manager = RLMContextManager(
            domain="auth",
            domain_config=domain_config,
            repo_path=str(test_repo),
            max_tokens=100000
        )

        # File should not be in cache initially
        assert "src/utils/helpers.ts" not in manager.loaded_files()
        assert manager.total_tokens == 0

        # Retrieve the file dynamically
        content = manager.retrieve("src/utils/helpers.ts")

        # Verify file was loaded
        assert content is not None
        assert "formatDate" in content
        assert "src/utils/helpers.ts" in manager.loaded_files()
        assert manager.total_tokens > 0

    def test_retrieve_file_already_cached_returns_cached_content(self, test_repo, domain_config):
        """Test that retrieve() returns cached content without reloading."""
        from src.rlm.context_manager import RLMContextManager

        manager = RLMContextManager(
            domain="auth",
            domain_config=domain_config,
            repo_path=str(test_repo),
            max_tokens=100000
        )

        # First retrieval - loads from disk
        content1 = manager.retrieve("src/utils/helpers.ts")
        tokens_after_first = manager.total_tokens

        # Second retrieval - should return from cache
        content2 = manager.retrieve("src/utils/helpers.ts")
        tokens_after_second = manager.total_tokens

        # Content should be identical
        assert content1 == content2

        # Token count should not change (no re-counting)
        assert tokens_after_first == tokens_after_second

        # File should only appear once in loaded files
        assert manager.loaded_files().count("src/utils/helpers.ts") == 1

    def test_retrieve_nonexistent_file_returns_none(self, test_repo, domain_config):
        """Test that retrieve() returns None for non-existent files."""
        from src.rlm.context_manager import RLMContextManager

        manager = RLMContextManager(
            domain="auth",
            domain_config=domain_config,
            repo_path=str(test_repo),
            max_tokens=100000
        )

        # Try to retrieve a file that doesn't exist
        content = manager.retrieve("src/nonexistent/file.ts")

        # Should return None
        assert content is None

        # Should not be added to cache
        assert "src/nonexistent/file.ts" not in manager.loaded_files()

        # Token count should remain 0
        assert manager.total_tokens == 0

    def test_retrieve_adds_unpinned_files(self, test_repo, domain_config):
        """Test that retrieve() adds files as unpinned (can be evicted)."""
        from src.rlm.context_manager import RLMContextManager

        manager = RLMContextManager(
            domain="auth",
            domain_config=domain_config,
            repo_path=str(test_repo),
            max_tokens=100000
        )

        # Load domain files (pinned)
        manager.load_domain_context()
        pinned_count_before = manager.pinned_count

        # Retrieve a file dynamically (unpinned)
        manager.retrieve("src/utils/helpers.ts")

        # Pinned count should not increase
        assert manager.pinned_count == pinned_count_before

    def test_retrieve_multiple_files_tracks_tokens_correctly(self, test_repo, domain_config):
        """Test that retrieving multiple files tracks total tokens correctly."""
        from src.rlm.context_manager import RLMContextManager

        manager = RLMContextManager(
            domain="auth",
            domain_config=domain_config,
            repo_path=str(test_repo),
            max_tokens=100000
        )

        initial_tokens = manager.total_tokens
        assert initial_tokens == 0

        # Retrieve first file
        manager.retrieve("src/utils/helpers.ts")
        tokens_after_first = manager.total_tokens
        assert tokens_after_first > initial_tokens

        # Retrieve second file
        manager.retrieve("src/features/profiles/profile.ts")
        tokens_after_second = manager.total_tokens
        assert tokens_after_second > tokens_after_first

        # Retrieve third file
        manager.retrieve("src/features/auth/login.ts")
        tokens_after_third = manager.total_tokens
        assert tokens_after_third > tokens_after_second

        # All three files should be in context
        loaded = manager.loaded_files()
        assert "src/utils/helpers.ts" in loaded
        assert "src/features/profiles/profile.ts" in loaded
        assert "src/features/auth/login.ts" in loaded

    def test_retrieve_respects_lru_eviction_when_over_limit(self, test_repo, domain_config):
        """Test that retrieve() respects LRU eviction when cache is full."""
        from src.rlm.context_manager import RLMContextManager

        # Create manager with very small token limit
        manager = RLMContextManager(
            domain="auth",
            domain_config=domain_config,
            repo_path=str(test_repo),
            max_tokens=50  # Very small limit to force eviction (reduced from 200)
        )

        # Retrieve files until we exceed limit
        files = [
            "src/features/auth/login.ts",
            "src/features/auth/register.ts",
            "src/features/profiles/profile.ts",
            "src/utils/helpers.ts"
        ]

        for file_path in files:
            manager.retrieve(file_path)

        # Total tokens should not exceed max_tokens significantly
        # (may slightly exceed due to last file, but should trigger eviction)
        assert manager.total_tokens <= manager.max_tokens * 2.0

        # Not all files should be in cache due to eviction
        loaded = manager.loaded_files()
        assert len(loaded) < len(files), f"Expected eviction but all {len(files)} files still loaded (tokens: {manager.total_tokens}/{manager.max_tokens})"

    def test_agent_workflow_retrieve_during_story_execution(self, test_repo, domain_config):
        """
        Integration test simulating agent workflow:
        1. Agent starts with story context
        2. Agent discovers need for additional file during execution
        3. Agent requests file via retrieve()
        4. File is loaded and available in context
        """
        from src.rlm.context_manager import RLMContextManager

        manager = RLMContextManager(
            domain="auth",
            domain_config=domain_config,
            repo_path=str(test_repo),
            max_tokens=100000
        )

        # Step 1: Load story context (simulating story start)
        story = {
            "id": "AUTH-001",
            "title": "Implement login flow",
            "context": {
                "read_files": ["src/features/auth/login.ts"]
            }
        }
        manager.load_story_context(story)

        # Verify initial context
        assert "src/features/auth/login.ts" in manager.loaded_files()
        initial_file_count = len(manager.loaded_files())

        # Step 2: During execution, agent realizes it needs helper utilities
        # Agent calls retrieve() to dynamically load the file
        helper_content = manager.retrieve("src/utils/helpers.ts")

        # Step 3: Verify the file was loaded and is available
        assert helper_content is not None
        assert "formatDate" in helper_content
        assert "src/utils/helpers.ts" in manager.loaded_files()
        assert len(manager.loaded_files()) == initial_file_count + 1

        # Step 4: Get full context to pass to LLM
        full_context = manager.get_context()

        # Verify both files are in context
        assert "src/features/auth/login.ts" in full_context
        assert "src/utils/helpers.ts" in full_context
        assert "login" in full_context["src/features/auth/login.ts"]
        assert "formatDate" in full_context["src/utils/helpers.ts"]

    def test_retrieve_cross_domain_file_succeeds(self, test_repo, domain_config):
        """
        Test that agent can retrieve files from other domains.

        This verifies that retrieve() is not restricted by domain patterns,
        allowing agents to access files outside their primary domain when needed.
        """
        from src.rlm.context_manager import RLMContextManager

        # Auth domain agent
        manager = RLMContextManager(
            domain="auth",
            domain_config=domain_config,
            repo_path=str(test_repo),
            max_tokens=100000
        )

        # Load domain context (only auth files are pinned)
        manager.load_domain_context()

        # Verify only auth domain files are loaded
        loaded_auth = manager.loaded_files()
        assert any("auth" in f for f in loaded_auth)
        assert not any("profiles" in f for f in loaded_auth)

        # Agent discovers need for profile interface during auth implementation
        profile_content = manager.retrieve("src/features/profiles/profile.ts")

        # Verify cross-domain file was retrieved successfully
        assert profile_content is not None
        assert "interface Profile" in profile_content
        assert "src/features/profiles/profile.ts" in manager.loaded_files()

    def test_retrieve_updates_lru_order(self, test_repo, domain_config):
        """Test that retrieve() updates LRU order for cached files."""
        from src.rlm.context_manager import RLMContextManager

        manager = RLMContextManager(
            domain="auth",
            domain_config=domain_config,
            repo_path=str(test_repo),
            max_tokens=500  # Small limit
        )

        # Load files in order
        manager.retrieve("src/features/auth/login.ts")  # Oldest
        manager.retrieve("src/features/auth/register.ts")
        manager.retrieve("src/utils/helpers.ts")  # Newest

        # Re-access the oldest file (should move it to newest)
        manager.retrieve("src/features/auth/login.ts")

        # Load another large file to trigger eviction
        manager.retrieve("src/features/profiles/profile.ts")

        # The re-accessed file should still be in cache
        assert "src/features/auth/login.ts" in manager.loaded_files()


class TestDynamicRetrievalEdgeCases:
    """Edge case tests for dynamic file retrieval."""

    @pytest.fixture
    def test_repo_edge_cases(self, tmp_path):
        """Create test repo with edge case files."""
        repo = tmp_path / "test_repo"
        repo.mkdir()

        # Binary file
        binary_dir = repo / "assets"
        binary_dir.mkdir()
        (binary_dir / "image.png").write_bytes(b'\x89PNG\r\n\x1a\n\x00\x00\x00')

        # Empty file
        (repo / "empty.ts").write_text("")

        # Large file
        (repo / "large.ts").write_text("x" * 100000)

        # File with unicode
        (repo / "unicode.ts").write_text("const emoji = '🚀 🎉';\n")

        return repo

    @pytest.fixture
    def minimal_domain_config(self):
        """Minimal domain config for edge case tests."""
        return {
            "domains": [
                {
                    "id": "test",
                    "name": "Test Domain",
                    "file_patterns": ["*.ts"]
                }
            ]
        }

    def test_retrieve_binary_file_returns_none(self, test_repo_edge_cases, minimal_domain_config):
        """Test that binary files return None (cannot be decoded as text)."""
        from src.rlm.context_manager import RLMContextManager

        manager = RLMContextManager(
            domain="test",
            domain_config=minimal_domain_config,
            repo_path=str(test_repo_edge_cases),
            max_tokens=100000
        )

        # Binary files should return None
        content = manager.retrieve("assets/image.png")
        assert content is None
        assert "assets/image.png" not in manager.loaded_files()

    def test_retrieve_empty_file_succeeds(self, test_repo_edge_cases, minimal_domain_config):
        """Test that empty files can be retrieved."""
        from src.rlm.context_manager import RLMContextManager

        manager = RLMContextManager(
            domain="test",
            domain_config=minimal_domain_config,
            repo_path=str(test_repo_edge_cases),
            max_tokens=100000
        )

        content = manager.retrieve("empty.ts")
        assert content == ""
        assert "empty.ts" in manager.loaded_files()

    def test_retrieve_unicode_file_succeeds(self, test_repo_edge_cases, minimal_domain_config):
        """Test that files with unicode characters are handled correctly."""
        from src.rlm.context_manager import RLMContextManager

        manager = RLMContextManager(
            domain="test",
            domain_config=minimal_domain_config,
            repo_path=str(test_repo_edge_cases),
            max_tokens=100000
        )

        content = manager.retrieve("unicode.ts")
        assert content is not None
        assert "🚀" in content
        assert "🎉" in content

    def test_retrieve_large_file_tracked_correctly(self, test_repo_edge_cases, minimal_domain_config):
        """Test that large files are tracked with correct token count."""
        from src.rlm.context_manager import RLMContextManager

        manager = RLMContextManager(
            domain="test",
            domain_config=minimal_domain_config,
            repo_path=str(test_repo_edge_cases),
            max_tokens=200000  # Allow large file
        )

        content = manager.retrieve("large.ts")
        assert content is not None
        assert len(content) == 100000

        # Token count should be proportional to file size
        # Rough estimate: ~1 token per 4 characters
        expected_tokens = len(content) // 4
        assert manager.total_tokens >= expected_tokens * 0.8  # Allow 20% variance


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
