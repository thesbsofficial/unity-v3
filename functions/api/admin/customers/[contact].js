// API: Get specific customer details with full order and offer history

export async function onRequestGet(context) {
    const { request, env, params } = context;
    const customerContact = params.contact; // Email or phone

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // TODO: Re-enable authentication after testing
        // const authHeader = request.headers.get('Authorization');
        // if (!authHeader || !authHeader.startsWith('Bearer ')) {
        //     return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        //         status: 401,
        //         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        //     });
        // }

        const db = env.DB;

        // Get customer basic info from most recent order or offer
        let customerInfo = {};
        
        const orderInfo = await db.prepare(`
            SELECT customer_name, customer_email, customer_phone
            FROM orders
            WHERE customer_email = ? OR customer_phone = ?
            ORDER BY created_at DESC
            LIMIT 1
        `).bind(customerContact, customerContact).first();

        const offerInfo = await db.prepare(`
            SELECT customer_name, customer_contact
            FROM customer_offers
            WHERE customer_contact = ?
            ORDER BY created_at DESC
            LIMIT 1
        `).bind(customerContact).first();

        customerInfo = {
            name: orderInfo?.customer_name || offerInfo?.customer_name || 'Unknown',
            email: orderInfo?.customer_email || (customerContact.includes('@') ? customerContact : null),
            phone: orderInfo?.customer_phone || (!customerContact.includes('@') ? customerContact : null),
            contact: customerContact
        };

        // Get all orders for this customer
        const orders = await db.prepare(`
            SELECT 
                o.id,
                o.order_id,
                o.order_status,
                o.total_amount,
                o.items_json,
                o.created_at,
                o.updated_at,
                o.collection_notes,
                COUNT(DISTINCT oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.customer_email = ? OR o.customer_phone = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `).bind(customerContact, customerContact).all();

        // Parse items_json for each order
        const ordersWithItems = orders.results.map(order => ({
            ...order,
            items: order.items_json ? JSON.parse(order.items_json) : [],
            items_json: undefined // Remove raw JSON
        }));

        // Get all offers for this customer
        const offers = await db.prepare(`
            SELECT 
                id,
                offer_id,
                product_id,
                product_category,
                product_size,
                product_image,
                offer_amount,
                status,
                counter_offer_amount,
                admin_notes,
                created_at,
                responded_at
            FROM customer_offers
            WHERE customer_contact = ?
            ORDER BY created_at DESC
        `).bind(customerContact).all();

        // Calculate statistics
        const stats = {
            total_orders: orders.results.length,
            completed_orders: orders.results.filter(o => o.order_status === 'completed').length,
            pending_orders: orders.results.filter(o => o.order_status === 'pending').length,
            total_spent: orders.results.reduce((sum, o) => sum + (o.total_amount || 0), 0),
            total_items_ordered: orders.results.reduce((sum, o) => sum + (o.item_count || 0), 0),
            
            total_offers: offers.results.length,
            pending_offers: offers.results.filter(o => o.status === 'pending').length,
            accepted_offers: offers.results.filter(o => o.status === 'accepted').length,
            rejected_offers: offers.results.filter(o => o.status === 'rejected').length,
            countered_offers: offers.results.filter(o => o.status === 'countered').length,
            highest_offer: Math.max(0, ...offers.results.map(o => o.offer_amount)),
            average_offer: offers.results.length > 0 
                ? offers.results.reduce((sum, o) => sum + o.offer_amount, 0) / offers.results.length 
                : 0,
            
            first_activity: null,
            last_activity: null
        };

        // Find first and last activity dates
        const allDates = [
            ...orders.results.map(o => o.created_at),
            ...offers.results.map(o => o.created_at)
        ].filter(Boolean).sort();

        if (allDates.length > 0) {
            stats.first_activity = allDates[0];
            stats.last_activity = allDates[allDates.length - 1];
        }

        return new Response(JSON.stringify({
            success: true,
            customer: customerInfo,
            orders: ordersWithItems,
            offers: offers.results,
            stats: stats
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Get customer details error:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch customer details',
            details: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
