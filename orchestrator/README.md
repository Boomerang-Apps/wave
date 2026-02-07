# WAVE Orchestrator

LangGraph-based orchestrator for WAVE (Workflow Automation for Verified Execution).

## Database Layer

Story: WAVE-P1-001

### Overview

PostgreSQL-based state persistence using SQLAlchemy ORM with repository pattern for CRUD operations.

### Architecture

```
src/db/
├── __init__.py          # Package exports
├── models.py            # SQLAlchemy ORM models
├── client.py            # Database session management
├── sessions.py          # SessionRepository
├── checkpoints.py       # CheckpointRepository
└── story_executions.py  # StoryExecutionRepository
```

### Models

**WaveSession**
- Tracks wave execution sessions with budget and progress
- Status: pending, in_progress, completed, failed, cancelled
- Budget tracking: budget_usd, actual_cost_usd
- Story metrics: story_count, stories_completed, stories_failed

**WaveCheckpoint**
- State checkpoints for crash recovery
- Types: gate, story_start, story_complete, agent_handoff, error, manual
- Gates: gate-0 through gate-7
- Hierarchical: supports parent_checkpoint_id

**WaveStoryExecution**
- Individual story execution tracking
- Status: pending, in_progress, blocked, review, complete, failed, cancelled
- Metrics: token_count, cost_usd, retry_count
- Acceptance criteria: passed/total counts
- Code changes: files_created, files_modified arrays
- Git integration: branch_name, commit_sha, pr_url

### Usage

#### Initialize Database

```python
from src.db import init_db, close_db

# Initialize connection (idempotent)
engine = init_db()

# On shutdown
close_db()
```

#### Session Management

```python
from src.db import get_db, SessionRepository

with get_db() as db:
    repo = SessionRepository(db)

    # Create session
    session = repo.create(
        project_name="my-project",
        wave_number=1,
        budget_usd=Decimal("5.00")
    )

    # Start execution
    repo.start_session(session.id)

    # Update progress
    repo.update_progress(
        session.id,
        story_count=10,
        stories_completed=5,
        actual_cost_usd=Decimal("1.25")
    )

    # Complete
    repo.complete_session(session.id)
```

#### Checkpoint Management

```python
from src.db import get_db, CheckpointRepository

with get_db() as db:
    repo = CheckpointRepository(db)

    # Create gate checkpoint
    checkpoint = repo.create(
        session_id=session.id,
        checkpoint_type="gate",
        checkpoint_name="Gate 1: Self-Review",
        state={"ac_passed": 5, "ac_total": 5},
        story_id="AUTH-001",
        gate="gate-1"
    )

    # Get latest checkpoint for recovery
    latest = repo.get_latest_by_session(session.id)
```

#### Story Execution Tracking

```python
from src.db import get_db, StoryExecutionRepository

with get_db() as db:
    repo = StoryExecutionRepository(db)

    # Create execution
    execution = repo.create(
        session_id=session.id,
        story_id="AUTH-001",
        story_title="Implement User Login",
        domain="auth",
        agent="BE-Dev"
    )

    # Start execution
    repo.start_execution(execution.id)

    # Update metrics
    repo.update_metrics(
        execution.id,
        token_count=5000,
        cost_usd=Decimal("0.15")
    )

    # Complete with results
    repo.complete_execution(
        execution.id,
        tests_passing=True,
        coverage_achieved=Decimal("85.5"),
        files_created=["src/auth/login.py"],
        files_modified=["src/auth/__init__.py"],
        branch_name="feature/AUTH-001",
        commit_sha="abc123",
        pr_url="https://github.com/org/repo/pull/42"
    )
```

### Environment Variables

```bash
# Database URL (primary)
DATABASE_URL=postgresql://wave:wave@localhost:5432/wave

# OR individual components
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=wave
POSTGRES_USER=wave
POSTGRES_PASSWORD=wave
```

### Running Migrations

Migrations are located in `orchestrator/migrations/` and run automatically when using Docker:

```bash
# Via docker-compose (automatic)
docker compose -f docker-compose.wave.yml up postgres

# Manual migration
psql $DATABASE_URL < orchestrator/migrations/001_initial_schema.sql
```

### Testing

```bash
cd orchestrator
source venv/bin/activate

# Run all database tests
pytest tests/db/ -v

# Run specific test file
pytest tests/db/test_sessions.py -v

# Run with coverage
pytest tests/db/ --cov=src/db --cov-report=html
```

Tests use in-memory SQLite for speed. Production uses PostgreSQL.

### Schema Compatibility

The codebase uses database-agnostic types:
- `JSONType`: JSONB on PostgreSQL, JSON on SQLite
- `ArrayType`: ARRAY on PostgreSQL, JSON on SQLite
- `meta_data` attribute: Maps to `metadata` column (avoids SQLAlchemy reserved name)

### Repository Pattern Benefits

- **Encapsulation**: Database logic isolated from business logic
- **Testability**: Easy to mock repositories for unit tests
- **Type Safety**: Strong typing with SQLAlchemy models
- **Transaction Management**: Automatic commit/rollback via context managers
- **Query Optimization**: Centralized query logic for performance tuning

### Next Steps

- WAVE-P1-002: Story execution state machine with checkpointing
- WAVE-P1-003: Recovery mechanisms for crashed workflows
