/**
 * DELETE /api/admin/delete-image
 * 
 * Deletes an image from Cloudflare Images
 * Admin-only endpoint
 */

// Hash function for session tokens
async function sha256b64(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return btoa(String.fromCharCode(...hashArray));
}

export async function onRequestDelete({ request, env }) {
    // Check authentication
    const cookie = request.headers.get('Cookie') || '';
    const sessionId = cookie.split('sbs_session=')[1]?.split(';')[0];

    if (!sessionId) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Not authenticated'
        }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Hash the session token to match database format
        const sessionHash = await sha256b64(sessionId);

        // Verify admin user - simplified query
        const sessionResult = await env.DB.prepare(
            'SELECT user_id, expires_at FROM sessions WHERE token = ? AND invalidated_at IS NULL'
        ).bind(sessionHash).first();

        if (!sessionResult) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Session not found. Please log in again.'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if session expired
        const now = new Date().toISOString();
        if (sessionResult.expires_at < now) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Session expired. Please log in again.'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get user details
        const userResult = await env.DB.prepare(
            'SELECT role FROM users WHERE id = ?'
        ).bind(sessionResult.user_id).first();

        if (!userResult || userResult.role !== 'admin') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Admin access required'
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse request body
        const { imageId } = await request.json();

        if (!imageId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing imageId'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get Cloudflare credentials
        const accountId = env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = env.CLOUDFLARE_IMAGES_API_TOKEN || env.CLOUDFLARE_API_TOKEN;

        if (!accountId || !apiToken) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing Cloudflare credentials'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete image from Cloudflare Images
        const deleteUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`;

        const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${apiToken}`
            }
        });

        const deleteResult = await deleteResponse.json();

        if (!deleteResponse.ok || !deleteResult.success) {
            console.error('CF Images delete failed:', deleteResult);
            return new Response(JSON.stringify({
                success: false,
                error: deleteResult.errors?.[0]?.message || 'Failed to delete image'
            }), {
                status: deleteResponse.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Image deleted successfully',
            imageId: imageId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Delete image error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Internal server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
