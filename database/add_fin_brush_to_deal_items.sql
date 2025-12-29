-- Add is_fin_brush column to deal_items table
ALTER TABLE deal_items ADD COLUMN is_fin_brush BOOLEAN DEFAULT FALSE;
