-- ============================================
-- Audit Log Table for tracking all system changes
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
    entity_type VARCHAR(50) NOT NULL, -- 'customer', 'deal', 'product', 'activity', 'contact'
    entity_id UUID,
    entity_name VARCHAR(255), -- Human readable name of the entity
    description TEXT, -- What was changed
    old_value JSONB, -- Previous value (for updates)
    new_value JSONB, -- New value
    performed_by VARCHAR(100), -- Username who made the change
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_action_type ON audit_log(action_type);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON audit_log;
DROP POLICY IF EXISTS "Enable insert access for all users" ON audit_log;

CREATE POLICY "Enable read access for all users" ON audit_log FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON audit_log FOR INSERT WITH CHECK (true);
