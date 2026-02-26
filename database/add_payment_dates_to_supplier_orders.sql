-- Add down_payment_date and full_payment_date columns to supplier_orders table
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS down_payment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS full_payment_date TIMESTAMP WITH TIME ZONE;
