-- =====================================================
-- SellGH Sample Products Seed V2
-- Run this in Supabase SQL Editor
-- This version handles category matching better
-- =====================================================

DO $$
DECLARE
    v_vendor_id UUID;
    v_category_id UUID;
BEGIN
    -- Get the first vendor (verified or not)
    SELECT id INTO v_vendor_id FROM vendors LIMIT 1;

    IF v_vendor_id IS NULL THEN
        RAISE NOTICE 'No vendor found! Please create a vendor first.';
        RETURN;
    END IF;

    -- Make sure the vendor is verified
    UPDATE vendors SET is_verified = true, is_active = true WHERE id = v_vendor_id;

    RAISE NOTICE 'Using vendor_id: %', v_vendor_id;

    -- Get Electronics category (try different possible slugs)
    SELECT id INTO v_category_id FROM categories
    WHERE slug IN ('electronics', 'Electronics')
    OR LOWER(name) = 'electronics'
    LIMIT 1;

    IF v_category_id IS NOT NULL THEN
        RAISE NOTICE 'Found Electronics category: %', v_category_id;

        INSERT INTO products (vendor_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, is_active)
        VALUES
        (v_vendor_id, v_category_id, 'Samsung Galaxy A54 5G', 'samsung-galaxy-a54-' || substr(md5(random()::text), 1, 6), 'Experience the power of 5G with the Samsung Galaxy A54. Features a stunning 6.4" Super AMOLED display, 128GB storage, and triple camera system.', 2499.00, 2799.00, 25, true),
        (v_vendor_id, v_category_id, 'iPhone 14 Pro Max', 'iphone-14-pro-max-' || substr(md5(random()::text), 1, 6), 'Apple iPhone 14 Pro Max with Dynamic Island, 256GB, Space Black. A17 Pro chip for incredible performance.', 8500.00, 9200.00, 10, true),
        (v_vendor_id, v_category_id, 'HP Pavilion Laptop 15', 'hp-pavilion-laptop-' || substr(md5(random()::text), 1, 6), '15.6" Full HD Display, Intel Core i5, 8GB RAM, 512GB SSD. Perfect for work and entertainment.', 4200.00, 4800.00, 15, true),
        (v_vendor_id, v_category_id, 'Sony WH-1000XM5 Headphones', 'sony-headphones-' || substr(md5(random()::text), 1, 6), 'Industry-leading noise cancellation, 30-hour battery life, crystal clear hands-free calling.', 1850.00, 2100.00, 30, true),
        (v_vendor_id, v_category_id, 'LG 55" 4K Smart TV', 'lg-55-4k-tv-' || substr(md5(random()::text), 1, 6), 'LG UHD 4K Smart TV with webOS, HDR10, and AI ThinQ. Transform your home entertainment.', 3200.00, 3800.00, 8, true),
        (v_vendor_id, v_category_id, 'JBL Flip 6 Speaker', 'jbl-flip-6-' || substr(md5(random()::text), 1, 6), 'Portable waterproof speaker with powerful sound. 12 hours playtime, IP67 rating.', 580.00, 650.00, 40, true),
        (v_vendor_id, v_category_id, 'Apple AirPods Pro 2', 'airpods-pro-' || substr(md5(random()::text), 1, 6), 'Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio.', 1200.00, 1350.00, 20, true),
        (v_vendor_id, v_category_id, 'Tecno Spark 10 Pro', 'tecno-spark-' || substr(md5(random()::text), 1, 6), 'Budget-friendly smartphone with 8GB RAM, 256GB storage, and 50MP camera.', 850.00, 950.00, 50, true);

        RAISE NOTICE 'Inserted Electronics products';
    ELSE
        RAISE NOTICE 'Electronics category not found!';
    END IF;

    -- Get Fashion category
    SELECT id INTO v_category_id FROM categories
    WHERE slug IN ('fashion', 'Fashion')
    OR LOWER(name) = 'fashion'
    LIMIT 1;

    IF v_category_id IS NOT NULL THEN
        INSERT INTO products (vendor_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, is_active)
        VALUES
        (v_vendor_id, v_category_id, 'African Print Shirt - Men', 'african-print-shirt-' || substr(md5(random()::text), 1, 6), 'Stylish African print shirt made from premium Ankara fabric. Perfect for casual and semi-formal occasions.', 180.00, 220.00, 35, true),
        (v_vendor_id, v_category_id, 'Kente Cloth Dress', 'kente-cloth-dress-' || substr(md5(random()::text), 1, 6), 'Beautiful handwoven Kente cloth dress. Authentic Ghanaian craftsmanship.', 450.00, 550.00, 15, true),
        (v_vendor_id, v_category_id, 'Men Leather Loafers', 'mens-leather-loafers-' || substr(md5(random()::text), 1, 6), 'Genuine leather loafers, comfortable and stylish. Available in brown and black.', 320.00, 380.00, 25, true),
        (v_vendor_id, v_category_id, 'Women Ankara Handbag', 'womens-ankara-handbag-' || substr(md5(random()::text), 1, 6), 'Handcrafted Ankara fabric handbag with leather straps. Unique African design.', 150.00, 180.00, 30, true),
        (v_vendor_id, v_category_id, 'Adidas Running Shoes', 'adidas-running-shoes-' || substr(md5(random()::text), 1, 6), 'Lightweight running shoes with responsive cushioning. Breathable mesh upper.', 550.00, 650.00, 20, true),
        (v_vendor_id, v_category_id, 'Traditional Smock Northern', 'traditional-smock-' || substr(md5(random()::text), 1, 6), 'Authentic Northern Ghana smock (Fugu). Hand-woven with traditional patterns.', 280.00, 350.00, 18, true),
        (v_vendor_id, v_category_id, 'Women Maxi Dress', 'womens-maxi-dress-' || substr(md5(random()::text), 1, 6), 'Elegant flowing maxi dress perfect for any occasion. Comfortable fit.', 200.00, 250.00, 22, true),
        (v_vendor_id, v_category_id, 'Men Polo Shirt Set', 'mens-polo-shirt-' || substr(md5(random()::text), 1, 6), 'Pack of 3 premium cotton polo shirts. Classic fit in assorted colors.', 220.00, 280.00, 40, true);

        RAISE NOTICE 'Inserted Fashion products';
    END IF;

    -- Get Home & Garden category
    SELECT id INTO v_category_id FROM categories
    WHERE slug IN ('home-garden', 'home-and-garden', 'home')
    OR LOWER(name) LIKE '%home%'
    LIMIT 1;

    IF v_category_id IS NOT NULL THEN
        INSERT INTO products (vendor_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, is_active)
        VALUES
        (v_vendor_id, v_category_id, 'Rattan Living Room Set', 'rattan-living-room-' || substr(md5(random()::text), 1, 6), '5-piece rattan furniture set including sofa, 2 chairs, and 2 side tables. Ghanaian craftsmanship.', 3500.00, 4200.00, 5, true),
        (v_vendor_id, v_category_id, 'African Wall Art Canvas', 'african-wall-art-' || substr(md5(random()::text), 1, 6), 'Beautiful African-themed canvas prints. Set of 3 pieces. Perfect home decoration.', 280.00, 350.00, 25, true),
        (v_vendor_id, v_category_id, 'Kente Print Throw Pillows', 'kente-print-pillows-' || substr(md5(random()::text), 1, 6), 'Set of 4 decorative throw pillows with Kente patterns. Brighten your living space.', 180.00, 220.00, 30, true),
        (v_vendor_id, v_category_id, 'Bolga Basket Large', 'bolga-basket-' || substr(md5(random()::text), 1, 6), 'Handwoven Bolga basket from Northern Ghana. Perfect for storage or decoration.', 120.00, 150.00, 45, true),
        (v_vendor_id, v_category_id, 'LED Ceiling Fan with Light', 'led-ceiling-fan-' || substr(md5(random()::text), 1, 6), 'Modern ceiling fan with integrated LED light. Remote controlled, energy efficient.', 650.00, 780.00, 12, true),
        (v_vendor_id, v_category_id, 'Ceramic Dinner Set 24pc', 'ceramic-dinner-set-' || substr(md5(random()::text), 1, 6), 'Complete dinner set for 6. Includes plates, bowls, cups, and saucers.', 420.00, 500.00, 18, true);

        RAISE NOTICE 'Inserted Home & Garden products';
    END IF;

    -- Get Health & Beauty category
    SELECT id INTO v_category_id FROM categories
    WHERE slug IN ('health-beauty', 'health-and-beauty', 'beauty')
    OR LOWER(name) LIKE '%health%' OR LOWER(name) LIKE '%beauty%'
    LIMIT 1;

    IF v_category_id IS NOT NULL THEN
        INSERT INTO products (vendor_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, is_active)
        VALUES
        (v_vendor_id, v_category_id, 'Shea Butter Pure Organic', 'shea-butter-' || substr(md5(random()::text), 1, 6), '500g of 100% pure organic shea butter from Northern Ghana. Natural moisturizer.', 65.00, 80.00, 100, true),
        (v_vendor_id, v_category_id, 'African Black Soap Set', 'african-black-soap-' || substr(md5(random()::text), 1, 6), 'Traditional African black soap, pack of 3. Natural ingredients for healthy skin.', 45.00, 55.00, 80, true),
        (v_vendor_id, v_category_id, 'Natural Hair Care Bundle', 'natural-hair-care-' || substr(md5(random()::text), 1, 6), 'Complete natural hair care set: shampoo, conditioner, and hair oil. For all hair types.', 180.00, 220.00, 35, true),
        (v_vendor_id, v_category_id, 'Aloe Vera Gel 500ml', 'aloe-vera-gel-' || substr(md5(random()::text), 1, 6), 'Pure aloe vera gel for skin and hair. Soothing and hydrating.', 55.00, 70.00, 60, true),
        (v_vendor_id, v_category_id, 'Coconut Oil Virgin Cold Pressed', 'coconut-oil-' || substr(md5(random()::text), 1, 6), '1 Liter of pure virgin coconut oil. Multi-purpose for cooking, skin, and hair.', 85.00, 100.00, 70, true),
        (v_vendor_id, v_category_id, 'Herbal Tea Collection', 'herbal-tea-' || substr(md5(random()::text), 1, 6), 'Assorted Ghanaian herbal teas. Includes moringa, hibiscus, and ginger teas.', 75.00, 90.00, 50, true);

        RAISE NOTICE 'Inserted Health & Beauty products';
    END IF;

    -- Get Sports & Fitness category
    SELECT id INTO v_category_id FROM categories
    WHERE slug IN ('sports-fitness', 'sports-and-fitness', 'sports')
    OR LOWER(name) LIKE '%sports%' OR LOWER(name) LIKE '%fitness%'
    LIMIT 1;

    IF v_category_id IS NOT NULL THEN
        INSERT INTO products (vendor_id, category_id, name, slug, description, price, compare_at_price, stock_quantity, is_active)
        VALUES
        (v_vendor_id, v_category_id, 'Home Gym Dumbbell Set', 'home-gym-dumbbell-' || substr(md5(random()::text), 1, 6), 'Adjustable dumbbell set (5-25kg). Perfect for home workouts. Includes storage rack.', 850.00, 1000.00, 15, true),
        (v_vendor_id, v_category_id, 'Yoga Mat Premium', 'yoga-mat-' || substr(md5(random()::text), 1, 6), 'Non-slip yoga mat with carrying strap. 6mm thick for comfort.', 120.00, 150.00, 40, true),
        (v_vendor_id, v_category_id, 'Football Professional', 'football-pro-' || substr(md5(random()::text), 1, 6), 'FIFA-approved match ball. Durable and perfect for all playing surfaces.', 180.00, 220.00, 30, true),
        (v_vendor_id, v_category_id, 'Resistance Bands Set', 'resistance-bands-' || substr(md5(random()::text), 1, 6), 'Set of 5 resistance bands with different strengths. Ideal for home training.', 95.00, 120.00, 55, true),
        (v_vendor_id, v_category_id, 'Running Armband Phone Holder', 'running-armband-' || substr(md5(random()::text), 1, 6), 'Adjustable armband for smartphones. Sweat-proof and secure fit.', 45.00, 60.00, 70, true),
        (v_vendor_id, v_category_id, 'Jump Rope Speed', 'jump-rope-' || substr(md5(random()::text), 1, 6), 'Professional speed jump rope with ball bearings. Great for cardio.', 55.00, 70.00, 50, true);

        RAISE NOTICE 'Inserted Sports & Fitness products';
    END IF;

    RAISE NOTICE 'Products seeded successfully!';
END $$;

-- Verify products were inserted
SELECT COUNT(*) as total_products FROM products;
