"""
WAVE Database Client
Story: WAVE-P1-001

Provides database session management with singleton pattern.
"""

import os
from contextlib import contextmanager
from typing import Generator, Optional

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool

from .models import Base

# Global database engine and session factory
_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker] = None


def get_database_url() -> str:
    """
    Get database URL from environment variables.

    Returns:
        Database connection URL

    Raises:
        ValueError: If DATABASE_URL is not set
    """
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        # Fallback to constructing from individual env vars
        host = os.getenv("POSTGRES_HOST", "localhost")
        port = os.getenv("POSTGRES_PORT", "5432")
        db = os.getenv("POSTGRES_DB", "wave")
        user = os.getenv("POSTGRES_USER", "wave")
        password = os.getenv("POSTGRES_PASSWORD", "wave")
        database_url = f"postgresql://{user}:{password}@{host}:{port}/{db}"

    return database_url


def init_db(database_url: Optional[str] = None, echo: bool = False) -> Engine:
    """
    Initialize database connection and create engine.

    Args:
        database_url: Database connection URL (defaults to env vars)
        echo: Whether to echo SQL statements (useful for debugging)

    Returns:
        SQLAlchemy engine instance

    Note:
        This function is idempotent - calling it multiple times with the
        same URL will return the existing engine.
    """
    global _engine, _SessionLocal

    if _engine is not None:
        return _engine

    if database_url is None:
        database_url = get_database_url()

    # Create engine with connection pooling
    _engine = create_engine(
        database_url,
        echo=echo,
        pool_pre_ping=True,  # Verify connections before using
        pool_size=5,  # Number of connections to maintain
        max_overflow=10,  # Max connections beyond pool_size
    )

    # Create session factory
    _SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=_engine,
    )

    # Optional: Enable foreign key constraints for SQLite (not needed for PostgreSQL)
    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        if database_url and "sqlite" in database_url:
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return _engine


def get_db() -> Generator[Session, None, None]:
    """
    Get database session for use in application code.

    Yields:
        SQLAlchemy session instance

    Example:
        >>> with get_db() as db:
        >>>     sessions = db.query(WaveSession).all()

    Note:
        This is a context manager that automatically commits on success
        and rolls back on exception.
    """
    if _SessionLocal is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")

    db = _SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Alternative context manager for database sessions.

    This is an alias for get_db() that can be used with 'with' statements.

    Example:
        >>> with get_db_session() as db:
        >>>     session = db.query(WaveSession).first()
    """
    yield from get_db()


def close_db() -> None:
    """
    Close database connection and dispose of engine.

    This should be called when shutting down the application.
    """
    global _engine, _SessionLocal

    if _engine is not None:
        _engine.dispose()
        _engine = None
        _SessionLocal = None


def create_all_tables(engine: Optional[Engine] = None) -> None:
    """
    Create all tables defined in models.

    Args:
        engine: SQLAlchemy engine (defaults to global engine)

    Note:
        This is primarily for testing. In production, use Alembic migrations.
    """
    if engine is None:
        engine = _engine

    if engine is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")

    Base.metadata.create_all(bind=engine)


def drop_all_tables(engine: Optional[Engine] = None) -> None:
    """
    Drop all tables defined in models.

    Args:
        engine: SQLAlchemy engine (defaults to global engine)

    Warning:
        This will delete all data! Only use in testing or development.
    """
    if engine is None:
        engine = _engine

    if engine is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")

    Base.metadata.drop_all(bind=engine)
