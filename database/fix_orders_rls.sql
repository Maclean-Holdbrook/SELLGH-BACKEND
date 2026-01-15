-- Fix RLS policies for orders table
-- Run this in Supabase SQL Editor

-- First, drop all existing policies on orders
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
DROP POLICY IF EXISTS "Enable read access for users" ON orders;
DROP POLICY IF EXISTS "Enable insert access for users" ON orders;
DROP POLICY IF EXISTS "Enable update access for users" ON orders;

-- Create simple, non-recursive policies

-- Users can view their own orders
CREATE POLICY "users_view_own_orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create orders for themselves
CREATE POLICY "users_create_own_orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own orders
CREATE POLICY "users_update_own_orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Also fix order_items policies
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;
DROP POLICY IF EXISTS "Vendors can view own order items" ON order_items;
DROP POLICY IF EXISTS "Vendors can update own order items" ON order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON order_items;

-- Simple order_items policies
CREATE POLICY "users_view_own_order_items" ON order_items
    FOR SELECT USING (
        order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    );

CREATE POLICY "users_create_order_items" ON order_items
    FOR INSERT WITH CHECK (
        order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    );

SELECT 'RLS policies fixed!' AS status;
