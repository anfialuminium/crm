-- ============================================
-- RLS POLICIES FOR CRM SYSTEM
-- ============================================
-- This file defines Row Level Security (RLS) policies to allow access to data.
-- Since Authentication is not yet implemented, these policies allow public (anonymous) access.
-- WARNING: In a production environment with real users, you should restrict these policies
-- to authenticated users only using `TO authenticated` and checking `auth.uid()`.

-- 1. Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies
-- We use "IF NOT EXISTS" logic by dropping first to avoid errors if re-running

-- CUSTOMERS
DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON customers;
DROP POLICY IF EXISTS "Enable update access for all users" ON customers;
DROP POLICY IF EXISTS "Enable delete access for all users" ON customers;

CREATE POLICY "Enable read access for all users" ON customers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON customers FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON customers FOR DELETE USING (true);

-- PRODUCTS
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON products;
DROP POLICY IF EXISTS "Enable update access for all users" ON products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON products;

CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON products FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON products FOR DELETE USING (true);

-- PRODUCT COLORS
DROP POLICY IF EXISTS "Enable read access for all users" ON product_colors;
DROP POLICY IF EXISTS "Enable insert access for all users" ON product_colors;
DROP POLICY IF EXISTS "Enable update access for all users" ON product_colors;
DROP POLICY IF EXISTS "Enable delete access for all users" ON product_colors;

CREATE POLICY "Enable read access for all users" ON product_colors FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON product_colors FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON product_colors FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON product_colors FOR DELETE USING (true);

-- PRODUCT SIZES
DROP POLICY IF EXISTS "Enable read access for all users" ON product_sizes;
DROP POLICY IF EXISTS "Enable insert access for all users" ON product_sizes;
DROP POLICY IF EXISTS "Enable update access for all users" ON product_sizes;
DROP POLICY IF EXISTS "Enable delete access for all users" ON product_sizes;

CREATE POLICY "Enable read access for all users" ON product_sizes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON product_sizes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON product_sizes FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON product_sizes FOR DELETE USING (true);

-- DEALS
DROP POLICY IF EXISTS "Enable read access for all users" ON deals;
DROP POLICY IF EXISTS "Enable insert access for all users" ON deals;
DROP POLICY IF EXISTS "Enable update access for all users" ON deals;
DROP POLICY IF EXISTS "Enable delete access for all users" ON deals;

CREATE POLICY "Enable read access for all users" ON deals FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON deals FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON deals FOR DELETE USING (true);

-- DEAL ITEMS
DROP POLICY IF EXISTS "Enable read access for all users" ON deal_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON deal_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON deal_items;
DROP POLICY IF EXISTS "Enable delete access for all users" ON deal_items;

CREATE POLICY "Enable read access for all users" ON deal_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON deal_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON deal_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON deal_items FOR DELETE USING (true);

-- ACTIVITIES (NOTES)
DROP POLICY IF EXISTS "Enable read access for all users" ON activities;
DROP POLICY IF EXISTS "Enable insert access for all users" ON activities;
DROP POLICY IF EXISTS "Enable update access for all users" ON activities;
DROP POLICY IF EXISTS "Enable delete access for all users" ON activities;

CREATE POLICY "Enable read access for all users" ON activities FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON activities FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON activities FOR DELETE USING (true);
