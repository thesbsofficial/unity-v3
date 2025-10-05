-- Seed a buy order for sumbot (user_id=6)
INSERT INTO orders (
  order_number,
  user_id,
  customer_name,
  customer_phone,
  customer_email,
  items_json,
  status,
  subtotal,
  total,
  delivery_method,
  delivery_address,
  delivery_city,
  delivery_eircode,
  created_at,
  updated_at
) VALUES (
  'ORD-SUMBOT01',
  16,
  'Sum Bot',
  '+353899999999',
  'sumbot@example.com',
  '[{"name":"Test Sneaker White","sku":"TEST-SNK-WHT-42","quantity":1,"price":75.00},{"name":"Test Sneaker Black","sku":"TEST-SNK-BLK-43","quantity":1,"price":75.00}]',
  'pending',
  150.00,
  165.00,
  'delivery',
  '123 Test Street',
  'Dublin',
  'D01 ABC1',
  datetime('now'),
  datetime('now')
);

-- Seed order items for the buy order
INSERT INTO order_items (
  order_id,
  product_name,
  product_brand,
  product_category,
  product_size,
  price,
  quantity,
  created_at
) VALUES (
  (SELECT id FROM orders WHERE order_number = 'ORD-SUMBOT01'),
  'Test Sneaker White',
  'TestBrand',
  'Sneakers',
  'UK 8',
  75.00,
  1,
  datetime('now')
),
(
  (SELECT id FROM orders WHERE order_number = 'ORD-SUMBOT01'),
  'Test Sneaker Black',
  'TestBrand',
  'Sneakers',
  'UK 9',
  75.00,
  1,
  datetime('now')
);
