-- Debug script to check products and vendors
-- Run this in Supabase SQL Editor

-- 1. Check all vendors
SELECT 'VENDORS:' as section;
SELECT id, business_name, is_verified, is_active FROM vendors;

-- 2. Check all products
SELECT 'PRODUCTS:' as section;
SELECT id, name, vendor_id, is_active, category_id FROM products LIMIT 10;

-- 3. Check categories
SELECT 'CATEGORIES:' as section;
SELECT id, name, slug FROM categories WHERE parent_id IS NULL;

-- 4. Check products with their vendor verification status
SELECT 'PRODUCTS WITH VENDOR STATUS:' as section;
SELECT
    p.name as product_name,
    p.is_active as product_active,
    v.business_name,
    v.is_verified as vendor_verified,
    v.is_active as vendor_active
FROM products p
JOIN vendors v ON p.vendor_id = v.id
LIMIT 10;

-- 5. Count products that SHOULD be visible (matching the RLS policy)
SELECT 'VISIBLE PRODUCTS COUNT:' as section;
SELECT COUNT(*) as visible_products
FROM products p
WHERE p.is_active = true
AND EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = p.vendor_id
    AND v.is_verified = true
    AND v.is_active = true
);
