"""
TDD Tests for Enhancement 3: P006 Explicit Triggers

Grok Recommendation: Add explicit triggers for P006 (Escalate Uncertainty)
instead of relying solely on LLM judgment.
"""

import pytest


class TestP006Constants:
    """Test P006 constants and configuration"""

    def test_ambiguous_keywords_constant_exists(self):
        """AMBIGUOUS_KEYWORDS constant should be defined"""
        from src.safety.constitutional import AMBIGUOUS_KEYWORDS

        assert AMBIGUOUS_KEYWORDS is not None
        assert isinstance(AMBIGUOUS_KEYWORDS, (list, tuple))

    def test_ambiguous_keywords_contains_expected(self):
        """AMBIGUOUS_KEYWORDS should contain expected keywords"""
        from src.safety.constitutional import AMBIGUOUS_KEYWORDS

        expected = ['maybe', 'perhaps', 'TBD', 'unclear', 'might']
        for keyword in expected:
            assert keyword in AMBIGUOUS_KEYWORDS, f"Missing keyword: {keyword}"

    def test_confidence_threshold_constant_exists(self):
        """CONFIDENCE_THRESHOLD constant should be defined"""
        from src.safety.constitutional import CONFIDENCE_THRESHOLD

        assert CONFIDENCE_THRESHOLD is not None
        assert isinstance(CONFIDENCE_THRESHOLD, float)

    def test_confidence_threshold_is_0_6(self):
        """CONFIDENCE_THRESHOLD should be 0.6"""
        from src.safety.constitutional import CONFIDENCE_THRESHOLD

        assert CONFIDENCE_THRESHOLD == 0.6, f"Expected 0.6, got {CONFIDENCE_THRESHOLD}"


class TestShouldEscalateP006:
    """Test should_escalate_p006() function"""

    def test_function_exists(self):
        """should_escalate_p006() function should exist"""
        from src.safety.constitutional import should_escalate_p006

        assert callable(should_escalate_p006)

    def test_escalate_on_low_confidence(self):
        """Should escalate when confidence_score < 0.6"""
        from src.safety.constitutional import should_escalate_p006

        result = {
            'confidence_score': 0.5,
            'decision': 'proceed'
        }

        assert should_escalate_p006(result) is True

    def test_no_escalate_on_high_confidence(self):
        """Should NOT escalate when confidence_score >= 0.6"""
        from src.safety.constitutional import should_escalate_p006

        result = {
            'confidence_score': 0.8,
            'decision': 'proceed',
            'requirements': 'Create a login button'
        }

        assert should_escalate_p006(result) is False

    def test_escalate_on_ambiguous_keywords(self):
        """Should escalate when requirements contain ambiguous keywords"""
        from src.safety.constitutional import should_escalate_p006

        result = {
            'requirements': 'Maybe implement some kind of auth system?',
            'confidence_score': 0.9
        }

        assert should_escalate_p006(result) is True

    def test_escalate_on_tbd(self):
        """Should escalate when requirements contain TBD"""
        from src.safety.constitutional import should_escalate_p006

        result = {
            'requirements': 'Implement auth - method TBD',
            'confidence_score': 0.9
        }

        assert should_escalate_p006(result) is True

    def test_escalate_on_multiple_options_no_selection(self):
        """Should escalate when multiple options exist without selection"""
        from src.safety.constitutional import should_escalate_p006

        result = {
            'options': ['Option A', 'Option B', 'Option C'],
            'selected': None,
            'confidence_score': 0.9
        }

        assert should_escalate_p006(result) is True

    def test_no_escalate_when_option_selected(self):
        """Should NOT escalate when option is selected"""
        from src.safety.constitutional import should_escalate_p006

        result = {
            'options': ['Option A', 'Option B'],
            'selected': 'Option A',
            'confidence_score': 0.9
        }

        assert should_escalate_p006(result) is False

    def test_escalate_on_unsure_decision(self):
        """Should escalate when decision is 'unsure'"""
        from src.safety.constitutional import should_escalate_p006

        result = {
            'decision': 'unsure',
            'confidence_score': 0.9
        }

        assert should_escalate_p006(result) is True

    def test_escalate_on_uncertain_decision(self):
        """Should escalate when decision is 'uncertain'"""
        from src.safety.constitutional import should_escalate_p006

        result = {
            'decision': 'uncertain',
            'confidence_score': 0.9
        }

        assert should_escalate_p006(result) is True


class TestAmbiguousKeywordDetection:
    """Test ambiguous keyword detection edge cases"""

    def test_case_insensitive_matching(self):
        """Keyword matching should be case-insensitive"""
        from src.safety.constitutional import should_escalate_p006

        result = {
            'requirements': 'MAYBE we should use React?',
            'confidence_score': 0.9
        }

        assert should_escalate_p006(result) is True

    def test_keyword_in_middle_of_text(self):
        """Should detect keyword in middle of text"""
        from src.safety.constitutional import should_escalate_p006

        result = {
            'requirements': 'The user might want to see their profile',
            'confidence_score': 0.9
        }

        assert should_escalate_p006(result) is True

    def test_empty_requirements_no_escalate(self):
        """Empty requirements should not escalate (no keywords)"""
        from src.safety.constitutional import should_escalate_p006

        result = {
            'requirements': '',
            'confidence_score': 0.9
        }

        assert should_escalate_p006(result) is False

    def test_clear_requirements_no_escalate(self):
        """Clear, specific requirements should not escalate"""
        from src.safety.constitutional import should_escalate_p006

        result = {
            'requirements': 'Create a blue login button with 12px padding',
            'confidence_score': 0.95,
            'decision': 'clear'
        }

        assert should_escalate_p006(result) is False
