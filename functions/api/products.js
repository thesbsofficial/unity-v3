// 🛍️ SBS PRODUCTS API - CLOUDFLARE IMAGES AS INVENTORY SOURCE
// 🎯 ALL INVENTORY MANAGED IN CLOUDFLARE IMAGES DASHBOARD
// 📝 USES METADATA FIELDS FOR PRODUCT INFO
import { getSizesForCategory } from '../../public/js/taxonomy.js';

export async function onRequest(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const debugMode = url.searchParams.has('debug');
    const includeHidden = url.searchParams.has('includeHidden'); // For admin view

    // Add CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (context.request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Fetching products from Cloudflare Images API

        // Get environment variables
        const accountId = env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_IMAGES_API_TOKEN;
        const deliveryHash = env.CLOUDFLARE_IMAGES_HASH || env.CLOUDFLARE_DELIVERY_HASH || env.IMAGES_DELIVERY_HASH;

        if (!accountId || !apiToken) {
            const missing = [
                !accountId && 'CLOUDFLARE_ACCOUNT_ID',
                !apiToken && 'CLOUDFLARE_API_TOKEN or CLOUDFLARE_IMAGES_API_TOKEN'
            ].filter(Boolean).join(', ');

            console.warn('⚠️ CF Images credentials not configured:', missing);

            return new Response(JSON.stringify({
                success: true,
                products: [],
                message: `CF Images not configured yet. Missing: ${missing}`,
                total: 0,
                timestamp: new Date().toISOString()
            }), {
                status: 200,
                headers: corsHeaders
            });
        }

        // Fetch images from Cloudflare Images API
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
        // API response received

        if (!data.success || !data.result) {
            throw new Error('Cloudflare API error');
        }

        // Handle different API response formats
        let images = [];
        if (Array.isArray(data.result)) {
            images = data.result;
        } else if (data.result.images && Array.isArray(data.result.images)) {
            images = data.result.images;
        }

        // Process images data

        // � FETCH STATUS FROM DATABASE
        // The reservation system updates product status in D1 database
        // Priority: D1 status > Cloudflare metadata status
        let dbStatusMap = {};
        try {
            if (env.DB) {
                const dbProducts = await env.DB.prepare('SELECT cloudflare_image_id, status FROM products').all();
                if (dbProducts.success && dbProducts.results) {
                    dbProducts.results.forEach(p => {
                        if (p.cloudflare_image_id) {
                            dbStatusMap[p.cloudflare_image_id] = p.status;
                        }
                    });
                    // Product statuses loaded from database
                }
            }
        } catch (dbError) {
            console.warn('⚠️ Could not fetch statuses from D1:', dbError.message);
        }

        // �📝 PARSE METADATA FROM CLOUDFLARE IMAGES
        // Each image can have metadata fields set in CF Images dashboard:
        // - name: Product name
        // - category: BN-CLOTHES, BN-SHOES, PO-CLOTHES, PO-SHOES
        // - brand: Brand name
        // - size: Size (e.g., M, L, UK-9)
        // - condition: BN or PO
        // - status: active, hidden, sold (default: active)
        // - sku: SKU code
        // - stock: Stock quantity (default: 1)

        const products = images
            .map((image) => {
                try {
                    const meta = image.meta || image.metadata || {};
                    const filename = image.filename || '';

                    // Get status - D1 database has priority (updated by reservation system)
                    let status = dbStatusMap[image.id] || (meta.status || 'active').toLowerCase();

                    // For public view: hide if status is hidden or sold
                    // For reservation system: show 'reserved' status
                    if (!includeHidden && (status === 'hidden' || status === 'sold')) {
                        return null; // Filter out hidden/sold items for public view
                    }

                    // Parse name
                    let name = meta.name || meta.title || filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
                    name = name.replace(/\d{8,}/g, '').trim(); // Remove long numbers (dates/IDs)
                    name = name.charAt(0).toUpperCase() + name.slice(1) || `SBS Item ${image.id.slice(0, 8)}`;

                    // Parse category
                    let category = (meta.category || '').toUpperCase();
                    if (!['BN-CLOTHES', 'BN-SHOES', 'PO-CLOTHES', 'PO-SHOES'].includes(category)) {
                        // Try to infer from filename
                        const lowerName = name.toLowerCase();
                        if (lowerName.includes('shoe') || lowerName.includes('sneaker') || lowerName.includes('boot')) {
                            category = 'BN-SHOES';
                        } else {
                            category = 'BN-CLOTHES'; // Default
                        }
                    }

                    // Get condition
                    const condition = category.includes('BN') ? 'Brand New' : 'Pre-Owned';

                    // Get sizes from taxonomy
                    const sizes = getSizesForCategory(category);

                    // Get stock quantity
                    const stock = parseInt(meta.stock || meta.quantity || '1', 10);
                    const inStock = stock > 0;

                    // Build image URLs
                    const variants = image.variants || [];
                    let imageUrl = variants.find(v => v.includes('/public')) ||
                        variants.find(v => v.includes('/standard')) ||
                        variants[0];
                    let thumbUrl = variants.find(v => v.includes('/thumb')) || variants[0];

                    if (!imageUrl && deliveryHash) {
                        imageUrl = `https://imagedelivery.net/${deliveryHash}/${image.id}/public`;
                    }
                    if (!thumbUrl && deliveryHash) {
                        thumbUrl = `https://imagedelivery.net/${deliveryHash}/${image.id}/thumb`;
                    }

                    return {
                        id: image.id,
                        name: name,
                        category: category,
                        condition: condition,
                        brand: meta.brand || null,
                        size: meta.size || null,
                        status: status,
                        sku: meta.sku || `SBS-${image.id.slice(0, 8)}`,
                        imageUrl: imageUrl,
                        image: imageUrl,
                        thumbnail: thumbUrl,
                        description: meta.description || `${condition} ${name}`,
                        sizes: sizes,
                        inStock: inStock,
                        stock: stock,
                        featured: meta.featured === 'true' || meta.featured === '1',
                        uploaded: image.uploaded,
                        uploadedAt: image.uploaded,
                        ...(debugMode && {
                            rawMeta: meta,
                            rawFilename: filename,
                            variants
                        })
                    };
                } catch (err) {
                    console.error(`Error parsing image ${image.id}:`, err);
                    return null;
                }
            })
            .filter(p => p !== null); // Remove hidden/sold/error items

        // Products transformed successfully

        const result = {
            success: true,
            products: products,
            total: products.length,
            timestamp: new Date().toISOString(),
            source: 'Cloudflare Images',
            note: 'Edit products in Cloudflare Images Dashboard > Image > Metadata',
            ...(debugMode && {
                deliveryHashUsed: Boolean(deliveryHash),
                imagesRetrieved: images.length,
                metadataFields: [
                    'name - Product name',
                    'price - Price (45.99 or 4599 cents)',
                    'category - BN-CLOTHES, BN-SHOES, PO-CLOTHES, PO-SHOES',
                    'brand - Brand name',
                    'size - Size (M, L, UK-9, etc)',
                    'condition - BN or PO',
                    'status - active, hidden, sold',
                    'sku - SKU code',
                    'stock - Stock quantity',
                    'featured - true/false',
                    'description - Product description'
                ]
            })
        };

        return new Response(JSON.stringify(result), {
            headers: corsHeaders,
            status: 200
        });

    } catch (error) {
        console.error('❌ SBS API Error:', error);
        console.error('❌ Error stack:', error.stack);

        return new Response(JSON.stringify({
            success: false,
            error: 'Products temporarily unavailable',
            message: error.message,
            timestamp: new Date().toISOString()
        }), {
            headers: corsHeaders,
            status: 500
        });
    }
}