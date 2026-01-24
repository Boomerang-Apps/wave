"""
Multi-LLM Orchestrator for WAVE v2

Combines Claude (creative, code generation) with Grok (truthful, validation)
for a more robust autonomous coding system.

Strategy:
- Claude: Dev work, code generation, creative problem solving
- Grok: CTO Master approval, constitutional scoring, QA fallback

Usage:
    from multi_llm import MultiLLMOrchestrator

    orchestrator = MultiLLMOrchestrator()
    result = orchestrator.execute_story(story_id, description)
"""

import os
import json
import logging
from typing import Optional, Literal
from dataclasses import dataclass, field
from enum import Enum

# LLM Clients
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from .tools.grok_client import GrokClient, GrokResponse

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

class LLMProvider(str, Enum):
    """Available LLM providers."""
    CLAUDE = "claude"
    GROK = "grok"

@dataclass
class LLMConfig:
    """Configuration for multi-LLM orchestration."""
    # Primary LLM for development
    dev_provider: LLMProvider = LLMProvider.CLAUDE
    dev_model: str = "claude-3-5-sonnet-20241022"

    # Validation LLM (truth-focused)
    validation_provider: LLMProvider = LLMProvider.GROK
    validation_model: str = "grok-3"

    # Constitutional scoring
    constitutional_provider: LLMProvider = LLMProvider.GROK

    # CTO Master (final approval)
    cto_master_provider: LLMProvider = LLMProvider.GROK

    # QA fallback (when primary fails)
    qa_fallback_enabled: bool = True
    qa_max_retries: int = 3

# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-LLM CLIENT
# ═══════════════════════════════════════════════════════════════════════════════

class MultiLLMClient:
    """
    Unified client for multiple LLM providers.

    Provides consistent interface for both Claude and Grok.
    """

    def __init__(self, config: Optional[LLMConfig] = None):
        self.config = config or LLMConfig()

        # Initialize Claude
        self.claude = ChatAnthropic(
            model=self.config.dev_model,
            temperature=0.2
        )

        # Initialize Grok
        self.grok = GrokClient(model=self.config.validation_model)

        logger.info(f"MultiLLM initialized: Claude={self.config.dev_model}, Grok={self.config.validation_model}")

    def query(
        self,
        prompt: str,
        provider: LLMProvider,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2
    ) -> str:
        """
        Send query to specified provider.

        Args:
            prompt: User prompt
            provider: Which LLM to use
            system_prompt: Optional system prompt
            temperature: Response temperature

        Returns:
            Response content
        """
        if provider == LLMProvider.CLAUDE:
            return self._query_claude(prompt, system_prompt, temperature)
        elif provider == LLMProvider.GROK:
            return self._query_grok(prompt, system_prompt, temperature)
        else:
            raise ValueError(f"Unknown provider: {provider}")

    def _query_claude(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2
    ) -> str:
        """Query Claude."""
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))

        response = self.claude.invoke(messages)
        return response.content

    def _query_grok(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2
    ) -> str:
        """Query Grok."""
        response = self.grok.query(prompt, system_prompt)
        if response.success:
            return response.content
        else:
            raise Exception(f"Grok error: {response.error}")

    def query_with_fallback(
        self,
        prompt: str,
        primary: LLMProvider,
        fallback: LLMProvider,
        system_prompt: Optional[str] = None
    ) -> tuple[str, LLMProvider]:
        """
        Query with fallback on failure.

        Returns:
            Tuple of (response, provider_used)
        """
        try:
            response = self.query(prompt, primary, system_prompt)
            return response, primary
        except Exception as e:
            logger.warning(f"{primary} failed: {e}, falling back to {fallback}")
            response = self.query(prompt, fallback, system_prompt)
            return response, fallback


# ═══════════════════════════════════════════════════════════════════════════════
# SPECIALIZED NODES
# ═══════════════════════════════════════════════════════════════════════════════

def create_cto_master_node(client: MultiLLMClient):
    """
    CTO Master Supervisor Node - Uses Grok for final approval.

    Grok is strong at:
    - Reasoning about conflicts
    - Truthful assessment of readiness
    - Cross-domain validation
    """

    def cto_master_node(state: dict) -> dict:
        """
        Final approval gate before merge.
        Uses Grok for truthful, rigorous validation.
        """
        logger.info("[CTO Master] Final approval check (Grok)")

        # Gather context
        story_id = state.get("story_id", "unknown")
        code = state.get("code", "")
        test_results = state.get("test_result", "")
        qa_passed = state.get("phase") == "qa_passed"

        system_prompt = """You are the CTO Master Supervisor for an autonomous coding system.
Your role is FINAL APPROVAL before code is merged to main.

You must be:
1. TRUTHFUL - No hallucination, only facts from the context
2. RIGOROUS - Apply strict standards
3. DECISIVE - Clear APPROVE or REJECT

Check for:
- Code quality and completeness
- Test coverage and results
- Cross-domain conflicts
- Safety and security issues
- Adherence to requirements"""

        prompt = f"""Review this for FINAL MERGE APPROVAL:

Story ID: {story_id}
QA Status: {"PASSED" if qa_passed else "NOT PASSED"}

Code Summary:
{code[:2000] if code else "No code provided"}

Test Results:
{test_results[:1000] if test_results else "No test results"}

Provide your decision:
1. DECISION: APPROVE or REJECT
2. CONFIDENCE: 0.0-1.0
3. CONCERNS: List any issues
4. REASONING: Brief explanation

Be truthful and rigorous."""

        try:
            response = client.query(
                prompt,
                LLMProvider.GROK,
                system_prompt
            )

            # Parse decision
            approved = "APPROVE" in response.upper() and "REJECT" not in response.upper()

            logger.info(f"[CTO Master] Decision: {'APPROVED' if approved else 'REJECTED'}")

            return {
                "cto_master_review": response,
                "cto_master_approved": approved,
                "phase": "merge" if approved else "rejected"
            }

        except Exception as e:
            logger.error(f"[CTO Master] Grok error: {e}")
            # On error, require human review
            return {
                "cto_master_review": f"Error: {e}",
                "cto_master_approved": False,
                "needs_human": True,
                "phase": "human_review"
            }

    return cto_master_node


def create_constitutional_scorer_node(client: MultiLLMClient, principles: str = ""):
    """
    Constitutional Scorer Node - Uses Grok for truth-focused safety checks.

    Grok is strong at:
    - Honest assessment without hallucination
    - Strict rule enforcement
    - Clear violation detection
    """

    default_principles = """
## WAVE Constitutional Principles

1. NEVER delete files outside the assigned worktree
2. NEVER force push to main/master/develop
3. NEVER expose API keys, secrets, or credentials
4. NEVER disable security features
5. NEVER skip tests before marking complete
6. NEVER exceed budget limits
7. ALWAYS preserve existing functionality
8. ALWAYS commit to feature branches only
"""

    principles = principles or default_principles

    def constitutional_scorer_node(state: dict) -> dict:
        """
        Check actions against constitutional principles.
        Uses Grok for truthful, strict enforcement.
        """
        logger.info("[Constitutional] Scoring action (Grok)")

        # Get action to evaluate
        action = ""
        if state.get("messages"):
            last_msg = state["messages"][-1]
            action = last_msg.content if hasattr(last_msg, "content") else str(last_msg)

        if not action:
            return {
                "constitutional_score": 1.0,
                "constitutional_violations": [],
                "constitutional_recommendation": "PROCEED"
            }

        system_prompt = """You are a Constitutional AI Safety Scorer.
You must be STRICT and TRUTHFUL.
If an action violates ANY principle, you MUST flag it.
Do not rationalize or excuse violations.
Safety is paramount."""

        prompt = f"""Check this action against constitutional principles:

PRINCIPLES:
{principles}

ACTION:
{action}

Return JSON only:
{{
    "score": 0.0-1.0,
    "violations": ["list of violated principles"],
    "recommendation": "PROCEED" | "WARN" | "BLOCK",
    "reasoning": "brief explanation"
}}

Be strict and truthful. When in doubt, err on the side of caution."""

        try:
            response = client.query(
                prompt,
                LLMProvider.GROK,
                system_prompt,
                temperature=0.1  # Very low for deterministic scoring
            )

            # Parse JSON response
            try:
                start = response.find("{")
                end = response.rfind("}") + 1
                result = json.loads(response[start:end])
            except:
                result = {
                    "score": 0.8,
                    "violations": [],
                    "recommendation": "WARN"
                }

            score = result.get("score", 1.0)
            violations = result.get("violations", [])
            recommendation = result.get("recommendation", "PROCEED")

            logger.info(f"[Constitutional] Score: {score}, Recommendation: {recommendation}")

            # Determine if we need to block
            emergency_stop = recommendation == "BLOCK" or score < 0.3

            return {
                "constitutional_score": score,
                "constitutional_violations": violations,
                "constitutional_recommendation": recommendation,
                "constitutional_response": response,
                "emergency_stop": emergency_stop,
                "needs_human": emergency_stop
            }

        except Exception as e:
            logger.error(f"[Constitutional] Grok error: {e}")
            # On error, proceed with caution but don't block
            return {
                "constitutional_score": 0.8,
                "constitutional_violations": [f"Scoring error: {e}"],
                "constitutional_recommendation": "WARN",
                "emergency_stop": False
            }

    return constitutional_scorer_node


def create_qa_with_fallback_node(client: MultiLLMClient):
    """
    QA Node with Grok Fallback.

    Strategy:
    - Primary: Claude runs QA
    - If Claude fails 2x: Route to Grok for fresh perspective
    - Grok often catches issues Claude misses (less hallucination)
    """

    def qa_with_fallback_node(state: dict) -> dict:
        """
        QA validation with Grok fallback.
        """
        retry_count = state.get("qa_retry_count", 0)
        code = state.get("code", "")

        # Determine which LLM to use
        if retry_count >= 2:
            # After 2 Claude failures, try Grok
            provider = LLMProvider.GROK
            logger.info("[QA] Using Grok fallback after Claude retries")
        else:
            provider = LLMProvider.CLAUDE
            logger.info(f"[QA] Using Claude (attempt {retry_count + 1})")

        system_prompt = """You are a QA Engineer reviewing code.
You must:
1. Check for bugs and logic errors
2. Verify code meets requirements
3. Identify missing test coverage
4. Flag security issues

Be thorough and honest. If the code has issues, say so clearly."""

        prompt = f"""Review this code for quality:

```
{code[:3000]}
```

Provide:
1. VERDICT: PASS or FAIL
2. ISSUES: List of problems found (if any)
3. SUGGESTIONS: Improvements needed
4. TEST_COVERAGE: Adequate / Needs More

Return structured assessment."""

        try:
            response = client.query(prompt, provider, system_prompt)

            # Parse verdict
            passed = "PASS" in response.upper() and "FAIL" not in response.upper()

            if passed:
                logger.info(f"[QA] PASSED (via {provider.value})")
                return {
                    "qa_result": response,
                    "qa_passed": True,
                    "qa_provider": provider.value,
                    "phase": "qa_passed"
                }
            else:
                logger.info(f"[QA] FAILED (via {provider.value})")
                new_retry = retry_count + 1

                if new_retry >= 3:
                    # Max retries reached
                    return {
                        "qa_result": response,
                        "qa_passed": False,
                        "qa_provider": provider.value,
                        "qa_retry_count": new_retry,
                        "needs_human": True,
                        "phase": "human_review"
                    }
                else:
                    # Can still retry
                    return {
                        "qa_result": response,
                        "qa_passed": False,
                        "qa_provider": provider.value,
                        "qa_retry_count": new_retry,
                        "phase": "dev_fix"
                    }

        except Exception as e:
            logger.error(f"[QA] Error: {e}")
            return {
                "qa_result": f"Error: {e}",
                "qa_passed": False,
                "qa_retry_count": retry_count + 1,
                "phase": "dev_fix"
            }

    return qa_with_fallback_node


def create_planning_node(client: MultiLLMClient):
    """
    Planning Node - Uses Grok for high-level strategy.

    Grok is strong at:
    - Truthful feasibility assessment
    - Less hallucination in estimates
    - Clear identification of blockers
    """

    def planning_node(state: dict) -> dict:
        """
        High-level planning using Grok for truthful assessment.
        """
        logger.info("[Planning] Strategic planning (Grok)")

        requirements = state.get("requirements", "")
        if state.get("messages"):
            requirements = state["messages"][0].content if hasattr(state["messages"][0], "content") else str(state["messages"][0])

        system_prompt = """You are a senior technical architect planning an implementation.
Be TRUTHFUL about:
1. Feasibility - Don't oversell or undersell
2. Effort - Give realistic estimates
3. Risks - Identify real blockers
4. Dependencies - What must happen first

No hallucination. Only facts and honest assessment."""

        prompt = f"""Create an implementation plan for:

{requirements}

Provide:
1. FEASIBILITY: High/Medium/Low with reasoning
2. APPROACH: High-level strategy
3. STEPS: Ordered implementation steps
4. RISKS: What could go wrong
5. DEPENDENCIES: What's needed first

Be truthful and realistic."""

        try:
            response = client.query(prompt, LLMProvider.GROK, system_prompt)

            # Check feasibility
            feasible = "HIGH" in response.upper() or "MEDIUM" in response.upper()
            if "LOW" in response.upper() and "FEASIBILITY: LOW" in response.upper():
                feasible = False

            logger.info(f"[Planning] Feasibility: {'OK' if feasible else 'CONCERN'}")

            return {
                "plan": response,
                "plan_feasible": feasible,
                "plan_provider": "grok",
                "phase": "develop" if feasible else "human_review"
            }

        except Exception as e:
            logger.error(f"[Planning] Error: {e}")
            return {
                "plan": f"Planning error: {e}",
                "plan_feasible": False,
                "needs_human": True,
                "phase": "human_review"
            }

    return planning_node


# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-LLM ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════

class MultiLLMOrchestrator:
    """
    Orchestrator that combines Claude and Grok for optimal results.

    Claude handles: Creative work, code generation, problem solving
    Grok handles: Validation, constitutional checks, final approval, fallback
    """

    def __init__(self, config: Optional[LLMConfig] = None):
        self.config = config or LLMConfig()
        self.client = MultiLLMClient(self.config)

        # Create specialized nodes
        self.cto_master_node = create_cto_master_node(self.client)
        self.constitutional_node = create_constitutional_scorer_node(self.client)
        self.qa_node = create_qa_with_fallback_node(self.client)
        self.planning_node = create_planning_node(self.client)

        logger.info("MultiLLMOrchestrator initialized")
        logger.info(f"  Dev: Claude ({self.config.dev_model})")
        logger.info(f"  Validation: Grok ({self.config.validation_model})")
        logger.info(f"  Constitutional: Grok")
        logger.info(f"  CTO Master: Grok")

    def get_routing_diagram(self) -> str:
        """Return ASCII diagram of multi-LLM routing."""
        return """
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-LLM ROUTING (Claude + Grok)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Story In                                                                    │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────────┐                                                        │
│  │   PLANNING      │◄──────── Grok (truthful feasibility)                   │
│  │   (Grok)        │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │   DEVELOPMENT   │◄──────── Claude (creative, code gen)                   │
│  │   (Claude)      │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │  CONSTITUTIONAL │◄──────── Grok (strict safety scoring)                  │
│  │   (Grok)        │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                                │
│  │     QA          │────▶│   QA FALLBACK   │◄── Grok (after 2 Claude fails) │
│  │   (Claude)      │     │   (Grok)        │                                │
│  └────────┬────────┘     └────────┬────────┘                                │
│           │                       │                                          │
│           └───────────┬───────────┘                                          │
│                       │                                                      │
│                       ▼                                                      │
│  ┌─────────────────┐                                                        │
│  │   CTO MASTER    │◄──────── Grok (final truthful approval)                │
│  │   (Grok)        │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│       MERGE                                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

LLM Roles:
  Claude: Creative work, code generation, primary QA
  Grok: Truthful validation, safety, final approval, fallback
"""

    def get_nodes(self) -> dict:
        """Get all specialized nodes for LangGraph integration."""
        return {
            "cto_master": self.cto_master_node,
            "constitutional": self.constitutional_node,
            "qa_with_fallback": self.qa_node,
            "planning": self.planning_node,
        }
