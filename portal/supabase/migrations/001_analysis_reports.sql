-- WAVE Portal Database Schema
-- Table: maf_analysis_reports
-- Purpose: Store analysis results as SOURCE OF TRUTH for project readiness

-- Create maf_analysis_reports table
CREATE TABLE IF NOT EXISTS maf_analysis_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES maf_projects(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL DEFAULT 'gap_analysis',
    report_data JSONB NOT NULL,
    readiness_score INTEGER DEFAULT 0,
    total_gaps INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint for upsert
    CONSTRAINT unique_project_report UNIQUE (project_id, report_type)
);

-- Create maf_project_config table for storing API keys and settings
CREATE TABLE IF NOT EXISTS maf_project_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES maf_projects(id) ON DELETE CASCADE UNIQUE,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analysis_reports_project_id ON maf_analysis_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_readiness ON maf_analysis_reports(readiness_score);
CREATE INDEX IF NOT EXISTS idx_project_config_project_id ON maf_project_config(project_id);

-- Enable RLS (Row Level Security)
ALTER TABLE maf_analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE maf_project_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now - adjust based on auth requirements)
CREATE POLICY "Allow all access to analysis reports" ON maf_analysis_reports
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to project config" ON maf_project_config
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analysis_reports_updated_at
    BEFORE UPDATE ON maf_analysis_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_config_updated_at
    BEFORE UPDATE ON maf_project_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE maf_analysis_reports IS 'Stores analysis results - SOURCE OF TRUTH for project readiness status';
COMMENT ON TABLE maf_project_config IS 'Stores project-specific configuration including API keys';
COMMENT ON COLUMN maf_analysis_reports.readiness_score IS 'Percentage readiness (0-100)';
COMMENT ON COLUMN maf_analysis_reports.total_gaps IS 'Number of gaps identified in analysis';
