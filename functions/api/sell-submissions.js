/**
 * Sell Submissions API
 * POST /api/sell-submissions
 * 
 * Handles seller submissions with batch ID system
 */

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const data = await request.json();

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

        // Prepare items JSON
        const itemsJson = JSON.stringify(data.items);

        // Insert into database
        const result = await env.DB.prepare(`
            INSERT INTO sell_submissions (
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
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
            batchId,
            data.user_id || null,
            'pending',
            itemsJson,
            data.contact_phone,
            data.contact_channel,
            data.contact_handle,
            data.contact_email || null,
            data.address || null,
            data.city || null,
            data.eircode || null,
            data.notes || null
        ).run();

        // Success response
        return Response.json({
            success: true,
            batch_id: batchId,
            submission_id: result.meta.last_row_id,
            message: `Submission received! Batch ID: ${batchId}`,
            items_count: data.items.length
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
    const status = url.searchParams.get('status');
    const batchId = url.searchParams.get('batch_id');

    try {
        let query = 'SELECT * FROM sell_submissions';
        const params = [];

        if (batchId) {
            query += ' WHERE batch_id = ?';
            params.push(batchId);
        } else if (status) {
            query += ' WHERE status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT 100';

        const result = await env.DB.prepare(query).bind(...params).all();

        // Parse items_json for each submission
        const submissions = result.results.map(sub => ({
            ...sub,
            items: JSON.parse(sub.items_json)
        }));

        return Response.json({
            success: true,
            submissions,
            count: submissions.length
        });

    } catch (error) {
        console.error('Fetch submissions error:', error);
        return Response.json({
            success: false,
            error: 'Failed to fetch submissions'
        }, { status: 500 });
    }
}
