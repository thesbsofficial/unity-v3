/**
 * 📊 Admin Analytics Dashboard API
 * GET /api/admin/analytics
 * Returns formatted analytics data for admin dashboard
 */

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '7d'; // 24h, 7d, 30d, all

    try {
        // Verify admin authorization
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
        }

        const token = authHeader.substring(7);

        // Verify admin session
        const session = await env.DB.prepare(`
            SELECT user_id FROM admin_sessions 
            WHERE token = ? AND datetime(expires_at) > datetime('now')
        `).bind(token).first();

        if (!session) {
            return jsonResponse({ success: false, error: 'Invalid session' }, 401);
        }

        console.log(`📊 Fetching analytics for period: ${period}`);

        // Calculate date range
        const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 365;

        // ═══════════════════════════════════════════════════════════════
        // GET DAILY SUMMARIES
        // ═══════════════════════════════════════════════════════════════
        
        const summaries = await env.DB.prepare(`
            SELECT * FROM analytics_daily_summary
            WHERE date >= date('now', '-${days} days')
            ORDER BY date DESC
        `).all();

        // ═══════════════════════════════════════════════════════════════
        // GET CURRENT PERIOD TOTALS
        // ═══════════════════════════════════════════════════════════════
        
        const totals = await env.DB.prepare(`
            SELECT 
                SUM(unique_visitors) as total_visitors,
                SUM(page_views) as total_page_views,
                SUM(orders_completed) as total_orders,
                SUM(revenue) as total_revenue,
                AVG(conversion_rate) as avg_conversion_rate,
                AVG(avg_order_value) as avg_order_value
            FROM analytics_daily_summary
            WHERE date >= date('now', '-${days} days')
        `).first();

        // ═══════════════════════════════════════════════════════════════
        // GET TOP PRODUCTS
        // ═══════════════════════════════════════════════════════════════
        
        const topProducts = await env.DB.prepare(`
            SELECT 
                product_id,
                product_name,
                category,
                brand,
                SUM(views) as total_views,
                SUM(cart_adds) as total_cart_adds,
                SUM(purchases) as total_purchases,
                SUM(revenue) as total_revenue,
                AVG(overall_conversion_rate) as avg_conversion_rate
            FROM analytics_product_performance
            WHERE date >= date('now', '-${days} days')
            GROUP BY product_id
            ORDER BY total_revenue DESC
            LIMIT 10
        `).all();

        // ═══════════════════════════════════════════════════════════════
        // GET TOP SEARCHES
        // ═══════════════════════════════════════════════════════════════
        
        const topSearches = await env.DB.prepare(`
            SELECT 
                search_term,
                SUM(search_count) as total_searches,
                AVG(results_found) as avg_results,
                AVG(click_through_rate) as avg_ctr
            FROM analytics_searches
            WHERE date >= date('now', '-${days} days')
            GROUP BY search_term
            ORDER BY total_searches DESC
            LIMIT 10
        `).all();

        // ═══════════════════════════════════════════════════════════════
        // GET TODAY'S STATS
        // ═══════════════════════════════════════════════════════════════
        
        const today = await env.DB.prepare(`
            SELECT * FROM analytics_daily_summary
            WHERE date = date('now')
        `).first();

        // ═══════════════════════════════════════════════════════════════
        // CALCULATE GROWTH RATES
        // ═══════════════════════════════════════════════════════════════
        
        const previousPeriod = await env.DB.prepare(`
            SELECT 
                SUM(revenue) as prev_revenue,
                SUM(unique_visitors) as prev_visitors,
                SUM(orders_completed) as prev_orders
            FROM analytics_daily_summary
            WHERE date >= date('now', '-${days * 2} days')
            AND date < date('now', '-${days} days')
        `).first();

        const revenueGrowth = previousPeriod?.prev_revenue > 0
            ? (((totals.total_revenue - previousPeriod.prev_revenue) / previousPeriod.prev_revenue) * 100).toFixed(2)
            : 0;

        const visitorGrowth = previousPeriod?.prev_visitors > 0
            ? (((totals.total_visitors - previousPeriod.prev_visitors) / previousPeriod.prev_visitors) * 100).toFixed(2)
            : 0;

        return jsonResponse({
            success: true,
            period: period,
            date_range: {
                start: new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
            },
            overview: {
                total_visitors: totals?.total_visitors || 0,
                total_page_views: totals?.total_page_views || 0,
                total_orders: totals?.total_orders || 0,
                total_revenue: parseFloat(totals?.total_revenue || 0).toFixed(2),
                avg_conversion_rate: parseFloat(totals?.avg_conversion_rate || 0).toFixed(2),
                avg_order_value: parseFloat(totals?.avg_order_value || 0).toFixed(2),
                revenue_growth: revenueGrowth,
                visitor_growth: visitorGrowth
            },
            today: today || {
                unique_visitors: 0,
                page_views: 0,
                orders_completed: 0,
                revenue: 0,
                conversion_rate: 0
            },
            daily_trend: summaries.results || [],
            top_products: topProducts.results || [],
            top_searches: topSearches.results || [],
            last_sync: summaries.results?.[0]?.synced_at || null
        });

    } catch (error) {
        console.error('❌ Analytics fetch error:', error);
        
        return jsonResponse({
            success: false,
            error: error.message
        }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
