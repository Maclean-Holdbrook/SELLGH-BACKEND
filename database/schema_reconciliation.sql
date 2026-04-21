-- SellGH schema reconciliation
-- Canonical contract for the current runtime codebase
-- Run after phase2/phase3 setup scripts

-- =====================================================
-- Vendors: support both canonical and legacy runtime fields
-- =====================================================
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS momo_provider VARCHAR(50);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS momo_number VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS business_phone VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS business_email VARCHAR(255);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS mobile_money_provider VARCHAR(50);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS mobile_money_number VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS mtn_momo_number VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vodafone_cash_number VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS airteltigo_number VARCHAR(20);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paystack_subaccount_code VARCHAR(255);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS paystack_subaccount_id INTEGER;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS subaccount_created_at TIMESTAMPTZ;

UPDATE vendors
SET
  business_description = COALESCE(business_description, description),
  business_phone = COALESCE(business_phone, phone),
  business_email = COALESCE(business_email, email),
  business_address = COALESCE(business_address, address),
  verification_date = COALESCE(verification_date, verified_at),
  total_reviews = COALESCE(total_reviews, review_count, 0),
  mobile_money_provider = COALESCE(mobile_money_provider, momo_provider),
  mobile_money_number = COALESCE(mobile_money_number, momo_number),
  mtn_momo_number = COALESCE(mtn_momo_number, CASE WHEN UPPER(COALESCE(momo_provider, mobile_money_provider, '')) = 'MTN' THEN COALESCE(momo_number, mobile_money_number) END),
  vodafone_cash_number = COALESCE(vodafone_cash_number, CASE WHEN UPPER(COALESCE(momo_provider, mobile_money_provider, '')) IN ('VOD', 'VODAFONE') THEN COALESCE(momo_number, mobile_money_number) END),
  airteltigo_number = COALESCE(airteltigo_number, CASE WHEN UPPER(COALESCE(momo_provider, mobile_money_provider, '')) IN ('TGO', 'AIRTELTIGO', 'AIRTEL') THEN COALESCE(momo_number, mobile_money_number) END);

-- =====================================================
-- Orders
-- =====================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total DECIMAL(12,2);

UPDATE orders
SET
  subtotal = COALESCE(subtotal, total_amount, total),
  total = COALESCE(total, total_amount, subtotal),
  total_amount = COALESCE(total_amount, total, subtotal)
WHERE subtotal IS NULL OR total IS NULL OR total_amount IS NULL;

-- =====================================================
-- Order items
-- =====================================================
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_image TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total DECIMAL(10,2);

UPDATE order_items
SET
  subtotal = COALESCE(subtotal, total),
  total = COALESCE(total, subtotal)
WHERE subtotal IS NULL OR total IS NULL;

ALTER TABLE order_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE order_items ALTER COLUMN vendor_id DROP NOT NULL;

-- =====================================================
-- Vendor payouts: commission_ids is the canonical meaning
-- order_ids is retained for legacy compatibility
-- =====================================================
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS order_ids UUID[];
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS commission_ids UUID[];

UPDATE vendor_payouts
SET commission_ids = COALESCE(commission_ids, order_ids)
WHERE commission_ids IS NULL AND order_ids IS NOT NULL;

COMMENT ON COLUMN vendor_payouts.commission_ids IS 'Commission IDs covered by this payout';
COMMENT ON COLUMN vendor_payouts.order_ids IS 'Legacy compatibility field; mirrors commission_ids for older code/rows';

-- =====================================================
-- Transactions
-- =====================================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- Useful indexes for reconciled fields
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_commission_ids ON vendor_payouts USING GIN (commission_ids);
CREATE INDEX IF NOT EXISTS idx_order_items_vendor_id ON order_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

SELECT 'Schema reconciliation complete' AS status;
