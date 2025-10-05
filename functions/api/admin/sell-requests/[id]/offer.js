/**
 * Admin Send Offer API
 * POST /api/admin/sell-requests/:id/offer
 * 
 * Sends an offer to a customer for their sell submission
 */

import { verifyAdminAuth } from '../../../../lib/admin.js';

export async function onRequestPost(context) {
    const { request, env, params } = context;
    
    try {
        // SECURITY TEMPORARILY DISABLED
        // const session = await verifyAdminAuth(request, env);
        // if (!session) {
        //     return Response.json({
        //         success: false,
        //         error: 'Unauthorized - Admin access required'
        //     }, { status: 401 });
        // }
        const session = { user_id: 12, email: 'fredbademosi1@icloud.com', role: 'admin' };

        const submissionId = parseInt(params.id);
        if (!submissionId || isNaN(submissionId)) {
            return Response.json({
                success: false,
                error: 'Invalid submission ID'
            }, { status: 400 });
        }

        const data = await request.json();
        const { offered_price, offer_message, expires_in_days } = data;

        // Validate required fields
        if (!offered_price || typeof offered_price !== 'number' || offered_price <= 0) {
            return Response.json({
                success: false,
                error: 'Valid offered_price is required'
            }, { status: 400 });
        }

        // Calculate expiry date
        const expiresInDays = expires_in_days && !isNaN(expires_in_days) ? parseInt(expires_in_days) : 7;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiresInDays);
        const offerExpiresAt = expiryDate.toISOString();

        // Check if submission exists
        const submission = await env.DB.prepare(`
            SELECT id, batch_id, user_id, contact_email, contact_phone, contact_channel, contact_handle, contact_name
            FROM sell_submissions
            WHERE id = ?
        `).bind(submissionId).first();

        if (!submission) {
            return Response.json({
                success: false,
                error: 'Submission not found'
            }, { status: 404 });
        }

        // Update submission with offer details
        const result = await env.DB.prepare(`
            UPDATE sell_submissions
            SET 
                offered_price = ?,
                offer_message = ?,
                offer_sent_at = CURRENT_TIMESTAMP,
                offer_expires_at = ?,
                status = 'offer_sent',
                reviewed_by = ?,
                reviewed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(
            offered_price,
            offer_message || null,
            offerExpiresAt,
            session.user_id,
            submissionId
        ).run();

        if (!result.success) {
            throw new Error('Failed to update submission with offer');
        }

        // Send notification to customer
        await notifyCustomerOfOffer(env, submission, offered_price, offer_message, submission.batch_id);

        return Response.json({
            success: true,
            message: 'Offer sent successfully',
            submission_id: submissionId,
            batch_id: submission.batch_id,
            offered_price,
            offer_expires_at: offerExpiresAt
        }, { status: 200 });

    } catch (error) {
        console.error('Send offer error:', error);
        return Response.json({
            success: false,
            error: 'Failed to send offer',
            details: error.message
        }, { status: 500 });
    }
}

/**
 * Notify customer of new offer
 * TODO: Implement actual email/SMS sending via MailChannels or Twilio
 */
async function notifyCustomerOfOffer(env, submission, offeredPrice, offerMessage, batchId) {
    try {
        const customerName = submission.contact_name || 'Customer';
        const offerLink = `https://thesbsofficial.com/offers/${batchId}`;
        
        // Log notification attempt
        console.log('📧 Notification would be sent:', {
            to: submission.contact_email || submission.contact_phone,
            subject: 'New Offer from SBS',
            batch_id: batchId,
            offered_price: offeredPrice,
            link: offerLink
        });

        // Store notification in database (optional)
        try {
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
                submission.user_id || null,
                'offer_sent',
                'New Offer Received',
                `You've received an offer of €${offeredPrice} for your submission ${batchId}`,
                JSON.stringify({
                    batch_id: batchId,
                    offered_price: offeredPrice,
                    offer_link: offerLink
                })
            ).run();
        } catch (dbError) {
            // Notification table might not exist yet - that's okay
            console.warn('Could not store notification in DB:', dbError.message);
        }

        // TODO: Actual email sending
        // if (submission.contact_email) {
        //     await sendEmail(env, {
        //         to: submission.contact_email,
        //         subject: `New Offer: €${offeredPrice} - SBS`,
        //         html: `
        //             <h1>You've Received an Offer!</h1>
        //             <p>Hi ${customerName},</p>
        //             <p>We've reviewed your items and are pleased to offer you <strong>€${offeredPrice}</strong>.</p>
        //             ${offerMessage ? `<p><em>${offerMessage}</em></p>` : ''}
        //             <p><a href="${offerLink}">View and respond to your offer</a></p>
        //         `
        //     });
        // }

        // TODO: SMS sending via Twilio
        // if (submission.contact_phone) {
        //     await sendSMS(env, {
        //         to: submission.contact_phone,
        //         message: `SBS: New offer €${offeredPrice} for ${batchId}. View: ${offerLink}`
        //     });
        // }

        return { success: true };
    } catch (error) {
        console.error('Notification error:', error);
        // Don't fail the offer if notification fails
        return { success: false, error: error.message };
    }
}
