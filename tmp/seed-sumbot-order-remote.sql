-- Seed a buy order for sumbot (user_id=16 on remote)
INSERT INTO orders (
  order_number,
  user_id,
  status,
  total_amount,
  items_json,
  delivery_method,
  delivery_address,
  delivery_city,
  delivery_eircode,
  delivery_phone,
  created_at,
  updated_at
) VALUES (
  'ORD-SUMBOT01',
  16,
  'pending',
  165.00,
  '[{"name":"Test Sneaker White","sku":"TEST-SNK-WHT-42","quantity":1,"price":75.00},{"name":"Test Sneaker Black","sku":"TEST-SNK-BLK-43","quantity":1,"price":75.00}]',
  'delivery',
  '123 Test Street',
  'Dublin',
  'D01 ABC1',
  '+353899999999',
  datetime('now'),
  datetime('now')
);
