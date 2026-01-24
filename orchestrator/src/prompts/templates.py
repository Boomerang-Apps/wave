"""
WAVE v2 Prompt Templates
========================
Utilities for formatting and managing prompts.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from string import Formatter


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE CLASS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class PromptTemplate:
    """
    A reusable prompt template with variable substitution.

    Supports:
    - Named placeholders: {variable_name}
    - Default values
    - Required validation
    - Nested templates
    """
    template: str
    defaults: Dict[str, Any] = field(default_factory=dict)
    required: List[str] = field(default_factory=list)
    description: str = ""

    def __post_init__(self):
        """Extract variables from template."""
        formatter = Formatter()
        self._variables = set()
        for _, field_name, _, _ in formatter.parse(self.template):
            if field_name is not None:
                self._variables.add(field_name.split("[")[0].split(".")[0])

    @property
    def variables(self) -> List[str]:
        """Get list of template variables."""
        return sorted(self._variables)

    def format(self, **kwargs) -> str:
        """
        Format the template with provided values.

        Args:
            **kwargs: Values for template variables

        Returns:
            Formatted string

        Raises:
            ValueError: If required variables are missing
        """
        # Merge defaults with provided values
        values = {**self.defaults, **kwargs}

        # Check required variables
        missing = [r for r in self.required if r not in values]
        if missing:
            raise ValueError(f"Missing required variables: {missing}")

        # Replace missing optional variables with empty string
        for var in self._variables:
            if var not in values:
                values[var] = ""

        return self.template.format(**values)

    def partial(self, **kwargs) -> "PromptTemplate":
        """
        Create a new template with some values pre-filled.

        Args:
            **kwargs: Values to pre-fill

        Returns:
            New PromptTemplate with updated defaults
        """
        new_defaults = {**self.defaults, **kwargs}
        new_required = [r for r in self.required if r not in kwargs]
        return PromptTemplate(
            template=self.template,
            defaults=new_defaults,
            required=new_required,
            description=self.description
        )

    def validate(self, **kwargs) -> List[str]:
        """
        Validate that all required variables are provided.

        Args:
            **kwargs: Values to validate

        Returns:
            List of missing required variables
        """
        values = {**self.defaults, **kwargs}
        return [r for r in self.required if r not in values]


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def format_prompt(
    template: str,
    defaults: Optional[Dict[str, Any]] = None,
    **kwargs
) -> str:
    """
    Quick helper to format a prompt template.

    Args:
        template: Template string with {placeholders}
        defaults: Default values for placeholders
        **kwargs: Values for placeholders

    Returns:
        Formatted string
    """
    pt = PromptTemplate(template=template, defaults=defaults or {})
    return pt.format(**kwargs)


def truncate_context(
    text: str,
    max_chars: int = 10000,
    suffix: str = "\n\n[... truncated ...]"
) -> str:
    """
    Truncate text to a maximum length.

    Args:
        text: Text to truncate
        max_chars: Maximum characters
        suffix: Suffix to add when truncated

    Returns:
        Truncated text
    """
    if len(text) <= max_chars:
        return text
    return text[:max_chars - len(suffix)] + suffix


def format_code_context(
    files: Dict[str, str],
    max_chars_per_file: int = 5000
) -> str:
    """
    Format code files for inclusion in prompts.

    Args:
        files: Dict of {path: content}
        max_chars_per_file: Max chars per file

    Returns:
        Formatted code context
    """
    parts = []
    for path, content in files.items():
        truncated = truncate_context(content, max_chars_per_file)
        parts.append(f"```:{path}\n{truncated}\n```")
    return "\n\n".join(parts)


def format_diff(
    diff: str,
    max_lines: int = 200
) -> str:
    """
    Format a git diff for inclusion in prompts.

    Args:
        diff: Git diff output
        max_lines: Maximum lines to include

    Returns:
        Formatted diff
    """
    lines = diff.split("\n")
    if len(lines) <= max_lines:
        return diff

    # Keep first and last portions
    keep = max_lines // 2
    return "\n".join(
        lines[:keep] +
        [f"\n... ({len(lines) - max_lines} lines omitted) ...\n"] +
        lines[-keep:]
    )


def format_test_results(
    results: List[Dict[str, Any]],
    max_failures: int = 10
) -> str:
    """
    Format test results for inclusion in prompts.

    Args:
        results: List of test result dicts
        max_failures: Maximum failure details to include

    Returns:
        Formatted test results
    """
    passed = [r for r in results if r.get("passed", False)]
    failed = [r for r in results if not r.get("passed", False)]

    lines = [
        f"Total: {len(results)} tests",
        f"Passed: {len(passed)}",
        f"Failed: {len(failed)}",
        ""
    ]

    if failed:
        lines.append("Failures:")
        for i, f in enumerate(failed[:max_failures]):
            lines.append(f"  - {f.get('name', 'Unknown')}: {f.get('error', 'No error message')}")
        if len(failed) > max_failures:
            lines.append(f"  ... and {len(failed) - max_failures} more failures")

    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "PromptTemplate",
    "format_prompt",
    "truncate_context",
    "format_code_context",
    "format_diff",
    "format_test_results",
]
