// 🔐 SECURE PRODUCTS API - FIXES SQL INJECTION VULNERABILITY
// This replaces your current products.ts with proper security measures

interface Env {
    DB: any; // D1Database type
    KV: any; // KVNamespace type
}

interface EventContext<T> {
    request: Request;
    env: T;
    params: any;
    waitUntil: (promise: Promise<any>) => void;
}

// 🛡️ Input validation and sanitization
class Validator {
    static category(category: string): boolean {
        const validCategories = [
            'all', 'hoodies', 'tshirts', 'accessories', 'jackets', 
            'pants', 'shoes', 'brand-new', 'preloved'
        ];
        return validCategories.includes(category.toLowerCase());
    }
    
    static size(size: string): boolean {
        const validSizes = ['all', 'xs', 's', 'm', 'l', 'xl', 'xxl'];
        return validSizes.includes(size.toLowerCase());
    }
    
    static positiveInteger(value: string, max: number = 100): number {
        const num = parseInt(value, 10);
        return (!isNaN(num) && num > 0 && num <= max) ? num : 20;
    }
    
    static sanitizeString(input: string): string {
        return input
            .replace(/[<>]/g, '') // Remove HTML brackets
            .replace(/['"]/g, '') // Remove quotes that could break SQL
            .replace(/javascript:/gi, '') // Remove JS protocols
            .trim()
            .substring(0, 50); // Limit length
    }
}

// 🚀 Secure Products API Handler
export async function onRequestGet(context: EventContext<Env>): Promise<Response> {
    try {
        const url = new URL(context.request.url);
        
        // 🛡️ SECURE PARAMETER EXTRACTION WITH VALIDATION
        const rawCategory = url.searchParams.get('category') || 'all';
        const rawSize = url.searchParams.get('size') || 'all';
        const rawPage = url.searchParams.get('page') || '1';
        const rawLimit = url.searchParams.get('limit') || '20';
        
        // Validate all inputs before using them
        const category = Validator.category(rawCategory) ? rawCategory.toLowerCase() : 'all';
        const size = Validator.size(rawSize) ? rawSize.toLowerCase() : 'all';
        const page = Validator.positiveInteger(rawPage, 50);
        const limit = Validator.positiveInteger(rawLimit, 50);
        const offset = (page - 1) * limit;
        
        console.log('🔍 Secure query params:', { category, size, page, limit });
        
        // 🔐 PARAMETERIZED QUERIES - NO SQL INJECTION POSSIBLE
        let baseQuery = 'SELECT id, name, description, price, category, image_id, status, created_at FROM products WHERE status = ?';
        const params: any[] = ['active'];
        
        // Add category filter with parameterization
        if (category !== 'all') {
            baseQuery += ' AND category = ?';
            params.push(category);
        }
        
        // Add size filter with parameterization (if your products table has size column)
        if (size !== 'all') {
            baseQuery += ' AND size = ?';
            params.push(size);
        }
        
        // Add ordering and pagination with parameterization
        baseQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        console.log('🔐 Executing secure query:', baseQuery);
        console.log('🔐 With params:', params);
        
        // 🚀 EXECUTE SECURE PARAMETERIZED QUERY
        const stmt = context.env.DB.prepare(baseQuery);
        const { results, meta } = await stmt.bind(...params).all();
        
        // 🎯 ALSO GET TOTAL COUNT FOR PAGINATION (SECURE)
        let countQuery = 'SELECT COUNT(*) as total FROM products WHERE status = ?';
        const countParams: any[] = ['active'];
        
        if (category !== 'all') {
            countQuery += ' AND category = ?';
            countParams.push(category);
        }
        
        if (size !== 'all') {
            countQuery += ' AND size = ?';
            countParams.push(size);
        }
        
        const countStmt = context.env.DB.prepare(countQuery);
        const countResult = await countStmt.bind(...countParams).first();
        const total = countResult?.total || 0;
        
        // 🛡️ SANITIZE OUTPUT (PREVENT XSS)
        const sanitizedProducts = results?.map((product: any) => ({
            id: product.id,
            name: Validator.sanitizeString(product.name || ''),
            description: Validator.sanitizeString(product.description || ''),
            price: product.price,
            category: Validator.sanitizeString(product.category || ''),
            image_id: product.image_id,
            status: product.status,
            created_at: product.created_at,
            // Add image URL
            image: product.image_id ? `/api/images/${product.image_id}` : null
        })) || [];
        
        // 🎯 STRUCTURED RESPONSE WITH PAGINATION INFO
        const responseData = {
            success: true,
            data: {
                products: sanitizedProducts,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: (page * limit) < total,
                    hasNext: (page * limit) < total,
                    hasPrev: page > 1
                },
                filters: {
                    category: category === 'all' ? null : category,
                    size: size === 'all' ? null : size
                }
            },
            timestamp: new Date().toISOString()
        };
        
        // 🚀 PERFORMANCE HEADERS + SECURITY HEADERS
        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                // Performance headers
                'Cache-Control': 'public, max-age=300, s-maxage=600', // 5min browser, 10min CDN
                'CDN-Cache-Control': 'max-age=3600', // 1 hour edge cache
                // Security headers
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                // CORS headers if needed
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
        
    } catch (error: any) {
        // 🚨 SECURE ERROR HANDLING - NO INTERNAL DATA EXPOSED
        console.error('[Products API Error]:', error);
        
        // Log error details internally but don't expose to user
        const errorId = crypto.randomUUID();
        console.error(`[Error ID: ${errorId}]`, {
            message: error?.message || 'Unknown error',
            stack: error?.stack || 'No stack trace',
            url: context.request.url,
            timestamp: new Date().toISOString()
        });
        
        // Store critical errors for monitoring
        if (context.env.KV) {
            try {
                await context.env.KV.put(
                    `error:products:${errorId}`,
                    JSON.stringify({
                        message: error?.message || 'Unknown error',
                        url: context.request.url,
                        timestamp: new Date().toISOString()
                    }),
                    { expirationTtl: 604800 } // 7 days
                );
            } catch (kvError) {
                console.error('Failed to log error to KV:', kvError);
            }
        }
        
        // Return generic error to user (no sensitive info)
        return new Response(JSON.stringify({
            success: false,
            error: 'Unable to load products at this time',
            message: 'Please try again later or contact support if the issue persists',
            errorId: errorId, // For support debugging
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff'
            }
        });
    }
}

// 🔐 SECURE OPTIONS HANDLER FOR CORS
export async function onRequestOptions(context: EventContext<Env>): Promise<Response> {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400' // 24 hours
        }
    });
}