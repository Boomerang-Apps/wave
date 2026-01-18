#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
WAVE RLM: Query Interface for P Variable
═══════════════════════════════════════════════════════════════════════════════
Provides REPL-style query functions for WAVE agents to interact with the
external project variable P without loading full context.

USAGE:
    # Load P variable
    P = load_variable('/path/to/P.json')

    # Query operations
    content = peek(P, 'src/components/Button.tsx')
    matches = search(P, 'useAuth')
    files = list_files(P, '*.test.ts')
    story = get_story(P, 'AUTH-FE-001')

BASED ON: MIT CSAIL RLM Research (arXiv:2512.24601)
═══════════════════════════════════════════════════════════════════════════════
"""

import json
import os
import re
import fnmatch
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


def load_variable(path: str) -> Dict[str, Any]:
    """Load the P variable from a JSON file."""
    with open(path, 'r') as f:
        return json.load(f)


def peek(P: Dict[str, Any], file_path: str, start: int = 0, end: Optional[int] = None) -> str:
    """
    Peek at file contents without loading into main context.

    Args:
        P: The project variable
        file_path: Relative path to file from project root
        start: Starting line (0-indexed)
        end: Ending line (exclusive), None for all

    Returns:
        File contents as string, or error message
    """
    project_root = P["meta"]["project_root"]
    full_path = os.path.join(project_root, file_path)

    if not os.path.exists(full_path):
        return f"ERROR: File not found: {file_path}"

    if not os.path.isfile(full_path):
        return f"ERROR: Not a file: {file_path}"

    try:
        with open(full_path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()

        if end is None:
            end = len(lines)

        selected = lines[start:end]

        # Add line numbers
        numbered = []
        for i, line in enumerate(selected, start=start+1):
            numbered.append(f"{i:4d} | {line.rstrip()}")

        return '\n'.join(numbered)

    except Exception as e:
        return f"ERROR: Could not read file: {e}"


def search(P: Dict[str, Any], pattern: str, max_results: int = 20) -> List[Dict[str, Any]]:
    """
    Search for pattern across project files.

    Args:
        P: The project variable
        pattern: Regex pattern to search for
        max_results: Maximum number of results to return

    Returns:
        List of matches with file, line number, and content
    """
    project_root = P["meta"]["project_root"]
    results = []

    # Get source extensions from P
    extensions = P.get("codebase", {}).get("source_extensions", ["ts", "tsx", "js", "py"])

    try:
        regex = re.compile(pattern, re.IGNORECASE)
    except re.error as e:
        return [{"error": f"Invalid regex: {e}"}]

    for root, dirs, files in os.walk(project_root):
        # Skip ignored directories
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist', 'build', '__pycache__']]

        for file in files:
            ext = file.split('.')[-1] if '.' in file else ''
            if ext not in extensions:
                continue

            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, project_root)

            try:
                with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                    for line_num, line in enumerate(f, 1):
                        if regex.search(line):
                            results.append({
                                "file": rel_path,
                                "line": line_num,
                                "content": line.strip()[:200]
                            })
                            if len(results) >= max_results:
                                return results
            except Exception:
                continue

    return results


def list_files(P: Dict[str, Any], pattern: str = "*", max_results: int = 50) -> List[str]:
    """
    List files matching a glob pattern.

    Args:
        P: The project variable
        pattern: Glob pattern (e.g., "*.test.ts", "src/**/*.tsx")
        max_results: Maximum number of results

    Returns:
        List of relative file paths
    """
    project_root = P["meta"]["project_root"]
    results = []

    for root, dirs, files in os.walk(project_root):
        # Skip ignored directories
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist', 'build', '__pycache__']]

        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, project_root)

            if fnmatch.fnmatch(rel_path, pattern) or fnmatch.fnmatch(file, pattern):
                results.append(rel_path)
                if len(results) >= max_results:
                    return results

    return sorted(results)


def get_story(P: Dict[str, Any], story_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a specific story by ID.

    Args:
        P: The project variable
        story_id: Story ID (e.g., "AUTH-FE-001")

    Returns:
        Story content as dict, or None if not found
    """
    project_root = P["meta"]["project_root"]
    wave = P.get("wave_state", {}).get("current_wave", 1)
    stories_dir = os.path.join(project_root, "stories", f"wave{wave}")

    if not os.path.isdir(stories_dir):
        return None

    # Try to find the story file
    for file in os.listdir(stories_dir):
        if story_id in file and file.endswith('.json'):
            try:
                with open(os.path.join(stories_dir, file), 'r') as f:
                    return json.load(f)
            except Exception:
                return None

    return None


def get_signal(P: Dict[str, Any], signal_pattern: str) -> Optional[Dict[str, Any]]:
    """
    Get a signal file by pattern.

    Args:
        P: The project variable
        signal_pattern: Pattern to match (e.g., "wave3-gate3", "gate4-approved")

    Returns:
        Signal content as dict, or None if not found
    """
    project_root = P["meta"]["project_root"]
    signal_dir = os.path.join(project_root, ".claude")

    if not os.path.isdir(signal_dir):
        return None

    for file in os.listdir(signal_dir):
        if signal_pattern in file and file.startswith('signal-') and file.endswith('.json'):
            try:
                with open(os.path.join(signal_dir, file), 'r') as f:
                    return json.load(f)
            except Exception:
                return None

    return None


def get_memory(P: Dict[str, Any], agent: str, wave: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Get agent memory for a specific agent.

    Args:
        P: The project variable
        agent: Agent name (e.g., "fe-dev", "be-dev")
        wave: Specific wave, or current wave if None

    Returns:
        Agent memory as dict, or None if not found
    """
    project_root = P["meta"]["project_root"]
    if wave is None:
        wave = P.get("wave_state", {}).get("current_wave", 1)

    memory_file = os.path.join(project_root, ".claude", "agent-memory", f"{agent}-wave{wave}.json")

    if os.path.exists(memory_file):
        try:
            with open(memory_file, 'r') as f:
                return json.load(f)
        except Exception:
            return None

    return None


def save_decision(P: Dict[str, Any], agent: str, decision: str, reason: str) -> bool:
    """
    Save a decision to agent memory.

    Args:
        P: The project variable
        agent: Agent name
        decision: The decision made
        reason: Reasoning for the decision

    Returns:
        True if saved successfully
    """
    import datetime

    project_root = P["meta"]["project_root"]
    wave = P.get("wave_state", {}).get("current_wave", 1)

    memory_dir = os.path.join(project_root, ".claude", "agent-memory")
    os.makedirs(memory_dir, exist_ok=True)

    memory_file = os.path.join(memory_dir, f"{agent}-wave{wave}.json")

    # Load existing or create new
    if os.path.exists(memory_file):
        with open(memory_file, 'r') as f:
            memory = json.load(f)
    else:
        memory = {"decisions": [], "constraints": [], "patterns_used": []}

    # Add decision
    memory["decisions"].append({
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "decision": decision,
        "reason": reason
    })

    # Save
    with open(memory_file, 'w') as f:
        json.dump(memory, f, indent=2)

    return True


def summary(P: Dict[str, Any]) -> str:
    """
    Get a summary of the project state.

    Args:
        P: The project variable

    Returns:
        Summary string
    """
    meta = P.get("meta", {})
    wave_state = P.get("wave_state", {})
    codebase = P.get("codebase", {})

    return f"""
PROJECT SUMMARY
===============
Name: {meta.get('project_name', 'Unknown')}
Root: {meta.get('project_root', 'Unknown')}
Generated: {meta.get('generated_at', 'Unknown')}

WAVE STATE
----------
Current Wave: {wave_state.get('current_wave', '?')}
Wave Type: {wave_state.get('wave_type', '?')}
Stories: {len(wave_state.get('stories', []))}
Signals: {len(wave_state.get('signals', []))}

CODEBASE
--------
File Count: {codebase.get('file_count', '?')}
Structure Depth: {len(codebase.get('structure', []))} directories

AVAILABLE QUERIES
-----------------
peek(P, 'path/to/file.ts')     - View file contents
search(P, 'pattern')           - Search across files
list_files(P, '*.test.ts')     - List files by pattern
get_story(P, 'STORY-ID')       - Get story definition
get_signal(P, 'wave3-gate3')   - Get signal file
get_memory(P, 'fe-dev')        - Get agent memory
save_decision(P, 'fe-dev', 'decision', 'reason')  - Save decision
"""


# ─────────────────────────────────────────────────────────────────────────────
# CLI INTERFACE
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: query-variable.py <P.json> [command] [args...]")
        print("")
        print("Commands:")
        print("  summary                    - Show project summary")
        print("  peek <file> [start] [end]  - View file contents")
        print("  search <pattern>           - Search files")
        print("  list <pattern>             - List files")
        print("  story <id>                 - Get story")
        print("  signal <pattern>           - Get signal")
        print("")
        sys.exit(1)

    P = load_variable(sys.argv[1])

    if len(sys.argv) == 2:
        print(summary(P))
        sys.exit(0)

    cmd = sys.argv[2]

    if cmd == "summary":
        print(summary(P))
    elif cmd == "peek" and len(sys.argv) >= 4:
        start = int(sys.argv[4]) if len(sys.argv) > 4 else 0
        end = int(sys.argv[5]) if len(sys.argv) > 5 else None
        print(peek(P, sys.argv[3], start, end))
    elif cmd == "search" and len(sys.argv) >= 4:
        results = search(P, sys.argv[3])
        for r in results:
            if "error" in r:
                print(r["error"])
            else:
                print(f"{r['file']}:{r['line']}: {r['content']}")
    elif cmd == "list" and len(sys.argv) >= 4:
        for f in list_files(P, sys.argv[3]):
            print(f)
    elif cmd == "story" and len(sys.argv) >= 4:
        story = get_story(P, sys.argv[3])
        if story:
            print(json.dumps(story, indent=2))
        else:
            print(f"Story not found: {sys.argv[3]}")
    elif cmd == "signal" and len(sys.argv) >= 4:
        signal = get_signal(P, sys.argv[3])
        if signal:
            print(json.dumps(signal, indent=2))
        else:
            print(f"Signal not found: {sys.argv[3]}")
    else:
        print(f"Unknown command or missing arguments: {cmd}")
        sys.exit(1)
