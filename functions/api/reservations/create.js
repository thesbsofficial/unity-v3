// API: Create product reservations during checkout

export async function onRequestPost(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { items, customer, order_number } = await request.json();

        if (!items || !Array.isArray(items) || items.length === 0) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'No items to reserve' 
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!customer || !customer.name || !customer.phone) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Customer information required' 
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const db = env.DB;

        // Create reservations for each item (24 hour expiry)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const reservations = [];

        for (const item of items) {
            // Check if product exists and is available
            const product = await db.prepare(`
                SELECT id, title, status 
                FROM products 
                WHERE id = ?
            `).bind(item.id).first();

            if (!product) {
                console.warn(`Product ${item.id} not found`);
                continue;
            }

            if (product.status !== 'available') {
                console.warn(`Product ${item.id} (${product.title}) is ${product.status}`);
                continue;
            }

            // Create reservation
            const result = await db.prepare(`
                INSERT INTO product_reservations (
                    product_id,
                    order_number,
                    customer_name,
                    customer_phone,
                    customer_email,
                    expires_at,
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
            `).bind(
                item.id,
                order_number,
                customer.name,
                customer.phone,
                customer.email || null,
                expiresAt
            ).run();

            reservations.push({
                product_id: item.id,
                product_title: product.title,
                reservation_id: result.meta.last_row_id
            });
        }

        if (reservations.length === 0) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'No products could be reserved (already reserved or sold)' 
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: `${reservations.length} item(s) reserved successfully`,
            reservations,
            expires_at: expiresAt
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Reservation error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to create reservations'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
