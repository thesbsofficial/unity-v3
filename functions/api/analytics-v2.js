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
    const since = startDate.toISOString();

    const submissionsResult = await db.prepare(`
        SELECT
            id,
            batch_id,
            status,
            contact_channel,
            contact_handle,
            contact_phone,
            city,
            created_at,
            reviewed_at,
            reviewed_by,
            items_json
        FROM sell_submissions
        WHERE datetime(created_at) >= datetime(?)
        ORDER BY datetime(created_at) DESC
    `).bind(since).all();

    const submissions = submissionsResult.results || [];

    if (submissions.length === 0) {
        return {
            summary: {
                total_submissions: 0,
                pending: 0,
                processed: 0,
                avg_items_per_submission: 0,
                avg_response_time_minutes: 0
            },
            breakdowns: {
                by_status: [],
                by_channel: [],
                by_city: []
            },
            trends: {
                top_categories: [],
                top_brands: [],
                submissions_over_time: []
            },
            recent_submissions: [],
            insights: ['No seller submissions recorded for the selected period']
        };
    }

    const statusCounter = new Map();
    const channelCounter = new Map();
    const cityCounter = new Map();
    const categoryCounter = new Map();
    const brandCounter = new Map();
    const submissionsOverTime = new Map();

    let totalItems = 0;
    let totalPhotos = 0;
    let responseTotalMinutes = 0;
    let responseSamples = 0;

    const parsedSubmissions = submissions.map(sub => {
        statusCounter.set(sub.status, (statusCounter.get(sub.status) || 0) + 1);
        channelCounter.set(sub.contact_channel, (channelCounter.get(sub.contact_channel) || 0) + 1);
        if (sub.city) {
            cityCounter.set(sub.city, (cityCounter.get(sub.city) || 0) + 1);
        }

        const submissionDate = new Date(sub.created_at);
        const dateKey = submissionDate.toISOString().split('T')[0];
        submissionsOverTime.set(dateKey, (submissionsOverTime.get(dateKey) || 0) + 1);

        let items = [];
        try {
            const parsed = JSON.parse(sub.items_json || '[]');
            if (Array.isArray(parsed)) {
                items = parsed;
            }
        } catch (parseError) {
            console.warn(`⚠️ Failed to parse items for sell submission ${sub.batch_id}:`, parseError.message);
        }

        items.forEach(item => {
            if (item?.category) {
                categoryCounter.set(item.category, (categoryCounter.get(item.category) || 0) + 1);
            }
            if (item?.brand) {
                brandCounter.set(item.brand, (brandCounter.get(item.brand) || 0) + 1);
            }
            if (typeof item?.photoCount === 'number') {
                totalPhotos += item.photoCount;
            }
        });

        totalItems += items.length;

        if (sub.reviewed_at) {
            const reviewed = new Date(sub.reviewed_at);
            const diffMinutes = Math.max(0, (reviewed.getTime() - submissionDate.getTime()) / (1000 * 60));
            responseTotalMinutes += diffMinutes;
            responseSamples += 1;
        }

        return {
            ...sub,
            items,
            items_count: items.length
        };
    });

    const totalSubmissions = submissions.length;
    const pendingCount = statusCounter.get('pending') || 0;
    const processedCount = totalSubmissions - pendingCount;
    const avgItems = totalItems > 0 ? totalItems / totalSubmissions : 0;
    const avgPhotos = totalPhotos > 0 ? totalPhotos / totalSubmissions : 0;
    const avgResponseMinutes = responseSamples > 0 ? responseTotalMinutes / responseSamples : 0;

    const toSortedArray = (map) => Array.from(map.entries())
        .map(([key, value]) => ({ key, value }))
        .sort((a, b) => b.value - a.value);

    const insights = [];
    const topChannel = toSortedArray(channelCounter)[0];
    if (topChannel) {
        insights.push(`${topChannel.key} delivers the most seller leads (${topChannel.value} submissions).`);
    }

    const topCategory = toSortedArray(categoryCounter)[0];
    if (topCategory) {
        insights.push(`${topCategory.key} is the most submitted category this period.`);
    }

    if (avgResponseMinutes > 0) {
        insights.push(`Average review response time is ${avgResponseMinutes.toFixed(1)} minutes.`);
    } else {
        insights.push('Submissions are awaiting review; no response-time data yet.');
    }

    if (avgPhotos > 0) {
        insights.push(`Sellers include an average of ${avgPhotos.toFixed(1)} photo(s) per submission.`);
    }

    return {
        summary: {
            total_submissions: totalSubmissions,
            pending: pendingCount,
            processed: processedCount,
            processed_rate: totalSubmissions > 0 ? ((processedCount / totalSubmissions) * 100).toFixed(1) : '0.0',
            avg_items_per_submission: Number(avgItems.toFixed(2)),
            avg_photos_per_submission: Number(avgPhotos.toFixed(2)),
            avg_response_time_minutes: Number(avgResponseMinutes.toFixed(1))
        },
        breakdowns: {
            by_status: toSortedArray(statusCounter),
            by_channel: toSortedArray(channelCounter),
            by_city: toSortedArray(cityCounter)
        },
        trends: {
            top_categories: toSortedArray(categoryCounter).slice(0, 5),
            top_brands: toSortedArray(brandCounter).slice(0, 5),
            submissions_over_time: Array.from(submissionsOverTime.entries())
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date))
        },
        recent_submissions: parsedSubmissions.slice(0, 5).map(sub => ({
            batch_id: sub.batch_id,
            status: sub.status,
            items_count: sub.items_count,
            contact_channel: sub.contact_channel,
            contact_handle: sub.contact_handle,
            city: sub.city,
            submitted_at: sub.created_at,
            reviewed_at: sub.reviewed_at
        })),
        insights
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
