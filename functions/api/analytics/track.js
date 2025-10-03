/**
 * 📊 Analytics Tracking API
 * POST /api/analytics/track
 * Receives and stores analytics events from frontend
 */

export async function onRequestPost(context) {
    const { request, env } = context;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { events } = await request.json();

        if (!events || !Array.isArray(events) || events.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid events data'
            }), {
                status: 400,
                headers: corsHeaders
            });
        }

        console.log(`📊 Tracking ${events.length} events`);

        // Insert all events into database
        const insertPromises = events.map(event => {
            return env.DB.prepare(`
                INSERT INTO analytics_events 
                (event_type, event_category, session_id, user_id, product_id, 
                 category, brand, page_url, referrer, metadata, value, quantity, 
                 user_agent, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                event.event_type,
                event.event_category || null,
                event.session_id,
                event.user_id || null,
                event.product_id || null,
                event.category || null,
                event.brand || null,
                event.page_url || null,
                event.referrer || null,
                JSON.stringify(event), // Store full event as JSON in metadata
                event.value || 0,
                event.quantity || 1,
                event.user_agent || null,
                event.timestamp || new Date().toISOString()
            ).run();
        });

        // Execute all inserts
        await Promise.all(insertPromises);

        return new Response(JSON.stringify({
            success: true,
            tracked: events.length,
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: corsHeaders
        });

    } catch (error) {
        console.error('❌ Analytics tracking error:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
