-- Add test commission data for testing withdrawals
-- This creates fake commission records so you can test the withdrawal feature

-- First, get a sample vendor_id and order_id
-- Replace these UUIDs with actual ones from your database

-- Example: Insert test commission (adjust the IDs to match your database)
INSERT INTO commissions (
    order_id,
    vendor_id,
    order_total,
    vendor_amount,
    platform_commission,
    status,
    created_at
) VALUES
(
    gen_random_uuid(), -- Replace with actual order_id if needed
    (SELECT id FROM vendors LIMIT 1), -- Uses first vendor
    1000.00, -- GHS 1000 order total
    950.00,  -- 95% to vendor
    50.00,   -- 5% platform commission
    'pending',
    NOW()
),
(
    gen_random_uuid(),
    (SELECT id FROM vendors LIMIT 1),
    500.00,
    475.00,
    25.00,
    'pending',
    NOW()
),
(
    gen_random_uuid(),
    (SELECT id FROM vendors LIMIT 1),
    300.00,
    285.00,
    15.00,
    'pending',
    NOW()
);

-- Check the results
SELECT
    SUM(platform_commission) as total_platform_commission,
    COUNT(*) as total_commissions
FROM commissions;

-- This should give you GHS 90.00 in platform commission to test withdrawals
