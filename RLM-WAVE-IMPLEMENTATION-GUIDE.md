# RLM IMPLEMENTATION GUIDE FOR WAVE ARCHITECTURE

**Version:** 1.0.0  
**Date:** January 18, 2026  
**Purpose:** Enable Claude Code agents to implement Recursive Language Models within WAVE multi-agent framework  
**Classification:** CORE METHODOLOGY - All agents should understand

---

## EXECUTIVE SUMMARY

This document explains Recursive Language Models (RLMs) and provides implementation guidance for integrating RLM patterns into the WAVE (formerly MAF) multi-agent architecture. RLM solves the critical "context rot" problem that causes agent performance degradation in long-running tasks.

**Key Insight:** Instead of loading entire codebases into context, RLM stores content as external variables that the LLM can programmatically explore, search, and recursively process.

---

## PART 1: UNDERSTANDING RLM

### 1.1 What is Context Rot?

Context rot is the phenomenon where LLM performance degrades as context length increases, even when within the model's technical token limit.

**Symptoms you've seen in WAVE:**
- Agent "forgets" instructions mid-task
- Earlier file contents get confused with later ones
- Quality drops after ~50K tokens even though limit is 200K
- Agent asks questions it already has answers to

**Why it happens:** Transformer attention becomes diluted across too many tokens. The model can technically "see" everything but can't effectively reason about it all simultaneously.

### 1.2 The RLM Solution

RLM (Recursive Language Model) is an inference strategy developed by MIT researchers (Alex Zhang, Tim Kraska, Omar Khattab) that treats the input context as an **external environment** rather than data to memorize.

**Traditional LLM Call:**
```
┌─────────────────────────────────────────┐
│           LLM CONTEXT WINDOW            │
│  ┌───────────────────────────────────┐  │
│  │  System Prompt (2K tokens)        │  │
│  │  + Full Codebase (150K tokens)    │  │  ← Everything crammed in
│  │  + Task Description (1K tokens)   │  │
│  │  = 153K tokens                    │  │
│  └───────────────────────────────────┘  │
│                  ↓                      │
│            Poor Output                  │  ← Context rot
└─────────────────────────────────────────┘
```

**RLM Call:**
```
┌─────────────────────────────────────────┐
│           LLM CONTEXT WINDOW            │
│  ┌───────────────────────────────────┐  │
│  │  System Prompt (2K tokens)        │  │
│  │  + REPL Environment Info (1K)     │  │  ← Lean context
│  │  + Task Description (1K tokens)   │  │
│  │  = 4K tokens                      │  │
│  └───────────────────────────────────┘  │
│                  ↓                      │
│         Python REPL Environment         │
│  ┌───────────────────────────────────┐  │
│  │  P = "...full codebase..."        │  │  ← External variable
│  │  len(P) = 150K tokens             │  │
│  │                                   │  │
│  │  LLM can execute:                 │  │
│  │    P[:1000]  # peek               │  │
│  │    P[5000:6000]  # slice          │  │
│  │    re.search(pattern, P)          │  │
│  │    recursive_llm(sub_task, chunk) │  │
│  └───────────────────────────────────┘  │
│                  ↓                      │
│           Quality Output                │  ← No context rot
└─────────────────────────────────────────┘
```

### 1.3 Why RLM Works

1. **Lean Context:** The LLM only holds task description + environment instructions (~4K tokens)
2. **On-Demand Access:** Code explores the context variable as needed
3. **Fresh Sub-Calls:** Recursive LLM calls start with clean context
4. **Parallel Processing:** Different chunks can be processed independently

### 1.4 Research Sources

**Primary Source - MIT Paper:**
- Title: "Recursive Language Models"
- Authors: Alex L. Zhang, Tim Kraska, Omar Khattab
- Institution: MIT CSAIL
- arXiv: https://arxiv.org/abs/2512.24601
- Date: October 2025

**Official Implementation:**
- GitHub: https://github.com/alexzhang13/rlm
- Supports: OpenAI, Anthropic, local models via LiteLLM
- Environments: Local REPL, Docker, Modal, Prime Sandboxes

**Key Benchmark Results:**
- GPT-5-mini with RLM outperformed GPT-5 direct (64.9% vs 30.3%) on long-context tasks
- Handles 10M+ tokens without degradation
- Cost comparable or lower than direct calls

---

## PART 2: RLM ARCHITECTURE PATTERNS

### 2.1 Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      RLM SYSTEM COMPONENTS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ROOT LLM (Orchestrator)                                     │
│     - Receives the task                                         │
│     - Decides HOW to explore the context                        │
│     - Writes Python code to navigate                            │
│     - Synthesizes final answer                                  │
│                                                                 │
│  2. REPL ENVIRONMENT (Execution Sandbox)                        │
│     - Stores context as variable P                              │
│     - Executes Python code from Root LLM                        │
│     - Returns execution results                                 │
│     - Provides recursive_llm() function                         │
│                                                                 │
│  3. SUB-LLM (Recursive Workers)                                 │
│     - Called via recursive_llm(task, context_slice)             │
│     - Fresh context for each call                               │
│     - Can be same model or cheaper model                        │
│     - Returns focused results                                   │
│                                                                 │
│  4. CONTEXT VARIABLE (External Storage)                         │
│     - The actual document/codebase/data                         │
│     - Never loaded into LLM context directly                    │
│     - Accessed via Python operations                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Execution Flow

```
User Query: "Find all Hebrew RTL issues in the AirView codebase"

Step 1: Root LLM receives task (lean context)
        ↓
Step 2: Root LLM writes exploration code:
        ```python
        # First, understand the structure
        file_list = P.split("--- FILE: ")[1:]
        print(f"Found {len(file_list)} files")
        
        # Find HTML files (likely RTL issues)
        html_files = [f for f in file_list if '.html' in f[:100]]
        print(f"HTML files: {len(html_files)}")
        ```
        ↓
Step 3: REPL executes, returns: "Found 35 files, HTML files: 35"
        ↓
Step 4: Root LLM spawns sub-tasks:
        ```python
        issues = []
        for html_file in html_files[:10]:  # Process in batches
            result = recursive_llm(
                f"Check this HTML for RTL issues: missing dir='rtl', "
                f"incorrect text-align, Heebo font issues",
                html_file
            )
            if "ISSUE:" in result:
                issues.append(result)
        ```
        ↓
Step 5: Sub-LLMs process chunks with fresh context
        ↓
Step 6: Root LLM synthesizes all results into final report
```

### 2.3 Key Operations Available in REPL

```python
# CONTEXT ACCESS
P                          # Full context variable
P[:1000]                   # First 1000 chars
P[5000:6000]               # Slice
len(P)                     # Total length

# SEARCH OPERATIONS
import re
re.findall(r'pattern', P)  # Find all matches
re.search(r'pattern', P)   # Find first match
'keyword' in P             # Check existence

# RECURSIVE CALLS
recursive_llm(task, context)        # Call sub-LLM
recursive_llm(task, P[start:end])   # Call with slice

# HELPER FUNCTIONS (can be defined)
def find_function(name):
    pattern = rf'function {name}\([^)]*\)\s*\{{'
    match = re.search(pattern, P)
    if match:
        # Extract function body...
        return extract_function_body(match)
```

---

## PART 3: MAPPING RLM TO WAVE ARCHITECTURE

### 3.1 Natural Alignment

WAVE already implements RLM principles at the orchestration layer:

| RLM Concept | WAVE Equivalent |
|-------------|-----------------|
| Root LLM | CTO Agent (Opus) |
| Sub-LLMs | Domain Agents (FE, BE, QA - Sonnet/Haiku) |
| REPL Environment | Git Worktrees + Docker Containers |
| Context Variable | Codebase files in worktree |
| recursive_llm() | Agent spawning via Supabase signals |

### 3.2 Enhanced WAVE + RLM Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WAVE + RLM HYBRID ARCHITECTURE               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TIER 1: ORCHESTRATION (Host Machine)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  wave-orchestrator.py                                     │  │
│  │  - Monitors Supabase for new stories                      │  │
│  │  - Spawns RLM-enabled agents                              │  │
│  │  - Manages merge operations                               │  │
│  │  - Enforces safety protocols                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  TIER 2: RLM AGENT LAYER (Docker Containers)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │ CTO-RLM     │  │ FE-RLM      │  │ BE-RLM      │       │  │
│  │  │ (Root)      │  │ (Sub)       │  │ (Sub)       │       │  │
│  │  │             │  │             │  │             │       │  │
│  │  │ Context:    │  │ Context:    │  │ Context:    │       │  │
│  │  │ ~5K tokens  │  │ ~5K tokens  │  │ ~5K tokens  │       │  │
│  │  │             │  │             │  │             │       │  │
│  │  │ P = full    │  │ P = domain  │  │ P = domain  │       │  │
│  │  │ codebase    │  │ files only  │  │ files only  │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  TIER 3: STORAGE LAYER                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Git Worktrees    │  Supabase         │  Signal Files     │  │
│  │  (Code Storage)   │  (Coordination)   │  (Fast Signals)   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Agent Context Strategy

**BEFORE (Context Rot Risk):**
```python
# Old approach - everything in context
prompt = f"""
{system_prompt}  # 2K tokens

Here is the full codebase:
{full_codebase}  # 150K tokens  ← DANGER

Your task: {task}  # 1K tokens
"""
# Total: 153K tokens - severe context rot
```

**AFTER (RLM Pattern):**
```python
# New approach - lean context + external variable
prompt = f"""
{system_prompt}  # 2K tokens

You have access to a Python REPL environment.
The codebase is stored in variable P (length: {len(codebase)} chars).

Available operations:
- P[:n] to peek at first n characters
- P[start:end] to slice
- re.search(pattern, P) to find patterns
- recursive_llm(task, context) to delegate to sub-agent

Your task: {task}  # 1K tokens

Write Python code to explore P and complete the task.
"""
# Total: ~4K tokens - no context rot
```

---

## PART 4: IMPLEMENTATION GUIDE

### 4.1 Option A: Using MIT's Official RLM Library

**Installation:**
```bash
pip install rlm
# or
pip install git+https://github.com/alexzhang13/rlm.git
```

**Basic Usage:**
```python
from rlm import RLM

# Initialize with Anthropic backend
rlm = RLM(
    backend="anthropic",
    backend_kwargs={
        "model_name": "claude-sonnet-4-20250514"
    },
    environment="local",  # or "docker" for isolation
    verbose=True
)

# Load codebase as context (NOT in LLM context)
with open("airview-codebase.txt", "r") as f:
    codebase = f.read()

# Execute with RLM
result = rlm.completion(
    query="Find all files missing Hebrew RTL attributes",
    context=codebase  # Stored as variable P
)

print(result.response)
```

**Docker-Isolated Execution:**
```python
from rlm import RLM

rlm = RLM(
    backend="anthropic",
    backend_kwargs={"model_name": "claude-sonnet-4-20250514"},
    environment="docker",
    environment_kwargs={
        "image": "python:3.11-slim",
        "timeout": 300
    }
)
```

### 4.2 Option B: Custom RLM Implementation for WAVE

If you need tighter integration with WAVE's existing infrastructure:

**File: `wave-rlm-agent.py`**
```python
"""
WAVE RLM Agent - Custom implementation for WAVE architecture
Implements RLM pattern with Anthropic API directly
"""

import anthropic
import re
import json
from typing import Optional, Callable
from dataclasses import dataclass

@dataclass
class RLMResult:
    response: str
    code_executed: list[str]
    sub_calls: int
    tokens_used: int

class WaveRLMAgent:
    """
    RLM-enabled agent for WAVE architecture.
    Stores context as external variable, enables recursive exploration.
    """
    
    def __init__(
        self,
        model: str = "claude-sonnet-4-20250514",
        sub_model: str = "claude-haiku-4-5-20251001",  # Cheaper for sub-calls
        max_iterations: int = 20,
        max_recursion_depth: int = 5
    ):
        self.client = anthropic.Anthropic()
        self.model = model
        self.sub_model = sub_model
        self.max_iterations = max_iterations
        self.max_depth = max_recursion_depth
        self.sub_call_count = 0
        self.total_tokens = 0
        
    def _create_repl_system_prompt(self, context_length: int) -> str:
        return f"""You are an AI agent with access to a Python REPL environment.

IMPORTANT: The content you need to analyze is stored in variable P.
- P is a string containing {context_length:,} characters
- P is NOT in your context window - you must access it via code
- Do NOT try to see all of P at once - explore incrementally

AVAILABLE OPERATIONS:
```python
# View content
P[:1000]              # First 1000 chars
P[5000:6000]          # Slice from position 5000-6000
len(P)                # Total length

# Search content
import re
re.findall(r'pattern', P)           # Find all matches
re.search(r'pattern', P).group()    # First match
'keyword' in P                       # Check existence

# Delegate to sub-agent (fresh context, no rot)
recursive_llm("analyze this section for X", P[start:end])
```

EXECUTION RULES:
1. Write Python code blocks to explore P
2. I will execute your code and show results
3. Based on results, write more code or provide final answer
4. Use recursive_llm() for complex sub-tasks
5. When done, write FINAL_ANSWER: followed by your response

SAFETY: You cannot use os, subprocess, or network operations."""

    def _execute_code(
        self, 
        code: str, 
        context: str, 
        depth: int = 0
    ) -> str:
        """Execute code in sandboxed environment with context as P"""
        
        # Create restricted globals
        restricted_globals = {
            'P': context,
            're': re,
            'len': len,
            'print': print,
            'str': str,
            'int': int,
            'list': list,
            'dict': dict,
            'range': range,
            'enumerate': enumerate,
            'recursive_llm': lambda task, ctx: self._recursive_call(task, ctx, depth + 1)
        }
        
        # Capture output
        import io
        import sys
        
        output_buffer = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = output_buffer
        
        try:
            exec(code, restricted_globals)
            result = output_buffer.getvalue()
            
            # Also capture last expression value
            try:
                last_line = code.strip().split('\n')[-1]
                if not last_line.startswith(('print', 'import', 'def', 'class', 'for', 'if', 'while', '#')):
                    value = eval(last_line, restricted_globals)
                    if value is not None:
                        result += f"\n>>> {repr(value)[:2000]}"  # Limit output
            except:
                pass
                
            return result if result else "Code executed successfully (no output)"
            
        except Exception as e:
            return f"ERROR: {type(e).__name__}: {str(e)}"
        finally:
            sys.stdout = old_stdout
            
    def _recursive_call(self, task: str, context: str, depth: int) -> str:
        """Make recursive sub-LLM call with fresh context"""
        
        if depth > self.max_depth:
            return "ERROR: Maximum recursion depth exceeded"
            
        self.sub_call_count += 1
        
        # Use cheaper model for sub-calls
        response = self.client.messages.create(
            model=self.sub_model,
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": f"""Analyze this content and respond to the task.

TASK: {task}

CONTENT:
{context[:50000]}  # Limit sub-context to 50K chars

Provide a concise, focused response."""
            }]
        )
        
        self.total_tokens += response.usage.input_tokens + response.usage.output_tokens
        return response.content[0].text
        
    def completion(self, query: str, context: str) -> RLMResult:
        """
        Main RLM completion - explores context via REPL pattern
        """
        
        messages = [{
            "role": "user",
            "content": f"TASK: {query}\n\nExplore variable P to complete this task."
        }]
        
        code_history = []
        
        for iteration in range(self.max_iterations):
            # Get LLM response
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=self._create_repl_system_prompt(len(context)),
                messages=messages
            )
            
            self.total_tokens += response.usage.input_tokens + response.usage.output_tokens
            assistant_message = response.content[0].text
            
            # Check for final answer
            if "FINAL_ANSWER:" in assistant_message:
                final_answer = assistant_message.split("FINAL_ANSWER:")[-1].strip()
                return RLMResult(
                    response=final_answer,
                    code_executed=code_history,
                    sub_calls=self.sub_call_count,
                    tokens_used=self.total_tokens
                )
            
            # Extract and execute code blocks
            code_blocks = re.findall(r'```python\n(.*?)```', assistant_message, re.DOTALL)
            
            if code_blocks:
                execution_results = []
                for code in code_blocks:
                    code_history.append(code)
                    result = self._execute_code(code, context)
                    execution_results.append(f"```\n{result}\n```")
                
                # Add to conversation
                messages.append({"role": "assistant", "content": assistant_message})
                messages.append({
                    "role": "user", 
                    "content": f"EXECUTION RESULTS:\n" + "\n".join(execution_results)
                })
            else:
                # No code, ask for code or final answer
                messages.append({"role": "assistant", "content": assistant_message})
                messages.append({
                    "role": "user",
                    "content": "Please write Python code to explore P, or provide FINAL_ANSWER: if done."
                })
        
        return RLMResult(
            response="Maximum iterations reached without final answer",
            code_executed=code_history,
            sub_calls=self.sub_call_count,
            tokens_used=self.total_tokens
        )


# =============================================================================
# WAVE INTEGRATION HELPERS
# =============================================================================

def load_domain_context(domain: str, worktree_path: str) -> str:
    """
    Load all files from a domain's worktree into a single context string.
    Format: --- FILE: path/to/file.ext ---\n<content>\n
    """
    import os
    
    context_parts = []
    
    for root, dirs, files in os.walk(worktree_path):
        # Skip hidden dirs and node_modules
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules']
        
        for file in files:
            if file.startswith('.'):
                continue
                
            filepath = os.path.join(root, file)
            relative_path = os.path.relpath(filepath, worktree_path)
            
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                context_parts.append(f"--- FILE: {relative_path} ---\n{content}")
            except:
                continue  # Skip binary/unreadable files
    
    return "\n\n".join(context_parts)


def run_wave_rlm_task(
    story_id: str,
    task: str,
    domain: str,
    worktree_path: str
) -> dict:
    """
    Execute a WAVE story task using RLM pattern.
    Returns result dict for Supabase update.
    """
    
    # Load domain context
    context = load_domain_context(domain, worktree_path)
    
    # Initialize RLM agent
    agent = WaveRLMAgent(
        model="claude-sonnet-4-20250514",
        sub_model="claude-haiku-4-5-20251001"
    )
    
    # Execute with RLM
    result = agent.completion(query=task, context=context)
    
    return {
        "story_id": story_id,
        "status": "completed",
        "response": result.response,
        "metrics": {
            "code_blocks_executed": len(result.code_executed),
            "sub_llm_calls": result.sub_calls,
            "total_tokens": result.tokens_used
        }
    }


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    # Example: Analyze AirView for RTL issues
    
    agent = WaveRLMAgent()
    
    # Simulate loading codebase
    sample_context = """
--- FILE: index.html ---
<!DOCTYPE html>
<html lang="he">
<head>
    <meta charset="UTF-8">
    <title>AirView - שוק לצלמי רחפנים</title>
</head>
<body>
    <div class="hero-section">
        <h1>ברוכים הבאים ל-AirView</h1>
    </div>
</body>
</html>

--- FILE: about.html ---
<!DOCTYPE html>
<html lang="en">
<head>
    <title>About</title>
</head>
<body dir="ltr">
    <h1>אודות</h1>
</body>
</html>
"""

    result = agent.completion(
        query="Find HTML files with incorrect RTL configuration (missing dir='rtl' or wrong lang attribute for Hebrew content)",
        context=sample_context
    )
    
    print("=== RESULT ===")
    print(result.response)
    print(f"\nCode blocks executed: {len(result.code_executed)}")
    print(f"Sub-LLM calls: {result.sub_calls}")
    print(f"Total tokens: {result.tokens_used}")
```

### 4.3 Option C: Minimal Integration (Quick Start)

For immediate integration without new dependencies:

**File: `wave-rlm-minimal.py`**
```python
"""
Minimal RLM pattern for WAVE - No external dependencies
Just wraps Anthropic API with REPL-style interaction
"""

import anthropic
import re

def rlm_completion(task: str, context: str, model: str = "claude-sonnet-4-20250514") -> str:
    """
    Simple RLM completion - context as external variable
    """
    
    client = anthropic.Anthropic()
    
    # System prompt that establishes RLM pattern
    system = f"""You are analyzing content stored in variable P.
P contains {len(context):,} characters. You cannot see it directly.

To analyze P, describe what you want to examine:
- "Show me the first 500 characters" → I'll show P[:500]
- "Find all files containing 'RTL'" → I'll search and show results
- "Analyze the file at position X" → I'll extract and show it

When you have enough information, provide your final answer."""

    messages = [{"role": "user", "content": f"TASK: {task}"}]
    
    for _ in range(10):  # Max iterations
        response = client.messages.create(
            model=model,
            max_tokens=4096,
            system=system,
            messages=messages
        )
        
        assistant_text = response.content[0].text
        
        # Check if asking for content
        if "show me" in assistant_text.lower() or "find" in assistant_text.lower():
            # Simple content extraction based on request
            if "first" in assistant_text.lower():
                match = re.search(r'(\d+)', assistant_text)
                n = int(match.group(1)) if match else 500
                content_response = f"P[:{n}]:\n{context[:n]}"
            elif "file" in assistant_text.lower():
                # Find files matching pattern
                files = re.findall(r'--- FILE: (.*?) ---', context)
                content_response = f"Files found: {files}"
            else:
                content_response = f"P[:1000]:\n{context[:1000]}"
            
            messages.append({"role": "assistant", "content": assistant_text})
            messages.append({"role": "user", "content": content_response})
        else:
            # Assume final answer
            return assistant_text
    
    return "Max iterations reached"


# Usage
if __name__ == "__main__":
    with open("codebase.txt") as f:
        context = f.read()
    
    result = rlm_completion(
        task="Identify all Hebrew RTL issues",
        context=context
    )
    print(result)
```

---

## PART 5: WAVE-SPECIFIC PATTERNS

### 5.1 Domain-Scoped RLM Agents

Each WAVE domain agent should only receive its domain files as context:

```python
# wave-domain-agent.py

DOMAIN_PATTERNS = {
    "AUTH": ["src/auth/**", "src/middleware/auth*"],
    "CLIENT": ["src/client/**", "src/components/client/**"],
    "PILOT": ["src/pilot/**", "src/components/pilot/**"],
    "ADMIN": ["src/admin/**", "src/components/admin/**"],
    "BOOKING": ["src/booking/**", "src/components/booking/**"],
    "PAYMENT": ["src/payment/**", "src/services/payment*"],
    "SHARED": ["src/shared/**", "src/components/ui/**", "src/utils/**"]
}

def get_domain_context(domain: str, repo_path: str) -> str:
    """Load only files matching domain patterns"""
    import glob
    
    patterns = DOMAIN_PATTERNS.get(domain, [])
    context_parts = []
    
    for pattern in patterns:
        for filepath in glob.glob(f"{repo_path}/{pattern}", recursive=True):
            with open(filepath) as f:
                rel_path = filepath.replace(repo_path + "/", "")
                context_parts.append(f"--- FILE: {rel_path} ---\n{f.read()}")
    
    return "\n\n".join(context_parts)
```

### 5.2 Story-Based RLM Execution

Integrate RLM into the story execution flow:

```python
# wave-story-executor.py

async def execute_story_with_rlm(story: dict, worktree_path: str):
    """
    Execute a WAVE story using RLM pattern
    """
    
    # 1. Load domain context
    context = get_domain_context(story['domain'], worktree_path)
    
    # 2. Build task from story
    task = f"""
STORY: {story['title']}
ACCEPTANCE CRITERIA:
{story['acceptance_criteria']}

IMPLEMENTATION REQUIREMENTS:
{story['implementation_details']}

Generate the required code changes. For each file:
1. Show the file path
2. Show the complete new content
"""
    
    # 3. Execute with RLM
    agent = WaveRLMAgent(
        model="claude-sonnet-4-20250514" if story['complexity'] == 'high' else "claude-haiku-4-5-20251001"
    )
    
    result = agent.completion(query=task, context=context)
    
    # 4. Parse code blocks from response
    code_changes = parse_code_changes(result.response)
    
    # 5. Apply changes to worktree
    for filepath, content in code_changes.items():
        full_path = f"{worktree_path}/{filepath}"
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w') as f:
            f.write(content)
    
    # 6. Update story status in Supabase
    return {
        "status": "completed",
        "files_changed": list(code_changes.keys()),
        "metrics": {
            "tokens": result.tokens_used,
            "sub_calls": result.sub_calls
        }
    }
```

### 5.3 CTO Agent as Root LLM

The CTO agent orchestrates sub-agents using recursive pattern:

```python
# wave-cto-rlm.py

class WaveCTOAgent(WaveRLMAgent):
    """
    CTO Agent - Root LLM that delegates to domain agents
    """
    
    def __init__(self):
        super().__init__(
            model="claude-sonnet-4-20250514",  # Opus for CTO if budget allows
            sub_model="claude-sonnet-4-20250514"  # Sonnet for domain agents
        )
        
    def _recursive_call(self, task: str, context: str, depth: int) -> str:
        """
        Override to route to appropriate domain agent
        """
        
        # Determine domain from task
        domain = self._detect_domain(task)
        
        # Use domain-specific model
        if domain == "QA":
            model = "claude-haiku-4-5-20251001"  # Haiku for QA
        else:
            model = "claude-sonnet-4-20250514"  # Sonnet for dev
        
        # Call domain agent
        response = self.client.messages.create(
            model=model,
            max_tokens=8192,
            messages=[{
                "role": "user",
                "content": f"""You are the {domain} domain agent.

TASK: {task}

DOMAIN CONTEXT:
{context[:100000]}

Complete the task for your domain only."""
            }]
        )
        
        return response.content[0].text
```

---

## PART 6: SAFETY PROTOCOL ALIGNMENT

### 6.1 RLM Respects WAVE Safety Rules

The RLM execution environment enforces WAVE safety:

```python
# Restricted globals - NO dangerous operations
SAFE_GLOBALS = {
    'P': context,           # Context variable
    're': re,               # Regex only
    'len': len,
    'str': str,
    'int': int,
    'list': list,
    'dict': dict,
    'range': range,
    'enumerate': enumerate,
    'recursive_llm': recursive_call_fn,
    
    # FORBIDDEN - not included:
    # 'os': os,              # No file system access
    # 'subprocess': ...,     # No shell commands
    # 'open': open,          # No file I/O
    # 'requests': ...,       # No network
    # '__import__': ...,     # No dynamic imports
}
```

### 6.2 Forbidden Operations Still Apply

All 108 forbidden operations from WAVE Safety Protocol remain enforced:
- No `rm -rf` (can't access os/subprocess)
- No `DROP TABLE` (context is read-only string)
- No credential exposure (P doesn't contain secrets)
- No cross-domain access (context is domain-scoped)

### 6.3 Token Budget Enforcement

RLM tracks and limits token usage:

```python
class WaveRLMAgent:
    def __init__(self, max_tokens: int = 100000):
        self.max_tokens = max_tokens
        self.tokens_used = 0
    
    def _check_budget(self, new_tokens: int):
        if self.tokens_used + new_tokens > self.max_tokens:
            raise TokenBudgetExceeded(
                f"Budget {self.max_tokens} exceeded. Used: {self.tokens_used}"
            )
        self.tokens_used += new_tokens
```

---

## PART 7: TESTING RLM INTEGRATION

### 7.1 Unit Test: Basic RLM Pattern

```python
# test_rlm_basic.py

def test_rlm_context_not_in_prompt():
    """Verify context is NOT sent to LLM directly"""
    
    agent = WaveRLMAgent()
    
    # 100K char context
    large_context = "x" * 100000
    
    # This should NOT fail with token limit
    result = agent.completion(
        query="How many characters are in P?",
        context=large_context
    )
    
    assert "100000" in result.response or "100,000" in result.response

def test_rlm_recursive_call():
    """Verify sub-LLM calls work"""
    
    agent = WaveRLMAgent()
    context = "Section A: Hello\nSection B: World"
    
    result = agent.completion(
        query="Use recursive_llm to analyze each section separately",
        context=context
    )
    
    assert agent.sub_call_count >= 2
```

### 7.2 Integration Test: WAVE Story Execution

```python
# test_wave_rlm_story.py

async def test_story_execution_with_rlm():
    """Full story execution through RLM"""
    
    story = {
        "id": "TEST-001",
        "domain": "CLIENT",
        "title": "Add RTL support to client dashboard",
        "acceptance_criteria": "dir='rtl' on all Hebrew content",
        "implementation_details": "Update HTML lang and dir attributes"
    }
    
    result = await execute_story_with_rlm(
        story=story,
        worktree_path="/workspace/worktrees/client"
    )
    
    assert result["status"] == "completed"
    assert len(result["files_changed"]) > 0
```

---

## PART 8: QUICK REFERENCE

### 8.1 When to Use RLM

| Scenario | Use RLM? | Reason |
|----------|----------|--------|
| Analyzing full codebase | ✅ YES | Prevents context rot |
| Single file edit | ❌ NO | Direct context is fine |
| Multi-file refactor | ✅ YES | Needs exploration |
| Simple Q&A | ❌ NO | Overhead not worth it |
| Finding patterns across files | ✅ YES | Search + recursive |
| Generating new file | ❌ NO | No existing context needed |

### 8.2 RLM Decision Flowchart

```
Is context > 50K tokens?
    │
    ├─ YES → Use RLM
    │
    └─ NO → Does task require searching multiple files?
              │
              ├─ YES → Use RLM
              │
              └─ NO → Use direct context
```

### 8.3 Key Commands

```bash
# Install official RLM library
pip install rlm

# Or install from source
pip install git+https://github.com/alexzhang13/rlm.git

# Run with Docker isolation
rlm = RLM(environment="docker")

# Run WAVE agent
python wave-rlm-agent.py --story STORY-001 --domain CLIENT
```

---

## APPENDIX A: FULL WAVE + RLM DOCKER COMPOSE

```yaml
# docker-compose.wave-rlm.yml
version: '3.8'

services:
  wave-orchestrator:
    build:
      context: .
      dockerfile: Dockerfile.orchestrator
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
    volumes:
      - ./worktrees:/workspace/worktrees
      - ./signals:/workspace/signals
    depends_on:
      - supabase-db

  cto-rlm-agent:
    build:
      context: .
      dockerfile: Dockerfile.rlm-agent
    environment:
      - AGENT_ROLE=CTO
      - AGENT_MODEL=claude-sonnet-4-20250514
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./worktrees:/workspace/worktrees:ro
      - ./signals:/workspace/signals

  fe-rlm-agent:
    build:
      context: .
      dockerfile: Dockerfile.rlm-agent
    environment:
      - AGENT_ROLE=FE-DEV
      - AGENT_DOMAIN=CLIENT,PILOT,SHARED
      - AGENT_MODEL=claude-sonnet-4-20250514
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./worktrees/fe-dev:/workspace/worktree
      - ./signals:/workspace/signals

  be-rlm-agent:
    build:
      context: .
      dockerfile: Dockerfile.rlm-agent
    environment:
      - AGENT_ROLE=BE-DEV
      - AGENT_DOMAIN=AUTH,PAYMENT,BOOKING
      - AGENT_MODEL=claude-sonnet-4-20250514
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./worktrees/be-dev:/workspace/worktree
      - ./signals:/workspace/signals

  qa-rlm-agent:
    build:
      context: .
      dockerfile: Dockerfile.rlm-agent
    environment:
      - AGENT_ROLE=QA
      - AGENT_MODEL=claude-haiku-4-5-20251001
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./worktrees:/workspace/worktrees:ro
      - ./signals:/workspace/signals
```

---

## APPENDIX B: RESEARCH CITATIONS

1. **Primary Paper:**
   Zhang, A.L., Kraska, T., & Khattab, O. (2025). "Recursive Language Models." arXiv:2512.24601. MIT CSAIL.

2. **Official Repository:**
   https://github.com/alexzhang13/rlm

3. **Blog Post (Original Announcement):**
   https://alexzhang13.github.io/blog/2025/rlm/

4. **Prime Intellect Implementation:**
   https://www.primeintellect.ai/blog/rlm

---

## DOCUMENT CONTROL

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-18 | Claude (for Eli/WAVE) | Initial release |

**Status:** ACTIVE  
**Classification:** CORE METHODOLOGY  
**Review Cycle:** Update when RLM library major version changes
