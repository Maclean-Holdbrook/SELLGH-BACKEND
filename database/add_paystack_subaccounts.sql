-- Add Paystack Subaccount fields to vendors table
-- This enables split payments where vendors receive 95% and platform gets 5%

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS paystack_subaccount_code VARCHAR(255),
ADD COLUMN IF NOT EXISTS paystack_subaccount_id INTEGER,
ADD COLUMN IF NOT EXISTS subaccount_created_at TIMESTAMPTZ;

-- Create commissions table to track platform earnings
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,

    -- Amounts
    order_total DECIMAL(12,2) NOT NULL,
    vendor_amount DECIMAL(12,2) NOT NULL, -- 95% of order total
    platform_commission DECIMAL(12,2) NOT NULL, -- 5% of order total

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'settled', 'failed'
    settled_at TIMESTAMPTZ,

    -- Payment details
    payment_reference VARCHAR(255),
    payment_method VARCHAR(50),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on commissions
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Commissions policies (Admin only can view)
DROP POLICY IF EXISTS "Admins can view all commissions" ON commissions;
CREATE POLICY "Admins can view all commissions" ON commissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Vendors can view their own commissions
DROP POLICY IF EXISTS "Vendors can view own commissions" ON commissions;
CREATE POLICY "Vendors can view own commissions" ON commissions
    FOR SELECT USING (
        vendor_id IN (
            SELECT id FROM vendors WHERE user_id = auth.uid()
        )
    );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_commissions_order_id ON commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_commissions_vendor_id ON commissions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_vendors_subaccount_code ON vendors(paystack_subaccount_code);

-- Create vendor payouts table for tracking when vendors get paid
CREATE TABLE IF NOT EXISTS vendor_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,

    -- Payout details
    amount DECIMAL(12,2) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'paid', 'failed'
    payout_method VARCHAR(50), -- 'momo', 'bank_transfer'

    -- Payment details
    transaction_reference VARCHAR(255),
    paid_at TIMESTAMPTZ,

    -- Order IDs included in this payout
    order_ids UUID[],

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on vendor_payouts
ALTER TABLE vendor_payouts ENABLE ROW LEVEL SECURITY;

-- Vendor payouts policies
DROP POLICY IF EXISTS "Admins can manage all payouts" ON vendor_payouts;
CREATE POLICY "Admins can manage all payouts" ON vendor_payouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Vendors can view own payouts" ON vendor_payouts;
CREATE POLICY "Vendors can view own payouts" ON vendor_payouts
    FOR SELECT USING (
        vendor_id IN (
            SELECT id FROM vendors WHERE user_id = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor_id ON vendor_payouts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status ON vendor_payouts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_created_at ON vendor_payouts(created_at);

COMMENT ON TABLE commissions IS 'Tracks platform commission (5%) from each order';
COMMENT ON TABLE vendor_payouts IS 'Tracks when vendors receive their earnings (95% of orders)';
COMMENT ON COLUMN vendors.paystack_subaccount_code IS 'Paystack subaccount code for split payments';
