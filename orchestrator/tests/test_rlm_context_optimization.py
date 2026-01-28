"""
TDD Tests for RLM Context Optimization (Pruning)
Gate 0 Validation - Grok Improvement Request

These tests are written FIRST (RED state) before implementation.
Tests should FAIL initially, then pass after implementation (GREEN state).

Grok Requirement: Trim P.json to essential (current_wave only) - reduces prompt tokens 30%
"""

import pytest
import json
import os
import sys

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestContextPruning:
    """TDD tests for P Variable context pruning."""

    def test_prune_p_variable_keeps_essential_fields(self):
        """Test that prune_p_variable keeps only essential fields."""
        from tools.p_variable import prune_p_variable

        full_p_variable = {
            "meta": {
                "project_name": "Footprint",
                "created_at": "2026-01-01",
                "extra_metadata": "lots of data"
            },
            "codebase": {
                "file_count": 5352,
                "files": ["file1.ts", "file2.ts", "...5000 more files..."],
                "structure": {"deep": {"nested": {"data": "here"}}}
            },
            "wave_state": {
                "current_wave": 1,
                "wave_type": "feature",
                "stories": ["WAVE1-FE-001.json"]
            },
            "agent_memory": {
                "last_action": "code_generation"
            },
            "historical_data": {
                "wave_0": {"completed": True},
                "wave_-1": {"completed": True}
            }
        }

        pruned = prune_p_variable(full_p_variable)

        # Should keep essential fields
        assert "wave_state" in pruned
        assert "agent_memory" in pruned
        assert pruned["wave_state"]["current_wave"] == 1

        # Should NOT include bloated fields
        assert "historical_data" not in pruned
        assert "files" not in pruned.get("codebase", {})

    def test_prune_p_variable_reduces_size_by_30_percent(self):
        """Test that pruning reduces token count by at least 30%."""
        from tools.p_variable import prune_p_variable, estimate_token_count

        # Create a bloated P variable
        full_p_variable = {
            "meta": {"project_name": "Footprint"},
            "codebase": {
                "file_count": 5352,
                "files": [f"file_{i}.ts" for i in range(1000)],  # Bloated
                "structure": {"data": "x" * 10000}  # Bloated
            },
            "wave_state": {
                "current_wave": 1,
                "stories": ["WAVE1-FE-001.json"]
            },
            "agent_memory": {"last_action": "test"}
        }

        original_tokens = estimate_token_count(full_p_variable)
        pruned = prune_p_variable(full_p_variable)
        pruned_tokens = estimate_token_count(pruned)

        reduction = (original_tokens - pruned_tokens) / original_tokens * 100
        assert reduction >= 30, f"Expected 30% reduction, got {reduction:.1f}%"

    def test_prune_p_variable_handles_empty_input(self):
        """Test that prune_p_variable handles empty or None input."""
        from tools.p_variable import prune_p_variable

        assert prune_p_variable(None) == {}
        assert prune_p_variable({}) == {}

    def test_prune_p_variable_preserves_current_wave_stories(self):
        """Test that pruning keeps current wave stories intact."""
        from tools.p_variable import prune_p_variable

        full_p_variable = {
            "wave_state": {
                "current_wave": 2,
                "stories": ["WAVE2-FE-001.json", "WAVE2-BE-001.json"],
                "wave_type": "feature"
            },
            "old_waves": {
                "wave_1": {"completed": True, "stories": ["WAVE1-FE-001.json"]}
            }
        }

        pruned = prune_p_variable(full_p_variable)

        # Current wave stories should be preserved
        assert "wave_state" in pruned
        assert pruned["wave_state"]["stories"] == ["WAVE2-FE-001.json", "WAVE2-BE-001.json"]
        # Old waves should be removed
        assert "old_waves" not in pruned


class TestOptimizedContextForAgents:
    """Tests for optimized context injection into agent prompts."""

    def test_get_optimized_project_context(self):
        """Test that optimized context is smaller than full context."""
        from tools.p_variable import get_project_context, get_optimized_project_context

        p_variable = {
            "meta": {"project_name": "Footprint", "project_root": "/path"},
            "codebase": {
                "file_count": 5352,
                "source_extensions": [".ts", ".tsx", ".js", ".py", ".md"]
            },
            "wave_state": {"current_wave": 1}
        }

        full_context = get_project_context(p_variable)
        optimized_context = get_optimized_project_context(p_variable)

        # Optimized should be shorter or equal (more concise)
        assert len(optimized_context) <= len(full_context) * 1.1  # Allow 10% margin

    def test_optimized_context_includes_essential_info(self):
        """Test that optimized context includes essential information."""
        from tools.p_variable import get_optimized_project_context

        p_variable = {
            "meta": {"project_name": "Footprint"},
            "wave_state": {"current_wave": 1, "wave_type": "feature"}
        }

        context = get_optimized_project_context(p_variable)

        assert "Footprint" in context
        assert "Wave" in context or "wave" in context


class TestTokenEstimation:
    """Tests for token count estimation."""

    def test_estimate_token_count_basic(self):
        """Test basic token count estimation."""
        from tools.p_variable import estimate_token_count

        # Simple object
        obj = {"key": "value"}
        tokens = estimate_token_count(obj)
        assert tokens > 0

    def test_estimate_token_count_scales_with_size(self):
        """Test that token count scales with object size."""
        from tools.p_variable import estimate_token_count

        small = {"key": "value"}
        large = {"key": "value" * 100}

        small_tokens = estimate_token_count(small)
        large_tokens = estimate_token_count(large)

        assert large_tokens > small_tokens


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
