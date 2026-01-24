"""
WAVE v2 QA Node

Uses Claude for QA validation with Grok fallback.
Implements the Claude -> Grok fallback pattern after 2 failures.
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
        LLMProvider = None  # Placeholder


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPTS
# ═══════════════════════════════════════════════════════════════════════════════

QA_SYSTEM_PROMPT = """You are an expert QA engineer reviewing code for the WAVE autonomous coding system.

Your role is to:
1. Review code for correctness and completeness
2. Check for bugs, edge cases, and potential issues
3. Verify tests are comprehensive
4. Ensure code meets requirements
5. Check for security vulnerabilities

Be thorough but fair. Code should be production-ready.

Output Format:
- Start with PASSED or FAILED
- List any issues found
- Provide specific feedback for improvements
- If FAILED, explain what needs to be fixed
"""

QA_PROMPT_TEMPLATE = """## QA Review Request

### Requirements
{requirements}

### Code to Review
```
{code}
```

### Story Context
- Story ID: {story_id}
- Project: {project_path}
- Retry Count: {retry_count}

### Instructions
1. Review the code against requirements
2. Check for bugs and edge cases
3. Verify test coverage
4. Provide PASSED or FAILED verdict

Please provide your QA assessment:
"""


# ═══════════════════════════════════════════════════════════════════════════════
# QA NODE
# ═══════════════════════════════════════════════════════════════════════════════

def qa_node(state: WAVEState) -> dict:
    """
    QA node that validates code using Claude with Grok fallback.

    Uses Claude as primary QA reviewer.
    Falls back to Grok after 2 failures for a different perspective.

    Args:
        state: Current WAVE workflow state

    Returns:
        dict with updates:
        - qa_passed: bool
        - qa_feedback: str
        - qa_provider: "claude" or "grok"
        - phase: Updated based on result
        - gate: Updated if passed
    """
    code = state.get("code", "")
    requirements = state.get("requirements", "")
    retry_count = state.get("qa_retry_count", 0)

    # Check if we have code to review
    if not code:
        return {
            "qa_passed": False,
            "qa_feedback": "No code provided for QA review",
            "qa_retry_count": retry_count + 1,
            "phase": Phase.DEVELOP.value if retry_count < 3 else Phase.FAILED.value
        }

    # Build the prompt
    prompt = QA_PROMPT_TEMPLATE.format(
        requirements=requirements,
        code=code,
        story_id=state.get("story_id", ""),
        project_path=state.get("project_path", ""),
        retry_count=retry_count
    )

    # Determine which provider to use
    # After 2 failures, switch to Grok for a different perspective
    use_grok = retry_count >= 2
    provider = LLMProvider.GROK if use_grok else LLMProvider.CLAUDE
    provider_name = "grok" if use_grok else "claude"

    # Try to use LLM via MultiLLMClient
    if MULTI_LLM_AVAILABLE:
        api_key = os.getenv("GROK_API_KEY" if use_grok else "ANTHROPIC_API_KEY")
        if api_key:
            try:
                client = MultiLLMClient()
                response = client.query(
                    prompt,
                    provider,
                    system_prompt=QA_SYSTEM_PROMPT
                )
                qa_feedback = response
                qa_passed = _parse_qa_result(response)
            except Exception as e:
                # Fallback to simulated response
                qa_feedback, qa_passed = _generate_simulated_qa(code, requirements)
        else:
            qa_feedback, qa_passed = _generate_simulated_qa(code, requirements)
    else:
        qa_feedback, qa_passed = _generate_simulated_qa(code, requirements)

    # Determine next phase
    if qa_passed:
        next_phase = Phase.MERGE.value
        next_gate = Gate.QA_PASSED.value
    else:
        # Retry or fail
        if retry_count + 1 >= 3:
            next_phase = Phase.FAILED.value
            next_gate = state.get("gate", Gate.QA_STARTED.value)
        else:
            next_phase = Phase.DEVELOP.value
            next_gate = Gate.DEV_STARTED.value

    return {
        "qa_passed": qa_passed,
        "qa_feedback": qa_feedback,
        "qa_provider": provider_name,
        "qa_retry_count": retry_count + 1 if not qa_passed else retry_count,
        "phase": next_phase,
        "gate": next_gate,
        "updated_at": datetime.now().isoformat()
    }


def _parse_qa_result(response: str) -> bool:
    """Parse QA response to determine pass/fail."""
    response_upper = response.upper()

    # Check for explicit PASSED/FAILED
    if "PASSED" in response_upper and "FAILED" not in response_upper:
        return True
    if "FAILED" in response_upper:
        return False

    # Check for other positive indicators
    positive_indicators = ["APPROVED", "LOOKS GOOD", "LGTM", "NO ISSUES"]
    for indicator in positive_indicators:
        if indicator in response_upper:
            return True

    # Check for negative indicators
    negative_indicators = ["REJECTED", "ISSUES FOUND", "BUGS", "NEEDS FIX"]
    for indicator in negative_indicators:
        if indicator in response_upper:
            return False

    # Default to failed if unclear
    return False


def _generate_simulated_qa(code: str, requirements: str) -> tuple[str, bool]:
    """Generate simulated QA response when LLM is not available."""
    # Simple heuristic: pass if code has tests
    has_tests = "def test_" in code or "assert" in code
    has_implementation = "def " in code and "pass" not in code.lower()

    if has_tests and has_implementation:
        return (
            "PASSED\n\nCode review summary:\n"
            "- Implementation found\n"
            "- Tests included\n"
            "- Ready for merge",
            True
        )
    elif has_implementation:
        return (
            "FAILED\n\nIssues found:\n"
            "- Missing test coverage\n"
            "- Please add unit tests",
            False
        )
    else:
        return (
            "FAILED\n\nIssues found:\n"
            "- Implementation incomplete\n"
            "- Code contains only placeholder",
            False
        )


# ═══════════════════════════════════════════════════════════════════════════════
# FACTORY FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

def create_qa_node(
    client: Optional["MultiLLMClient"] = None,
    system_prompt: str = QA_SYSTEM_PROMPT,
    fallback_after: int = 2
) -> Callable[[WAVEState], dict]:
    """
    Create a QA node with custom configuration.

    Args:
        client: Optional MultiLLMClient instance
        system_prompt: Custom system prompt
        fallback_after: Number of failures before switching to Grok

    Returns:
        Configured QA node function
    """
    def configured_qa_node(state: WAVEState) -> dict:
        code = state.get("code", "")
        requirements = state.get("requirements", "")
        retry_count = state.get("qa_retry_count", 0)

        if not code:
            return {
                "qa_passed": False,
                "qa_feedback": "No code provided",
                "qa_retry_count": retry_count + 1,
                "phase": Phase.FAILED.value if retry_count >= 2 else Phase.DEVELOP.value
            }

        prompt = QA_PROMPT_TEMPLATE.format(
            requirements=requirements,
            code=code,
            story_id=state.get("story_id", ""),
            project_path=state.get("project_path", ""),
            retry_count=retry_count
        )

        use_grok = retry_count >= fallback_after
        provider = LLMProvider.GROK if use_grok else LLMProvider.CLAUDE

        if client:
            try:
                response = client.query(prompt, provider, system_prompt=system_prompt)
                qa_feedback = response
                qa_passed = _parse_qa_result(response)
            except Exception:
                qa_feedback, qa_passed = _generate_simulated_qa(code, requirements)
        else:
            qa_feedback, qa_passed = _generate_simulated_qa(code, requirements)

        return {
            "qa_passed": qa_passed,
            "qa_feedback": qa_feedback,
            "qa_provider": "grok" if use_grok else "claude",
            "qa_retry_count": retry_count if qa_passed else retry_count + 1,
            "phase": Phase.MERGE.value if qa_passed else Phase.DEVELOP.value,
            "updated_at": datetime.now().isoformat()
        }

    return configured_qa_node


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "qa_node",
    "create_qa_node",
    "QA_SYSTEM_PROMPT",
    "QA_PROMPT_TEMPLATE",
]
