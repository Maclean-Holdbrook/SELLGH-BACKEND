-- =====================================================
-- Remove Seeded Sample Products
-- Run this in Supabase SQL Editor before uploading real products
-- =====================================================

BEGIN;

WITH seeded_names AS (
  SELECT unnest(ARRAY[
    'Samsung Galaxy A54 5G',
    'iPhone 14 Pro Max',
    'HP Pavilion Laptop 15',
    'Sony WH-1000XM5 Headphones',
    'LG 55" 4K Smart TV',
    'JBL Flip 6 Bluetooth Speaker',
    'JBL Flip 6 Speaker',
    'Apple AirPods Pro 2nd Gen',
    'Apple AirPods Pro 2',
    'Tecno Spark 10 Pro',
    'African Print Shirt - Men',
    'Kente Cloth Dress',
    'Men''s Leather Loafers',
    'Men Leather Loafers',
    'Women''s Ankara Handbag',
    'Women Ankara Handbag',
    'Adidas Running Shoes',
    'Traditional Smock - Northern',
    'Traditional Smock Northern',
    'Women''s Maxi Dress',
    'Women Maxi Dress',
    'Men''s Polo Shirt Set',
    'Men Polo Shirt Set',
    'Rattan Living Room Set',
    'African Wall Art Canvas',
    'Kente Print Throw Pillows',
    'Bolga Basket - Large',
    'Bolga Basket Large',
    'LED Ceiling Fan with Light',
    'Ceramic Dinner Set - 24pc',
    'Ceramic Dinner Set 24pc',
    'Shea Butter - Pure Organic',
    'Shea Butter Pure Organic',
    'African Black Soap Set',
    'Natural Hair Care Bundle',
    'Aloe Vera Gel - 500ml',
    'Aloe Vera Gel 500ml',
    'Coconut Oil - Virgin Cold Pressed',
    'Coconut Oil Virgin Cold Pressed',
    'Herbal Tea Collection',
    'Home Gym Dumbbell Set',
    'Yoga Mat Premium',
    'Football - Professional',
    'Football Professional',
    'Resistance Bands Set',
    'Running Armband Phone Holder',
    'Jump Rope - Speed',
    'Jump Rope Speed'
  ]) AS name
),
seeded_products AS (
  SELECT p.id
  FROM products p
  JOIN seeded_names s ON LOWER(p.name) = LOWER(s.name)
)
DELETE FROM product_images
WHERE product_id IN (SELECT id FROM seeded_products);

WITH seeded_names AS (
  SELECT unnest(ARRAY[
    'Samsung Galaxy A54 5G',
    'iPhone 14 Pro Max',
    'HP Pavilion Laptop 15',
    'Sony WH-1000XM5 Headphones',
    'LG 55" 4K Smart TV',
    'JBL Flip 6 Bluetooth Speaker',
    'JBL Flip 6 Speaker',
    'Apple AirPods Pro 2nd Gen',
    'Apple AirPods Pro 2',
    'Tecno Spark 10 Pro',
    'African Print Shirt - Men',
    'Kente Cloth Dress',
    'Men''s Leather Loafers',
    'Men Leather Loafers',
    'Women''s Ankara Handbag',
    'Women Ankara Handbag',
    'Adidas Running Shoes',
    'Traditional Smock - Northern',
    'Traditional Smock Northern',
    'Women''s Maxi Dress',
    'Women Maxi Dress',
    'Men''s Polo Shirt Set',
    'Men Polo Shirt Set',
    'Rattan Living Room Set',
    'African Wall Art Canvas',
    'Kente Print Throw Pillows',
    'Bolga Basket - Large',
    'Bolga Basket Large',
    'LED Ceiling Fan with Light',
    'Ceramic Dinner Set - 24pc',
    'Ceramic Dinner Set 24pc',
    'Shea Butter - Pure Organic',
    'Shea Butter Pure Organic',
    'African Black Soap Set',
    'Natural Hair Care Bundle',
    'Aloe Vera Gel - 500ml',
    'Aloe Vera Gel 500ml',
    'Coconut Oil - Virgin Cold Pressed',
    'Coconut Oil Virgin Cold Pressed',
    'Herbal Tea Collection',
    'Home Gym Dumbbell Set',
    'Yoga Mat Premium',
    'Football - Professional',
    'Football Professional',
    'Resistance Bands Set',
    'Running Armband Phone Holder',
    'Jump Rope - Speed',
    'Jump Rope Speed'
  ]) AS name
)
DELETE FROM products
WHERE LOWER(name) IN (SELECT LOWER(name) FROM seeded_names);

COMMIT;

SELECT COUNT(*) AS remaining_products FROM products;
