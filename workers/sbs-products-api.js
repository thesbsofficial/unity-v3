/**
 * 🛍️ SBS PRODUCTS API WORKER
 * Securely fetches Cloudflare Images and returns product data
 */

export default {
    async fetch(request, env) {
        // Enable CORS for your domain
        const corsHeaders = {
            'Access-Control-Allow-Origin': 'https://thesbsofficial.com',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
            'Content-Type': 'application/json'
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);

        try {
            // Route: Get all products with images
            if (url.pathname === '/api/products') {
                return await handleGetProducts(env, corsHeaders);
            }

            // Route: Get single product
            if (url.pathname.startsWith('/api/products/')) {
                const productId = url.pathname.split('/')[3];
                return await handleGetProduct(productId, env, corsHeaders);
            }

            // Route: Health check
            if (url.pathname === '/api/health') {
                return new Response(JSON.stringify({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    service: 'SBS Products API'
                }), { headers: corsHeaders });
            }

            return new Response(JSON.stringify({ error: 'Not found' }), {
                status: 404,
                headers: corsHeaders
            });

        } catch (error) {
            console.error('Worker error:', error);
            return new Response(JSON.stringify({
                error: 'Internal server error',
                message: error.message
            }), {
                status: 500,
                headers: corsHeaders
            });
        }
    }
};

/**
 * 📦 Fetch all products with Cloudflare Images
 */
async function handleGetProducts(env, corsHeaders) {
    try {
        // Fetch images from Cloudflare Images API
        const imageResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1?per_page=100`,
            {
                headers: {
                    'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!imageResponse.ok) {
            throw new Error(`Cloudflare Images API error: ${imageResponse.status}`);
        }

        const imageData = await imageResponse.json();
        const images = imageData.result || [];

        // Transform images into product format
        const products = images.map((image, index) => {
            // Extract product info from filename or metadata
            const filename = image.filename || `Product ${index + 1}`;
            const category = extractCategory(filename);

            return {
                id: image.id,
                name: formatProductName(filename),
                image: `https://imagedelivery.net/${env.CLOUDFLARE_IMAGES_HASH}/${image.id}/public`,
                thumbnail: `https://imagedelivery.net/${env.CLOUDFLARE_IMAGES_HASH}/${image.id}/thumbnail`,
                category: category,
                sizes: generateSizes(category),
                description: generateDescription(filename, category),
                uploaded: image.uploaded,
                metadata: image.meta || {}
            };
        });

        return new Response(JSON.stringify({
            success: true,
            data: {
                products: products,
                total: products.length,
                categories: [...new Set(products.map(p => p.category))],
                updated: new Date().toISOString()
            }
        }), { headers: corsHeaders });

    } catch (error) {
        console.error('Error fetching products:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            fallback: 'Using cached data'
        }), { status: 500, headers: corsHeaders });
    }
}

/**
 * 🎯 Get single product by ID
 */
async function handleGetProduct(productId, env, corsHeaders) {
    try {
        const imageResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${productId}`,
            {
                headers: {
                    'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!imageResponse.ok) {
            return new Response(JSON.stringify({ error: 'Product not found' }), {
                status: 404,
                headers: corsHeaders
            });
        }

        const imageData = await imageResponse.json();
        const image = imageData.result;

        const product = {
            id: image.id,
            name: formatProductName(image.filename || 'SBS Product'),
            price: generatePrice(extractCategory(image.filename)),
            image: `https://imagedelivery.net/${env.CLOUDFLARE_IMAGES_HASH}/${image.id}/public`,
            thumbnail: `https://imagedelivery.net/${env.CLOUDFLARE_IMAGES_HASH}/${image.id}/thumbnail`,
            category: extractCategory(image.filename),
            sizes: generateSizes(extractCategory(image.filename)),
            description: generateDescription(image.filename, extractCategory(image.filename)),
            uploaded: image.uploaded,
            metadata: image.meta || {}
        };

        return new Response(JSON.stringify({
            success: true,
            data: product
        }), { headers: corsHeaders });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders
        });
    }
}

/**
 * 🏷️ Helper functions
 */
function extractCategory(filename) {
    if (!filename) return 'clothing';

    const name = filename.toLowerCase();
    if (name.includes('hoodie') || name.includes('sweatshirt')) return 'hoodies';
    if (name.includes('tee') || name.includes('tshirt') || name.includes('shirt')) return 'tshirts';
    if (name.includes('jacket') || name.includes('coat')) return 'jackets';
    if (name.includes('jogger') || name.includes('pant') || name.includes('trouser')) return 'pants';
    if (name.includes('cap') || name.includes('hat') || name.includes('beanie')) return 'accessories';
    if (name.includes('shoe') || name.includes('sneaker') || name.includes('boot')) return 'footwear';

    return 'clothing';
}

function generatePrice(category) {
    const prices = {
        'tshirts': [29.99, 34.99, 39.99, 44.99],
        'hoodies': [59.99, 69.99, 79.99, 89.99],
        'jackets': [89.99, 99.99, 119.99, 139.99],
        'pants': [49.99, 59.99, 69.99, 79.99],
        'accessories': [19.99, 24.99, 29.99, 34.99],
        'footwear': [79.99, 99.99, 119.99, 149.99],
        'clothing': [39.99, 49.99, 59.99, 69.99]
    };

    const categoryPrices = prices[category] || prices['clothing'];
    return categoryPrices[Math.floor(Math.random() * categoryPrices.length)];
}

// 🎯 TAXONOMY SIZES - SINGLE SOURCE OF TRUTH
// Note: Workers can't import ES modules, so we keep inline but reference taxonomy.js as source
const TAXONOMY_SIZES = {
    'BN-CLOTHES': ['XS', 'S', 'M', 'L', 'XL'],
    'PO-CLOTHES': [
        'XS', 'S', 'M', 'L', 'XL',
        'XS-TOP-S-BOTTOM', 'S-TOP-XS-BOTTOM',
        'S-TOP-M-BOTTOM', 'M-TOP-S-BOTTOM',
        'M-TOP-L-BOTTOM', 'L-TOP-M-BOTTOM',
        'L-TOP-XL-BOTTOM', 'XL-TOP-L-BOTTOM'
    ],
    'BN-SHOES': ['UK-6', 'UK-6-5', 'UK-7', 'UK-7-5', 'UK-8', 'UK-8-5', 'UK-9', 'UK-9-5', 'UK-10', 'UK-10-5', 'UK-11', 'UK-11-5', 'UK-12'],
    'PO-SHOES': ['UK-6', 'UK-6-5', 'UK-7', 'UK-7-5', 'UK-8', 'UK-8-5', 'UK-9', 'UK-9-5', 'UK-10', 'UK-10-5', 'UK-11', 'UK-11-5', 'UK-12']
};

function generateSizes(category) {
    // Check taxonomy first
    if (TAXONOMY_SIZES[category]) {
        return TAXONOMY_SIZES[category];
    }

    // Legacy footwear check
    if (category === 'footwear') {
        return TAXONOMY_SIZES['BN-SHOES'];
    }

    // Default fallback
    return ['XS', 'S', 'M', 'L', 'XL'];
}

function formatProductName(filename) {
    if (!filename) return 'SBS Streetwear Item';

    return filename
        .replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

function generateDescription(filename, category) {
    const baseDesc = formatProductName(filename);
    const categoryDescriptions = {
        'tshirts': 'Premium streetwear t-shirt from the SBS Dublin collection',
        'hoodies': 'Heavyweight hoodie from the SBS Dublin collection',
        'hats': 'Exclusive SBS cap',
        'accessories': 'Authentic accessory from SBS',
        'sneakers': 'Rare and authentic sneakers from SBS',
        'clothing': 'Authentic SBS streetwear piece'
    };
    const description = categoryDescriptions[category] || `Authentic ${category} from SBS`;

    return `${description}. Elevate your style with this premium ${category} from SBS, designed for comfort and durability. Perfect for any occasion, this ${category} is a must-have in your wardrobe.`;
}