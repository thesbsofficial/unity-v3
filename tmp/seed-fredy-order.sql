-- Create a real buy order for Fredy with proper product images
-- This is a CUSTOMER BUYING FROM SBS (not selling to SBS)
-- Using production schema and REAL Cloudflare image

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
  'ORD-FREDY01',
  16,
  'pending',
  149.99,
  '[
    {
      "name": "Nike Dunk Low Retro",
      "product_name": "Nike Dunk Low Retro",
      "product_category": "Sneakers",
      "product_brand": "Nike",
      "product_size": "UK 9",
      "sku": "DUNK-LOW-01",
      "quantity": 1,
      "price": 149.99,
      "image_url": "https://imagedelivery.net/7B8CAeDtA5h1f1Dyh_X-hg/C45643B7-44DF-42CB-860D-F4AB0EE17E49.jpeg/public"
    }
  ]',
  'delivery',
  '42 Sneaker Street',
  'Dublin',
  'D02 XY12'
  '+353899999999',
  datetime('now'),
  datetime('now')
);
