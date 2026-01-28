"""
P Variable (RLM) Loader
Loads and manages the project context for agents

The P Variable contains:
- Project metadata
- Codebase structure
- Wave state (current stories, signals)
- Worktree information
- Agent memory references
"""

import os
import json
from typing import Dict, Any, Optional
from datetime import datetime, timezone


def load_p_variable(repo_path: str) -> Optional[Dict[str, Any]]:
    """
    Load the P Variable from a project's .claude directory.

    Args:
        repo_path: Path to the project root

    Returns:
        P Variable dict or None if not found
    """
    if not repo_path:
        return None

    # Try P.json first (newer format)
    p_json_path = os.path.join(repo_path, ".claude", "P.json")
    if os.path.exists(p_json_path):
        try:
            with open(p_json_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"[RLM] Warning: Failed to load P.json: {e}")

    # Try P.md as fallback (older format)
    p_md_path = os.path.join(repo_path, ".claude", "P.md")
    if os.path.exists(p_md_path):
        try:
            with open(p_md_path, 'r') as f:
                return {
                    "meta": {"format": "markdown"},
                    "content": f.read()
                }
        except IOError as e:
            print(f"[RLM] Warning: Failed to load P.md: {e}")

    return None


def load_rlm_config(repo_path: str) -> Optional[Dict[str, Any]]:
    """
    Load RLM configuration (rate limits, budget, moderation).

    Args:
        repo_path: Path to the project root

    Returns:
        RLM config dict or default config
    """
    if not repo_path:
        return get_default_rlm_config()

    config_path = os.path.join(repo_path, "config", "rlm.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"[RLM] Warning: Failed to load rlm.json: {e}")

    return get_default_rlm_config()


def get_default_rlm_config() -> Dict[str, Any]:
    """Return default RLM configuration."""
    return {
        "version": "1.0",
        "rateLimit": {
            "enabled": True,
            "maxRequestsPerMinute": 60,
            "maxTokensPerMinute": 100000,
            "maxCostPerHour": 10
        },
        "moderation": {
            "enabled": True,
            "blockList": [],
            "contentFiltering": True
        },
        "budget": {
            "enabled": True,
            "maxDailySpend": 50,
            "alertThreshold": 0.8
        }
    }


def get_project_context(p_variable: Dict[str, Any]) -> str:
    """
    Extract a concise project context string from P Variable.

    This is passed to agents as system context.

    Args:
        p_variable: The loaded P Variable

    Returns:
        Context string for agent prompts
    """
    if not p_variable:
        return ""

    meta = p_variable.get("meta", {})
    codebase = p_variable.get("codebase", {})
    wave_state = p_variable.get("wave_state", {})

    context_parts = []

    # Project info
    if meta.get("project_name"):
        context_parts.append(f"Project: {meta['project_name']}")
    if meta.get("project_root"):
        context_parts.append(f"Root: {meta['project_root']}")

    # Codebase info
    if codebase.get("file_count"):
        context_parts.append(f"Files: {codebase['file_count']}")
    if codebase.get("source_extensions"):
        context_parts.append(f"Languages: {', '.join(codebase['source_extensions'][:5])}")

    # Wave state
    if wave_state.get("current_wave"):
        context_parts.append(f"Current Wave: {wave_state['current_wave']}")
    if wave_state.get("wave_type"):
        context_parts.append(f"Wave Type: {wave_state['wave_type']}")
    if wave_state.get("stories"):
        context_parts.append(f"Stories: {len(wave_state['stories'])}")

    return "\n".join(context_parts)


def get_current_stories(p_variable: Dict[str, Any], repo_path: str) -> list:
    """
    Get the current wave's stories from P Variable.

    Args:
        p_variable: The loaded P Variable
        repo_path: Path to project root

    Returns:
        List of story dicts
    """
    if not p_variable:
        return []

    wave_state = p_variable.get("wave_state", {})
    story_files = wave_state.get("stories", [])
    wave_num = wave_state.get("current_wave", 1)

    stories = []
    stories_dir = os.path.join(repo_path, "stories", f"wave{wave_num}")

    for story_file in story_files:
        story_path = os.path.join(stories_dir, story_file)
        if os.path.exists(story_path):
            try:
                with open(story_path, 'r') as f:
                    stories.append(json.load(f))
            except (json.JSONDecodeError, IOError):
                pass

    return stories


def update_p_variable(repo_path: str, updates: Dict[str, Any]) -> bool:
    """
    Update the P Variable with new information.

    Args:
        repo_path: Path to project root
        updates: Dict of updates to merge

    Returns:
        True if successful
    """
    p_json_path = os.path.join(repo_path, ".claude", "P.json")

    # Load existing
    p_variable = load_p_variable(repo_path) or {}

    # Deep merge updates
    def deep_merge(base: dict, updates: dict) -> dict:
        for key, value in updates.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                deep_merge(base[key], value)
            else:
                base[key] = value
        return base

    p_variable = deep_merge(p_variable, updates)

    # Update timestamp
    if "meta" not in p_variable:
        p_variable["meta"] = {}
    p_variable["meta"]["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Write back
    try:
        os.makedirs(os.path.dirname(p_json_path), exist_ok=True)
        with open(p_json_path, 'w') as f:
            json.dump(p_variable, f, indent=2)
        return True
    except IOError as e:
        print(f"[RLM] Error updating P.json: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# RLM BUDGET ENFORCEMENT (Gate 0 - Grok Enhancement)
# ═══════════════════════════════════════════════════════════════════════════════

def check_rlm_budget(
    rlm_config: Dict[str, Any],
    tokens_used: int = 0,
    cost_used: float = 0.0
) -> Dict[str, Any]:
    """
    Check if current usage is within RLM budget limits.

    Args:
        rlm_config: RLM configuration dict
        tokens_used: Tokens used this minute
        cost_used: Cost used this hour/day

    Returns:
        Dict with safe status, warnings, and usage percentages
    """
    rate_limit = rlm_config.get("rateLimit", {})
    budget = rlm_config.get("budget", {})

    max_tokens = rate_limit.get("maxTokensPerMinute", 100000)
    max_cost_hour = rate_limit.get("maxCostPerHour", 10)
    max_daily = budget.get("maxDailySpend", 50)
    alert_threshold = budget.get("alertThreshold", 0.8)

    # Calculate percentages
    token_percent = (tokens_used / max_tokens * 100) if max_tokens > 0 else 0
    cost_percent = (cost_used / max_daily * 100) if max_daily > 0 else 0

    # Determine status
    token_warning = token_percent >= (alert_threshold * 100)
    cost_warning = cost_used >= (max_cost_hour * alert_threshold)
    over_limit = token_percent > 100

    return {
        "safe": not over_limit,
        "warning": token_warning or cost_warning,
        "cost_warning": cost_warning,
        "usage_percent": token_percent,
        "token_percent": token_percent,
        "cost_percent": cost_percent,
        "tokens_used": tokens_used,
        "cost_used": cost_used,
        "max_tokens": max_tokens,
        "max_daily": max_daily
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXT OPTIMIZATION (Gate 0 - Grok Enhancement)
# ═══════════════════════════════════════════════════════════════════════════════

def estimate_token_count(obj: Any) -> int:
    """
    Estimate token count for an object (rough approximation).

    Uses ~4 chars per token heuristic for JSON.

    Args:
        obj: Object to estimate tokens for

    Returns:
        Estimated token count
    """
    if obj is None:
        return 0
    try:
        json_str = json.dumps(obj)
        # Rough estimate: ~4 characters per token
        return len(json_str) // 4
    except (TypeError, ValueError):
        return 0


def prune_p_variable(p_variable: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Prune P Variable to essential fields only.

    Reduces token usage by ~30% by removing bloated fields.

    Args:
        p_variable: Full P Variable dict

    Returns:
        Pruned P Variable with only essential fields
    """
    if not p_variable:
        return {}

    # Essential fields to keep
    pruned = {}

    # Keep wave_state (current wave info)
    if "wave_state" in p_variable:
        pruned["wave_state"] = p_variable["wave_state"]

    # Keep agent_memory (context for agents)
    if "agent_memory" in p_variable:
        pruned["agent_memory"] = p_variable["agent_memory"]

    # Keep minimal meta (project name only)
    if "meta" in p_variable:
        pruned["meta"] = {
            "project_name": p_variable["meta"].get("project_name", ""),
            "project_root": p_variable["meta"].get("project_root", "")
        }

    # Keep minimal codebase info (counts only, no file lists)
    if "codebase" in p_variable:
        codebase = p_variable["codebase"]
        pruned["codebase"] = {
            "file_count": codebase.get("file_count", 0),
            "source_extensions": codebase.get("source_extensions", [])[:5]
        }

    return pruned


def get_optimized_project_context(p_variable: Dict[str, Any]) -> str:
    """
    Get optimized (pruned) project context for agent prompts.

    More concise than get_project_context() to save tokens.

    Args:
        p_variable: The loaded P Variable

    Returns:
        Concise context string
    """
    if not p_variable:
        return ""

    pruned = prune_p_variable(p_variable)
    parts = []

    meta = pruned.get("meta", {})
    if meta.get("project_name"):
        parts.append(f"Project: {meta['project_name']}")

    wave_state = pruned.get("wave_state", {})
    if wave_state.get("current_wave"):
        parts.append(f"Wave: {wave_state['current_wave']}")

    return " | ".join(parts)


# ═══════════════════════════════════════════════════════════════════════════════
# RLM BUDGET TRACKER (Gate 0 - Grok Enhancement)
# ═══════════════════════════════════════════════════════════════════════════════

class RLMBudgetTracker:
    """
    Tracks token and cost usage over time.

    Used by agents to monitor budget consumption.
    """

    def __init__(self):
        self.total_tokens = 0
        self.total_cost = 0.0
        self.tokens_this_minute = 0
        self._minute_start = datetime.now(timezone.utc)

    def add_usage(self, tokens: int = 0, cost: float = 0.0):
        """Add usage to tracker."""
        self.total_tokens += tokens
        self.total_cost += cost
        self.tokens_this_minute += tokens

    def _reset_minute_counter(self):
        """Reset per-minute counter (called when minute changes)."""
        self.tokens_this_minute = 0
        self._minute_start = datetime.now(timezone.utc)

    def get_status(self) -> Dict[str, Any]:
        """Get current usage status."""
        return {
            "total_tokens": self.total_tokens,
            "total_cost": self.total_cost,
            "tokens_this_minute": self.tokens_this_minute
        }


__all__ = [
    "load_p_variable",
    "load_rlm_config",
    "get_default_rlm_config",
    "get_project_context",
    "get_current_stories",
    "update_p_variable",
    # Gate 0 Grok Enhancements
    "check_rlm_budget",
    "estimate_token_count",
    "prune_p_variable",
    "get_optimized_project_context",
    "RLMBudgetTracker",
]
