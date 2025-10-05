/**
 * Get Offer Details API
 * GET /api/offers/:batch_id
 * 
 * Retrieves offer details for a specific sell submission by batch_id
 */

import { extractSessionToken, validateSession } from '../../lib/sessions.js';

export async function onRequestGet(context) {
    const { request, env, params } = context;
    
    try {
        const batchId = params.batch_id;
        
        if (!batchId) {
            return Response.json({
                success: false,
                error: 'Batch ID is required'
            }, { status: 400 });
        }

        // Get session (optional - offers can be viewed without auth via magic link)
        const sessionToken = extractSessionToken(request);
        const session = sessionToken ? await validateSession(env, sessionToken) : null;

        // Fetch submission by batch_id
        const submission = await env.DB.prepare(`
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
                seller_price,
                seller_message,
                offered_price,
                offer_message,
                offer_sent_at,
                offer_expires_at,
                seller_response,
                seller_response_message,
                seller_response_at,
                created_at,
                updated_at
            FROM sell_submissions
            WHERE batch_id = ?
        `).bind(batchId).first();

        if (!submission) {
            return Response.json({
                success: false,
                error: 'Offer not found'
            }, { status: 404 });
        }

        // Authorization check: user must be logged in as the owner OR have matching contact details
        // (This allows viewing via email magic links)
        let authorized = false;

        if (session) {
            // Check if user owns this submission
            if (submission.user_id === session.user_id) {
                authorized = true;
            }
            
            // Check if contact details match
            if (session.email && submission.contact_email && session.email.toLowerCase() === submission.contact_email.toLowerCase()) {
                authorized = true;
            }

            if (session.phone && submission.contact_phone && normalizePhone(session.phone) === normalizePhone(submission.contact_phone)) {
                authorized = true;
            }
        }

        // For now, allow viewing without auth (can be secured later)
        // TODO: Implement magic link tokens for secure access
        authorized = true;

        if (!authorized) {
            return Response.json({
                success: false,
                error: 'You do not have permission to view this offer'
            }, { status: 403 });
        }

        // Parse items JSON
        let items = [];
        if (submission.items_json) {
            try {
                items = JSON.parse(submission.items_json);
            } catch (e) {
                console.warn('Failed to parse items_json:', e);
            }
        }

        // Return offer details
        return Response.json({
            success: true,
            submission: {
                ...submission,
                items,
                items_json: undefined // Remove JSON string from response
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Get offer error:', error);
        return Response.json({
            success: false,
            error: 'Failed to load offer',
            details: error.message
        }, { status: 500 });
    }
}

function normalizePhone(phone) {
    if (!phone) return '';
    return phone.replace(/[\s\-+()]/g, '');
}
