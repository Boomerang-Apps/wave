# WAVE V2 - Comprehensive Testing & POC Plan

> **Document Version:** 1.0
> **Created:** 2026-01-27
> **Purpose:** Systematic validation of ALL WAVE V2 components
> **Methodology:** Grok-recommended phased testing approach

---

## Executive Summary

This document provides a step-by-step testing plan to validate every component of the WAVE V2 Multi-Agent Autonomous Development Framework. Each section includes:
- Progress checkboxes
- Validation commands
- Expected outputs
- Troubleshooting steps

---

## Overall Progress

```
Phase 1: Infrastructure     [░░░░░░░░░░] 0%
Phase 2: Core Services      [░░░░░░░░░░] 0%
Phase 3: Orchestration      [░░░░░░░░░░] 0%
Phase 4: Agent Layer        [░░░░░░░░░░] 0%
Phase 5: Safety Systems     [░░░░░░░░░░] 0%
Phase 6: Notifications      [░░░░░░░░░░] 0%
Phase 7: Monitoring         [░░░░░░░░░░] 0%
Phase 8: Portal             [░░░░░░░░░░] 0%
Phase 9: Integration        [░░░░░░░░░░] 0%
Phase 10: End-to-End        [░░░░░░░░░░] 0%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL PROGRESS              [░░░░░░░░░░] 0%
```

---

# PHASE 1: Infrastructure Foundation

**Goal:** Validate all infrastructure components are installed and accessible

## 1.1 Docker Engine
```
Progress: [░░░░░░░░░░] 0/4 checks
```

- [ ] **1.1.1** Docker installed
  ```bash
  docker --version
  # Expected: Docker version 20.10+ or higher
  ```

- [ ] **1.1.2** Docker daemon running
  ```bash
  docker ps
  # Expected: No error, shows container list (may be empty)
  ```

- [ ] **1.1.3** Docker Compose installed
  ```bash
  docker compose version
  # Expected: Docker Compose version v2.0+
  ```

- [ ] **1.1.4** Docker socket accessible
  ```bash
  ls -la /var/run/docker.sock
  # Expected: Socket file exists with proper permissions
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 1.2 Network Configuration
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **1.2.1** Create wave-network
  ```bash
  docker network create wave-network 2>/dev/null || echo "Network exists"
  docker network ls | grep wave-network
  # Expected: wave-network listed with bridge driver
  ```

- [ ] **1.2.2** Verify network configuration
  ```bash
  docker network inspect wave-network
  # Expected: JSON with Subnet, Gateway configured
  ```

- [ ] **1.2.3** Test port availability
  ```bash
  # Check required ports are free
  lsof -i :3000 || echo "Port 3000 free"
  lsof -i :5173 || echo "Port 5173 free"
  lsof -i :8000 || echo "Port 8000 free"
  lsof -i :8080 || echo "Port 8080 free"
  lsof -i :6379 || echo "Port 6379 free"
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 1.3 Volume Configuration
```
Progress: [░░░░░░░░░░] 0/2 checks
```

- [ ] **1.3.1** Create wave-claude-config volume
  ```bash
  docker volume create wave-claude-config
  docker volume ls | grep wave-claude-config
  # Expected: Volume listed
  ```

- [ ] **1.3.2** Verify project directory
  ```bash
  ls -la $PROJECT_PATH
  # Expected: Project directory accessible
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 1.4 Environment Variables
```
Progress: [░░░░░░░░░░] 0/5 checks
```

- [ ] **1.4.1** ANTHROPIC_API_KEY set
  ```bash
  echo "${ANTHROPIC_API_KEY:0:10}..."
  # Expected: Shows first 10 chars of API key
  ```

- [ ] **1.4.2** PROJECT_PATH set
  ```bash
  echo $PROJECT_PATH
  # Expected: Valid path to target project
  ```

- [ ] **1.4.3** WAVE orchestrator .env exists
  ```bash
  cat /Volumes/SSD-01/Projects/WAVE/orchestrator/.env | head -10
  # Expected: Environment variables listed
  ```

- [ ] **1.4.4** Portal .env exists
  ```bash
  cat /Volumes/SSD-01/Projects/WAVE/portal/.env | head -10
  # Expected: Supabase and Slack config shown
  ```

- [ ] **1.4.5** Root .env exists (or export vars)
  ```bash
  cat /Volumes/SSD-01/Projects/WAVE/.env 2>/dev/null || echo "Using exported vars"
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

# PHASE 2: Core External Services

**Goal:** Validate all external services are running and accessible

## 2.1 Redis
```
Progress: [░░░░░░░░░░] 0/4 checks
```

- [ ] **2.1.1** Start Redis container
  ```bash
  docker run -d --name wave-redis --network wave-network -p 6379:6379 redis:alpine
  # Or if exists:
  docker start wave-redis
  ```

- [ ] **2.1.2** Verify Redis running
  ```bash
  docker ps | grep wave-redis
  # Expected: Container running
  ```

- [ ] **2.1.3** Test Redis connectivity
  ```bash
  docker exec wave-redis redis-cli ping
  # Expected: PONG
  ```

- [ ] **2.1.4** Test Redis pub/sub
  ```bash
  # Terminal 1:
  docker exec -it wave-redis redis-cli SUBSCRIBE wave:test
  # Terminal 2:
  docker exec wave-redis redis-cli PUBLISH wave:test "hello"
  # Expected: Message received in Terminal 1
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 2.2 Supabase (Database)
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **2.2.1** Verify Supabase URL configured
  ```bash
  grep SUPABASE /Volumes/SSD-01/Projects/WAVE/portal/.env
  # Expected: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set
  ```

- [ ] **2.2.2** Test Supabase connection (via Portal)
  ```bash
  # Start portal and check browser console for connection
  # Or test via curl:
  curl -s "$VITE_SUPABASE_URL/rest/v1/" \
    -H "apikey: $VITE_SUPABASE_ANON_KEY" | head -20
  ```

- [ ] **2.2.3** Verify tables exist
  ```
  Tables required:
  - [ ] stories
  - [ ] waves
  - [ ] checkpoints
  - [ ] budget_logs
  - [ ] slack_threads
  - [ ] slack_notification_log
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 2.3 Anthropic API
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **2.3.1** Verify API key format
  ```bash
  [[ "$ANTHROPIC_API_KEY" == sk-ant-* ]] && echo "Valid format" || echo "Invalid"
  # Expected: Valid format
  ```

- [ ] **2.3.2** Test API connectivity
  ```bash
  curl -s https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
  # Expected: JSON response (or auth error if no credit)
  ```

- [ ] **2.3.3** Verify models available
  ```
  Required models:
  - [ ] claude-opus-4-5-20251101 (CTO, PM)
  - [ ] claude-sonnet-4-20250514 (Dev agents)
  - [ ] claude-haiku-4-20250514 (QA)
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

# PHASE 3: Orchestration Layer

**Goal:** Validate LangGraph orchestrator and Python services

## 3.1 Python Environment
```
Progress: [░░░░░░░░░░] 0/4 checks
```

- [ ] **3.1.1** Python version
  ```bash
  cd /Volumes/SSD-01/Projects/WAVE/orchestrator
  source venv/bin/activate
  python --version
  # Expected: Python 3.9+
  ```

- [ ] **3.1.2** Dependencies installed
  ```bash
  pip list | grep -E "langgraph|langchain|fastapi|anthropic"
  # Expected: All packages listed
  ```

- [ ] **3.1.3** LangGraph version
  ```bash
  python -c "import langgraph; print(langgraph.__version__)"
  # Expected: 0.2.0+
  ```

- [ ] **3.1.4** LangChain Anthropic version
  ```bash
  python -c "import langchain_anthropic; print(langchain_anthropic.__version__)"
  # Expected: 0.3.0+
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 3.2 FastAPI Orchestrator Server
```
Progress: [░░░░░░░░░░] 0/5 checks
```

- [ ] **3.2.1** Start orchestrator
  ```bash
  cd /Volumes/SSD-01/Projects/WAVE/orchestrator
  source venv/bin/activate
  nohup python main.py > /tmp/orch.log 2>&1 &
  sleep 3
  ```

- [ ] **3.2.2** Health check
  ```bash
  curl -s http://localhost:8000/health
  # Expected: {"status":"healthy","version":"0.1.0",...}
  ```

- [ ] **3.2.3** Test run endpoint
  ```bash
  curl -s -X POST http://localhost:8000/runs \
    -H "Content-Type: application/json" \
    -d '{"task":"Test task","repo_path":"/tmp"}'
  # Expected: {"run_id":"...","status":"completed",...}
  ```

- [ ] **3.2.4** Verify LangGraph execution
  ```bash
  # Check logs for graph execution
  grep -E "supervisor|pm|cto|dev|qa" /tmp/orch.log
  # Expected: Agent names in logs
  ```

- [ ] **3.2.5** Check LangSmith traces (if enabled)
  ```bash
  # Visit https://smith.langchain.com
  # Expected: Traces visible for wave-orchestrator project
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 3.3 LangGraph State & Nodes
```
Progress: [░░░░░░░░░░] 0/6 checks
```

- [ ] **3.3.1** WAVEState schema valid
  ```bash
  python -c "from state import WAVEState, create_initial_state; print('OK')"
  # Expected: OK
  ```

- [ ] **3.3.2** Supervisor node works
  ```bash
  python -c "from nodes.supervisor import supervisor_node; print('OK')"
  ```

- [ ] **3.3.3** Dev node with Claude
  ```bash
  python -c "from nodes.dev import dev_node, CLAUDE_AVAILABLE; print(f'Claude: {CLAUDE_AVAILABLE}')"
  # Expected: Claude: True
  ```

- [ ] **3.3.4** PM node works
  ```bash
  python -c "from nodes.pm import pm_node; print('OK')"
  ```

- [ ] **3.3.5** CTO node works
  ```bash
  python -c "from nodes.cto import cto_node; print('OK')"
  ```

- [ ] **3.3.6** QA node works
  ```bash
  python -c "from nodes.qa import qa_node; print('OK')"
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

# PHASE 4: Docker Agent Layer

**Goal:** Validate all Docker agent containers

## 4.1 Build Agent Image
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **4.1.1** Build Dockerfile.agent
  ```bash
  cd /Volumes/SSD-01/Projects/WAVE
  docker build -t wave-agent:latest -f Dockerfile.agent .
  # Expected: Successfully built
  ```

- [ ] **4.1.2** Verify image
  ```bash
  docker images | grep wave-agent
  # Expected: wave-agent:latest listed
  ```

- [ ] **4.1.3** Test entrypoint
  ```bash
  docker run --rm wave-agent:latest --help 2>&1 | head -5
  # Expected: Shows entrypoint usage
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 4.2 Merge Watcher Container
```
Progress: [░░░░░░░░░░] 0/4 checks
```

- [ ] **4.2.1** Start merge-watcher
  ```bash
  export PROJECT_PATH=/Volumes/SSD-01/Projects/Footprint
  docker compose up -d merge-watcher
  ```

- [ ] **4.2.2** Verify running
  ```bash
  docker ps | grep wave-merge-watcher
  # Expected: Running status
  ```

- [ ] **4.2.3** Check logs
  ```bash
  docker logs wave-merge-watcher 2>&1 | tail -20
  # Expected: "Merge Watcher - Control Tower" or waiting for signals
  ```

- [ ] **4.2.4** Verify Gate 0 certification created
  ```bash
  cat $PROJECT_PATH/.claude/gate0-lock.json
  # Expected: JSON with "certified": true
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 4.3 Wave Orchestrator Container
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **4.3.1** Start orchestrator container
  ```bash
  docker compose up -d orchestrator
  ```

- [ ] **4.3.2** Verify running
  ```bash
  docker ps | grep wave-orchestrator
  ```

- [ ] **4.3.3** Check logs
  ```bash
  docker logs wave-orchestrator 2>&1 | tail -20
  # Expected: Budget & Retry Management active
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 4.4 Leadership Agents (Opus 4.5)
```
Progress: [░░░░░░░░░░] 0/4 checks
```

- [ ] **4.4.1** Start CTO agent
  ```bash
  docker compose --profile leadership up -d cto
  docker ps | grep wave-cto
  ```

- [ ] **4.4.2** Start PM agent
  ```bash
  docker compose --profile leadership up -d pm
  docker ps | grep wave-pm
  ```

- [ ] **4.4.3** Verify CTO logs
  ```bash
  docker logs wave-cto 2>&1 | tail -10
  # Expected: Agent initialized, waiting for assignment
  ```

- [ ] **4.4.4** Verify PM logs
  ```bash
  docker logs wave-pm 2>&1 | tail -10
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 4.5 Development Agents (Sonnet 4)
```
Progress: [░░░░░░░░░░] 0/6 checks
```

- [ ] **4.5.1** Start FE-Dev-1
  ```bash
  docker compose --profile frontend up -d fe-dev-1
  ```

- [ ] **4.5.2** Start FE-Dev-2
  ```bash
  docker compose --profile frontend up -d fe-dev-2
  ```

- [ ] **4.5.3** Start BE-Dev-1
  ```bash
  docker compose --profile backend up -d be-dev-1
  ```

- [ ] **4.5.4** Start BE-Dev-2
  ```bash
  docker compose --profile backend up -d be-dev-2
  ```

- [ ] **4.5.5** Start Dev-Fix
  ```bash
  docker compose --profile agents up -d dev-fix
  ```

- [ ] **4.5.6** Verify all dev agents running
  ```bash
  docker ps | grep -E "fe-dev|be-dev|dev-fix"
  # Expected: 5 containers running
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 4.6 QA Agent (Haiku 4)
```
Progress: [░░░░░░░░░░] 0/2 checks
```

- [ ] **4.6.1** Start QA agent
  ```bash
  docker compose --profile qa up -d qa
  ```

- [ ] **4.6.2** Verify QA running
  ```bash
  docker ps | grep wave-qa
  docker logs wave-qa 2>&1 | tail -10
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

# PHASE 5: Aerospace Safety Protocol

**Goal:** Validate Constitutional AI, Safety Gates, and Emergency Stop

## 5.1 Constitutional AI Module
```
Progress: [░░░░░░░░░░] 0/5 checks
```

- [ ] **5.1.1** Safety module loads
  ```bash
  cd /Volumes/SSD-01/Projects/WAVE/orchestrator
  python -c "from src.safety.constitutional import ConstitutionalChecker; print('OK')"
  ```

- [ ] **5.1.2** Safety categories defined
  ```
  Categories:
  - [ ] DESTRUCTIVE - Irreversible actions
  - [ ] SECURITY - Credential exposure
  - [ ] SCOPE - Boundary violations
  - [ ] RESOURCE - Budget violations
  - [ ] UNCERTAINTY - High-risk actions
  ```

- [ ] **5.1.3** Block threshold configured
  ```bash
  grep CONSTITUTIONAL_BLOCK /Volumes/SSD-01/Projects/WAVE/orchestrator/.env
  # Expected: CONSTITUTIONAL_BLOCK_THRESHOLD=0.7
  ```

- [ ] **5.1.4** Escalate threshold configured
  ```bash
  grep CONSTITUTIONAL_ESCALATE /Volumes/SSD-01/Projects/WAVE/orchestrator/.env
  # Expected: CONSTITUTIONAL_ESCALATE_THRESHOLD=0.85
  ```

- [ ] **5.1.5** Safety gate node works
  ```bash
  python -c "from nodes.safety_gate import safety_gate_node; print('OK')"
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 5.2 Emergency Stop (E-STOP)
```
Progress: [░░░░░░░░░░] 0/4 checks
```

- [ ] **5.2.1** E-STOP script exists
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/safe-termination.sh
  ```

- [ ] **5.2.2** Kill switch script exists
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/check-kill-switch.sh
  ```

- [ ] **5.2.3** E-STOP signal file mechanism
  ```bash
  # Create E-STOP signal
  echo '{"emergency":true,"reason":"test"}' > $PROJECT_PATH/.claude/ESTOP.json
  # Verify agents detect it
  ```

- [ ] **5.2.4** Test E-STOP propagation
  ```bash
  # All agents should stop when E-STOP detected
  docker logs wave-merge-watcher 2>&1 | grep -i "stop\|emergency"
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 5.3 Safety Violation Detection
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **5.3.1** Violation detector script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/safety-violation-detector.sh
  ```

- [ ] **5.3.2** Behavioral safety probe
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/behavioral-safety-probe.sh
  ```

- [ ] **5.3.3** Safety traceability
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/safety-traceability.sh
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 5.4 Budget Safety
```
Progress: [░░░░░░░░░░] 0/4 checks
```

- [ ] **5.4.1** Budget module loads
  ```bash
  python -c "from src.safety.budget import BudgetTracker; print('OK')"
  ```

- [ ] **5.4.2** Default limits configured
  ```bash
  grep -E "TOKEN_LIMIT|COST_LIMIT" /Volumes/SSD-01/Projects/WAVE/orchestrator/.env
  # Expected: DEFAULT_TOKEN_LIMIT=100000, DEFAULT_COST_LIMIT_USD=10.0
  ```

- [ ] **5.4.3** Budget alerts levels
  ```
  - [ ] NORMAL (0-75%)
  - [ ] WARNING (75-89%) → Slack notification
  - [ ] CRITICAL (90-99%) → Slack alert + slowdown
  - [ ] EXCEEDED (100%+) → STOP
  ```

- [ ] **5.4.4** Test budget tracking
  ```bash
  # Run a task and verify budget is tracked in state
  curl -s http://localhost:8000/runs -X POST \
    -H "Content-Type: application/json" \
    -d '{"task":"Test budget","repo_path":"/tmp"}'
  # Check budget in response/logs
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

# PHASE 6: RLM (Recursive Language Model)

**Goal:** Validate P Variable and context management

## 6.1 P Variable System
```
Progress: [░░░░░░░░░░] 0/5 checks
```

- [ ] **6.1.1** P Variable loader script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/rlm/load-project-variable.sh
  ```

- [ ] **6.1.2** Memory manager script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/rlm/memory-manager.sh
  ```

- [ ] **6.1.3** Snapshot variable script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/rlm/snapshot-variable.sh
  ```

- [ ] **6.1.4** Restore variable script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/rlm/restore-variable.sh
  ```

- [ ] **6.1.5** P.md file location
  ```bash
  # Should be created at:
  ls -la $PROJECT_PATH/.claude/P.md
  # Or P.json for structured data
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 6.2 Context Hash & Drift Detection
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **6.2.1** Drift detector script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/drift-detector.sh
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/drift-detector.sh
  ```

- [ ] **6.2.2** Context hash generation
  ```bash
  # Verify P variable contains context hash
  grep -i "hash\|checksum" $PROJECT_PATH/.claude/P.* 2>/dev/null
  ```

- [ ] **6.2.3** Drift auto-invalidation
  ```bash
  # When code changes, downstream locks should invalidate
  # Check lock files in .claude/locks/
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

# PHASE 7: Building Blocks (Phase Validators)

**Goal:** Validate all phase lock enforcement

## 7.1 Phase 0 - Stories Validator
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **7.1.1** Phase 0 validator script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/phase0-validator.sh
  ```

- [ ] **7.1.2** Run Phase 0 validation
  ```bash
  /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/phase0-validator.sh \
    --project $PROJECT_PATH --wave 1
  ```

- [ ] **7.1.3** Phase 0 lock created
  ```bash
  ls -la $PROJECT_PATH/.claude/locks/phase0-*.lock
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 7.2 Phase 1 - Assignment Validator
```
Progress: [░░░░░░░░░░] 0/2 checks
```

- [ ] **7.2.1** Phase 1 validator script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/phase1-validator.sh
  ```

- [ ] **7.2.2** Phase 1 lock mechanism
  ```bash
  # Verify lock file format
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 7.3 Phase 2 - Smoke Test Validator
```
Progress: [░░░░░░░░░░] 0/2 checks
```

- [ ] **7.3.1** Phase 2 validator script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/phase2-validator.sh
  ```

- [ ] **7.3.2** Phase 2 enforcement
  ```bash
  # Must pass before development signals
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 7.4 Phase 3 - Dev Complete Validator
```
Progress: [░░░░░░░░░░] 0/2 checks
```

- [ ] **7.4.1** Phase 3 validator script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/phase3-validator.sh
  ```

- [ ] **7.4.2** Worktree sync enforcement
  ```bash
  # Must pass before worktree sync
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 7.5 Phase 4 - QA/Merge Validator
```
Progress: [░░░░░░░░░░] 0/2 checks
```

- [ ] **7.5.1** Phase 4 validator script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/phase4-validator.sh
  ```

- [ ] **7.5.2** Final merge enforcement
  ```bash
  # Must pass before merge
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 7.6 Lock Manager & Circuit Breaker
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **7.6.1** Lock manager script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/lock-manager.sh
  ```

- [ ] **7.6.2** Circuit breaker script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/circuit-breaker.sh
  ```

- [ ] **7.6.3** Health monitor script
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/building-blocks/health-monitor.sh
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

# PHASE 8: Slack Notifications

**Goal:** Validate Slack integration at every step

## 8.1 Slack Configuration
```
Progress: [░░░░░░░░░░] 0/4 checks
```

- [ ] **8.1.1** Slack Bot Token configured (Option A)
  ```bash
  grep SLACK_BOT_TOKEN /Volumes/SSD-01/Projects/WAVE/portal/.env
  # Expected: xoxb-... token
  ```

- [ ] **8.1.2** OR Slack Webhook URL configured (Option B)
  ```bash
  grep SLACK_WEBHOOK_URL /Volumes/SSD-01/Projects/WAVE/portal/.env
  grep SLACK_WEBHOOK_URL /Volumes/SSD-01/Projects/WAVE/orchestrator/.env
  # Expected: https://hooks.slack.com/services/...
  ```

- [ ] **8.1.3** Channel IDs configured
  ```bash
  grep SLACK_CHANNEL /Volumes/SSD-01/Projects/WAVE/portal/.env
  # Expected: SLACK_CHANNEL_UPDATES, SLACK_CHANNEL_ALERTS, SLACK_CHANNEL_BUDGET
  ```

- [ ] **8.1.4** Slack enabled flag
  ```bash
  grep SLACK_ENABLED /Volumes/SSD-01/Projects/WAVE/portal/.env
  # Expected: SLACK_ENABLED=true
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 8.2 Slack Notification Tests
```
Progress: [░░░░░░░░░░] 0/6 checks
```

- [ ] **8.2.1** Test webhook connectivity
  ```bash
  curl -X POST $SLACK_WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d '{"text":"WAVE V2 POC Test - Webhook Working!"}'
  # Expected: "ok" response, message in Slack
  ```

- [ ] **8.2.2** Run start notification
  ```bash
  # Start a run and verify Slack notification received
  curl -X POST http://localhost:8000/runs \
    -H "Content-Type: application/json" \
    -d '{"task":"Slack test run","repo_path":"/tmp"}'
  # Check Slack for "WAVE Run Started" message
  ```

- [ ] **8.2.3** Step notifications
  ```
  Verify notifications for:
  - [ ] Supervisor routing
  - [ ] PM action
  - [ ] CTO action
  - [ ] Dev action
  - [ ] QA action
  ```

- [ ] **8.2.4** Run complete notification
  ```bash
  # Check Slack for "WAVE Run Completed" message
  ```

- [ ] **8.2.5** Code generated notification
  ```bash
  # Check Slack for "Code Generated" with file path
  ```

- [ ] **8.2.6** Budget warning notification (if triggered)
  ```bash
  # Trigger budget warning and verify Slack alert
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 8.3 Portal Slack Notifier
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **8.3.1** SlackNotifier class loads
  ```bash
  # Check Portal server logs for Slack initialization
  grep -i "slack" /tmp/portal-server.log
  ```

- [ ] **8.3.2** Thread-per-story pattern
  ```bash
  # Verify threads created for stories
  # Check slack_threads table in Supabase
  ```

- [ ] **8.3.3** Event routing
  ```
  Events routed:
  - [ ] STORY_START → default channel (creates thread)
  - [ ] STORY_PROGRESS → thread reply
  - [ ] STORY_COMPLETE → thread reply
  - [ ] STORY_FAILED → thread + alerts channel
  - [ ] GATE_TRANSITION → thread reply
  - [ ] BUDGET_WARNING → budget channel
  - [ ] SAFETY_VIOLATION → alerts channel
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

# PHASE 9: Dozzle Log Monitoring

**Goal:** Validate real-time log viewing

## 9.1 Dozzle Container
```
Progress: [░░░░░░░░░░] 0/4 checks
```

- [ ] **9.1.1** Start Dozzle
  ```bash
  docker compose up -d dozzle
  # Or standalone:
  docker run -d --name dozzle -p 8080:8080 \
    -v /var/run/docker.sock:/var/run/docker.sock:ro \
    amir20/dozzle:latest
  ```

- [ ] **9.1.2** Verify running
  ```bash
  docker ps | grep dozzle
  # Expected: Running on port 8080
  ```

- [ ] **9.1.3** Access web UI
  ```bash
  curl -s http://localhost:8080 | head -5
  # Expected: HTML response
  # Open in browser: http://localhost:8080
  ```

- [ ] **9.1.4** Verify container list visible
  ```
  Containers should appear:
  - [ ] wave-merge-watcher
  - [ ] wave-orchestrator
  - [ ] wave-cto
  - [ ] wave-pm
  - [ ] wave-fe-dev-1
  - [ ] wave-fe-dev-2
  - [ ] wave-be-dev-1
  - [ ] wave-be-dev-2
  - [ ] wave-dev-fix
  - [ ] wave-qa
  - [ ] wave-redis
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 9.2 Log Streaming
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **9.2.1** Real-time log updates
  ```
  In Dozzle UI:
  - [ ] Click on wave-merge-watcher
  - [ ] Verify logs stream in real-time
  - [ ] Verify colored output
  ```

- [ ] **9.2.2** Multi-container view
  ```
  - [ ] Select multiple containers
  - [ ] Verify interleaved logs
  ```

- [ ] **9.2.3** Search/filter logs
  ```
  - [ ] Test search functionality
  - [ ] Filter by log level
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

# PHASE 10: Portal Application

**Goal:** Validate WAVE Portal frontend and backend

## 10.1 Portal Backend (Express)
```
Progress: [░░░░░░░░░░] 0/5 checks
```

- [ ] **10.1.1** Install dependencies
  ```bash
  cd /Volumes/SSD-01/Projects/WAVE/portal
  npm install
  ```

- [ ] **10.1.2** Start server
  ```bash
  npm run server
  # Expected: Listening on port 3000
  ```

- [ ] **10.1.3** Health check
  ```bash
  curl -s http://localhost:3000/health
  # Expected: {"status":"ok",...}
  ```

- [ ] **10.1.4** Validate infrastructure endpoint
  ```bash
  curl -s http://localhost:3000/api/validate-infrastructure \
    -H "Content-Type: application/json" \
    -d '{"projectPath":"'$PROJECT_PATH'"}'
  ```

- [ ] **10.1.5** Foundation analysis endpoint
  ```bash
  curl -s http://localhost:3000/api/foundation/analyze \
    -H "Content-Type: application/json" \
    -d '{"projectPath":"'$PROJECT_PATH'"}'
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 10.2 Portal Frontend (Vite + React)
```
Progress: [░░░░░░░░░░] 0/4 checks
```

- [ ] **10.2.1** Start dev server
  ```bash
  npm run dev
  # Expected: Vite server on port 5173
  ```

- [ ] **10.2.2** Access portal
  ```bash
  # Open http://localhost:5173 in browser
  # Expected: WAVE Portal dashboard loads
  ```

- [ ] **10.2.3** Supabase connection
  ```
  In browser console:
  - [ ] No Supabase connection errors
  - [ ] Auth state initialized
  ```

- [ ] **10.2.4** Key pages load
  ```
  - [ ] Dashboard
  - [ ] Project Checklist
  - [ ] Stories
  - [ ] Settings
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 10.3 Portal Features
```
Progress: [░░░░░░░░░░] 0/6 checks
```

- [ ] **10.3.1** Foundation Analyzer (Gate 0)
  ```
  - [ ] Project mode detection
  - [ ] Documentation analysis
  - [ ] Mockup validation
  - [ ] Structure compliance
  ```

- [ ] **10.3.2** PRD Generator
  ```
  - [ ] Generate PRD from mockups
  - [ ] Validate PRD completeness
  ```

- [ ] **10.3.3** Story Generator
  ```
  - [ ] Generate stories from PRD
  - [ ] Story scoring
  ```

- [ ] **10.3.4** Alignment Checker
  ```
  - [ ] PRD ↔ Stories alignment
  - [ ] Stories ↔ Mockups alignment
  ```

- [ ] **10.3.5** AI Code Review
  ```
  - [ ] Submit code for review
  - [ ] View review results
  ```

- [ ] **10.3.6** DORA Metrics
  ```
  - [ ] Deployment frequency
  - [ ] Lead time
  - [ ] MTTR
  - [ ] Change failure rate
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

# PHASE 11: Git Worktrees

**Goal:** Validate isolated development environments

## 11.1 Worktree Setup
```
Progress: [░░░░░░░░░░] 0/4 checks
```

- [ ] **11.1.1** Setup script exists
  ```bash
  ls -la /Volumes/SSD-01/Projects/WAVE/core/scripts/setup-worktrees.sh
  ```

- [ ] **11.1.2** Run setup script
  ```bash
  /Volumes/SSD-01/Projects/WAVE/core/scripts/setup-worktrees.sh \
    --project $PROJECT_PATH
  ```

- [ ] **11.1.3** Verify worktrees created
  ```bash
  ls -la $PROJECT_PATH/worktrees/
  # Expected: fe-dev-1, fe-dev-2, be-dev-1, be-dev-2, qa, dev-fix
  ```

- [ ] **11.1.4** Git worktree list
  ```bash
  cd $PROJECT_PATH
  git worktree list
  # Expected: 6+ worktrees listed
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 11.2 Worktree Branches
```
Progress: [░░░░░░░░░░] 0/2 checks
```

- [ ] **11.2.1** Verify branches
  ```bash
  git branch -a | grep -E "fe-dev|be-dev|qa|dev-fix"
  # Expected: Feature branches for each agent
  ```

- [ ] **11.2.2** Worktree isolation
  ```bash
  # Make change in one worktree, verify not in others
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

# PHASE 12: End-to-End Integration Test

**Goal:** Run complete workflow through all components

## 12.1 Pre-flight Checks
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **12.1.1** All services running
  ```bash
  # Docker containers
  docker ps | grep wave- | wc -l
  # Expected: 10+ containers

  # Orchestrator API
  curl -s http://localhost:8000/health

  # Portal backend
  curl -s http://localhost:3000/health

  # Portal frontend
  curl -s http://localhost:5173

  # Redis
  docker exec wave-redis redis-cli ping
  ```

- [ ] **12.1.2** Slack webhook ready
  ```bash
  curl -X POST $SLACK_WEBHOOK_URL \
    -d '{"text":"Pre-flight check: Slack ready"}'
  ```

- [ ] **12.1.3** Dozzle accessible
  ```bash
  curl -s http://localhost:8080 | head -3
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 12.2 Full Story Execution
```
Progress: [░░░░░░░░░░] 0/8 checks
```

- [ ] **12.2.1** Create test story
  ```bash
  # Create story JSON in $PROJECT_PATH/stories/wave1/
  ```

- [ ] **12.2.2** Trigger run via API
  ```bash
  curl -X POST http://localhost:8000/runs \
    -H "Content-Type: application/json" \
    -d '{
      "task": "E2E Test: Create a UserProfile React component with avatar, name, and email fields",
      "repo_path": "'$PROJECT_PATH'"
    }'
  ```

- [ ] **12.2.3** Verify Gate progression
  ```
  Gates observed:
  - [ ] Gate 1: Story Assigned
  - [ ] Gate 2: Dev Started
  - [ ] Gate 3: Dev Complete
  - [ ] Gate 4: QA Started
  - [ ] Gate 5: QA Passed
  - [ ] Gate 6: Merge Ready
  - [ ] Gate 7: Merged
  ```

- [ ] **12.2.4** Verify Slack notifications
  ```
  Notifications received:
  - [ ] Run Started
  - [ ] Supervisor routing
  - [ ] Code Generated
  - [ ] Run Complete
  ```

- [ ] **12.2.5** Verify Dozzle logs
  ```
  In Dozzle:
  - [ ] merge-watcher activity
  - [ ] Agent execution logs
  ```

- [ ] **12.2.6** Verify code generated
  ```bash
  ls -la $PROJECT_PATH/src/components/wave-generated/
  # Expected: New component file
  ```

- [ ] **12.2.7** Verify budget tracked
  ```bash
  # Check orchestrator logs for budget info
  grep -i "budget\|cost\|token" /tmp/orch.log
  ```

- [ ] **12.2.8** Verify LangSmith trace
  ```
  In LangSmith UI:
  - [ ] Run visible in traces
  - [ ] All nodes executed
  - [ ] No errors
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

## 12.3 Safety Test
```
Progress: [░░░░░░░░░░] 0/3 checks
```

- [ ] **12.3.1** Trigger safety violation (controlled)
  ```bash
  # Submit task with potentially unsafe content
  # Verify safety gate blocks it
  ```

- [ ] **12.3.2** Verify Slack alert
  ```
  - [ ] Safety violation notification received
  - [ ] Alert channel notified
  ```

- [ ] **12.3.3** E-STOP test
  ```bash
  # Create E-STOP signal
  echo '{"emergency":true,"reason":"POC Test"}' > $PROJECT_PATH/.claude/ESTOP.json
  # Verify agents stop
  # Remove signal
  rm $PROJECT_PATH/.claude/ESTOP.json
  ```

**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete | ⬜ Failed

---

# Final Validation Summary

## Component Status Matrix

| Component | Phase | Status | Notes |
|-----------|-------|--------|-------|
| Docker Engine | 1 | ⬜ | |
| Docker Network | 1 | ⬜ | |
| Docker Volumes | 1 | ⬜ | |
| Environment Vars | 1 | ⬜ | |
| Redis | 2 | ⬜ | |
| Supabase | 2 | ⬜ | |
| Anthropic API | 2 | ⬜ | |
| Python Environment | 3 | ⬜ | |
| FastAPI Server | 3 | ⬜ | |
| LangGraph State | 3 | ⬜ | |
| Agent Image | 4 | ⬜ | |
| merge-watcher | 4 | ⬜ | |
| orchestrator | 4 | ⬜ | |
| CTO Agent | 4 | ⬜ | |
| PM Agent | 4 | ⬜ | |
| FE-Dev Agents | 4 | ⬜ | |
| BE-Dev Agents | 4 | ⬜ | |
| Dev-Fix Agent | 4 | ⬜ | |
| QA Agent | 4 | ⬜ | |
| Constitutional AI | 5 | ⬜ | |
| E-STOP | 5 | ⬜ | |
| Safety Violations | 5 | ⬜ | |
| Budget Safety | 5 | ⬜ | |
| P Variable | 6 | ⬜ | |
| Drift Detection | 6 | ⬜ | |
| Phase 0 Validator | 7 | ⬜ | |
| Phase 1 Validator | 7 | ⬜ | |
| Phase 2 Validator | 7 | ⬜ | |
| Phase 3 Validator | 7 | ⬜ | |
| Phase 4 Validator | 7 | ⬜ | |
| Lock Manager | 7 | ⬜ | |
| Slack Config | 8 | ⬜ | |
| Slack Notifications | 8 | ⬜ | |
| Portal Notifier | 8 | ⬜ | |
| Dozzle Container | 9 | ⬜ | |
| Log Streaming | 9 | ⬜ | |
| Portal Backend | 10 | ⬜ | |
| Portal Frontend | 10 | ⬜ | |
| Portal Features | 10 | ⬜ | |
| Worktree Setup | 11 | ⬜ | |
| Worktree Branches | 11 | ⬜ | |
| E2E Pre-flight | 12 | ⬜ | |
| E2E Story Exec | 12 | ⬜ | |
| E2E Safety Test | 12 | ⬜ | |

---

## Progress Tracking

Update these progress bars as you complete each phase:

```
Phase 1:  Infrastructure     [░░░░░░░░░░]  0% (0/14)
Phase 2:  Core Services      [░░░░░░░░░░]  0% (0/10)
Phase 3:  Orchestration      [░░░░░░░░░░]  0% (0/15)
Phase 4:  Agent Layer        [░░░░░░░░░░]  0% (0/22)
Phase 5:  Safety Systems     [░░░░░░░░░░]  0% (0/16)
Phase 6:  RLM               [░░░░░░░░░░]  0% (0/8)
Phase 7:  Building Blocks   [░░░░░░░░░░]  0% (0/14)
Phase 8:  Slack             [░░░░░░░░░░]  0% (0/13)
Phase 9:  Dozzle            [░░░░░░░░░░]  0% (0/7)
Phase 10: Portal            [░░░░░░░░░░]  0% (0/15)
Phase 11: Git Worktrees     [░░░░░░░░░░]  0% (0/6)
Phase 12: End-to-End        [░░░░░░░░░░]  0% (0/14)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL                       [░░░░░░░░░░]  0% (0/154)
```

---

## Quick Start Commands

```bash
# Set environment
export PROJECT_PATH=/Volumes/SSD-01/Projects/Footprint
export ANTHROPIC_API_KEY=sk-ant-...
cd /Volumes/SSD-01/Projects/WAVE

# Phase 1-2: Infrastructure
docker network create wave-network
docker volume create wave-claude-config
docker run -d --name wave-redis --network wave-network -p 6379:6379 redis:alpine

# Phase 3: Orchestrator
cd orchestrator && source venv/bin/activate
nohup python main.py > /tmp/orch.log 2>&1 &

# Phase 4: Agents
docker compose up -d
docker compose --profile all up -d

# Phase 9: Dozzle
docker compose up -d dozzle

# Phase 10: Portal
cd ../portal && npm install
npm run server &
npm run dev &

# Verify all running
docker ps | grep wave-
curl http://localhost:8000/health
curl http://localhost:3000/health
```

---

## Document Maintenance

- **Last Updated:** 2026-01-27
- **Validated By:** [Name]
- **Next Review:** [Date]

---

*This document follows Grok's recommended systematic testing approach and covers 100% of WAVE V2 architecture components.*
