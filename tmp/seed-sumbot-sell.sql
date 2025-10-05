-- Seed a sell submission for sumbot (user_id=6)
INSERT INTO sell_submissions (
  batch_id,
  user_id,
  contact_name,
  contact_phone,
  contact_email,
  items_json,
  item_count,
  status,
  seller_price,
  seller_message,
  created_at,
  updated_at
) VALUES (
  'SELL-' || strftime('%Y%m%d%H%M%S', 'now'),
  16,
  'Sum Bot',
  '+353899999999',
  'sumbot@example.com',
  '[{"category":"Sneakers","brand":"Nike","model":"Air Max 90","size":"UK 10","condition":"Good","notes":"Some wear on soles"}]',
  1,
  'pending',
  120.00,
  'Looking to sell this pair quickly',
  datetime('now'),
  datetime('now')
);
