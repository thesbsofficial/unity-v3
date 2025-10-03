// Admin Orders API
// Handles order management, status updates, and retrieval

export async function onRequestGet(context) {
    try {
        const { DB } = context.env;
        const url = new URL(context.request.url);
        const orderNumber = url.searchParams.get('order_number');
        const status = url.searchParams.get('status');

        // Check admin authentication
        const authHeader = context.request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get specific order
        if (orderNumber) {
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
                    ) as items_json
                FROM orders o
                LEFT JOIN order_items oi ON o.order_number = oi.order_number
                WHERE o.order_number = ?
                GROUP BY o.order_number
            `).bind(orderNumber).first();

            if (!order) {
                return new Response(JSON.stringify({ error: 'Order not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Parse items JSON
            order.items = order.items_json ? 
                JSON.parse(`[${order.items_json}]`) : [];
            delete order.items_json;

            return new Response(JSON.stringify({ order }), {
                status: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
        }

        // Get all orders with optional status filter
        let query = `
            SELECT 
                o.*,
                COUNT(oi.product_id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.order_number = oi.order_number
        `;

        const params = [];
        
        if (status && status !== 'all') {
            query += ' WHERE o.status = ?';
            params.push(status);
        }

        query += ' GROUP BY o.order_number ORDER BY o.created_at DESC LIMIT 100';

        const stmt = params.length > 0 ? 
            DB.prepare(query).bind(...params) : 
            DB.prepare(query);

        const { results: orders } = await stmt.all();

        // Get items for each order
        for (const order of orders) {
            const { results: items } = await DB.prepare(`
                SELECT product_id, category, size, image_url
                FROM order_items
                WHERE order_number = ?
            `).bind(order.order_number).all();
            
            order.items = items;
        }

        // Calculate stats
        const stats = {
            pending: orders.filter(o => o.status === 'pending').length,
            ready: orders.filter(o => o.status === 'ready').length,
            completed: orders.filter(o => {
                const orderDate = new Date(o.created_at);
                const today = new Date();
                return o.status === 'completed' && 
                       orderDate.toDateString() === today.toDateString();
            }).length,
            revenue: orders
                .filter(o => {
                    const orderDate = new Date(o.created_at);
                    const today = new Date();
                    return o.status === 'completed' && 
                           orderDate.toDateString() === today.toDateString();
                })
                .reduce((sum, o) => sum + (o.total_amount || 0), 0)
        };

        return new Response(JSON.stringify({ 
            orders,
            stats,
            total: orders.length 
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('Orders GET Error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch orders',
            message: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPut(context) {
    try {
        const { DB } = context.env;
        const { order_number, status } = await context.request.json();

        // Check admin authentication
        const authHeader = context.request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate status
        const validStatuses = ['pending', 'ready', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return new Response(JSON.stringify({ 
                error: 'Invalid status',
                valid_statuses: validStatuses 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update order status
        const result = await DB.prepare(`
            UPDATE orders 
            SET status = ?,
                updated_at = datetime('now')
            WHERE order_number = ?
        `).bind(status, order_number).run();

        if (result.meta.changes === 0) {
            return new Response(JSON.stringify({ error: 'Order not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get updated order
        const order = await DB.prepare(`
            SELECT * FROM orders WHERE order_number = ?
        `).bind(order_number).first();

        // TODO: Send notification to customer (WhatsApp/Email)
        // if (status === 'ready') {
        //     await sendOrderReadyNotification(order);
        // }

        return new Response(JSON.stringify({ 
            success: true,
            order,
            message: `Order ${order_number} status updated to ${status}`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Orders PUT Error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to update order',
            message: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(context) {
    try {
        const { DB } = context.env;
        const orderData = await context.request.json();

        // Validate required fields
        const required = [
            'customer_name', 
            'customer_phone', 
            'delivery_method', 
            'items'
        ];

        for (const field of required) {
            if (!orderData[field]) {
                return new Response(JSON.stringify({ 
                    error: `Missing required field: ${field}` 
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // Calculate total
        const deliveryFee = orderData.delivery_method === 'delivery' ? 5 : 0;
        const totalAmount = deliveryFee;

        // Insert order
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
            orderData.delivery_method,
            orderData.delivery_address || null,
            orderData.delivery_city || null,
            orderData.delivery_eircode || null,
            totalAmount
        ).run();

        // Insert order items
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

        // TODO: Send confirmation to customer
        // await sendOrderConfirmation(orderData);

        return new Response(JSON.stringify({ 
            success: true,
            order_number: orderNumber,
            message: 'Order created successfully'
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Orders POST Error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to create order',
            message: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestDelete(context) {
    try {
        const { DB } = context.env;
        const url = new URL(context.request.url);
        const orderNumber = url.searchParams.get('order_number');

        // Check admin authentication
        const authHeader = context.request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!orderNumber) {
            return new Response(JSON.stringify({ 
                error: 'Missing order_number parameter' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete order items first (foreign key constraint)
        await DB.prepare(`
            DELETE FROM order_items WHERE order_number = ?
        `).bind(orderNumber).run();

        // Delete order
        const result = await DB.prepare(`
            DELETE FROM orders WHERE order_number = ?
        `).bind(orderNumber).run();

        if (result.meta.changes === 0) {
            return new Response(JSON.stringify({ error: 'Order not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ 
            success: true,
            message: `Order ${orderNumber} deleted successfully`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Orders DELETE Error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to delete order',
            message: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
