-- =====================================================
-- Add Images to Seeded Products
-- Run this AFTER seed_products_v2.sql
-- =====================================================

-- Add images for Electronics products
INSERT INTO product_images (product_id, image_url, is_primary)
SELECT p.id,
    CASE
        WHEN p.name LIKE '%Samsung%' THEN 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%iPhone%' THEN 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Laptop%' OR p.name LIKE '%HP%' THEN 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Headphones%' OR p.name LIKE '%Sony%' THEN 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%TV%' OR p.name LIKE '%LG%' THEN 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%JBL%' OR p.name LIKE '%Speaker%' THEN 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%AirPods%' THEN 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Tecno%' THEN 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop'
        ELSE 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&h=500&fit=crop'
    END,
    true
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE LOWER(c.name) LIKE '%electronic%'
AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id);

-- Add images for Fashion products
INSERT INTO product_images (product_id, image_url, is_primary)
SELECT p.id,
    CASE
        WHEN p.name LIKE '%African Print%' OR p.name LIKE '%Ankara%' THEN 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Kente%' THEN 'https://images.unsplash.com/photo-1590735213408-9d2a2c0e4c8e?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Loafers%' OR p.name LIKE '%Shoes%' THEN 'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Handbag%' THEN 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Adidas%' OR p.name LIKE '%Running%' THEN 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Smock%' THEN 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Maxi%' OR p.name LIKE '%Dress%' THEN 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Polo%' THEN 'https://images.unsplash.com/photo-1625910513413-5fc4e5d6d8ef?w=500&h=500&fit=crop'
        ELSE 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&h=500&fit=crop'
    END,
    true
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE LOWER(c.name) LIKE '%fashion%'
AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id);

-- Add images for Home & Garden products
INSERT INTO product_images (product_id, image_url, is_primary)
SELECT p.id,
    CASE
        WHEN p.name LIKE '%Rattan%' OR p.name LIKE '%Living Room%' THEN 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Wall Art%' OR p.name LIKE '%Canvas%' THEN 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Pillow%' THEN 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Basket%' OR p.name LIKE '%Bolga%' THEN 'https://images.unsplash.com/photo-1595231712607-4dca6a84a7e7?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Fan%' OR p.name LIKE '%Ceiling%' THEN 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Dinner%' OR p.name LIKE '%Ceramic%' THEN 'https://images.unsplash.com/photo-1603199506016-b9a694f3719e?w=500&h=500&fit=crop'
        ELSE 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=500&h=500&fit=crop'
    END,
    true
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE LOWER(c.name) LIKE '%home%'
AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id);

-- Add images for Health & Beauty products
INSERT INTO product_images (product_id, image_url, is_primary)
SELECT p.id,
    CASE
        WHEN p.name LIKE '%Shea%' THEN 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Black Soap%' THEN 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Hair Care%' THEN 'https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Aloe%' THEN 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Coconut%' THEN 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Tea%' OR p.name LIKE '%Herbal%' THEN 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&h=500&fit=crop'
        ELSE 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&h=500&fit=crop'
    END,
    true
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE LOWER(c.name) LIKE '%health%' OR LOWER(c.name) LIKE '%beauty%'
AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id);

-- Add images for Sports & Fitness products
INSERT INTO product_images (product_id, image_url, is_primary)
SELECT p.id,
    CASE
        WHEN p.name LIKE '%Dumbbell%' THEN 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Yoga%' THEN 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Football%' THEN 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Resistance%' THEN 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Armband%' THEN 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=500&h=500&fit=crop'
        WHEN p.name LIKE '%Jump Rope%' THEN 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=500&h=500&fit=crop'
        ELSE 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&h=500&fit=crop'
    END,
    true
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE LOWER(c.name) LIKE '%sport%' OR LOWER(c.name) LIKE '%fitness%'
AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id);

-- Add images for any remaining products without images
INSERT INTO product_images (product_id, image_url, is_primary)
SELECT p.id,
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop',
    true
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id);

-- Verify images were added
SELECT COUNT(*) as total_product_images FROM product_images;
