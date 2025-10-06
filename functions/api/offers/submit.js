// API: Submit customer offer for products without prices

export async function onRequestPost(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Require customer authentication - check for session cookie
        const cookie = request.headers.get('Cookie') || '';
        const sessionId = cookie.split('sbs_session=')[1]?.split(';')[0];

        if (!sessionId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Authentication required',
                message: 'Please log in to make an offer',
                requiresLogin: true
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Hash the session token to match database format
        const encoder = new TextEncoder();
        const data = encoder.encode(sessionId);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hashBuffer);
        const sessionHash = btoa(String.fromCharCode(...hashArray));

        // Verify session exists and is valid
        const sessionResult = await env.DB.prepare(
            'SELECT user_id, expires_at FROM sessions WHERE token = ? AND invalidated_at IS NULL'
        ).bind(sessionHash).first();

        if (!sessionResult) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Session expired',
                message: 'Please log in again to make an offer',
                requiresLogin: true
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Check if session expired
        const now = new Date().toISOString();
        if (sessionResult.expires_at < now) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Session expired',
                message: 'Please log in again to make an offer',
                requiresLogin: true
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const {
            product_id,
            product_category,
            product_size,
            product_image,
            offer_amount,
            customer_name,
            customer_contact,
            timestamp
        } = await request.json();

        // Validation
        if (!product_id || !offer_amount || !customer_name || !customer_contact) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing required fields'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (parseFloat(offer_amount) <= 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid offer amount'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const db = env.DB;
        const userId = sessionResult.user_id;

        // Check bidding limits by category
        const bidLimits = {
            'PO-CLOTHES': { min: 50, max: 180 },
            'BN-CLOTHES': { min: 80, max: 250 },
            'BN-SHOES': { min: 70, max: 250 },
            'PO-SHOES': { min: 20, max: 180 }
        };

        const limits = bidLimits[product_category];
        if (limits) {
            if (parseFloat(offer_amount) < limits.min) {
                return new Response(JSON.stringify({
                    success: false,
                    error: `Minimum bid for ${product_category} is €${limits.min}`
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            if (parseFloat(offer_amount) > limits.max) {
                return new Response(JSON.stringify({
                    success: false,
                    error: `Maximum bid for ${product_category} is €${limits.max}`
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // Check time-based restriction: 1 bid per 5 minutes per item per user
        const recentOffer = await db.prepare(`
            SELECT created_at, last_offer_at
            FROM customer_offers
            WHERE user_id = ? AND product_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        `).bind(userId, product_id).first();

        if (recentOffer) {
            const lastOfferTime = new Date(recentOffer.last_offer_at || recentOffer.created_at);
            const timeSinceLastOffer = Date.now() - lastOfferTime.getTime();
            const fiveMinutesInMs = 5 * 60 * 1000;

            if (timeSinceLastOffer < fiveMinutesInMs) {
                const minutesRemaining = Math.ceil((fiveMinutesInMs - timeSinceLastOffer) / 60000);
                return new Response(JSON.stringify({
                    success: false,
                    error: `Please wait ${minutesRemaining} more minute${minutesRemaining > 1 ? 's' : ''} before bidding on this item again`
                }), {
                    status: 429,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // Generate unique offer ID
        const offerId = `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Insert offer into database with user_id
        const result = await db.prepare(`
            INSERT INTO customer_offers (
                offer_id,
                product_id,
                product_category,
                product_size,
                product_image,
                offer_amount,
                customer_name,
                customer_contact,
                user_id,
                status,
                created_at,
                last_offer_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `).bind(
            offerId,
            product_id,
            product_category,
            product_size,
            product_image,
            parseFloat(offer_amount),
            customer_name,
            customer_contact,
            userId,
            timestamp || new Date().toISOString(),
            new Date().toISOString()
        ).run();

        // Check if insert was successful
        if (!result.success) {
            throw new Error('Failed to insert offer into database');
        }

        // Log to system logs
        await db.prepare(`
            INSERT INTO system_logs (level, category, message, created_at)
            VALUES ('info', 'offer', ?, datetime('now'))
        `).bind(
            `New offer: €${offer_amount} for ${product_category} (${product_size}) from ${customer_name}`
        ).run();

        console.log(`✅ Offer submitted: ${offerId} - €${offer_amount} for product ${product_id}`);

        return new Response(JSON.stringify({
            success: true,
            offer_id: offerId,
            message: 'Offer submitted successfully'
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Offer submission error:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to submit offer',
            details: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
