/**
 * 📊 Analytics Sync API
 * POST /api/analytics/sync
 * Aggregates raw events into daily summaries
 */

export async function onRequestPost(context) {
    const { request, env } = context;

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

        const startTime = Date.now();
        const today = new Date().toISOString().split('T')[0];
        
        console.log(`📊 Starting analytics sync for ${today}`);

        // ═══════════════════════════════════════════════════════════════
        // SYNC DAILY SUMMARY
        // ═══════════════════════════════════════════════════════════════
        
        const summary = await env.DB.prepare(`
            SELECT 
                COUNT(DISTINCT session_id) as unique_visitors,
                COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
                COUNT(*) FILTER (WHERE event_type = 'product_view') as products_viewed,
                COUNT(DISTINCT product_id) FILTER (WHERE event_type = 'product_view' AND product_id IS NOT NULL) as unique_products_viewed,
                COUNT(*) FILTER (WHERE event_type = 'add_to_cart') as cart_adds,
                COUNT(*) FILTER (WHERE event_type = 'checkout_initiated') as checkouts_initiated,
                COUNT(*) FILTER (WHERE event_type = 'purchase') as orders_completed,
                SUM(value) FILTER (WHERE event_type = 'purchase') as revenue,
                SUM(quantity) FILTER (WHERE event_type = 'purchase') as items_sold,
                COUNT(*) FILTER (WHERE event_type = 'search') as total_searches,
                COUNT(DISTINCT json_extract(metadata, '$.search_term')) FILTER (WHERE event_type = 'search') as unique_search_terms
            FROM analytics_events
            WHERE DATE(created_at) = ?
        `).bind(today).first();

        // Calculate conversion rates
        const conversionRate = summary.unique_visitors > 0 
            ? ((summary.orders_completed / summary.unique_visitors) * 100).toFixed(2)
            : 0;

        const cartAbandonmentRate = summary.cart_adds > 0
            ? (((summary.cart_adds - summary.orders_completed) / summary.cart_adds) * 100).toFixed(2)
            : 0;

        const addToCartRate = summary.products_viewed > 0
            ? ((summary.cart_adds / summary.products_viewed) * 100).toFixed(2)
            : 0;

        const avgOrderValue = summary.orders_completed > 0
            ? (summary.revenue / summary.orders_completed).toFixed(2)
            : 0;

        // Get top product
        const topProduct = await env.DB.prepare(`
            SELECT product_id, COUNT(*) as view_count
            FROM analytics_events
            WHERE DATE(created_at) = ? AND event_type = 'product_view' AND product_id IS NOT NULL
            GROUP BY product_id
            ORDER BY view_count DESC
            LIMIT 1
        `).bind(today).first();

        // Get top category
        const topCategory = await env.DB.prepare(`
            SELECT category, COUNT(*) as count
            FROM analytics_events
            WHERE DATE(created_at) = ? AND category IS NOT NULL
            GROUP BY category
            ORDER BY count DESC
            LIMIT 1
        `).bind(today).first();

        // Get top brand
        const topBrand = await env.DB.prepare(`
            SELECT brand, COUNT(*) as count
            FROM analytics_events
            WHERE DATE(created_at) = ? AND brand IS NOT NULL
            GROUP BY brand
            ORDER BY count DESC
            LIMIT 1
        `).bind(today).first();

        // Get top search term
        const topSearch = await env.DB.prepare(`
            SELECT json_extract(metadata, '$.search_term') as search_term, COUNT(*) as count
            FROM analytics_events
            WHERE DATE(created_at) = ? AND event_type = 'search'
            GROUP BY search_term
            ORDER BY count DESC
            LIMIT 1
        `).bind(today).first();

        // Upsert daily summary
        await env.DB.prepare(`
            INSERT INTO analytics_daily_summary 
            (date, unique_visitors, page_views, products_viewed, unique_products_viewed,
             cart_adds, checkouts_initiated, orders_completed, revenue, avg_order_value,
             items_sold, conversion_rate, cart_abandonment_rate, add_to_cart_rate,
             top_product_id, top_product_views, top_category, top_brand, total_searches,
             unique_search_terms, top_search_term, synced_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                unique_visitors = excluded.unique_visitors,
                page_views = excluded.page_views,
                products_viewed = excluded.products_viewed,
                unique_products_viewed = excluded.unique_products_viewed,
                cart_adds = excluded.cart_adds,
                checkouts_initiated = excluded.checkouts_initiated,
                orders_completed = excluded.orders_completed,
                revenue = excluded.revenue,
                avg_order_value = excluded.avg_order_value,
                items_sold = excluded.items_sold,
                conversion_rate = excluded.conversion_rate,
                cart_abandonment_rate = excluded.cart_abandonment_rate,
                add_to_cart_rate = excluded.add_to_cart_rate,
                top_product_id = excluded.top_product_id,
                top_product_views = excluded.top_product_views,
                top_category = excluded.top_category,
                top_brand = excluded.top_brand,
                total_searches = excluded.total_searches,
                unique_search_terms = excluded.unique_search_terms,
                top_search_term = excluded.top_search_term,
                synced_at = excluded.synced_at,
                updated_at = excluded.updated_at
        `).bind(
            today,
            summary.unique_visitors,
            summary.page_views,
            summary.products_viewed,
            summary.unique_products_viewed,
            summary.cart_adds,
            summary.checkouts_initiated,
            summary.orders_completed,
            summary.revenue || 0,
            avgOrderValue,
            summary.items_sold || 0,
            conversionRate,
            cartAbandonmentRate,
            addToCartRate,
            topProduct?.product_id || null,
            topProduct?.view_count || 0,
            topCategory?.category || null,
            topBrand?.brand || null,
            summary.total_searches,
            summary.unique_search_terms,
            topSearch?.search_term || null,
            new Date().toISOString(),
            new Date().toISOString()
        ).run();

        // ═══════════════════════════════════════════════════════════════
        // SYNC PRODUCT PERFORMANCE
        // ═══════════════════════════════════════════════════════════════
        
        const productStats = await env.DB.prepare(`
            SELECT 
                product_id,
                json_extract(metadata, '$.product_name') as product_name,
                json_extract(metadata, '$.category') as category,
                json_extract(metadata, '$.brand') as brand,
                json_extract(metadata, '$.price') as price,
                COUNT(*) FILTER (WHERE event_type = 'product_view') as views,
                COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'product_view') as unique_viewers,
                COUNT(*) FILTER (WHERE event_type = 'add_to_cart') as cart_adds,
                COUNT(*) FILTER (WHERE event_type = 'purchase') as purchases,
                SUM(value) FILTER (WHERE event_type = 'purchase') as revenue,
                SUM(quantity) FILTER (WHERE event_type = 'purchase') as units_sold
            FROM analytics_events
            WHERE DATE(created_at) = ? AND product_id IS NOT NULL
            GROUP BY product_id
        `).bind(today).all();

        for (const product of productStats.results || []) {
            const viewToCartRate = product.views > 0 
                ? ((product.cart_adds / product.views) * 100).toFixed(2) 
                : 0;
            
            const cartToPurchaseRate = product.cart_adds > 0 
                ? ((product.purchases / product.cart_adds) * 100).toFixed(2) 
                : 0;
            
            const overallConversionRate = product.views > 0 
                ? ((product.purchases / product.views) * 100).toFixed(2) 
                : 0;

            await env.DB.prepare(`
                INSERT INTO analytics_product_performance
                (product_id, date, views, unique_viewers, cart_adds, purchases,
                 revenue, units_sold, view_to_cart_rate, cart_to_purchase_rate,
                 overall_conversion_rate, product_name, category, brand, price, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(product_id, date) DO UPDATE SET
                    views = excluded.views,
                    unique_viewers = excluded.unique_viewers,
                    cart_adds = excluded.cart_adds,
                    purchases = excluded.purchases,
                    revenue = excluded.revenue,
                    units_sold = excluded.units_sold,
                    view_to_cart_rate = excluded.view_to_cart_rate,
                    cart_to_purchase_rate = excluded.cart_to_purchase_rate,
                    overall_conversion_rate = excluded.overall_conversion_rate,
                    synced_at = excluded.synced_at
            `).bind(
                product.product_id,
                today,
                product.views,
                product.unique_viewers,
                product.cart_adds,
                product.purchases,
                product.revenue || 0,
                product.units_sold || 0,
                viewToCartRate,
                cartToPurchaseRate,
                overallConversionRate,
                product.product_name,
                product.category,
                product.brand,
                product.price,
                new Date().toISOString()
            ).run();
        }

        // Log sync completion
        const duration = Date.now() - startTime;
        
        await env.DB.prepare(`
            INSERT INTO analytics_sync_log
            (sync_type, sync_date, status, events_processed, records_updated, duration_ms, started_at, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            'daily_summary',
            today,
            'success',
            summary.page_views || 0,
            1 + (productStats.results?.length || 0),
            duration,
            new Date(startTime).toISOString(),
            new Date().toISOString()
        ).run();

        console.log(`✅ Analytics sync completed in ${duration}ms`);

        return jsonResponse({
            success: true,
            sync_date: today,
            summary: {
                unique_visitors: summary.unique_visitors,
                page_views: summary.page_views,
                orders_completed: summary.orders_completed,
                revenue: summary.revenue || 0,
                conversion_rate: conversionRate,
                products_synced: productStats.results?.length || 0
            },
            duration_ms: duration
        });

    } catch (error) {
        console.error('❌ Analytics sync error:', error);
        
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
