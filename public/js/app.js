/**/**

 * 🚀 SBS MOBILE-FIRST APP SCRIPT *  SBS MOBILE-FIRST APP SCRIPT

 * Lightweight, works WITH existing HTML structure * Lightweight, works WITH existing HTML structure

 * No dynamic nav replacement - just enhances what's there * No dynamic nav replacement - just enhances what's there

 */ */



(function () {(function () {

    'use strict';    'use strict';



    // ============================================================================    // ============================================================================

    // 🔐 AUTH MODULE - Read-only, no nav manipulation    //  AUTH MODULE - Read-only, no nav manipulation

    // ============================================================================    // ============================================================================



    const Auth = {    const Auth = {

        isLoggedIn() {        isLoggedIn() {

            const user = sessionStorage.getItem('sbs_user');            const user = sessionStorage.getItem('sbs_user');

            const token = sessionStorage.getItem('sbs_csrf_token');            const token = sessionStorage.getItem('sbs_csrf_token');

            return !!(user && token);            return !!(user && token);

        },        },



        async verifySession() {        async verifySession() {

            if (!this.isLoggedIn()) return false;            if (!this.isLoggedIn()) return false;

                        

            try {            try {

                const response = await fetch('/api/users/me', {                const response = await fetch('/api/users/me', {

                    credentials: 'include'                    credentials: 'include'

                });                });

                                

                if (response.ok) {                if (response.ok) {

                    const data = await response.json();                    const data = await response.json();

                    if (data.success && data.user) {                    if (data.success && data.user) {

                        sessionStorage.setItem('sbs_user', JSON.stringify(data.user));                        sessionStorage.setItem('sbs_user', JSON.stringify(data.user));

                        if (data.csrfToken) {                        if (data.csrfToken) {

                            sessionStorage.setItem('sbs_csrf_token', data.csrfToken);                            sessionStorage.setItem('sbs_csrf_token', data.csrfToken);

                        }                        }

                        return true;                        return true;

                    }                    }

                }                }

                                

                sessionStorage.clear();                sessionStorage.clear();

                return false;                return false;

            } catch (error) {            } catch (error) {

                console.error('Session verification failed:', error);                console.error('Session verification failed:', error);

                return false;                return false;

            }            }

        },        },



        getCurrentUser() {        getCurrentUser() {

            const userStr = sessionStorage.getItem('sbs_user');            const userStr = sessionStorage.getItem('sbs_user');

            if (!userStr) return null;            if (!userStr) return null;

            try {            try {

                return JSON.parse(userStr);                return JSON.parse(userStr);

            } catch (e) {            } catch (e) {

                return null;                return null;

            }            }

        },        },



        checkSessionExpiry() {        checkSessionExpiry() {

            const loginTime = sessionStorage.getItem('sbs_login_time');            const loginTime = sessionStorage.getItem('sbs_login_time');

            if (!loginTime) return;            if (!loginTime) return;



            const now = Date.now();            const now = Date.now();

            const elapsed = now - parseInt(loginTime);            const elapsed = now - parseInt(loginTime);

            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;



            if (elapsed > TWENTY_FOUR_HOURS) {            if (elapsed > TWENTY_FOUR_HOURS) {

                console.log('Session expired');                console.log('Session expired');

                this.signOut();                this.signOut();

            }            }

        },        },



        signOut() {        signOut() {

            sessionStorage.clear();            sessionStorage.clear();

            localStorage.removeItem('sbs_new_bid_submitted');            localStorage.removeItem('sbs_new_bid_submitted');

            window.location.href = '/login.html';            window.location.href = '/login.html';

        }        }

    };    };



    // ============================================================================    // ============================================================================

    // 🛒 CART MODULE - Just updates counts, doesn't touch nav structure    //  CART MODULE - Just updates counts, doesn't touch nav structure

    // ============================================================================    // ============================================================================



    const Cart = {    const Cart = {

        parseCart() {        parseCart() {

            try {            try {

                return JSON.parse(localStorage.getItem('sbs-basket')) || [];                return JSON.parse(localStorage.getItem('sbs-basket')) || [];

            } catch (error) {            } catch (error) {

                return [];                return [];

            }            }

        },        },



        updateCartCount() {        updateCartCount() {

            const cartItems = this.parseCart();            const cartItems = this.parseCart();

            const count = cartItems.length;            const count = cartItems.length;

            const formatted = count > 9 ? '9+' : String(count);            const formatted = count > 9 ? '9+' : String(count);



            // Update ALL cart count elements            const cartCounts = document.querySelectorAll('#cart-count, .cart-count, #nav-cart-count, #mobile-cart-count');

            const cartCounts = document.querySelectorAll('#cart-count, .cart-count, #nav-cart-count, #mobile-cart-count');            cartCounts.forEach(element => {

            cartCounts.forEach(element => {                if (element) {

                if (element && element.textContent !== formatted) {                    element.textContent = formatted;

                    element.textContent = formatted;                    

                                        if (element.textContent !== formatted) {

                    // Animate count change                        element.classList.remove('count-bump');

                    element.classList.remove('count-bump');                        void element.offsetWidth;

                    void element.offsetWidth;                        element.classList.add('count-bump');

                    element.classList.add('count-bump');                    }

                }                }

            });            });

        }        }

    };    };



    // ============================================================================    // ============================================================================

    // 🧭 MOBILE MENU MODULE - Only updates menu items, not main nav    //  MOBILE MENU MODULE - Only updates menu items, not main nav

    // ============================================================================    // ============================================================================



    const MobileMenu = {    const MobileMenu = {

        updateMenuItems() {        updateMenuItems() {

            const menuItems = document.querySelector('.mobile-menu-items');            const menuItems = document.querySelector('.mobile-menu-items');

            if (!menuItems) return;            if (!menuItems) return;



            if (Auth.isLoggedIn()) {            if (Auth.isLoggedIn()) {

                const user = Auth.getCurrentUser();                const user = Auth.getCurrentUser();

                const isAdmin = user?.role === 'admin';                const isAdmin = user?.role === 'admin';



                // Logged in: Buy, Sell, Dashboard, Admin?, Sign Out                menuItems.innerHTML = 

                menuItems.innerHTML = `                    <a href="/shop" class="mobile-menu-item"> Buy</a>

                    <a href="/shop" class="mobile-menu-item">🛍️ Buy</a>                    <a href="/sell" class="mobile-menu-item"> Sell</a>

                    <a href="/sell" class="mobile-menu-item">💰 Sell</a>                    <a href="/dashboard" class="mobile-menu-item"> Dashboard</a>

                    <a href="/dashboard" class="mobile-menu-item">👤 Dashboard</a>                    +(isAdmin ? '<a href="/admin/inventory/" class="mobile-menu-item"> Admin</a>' : '')+

                    ${isAdmin ? '<a href="/admin/inventory/" class="mobile-menu-item">⚙️ Admin</a>' : ''}                    <button type="button" class="mobile-menu-item btn-style" id="mobile-signout"> Sign Out</button>

                    <button type="button" class="mobile-menu-item btn-style" id="mobile-signout">🚪 Sign Out</button>                ;

                `;            } else {

            } else {                menuItems.innerHTML = 

                // Logged out: Buy, Sell, Sign In, Sign Up                    <a href="/shop" class="mobile-menu-item"> Buy</a>

                menuItems.innerHTML = `                    <a href="/sell" class="mobile-menu-item"> Sell</a>

                    <a href="/shop" class="mobile-menu-item">🛍️ Buy</a>                    <a href="/login" class="mobile-menu-item"> Sign In</a>

                    <a href="/sell" class="mobile-menu-item">💰 Sell</a>                    <a href="/register" class="mobile-menu-item btn-style"> Sign Up</a>

                    <a href="/login" class="mobile-menu-item">🔐 Sign In</a>                ;

                    <a href="/register" class="mobile-menu-item btn-style">✨ Sign Up</a>            }

                `;        }

            }    };

        }

    };    // ============================================================================

    //  ERROR HANDLING

    // ============================================================================    // ============================================================================

    // 🚨 ERROR HANDLING

    // ============================================================================    const ErrorHandler = {

        init() {

    const ErrorHandler = {            window.addEventListener('error', (event) => {

        init() {                console.error('JS Error:', event.message, event.filename, event.lineno);

            window.addEventListener('error', (event) => {            });

                console.error('JS Error:', event.message, event.filename, event.lineno);

            });            window.addEventListener('unhandledrejection', (event) => {

                console.error('Unhandled Promise:', event.reason);

            window.addEventListener('unhandledrejection', (event) => {            });

                console.error('Unhandled Promise:', event.reason);        }

            });    };

        }

    };    // ============================================================================

    //  MAIN INITIALIZATION

    // ============================================================================    // ============================================================================

    // 🚀 MAIN INITIALIZATION

    // ============================================================================    async function init() {

        ErrorHandler.init();

    async function init() {

        // Initialize error handling        if (Auth.isLoggedIn()) {

        ErrorHandler.init();            await Auth.verifySession();

        }

        // Verify session if logged in

        if (Auth.isLoggedIn()) {        Auth.checkSessionExpiry();

            await Auth.verifySession();        MobileMenu.updateMenuItems();

        }        Cart.updateCartCount();



        // Check session expiry        window.addEventListener('storage', (e) => {

        Auth.checkSessionExpiry();            if (e.key === 'sbs_user' || e.key === 'sbs_csrf_token') {

                MobileMenu.updateMenuItems();

        // Update mobile menu items based on auth state            }

        MobileMenu.updateMenuItems();            if (e.key === 'sbs-basket') {

                Cart.updateCartCount();

        // Update cart count            }

        Cart.updateCartCount();        });



        // Listen for storage changes (multi-tab sync)        document.addEventListener('click', async function(e) {

        window.addEventListener('storage', (e) => {            const signOutBtn = e.target.closest('#signOutBtn, #heroSignOutBtn, #mobile-signout, .hero-signout-btn, [data-signout]');

            if (e.key === 'sbs_user' || e.key === 'sbs_csrf_token') {            if (signOutBtn) {

                MobileMenu.updateMenuItems();                e.preventDefault();

            }                e.stopPropagation();

            if (e.key === 'sbs-basket') {                

                Cart.updateCartCount();                try {

            }                    await fetch('/api/users/logout', {

        });                        method: 'POST',

                        credentials: 'include'

        // Global sign out handler (works for all sign out buttons)                    });

        document.addEventListener('click', async function(e) {                } catch (error) {

            const signOutBtn = e.target.closest('#signOutBtn, #heroSignOutBtn, #mobile-signout, .hero-signout-btn, [data-signout]');                    console.error('Logout error:', error);

            if (signOutBtn) {                }

                e.preventDefault();                

                e.stopPropagation();                sessionStorage.clear();

                                localStorage.removeItem('sbs_new_bid_submitted');

                try {                window.location.replace('/login.html?logout=true&t=' + Date.now());

                    await fetch('/api/users/logout', {            }

                        method: 'POST',        });

                        credentials: 'include'

                    });        console.log(' SBS App initialized (mobile-first)');

                } catch (error) {    }

                    console.error('Logout error:', error);

                }    // ============================================================================

                    //  PUBLIC API

                // Clear all storage    // ============================================================================

                sessionStorage.clear();

                localStorage.removeItem('sbs_new_bid_submitted');    window.SBS = {

                        auth: Auth,

                // Redirect        cart: Cart,

                window.location.replace('/login.html?logout=true&t=' + Date.now());        mobileMenu: MobileMenu,

            }        init

        });    };



        console.log('✅ SBS App initialized (mobile-first)');    window.sbsAuth = Auth;

    }    window.updateCartCount = Cart.updateCartCount.bind(Cart);



    // ============================================================================    if (document.readyState === 'loading') {

    // 📤 PUBLIC API        document.addEventListener('DOMContentLoaded', init);

    // ============================================================================    } else {

        init();

    window.SBS = {    }

        auth: Auth,

        cart: Cart,})();

        mobileMenu: MobileMenu,
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
