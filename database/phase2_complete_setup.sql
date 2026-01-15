-- =====================================================
-- SellGH Phase 2 Complete Database Setup
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CATEGORIES TABLE & SEED DATA
-- =====================================================

-- Create categories table if not exists
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Categories policies
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;
CREATE POLICY "Anyone can view active categories" ON categories
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Seed categories for Ghana marketplace
INSERT INTO categories (name, slug, description, display_order) VALUES
    ('Electronics', 'electronics', 'Phones, laptops, TVs, and other electronic devices', 1),
    ('Fashion', 'fashion', 'Clothing, shoes, and accessories for men and women', 2),
    ('Home & Garden', 'home-garden', 'Furniture, decor, and garden supplies', 3),
    ('Health & Beauty', 'health-beauty', 'Cosmetics, skincare, and health products', 4),
    ('Food & Groceries', 'food-groceries', 'Fresh food, packaged goods, and beverages', 5),
    ('Sports & Fitness', 'sports-fitness', 'Sports equipment and fitness gear', 6),
    ('Books & Stationery', 'books-stationery', 'Books, office supplies, and educational materials', 7),
    ('Baby & Kids', 'baby-kids', 'Baby products, toys, and children''s items', 8),
    ('Automotive', 'automotive', 'Car parts, accessories, and maintenance products', 9),
    ('Services', 'services', 'Professional services and repairs', 10)
ON CONFLICT (slug) DO NOTHING;

-- Add subcategories for Electronics
INSERT INTO categories (name, slug, description, parent_id, display_order)
SELECT
    sub.name,
    sub.slug,
    sub.description,
    (SELECT id FROM categories WHERE slug = 'electronics'),
    sub.display_order
FROM (VALUES
    ('Mobile Phones', 'mobile-phones', 'Smartphones and feature phones', 1),
    ('Laptops & Computers', 'laptops-computers', 'Laptops, desktops, and accessories', 2),
    ('Televisions', 'televisions', 'Smart TVs, LED, and OLED TVs', 3),
    ('Audio & Headphones', 'audio-headphones', 'Speakers, headphones, and sound systems', 4),
    ('Cameras', 'cameras', 'Digital cameras and photography equipment', 5)
) AS sub(name, slug, description, display_order)
ON CONFLICT (slug) DO NOTHING;

-- Add subcategories for Fashion
INSERT INTO categories (name, slug, description, parent_id, display_order)
SELECT
    sub.name,
    sub.slug,
    sub.description,
    (SELECT id FROM categories WHERE slug = 'fashion'),
    sub.display_order
FROM (VALUES
    ('Men''s Clothing', 'mens-clothing', 'Shirts, trousers, and suits for men', 1),
    ('Women''s Clothing', 'womens-clothing', 'Dresses, tops, and skirts for women', 2),
    ('Shoes', 'shoes', 'Footwear for all occasions', 3),
    ('Bags & Accessories', 'bags-accessories', 'Handbags, wallets, and jewelry', 4),
    ('African Wear', 'african-wear', 'Traditional and modern African fashion', 5)
) AS sub(name, slug, description, display_order)
ON CONFLICT (slug) DO NOTHING;

SELECT 'Categories seeded successfully!' AS status;

-- =====================================================
-- 2. VENDORS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),

    -- Mobile Money Details (for payments)
    momo_provider VARCHAR(50), -- 'mtn', 'vodafone', 'airteltigo'
    momo_number VARCHAR(20),
    momo_name VARCHAR(255),

    -- Business Details
    business_registration_number VARCHAR(100),
    tax_id VARCHAR(100),

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verification_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    verified_at TIMESTAMPTZ,

    -- Statistics (cached for performance)
    total_products INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Enable RLS on vendors
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Vendors policies
DROP POLICY IF EXISTS "Anyone can view verified vendors" ON vendors;
CREATE POLICY "Anyone can view verified vendors" ON vendors
    FOR SELECT USING (is_verified = true AND is_active = true);

DROP POLICY IF EXISTS "Vendors can view own profile" ON vendors;
CREATE POLICY "Vendors can view own profile" ON vendors
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Vendors can create own profile" ON vendors;
CREATE POLICY "Vendors can create own profile" ON vendors
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Vendors can update own profile" ON vendors;
CREATE POLICY "Vendors can update own profile" ON vendors
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all vendors" ON vendors;
CREATE POLICY "Admins can manage all vendors" ON vendors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_slug ON vendors(slug);
CREATE INDEX IF NOT EXISTS idx_vendors_is_verified ON vendors(is_verified);

SELECT 'Vendors table created successfully!' AS status;

-- =====================================================
-- 3. PRODUCTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,

    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2), -- Original price for showing discounts
    cost_price DECIMAL(10,2), -- Vendor's cost (private)

    -- Inventory
    sku VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    track_inventory BOOLEAN DEFAULT true,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,

    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,

    -- Statistics
    view_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(vendor_id, slug)
);

-- Enable RLS on products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Products policies
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products" ON products
    FOR SELECT USING (
        is_active = true AND
        EXISTS (
            SELECT 1 FROM vendors
            WHERE vendors.id = products.vendor_id
            AND vendors.is_verified = true
            AND vendors.is_active = true
        )
    );

DROP POLICY IF EXISTS "Vendors can view own products" ON products;
CREATE POLICY "Vendors can view own products" ON products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vendors
            WHERE vendors.id = products.vendor_id
            AND vendors.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Vendors can create products" ON products;
CREATE POLICY "Vendors can create products" ON products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM vendors
            WHERE vendors.id = products.vendor_id
            AND vendors.user_id = auth.uid()
            AND vendors.is_verified = true
        )
    );

DROP POLICY IF EXISTS "Vendors can update own products" ON products;
CREATE POLICY "Vendors can update own products" ON products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM vendors
            WHERE vendors.id = products.vendor_id
            AND vendors.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Vendors can delete own products" ON products;
CREATE POLICY "Vendors can delete own products" ON products
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM vendors
            WHERE vendors.id = products.vendor_id
            AND vendors.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all products" ON products;
CREATE POLICY "Admins can manage all products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);

SELECT 'Products table created successfully!' AS status;

-- =====================================================
-- 4. PRODUCT IMAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Product images policies
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;
CREATE POLICY "Anyone can view product images" ON product_images
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vendors can manage own product images" ON product_images;
CREATE POLICY "Vendors can manage own product images" ON product_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM products
            JOIN vendors ON products.vendor_id = vendors.id
            WHERE products.id = product_images.product_id
            AND vendors.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all product images" ON product_images;
CREATE POLICY "Admins can manage all product images" ON product_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Create index
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

SELECT 'Product images table created successfully!' AS status;

-- =====================================================
-- 5. USERS TABLE (extends auth.users)
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'vendor', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users AS u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can manage all users" ON users;
CREATE POLICY "Admins can manage all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users AS u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

SELECT 'Users table created successfully!' AS status;

-- =====================================================
-- 6. STORAGE BUCKET POLICIES
-- =====================================================

-- Note: Create the 'product-images' bucket in Supabase Dashboard first!
-- Go to Storage > Create bucket > Name: product-images > Public: Yes

-- Then run these policies:

-- Allow authenticated users to upload product images
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Anyone can view product images
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Authenticated users can update their own images
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
CREATE POLICY "Users can update own product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- Authenticated users can delete images
DROP POLICY IF EXISTS "Users can delete product images" ON storage.objects;
CREATE POLICY "Users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

SELECT 'Storage policies created successfully!' AS status;

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Triggers created successfully!' AS status;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

SELECT '🎉 Phase 2 Database Setup Complete!' AS status;
