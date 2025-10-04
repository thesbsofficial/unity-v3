// Admin Orders API (secured + notifications)

import NotificationService from '../../lib/notification-service.js';
import { verifyAdminAuth, logAdminAction } from '../../lib/admin.js';
import { generateOrderNumber } from '../../lib/security.js';

const BASE_HEADERS = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'
};

function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...BASE_HEADERS, ...headers }
    });
}

async function requireAdminSession(context) {
    const session = await verifyAdminAuth(context.request, context.env);
    if (!session) {
        return { error: jsonResponse({ error: 'Unauthorized' }, 401) };
    }
    return { session };
}

async function fetchOrderWithItems(DB, orderNumber) {
    const order = await DB.prepare(`
        SELECT
            o.*,
            GROUP_CONCAT(
                json_object(
                    'product_id', oi.product_id,
                    'category', oi.category,
                    'size', oi.size,
                    'image_url', oi.image_url
                )
            ) AS items_json
        FROM orders o
        LEFT JOIN order_items oi ON o.order_number = oi.order_number
        WHERE o.order_number = ?
        GROUP BY o.order_number
    `).bind(orderNumber).first();

    if (!order) {
        return null;
    }

    order.items = order.items_json ? JSON.parse(`[${order.items_json}]`) : [];
    delete order.items_json;
    return order;
}

async function attachItemsToOrders(DB, orders) {
    if (!orders.length) {
        return;
    }

    const orderNumbers = orders.map(o => o.order_number);
    const placeholders = orderNumbers.map(() => '?').join(',');

    const { results: allItems } = await DB.prepare(`
        SELECT order_number, product_id, category, size, image_url
        FROM order_items
        WHERE order_number IN (${placeholders})
        ORDER BY order_number
    `).bind(...orderNumbers).all();

    const itemsByOrder = new Map();
    for (const item of allItems) {
        if (!itemsByOrder.has(item.order_number)) {
            itemsByOrder.set(item.order_number, []);
        }
        itemsByOrder.get(item.order_number).push(item);
    }

    for (const order of orders) {
        order.items = itemsByOrder.get(order.order_number) || [];
    }
}

function deriveOrderEmail(order) {
    return order?.customer_email || order?.user_email || order?.email || null;
}

function mapItemsForNotification(items = []) {
    return items.map(item => ({
        name: item.name || item.category || item.product_id || 'SBS Item',
        size: item.size || 'N/A',
        quantity: item.quantity || 1,
        price: typeof item.price === 'number' ? item.price : 'TBD'
    }));
}

function normalizeStatus(value) {
    return (value || '').toLowerCase();
}

function createOrderNumber() {
    const generated = generateOrderNumber();
    return generated.startsWith('SBS-') ? generated.replace('SBS-', 'ORD-') : generated;
}

export async function onRequestGet(context) {
    try {
        const check = await requireAdminSession(context);
        if (check.error) return check.error;

        const { DB } = context.env;
        const url = new URL(context.request.url);
        const orderNumber = url.searchParams.get('order_number');
        const statusFilter = normalizeStatus(url.searchParams.get('status'));

        if (orderNumber) {
            const order = await fetchOrderWithItems(DB, orderNumber);
            if (!order) {
                return jsonResponse({ error: 'Order not found' }, 404);
            }

            await logAdminAction(context.env, check.session, 'admin_order_view', `order_${orderNumber}`, {
                via: 'orders_api',
                order_number: orderNumber
            });

            return jsonResponse({ success: true, order });
        }

        let baseQuery = `
            SELECT o.*
            FROM orders o
        `;
        const params = [];

        if (statusFilter && statusFilter !== 'all') {
            baseQuery += ' WHERE lower(o.status) = ?';
            params.push(statusFilter);
        }

        baseQuery += ' ORDER BY o.created_at DESC LIMIT 100';

        const stmt = params.length ? DB.prepare(baseQuery).bind(...params) : DB.prepare(baseQuery);
        const { results: orders } = await stmt.all();

        await attachItemsToOrders(DB, orders);

        const todayStr = new Date().toDateString();
        const stats = {
            pending: orders.filter(o => normalizeStatus(o.status) === 'pending').length,
            ready: orders.filter(o => normalizeStatus(o.status) === 'ready').length,
            completed: orders.filter(o => normalizeStatus(o.status) === 'completed' && new Date(o.created_at).toDateString() === todayStr).length,
            revenue: orders
                .filter(o => normalizeStatus(o.status) === 'completed' && new Date(o.created_at).toDateString() === todayStr)
                .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
        };

        await logAdminAction(context.env, check.session, 'admin_orders_list', null, {
            count: orders.length,
            status_filter: statusFilter || 'all'
        });

        return jsonResponse({ success: true, orders, stats, total: orders.length });
    } catch (error) {
        console.error('Orders GET Error:', error);
        return jsonResponse({ error: 'Failed to fetch orders', message: error.message }, 500);
    }
}

export async function onRequestPost(context) {
    try {
        const check = await requireAdminSession(context);
        if (check.error) return check.error;

        const { DB } = context.env;
        const orderData = await context.request.json();

        if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
            return jsonResponse({ error: 'Order must include at least one item' }, 400);
        }

        const requiredFields = ['customer_name', 'customer_phone', 'delivery_method'];
        for (const field of requiredFields) {
            if (!orderData[field]) {
                return jsonResponse({ error: `Missing required field: ${field}` }, 400);
            }
        }

        const deliveryMethod = orderData.delivery_method;
        if (!['collection', 'delivery'].includes(deliveryMethod)) {
            return jsonResponse({ error: 'delivery_method must be collection or delivery' }, 400);
        }

        const orderNumber = createOrderNumber();

        const deliveryFee = deliveryMethod === 'delivery' ? 5 : 0;
        const itemsTotal = orderData.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
        const providedTotal = Number(orderData.total_amount);
        const totalAmount = Number.isFinite(providedTotal) ? providedTotal : itemsTotal + deliveryFee;

        await DB.prepare(`
            INSERT INTO orders (
                order_number,
                customer_name,
                customer_phone,
                customer_email,
                delivery_method,
                delivery_address,
                delivery_city,
                delivery_eircode,
                total_amount,
                status,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
        `).bind(
            orderNumber,
            orderData.customer_name,
            orderData.customer_phone,
            orderData.customer_email || null,
            deliveryMethod,
            orderData.delivery_address || null,
            orderData.delivery_city || null,
            orderData.delivery_eircode || null,
            totalAmount
        ).run();

        for (const item of orderData.items) {
            await DB.prepare(`
                INSERT INTO order_items (
                    order_number,
                    product_id,
                    category,
                    size,
                    image_url,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, datetime('now'))
            `).bind(
                orderNumber,
                item.product_id,
                item.category,
                item.size,
                item.image_url
            ).run();
        }

        const createdOrder = await fetchOrderWithItems(DB, orderNumber);

        if (createdOrder) {
            const orderEmail = deriveOrderEmail(createdOrder);
            if (orderEmail) {
                try {
                    const notificationService = new NotificationService(context.env);
                    const notificationResult = await notificationService.sendOrderConfirmation(
                        { ...createdOrder, email: orderEmail, user_email: orderEmail },
                        mapItemsForNotification(orderData.items)
                    );

                    if (!notificationResult.success) {
                        console.warn('Order confirmation email not sent:', notificationResult.reason || notificationResult.error);
                    }
                } catch (notificationError) {
                    console.error('Order confirmation notification failed:', notificationError);
                }
            }
        }

        await logAdminAction(context.env, check.session, 'admin_order_created', `order_${orderNumber}`, {
            delivery_method: deliveryMethod,
            items: orderData.items.length,
            has_email: Boolean(orderData.customer_email)
        });

        return jsonResponse({
            success: true,
            order_number: orderNumber,
            order: createdOrder,
            message: 'Order created successfully'
        }, 201);
    } catch (error) {
        console.error('Orders POST Error:', error);
        return jsonResponse({ error: 'Failed to create order', message: error.message }, 500);
    }
}

export async function onRequestPut(context) {
    try {
        const check = await requireAdminSession(context);
        if (check.error) return check.error;

        const { DB } = context.env;
        const body = await context.request.json();
        const orderNumber = body.order_number;
        const newStatus = normalizeStatus(body.status);
        const adminNotes = body.admin_notes;

        if (!orderNumber) {
            return jsonResponse({ error: 'order_number is required' }, 400);
        }

        const validStatuses = ['pending', 'ready', 'completed', 'cancelled'];
        if (!validStatuses.includes(newStatus)) {
            return jsonResponse({
                error: 'Invalid status value',
                valid_statuses: validStatuses
            }, 400);
        }

        const existingOrder = await DB.prepare(`
            SELECT * FROM orders WHERE order_number = ?
        `).bind(orderNumber).first();

        if (!existingOrder) {
            return jsonResponse({ error: 'Order not found' }, 404);
        }

        await DB.prepare(`
            UPDATE orders
            SET status = ?,
                admin_notes = COALESCE(?, admin_notes),
                updated_at = datetime('now')
            WHERE order_number = ?
        `).bind(newStatus, adminNotes, orderNumber).run();

        const updatedOrder = await fetchOrderWithItems(DB, orderNumber) || existingOrder;

        const orderEmail = deriveOrderEmail(updatedOrder);
        if (orderEmail) {
            try {
                const notificationService = new NotificationService(context.env);
                const notificationResult = await notificationService.sendOrderStatusUpdate(
                    { ...updatedOrder, email: orderEmail, user_email: orderEmail },
                    newStatus
                );

                if (!notificationResult.success) {
                    console.warn('Status notification not delivered:', notificationResult.reason || notificationResult.error);
                }
            } catch (notificationError) {
                console.error('Status notification error:', notificationError);
            }
        }

        await logAdminAction(context.env, check.session, 'admin_order_status_update', `order_${orderNumber}`, {
            old_status: existingOrder.status,
            new_status: newStatus
        });

        return jsonResponse({
            success: true,
            message: `Order ${orderNumber} status updated to ${newStatus}`,
            order: updatedOrder
        });
    } catch (error) {
        console.error('Orders PUT Error:', error);
        return jsonResponse({ error: 'Failed to update order', message: error.message }, 500);
    }
}

export async function onRequestDelete(context) {
    try {
        const check = await requireAdminSession(context);
        if (check.error) return check.error;

        const { DB } = context.env;
        const url = new URL(context.request.url);
        const orderNumber = url.searchParams.get('order_number');

        if (!orderNumber) {
            return jsonResponse({ error: 'Missing order_number parameter' }, 400);
        }

        const existingOrder = await DB.prepare(`
            SELECT order_number FROM orders WHERE order_number = ?
        `).bind(orderNumber).first();

        if (!existingOrder) {
            return jsonResponse({ error: 'Order not found' }, 404);
        }

        await DB.prepare(`
            DELETE FROM order_items WHERE order_number = ?
        `).bind(orderNumber).run();

        await DB.prepare(`
            DELETE FROM orders WHERE order_number = ?
        `).bind(orderNumber).run();

        await logAdminAction(context.env, check.session, 'admin_order_deleted', `order_${orderNumber}`);

        return jsonResponse({
            success: true,
            message: `Order ${orderNumber} deleted successfully`
        });
    } catch (error) {
        console.error('Orders DELETE Error:', error);
        return jsonResponse({ error: 'Failed to delete order', message: error.message }, 500);
    }
}
