-- WAVE Portal Database Schema - Stories Table
-- Purpose: Store AI stories as SOURCE OF TRUTH

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id VARCHAR(50) NOT NULL,
    project_id UUID REFERENCES maf_projects(id) ON DELETE CASCADE,
    wave_number INTEGER NOT NULL DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    gate INTEGER DEFAULT 0,
    agent_type VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for upsert (one story per project)
    CONSTRAINT unique_story_per_project UNIQUE (story_id, project_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_project_id ON stories(project_id);
CREATE INDEX IF NOT EXISTS idx_stories_wave_number ON stories(wave_number);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_stories_story_id ON stories(story_id);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- RLS Policy (allow all for now)
CREATE POLICY "Allow all access to stories" ON stories
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_stories_updated_at
    BEFORE UPDATE ON stories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE stories IS 'AI Stories - SOURCE OF TRUTH for WAVE development';
