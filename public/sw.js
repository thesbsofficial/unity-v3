// 🛡️ SERVICE WORKER - OFFLINE SUPPORT & CACHING

const CACHE_VERSION = 'sbs-v1';
const CACHE_NAME = `sbs-shop-${CACHE_VERSION}`;

// Assets to cache for offline use
const STATIC_ASSETS = [
    '/',
    '/shop.html',
    '/styles/enhanced.css',
    '/styles/robust.css',
    '/js/robust-shop.js',
    '/images/placeholder.jpg'
];

// API routes to cache
const API_CACHE = [
    '/api/products'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Static assets cached');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name.startsWith('sbs-shop-') && name !== CACHE_NAME)
                        .map(name => {
                            console.log('Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('Old caches cleaned');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip Chrome extensions
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleAPIRequest(request));
        return;
    }
    
    // Handle static assets
    event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('Network failed, trying cache:', url.pathname);
        
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            // Add offline indicator to cached response
            const responseData = await cachedResponse.json();
            responseData._offline = true;
            
            return new Response(JSON.stringify(responseData), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Return offline fallback
        return new Response(JSON.stringify({
            success: false,
            error: 'Offline - no cached data available',
            products: [],
            _offline: true
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
    try {
        // Check cache first
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            // Update cache in background
            updateCacheInBackground(request);
            return cachedResponse;
        }
        
        // Not in cache, try network
        const networkResponse = await fetch(request);
        
        // Cache the response
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('Failed to fetch:', request.url);
        
        // Return offline page for HTML requests
        if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/offline.html') || new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Offline - SBS</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { 
                            font-family: -apple-system, sans-serif; 
                            text-align: center; 
                            padding: 40px; 
                            background: #f5f5f5; 
                        }
                        .offline-container {
                            max-width: 400px;
                            margin: 0 auto;
                            background: white;
                            padding: 40px;
                            border-radius: 12px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        }
                        .offline-icon { 
                            font-size: 4rem; 
                            margin-bottom: 20px; 
                        }
                        h1 { 
                            color: #333; 
                            margin-bottom: 16px; 
                        }
                        p { 
                            color: #666; 
                            line-height: 1.5; 
                        }
                        .retry-button {
                            background: #e50914;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="offline-container">
                        <div class="offline-icon">📱</div>
                        <h1>You're Offline</h1>
                        <p>Check your internet connection and try again.</p>
                        <button class="retry-button" onclick="window.location.reload()">
                            Try Again
                        </button>
                    </div>
                </body>
                </html>
            `, {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        
        // For other requests, return 503
        return new Response('Service Unavailable', { status: 503 });
    }
}

// Update cache in background
function updateCacheInBackground(request) {
    fetch(request)
        .then(response => {
            if (response.ok) {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, response);
                });
            }
        })
        .catch(() => {
            // Fail silently
        });
}

// Handle background sync for cart updates
self.addEventListener('sync', (event) => {
    if (event.tag === 'cart-sync') {
        event.waitUntil(syncCart());
    }
});

// Sync cart when back online
async function syncCart() {
    try {
        // Get pending cart updates from IndexedDB
        const pendingUpdates = await getPendingCartUpdates();
        
        if (pendingUpdates.length === 0) return;
        
        // Sync each update
        for (const update of pendingUpdates) {
            try {
                await fetch('/api/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(update.data)
                });
                
                // Remove from pending
                await removePendingCartUpdate(update.id);
                
            } catch (error) {
                console.log('Cart sync failed for update:', update.id);
                // Will retry on next sync
            }
        }
        
    } catch (error) {
        console.error('Background cart sync failed:', error);
    }
}

// IndexedDB helpers for offline cart sync
async function getPendingCartUpdates() {
    // Simplified - in real app you'd use IndexedDB
    try {
        const pending = localStorage.getItem('sbs_pending_cart_updates');
        return pending ? JSON.parse(pending) : [];
    } catch {
        return [];
    }
}

async function removePendingCartUpdate(id) {
    try {
        const pending = await getPendingCartUpdates();
        const filtered = pending.filter(update => update.id !== id);
        localStorage.setItem('sbs_pending_cart_updates', JSON.stringify(filtered));
    } catch {
        // Fail silently
    }
}

// Push notification handler
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        
        const options = {
            body: data.body || 'New notification from SBS',
            icon: '/images/sbs-icon.png',
            badge: '/images/sbs-badge.png',
            tag: data.tag || 'default',
            data: data.data || {},
            actions: data.actions || [],
            requireInteraction: data.requireInteraction || false
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'SBS', options)
        );
        
    } catch (error) {
        console.error('Push notification error:', error);
    }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        self.clients.matchAll({ type: 'window' })
            .then(clientList => {
                // Check if there's already a window open
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Open new window
                if (self.clients.openWindow) {
                    return self.clients.openWindow(urlToOpen);
                }
            })
    );
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_PRODUCTS':
            cacheProducts(data);
            break;
            
        case 'CLEAR_CACHE':
            clearCache();
            break;
            
        default:
            console.log('Unknown message type:', type);
    }
});

// Cache product data
async function cacheProducts(products) {
    try {
        const cache = await caches.open(CACHE_NAME);
        
        const response = new Response(JSON.stringify({
            success: true,
            products: products
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
        await cache.put('/api/products', response);
        
    } catch (error) {
        console.error('Failed to cache products:', error);
    }
}

// Clear all caches
async function clearCache() {
    try {
        const cacheNames = await caches.keys();
        
        await Promise.all(
            cacheNames
                .filter(name => name.startsWith('sbs-shop-'))
                .map(name => caches.delete(name))
        );
        
    } catch (error) {
        console.error('Failed to clear cache:', error);
    }
}

console.log('SBS Service Worker loaded successfully');