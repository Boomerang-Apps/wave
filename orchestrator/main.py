"""
WAVE Orchestrator API Server
FastAPI server bridging Portal with LangGraph

Endpoints:
- GET /health - Health check
- POST /runs - Start a new run
- GET /runs/{run_id} - Get run status
"""

import uuid
from typing import Dict, Optional, List, Any
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from graph import wave_graph
from state import create_initial_state, WAVEState


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

    # Create initial state
    initial_state = create_initial_state(
        run_id=run_id,
        task=request.task,
        repo_path=request.repo_path or "",
        branch=request.branch or "main",
        token_limit=request.token_limit or settings.default_token_limit,
        cost_limit_usd=request.cost_limit_usd or settings.default_cost_limit_usd
    )

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
