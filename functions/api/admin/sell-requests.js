/**
 * Admin Sell Requests Management API
 * /api/admin/sell-requests
 *
 * Handles:
 * - GET: List all sell submissions with filtering
 * - GET /:id: Get specific submission details
 * - PUT /:id: Update submission status, add admin notes, set pricing
 * - DELETE /:id: Delete submission
 */

import { verifyAdminAuth } from '../../lib/admin.js';
import { logAdminAction } from '../../lib/admin.js';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Auth check
    const authResult = await verifyAdminAuth(request, env);
    if (!authResult.success) {
        return Response.json({
            success: false,
            error: 'Unauthorized'
        }, { status: 401 });
    }

    const method = request.method;
    const submissionId = pathParts[pathParts.length - 1];
    const isIdRequest = !isNaN(parseInt(submissionId));

    try {
        if (method === 'GET' && !isIdRequest) {
            return await handleGetSubmissions(context, authResult.adminId);
        } else if (method === 'GET' && isIdRequest) {
            return await handleGetSubmissionDetails(context, submissionId, authResult.adminId);
        } else if (method === 'PUT' && isIdRequest) {
            return await handleUpdateSubmission(context, submissionId, authResult.adminId);
        } else if (method === 'DELETE' && isIdRequest) {
            return await handleDeleteSubmission(context, submissionId, authResult.adminId);
        } else {
            return Response.json({
                success: false,
                error: 'Method not allowed'
            }, { status: 405 });
        }
    } catch (error) {
        console.error('❌ Sell requests API error:', error);
        return Response.json({
            success: false,
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}

/**
 * GET /api/admin/sell-requests
 * List all sell submissions with filtering
 */
async function handleGetSubmissions(context, adminId) {
    const { request, env } = context;
    const url = new URL(request.url);

    // Query parameters
    const status = url.searchParams.get('status'); // pending, reviewing, approved, rejected, completed
    const batchId = url.searchParams.get('batch_id');
    const search = url.searchParams.get('search'); // search by phone, email, handle
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = (page - 1) * limit;

    try {
        // Build query
        let conditions = [];
        let params = [];

        if (status) {
            conditions.push('status = ?');
            params.push(status);
        }

        if (batchId) {
            conditions.push('batch_id = ?');
            params.push(batchId);
        }

        if (search) {
            conditions.push(
                '(contact_phone LIKE ? OR contact_email LIKE ? OR contact_handle LIKE ? OR batch_id LIKE ?)'
            );
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        const whereClause = conditions.length > 0
            ? 'WHERE ' + conditions.join(' AND ')
            : '';

        // Get submissions
        const query = `
            SELECT
                id,
                batch_id,
                user_id,
                status,
                items_json,
                contact_phone,
                contact_channel,
                contact_handle,
                contact_email,
                address,
                city,
                eircode,
                notes,
                admin_notes,
                estimated_value,
                offered_price,
                final_price,
                reviewed_at,
                reviewed_by,
                created_at,
                updated_at
            FROM sell_submissions
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

        const result = await env.DB.prepare(query)
            .bind(...params, limit, offset)
            .all();

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM sell_submissions
            ${whereClause}
        `;
        const countResult = await env.DB.prepare(countQuery)
            .bind(...params)
            .first();

        // Parse items_json and calculate stats
        const submissions = result.results.map(sub => {
            const items = JSON.parse(sub.items_json || '[]');
            return {
                ...sub,
                items,
                item_count: items.length,
                items_json: undefined // Remove raw JSON from response
            };
        });

        // Get status summary
        const statusSummary = await env.DB.prepare(`
            SELECT
                status,
                COUNT(*) as count,
                SUM(json_array_length(items_json)) as total_items
            FROM sell_submissions
            GROUP BY status
        `).all();

        // Log action
        await logAdminAction(env.DB, adminId, 'view_sell_requests', null, {
            filters: { status, batchId, search },
            results_count: submissions.length
        });

        return Response.json({
            success: true,
            submissions,
            pagination: {
                page,
                limit,
                total: countResult.total,
                total_pages: Math.ceil(countResult.total / limit)
            },
            summary: statusSummary.results
        });

    } catch (error) {
        console.error('❌ Get submissions error:', error);
        throw error;
    }
}

/**
 * GET /api/admin/sell-requests/:id
 * Get detailed submission information
 */
async function handleGetSubmissionDetails(context, submissionId, adminId) {
    const { env } = context;

    try {
        const submission = await env.DB.prepare(`
            SELECT
                s.*,
                u.name as user_name,
                u.email as user_email,
                a.name as reviewer_name
            FROM sell_submissions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN users a ON s.reviewed_by = a.id
            WHERE s.id = ?
        `).bind(submissionId).first();

        if (!submission) {
            return Response.json({
                success: false,
                error: 'Submission not found'
            }, { status: 404 });
        }

        // Parse items
        submission.items = JSON.parse(submission.items_json || '[]');
        delete submission.items_json;

        // Get history of changes (from audit log)
        const history = await env.DB.prepare(`
            SELECT
                action,
                metadata,
                created_at,
                u.name as admin_name
            FROM admin_audit_log a
            LEFT JOIN users u ON a.admin_id = u.id
            WHERE a.action LIKE '%sell_request%'
                AND json_extract(a.metadata, '$.submission_id') = ?
            ORDER BY a.created_at DESC
        `).bind(submissionId).all();

        // Log view
        await logAdminAction(env.DB, adminId, 'view_sell_request_details', submissionId, {
            batch_id: submission.batch_id
        });

        return Response.json({
            success: true,
            submission,
            history: history.results
        });

    } catch (error) {
        console.error('❌ Get submission details error:', error);
        throw error;
    }
}

/**
 * PUT /api/admin/sell-requests/:id
 * Update submission status, pricing, notes
 */
async function handleUpdateSubmission(context, submissionId, adminId) {
    const { request, env } = context;
    const updates = await request.json();

    try {
        // Get current submission
        const current = await env.DB.prepare(
            'SELECT * FROM sell_submissions WHERE id = ?'
        ).bind(submissionId).first();

        if (!current) {
            return Response.json({
                success: false,
                error: 'Submission not found'
            }, { status: 404 });
        }

        // Build update query dynamically
        const allowedFields = [
            'status',
            'admin_notes',
            'estimated_value',
            'offered_price',
            'final_price',
            'reviewed_by',
            'reviewed_at'
        ];

        const updateFields = [];
        const params = [];

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = ?`);
                params.push(updates[key]);
            }
        });

        // Auto-set reviewed_by and reviewed_at if status is changing
        if (updates.status && updates.status !== current.status) {
            if (!updateFields.includes('reviewed_by = ?')) {
                updateFields.push('reviewed_by = ?');
                params.push(adminId);
            }
            if (!updateFields.includes('reviewed_at = ?')) {
                updateFields.push('reviewed_at = CURRENT_TIMESTAMP');
            }
        }

        // Add updated_at
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        if (updateFields.length === 0) {
            return Response.json({
                success: false,
                error: 'No valid fields to update'
            }, { status: 400 });
        }

        // Execute update
        params.push(submissionId); // For WHERE clause
        const query = `
            UPDATE sell_submissions
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `;

        await env.DB.prepare(query).bind(...params).run();

        // Get updated submission
        const updated = await env.DB.prepare(
            'SELECT * FROM sell_submissions WHERE id = ?'
        ).bind(submissionId).first();

        updated.items = JSON.parse(updated.items_json || '[]');
        delete updated.items_json;

        // Log action
        await logAdminAction(env.DB, adminId, 'update_sell_request', submissionId, {
            batch_id: updated.batch_id,
            updates,
            old_status: current.status,
            new_status: updated.status
        });

        return Response.json({
            success: true,
            submission: updated,
            message: 'Submission updated successfully'
        });

    } catch (error) {
        console.error('❌ Update submission error:', error);
        throw error;
    }
}

/**
 * DELETE /api/admin/sell-requests/:id
 * Delete a submission
 */
async function handleDeleteSubmission(context, submissionId, adminId) {
    const { env } = context;

    try {
        // Get submission for logging
        const submission = await env.DB.prepare(
            'SELECT batch_id, status FROM sell_submissions WHERE id = ?'
        ).bind(submissionId).first();

        if (!submission) {
            return Response.json({
                success: false,
                error: 'Submission not found'
            }, { status: 404 });
        }

        // Delete submission
        await env.DB.prepare(
            'DELETE FROM sell_submissions WHERE id = ?'
        ).bind(submissionId).run();

        // Log action
        await logAdminAction(env.DB, adminId, 'delete_sell_request', submissionId, {
            batch_id: submission.batch_id,
            status: submission.status
        });

        return Response.json({
            success: true,
            message: 'Submission deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete submission error:', error);
        throw error;
    }
}
