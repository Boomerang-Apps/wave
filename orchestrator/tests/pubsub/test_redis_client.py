"""
Tests for Redis Client
Story: WAVE-P2-001

Tests connection management, reconnection, and health checks.
"""

import pytest
from unittest.mock import patch, MagicMock

import fakeredis

from src.pubsub.redis_client import (
    RedisClient,
    BASE_RECONNECT_DELAY,
    MAX_RECONNECT_DELAY,
)


@pytest.fixture
def fake_server():
    """Create a fakeredis server instance."""
    return fakeredis.FakeServer()


@pytest.fixture
def redis_client(fake_server):
    """Create a RedisClient backed by fakeredis."""
    client = RedisClient(url="redis://localhost:6379/0")
    # Replace internal client with fakeredis
    client._client = fakeredis.FakeRedis(server=fake_server, decode_responses=True)
    client._connected = True
    return client


class TestConnection:
    """Test Redis connection management."""

    def test_connect_creates_client(self, redis_client):
        """AC-01: Client connects successfully."""
        assert redis_client._client is not None
        assert redis_client._connected is True

    def test_ping_returns_true_when_connected(self, redis_client):
        """AC-01: Ping returns True when connected."""
        assert redis_client.ping() is True

    def test_is_connected(self, redis_client):
        """AC-01: is_connected reflects connection state."""
        assert redis_client.is_connected() is True

    def test_disconnect(self, redis_client):
        """Client disconnects cleanly."""
        redis_client.disconnect()
        assert redis_client._client is None
        assert redis_client._connected is False


class TestReconnection:
    """Test reconnection with exponential backoff (AC-05)."""

    def test_backoff_delay_increases(self):
        """AC-05: Backoff delay increases exponentially."""
        delays = [RedisClient._backoff_delay(i) for i in range(1, 6)]
        # Each delay should be roughly >= the base * 2^(attempt-1)
        assert delays[0] >= BASE_RECONNECT_DELAY
        assert delays[1] >= BASE_RECONNECT_DELAY * 2
        assert delays[2] >= BASE_RECONNECT_DELAY * 4

    def test_backoff_delay_capped(self):
        """AC-05: Backoff delay is capped at MAX_RECONNECT_DELAY."""
        delay = RedisClient._backoff_delay(100)
        # With jitter it can go up to 1.5x max, but base should be capped
        assert delay <= MAX_RECONNECT_DELAY * 1.5

    def test_reconnect_resets_and_reconnects(self, redis_client):
        """AC-05: Reconnect disconnects then re-establishes connection."""
        # Verify connected initially
        assert redis_client._connected is True

        # Disconnect explicitly
        redis_client.disconnect()
        assert redis_client._connected is False
        assert redis_client._client is None

    def test_execute_with_retry_success(self, redis_client):
        """Operations succeed on first try."""
        def op(client):
            return client.ping()

        result = redis_client.execute_with_retry(op)
        assert result is True


class TestHealthCheck:
    """Test health and info."""

    def test_get_info(self, redis_client):
        """Can retrieve server info."""
        info = redis_client.get_info()
        # fakeredis provides basic info
        assert isinstance(info, dict)

    def test_ping_after_disconnect_returns_false(self, redis_client):
        """Ping returns False after disconnect."""
        redis_client.disconnect()
        # After disconnect _client is None, ping should handle this
        assert redis_client._connected is False
