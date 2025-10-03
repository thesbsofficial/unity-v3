/**
 * PATCH /api/admin/update-image-metadata
 * 
 * Updates metadata for a Cloudflare Images image
 * Admin-only endpoint
 */

export async function onRequestPatch({ request, env }) {
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

        if (!userResult || !userResult.is_admin) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Admin access required' 
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse request body
        const { imageId, metadata } = await request.json();

        if (!imageId || !metadata) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Missing imageId or metadata' 
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

        // Update metadata in Cloudflare Images
        const updateUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`;
        
        const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ metadata })
        });

        const updateResult = await updateResponse.json();

        if (!updateResponse.ok || !updateResult.success) {
            console.error('CF Images update failed:', updateResult);
            return new Response(JSON.stringify({ 
                success: false, 
                error: updateResult.errors?.[0]?.message || 'Failed to update image metadata' 
            }), {
                status: updateResponse.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Metadata updated successfully',
            imageId: imageId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Update metadata error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Internal server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
