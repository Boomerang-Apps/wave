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

## Session Recovery

Story: WAVE-P1-003

### Overview

The WAVE orchestrator provides robust crash recovery mechanisms that restore interrupted workflows from checkpoints. Recovery operations complete in <5 seconds (typically <0.01s), ensuring minimal downtime during failures.

### Architecture

```
src/
├── recovery/
│   ├── __init__.py           # Package exports
│   └── recovery_manager.py   # RecoveryManager, RecoveryStrategy
├── checkpoint/
│   └── langgraph_checkpointer.py  # WAVECheckpointSaver (LangGraph integration)
└── db/
    ├── checkpoints.py        # CheckpointRepository
    └── story_executions.py   # StoryExecutionRepository
```

### Recovery Strategies

**RESUME_FROM_LAST**
- Resume from most recent checkpoint
- Preserves all progress (AC counts, gates, metadata)
- Default strategy for crashed sessions

**RESUME_FROM_GATE**
- Resume from specific gate checkpoint
- Useful for targeted recovery after known failure point
- Requires `target_gate` parameter (e.g., "gate-2")

**RESTART**
- Restart story from beginning
- Resets execution state (status → pending, retry_count → 0)
- Preserves checkpoint history for audit trail

**SKIP**
- Skip failed story and mark as cancelled
- Used when story cannot be recovered or is no longer needed

### CLI Usage

```bash
cd orchestrator
source venv/bin/activate

# Show recovery help
python main.py --help

# Resume from last checkpoint
python main.py --resume <session-uuid>

# Resume from specific gate
python main.py --resume <session-uuid> --strategy resume_from_gate --gate gate-2

# Restart from beginning
python main.py --resume <session-uuid> --strategy restart

# Skip failed story
python main.py --resume <session-uuid> --strategy skip
```

### API Usage

#### Check Recovery Status

```bash
GET /sessions/{session_id}/recovery-status

Response:
{
  "session_id": "uuid",
  "session_status": "in_progress",
  "total_stories": 5,
  "by_status": {
    "complete": 2,
    "failed": 1,
    "in_progress": 2
  },
  "recoverable_stories": [
    {
      "story_id": "AUTH-001",
      "current_status": "failed",
      "retry_count": 1,
      "last_checkpoint": {
        "type": "gate",
        "gate": "gate-2",
        "created_at": "2026-02-10T10:30:00Z"
      }
    }
  ]
}
```

#### Recover Story

```bash
POST /sessions/{session_id}/stories/{story_id}/recover
Content-Type: application/json

{
  "strategy": "resume_from_last"
}

Response:
{
  "strategy": "resume_from_last",
  "story_id": "AUTH-001",
  "checkpoint_id": "uuid",
  "checkpoint_type": "gate",
  "state": {"ac_passed": 5, "ac_total": 10},
  "status": "resumed",
  "recovery_time_seconds": 0.003,
  "recovery_timestamp": "2026-02-10T10:35:00Z"
}
```

#### Recover Entire Session

```bash
POST /sessions/{session_id}/recover
Content-Type: application/json

{
  "strategy": "resume_from_last"
}

Response:
{
  "session_id": "uuid",
  "strategy": "resume_from_last",
  "total_stories": 3,
  "recovered": [
    {"story_id": "AUTH-001", "result": {...}},
    {"story_id": "AUTH-002", "result": {...}}
  ],
  "failed": [],
  "recovery_time_seconds": 0.008
}
```

### LangGraph Integration

The `WAVECheckpointSaver` integrates with LangGraph's checkpoint system:

```python
from src.checkpoint import WAVECheckpointSaver
from src.db import get_db

with get_db() as db:
    checkpointer = WAVECheckpointSaver(
        db=db,
        session_id=session_id,
        story_id="AUTH-001"
    )

    # Use with compiled graph
    graph = compile_wave_graph(
        checkpointer=checkpointer,
        db=db,
        session_id=session_id
    )
```

The checkpointer automatically saves state at:
- Story start (story_start)
- Each gate execution (gate)
- Agent handoffs (agent_handoff)
- Errors (error)
- Manual checkpoints (manual)

### Programmatic Usage

```python
from src.recovery import RecoveryManager, RecoveryStrategy
from src.db import get_db

with get_db() as db:
    recovery_manager = RecoveryManager(db)

    # Check if story can be recovered
    can_recover = recovery_manager.can_recover(session_id, "AUTH-001")

    # Get recovery status
    status = recovery_manager.get_recovery_status(session_id)

    # Find available recovery points
    recovery_points = recovery_manager.find_recovery_points(
        session_id,
        story_id="AUTH-001"
    )

    # Recover single story
    result = recovery_manager.recover_story(
        session_id,
        "AUTH-001",
        RecoveryStrategy.RESUME_FROM_LAST
    )

    # Recover entire session
    results = recovery_manager.recover_session(
        session_id,
        RecoveryStrategy.RESUME_FROM_LAST
    )
```

### Performance

Recovery operations are highly optimized:

- **Target**: <5 seconds per recovery
- **Actual**: <0.01 seconds (typical)
- **Crash at gate-0**: 0.002s
- **Crash at gate-7**: 0.003s
- **50 checkpoints**: 0.009s
- **Session recovery (3 stories)**: 0.008s

Performance is tested in:
- `tests/integration/test_crash_recovery.py` (11 tests)
- `tests/integration/test_recovery_edge_cases.py` (14 tests)
- `tests/manual/test_recovery_e2e.py` (end-to-end validation)

### Logging and Telemetry

Recovery operations include structured logging:

```
🔄 Starting recovery | session=<uuid> | story=AUTH-001 | strategy=resume_from_last
✅ Recovery complete | session=<uuid> | story=AUTH-001 | time=0.003s | status=resumed
```

All recovery results include telemetry:
- `recovery_time_seconds`: Time taken to complete recovery
- `recovery_timestamp`: ISO 8601 timestamp of recovery completion

### Testing

```bash
cd orchestrator
source venv/bin/activate

# Run all recovery tests
pytest tests/integration/test_checkpoint_recovery_integration.py -v
pytest tests/integration/test_crash_recovery.py -v
pytest tests/integration/test_recovery_edge_cases.py -v

# Run end-to-end recovery test
python tests/manual/test_recovery_e2e.py

# Test CLI recovery
python main.py --resume <session-uuid>
```

### Edge Cases Handled

- ✅ Nonexistent session/story
- ✅ Invalid strategy or missing parameters
- ✅ Terminal states (completed, cancelled)
- ✅ Empty states (no gates executed)
- ✅ Multiple recovery attempts
- ✅ Corrupted/missing checkpoint data
- ✅ Concurrent recovery operations

### Auto-Recovery on Startup

The orchestrator automatically checks for interrupted sessions on startup:

```bash
python main.py

Output:
🔄 Checking for interrupted sessions...
📊 Found 2 sessions in progress:
  - abc-123: Project X Wave 1 (2 recoverable stories)
  - def-456: Project Y Wave 2 (1 recoverable story)
💡 To recover: python main.py --resume <session-id>
```

### Next Steps

- WAVE-P1-002: Story execution state machine with checkpointing ✅
- WAVE-P1-003: Recovery mechanisms for crashed workflows ✅
