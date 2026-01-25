"""
Constitutional AI Scorer
Evaluates actions against safety principles before execution

This is a pattern-based implementation for the skeleton.
Phase C will add LLM-based evaluation for nuanced cases.
"""

import re
import os
from typing import Tuple, List, Dict, Any


# ===========================================
# Safety Principles (Constitutional AI)
# ===========================================

PRINCIPLES = [
    # Security
    "Never execute destructive commands (rm -rf, DROP TABLE, format, etc.)",
    "Never expose secrets, API keys, passwords, or credentials in output",
    "Never bypass authentication or authorization controls",
    "Never disable security features or logging",
    "Never make unauthorized external network requests",

    # Data Integrity
    "Always preserve user data - never delete without explicit approval",
    "Always validate input before processing",
    "Never store sensitive data in plain text or logs",

    # System Safety
    "Never modify production systems without explicit approval",
    "Always respect rate limits and resource quotas",
    "Never execute commands that could crash or hang the system",

    # Compliance
    "Always maintain audit trail for all changes",
    "Always follow the approved plan - no scope creep",
    "Never skip required validation gates",
]


# ===========================================
# Dangerous Pattern Detection
# ===========================================

# Patterns that indicate dangerous actions
DANGEROUS_PATTERNS = {
    # Destructive file operations
    r"rm\s+-rf": ("destructive_command", "Recursive force delete detected"),
    r"rm\s+-r\s+/": ("destructive_command", "Recursive delete on root path"),
    r"rmdir\s+/": ("destructive_command", "Remove directory on root path"),
    r"format\s+[a-zA-Z]:": ("destructive_command", "Format drive command"),
    r"mkfs\.": ("destructive_command", "Filesystem format command"),
    r"dd\s+if=.*of=/dev": ("destructive_command", "Direct disk write"),

    # Database destruction
    r"DROP\s+TABLE": ("database_destruction", "DROP TABLE command"),
    r"DROP\s+DATABASE": ("database_destruction", "DROP DATABASE command"),
    r"TRUNCATE\s+TABLE": ("database_destruction", "TRUNCATE TABLE command"),
    r"DELETE\s+FROM\s+\w+\s*;": ("database_destruction", "DELETE without WHERE clause"),

    # Credential exposure
    r"sk-ant-": ("credential_exposure", "Anthropic API key pattern"),
    r"sk-[a-zA-Z0-9]{20,}": ("credential_exposure", "OpenAI API key pattern"),
    r"password\s*=\s*['\"][^'\"]+['\"]": ("credential_exposure", "Hardcoded password"),
    r"api[_-]?key\s*=\s*['\"][^'\"]+['\"]": ("credential_exposure", "Hardcoded API key"),
    r"secret\s*=\s*['\"][^'\"]+['\"]": ("credential_exposure", "Hardcoded secret"),

    # System commands
    r"sudo\s+": ("privilege_escalation", "Sudo command"),
    r"chmod\s+777": ("security_weakening", "World-writable permissions"),
    r"chown\s+root": ("privilege_escalation", "Change owner to root"),

    # Network risks
    r"curl.*\|.*sh": ("remote_execution", "Pipe curl to shell"),
    r"wget.*\|.*sh": ("remote_execution", "Pipe wget to shell"),
    r"eval\s*\(": ("code_injection", "Eval statement"),
    r"exec\s*\(": ("code_injection", "Exec statement"),
}

# Patterns that indicate safe actions
SAFE_PATTERNS = [
    r"create.*file",
    r"write.*function",
    r"add.*test",
    r"run.*pytest",
    r"npm\s+run",
    r"git\s+status",
    r"git\s+add",
    r"git\s+commit",
    r"echo\s+['\"]",
    r"print\s*\(",
    r"console\.log",
]


# ===========================================
# Scoring Functions
# ===========================================

def score_action(action: str, context: str = "") -> Tuple[float, List[str], List[str]]:
    """
    Score an action against constitutional principles.

    Uses pattern matching for fast, deterministic evaluation.
    LLM-based scoring will be added in Phase C for edge cases.

    Args:
        action: The action/command to evaluate
        context: Additional context about the action

    Returns:
        Tuple of (score, violations, risks)
        - score: 0.0-1.0 where 1.0 is fully safe
        - violations: List of violated principles
        - risks: List of potential risks
    """
    violations = []
    risks = []
    score = 1.0

    action_lower = action.lower()
    combined = f"{action} {context}".lower()

    # Check dangerous patterns
    for pattern, (violation_type, description) in DANGEROUS_PATTERNS.items():
        if re.search(pattern, action, re.IGNORECASE):
            violations.append(f"{violation_type}: {description}")
            # Different severity for different violations
            if violation_type in ("destructive_command", "database_destruction"):
                score = min(score, 0.1)
            elif violation_type in ("credential_exposure", "remote_execution"):
                score = min(score, 0.3)
            elif violation_type in ("privilege_escalation", "code_injection"):
                score = min(score, 0.4)
            else:
                score = min(score, 0.5)

    # Check for potential risks (not violations but worth noting)
    if "sudo" in action_lower:
        risks.append("Uses elevated privileges")
    if "production" in combined:
        risks.append("May affect production environment")
    if "delete" in action_lower or "remove" in action_lower:
        risks.append("Involves deletion operation")
    if "password" in action_lower or "secret" in action_lower:
        risks.append("Involves sensitive data")

    # Slight penalty for having risks
    if risks and not violations:
        score = min(score, 0.9)

    # Boost for clearly safe patterns
    is_safe = any(re.search(p, action_lower) for p in SAFE_PATTERNS)
    if is_safe and not violations:
        score = max(score, 0.95)

    return score, violations, risks


def should_block(score: float) -> bool:
    """
    Determine if action should be blocked.

    Args:
        score: Safety score from score_action

    Returns:
        True if action should be blocked
    """
    threshold = float(os.getenv("CONSTITUTIONAL_BLOCK_THRESHOLD", "0.7"))
    return score < threshold


def should_escalate(score: float) -> bool:
    """
    Determine if action needs human review.

    Args:
        score: Safety score from score_action

    Returns:
        True if action should be escalated for review
    """
    threshold = float(os.getenv("CONSTITUTIONAL_ESCALATE_THRESHOLD", "0.85"))
    return score < threshold


def evaluate_tool_call(
    tool_name: str,
    tool_args: Dict[str, Any],
    context: str = ""
) -> Dict[str, Any]:
    """
    Evaluate a tool call before execution.

    Args:
        tool_name: Name of the tool being called
        tool_args: Arguments to the tool
        context: Additional context

    Returns:
        {
            "allowed": bool,
            "score": float,
            "violations": list,
            "risks": list,
            "requires_review": bool
        }
    """
    # Construct action description from tool call
    args_str = " ".join(f"{k}={v}" for k, v in tool_args.items())
    action = f"Tool: {tool_name} Args: {args_str}"

    # Score the action
    score, violations, risks = score_action(action, context)

    return {
        "allowed": not should_block(score),
        "score": score,
        "violations": violations,
        "risks": risks,
        "requires_review": should_escalate(score)
    }


# ===========================================
# Utility Functions
# ===========================================

def get_principles() -> List[str]:
    """Return the list of constitutional principles"""
    return PRINCIPLES.copy()


def add_custom_principle(principle: str) -> None:
    """Add a custom principle (for project-specific rules)"""
    PRINCIPLES.append(principle)


def add_dangerous_pattern(
    pattern: str,
    violation_type: str,
    description: str
) -> None:
    """Add a custom dangerous pattern"""
    DANGEROUS_PATTERNS[pattern] = (violation_type, description)
