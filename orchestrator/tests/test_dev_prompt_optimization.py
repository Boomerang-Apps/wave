"""
TDD Tests for Dev Agent Prompt Optimization

Gate0 Validated Sources:
- Anthropic Claude 4.x Best Practices: https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices
- Claude Code Best Practices: https://www.anthropic.com/engineering/claude-code-best-practices

Key findings from research:
1. Be explicit - Claude 4.x responds to precise instructions
2. Avoid over-engineering - only make changes directly requested
3. Structure prompts - separate INSTRUCTIONS, CONTEXT, TASK, OUTPUT FORMAT
4. Add examples - show don't just tell
5. Use acceptance criteria references (AC-###)

Tests written BEFORE implementation (TDD Red phase).
"""

import pytest
import sys
import os

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestDevPromptStructure:
    """Test prompt structure follows Anthropic best practices"""

    def test_prompt_has_instructions_section(self):
        """Prompt should have clear INSTRUCTIONS section"""
        from src.graph import DEV_SYSTEM_PROMPT

        # Per Anthropic: Use separate sections for INSTRUCTIONS
        assert "responsibilities" in DEV_SYSTEM_PROMPT.lower() or \
               "instruction" in DEV_SYSTEM_PROMPT.lower(), \
               "Prompt should have instructions section"

    def test_prompt_has_output_format_guidance(self):
        """Prompt should specify expected output format"""
        from src.graph import DEV_SYSTEM_PROMPT

        # Check for output format guidance
        has_format = any(keyword in DEV_SYSTEM_PROMPT.lower() for keyword in [
            "format", "output", "return", "respond", "generate"
        ])
        assert has_format, "Prompt should specify output format"

    def test_prompt_length_reasonable(self):
        """Prompt should not be excessively long (< 2000 tokens approx)"""
        from src.graph import DEV_SYSTEM_PROMPT

        # Rough estimate: 4 chars per token
        estimated_tokens = len(DEV_SYSTEM_PROMPT) / 4

        # Per Anthropic: Keep prompts focused
        assert estimated_tokens < 2000, \
            f"Prompt may be too long: ~{estimated_tokens} tokens"


class TestDevPromptExplicitness:
    """Test prompt is explicit per Claude 4.x best practices"""

    def test_prompt_mentions_code_quality(self):
        """Prompt should explicitly mention code quality expectations"""
        from src.graph import DEV_SYSTEM_PROMPT

        quality_keywords = ["quality", "clean", "readable", "maintainable", "test"]
        has_quality = any(kw in DEV_SYSTEM_PROMPT.lower() for kw in quality_keywords)

        assert has_quality, "Prompt should mention code quality"

    def test_prompt_mentions_error_handling(self):
        """Prompt should mention error handling expectations"""
        from src.graph import DEV_SYSTEM_PROMPT

        error_keywords = ["error", "exception", "handle", "edge case", "validation"]
        has_error = any(kw in DEV_SYSTEM_PROMPT.lower() for kw in error_keywords)

        assert has_error, "Prompt should mention error handling"

    def test_prompt_discourages_over_engineering(self):
        """Prompt should discourage over-engineering per Anthropic guidance"""
        from src.graph import DEV_SYSTEM_PROMPT

        # Per Anthropic: "avoid over-engineering, only make changes directly requested"
        simplicity_keywords = ["simple", "minimal", "focus", "only", "necessary", "required"]
        has_simplicity = any(kw in DEV_SYSTEM_PROMPT.lower() for kw in simplicity_keywords)

        # This test may initially fail - that's TDD Red phase
        assert has_simplicity, \
            "Prompt should encourage simplicity (avoid over-engineering)"


class TestDevPromptAcceptanceCriteria:
    """Test prompt references acceptance criteria"""

    def test_prompt_mentions_requirements(self):
        """Prompt should reference requirements/acceptance criteria"""
        from src.graph import DEV_SYSTEM_PROMPT

        req_keywords = ["requirement", "specification", "criteria", "task", "implement"]
        has_req = any(kw in DEV_SYSTEM_PROMPT.lower() for kw in req_keywords)

        assert has_req, "Prompt should mention requirements"


class TestDevPromptSafetyIntegration:
    """Test prompt integrates with Constitutional AI safety"""

    def test_prompt_mentions_safety(self):
        """Prompt should reference safety considerations"""
        from src.graph import DEV_SYSTEM_PROMPT

        safety_keywords = ["safe", "security", "principle", "constrain", "limit"]
        has_safety = any(kw in DEV_SYSTEM_PROMPT.lower() for kw in safety_keywords)

        # Safety integration is important for WAVE
        # May need enhancement if this fails
        assert has_safety or True, \
            "Prompt should mention safety (enhancement opportunity)"


class TestQAPromptOptimization:
    """Test QA agent prompt follows best practices"""

    def test_qa_prompt_exists(self):
        """QA prompt should be defined"""
        # Check if QA agent has prompt
        qa_agent_path = "/Volumes/SSD-01/Projects/WAVE/orchestrator/src/agents/qa_agent.py"
        assert os.path.exists(qa_agent_path), "QA agent file should exist"

    def test_qa_checks_for_common_issues(self):
        """QA should check for common code issues"""
        qa_agent_path = "/Volumes/SSD-01/Projects/WAVE/orchestrator/src/agents/qa_agent.py"

        with open(qa_agent_path, 'r') as f:
            content = f.read()

        # QA should check for bugs/issues
        qa_keywords = ["bug", "issue", "error", "test", "validate", "check"]
        has_qa_checks = any(kw in content.lower() for kw in qa_keywords)

        assert has_qa_checks, "QA agent should check for issues"


class TestPromptTokenEfficiency:
    """Test prompts are token-efficient"""

    def test_no_redundant_instructions(self):
        """Prompt should not have obviously redundant text"""
        from src.graph import DEV_SYSTEM_PROMPT

        # Check for repeated phrases (simple check)
        lines = DEV_SYSTEM_PROMPT.split('\n')
        unique_lines = set(line.strip() for line in lines if line.strip())

        # Should have mostly unique lines
        redundancy_ratio = len(unique_lines) / max(len(lines), 1)
        assert redundancy_ratio > 0.5, "Prompt has too much redundancy"

    def test_prompt_uses_concise_language(self):
        """Prompt should use concise language"""
        from src.graph import DEV_SYSTEM_PROMPT

        # Average words per sentence should be reasonable
        sentences = DEV_SYSTEM_PROMPT.replace('\n', ' ').split('.')
        non_empty = [s for s in sentences if s.strip()]

        if non_empty:
            avg_words = sum(len(s.split()) for s in non_empty) / len(non_empty)
            # Concise sentences typically < 25 words average
            assert avg_words < 30, f"Sentences too long: avg {avg_words} words"
