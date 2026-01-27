"""
WAVE BE Agent - Backend Development

Responsibilities:
- Implement API endpoints and server logic
- Create database models and migrations
- Integrate external services (Supabase, etc.)
- Write backend tests

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


BE_SYSTEM_PROMPT = """You are the BE (Backend) Developer agent in WAVE, a multi-agent software development system.

Your responsibilities:
1. Implement API endpoints and server logic
2. Create database schemas and queries
3. Handle authentication and authorization
4. Integrate external services
5. Write backend tests

Tech Stack:
- Next.js API Routes or Server Actions
- Supabase for database and auth
- TypeScript for type safety
- Zod for validation

Code Standards:
- Proper error handling with try/catch
- Input validation on all endpoints
- Secure by default (no exposed secrets)
- Proper TypeScript types
- Add JSDoc comments for API functions

Security Requirements:
- Validate all user input
- Use parameterized queries
- Check authentication/authorization
- Never log sensitive data
- Rate limiting where appropriate

Output Format:
Return the complete code for each file requested.
Use markdown code blocks with file paths:

```typescript:src/app/api/auth/route.ts
// API code here
```

Be thorough and production-ready. Handle all error cases.
"""


class BEAgent(AgentWorker):
    """BE Agent - Backend development"""

    def __init__(self, agent_id: str = "1"):
        super().__init__("be", agent_id)

        # Initialize Claude for coding
        self.llm = None
        if CLAUDE_AVAILABLE and os.getenv("ANTHROPIC_API_KEY"):
            self.llm = ChatAnthropic(
                model=os.getenv("ANTHROPIC_MODEL_DEV", "claude-sonnet-4-20250514"),
                temperature=0.3,
                max_tokens=8192
            )
            self.log("Claude initialized for backend development")
        else:
            self.log("Claude not available - using placeholder code", "warning")

    def get_queue(self) -> DomainQueue:
        return DomainQueue.BE

    def process_task(self, task: AgentTask) -> dict:
        """Process backend development task"""
        requirements = task.payload.get("requirements", "")
        files = task.payload.get("files", [])
        project_path = task.payload.get("project_path", "/project")

        self.log(f"Starting backend development: {task.story_id}")
        self.log(f"Target files: {files}")

        if self.llm:
            return self._code_with_claude(requirements, files, project_path, task.story_id)
        else:
            return self._placeholder_code(files, task.story_id)

    def _code_with_claude(self, requirements: str, files: list, project_path: str, story_id: str) -> dict:
        """Use Claude to generate backend code"""
        self.log("Generating backend code with Claude...")

        files_str = "\n".join([f"- {f}" for f in files]) if files else "Determine appropriate files"

        prompt = f"""Story ID: {story_id}
Project Path: {project_path}

Requirements:
{requirements}

Files to create/modify:
{files_str}

Generate the complete backend implementation.
Include all necessary imports, types, and validation.
Ensure proper error handling and security.
"""

        try:
            messages = [
                SystemMessage(content=BE_SYSTEM_PROMPT),
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
            file_pattern = r'```(?:typescript|ts|python|py):([^\n]+)'
            generated_files = re.findall(file_pattern, code)

            self.log(f"Generated {len(generated_files)} files")
            for f in generated_files:
                self.log(f"  - {f}")

            self.notify("code generated", files=len(generated_files))

            return {
                "status": "completed",
                "code": code,
                "files_modified": generated_files or files,
                "domain": "be",
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

import {{ NextResponse }} from 'next/server';

export async function GET() {{
    return NextResponse.json({{ message: 'Placeholder API' }});
}}
"""

        return {
            "status": "completed",
            "code": placeholder,
            "files_modified": files,
            "domain": "be"
        }


if __name__ == "__main__":
    import sys
    agent_id = sys.argv[1] if len(sys.argv) > 1 else "1"
    agent = BEAgent(agent_id)
    agent.run()
