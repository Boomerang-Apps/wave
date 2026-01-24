"""
WAVE v2 API Endpoints

FastAPI-based HTTP bridge for Portal integration.
Provides endpoints for workflow management and status.
"""

import os
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List

# Try to import FastAPI
try:
    from fastapi import FastAPI, HTTPException, BackgroundTasks
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    BaseModel = object

# Import state types
import sys
_src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

try:
    from src.graph import Phase, Gate, create_initial_state, compile_wave_graph
    from src.persistence import create_checkpointer, generate_thread_id
except ImportError:
    from graph import Phase, Gate, create_initial_state, compile_wave_graph
    from persistence import create_checkpointer, generate_thread_id


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

if FASTAPI_AVAILABLE:
    class WorkflowRequest(BaseModel):
        """Request to start a workflow."""
        story_id: str
        project_path: str
        requirements: str
        wave_number: int = 1
        token_limit: int = 100_000
        cost_limit_usd: float = 10.0

    class WorkflowResponse(BaseModel):
        """Response from workflow operations."""
        success: bool
        thread_id: Optional[str] = None
        message: str = ""
        data: Optional[Dict[str, Any]] = None

    class WorkflowStatus(BaseModel):
        """Current status of a workflow."""
        thread_id: str
        story_id: str
        phase: str
        gate: int
        progress: float
        is_complete: bool
        error: Optional[str] = None
        updated_at: str
else:
    # Fallback dataclasses
    @dataclass
    class WorkflowRequest:
        story_id: str
        project_path: str
        requirements: str
        wave_number: int = 1
        token_limit: int = 100_000
        cost_limit_usd: float = 10.0

    @dataclass
    class WorkflowResponse:
        success: bool
        thread_id: Optional[str] = None
        message: str = ""
        data: Optional[Dict[str, Any]] = None

    @dataclass
    class WorkflowStatus:
        thread_id: str
        story_id: str
        phase: str
        gate: int
        progress: float
        is_complete: bool
        error: Optional[str] = None
        updated_at: str = ""


# ═══════════════════════════════════════════════════════════════════════════════
# WORKFLOW MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class WorkflowManager:
    """
    Manages workflow execution and status tracking.

    Provides the business logic for API endpoints.
    """

    def __init__(self, use_memory: bool = True):
        """
        Initialize workflow manager.

        Args:
            use_memory: Use memory checkpointer (for development)
        """
        self.checkpointer = create_checkpointer(use_memory=use_memory)
        self._active_workflows: Dict[str, dict] = {}

    def start_workflow(self, request: WorkflowRequest) -> WorkflowResponse:
        """
        Start a new workflow.

        Args:
            request: Workflow request parameters

        Returns:
            WorkflowResponse with thread ID
        """
        try:
            # Generate thread ID
            thread_id = generate_thread_id(request.story_id, request.wave_number)

            # Create initial state
            state = create_initial_state(
                story_id=request.story_id,
                project_path=request.project_path,
                wave_number=request.wave_number,
                requirements=request.requirements,
                token_limit=request.token_limit,
                cost_limit_usd=request.cost_limit_usd
            )

            # Store workflow info
            self._active_workflows[thread_id] = {
                "state": state,
                "started_at": datetime.now().isoformat(),
                "status": "pending"
            }

            return WorkflowResponse(
                success=True,
                thread_id=thread_id,
                message=f"Workflow started for {request.story_id}",
                data={"story_id": request.story_id, "phase": state["phase"]}
            )
        except Exception as e:
            return WorkflowResponse(
                success=False,
                message=f"Failed to start workflow: {str(e)}"
            )

    def run_workflow(self, thread_id: str) -> WorkflowResponse:
        """
        Execute a pending workflow.

        Args:
            thread_id: Thread ID of workflow to run

        Returns:
            WorkflowResponse with result
        """
        if thread_id not in self._active_workflows:
            return WorkflowResponse(
                success=False,
                message=f"Workflow {thread_id} not found"
            )

        try:
            workflow = self._active_workflows[thread_id]
            state = workflow["state"]

            # Compile and run graph
            graph = compile_wave_graph(checkpointer=self.checkpointer)
            config = {"configurable": {"thread_id": thread_id}}

            result = graph.invoke(state, config)

            # Update workflow info
            workflow["state"] = result
            workflow["status"] = "complete" if result["phase"] in [
                Phase.DONE.value, Phase.FAILED.value
            ] else "running"

            return WorkflowResponse(
                success=True,
                thread_id=thread_id,
                message=f"Workflow completed with phase: {result['phase']}",
                data={
                    "phase": result["phase"],
                    "gate": result["gate"],
                    "story_id": result["story_id"]
                }
            )
        except Exception as e:
            return WorkflowResponse(
                success=False,
                thread_id=thread_id,
                message=f"Workflow execution failed: {str(e)}"
            )

    def get_status(self, thread_id: str) -> Optional[WorkflowStatus]:
        """
        Get workflow status.

        Args:
            thread_id: Thread ID to check

        Returns:
            WorkflowStatus or None
        """
        if thread_id not in self._active_workflows:
            return None

        workflow = self._active_workflows[thread_id]
        state = workflow["state"]

        # Calculate progress (gate 1-8 = 0-100%)
        gate = state.get("gate", 1)
        progress = (gate / 8) * 100

        is_complete = state.get("phase") in [Phase.DONE.value, Phase.FAILED.value]

        return WorkflowStatus(
            thread_id=thread_id,
            story_id=state.get("story_id", ""),
            phase=state.get("phase", "unknown"),
            gate=gate,
            progress=progress,
            is_complete=is_complete,
            error=state.get("error"),
            updated_at=state.get("updated_at", datetime.now().isoformat())
        )

    def stop_workflow(self, thread_id: str) -> WorkflowResponse:
        """
        Stop a running workflow.

        Args:
            thread_id: Thread ID to stop

        Returns:
            WorkflowResponse
        """
        if thread_id not in self._active_workflows:
            return WorkflowResponse(
                success=False,
                message=f"Workflow {thread_id} not found"
            )

        workflow = self._active_workflows[thread_id]
        workflow["status"] = "stopped"
        workflow["state"]["phase"] = Phase.FAILED.value
        workflow["state"]["error"] = "Workflow stopped by user"

        return WorkflowResponse(
            success=True,
            thread_id=thread_id,
            message="Workflow stopped"
        )

    def list_workflows(self) -> List[WorkflowStatus]:
        """List all active workflows."""
        return [
            self.get_status(tid)
            for tid in self._active_workflows.keys()
        ]


# ═══════════════════════════════════════════════════════════════════════════════
# FASTAPI APPLICATION
# ═══════════════════════════════════════════════════════════════════════════════

# Global workflow manager
_manager: Optional[WorkflowManager] = None


def get_manager() -> WorkflowManager:
    """Get or create workflow manager."""
    global _manager
    if _manager is None:
        _manager = WorkflowManager(use_memory=True)
    return _manager


def create_app() -> "FastAPI":
    """
    Create FastAPI application with all endpoints.

    Returns:
        Configured FastAPI app
    """
    if not FASTAPI_AVAILABLE:
        raise RuntimeError("FastAPI not installed. Run: pip install fastapi uvicorn")

    app = FastAPI(
        title="WAVE v2 Orchestrator API",
        description="API for WAVE autonomous coding workflow management",
        version="2.0.0"
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    async def root():
        """Health check endpoint."""
        return {"status": "ok", "service": "WAVE v2 Orchestrator"}

    @app.get("/health")
    async def health():
        """Detailed health check."""
        return {
            "status": "healthy",
            "version": "2.0.0",
            "timestamp": datetime.now().isoformat()
        }

    @app.post("/workflow/start", response_model=WorkflowResponse)
    async def start_workflow(request: WorkflowRequest):
        """Start a new workflow."""
        manager = get_manager()
        return manager.start_workflow(request)

    @app.post("/workflow/{thread_id}/run", response_model=WorkflowResponse)
    async def run_workflow(thread_id: str, background_tasks: BackgroundTasks):
        """Execute a workflow (can run in background)."""
        manager = get_manager()
        # For now, run synchronously
        return manager.run_workflow(thread_id)

    @app.get("/workflow/{thread_id}/status", response_model=WorkflowStatus)
    async def get_status(thread_id: str):
        """Get workflow status."""
        manager = get_manager()
        status = manager.get_status(thread_id)
        if not status:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return status

    @app.post("/workflow/{thread_id}/stop", response_model=WorkflowResponse)
    async def stop_workflow(thread_id: str):
        """Stop a running workflow."""
        manager = get_manager()
        return manager.stop_workflow(thread_id)

    @app.get("/workflows", response_model=List[WorkflowStatus])
    async def list_workflows():
        """List all active workflows."""
        manager = get_manager()
        return manager.list_workflows()

    return app


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "create_app",
    "WorkflowRequest",
    "WorkflowResponse",
    "WorkflowStatus",
    "WorkflowManager",
    "get_manager",
    "FASTAPI_AVAILABLE",
]
