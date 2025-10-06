// API: Get highest offer for a product or all products

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const productId = url.searchParams.get('product_id');

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const db = env.DB;

        if (productId) {
            // Get highest offer for specific product with bidding username
            const result = await db.prepare(`
                SELECT 
                    co.offer_amount as highest_offer,
                    u.bidding_username
                FROM customer_offers co
                LEFT JOIN users u ON co.user_id = u.id
                WHERE co.product_id = ? AND co.status IN ('pending', 'countered')
                ORDER BY co.offer_amount DESC
                LIMIT 1
            `).bind(productId).first();

            // Get count separately
            const countResult = await db.prepare(`
                SELECT COUNT(*) as count
                FROM customer_offers
                WHERE product_id = ? AND status IN ('pending', 'countered')
            `).bind(productId).first();

            return new Response(JSON.stringify({
                success: true,
                product_id: productId,
                highest_offer: result?.highest_offer || null,
                bidding_username: result?.bidding_username || null,
                offer_count: countResult?.count || 0
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else {
            // Get highest offers for ALL products with bidding usernames
            const results = await db.prepare(`
                SELECT 
                    co.product_id,
                    MAX(co.offer_amount) as highest_offer,
                    COUNT(*) as offer_count
                FROM customer_offers co
                WHERE co.status IN ('pending', 'countered')
                GROUP BY co.product_id
            `).all();

            const offersMap = {};
            
            // For each product, get the bidding username of the highest bidder
            for (const row of results.results) {
                const highestBidder = await db.prepare(`
                    SELECT u.bidding_username
                    FROM customer_offers co
                    LEFT JOIN users u ON co.user_id = u.id
                    WHERE co.product_id = ? 
                    AND co.status IN ('pending', 'countered')
                    AND co.offer_amount = ?
                    LIMIT 1
                `).bind(row.product_id, row.highest_offer).first();
                
                offersMap[row.product_id] = {
                    highest_offer: row.highest_offer,
                    bidding_username: highestBidder?.bidding_username || null,
                    offer_count: row.offer_count
                };
            }

            return new Response(JSON.stringify({
                success: true,
                offers: offersMap
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('❌ Get offers error:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch offers',
            details: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
