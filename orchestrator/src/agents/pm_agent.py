"""
WAVE PM Agent - Product Manager / Planning

Responsibilities:
- Break down stories into implementation tasks
- Identify required files and components
- Create execution plan for FE/BE agents
- Assess feasibility and risks

Uses Claude Opus for strategic planning.
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


PM_SYSTEM_PROMPT = """You are the PM (Product Manager) agent in WAVE, a multi-agent software development system.

Your responsibilities:
1. Analyze user stories and requirements
2. Break down stories into specific implementation tasks
3. Identify which files need to be created or modified
4. Categorize tasks by domain (FE = frontend, BE = backend)
5. Assess risks and dependencies

Output Format (JSON):
{
    "plan_summary": "Brief description of the implementation approach",
    "tasks": [
        {
            "id": "task-1",
            "domain": "fe",  // or "be"
            "description": "What needs to be done",
            "files": ["path/to/file.tsx"],
            "priority": 1,  // 1 = highest
            "dependencies": []  // IDs of tasks this depends on
        }
    ],
    "risks": ["List of potential issues"],
    "estimated_complexity": "low|medium|high"
}

Be specific about file paths based on the project structure.
Keep tasks focused and atomic - one task per component/module.
"""


class PMAgent(AgentWorker):
    """PM Agent - Story breakdown and planning"""

    def __init__(self, agent_id: str = "1"):
        super().__init__("pm", agent_id)

        # Initialize Claude for planning
        self.llm = None
        if CLAUDE_AVAILABLE and os.getenv("ANTHROPIC_API_KEY"):
            self.llm = ChatAnthropic(
                model=os.getenv("ANTHROPIC_MODEL_PM", "claude-sonnet-4-20250514"),
                temperature=0.3,
                max_tokens=4096
            )
            self.log("Claude initialized for planning")
        else:
            self.log("Claude not available - using placeholder responses", "warning")

    def get_queue(self) -> DomainQueue:
        return DomainQueue.PM

    def process_task(self, task: AgentTask) -> dict:
        """Process planning task"""
        requirements = task.payload.get("requirements", "")
        story_id = task.story_id
        project_path = task.payload.get("project_path", "/project")

        self.log(f"Planning story: {story_id}")
        self.log(f"Requirements: {requirements[:100]}...")

        if self.llm:
            return self._plan_with_claude(requirements, story_id, project_path)
        else:
            return self._placeholder_plan(requirements, story_id)

    def _plan_with_claude(self, requirements: str, story_id: str, project_path: str) -> dict:
        """Use Claude to create implementation plan"""
        self.log("Generating implementation plan with Claude...")

        prompt = f"""Story ID: {story_id}
Project Path: {project_path}

Requirements:
{requirements}

Analyze these requirements and create a detailed implementation plan.
Return your response as valid JSON matching the required format.
"""

        try:
            messages = [
                SystemMessage(content=PM_SYSTEM_PROMPT),
                HumanMessage(content=prompt)
            ]

            response = self.llm.invoke(messages)
            content = response.content

            # Extract JSON from response
            import json
            import re

            # Try to find JSON in response
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                plan = json.loads(json_match.group())
            else:
                plan = {"plan_summary": content, "tasks": [], "risks": []}

            self.log(f"Plan created: {len(plan.get('tasks', []))} tasks identified")
            self.notify("plan created", tasks=len(plan.get('tasks', [])))

            return {
                "status": "completed",
                "plan": plan,
                "tasks": plan.get("tasks", []),
                "fe_files": [f for t in plan.get("tasks", []) if t.get("domain") == "fe" for f in t.get("files", [])],
                "be_files": [f for t in plan.get("tasks", []) if t.get("domain") == "be" for f in t.get("files", [])]
            }

        except Exception as e:
            self.log(f"Claude error: {e}", "error")
            return {
                "status": "failed",
                "error": str(e),
                "plan": {}
            }

    def _placeholder_plan(self, requirements: str, story_id: str) -> dict:
        """Placeholder when Claude not available"""
        self.log("Using placeholder plan (Claude not available)")

        return {
            "status": "completed",
            "plan": {
                "plan_summary": f"Placeholder plan for {story_id}",
                "tasks": [
                    {"id": "task-1", "domain": "fe", "description": "Frontend implementation", "files": [], "priority": 1},
                    {"id": "task-2", "domain": "be", "description": "Backend implementation", "files": [], "priority": 1}
                ],
                "risks": ["Placeholder - real planning requires Claude"],
                "estimated_complexity": "medium"
            },
            "tasks": [],
            "fe_files": [],
            "be_files": []
        }


if __name__ == "__main__":
    import sys
    agent_id = sys.argv[1] if len(sys.argv) > 1 else "1"
    agent = PMAgent(agent_id)
    agent.run()
