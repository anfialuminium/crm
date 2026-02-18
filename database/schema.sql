-- ============================================
-- CRM Database Schema for Supabase
-- Hardware & Aluminum Import & Distribution
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CUSTOMERS TABLE
-- ============================================
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    city VARCHAR(100),
    customer_type VARCHAR(50) CHECK (customer_type IN ('חנות', 'קבלן', 'מחסן', 'מפעל', 'אחר')),
    source VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

-- Index for faster searches
CREATE INDEX idx_customers_business_name ON customers(business_name);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);

-- ============================================
-- 2. PRODUCTS TABLE
-- ============================================
CREATE TABLE products (
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    sku VARCHAR(100) UNIQUE,
    price DECIMAL(10, 2),
    requires_color BOOLEAN DEFAULT FALSE,
    requires_size BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster searches
CREATE INDEX idx_products_name ON products(product_name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_active ON products(active);

-- ============================================
-- 3. PRODUCT COLORS (Optional attributes)
-- ============================================
CREATE TABLE product_colors (
    color_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    color_name VARCHAR(100) NOT NULL UNIQUE,
    color_code VARCHAR(20), -- HEX code for visual representation
    active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 4. PRODUCT SIZES (Optional attributes)
-- ============================================
CREATE TABLE product_sizes (
    size_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    size_name VARCHAR(100) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 5. DEALS TABLE
-- ============================================
CREATE TABLE deals (
    deal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    deal_status VARCHAR(50) DEFAULT 'חדש' CHECK (deal_status IN ('חדש', 'ממתין', 'זכייה', 'הפסד', 'טיוטה')),
    total_amount DECIMAL(12, 2) DEFAULT 0,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    final_amount DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_by VARCHAR(255), -- User who created the deal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_deals_customer ON deals(customer_id);
CREATE INDEX idx_deals_status ON deals(deal_status);
CREATE INDEX idx_deals_created_at ON deals(created_at);

-- ============================================
-- 6. DEAL ITEMS TABLE
-- ============================================
CREATE TABLE deal_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    color VARCHAR(100), -- Optional, based on product requirements
    size VARCHAR(100), -- Optional, based on product requirements
    is_fin_brush BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deal_items_deal ON deal_items(deal_id);
CREATE INDEX idx_deal_items_product ON deal_items(product_id);

-- ============================================
-- 7. ACTIVITIES LOG (Optional - for tracking)
-- ============================================
CREATE TABLE activities (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES deals(deal_id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(customer_id) ON DELETE CASCADE,
    activity_type VARCHAR(50) CHECK (activity_type IN ('שיחה', 'פגישה', 'אימייל', 'הערה', 'עדכון_סטטוס')),
    description TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activities_deal ON activities(deal_id);
CREATE INDEX idx_activities_customer ON activities(customer_id);
CREATE INDEX idx_activities_created_at ON activities(created_at);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Apply trigger to customers
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to products
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to deals
CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION TO UPDATE DEAL TOTAL
-- ============================================
CREATE OR REPLACE FUNCTION update_deal_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE deals
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM deal_items
        WHERE deal_id = COALESCE(NEW.deal_id, OLD.deal_id)
    ),
    final_amount = (
        SELECT COALESCE(SUM(total_price), 0) - COALESCE(discount_amount, 0)
        FROM deal_items
        WHERE deal_id = COALESCE(NEW.deal_id, OLD.deal_id)
    )
    WHERE deal_id = COALESCE(NEW.deal_id, OLD.deal_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Trigger to auto-update deal totals when items change
CREATE TRIGGER update_deal_total_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON deal_items
    FOR EACH ROW
    EXECUTE FUNCTION update_deal_total();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample colors
INSERT INTO product_colors (color_name, color_code) VALUES
    ('לבן', '#FFFFFF'),
    ('שחור', '#000000'),
    ('חום', '#8B4513'),
    ('אפור', '#808080'),
    ('כסף', '#C0C0C0'),
    ('זהב', '#FFD700'),
    ('ברונזה', '#CD7F32');

-- Insert sample sizes
INSERT INTO product_sizes (size_name) VALUES
    ('קטן'),
    ('בינוני'),
    ('גדול'),
    ('15 מ"מ'),
    ('20 מ"מ'),
    ('25 מ"מ'),
    ('30 מ"מ');

-- Insert sample products
INSERT INTO products (product_name, category, sku, price, requires_color, requires_size, active) VALUES
    ('מברשת 7000', 'אביזרים', 'BR-7000', 15.50, FALSE, FALSE, TRUE),
    ('רשת שקופה', 'רשתות', 'NET-CLEAR', 25.00, FALSE, TRUE, TRUE),
    ('פרופיל אלומיניום 15', 'פרופילים', 'ALU-15', 45.00, TRUE, FALSE, TRUE),
    ('גלגל דלת הזזה 7000 פלסטיק', 'גלגלים', 'WHEEL-7000-P', 12.00, TRUE, FALSE, TRUE),
    ('ידית אלומיניום', 'ידיות', 'HANDLE-ALU', 35.00, TRUE, TRUE, TRUE),
    ('מנעול דלת', 'מנעולים', 'LOCK-001', 85.00, FALSE, FALSE, TRUE);

-- Insert sample customer
INSERT INTO customers (business_name, contact_name, phone, email, city, customer_type, source) VALUES
    ('חנות הפרזול המרכזית', 'יוסי כהן', '050-1234567', 'yossi@example.com', 'תל אביב', 'חנות', 'המלצה'),
    ('קבלנות בניין בע"מ', 'משה לוי', '052-9876543', 'moshe@example.com', 'חיפה', 'קבלן', 'אתר'),
    ('מפעל דלתות ישראל', 'דני אברהם', '054-5555555', 'danny@example.com', 'ירושלים', 'מפעל', 'תערוכה');

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Optional
-- ============================================
-- Uncomment if you want to enable RLS for multi-tenant support

-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deal_items ENABLE ROW LEVEL SECURITY;

-- Example policy (adjust based on your auth setup):
-- CREATE POLICY "Users can view all customers" ON customers FOR SELECT USING (true);
-- CREATE POLICY "Users can insert customers" ON customers FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Users can update customers" ON customers FOR UPDATE USING (true);
