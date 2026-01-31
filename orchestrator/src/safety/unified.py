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
    r"['\"]use server['\"]",  # Server action directive
]


# ═══════════════════════════════════════════════════════════════════════════════
# GAP-002 FIX: CLIENT-SIDE ENVIRONMENT VARIABLE DETECTION
# ═══════════════════════════════════════════════════════════════════════════════
# Client-side code must not expose private environment variables.
# NEXT_PUBLIC_ and VITE_ prefixed vars are designed for client exposure.

CLIENT_SIDE_INDICATORS = [
    r'"use client"',
    r"'use client'",
]

# Patterns that indicate server-side context (overrides client file patterns)
SERVER_SIDE_INDICATORS = [
    r'"use server"',
    r"'use server'",
]

# Private env var patterns - these must NOT be in client code
# Negative lookahead excludes public prefixes
PRIVATE_ENV_PATTERNS = [
    (r"process\.env\.(?!NEXT_PUBLIC_)[A-Z_][A-Z0-9_]*", "Private env var (process.env)"),
    (r"import\.meta\.env\.(?!VITE_)[A-Z_][A-Z0-9_]*", "Private env var (import.meta.env)"),
]

# Client-side file patterns (may run on client unless server indicators present)
CLIENT_FILE_PATTERNS = [
    r"components/.*\.(tsx?|jsx?)$",
    r"hooks/.*\.(tsx?|jsx?)$",
    r"src/components/.*\.(tsx?|jsx?)$",
    r"src/hooks/.*\.(tsx?|jsx?)$",
]


# ═══════════════════════════════════════════════════════════════════════════════
# GAP-001 FIX: DESTRUCTIVE COMMAND DETECTION
# ═══════════════════════════════════════════════════════════════════════════════
# Destructive commands must score < 0.5 to be properly blocked.
# These patterns detect dangerous system-level commands.

# Pattern: (regex, score_multiplier, description)
# score_multiplier: 0.1 = very dangerous (score becomes 0.1)
#                   0.2 = extremely dangerous
#                   0.3 = dangerous
#                   0.4 = risky
DESTRUCTIVE_COMMAND_PATTERNS: Dict[str, Tuple[float, str]] = {
    # rm -rf variants on system paths (CRITICAL)
    # Note: Using (\s|$) instead of $ to handle multiline content
    r"rm\s+(-[rf]+\s+)+/(\s|$)": (0.1, "Destructive: rm -rf /"),
    r"rm\s+(-[rf]+\s+)+/[a-z]+": (0.2, "Destructive: rm -rf on system directory"),
    r"rm\s+(-[rf]+\s+)+\*(\s|$)": (0.2, "Destructive: rm -rf *"),
    r"rm\s+(-[rf]+\s+)+~": (0.2, "Destructive: rm -rf ~ (home directory)"),
    r"rm\s+--force\s+--recursive\s+/": (0.1, "Destructive: rm --force --recursive /"),
    r"rm\s+-r\s+-f\s+/": (0.1, "Destructive: rm -r -f /"),
    r"rm\s+(-[rf]+\s+)+--no-preserve-root": (0.05, "Destructive: rm with --no-preserve-root"),

    # sudo rm variants (CRITICAL - even more dangerous)
    r"sudo\s+rm\s+(-[rf]+\s+)+/": (0.05, "Destructive: sudo rm -rf /"),
    r"sudo\s+rm\s+(-[rf]+\s+)+\*": (0.1, "Destructive: sudo rm -rf *"),
    r"sudo\s+rm\s+(-[rf]+\s+)+~": (0.1, "Destructive: sudo rm -rf ~"),

    # Disk operations (CRITICAL)
    r"dd\s+if=/dev/(zero|random|urandom)\s+of=/dev/": (0.1, "Destructive: disk wipe with dd"),
    r"dd\s+.*of=/dev/sd[a-z]": (0.1, "Destructive: dd to disk device"),
    r"dd\s+.*of=/dev/nvme": (0.1, "Destructive: dd to NVMe device"),
    r"mkfs\.\w+\s+/dev/": (0.1, "Destructive: filesystem format"),
    r"fdisk\s+/dev/": (0.2, "Destructive: fdisk partition tool"),
    r"parted\s+/dev/": (0.2, "Destructive: parted partition tool"),

    # Windows destructive commands
    r"format\s+[a-z]:\s*": (0.2, "Destructive: Windows format"),
    r"del\s+/[sf]\s+[a-z]:\\": (0.2, "Destructive: Windows del on drive"),

    # Fork bomb and system abuse
    r":\(\)\{\s*:\|:&\s*\};:": (0.05, "Destructive: fork bomb"),
    r":\s*\(\s*\)\s*\{[^}]*:\s*\|": (0.05, "Destructive: fork bomb variant"),

    # Permission changes on root
    r"chmod\s+(-R\s+)?777\s+/\s*$": (0.2, "Destructive: chmod 777 /"),
    r"chmod\s+-R\s+777\s+/[a-z]+": (0.3, "Risky: chmod -R 777 on system dir"),
    r"chown\s+-R\s+\w+:\w+\s+/\s*$": (0.2, "Destructive: chown -R on root"),

    # Database destructive commands (already in ALWAYS_DANGEROUS but reinforce)
    r"DROP\s+DATABASE": (0.1, "Destructive: DROP DATABASE"),
    r"DROP\s+TABLE\s+\*": (0.1, "Destructive: DROP TABLE *"),
    r"TRUNCATE\s+TABLE": (0.2, "Destructive: TRUNCATE TABLE"),
    r"DELETE\s+FROM\s+\w+\s*;?\s*$": (0.3, "Risky: DELETE without WHERE"),

    # Git destructive operations
    r"git\s+push\s+--force\s+origin\s+(main|master)": (0.2, "Destructive: force push to main"),
    r"git\s+push\s+-f\s+origin\s+(main|master)": (0.2, "Destructive: force push to main"),
    r"git\s+reset\s+--hard\s+origin": (0.3, "Risky: hard reset to origin"),

    # System shutdown/reboot
    r"shutdown\s+-h\s+now": (0.3, "Risky: immediate shutdown"),
    r"reboot\s+(-f|--force)": (0.3, "Risky: forced reboot"),
    r"init\s+0": (0.3, "Risky: init 0 (shutdown)"),

    # Direct device writes
    r">\s*/dev/sd[a-z]": (0.1, "Destructive: direct write to disk"),
    r">\s*/dev/null": (0.8, "Safe: redirect to /dev/null"),  # This one is actually safe
}

# Safe rm patterns - these should NOT be penalized
SAFE_RM_PATTERNS = [
    r"rm\s+-rf\s+\./",                    # Current directory relative
    r"rm\s+-rf\s+\.\./[^/]+",             # Parent dir specific folder (not ../)
    r"rm\s+-rf\s+/tmp/",                  # Temp directory
    r"rm\s+-rf\s+/var/tmp/",              # Var temp
    r"rm\s+-rf\s+node_modules",           # Node modules
    r"rm\s+-rf\s+\.next",                 # Next.js build
    r"rm\s+-rf\s+dist/?",                 # Build output
    r"rm\s+-rf\s+build/?",                # Build output
    r"rm\s+-rf\s+coverage/?",             # Test coverage
    r"rm\s+-rf\s+\.cache",                # Cache directory
    r"rm\s+-rf\s+\.turbo",                # Turbo cache
    r"rm\s+-rf\s+\.vercel",               # Vercel cache
    r"rm\s+-rf\s+__pycache__",            # Python cache
    r"rm\s+-rf\s+\.pytest_cache",         # Pytest cache
    r"rm\s+-rf\s+\.mypy_cache",           # Mypy cache
    r"rm\s+-rf\s+\.tox",                  # Tox cache
    r"rm\s+-rf\s+\.eggs",                 # Python eggs
    r"rm\s+-rf\s+\*.egg-info",            # Egg info
    r"rm\s+-rf\s+venv/?",                 # Virtual environment
    r"rm\s+-rf\s+\.venv/?",               # Virtual environment
    r"rm\s+-rf\s+target/?",               # Rust/Java build
    r"rm\s+-rf\s+out/?",                  # Generic output
    r"rm\s+-rf\s+\$\w+",                  # Variable (e.g., $BUILD_DIR)
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
    # NOTE: rm -rf patterns are handled by DESTRUCTIVE_COMMAND_PATTERNS with whitelist
    ALWAYS_DANGEROUS = [
        # rm -rf / but NOT /tmp/, /var/tmp/, or other safe paths (negative lookahead)
        (r"rm\s+-rf\s+/(?!tmp/|var/tmp/)", "P001", "Destructive: rm -rf /"),
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

    # Hardcoded credential patterns (always dangerous in any context)
    # GAP-003 FIX: Enhanced API key detection
    HARDCODED_CREDENTIALS = [
        # Anthropic
        (r"['\"][a-zA-Z0-9_-]*sk-ant-[a-zA-Z0-9_-]+['\"]", "P002", "Hardcoded API key: Anthropic"),
        # OpenAI (sk-proj-, sk-...)
        (r"['\"]sk-proj-[a-zA-Z0-9]{20,}['\"]", "P002", "Hardcoded API key: OpenAI"),
        (r"['\"]sk-[a-zA-Z0-9]{20,}['\"]", "P002", "Hardcoded API key: OpenAI-style"),
        # GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_)
        (r"['\"](ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9]{30,}['\"]", "P002", "Hardcoded API key: GitHub"),
        # AWS
        (r"['\"]AKIA[A-Z0-9]{16}['\"]", "P002", "Hardcoded API key: AWS Access Key"),
        # Slack
        (r"['\"]xox[baprs]-[a-zA-Z0-9-]+['\"]", "P002", "Hardcoded API key: Slack"),
        # Stripe secret keys (sk_live_, sk_test_)
        (r"['\"]sk_live_[a-zA-Z0-9]{20,}['\"]", "P002", "Hardcoded API key: Stripe Live Secret"),
        (r"['\"]sk_test_[a-zA-Z0-9]{20,}['\"]", "P002", "Hardcoded API key: Stripe Test Secret"),
        # Google API keys (AIzaSy... - 39 chars total, but be flexible)
        (r"['\"]AIzaSy[a-zA-Z0-9_-]{20,}['\"]", "P002", "Hardcoded API key: Google"),
        # JWT tokens (eyJ...)
        (r"['\"]eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+['\"]", "P002", "Hardcoded JWT token"),
        # Bearer tokens with JWT
        (r"Bearer\s+eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+", "P002", "Hardcoded Bearer JWT token"),
    ]

    # Client-side API key patterns (critical when in client code)
    # These have lower thresholds than server-side
    CLIENT_API_KEY_PATTERNS = [
        # Stripe (live secret keys are critical)
        (r"['\"]sk_live_[a-zA-Z0-9]{20,}['\"]", 0.2, "Stripe live secret key in client"),
        (r"['\"]sk_test_[a-zA-Z0-9]{20,}['\"]", 0.4, "Stripe test secret key in client"),
        # Google (flexible length - typically 39 chars total)
        (r"['\"]AIzaSy[a-zA-Z0-9_-]{20,}['\"]", 0.2, "Google API key in client"),
        # AWS
        (r"['\"]AKIA[A-Z0-9]{16}['\"]", 0.2, "AWS access key in client"),
        # GitHub
        (r"['\"](ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9]{30,}['\"]", 0.2, "GitHub token in client"),
        # Anthropic/OpenAI
        (r"['\"][a-zA-Z0-9_-]*sk-ant-[a-zA-Z0-9_-]+['\"]", 0.2, "Anthropic API key in client"),
        (r"['\"]sk-proj-[a-zA-Z0-9]{20,}['\"]", 0.2, "OpenAI API key in client"),
        (r"['\"]sk-[a-zA-Z0-9]{20,}['\"]", 0.2, "OpenAI-style API key in client"),
        # Slack
        (r"['\"]xox[baprs]-[a-zA-Z0-9-]+['\"]", 0.2, "Slack token in client"),
        # JWT
        (r"['\"]eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+['\"]", 0.4, "JWT token in client"),
        # Generic patterns
        (r"api[_-]?key['\"]?\s*[:=]\s*['\"][a-zA-Z0-9_-]{16,}['\"]", 0.5, "Generic API key in client"),
        (r"secret[_-]?key['\"]?\s*[:=]\s*['\"][a-zA-Z0-9_-]{16,}['\"]", 0.4, "Generic secret key in client"),
    ]

    # Client-side dangerous patterns (warn when found in non-server code)
    # NOTE: Excludes NEXT_PUBLIC_ vars which are designed for client exposure
    CLIENT_DANGEROUS = [
        (r"process\.env\.(?!NEXT_PUBLIC_)[A-Z][A-Z0-9_]*", "P002", "Environment variable in client code"),
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

    def _check_destructive_commands(self, content: str) -> Tuple[float, List[str]]:
        """
        GAP-001 FIX: Check for destructive commands.

        Returns:
            Tuple of (score_multiplier, violations)
            score_multiplier: 0.0-1.0, lower = more dangerous
            violations: List of violation descriptions
        """
        violations = []
        min_multiplier = 1.0

        # First check if it's a safe rm pattern (whitelist)
        for safe_pattern in SAFE_RM_PATTERNS:
            if re.search(safe_pattern, content, re.IGNORECASE):
                return 1.0, []  # No penalty for safe patterns

        # Check destructive patterns
        for pattern, (multiplier, description) in DESTRUCTIVE_COMMAND_PATTERNS.items():
            if re.search(pattern, content, re.IGNORECASE):
                violations.append(f"P001: {description}")
                min_multiplier = min(min_multiplier, multiplier)

        return min_multiplier, violations

    def _is_client_component(self, content: str, file_path: Optional[str]) -> bool:
        """
        GAP-002 FIX: Determine if code runs on client side.

        Client-side is determined by:
        1. Explicit 'use client' directive
        2. Client-side file patterns (components/, hooks/) WITHOUT server indicators

        Returns:
            True if code is client-side
        """
        # Check for explicit 'use server' directive (overrides everything)
        for indicator in SERVER_SIDE_INDICATORS:
            if re.search(indicator, content):
                return False

        # Check for explicit 'use client' directive
        for indicator in CLIENT_SIDE_INDICATORS:
            if re.search(indicator, content):
                return True

        # Check for server-side content patterns (NextResponse, etc.)
        if is_server_side_content(content):
            return False

        # Check for server-side file patterns
        if file_path and is_server_side_file(file_path):
            return False

        # Check for client-side file patterns
        if file_path:
            normalized = file_path.replace("\\", "/")
            for pattern in CLIENT_FILE_PATTERNS:
                if re.search(pattern, normalized):
                    return True

        return False

    def _check_client_side_env_vars(self, content: str, file_path: Optional[str]) -> Tuple[float, List[str]]:
        """
        GAP-002 FIX: Check for private env vars exposed in client-side code.

        Returns:
            Tuple of (score_multiplier, violations)
        """
        # Not client-side, no penalty
        if not self._is_client_component(content, file_path):
            return 1.0, []

        violations = []
        min_multiplier = 1.0

        for pattern, description in PRIVATE_ENV_PATTERNS:
            matches = re.findall(pattern, content)
            if matches:
                # Filter out any matches that might be in comments
                # (Simple heuristic - full comment parsing would be more complex)
                for match in matches:
                    violations.append(f"P002: Client-side env var exposure: {match} - {description}")
                min_multiplier = min(min_multiplier, 0.6)

        return min_multiplier, violations

    def _check_client_api_keys(self, content: str, file_path: Optional[str]) -> Tuple[float, List[str]]:
        """
        GAP-003 FIX: Check for hardcoded API keys in client-side code.

        API keys in client code are critical security issues.
        API keys in server code are warnings (should use env vars).

        Returns:
            Tuple of (score_multiplier, violations)
        """
        violations = []
        min_multiplier = 1.0
        is_client = self._is_client_component(content, file_path)

        if is_client:
            # Client-side: use strict patterns with low multipliers
            for pattern, multiplier, description in self.CLIENT_API_KEY_PATTERNS:
                if re.search(pattern, content, re.IGNORECASE):
                    violations.append(f"P002: CRITICAL - {description}")
                    min_multiplier = min(min_multiplier, multiplier)
        else:
            # Server-side: still flag hardcoded keys but with higher multiplier
            for pattern, multiplier, description in self.CLIENT_API_KEY_PATTERNS:
                if re.search(pattern, content, re.IGNORECASE):
                    # Server-side multiplier is higher (less severe)
                    server_multiplier = min(0.8, multiplier + 0.4)
                    violations.append(f"P002: WARNING - Hardcoded {description.replace(' in client', '')} (use env var)")
                    min_multiplier = min(min_multiplier, server_multiplier)

        return min_multiplier, violations

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

        # =====================================================================
        # GAP-001 FIX: Check destructive commands FIRST (highest priority)
        # These must score < 0.5 to be properly blocked
        # =====================================================================
        destructive_multiplier, destructive_violations = self._check_destructive_commands(content)
        if destructive_multiplier < 1.0:
            violations.extend(destructive_violations)

            # If destructive command detected, return immediately with low score
            if destructive_multiplier < 0.5:
                return SafetyResult(
                    safe=False,
                    score=destructive_multiplier,
                    violations=violations,
                    recommendation="BLOCK",
                    details={
                        "is_server_side": is_server,
                        "domain": self.domain,
                        "file_path": file_path,
                        "critical_count": len(violations),
                        "warning_count": 0,
                        "destructive_detected": True,
                    }
                )

        # =====================================================================
        # GAP-002 FIX: Check client-side env var exposure
        # Private env vars in client code must be flagged
        # =====================================================================
        env_multiplier, env_violations = self._check_client_side_env_vars(content, file_path)
        if env_multiplier < 1.0:
            violations.extend(env_violations)

        # =====================================================================
        # GAP-003 FIX: Check for hardcoded API keys
        # API keys in client code are critical; in server code are warnings
        # =====================================================================
        api_key_multiplier, api_key_violations = self._check_client_api_keys(content, file_path)
        if api_key_multiplier < 1.0:
            violations.extend(api_key_violations)

        # Check always-dangerous patterns (for non-destructive commands)
        for pattern, principle, message in self.ALWAYS_DANGEROUS:
            if re.search(pattern, content, re.IGNORECASE):
                # Avoid duplicate violations from destructive check
                violation_msg = f"{principle}: {message}"
                if violation_msg not in violations:
                    violations.append(violation_msg)

        # Check hardcoded credentials (dangerous in ANY context)
        for pattern, principle, message in self.HARDCODED_CREDENTIALS:
            if re.search(pattern, content, re.IGNORECASE):
                violations.append(f"{principle}: {message}")

        # Check FE-dangerous patterns (skip for BE domain or server-side)
        if self.domain != "be" and not is_server:
            for pattern, principle, message in self.FE_DANGEROUS:
                if re.search(pattern, content, re.IGNORECASE):
                    violations.append(f"{principle}: {message}")

        # Check client-side dangerous patterns (server-side patterns in client code)
        if not is_server:
            for pattern, principle, message in self.CLIENT_DANGEROUS:
                if re.search(pattern, content, re.IGNORECASE):
                    violations.append(f"{principle}: {message}")

        # Check warning patterns
        warnings = []
        for pattern, principle, message in self.WARN_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                warnings.append(f"{principle}: {message}")

        # Calculate score
        # Start with min of all security multipliers
        # Critical violations get heavy penalty (0.55 each)
        # Warning patterns get light penalty (0.05 each)
        critical_count = len(violations)
        warn_count = len(warnings)

        # Base score from min of all multipliers (GAP-001, GAP-002, GAP-003)
        base_multiplier = min(destructive_multiplier, env_multiplier, api_key_multiplier)

        # Count violations not already penalized by multipliers
        # (destructive, env, and api_key violations are already reflected in multipliers)
        already_penalized = len(destructive_violations) + len(env_violations) + len(api_key_violations)
        other_violations = max(0, critical_count - already_penalized)

        # Apply penalties: 0.55 per other violation, 0.05 per warning
        score = base_multiplier - (other_violations * 0.55) - (warn_count * 0.05)
        score = max(0.0, min(1.0, score))

        # Determine safety and recommendation
        safe = score >= self.block_threshold

        if critical_count > 0 or destructive_multiplier < 0.5 or api_key_multiplier < 0.5:
            recommendation = "BLOCK"
        elif warn_count > 0 or destructive_multiplier < 1.0 or env_multiplier < 1.0 or api_key_multiplier < 1.0:
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
                "is_client_side": self._is_client_component(content, file_path),
                "domain": self.domain,
                "file_path": file_path,
                "critical_count": critical_count,
                "warning_count": warn_count,
                "destructive_multiplier": destructive_multiplier,
                "env_var_multiplier": env_multiplier,
                "api_key_multiplier": api_key_multiplier,
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
