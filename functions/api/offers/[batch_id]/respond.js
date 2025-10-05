/**
 * Respond to Offer API
 * POST /api/offers/:batch_id/respond
 * 
 * Allows customer to accept, refuse, or counter an offer
 */

import { extractSessionToken, validateSession } from '../../../lib/sessions.js';

export async function onRequestPost(context) {
    const { request, env, params } = context;
    
    try {
        const batchId = params.batch_id;
        
        if (!batchId) {
            return Response.json({
                success: false,
                error: 'Batch ID is required'
            }, { status: 400 });
        }

        const data = await request.json();
        const { action, counter_price, message } = data;

        // Validate action
        if (!action || !['accept', 'refuse', 'counter'].includes(action)) {
            return Response.json({
                success: false,
                error: 'Invalid action. Must be: accept, refuse, or counter'
            }, { status: 400 });
        }

        // Validate counter offer
        if (action === 'counter') {
            if (!counter_price || typeof counter_price !== 'number' || counter_price <= 0) {
                return Response.json({
                    success: false,
                    error: 'Valid counter_price is required for counter offers'
                }, { status: 400 });
            }
        }

        // Get session (optional for now, but recommended)
        const sessionToken = extractSessionToken(request);
        const session = sessionToken ? await validateSession(env, sessionToken) : null;

        // Fetch submission
        const submission = await env.DB.prepare(`
            SELECT id, batch_id, user_id, status, offered_price, offer_expires_at
            FROM sell_submissions
            WHERE batch_id = ?
        `).bind(batchId).first();

        if (!submission) {
            return Response.json({
                success: false,
                error: 'Offer not found'
            }, { status: 404 });
        }

        // Check if offer has expired
        if (submission.offer_expires_at) {
            const expiryDate = new Date(submission.offer_expires_at);
            if (expiryDate < new Date()) {
                return Response.json({
                    success: false,
                    error: 'This offer has expired'
                }, { status: 400 });
            }
        }

        // Update submission based on action
        let newStatus = submission.status;
        let updateQuery = '';
        let bindings = [];

        if (action === 'accept') {
            newStatus = 'accepted';
            updateQuery = `
                UPDATE sell_submissions
                SET 
                    seller_response = 'accepted',
                    seller_response_message = ?,
                    seller_response_at = CURRENT_TIMESTAMP,
                    status = 'accepted',
                    final_price = offered_price
                WHERE batch_id = ?
            `;
            bindings = [message || 'Offer accepted', batchId];
        } else if (action === 'refuse') {
            newStatus = 'refused';
            updateQuery = `
                UPDATE sell_submissions
                SET 
                    seller_response = 'refused',
                    seller_response_message = ?,
                    seller_response_at = CURRENT_TIMESTAMP,
                    status = 'refused'
                WHERE batch_id = ?
            `;
            bindings = [message || 'Offer declined', batchId];
        } else if (action === 'counter') {
            newStatus = 'counter_offer';
            updateQuery = `
                UPDATE sell_submissions
                SET 
                    seller_response = 'counter_offer',
                    seller_response_message = ?,
                    seller_response_at = CURRENT_TIMESTAMP,
                    status = 'counter_offer',
                    seller_price = ?
                WHERE batch_id = ?
            `;
            bindings = [message || `Counter offer: €${counter_price}`, counter_price, batchId];
        }

        const result = await env.DB.prepare(updateQuery).bind(...bindings).run();

        if (!result.success) {
            throw new Error('Failed to update submission');
        }

        // Notify admin of customer response
        await notifyAdminOfResponse(env, submission, action, counter_price, message);

        return Response.json({
            success: true,
            message: `Offer ${action}ed successfully`,
            batch_id: batchId,
            action,
            new_status: newStatus
        }, { status: 200 });

    } catch (error) {
        console.error('Respond to offer error:', error);
        return Response.json({
            success: false,
            error: 'Failed to respond to offer',
            details: error.message
        }, { status: 500 });
    }
}

/**
 * Notify admin of customer response
 * TODO: Implement actual email/SMS notifications
 */
async function notifyAdminOfResponse(env, submission, action, counterPrice, message) {
    try {
        const adminLink = `https://thesbsofficial.com/admin/sell-requests`;
        
        // Log notification attempt
        console.log('🔔 Admin notification would be sent:', {
            submission_id: submission.id,
            batch_id: submission.batch_id,
            action,
            counter_price: counterPrice,
            message,
            link: adminLink
        });

        // Store notification in database
        try {
            // Get admin users
            const admins = await env.DB.prepare(`
                SELECT user_id FROM admin_allowlist WHERE user_id IS NOT NULL
            `).all();

            // Create notification for each admin
            if (admins && admins.results) {
                for (const admin of admins.results) {
                    await env.DB.prepare(`
                        INSERT INTO notifications (
                            user_id,
                            type,
                            title,
                            message,
                            data,
                            created_at
                        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    `).bind(
                        admin.user_id,
                        `offer_${action}`,
                        `Customer ${action}ed offer`,
                        `Submission ${submission.batch_id} - Customer ${action}ed your offer${counterPrice ? ` with counter €${counterPrice}` : ''}`,
                        JSON.stringify({
                            batch_id: submission.batch_id,
                            submission_id: submission.id,
                            action,
                            counter_price: counterPrice,
                            admin_link: adminLink
                        })
                    ).run();
                }
            }
        } catch (dbError) {
            console.warn('Could not store admin notification:', dbError.message);
        }

        // TODO: Send email to admin
        // await sendEmail(env, {
        //     to: 'admin@thesbsofficial.com',
        //     subject: `Customer ${action}ed offer - ${submission.batch_id}`,
        //     html: `
        //         <h1>Customer Response</h1>
        //         <p>Action: ${action}</p>
        //         ${counterPrice ? `<p>Counter Offer: €${counterPrice}</p>` : ''}
        //         ${message ? `<p>Message: ${message}</p>` : ''}
        //         <p><a href="${adminLink}">View in admin panel</a></p>
        //     `
        // });

        return { success: true };
    } catch (error) {
        console.error('Admin notification error:', error);
        return { success: false, error: error.message };
    }
}
