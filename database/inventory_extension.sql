-- Inventory Management Extension (Enhanced for Variations)

-- 1. Base tracking columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS inventory_updated BOOLEAN DEFAULT FALSE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS inventory_updated BOOLEAN DEFAULT FALSE;
ALTER TABLE supplier_order_items ADD COLUMN IF NOT EXISTS size VARCHAR(100);

-- 2. Granular stock tracking by variation (Size/Color)
CREATE TABLE IF NOT EXISTS product_stock (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    variation_name VARCHAR(100) NOT NULL, -- e.g. "500mm", "לבן", "1000mm - שחור"
    stock_quantity DECIMAL(12, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, variation_name)
);

-- 3. Enhanced inventory transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    variation_name VARCHAR(100), -- Track which variation was changed
    change_amount DECIMAL(12, 2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'sale', 'adjustment'
    reference_id UUID, -- order_id or deal_id
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reference ON inventory_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_pid ON product_stock(product_id);
