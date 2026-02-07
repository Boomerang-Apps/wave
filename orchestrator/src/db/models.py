"""
WAVE SQLAlchemy ORM Models
Story: WAVE-P1-001

Maps to PostgreSQL schema defined in migrations/001_initial_schema.sql
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4

from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
    DateTime,
    Boolean,
    Text,
    ForeignKey,
    CheckConstraint,
    ARRAY,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB, ARRAY as PG_ARRAY
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

# Use JSONB for PostgreSQL, JSON for other databases (like SQLite in tests)
JSONType = JSON().with_variant(JSONB(), "postgresql")

# Use ARRAY for PostgreSQL, JSON for other databases (SQLite doesn't support ARRAY)
ArrayType = JSON().with_variant(PG_ARRAY(Text), "postgresql")


class WaveSession(Base):
    """
    Tracks wave execution sessions with metadata and status.

    Maps to: wave_sessions table
    """
    __tablename__ = "wave_sessions"

    # Primary Key
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Core Fields
    project_name = Column(String(255), nullable=False)
    wave_number = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default="pending")

    # Timestamps
    started_at = Column(DateTime(timezone=True), default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)

    # Budget & Cost Tracking
    budget_usd = Column(Numeric(10, 2), default=Decimal("2.00"))
    actual_cost_usd = Column(Numeric(10, 2), default=Decimal("0.00"))

    # Story Tracking
    token_count = Column(Integer, default=0)
    story_count = Column(Integer, default=0)
    stories_completed = Column(Integer, default=0)
    stories_failed = Column(Integer, default=0)

    # Metadata (using meta_data to avoid SQLAlchemy reserved name)
    meta_data = Column("metadata", JSONType, default=dict)

    # System Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    checkpoints = relationship(
        "WaveCheckpoint",
        back_populates="session",
        cascade="all, delete-orphan",
    )
    story_executions = relationship(
        "WaveStoryExecution",
        back_populates="session",
        cascade="all, delete-orphan",
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')",
            name="wave_sessions_status_check",
        ),
        CheckConstraint(
            "wave_number >= 0",
            name="wave_sessions_wave_number_check",
        ),
        CheckConstraint(
            "budget_usd >= 0",
            name="wave_sessions_budget_check",
        ),
        CheckConstraint(
            "actual_cost_usd >= 0",
            name="wave_sessions_cost_check",
        ),
    )

    def __repr__(self) -> str:
        return f"<WaveSession(id={self.id}, project={self.project_name}, wave={self.wave_number}, status={self.status})>"


class WaveCheckpoint(Base):
    """
    Stores state checkpoints for crash recovery and session resumption.

    Maps to: wave_checkpoints table
    """
    __tablename__ = "wave_checkpoints"

    # Primary Key
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign Key
    session_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("wave_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Core Fields
    checkpoint_type = Column(String(50), nullable=False)
    checkpoint_name = Column(String(255), nullable=False)
    story_id = Column(String(100), nullable=True)
    gate = Column(String(20), nullable=True)
    state = Column(JSONType, nullable=False)
    agent_id = Column(String(100), nullable=True)

    # Self-referential Foreign Key
    parent_checkpoint_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("wave_checkpoints.id"),
        nullable=True,
    )

    # Timestamp
    created_at = Column(DateTime(timezone=True), default=func.now())

    # Relationships
    session = relationship("WaveSession", back_populates="checkpoints")
    parent_checkpoint = relationship(
        "WaveCheckpoint",
        remote_side=[id],
        backref="child_checkpoints",
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "checkpoint_type IN ('gate', 'story_start', 'story_complete', 'agent_handoff', 'error', 'manual')",
            name="wave_checkpoints_type_check",
        ),
        CheckConstraint(
            "gate IS NULL OR gate IN ('gate-0', 'gate-1', 'gate-2', 'gate-3', 'gate-4', 'gate-5', 'gate-6', 'gate-7')",
            name="wave_checkpoints_gate_check",
        ),
    )

    def __repr__(self) -> str:
        return f"<WaveCheckpoint(id={self.id}, type={self.checkpoint_type}, name={self.checkpoint_name})>"


class WaveStoryExecution(Base):
    """
    Tracks individual story execution with detailed metrics and results.

    Maps to: wave_story_executions table
    """
    __tablename__ = "wave_story_executions"

    # Primary Key
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign Key
    session_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("wave_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Story Identification
    story_id = Column(String(100), nullable=False)
    story_title = Column(String(255), nullable=False)
    domain = Column(String(100), nullable=False)
    agent = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="pending")

    # Story Metadata
    priority = Column(String(20), nullable=True)
    story_points = Column(Integer, nullable=True)

    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)

    # Execution Metrics
    token_count = Column(Integer, default=0)
    cost_usd = Column(Numeric(10, 4), default=Decimal("0.00"))
    retry_count = Column(Integer, default=0)

    # Acceptance Criteria
    acceptance_criteria_passed = Column(Integer, default=0)
    acceptance_criteria_total = Column(Integer, default=0)

    # Test & Coverage
    tests_passing = Column(Boolean, default=False)
    coverage_achieved = Column(Numeric(5, 2), nullable=True)

    # Code Changes
    files_created = Column(ArrayType, nullable=True)
    files_modified = Column(ArrayType, nullable=True)

    # Git Integration
    branch_name = Column(String(255), nullable=True)
    commit_sha = Column(String(40), nullable=True)
    pr_url = Column(String(500), nullable=True)

    # Error Handling
    error_message = Column(Text, nullable=True)

    # Metadata (using meta_data to avoid SQLAlchemy reserved name)
    meta_data = Column("metadata", JSONType, default=dict)

    # System Timestamps
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    session = relationship("WaveSession", back_populates="story_executions")

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'in_progress', 'blocked', 'review', 'complete', 'failed', 'cancelled')",
            name="wave_story_executions_status_check",
        ),
        CheckConstraint(
            "retry_count >= 0",
            name="wave_story_executions_retry_check",
        ),
        CheckConstraint(
            "cost_usd >= 0",
            name="wave_story_executions_cost_check",
        ),
        CheckConstraint(
            "acceptance_criteria_passed <= acceptance_criteria_total",
            name="wave_story_executions_ac_check",
        ),
    )

    def __repr__(self) -> str:
        return f"<WaveStoryExecution(id={self.id}, story_id={self.story_id}, status={self.status})>"
