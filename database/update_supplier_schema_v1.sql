-- Run this in Supabase SQL Editor to add the missing columns
-- This will allow saving currency and multiple contacts directly in the database

-- 1. Add currency column to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'ILS';

-- 2. Add extra_contacts column to suppliers table (storing JSONB list)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS extra_contacts JSONB DEFAULT '[]'::jsonb;

-- 3. Add currency and is_paid columns to supplier_orders table
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'ILS';
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

-- 4. Ensure cartons and qty_per_carton exist in supplier_order_items (if not already there)
ALTER TABLE supplier_order_items ADD COLUMN IF NOT EXISTS cartons NUMERIC DEFAULT 1;
ALTER TABLE supplier_order_items ADD COLUMN IF NOT EXISTS qty_per_carton NUMERIC;
