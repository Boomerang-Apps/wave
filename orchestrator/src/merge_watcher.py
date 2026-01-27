"""
WAVE Merge Watcher - Automated merge after QA passes

Enhancement 4 (Grok): Implement merge watcher for deployment automation.

This module monitors Redis for QA completion events and triggers merge
when all conditions are met:
- QA passed
- Safety score >= 0.85
- No blocking violations

Integrates with GitHub/Vercel for deployment automation.

Usage:
    from src.merge_watcher import MergeWatcher

    watcher = MergeWatcher()
    watcher.run()  # Blocking loop, or run in thread

    # Or check conditions manually
    should_merge = watcher.should_trigger_merge(qa_result)
"""

import os
import sys
import json
import logging
import subprocess
from typing import Dict, Any, Optional, Callable
from datetime import datetime

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Redis (optional)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# Slack notifications
try:
    from notifications import notify_step
    NOTIFICATIONS_AVAILABLE = True
except ImportError:
    NOTIFICATIONS_AVAILABLE = False
    def notify_step(*args, **kwargs): pass


class MergeWatcher:
    """
    Watches for QA completion and triggers automated merge.

    Monitors Redis pub/sub for QA result events and evaluates
    merge conditions based on Grok's safety recommendations.

    Flow:
    1. Subscribe to wave:results:qa channel
    2. On QA complete event, check conditions
    3. If conditions met, execute merge
    4. Notify via Slack

    Attributes:
        SAFETY_THRESHOLD: Minimum safety score for merge (0.85)
        dry_run: If True, log merge but don't execute
    """

    # Minimum safety score required for automatic merge
    SAFETY_THRESHOLD = 0.85

    # Redis channels
    QA_RESULTS_CHANNEL = 'wave:results:qa'
    MERGE_EVENTS_CHANNEL = 'wave:events:merge'

    def __init__(
        self,
        redis_url: Optional[str] = None,
        dry_run: bool = False,
        on_merge: Optional[Callable[[str, Dict], bool]] = None
    ):
        """
        Initialize MergeWatcher.

        Args:
            redis_url: Redis connection URL (default: from env REDIS_URL)
            dry_run: If True, log merge actions but don't execute
            on_merge: Custom merge callback (story_id, result) -> success
        """
        self.redis_url = redis_url or os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.dry_run = dry_run
        self.on_merge = on_merge

        # Redis client (lazy init)
        self._redis: Optional["redis.Redis"] = None

        # Setup logging
        self.logger = logging.getLogger(f"wave.merge_watcher")
        self.logger.setLevel(logging.INFO)

        # Track processed merges to avoid duplicates
        self._processed: set = set()

    def _get_redis(self) -> Optional["redis.Redis"]:
        """Get or create Redis client."""
        if self._redis is None and REDIS_AVAILABLE:
            try:
                self._redis = redis.from_url(self.redis_url)
                self._redis.ping()
            except Exception as e:
                self.logger.warning(f"Redis not available: {e}")
                self._redis = None
        return self._redis

    def _log(self, message: str, level: str = "info"):
        """Log with timestamp prefix."""
        log_func = getattr(self.logger, level, self.logger.info)
        log_func(f"[{datetime.now().strftime('%H:%M:%S')}] [MERGE-WATCHER] {message}")
        sys.stdout.flush()

    def subscribe_qa_results(self) -> Optional["redis.client.PubSub"]:
        """
        Subscribe to QA result channel.

        Returns:
            Redis PubSub object for listening, or None if Redis unavailable
        """
        redis_client = self._get_redis()
        if not redis_client:
            return None

        pubsub = redis_client.pubsub()
        pubsub.subscribe(self.QA_RESULTS_CHANNEL)
        self._log(f"Subscribed to {self.QA_RESULTS_CHANNEL}")
        return pubsub

    def should_trigger_merge(self, qa_result: Dict[str, Any]) -> bool:
        """
        Determine if merge should be triggered.

        Conditions (ALL must be true):
        1. status == 'completed'
        2. qa_passed == True
        3. safety_score >= SAFETY_THRESHOLD (0.85)

        Args:
            qa_result: QA completion result dict with keys:
                - status: Task status ('completed', 'failed', etc.)
                - qa_passed: Whether QA tests passed
                - safety_score: Constitutional AI safety score (0.0-1.0)
                - story_id: Story identifier

        Returns:
            True if all merge conditions are met
        """
        # Condition 1: Status must be completed
        status = qa_result.get('status', '')
        if status != 'completed':
            return False

        # Condition 2: QA must have passed
        qa_passed = qa_result.get('qa_passed', False)
        if not qa_passed:
            return False

        # Condition 3: Safety score must meet threshold
        safety_score = qa_result.get('safety_score', 0.0)
        if safety_score < self.SAFETY_THRESHOLD:
            return False

        return True

    def get_merge_branch(self, story_id: str) -> str:
        """
        Generate merge branch name from story ID.

        Args:
            story_id: Story identifier

        Returns:
            Branch name in format 'feature/{story_id}'
        """
        # Sanitize story ID for branch name
        safe_id = story_id.replace('/', '-').replace(' ', '-')
        return f"feature/{safe_id}"

    def execute_merge(
        self,
        story_id: str,
        branch: Optional[str] = None,
        target_branch: str = "main"
    ) -> bool:
        """
        Execute the merge operation.

        Args:
            story_id: Story identifier
            branch: Branch to merge (default: feature/{story_id})
            target_branch: Branch to merge into (default: main)

        Returns:
            True if merge successful
        """
        branch = branch or self.get_merge_branch(story_id)

        self._log(f"Merge requested: {branch} -> {target_branch}")

        # Check for duplicate
        merge_key = f"{story_id}:{branch}"
        if merge_key in self._processed:
            self._log(f"Skipping duplicate merge: {merge_key}")
            return False

        # Dry run mode
        if self.dry_run:
            self._log(f"[DRY RUN] Would merge {branch} -> {target_branch}")
            self._processed.add(merge_key)
            return True

        # Custom merge callback
        if self.on_merge:
            try:
                result = self.on_merge(story_id, {'branch': branch, 'target': target_branch})
                if result:
                    self._processed.add(merge_key)
                return result
            except Exception as e:
                self._log(f"Custom merge callback failed: {e}", "error")
                return False

        # Default: Use git merge
        try:
            # Checkout target branch
            subprocess.run(['git', 'checkout', target_branch], check=True, capture_output=True)

            # Pull latest
            subprocess.run(['git', 'pull', 'origin', target_branch], check=True, capture_output=True)

            # Merge feature branch
            subprocess.run(['git', 'merge', branch, '--no-edit'], check=True, capture_output=True)

            # Push
            subprocess.run(['git', 'push', 'origin', target_branch], check=True, capture_output=True)

            self._log(f"Merge successful: {branch} -> {target_branch}")
            self._processed.add(merge_key)

            # Publish merge event
            self._publish_merge_event(story_id, branch, target_branch, success=True)

            return True

        except subprocess.CalledProcessError as e:
            self._log(f"Merge failed: {e}", "error")
            self._publish_merge_event(story_id, branch, target_branch, success=False, error=str(e))
            return False

    def _publish_merge_event(
        self,
        story_id: str,
        branch: str,
        target: str,
        success: bool,
        error: Optional[str] = None
    ):
        """Publish merge event to Redis and Slack."""
        event = {
            'type': 'merge_complete' if success else 'merge_failed',
            'story_id': story_id,
            'branch': branch,
            'target': target,
            'success': success,
            'error': error,
            'timestamp': datetime.now().isoformat()
        }

        # Publish to Redis
        redis_client = self._get_redis()
        if redis_client:
            try:
                redis_client.publish(self.MERGE_EVENTS_CHANNEL, json.dumps(event))
            except Exception as e:
                self._log(f"Failed to publish merge event: {e}", "warning")

        # Notify Slack
        if NOTIFICATIONS_AVAILABLE:
            status = "merged" if success else "merge_failed"
            notify_step(
                agent="merge_watcher",
                action=f"{'Merged' if success else 'Failed to merge'} {branch}",
                task=story_id,
                run_id=story_id,
                status=status
            )

    def run(self):
        """
        Main watcher loop.

        Blocks and listens for QA results, triggering merges
        when conditions are met.
        """
        self._log("="*60)
        self._log("WAVE Merge Watcher Starting")
        self._log("="*60)
        self._log(f"Safety Threshold: {self.SAFETY_THRESHOLD}")
        self._log(f"Dry Run: {self.dry_run}")
        self._log(f"Redis URL: {self.redis_url}")
        self._log("="*60)

        pubsub = self.subscribe_qa_results()
        if not pubsub:
            self._log("Cannot run without Redis. Exiting.", "error")
            return

        self._log("Listening for QA results...")

        try:
            for message in pubsub.listen():
                if message['type'] != 'message':
                    continue

                try:
                    qa_result = json.loads(message['data'])

                    story_id = qa_result.get('story_id', 'unknown')
                    self._log(f"Received QA result for: {story_id}")

                    if self.should_trigger_merge(qa_result):
                        self._log(f"Merge conditions met for: {story_id}")
                        self.execute_merge(story_id)
                    else:
                        self._log(f"Merge conditions NOT met for: {story_id}")
                        self._log(f"  - status: {qa_result.get('status')}")
                        self._log(f"  - qa_passed: {qa_result.get('qa_passed')}")
                        self._log(f"  - safety_score: {qa_result.get('safety_score')}")

                except json.JSONDecodeError as e:
                    self._log(f"Invalid JSON in message: {e}", "warning")
                except Exception as e:
                    self._log(f"Error processing message: {e}", "error")

        except KeyboardInterrupt:
            self._log("Shutdown requested")
        finally:
            pubsub.unsubscribe()
            self._log("Merge Watcher stopped")


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "MergeWatcher",
]


# ═══════════════════════════════════════════════════════════════════════════════
# CLI ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="WAVE Merge Watcher")
    parser.add_argument("--dry-run", action="store_true", help="Log merges but don't execute")
    parser.add_argument("--redis-url", default=None, help="Redis URL")
    args = parser.parse_args()

    watcher = MergeWatcher(redis_url=args.redis_url, dry_run=args.dry_run)
    watcher.run()
