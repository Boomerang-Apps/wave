# Phase 11: Portal Integration - Gate 0 Validation

**Date:** 2026-01-25
**Phase:** 11 of 11 (Final Phase)
**Pattern:** Portal API Contract and Real-Time Events

---

## Requirements from Grok's Recommendations

### Objective
Connect with Portal's dependency-graph.js and provide real-time per-domain updates during execution.

### Key Quote from Grok
> "Portal Request (domains + dependencies) → CTO Master Supervisor... Real-time per-domain updates"

The orchestrator must accept domain dependencies from Portal and emit per-domain progress events.

---

## Gap Analysis

### Current Implementation

```python
# Current: src/api/endpoints.py
class WorkflowRequest(BaseModel):
    story_id: str
    project_path: str
    requirements: str
    wave_number: int = 1
    # No domain or dependency support

# Current: src/api/redis_pubsub.py
async def publish_event(channel: str, event: Dict):
    # Generic event publishing, not domain-specific
```

**Limitations:**
- No domain list in workflow request
- No dependency mapping support
- No per-domain event channels
- No domain progress tracking
- Generic events, not domain-specific

### Required Implementation (Phase 11)

| Feature | Current | Required |
|---------|---------|----------|
| Domain list | ❌ None | ✅ `domains: List[str]` |
| Dependencies | ❌ None | ✅ `dependencies: Dict[str, List[str]]` |
| Domain events | ❌ Generic | ✅ Per-domain channels |
| Progress tracking | ❌ Overall only | ✅ Per-domain progress |
| Event types | ❌ Basic | ✅ started/progress/complete |

---

## Components to Implement

### 1. Enhanced Request Models (`src/api/portal_models.py` - NEW)

```python
class PortalWorkflowRequest(BaseModel):
    domains: List[str]
    dependencies: Dict[str, List[str]]
    wave_number: int
    story_ids: List[str]
    project_path: str
    requirements: str

class DomainProgressEvent(BaseModel):
    event_type: str  # "started", "progress", "complete"
    domain: str
    run_id: str
    timestamp: str
    data: Dict[str, Any]
```

### 2. Portal Endpoints (`src/api/portal_endpoints.py` - NEW)

```python
async def start_with_dependencies(request: PortalWorkflowRequest) -> Dict
async def get_domain_status(run_id: str, domain: str) -> Dict
async def get_run_status(run_id: str) -> Dict
```

### 3. Domain Event Publisher (`src/api/domain_events.py` - NEW)

```python
class DomainEventPublisher:
    async def publish_domain_started(run_id: str, domain: str) -> None
    async def publish_domain_progress(run_id: str, domain: str, progress: Dict) -> None
    async def publish_domain_complete(run_id: str, domain: str, result: Dict) -> None
    def get_domain_channel(run_id: str, domain: str) -> str
```

---

## Test Categories (TDD)

### 1. API Endpoint Tests (6 tests)
- `test_portal_workflow_request_exists`
- `test_portal_workflow_request_has_domains`
- `test_portal_workflow_request_has_dependencies`
- `test_start_with_dependencies_exists`
- `test_get_domain_status_exists`
- `test_get_run_status_exists`

### 2. Event Publishing Tests (8 tests)
- `test_domain_event_publisher_exists`
- `test_publish_domain_started_exists`
- `test_publish_domain_progress_exists`
- `test_publish_domain_complete_exists`
- `test_get_domain_channel_exists`
- `test_domain_channel_includes_run_id`
- `test_domain_channel_includes_domain`
- `test_domain_progress_event_exists`

### 3. Portal Contract Tests (4 tests)
- `test_portal_request_validates_domains`
- `test_portal_request_validates_dependencies`
- `test_portal_response_includes_run_id`
- `test_portal_response_includes_status`

**Total: 18 tests**

---

## Implementation Order

1. **Create portal_models.py** - Request/response models
2. **Create domain_events.py** - Event publisher
3. **Create portal_endpoints.py** - API endpoints
4. **Update src/api/__init__.py** - Export new components

---

## Success Criteria

- [ ] All 18 TDD tests pass
- [ ] Full test suite (482 + 18 = 500) passes
- [ ] Portal can send domains with dependencies
- [ ] Per-domain events are published
- [ ] Run status includes all domain statuses

---

## Example: Portal Request/Response

```json
// Request
POST /orchestrator/start
{
  "domains": ["auth", "payments", "profile"],
  "dependencies": {
    "payments": ["auth"],
    "profile": ["auth"]
  },
  "wave_number": 3,
  "story_ids": ["WAVE-123", "WAVE-124"],
  "project_path": "/projects/myapp",
  "requirements": "Implement user authentication flow"
}

// Response
{
  "success": true,
  "run_id": "abc123",
  "status": "started",
  "domains": {
    "auth": {"status": "pending", "layer": 0},
    "payments": {"status": "pending", "layer": 1},
    "profile": {"status": "pending", "layer": 1}
  }
}
```

---

## Example: Domain Events

```json
// Channel: wave:abc123:domain:auth
{
  "event": "domain.started",
  "domain": "auth",
  "run_id": "abc123",
  "timestamp": "2026-01-25T12:00:00Z"
}

// Channel: wave:abc123:domain:auth
{
  "event": "domain.progress",
  "domain": "auth",
  "run_id": "abc123",
  "current_node": "dev",
  "files_modified": ["auth.py"],
  "tests_status": "running"
}

// Channel: wave:abc123:domain:auth
{
  "event": "domain.complete",
  "domain": "auth",
  "run_id": "abc123",
  "qa_passed": true,
  "safety_score": 0.92
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     PORTAL INTEGRATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Portal (Next.js)                                               │
│    │                                                             │
│    ├── dependency-graph.js ──┐                                  │
│    │   (builds domain deps)  │                                  │
│    │                         ↓                                  │
│    └── POST /orchestrator/start                                 │
│            {domains, dependencies, ...}                         │
│                         │                                        │
│  ═══════════════════════╪════════════════════════════════════   │
│                         ↓                                        │
│  Orchestrator (Python)                                          │
│    │                                                             │
│    ├── portal_endpoints.py                                      │
│    │   └── start_with_dependencies()                            │
│    │            │                                                │
│    │            ↓                                                │
│    ├── Creates ParallelState with deps                          │
│    │            │                                                │
│    │            ↓                                                │
│    ├── Executes domains (Phases 7-10)                           │
│    │            │                                                │
│    │            ↓                                                │
│    └── domain_events.py                                         │
│        ├── publish_domain_started()                             │
│        ├── publish_domain_progress()                            │
│        └── publish_domain_complete()                            │
│                         │                                        │
│  ═══════════════════════╪════════════════════════════════════   │
│                         ↓                                        │
│  Redis Pub/Sub                                                  │
│    └── wave:{run_id}:domain:{domain}                            │
│                         │                                        │
│  ═══════════════════════╪════════════════════════════════════   │
│                         ↓                                        │
│  Portal (WebSocket)                                             │
│    └── Real-time domain progress UI                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Notes

- This is the final phase of the enhancement plan
- Connects all previous phases (7-10) with Portal frontend
- Event channels follow Redis pub/sub naming conventions
- Per-domain events enable real-time UI updates
- Dependencies from Portal's dependency-graph.js are respected
- Total test count reaches 500 as planned
