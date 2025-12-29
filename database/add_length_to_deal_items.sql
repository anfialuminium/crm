-- Add length column to deal_items table
ALTER TABLE deal_items ADD COLUMN length DECIMAL(10, 2) DEFAULT 1;
