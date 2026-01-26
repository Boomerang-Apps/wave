-- WAVE Portal Database Schema - Foundation Analysis
-- Purpose: Store Gate 0 foundation analysis results
-- Migration: 006

-- ═══════════════════════════════════════════════════════════════════════════════
-- FOUNDATION ANALYSIS RESULTS TABLE
-- Stores foundation validation results for both new and existing projects
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS foundation_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Project Identification (optional - works without maf_projects)
    project_id UUID,  -- Optional reference, no FK constraint for flexibility
    project_path TEXT NOT NULL,
    project_name TEXT,

    -- Analysis Mode and Status
    analysis_mode VARCHAR(20) NOT NULL,  -- 'new', 'existing'
    validation_status VARCHAR(20) NOT NULL,  -- 'ready', 'blocked'
    readiness_score INTEGER NOT NULL DEFAULT 0,  -- 0-100

    -- Issue Counts
    total_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,

    -- Document/Mockup Counts
    docs_count INTEGER DEFAULT 0,
    mockups_count INTEGER DEFAULT 0,

    -- Full Analysis Report (JSONB for flexibility)
    analysis_data JSONB NOT NULL DEFAULT '{}',

    -- Arrays for quick access
    findings TEXT[] DEFAULT '{}',
    issues TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    blocking_reasons TEXT[] DEFAULT '{}',

    -- Tech Stack (for existing projects)
    tech_stack TEXT[] DEFAULT '{}',

    -- Diff Tracking (Grok Review Enhancement)
    previous_analysis_id UUID,  -- Reference to previous analysis
    score_delta INTEGER,        -- Change from previous score

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_analysis_mode CHECK (analysis_mode IN ('new', 'existing')),
    CONSTRAINT valid_validation_status CHECK (validation_status IN ('ready', 'blocked')),
    CONSTRAINT valid_readiness_score CHECK (readiness_score >= 0 AND readiness_score <= 100)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_foundation_analysis_project_id ON foundation_analysis_results(project_id);
CREATE INDEX IF NOT EXISTS idx_foundation_analysis_project_path ON foundation_analysis_results(project_path);
CREATE INDEX IF NOT EXISTS idx_foundation_analysis_status ON foundation_analysis_results(validation_status);
CREATE INDEX IF NOT EXISTS idx_foundation_analysis_score ON foundation_analysis_results(readiness_score);
CREATE INDEX IF NOT EXISTS idx_foundation_analysis_created ON foundation_analysis_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_foundation_analysis_mode ON foundation_analysis_results(analysis_mode);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE foundation_analysis_results ENABLE ROW LEVEL SECURITY;

-- Policy (allow all for now - adjust based on auth requirements)
CREATE POLICY "Allow all access to foundation analysis" ON foundation_analysis_results
    FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TRIGGER update_foundation_analysis_updated_at
    BEFORE UPDATE ON foundation_analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE foundation_analysis_results IS 'Gate 0 foundation analysis results for project validation';
COMMENT ON COLUMN foundation_analysis_results.analysis_mode IS 'new = greenfield project, existing = analyze existing codebase';
COMMENT ON COLUMN foundation_analysis_results.validation_status IS 'ready = can proceed to Gate 1, blocked = has critical issues';
COMMENT ON COLUMN foundation_analysis_results.analysis_data IS 'Full analysis report with all step details';
COMMENT ON COLUMN foundation_analysis_results.blocking_reasons IS 'List of reasons preventing project from proceeding';
