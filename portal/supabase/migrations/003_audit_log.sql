-- WAVE Portal Database Schema - Audit Log
-- Purpose: Track all agent actions, validations, and safety-critical events
-- Created for Phase 2.2: Audit & Traceability

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- Stores every significant event in the WAVE system for traceability
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wave_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES maf_projects(id) ON DELETE CASCADE,

    -- Event Classification
    event_type VARCHAR(50) NOT NULL,  -- 'agent_action', 'validation', 'config_change', 'safety_event', 'gate_transition'
    event_category VARCHAR(50),       -- Subcategory for filtering
    severity VARCHAR(20) DEFAULT 'info',  -- 'debug', 'info', 'warn', 'error', 'critical'

    -- Actor Information
    actor_type VARCHAR(50) NOT NULL,  -- 'agent', 'user', 'system', 'portal'
    actor_id VARCHAR(100),            -- Agent name, user ID, or 'system'

    -- Event Details
    action VARCHAR(100) NOT NULL,     -- 'started', 'stopped', 'validated', 'approved', 'rejected', etc.
    resource_type VARCHAR(100),       -- 'story', 'config', 'probe', 'build', 'drift', etc.
    resource_id VARCHAR(255),         -- Story ID, config key, probe ID, etc.

    -- Context
    wave_number INTEGER,
    gate_number INTEGER,
    validation_mode VARCHAR(20),      -- 'strict', 'dev', 'ci'

    -- Detailed Data
    details JSONB DEFAULT '{}',       -- Full context (before/after states, results, etc.)
    metadata JSONB DEFAULT '{}',      -- Additional metadata (IP, user-agent, etc.)

    -- Safety-Critical Fields
    safety_tags TEXT[],               -- ['auth', 'payments', 'secrets', 'pii']
    requires_review BOOLEAN DEFAULT false,
    reviewed_at TIMESTAMPTZ,
    reviewed_by VARCHAR(100),

    -- Token/Cost Tracking (for agent events)
    token_input INTEGER,
    token_output INTEGER,
    cost_usd DECIMAL(10, 6),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes for common queries
    CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),
    CONSTRAINT valid_event_type CHECK (event_type IN ('agent_action', 'validation', 'config_change', 'safety_event', 'gate_transition', 'system_event'))
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AGENT SESSIONS TABLE
-- Track agent lifecycle (start/stop/running state)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wave_agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES maf_projects(id) ON DELETE CASCADE,

    -- Agent Identity
    agent_type VARCHAR(50) NOT NULL,  -- 'cto', 'pm', 'fe-dev-1', etc.
    agent_model VARCHAR(100),         -- 'claude-opus-4-5-20251101', etc.

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'idle',  -- 'idle', 'starting', 'running', 'stopping', 'error'
    current_task TEXT,
    current_gate INTEGER,
    wave_number INTEGER,

    -- Process Info
    pid INTEGER,
    worktree_path TEXT,

    -- Timestamps
    started_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    last_heartbeat TIMESTAMPTZ,

    -- Token/Cost
    token_usage JSONB DEFAULT '{"input": 0, "output": 0, "cost": 0}',

    -- Signal Info
    last_signal TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_status CHECK (status IN ('idle', 'starting', 'running', 'stopping', 'error'))
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDATION RUNS TABLE
-- Track validation history (behavioral probes, build QA, drift detection)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wave_validation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES maf_projects(id) ON DELETE CASCADE,

    -- Validation Type
    validation_type VARCHAR(50) NOT NULL,  -- 'behavioral_probe', 'build_qa', 'drift_detection', 'safety_validation', 'rlm_protocol'
    validation_mode VARCHAR(20),           -- 'strict', 'dev', 'ci'

    -- Results
    overall_status VARCHAR(20) NOT NULL,   -- 'pass', 'fail', 'warn', 'skipped', 'error'
    total_checks INTEGER DEFAULT 0,
    passed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,

    -- Detailed Results
    results JSONB DEFAULT '[]',            -- Array of individual check results
    summary JSONB DEFAULT '{}',            -- Summary statistics

    -- Context
    wave_number INTEGER,
    gate_number INTEGER,
    triggered_by VARCHAR(50),              -- 'user', 'agent', 'ci', 'scheduled'

    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    CONSTRAINT valid_validation_status CHECK (overall_status IN ('pass', 'fail', 'warn', 'skipped', 'error', 'running'))
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Audit Log Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_project ON wave_audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON wave_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON wave_audit_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON wave_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON wave_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_audit_log_requires_review ON wave_audit_log(requires_review) WHERE requires_review = true;
CREATE INDEX IF NOT EXISTS idx_audit_log_safety_tags ON wave_audit_log USING GIN(safety_tags);

-- Agent Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_agent_sessions_project ON wave_agent_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON wave_agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_type ON wave_agent_sessions(agent_type);

-- Validation Runs Indexes
CREATE INDEX IF NOT EXISTS idx_validation_runs_project ON wave_validation_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_validation_runs_type ON wave_validation_runs(validation_type);
CREATE INDEX IF NOT EXISTS idx_validation_runs_status ON wave_validation_runs(overall_status);
CREATE INDEX IF NOT EXISTS idx_validation_runs_started ON wave_validation_runs(started_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE wave_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE wave_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wave_validation_runs ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now - adjust based on auth requirements)
CREATE POLICY "Allow all access to audit log" ON wave_audit_log
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to agent sessions" ON wave_agent_sessions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to validation runs" ON wave_validation_runs
    FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TRIGGER update_agent_sessions_updated_at
    BEFORE UPDATE ON wave_agent_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE wave_audit_log IS 'Comprehensive audit trail for all WAVE system events';
COMMENT ON TABLE wave_agent_sessions IS 'Tracks agent lifecycle and current status';
COMMENT ON TABLE wave_validation_runs IS 'History of all validation runs (behavioral, build, drift)';

COMMENT ON COLUMN wave_audit_log.safety_tags IS 'Tags for safety-critical events: auth, payments, secrets, pii';
COMMENT ON COLUMN wave_audit_log.requires_review IS 'Flag for events that need human review';
COMMENT ON COLUMN wave_agent_sessions.last_heartbeat IS 'Last heartbeat timestamp for watchdog monitoring';
