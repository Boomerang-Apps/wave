# Orchestrator Bridge Integration

This directory contains the Portal ↔ Orchestrator v2 bridge for real-time domain events.

## Overview

The bridge connects the Portal's Express backend to the Python Orchestrator's Redis pub/sub channels, enabling real-time updates for domain execution progress.

```
┌─────────────────────────────────────────────────────────────────────┐
│                           PORTAL                                     │
│  ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐    │
│  │ React UI     │◄───│ SSE/WebSocket  │◄───│ Express Server   │    │
│  │ (Dashboard)  │    │ Connection     │    │ + Bridge Routes  │    │
│  └──────────────┘    └────────────────┘    └────────┬─────────┘    │
└─────────────────────────────────────────────────────┼───────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      REDIS PUB/SUB                                   │
│                                                                      │
│   Channels: wave:{run_id}:domain:{domain}                           │
│   Events: domain.started, domain.progress, domain.complete          │
└─────────────────────────────────────────────────────────────────────┘
                                                      ▲
                                                      │
┌─────────────────────────────────────────────────────┼───────────────┐
│                      ORCHESTRATOR v2                 │               │
│  ┌──────────────────┐    ┌─────────────────────────┐│               │
│  │ DomainEventPublisher │───│ Python StateGraph     ││               │
│  │ (Publishes events)   │    │ (LangGraph execution)││               │
│  └──────────────────┘    └─────────────────────────┘│               │
└─────────────────────────────────────────────────────────────────────┘
```

## Files

- `utils/orchestrator-bridge.js` - Core bridge class with Redis subscriber
- `routes/orchestrator-routes.js` - Express routes for API proxy and SSE
- `orchestrator-integration.js` - Integration helper for server setup
- `__tests__/orchestrator-bridge.test.js` - Unit tests

## Quick Start

### 1. Install Redis dependency

```bash
cd portal
npm install redis
```

### 2. Add to server/index.js

Add this near the top with other imports:

```javascript
import { initializeOrchestratorBridge } from './orchestrator-integration.js';
```

Add this after setting up the Express app and middleware:

```javascript
// Initialize orchestrator bridge (optional WebSocket service for event forwarding)
const { bridge } = await initializeOrchestratorBridge(app);
```

### 3. Set environment variables

Create or update `.env`:

```env
# Redis connection (orchestrator publishes events here)
REDIS_URL=redis://localhost:6379

# Python orchestrator API URL
ORCHESTRATOR_URL=http://localhost:8000

# Enable/disable bridge (default: true)
ENABLE_ORCHESTRATOR_BRIDGE=true
```

### 4. Start both services

Terminal 1 - Python Orchestrator:
```bash
cd orchestrator
python -m uvicorn main:app --reload --port 8000
```

Terminal 2 - Portal Server:
```bash
cd portal
npm run dev:all
```

## API Endpoints

### Start Workflow

```http
POST /api/orchestrator/workflows/start
Content-Type: application/json

{
  "domains": ["auth", "payments", "profile"],
  "dependencies": {
    "payments": ["auth"],
    "profile": ["auth"]
  },
  "wave_number": 1,
  "story_ids": ["WAVE-123"],
  "project_path": "/path/to/project",
  "requirements": "Implement user authentication"
}
```

Response:
```json
{
  "success": true,
  "run_id": "abc12345",
  "status": "started",
  "domains": {
    "auth": { "status": "pending", "layer": 0 },
    "payments": { "status": "pending", "layer": 1 },
    "profile": { "status": "pending", "layer": 1 }
  }
}
```

### Get Run Status

```http
GET /api/orchestrator/runs/{runId}
```

### Get Domain Status

```http
GET /api/orchestrator/runs/{runId}/{domain}
```

### SSE Events Stream

```http
GET /api/orchestrator/events/{runId}?domains=auth,payments
```

Events received:
- `connected` - Initial connection established
- `initial_status` - Current run status
- `domain.started` - Domain execution began
- `domain.progress` - Domain progress update
- `domain.complete` - Domain finished
- `heartbeat` - Keep-alive (every 30s)

### Health Check

```http
GET /api/orchestrator/health
```

## React Integration

Use the provided hook in your components:

```tsx
import { useOrchestratorEvents, useStartWorkflow } from '../hooks/useOrchestratorEvents';

function DomainProgress({ runId }: { runId: string }) {
  const {
    events,
    domainStatuses,
    connectionStatus,
    error
  } = useOrchestratorEvents(runId, ['auth', 'payments']);

  return (
    <div>
      <p>Status: {connectionStatus}</p>
      {error && <p className="error">{error}</p>}

      {Object.entries(domainStatuses).map(([domain, status]) => (
        <div key={domain}>
          <span>{domain}: {status.status}</span>
          <progress value={status.progress} max={100} />
        </div>
      ))}

      <h3>Recent Events</h3>
      <ul>
        {events.slice(-5).map((event, i) => (
          <li key={i}>{event.event} - {event.domain}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Event Types

### domain.started
```json
{
  "event": "domain.started",
  "domain": "auth",
  "run_id": "abc12345",
  "timestamp": "2026-01-25T12:00:00Z"
}
```

### domain.progress
```json
{
  "event": "domain.progress",
  "domain": "auth",
  "run_id": "abc12345",
  "timestamp": "2026-01-25T12:01:00Z",
  "current_node": "developer",
  "files_modified": ["src/auth/login.py"],
  "tests_status": "running"
}
```

### domain.complete
```json
{
  "event": "domain.complete",
  "domain": "auth",
  "run_id": "abc12345",
  "timestamp": "2026-01-25T12:05:00Z",
  "qa_passed": true,
  "safety_score": 0.95
}
```

## Testing

Run the bridge tests:

```bash
cd portal
npm test -- server/__tests__/orchestrator-bridge.test.js
```

## Troubleshooting

### Bridge not connecting to Redis

1. Ensure Redis is running: `redis-cli ping`
2. Check REDIS_URL environment variable
3. Look for connection errors in server logs

### Events not appearing in UI

1. Check SSE connection in browser DevTools (Network tab)
2. Verify orchestrator is publishing to correct channels
3. Test with Redis CLI: `redis-cli PSUBSCRIBE "wave:*"`

### Orchestrator API errors

1. Verify ORCHESTRATOR_URL is correct
2. Check orchestrator is running: `curl http://localhost:8000/health`
3. Check for CORS issues if different origins
