-- Orchestrator Integration Tables
-- Purpose: Track orchestrator runs and human review queue
-- Enables portal-orchestrator communication and safety escalations

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORCHESTRATOR RUNS TABLE
-- Tracks all orchestrator execution runs with state, safety, and budget info
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS orchestrator_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id TEXT UNIQUE NOT NULL,
    project_id UUID NOT NULL,
    story_id TEXT NOT NULL,

    -- State
    phase TEXT DEFAULT 'planning',
    current_agent TEXT,
    gate_status TEXT DEFAULT 'pending',

    -- Safety
    safety_score DECIMAL(3,2) DEFAULT 1.00,
    violations TEXT[],
    requires_human_review BOOLEAN DEFAULT FALSE,

    -- Budget
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,6) DEFAULT 0,

    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Results
    files_created TEXT[],
    error TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- HUMAN REVIEW QUEUE TABLE
-- Tracks items requiring human approval before proceeding
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS human_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id TEXT NOT NULL,
    review_type TEXT NOT NULL,  -- 'safety', 'gate_override', 'budget_exceeded'
    reason TEXT NOT NULL,
    safety_score DECIMAL(3,2),
    context JSONB,

    -- Resolution
    status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Orchestrator Runs
CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_project ON orchestrator_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_status ON orchestrator_runs(phase, gate_status);
CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_thread ON orchestrator_runs(thread_id);

-- Human Review Queue
CREATE INDEX IF NOT EXISTS idx_human_review_thread ON human_review_queue(thread_id);
CREATE INDEX IF NOT EXISTS idx_human_review_status ON human_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_human_review_type ON human_review_queue(review_type);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Update timestamp on orchestrator_runs modification
CREATE OR REPLACE FUNCTION update_orchestrator_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orchestrator_runs_updated_at
    BEFORE UPDATE ON orchestrator_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_orchestrator_runs_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE orchestrator_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_review_queue ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (adjust based on auth requirements)
CREATE POLICY "Allow all access to orchestrator runs" ON orchestrator_runs
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to human review queue" ON human_review_queue
    FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE orchestrator_runs IS 'Tracks orchestrator execution runs with state, safety scores, and budget tracking';
COMMENT ON TABLE human_review_queue IS 'Queue of items requiring human approval before orchestrator proceeds';

COMMENT ON COLUMN orchestrator_runs.thread_id IS 'Unique LangGraph thread ID for the run';
COMMENT ON COLUMN orchestrator_runs.phase IS 'Current execution phase: planning, development, testing, complete, failed';
COMMENT ON COLUMN orchestrator_runs.gate_status IS 'Gate decision: pending, go, hold, kill, recycle';
COMMENT ON COLUMN orchestrator_runs.safety_score IS 'Constitutional AI safety score (0.0 to 1.0)';
COMMENT ON COLUMN orchestrator_runs.violations IS 'Array of constitutional principle violations detected';

COMMENT ON COLUMN human_review_queue.review_type IS 'Type of review: safety, gate_override, budget_exceeded';
COMMENT ON COLUMN human_review_queue.context IS 'JSONB context data for the review item';
COMMENT ON COLUMN human_review_queue.status IS 'Review status: pending, approved, rejected';
