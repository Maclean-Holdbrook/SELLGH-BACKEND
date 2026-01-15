-- COMPLETE FIX for orders table
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS temporarily
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies on orders (using pattern matching)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'orders'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON orders', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Drop ALL policies on order_items
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'order_items'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON order_items', pol.policyname);
    END LOOP;
END $$;

-- Step 4: Re-enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple policies for orders
CREATE POLICY "orders_select" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (auth.uid() = user_id);

-- Step 6: Create simple policies for order_items
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (true);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (true);

SELECT 'Orders RLS completely fixed!' AS status;
