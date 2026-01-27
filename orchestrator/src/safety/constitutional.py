"""
WAVE v2 Constitutional AI Module

Implements safety scoring and enforcement using constitutional principles.
Uses Grok for truthful, strict safety assessment.
"""

import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional, Callable

# Import state types
import sys
_src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

try:
    from src.graph import WAVEState, EscalationLevel
except ImportError:
    from graph import WAVEState, EscalationLevel

# Try to import Grok client
try:
    from src.multi_llm import MultiLLMClient, LLMProvider
    GROK_AVAILABLE = True
except ImportError:
    try:
        from multi_llm import MultiLLMClient, LLMProvider
        GROK_AVAILABLE = True
    except ImportError:
        GROK_AVAILABLE = False
        LLMProvider = None


# ═══════════════════════════════════════════════════════════════════════════════
# SAFETY PRINCIPLES
# ═══════════════════════════════════════════════════════════════════════════════

class SafetyCategory(str, Enum):
    """Categories of safety concerns."""
    DESTRUCTIVE = "destructive"      # Irreversible actions
    SECURITY = "security"            # Credential/secret exposure
    SCOPE = "scope"                  # Outside allowed boundaries
    RESOURCE = "resource"            # Budget/resource violations
    UNCERTAINTY = "uncertainty"      # High-risk uncertain actions


@dataclass
class SafetyPrinciple:
    """A constitutional safety principle."""
    id: str
    name: str
    description: str
    category: SafetyCategory
    severity: float  # 0.0 = informational, 1.0 = critical
    patterns: List[str] = field(default_factory=list)  # Regex patterns to detect


# Core WAVE safety principles
WAVE_PRINCIPLES = [
    SafetyPrinciple(
        id="P001",
        name="No Destructive Commands",
        description="Never execute destructive commands without explicit approval",
        category=SafetyCategory.DESTRUCTIVE,
        severity=1.0,
        patterns=[
            r"rm\s+-rf",
            r"git\s+push\s+--force",
            r"git\s+push\s+-f",
            r"DROP\s+TABLE",
            r"DROP\s+DATABASE",
            r"TRUNCATE",
            r"git\s+reset\s+--hard",
            r":\s*>",  # Truncate file
        ]
    ),
    SafetyPrinciple(
        id="P002",
        name="No Secret Exposure",
        description="Never expose secrets, credentials, or API keys",
        category=SafetyCategory.SECURITY,
        severity=1.0,
        patterns=[
            r"API_KEY",
            r"SECRET",
            r"PASSWORD",
            r"PRIVATE_KEY",
            r"AWS_ACCESS",
            r"\.env",
            r"credentials",
            r"token\s*=",
        ]
    ),
    SafetyPrinciple(
        id="P003",
        name="Stay In Scope",
        description="Never modify files outside the assigned worktree",
        category=SafetyCategory.SCOPE,
        severity=0.9,
        patterns=[
            r"\.\./\.\./",  # Parent directory traversal
            r"/etc/",
            r"/usr/",
            r"/var/",
            r"~/.ssh",
            r"~/.aws",
        ]
    ),
    SafetyPrinciple(
        id="P004",
        name="Validate Inputs",
        description="Always validate inputs before processing",
        category=SafetyCategory.SECURITY,
        severity=0.7,
        patterns=[
            r"eval\s*\(",
            r"exec\s*\(",
            r"subprocess\.call.*shell\s*=\s*True",
            r"os\.system\s*\(",
        ]
    ),
    SafetyPrinciple(
        id="P005",
        name="Respect Budgets",
        description="Respect token and cost budgets",
        category=SafetyCategory.RESOURCE,
        severity=0.8,
        patterns=[]  # Checked programmatically
    ),
    SafetyPrinciple(
        id="P006",
        name="Escalate Uncertainty",
        description="Escalate uncertainty rather than guessing",
        category=SafetyCategory.UNCERTAINTY,
        severity=0.6,
        patterns=[]  # Checked via LLM
    ),
]


# ═══════════════════════════════════════════════════════════════════════════════
# P006 EXPLICIT TRIGGERS (Enhancement 3 - Grok)
# ═══════════════════════════════════════════════════════════════════════════════

# Confidence threshold for uncertainty escalation
CONFIDENCE_THRESHOLD = 0.6

# Keywords indicating ambiguous or uncertain requirements
AMBIGUOUS_KEYWORDS = [
    'maybe', 'perhaps', 'possibly', 'might',
    'some kind of', 'something like', 'not sure',
    'TBD', 'TODO', 'unclear', 'ambiguous',
    'could be', 'either', 'or maybe', 'not certain',
    'probably', 'i think', 'i guess', 'potentially',
    'figure out', 'to be determined', 'decide later'
]


def should_escalate_p006(result: dict) -> bool:
    """
    Determine if P006 (Escalate Uncertainty) should trigger.

    Enhancement 3 (Grok): Add explicit triggers for uncertainty escalation
    instead of relying solely on LLM judgment.

    Explicit triggers:
    1. Confidence score < 0.6
    2. Ambiguous keywords in requirements
    3. Multiple valid options without selection
    4. 'unsure' or similar decision

    Args:
        result: Dict containing decision context with possible keys:
            - confidence_score: Float 0-1 indicating confidence
            - requirements: String with task requirements
            - options: List of available options
            - selected: Selected option (or None)
            - decision: Decision status string

    Returns:
        True if should escalate to human, False otherwise
    """
    # Trigger 1: Low confidence score
    confidence = result.get('confidence_score', 1.0)
    if confidence < CONFIDENCE_THRESHOLD:
        return True

    # Trigger 2: Ambiguous keywords in requirements
    requirements = result.get('requirements', '').lower()
    for keyword in AMBIGUOUS_KEYWORDS:
        if keyword.lower() in requirements:
            return True

    # Trigger 3: Multiple options without selection
    options = result.get('options', [])
    selected = result.get('selected')
    if len(options) > 1 and selected is None:
        return True

    # Trigger 4: Unsure/uncertain decision
    decision = result.get('decision', '').lower()
    uncertain_decisions = ['unsure', 'uncertain', 'unclear', 'unknown', 'undecided']
    if decision in uncertain_decisions:
        return True

    # No escalation needed
    return False


# ═══════════════════════════════════════════════════════════════════════════════
# SAFETY RESULT TYPES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SafetyViolation:
    """A detected safety violation."""
    principle_id: str
    principle_name: str
    category: SafetyCategory
    severity: float
    description: str
    matched_pattern: Optional[str] = None
    context: Optional[str] = None


@dataclass
class SafetyResult:
    """Result of a safety check."""
    safe: bool
    score: float  # 0.0 = unsafe, 1.0 = fully safe
    violations: List[SafetyViolation] = field(default_factory=list)
    recommendation: str = "ALLOW"  # ALLOW, WARN, BLOCK
    escalation_level: EscalationLevel = EscalationLevel.NONE
    checked_at: str = field(default_factory=lambda: datetime.now().isoformat())


# ═══════════════════════════════════════════════════════════════════════════════
# CONSTITUTIONAL CHECKER
# ═══════════════════════════════════════════════════════════════════════════════

class ConstitutionalChecker:
    """
    Constitutional AI safety checker.

    Uses pattern matching for quick checks and Grok for nuanced analysis.
    """

    def __init__(
        self,
        principles: List[SafetyPrinciple] = None,
        use_grok: bool = True,
        strict_mode: bool = True
    ):
        self.principles = principles or WAVE_PRINCIPLES
        self.use_grok = use_grok and GROK_AVAILABLE
        self.strict_mode = strict_mode
        self._client = None

    def _get_client(self) -> Optional["MultiLLMClient"]:
        """Get or create the LLM client."""
        if self._client is None and GROK_AVAILABLE:
            self._client = MultiLLMClient()
        return self._client

    def check_patterns(self, content: str) -> List[SafetyViolation]:
        """
        Check content against safety patterns.

        Args:
            content: Text content to check

        Returns:
            List of violations found
        """
        violations = []
        content_lower = content.lower()

        for principle in self.principles:
            for pattern in principle.patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    violations.append(SafetyViolation(
                        principle_id=principle.id,
                        principle_name=principle.name,
                        category=principle.category,
                        severity=principle.severity,
                        description=principle.description,
                        matched_pattern=pattern,
                        context=content[:200] if len(content) > 200 else content
                    ))
                    break  # One violation per principle

        return violations

    def check_with_grok(self, content: str, context: str = "") -> SafetyResult:
        """
        Check content using Grok for nuanced analysis.

        Args:
            content: Content to analyze
            context: Additional context

        Returns:
            SafetyResult from Grok analysis
        """
        if not self.use_grok or not GROK_AVAILABLE:
            return SafetyResult(
                safe=True,
                score=1.0,
                recommendation="ALLOW"
            )

        client = self._get_client()
        if not client or not os.getenv("GROK_API_KEY"):
            return SafetyResult(safe=True, score=1.0, recommendation="ALLOW")

        # Build prompt for Grok
        principles_text = "\n".join([
            f"- {p.id}: {p.name} - {p.description}"
            for p in self.principles
        ])

        prompt = f"""Analyze this action for safety violations against these principles:

{principles_text}

Action to analyze:
{content}

Context: {context}

Respond with:
SAFE: YES or NO
SCORE: 0.0 to 1.0 (1.0 = fully safe)
VIOLATIONS: List any principle IDs violated
RECOMMENDATION: ALLOW, WARN, or BLOCK
REASON: Brief explanation
"""

        try:
            response = client.query(
                prompt,
                LLMProvider.GROK,
                system_prompt="You are a safety reviewer. Be strict and thorough."
            )

            # Parse response
            safe = "SAFE: YES" in response.upper()
            score = self._parse_score(response)
            recommendation = self._parse_recommendation(response)
            violations = self._parse_grok_violations(response)

            return SafetyResult(
                safe=safe,
                score=score,
                violations=violations,
                recommendation=recommendation,
                escalation_level=self._get_escalation_level(score, violations)
            )
        except Exception as e:
            # On error, be conservative
            return SafetyResult(
                safe=False,
                score=0.5,
                recommendation="WARN",
                escalation_level=EscalationLevel.WARNING
            )

    def _parse_score(self, response: str) -> float:
        """Parse score from Grok response."""
        match = re.search(r"SCORE:\s*([\d.]+)", response, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
        return 0.5

    def _parse_recommendation(self, response: str) -> str:
        """Parse recommendation from Grok response."""
        response_upper = response.upper()
        if "RECOMMENDATION: BLOCK" in response_upper:
            return "BLOCK"
        elif "RECOMMENDATION: WARN" in response_upper:
            return "WARN"
        return "ALLOW"

    def _parse_grok_violations(self, response: str) -> List[SafetyViolation]:
        """Parse violations from Grok response."""
        violations = []
        match = re.search(r"VIOLATIONS:\s*([^\n]+)", response, re.IGNORECASE)
        if match:
            violation_ids = re.findall(r"P\d{3}", match.group(1))
            for vid in violation_ids:
                principle = next((p for p in self.principles if p.id == vid), None)
                if principle:
                    violations.append(SafetyViolation(
                        principle_id=principle.id,
                        principle_name=principle.name,
                        category=principle.category,
                        severity=principle.severity,
                        description=principle.description
                    ))
        return violations

    def _get_escalation_level(
        self,
        score: float,
        violations: List[SafetyViolation]
    ) -> EscalationLevel:
        """Determine escalation level based on score and violations."""
        if any(v.severity >= 1.0 for v in violations):
            return EscalationLevel.E_STOP
        elif score < 0.3:
            return EscalationLevel.CRITICAL
        elif score < 0.6 or violations:
            return EscalationLevel.WARNING
        return EscalationLevel.NONE

    def check(self, content: str, context: str = "") -> SafetyResult:
        """
        Full safety check combining pattern matching and LLM analysis.

        Args:
            content: Content to check
            context: Additional context

        Returns:
            Complete SafetyResult
        """
        # First, quick pattern check
        pattern_violations = self.check_patterns(content)

        # If critical violations found by patterns, no need for LLM
        if any(v.severity >= 1.0 for v in pattern_violations):
            return SafetyResult(
                safe=False,
                score=0.0,
                violations=pattern_violations,
                recommendation="BLOCK",
                escalation_level=EscalationLevel.E_STOP
            )

        # Use Grok for nuanced analysis
        if self.use_grok and not pattern_violations:
            grok_result = self.check_with_grok(content, context)
            return grok_result

        # Return pattern-based result
        if pattern_violations:
            max_severity = max(v.severity for v in pattern_violations)
            score = 1.0 - max_severity
            return SafetyResult(
                safe=score > 0.5,
                score=score,
                violations=pattern_violations,
                recommendation="WARN" if score > 0.3 else "BLOCK",
                escalation_level=self._get_escalation_level(score, pattern_violations)
            )

        return SafetyResult(
            safe=True,
            score=1.0,
            recommendation="ALLOW",
            escalation_level=EscalationLevel.NONE
        )


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def check_action_safety(
    action: str,
    context: str = "",
    use_grok: bool = True
) -> SafetyResult:
    """
    Quick helper to check an action's safety.

    Args:
        action: The action/command to check
        context: Additional context
        use_grok: Whether to use Grok for analysis

    Returns:
        SafetyResult
    """
    checker = ConstitutionalChecker(use_grok=use_grok)
    return checker.check(action, context)


def create_constitutional_node(
    checker: Optional[ConstitutionalChecker] = None
) -> Callable[[WAVEState], dict]:
    """
    Create a constitutional checking node for the WAVE graph.

    Args:
        checker: Optional pre-configured checker

    Returns:
        Node function for the graph
    """
    _checker = checker or ConstitutionalChecker()

    def constitutional_node(state: WAVEState) -> dict:
        """Check state for safety violations."""
        # Get content to check
        content_to_check = []

        if state.get("code"):
            content_to_check.append(f"Code:\n{state['code']}")

        if state.get("plan"):
            content_to_check.append(f"Plan:\n{state['plan']}")

        # Get recent messages
        messages = state.get("messages", [])
        if messages:
            recent = messages[-3:] if len(messages) > 3 else messages
            for msg in recent:
                if hasattr(msg, "content"):
                    content_to_check.append(msg.content)

        if not content_to_check:
            return {
                "safety": {
                    **state.get("safety", {}),
                    "constitutional_score": 1.0,
                    "violations": [],
                    "escalation_level": EscalationLevel.NONE.value,
                    "emergency_stop": False
                }
            }

        # Check all content
        full_content = "\n\n".join(content_to_check)
        context = f"Story: {state.get('story_id', 'unknown')}"

        result = _checker.check(full_content, context)

        # Build safety state update
        violations = [
            f"{v.principle_id}: {v.principle_name}"
            for v in result.violations
        ]

        return {
            "safety": {
                **state.get("safety", {}),
                "constitutional_score": result.score,
                "violations": violations,
                "escalation_level": result.escalation_level.value,
                "emergency_stop": result.escalation_level == EscalationLevel.E_STOP
            }
        }

    return constitutional_node


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# EMERGENCY STOP (E-STOP)
# ═══════════════════════════════════════════════════════════════════════════════

class ESTOP:
    """
    Emergency Stop system for immediate workflow termination.

    Can be triggered by:
    - Critical safety violations
    - Budget exceeded
    - Manual intervention
    """
    _triggered: bool = False
    _reason: str = ""

    @classmethod
    def trigger(cls, reason: str = "Manual E-STOP"):
        """Trigger emergency stop."""
        cls._triggered = True
        cls._reason = reason

    @classmethod
    def reset(cls):
        """Reset emergency stop (for testing)."""
        cls._triggered = False
        cls._reason = ""

    @classmethod
    def is_triggered(cls) -> bool:
        """Check if E-STOP is active."""
        return cls._triggered

    @classmethod
    def get_reason(cls) -> str:
        """Get E-STOP reason."""
        return cls._reason


__all__ = [
    "SafetyCategory",
    "SafetyPrinciple",
    "SafetyViolation",
    "SafetyResult",
    "ConstitutionalChecker",
    "WAVE_PRINCIPLES",
    "check_action_safety",
    "create_constitutional_node",
    "ESTOP",
    # P006 Explicit Triggers (Enhancement 3)
    "AMBIGUOUS_KEYWORDS",
    "CONFIDENCE_THRESHOLD",
    "should_escalate_p006",
]
