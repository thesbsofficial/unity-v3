/**
 * 🎯 Admin Activity & Stats API
 * GET /api/admin/activity - Recent admin actions and system activity
 * GET /api/admin/stats - Key system statistics and metrics
 */

import { verifyAdminAuth, logAdminAction } from '../../lib/admin.js';

// Common response helper
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    try {
        // Verify admin authentication
        const session = await verifyAdminAuth(request, env);
        if (!session) {
            return jsonResponse({
                success: false,
                error: 'Unauthorized - Admin access required'
            }, 401);
        }

        if (url.pathname.endsWith('/activity')) {
            return await handleGetActivity(context, session);
        } else if (url.pathname.endsWith('/stats')) {
            return await handleGetStats(context, session);
        }

        return jsonResponse({ error: 'Endpoint not found' }, 404);

    } catch (error) {
        console.error('❌ Admin activity/stats error:', error);
        return jsonResponse({
            success: false,
            error: 'Failed to fetch data',
            details: error.message
        }, 500);
    }
}

// Get recent admin activity
async function handleGetActivity(context, session) {
    const { env } = context;
    const url = new URL(context.request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 50;

    try {
        // Log this action
        await logAdminAction(env, session, 'admin_activity_view');

        // Get recent admin audit logs
        const auditLogs = await env.DB.prepare(`
            SELECT
                aal.id,
                aal.action,
                aal.resource,
                aal.metadata_json,
                aal.ip_address,
                aal.created_at,
                u.email as admin_email,
                u.first_name,
                u.last_name
            FROM admin_audit_logs aal
            JOIN users u ON aal.user_id = u.id
            ORDER BY aal.created_at DESC
            LIMIT ?
        `).bind(limit).all();

        // Get recent system events (orders, registrations, etc.)
        const recentOrders = await env.DB.prepare(`
            SELECT
                id,
                order_number,
                customer_name,
                total,
                status,
                created_at
            FROM orders
            ORDER BY created_at DESC
            LIMIT 10
        `).all();

        const recentUsers = await env.DB.prepare(`
            SELECT
                id,
                email,
                first_name,
                last_name,
                role,
                created_at
            FROM users
            WHERE role = 'customer'
            ORDER BY created_at DESC
            LIMIT 10
        `).all();

        // Get recent sell submissions
        const recentSubmissions = await env.DB.prepare(`
            SELECT
                id,
                batch_id,
                contact_name,
                item_count,
                status,
                created_at
            FROM sell_submissions
            ORDER BY created_at DESC
            LIMIT 10
        `).all();

        return jsonResponse({
            success: true,
            data: {
                admin_actions: auditLogs.results || [],
                recent_orders: recentOrders.results || [],
                recent_users: recentUsers.results || [],
                recent_submissions: recentSubmissions.results || [],
                generated_at: new Date().toISOString(),
                generated_by: session.email
            }
        });

    } catch (error) {
        console.error('❌ Error fetching admin activity:', error);
        throw error;
    }
}

// Get system statistics
async function handleGetStats(context, session) {
    const { env } = context;
    const url = new URL(context.request.url);
    const period = url.searchParams.get('period') || '7d'; // 24h, 7d, 30d, all

    try {
        // Log this action
        await logAdminAction(env, session, 'admin_stats_view', null, { period });

        // Calculate date range
        const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 9999;
        const dateFilter = period !== 'all' ? `WHERE DATE(created_at) >= DATE('now', '-${days} days')` : '';

        // User statistics
        const userStats = await env.DB.prepare(`
            SELECT
                COUNT(*) as total_users,
                COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
                COUNT(CASE WHEN is_verified = 1 THEN 1 END) as verified_users,
                COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-${days} days') THEN 1 END) as new_users_period
            FROM users
        `).first();

        // Order statistics
        const orderStats = await env.DB.prepare(`
            SELECT
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
                SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as total_revenue,
                AVG(CASE WHEN status = 'completed' THEN total ELSE NULL END) as avg_order_value,
                COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-${days} days') THEN 1 END) as orders_period
            FROM orders
        `).first();

        // Product statistics
        const productStats = await env.DB.prepare(`
            SELECT
                COUNT(*) as total_products,
                COUNT(CASE WHEN status = 'available' THEN 1 END) as available_products,
                COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_products,
                COUNT(CASE WHEN featured = 1 THEN 1 END) as featured_products,
                COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-${days} days') THEN 1 END) as products_added_period
            FROM products
        `).first();

        // Sell submission statistics
        const submissionStats = await env.DB.prepare(`
            SELECT
                COUNT(*) as total_submissions,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_submissions,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_submissions,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_submissions,
                SUM(item_count) as total_items_submitted,
                COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-${days} days') THEN 1 END) as submissions_period
            FROM sell_submissions
        `).first();

        // Session/activity statistics
        const sessionStats = await env.DB.prepare(`
            SELECT
                COUNT(*) as active_sessions,
                COUNT(DISTINCT user_id) as active_users,
                COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-1 days') THEN 1 END) as sessions_24h
            FROM sessions
            WHERE expires_at > datetime('now')
        `).first();

        // Top categories
        const topCategories = await env.DB.prepare(`
            SELECT
                category,
                COUNT(*) as product_count,
                COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_count
            FROM products
            GROUP BY category
            ORDER BY product_count DESC
            LIMIT 10
        `).all();

        // Recent growth trends (last 7 days)
        const dailyStats = await env.DB.prepare(`
            SELECT
                DATE(created_at) as date,
                COUNT(CASE WHEN table_type = 'orders' THEN 1 END) as orders,
                COUNT(CASE WHEN table_type = 'users' THEN 1 END) as users,
                COUNT(CASE WHEN table_type = 'products' THEN 1 END) as products
            FROM (
                SELECT created_at, 'orders' as table_type FROM orders
                UNION ALL
                SELECT created_at, 'users' as table_type FROM users WHERE role = 'customer'
                UNION ALL
                SELECT created_at, 'products' as table_type FROM products
            )
            WHERE DATE(created_at) >= DATE('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `).all();

        return jsonResponse({
            success: true,
            period: period,
            data: {
                users: userStats,
                orders: orderStats,
                products: productStats,
                submissions: submissionStats,
                sessions: sessionStats,
                top_categories: topCategories.results || [],
                daily_trends: dailyStats.results || [],
                generated_at: new Date().toISOString(),
                generated_by: session.email
            }
        });

    } catch (error) {
        console.error('❌ Error fetching admin stats:', error);
        throw error;
    }
}

// OPTIONS handler for CORS
export async function onRequestOptions(context) {
    return jsonResponse(null, 204);
}
