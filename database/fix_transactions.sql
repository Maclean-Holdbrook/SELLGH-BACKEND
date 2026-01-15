-- First, drop the transactions table if it exists with issues
DROP TABLE IF EXISTS transactions CASCADE;

-- Recreate the transactions table properly
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    reference VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    provider VARCHAR(50) DEFAULT 'paystack',
    channel VARCHAR(50),
    gateway_response TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint on reference
ALTER TABLE transactions ADD CONSTRAINT transactions_reference_unique UNIQUE (reference);

-- Create indexes
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_reference ON transactions(reference);
