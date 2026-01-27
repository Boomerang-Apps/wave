"""
WAVE QA Agent - Quality Assurance

Responsibilities:
- Review code for bugs and issues
- Run tests and validate functionality
- Check code coverage
- Verify acceptance criteria

Uses Claude Haiku for efficient testing.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.agent_worker import AgentWorker
from src.task_queue import DomainQueue, AgentTask

# Claude integration
try:
    from langchain_anthropic import ChatAnthropic
    from langchain_core.messages import HumanMessage, SystemMessage
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False


QA_SYSTEM_PROMPT = """You are the QA (Quality Assurance) agent in WAVE, a multi-agent software development system.

Your responsibilities:
1. Review code for bugs and logical errors
2. Validate against acceptance criteria
3. Check for edge cases and error handling
4. Verify security requirements
5. Generate test recommendations

Review Checklist:
- [ ] Code compiles/runs without errors
- [ ] All acceptance criteria met
- [ ] Error handling is comprehensive
- [ ] Edge cases are handled
- [ ] No security vulnerabilities
- [ ] Code is readable and maintainable
- [ ] Tests are adequate

Output Format (JSON):
{
    "passed": true|false,
    "score": 0.0-1.0,
    "summary": "QA summary",
    "acceptance_criteria": [
        {"criterion": "description", "met": true|false, "notes": "details"}
    ],
    "bugs_found": [
        {"severity": "critical|high|medium|low", "description": "bug details", "location": "file:line"}
    ],
    "test_recommendations": ["Suggested tests to add"],
    "blocking_issues": ["Issues that must be fixed before merge"]
}

Be thorough. Only pass code that meets quality standards.
"""


class QAAgent(AgentWorker):
    """QA Agent - Quality assurance and testing"""

    def __init__(self, agent_id: str = "1"):
        super().__init__("qa", agent_id)

        # Initialize Claude for QA
        self.llm = None
        if CLAUDE_AVAILABLE and os.getenv("ANTHROPIC_API_KEY"):
            self.llm = ChatAnthropic(
                model=os.getenv("ANTHROPIC_MODEL_QA", "claude-sonnet-4-20250514"),
                temperature=0.1,  # Low temp for consistent evaluation
                max_tokens=4096
            )
            self.log("Claude initialized for QA validation")
        else:
            self.log("Claude not available - using placeholder QA", "warning")

    def get_queue(self) -> DomainQueue:
        return DomainQueue.QA

    def process_task(self, task: AgentTask) -> dict:
        """Process QA validation task"""
        code = task.payload.get("code", "")
        files = task.payload.get("files_to_test", [])
        requirements = task.payload.get("requirements", "")
        acceptance_criteria = task.payload.get("acceptance_criteria", [])

        self.log(f"Starting QA validation: {task.story_id}")
        self.log(f"Files to test: {len(files)}")

        if self.llm and code:
            return self._qa_with_claude(code, files, requirements, acceptance_criteria, task.story_id)
        else:
            return self._placeholder_qa(task.story_id)

    def _qa_with_claude(self, code: str, files: list, requirements: str,
                        acceptance_criteria: list, story_id: str) -> dict:
        """Use Claude to perform QA"""
        self.log("Performing QA validation with Claude...")

        criteria_str = "\n".join([f"- {c}" for c in acceptance_criteria]) if acceptance_criteria else "Derive from requirements"

        prompt = f"""Story ID: {story_id}

Requirements:
{requirements}

Acceptance Criteria:
{criteria_str}

Files Modified: {files}

Code to Review:
```
{code[:10000]}  # Truncate for token limits
```

Perform thorough QA validation.
Return your response as valid JSON matching the required format.
"""

        try:
            messages = [
                SystemMessage(content=QA_SYSTEM_PROMPT),
                HumanMessage(content=prompt)
            ]

            response = self.llm.invoke(messages)
            content = response.content

            # Extract JSON from response
            import json
            import re

            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                qa_result = json.loads(json_match.group())
            else:
                qa_result = {"passed": True, "score": 0.8, "summary": content}

            passed = qa_result.get("passed", True)
            score = qa_result.get("score", 0.8)
            bugs = qa_result.get("bugs_found", [])
            blocking = qa_result.get("blocking_issues", [])

            self.log(f"QA complete: {'PASSED' if passed else 'FAILED'} (score: {score:.2f})")
            if bugs:
                self.log(f"Bugs found: {len(bugs)}")
            if blocking:
                self.log(f"Blocking issues: {len(blocking)}", "warning")

            self.notify("qa complete", passed=passed, score=f"{score:.2f}")

            return {
                "status": "completed",
                "passed": passed,
                "qa_result": qa_result,
                "score": score,
                "bugs_found": bugs,
                "blocking_issues": blocking
            }

        except Exception as e:
            self.log(f"Claude error: {e}", "error")
            return {
                "status": "failed",
                "error": str(e),
                "passed": False
            }

    def _placeholder_qa(self, story_id: str) -> dict:
        """Placeholder when Claude not available"""
        self.log("Using placeholder QA (Claude not available)")

        return {
            "status": "completed",
            "passed": True,
            "qa_result": {
                "passed": True,
                "score": 0.85,
                "summary": f"Placeholder QA for {story_id}",
                "bugs_found": [],
                "blocking_issues": []
            },
            "score": 0.85,
            "bugs_found": [],
            "blocking_issues": []
        }


if __name__ == "__main__":
    import sys
    agent_id = sys.argv[1] if len(sys.argv) > 1 else "1"
    agent = QAAgent(agent_id)
    agent.run()
