/**
 * 🚀 SBS UNIFIED APP SCRIPT
 * Consolidated authentication, navigation, cart, and error handling
 * Replaces: auth-state.js, nav-lite.js, error-logger.js
 */

(function () {
    'use strict';

    // ============================================================================
    // 🔐 AUTHENTICATION MODULE
    // ============================================================================

    const Auth = {
        // Check if user is logged in
        isLoggedIn() {
            const user = sessionStorage.getItem('sbs_user');
            const token = sessionStorage.getItem('sbs_csrf_token');
            return !!(user && token);
        },

        // Get current user
        getCurrentUser() {
            const userStr = sessionStorage.getItem('sbs_user');
            if (!userStr) return null;
            try {
                return JSON.parse(userStr);
            } catch (e) {
                console.error('Failed to parse user data:', e);
                return null;
            }
        },

        // Sign out
        signOut() {
            sessionStorage.clear();
            window.location.href = '/login.html';
        },

        // Protect pages that require login
        requireAuth(redirectUrl = '/login.html') {
            if (!this.isLoggedIn()) {
                window.location.href = redirectUrl;
                return false;
            }
            return true;
        },

        // Redirect if already logged in
        redirectIfLoggedIn(redirectUrl = '/dashboard.html') {
            if (this.isLoggedIn()) {
                window.location.href = redirectUrl;
                return true;
            }
            return false;
        },

        // Check session expiry
        checkSessionExpiry() {
            const loginTime = sessionStorage.getItem('sbs_login_time');
            if (!loginTime) return;

            const now = Date.now();
            const elapsed = now - parseInt(loginTime);
            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

            if (elapsed > TWENTY_FOUR_HOURS) {
                console.log('Session expired');
                this.signOut();
            }
        }
    };

    // ============================================================================
    // 🛒 CART MODULE
    // ============================================================================

    const Cart = {
        // Accessibility and animation preferences
        prefersReducedMotion: window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false },

        // Format cart count display
        formatCartCount(count) {
            return count > 9 ? '9+' : String(count);
        },

        // Animate count change
        triggerCountBump(element) {
            if (!element || this.prefersReducedMotion.matches) return;
            element.classList.remove('count-bump');
            void element.offsetWidth;
            element.classList.add('count-bump');
        },

        // Parse cart from localStorage
        parseCart() {
            try {
                return JSON.parse(localStorage.getItem('sbs-basket')) || [];
            } catch (error) {
                return [];
            }
        },

        // Update cart count display
        updateCartCount() {
            const cartItems = this.parseCart();
            const totalItems = cartItems.length;
            const formatted = this.formatCartCount(totalItems);

            // Update navigation cart count
            const cartCounts = document.querySelectorAll('#cart-count, #nav-cart-count, #mobile-cart-count');
            cartCounts.forEach(element => {
                if (element && element.textContent !== formatted) {
                    element.textContent = formatted;
                    this.triggerCountBump(element);
                }
            });
        }
    };

    // ============================================================================
    // 🧭 NAVIGATION MODULE
    // ============================================================================

    const Navigation = {
        // Update navigation based on login state
        updateNavigation() {
            const navRight = document.querySelector('.nav-right');
            if (!navRight) return;

            if (Auth.isLoggedIn()) {
                const user = Auth.getCurrentUser();
                const firstName = user?.first_name || 'Account';
                const isAdmin = user?.role === 'admin';

                navRight.innerHTML = `
                    <a href="/dashboard" class="nav-link">👤 ${firstName}</a>
                    ${isAdmin ? '<a href="/admin/inventory/" class="nav-link">⚙️ Admin</a>' : ''}
                    <button class="btn-outline" onclick="window.SBS.auth.signOut()" style="font-family: inherit; font-size: 1rem;">Sign Out</button>
                    <button class="cart-toggle" type="button">
                        Basket
                        <span class="cart-count" id="cart-count">0</span>
                    </button>
                    <button class="hamburger" aria-label="Menu" aria-expanded="false" aria-controls="site-mobile-menu">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                `;
            } else {
                navRight.innerHTML = `
                    <a href="/login" class="nav-link">Sign In</a>
                    <a href="/register" class="btn-gold">Sign Up</a>
                    <button class="cart-toggle" type="button">
                        Basket
                        <span class="cart-count" id="cart-count">0</span>
                    </button>
                    <button class="hamburger" aria-label="Menu" aria-expanded="false" aria-controls="site-mobile-menu">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                `;
            }

            // Update cart count after navigation update
            Cart.updateCartCount();
        }
    };

    // ============================================================================
    // 🚨 ERROR HANDLING MODULE
    // ============================================================================

    const ErrorHandler = {
        errors: [],
        maxErrors: 50,
        sessionId: 'SBS_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),

        // Generate session ID
        generateSessionId() {
            return 'SBS_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        // Log error
        logError(type, details, severity = 'ERROR') {
            const error = {
                id: this.errors.length + 1,
                type,
                severity,
                details,
                timestamp: new Date().toISOString(),
                sessionId: this.sessionId,
                page: window.location.pathname,
                userAgent: navigator.userAgent.substr(0, 100)
            };

            this.errors.push(error);

            // Keep only recent errors
            if (this.errors.length > this.maxErrors) {
                this.errors = this.errors.slice(-this.maxErrors);
            }

            // Log to console for development
            if (severity === 'ERROR') {
                console.error(`🚨 ${type}:`, details);
            } else {
                console.warn(`⚠️ ${type}:`, details);
            }
        },

        // Initialize error handling
        init() {
            // Catch JavaScript errors
            window.addEventListener('error', (event) => {
                this.logError('JAVASCRIPT_ERROR', {
                    message: event.message,
                    filename: event.filename,
                    line: event.lineno,
                    column: event.colno,
                    stack: event.error?.stack
                });
            });

            // Catch unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                this.logError('PROMISE_REJECTION', {
                    message: event.reason?.message || event.reason,
                    stack: event.reason?.stack
                });
            });
        }
    };

    // ============================================================================
    // 🚀 MAIN APP INITIALIZATION
    // ============================================================================

    function init() {
        // Initialize error handling first
        ErrorHandler.init();

        // Check session expiry
        Auth.checkSessionExpiry();

        // Update navigation
        Navigation.updateNavigation();

        // Update cart count
        Cart.updateCartCount();

        // Listen for storage changes (multi-tab sync)
        window.addEventListener('storage', (e) => {
            if (e.key === 'sbs_user' || e.key === 'sbs_csrf_token') {
                Navigation.updateNavigation();
            }
            if (e.key === 'sbs-basket') {
                Cart.updateCartCount();
            }
        });

        console.log('🚀 SBS App initialized');
    }

    // ============================================================================
    // 📤 PUBLIC API EXPORT
    // ============================================================================

    // Export unified API
    window.SBS = {
        auth: Auth,
        cart: Cart,
        navigation: Navigation,
        errors: ErrorHandler,
        init
    };

    // Legacy compatibility
    window.sbsAuth = Auth;
    window.updateCartCount = Cart.updateCartCount.bind(Cart);

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
