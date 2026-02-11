#!/usr/bin/env python3
"""
RLM Token Reduction Benchmark - AC-06 Verification
Story: WAVE-P4-001

Measures actual token reduction achieved by RLM context manager
compared to baseline (loading entire codebase).

Acceptance Criteria: Must achieve >50% token reduction

Usage:
    python tools/rlm_benchmark.py --repo /path/to/repo --domain auth
    python tools/rlm_benchmark.py --repo . --domain orchestrator --story WAVE-P4-001
"""

import argparse
import json
import logging
import os
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.rlm.context_manager import RLMContextManager
from src.rlm.token_tracker import TokenTracker, estimate_tokens

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class BenchmarkResult:
    """Results from token reduction benchmark."""
    baseline_tokens: int
    rlm_tokens: int
    reduction_tokens: int
    reduction_percent: float
    baseline_files: int
    rlm_files: int
    file_reduction_percent: float
    domain: str
    repo_path: str
    story_id: str = ""
    meets_target: bool = False
    timestamp: str = ""

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "benchmark_run": self.timestamp,
            "domain": self.domain,
            "story_id": self.story_id,
            "repository": self.repo_path,
            "baseline": {
                "total_tokens": self.baseline_tokens,
                "total_files": self.baseline_files,
            },
            "rlm": {
                "total_tokens": self.rlm_tokens,
                "total_files": self.rlm_files,
            },
            "reduction": {
                "tokens_saved": self.reduction_tokens,
                "token_reduction_percent": round(self.reduction_percent, 2),
                "files_reduced": self.baseline_files - self.rlm_files,
                "file_reduction_percent": round(self.file_reduction_percent, 2),
            },
            "target": {
                "required_reduction_percent": 50.0,
                "achieved": self.meets_target,
                "status": "✓ PASS" if self.meets_target else "✗ FAIL"
            }
        }


class RLMBenchmark:
    """Benchmark RLM token reduction."""

    def __init__(self, repo_path: str, domain: str, domain_config: dict):
        self.repo_path = Path(repo_path).resolve()
        self.domain = domain
        self.domain_config = domain_config
        self.tracker = TokenTracker()

    def measure_baseline(self) -> tuple[int, int]:
        """
        Measure baseline: load ALL files in repository.

        Returns:
            (total_tokens, file_count)
        """
        logger.info("Measuring baseline: loading entire codebase...")

        total_tokens = 0
        file_count = 0
        excluded_dirs = {
            'node_modules', '.git', '__pycache__', '.pytest_cache',
            'venv', '.venv', 'build', 'dist', '.next', 'coverage',
            '.storybook-static', 'storybook-static'
        }

        for root, dirs, files in os.walk(self.repo_path):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if d not in excluded_dirs]

            for fname in files:
                # Only count text files (common source code extensions)
                if not self._is_source_file(fname):
                    continue

                full_path = Path(root) / fname
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    tokens = estimate_tokens(content)
                    total_tokens += tokens
                    file_count += 1
                except (IOError, UnicodeDecodeError):
                    # Skip binary files or files with encoding issues
                    pass

        logger.info(f"Baseline: {file_count:,} files, {total_tokens:,} tokens")
        return total_tokens, file_count

    def measure_rlm(self, story: dict = None) -> tuple[int, int]:
        """
        Measure RLM: load only domain-scoped + story-specific files.

        Args:
            story: Optional story dict with context.read_files

        Returns:
            (total_tokens, file_count)
        """
        logger.info(f"Measuring RLM: loading domain '{self.domain}' context...")

        manager = RLMContextManager(
            domain=self.domain,
            domain_config=self.domain_config,
            repo_path=str(self.repo_path),
            max_tokens=1_000_000  # Large limit for benchmark
        )

        # Load domain context (pinned files)
        manager.load_domain_context()

        # Load story context if provided
        if story:
            logger.info(f"Loading story context: {story.get('id', 'unknown')}")
            manager.load_story_context(story)

        total_tokens = manager.total_tokens
        file_count = len(manager.loaded_files())

        logger.info(f"RLM: {file_count:,} files, {total_tokens:,} tokens")
        return total_tokens, file_count

    def run(self, story: dict = None) -> BenchmarkResult:
        """
        Run full benchmark: baseline vs RLM.

        Args:
            story: Optional story dict for story-specific context

        Returns:
            BenchmarkResult with measurements
        """
        logger.info("=" * 80)
        logger.info("RLM TOKEN REDUCTION BENCHMARK - AC-06 VERIFICATION")
        logger.info("=" * 80)

        # Measure baseline (entire codebase)
        baseline_tokens, baseline_files = self.measure_baseline()

        # Measure RLM (domain-scoped)
        rlm_tokens, rlm_files = self.measure_rlm(story)

        # Calculate reduction
        reduction_tokens = baseline_tokens - rlm_tokens
        reduction_percent = (reduction_tokens / baseline_tokens * 100) if baseline_tokens > 0 else 0
        file_reduction_percent = ((baseline_files - rlm_files) / baseline_files * 100) if baseline_files > 0 else 0

        result = BenchmarkResult(
            baseline_tokens=baseline_tokens,
            rlm_tokens=rlm_tokens,
            reduction_tokens=reduction_tokens,
            reduction_percent=reduction_percent,
            baseline_files=baseline_files,
            rlm_files=rlm_files,
            file_reduction_percent=file_reduction_percent,
            domain=self.domain,
            repo_path=str(self.repo_path),
            story_id=story.get('id', '') if story else '',
            meets_target=reduction_percent > 50.0,
            timestamp=datetime.now().isoformat()
        )

        return result

    def _is_source_file(self, filename: str) -> bool:
        """Check if file is a source code file to include in benchmark."""
        source_extensions = {
            # Code
            '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs',
            '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.swift',
            # Config/Data
            '.json', '.yaml', '.yml', '.toml', '.ini', '.env.example',
            # Markup/Docs
            '.md', '.html', '.css', '.scss', '.sql', '.graphql',
            # Scripts
            '.sh', '.bash', '.zsh', '.fish',
        }

        return any(filename.endswith(ext) for ext in source_extensions)


def load_domain_config(config_path: Path = None) -> dict:
    """Load domain configuration from file."""
    if config_path is None:
        # Try common locations
        candidates = [
            Path(__file__).parent.parent / "config" / "domain-config.json",
            Path(__file__).parent.parent / "config" / "domains.json",
            Path.cwd() / "config" / "domain-config.json",
        ]
        for candidate in candidates:
            if candidate.exists():
                config_path = candidate
                break

    if config_path and config_path.exists():
        with open(config_path) as f:
            return json.load(f)

    # Fallback: create default config for common domains
    logger.warning("No domain config found, using default configuration")
    return {
        "domains": [
            {
                "id": "orchestrator",
                "name": "WAVE Orchestrator",
                "file_patterns": [
                    "orchestrator/src/**/*.py",
                    "orchestrator/tests/**/*.py",
                    "orchestrator/*.py"
                ]
            },
            {
                "id": "portal",
                "name": "WAVE Portal",
                "file_patterns": [
                    "portal/src/**/*.ts",
                    "portal/src/**/*.tsx",
                    "portal/server/**/*.js"
                ]
            },
            {
                "id": "auth",
                "name": "Authentication",
                "file_patterns": [
                    "**/auth/**/*.ts",
                    "**/auth/**/*.tsx",
                    "**/auth/**/*.py"
                ]
            }
        ]
    }


def create_sample_story(story_id: str, domain: str) -> dict:
    """Create a sample story for testing."""
    story_files = {
        "orchestrator": [
            "orchestrator/src/rlm/context_manager.py",
            "orchestrator/src/rlm/lru_cache.py",
            "orchestrator/src/rlm/token_tracker.py"
        ],
        "portal": [
            "portal/src/App.tsx",
            "portal/src/main.tsx"
        ],
        "auth": [
            "src/features/auth/login.ts",
            "src/features/auth/register.ts"
        ]
    }

    return {
        "id": story_id,
        "title": f"Benchmark test story for {domain}",
        "context": {
            "read_files": story_files.get(domain, [])
        }
    }


def print_results(result: BenchmarkResult) -> None:
    """Print formatted benchmark results."""
    print("\n" + "=" * 80)
    print("BENCHMARK RESULTS")
    print("=" * 80)
    print(f"\nDomain:       {result.domain}")
    print(f"Repository:   {result.repo_path}")
    if result.story_id:
        print(f"Story:        {result.story_id}")
    print(f"Timestamp:    {result.timestamp}")

    print("\n" + "-" * 80)
    print("BASELINE (Entire Codebase)")
    print("-" * 80)
    print(f"Files:        {result.baseline_files:,}")
    print(f"Tokens:       {result.baseline_tokens:,}")

    print("\n" + "-" * 80)
    print("RLM (Domain-Scoped)")
    print("-" * 80)
    print(f"Files:        {result.rlm_files:,} ({result.file_reduction_percent:.1f}% reduction)")
    print(f"Tokens:       {result.rlm_tokens:,} ({result.reduction_percent:.1f}% reduction)")

    print("\n" + "-" * 80)
    print("REDUCTION")
    print("-" * 80)
    print(f"Tokens Saved: {result.reduction_tokens:,}")
    print(f"Reduction:    {result.reduction_percent:.1f}%")
    print(f"Files Saved:  {result.baseline_files - result.rlm_files:,}")

    print("\n" + "=" * 80)
    print("ACCEPTANCE CRITERIA: >50% TOKEN REDUCTION")
    print("=" * 80)
    status = "✓ PASS" if result.meets_target else "✗ FAIL"
    print(f"Target:       50.0% reduction")
    print(f"Achieved:     {result.reduction_percent:.1f}%")
    print(f"Status:       {status}")
    print("=" * 80 + "\n")


def main():
    """Main benchmark execution."""
    parser = argparse.ArgumentParser(
        description="RLM Token Reduction Benchmark (AC-06 Verification)"
    )
    parser.add_argument(
        '--repo',
        type=str,
        required=True,
        help='Path to repository to benchmark'
    )
    parser.add_argument(
        '--domain',
        type=str,
        required=True,
        help='Domain to benchmark (e.g., orchestrator, portal, auth)'
    )
    parser.add_argument(
        '--story',
        type=str,
        help='Story ID for story-specific context (optional)'
    )
    parser.add_argument(
        '--domain-config',
        type=str,
        help='Path to domain configuration file'
    )
    parser.add_argument(
        '--output',
        type=str,
        help='Output JSON file for results'
    )

    args = parser.parse_args()

    # Load domain configuration
    config_path = Path(args.domain_config) if args.domain_config else None
    domain_config = load_domain_config(config_path)

    # Create story if story ID provided
    story = None
    if args.story:
        story = create_sample_story(args.story, args.domain)

    # Run benchmark
    benchmark = RLMBenchmark(
        repo_path=args.repo,
        domain=args.domain,
        domain_config=domain_config
    )

    result = benchmark.run(story)

    # Print results
    print_results(result)

    # Save to JSON if output specified
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(result.to_dict(), f, indent=2)
        logger.info(f"Results saved to: {output_path}")

    # Exit with appropriate code
    sys.exit(0 if result.meets_target else 1)


if __name__ == "__main__":
    main()
