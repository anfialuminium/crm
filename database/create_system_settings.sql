-- ============================================
-- SYSTEM SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
    setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS "Enable access for all users" ON system_settings;

CREATE POLICY "Enable access for all users" ON system_settings
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Insert initial values
INSERT INTO system_settings (setting_key, setting_value) VALUES 
('customer_types', '["חנות", "קבלן", "מחסן", "מפעל", "אחר"]'::jsonb),
('supplier_categories', '["אלומיניום", "פרזול", "זכוכית", "אחר"]'::jsonb),
('deal_statuses', '["חדש", "ממתין", "זכייה", "הפסד", "טיוטה"]'::jsonb),
('lead_sources', '["המלצה", "אתר", "תערוכה", "פרסום", "לקוח חוזר", "אחר"]'::jsonb),
('product_categories', '["פרופילים", "אביזרים", "רשתות", "גלגלים", "ידיות", "מנעולים", "אחר"]'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
