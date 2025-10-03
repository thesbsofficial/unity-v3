/**
 * DELETE /api/admin/delete-image
 * 
 * Deletes an image from Cloudflare Images
 * Admin-only endpoint
 */

export async function onRequestDelete({ request, env }) {
    // Check authentication
    const cookie = request.headers.get('Cookie') || '';
    const sessionId = cookie.split('session_id=')[1]?.split(';')[0];
    
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
        // Verify admin user
        const userResult = await env.DB.prepare(
            'SELECT u.*, s.user_id FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_id = ? AND s.expires_at > ?'
        ).bind(sessionId, Date.now()).first();

        if (!userResult) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Session not found or expired' 
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (userResult.role !== 'admin') {
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
