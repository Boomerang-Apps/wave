"""
WAVE v2 Planner Node

Uses Grok for truthful feasibility assessment of implementation plans.
Grok's factual nature makes it ideal for realistic planning.
"""

import os
from datetime import datetime
from typing import Callable, Optional

# Import state types
import sys
_src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

try:
    from src.graph import WAVEState, Phase, Gate
except ImportError:
    from graph import WAVEState, Phase, Gate

# Try to import MultiLLMClient
try:
    from src.multi_llm import MultiLLMClient, LLMProvider
    MULTI_LLM_AVAILABLE = True
except ImportError:
    try:
        from multi_llm import MultiLLMClient, LLMProvider
        MULTI_LLM_AVAILABLE = True
    except ImportError:
        MULTI_LLM_AVAILABLE = False
        LLMProvider = None


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPTS
# ═══════════════════════════════════════════════════════════════════════════════

PLANNER_SYSTEM_PROMPT = """You are a senior software architect providing implementation plans for the WAVE autonomous coding system.

Your role is to:
1. Analyze requirements and assess feasibility
2. Create detailed, actionable implementation plans
3. Identify potential risks and blockers
4. Estimate complexity honestly
5. Break down work into clear steps

Be truthful and realistic:
- If something is infeasible, say so
- If requirements are unclear, note what needs clarification
- Don't overpromise or underestimate complexity

Output Format:
1. FEASIBILITY: YES/NO/PARTIAL
2. COMPLEXITY: LOW/MEDIUM/HIGH
3. IMPLEMENTATION PLAN: Numbered steps
4. RISKS: List of potential issues
5. DEPENDENCIES: What's needed before starting
"""

PLANNER_PROMPT_TEMPLATE = """## Planning Request

### Requirements
{requirements}

### Project Context
- Project: {project_path}
- Story ID: {story_id}
- Wave: {wave_number}

### Instructions
1. Assess if this is feasible to implement
2. Create a step-by-step implementation plan
3. Identify any risks or blockers
4. Estimate complexity

Please provide your implementation plan:
"""


# ═══════════════════════════════════════════════════════════════════════════════
# PLANNER NODE
# ═══════════════════════════════════════════════════════════════════════════════

def planner_node(state: WAVEState) -> dict:
    """
    Planner node that creates implementation plans using Grok.

    Uses Grok for truthful feasibility assessment.
    Grok's factual nature ensures realistic planning.

    Args:
        state: Current WAVE workflow state

    Returns:
        dict with updates:
        - plan: Implementation plan
        - plan_feasible: bool
        - phase: Updated to DEVELOP if feasible
    """
    requirements = state.get("requirements", "")
    project_path = state.get("project_path", "")
    story_id = state.get("story_id", "")
    wave_number = state.get("wave_number", 1)

    # Check if we have requirements
    if not requirements:
        return {
            "plan": "",
            "plan_feasible": False,
            "error": "No requirements provided for planning",
            "error_count": state.get("error_count", 0) + 1,
            "phase": Phase.FAILED.value
        }

    # Build the prompt
    prompt = PLANNER_PROMPT_TEMPLATE.format(
        requirements=requirements,
        project_path=project_path,
        story_id=story_id,
        wave_number=wave_number
    )

    # Try to use Grok via MultiLLMClient
    if MULTI_LLM_AVAILABLE and os.getenv("GROK_API_KEY"):
        try:
            client = MultiLLMClient()
            response = client.query(
                prompt,
                LLMProvider.GROK,
                system_prompt=PLANNER_SYSTEM_PROMPT
            )
            plan = response
            feasible = _parse_feasibility(response)
            provider = "grok"
        except Exception as e:
            # Fallback to simulated response
            plan, feasible = _generate_simulated_plan(requirements)
            provider = "simulated"
    else:
        # No API key or client - generate simulated response
        plan, feasible = _generate_simulated_plan(requirements)
        provider = "simulated"

    # Update budget tracking
    budget = state.get("budget", {})
    tokens_used = budget.get("tokens_used", 0) + len(prompt.split()) + len(plan.split())

    return {
        "plan": plan,
        "plan_feasible": feasible,
        "plan_provider": provider,
        "phase": Phase.DEVELOP.value if feasible else Phase.FAILED.value,
        "updated_at": datetime.now().isoformat(),
        "budget": {
            **budget,
            "tokens_used": tokens_used
        }
    }


def _parse_feasibility(response: str) -> bool:
    """Parse planner response to determine feasibility."""
    response_upper = response.upper()

    # Check for explicit feasibility markers
    if "FEASIBILITY: YES" in response_upper:
        return True
    if "FEASIBILITY: NO" in response_upper:
        return False
    if "FEASIBILITY: PARTIAL" in response_upper:
        return True  # Partial is still feasible

    # Check for other indicators
    if "NOT FEASIBLE" in response_upper or "INFEASIBLE" in response_upper:
        return False
    if "FEASIBLE" in response_upper:
        return True

    # Check complexity
    if "COMPLEXITY: HIGH" in response_upper:
        # High complexity is still feasible, just risky
        return True

    # Default to feasible if plan exists
    return "IMPLEMENTATION PLAN" in response_upper or "STEP" in response_upper


def _generate_simulated_plan(requirements: str) -> tuple[str, bool]:
    """Generate simulated plan when LLM is not available."""
    # Simple plan based on requirements
    req_lower = requirements.lower()

    # Determine complexity
    if any(word in req_lower for word in ["oauth", "authentication", "database", "api"]):
        complexity = "MEDIUM"
    elif any(word in req_lower for word in ["machine learning", "ai", "distributed"]):
        complexity = "HIGH"
    else:
        complexity = "LOW"

    plan = f"""FEASIBILITY: YES

COMPLEXITY: {complexity}

IMPLEMENTATION PLAN:
1. Analyze existing codebase structure
2. Create implementation scaffold
3. Implement core functionality
4. Add error handling
5. Write unit tests
6. Integration testing
7. Documentation

RISKS:
- Requirements may need clarification
- Testing coverage requirements

DEPENDENCIES:
- Access to project codebase
- Clear acceptance criteria

Based on requirements: {requirements[:100]}...
"""

    return plan, True


# ═══════════════════════════════════════════════════════════════════════════════
# FACTORY FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

def create_planner_node(
    client: Optional["MultiLLMClient"] = None,
    system_prompt: str = PLANNER_SYSTEM_PROMPT,
    use_grok: bool = True
) -> Callable[[WAVEState], dict]:
    """
    Create a planner node with custom configuration.

    Args:
        client: Optional MultiLLMClient instance
        system_prompt: Custom system prompt
        use_grok: Whether to use Grok (recommended for truthful planning)

    Returns:
        Configured planner node function
    """
    def configured_planner_node(state: WAVEState) -> dict:
        requirements = state.get("requirements", "")

        if not requirements:
            return {
                "plan": "",
                "plan_feasible": False,
                "error": "No requirements provided",
                "phase": Phase.FAILED.value
            }

        prompt = PLANNER_PROMPT_TEMPLATE.format(
            requirements=requirements,
            project_path=state.get("project_path", ""),
            story_id=state.get("story_id", ""),
            wave_number=state.get("wave_number", 1)
        )

        provider = LLMProvider.GROK if use_grok else LLMProvider.CLAUDE

        if client:
            try:
                response = client.query(prompt, provider, system_prompt=system_prompt)
                plan = response
                feasible = _parse_feasibility(response)
            except Exception:
                plan, feasible = _generate_simulated_plan(requirements)
        else:
            plan, feasible = _generate_simulated_plan(requirements)

        return {
            "plan": plan,
            "plan_feasible": feasible,
            "phase": Phase.DEVELOP.value if feasible else Phase.FAILED.value,
            "updated_at": datetime.now().isoformat()
        }

    return configured_planner_node


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "planner_node",
    "create_planner_node",
    "PLANNER_SYSTEM_PROMPT",
    "PLANNER_PROMPT_TEMPLATE",
]
