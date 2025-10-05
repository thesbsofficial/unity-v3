-- Seed a sell submission for sumbot (user_id=16 on remote)
INSERT INTO sell_submissions (
  batch_id,
  user_id,
  status,
  items_json,
  item_count,
  contact_phone,
  contact_channel,
  contact_handle,
  contact_email,
  seller_price,
  seller_message,
  notes,
  created_at
) VALUES (
  'SELL-' || strftime('%Y%m%d%H%M%S', 'now'),
  16,
  'pending',
  '[{"category":"Sneakers","brand":"Nike","model":"Air Max 90","size":"UK 10","condition":"Good","notes":"Some wear on soles"}]',
  1,
  '+353899999999',
  'email',
  'sumbot',
  'sumbot@example.com',
  120.00,
  'Looking to sell this pair quickly',
  'Test submission from sumbot account',
  datetime('now')
);
