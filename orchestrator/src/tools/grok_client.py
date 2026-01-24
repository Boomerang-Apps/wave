"""
Grok API Client for WAVE v2 Orchestrator

Integrates xAI's Grok model for:
- CTO Master supervisor cross-checks
- Constitutional AI safety scoring
- Code review and validation

Usage:
    from tools.grok_client import GrokClient, call_grok

    client = GrokClient()
    response = client.query("Review this code for safety")

Environment:
    GROK_API_KEY: Your xAI API key
    GROK_MODEL: Model to use (default: grok-3)
"""

import os
import logging
from typing import Optional
from dataclasses import dataclass

try:
    import requests
except ImportError:
    requests = None

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

GROK_API_URL = "https://api.x.ai/v1/chat/completions"
GROK_DEFAULT_MODEL = "grok-3"  # Use grok-3 for cost efficiency, grok-4 for max capability
GROK_MAX_TOKENS = 2048
GROK_TEMPERATURE = 0.2  # Low temperature for deterministic safety scoring

# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class GrokResponse:
    """Structured response from Grok API."""
    content: str
    model: str
    usage: dict
    success: bool
    error: Optional[str] = None

# ═══════════════════════════════════════════════════════════════════════════════
# GROK CLIENT
# ═══════════════════════════════════════════════════════════════════════════════

class GrokClient:
    """
    Client for xAI Grok API integration.

    Used in WAVE orchestrator for:
    - CTO Master: Cross-domain validation and conflict detection
    - Constitutional Scorer: Safety enforcement and violation detection
    - Code Review: Secondary review for critical changes
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = GROK_MAX_TOKENS,
        temperature: float = GROK_TEMPERATURE
    ):
        """
        Initialize Grok client.

        Args:
            api_key: xAI API key (defaults to GROK_API_KEY env var)
            model: Model name (defaults to GROK_MODEL env var or grok-3)
            max_tokens: Maximum response tokens
            temperature: Response randomness (0.0-1.0)
        """
        self.api_key = api_key or os.getenv("GROK_API_KEY")
        self.model = model or os.getenv("GROK_MODEL", GROK_DEFAULT_MODEL)
        self.max_tokens = max_tokens
        self.temperature = temperature

        if not self.api_key:
            logger.warning("GROK_API_KEY not set - Grok integration disabled")

        if requests is None:
            raise ImportError("requests library required: pip install requests")

    @property
    def is_available(self) -> bool:
        """Check if Grok API is configured and available."""
        return bool(self.api_key)

    def query(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None
    ) -> GrokResponse:
        """
        Send a query to Grok API.

        Args:
            prompt: User prompt/question
            system_prompt: Optional system prompt (default: helpful AI)
            temperature: Optional temperature override

        Returns:
            GrokResponse with content and metadata
        """
        if not self.is_available:
            return GrokResponse(
                content="",
                model=self.model,
                usage={},
                success=False,
                error="GROK_API_KEY not configured"
            )

        if system_prompt is None:
            system_prompt = "You are Grok, a helpful and truthful AI assistant."

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        data = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature if temperature is not None else self.temperature,
            "max_tokens": self.max_tokens
        }

        try:
            response = requests.post(
                GROK_API_URL,
                headers=headers,
                json=data,
                timeout=60
            )

            if response.status_code == 200:
                result = response.json()
                return GrokResponse(
                    content=result["choices"][0]["message"]["content"],
                    model=result.get("model", self.model),
                    usage=result.get("usage", {}),
                    success=True
                )
            else:
                error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                logger.error(f"Grok API error: {error_msg}")
                return GrokResponse(
                    content="",
                    model=self.model,
                    usage={},
                    success=False,
                    error=error_msg
                )

        except requests.exceptions.Timeout:
            return GrokResponse(
                content="",
                model=self.model,
                usage={},
                success=False,
                error="Request timeout"
            )
        except requests.exceptions.RequestException as e:
            return GrokResponse(
                content="",
                model=self.model,
                usage={},
                success=False,
                error=str(e)
            )

    def review_code(self, code: str, context: str = "") -> GrokResponse:
        """
        Review code for safety violations and best practices.

        Args:
            code: Code to review
            context: Optional context about what the code should do

        Returns:
            GrokResponse with review findings
        """
        system_prompt = """You are a code safety reviewer. Analyze code for:
1. Security vulnerabilities (injection, XSS, secrets exposure)
2. Dangerous operations (force push, file deletion outside scope)
3. Best practice violations
4. Potential bugs

Return a structured assessment with severity ratings."""

        prompt = f"""Review this code for safety violations:

Context: {context}

Code:
```
{code}
```

Provide:
1. Safety score (0.0-1.0, where 1.0 is fully safe)
2. List of violations (if any)
3. Recommendation: APPROVE, WARN, or BLOCK
4. Brief reasoning"""

        return self.query(prompt, system_prompt)

    def validate_plan(self, plan: str, requirements: str = "") -> GrokResponse:
        """
        Validate an implementation plan for feasibility and risks.

        Args:
            plan: The proposed plan
            requirements: Original requirements

        Returns:
            GrokResponse with validation results
        """
        system_prompt = """You are a CTO reviewing implementation plans. Evaluate:
1. Technical feasibility
2. Risk assessment
3. Resource requirements
4. Potential conflicts or issues

Be direct and critical. Identify problems early."""

        prompt = f"""Validate this implementation plan:

Requirements:
{requirements}

Proposed Plan:
{plan}

Provide:
1. Feasibility score (0.0-1.0)
2. Identified risks
3. Recommendation: APPROVE, REVISE, or REJECT
4. Specific concerns or suggestions"""

        return self.query(prompt, system_prompt)

    def check_constitutional(self, action: str, principles: str) -> GrokResponse:
        """
        Check an action against constitutional principles.

        Args:
            action: The action to evaluate
            principles: Constitutional principles to check against

        Returns:
            GrokResponse with compliance assessment
        """
        system_prompt = """You are a constitutional compliance checker.
You must be strict and precise. If an action violates ANY principle, flag it.
Safety is paramount - when in doubt, err on the side of caution."""

        prompt = f"""Check this action against our constitutional principles:

PRINCIPLES:
{principles}

ACTION TO EVALUATE:
{action}

Return JSON:
{{
    "compliant": true/false,
    "score": 0.0-1.0,
    "violations": ["list of violated principles"],
    "recommendation": "PROCEED" | "WARN" | "BLOCK",
    "reasoning": "brief explanation"
}}"""

        return self.query(prompt, system_prompt, temperature=0.1)


# ═══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

# Global client instance (lazy initialization)
_grok_client: Optional[GrokClient] = None

def get_grok_client() -> GrokClient:
    """Get or create the global Grok client instance."""
    global _grok_client
    if _grok_client is None:
        _grok_client = GrokClient()
    return _grok_client

def call_grok(
    prompt: str,
    system_prompt: str = "You are Grok, a helpful and truthful AI."
) -> str:
    """
    Simple function to call Grok API.

    Args:
        prompt: User prompt
        system_prompt: System prompt

    Returns:
        Response content or error message
    """
    client = get_grok_client()
    response = client.query(prompt, system_prompt)

    if response.success:
        return response.content
    else:
        return f"Error: {response.error}"


# ═══════════════════════════════════════════════════════════════════════════════
# LANGGRAPH NODE
# ═══════════════════════════════════════════════════════════════════════════════

def create_grok_review_node(client: Optional[GrokClient] = None):
    """
    Create a LangGraph node that uses Grok for code review.

    Args:
        client: Optional GrokClient instance

    Returns:
        Node function for LangGraph
    """
    if client is None:
        client = get_grok_client()

    def grok_review_node(state: dict) -> dict:
        """
        LangGraph node that reviews the last action with Grok.

        Expects state to have:
        - messages: list of messages
        - code: code to review (optional)

        Returns:
        - grok_review: review results
        - grok_score: safety score
        """
        # Get code from state or last message
        code = state.get("code", "")
        if not code and state.get("messages"):
            last_msg = state["messages"][-1]
            if hasattr(last_msg, "content"):
                code = last_msg.content
            else:
                code = str(last_msg)

        if not code:
            return {
                "grok_review": "No code to review",
                "grok_score": 1.0
            }

        # Call Grok for review
        response = client.review_code(code)

        if response.success:
            # Parse score from response if possible
            content = response.content.lower()
            score = 1.0

            if "block" in content:
                score = 0.3
            elif "warn" in content:
                score = 0.6
            elif "approve" in content:
                score = 0.9

            return {
                "grok_review": response.content,
                "grok_score": score
            }
        else:
            # On error, don't block - just log warning
            return {
                "grok_review": f"Grok unavailable: {response.error}",
                "grok_score": 0.8  # Neutral score on error
            }

    return grok_review_node


def create_grok_constitutional_node(
    client: Optional[GrokClient] = None,
    principles: str = ""
):
    """
    Create a LangGraph node that uses Grok for constitutional checking.

    Args:
        client: Optional GrokClient instance
        principles: Constitutional principles to check against

    Returns:
        Node function for LangGraph
    """
    if client is None:
        client = get_grok_client()

    default_principles = """
1. NEVER delete files outside the assigned worktree
2. NEVER force push to main/master
3. NEVER expose secrets or credentials
4. NEVER bypass tests
5. NEVER exceed budget limits
"""

    principles = principles or default_principles

    def grok_constitutional_node(state: dict) -> dict:
        """
        LangGraph node that checks action against constitutional principles.

        Expects state to have:
        - messages: list of messages (last one is action to check)

        Returns:
        - constitutional_check: Grok's assessment
        - is_compliant: boolean
        - grok_recommendation: PROCEED, WARN, or BLOCK
        """
        # Get action from last message
        action = ""
        if state.get("messages"):
            last_msg = state["messages"][-1]
            if hasattr(last_msg, "content"):
                action = last_msg.content
            else:
                action = str(last_msg)

        if not action:
            return {
                "constitutional_check": "No action to check",
                "is_compliant": True,
                "grok_recommendation": "PROCEED"
            }

        # Call Grok for constitutional check
        response = client.check_constitutional(action, principles)

        if response.success:
            content = response.content

            # Parse recommendation
            recommendation = "PROCEED"
            if "BLOCK" in content.upper():
                recommendation = "BLOCK"
            elif "WARN" in content.upper():
                recommendation = "WARN"

            is_compliant = recommendation == "PROCEED"

            return {
                "constitutional_check": content,
                "is_compliant": is_compliant,
                "grok_recommendation": recommendation
            }
        else:
            # On error, proceed with caution
            return {
                "constitutional_check": f"Grok unavailable: {response.error}",
                "is_compliant": True,  # Don't block on API errors
                "grok_recommendation": "PROCEED"
            }

    return grok_constitutional_node
