"""
Developer Node
Code implementation with Claude LLM integration and file writing

Includes:
- Claude code generation
- Constitutional AI scoring before write
- RLM context integration
"""

import os
import re
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from state import WAVEState, AgentAction
from notifications import notify_step, notify_code_generated
from tools.constitutional_scorer import score_action, should_block

# Try to import Claude
try:
    from langchain_anthropic import ChatAnthropic
    from langchain_core.messages import HumanMessage, SystemMessage
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False


def extract_code_block(response: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract code and filename from markdown code block.

    Args:
        response: LLM response text

    Returns:
        Tuple of (code, language/filename hint)
    """
    # Try multiple patterns for robustness

    # Pattern 1: Standard ```language\ncode\n```
    pattern1 = r'```(\w+)?\s*\n(.*?)```'
    match = re.search(pattern1, response, re.DOTALL)

    if match:
        lang = match.group(1) or "txt"
        code = match.group(2).strip()
        if code:
            return code, lang

    # Pattern 2: Code block with possible \r\n
    pattern2 = r'```(\w+)?[\r\n]+(.*?)```'
    match = re.search(pattern2, response, re.DOTALL)

    if match:
        lang = match.group(1) or "txt"
        code = match.group(2).strip()
        if code:
            return code, lang

    # Pattern 3: Code block without language specifier
    pattern3 = r'```\s*(.*?)```'
    match = re.search(pattern3, response, re.DOTALL)

    if match:
        code = match.group(1).strip()
        # Try to detect language from first line
        first_line = code.split('\n')[0] if code else ""
        if first_line.startswith('import React') or first_line.startswith('// '):
            lang = "tsx"
        elif first_line.startswith('import ') or first_line.startswith('export '):
            lang = "ts"
        elif first_line.startswith('def ') or first_line.startswith('import '):
            lang = "py"
        else:
            lang = "txt"
        if code:
            return code, lang

    # Pattern 4: Just find anything between ``` markers
    start_idx = response.find('```')
    if start_idx != -1:
        # Find end of language hint line
        newline_idx = response.find('\n', start_idx)
        if newline_idx != -1:
            end_idx = response.find('```', newline_idx)
            if end_idx != -1:
                # Extract language from first line
                first_line = response[start_idx + 3:newline_idx].strip()
                lang = first_line if first_line.isalpha() else "tsx"
                code = response[newline_idx + 1:end_idx].strip()
                if code:
                    return code, lang

    return None, None


def extract_filename_from_code(code: str) -> Optional[str]:
    """
    Extract component/filename from code content.

    Looks for:
    1. File comment: // Dashboard.tsx - description
    2. Export default: export default Dashboard
    3. Const declaration: const Dashboard: React.FC
    4. Function declaration: function Dashboard()

    Args:
        code: Generated code content

    Returns:
        Component name if found, None otherwise
    """
    if not code:
        return None

    # Pattern 1: File comment at top (e.g., "// Dashboard.tsx - Main dashboard")
    file_comment = re.search(r'^//\s*(\w+)\.(tsx?|jsx?)\s*[-–]', code, re.MULTILINE)
    if file_comment:
        return file_comment.group(1)

    # Pattern 2: Export default ComponentName
    export_default = re.search(r'export\s+default\s+(\w+)', code)
    if export_default:
        name = export_default.group(1)
        # Skip generic names
        if name not in ('function', 'class', 'Component', 'App'):
            return name

    # Pattern 3: const ComponentName: React.FC or React.FunctionComponent
    const_fc = re.search(r'const\s+(\w+)\s*:\s*React\.(FC|FunctionComponent)', code)
    if const_fc:
        return const_fc.group(1)

    # Pattern 4: const ComponentName = () => or function ComponentName(
    func_decl = re.search(r'(?:const|function)\s+([A-Z]\w+)\s*(?:=\s*\(|[\(<])', code)
    if func_decl:
        name = func_decl.group(1)
        if name not in ('Component', 'App'):
            return name

    # Pattern 5: interface ComponentNameProps
    interface_props = re.search(r'interface\s+(\w+)Props\s*\{', code)
    if interface_props:
        return interface_props.group(1)

    return None


def determine_filename(task: str, lang: str, code: Optional[str] = None) -> str:
    """
    Determine output filename based on task, language, and code content.

    Priority:
    1. Extract from code (most accurate)
    2. Match compound patterns in task (e.g., "carbon calculator")
    3. Match simple patterns in task
    4. Fallback to generic name

    Args:
        task: Task description
        lang: Code language
        code: Generated code content (optional)

    Returns:
        Suggested filename
    """
    # Map language to extension
    ext_map = {
        "python": ".py",
        "py": ".py",
        "javascript": ".js",
        "js": ".js",
        "typescript": ".ts",
        "ts": ".ts",
        "tsx": ".tsx",
        "jsx": ".jsx",
        "json": ".json",
        "html": ".html",
        "css": ".css",
        "txt": ".txt"
    }

    ext = ext_map.get(lang.lower(), ".txt")

    # Priority 1: Try to extract from code content
    if code:
        code_name = extract_filename_from_code(code)
        if code_name:
            return f"{code_name}{ext}"

    # Priority 2 & 3: Match patterns in task
    task_lower = task.lower()

    # Compound patterns first (more specific)
    compound_patterns = [
        ("carbon calculator", "CarbonCalculator"),
        ("carbon footprint", "CarbonFootprint"),
        ("emissions chart", "EmissionsChart"),
        ("emissions calculator", "EmissionsCalculator"),
        ("nav bar", "NavBar"),
        ("navigation bar", "NavBar"),
        ("side bar", "Sidebar"),
        ("sign up", "SignUp"),
        ("sign in", "SignIn"),
        ("log in", "Login"),
        ("log out", "Logout"),
        ("form input", "FormInput"),
        ("input form", "InputForm"),
        ("user profile", "UserProfile"),
        ("user settings", "UserSettings"),
        ("data table", "DataTable"),
        ("search bar", "SearchBar"),
        ("progress bar", "ProgressBar"),
        ("loading spinner", "LoadingSpinner"),
    ]

    for pattern, name in compound_patterns:
        if pattern in task_lower:
            return f"{name}{ext}"

    # Simple patterns - ordered by specificity (most specific first)
    simple_patterns = [
        # Dashboard/Overview components
        ("dashboard", "Dashboard"),
        ("overview", "Overview"),

        # Charts/Graphs
        ("emissionschart", "EmissionsChart"),
        ("chart", "Chart"),
        ("graph", "Graph"),

        # Calculator/Forms
        ("carboncalculator", "CarbonCalculator"),
        ("calculator", "Calculator"),

        # Navigation
        ("navbar", "NavBar"),
        ("navigation", "Navigation"),
        ("header", "Header"),
        ("footer", "Footer"),
        ("sidebar", "Sidebar"),
        ("menu", "Menu"),
        ("dropdown", "Dropdown"),

        # Auth
        ("authentication", "Auth"),
        ("auth", "Auth"),
        ("login", "Login"),
        ("signup", "SignUp"),
        ("register", "Register"),

        # User
        ("profile", "Profile"),
        ("settings", "Settings"),
        ("account", "Account"),

        # Common UI
        ("modal", "Modal"),
        ("dialog", "Dialog"),
        ("card", "Card"),
        ("button", "Button"),
        ("table", "Table"),
        ("list", "List"),
        ("form", "Form"),  # Generic form last

        # API/Utils
        ("api", "api"),
        ("utils", "utils"),
        ("helpers", "helpers"),
    ]

    for pattern, name in simple_patterns:
        if pattern in task_lower:
            return f"{name}{ext}"

    # Default fallback
    return f"Component{ext}"


def write_code_to_file(code: str, repo_path: str, filename: str) -> Tuple[str, float, list]:
    """
    Write generated code to file in repo after constitutional safety check.

    Args:
        code: Code content to write
        repo_path: Path to repository
        filename: Target filename

    Returns:
        Tuple of (file_path, safety_score, violations)
    """
    if not repo_path:
        return "", 1.0, []

    # Constitutional AI safety check on generated code
    safety_score, violations, risks = score_action(code, f"Writing code to {filename}")

    if should_block(safety_score):
        print(f"[SAFETY] BLOCKED: Code writing blocked due to safety violations: {violations}")
        return "", safety_score, violations

    if violations:
        print(f"[SAFETY] WARNING: Code has risks but proceeding: {risks}")

    # Create src directory if it doesn't exist
    src_dir = os.path.join(repo_path, "src", "components", "wave-generated")
    os.makedirs(src_dir, exist_ok=True)

    # Write file
    file_path = os.path.join(src_dir, filename)
    with open(file_path, 'w') as f:
        f.write(code)

    print(f"[DEV] Code written to {file_path} (safety score: {safety_score:.2f})")
    return file_path, safety_score, violations


DEV_SYSTEM_PROMPT = """You are the Developer agent in a multi-agent software development system.

Your responsibilities:
1. Implement code according to the task specifications
2. Write clean, maintainable, well-documented code
3. Handle errors gracefully and securely

Coding standards:
- Follow existing code patterns in the repository
- Keep functions small and focused
- Use meaningful variable and function names
- Never commit secrets or credentials
- Validate all inputs

CRITICAL OUTPUT FORMAT:
- You MUST return code in a markdown code block with the language specified
- Start your response with the code block immediately
- Include a comment at the top of the code with the filename (e.g., // Dashboard.tsx - description)
- Example format:
```tsx
// ComponentName.tsx - Brief description
import React from 'react';
// ... rest of code
export default ComponentName;
```

DO NOT include explanations before or after the code block. ONLY output the code block.
"""


def dev_node(state: WAVEState) -> Dict[str, Any]:
    """
    Developer implements code based on task using Claude.

    Args:
        state: Current WAVE state

    Returns:
        Dict with state updates including generated code
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    task = state.get("task", "")
    # repo_path is nested in git state
    git_state = state.get("git", {})
    repo_path = git_state.get("repo_path", "") if isinstance(git_state, dict) else ""

    # Get RLM project context
    project_context = state.get("project_context", "")

    # Try to generate code with Claude
    generated_code = None
    llm_response = None

    if CLAUDE_AVAILABLE and os.getenv("ANTHROPIC_API_KEY"):
        try:
            # Initialize Claude with sufficient token limit for code generation
            llm = ChatAnthropic(
                model="claude-sonnet-4-20250514",
                temperature=0.2,
                max_tokens=4096  # Ensure enough tokens for complete code blocks
            )

            # Build prompt with RLM context
            context_section = ""
            if project_context:
                context_section = f"""
Project Context (from RLM P Variable):
{project_context}
"""

            prompt = f"""Task: {task}

Project Path: {repo_path}
{context_section}
Please implement this task. Return the code in a markdown code block.
Keep it simple and focused on the specific requirement."""

            # Call Claude
            messages = [
                SystemMessage(content=DEV_SYSTEM_PROMPT),
                HumanMessage(content=prompt)
            ]

            response = llm.invoke(messages)
            llm_response = response.content
            generated_code = llm_response

        except Exception as e:
            llm_response = f"Error calling Claude: {str(e)}"
            generated_code = None
    else:
        llm_response = "Claude not available (no API key or langchain_anthropic not installed)"

    # Extract and write code if we have a valid response
    file_written = None
    extracted_code = None
    safety_score = 1.0
    safety_violations = []

    if generated_code:
        has_code_block = "```" in generated_code

        if has_code_block:
            extracted_code, lang = extract_code_block(generated_code)

            if extracted_code and repo_path:
                # Pass code to determine_filename for smart extraction
                filename = determine_filename(task, lang or "txt", extracted_code)
                file_written, safety_score, safety_violations = write_code_to_file(extracted_code, repo_path, filename)
            elif not extracted_code:
                # Debug: log extraction failure details
                first_marker = generated_code.find("```")
                end_marker = generated_code.find("```", first_marker + 3) if first_marker != -1 else -1
                snippet = generated_code[first_marker:first_marker+100] if first_marker != -1 else ""
                print(f"[DEV] Warning: Extraction failed. Markers at {first_marker}, {end_marker}. Start: {repr(snippet[:80])}")
        else:
            print(f"[DEV] Warning: No code block in response (len: {len(generated_code)})")

    # Create action record
    action = AgentAction(
        agent="dev",
        action_type="implement",
        timestamp=timestamp,
        details={
            "task": task,
            "status": "llm_generated" if generated_code else "no_llm",
            "code_preview": (extracted_code[:200] + "...") if extracted_code and len(extracted_code) > 200 else extracted_code,
            "file_written": file_written,
            "safety_score": safety_score,
            "safety_violations": safety_violations
        }
    )

    # Send Slack notifications
    run_id = state.get("run_id", "unknown")
    notify_step(
        agent="dev",
        action="code generated" if extracted_code else "processing",
        task=task,
        run_id=run_id,
        status="llm_generated" if generated_code else "no_llm"
    )

    if file_written:
        notify_code_generated(run_id, file_written, extracted_code)

    # Update safety state with code generation score
    current_safety = state.get("safety", {})
    updated_safety = {
        **current_safety,
        "constitutional_score": min(current_safety.get("constitutional_score", 1.0), safety_score),
        "violations": current_safety.get("violations", []) + safety_violations
    }

    # Return state updates
    return {
        "current_agent": "dev",
        "actions": state.get("actions", []) + [action],
        "generated_code": extracted_code or generated_code,
        "llm_response": llm_response,
        "file_written": file_written,
        "safety": updated_safety
    }
