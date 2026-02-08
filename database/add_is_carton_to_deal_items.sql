-- Add is_carton column to deal_items table
ALTER TABLE deal_items ADD COLUMN IF NOT EXISTS is_carton BOOLEAN DEFAULT FALSE;
