// API: Get all customers with aggregated data from orders + offers

export async function onRequestGet(context) {
    const { request, env } = context;

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

        // Get all customers from orders (JOIN with users table)
        const ordersCustomers = await db.prepare(`
            SELECT 
                COALESCE(u.first_name || ' ' || u.last_name, u.instagram_handle, u.snapchat_handle, 'Customer #' || u.id) as customer_name,
                u.email as customer_email,
                COALESCE(o.delivery_phone, u.phone) as customer_phone,
                COUNT(*) as order_count,
                SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                SUM(o.total_amount) as total_spent,
                MAX(o.created_at) as last_order_date,
                MIN(o.created_at) as first_order_date
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE u.email IS NOT NULL OR o.delivery_phone IS NOT NULL
            GROUP BY u.id
            ORDER BY last_order_date DESC
        `).all();

        // Get all customers from offers
        const offersCustomers = await db.prepare(`
            SELECT 
                customer_name,
                customer_contact,
                COUNT(*) as offer_count,
                SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_offers,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_offers,
                MAX(offer_amount) as highest_offer,
                MAX(created_at) as last_offer_date,
                MIN(created_at) as first_offer_date
            FROM customer_offers
            WHERE customer_contact IS NOT NULL
            GROUP BY customer_contact
            ORDER BY last_offer_date DESC
        `).all();

        // Merge customers by contact info
        const customersMap = new Map();

        // Process orders customers
        ordersCustomers.results.forEach(customer => {
            const contactKey = customer.customer_email || customer.customer_phone;
            if (!contactKey) return;

            customersMap.set(contactKey, {
                name: customer.customer_name,
                email: customer.customer_email,
                phone: customer.customer_phone,
                contact: contactKey,
                order_count: customer.order_count,
                completed_orders: customer.completed_orders,
                total_spent: customer.total_spent || 0,
                offer_count: 0,
                accepted_offers: 0,
                pending_offers: 0,
                highest_offer: 0,
                last_activity: customer.last_order_date,
                first_activity: customer.first_order_date,
                last_order_date: customer.last_order_date,
                first_order_date: customer.first_order_date,
                last_offer_date: null,
                first_offer_date: null
            });
        });

        // Merge offers customers
        offersCustomers.results.forEach(customer => {
            const contactKey = customer.customer_contact;
            if (!contactKey) return;

            if (customersMap.has(contactKey)) {
                // Merge with existing customer
                const existing = customersMap.get(contactKey);
                existing.offer_count = customer.offer_count;
                existing.accepted_offers = customer.accepted_offers;
                existing.pending_offers = customer.pending_offers;
                existing.highest_offer = customer.highest_offer || 0;
                existing.last_offer_date = customer.last_offer_date;
                existing.first_offer_date = customer.first_offer_date;
                
                // Update last activity if offer is more recent
                if (customer.last_offer_date > existing.last_activity) {
                    existing.last_activity = customer.last_offer_date;
                }
                // Update first activity if offer is older
                if (customer.first_offer_date < existing.first_activity) {
                    existing.first_activity = customer.first_offer_date;
                }
            } else {
                // New customer from offers only
                customersMap.set(contactKey, {
                    name: customer.customer_name,
                    email: contactKey.includes('@') ? contactKey : null,
                    phone: !contactKey.includes('@') ? contactKey : null,
                    contact: contactKey,
                    order_count: 0,
                    completed_orders: 0,
                    total_spent: 0,
                    offer_count: customer.offer_count,
                    accepted_offers: customer.accepted_offers,
                    pending_offers: customer.pending_offers,
                    highest_offer: customer.highest_offer || 0,
                    last_activity: customer.last_offer_date,
                    first_activity: customer.first_offer_date,
                    last_order_date: null,
                    first_order_date: null,
                    last_offer_date: customer.last_offer_date,
                    first_offer_date: customer.first_offer_date
                });
            }
        });

        // Convert map to array and sort by last activity
        const customers = Array.from(customersMap.values())
            .sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));

        return new Response(JSON.stringify({
            success: true,
            customers: customers,
            total: customers.length,
            stats: {
                total_customers: customers.length,
                customers_with_orders: customers.filter(c => c.order_count > 0).length,
                customers_with_offers: customers.filter(c => c.offer_count > 0).length,
                total_orders: customers.reduce((sum, c) => sum + c.order_count, 0),
                total_offers: customers.reduce((sum, c) => sum + c.offer_count, 0),
                pending_offers: customers.reduce((sum, c) => sum + c.pending_offers, 0)
            }
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Get customers error:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch customers',
            details: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
