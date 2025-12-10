-- ============================================
-- SUPPLIERS MANAGEMENT TABLES
-- ============================================

-- 1. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(255), -- Changed to 255 to support multiple numbers
    email VARCHAR(255),
    address VARCHAR(255),
    category VARCHAR(100), -- e.g. 'Aluminum', 'Glass', 'Hardware'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE,
    website VARCHAR(255),
    additional_emails JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(supplier_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);

-- 2. SUPPLIER ORDERS TABLE (Purchase Orders)
CREATE TABLE IF NOT EXISTS supplier_orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    order_status VARCHAR(50) DEFAULT 'חדש' CHECK (order_status IN ('חדש', 'נשלח', 'התקבל', 'בוטל', 'טיוטה')),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expected_date TIMESTAMP WITH TIME ZONE,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_number SERIAL
);

CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier ON supplier_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON supplier_orders(order_status);

-- 3. SUPPLIER ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS supplier_order_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES supplier_orders(order_id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL, -- Free text or product name
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) DEFAULT 0,
    total_price DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    sku VARCHAR(100), -- Optional
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_order_items_order ON supplier_order_items(order_id);

-- Apply Updated At Trigger (Reusing existing function)
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_orders_updated_at
    BEFORE UPDATE ON supplier_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update order total
CREATE OR REPLACE FUNCTION update_supplier_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE supplier_orders
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM supplier_order_items
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    )
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for order total
CREATE TRIGGER update_supplier_order_total_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON supplier_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_order_total();
