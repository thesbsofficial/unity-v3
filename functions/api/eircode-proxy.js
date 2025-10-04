// Proxy for Eircode Finder API to bypass CORS restrictions
export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    // Allow CORS from our domain
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Get the action (identity or search)
        const action = url.searchParams.get('action') || 'identity';

        if (action === 'identity') {
            // Get session key
            const response = await fetch('https://api-finder.eircode.ie/Latest/findergetidentity', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://finder.eircode.ie/',
                    'Origin': 'https://finder.eircode.ie'
                }
            });

            const data = await response.json();

            return new Response(JSON.stringify(data), {
                status: 200,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });

        } else if (action === 'search') {
            // Search for address
            const key = url.searchParams.get('key');
            const address = url.searchParams.get('address');
            const language = url.searchParams.get('language') || 'en';
            const geographicAddress = url.searchParams.get('geographicAddress') || 'true';
            const clientVersion = url.searchParams.get('clientVersion') || 'e98fe302';

            if (!key || !address) {
                return new Response(JSON.stringify({
                    error: { code: 400, text: 'Missing key or address parameter' }
                }), {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json'
                    }
                });
            }

            const apiUrl = `https://api-finder.eircode.ie/Latest/finderfindaddress?key=${key}&address=${encodeURIComponent(address)}&language=${language}&geographicAddress=${geographicAddress}&clientVersion=${clientVersion}`;

            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://finder.eircode.ie/',
                    'Origin': 'https://finder.eircode.ie'
                }
            });

            const data = await response.json();

            return new Response(JSON.stringify(data), {
                status: response.status,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            });
        }

        return new Response(JSON.stringify({
            error: { code: 400, text: 'Invalid action. Use action=identity or action=search' }
        }), {
            status: 400,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: {
                code: 500,
                text: error.message
            }
        }), {
            status: 500,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    }
}
