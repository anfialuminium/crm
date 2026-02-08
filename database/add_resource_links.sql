-- ============================================
-- Add Resource Links Table
-- ============================================

CREATE TABLE IF NOT EXISTS resource_links (
    link_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'deal' or 'customer'
    link_name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_resource_links_entity ON resource_links(entity_id, entity_type);

-- Trigger for updated_at if not exists (already exists in schema.sql for other tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_resource_links_updated_at') THEN
        CREATE TRIGGER update_resource_links_updated_at
            BEFORE UPDATE ON resource_links
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
