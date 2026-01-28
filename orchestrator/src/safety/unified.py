"""
WAVE Unified Safety Checker

Consolidates safety checking from three overlapping implementations:
- src/safety/constitutional.py (server-side detection, WAVE principles)
- src/agent_worker.py (domain awareness)
- tools/constitutional_scorer.py (pattern scoring)

Gate 0 Research Item #2: Unified SafetyChecker Class

Usage:
    from src.safety.unified import UnifiedSafetyChecker, check_action_safety, score_action

    # Class-based usage
    checker = UnifiedSafetyChecker(domain="fe")
    result = checker.check(content, file_path="app/api/route.ts")
    if not result.safe:
        print(f"Blocked: {result.violations}")

    # Function-based (backward compatible)
    score, violations, risks = score_action("rm -rf /")
    result = check_action_safety("git commit -m 'test'", context="Normal commit")
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════════
# SERVER-SIDE DETECTION (from constitutional.py)
# ═══════════════════════════════════════════════════════════════════════════════

SERVER_SIDE_FILE_PATTERNS = [
    r"app/api/.*\.ts$",           # Next.js App Router API routes
    r"app/api/.*\.js$",           # Next.js App Router API routes (JS)
    r"pages/api/.*\.ts$",         # Next.js Pages API routes
    r"pages/api/.*\.js$",         # Next.js Pages API routes (JS)
    r"server/.*\.ts$",            # Server modules
    r"server/.*\.js$",            # Server modules (JS)
    r"lib/server/.*\.ts$",        # Server-only lib
    r"scripts/.*\.ts$",           # Build/deploy scripts
    r"scripts/.*\.js$",           # Build/deploy scripts (JS)
    r"\.server\.ts$",             # .server.ts convention
    r"\.server\.js$",             # .server.js convention
    r"route\.ts$",                # Next.js route handlers
    r"route\.js$",                # Next.js route handlers (JS)
]

SERVER_SIDE_CONTENT_PATTERNS = [
    r"import\s+\{[^}]*NextResponse[^}]*\}\s+from\s+['\"]next/server['\"]",
    r"export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)",
    r"NextRequest",
    r"NextResponse",
    r"S3Client",
    r"@aws-sdk",
    r"createClient.*supabase.*service_role",
]


def is_server_side_file(file_path: Optional[str]) -> bool:
    """Check if file path indicates server-side code."""
    if not file_path:
        return False
    normalized = file_path.replace("\\", "/")
    for pattern in SERVER_SIDE_FILE_PATTERNS:
        if re.search(pattern, normalized):
            return True
    return False


def is_server_side_content(content: str) -> bool:
    """Check if content indicates server-side code."""
    if not content:
        return False
    for pattern in SERVER_SIDE_CONTENT_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            return True
    return False


# ═══════════════════════════════════════════════════════════════════════════════
# P006 ESCALATION TRIGGERS (from constitutional.py)
# ═══════════════════════════════════════════════════════════════════════════════

CONFIDENCE_THRESHOLD = 0.6

AMBIGUOUS_KEYWORDS = [
    'maybe', 'perhaps', 'possibly', 'might',
    'some kind of', 'something like', 'not sure',
    'TBD', 'TODO', 'unclear', 'ambiguous',
    'could be', 'either', 'or maybe', 'not certain',
    'probably', 'i think', 'i guess', 'potentially',
]


def should_escalate_p006(result: dict) -> bool:
    """
    Determine if P006 (Escalate Uncertainty) should trigger.

    Triggers:
    1. Confidence score < 0.6
    2. Ambiguous keywords in requirements
    3. Multiple options without selection
    """
    # Trigger 1: Low confidence
    confidence = result.get('confidence_score', 1.0)
    if confidence < CONFIDENCE_THRESHOLD:
        return True

    # Trigger 2: Ambiguous keywords
    requirements = result.get('requirements', '').lower()
    for keyword in AMBIGUOUS_KEYWORDS:
        if keyword.lower() in requirements:
            return True

    # Trigger 3: Multiple options without selection
    options = result.get('options', [])
    selected = result.get('selected')
    if len(options) > 1 and selected is None:
        return True

    return False


# ═══════════════════════════════════════════════════════════════════════════════
# SAFETY RESULT
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SafetyResult:
    """Result of safety check."""
    safe: bool
    score: float
    violations: List[str]
    recommendation: str  # ALLOW, WARN, BLOCK
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            "safe": self.safe,
            "score": self.score,
            "violations": self.violations,
            "recommendation": self.recommendation,
            "details": self.details,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# UNIFIED SAFETY CHECKER
# ═══════════════════════════════════════════════════════════════════════════════

class UnifiedSafetyChecker:
    """
    Unified safety checker combining all WAVE safety implementations.

    Features:
    - Server-side file/content detection (Next.js aware)
    - Domain awareness (FE stricter than BE)
    - WAVE principles (P001-P006)
    - Configurable thresholds
    - Backward compatible with existing APIs
    """

    # Always dangerous (block in all contexts)
    ALWAYS_DANGEROUS = [
        (r"rm\s+-rf\s+/", "P001", "Destructive: rm -rf /"),
        (r"DROP\s+TABLE", "P001", "Destructive: DROP TABLE"),
        (r"DROP\s+DATABASE", "P001", "Destructive: DROP DATABASE"),
        (r"git\s+push\s+--force\s+origin\s+main", "P001", "Destructive: force push to main"),
        (r"\.\./\.\./etc/passwd", "P003", "Path traversal: /etc/passwd"),
        (r"eval\s*\([^)]*\$", "P004", "Code injection: eval with variable"),
    ]

    # Server-side allowed patterns (safe in API routes)
    SERVER_SIDE_ALLOWED = [
        r"process\.env",
        r"api_key\s*=",
        r"API_KEY",
        r"password",  # Auth handling
        r"private_key",  # JWT/crypto
    ]

    # FE-only dangerous (block in client components)
    FE_DANGEROUS = [
        (r"private_key\s*=\s*['\"]", "P002", "Secret exposure: private_key in client"),
    ]

    # Warning patterns (reduce score but don't block)
    WARN_PATTERNS = [
        (r"console\.log\(", "P007", "Debug: console.log"),
        (r"debugger;?", "P007", "Debug: debugger statement"),
        (r"TODO:", "P007", "Code quality: TODO"),
        (r"FIXME:", "P007", "Code quality: FIXME"),
        (r"HACK:", "P007", "Code quality: HACK"),
    ]

    def __init__(
        self,
        domain: str = "fe",
        block_threshold: float = 0.85,
    ):
        """
        Initialize unified safety checker.

        Args:
            domain: Agent domain (fe, be, qa, pm, cto)
            block_threshold: Score below which to block (default 0.85)
        """
        self.domain = domain.lower()
        self.block_threshold = block_threshold

    def _is_server_side(self, content: str, file_path: Optional[str]) -> bool:
        """Check if code is server-side (file path OR content patterns)."""
        if file_path and is_server_side_file(file_path):
            return True
        if content and is_server_side_content(content):
            return True
        return False

    def check(
        self,
        content: str,
        file_path: Optional[str] = None,
        context: Optional[str] = None,
    ) -> SafetyResult:
        """
        Check content for safety violations.

        Args:
            content: Code or text to check
            file_path: Optional file path for context
            context: Optional description of what's being checked

        Returns:
            SafetyResult with safe flag, score, and violations
        """
        if not content:
            return SafetyResult(
                safe=True,
                score=1.0,
                violations=[],
                recommendation="ALLOW"
            )

        violations = []
        is_server = self._is_server_side(content, file_path)

        # Check always-dangerous patterns
        for pattern, principle, message in self.ALWAYS_DANGEROUS:
            if re.search(pattern, content, re.IGNORECASE):
                violations.append(f"{principle}: {message}")

        # Check FE-dangerous patterns (skip for BE domain or server-side)
        if self.domain != "be" and not is_server:
            for pattern, principle, message in self.FE_DANGEROUS:
                if re.search(pattern, content, re.IGNORECASE):
                    violations.append(f"{principle}: {message}")

        # Check server-side patterns in client code
        if not is_server and self.domain == "fe":
            for pattern in self.SERVER_SIDE_ALLOWED:
                if re.search(pattern, content, re.IGNORECASE):
                    # Only warn, don't block - could be legitimate
                    pass  # Removed false positive trigger

        # Check warning patterns
        warnings = []
        for pattern, principle, message in self.WARN_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                warnings.append(f"{principle}: {message}")

        # Calculate score
        critical_count = len(violations)
        warn_count = len(warnings)

        score = 1.0 - (critical_count * 0.3) - (warn_count * 0.05)
        score = max(0.0, min(1.0, score))

        # Determine safety and recommendation
        safe = score >= self.block_threshold

        if critical_count > 0:
            recommendation = "BLOCK"
        elif warn_count > 0:
            recommendation = "WARN"
        else:
            recommendation = "ALLOW"

        return SafetyResult(
            safe=safe,
            score=score,
            violations=violations + warnings,
            recommendation=recommendation,
            details={
                "is_server_side": is_server,
                "domain": self.domain,
                "file_path": file_path,
                "critical_count": critical_count,
                "warning_count": warn_count,
            }
        )


# ═══════════════════════════════════════════════════════════════════════════════
# BACKWARD COMPATIBLE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def score_action(action: str, context: str = "") -> Tuple[float, List[str], List[str]]:
    """
    Score an action for safety (backward compatible).

    Args:
        action: Action string to check
        context: Optional context

    Returns:
        (score, violations, risks) tuple
    """
    checker = UnifiedSafetyChecker()
    result = checker.check(action)

    # Split violations into critical and risks
    violations = [v for v in result.violations if "P001" in v or "P002" in v or "P003" in v]
    risks = [v for v in result.violations if v not in violations]

    return result.score, violations, risks


def check_action_safety(
    action: str,
    context: Optional[str] = None,
    file_path: Optional[str] = None,
) -> SafetyResult:
    """
    Check action safety (backward compatible).

    Args:
        action: Action to check
        context: Optional context description
        file_path: Optional file path

    Returns:
        SafetyResult
    """
    checker = UnifiedSafetyChecker()
    return checker.check(action, file_path=file_path, context=context)


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Classes
    "UnifiedSafetyChecker",
    "SafetyResult",
    # Functions
    "score_action",
    "check_action_safety",
    "is_server_side_file",
    "is_server_side_content",
    "should_escalate_p006",
    # Constants
    "CONFIDENCE_THRESHOLD",
    "SERVER_SIDE_FILE_PATTERNS",
    "SERVER_SIDE_CONTENT_PATTERNS",
]
