-- Add size_prices column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_prices JSONB DEFAULT '[]'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN products.size_prices IS 'Store prices for different sizes, e.g., [{"size": "35/50", "price": 70}, {"size": "50/70", "price": 83}]';
