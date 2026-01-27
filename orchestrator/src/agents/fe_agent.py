"""
WAVE FE Agent - Frontend Development

Responsibilities:
- Generate React/TypeScript components
- Implement UI logic and state management
- Create styling and layouts
- Write frontend tests

Uses Claude Sonnet for creative coding.
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


FE_SYSTEM_PROMPT = """You are the FE (Frontend) Developer agent in WAVE, a multi-agent software development system.

Your responsibilities:
1. Implement React/TypeScript components
2. Create clean, maintainable UI code
3. Handle state management properly
4. Ensure accessibility (a11y) compliance
5. Write component tests

Tech Stack:
- React 18+ with TypeScript
- Next.js App Router
- Tailwind CSS for styling
- React Hook Form for forms
- Tanstack Query for data fetching

Code Standards:
- Use functional components with hooks
- Proper TypeScript types (no `any`)
- Extract reusable logic into custom hooks
- Follow existing project patterns
- Add JSDoc comments for complex logic

Output Format:
Return the complete code for each file requested.
Use markdown code blocks with file paths:

```typescript:src/components/MyComponent.tsx
// Component code here
```

Be thorough and production-ready. Include error handling and loading states.
"""


class FEAgent(AgentWorker):
    """FE Agent - Frontend development"""

    def __init__(self, agent_id: str = "1"):
        super().__init__("fe", agent_id)

        # Initialize Claude for coding
        self.llm = None
        if CLAUDE_AVAILABLE and os.getenv("ANTHROPIC_API_KEY"):
            self.llm = ChatAnthropic(
                model=os.getenv("ANTHROPIC_MODEL_DEV", "claude-sonnet-4-20250514"),
                temperature=0.3,
                max_tokens=8192
            )
            self.log("Claude initialized for frontend development")
        else:
            self.log("Claude not available - using placeholder code", "warning")

    def get_queue(self) -> DomainQueue:
        return DomainQueue.FE

    def process_task(self, task: AgentTask) -> dict:
        """Process frontend development task"""
        requirements = task.payload.get("requirements", "")
        files = task.payload.get("files", [])
        project_path = task.payload.get("project_path", "/project")

        self.log(f"Starting frontend development: {task.story_id}")
        self.log(f"Target files: {files}")

        if self.llm:
            return self._code_with_claude(requirements, files, project_path, task.story_id)
        else:
            return self._placeholder_code(files, task.story_id)

    def _code_with_claude(self, requirements: str, files: list, project_path: str, story_id: str) -> dict:
        """Use Claude to generate frontend code"""
        self.log("Generating frontend code with Claude...")

        files_str = "\n".join([f"- {f}" for f in files]) if files else "Determine appropriate files"

        prompt = f"""Story ID: {story_id}
Project Path: {project_path}

Requirements:
{requirements}

Files to create/modify:
{files_str}

Generate the complete frontend implementation.
Include all necessary imports, types, and exports.
Follow React/TypeScript best practices.
"""

        try:
            messages = [
                SystemMessage(content=FE_SYSTEM_PROMPT),
                HumanMessage(content=prompt)
            ]

            response = self.llm.invoke(messages)
            code = response.content

            # Extract token usage from response metadata
            tokens = 0
            cost_usd = 0.0
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                input_tokens = response.usage_metadata.get('input_tokens', 0)
                output_tokens = response.usage_metadata.get('output_tokens', 0)
                tokens = input_tokens + output_tokens
                # Claude Sonnet pricing: $3/M input, $15/M output
                cost_usd = (input_tokens * 0.000003) + (output_tokens * 0.000015)

            # Extract file paths from code blocks
            import re
            file_pattern = r'```(?:typescript|tsx|ts|javascript|jsx|js):([^\n]+)'
            generated_files = re.findall(file_pattern, code)

            self.log(f"Generated {len(generated_files)} files")
            for f in generated_files:
                self.log(f"  - {f}")

            self.notify("code generated", files=len(generated_files))

            return {
                "status": "completed",
                "code": code,
                "files_modified": generated_files or files,
                "domain": "fe",
                "tokens": tokens,
                "cost_usd": cost_usd
            }

        except Exception as e:
            self.log(f"Claude error: {e}", "error")
            return {
                "status": "failed",
                "error": str(e),
                "code": ""
            }

    def _placeholder_code(self, files: list, story_id: str) -> dict:
        """Placeholder when Claude not available"""
        self.log("Using placeholder code (Claude not available)")

        placeholder = f"""// Placeholder for {story_id}
// Real implementation requires Claude

import React from 'react';

export const Placeholder: React.FC = () => {{
    return <div>Placeholder Component</div>;
}};
"""

        return {
            "status": "completed",
            "code": placeholder,
            "files_modified": files,
            "domain": "fe"
        }


if __name__ == "__main__":
    import sys
    agent_id = sys.argv[1] if len(sys.argv) > 1 else "1"
    agent = FEAgent(agent_id)
    agent.run()
