-- =====================================================
-- SellGH Sample Products Seed
-- Run this in Supabase SQL Editor
-- NOTE: You need at least one verified vendor first!
-- =====================================================

DO $$
DECLARE
    v_vendor_id UUID;
    v_electronics_id UUID;
    v_fashion_id UUID;
    v_home_id UUID;
    v_health_id UUID;
    v_sports_id UUID;
BEGIN
    -- Get the first verified vendor
    SELECT id INTO v_vendor_id FROM vendors WHERE is_verified = true LIMIT 1;

    -- If no verified vendor, get any vendor
    IF v_vendor_id IS NULL THEN
        SELECT id INTO v_vendor_id FROM vendors LIMIT 1;
    END IF;

    -- If still no vendor, raise notice and exit
    IF v_vendor_id IS NULL THEN
        RAISE NOTICE 'No vendor found! Please create a vendor first.';
        RETURN;
    END IF;

    RAISE NOTICE 'Using vendor_id: %', v_vendor_id;

    -- Get category IDs
    SELECT id INTO v_electronics_id FROM categories WHERE slug = 'electronics';
    SELECT id INTO v_fashion_id FROM categories WHERE slug = 'fashion';
    SELECT id INTO v_home_id FROM categories WHERE slug = 'home-garden';
    SELECT id INTO v_health_id FROM categories WHERE slug = 'health-beauty';
    SELECT id INTO v_sports_id FROM categories WHERE slug = 'sports-fitness';

    -- Insert Electronics Products
    INSERT INTO products (vendor_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, is_active)
    VALUES
    (v_vendor_id, v_electronics_id, 'Samsung Galaxy A54 5G', 'samsung-galaxy-a54-5g', 'Experience the power of 5G with the Samsung Galaxy A54. Features a stunning 6.4" Super AMOLED display, 128GB storage, and triple camera system.', 2499.00, 2799.00, 25, true),
    (v_vendor_id, v_electronics_id, 'iPhone 14 Pro Max', 'iphone-14-pro-max', 'Apple iPhone 14 Pro Max with Dynamic Island, 256GB, Space Black. A17 Pro chip for incredible performance.', 8500.00, 9200.00, 10, true),
    (v_vendor_id, v_electronics_id, 'HP Pavilion Laptop 15', 'hp-pavilion-laptop-15', '15.6" Full HD Display, Intel Core i5, 8GB RAM, 512GB SSD. Perfect for work and entertainment.', 4200.00, 4800.00, 15, true),
    (v_vendor_id, v_electronics_id, 'Sony WH-1000XM5 Headphones', 'sony-wh-1000xm5', 'Industry-leading noise cancellation, 30-hour battery life, crystal clear hands-free calling.', 1850.00, 2100.00, 30, true),
    (v_vendor_id, v_electronics_id, 'LG 55" 4K Smart TV', 'lg-55-4k-smart-tv', 'LG UHD 4K Smart TV with webOS, HDR10, and AI ThinQ. Transform your home entertainment.', 3200.00, 3800.00, 8, true),
    (v_vendor_id, v_electronics_id, 'JBL Flip 6 Bluetooth Speaker', 'jbl-flip-6-speaker', 'Portable waterproof speaker with powerful sound. 12 hours playtime, IP67 rating.', 580.00, 650.00, 40, true),
    (v_vendor_id, v_electronics_id, 'Apple AirPods Pro 2nd Gen', 'airpods-pro-2nd-gen', 'Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio.', 1200.00, 1350.00, 20, true),
    (v_vendor_id, v_electronics_id, 'Tecno Spark 10 Pro', 'tecno-spark-10-pro', 'Budget-friendly smartphone with 8GB RAM, 256GB storage, and 50MP camera.', 850.00, 950.00, 50, true)
    ON CONFLICT (vendor_id, slug) DO NOTHING;

    -- Insert Fashion Products
    INSERT INTO products (vendor_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, is_active)
    VALUES
    (v_vendor_id, v_fashion_id, 'African Print Shirt - Men', 'african-print-shirt-men', 'Stylish African print shirt made from premium Ankara fabric. Perfect for casual and semi-formal occasions.', 180.00, 220.00, 35, true),
    (v_vendor_id, v_fashion_id, 'Kente Cloth Dress', 'kente-cloth-dress', 'Beautiful handwoven Kente cloth dress. Authentic Ghanaian craftsmanship.', 450.00, 550.00, 15, true),
    (v_vendor_id, v_fashion_id, 'Men''s Leather Loafers', 'mens-leather-loafers', 'Genuine leather loafers, comfortable and stylish. Available in brown and black.', 320.00, 380.00, 25, true),
    (v_vendor_id, v_fashion_id, 'Women''s Ankara Handbag', 'womens-ankara-handbag', 'Handcrafted Ankara fabric handbag with leather straps. Unique African design.', 150.00, 180.00, 30, true),
    (v_vendor_id, v_fashion_id, 'Adidas Running Shoes', 'adidas-running-shoes', 'Lightweight running shoes with responsive cushioning. Breathable mesh upper.', 550.00, 650.00, 20, true),
    (v_vendor_id, v_fashion_id, 'Traditional Smock - Northern', 'traditional-smock-northern', 'Authentic Northern Ghana smock (Fugu). Hand-woven with traditional patterns.', 280.00, 350.00, 18, true),
    (v_vendor_id, v_fashion_id, 'Women''s Maxi Dress', 'womens-maxi-dress', 'Elegant flowing maxi dress perfect for any occasion. Comfortable fit.', 200.00, 250.00, 22, true),
    (v_vendor_id, v_fashion_id, 'Men''s Polo Shirt Set', 'mens-polo-shirt-set', 'Pack of 3 premium cotton polo shirts. Classic fit in assorted colors.', 220.00, 280.00, 40, true)
    ON CONFLICT (vendor_id, slug) DO NOTHING;

    -- Insert Home & Garden Products
    INSERT INTO products (vendor_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, is_active)
    VALUES
    (v_vendor_id, v_home_id, 'Rattan Living Room Set', 'rattan-living-room-set', '5-piece rattan furniture set including sofa, 2 chairs, and 2 side tables. Ghanaian craftsmanship.', 3500.00, 4200.00, 5, true),
    (v_vendor_id, v_home_id, 'African Wall Art Canvas', 'african-wall-art-canvas', 'Beautiful African-themed canvas prints. Set of 3 pieces. Perfect home decoration.', 280.00, 350.00, 25, true),
    (v_vendor_id, v_home_id, 'Kente Print Throw Pillows', 'kente-print-throw-pillows', 'Set of 4 decorative throw pillows with Kente patterns. Brighten your living space.', 180.00, 220.00, 30, true),
    (v_vendor_id, v_home_id, 'Bolga Basket - Large', 'bolga-basket-large', 'Handwoven Bolga basket from Northern Ghana. Perfect for storage or decoration.', 120.00, 150.00, 45, true),
    (v_vendor_id, v_home_id, 'LED Ceiling Fan with Light', 'led-ceiling-fan-light', 'Modern ceiling fan with integrated LED light. Remote controlled, energy efficient.', 650.00, 780.00, 12, true),
    (v_vendor_id, v_home_id, 'Ceramic Dinner Set - 24pc', 'ceramic-dinner-set-24pc', 'Complete dinner set for 6. Includes plates, bowls, cups, and saucers.', 420.00, 500.00, 18, true)
    ON CONFLICT (vendor_id, slug) DO NOTHING;

    -- Insert Health & Beauty Products
    INSERT INTO products (vendor_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, is_active)
    VALUES
    (v_vendor_id, v_health_id, 'Shea Butter - Pure Organic', 'shea-butter-pure-organic', '500g of 100% pure organic shea butter from Northern Ghana. Natural moisturizer.', 65.00, 80.00, 100, true),
    (v_vendor_id, v_health_id, 'African Black Soap Set', 'african-black-soap-set', 'Traditional African black soap, pack of 3. Natural ingredients for healthy skin.', 45.00, 55.00, 80, true),
    (v_vendor_id, v_health_id, 'Natural Hair Care Bundle', 'natural-hair-care-bundle', 'Complete natural hair care set: shampoo, conditioner, and hair oil. For all hair types.', 180.00, 220.00, 35, true),
    (v_vendor_id, v_health_id, 'Aloe Vera Gel - 500ml', 'aloe-vera-gel-500ml', 'Pure aloe vera gel for skin and hair. Soothing and hydrating.', 55.00, 70.00, 60, true),
    (v_vendor_id, v_health_id, 'Coconut Oil - Virgin Cold Pressed', 'coconut-oil-virgin', '1 Liter of pure virgin coconut oil. Multi-purpose for cooking, skin, and hair.', 85.00, 100.00, 70, true),
    (v_vendor_id, v_health_id, 'Herbal Tea Collection', 'herbal-tea-collection', 'Assorted Ghanaian herbal teas. Includes moringa, hibiscus, and ginger teas.', 75.00, 90.00, 50, true)
    ON CONFLICT (vendor_id, slug) DO NOTHING;

    -- Insert Sports & Fitness Products
    INSERT INTO products (vendor_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, is_active)
    VALUES
    (v_vendor_id, v_sports_id, 'Home Gym Dumbbell Set', 'home-gym-dumbbell-set', 'Adjustable dumbbell set (5-25kg). Perfect for home workouts. Includes storage rack.', 850.00, 1000.00, 15, true),
    (v_vendor_id, v_sports_id, 'Yoga Mat Premium', 'yoga-mat-premium', 'Non-slip yoga mat with carrying strap. 6mm thick for comfort.', 120.00, 150.00, 40, true),
    (v_vendor_id, v_sports_id, 'Football - Professional', 'football-professional', 'FIFA-approved match ball. Durable and perfect for all playing surfaces.', 180.00, 220.00, 30, true),
    (v_vendor_id, v_sports_id, 'Resistance Bands Set', 'resistance-bands-set', 'Set of 5 resistance bands with different strengths. Ideal for home training.', 95.00, 120.00, 55, true),
    (v_vendor_id, v_sports_id, 'Running Armband Phone Holder', 'running-armband-phone', 'Adjustable armband for smartphones. Sweat-proof and secure fit.', 45.00, 60.00, 70, true),
    (v_vendor_id, v_sports_id, 'Jump Rope - Speed', 'jump-rope-speed', 'Professional speed jump rope with ball bearings. Great for cardio.', 55.00, 70.00, 50, true)
    ON CONFLICT (vendor_id, slug) DO NOTHING;

    RAISE NOTICE 'Products seeded successfully!';
END $$;

-- Insert product images from Unsplash
INSERT INTO product_images (product_id, image_url, is_primary, display_order)
SELECT p.id, img.url, true, 1
FROM products p
JOIN (VALUES
    ('samsung-galaxy-a54-5g', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=600&fit=crop'),
    ('iphone-14-pro-max', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&h=600&fit=crop'),
    ('hp-pavilion-laptop-15', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop'),
    ('sony-wh-1000xm5', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop'),
    ('lg-55-4k-smart-tv', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&h=600&fit=crop'),
    ('jbl-flip-6-speaker', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=600&fit=crop'),
    ('airpods-pro-2nd-gen', 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&h=600&fit=crop'),
    ('tecno-spark-10-pro', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&h=600&fit=crop'),
    ('african-print-shirt-men', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=600&fit=crop'),
    ('kente-cloth-dress', 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=600&h=600&fit=crop'),
    ('mens-leather-loafers', 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&h=600&fit=crop'),
    ('womens-ankara-handbag', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop'),
    ('adidas-running-shoes', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop'),
    ('traditional-smock-northern', 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&h=600&fit=crop'),
    ('womens-maxi-dress', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&h=600&fit=crop'),
    ('mens-polo-shirt-set', 'https://images.unsplash.com/photo-1625910513413-5fc45e6e3e12?w=600&h=600&fit=crop'),
    ('rattan-living-room-set', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop'),
    ('african-wall-art-canvas', 'https://images.unsplash.com/photo-1582053433976-25c00369fc93?w=600&h=600&fit=crop'),
    ('kente-print-throw-pillows', 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=600&fit=crop'),
    ('bolga-basket-large', 'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=600&h=600&fit=crop'),
    ('led-ceiling-fan-light', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&h=600&fit=crop'),
    ('ceramic-dinner-set-24pc', 'https://images.unsplash.com/photo-1603199506016-5f36e6d10d0c?w=600&h=600&fit=crop'),
    ('shea-butter-pure-organic', 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&h=600&fit=crop'),
    ('african-black-soap-set', 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&h=600&fit=crop'),
    ('natural-hair-care-bundle', 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&h=600&fit=crop'),
    ('aloe-vera-gel-500ml', 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=600&fit=crop'),
    ('coconut-oil-virgin', 'https://images.unsplash.com/photo-1550411294-875e92699913?w=600&h=600&fit=crop'),
    ('herbal-tea-collection', 'https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=600&h=600&fit=crop'),
    ('home-gym-dumbbell-set', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=600&fit=crop'),
    ('yoga-mat-premium', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&h=600&fit=crop'),
    ('football-professional', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=600&fit=crop'),
    ('resistance-bands-set', 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600&h=600&fit=crop'),
    ('running-armband-phone', 'https://images.unsplash.com/photo-1576633587382-13ddf37b1fc1?w=600&h=600&fit=crop'),
    ('jump-rope-speed', 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=600&h=600&fit=crop')
) AS img(slug, url) ON p.slug = img.slug
WHERE NOT EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id
);

SELECT 'Seeding complete! Products and images added.' AS status;
