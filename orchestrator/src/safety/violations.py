"""
WAVE Enhanced Safety Violations Module

Provides attributed safety violations with file path, line number, and context.
Part of Gate 0 Research Item #5: Enhanced Error Attribution.

Usage:
    from src.safety.violations import SafetyViolation, score_with_attribution

    score, violations = score_with_attribution(
        content="rm -rf /",
        file_path="deploy.sh"
    )

    for v in violations:
        print(v.to_log_string())
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any


@dataclass
class SafetyViolation:
    """
    Enhanced safety violation with full attribution.

    Attributes:
        principle_id: WAVE principle ID (P001, P002, etc.)
        severity: Severity level (critical, warning, info)
        message: Human-readable description
        pattern: Regex pattern that matched
        matched_text: Actual text that matched the pattern
        file_path: Path to file where violation occurred
        line_number: Line number in file (1-indexed)
        column: Column position (0-indexed)
        context: Surrounding code snippet
    """
    principle_id: str
    severity: str
    message: str
    pattern: str
    matched_text: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    column: Optional[int] = None
    context: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "principle_id": self.principle_id,
            "severity": self.severity,
            "message": self.message,
            "pattern": self.pattern,
            "matched_text": self.matched_text,
            "file_path": self.file_path,
            "line_number": self.line_number,
            "column": self.column,
            "context": self.context,
        }

    def __str__(self) -> str:
        """
        Backward-compatible string format.

        Returns format like: "CRITICAL: Found dangerous pattern 'rm -rf'"
        """
        return f"{self.severity.upper()}: {self.message}"

    def to_log_string(self) -> str:
        """
        Format violation for detailed logging.

        Returns multi-line string with full attribution.
        """
        lines = [f"[{self.principle_id}] {self.severity.upper()}: {self.message}"]

        if self.file_path:
            lines.append(f"  File: {self.file_path}")

        if self.line_number:
            loc = f"  Line: {self.line_number}"
            if self.column is not None:
                loc += f", Column: {self.column}"
            lines.append(loc)

        if self.context:
            # Truncate context if too long
            ctx = self.context if len(self.context) <= 80 else self.context[:77] + "..."
            lines.append(f"  Context: {ctx}")

        if self.matched_text:
            lines.append(f"  Match: '{self.matched_text}'")

        return "\n".join(lines)

    def is_critical(self) -> bool:
        """Check if violation is critical severity."""
        return self.severity.lower() == "critical"

    def is_warning(self) -> bool:
        """Check if violation is warning severity."""
        return self.severity.lower() == "warning"


def find_line_number(content: str, match_start: int) -> int:
    """
    Find line number from character position.

    Args:
        content: Full text content
        match_start: Character position of match start

    Returns:
        Line number (1-indexed)
    """
    if match_start <= 0:
        return 1
    return content[:match_start].count('\n') + 1


def find_column(content: str, match_start: int) -> int:
    """
    Find column position from character position.

    Args:
        content: Full text content
        match_start: Character position of match start

    Returns:
        Column position (0-indexed)
    """
    if match_start <= 0:
        return 0

    # Find last newline before match
    last_newline = content.rfind('\n', 0, match_start)
    if last_newline == -1:
        return match_start
    return match_start - last_newline - 1


def extract_context(
    content: str,
    line_number: int,
    context_lines: int = 2
) -> str:
    """
    Extract context around a line.

    Args:
        content: Full text content
        line_number: Target line (1-indexed)
        context_lines: Lines before/after to include

    Returns:
        Context snippet with surrounding lines
    """
    lines = content.split('\n')

    # Convert to 0-indexed
    target_idx = line_number - 1

    # Calculate range
    start = max(0, target_idx - context_lines)
    end = min(len(lines), target_idx + context_lines + 1)

    # Build context with line numbers
    context_parts = []
    for i in range(start, end):
        prefix = ">>> " if i == target_idx else "    "
        context_parts.append(f"{i + 1:4d}{prefix}{lines[i]}")

    return '\n'.join(context_parts)


# Default dangerous patterns with their principle IDs
DANGEROUS_PATTERNS = [
    # P001: Destructive commands
    ("P001", r"rm\s+-rf", "Destructive command: rm -rf", "critical"),
    ("P001", r"git\s+push\s+--force", "Destructive command: force push", "critical"),
    ("P001", r"git\s+push\s+-f", "Destructive command: force push", "critical"),
    ("P001", r"DROP\s+TABLE", "Destructive command: DROP TABLE", "critical"),
    ("P001", r"DROP\s+DATABASE", "Destructive command: DROP DATABASE", "critical"),
    ("P001", r"TRUNCATE", "Destructive command: TRUNCATE", "critical"),

    # P002: Secret exposure (simplified, full logic in constitutional.py)
    ("P002", r"private_key\s*=", "Potential secret exposure: private_key", "critical"),

    # P003: Scope violations
    ("P003", r"\.\./\.\./", "Path traversal detected", "critical"),
    ("P003", r"/etc/passwd", "System file access detected", "critical"),

    # P004: Debug statements (warning only)
    ("P004", r"console\.log\(", "Debug statement: console.log", "warning"),
    ("P004", r"print\(", "Debug statement: print", "warning"),
    ("P004", r"debugger;?", "Debug statement: debugger", "warning"),

    # P005: Code quality warnings
    ("P005", r"TODO:", "Code quality: TODO marker", "warning"),
    ("P005", r"FIXME:", "Code quality: FIXME marker", "warning"),
    ("P005", r"HACK:", "Code quality: HACK marker", "warning"),
]


def score_with_attribution(
    content: str,
    file_path: Optional[str] = None,
    patterns: Optional[List[Tuple[str, str, str, str]]] = None,
    context_lines: int = 2
) -> Tuple[float, List[SafetyViolation]]:
    """
    Score content for safety and return attributed violations.

    Args:
        content: Code or text to evaluate
        file_path: Path to file being checked
        patterns: Custom patterns (principle_id, regex, message, severity)
        context_lines: Lines of context to include

    Returns:
        (score, violations) where score is 0-1 (1 = safe)
    """
    if not content:
        return 1.0, []

    violations: List[SafetyViolation] = []
    patterns = patterns or DANGEROUS_PATTERNS

    for principle_id, pattern, message, severity in patterns:
        try:
            regex = re.compile(pattern, re.IGNORECASE)
            for match in regex.finditer(content):
                line_num = find_line_number(content, match.start())
                column = find_column(content, match.start())
                context = extract_context(content, line_num, context_lines)

                violation = SafetyViolation(
                    principle_id=principle_id,
                    severity=severity,
                    message=message,
                    pattern=pattern,
                    matched_text=match.group(),
                    file_path=file_path,
                    line_number=line_num,
                    column=column,
                    context=context
                )
                violations.append(violation)
        except re.error:
            # Invalid regex pattern, skip
            continue

    # Calculate score
    critical_count = sum(1 for v in violations if v.is_critical())
    warning_count = sum(1 for v in violations if v.is_warning())

    score = 1.0 - (critical_count * 0.3) - (warning_count * 0.05)
    score = max(0.0, min(1.0, score))

    return score, violations


__all__ = [
    "SafetyViolation",
    "find_line_number",
    "find_column",
    "extract_context",
    "score_with_attribution",
    "DANGEROUS_PATTERNS",
]
