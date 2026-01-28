-- WAVE Portal Database Schema - Gate 0 Task Tracking
-- Purpose: Store checklist task status and progress for Gate 0
-- Migration: 007

-- ═══════════════════════════════════════════════════════════════════════════════
-- GATE 0 TASKS TABLE
-- Tracks individual task completion status from the Checklist Results Page
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gate0_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project Reference
    project_id UUID,  -- Optional reference to wave_projects
    project_path TEXT NOT NULL,

    -- Task Identification
    category VARCHAR(50) NOT NULL,  -- structure, documentation, mockups, techstack, compliance
    task_key VARCHAR(100) NOT NULL,  -- Unique task identifier within category
    title TEXT NOT NULL,
    description TEXT,

    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, blocked, skipped
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',  -- critical, high, medium, low

    -- Completion Details
    completed_at TIMESTAMPTZ,
    completed_by VARCHAR(100),  -- User or 'system'

    -- Action Details
    action_type VARCHAR(50),  -- create_file, generate_ai, install, configure, link, view
    action_endpoint VARCHAR(255),
    action_params JSONB DEFAULT '{}',

    -- Execution Results
    execution_result JSONB DEFAULT '{}',  -- Store action results
    error_message TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_task_status CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'skipped')),
    CONSTRAINT valid_task_priority CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    CONSTRAINT valid_task_category CHECK (category IN ('structure', 'documentation', 'mockups', 'techstack', 'compliance')),

    -- Unique constraint: One task per project per category/key
    CONSTRAINT unique_project_task UNIQUE (project_path, category, task_key)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GATE 0 PROGRESS TABLE
-- Tracks overall progress toward launch readiness
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gate0_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project Reference
    project_id UUID,
    project_path TEXT NOT NULL UNIQUE,

    -- Progress Metrics
    total_tasks INTEGER NOT NULL DEFAULT 0,
    completed_tasks INTEGER NOT NULL DEFAULT 0,
    critical_remaining INTEGER NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Category Breakdown
    structure_complete BOOLEAN DEFAULT FALSE,
    documentation_complete BOOLEAN DEFAULT FALSE,
    mockups_complete BOOLEAN DEFAULT FALSE,
    techstack_complete BOOLEAN DEFAULT FALSE,
    compliance_complete BOOLEAN DEFAULT FALSE,

    -- Pre-Flight Status
    preflight_passed BOOLEAN DEFAULT FALSE,
    preflight_run_at TIMESTAMPTZ,
    preflight_results JSONB DEFAULT '{}',

    -- Launch Readiness
    ready_for_launch BOOLEAN DEFAULT FALSE,
    launched_at TIMESTAMPTZ,

    -- Timestamps
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_percentage CHECK (percentage >= 0 AND percentage <= 100)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GATE 0 PREFLIGHT CHECKS TABLE
-- Stores individual pre-flight check results
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gate0_preflight_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project Reference
    project_path TEXT NOT NULL,

    -- Check Details
    check_id VARCHAR(50) NOT NULL,  -- git, env, api_keys, dependencies, docker, safety
    check_name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, running, passed, failed, warning

    -- Results
    result_message TEXT,
    result_data JSONB DEFAULT '{}',

    -- Timestamps
    run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_check_status CHECK (status IN ('pending', 'running', 'passed', 'failed', 'warning')),

    -- Unique constraint
    CONSTRAINT unique_project_check UNIQUE (project_path, check_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- gate0_tasks indexes
CREATE INDEX IF NOT EXISTS idx_gate0_tasks_project_path ON gate0_tasks(project_path);
CREATE INDEX IF NOT EXISTS idx_gate0_tasks_project_id ON gate0_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_gate0_tasks_category ON gate0_tasks(category);
CREATE INDEX IF NOT EXISTS idx_gate0_tasks_status ON gate0_tasks(status);
CREATE INDEX IF NOT EXISTS idx_gate0_tasks_priority ON gate0_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_gate0_tasks_created ON gate0_tasks(created_at DESC);

-- gate0_progress indexes
CREATE INDEX IF NOT EXISTS idx_gate0_progress_project_path ON gate0_progress(project_path);
CREATE INDEX IF NOT EXISTS idx_gate0_progress_project_id ON gate0_progress(project_id);
CREATE INDEX IF NOT EXISTS idx_gate0_progress_ready ON gate0_progress(ready_for_launch);

-- gate0_preflight_checks indexes
CREATE INDEX IF NOT EXISTS idx_gate0_preflight_project ON gate0_preflight_checks(project_path);
CREATE INDEX IF NOT EXISTS idx_gate0_preflight_status ON gate0_preflight_checks(status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE gate0_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate0_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate0_preflight_checks ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now - adjust based on auth requirements)
CREATE POLICY "Allow all access to gate0_tasks" ON gate0_tasks
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to gate0_progress" ON gate0_progress
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to gate0_preflight_checks" ON gate0_preflight_checks
    FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TRIGGER update_gate0_tasks_updated_at
    BEFORE UPDATE ON gate0_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gate0_progress_updated_at
    BEFORE UPDATE ON gate0_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function to recalculate progress for a project
CREATE OR REPLACE FUNCTION recalculate_gate0_progress(p_project_path TEXT)
RETURNS void AS $$
DECLARE
    v_total INTEGER;
    v_completed INTEGER;
    v_critical INTEGER;
    v_pct DECIMAL(5,2);
BEGIN
    -- Count tasks (excluding skipped)
    SELECT
        COUNT(*) FILTER (WHERE status != 'skipped'),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('completed', 'skipped'))
    INTO v_total, v_completed, v_critical
    FROM gate0_tasks
    WHERE project_path = p_project_path;

    -- Calculate percentage
    v_pct := CASE WHEN v_total > 0 THEN ROUND((v_completed::DECIMAL / v_total) * 100, 2) ELSE 0 END;

    -- Upsert progress record
    INSERT INTO gate0_progress (project_path, total_tasks, completed_tasks, critical_remaining, percentage, ready_for_launch, last_updated)
    VALUES (p_project_path, v_total, v_completed, v_critical, v_pct, (v_critical = 0 AND v_pct >= 60), NOW())
    ON CONFLICT (project_path)
    DO UPDATE SET
        total_tasks = EXCLUDED.total_tasks,
        completed_tasks = EXCLUDED.completed_tasks,
        critical_remaining = EXCLUDED.critical_remaining,
        percentage = EXCLUDED.percentage,
        ready_for_launch = EXCLUDED.ready_for_launch,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update progress when tasks change
CREATE OR REPLACE FUNCTION trigger_recalculate_progress()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM recalculate_gate0_progress(COALESCE(NEW.project_path, OLD.project_path));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gate0_tasks_progress_trigger
    AFTER INSERT OR UPDATE OR DELETE ON gate0_tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_progress();

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE gate0_tasks IS 'Individual checklist tasks from Gate 0 Foundation Analysis';
COMMENT ON TABLE gate0_progress IS 'Overall progress tracking toward launch readiness';
COMMENT ON TABLE gate0_preflight_checks IS 'Pre-flight validation checks before launching development';
COMMENT ON FUNCTION recalculate_gate0_progress IS 'Recalculates progress metrics when tasks are modified';
