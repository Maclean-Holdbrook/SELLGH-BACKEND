-- Create platform_withdrawals table for admin commission withdrawals
CREATE TABLE IF NOT EXISTS platform_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Withdrawal details
    amount DECIMAL(12,2) NOT NULL,
    withdrawal_method VARCHAR(50) NOT NULL, -- 'momo', 'bank_transfer'
    account_details JSONB NOT NULL, -- { "account_number": "xxx", "account_name": "xxx", "provider": "MTN" }

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'

    -- Transaction details
    transaction_reference VARCHAR(255),
    completed_at TIMESTAMPTZ,

    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on platform_withdrawals
ALTER TABLE platform_withdrawals ENABLE ROW LEVEL SECURITY;

-- Platform withdrawals policies (Admin only)
DROP POLICY IF EXISTS "Admins can manage platform withdrawals" ON platform_withdrawals;
CREATE POLICY "Admins can manage platform withdrawals" ON platform_withdrawals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_platform_withdrawals_status ON platform_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_platform_withdrawals_created_at ON platform_withdrawals(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_withdrawals_created_by ON platform_withdrawals(created_by);

COMMENT ON TABLE platform_withdrawals IS 'Tracks platform commission withdrawals by admin';
COMMENT ON COLUMN platform_withdrawals.amount IS 'Amount to withdraw from platform commission';
COMMENT ON COLUMN platform_withdrawals.account_details IS 'JSON containing account details for withdrawal';
