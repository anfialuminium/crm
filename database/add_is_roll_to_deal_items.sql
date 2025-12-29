-- Add is_roll column to deal_items table
ALTER TABLE deal_items ADD COLUMN is_roll BOOLEAN DEFAULT FALSE;
