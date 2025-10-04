/**
 * 📊 Analytics Tracking API
 * POST /api/analytics/track
 * Accepts batches of analytics events from the frontend and persists them to D1.
 */

export async function onRequestPost(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const body = await request.json();
        const events = body?.events;

        if (!Array.isArray(events) || events.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid events payload'
            }), { status: 400, headers: corsHeaders });
        }

        const ip = request.headers.get('CF-Connecting-IP') ||
            (request.headers.get('X-Forwarded-For') || '').split(',')[0] ||
            'unknown';
        const userAgent = request.headers.get('User-Agent') || 'unknown';

        let successCount = 0;
        const errors = [];

        for (const rawEvent of events) {
            try {
                const eventType = rawEvent?.type || rawEvent?.event_type || 'unknown';
                const eventPath = rawEvent?.path || rawEvent?.page_url || null;
                const sessionId = rawEvent?.session_id || rawEvent?.sessionId || body?.sessionId || null;
                const userId = rawEvent?.user_id || rawEvent?.userId || null;

                const serializedEvent = JSON.stringify(rawEvent?.data ?? rawEvent ?? {});

                await env.DB.prepare(`
                    INSERT INTO analytics_events (event_type, event_data, user_id, session_id, ip_address, user_agent, path)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    eventType,
                    serializedEvent,
                    userId,
                    sessionId,
                    ip,
                    userAgent,
                    eventPath
                ).run();

                successCount++;
            } catch (insertError) {
                console.error('❌ Analytics insert failure:', insertError);
                errors.push({
                    type: rawEvent?.type || rawEvent?.event_type,
                    message: insertError.message
                });
            }
        }

        const responsePayload = {
            success: errors.length === 0,
            tracked: successCount,
            failed: errors.length,
            timestamp: new Date().toISOString()
        };

        if (errors.length > 0) {
            responsePayload.errors = errors.slice(0, 3);
        }

        return new Response(JSON.stringify(responsePayload), {
            status: errors.length === 0 ? 200 : 207,
            headers: corsHeaders
        });
    } catch (error) {
        console.error('❌ Analytics tracking error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to track analytics'
        }), { status: 500, headers: corsHeaders });
    }
}
