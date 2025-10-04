/**
 * 🛍️ Admin Products Management API
 * Complete CRUD operations for product inventory
 * Routes: GET, POST, PUT, DELETE /api/admin/products
 */

import { verifyAdminAuth, logAdminAction } from '../../lib/admin.js';

// Common response helper
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}

// GET /api/admin/products - List all products with filters
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

        // Extract query parameters
        const category = url.searchParams.get('category');
        const status = url.searchParams.get('status') || 'available';
        const search = url.searchParams.get('search');
        const sortBy = url.searchParams.get('sort') || 'created_at';
        const sortOrder = url.searchParams.get('order') || 'DESC';
        const limit = parseInt(url.searchParams.get('limit')) || 100;
        const offset = parseInt(url.searchParams.get('offset')) || 0;

        // Build query
        let query = `
            SELECT
                id,
                category,
                size,
                brand,
                description,
                condition,
                price,
                original_price,
                image_url,
                cloudflare_image_id,
                status,
                featured,
                sku,
                tags,
                created_at,
                updated_at,
                sold_at
            FROM products
            WHERE 1=1
        `;

        const params = [];

        // Apply filters
        if (category && category !== 'all') {
            query += ' AND category = ?';
            params.push(category);
        }

        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (brand LIKE ? OR description LIKE ? OR sku LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Add sorting
        const allowedSorts = ['created_at', 'updated_at', 'price', 'brand', 'category'];
        const sortColumn = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
        const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortColumn} ${sortDir}`;

        // Add pagination
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        // Execute query
        const stmt = params.length > 0
            ? env.DB.prepare(query).bind(...params)
            : env.DB.prepare(query);

        const products = await stmt.all();

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
        const countParams = [];

        if (category && category !== 'all') {
            countQuery += ' AND category = ?';
            countParams.push(category);
        }

        if (status && status !== 'all') {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        if (search) {
            countQuery += ' AND (brand LIKE ? OR description LIKE ? OR sku LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        const countStmt = countParams.length > 0
            ? env.DB.prepare(countQuery).bind(...countParams)
            : env.DB.prepare(countQuery);

        const countResult = await countStmt.first();

        // Log admin action
        await logAdminAction(env, session, 'products_list_view', null, {
            filters: { category, status, search },
            result_count: products.results?.length || 0
        });

        return jsonResponse({
            success: true,
            data: {
                products: products.results || [],
                pagination: {
                    total: countResult?.total || 0,
                    limit: limit,
                    offset: offset,
                    has_more: (offset + limit) < (countResult?.total || 0)
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching products:', error);
        return jsonResponse({
            success: false,
            error: 'Failed to fetch products',
            details: error.message
        }, 500);
    }
}

// POST /api/admin/products - Create new product
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // Verify admin authentication
        const session = await verifyAdminAuth(request, env);
        if (!session) {
            return jsonResponse({
                success: false,
                error: 'Unauthorized - Admin access required'
            }, 401);
        }

        const body = await request.json();

        // Validate required fields
        const required = ['category', 'size', 'brand', 'price'];
        for (const field of required) {
            if (!body[field]) {
                return jsonResponse({
                    success: false,
                    error: `Missing required field: ${field}`
                }, 400);
            }
        }

        // Validate category
        const validCategories = ['BN-CLOTHES', 'BN-SHOES', 'PO-CLOTHES', 'PO-SHOES'];
        if (!validCategories.includes(body.category)) {
            return jsonResponse({
                success: false,
                error: 'Invalid category. Must be one of: ' + validCategories.join(', ')
            }, 400);
        }

        // Validate condition
        const validConditions = ['new', 'excellent', 'good'];
        const condition = body.condition || 'new';
        if (!validConditions.includes(condition)) {
            return jsonResponse({
                success: false,
                error: 'Invalid condition. Must be one of: ' + validConditions.join(', ')
            }, 400);
        }

        // Generate SKU if not provided
        const sku = body.sku || generateSKU(body.category, body.brand);

        // Insert product
        const result = await env.DB.prepare(`
            INSERT INTO products (
                category, size, brand, description, condition,
                price, original_price, image_url, cloudflare_image_id,
                status, featured, sku, tags, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).bind(
            body.category,
            body.size,
            body.brand,
            body.description || null,
            condition,
            body.price,
            body.original_price || null,
            body.image_url || null,
            body.cloudflare_image_id || null,
            body.status || 'available',
            body.featured ? 1 : 0,
            sku,
            body.tags ? JSON.stringify(body.tags) : null
        ).run();

        const productId = result.meta?.last_row_id;

        // Fetch the created product
        const product = await env.DB.prepare(
            'SELECT * FROM products WHERE id = ?'
        ).bind(productId).first();

        // Log admin action
        await logAdminAction(env, session, 'product_create', `product_${productId}`, {
            product_id: productId,
            category: body.category,
            brand: body.brand,
            price: body.price
        });

        console.log(`✅ Product created: ${productId} - ${body.brand} ${body.category}`);

        return jsonResponse({
            success: true,
            message: 'Product created successfully',
            data: { product }
        }, 201);

    } catch (error) {
        console.error('❌ Error creating product:', error);
        return jsonResponse({
            success: false,
            error: 'Failed to create product',
            details: error.message
        }, 500);
    }
}

// PUT /api/admin/products/:id - Update product
export async function onRequestPut(context) {
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

        // Extract product ID from URL path
        const pathParts = url.pathname.split('/');
        const productId = pathParts[pathParts.length - 1];

        if (!productId || isNaN(productId)) {
            return jsonResponse({
                success: false,
                error: 'Invalid product ID'
            }, 400);
        }

        // Check if product exists
        const existingProduct = await env.DB.prepare(
            'SELECT * FROM products WHERE id = ?'
        ).bind(productId).first();

        if (!existingProduct) {
            return jsonResponse({
                success: false,
                error: 'Product not found'
            }, 404);
        }

        const body = await request.json();

        // Build update query dynamically
        const updates = [];
        const params = [];

        const allowedFields = [
            'category', 'size', 'brand', 'description', 'condition',
            'price', 'original_price', 'image_url', 'cloudflare_image_id',
            'status', 'featured', 'sku', 'tags'
        ];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates.push(`${field} = ?`);

                // Handle special cases
                if (field === 'featured') {
                    params.push(body[field] ? 1 : 0);
                } else if (field === 'tags' && typeof body[field] === 'object') {
                    params.push(JSON.stringify(body[field]));
                } else {
                    params.push(body[field]);
                }
            }
        }

        if (updates.length === 0) {
            return jsonResponse({
                success: false,
                error: 'No valid fields to update'
            }, 400);
        }

        // Add updated_at timestamp
        updates.push('updated_at = datetime("now")');

        // If status is changing to 'sold', set sold_at
        if (body.status === 'sold' && existingProduct.status !== 'sold') {
            updates.push('sold_at = datetime("now")');
        }

        // Add product ID as final parameter
        params.push(productId);

        // Execute update
        await env.DB.prepare(`
            UPDATE products
            SET ${updates.join(', ')}
            WHERE id = ?
        `).bind(...params).run();

        // Fetch updated product
        const updatedProduct = await env.DB.prepare(
            'SELECT * FROM products WHERE id = ?'
        ).bind(productId).first();

        // Log admin action
        await logAdminAction(env, session, 'product_update', `product_${productId}`, {
            product_id: productId,
            updated_fields: Object.keys(body),
            previous_status: existingProduct.status,
            new_status: body.status || existingProduct.status
        });

        console.log(`✅ Product updated: ${productId}`);

        return jsonResponse({
            success: true,
            message: 'Product updated successfully',
            data: { product: updatedProduct }
        });

    } catch (error) {
        console.error('❌ Error updating product:', error);
        return jsonResponse({
            success: false,
            error: 'Failed to update product',
            details: error.message
        }, 500);
    }
}

// DELETE /api/admin/products/:id - Delete product
export async function onRequestDelete(context) {
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

        // Extract product ID from URL path
        const pathParts = url.pathname.split('/');
        const productId = pathParts[pathParts.length - 1];

        if (!productId || isNaN(productId)) {
            return jsonResponse({
                success: false,
                error: 'Invalid product ID'
            }, 400);
        }

        // Check if product exists
        const product = await env.DB.prepare(
            'SELECT * FROM products WHERE id = ?'
        ).bind(productId).first();

        if (!product) {
            return jsonResponse({
                success: false,
                error: 'Product not found'
            }, 404);
        }

        // Soft delete: Mark as removed instead of hard delete
        // This preserves data for order history and analytics
        await env.DB.prepare(`
            UPDATE products
            SET status = 'removed', updated_at = datetime('now')
            WHERE id = ?
        `).bind(productId).run();

        // Log admin action
        await logAdminAction(env, session, 'product_delete', `product_${productId}`, {
            product_id: productId,
            brand: product.brand,
            category: product.category,
            sku: product.sku
        });

        console.log(`✅ Product deleted (soft): ${productId} - ${product.brand}`);

        return jsonResponse({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting product:', error);
        return jsonResponse({
            success: false,
            error: 'Failed to delete product',
            details: error.message
        }, 500);
    }
}

// OPTIONS handler for CORS
export async function onRequestOptions(context) {
    return jsonResponse(null, 204);
}

// Helper function to generate SKU
function generateSKU(category, brand) {
    const prefix = category.substring(0, 2); // BN or PO
    const brandPrefix = brand.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
    return `${prefix}-${brandPrefix}-${timestamp}`;
}
