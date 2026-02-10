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

# Database engine and session maker
# TODO: Move database URL to settings
db_engine = create_engine(
    "postgresql://postgres:postgres@localhost:5432/wave",
    echo=False
)
SessionLocal = sessionmaker(bind=db_engine, autocommit=False, autoflush=False)


def get_db():
    """Get database session."""
    db = SessionLocal()
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

    This is a synchronous skeleton implementation.
    In Phase B, this will be async with streaming updates.
    """
    # Generate run ID
    run_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

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
        "created_at": created_at
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
# Main
# ===========================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
