"""
WAVE Orchestrator API Server
FastAPI server bridging Portal with LangGraph

Endpoints:
- GET /health - Health check
- POST /runs - Start a new run
- GET /runs/{run_id} - Get run status
- POST /sessions/{session_id}/recover - Trigger session recovery
- GET /sessions/{session_id}/recovery-status - Get recovery status
- GET /sessions/{session_id}/checkpoints - List session checkpoints

Story: WAVE-P1-003 - Session recovery integration
"""

import uuid
import time
from typing import Dict, Optional, List, Any
from datetime import datetime, timezone
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import settings
from graph import wave_graph, create_wave_graph_with_recovery
from state import create_initial_state, WAVEState
from notifications import notify_run_start, notify_run_complete
from src.db import SessionRepository, CheckpointRepository
from src.recovery import RecoveryManager, RecoveryStrategy


# ===========================================
# Request/Response Models
# ===========================================

class RunRequest(BaseModel):
    """Request to create a new run"""
    task: str = Field(..., description="Task description")
    repo_path: Optional[str] = Field(None, description="Git repository path")
    branch: Optional[str] = Field("main", description="Git branch name")
    token_limit: Optional[int] = Field(None, description="Token limit override")
    cost_limit_usd: Optional[float] = Field(None, description="Cost limit override")
    # Story loading (Supabase SOURCE OF TRUTH)
    project_id: Optional[str] = Field(None, description="Supabase project UUID for story loading")
    wave_number: Optional[int] = Field(1, description="Wave number for story loading")
    stories: Optional[List[str]] = Field(None, description="Specific story IDs to process (e.g., ['AUTH-001'])")
    parallel_domains: Optional[bool] = Field(False, description="Enable parallel domain execution")
    # Recovery (WAVE-P1-003)
    resume_session_id: Optional[str] = Field(None, description="Session UUID to resume from checkpoint")
    recovery_strategy: Optional[str] = Field("resume_from_last", description="Recovery strategy if resuming")


class RunResponse(BaseModel):
    """Response for run operations"""
    run_id: str
    status: str
    task: str
    current_agent: Optional[str] = None
    actions_count: int = 0
    created_at: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str = "0.1.0"
    timestamp: str


class RecoverRequest(BaseModel):
    """Request to recover a session"""
    strategy: str = Field(
        default="resume_from_last",
        description="Recovery strategy: resume_from_last, resume_from_gate, restart, skip"
    )
    target_gate: Optional[str] = Field(
        None,
        description="Target gate for resume_from_gate strategy"
    )


class RecoveryStatusResponse(BaseModel):
    """Recovery status response"""
    session_id: str
    session_status: str
    total_stories: int
    by_status: Dict[str, int]
    recoverable_stories: List[Dict[str, Any]]
    completed_stories: List[str]


class CheckpointResponse(BaseModel):
    """Checkpoint information response"""
    checkpoint_id: str
    checkpoint_type: str
    checkpoint_name: str
    story_id: Optional[str]
    gate: Optional[str]
    created_at: str
    can_resume: bool


# ===========================================
# Database Setup
# ===========================================

# Lazy database initialization
_db_engine = None
_SessionLocal = None


def _init_db():
    """Initialize database connection (lazy)."""
    global _db_engine, _SessionLocal
    if _db_engine is None:
        _db_engine = create_engine(
            settings.database_url,
            echo=False
        )
        _SessionLocal = sessionmaker(bind=_db_engine, autocommit=False, autoflush=False)


def get_db():
    """Get database session."""
    _init_db()
    db = _SessionLocal()
    try:
        return db
    finally:
        pass  # Don't close here, let caller manage


# ===========================================
# In-memory run storage (skeleton)
# ===========================================

# Simple in-memory storage for runs (will be replaced with Supabase in Phase B)
runs_storage: Dict[str, Dict[str, Any]] = {}


# ===========================================
# FastAPI App
# ===========================================

app = FastAPI(
    title="WAVE Orchestrator",
    description="Multi-agent orchestrator for WAVE Portal",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.portal_url,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===========================================
# Startup Event - Auto-Recovery Check
# ===========================================

@app.on_event("startup")
async def check_interrupted_sessions():
    """
    Check for interrupted sessions on startup and log recovery options.

    Story: WAVE-P1-003 - Session recovery on startup
    """
    db = get_db()
    try:
        session_repo = SessionRepository(db)
        recovery_manager = RecoveryManager(db)

        # Find active sessions (in_progress or pending)
        active_sessions = session_repo.list_active(limit=100)

        if not active_sessions:
            print("✅ No interrupted sessions found")
            return

        print(f"\n⚠️  Found {len(active_sessions)} active session(s)")
        print("=" * 60)

        for session in active_sessions:
            status = recovery_manager.get_recovery_status(session.id)

            recoverable_count = len(status["recoverable_stories"])

            if recoverable_count > 0:
                print(f"\n📋 Session: {session.project_name} (Wave {session.wave_number})")
                print(f"   ID: {session.id}")
                print(f"   Status: {session.status}")
                print(f"   Recoverable stories: {recoverable_count}")

                for story_info in status["recoverable_stories"][:3]:  # Show first 3
                    story_id = story_info["story_id"]
                    story_status = story_info["current_status"]
                    last_cp = story_info.get("last_checkpoint")

                    print(f"   - {story_id}: {story_status}", end="")
                    if last_cp:
                        print(f" (checkpoint: {last_cp['type']} at {last_cp.get('gate', 'N/A')})")
                    else:
                        print()

                if recoverable_count > 3:
                    print(f"   ... and {recoverable_count - 3} more")

                print(f"\n   🔄 To recover: POST /sessions/{session.id}/recover")

        print("\n" + "=" * 60)

    except Exception as e:
        print(f"⚠️  Error checking interrupted sessions: {e}")
    finally:
        db.close()


# ===========================================
# Endpoints
# ===========================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat()
    )


@app.post("/runs", response_model=RunResponse, status_code=201)
async def create_run(request: RunRequest):
    """
    Create and execute a new orchestrator run.

    Supports recovery: if resume_session_id is provided, the session
    will be recovered before execution begins.

    This is a synchronous skeleton implementation.
    In Phase B, this will be async with streaming updates.
    """
    # Generate run ID
    run_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    # Handle recovery if resume_session_id provided
    if request.resume_session_id:
        print(f"🔄 Recovering session: {request.resume_session_id}")
        db = get_db()
        try:
            session_uuid = UUID(request.resume_session_id)
            recovery_manager = RecoveryManager(db)

            # Perform recovery
            try:
                strategy = RecoveryStrategy(request.recovery_strategy or "resume_from_last")
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid recovery strategy: {request.recovery_strategy}"
                )

            recovery_result = recovery_manager.recover_session(
                session_uuid,
                strategy
            )

            print(f"✅ Recovery complete: {len(recovery_result['recovered'])} stories recovered")

            # Use the recovered session ID as the run ID
            run_id = request.resume_session_id

        except ValueError as e:
            raise HTTPException(status_code=404, detail=f"Recovery failed: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Recovery error: {str(e)}")
        finally:
            db.close()

    # Create initial state with story loading from Supabase
    initial_state = create_initial_state(
        run_id=run_id,
        task=request.task,
        repo_path=request.repo_path or "",
        branch=request.branch or "main",
        token_limit=request.token_limit or settings.default_token_limit,
        cost_limit_usd=request.cost_limit_usd or settings.default_cost_limit_usd,
        project_id=request.project_id or "",
        wave_number=request.wave_number or 1,
        story_ids=request.stories or []
    )

    # Notify run start
    notify_run_start(run_id, request.task)

    # Execute graph synchronously (skeleton)
    # If this was a recovery, the graph will resume from checkpointed state
    final_state = None
    for chunk in wave_graph.stream(initial_state):
        final_state = chunk

    # Determine status from final state
    if final_state:
        # Get the last node's output
        node_name = list(final_state.keys())[0]
        node_output = final_state[node_name]
        current_agent = node_output.get("current_agent")
        actions = node_output.get("actions", [])
        status = "completed"
    else:
        current_agent = None
        actions = []
        status = "failed"

    # Store run info
    runs_storage[run_id] = {
        "run_id": run_id,
        "task": request.task,
        "status": status,
        "current_agent": current_agent,
        "actions": actions,
        "created_at": created_at,
        "recovered": bool(request.resume_session_id)
    }

    # Notify run complete
    notify_run_complete(run_id, request.task, len(actions), status)

    return RunResponse(
        run_id=run_id,
        status=status,
        task=request.task,
        current_agent=current_agent,
        actions_count=len(actions),
        created_at=created_at
    )


@app.get("/runs/{run_id}", response_model=RunResponse)
async def get_run(run_id: str):
    """Get the status of a run"""
    if run_id not in runs_storage:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    run_info = runs_storage[run_id]
    return RunResponse(
        run_id=run_info["run_id"],
        status=run_info["status"],
        task=run_info["task"],
        current_agent=run_info.get("current_agent"),
        actions_count=len(run_info.get("actions", [])),
        created_at=run_info["created_at"]
    )


# ===========================================
# Recovery Endpoints (WAVE-P1-003)
# ===========================================

@app.post("/sessions/{session_id}/recover")
async def recover_session(session_id: str, request: RecoverRequest):
    """
    Trigger session recovery.

    Args:
        session_id: UUID of the wave session
        request: Recovery request with strategy

    Returns:
        Recovery result with recovered stories
    """
    db = get_db()
    try:
        session_uuid = UUID(session_id)
        recovery_manager = RecoveryManager(db)

        # Validate strategy
        try:
            strategy = RecoveryStrategy(request.strategy)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid strategy: {request.strategy}"
            )

        # Perform recovery
        result = recovery_manager.recover_session(
            session_uuid,
            strategy
        )

        return result

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recovery failed: {str(e)}")
    finally:
        db.close()


@app.get("/sessions/{session_id}/recovery-status", response_model=RecoveryStatusResponse)
async def get_recovery_status(session_id: str):
    """
    Get recovery status for a session.

    Args:
        session_id: UUID of the wave session

    Returns:
        Recovery status with recoverable stories
    """
    db = get_db()
    try:
        session_uuid = UUID(session_id)
        recovery_manager = RecoveryManager(db)

        status = recovery_manager.get_recovery_status(session_uuid)

        return RecoveryStatusResponse(**status)

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")
    finally:
        db.close()


@app.get("/sessions/{session_id}/checkpoints")
async def list_checkpoints(session_id: str, limit: int = 50):
    """
    List checkpoints for a session.

    Args:
        session_id: UUID of the wave session
        limit: Maximum number of checkpoints to return

    Returns:
        List of checkpoints
    """
    db = get_db()
    try:
        session_uuid = UUID(session_id)
        checkpoint_repo = CheckpointRepository(db)

        checkpoints = checkpoint_repo.list_by_session(
            session_uuid,
            limit=limit
        )

        return {
            "session_id": session_id,
            "total": len(checkpoints),
            "checkpoints": [
                {
                    "checkpoint_id": str(cp.id),
                    "checkpoint_type": cp.checkpoint_type,
                    "checkpoint_name": cp.checkpoint_name,
                    "story_id": cp.story_id,
                    "gate": cp.gate,
                    "created_at": cp.created_at.isoformat(),
                    "state": cp.state,
                }
                for cp in checkpoints
            ]
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list checkpoints: {str(e)}")
    finally:
        db.close()


# ===========================================
# CLI Recovery Command
# ===========================================

def run_recovery(session_id: str, strategy: str = "resume_from_last", target_gate: Optional[str] = None):
    """
    Run recovery from command line.

    Args:
        session_id: Session UUID to recover
        strategy: Recovery strategy (resume_from_last, resume_from_gate, restart, skip)
        target_gate: Target gate for resume_from_gate strategy
    """
    print(f"\n🔄 Starting recovery for session: {session_id}")
    print(f"   Strategy: {strategy}")
    if target_gate:
        print(f"   Target gate: {target_gate}")
    print("=" * 60)

    db = get_db()
    try:
        session_uuid = UUID(session_id)
        recovery_manager = RecoveryManager(db)

        # Get recovery status first
        print("\n📊 Recovery Status:")
        status = recovery_manager.get_recovery_status(session_uuid)

        print(f"   Session Status: {status['session_status']}")
        print(f"   Total Stories: {status['total_stories']}")
        print(f"   Recoverable: {len(status['recoverable_stories'])}")

        if not status["recoverable_stories"]:
            print("\n⚠️  No recoverable stories found")
            return

        # Show recoverable stories
        print("\n📋 Recoverable Stories:")
        for story_info in status["recoverable_stories"]:
            story_id = story_info["story_id"]
            story_status = story_info["current_status"]
            last_cp = story_info.get("last_checkpoint")

            print(f"   - {story_id}: {story_status}", end="")
            if last_cp:
                print(f" (checkpoint: {last_cp['type']} at {last_cp.get('gate', 'N/A')})")
            else:
                print()

        # Perform recovery
        print(f"\n🔧 Executing recovery...")
        start_time = time.time()

        try:
            recovery_strategy = RecoveryStrategy(strategy)
        except ValueError:
            print(f"\n❌ Invalid strategy: {strategy}")
            print(f"   Valid strategies: resume_from_last, resume_from_gate, restart, skip")
            return

        result = recovery_manager.recover_session(
            session_uuid,
            recovery_strategy
        )

        recovery_time = time.time() - start_time

        # Show results
        print(f"\n✅ Recovery Complete ({recovery_time:.2f}s)")
        print(f"   Total Stories: {result['total_stories']}")
        print(f"   Recovered: {len(result['recovered'])}")
        print(f"   Failed: {len(result['failed'])}")

        if result["recovered"]:
            print("\n✅ Successfully Recovered:")
            for item in result["recovered"]:
                print(f"   - {item['story_id']}")

        if result["failed"]:
            print("\n❌ Failed to Recover:")
            for item in result["failed"]:
                print(f"   - {item['story_id']}: {item['error']}")

        print("\n" + "=" * 60)
        print(f"✅ Recovery completed in {recovery_time:.2f}s")

        # Check if recovery time meets requirement
        if recovery_time >= 5.0:
            print(f"⚠️  Warning: Recovery took {recovery_time:.2f}s (target: <5s)")
        else:
            print(f"✅ Recovery time within target (<5s)")

    except ValueError as e:
        print(f"\n❌ Error: {e}")
    except Exception as e:
        print(f"\n❌ Recovery failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


# ===========================================
# Main
# ===========================================

if __name__ == "__main__":
    import argparse
    import sys
    import time

    parser = argparse.ArgumentParser(
        description="WAVE Orchestrator - Multi-agent orchestration system",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Start the API server
  python main.py

  # Resume a session from last checkpoint
  python main.py --resume <session-id>

  # Resume from specific gate
  python main.py --resume <session-id> --strategy resume_from_gate --gate gate-3

  # Restart session from beginning
  python main.py --resume <session-id> --strategy restart
        """
    )

    parser.add_argument(
        "--resume",
        type=str,
        metavar="SESSION_ID",
        help="Resume session from checkpoint (UUID)"
    )

    parser.add_argument(
        "--strategy",
        type=str,
        default="resume_from_last",
        choices=["resume_from_last", "resume_from_gate", "restart", "skip"],
        help="Recovery strategy (default: resume_from_last)"
    )

    parser.add_argument(
        "--gate",
        type=str,
        metavar="GATE",
        help="Target gate for resume_from_gate strategy (e.g., gate-3)"
    )

    args = parser.parse_args()

    # If --resume flag provided, run recovery instead of server
    if args.resume:
        run_recovery(args.resume, args.strategy, args.gate)
        sys.exit(0)

    # Otherwise, start the API server
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
