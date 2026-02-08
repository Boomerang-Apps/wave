"""
Domain Boundary Enforcer
Story: WAVE-P3-002

Validates agent file access against domain ownership rules.
Each domain has defined file patterns; agents can only modify
files within their assigned domain or the shared domain.

Uses fnmatch-style glob patterns from wave-config.json.
"""

import json
import logging
import time
from dataclasses import dataclass, field
from fnmatch import fnmatch
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# The "shared" domain is accessible to all agents
SHARED_DOMAIN_ID = "shared"


def _glob_match(path: str, pattern: str) -> bool:
    """Match a file path against a glob pattern with ** support.

    fnmatch doesn't handle ** (multi-level directory matching),
    so we split on ** and match prefix/suffix independently.
    """
    if "**" not in pattern:
        return fnmatch(path, pattern)

    # Split on first ** occurrence
    idx = pattern.index("**")
    prefix_pattern = pattern[:idx].rstrip("/")
    suffix_pattern = pattern[idx + 2:].lstrip("/")

    path_segments = path.split("/")

    # Find which segment the prefix ends at by trying all possible splits
    if not prefix_pattern:
        # No prefix — ** at start, match suffix against any sub-path
        for i in range(len(path_segments)):
            sub = "/".join(path_segments[i:])
            if not suffix_pattern or fnmatch(sub, suffix_pattern):
                return True
        return not suffix_pattern

    prefix_seg_count = len(prefix_pattern.split("/"))

    # Try matching the prefix against the first N segments
    for n in range(prefix_seg_count, len(path_segments) + 1):
        candidate_prefix = "/".join(path_segments[:n])
        if fnmatch(candidate_prefix, prefix_pattern):
            # Prefix matched — now check suffix against remaining
            remaining_segments = path_segments[n:]
            if not suffix_pattern:
                return True
            for i in range(len(remaining_segments)):
                sub = "/".join(remaining_segments[i:])
                if fnmatch(sub, suffix_pattern):
                    return True

    return False


@dataclass
class DomainRule:
    """Domain ownership rule with file patterns."""
    domain_id: str
    name: str
    file_patterns: List[str]


@dataclass
class AccessResult:
    """Result of a file access check."""
    allowed: bool
    domain: str  # The agent's domain
    file_path: str
    owner_domain: Optional[str] = None  # Domain that owns the file
    reason: str = ""
    override: bool = False


@dataclass
class AccessViolation:
    """Record of a boundary violation attempt."""
    agent_domain: str
    file_path: str
    owner_domain: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class _Override:
    """Internal override record."""
    agent_domain: str
    target_domain: str
    expires_at: float


class BoundaryEnforcer:
    """
    Validates agent file access against domain ownership rules.

    All agents can access the "shared" domain. For other domains,
    agents can only access files matching their own domain's patterns.

    Violations are logged for audit (AC-06). Temporary overrides can
    be granted for emergencies (AC-07).
    """

    def __init__(self, rules: Dict[str, DomainRule]):
        self.rules = rules
        self.violations: List[AccessViolation] = []
        self.override_log: List[dict] = []
        self._overrides: List[_Override] = []

    @classmethod
    def from_dict(cls, config: dict) -> "BoundaryEnforcer":
        """
        Create enforcer from a config dict (AC-01).

        Args:
            config: Dict with "domains" key containing domain definitions.

        Returns:
            Configured BoundaryEnforcer.
        """
        rules: Dict[str, DomainRule] = {}
        for domain_def in config.get("domains", []):
            domain_id = domain_def["id"]
            rules[domain_id] = DomainRule(
                domain_id=domain_id,
                name=domain_def.get("name", domain_id),
                file_patterns=domain_def.get("file_patterns", []),
            )
        return cls(rules=rules)

    @classmethod
    def from_file(cls, config_path: str) -> "BoundaryEnforcer":
        """
        Load enforcer from a wave-config.json file (AC-01).

        Args:
            config_path: Path to wave-config.json.

        Returns:
            Configured BoundaryEnforcer.

        Raises:
            FileNotFoundError: If config file does not exist.
        """
        path = Path(config_path)
        if not path.exists():
            raise FileNotFoundError(f"Config not found: {config_path}")

        with open(path) as f:
            config = json.load(f)

        return cls.from_dict(config)

    def check_access(
        self,
        agent_domain: str,
        file_path: str,
    ) -> AccessResult:
        """
        Check if an agent can access a file (AC-02/03/04/05).

        Args:
            agent_domain: The domain of the requesting agent.
            file_path: Path to the file being accessed.

        Returns:
            AccessResult indicating whether access is allowed.
        """
        # Find which domain owns this file
        owner = self._find_owner(file_path)

        # Check if the agent's domain is known
        if agent_domain not in self.rules:
            result = AccessResult(
                allowed=False,
                domain=agent_domain,
                file_path=file_path,
                owner_domain=owner,
                reason=f"Unknown agent domain: {agent_domain}",
            )
            self._record_violation(agent_domain, file_path, owner or "unknown")
            return result

        # File has no owner — deny access
        if owner is None:
            result = AccessResult(
                allowed=False,
                domain=agent_domain,
                file_path=file_path,
                owner_domain=None,
                reason=f"File '{file_path}' is not in any defined domain",
            )
            self._record_violation(agent_domain, file_path, "unowned")
            return result

        # Shared domain is accessible to everyone (AC-05)
        if owner == SHARED_DOMAIN_ID:
            return AccessResult(
                allowed=True,
                domain=agent_domain,
                file_path=file_path,
                owner_domain=owner,
            )

        # Agent's own domain — allowed (AC-03)
        if owner == agent_domain:
            return AccessResult(
                allowed=True,
                domain=agent_domain,
                file_path=file_path,
                owner_domain=owner,
            )

        # Check for active override (AC-07)
        if self._has_active_override(agent_domain, owner):
            self._log_override_usage(agent_domain, owner, file_path)
            return AccessResult(
                allowed=True,
                domain=agent_domain,
                file_path=file_path,
                owner_domain=owner,
                override=True,
            )

        # Denied — outside domain (AC-04)
        result = AccessResult(
            allowed=False,
            domain=agent_domain,
            file_path=file_path,
            owner_domain=owner,
            reason=(
                f"Agent '{agent_domain}' cannot modify '{file_path}' "
                f"— owned by domain '{owner}'"
            ),
        )
        self._record_violation(agent_domain, file_path, owner)

        logger.warning(
            "Domain violation: %s tried to access %s (owned by %s)",
            agent_domain, file_path, owner,
        )
        return result

    def grant_override(
        self,
        agent_domain: str,
        target_domain: str,
        duration_seconds: float = 300,
    ) -> None:
        """
        Grant temporary cross-domain access (AC-07).

        Args:
            agent_domain: The agent receiving the override.
            target_domain: The domain being opened.
            duration_seconds: How long the override lasts.
        """
        expires_at = time.time() + duration_seconds
        self._overrides.append(_Override(
            agent_domain=agent_domain,
            target_domain=target_domain,
            expires_at=expires_at,
        ))
        logger.info(
            "Override granted: %s -> %s for %.0fs",
            agent_domain, target_domain, duration_seconds,
        )

    def revoke_override(
        self,
        agent_domain: str,
        target_domain: str,
    ) -> None:
        """Revoke a previously granted override (AC-07)."""
        self._overrides = [
            o for o in self._overrides
            if not (o.agent_domain == agent_domain
                    and o.target_domain == target_domain)
        ]

    def _find_owner(self, file_path: str) -> Optional[str]:
        """Find which domain owns a file path. Returns None if unowned."""
        # Check shared first so it takes priority for shared paths
        if SHARED_DOMAIN_ID in self.rules:
            shared_rule = self.rules[SHARED_DOMAIN_ID]
            if self._matches_patterns(file_path, shared_rule.file_patterns):
                return SHARED_DOMAIN_ID

        # Check non-shared domains
        for domain_id, rule in self.rules.items():
            if domain_id == SHARED_DOMAIN_ID:
                continue
            if self._matches_patterns(file_path, rule.file_patterns):
                return domain_id

        return None

    @staticmethod
    def _matches_patterns(file_path: str, patterns: List[str]) -> bool:
        """Check if a file path matches any of the given glob patterns.

        Supports ** for multi-level directory matching (e.g., src/auth/**/*).
        """
        for pattern in patterns:
            if _glob_match(file_path, pattern):
                return True
        return False

    def _has_active_override(
        self, agent_domain: str, target_domain: str
    ) -> bool:
        """Check if there's an active (non-expired) override."""
        now = time.time()
        for o in self._overrides:
            if (o.agent_domain == agent_domain
                    and o.target_domain == target_domain
                    and o.expires_at > now):
                return True
        return False

    def _record_violation(
        self, agent_domain: str, file_path: str, owner: str
    ) -> None:
        """Record a violation for audit (AC-06)."""
        self.violations.append(AccessViolation(
            agent_domain=agent_domain,
            file_path=file_path,
            owner_domain=owner,
        ))

    def _log_override_usage(
        self, agent_domain: str, target_domain: str, file_path: str
    ) -> None:
        """Log override usage for audit (AC-07)."""
        self.override_log.append({
            "agent_domain": agent_domain,
            "target_domain": target_domain,
            "file_path": file_path,
            "timestamp": time.time(),
        })


__all__ = [
    "BoundaryEnforcer",
    "AccessResult",
    "DomainRule",
    "AccessViolation",
]
