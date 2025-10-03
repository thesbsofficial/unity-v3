// 📊 SBS ANALYTICS API - EXPANDABLE INTELLIGENCE SYSTEM
// Simple skeleton designed for easy upgrades
// Tracks: Products, Customers, Sellers, Operations

export async function onRequest(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'week'; // day, week, month, all
    const view = url.searchParams.get('view') || 'overview'; // overview, products, customers, sellers

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const db = env.DB;
        const now = new Date();
        let startDate;

        // Calculate time window
        switch (period) {
            case 'day':
                startDate = new Date(now.setDate(now.getDate() - 1));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            default:
                startDate = new Date('2024-01-01'); // All time
        }

        // Route to specific analytics view
        let analytics;
        switch (view) {
            case 'products':
                analytics = await getProductAnalytics(db, startDate);
                break;
            case 'customers':
                analytics = await getCustomerAnalytics(db, startDate);
                break;
            case 'sellers':
                analytics = await getSellerAnalytics(db, startDate);
                break;
            default:
                analytics = await getOverviewAnalytics(db, startDate);
        }

        return new Response(JSON.stringify({
            success: true,
            view: view,
            period: period,
            date_range: {
                start: startDate.toISOString(),
                end: new Date().toISOString()
            },
            ...analytics,
            generated_at: new Date().toISOString()
        }), {
            status: 200,
            headers: corsHeaders
        });

    } catch (error) {
        console.error('❌ Analytics error:', error);
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

// ═══════════════════════════════════════════════════════════════
// 📊 OVERVIEW ANALYTICS - High-level dashboard
// ═══════════════════════════════════════════════════════════════
async function getOverviewAnalytics(db, startDate) {
    // Quick counts
    const [products, customers, orders] = await Promise.all([
        db.prepare('SELECT COUNT(*) as count FROM products WHERE status = "active"').first(),
        db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first(),
        db.prepare('SELECT COUNT(*) as count FROM orders WHERE created_at >= ?').bind(startDate.toISOString()).first()
    ]);

    return {
        summary: {
            active_products: products?.count || 0,
            total_customers: customers?.count || 0,
            recent_orders: orders?.count || 0
        },
        quick_insights: [
            { metric: 'Active Inventory', value: products?.count || 0, icon: '📦', trend: 'stable' },
            { metric: 'Registered Customers', value: customers?.count || 0, icon: '👥', trend: 'growing' },
            { metric: 'Recent Orders', value: orders?.count || 0, icon: '🛒', trend: 'active' }
        ],
        upgrade_available: {
            products: 'Detailed product trends',
            customers: 'Top customers & behavior',
            sellers: 'Seller performance tracking'
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// 📦 PRODUCT ANALYTICS - Inventory intelligence
// ═══════════════════════════════════════════════════════════════
async function getProductAnalytics(db, startDate) {
    // Total products
    const total = await db.prepare('SELECT COUNT(*) as count FROM products').first();
    
    // Active vs sold
    const statusBreakdown = await db.prepare(`
        SELECT 
            status,
            COUNT(*) as count
        FROM products
        GROUP BY status
    `).all();

    // Category performance
    const categoryStats = await db.prepare(`
        SELECT 
            category,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
            SUM(views_count) as total_views
        FROM products
        WHERE created_at >= ?
        GROUP BY category
        ORDER BY sold DESC
    `).bind(startDate.toISOString()).all();

    // Hot products (most viewed, still active)
    const hotProducts = await db.prepare(`
        SELECT 
            image_id,
            category,
            size,
            views_count,
            created_at
        FROM products
        WHERE status = 'active' AND views_count > 0
        ORDER BY views_count DESC
        LIMIT 5
    `).all();

    // Fast movers (sold quickly)
    const fastMovers = await db.prepare(`
        SELECT 
            image_id,
            category,
            size,
            days_to_sell,
            sold_at
        FROM products
        WHERE status = 'sold' 
            AND days_to_sell IS NOT NULL
            AND sold_at >= ?
        ORDER BY days_to_sell ASC
        LIMIT 5
    `).bind(startDate.toISOString()).all();

    return {
        summary: {
            total_products: total?.count || 0,
            by_status: statusBreakdown.results
        },
        category_performance: categoryStats.results,
        hot_products: hotProducts.results,
        fast_movers: fastMovers.results,
        insights: generateProductInsights(categoryStats.results, hotProducts.results)
    };
}

// ═══════════════════════════════════════════════════════════════
// 👥 CUSTOMER ANALYTICS - Buyer intelligence
// ═══════════════════════════════════════════════════════════════
async function getCustomerAnalytics(db, startDate) {
    // Top customers by order count
    const topCustomers = await db.prepare(`
        SELECT 
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.city,
            u.preferred_contact,
            COUNT(o.id) as order_count,
            MAX(o.created_at) as last_order,
            MIN(o.created_at) as first_order
        FROM users u
        JOIN orders o ON u.id = o.user_id
        WHERE o.created_at >= ?
        GROUP BY u.id
        ORDER BY order_count DESC
        LIMIT 10
    `).bind(startDate.toISOString()).all();

    // Customer locations
    const locations = await db.prepare(`
        SELECT 
            city,
            COUNT(*) as customer_count
        FROM users
        WHERE is_active = 1 AND city IS NOT NULL
        GROUP BY city
        ORDER BY customer_count DESC
        LIMIT 10
    `).all();

    // Contact preferences
    const contactPrefs = await db.prepare(`
        SELECT 
            preferred_contact,
            COUNT(*) as count
        FROM users
        WHERE is_active = 1
        GROUP BY preferred_contact
    `).all();

    // New vs returning
    const customerTypes = await db.prepare(`
        SELECT 
            CASE 
                WHEN order_count = 1 THEN 'new'
                ELSE 'returning'
            END as type,
            COUNT(*) as count
        FROM (
            SELECT user_id, COUNT(*) as order_count
            FROM orders
            WHERE created_at >= ?
            GROUP BY user_id
        )
        GROUP BY type
    `).bind(startDate.toISOString()).all();

    return {
        summary: {
            top_customers: topCustomers.results.slice(0, 5),
            total_active: topCustomers.results.length
        },
        locations: locations.results,
        contact_preferences: contactPrefs.results,
        customer_types: customerTypes.results,
        insights: generateCustomerInsights(topCustomers.results, locations.results)
    };
}

// ═══════════════════════════════════════════════════════════════
// 📦 SELLER ANALYTICS - Submission intelligence (PLACEHOLDER)
// ═══════════════════════════════════════════════════════════════
async function getSellerAnalytics(db, startDate) {
    // TODO: Track sell form submissions in future
    // For now, return placeholder structure
    
    return {
        summary: {
            message: 'Seller tracking coming soon',
            ready_for: [
                'Submission tracking',
                'Conversion rates',
                'Top seller sources',
                'Item quality metrics'
            ]
        },
        placeholder: true,
        upgrade_note: 'Add sell_submissions table to enable full seller analytics'
    };
}

// ═══════════════════════════════════════════════════════════════
// 🧠 INSIGHT GENERATORS - Smart interpretations
// ═══════════════════════════════════════════════════════════════
function generateProductInsights(categories, hotProducts) {
    const insights = [];
    
    if (categories.length > 0) {
        const topCategory = categories[0];
        insights.push(`${topCategory.category} is your best performing category with ${topCategory.sold} sales`);
    }
    
    if (hotProducts.length > 0) {
        insights.push(`${hotProducts.length} products are getting high views - potential hot sellers`);
    }
    
    return insights;
}

function generateCustomerInsights(topCustomers, locations) {
    const insights = [];
    
    if (topCustomers.length > 0) {
        const vip = topCustomers[0];
        insights.push(`Top customer has placed ${vip.order_count} orders`);
    }
    
    if (locations.length > 0) {
        const topLocation = locations[0];
        insights.push(`${topLocation.city} has the most customers (${topLocation.customer_count})`);
    }
    
    return insights;
}
