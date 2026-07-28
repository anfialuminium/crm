-- Add show_in_inventory column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS show_in_inventory BOOLEAN DEFAULT TRUE;

-- Comment for documentation
COMMENT ON COLUMN products.show_in_inventory IS 'Flag to control whether a product is displayed in the inventory tracking list';
