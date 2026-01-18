-- ═══════════════════════════════════════════════════════════════════════════════
-- WAVE FRAMEWORK - Credentials Storage Table
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- This table stores project credentials in the WAVE Portal Supabase instance.
-- Credentials are stored as encrypted JSONB and accessed only via service role.
--
-- Run this migration on your WAVE Portal Supabase project (not individual projects).
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create the wave_credentials table
CREATE TABLE IF NOT EXISTS wave_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name TEXT UNIQUE NOT NULL,
    credentials JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_accessed TIMESTAMPTZ
);

-- Add comment
COMMENT ON TABLE wave_credentials IS 'Stores encrypted credentials for WAVE projects';
COMMENT ON COLUMN wave_credentials.project_name IS 'Unique project identifier';
COMMENT ON COLUMN wave_credentials.credentials IS 'Encrypted JSONB containing API keys and URLs';
COMMENT ON COLUMN wave_credentials.last_accessed IS 'Last time credentials were retrieved';

-- Create index on project_name for fast lookups
CREATE INDEX IF NOT EXISTS idx_wave_credentials_project_name
ON wave_credentials(project_name);

-- Enable Row Level Security
ALTER TABLE wave_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (no anon or authenticated access)
CREATE POLICY "Service role only access" ON wave_credentials
    FOR ALL
    USING (auth.role() = 'service_role');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wave_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_wave_credentials_updated_at ON wave_credentials;
CREATE TRIGGER trigger_wave_credentials_updated_at
    BEFORE UPDATE ON wave_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_wave_credentials_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- EXPECTED CREDENTIALS SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- The credentials JSONB column should contain:
-- {
--     "anthropic_api_key": "sk-ant-...",
--     "github_repo": "https://github.com/user/repo",
--     "supabase_url": "https://xxx.supabase.co",
--     "supabase_anon_key": "eyJ...",
--     "supabase_service_key": "eyJ...",
--     "slack_webhook_url": "https://hooks.slack.com/...",
--     "vercel_url": "https://project.vercel.app",
--     "stored_at": "2024-01-15T10:30:00Z"
-- }
--
-- ═══════════════════════════════════════════════════════════════════════════════
