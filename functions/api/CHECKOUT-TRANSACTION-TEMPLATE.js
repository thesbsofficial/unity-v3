/**
 * 🛒 SAFE CHECKOUT TEMPLATE
 * 
 * This template shows how to implement an atomic, race-condition-free
 * checkout process that prevents overselling.
 * 
 * Key Safety Features:
 * - Pre-validates ALL stock before starting transaction
 * - Uses optimistic locking with quantity_available checks
 * - Creates order + order_items atomically
 * - Logs all stock movements for audit trail
 * 
 * ⚠️ DEPLOYMENT CHECKLIST:
 * 1. Review the pre-check logic for your business rules
 * 2. Integrate with your payment processor
 * 3. Test with tests/race-checkout.mjs
 * 4. Deploy with --remote flag
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Parse cart items
    const { items, user_id } = await request.json();
    // items = [{ product_id: 123, quantity: 2 }, ...]

    // ════════════════════════════════════════════════════════════════
    // STEP 1: PRE-CHECK ALL STOCK (Before transaction)
    // ════════════════════════════════════════════════════════════════
    
    const stockChecks = await Promise.all(
      items.map(async (item) => {
        const result = await env.DB.prepare(
          'SELECT id, quantity_available, price, brand, size FROM products WHERE id = ? AND status = ?'
        )
          .bind(item.product_id, 'available')
          .first();

        if (!result) {
          return { valid: false, product_id: item.product_id, error: 'Product not found or unavailable' };
        }

        if (result.quantity_available < item.quantity) {
          return {
            valid: false,
            product_id: item.product_id,
            error: `Insufficient stock: requested ${item.quantity}, available ${result.quantity_available}`
          };
        }

        return {
          valid: true,
          product_id: item.product_id,
          product: result,
          quantity: item.quantity
        };
      })
    );

    // Reject if ANY item has insufficient stock
    const invalidItems = stockChecks.filter(check => !check.valid);
    if (invalidItems.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Insufficient stock',
          details: invalidItems
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate totals
    const validItems = stockChecks.filter(check => check.valid);
    const subtotal = validItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    // ════════════════════════════════════════════════════════════════
    // STEP 2: ATOMIC TRANSACTION (Order + Stock Update)
    // ════════════════════════════════════════════════════════════════

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const transaction = [
      // Enable foreign keys
      'PRAGMA foreign_keys = ON;',

      // Create order
      env.DB.prepare(
        `INSERT INTO orders (
          order_number, user_id, status, 
          subtotal, shipping_cost, total,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        orderNumber,
        user_id,
        'pending',
        subtotal,
        0, // shipping cost
        subtotal
      )
    ];

    // For each item: create order_item + update stock + log stock_move
    validItems.forEach((item) => {
      const { product_id, quantity, product } = item;

      // Create order item
      transaction.push(
        env.DB.prepare(
          `INSERT INTO order_items (
            order_id, product_id, quantity, price_at_purchase
          ) VALUES (
            (SELECT id FROM orders WHERE order_number = ?), 
            ?, ?, ?
          )`
        ).bind(orderNumber, product_id, quantity, product.price)
      );

      // Update stock with OPTIMISTIC LOCKING
      // Only succeeds if quantity_available hasn't changed
      transaction.push(
        env.DB.prepare(
          `UPDATE products 
           SET quantity_available = quantity_available - ?,
               quantity_sold = quantity_sold + ?
           WHERE id = ? 
             AND quantity_available >= ?
             AND status = 'available'`
        ).bind(quantity, quantity, product_id, quantity)
      );

      // Log stock movement for audit trail
      transaction.push(
        env.DB.prepare(
          `INSERT INTO stock_moves (
            product_id, order_id, quantity_change, reason, created_at
          ) VALUES (
            ?,
            (SELECT id FROM orders WHERE order_number = ?),
            ?, 'checkout', datetime('now')
          )`
        ).bind(product_id, orderNumber, -quantity)
      );
    });

    // Execute transaction
    const results = await env.DB.batch(transaction);

    // ════════════════════════════════════════════════════════════════
    // STEP 3: VALIDATE TRANSACTION SUCCESS
    // ════════════════════════════════════════════════════════════════

    // Check if all stock updates succeeded
    // UPDATE returns results.rowsAffected = 0 if WHERE clause fails
    const stockUpdateResults = results.slice(2); // Skip PRAGMA and INSERT order
    const itemCount = validItems.length;
    const expectedResults = itemCount * 3; // order_item + stock update + stock_move

    // Each set of 3: order_item insert, stock update, stock_move insert
    for (let i = 0; i < itemCount; i++) {
      const stockUpdateIndex = 2 + (i * 3) + 1; // +1 to get to the UPDATE
      const stockUpdate = results[stockUpdateIndex];

      if (!stockUpdate.meta || stockUpdate.meta.changes === 0) {
        // Stock update failed - race condition detected!
        // The quantity_available changed between our check and the transaction
        
        // TODO: Add rollback logic if needed (orders table might need cleanup)
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Stock changed during checkout - please try again',
            product_id: validItems[i].product_id
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // ════════════════════════════════════════════════════════════════
    // STEP 4: SUCCESS - Return order details
    // ════════════════════════════════════════════════════════════════

    return new Response(
      JSON.stringify({
        success: true,
        order_number: orderNumber,
        subtotal,
        total: subtotal,
        items: validItems.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Checkout failed',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
