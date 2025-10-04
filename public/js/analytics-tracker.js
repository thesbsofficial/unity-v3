/**
 * 📊 SBS Analytics Tracker
 * Client-side event tracking for comprehensive analytics
 *
 * Usage:
 *   const tracker = new SBSAnalytics();
 *   tracker.track('product_view', { product_id: '123', price: 99.99 });
 */

class SBSAnalytics {
    constructor(config = {}) {
        this.endpoint = config.endpoint || '/api/analytics/track';
        this.sessionId = this.getOrCreateSessionId();
        this.ensureSessionStart();
        this.userId = config.userId || null;
        this.queue = [];
        this.flushInterval = config.flushInterval || 5000; // 5 seconds
        this.maxQueueSize = config.maxQueueSize || 10;
        this.debug = config.debug || false;

        // Start auto-flush
        this.startAutoFlush();

        // Track session start
        this.trackSessionStart();

        // Track page unload
        this.setupUnloadHandler();

        this.log('📊 SBS Analytics initialized', { sessionId: this.sessionId });
    }

    /**
     * Generate or retrieve session ID
     */
    getOrCreateSessionId() {
        let sessionId = sessionStorage.getItem('sbs_analytics_session');

        if (!sessionId) {
            sessionId = 'SBS_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('sbs_analytics_session', sessionId);
        }

        return sessionId;
    }

    ensureSessionStart() {
        try {
            if (!sessionStorage.getItem('sbs_session_start')) {
                sessionStorage.setItem('sbs_session_start', Date.now().toString());
            }
        } catch (error) {
            this.log('⚠️ Unable to persist session start', error);
        }
    }

    /**
     * Main tracking method
     */
    track(eventType, data = {}) {
        const event = {
            event_type: eventType,
            event_category: this.getEventCategory(eventType),
            session_id: this.sessionId || null,
            user_id: this.userId || null,
            timestamp: new Date().toISOString(),
            page_url: window.location.href,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent || null,
            ...data
        };

        this.queue.push(event);
        this.log('📝 Event tracked:', eventType, data);

        // Flush immediately for critical events
        if (this.isCriticalEvent(eventType)) {
            this.flush();
        }

        // Flush if queue is full
        if (this.queue.length >= this.maxQueueSize) {
            this.flush();
        }
    }

    /**
     * Track page view
     */
    trackPageView() {
        this.track('page_view', {
            page: window.location.pathname,
            title: document.title,
            query: window.location.search
        });
    }

    /**
     * Track product view
     */
    trackProductView(product) {
        this.track('product_view', {
            product_id: product.id,
            product_name: product.name,
            category: product.category,
            brand: product.brand,
            price: product.price
        });
    }

    /**
     * Track add to cart
     */
    trackAddToCart(product, quantity = 1) {
        this.track('add_to_cart', {
            product_id: product.id,
            product_name: product.name,
            category: product.category,
            brand: product.brand,
            price: product.price,
            quantity: quantity,
            value: product.price * quantity
        });
    }

    /**
     * Track remove from cart
     */
    trackRemoveFromCart(product) {
        this.track('remove_from_cart', {
            product_id: product.id,
            product_name: product.name
        });
    }

    /**
     * Track checkout initiated
     */
    trackCheckout(cart) {
        this.track('checkout_initiated', {
            cart_size: cart.items?.length || 0,
            value: cart.total || 0,
            items: cart.items
        });
    }

    /**
     * Track purchase
     */
    trackPurchase(order) {
        this.track('purchase', {
            order_id: order.id,
            value: order.total,
            items: order.items,
            item_count: order.items?.length || 0,
            payment_method: order.paymentMethod
        });
    }

    /**
     * Track search
     */
    trackSearch(query, resultsCount = 0) {
        this.track('search', {
            search_term: query,
            results_count: resultsCount
        });
    }

    /**
     * Track filter usage
     */
    trackFilter(filterType, filterValue) {
        this.track('filter_used', {
            filter_type: filterType,
            filter_value: filterValue
        });
    }

    /**
     * Track session start
     */
    trackSessionStart() {
        this.track('session_start', {
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
    }

    /**
     * Track session end
     */
    trackSessionEnd() {
        this.track('session_end', {
            duration: this.getSessionDuration()
        });
    }

    /**
     * Get session duration in seconds
     */
    getSessionDuration() {
        let sessionStart = null;
        try {
            sessionStart = sessionStorage.getItem('sbs_session_start');
        } catch (error) {
            this.log('⚠️ Unable to read session start', error);
            return 0;
        }
        if (sessionStart) {
            return Math.floor((Date.now() - parseInt(sessionStart)) / 1000);
        }
        return 0;
    }

    /**
     * Clean object to remove undefined values (D1 doesn't support undefined)
     */
    cleanObject(obj) {
        if (obj === null) return null;
        if (obj === undefined) return null;
        if (typeof obj !== 'object') return obj;

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => this.cleanObject(item)).filter(item => item !== null && item !== undefined);
        }

        // Handle objects
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip undefined and null values entirely
            if (value !== undefined && value !== null) {
                // Recursively clean nested objects/arrays
                if (typeof value === 'object') {
                    const cleanedValue = this.cleanObject(value);
                    if (cleanedValue !== null && cleanedValue !== undefined) {
                        cleaned[key] = cleanedValue;
                    }
                } else {
                    cleaned[key] = value;
                }
            } else if (value === null) {
                // Keep explicit nulls
                cleaned[key] = null;
            }
            // Skip undefined entirely
        }
        return cleaned;
    }

    /**
     * Determine event category
     */
    getEventCategory(eventType) {
        const categories = {
            'page_view': 'navigation',
            'session_start': 'session',
            'session_end': 'session',
            'product_view': 'product',
            'add_to_cart': 'cart',
            'remove_from_cart': 'cart',
            'checkout_initiated': 'checkout',
            'purchase': 'purchase',
            'search': 'search',
            'filter_used': 'search'
        };
        return categories[eventType] || 'other';
    }

    /**
     * Check if event should be flushed immediately
     */
    isCriticalEvent(eventType) {
        return ['purchase', 'checkout_initiated', 'session_end'].includes(eventType);
    }

    /**
     * Flush events to server
     */
    async flush() {
        if (this.queue.length === 0) return;

        // Prevent concurrent flushes
        if (this.isFlushing) {
            this.log('⏳ Flush already in progress, skipping');
            return;
        }

        const events = [...this.queue];
        this.queue = [];
        this.isFlushing = true;

        this.log('📤 Flushing events:', events.length);

        try {
            // Clean events to remove undefined values (D1 doesn't support undefined)
            const cleanEvents = events.map(e => {
                const cleaned = {
                    type: e.event_type || 'unknown',
                    data: this.cleanObject(e),
                    path: e.page_url || window.location.pathname || '/'
                };
                return cleaned;
            });

            // Final safety: JSON.parse(JSON.stringify()) strips undefined values
            const safePayload = JSON.parse(JSON.stringify({ 
                events: cleanEvents,
                sessionId: this.sessionId || null
            }));

            if (this.debug) {
                console.log('📦 Sending payload:', safePayload);
            }

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(safePayload),
                keepalive: true // Ensure delivery even on page unload
            });

            if (!response.ok) {
                let errorData = {};
                let errorText = '';
                try {
                    errorText = await response.text();
                    errorData = JSON.parse(errorText);
                } catch (parseError) {
                    errorData = { raw: errorText };
                }
                
                // Log full error details for debugging
                console.error('❌ Analytics API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData.error,
                    details: errorData.details,
                    hint: errorData.hint,
                    stack: errorData.stack,
                    raw: errorData.raw
                });
                
                throw new Error(`HTTP ${response.status}: ${errorData.error || errorData.details || 'Unknown error'}`);
            }

            const data = await response.json();
            this.log('✅ Events sent successfully:', data);

            // Reset failure count on success
            this.failureCount = 0;

        } catch (error) {
            this.failureCount = (this.failureCount || 0) + 1;
            
            // Log full error details on first failure and every 5th failure
            if (this.failureCount === 1 || this.failureCount % 5 === 0) {
                console.error(`❌ Analytics flush failed (attempt ${this.failureCount}):`, {
                    message: error.message,
                    stack: error.stack,
                    endpoint: this.endpoint,
                    queueSize: this.queue.length
                });
            }

            // Re-add to queue on failure (but limit to prevent infinite growth)
            // Stop trying after 10 consecutive failures
            if (this.queue.length < 50 && this.failureCount < 10) {
                this.queue.unshift(...events);
            } else if (this.failureCount >= 10) {
                console.warn('🛑 Analytics: Too many failures, stopping tracking to prevent spam');
                this.stopAutoFlush();
            }
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Start auto-flush timer
     */
    startAutoFlush() {
        this.flushTimer = setInterval(() => {
            if (this.queue.length > 0) {
                this.flush();
            }
        }, this.flushInterval);
    }

    /**
     * Stop auto-flush timer
     */
    stopAutoFlush() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
    }

    /**
     * Setup page unload handler
     */
    setupUnloadHandler() {
        window.addEventListener('beforeunload', () => {
            this.trackSessionEnd();
            this.flush();
        });

        // Also handle visibility change (mobile)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flush();
            }
        });
    }

    /**
     * Debug logging
     */
    log(...args) {
        if (this.debug) {
            console.log('[SBS Analytics]', ...args);
        }
    }

    /**
     * Set user ID (when user logs in)
     */
    setUserId(userId) {
        this.userId = userId;
        this.track('user_identified', { user_id: userId });
    }

    /**
     * Clear session (for testing)
     */
    clearSession() {
        sessionStorage.removeItem('sbs_analytics_session');
        sessionStorage.removeItem('sbs_session_start');
        this.sessionId = this.getOrCreateSessionId();
        this.ensureSessionStart();
    }
}

// Auto-initialize if not already done
if (typeof window !== 'undefined' && !window.SBSAnalytics) {
    window.SBSAnalytics = SBSAnalytics;

    // Create global instance
    window.sbsTracker = new SBSAnalytics({
        debug: window.location.hostname === 'localhost'
    });

    // Auto-track page view
    window.sbsTracker.trackPageView();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SBSAnalytics;
}
