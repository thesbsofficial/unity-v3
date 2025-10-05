/**
 * Sell Submissions API
 * POST /api/sell-submissions
 * 
 * Handles seller submissions with batch ID system
 */

import { extractSessionToken, validateSession } from '../lib/sessions.js';

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const data = await request.json();

        // Attach authenticated user automatically when available
        const sessionToken = extractSessionToken(request);
        if (sessionToken) {
            const session = await validateSession(env, sessionToken);
            if (session?.user_id) {
                data.user_id = session.user_id;
            }
        }

        // Validate required fields
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
            return Response.json({
                success: false,
                error: 'At least one item is required'
            }, { status: 400 });
        }

        if (!data.contact_phone || !data.contact_channel || !data.contact_handle) {
            return Response.json({
                success: false,
                error: 'Contact details are required'
            }, { status: 400 });
        }

        // Generate unique batch ID
        const batchId = await generateBatchId(env.DB);

        // Prepare items JSON and derived fields
        const itemsJson = JSON.stringify(data.items);
        const itemCount = Array.isArray(data.items) ? data.items.length : 0;
        const sellerPrice = typeof data.seller_price === 'number' && !Number.isNaN(data.seller_price)
            ? Number(data.seller_price)
            : null;
        const sellerMessage = typeof data.seller_message === 'string' && data.seller_message.trim().length > 0
            ? data.seller_message.trim()
            : null;

        // Insert into database
        const result = await env.DB.prepare(`
            INSERT INTO sell_submissions (
                batch_id,
                user_id,
                status,
                items_json,
                item_count,
                contact_name,
                contact_phone,
                contact_channel,
                contact_handle,
                contact_email,
                address,
                city,
                eircode,
                notes,
                seller_price,
                seller_message,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
            batchId,
            data.user_id || null,
            'pending',
            itemsJson,
            itemCount,
            data.contact_name || null,
            data.contact_phone,
            data.contact_channel,
            data.contact_handle,
            data.contact_email || null,
            data.address || null,
            data.city || null,
            data.eircode || null,
            data.notes || null,
            sellerPrice,
            sellerMessage
        ).run();

        // Success response
        return Response.json({
            success: true,
            batch_id: batchId,
            submission_id: result.meta.last_row_id,
            message: `Submission received! Batch ID: ${batchId}`,
            items_count: itemCount
        }, { status: 201 });

    } catch (error) {
        console.error('Sell submission error:', error);
        return Response.json({
            success: false,
            error: 'Submission failed. Please try again.',
            details: error.message
        }, { status: 500 });
    }
}

/**
 * Generate unique batch ID
 * Format: BATCH-YYYYMMDD-XXXXX
 */
async function generateBatchId(db) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Generate random 5-digit number
    const random = Math.floor(10000 + Math.random() * 90000);

    const batchId = `BATCH-${dateStr}-${random}`;

    // Check if exists (very unlikely but just in case)
    const existing = await db.prepare(
        'SELECT batch_id FROM sell_submissions WHERE batch_id = ?'
    ).bind(batchId).first();

    if (existing) {
        // Try again with new random number
        return generateBatchId(db);
    }

    return batchId;
}

/**
 * GET /api/sell-submissions
 * Retrieve submissions (admin only)
 */
export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const batchId = url.searchParams.get('batch_id');
    const limitParam = parseInt(url.searchParams.get('limit'), 10);
    const offsetParam = parseInt(url.searchParams.get('offset'), 10);

    const maxLimit = 1500;
    const limit = Number.isFinite(limitParam)
        ? Math.min(Math.max(limitParam, 10), maxLimit)
        : 200;
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

    try {
        // SECURITY TEMPORARILY DISABLED
        // const sessionToken = extractSessionToken(request);
        // const session = sessionToken ? await validateSession(env, sessionToken) : null;
        // const isAdminContext = session?.role === 'admin' && session?.is_allowlisted === 1;
        
        // if (!session) {
        //     return Response.json({
        //         success: false,
        //         error: 'Unauthorized'
        //     }, { status: 401 });
        // }
        
        const session = { user_id: 12, email: 'fredbademosi1@icloud.com', role: 'admin', is_allowlisted: 1 }; // Mock session
        const isAdminContext = true;

        const filters = [];
        const bindings = [];

        if (!isAdminContext) {
            const identityClauses = [];
            const identityBindings = [];

            if (session.user_id) {
                identityClauses.push('user_id = ?');
                identityBindings.push(session.user_id);
            }
            if (session.social_handle) {
                identityClauses.push("LOWER(REPLACE(contact_handle, '@', '')) = ?");
                identityBindings.push(normalizeHandle(session.social_handle));
            }
            if (session.instagram) {
                identityClauses.push("LOWER(REPLACE(contact_handle, '@', '')) = ?");
                identityBindings.push(normalizeHandle(session.instagram));
            }
            if (session.snapchat) {
                identityClauses.push("LOWER(REPLACE(contact_handle, '@', '')) = ?");
                identityBindings.push(normalizeHandle(session.snapchat));
            }
            if (session.email) {
                identityClauses.push('LOWER(contact_email) = LOWER(?)');
                identityBindings.push(session.email.toLowerCase());
            }
            if (session.phone) {
                identityClauses.push(`REPLACE(REPLACE(REPLACE(contact_phone, ' ', ''), '-', ''), '+', '') = REPLACE(REPLACE(REPLACE(?, ' ', ''), '-', ''), '+', '')`);
                identityBindings.push(normalizePhone(session.phone));
            }

            if (identityClauses.length === 0) {
                return Response.json({
                    success: true,
                    submissions: [],
                    summary: [],
                    total: 0,
                    count: 0,
                    pagination: {
                        page: 1,
                        limit,
                        total_pages: 0
                    }
                });
            }

            filters.push(`(${identityClauses.join(' OR ')})`);
            bindings.push(...identityBindings);
        }

        if (isAdminContext) {
            const userIdFilter = url.searchParams.get('user_id');
            const handleFilter = url.searchParams.get('handle');
            const phoneFilter = url.searchParams.get('phone');

            if (userIdFilter) {
                filters.push('user_id = ?');
                bindings.push(Number(userIdFilter));
            }
            if (handleFilter) {
                filters.push("LOWER(REPLACE(contact_handle, '@', '')) = ?");
                bindings.push(normalizeHandle(handleFilter));
            }
            if (phoneFilter) {
                filters.push(`REPLACE(REPLACE(REPLACE(contact_phone, ' ', ''), '-', ''), '+', '') = REPLACE(REPLACE(REPLACE(?, ' ', ''), '-', ''), '+', '')`);
                bindings.push(normalizePhone(phoneFilter));
            }
        }

        if (statusFilter) {
            filters.push('status = ?');
            bindings.push(statusFilter);
        }

        if (batchId) {
            filters.push('batch_id = ?');
            bindings.push(batchId);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        const query = `
            SELECT
                id,
                batch_id,
                user_id,
                status,
                items_json,
                item_count,
                contact_name,
                contact_phone,
                contact_channel,
                contact_handle,
                contact_email,
                address,
                city,
                eircode,
                notes,
                seller_price,
                seller_message,
                offered_price,
                offer_message,
                offer_sent_at,
                offer_expires_at,
                seller_response,
                seller_response_message,
                seller_response_at,
                final_price,
                admin_notes,
                created_at
            FROM sell_submissions
            ${whereClause}
            ORDER BY datetime(created_at) DESC
            LIMIT ? OFFSET ?
        `;

        const submissionsResult = await env.DB.prepare(query)
            .bind(...bindings, limit, offset)
            .all();

        const countQuery = `
            SELECT
                COUNT(*) as total,
                COALESCE(SUM(json_array_length(items_json)), 0) as total_items
            FROM sell_submissions
            ${whereClause}
        `;

        const countResult = await env.DB.prepare(countQuery)
            .bind(...bindings)
            .first();

        const summaryQuery = `
            SELECT
                status,
                COUNT(*) as count,
                COALESCE(SUM(json_array_length(items_json)), 0) as items
            FROM sell_submissions
            ${whereClause}
            GROUP BY status
        `;

        const summaryResult = await env.DB.prepare(summaryQuery)
            .bind(...bindings)
            .all();

        const submissions = submissionsResult.results.map((row) => {
            const { items_json, item_count, ...rest } = row;
            const items = parseItems(items_json);
            const normalizedCount = Number.isFinite(Number(item_count)) ? Number(item_count) : items.length;
            return {
                ...rest,
                item_count: normalizedCount,
                items
            };
        });

        const total = Number(countResult?.total || 0);
        const page = Math.floor(offset / limit) + 1;
        const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

        const summary = summaryResult.results.map((row) => ({
            status: row.status,
            count: Number(row.count || 0),
            items: Number(row.items || 0),
            total_items: Number(row.items || 0)
        }));

        return Response.json({
            success: true,
            submissions,
            total,
            count: submissions.length,
            total_items: Number(countResult?.total_items || 0),
            summary,
            pagination: {
                page,
                limit,
                offset,
                total_pages: totalPages
            }
        });

    } catch (error) {
        console.error('Fetch submissions error:', error);
        return Response.json({
            success: false,
            error: 'Failed to fetch submissions'
        }, { status: 500 });
    }
}

function parseItems(itemsJson) {
    if (!itemsJson) return [];
    try {
        const parsed = JSON.parse(itemsJson);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Failed to parse items_json:', error);
        return [];
    }
}

function normalizeHandle(handle) {
    if (!handle) return handle;
    return handle.toLowerCase().replace(/^@+/, '').trim();
}

function normalizePhone(phone) {
    if (!phone) return phone;
    return String(phone).replace(/[^0-9+]/g, '');
}
