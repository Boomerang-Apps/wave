"""
Worktree Context Module
Context manager for executing code within a git worktree.

Based on Grok's Parallel Domain Execution Recommendations

Provides safe directory switching for worktree operations.
"""

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Any, Callable, TypeVar

T = TypeVar('T')


@contextmanager
def worktree_context(worktree_path: str) -> Generator[str, None, None]:
    """
    Context manager for executing code within a worktree directory.

    Safely changes to the worktree directory and restores the original
    working directory on exit, even if an exception occurs.

    Args:
        worktree_path: Path to the worktree directory

    Yields:
        The worktree path for use within the context

    Example:
        with worktree_context("/worktrees/abc123/auth") as path:
            # Current directory is now the worktree
            subprocess.run(["npm", "install"])
    """
    original_dir = os.getcwd()
    path = Path(worktree_path)

    try:
        # Only change directory if path exists
        # In mock mode, path may not exist
        if path.exists():
            os.chdir(path)
        yield str(path)
    finally:
        # Always restore original directory
        os.chdir(original_dir)


def execute_in_worktree(
    worktree_path: str,
    func: Callable[..., T],
    *args: Any,
    **kwargs: Any
) -> T:
    """
    Execute a function within a worktree context.

    Provides a functional alternative to the context manager.

    Args:
        worktree_path: Path to the worktree directory
        func: Function to execute
        *args: Positional arguments for the function
        **kwargs: Keyword arguments for the function

    Returns:
        The return value of the function

    Example:
        def run_tests():
            return subprocess.run(["pytest"], capture_output=True)

        result = execute_in_worktree("/worktrees/abc123/auth", run_tests)
    """
    with worktree_context(worktree_path) as path:
        return func(*args, **kwargs)


__all__ = [
    "worktree_context",
    "execute_in_worktree",
]
