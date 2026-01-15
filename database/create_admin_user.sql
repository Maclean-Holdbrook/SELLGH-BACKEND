-- Create admin user profile for existing auth user
-- This will insert the user profile with admin role

-- First, let's check if the user already exists
-- User ID: 05d79081-e0b1-4e9b-a61b-b161872c530c
-- Email: macleaann723@gmail.com

-- Insert the user profile with admin role
INSERT INTO users (id, email, full_name, role, is_active)
VALUES (
    '05d79081-e0b1-4e9b-a61b-b161872c530c',
    'macleaann723@gmail.com',
    'Admin User',
    'admin',
    true
)
ON CONFLICT (id) DO UPDATE
SET
    role = 'admin',
    is_active = true,
    updated_at = NOW();

-- Verify the user was created
SELECT id, email, role, is_active, created_at
FROM users
WHERE id = '05d79081-e0b1-4e9b-a61b-b161872c530c';
