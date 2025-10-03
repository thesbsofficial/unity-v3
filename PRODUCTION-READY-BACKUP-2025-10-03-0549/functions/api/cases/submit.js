// Submit case with photos
// functions/api/cases/submit.js

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const data = await request.json();

        // Validate required fields
        const required = ['category', 'brand', 'condition', 'price', 'address', 'city', 'phone', 'socialChannel', 'socialHandle'];
        for (const field of required) {
            if (!data[field]) {
                return Response.json({ error: `Missing required field: ${field}` }, { status: 400 });
            }
        }

        // Check if user is logged in (get token from Authorization header)
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        let userId = null;

        if (token) {
            // Verify session and get user_id
            const session = await env.DB.prepare(
                'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")'
            ).bind(token).first();

            if (session) {
                userId = session.user_id;
            }
        }

        // Generate case ID
        const year = new Date().getFullYear();
        const caseNumber = await getNextCaseNumber(env.DB, year);
        const caseId = `CASE-${year}-${String(caseNumber).padStart(3, '0')}`;

        // Insert case into D1 (with user_id if logged in)
        const insertResult = await env.DB.prepare(`
            INSERT INTO sell_cases (
                case_id, user_id, category, brand, condition, size, price,
                address, city, eircode, defects,
                phone, preferred_contact, social_handle, email,
                photo_count, save_profile
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            caseId,
            userId,  // Will be NULL if not logged in, integer if logged in
            data.category,
            data.brand,
            data.condition,
            data.size || null,
            data.price,
            data.address,
            data.city,
            data.eircode || null,
            data.defects || null,
            data.phone,
            data.socialChannel,
            data.socialHandle,
            data.email || null,
            data.uploadedFiles ? data.uploadedFiles.length : 0,
            data.saveProfile ? 1 : 0
        ).run();

        // Move photos from temp to permanent case folder (if any)
        if (data.uploadedFiles && data.uploadedFiles.length > 0) {
            for (const file of data.uploadedFiles) {
                const newKey = `cases/${caseId}/${file.filename}`;

                // Copy from temp to permanent
                const tempObject = await env.USER_UPLOADS.get(file.r2Key);
                if (tempObject) {
                    await env.USER_UPLOADS.put(newKey, tempObject.body, {
                        httpMetadata: {
                            contentType: file.mimeType
                        },
                        customMetadata: {
                            caseId: caseId,
                            originalName: file.filename,
                            uploadedAt: new Date().toISOString()
                        }
                    });

                    // Delete temp file
                    await env.USER_UPLOADS.delete(file.r2Key);

                    // Store reference in D1
                    await env.DB.prepare(`
                        INSERT INTO case_photos (case_id, filename, r2_key, file_size, mime_type)
                        VALUES (?, ?, ?, ?, ?)
                    `).bind(caseId, file.filename, newKey, file.size, file.mimeType).run();
                }
            }
        }

        // If user wants to save profile, trigger registration email
        if (data.saveProfile && data.email) {
            // TODO: Send registration email
            await env.DB.prepare(`
                UPDATE sell_cases SET registration_email_sent = 1 WHERE case_id = ?
            `).bind(caseId).run();
        }

        return Response.json({
            success: true,
            caseId,
            message: 'Case submitted successfully',
            photosUploaded: data.uploadedFiles ? data.uploadedFiles.length : 0
        });

    } catch (error) {
        console.error('Case submission error:', error);
        return Response.json({
            error: 'Submission failed',
            details: error.message
        }, { status: 500 });
    }
}

async function getNextCaseNumber(db, year) {
    const result = await db.prepare(`
        SELECT MAX(CAST(SUBSTR(case_id, -3) AS INTEGER)) as max_num
        FROM sell_cases
        WHERE case_id LIKE ?
    `).bind(`CASE-${year}-%`).first();

    return (result?.max_num || 0) + 1;
}
