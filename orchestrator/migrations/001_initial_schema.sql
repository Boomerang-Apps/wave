-- WAVE Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Purpose: Create foundational tables for WAVE state persistence and checkpoint management
-- Story: WAVE-P0-001

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- WAVE SESSIONS TABLE
-- Tracks wave execution sessions with metadata and status
-- ============================================================================
CREATE TABLE IF NOT EXISTS wave_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name VARCHAR(255) NOT NULL,
    wave_number INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    budget_usd DECIMAL(10, 2) DEFAULT 2.00,
    actual_cost_usd DECIMAL(10, 2) DEFAULT 0.00,
    token_count INTEGER DEFAULT 0,
    story_count INTEGER DEFAULT 0,
    stories_completed INTEGER DEFAULT 0,
    stories_failed INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT wave_sessions_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    CONSTRAINT wave_sessions_wave_number_check CHECK (wave_number >= 0),
    CONSTRAINT wave_sessions_budget_check CHECK (budget_usd >= 0),
    CONSTRAINT wave_sessions_cost_check CHECK (actual_cost_usd >= 0)
);

-- Index for query performance
CREATE INDEX IF NOT EXISTS idx_wave_sessions_project ON wave_sessions(project_name);
CREATE INDEX IF NOT EXISTS idx_wave_sessions_status ON wave_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wave_sessions_started ON wave_sessions(started_at DESC);

-- ============================================================================
-- WAVE CHECKPOINTS TABLE
-- Stores state checkpoints for crash recovery and session resumption
-- ============================================================================
CREATE TABLE IF NOT EXISTS wave_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES wave_sessions(id) ON DELETE CASCADE,
    checkpoint_type VARCHAR(50) NOT NULL,
    checkpoint_name VARCHAR(255) NOT NULL,
    story_id VARCHAR(100),
    gate VARCHAR(20),
    state JSONB NOT NULL,
    agent_id VARCHAR(100),
    parent_checkpoint_id UUID REFERENCES wave_checkpoints(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT wave_checkpoints_type_check CHECK (checkpoint_type IN ('gate', 'story_start', 'story_complete', 'agent_handoff', 'error', 'manual')),
    CONSTRAINT wave_checkpoints_gate_check CHECK (gate IS NULL OR gate IN ('gate-0', 'gate-1', 'gate-2', 'gate-3', 'gate-4', 'gate-5', 'gate-6', 'gate-7'))
);

-- Indexes for recovery queries
CREATE INDEX IF NOT EXISTS idx_wave_checkpoints_session ON wave_checkpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_wave_checkpoints_story ON wave_checkpoints(story_id);
CREATE INDEX IF NOT EXISTS idx_wave_checkpoints_created ON wave_checkpoints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wave_checkpoints_type ON wave_checkpoints(checkpoint_type);

-- ============================================================================
-- WAVE STORY EXECUTIONS TABLE
-- Tracks individual story execution with detailed metrics and results
-- ============================================================================
CREATE TABLE IF NOT EXISTS wave_story_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES wave_sessions(id) ON DELETE CASCADE,
    story_id VARCHAR(100) NOT NULL,
    story_title VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    agent VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20),
    story_points INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    token_count INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 4) DEFAULT 0.00,
    retry_count INTEGER DEFAULT 0,
    acceptance_criteria_passed INTEGER DEFAULT 0,
    acceptance_criteria_total INTEGER DEFAULT 0,
    tests_passing BOOLEAN DEFAULT false,
    coverage_achieved DECIMAL(5, 2),
    files_created TEXT[],
    files_modified TEXT[],
    branch_name VARCHAR(255),
    commit_sha VARCHAR(40),
    pr_url VARCHAR(500),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT wave_story_executions_status_check CHECK (status IN ('pending', 'in_progress', 'blocked', 'review', 'complete', 'failed', 'cancelled')),
    CONSTRAINT wave_story_executions_retry_check CHECK (retry_count >= 0),
    CONSTRAINT wave_story_executions_cost_check CHECK (cost_usd >= 0),
    CONSTRAINT wave_story_executions_ac_check CHECK (acceptance_criteria_passed <= acceptance_criteria_total)
);

-- Indexes for story execution queries
CREATE INDEX IF NOT EXISTS idx_wave_story_executions_session ON wave_story_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_wave_story_executions_story_id ON wave_story_executions(story_id);
CREATE INDEX IF NOT EXISTS idx_wave_story_executions_status ON wave_story_executions(status);
CREATE INDEX IF NOT EXISTS idx_wave_story_executions_agent ON wave_story_executions(agent);
CREATE INDEX IF NOT EXISTS idx_wave_story_executions_started ON wave_story_executions(started_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wave_sessions_updated_at
    BEFORE UPDATE ON wave_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wave_story_executions_updated_at
    BEFORE UPDATE ON wave_story_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active sessions view
CREATE OR REPLACE VIEW active_wave_sessions AS
SELECT
    id,
    project_name,
    wave_number,
    status,
    started_at,
    EXTRACT(EPOCH FROM (NOW() - started_at)) / 60 AS duration_minutes,
    budget_usd,
    actual_cost_usd,
    story_count,
    stories_completed,
    stories_failed,
    CASE
        WHEN story_count > 0 THEN ROUND((stories_completed::DECIMAL / story_count) * 100, 2)
        ELSE 0
    END AS completion_percentage
FROM wave_sessions
WHERE status IN ('pending', 'in_progress')
ORDER BY started_at DESC;

-- Story execution summary view
CREATE OR REPLACE VIEW story_execution_summary AS
SELECT
    se.session_id,
    se.story_id,
    se.story_title,
    se.domain,
    se.agent,
    se.status,
    se.story_points,
    se.started_at,
    se.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(se.completed_at, NOW()) - se.started_at)) / 60 AS duration_minutes,
    se.token_count,
    se.cost_usd,
    se.retry_count,
    se.acceptance_criteria_passed,
    se.acceptance_criteria_total,
    se.tests_passing,
    se.coverage_achieved
FROM wave_story_executions se
ORDER BY se.started_at DESC;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Note: Adjust these based on your PostgreSQL user setup
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wave_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO wave_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
COMMENT ON TABLE wave_sessions IS 'WAVE execution sessions with budget and progress tracking';
COMMENT ON TABLE wave_checkpoints IS 'State checkpoints for crash recovery and session resumption';
COMMENT ON TABLE wave_story_executions IS 'Individual story execution tracking with detailed metrics';
