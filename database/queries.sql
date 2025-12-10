-- ============================================
-- Useful SQL Queries for CRM System
-- ============================================

-- ============================================
-- 1. REPORTS & ANALYTICS
-- ============================================

-- Total deals by status
SELECT 
    deal_status,
    COUNT(*) as deal_count,
    SUM(final_amount) as total_revenue,
    AVG(final_amount) as avg_deal_size
FROM deals
GROUP BY deal_status
ORDER BY total_revenue DESC;

-- Monthly sales report
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as deals_count,
    SUM(final_amount) as total_revenue,
    AVG(final_amount) as avg_deal_size
FROM deals
WHERE deal_status = 'זכייה'
GROUP BY month
ORDER BY month DESC;

-- Top customers by revenue
SELECT 
    c.business_name,
    c.contact_name,
    c.city,
    COUNT(d.deal_id) as total_deals,
    SUM(d.final_amount) as total_revenue,
    AVG(d.final_amount) as avg_deal_size
FROM customers c
LEFT JOIN deals d ON c.customer_id = d.customer_id
WHERE d.deal_status = 'זכייה'
GROUP BY c.customer_id, c.business_name, c.contact_name, c.city
ORDER BY total_revenue DESC
LIMIT 20;

-- Top selling products
SELECT 
    p.product_name,
    p.category,
    COUNT(di.item_id) as times_sold,
    SUM(di.quantity) as total_quantity,
    SUM(di.total_price) as total_revenue
FROM products p
LEFT JOIN deal_items di ON p.product_id = di.product_id
LEFT JOIN deals d ON di.deal_id = d.deal_id
WHERE d.deal_status = 'זכייה'
GROUP BY p.product_id, p.product_name, p.category
ORDER BY total_revenue DESC;

-- Conversion rate by customer type
SELECT 
    c.customer_type,
    COUNT(CASE WHEN d.deal_status = 'זכייה' THEN 1 END) as won_deals,
    COUNT(CASE WHEN d.deal_status = 'הפסד' THEN 1 END) as lost_deals,
    COUNT(*) as total_deals,
    ROUND(
        COUNT(CASE WHEN d.deal_status = 'זכייה' THEN 1 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) as win_rate_percentage
FROM customers c
LEFT JOIN deals d ON c.customer_id = d.customer_id
GROUP BY c.customer_type
ORDER BY win_rate_percentage DESC;

-- ============================================
-- 2. DEAL DETAILS
-- ============================================

-- Get full deal information with items
SELECT 
    d.deal_id,
    d.deal_status,
    d.created_at,
    c.business_name,
    c.contact_name,
    c.phone,
    p.product_name,
    di.quantity,
    di.unit_price,
    di.total_price,
    di.color,
    di.size
FROM deals d
JOIN customers c ON d.customer_id = c.customer_id
JOIN deal_items di ON d.deal_id = di.deal_id
JOIN products p ON di.product_id = p.product_id
WHERE d.deal_id = 'YOUR_DEAL_ID'
ORDER BY di.created_at;

-- Recent deals (last 30 days)
SELECT 
    d.deal_id,
    d.created_at,
    c.business_name,
    d.deal_status,
    d.final_amount,
    COUNT(di.item_id) as items_count
FROM deals d
JOIN customers c ON d.customer_id = c.customer_id
LEFT JOIN deal_items di ON d.deal_id = di.deal_id
WHERE d.created_at >= NOW() - INTERVAL '30 days'
GROUP BY d.deal_id, d.created_at, c.business_name, d.deal_status, d.final_amount
ORDER BY d.created_at DESC;

-- ============================================
-- 3. CUSTOMER INSIGHTS
-- ============================================

-- Customers without recent activity (90 days)
SELECT 
    c.customer_id,
    c.business_name,
    c.contact_name,
    c.phone,
    MAX(d.created_at) as last_deal_date,
    COUNT(d.deal_id) as total_deals
FROM customers c
LEFT JOIN deals d ON c.customer_id = d.customer_id
GROUP BY c.customer_id, c.business_name, c.contact_name, c.phone
HAVING MAX(d.created_at) < NOW() - INTERVAL '90 days' 
    OR MAX(d.created_at) IS NULL
ORDER BY last_deal_date DESC NULLS LAST;

-- Customer lifetime value
SELECT 
    c.customer_id,
    c.business_name,
    c.created_at as customer_since,
    COUNT(d.deal_id) as total_deals,
    SUM(CASE WHEN d.deal_status = 'זכייה' THEN d.final_amount ELSE 0 END) as lifetime_value,
    AVG(CASE WHEN d.deal_status = 'זכייה' THEN d.final_amount END) as avg_deal_value
FROM customers c
LEFT JOIN deals d ON c.customer_id = d.customer_id
GROUP BY c.customer_id, c.business_name, c.created_at
ORDER BY lifetime_value DESC NULLS LAST;

-- ============================================
-- 4. PRODUCT ANALYTICS
-- ============================================

-- Products that require color/size most often
SELECT 
    p.product_name,
    p.requires_color,
    p.requires_size,
    COUNT(di.item_id) as times_ordered,
    COUNT(DISTINCT di.color) as unique_colors,
    COUNT(DISTINCT di.size) as unique_sizes
FROM products p
LEFT JOIN deal_items di ON p.product_id = di.product_id
WHERE p.requires_color = true OR p.requires_size = true
GROUP BY p.product_id, p.product_name, p.requires_color, p.requires_size
ORDER BY times_ordered DESC;

-- Most popular color combinations
SELECT 
    color,
    COUNT(*) as times_ordered,
    SUM(total_price) as total_revenue
FROM deal_items
WHERE color IS NOT NULL AND color != ''
GROUP BY color
ORDER BY times_ordered DESC
LIMIT 10;

-- ============================================
-- 5. INVENTORY & PRICING
-- ============================================

-- Products with no recent sales (60 days)
SELECT 
    p.product_id,
    p.product_name,
    p.category,
    p.price,
    MAX(di.created_at) as last_sold_date
FROM products p
LEFT JOIN deal_items di ON p.product_id = di.product_id
WHERE p.active = true
GROUP BY p.product_id, p.product_name, p.category, p.price
HAVING MAX(di.created_at) < NOW() - INTERVAL '60 days' 
    OR MAX(di.created_at) IS NULL
ORDER BY last_sold_date DESC NULLS LAST;

-- Average discount by product category
SELECT 
    p.category,
    COUNT(DISTINCT d.deal_id) as deals_count,
    AVG(d.discount_percentage) as avg_discount_percentage,
    SUM(d.discount_amount) as total_discount_amount
FROM deals d
JOIN deal_items di ON d.deal_id = di.deal_id
JOIN products p ON di.product_id = p.product_id
WHERE d.discount_percentage > 0
GROUP BY p.category
ORDER BY avg_discount_percentage DESC;

-- ============================================
-- 6. PERFORMANCE METRICS
-- ============================================

-- Sales funnel analysis
SELECT 
    'Total Deals' as stage,
    COUNT(*) as count,
    100.0 as percentage
FROM deals
UNION ALL
SELECT 
    'Won Deals' as stage,
    COUNT(*) as count,
    ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM deals) * 100, 2) as percentage
FROM deals
WHERE deal_status = 'זכייה'
UNION ALL
SELECT 
    'Lost Deals' as stage,
    COUNT(*) as count,
    ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM deals) * 100, 2) as percentage
FROM deals
WHERE deal_status = 'הפסד'
UNION ALL
SELECT 
    'Pending Deals' as stage,
    COUNT(*) as count,
    ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM deals) * 100, 2) as percentage
FROM deals
WHERE deal_status IN ('חדש', 'ממתין');

-- Average time to close deals
SELECT 
    deal_status,
    AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400) as avg_days_to_close,
    MIN(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400) as min_days,
    MAX(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400) as max_days
FROM deals
WHERE closed_at IS NOT NULL
GROUP BY deal_status;

-- ============================================
-- 7. DATA CLEANUP
-- ============================================

-- Find duplicate customers (by phone)
SELECT 
    phone,
    COUNT(*) as duplicate_count,
    STRING_AGG(business_name, ', ') as business_names
FROM customers
WHERE phone IS NOT NULL AND phone != ''
GROUP BY phone
HAVING COUNT(*) > 1;

-- Find deals with no items
SELECT 
    d.deal_id,
    d.created_at,
    c.business_name,
    d.deal_status
FROM deals d
JOIN customers c ON d.customer_id = c.customer_id
LEFT JOIN deal_items di ON d.deal_id = di.deal_id
WHERE di.item_id IS NULL;

-- ============================================
-- 8. BULK OPERATIONS
-- ============================================

-- Update all product prices by category (example: 10% increase)
-- CAUTION: Test first!
UPDATE products
SET price = price * 1.10,
    updated_at = NOW()
WHERE category = 'פרופילים'
AND active = true;

-- Mark old deals as archived (example: older than 1 year)
UPDATE deals
SET deal_status = 'ארכיון',
    updated_at = NOW()
WHERE created_at < NOW() - INTERVAL '1 year'
AND deal_status IN ('הפסד', 'זכייה');

-- ============================================
-- 9. VIEWS FOR COMMON QUERIES
-- ============================================

-- Create a view for deal summary
CREATE OR REPLACE VIEW deal_summary AS
SELECT 
    d.deal_id,
    d.created_at,
    d.deal_status,
    c.business_name,
    c.contact_name,
    c.phone,
    c.customer_type,
    COUNT(di.item_id) as items_count,
    d.total_amount,
    d.discount_amount,
    d.final_amount
FROM deals d
JOIN customers c ON d.customer_id = c.customer_id
LEFT JOIN deal_items di ON d.deal_id = di.deal_id
GROUP BY d.deal_id, d.created_at, d.deal_status, c.business_name, 
         c.contact_name, c.phone, c.customer_type, d.total_amount, 
         d.discount_amount, d.final_amount;

-- Use the view
SELECT * FROM deal_summary
WHERE deal_status = 'זכייה'
ORDER BY created_at DESC;

-- ============================================
-- 10. BACKUP & EXPORT
-- ============================================

-- Export all deals to CSV (run in Supabase SQL Editor)
COPY (
    SELECT 
        d.deal_id,
        d.created_at,
        c.business_name,
        d.deal_status,
        d.final_amount
    FROM deals d
    JOIN customers c ON d.customer_id = c.customer_id
    ORDER BY d.created_at DESC
) TO '/tmp/deals_export.csv' WITH CSV HEADER;

-- Note: For Supabase, use the Dashboard export feature instead
