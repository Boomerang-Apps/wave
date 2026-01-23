-- Generic Slack Thread Tracking
-- Purpose: Track Slack threads for task/story updates (project-agnostic)
-- Enables thread-per-story pattern for organized notifications

-- ═══════════════════════════════════════════════════════════════════════════════
-- SLACK THREADS TABLE
-- Stores thread_ts for each task/story to enable threaded conversations
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS slack_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Optional project reference (if using project-based tracking)
    project_id UUID REFERENCES maf_projects(id) ON DELETE CASCADE,

    -- Task/Story identification (generic)
    task_id VARCHAR(100) NOT NULL,       -- Story ID, task ID, or any unique identifier
    task_type VARCHAR(50),               -- 'story', 'wave', 'pipeline', etc.

    -- Slack thread info
    thread_ts VARCHAR(50) NOT NULL,      -- Slack thread timestamp (e.g., "1234567890.123456")
    channel_id VARCHAR(50),              -- Slack channel ID
    channel_name VARCHAR(100),           -- Human-readable channel name

    -- Thread metadata
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed', 'archived'
    message_count INTEGER DEFAULT 1,
    last_message_at TIMESTAMPTZ,

    -- Context
    wave_number INTEGER,                 -- Optional: for wave-based systems
    batch_id VARCHAR(100),               -- Optional: for batch processing

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique thread per task per project
    UNIQUE(project_id, task_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SLACK NOTIFICATIONS LOG
-- Track all Slack notifications sent for auditing and debugging
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS slack_notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to thread (optional)
    thread_id UUID REFERENCES slack_threads(id) ON DELETE SET NULL,

    -- Notification details
    event_type VARCHAR(50) NOT NULL,     -- Event type from SLACK_EVENT_TYPES
    severity VARCHAR(20),                -- 'info', 'warning', 'critical'
    channel VARCHAR(50),                 -- Channel key: 'default', 'alerts', 'budget'

    -- Delivery status
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,

    -- Payload (for debugging)
    payload JSONB,

    -- Timestamps
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Slack Threads
CREATE INDEX IF NOT EXISTS idx_slack_threads_project ON slack_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_slack_threads_task ON slack_threads(task_id);
CREATE INDEX IF NOT EXISTS idx_slack_threads_status ON slack_threads(status);
CREATE INDEX IF NOT EXISTS idx_slack_threads_thread_ts ON slack_threads(thread_ts);

-- Slack Notification Log
CREATE INDEX IF NOT EXISTS idx_slack_log_thread ON slack_notification_log(thread_id);
CREATE INDEX IF NOT EXISTS idx_slack_log_event ON slack_notification_log(event_type);
CREATE INDEX IF NOT EXISTS idx_slack_log_sent ON slack_notification_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_slack_log_success ON slack_notification_log(success);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Update timestamp on slack_threads modification
CREATE OR REPLACE FUNCTION update_slack_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_slack_threads_updated_at
    BEFORE UPDATE ON slack_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_slack_threads_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE slack_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_notification_log ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (adjust based on auth requirements)
CREATE POLICY "Allow all access to slack threads" ON slack_threads
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to slack notification log" ON slack_notification_log
    FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE slack_threads IS 'Tracks Slack threads for task/story updates enabling thread-per-story pattern';
COMMENT ON TABLE slack_notification_log IS 'Audit log of all Slack notifications sent';

COMMENT ON COLUMN slack_threads.thread_ts IS 'Slack thread timestamp used for reply_to';
COMMENT ON COLUMN slack_threads.status IS 'Thread status: active (open), closed (complete), archived';
COMMENT ON COLUMN slack_notification_log.payload IS 'Full Slack payload sent (for debugging)';
