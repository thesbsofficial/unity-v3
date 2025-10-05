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
            // Get highest offer for specific product
            const result = await db.prepare(`
                SELECT MAX(offer_amount) as highest_offer, COUNT(*) as offer_count
                FROM customer_offers
                WHERE product_id = ? AND status IN ('pending', 'countered')
            `).bind(productId).first();

            return new Response(JSON.stringify({
                success: true,
                product_id: productId,
                highest_offer: result?.highest_offer || null,
                offer_count: result?.offer_count || 0
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else {
            // Get highest offers for ALL products
            const results = await db.prepare(`
                SELECT 
                    product_id,
                    MAX(offer_amount) as highest_offer,
                    COUNT(*) as offer_count
                FROM customer_offers
                WHERE status IN ('pending', 'countered')
                GROUP BY product_id
            `).all();

            const offersMap = {};
            results.results.forEach(row => {
                offersMap[row.product_id] = {
                    highest_offer: row.highest_offer,
                    offer_count: row.offer_count
                };
            });

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
