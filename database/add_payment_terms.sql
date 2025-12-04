-- Add payment_terms column to deals table
-- This allows editing payment terms for each deal individually

ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'שוטף + 120';

-- Optional: Add comment for documentation
COMMENT ON COLUMN deals.payment_terms IS 'Payment terms for this specific deal (e.g., שוטף + 30, מזומן, etc.)';
