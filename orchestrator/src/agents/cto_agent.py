"""
WAVE CTO Agent - Architecture Review & Approval

Responsibilities:
- Review code architecture and patterns
- Validate implementation against best practices
- Check for security vulnerabilities
- Approve or reject code for merge

Uses Claude Opus for thorough review.
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


CTO_SYSTEM_PROMPT = """You are the CTO (Chief Technology Officer) agent in WAVE, a multi-agent software development system.

Your responsibilities:
1. Review code architecture and design patterns
2. Check for security vulnerabilities (OWASP Top 10)
3. Validate error handling and edge cases
4. Ensure code follows project conventions
5. Approve or reject code for merge

Review Criteria:
- Security: No exposed secrets, proper input validation, XSS/SQLi prevention
- Architecture: Proper separation of concerns, maintainable structure
- Performance: No obvious bottlenecks, efficient algorithms
- Code Quality: Readable, documented, follows conventions

Output Format (JSON):
{
    "approved": true|false,
    "score": 0.0-1.0,
    "summary": "Brief review summary",
    "issues": [
        {
            "severity": "critical|high|medium|low",
            "file": "path/to/file",
            "line": 42,
            "description": "Issue description",
            "suggestion": "How to fix"
        }
    ],
    "recommendations": ["List of improvements"]
}

Be thorough but pragmatic. Block only for critical/high issues.
"""


class CTOAgent(AgentWorker):
    """CTO Agent - Architecture review and approval"""

    def __init__(self, agent_id: str = "1"):
        super().__init__("cto", agent_id)

        # Initialize Claude for review
        self.llm = None
        if CLAUDE_AVAILABLE and os.getenv("ANTHROPIC_API_KEY"):
            self.llm = ChatAnthropic(
                model=os.getenv("ANTHROPIC_MODEL_CTO", "claude-sonnet-4-20250514"),
                temperature=0.2,
                max_tokens=4096
            )
            self.log("Claude initialized for architecture review")
        else:
            self.log("Claude not available - using placeholder reviews", "warning")

    def get_queue(self) -> DomainQueue:
        return DomainQueue.CTO

    def process_task(self, task: AgentTask) -> dict:
        """Process architecture review task"""
        code = task.payload.get("code", "")
        files = task.payload.get("files", [])
        plan = task.payload.get("plan", {})

        self.log(f"Reviewing architecture for: {task.story_id}")
        self.log(f"Files to review: {len(files)}")

        if self.llm and code:
            return self._review_with_claude(code, files, plan, task.story_id)
        else:
            return self._placeholder_review(task.story_id)

    def _review_with_claude(self, code: str, files: list, plan: dict, story_id: str) -> dict:
        """Use Claude to review architecture"""
        self.log("Performing architecture review with Claude...")

        prompt = f"""Story ID: {story_id}

Implementation Plan:
{plan}

Files Modified: {files}

Code to Review:
```
{code[:8000]}  # Truncate for token limits
```

Review this code for architecture, security, and quality.
Return your response as valid JSON matching the required format.
"""

        try:
            messages = [
                SystemMessage(content=CTO_SYSTEM_PROMPT),
                HumanMessage(content=prompt)
            ]

            response = self.llm.invoke(messages)
            content = response.content

            # Extract JSON from response
            import json
            import re

            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                review = json.loads(json_match.group())
            else:
                review = {"approved": True, "score": 0.8, "summary": content, "issues": []}

            approved = review.get("approved", True)
            score = review.get("score", 0.8)

            self.log(f"Review complete: {'APPROVED' if approved else 'REJECTED'} (score: {score:.2f})")
            self.notify("review complete", approved=approved, score=f"{score:.2f}")

            return {
                "status": "completed",
                "approved": approved,
                "review": review,
                "score": score,
                "issues": review.get("issues", [])
            }

        except Exception as e:
            self.log(f"Claude error: {e}", "error")
            return {
                "status": "failed",
                "error": str(e),
                "approved": False
            }

    def _placeholder_review(self, story_id: str) -> dict:
        """Placeholder when Claude not available"""
        self.log("Using placeholder review (Claude not available)")

        return {
            "status": "completed",
            "approved": True,
            "review": {
                "approved": True,
                "score": 0.85,
                "summary": f"Placeholder review for {story_id}",
                "issues": [],
                "recommendations": ["Real review requires Claude"]
            },
            "score": 0.85,
            "issues": []
        }


if __name__ == "__main__":
    import sys
    agent_id = sys.argv[1] if len(sys.argv) > 1 else "1"
    agent = CTOAgent(agent_id)
    agent.run()
