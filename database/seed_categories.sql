-- =====================================================
-- SellGH - Seed Categories Only
-- Run this in Supabase SQL Editor
-- =====================================================

-- Seed main categories for Ghana marketplace
INSERT INTO categories (name, slug, description, is_active) VALUES
    ('Electronics', 'electronics', 'Phones, laptops, TVs, and other electronic devices', true),
    ('Fashion', 'fashion', 'Clothing, shoes, and accessories for men and women', true),
    ('Home & Garden', 'home-garden', 'Furniture, decor, and garden supplies', true),
    ('Health & Beauty', 'health-beauty', 'Cosmetics, skincare, and health products', true),
    ('Food & Groceries', 'food-groceries', 'Fresh food, packaged goods, and beverages', true),
    ('Sports & Fitness', 'sports-fitness', 'Sports equipment and fitness gear', true),
    ('Books & Stationery', 'books-stationery', 'Books, office supplies, and educational materials', true),
    ('Baby & Kids', 'baby-kids', 'Baby products, toys, and children''s items', true),
    ('Automotive', 'automotive', 'Car parts, accessories, and maintenance products', true),
    ('Services', 'services', 'Professional services and repairs', true)
ON CONFLICT (slug) DO NOTHING;

-- Add subcategories for Electronics
INSERT INTO categories (name, slug, description, parent_id, is_active)
SELECT
    sub.name,
    sub.slug,
    sub.description,
    (SELECT id FROM categories WHERE slug = 'electronics'),
    true
FROM (VALUES
    ('Mobile Phones', 'mobile-phones', 'Smartphones and feature phones'),
    ('Laptops & Computers', 'laptops-computers', 'Laptops, desktops, and accessories'),
    ('Televisions', 'televisions', 'Smart TVs, LED, and OLED TVs'),
    ('Audio & Headphones', 'audio-headphones', 'Speakers, headphones, and sound systems'),
    ('Cameras', 'cameras', 'Digital cameras and photography equipment')
) AS sub(name, slug, description)
ON CONFLICT (slug) DO NOTHING;

-- Add subcategories for Fashion
INSERT INTO categories (name, slug, description, parent_id, is_active)
SELECT
    sub.name,
    sub.slug,
    sub.description,
    (SELECT id FROM categories WHERE slug = 'fashion'),
    true
FROM (VALUES
    ('Men''s Clothing', 'mens-clothing', 'Shirts, trousers, and suits for men'),
    ('Women''s Clothing', 'womens-clothing', 'Dresses, tops, and skirts for women'),
    ('Shoes', 'shoes', 'Footwear for all occasions'),
    ('Bags & Accessories', 'bags-accessories', 'Handbags, wallets, and jewelry'),
    ('African Wear', 'african-wear', 'Traditional and modern African fashion')
) AS sub(name, slug, description)
ON CONFLICT (slug) DO NOTHING;

-- Add subcategories for Home & Garden
INSERT INTO categories (name, slug, description, parent_id, is_active)
SELECT
    sub.name,
    sub.slug,
    sub.description,
    (SELECT id FROM categories WHERE slug = 'home-garden'),
    true
FROM (VALUES
    ('Furniture', 'furniture', 'Sofas, beds, tables, and chairs'),
    ('Kitchen & Dining', 'kitchen-dining', 'Cookware, utensils, and appliances'),
    ('Home Decor', 'home-decor', 'Decorations, art, and lighting'),
    ('Garden & Outdoor', 'garden-outdoor', 'Plants, tools, and outdoor furniture')
) AS sub(name, slug, description)
ON CONFLICT (slug) DO NOTHING;

SELECT 'Categories seeded successfully!' AS status;
