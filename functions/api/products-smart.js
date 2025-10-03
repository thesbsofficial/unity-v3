// 🛍️ SBS PRODUCTS API - SMART D1 INVENTORY WITH CLOUDFLARE IMAGES
// 🎯 D1 tracks stock/status/analytics, CF Images stores rich metadata
// 📊 Real-time trend detection and inventory intelligence

import { getSizesForCategory } from '../../public/js/taxonomy.js';

export async function onRequest(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const useD1 = url.searchParams.has('smart') || true; // Always use smart mode
    const includeHidden = url.searchParams.has('includeHidden');

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        console.log('🚀 SBS API: Fetching smart inventory from D1...');
        
        const db = env.DB;
        
        // 📊 GET ACTIVE PRODUCTS FROM D1
        const statusFilter = includeHidden ? "status IN ('active', 'hidden')" : "status = 'active'";
        
        const dbProducts = await db.prepare(`
            SELECT 
                id,
                image_id,
                category,
                size,
                condition,
                status,
                quantity_available,
                quantity_sold,
                views_count,
                created_at,
                sold_at,
                days_to_sell,
                notes
            FROM products
            WHERE ${statusFilter}
            ORDER BY created_at DESC
        `).all();

        if (!dbProducts.results || dbProducts.results.length === 0) {
            console.log('⚠️ No products in D1, falling back to CF Images discovery...');
            return await discoverFromCloudflare(env, corsHeaders, includeHidden);
        }

        console.log(`✅ Found ${dbProducts.results.length} products in D1`);

        // 🖼️ FETCH RICH METADATA FROM CLOUDFLARE IMAGES
        const accountId = env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_IMAGES_API_TOKEN;
        const deliveryHash = env.CLOUDFLARE_IMAGES_HASH || env.CLOUDFLARE_DELIVERY_HASH;

        let cfImagesMap = {};
        
        if (accountId && apiToken) {
            const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`;
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const images = Array.isArray(data.result) ? data.result : data.result?.images || [];
                
                // Map images by ID
                images.forEach(img => {
                    cfImagesMap[img.id] = img;
                });
            }
        }

        // 🎯 MERGE D1 DATA WITH CF IMAGES METADATA
        const enrichedProducts = dbProducts.results.map(product => {
            const cfImage = cfImagesMap[product.image_id];
            const meta = cfImage?.meta || cfImage?.metadata || {};
            const variants = cfImage?.variants || [];

            // Build image URLs
            let imageUrl = variants.find(v => v.includes('/public')) || variants[0];
            let thumbUrl = variants.find(v => v.includes('/thumb')) || variants[0];

            if (!imageUrl && deliveryHash) {
                imageUrl = `https://imagedelivery.net/${deliveryHash}/${product.image_id}/public`;
                thumbUrl = `https://imagedelivery.net/${deliveryHash}/${product.image_id}/thumb`;
            }

            return {
                id: product.image_id,
                name: meta.name || 'SBS Product',
                category: product.category,
                condition: product.condition,
                size: product.size,
                brand: meta.brand || null,
                status: product.status,
                inStock: product.quantity_available > 0,
                stock: product.quantity_available,
                sold_count: product.quantity_sold,
                views: product.views_count,
                imageUrl: imageUrl,
                image: imageUrl,
                thumbnail: thumbUrl,
                uploaded: product.created_at,
                // Analytics insights
                days_listed: product.sold_at 
                    ? product.days_to_sell 
                    : Math.floor((Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24)),
                is_hot: product.views_count > 20 && !product.sold_at,
                is_fast_mover: product.days_to_sell && product.days_to_sell < 7,
                notes: product.notes
            };
        });

        return new Response(JSON.stringify({
            success: true,
            products: enrichedProducts,
            total: enrichedProducts.length,
            source: 'D1 Smart Inventory',
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: corsHeaders
        });

    } catch (error) {
        console.error('❌ Products API error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            products: [],
            total: 0,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}

// 🔍 FALLBACK: Discover products from Cloudflare Images
async function discoverFromCloudflare(env, corsHeaders, includeHidden) {
    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_IMAGES_API_TOKEN;
    const deliveryHash = env.CLOUDFLARE_IMAGES_HASH || env.CLOUDFLARE_DELIVERY_HASH;

    if (!accountId || !apiToken) {
        return new Response(JSON.stringify({
            success: true,
            products: [],
            message: 'No products in D1, and CF Images not configured',
            total: 0,
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: corsHeaders
        });
    }

    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`;
    const response = await fetch(apiUrl, {
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
    }

    const data = await response.json();
    const images = Array.isArray(data.result) ? data.result : data.result?.images || [];

    console.log(`🔍 Discovered ${images.length} images from CF, will auto-sync to D1...`);

    const products = images.map(image => {
        const meta = image.meta || image.metadata || {};
        const variants = image.variants || [];
        
        let imageUrl = variants.find(v => v.includes('/public')) || variants[0];
        let thumbUrl = variants.find(v => v.includes('/thumb')) || variants[0];

        if (!imageUrl && deliveryHash) {
            imageUrl = `https://imagedelivery.net/${deliveryHash}/${image.id}/public`;
            thumbUrl = `https://imagedelivery.net/${deliveryHash}/${image.id}/thumb`;
        }

        const status = meta.status || 'active';
        const showImage = includeHidden || status === 'active';

        return showImage ? {
            id: image.id,
            name: meta.name || 'SBS Product',
            category: meta.category || 'BN-CLOTHES',
            condition: meta.condition || 'Brand New',
            size: meta.size || null,
            brand: meta.brand || null,
            status: status,
            inStock: true,
            stock: parseInt(meta.stock || '1'),
            imageUrl: imageUrl,
            image: imageUrl,
            thumbnail: thumbUrl,
            uploaded: image.uploaded,
            source: 'CF Images Discovery'
        } : null;
    }).filter(Boolean);

    // TODO: Auto-sync discovered products to D1

    return new Response(JSON.stringify({
        success: true,
        products: products,
        total: products.length,
        message: 'Discovered from CF Images (not yet in D1)',
        timestamp: new Date().toISOString()
    }), {
        status: 200,
        headers: corsHeaders
    });
}
