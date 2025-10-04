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
            const emailResult = await sendRegistrationEmail(env, {
                caseId,
                email: data.email,
                socialHandle: data.socialHandle,
                socialChannel: data.socialChannel,
                city: data.city
            });

            if (emailResult.sent) {
                await env.DB.prepare(`
                    UPDATE sell_cases SET registration_email_sent = 1 WHERE case_id = ?
                `).bind(caseId).run();
            } else {
                console.warn(`⚠️ Registration email skipped for case ${caseId}:`, emailResult.reason);
            }
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

async function sendRegistrationEmail(env, payload) {
    const apiKey = env.RESEND_API_KEY;

    if (!apiKey) {
        return { sent: false, reason: 'RESEND_API_KEY not configured' };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'SBS Team <noreply@thesbsofficial.com>',
                to: [payload.email],
                subject: '👋 Welcome to SBS — Let’s get you set up',
                html: buildRegistrationEmailHtml(payload)
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Resend error ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log(`✅ Registration email sent for case ${payload.caseId}:`, result.id);
        return { sent: true, id: result.id };
    } catch (error) {
        console.error('Registration email send failed:', error);
        return { sent: false, reason: error.message };
    }
}

function buildRegistrationEmailHtml({ caseId, socialHandle, socialChannel, city }) {
    const handle = socialHandle ? `@${socialHandle}` : 'your profile';
    const channelLabel = socialChannel === 'snapchat' ? 'Snapchat' : 'Instagram';
    const location = city ? ` in ${city}` : '';

    return `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0a0a0a; color:#fff; padding:32px;">
            <div style="max-width:560px; margin:0 auto; background:#141414; border:1px solid rgba(255,215,0,0.2); border-radius:18px; overflow:hidden;">
                <div style="padding:32px; text-align:center; background:linear-gradient(135deg, rgba(255,215,0,0.12), transparent);">
                    <h1 style="margin:0; font-size:28px; letter-spacing:1px; color:#ffd700;">Welcome to SBS</h1>
                    <p style="margin:12px 0 0; font-size:16px; color:#f5f5f5;">We received your sell request ${location}.</p>
                </div>
                <div style="padding:32px;">
                    <p style="margin:0 0 16px; font-size:16px; color:#f5f5f5;">
                        Thanks for trusting us with your drop! Your submission <strong>${caseId}</strong> is in the queue.
                    </p>
                    <div style="background:rgba(255,215,0,0.08); border-radius:12px; padding:20px; margin-bottom:20px;">
                        <p style="margin:0; font-size:15px; color:#ffd700; font-weight:600;">Submission Snapshot</p>
                        <ul style="margin:12px 0 0; padding-left:18px; color:#e5e5e5; font-size:14px; line-height:1.6;">
                            <li>Handle: <strong>${handle}</strong> (${channelLabel})</li>
                            <li>Status: Pending review by the SBS buying team</li>
                            <li>Response: We aim to reply within 60 minutes during service hours</li>
                        </ul>
                    </div>
                    <p style="margin:0 0 16px; font-size:15px; color:#d1d1d1;">
                        Want faster checkouts and same-day collection updates? Finish setting up your SBS seller profile and we’ll keep everything synced automatically.
                    </p>
                    <div style="text-align:center; margin:32px 0;">
                        <a href="https://thesbsofficial.com/register" style="display:inline-block; padding:14px 28px; background:linear-gradient(135deg,#ffd700,#ffc400); color:#000; font-weight:700; border-radius:999px; text-decoration:none; letter-spacing:0.5px;">Complete Your Profile</a>
                    </div>
                    <p style="margin:0; font-size:13px; color:#888; text-align:center;">
                        Questions? Reply to this email or DM us on Instagram. We’re here to help.
                    </p>
                </div>
            </div>
        </div>
    `;
}
