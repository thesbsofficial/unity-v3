// API: Admin manage reservations (approve/reject)

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const db = env.DB;

        // GET: List all pending reservations
        if (request.method === 'GET') {
            const reservations = await db.prepare(`
                SELECT 
                    r.*,
                    p.title as product_title,
                    p.brand as product_brand,
                    p.price as product_price,
                    p.image_url as product_image,
                    p.status as product_status
                FROM product_reservations r
                LEFT JOIN products p ON r.product_id = p.id
                WHERE r.status = 'pending'
                ORDER BY r.created_at DESC
            `).all();

            return new Response(JSON.stringify({
                success: true,
                reservations: reservations.results || []
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // POST: Update reservation status
        if (request.method === 'POST') {
            const { reservation_id, action, admin_notes } = await request.json();

            if (!reservation_id || !action) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'reservation_id and action required'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const validActions = ['confirm', 'cancel'];
            if (!validActions.includes(action)) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid action. Use: confirm or cancel'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled';

            // Update reservation
            await db.prepare(`
                UPDATE product_reservations
                SET status = ?,
                    admin_notes = ?,
                    reviewed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(newStatus, admin_notes || null, reservation_id).run();

            // Get updated reservation with product info
            const reservation = await db.prepare(`
                SELECT 
                    r.*,
                    p.title as product_title,
                    p.status as product_status
                FROM product_reservations r
                LEFT JOIN products p ON r.product_id = p.id
                WHERE r.id = ?
            `).bind(reservation_id).first();

            return new Response(JSON.stringify({
                success: true,
                message: `Reservation ${action}ed successfully`,
                reservation
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: false,
            error: 'Method not allowed'
        }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Admin reservations error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to manage reservations'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
