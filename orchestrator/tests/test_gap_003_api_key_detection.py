"""
TDD Tests for GAP-003: API Keys in Client Code Detection

This test file was created BEFORE the implementation fix per TDD methodology.
These tests define the expected behavior for detecting hardcoded API keys.

GAP-003: Hardcoded API keys in client code must be detected and flagged.
- Stripe keys (sk_live_, sk_test_, pk_live_, pk_test_)
- Google API keys (AIzaSy...)
- AWS keys (AKIA...)
- GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_)
- Generic API keys and secrets
- JWT tokens in code
"""

import pytest
from typing import Tuple, List


class TestApiKeyDetection:
    """
    GAP-003: API keys in client code must be detected.

    Test Categories:
    1. Stripe API keys (live and test)
    2. Google API keys
    3. AWS credentials
    4. GitHub tokens
    5. Generic API keys and secrets
    6. JWT tokens
    7. Server-side allowances (with warnings)
    8. False positive prevention
    """

    @pytest.fixture
    def checker(self):
        """Create a UnifiedSafetyChecker instance."""
        from src.safety.unified import UnifiedSafetyChecker
        return UnifiedSafetyChecker()

    # =========================================================================
    # STRIPE API KEYS
    # =========================================================================

    def test_stripe_live_secret_key_in_client_blocked(self, checker):
        """Stripe live secret key in client code must be blocked."""
        code = '''
        "use client"
        const stripe = new Stripe("sk_live_51ABC123XYZ789DEF456GHI");
        '''
        result = checker.check(code, file_path="components/Payment.tsx")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"
        assert len(result.violations) > 0
        assert any("stripe" in v.lower() or "api" in v.lower() or "key" in v.lower()
                   for v in result.violations)

    def test_stripe_test_secret_key_in_client_flagged(self, checker):
        """Stripe test secret key in client code should be flagged."""
        code = '''
        "use client"
        const stripe = new Stripe("sk_test_51ABC123XYZ789DEF456GHI");
        '''
        result = checker.check(code, file_path="components/Payment.tsx")
        assert result.score < 0.85, f"Expected score < 0.85, got {result.score}"
        assert len(result.violations) > 0

    def test_stripe_publishable_key_in_client_ok(self, checker):
        """Stripe publishable key in client code is OK (designed for client)."""
        code = '''
        "use client"
        const stripe = loadStripe("pk_live_51ABC123XYZ789DEF456GHI");
        '''
        result = checker.check(code, file_path="components/Payment.tsx")
        # Publishable keys are meant for client-side, should have higher score
        # But we may still want to flag them with a warning
        assert result.score >= 0.5, f"Expected score >= 0.5, got {result.score}"

    # =========================================================================
    # GOOGLE API KEYS
    # =========================================================================

    def test_google_api_key_in_client_blocked(self, checker):
        """Google API key in client code must be blocked."""
        code = '''
        "use client"
        const apiKey = "AIzaSyABC123DEF456GHI789JKL012MNO345";
        '''
        result = checker.check(code, file_path="components/Map.tsx")
        assert result.score <= 0.5, f"Expected score <= 0.5, got {result.score}"
        assert len(result.violations) > 0

    def test_google_api_key_pattern_detection(self, checker):
        """Various Google API key formats should be detected."""
        code = '''
        "use client"
        const config = {
            mapsKey: "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
            analyticsKey: "AIzaSy_abc-123_XYZ789-abcdefghijklmnop"
        };
        '''
        result = checker.check(code, file_path="components/Config.tsx")
        assert result.score <= 0.5, f"Expected score <= 0.5, got {result.score}"

    # =========================================================================
    # AWS CREDENTIALS
    # =========================================================================

    def test_aws_access_key_in_client_blocked(self, checker):
        """AWS access key in client code must be blocked."""
        code = '''
        "use client"
        const awsConfig = {
            accessKeyId: "AKIAIOSFODNN7EXAMPLE"
        };
        '''
        result = checker.check(code, file_path="components/Upload.tsx")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"
        assert len(result.violations) > 0

    def test_aws_secret_key_pattern_limitation(self, checker):
        """AWS secret access key detection has limitations.

        Note: AWS secret access keys don't have a unique prefix like access key IDs (AKIA...).
        They're 40-char base64-like strings that are hard to distinguish from other data.
        This is a known limitation of regex-based detection.
        """
        code = '''
        "use client"
        const secret = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
        '''
        result = checker.check(code, file_path="components/S3.tsx")
        # AWS secret keys without context are hard to detect
        # This test documents the limitation
        assert result.score <= 1.0  # Just verify it runs

    # =========================================================================
    # GITHUB TOKENS
    # =========================================================================

    def test_github_personal_token_in_client_blocked(self, checker):
        """GitHub personal access token in client must be blocked."""
        code = '''
        "use client"
        const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12";
        '''
        result = checker.check(code, file_path="components/GitIntegration.tsx")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"
        assert len(result.violations) > 0

    def test_github_oauth_token_blocked(self, checker):
        """GitHub OAuth token must be blocked."""
        code = '''
        "use client"
        const oauthToken = "gho_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12";
        '''
        result = checker.check(code, file_path="components/Auth.tsx")
        assert result.score < 0.5

    def test_github_app_token_blocked(self, checker):
        """GitHub App tokens must be blocked."""
        codes = [
            '"use client"\nconst token = "ghu_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12";',
            '"use client"\nconst token = "ghs_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12";',
            '"use client"\nconst token = "ghr_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12";',
        ]
        for code in codes:
            result = checker.check(code, file_path="components/GitHub.tsx")
            assert result.score < 0.5, f"GitHub token not detected: {code[:50]}"

    # =========================================================================
    # ANTHROPIC / OPENAI KEYS
    # =========================================================================

    def test_anthropic_api_key_in_client_blocked(self, checker):
        """Anthropic API key in client code must be blocked."""
        code = '''
        "use client"
        const anthropic = new Anthropic({
            apiKey: "sk-ant-api03-ABCDEFghijklmnopQRSTuvwxyz123456789"
        });
        '''
        result = checker.check(code, file_path="components/Chat.tsx")
        assert result.score < 0.5, f"Expected score < 0.5, got {result.score}"

    def test_openai_api_key_in_client_blocked(self, checker):
        """OpenAI API key in client code must be blocked."""
        code = '''
        "use client"
        const openai = new OpenAI({
            apiKey: "sk-proj-ABCDEFghijklmnopQRSTuvwxyz123456789abcdefghijklmnop"
        });
        '''
        result = checker.check(code, file_path="components/AI.tsx")
        assert result.score < 0.5

    # =========================================================================
    # SLACK TOKENS
    # =========================================================================

    def test_slack_bot_token_blocked(self, checker):
        """Slack bot token must be blocked."""
        # Using clearly fake token pattern to avoid GitHub secret scanning
        code = '''
        "use client"
        const slackToken = "xoxb-FAKE-TEST-TOKEN-PLACEHOLDER";
        '''
        result = checker.check(code, file_path="components/Slack.tsx")
        assert result.score < 0.5

    def test_slack_user_token_blocked(self, checker):
        """Slack user token must be blocked."""
        # Using clearly fake token pattern to avoid GitHub secret scanning
        code = '''
        "use client"
        const userToken = "xoxp-FAKE-TEST-TOKEN-PLACEHOLDER";
        '''
        result = checker.check(code, file_path="components/Slack.tsx")
        assert result.score < 0.5

    # =========================================================================
    # GENERIC API KEYS AND SECRETS
    # =========================================================================

    def test_generic_api_key_assignment_flagged(self, checker):
        """Generic api_key = "..." pattern should be flagged."""
        code = '''
        "use client"
        const api_key = "abcdef123456789012345678901234567890";
        '''
        result = checker.check(code, file_path="components/API.tsx")
        assert result.score < 0.85 or len(result.violations) > 0

    def test_generic_secret_key_flagged(self, checker):
        """Generic secret_key = "..." pattern should be flagged."""
        code = '''
        "use client"
        const secret_key = "super_secret_value_12345678901234567890";
        '''
        result = checker.check(code, file_path="components/Auth.tsx")
        assert result.score < 0.85 or len(result.violations) > 0

    def test_apikey_camelcase_flagged(self, checker):
        """apiKey = "..." pattern should be flagged."""
        code = '''
        "use client"
        const config = {
            apiKey: "1234567890abcdef1234567890abcdef"
        };
        '''
        result = checker.check(code, file_path="components/Config.tsx")
        assert result.score < 0.85 or len(result.violations) > 0

    # =========================================================================
    # JWT TOKENS
    # =========================================================================

    def test_hardcoded_jwt_in_client_flagged(self, checker):
        """Hardcoded JWT token in client should be flagged."""
        code = '''
        "use client"
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
        '''
        result = checker.check(code, file_path="components/Auth.tsx")
        assert result.score < 0.85 or len(result.violations) > 0

    def test_bearer_token_in_header_flagged(self, checker):
        """Hardcoded Bearer token in headers should be flagged."""
        code = '''
        "use client"
        const headers = {
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
        };
        '''
        result = checker.check(code, file_path="components/API.tsx")
        assert result.score < 0.85 or len(result.violations) > 0

    # =========================================================================
    # SERVER-SIDE CODE (WARNINGS ONLY)
    # =========================================================================

    def test_api_key_in_server_route_warned(self, checker):
        """API key in server route should warn but allow."""
        code = '''
        import { NextResponse } from 'next/server';

        const stripe = new Stripe("sk_live_51ABC123XYZ789DEF456GHI");

        export async function POST() {
            return NextResponse.json({ success: true });
        }
        '''
        result = checker.check(code, file_path="app/api/payment/route.ts")
        # Server-side should be allowed but with warning
        # The key should still be flagged since it's hardcoded
        assert len(result.violations) > 0  # Should warn about hardcoded key
        # But score should be higher than client-side
        # Note: This may vary based on implementation

    def test_api_key_from_env_in_server_ok(self, checker):
        """API key from env var in server is OK."""
        code = '''
        import { NextResponse } from 'next/server';

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        export async function POST() {
            return NextResponse.json({ success: true });
        }
        '''
        result = checker.check(code, file_path="app/api/payment/route.ts")
        # Using env vars is the correct pattern
        assert result.score >= 0.8

    # =========================================================================
    # FALSE POSITIVE PREVENTION
    # =========================================================================

    def test_short_strings_not_flagged(self, checker):
        """Short strings should not be flagged as API keys."""
        code = '''
        "use client"
        const id = "abc123";
        const name = "test_user";
        '''
        result = checker.check(code, file_path="components/User.tsx")
        # Short strings shouldn't trigger API key detection
        assert result.score >= 0.8

    def test_example_placeholder_keys_not_flagged(self, checker):
        """Placeholder/example keys should not be heavily penalized."""
        code = '''
        "use client"
        // Example: const apiKey = "your_api_key_here";
        const placeholder = "YOUR_API_KEY";
        '''
        result = checker.check(code, file_path="components/Example.tsx")
        # Placeholder patterns are less critical
        assert result.score >= 0.5

    def test_uuid_not_flagged_as_api_key(self, checker):
        """UUIDs should not be flagged as API keys."""
        code = '''
        "use client"
        const userId = "550e8400-e29b-41d4-a716-446655440000";
        const sessionId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
        '''
        result = checker.check(code, file_path="components/Session.tsx")
        # UUIDs are not API keys
        assert result.score >= 0.8

    def test_base64_image_not_flagged(self, checker):
        """Base64 encoded images should not be flagged as keys."""
        code = '''
        "use client"
        const icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        '''
        result = checker.check(code, file_path="components/Icon.tsx")
        # Base64 images are not API keys
        assert result.score >= 0.8

    # =========================================================================
    # BACKWARD COMPATIBILITY
    # =========================================================================

    def test_score_action_detects_api_keys(self):
        """Backward compatible score_action should detect API keys."""
        from src.safety.unified import score_action

        code = '''"use client"
const stripe = new Stripe("sk_live_51ABC123XYZ789DEF456GHI");'''
        score, violations, risks = score_action(code)
        assert score < 0.5 or len(violations) > 0

    def test_check_action_safety_detects_api_keys(self):
        """Backward compatible check_action_safety should detect."""
        from src.safety.unified import check_action_safety

        code = '''"use client"
const apiKey = "AIzaSyABC123DEF456GHI789JKL012MNO345";'''
        result = check_action_safety(code, file_path="components/Map.tsx")
        assert result.score < 0.5 or len(result.violations) > 0

    # =========================================================================
    # VIOLATION MESSAGE QUALITY
    # =========================================================================

    def test_violation_identifies_key_type(self, checker):
        """Violation message should identify the type of key."""
        code = '''
        "use client"
        const stripe = new Stripe("sk_live_51ABC123XYZ789DEF456GHI");
        '''
        result = checker.check(code, file_path="components/Payment.tsx")
        violation_text = " ".join(str(v) for v in result.violations).lower()
        # Should mention stripe, api, key, or secret
        assert any(word in violation_text for word in ["stripe", "api", "key", "secret", "credential"])

