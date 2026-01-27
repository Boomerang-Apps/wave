"""
TDD Tests for Enhancement 4: Merge Watcher

Grok Recommendation: Implement merge watcher for automated
merge after QA passes with safety >= 0.85.
"""

import pytest


class TestMergeWatcherClass:
    """Test MergeWatcher class existence and initialization"""

    def test_merge_watcher_class_exists(self):
        """MergeWatcher class should exist"""
        from src.merge_watcher import MergeWatcher

        assert MergeWatcher is not None

    def test_merge_watcher_instantiation(self):
        """MergeWatcher should be instantiable"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()
        assert watcher is not None

    def test_merge_watcher_has_safety_threshold(self):
        """MergeWatcher should have SAFETY_THRESHOLD constant"""
        from src.merge_watcher import MergeWatcher

        assert hasattr(MergeWatcher, 'SAFETY_THRESHOLD')
        assert MergeWatcher.SAFETY_THRESHOLD == 0.85


class TestMergeWatcherMethods:
    """Test MergeWatcher method existence"""

    def test_subscribe_qa_results_exists(self):
        """subscribe_qa_results() method should exist"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()
        assert hasattr(watcher, 'subscribe_qa_results')
        assert callable(watcher.subscribe_qa_results)

    def test_should_trigger_merge_exists(self):
        """should_trigger_merge() method should exist"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()
        assert hasattr(watcher, 'should_trigger_merge')
        assert callable(watcher.should_trigger_merge)

    def test_execute_merge_exists(self):
        """execute_merge() method should exist"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()
        assert hasattr(watcher, 'execute_merge')
        assert callable(watcher.execute_merge)


class TestShouldTriggerMerge:
    """Test should_trigger_merge() logic"""

    def test_trigger_on_qa_pass_and_high_safety(self):
        """Should trigger merge when QA passes with safety >= 0.85"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()

        qa_result = {
            'status': 'completed',
            'qa_passed': True,
            'safety_score': 0.92,
            'story_id': 'TEST-001'
        }

        assert watcher.should_trigger_merge(qa_result) is True

    def test_no_trigger_on_qa_fail(self):
        """Should NOT trigger merge when QA fails"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()

        qa_result = {
            'status': 'completed',
            'qa_passed': False,
            'safety_score': 0.92,
            'story_id': 'TEST-001'
        }

        assert watcher.should_trigger_merge(qa_result) is False

    def test_no_trigger_on_low_safety(self):
        """Should NOT trigger merge when safety < 0.85"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()

        qa_result = {
            'status': 'completed',
            'qa_passed': True,
            'safety_score': 0.70,
            'story_id': 'TEST-001'
        }

        assert watcher.should_trigger_merge(qa_result) is False

    def test_no_trigger_on_incomplete_status(self):
        """Should NOT trigger merge when status is not 'completed'"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()

        qa_result = {
            'status': 'in_progress',
            'qa_passed': True,
            'safety_score': 0.92,
            'story_id': 'TEST-001'
        }

        assert watcher.should_trigger_merge(qa_result) is False

    def test_trigger_at_exact_threshold(self):
        """Should trigger merge when safety is exactly 0.85"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()

        qa_result = {
            'status': 'completed',
            'qa_passed': True,
            'safety_score': 0.85,
            'story_id': 'TEST-001'
        }

        assert watcher.should_trigger_merge(qa_result) is True

    def test_no_trigger_just_below_threshold(self):
        """Should NOT trigger merge when safety is 0.84"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()

        qa_result = {
            'status': 'completed',
            'qa_passed': True,
            'safety_score': 0.84,
            'story_id': 'TEST-001'
        }

        assert watcher.should_trigger_merge(qa_result) is False


class TestMergeWatcherIntegration:
    """Test MergeWatcher integration scenarios"""

    def test_handles_missing_qa_passed(self):
        """Should handle missing qa_passed key (default to False)"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()

        qa_result = {
            'status': 'completed',
            'safety_score': 0.92,
            'story_id': 'TEST-001'
        }

        # Missing qa_passed should default to False, no merge
        assert watcher.should_trigger_merge(qa_result) is False

    def test_handles_missing_safety_score(self):
        """Should handle missing safety_score key (default to 0)"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()

        qa_result = {
            'status': 'completed',
            'qa_passed': True,
            'story_id': 'TEST-001'
        }

        # Missing safety_score should default to 0, no merge
        assert watcher.should_trigger_merge(qa_result) is False

    def test_dry_run_mode(self):
        """MergeWatcher should support dry_run mode"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher(dry_run=True)
        assert watcher.dry_run is True

    def test_get_merge_branch(self):
        """Should generate correct merge branch name"""
        from src.merge_watcher import MergeWatcher

        watcher = MergeWatcher()

        branch = watcher.get_merge_branch('STORY-123')
        assert 'STORY-123' in branch
