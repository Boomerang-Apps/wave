"""
WAVE Redis Client
Story: WAVE-P2-001

Redis connection management with auto-reconnection and health checks (AC-01, AC-05).
"""

import os
import time
import logging
import random
from typing import Optional

import redis
from redis.exceptions import ConnectionError, RedisError

logger = logging.getLogger(__name__)


# Default configuration
DEFAULT_REDIS_URL = "redis://localhost:6379/0"
MAX_RECONNECT_ATTEMPTS = 10
BASE_RECONNECT_DELAY = 0.1  # 100ms
MAX_RECONNECT_DELAY = 5.0  # 5s cap
HEALTH_CHECK_INTERVAL = 30  # seconds


class RedisClient:
    """
    Managed Redis client with connection pooling and auto-reconnection.

    Features:
    - Connection pooling via redis-py
    - Exponential backoff with jitter on reconnect (AC-05)
    - Health check support
    - Singleton-safe per URL
    """

    def __init__(
        self,
        url: Optional[str] = None,
        max_reconnect_attempts: int = MAX_RECONNECT_ATTEMPTS,
        decode_responses: bool = True,
    ):
        """
        Initialize Redis client.

        Args:
            url: Redis connection URL (defaults to REDIS_URL env var or localhost)
            max_reconnect_attempts: Max reconnection attempts before giving up
            decode_responses: Whether to decode bytes to strings
        """
        self.url = url or os.getenv("REDIS_URL", DEFAULT_REDIS_URL)
        self.max_reconnect_attempts = max_reconnect_attempts
        self.decode_responses = decode_responses
        self._client: Optional[redis.Redis] = None
        self._connected = False
        self._reconnect_count = 0

    @property
    def client(self) -> redis.Redis:
        """Get the underlying redis client, connecting if needed."""
        if self._client is None:
            self.connect()
        return self._client

    def connect(self) -> redis.Redis:
        """
        Establish connection to Redis.

        Returns:
            Connected redis.Redis instance

        Raises:
            ConnectionError: If connection fails after all retries
        """
        if self._client is not None and self._connected:
            return self._client

        self._client = redis.Redis.from_url(
            self.url,
            decode_responses=self.decode_responses,
            health_check_interval=HEALTH_CHECK_INTERVAL,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )

        # Verify connection
        try:
            self._client.ping()
            self._connected = True
            self._reconnect_count = 0
            logger.info("Connected to Redis at %s", self.url)
        except ConnectionError as e:
            self._connected = False
            logger.warning("Initial Redis connection failed: %s", e)
            self._attempt_reconnect()

        return self._client

    def disconnect(self) -> None:
        """Close the Redis connection."""
        if self._client is not None:
            try:
                self._client.close()
            except RedisError:
                pass
            self._client = None
            self._connected = False
            logger.info("Disconnected from Redis")

    def ping(self) -> bool:
        """
        Check if Redis is reachable.

        Returns:
            True if Redis responds to PING
        """
        try:
            return self.client.ping()
        except (ConnectionError, RedisError):
            self._connected = False
            return False

    def is_connected(self) -> bool:
        """Check if currently connected."""
        if not self._connected or self._client is None:
            return False
        return self.ping()

    def reconnect(self) -> bool:
        """
        Force reconnection to Redis (AC-05).

        Returns:
            True if reconnection succeeded
        """
        self.disconnect()
        try:
            self.connect()
            return self._connected
        except ConnectionError:
            return False

    def _attempt_reconnect(self) -> None:
        """
        Attempt reconnection with exponential backoff and jitter.

        Raises:
            ConnectionError: If all attempts fail
        """
        for attempt in range(1, self.max_reconnect_attempts + 1):
            delay = self._backoff_delay(attempt)
            logger.info(
                "Reconnection attempt %d/%d in %.2fs",
                attempt,
                self.max_reconnect_attempts,
                delay,
            )
            time.sleep(delay)

            try:
                self._client.ping()
                self._connected = True
                self._reconnect_count = attempt
                logger.info("Reconnected to Redis on attempt %d", attempt)
                return
            except (ConnectionError, RedisError) as e:
                logger.warning("Reconnection attempt %d failed: %s", attempt, e)

        self._connected = False
        raise ConnectionError(
            f"Failed to connect to Redis after {self.max_reconnect_attempts} attempts"
        )

    @staticmethod
    def _backoff_delay(attempt: int) -> float:
        """
        Calculate exponential backoff delay with jitter.

        Args:
            attempt: Current attempt number (1-based)

        Returns:
            Delay in seconds
        """
        delay = min(
            BASE_RECONNECT_DELAY * (2 ** (attempt - 1)),
            MAX_RECONNECT_DELAY,
        )
        # Add jitter (0-50% of delay)
        jitter = delay * random.random() * 0.5
        return delay + jitter

    def execute_with_retry(self, operation, *args, **kwargs):
        """
        Execute a Redis operation with automatic reconnection on failure.

        Args:
            operation: Callable that takes a redis client as first arg
            *args: Additional arguments
            **kwargs: Additional keyword arguments

        Returns:
            Result of the operation

        Raises:
            ConnectionError: If reconnection fails
            RedisError: If operation fails for non-connection reasons
        """
        try:
            return operation(self.client, *args, **kwargs)
        except ConnectionError:
            logger.warning("Connection lost, attempting reconnect...")
            if self.reconnect():
                return operation(self.client, *args, **kwargs)
            raise

    def get_info(self) -> dict:
        """Get Redis server info."""
        try:
            info = self.client.info()
            return {
                "redis_version": info.get("redis_version"),
                "connected_clients": info.get("connected_clients"),
                "used_memory_human": info.get("used_memory_human"),
                "uptime_in_seconds": info.get("uptime_in_seconds"),
            }
        except (ConnectionError, RedisError):
            return {"error": "Not connected"}
