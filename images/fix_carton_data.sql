-- ============================================================
-- Fix carton data for NINGBO HUAYI order from 2026-01-05
-- Run this in Supabase SQL Editor
-- ============================================================

-- First, let's see what we're updating (dry run)
SELECT 
    soi.item_id,
    soi.order_id,
    soi.description,
    soi.sku,
    soi.quantity,
    soi.cartons,
    soi.qty_per_carton,
    so.created_at
FROM supplier_order_items soi
JOIN supplier_orders so ON so.order_id = soi.order_id
WHERE so.created_at::date = '2026-01-05'
AND soi.sku IN ('GLG-106', 'GLG-105', 'GLG-103', 'GLG-107');

-- ============================================================
-- GLG-106 (גלגל 9000 כפול משקל כבד): 64 per carton, 79 cartons = 5056 total
-- ============================================================
UPDATE supplier_order_items 
SET 
    description = CASE 
        WHEN description NOT LIKE '%[%x%]%' 
        THEN description || ' [79 x 64]'
        ELSE regexp_replace(description, '\s*\[\d+\s*x\s*[\d.]+\]\s*$', '') || ' [79 x 64]'
    END,
    cartons = 79,
    qty_per_carton = 64
WHERE sku = 'GLG-106' 
AND quantity = 5056
AND order_id IN (
    SELECT order_id FROM supplier_orders 
    WHERE created_at::date = '2026-01-05'
);

-- ============================================================
-- GLG-105 (גלגל 7300 פלסטיק בודד): 180 per carton, 56 cartons = 10080 total
-- ============================================================
UPDATE supplier_order_items 
SET 
    description = CASE 
        WHEN description NOT LIKE '%[%x%]%' 
        THEN description || ' [56 x 180]'
        ELSE regexp_replace(description, '\s*\[\d+\s*x\s*[\d.]+\]\s*$', '') || ' [56 x 180]'
    END,
    cartons = 56,
    qty_per_carton = 180
WHERE sku = 'GLG-105'
AND quantity = 10080
AND order_id IN (
    SELECT order_id FROM supplier_orders 
    WHERE created_at::date = '2026-01-05'
);

-- ============================================================
-- GLG-103 (גלגל 7000 פלסטיק בודד): 180 per carton, 56 cartons = 10080 total
-- ============================================================
UPDATE supplier_order_items 
SET 
    description = CASE 
        WHEN description NOT LIKE '%[%x%]%' 
        THEN description || ' [56 x 180]'
        ELSE regexp_replace(description, '\s*\[\d+\s*x\s*[\d.]+\]\s*$', '') || ' [56 x 180]'
    END,
    cartons = 56,
    qty_per_carton = 180
WHERE sku = 'GLG-103'
AND quantity = 10080
AND order_id IN (
    SELECT order_id FROM supplier_orders 
    WHERE created_at::date = '2026-01-05'
);

-- ============================================================
-- GLG-107 (גלגל פלסטיק לרשת קלה): 100 per carton, 104 cartons = 10400 total
-- ============================================================
UPDATE supplier_order_items 
SET 
    description = CASE 
        WHEN description NOT LIKE '%[%x%]%' 
        THEN description || ' [104 x 100]'
        ELSE regexp_replace(description, '\s*\[\d+\s*x\s*[\d.]+\]\s*$', '') || ' [104 x 100]'
    END,
    cartons = 104,
    qty_per_carton = 100
WHERE sku = 'GLG-107'
AND quantity = 10400
AND order_id IN (
    SELECT order_id FROM supplier_orders 
    WHERE created_at::date = '2026-01-05'
);

-- ============================================================
-- Verify the updates
-- ============================================================
SELECT 
    soi.description,
    soi.sku,
    soi.quantity AS total_units,
    soi.cartons,
    soi.qty_per_carton,
    soi.unit_price,
    (soi.qty_per_carton * soi.cartons) AS calculated_total
FROM supplier_order_items soi
JOIN supplier_orders so ON so.order_id = soi.order_id
WHERE so.created_at::date = '2026-01-05'
AND soi.sku IN ('GLG-106', 'GLG-105', 'GLG-103', 'GLG-107');
