-- Add down_payment column to supplier_orders table
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS down_payment DECIMAL(12, 2) DEFAULT 0;
