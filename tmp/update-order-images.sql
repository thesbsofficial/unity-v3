-- Add image URLs to test order items
UPDATE orders 
SET items_json = '[{"name":"Test Sneaker White","sku":"TEST-SNK-WHT-42","quantity":1,"price":75.00,"image_url":"https://imagedelivery.net/625959b904a63f24f6bb7ec9b8c1ed7c/example-white/w=360,h=640"},{"name":"Test Sneaker Black","sku":"TEST-SNK-BLK-43","quantity":1,"price":75.00,"image_url":"https://imagedelivery.net/625959b904a63f24f6bb7ec9b8c1ed7c/example-black/w=360,h=640"}]'
WHERE order_number = 'ORD-SUMBOT01';
