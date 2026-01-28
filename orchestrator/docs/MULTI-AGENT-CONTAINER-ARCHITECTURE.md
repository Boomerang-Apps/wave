# WAVE Multi-Agent Container Architecture

## Implementation Proposal for Grok Approval

**Date:** 2026-01-27
**Author:** Claude Code
**Status:** PENDING APPROVAL
**Priority:** HIGH - Core Architecture

---

## Executive Summary

Transform the WAVE orchestrator from a single-container workflow execution model to a true multi-agent distributed architecture where each domain agent (PM, CTO, FE-DEV, BE-DEV, QA) runs in its own container with real-time visibility in Dozzle.

---

## 1. Current State Analysis

### 1.1 What We Have Now

```
┌─────────────────────────────────────────────────────────┐
│                  wave-orchestrator                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  LangGraph Workflow (inline execution)           │   │
│  │  ┌──────┐ ┌──────┐ ┌─────┐ ┌────┐ ┌──────┐     │   │
│  │  │valid │→│ plan │→│ dev │→│ qa │→│merge │     │   │
│  │  └──────┘ └──────┘ └─────┘ └────┘ └──────┘     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────┐
│  wave-fe-agent-1    │ ← Exits immediately (placeholder)
│  wave-be-agent-1    │ ← Exits immediately (placeholder)
│  wave-qa-agent      │ ← Exits immediately (placeholder)
└─────────────────────┘
```

### 1.2 Problems

| Issue | Impact |
|-------|--------|
| Single container runs all logic | No parallelism, no domain visibility |
| Domain agents exit immediately | Can't see agent activity in Dozzle |
| No task distribution | Everything sequential inside orchestrator |
| No domain-specific logging | Can't track which agent is doing what |
| No parallel execution | FE and BE can't work simultaneously |

### 1.3 Current Container Status

```
wave-orchestrator        Up (runs everything)
wave-fe-agent-1          Exited (1) - placeholder only
wave-fe-agent-2          Exited (1) - placeholder only
wave-be-agent-1          Exited (0) - placeholder only
wave-be-agent-2          Exited (0) - placeholder only
wave-qa-agent            Exited (1) - placeholder only
```

---

## 2. Target Architecture

### 2.1 Distributed Multi-Agent Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Supervisor (LangGraph)                                      │   │
│  │  - Routes tasks to domain queues                             │   │
│  │  - Tracks agent status                                       │   │
│  │  - Aggregates results                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │     REDIS (Queues)    │
                    │  ┌─────┐ ┌─────┐     │
                    │  │pm-q │ │cto-q│     │
                    │  ├─────┤ ├─────┤     │
                    │  │fe-q │ │be-q │     │
                    │  ├─────┤ ├─────┤     │
                    │  │qa-q │ │done │     │
                    │  └─────┘ └─────┘     │
                    └───────────┬───────────┘
                                │
        ┌───────────┬───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │   PM    │ │   CTO   │ │ FE-DEV  │ │ BE-DEV  │ │   QA    │
   │ Agent   │ │ Agent   │ │ Agent-1 │ │ Agent-1 │ │ Agent   │
   │         │ │         │ │         │ │         │ │         │
   │ Polls   │ │ Polls   │ │ Polls   │ │ Polls   │ │ Polls   │
   │ pm-q    │ │ cto-q   │ │ fe-q    │ │ be-q    │ │ qa-q    │
   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
       │           │           │           │           │
       └───────────┴───────────┴───────────┴───────────┘
                               │
                          DOZZLE VIEW:
                    ┌─────────────────────┐
                    │ [PM] Planning...    │
                    │ [CTO] Reviewing...  │
                    │ [FE-1] Coding...    │
                    │ [BE-1] Coding...    │
                    │ [QA] Testing...     │
                    └─────────────────────┘
```

### 2.2 Benefits

| Benefit | Description |
|---------|-------------|
| **Parallel Execution** | FE and BE agents work simultaneously |
| **Dozzle Visibility** | Each agent has its own log stream |
| **Scalability** | Add more FE/BE agents for parallel stories |
| **Domain Isolation** | Each agent has domain-specific tools |
| **Real-time Monitoring** | See exactly who is doing what |
| **Fault Tolerance** | Agent failure doesn't crash orchestrator |

---

## 3. Implementation Plan

### Phase 1: Redis Task Queue Infrastructure

**Duration:** Core foundation
**Files to modify/create:**

#### 3.1.1 Create Task Queue Module

**File:** `/orchestrator/src/task_queue.py`

```python
"""
WAVE Task Queue - Redis-based task distribution
"""
import json
import redis
from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class DomainQueue(str, Enum):
    PM = "wave:tasks:pm"
    CTO = "wave:tasks:cto"
    FE = "wave:tasks:fe"
    BE = "wave:tasks:be"
    QA = "wave:tasks:qa"
    RESULTS = "wave:results"

@dataclass
class AgentTask:
    task_id: str
    story_id: str
    domain: str
    action: str
    payload: Dict[str, Any]
    priority: int = 0

class TaskQueue:
    def __init__(self, redis_url: str = "redis://redis:6379"):
        self.redis = redis.from_url(redis_url)

    def enqueue(self, queue: DomainQueue, task: AgentTask) -> bool:
        """Add task to domain queue"""
        task_data = json.dumps(task.__dict__)
        self.redis.lpush(queue.value, task_data)
        self.redis.publish(f"{queue.value}:notify", task.task_id)
        return True

    def dequeue(self, queue: DomainQueue, timeout: int = 30) -> Optional[AgentTask]:
        """Pop task from queue (blocking)"""
        result = self.redis.brpop(queue.value, timeout=timeout)
        if result:
            _, task_data = result
            data = json.loads(task_data)
            return AgentTask(**data)
        return None

    def submit_result(self, task_id: str, result: Dict[str, Any]):
        """Agent submits completed work"""
        self.redis.hset("wave:task_results", task_id, json.dumps(result))
        self.redis.publish(DomainQueue.RESULTS.value, task_id)

    def get_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get result for a task"""
        data = self.redis.hget("wave:task_results", task_id)
        return json.loads(data) if data else None
```

#### 3.1.2 Update Redis in docker-compose

**File:** `/orchestrator/docker/docker-compose.agents.yml`

Add Redis configuration for persistence and pub/sub:

```yaml
redis:
  image: redis:7-alpine
  container_name: wave-redis
  command: redis-server --appendonly yes --notify-keyspace-events KEA
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
  networks:
    - wave-network
```

---

### Phase 2: Domain Agent Worker Framework

**Duration:** Agent base implementation

#### 3.2.1 Create Base Agent Worker

**File:** `/orchestrator/src/agent_worker.py`

```python
"""
WAVE Agent Worker - Base class for domain agents
"""
import os
import sys
import signal
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, Optional

from task_queue import TaskQueue, DomainQueue, AgentTask, TaskStatus

class AgentWorker(ABC):
    """Base class for all domain agent workers"""

    def __init__(self, domain: str, agent_id: str):
        self.domain = domain
        self.agent_id = agent_id
        self.queue = TaskQueue()
        self.running = True
        self.current_task: Optional[AgentTask] = None

        # Setup logging with domain prefix
        self.logger = self._setup_logging()

        # Handle graceful shutdown
        signal.signal(signal.SIGTERM, self._shutdown)
        signal.signal(signal.SIGINT, self._shutdown)

    def _setup_logging(self) -> logging.Logger:
        """Configure logging with domain-specific format"""
        logger = logging.getLogger(f"{self.domain}-{self.agent_id}")
        logger.setLevel(logging.INFO)

        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            f'[%(asctime)s] [{self.domain.upper()}-{self.agent_id}] %(message)s',
            datefmt='%H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    def _shutdown(self, signum, frame):
        """Handle graceful shutdown"""
        self.logger.info("Received shutdown signal, finishing current task...")
        self.running = False

    def log(self, message: str, level: str = "info"):
        """Log with domain prefix (visible in Dozzle)"""
        getattr(self.logger, level)(message)

    @abstractmethod
    def get_queue(self) -> DomainQueue:
        """Return the queue this agent listens to"""
        pass

    @abstractmethod
    def process_task(self, task: AgentTask) -> Dict[str, Any]:
        """Process a task and return result"""
        pass

    def run(self):
        """Main worker loop"""
        self.log(f"Starting {self.domain} agent worker")
        self.log(f"Listening on queue: {self.get_queue().value}")

        while self.running:
            try:
                # Wait for task from queue
                task = self.queue.dequeue(self.get_queue(), timeout=10)

                if task is None:
                    self.log("Waiting for tasks...", level="debug")
                    continue

                self.current_task = task
                self.log(f"Received task: {task.task_id} | Action: {task.action}")
                self.log(f"Story: {task.story_id} | Processing...")

                # Process the task
                start_time = datetime.now()
                result = self.process_task(task)
                duration = (datetime.now() - start_time).total_seconds()

                # Submit result
                result["duration_seconds"] = duration
                result["agent_id"] = self.agent_id
                result["domain"] = self.domain
                self.queue.submit_result(task.task_id, result)

                self.log(f"Completed task: {task.task_id} in {duration:.2f}s")
                self.current_task = None

            except Exception as e:
                self.log(f"Error processing task: {e}", level="error")
                if self.current_task:
                    self.queue.submit_result(self.current_task.task_id, {
                        "status": "failed",
                        "error": str(e)
                    })

        self.log("Agent worker stopped")
```

#### 3.2.2 Create Domain-Specific Agents

**File:** `/orchestrator/src/agents/pm_agent.py`

```python
"""PM Agent - Product Manager / Planning"""
from agent_worker import AgentWorker, DomainQueue, AgentTask

class PMAgent(AgentWorker):
    def __init__(self, agent_id: str = "1"):
        super().__init__("pm", agent_id)

    def get_queue(self) -> DomainQueue:
        return DomainQueue.PM

    def process_task(self, task: AgentTask) -> dict:
        self.log(f"Planning story breakdown: {task.story_id}")
        self.log(f"Requirements: {task.payload.get('requirements', '')[:100]}...")

        # Call Claude for planning
        # ... implementation ...

        self.log("Story breakdown complete, creating subtasks")
        return {
            "status": "completed",
            "plan": "...",
            "subtasks": []
        }

if __name__ == "__main__":
    agent = PMAgent()
    agent.run()
```

**File:** `/orchestrator/src/agents/cto_agent.py`

```python
"""CTO Agent - Architecture Review"""
from agent_worker import AgentWorker, DomainQueue, AgentTask

class CTOAgent(AgentWorker):
    def __init__(self, agent_id: str = "1"):
        super().__init__("cto", agent_id)

    def get_queue(self) -> DomainQueue:
        return DomainQueue.CTO

    def process_task(self, task: AgentTask) -> dict:
        self.log(f"Reviewing architecture for: {task.story_id}")
        self.log(f"Analyzing code patterns...")

        # Call Claude for architecture review
        # ... implementation ...

        self.log("Architecture review complete")
        return {
            "status": "completed",
            "approved": True,
            "review": "..."
        }

if __name__ == "__main__":
    agent = CTOAgent()
    agent.run()
```

**File:** `/orchestrator/src/agents/fe_agent.py`

```python
"""FE Agent - Frontend Development"""
from agent_worker import AgentWorker, DomainQueue, AgentTask

class FEAgent(AgentWorker):
    def __init__(self, agent_id: str = "1"):
        super().__init__("fe", agent_id)

    def get_queue(self) -> DomainQueue:
        return DomainQueue.FE

    def process_task(self, task: AgentTask) -> dict:
        self.log(f"Starting frontend development: {task.story_id}")
        self.log(f"Target files: {task.payload.get('files', [])}")

        # Call Claude for code generation
        # ... implementation ...

        self.log("Frontend code generation complete")
        self.log(f"Files modified: {task.payload.get('files', [])}")
        return {
            "status": "completed",
            "code": "...",
            "files_modified": []
        }

if __name__ == "__main__":
    import sys
    agent_id = sys.argv[1] if len(sys.argv) > 1 else "1"
    agent = FEAgent(agent_id)
    agent.run()
```

**File:** `/orchestrator/src/agents/be_agent.py`

```python
"""BE Agent - Backend Development"""
from agent_worker import AgentWorker, DomainQueue, AgentTask

class BEAgent(AgentWorker):
    def __init__(self, agent_id: str = "1"):
        super().__init__("be", agent_id)

    def get_queue(self) -> DomainQueue:
        return DomainQueue.BE

    def process_task(self, task: AgentTask) -> dict:
        self.log(f"Starting backend development: {task.story_id}")
        self.log(f"Target files: {task.payload.get('files', [])}")

        # Call Claude for code generation
        # ... implementation ...

        self.log("Backend code generation complete")
        return {
            "status": "completed",
            "code": "...",
            "files_modified": []
        }

if __name__ == "__main__":
    import sys
    agent_id = sys.argv[1] if len(sys.argv) > 1 else "1"
    agent = BEAgent(agent_id)
    agent.run()
```

**File:** `/orchestrator/src/agents/qa_agent.py`

```python
"""QA Agent - Quality Assurance"""
from agent_worker import AgentWorker, DomainQueue, AgentTask

class QAAgent(AgentWorker):
    def __init__(self, agent_id: str = "1"):
        super().__init__("qa", agent_id)

    def get_queue(self) -> DomainQueue:
        return DomainQueue.QA

    def process_task(self, task: AgentTask) -> dict:
        self.log(f"Starting QA validation: {task.story_id}")
        self.log(f"Testing files: {task.payload.get('files_to_test', [])}")

        # Run tests, validate code
        # ... implementation ...

        self.log("QA validation complete")
        return {
            "status": "completed",
            "passed": True,
            "test_results": "..."
        }

if __name__ == "__main__":
    agent = QAAgent()
    agent.run()
```

---

### Phase 3: Updated Docker Configuration

#### 3.3.1 Agent Dockerfiles

**File:** `/orchestrator/docker/agents/Dockerfile.worker`

```dockerfile
# WAVE Agent Worker Base
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY src/ /app/src/
COPY notifications.py /app/

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Default command (overridden per agent)
CMD ["python", "-m", "src.agents.base_agent"]
```

#### 3.3.2 Updated docker-compose.agents.yml

```yaml
version: '3.8'

services:
  # ═══════════════════════════════════════════════════════════════════════════
  # ORCHESTRATOR (Supervisor)
  # ═══════════════════════════════════════════════════════════════════════════
  orchestrator:
    build:
      context: ..
      dockerfile: Dockerfile
    image: wave-orchestrator:v2
    container_name: wave-orchestrator
    ports:
      - "8000:8000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
      - LANGSMITH_API_KEY=${LANGSMITH_API_KEY}
      - LANGSMITH_WORKSPACE_ID=${LANGSMITH_WORKSPACE_ID}
    volumes:
      - ${PROJECT_PATH:-/tmp/project}:/project
    depends_on:
      - redis
    networks:
      - wave-network

  # ═══════════════════════════════════════════════════════════════════════════
  # PM AGENT (Planning)
  # ═══════════════════════════════════════════════════════════════════════════
  pm-agent:
    build:
      context: ..
      dockerfile: docker/agents/Dockerfile.worker
    image: wave-agent-pm:v2
    container_name: wave-pm-agent
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
      - AGENT_DOMAIN=pm
      - AGENT_ID=1
    volumes:
      - ${PROJECT_PATH:-/tmp/project}:/project:ro
    command: ["python", "-m", "src.agents.pm_agent"]
    depends_on:
      - redis
      - orchestrator
    networks:
      - wave-network
    restart: unless-stopped
    labels:
      - "wave.domain=pm"
      - "wave.role=planner"

  # ═══════════════════════════════════════════════════════════════════════════
  # CTO AGENT (Architecture)
  # ═══════════════════════════════════════════════════════════════════════════
  cto-agent:
    build:
      context: ..
      dockerfile: docker/agents/Dockerfile.worker
    image: wave-agent-cto:v2
    container_name: wave-cto-agent
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
      - AGENT_DOMAIN=cto
      - AGENT_ID=1
    volumes:
      - ${PROJECT_PATH:-/tmp/project}:/project:ro
    command: ["python", "-m", "src.agents.cto_agent"]
    depends_on:
      - redis
      - orchestrator
    networks:
      - wave-network
    restart: unless-stopped
    labels:
      - "wave.domain=cto"
      - "wave.role=architect"

  # ═══════════════════════════════════════════════════════════════════════════
  # FE AGENTS (Frontend Development) - 2 instances for parallelism
  # ═══════════════════════════════════════════════════════════════════════════
  fe-agent-1:
    build:
      context: ..
      dockerfile: docker/agents/Dockerfile.worker
    image: wave-agent-fe:v2
    container_name: wave-fe-agent-1
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
      - AGENT_DOMAIN=fe
      - AGENT_ID=1
    volumes:
      - ${PROJECT_PATH:-/tmp/project}:/project
    command: ["python", "-m", "src.agents.fe_agent", "1"]
    depends_on:
      - redis
      - orchestrator
    networks:
      - wave-network
    restart: unless-stopped
    labels:
      - "wave.domain=fe"
      - "wave.role=developer"

  fe-agent-2:
    build:
      context: ..
      dockerfile: docker/agents/Dockerfile.worker
    image: wave-agent-fe:v2
    container_name: wave-fe-agent-2
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
      - AGENT_DOMAIN=fe
      - AGENT_ID=2
    volumes:
      - ${PROJECT_PATH:-/tmp/project}:/project
    command: ["python", "-m", "src.agents.fe_agent", "2"]
    depends_on:
      - redis
      - orchestrator
    networks:
      - wave-network
    restart: unless-stopped
    labels:
      - "wave.domain=fe"
      - "wave.role=developer"

  # ═══════════════════════════════════════════════════════════════════════════
  # BE AGENTS (Backend Development) - 2 instances for parallelism
  # ═══════════════════════════════════════════════════════════════════════════
  be-agent-1:
    build:
      context: ..
      dockerfile: docker/agents/Dockerfile.worker
    image: wave-agent-be:v2
    container_name: wave-be-agent-1
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - REDIS_URL=redis://redis:6379
      - AGENT_DOMAIN=be
      - AGENT_ID=1
    volumes:
      - ${PROJECT_PATH:-/tmp/project}:/project
    command: ["python", "-m", "src.agents.be_agent", "1"]
    depends_on:
      - redis
      - orchestrator
    networks:
      - wave-network
    restart: unless-stopped
    labels:
      - "wave.domain=be"
      - "wave.role=developer"

  be-agent-2:
    build:
      context: ..
      dockerfile: docker/agents/Dockerfile.worker
    image: wave-agent-be:v2
    container_name: wave-be-agent-2
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - REDIS_URL=redis://redis:6379
      - AGENT_DOMAIN=be
      - AGENT_ID=2
    volumes:
      - ${PROJECT_PATH:-/tmp/project}:/project
    command: ["python", "-m", "src.agents.be_agent", "2"]
    depends_on:
      - redis
      - orchestrator
    networks:
      - wave-network
    restart: unless-stopped
    labels:
      - "wave.domain=be"
      - "wave.role=developer"

  # ═══════════════════════════════════════════════════════════════════════════
  # QA AGENT (Quality Assurance)
  # ═══════════════════════════════════════════════════════════════════════════
  qa-agent:
    build:
      context: ..
      dockerfile: docker/agents/Dockerfile.worker
    image: wave-agent-qa:v2
    container_name: wave-qa-agent
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
      - AGENT_DOMAIN=qa
      - AGENT_ID=1
    volumes:
      - ${PROJECT_PATH:-/tmp/project}:/project:ro
    command: ["python", "-m", "src.agents.qa_agent"]
    depends_on:
      - redis
      - orchestrator
    networks:
      - wave-network
    restart: unless-stopped
    labels:
      - "wave.domain=qa"
      - "wave.role=tester"

  # ═══════════════════════════════════════════════════════════════════════════
  # INFRASTRUCTURE
  # ═══════════════════════════════════════════════════════════════════════════
  redis:
    image: redis:7-alpine
    container_name: wave-redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - wave-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  dozzle:
    image: amir20/dozzle:latest
    container_name: wave-dozzle
    ports:
      - "9090:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - DOZZLE_FILTER=name=wave-*
    networks:
      - wave-network

networks:
  wave-network:
    driver: bridge
    name: wave-network

volumes:
  redis-data:
```

---

### Phase 4: Orchestrator Task Distribution

#### 3.4.1 Update Supervisor to Dispatch Tasks

**File:** `/orchestrator/src/supervisor.py`

```python
"""
WAVE Supervisor - Task distribution to domain agents
"""
import uuid
from typing import Dict, List, Any
from task_queue import TaskQueue, DomainQueue, AgentTask

class Supervisor:
    """Distributes tasks to domain agent queues"""

    def __init__(self):
        self.queue = TaskQueue()

    def dispatch_to_pm(self, story_id: str, requirements: str) -> str:
        """Send planning task to PM agent"""
        task = AgentTask(
            task_id=f"pm-{story_id}-{uuid.uuid4().hex[:8]}",
            story_id=story_id,
            domain="pm",
            action="plan",
            payload={"requirements": requirements}
        )
        self.queue.enqueue(DomainQueue.PM, task)
        return task.task_id

    def dispatch_to_cto(self, story_id: str, plan: dict, code: str) -> str:
        """Send review task to CTO agent"""
        task = AgentTask(
            task_id=f"cto-{story_id}-{uuid.uuid4().hex[:8]}",
            story_id=story_id,
            domain="cto",
            action="review",
            payload={"plan": plan, "code": code}
        )
        self.queue.enqueue(DomainQueue.CTO, task)
        return task.task_id

    def dispatch_to_fe(self, story_id: str, files: List[str], requirements: str) -> str:
        """Send FE development task"""
        task = AgentTask(
            task_id=f"fe-{story_id}-{uuid.uuid4().hex[:8]}",
            story_id=story_id,
            domain="fe",
            action="develop",
            payload={"files": files, "requirements": requirements}
        )
        self.queue.enqueue(DomainQueue.FE, task)
        return task.task_id

    def dispatch_to_be(self, story_id: str, files: List[str], requirements: str) -> str:
        """Send BE development task"""
        task = AgentTask(
            task_id=f"be-{story_id}-{uuid.uuid4().hex[:8]}",
            story_id=story_id,
            domain="be",
            action="develop",
            payload={"files": files, "requirements": requirements}
        )
        self.queue.enqueue(DomainQueue.BE, task)
        return task.task_id

    def dispatch_to_qa(self, story_id: str, files_to_test: List[str]) -> str:
        """Send QA validation task"""
        task = AgentTask(
            task_id=f"qa-{story_id}-{uuid.uuid4().hex[:8]}",
            story_id=story_id,
            domain="qa",
            action="validate",
            payload={"files_to_test": files_to_test}
        )
        self.queue.enqueue(DomainQueue.QA, task)
        return task.task_id

    def dispatch_parallel(self, story_id: str, fe_files: List[str],
                         be_files: List[str], requirements: str) -> Dict[str, str]:
        """Dispatch FE and BE tasks in parallel"""
        return {
            "fe_task_id": self.dispatch_to_fe(story_id, fe_files, requirements),
            "be_task_id": self.dispatch_to_be(story_id, be_files, requirements)
        }

    def wait_for_result(self, task_id: str, timeout: int = 300) -> Dict[str, Any]:
        """Wait for task result with timeout"""
        import time
        start = time.time()
        while time.time() - start < timeout:
            result = self.queue.get_result(task_id)
            if result:
                return result
            time.sleep(1)
        return {"status": "timeout", "error": f"Task {task_id} timed out"}
```

---

### Phase 5: Update LangGraph to Use Distributed Agents

#### 3.5.1 Modified Graph with Task Distribution

**File:** `/orchestrator/src/graph.py` (modified sections)

```python
from supervisor import Supervisor

supervisor = Supervisor()

def plan_node(state: WAVEState) -> dict:
    """Dispatch planning to PM agent"""
    notify_step("supervisor", "dispatching to PM agent",
                state.get("requirements", "")[:50], state.get("story_id", ""))

    # Dispatch to PM agent
    task_id = supervisor.dispatch_to_pm(
        state["story_id"],
        state["requirements"]
    )

    # Wait for PM agent to complete
    result = supervisor.wait_for_result(task_id, timeout=120)

    return {
        "plan": result.get("plan", ""),
        "plan_feasible": result.get("status") == "completed",
        "phase": Phase.DEVELOP.value,
        "updated_at": datetime.now().isoformat()
    }

def develop_node(state: WAVEState) -> dict:
    """Dispatch development to FE/BE agents in parallel"""
    notify_step("supervisor", "dispatching to FE + BE agents",
                state.get("requirements", "")[:50], state.get("story_id", ""))

    # Parse files from plan
    fe_files = [f for f in state.get("files_modified", []) if ".tsx" in f or ".ts" in f]
    be_files = [f for f in state.get("files_modified", []) if ".py" in f or "api" in f]

    # Dispatch in parallel
    task_ids = supervisor.dispatch_parallel(
        state["story_id"],
        fe_files,
        be_files,
        state["requirements"]
    )

    # Wait for both to complete
    fe_result = supervisor.wait_for_result(task_ids["fe_task_id"], timeout=180)
    be_result = supervisor.wait_for_result(task_ids["be_task_id"], timeout=180)

    return {
        "code": fe_result.get("code", "") + "\n" + be_result.get("code", ""),
        "files_modified": fe_result.get("files_modified", []) + be_result.get("files_modified", []),
        "phase": Phase.QA.value,
        "gate": Gate.DEV_COMPLETE.value,
        "updated_at": datetime.now().isoformat()
    }
```

---

## 4. Expected Dozzle Output

After implementation, Dozzle will show:

```
┌─────────────────────────────────────────────────────────────────────┐
│ wave-orchestrator                                                    │
│ [11:30:01] Workflow started: AUTH-001                               │
│ [11:30:01] Dispatching to PM agent...                               │
│ [11:30:15] PM completed, dispatching to FE + BE...                  │
│ [11:30:45] FE + BE completed, dispatching to QA...                  │
├─────────────────────────────────────────────────────────────────────┤
│ wave-pm-agent                                                        │
│ [11:30:01] [PM-1] Received task: pm-AUTH-001-a3f2                   │
│ [11:30:01] [PM-1] Planning story breakdown: AUTH-001                │
│ [11:30:05] [PM-1] Requirements: Implement user authentication...    │
│ [11:30:14] [PM-1] Story breakdown complete, creating subtasks       │
│ [11:30:15] [PM-1] Completed task: pm-AUTH-001-a3f2 in 14.2s        │
├─────────────────────────────────────────────────────────────────────┤
│ wave-fe-agent-1                                                      │
│ [11:30:15] [FE-1] Received task: fe-AUTH-001-b4c3                   │
│ [11:30:15] [FE-1] Starting frontend development: AUTH-001           │
│ [11:30:16] [FE-1] Target files: ['SignupForm.tsx', 'LoginForm.tsx'] │
│ [11:30:35] [FE-1] Frontend code generation complete                 │
│ [11:30:35] [FE-1] Files modified: ['SignupForm.tsx', 'LoginForm.tsx']│
├─────────────────────────────────────────────────────────────────────┤
│ wave-be-agent-1                                                      │
│ [11:30:15] [BE-1] Received task: be-AUTH-001-c5d4                   │
│ [11:30:15] [BE-1] Starting backend development: AUTH-001            │
│ [11:30:16] [BE-1] Target files: ['auth.py', 'supabase_client.py']   │
│ [11:30:40] [BE-1] Backend code generation complete                  │
│ [11:30:40] [BE-1] Files modified: ['auth.py', 'supabase_client.py'] │
├─────────────────────────────────────────────────────────────────────┤
│ wave-qa-agent                                                        │
│ [11:30:45] [QA-1] Received task: qa-AUTH-001-d6e5                   │
│ [11:30:45] [QA-1] Starting QA validation: AUTH-001                  │
│ [11:30:46] [QA-1] Testing files: ['SignupForm.tsx', 'auth.py'...]   │
│ [11:31:00] [QA-1] QA validation complete                            │
│ [11:31:00] [QA-1] Completed task: qa-AUTH-001-d6e5 in 15.3s        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Testing Strategy

### 5.1 Unit Tests

1. **TaskQueue Tests**
   - Enqueue/dequeue operations
   - Result submission and retrieval
   - Pub/sub notifications

2. **Agent Worker Tests**
   - Task processing
   - Error handling
   - Graceful shutdown

### 5.2 Integration Tests

1. **End-to-End Workflow**
   - Submit story → PM → FE+BE parallel → QA → Complete
   - Verify all agents received and processed tasks
   - Verify results aggregated correctly

2. **Parallel Execution**
   - Submit multiple stories
   - Verify FE and BE run simultaneously
   - Verify no race conditions

### 5.3 Dozzle Verification

1. All agent containers show as "Running"
2. Each agent logs with domain prefix
3. Task flow visible across containers
4. Real-time updates during execution

---

## 6. Rollback Plan

If issues arise:

1. **Immediate:** Switch back to inline execution in graph.py
2. **Agent Issues:** Individual agent containers can be restarted
3. **Queue Issues:** Redis data can be flushed, agents will restart polling
4. **Full Rollback:** Revert to previous docker-compose without worker agents

---

## 7. Success Criteria

| Metric | Target |
|--------|--------|
| All agent containers running | 7/7 (orchestrator + 6 agents) |
| Dozzle shows domain-specific logs | Yes |
| Parallel FE+BE execution | < 1s difference in start time |
| Task completion visible per agent | Yes |
| Slack notifications per agent | Yes |
| No LangSmith errors | Yes |

---

## 8. Implementation Order

1. **Phase 1:** Redis Task Queue (2 files)
2. **Phase 2:** Agent Worker Framework (6 files)
3. **Phase 3:** Docker Configuration (2 files)
4. **Phase 4:** Supervisor Integration (1 file)
5. **Phase 5:** Graph Update (1 file)
6. **Phase 6:** Testing & Validation

---

## Approval Request

**For Grok Review:**

This plan transforms WAVE from single-container execution to true distributed multi-agent architecture with:

- Real-time visibility of each domain agent in Dozzle
- Parallel FE/BE execution capability
- Redis-based task queue for reliable distribution
- Scalable agent pool (can add more FE/BE workers)
- Clear domain separation and logging

**Please confirm:**
1. Architecture approach is correct
2. Agent naming convention (PM, CTO, FE, BE, QA) approved
3. Redis as task queue is acceptable
4. Parallel FE+BE execution pattern approved

---

**Awaiting Grok Approval to Proceed with Implementation**
