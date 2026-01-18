#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
WAVE RLM: SUB-LLM DISPATCH
═══════════════════════════════════════════════════════════════════════════════
Delegates focused tasks to sub-LLMs for cost-effective processing.
Main agent stays lean while sub-LLMs handle specific analysis tasks.

USAGE:
    # Basic delegation
    ./sub-llm-dispatch.py --task "Extract all function names" --context /path/to/file.py

    # With model selection
    ./sub-llm-dispatch.py --task "Summarize this code" --context /path/to/file.py --model haiku

    # With P variable context
    ./sub-llm-dispatch.py --task "Find auth patterns" --p-file /path/to/P.json --query "src/auth/"

    # Batch mode (multiple tasks)
    ./sub-llm-dispatch.py --batch /path/to/tasks.json

ANSWER PROTOCOL:
    Sub-LLMs return answers via FINAL() statement:
    FINAL({"result": "...", "confidence": 0.95})

BASED ON: MIT CSAIL RLM Research (arXiv:2512.24601)
═══════════════════════════════════════════════════════════════════════════════
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from datetime import datetime


# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

# Model configurations (cost per 1M tokens approximate)
MODELS = {
    "haiku": {
        "id": "claude-3-haiku-20240307",
        "description": "Fast, cheap - good for focused extraction tasks",
        "cost_input": 0.25,
        "cost_output": 1.25,
        "max_tokens": 4096
    },
    "sonnet": {
        "id": "claude-sonnet-4-20250514",
        "description": "Balanced - good for analysis and reasoning",
        "cost_input": 3.0,
        "cost_output": 15.0,
        "max_tokens": 8192
    },
    "opus": {
        "id": "claude-opus-4-20250514",
        "description": "Most capable - for complex reasoning",
        "cost_input": 15.0,
        "cost_output": 75.0,
        "max_tokens": 8192
    }
}

DEFAULT_MODEL = "haiku"

# Answer extraction pattern
FINAL_PATTERN = re.compile(r'FINAL\s*\(\s*({.*?})\s*\)', re.DOTALL)
FINAL_SIMPLE_PATTERN = re.compile(r'FINAL\s*\(\s*["\'](.+?)["\']\s*\)', re.DOTALL)


# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def load_context_from_file(file_path: str) -> str:
    """Load context from a file."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Context file not found: {file_path}")

    return path.read_text(encoding='utf-8', errors='replace')


def load_context_from_p(p_file: str, query: str) -> str:
    """Load context from P variable using a query path."""
    with open(p_file, 'r') as f:
        P = json.load(f)

    project_root = P.get('meta', {}).get('project_root', '')

    # If query is a file path, load that file
    full_path = os.path.join(project_root, query)
    if os.path.isfile(full_path):
        return load_context_from_file(full_path)

    # If query is a directory, list files
    if os.path.isdir(full_path):
        files = []
        for root, _, filenames in os.walk(full_path):
            for filename in filenames:
                rel_path = os.path.relpath(os.path.join(root, filename), project_root)
                files.append(rel_path)
        return f"Files in {query}:\n" + "\n".join(files[:50])

    # Otherwise, return P variable info
    return json.dumps(P, indent=2)


def extract_answer(response: str) -> Dict[str, Any]:
    """Extract answer from FINAL() statement in response."""

    # Try JSON format first: FINAL({"result": "..."})
    match = FINAL_PATTERN.search(response)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try simple string format: FINAL("answer")
    match = FINAL_SIMPLE_PATTERN.search(response)
    if match:
        return {"result": match.group(1)}

    # No FINAL found - return entire response as result
    return {
        "result": response.strip(),
        "extraction_method": "full_response",
        "warning": "No FINAL() statement found"
    }


def build_prompt(task: str, context: str, output_format: str = "json") -> str:
    """Build the prompt for the sub-LLM."""

    format_instruction = ""
    if output_format == "json":
        format_instruction = """
Return your answer using FINAL() with a JSON object:
FINAL({"result": "your answer here", "confidence": 0.0-1.0})
"""
    else:
        format_instruction = """
Return your answer using FINAL():
FINAL("your answer here")
"""

    return f"""You are a focused sub-agent performing a specific analysis task.
Your job is to complete ONLY the task described below, nothing more.

TASK:
{task}

CONTEXT:
```
{context[:50000]}
```

INSTRUCTIONS:
1. Analyze the context carefully
2. Complete the task as specified
3. Be concise and precise
4. Do not explain your reasoning unless asked
{format_instruction}
"""


def call_claude_cli(prompt: str, model: str = DEFAULT_MODEL) -> str:
    """Call Claude using the CLI tool."""

    model_config = MODELS.get(model, MODELS[DEFAULT_MODEL])

    # Use subprocess to call claude CLI
    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--model", model_config["id"]],
            capture_output=True,
            text=True,
            timeout=120
        )

        if result.returncode != 0:
            return f"Error calling Claude CLI: {result.stderr}"

        return result.stdout

    except FileNotFoundError:
        return "Error: 'claude' CLI not found. Please install Claude Code."
    except subprocess.TimeoutExpired:
        return "Error: Request timed out after 120 seconds."
    except Exception as e:
        return f"Error: {str(e)}"


def call_anthropic_api(prompt: str, model: str = DEFAULT_MODEL) -> str:
    """Call Claude using the Anthropic API directly."""

    try:
        import anthropic
    except ImportError:
        return "Error: anthropic package not installed. Run: pip install anthropic"

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return "Error: ANTHROPIC_API_KEY environment variable not set"

    model_config = MODELS.get(model, MODELS[DEFAULT_MODEL])

    try:
        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model=model_config["id"],
            max_tokens=model_config["max_tokens"],
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        return message.content[0].text

    except Exception as e:
        return f"Error calling Anthropic API: {str(e)}"


def dispatch_task(
    task: str,
    context: str,
    model: str = DEFAULT_MODEL,
    output_format: str = "json",
    use_api: bool = False
) -> Dict[str, Any]:
    """Dispatch a task to a sub-LLM and extract the answer."""

    prompt = build_prompt(task, context, output_format)

    # Call the LLM
    if use_api:
        response = call_anthropic_api(prompt, model)
    else:
        response = call_claude_cli(prompt, model)

    # Check for errors
    if response.startswith("Error:"):
        return {
            "success": False,
            "error": response,
            "task": task,
            "model": model
        }

    # Extract answer
    answer = extract_answer(response)

    return {
        "success": True,
        "answer": answer,
        "task": task,
        "model": model,
        "raw_response_length": len(response),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


def dispatch_batch(tasks_file: str, model: str = DEFAULT_MODEL, use_api: bool = False) -> List[Dict[str, Any]]:
    """Dispatch multiple tasks from a JSON file."""

    with open(tasks_file, 'r') as f:
        tasks = json.load(f)

    results = []
    for i, task_def in enumerate(tasks):
        print(f"Processing task {i+1}/{len(tasks)}...", file=sys.stderr)

        task = task_def.get("task", "")
        context = task_def.get("context", "")
        task_model = task_def.get("model", model)

        # If context is a file path, load it
        if context.startswith("/") or context.startswith("./"):
            try:
                context = load_context_from_file(context)
            except FileNotFoundError as e:
                results.append({
                    "success": False,
                    "error": str(e),
                    "task": task
                })
                continue

        result = dispatch_task(task, context, task_model, use_api=use_api)
        results.append(result)

    return results


# ─────────────────────────────────────────────────────────────────────────────
# CLI INTERFACE
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="WAVE RLM: Sub-LLM Dispatch - Delegate focused tasks to sub-LLMs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic task with file context
  %(prog)s --task "List all function names" --context ./src/app.py

  # Use cheaper model for simple extraction
  %(prog)s --task "Count lines of code" --context ./src/ --model haiku

  # Use P variable for context
  %(prog)s --task "Find authentication patterns" --p-file .claude/P.json --query "src/auth/"

  # Batch processing
  %(prog)s --batch tasks.json --model haiku

Models:
  haiku  - Fast & cheap, good for extraction ($0.25/$1.25 per 1M tokens)
  sonnet - Balanced, good for analysis ($3/$15 per 1M tokens)
  opus   - Most capable, complex reasoning ($15/$75 per 1M tokens)
        """
    )

    # Task specification
    parser.add_argument("--task", "-t", help="Task description for the sub-LLM")
    parser.add_argument("--context", "-c", help="Context file or text")
    parser.add_argument("--p-file", help="Path to P.json variable file")
    parser.add_argument("--query", "-q", help="Query path within P variable")
    parser.add_argument("--batch", "-b", help="Batch tasks JSON file")

    # Model selection
    parser.add_argument("--model", "-m", default=DEFAULT_MODEL,
                       choices=list(MODELS.keys()),
                       help=f"Model to use (default: {DEFAULT_MODEL})")

    # Output options
    parser.add_argument("--output-format", "-f", default="json",
                       choices=["json", "text"],
                       help="Expected output format (default: json)")
    parser.add_argument("--raw", action="store_true",
                       help="Output raw response without extraction")
    parser.add_argument("--use-api", action="store_true",
                       help="Use Anthropic API instead of Claude CLI")

    # Info
    parser.add_argument("--list-models", action="store_true",
                       help="List available models and exit")

    args = parser.parse_args()

    # List models
    if args.list_models:
        print("Available models:")
        for name, config in MODELS.items():
            print(f"  {name:8} - {config['description']}")
            print(f"            Cost: ${config['cost_input']}/{config['cost_output']} per 1M tokens (in/out)")
        return 0

    # Batch mode
    if args.batch:
        results = dispatch_batch(args.batch, args.model, args.use_api)
        print(json.dumps(results, indent=2))
        return 0

    # Single task mode
    if not args.task:
        parser.error("--task is required (or use --batch for batch mode)")

    # Get context
    context = ""
    if args.context:
        if os.path.exists(args.context):
            context = load_context_from_file(args.context)
        else:
            context = args.context
    elif args.p_file and args.query:
        context = load_context_from_p(args.p_file, args.query)
    else:
        parser.error("Either --context or (--p-file and --query) is required")

    # Dispatch task
    result = dispatch_task(
        args.task,
        context,
        args.model,
        args.output_format,
        args.use_api
    )

    # Output
    if args.raw:
        print(result.get("raw_response", result))
    else:
        print(json.dumps(result, indent=2))

    return 0 if result.get("success") else 1


if __name__ == "__main__":
    sys.exit(main())
