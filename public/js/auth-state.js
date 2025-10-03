/**
 * SBS Auth Utility
 * Handles authentication state across all pages
 * Auto-detects login state and updates navigation
 */

(function () {
    'use strict';

    // Check if user is logged in
    function isLoggedIn() {
        const user = sessionStorage.getItem('sbs_user');
        const token = sessionStorage.getItem('sbs_csrf_token');
        return !!(user && token);
    }

    // Get current user
    function getCurrentUser() {
        const userStr = sessionStorage.getItem('sbs_user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch (e) {
            console.error('Failed to parse user data:', e);
            return null;
        }
    }

    // Sign out
    function signOut() {
        sessionStorage.clear();
        window.location.href = '/login.html';
    }

    // Update navigation based on login state
    function updateNavigation() {
        const navRight = document.querySelector('.nav-right');
        if (!navRight) return;

        if (isLoggedIn()) {
            const user = getCurrentUser();
            const firstName = user?.first_name || 'Account';
            const isAdmin = user?.role === 'admin';

            // Replace login/register with dashboard/signout, KEEP CART
            navRight.innerHTML = `
                <a href="/dashboard" class="nav-link">
                    👤 ${firstName}
                </a>
                ${isAdmin ? '<a href="/admin-panel" class="nav-link">⚙️ Admin</a>' : ''}
                <button class="btn-outline" onclick="window.sbsAuth.signOut()" style="font-family: inherit; font-size: 1rem;">
                    Sign Out
                </button>
                <button class="cart-toggle" onclick="toggleCart()">
                    Basket
                    <span class="cart-count" id="cart-count">0</span>
                </button>
            `;
        } else {
            // Show login/register + cart
            navRight.innerHTML = `
                <a href="/login" class="nav-link">Sign In</a>
                <a href="/register" class="btn-gold">Sign Up</a>
                <button class="cart-toggle" onclick="toggleCart()">
                    Basket
                    <span class="cart-count" id="cart-count">0</span>
                </button>
            `;
        }
    }

    // Protect pages that require login
    function requireAuth(redirectUrl = '/login.html') {
        if (!isLoggedIn()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }

    // Redirect if already logged in (for login/register pages)
    function redirectIfLoggedIn(redirectUrl = '/dashboard.html') {
        if (isLoggedIn()) {
            window.location.href = redirectUrl;
            return true;
        }
        return false;
    }

    // Session expiry check (optional - add expiry time to session)
    function checkSessionExpiry() {
        const loginTime = sessionStorage.getItem('sbs_login_time');
        if (!loginTime) return;

        const now = Date.now();
        const elapsed = now - parseInt(loginTime);
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        if (elapsed > TWENTY_FOUR_HOURS) {
            console.log('Session expired');
            signOut();
        }
    }

    // Initialize on page load
    function init() {
        // Check session expiry
        checkSessionExpiry();

        // Update navigation
        updateNavigation();

        // Listen for storage changes (multi-tab sync)
        window.addEventListener('storage', (e) => {
            if (e.key === 'sbs_user' || e.key === 'sbs_csrf_token') {
                updateNavigation();
            }
        });
    }

    // Export public API
    window.sbsAuth = {
        isLoggedIn,
        getCurrentUser,
        signOut,
        updateNavigation,
        requireAuth,
        redirectIfLoggedIn,
        init
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
