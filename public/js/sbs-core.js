/**
 * 🎯 SBS CORE SYSTEM - UNIFIED ARCHITECTURE
 * Single source for all client-side logic
 * Version: 3.0
 * Last Updated: October 3, 2025
 * 
 * CONSOLIDATES:
 * - Authentication (from app.js)
 * - Cart/Basket (from shop.html inline)
 * - Helper System (from helper.js)
 * - Checkout Flow (from checkout.js)
 * - Toast Notifications (scattered across files)
 * - API Client (scattered fetch calls)
 * - LocalStorage Management
 */

(function() {
    'use strict';

    // ============================================================================
    // 🔧 CONFIGURATION
    // ============================================================================
    
    const CONFIG = {
        API_BASE: window.location.origin,
        STORAGE_PREFIX: 'sbs-',
        SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
        TOAST_DURATION: 3000,
        CART_STORAGE_KEY: 'sbs-basket',
        USER_STORAGE_KEY: 'sbs_user',
        TOKEN_STORAGE_KEY: 'sbs_csrf_token'
    };

    // ============================================================================
    // 🗄️ STORAGE MANAGER - Centralized Storage Operations
    // ============================================================================
    
    const Storage = {
        // Generic get/set
        get(key, useSession = false) {
            const storage = useSession ? sessionStorage : localStorage;
            const fullKey = key.startsWith('sbs') ? key : CONFIG.STORAGE_PREFIX + key;
            const data = storage.getItem(fullKey);
            if (!data) return null;
            
            try {
                const parsed = JSON.parse(data);
                // Check expiry if exists
                if (parsed.__expires && Date.now() > parsed.__expires) {
                    storage.removeItem(fullKey);
                    return null;
                }
                return parsed.__value !== undefined ? parsed.__value : parsed;
            } catch {
                return data;
            }
        },

        set(key, value, useSession = false, expiryMs = null) {
            const storage = useSession ? sessionStorage : localStorage;
            const fullKey = key.startsWith('sbs') ? key : CONFIG.STORAGE_PREFIX + key;
            const data = expiryMs ? {
                __value: value,
                __expires: Date.now() + expiryMs
            } : value;
            storage.setItem(fullKey, JSON.stringify(data));
        },

        remove(key, useSession = false) {
            const storage = useSession ? sessionStorage : localStorage;
            const fullKey = key.startsWith('sbs') ? key : CONFIG.STORAGE_PREFIX + key;
            storage.removeItem(fullKey);
        },

        clear(useSession = false) {
            const storage = useSession ? sessionStorage : localStorage;
            Object.keys(storage).forEach(key => {
                if (key.startsWith(CONFIG.STORAGE_PREFIX)) {
                    storage.removeItem(key);
                }
            });
        }
    };

    // ============================================================================
    // 🔐 AUTH MODULE - User Authentication & Session Management
    // ============================================================================
    
    const Auth = {
        isLoggedIn() {
            const user = Storage.get(CONFIG.USER_STORAGE_KEY, true);
            const token = Storage.get(CONFIG.TOKEN_STORAGE_KEY, true);
            return !!(user && token);
        },

        getCurrentUser() {
            return Storage.get(CONFIG.USER_STORAGE_KEY, true);
        },

        getToken() {
            return Storage.get(CONFIG.TOKEN_STORAGE_KEY, true);
        },

        login(userData, token) {
            Storage.set(CONFIG.USER_STORAGE_KEY, userData, true, CONFIG.SESSION_TIMEOUT);
            Storage.set(CONFIG.TOKEN_STORAGE_KEY, token, true, CONFIG.SESSION_TIMEOUT);
        },

        logout() {
            Storage.clear(true); // Clear session storage
            window.location.href = '/login.html';
        },

        requireAuth(redirectUrl = '/login.html') {
            if (!this.isLoggedIn()) {
                window.location.href = redirectUrl;
                return false;
            }
            return true;
        },

        redirectIfLoggedIn(redirectUrl = '/dashboard.html') {
            if (this.isLoggedIn()) {
                window.location.href = redirectUrl;
                return true;
            }
            return false;
        },

        isAdmin() {
            const user = this.getCurrentUser();
            return user && user.role === 'admin';
        }
    };

    // ============================================================================
    // 🛒 CART MODULE - Shopping Basket Management
    // ============================================================================
    
    const Cart = {
        get() {
            return Storage.get(CONFIG.CART_STORAGE_KEY) || [];
        },

        set(items) {
            Storage.set(CONFIG.CART_STORAGE_KEY, items);
            this.updateCount();
        },

        add(item) {
            const basket = this.get();
            const existingIndex = basket.findIndex(
                i => i.id === item.id && i.size === item.size
            );

            if (existingIndex >= 0) {
                basket[existingIndex].quantity = (basket[existingIndex].quantity || 1) + 1;
            } else {
                basket.push({ ...item, quantity: 1 });
            }

            this.set(basket);
            UI.showToast(`Added ${item.brand} to basket`);
            return basket;
        },

        remove(index) {
            const basket = this.get();
            if (index >= 0 && index < basket.length) {
                basket.splice(index, 1);
                this.set(basket);
            }
            return basket;
        },

        clear() {
            this.set([]);
        },

        getCount() {
            return this.get().reduce((sum, item) => sum + (item.quantity || 1), 0);
        },

        getTotal() {
            return this.get().reduce((sum, item) => 
                sum + (item.price * (item.quantity || 1)), 0
            );
        },

        updateCount() {
            const countElements = document.querySelectorAll('[data-cart-count]');
            const count = this.getCount();
            countElements.forEach(el => {
                el.textContent = count;
                el.style.display = count > 0 ? 'inline-block' : 'none';
            });
        }
    };

    // ============================================================================
    // 🌐 API CLIENT - Unified HTTP Request Handler
    // ============================================================================
    
    const API = {
        async request(endpoint, options = {}) {
            const url = endpoint.startsWith('http') 
                ? endpoint 
                : `${CONFIG.API_BASE}${endpoint}`;

            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    ...(Auth.getToken() && { 'X-CSRF-Token': Auth.getToken() })
                }
            };

            const config = { ...defaultOptions, ...options };
            if (config.body && typeof config.body === 'object') {
                config.body = JSON.stringify(config.body);
            }

            try {
                const response = await fetch(url, config);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `HTTP ${response.status}`);
                }

                return data;
            } catch (error) {
                console.error('API Error:', error);
                throw error;
            }
        },

        get(endpoint) {
            return this.request(endpoint, { method: 'GET' });
        },

        post(endpoint, body) {
            return this.request(endpoint, { method: 'POST', body });
        },

        put(endpoint, body) {
            return this.request(endpoint, { method: 'PUT', body });
        },

        delete(endpoint) {
            return this.request(endpoint, { method: 'DELETE' });
        }
    };

    // ============================================================================
    // 💬 UI MODULE - User Interface Helpers
    // ============================================================================
    
    const UI = {
        // Toast notifications
        showToast(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
            // Remove existing toast
            const existing = document.getElementById('sbs-toast');
            if (existing) existing.remove();

            // Create toast
            const toast = document.createElement('div');
            toast.id = 'sbs-toast';
            toast.className = `sbs-toast sbs-toast-${type}`;
            toast.textContent = message;
            
            // Add styles if not exist
            if (!document.getElementById('sbs-toast-styles')) {
                const style = document.createElement('style');
                style.id = 'sbs-toast-styles';
                style.textContent = `
                    .sbs-toast {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        padding: 16px 24px;
                        background: #1a1a1a;
                        color: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        z-index: 10000;
                        animation: slideIn 0.3s ease-out;
                    }
                    .sbs-toast-success { background: #059669; }
                    .sbs-toast-error { background: #dc2626; }
                    .sbs-toast-warning { background: #f59e0b; }
                    @keyframes slideIn {
                        from { transform: translateX(400px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },

        // Modal system
        createModal(content, className = '') {
            const modal = document.createElement('div');
            modal.className = `sbs-modal ${className}`;
            modal.innerHTML = `
                <div class="sbs-modal-overlay" onclick="this.closest('.sbs-modal').remove()"></div>
                <div class="sbs-modal-content">
                    <button class="sbs-modal-close" onclick="this.closest('.sbs-modal').remove()">×</button>
                    ${content}
                </div>
            `;

            // Add modal styles if not exist
            if (!document.getElementById('sbs-modal-styles')) {
                const style = document.createElement('style');
                style.id = 'sbs-modal-styles';
                style.textContent = `
                    .sbs-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        z-index: 9999;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .sbs-modal-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0,0,0,0.8);
                    }
                    .sbs-modal-content {
                        position: relative;
                        background: #1a1a1a;
                        color: white;
                        padding: 32px;
                        border-radius: 12px;
                        max-width: 90%;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                    }
                    .sbs-modal-close {
                        position: absolute;
                        top: 16px;
                        right: 16px;
                        background: none;
                        border: none;
                        color: white;
                        font-size: 32px;
                        cursor: pointer;
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                    }
                    .sbs-modal-close:hover {
                        background: rgba(255,255,255,0.1);
                    }
                `;
                document.head.appendChild(style);
            }

            return modal;
        },

        showModal(content, className = '') {
            const modal = this.createModal(content, className);
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';
            
            // Cleanup on close
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('sbs-modal-close') || 
                    e.target.classList.contains('sbs-modal-overlay')) {
                    document.body.style.overflow = '';
                }
            });

            return modal;
        },

        // Loading spinner
        showLoading(target) {
            if (typeof target === 'string') {
                target = document.querySelector(target);
            }
            if (!target) return;

            const spinner = document.createElement('div');
            spinner.className = 'sbs-loading';
            spinner.innerHTML = '<div class="sbs-spinner"></div>';
            
            if (!document.getElementById('sbs-loading-styles')) {
                const style = document.createElement('style');
                style.id = 'sbs-loading-styles';
                style.textContent = `
                    .sbs-loading {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .sbs-spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid rgba(255,255,255,0.1);
                        border-top-color: white;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }

            target.innerHTML = '';
            target.appendChild(spinner);
        }
    };

    // ============================================================================
    // ❓ HELPER MODULE - Context-Aware Help System
    // ============================================================================
    
    const Helper = {
        content: {
            // Shop helps
            'shop-how-to-buy': {
                title: 'How to Buy',
                content: `
                    <h3>🛍️ Shopping Made Easy</h3>
                    <ol>
                        <li>Browse our curated collection</li>
                        <li>Select your size and add to basket</li>
                        <li>Review your basket and checkout</li>
                        <li>Choose collection (free) or delivery (+€5)</li>
                        <li>We'll confirm your order via SMS/WhatsApp</li>
                    </ol>
                    <p><strong>Collection:</strong> Free at our Limerick location<br>
                    <strong>Delivery:</strong> €5 anywhere in Ireland</p>
                `
            },
            'shop-size-guide': {
                title: 'Size Guide',
                content: `
                    <h3>📏 Finding Your Perfect Fit</h3>
                    <p><strong>Clothes:</strong> XS, S, M, L, XL (Standard EU sizing)</p>
                    <p><strong>Shoes:</strong> UK sizes 6-12 (including half sizes)</p>
                    <p><strong>Pre-Owned Clothes:</strong> Some items have mixed sizes (e.g., "M Top / L Bottom")</p>
                    <p><em>All measurements are in product descriptions. Still unsure? Message us on WhatsApp!</em></p>
                `
            },

            // Sell helps
            'sell-how-to-sell': {
                title: 'How to Sell',
                content: `
                    <h3>💰 Sell Your Designer Items</h3>
                    <ol>
                        <li><strong>Use Quick Builder</strong> - Select category and size</li>
                        <li><strong>Add Items</strong> - Enter brand, description, and photos</li>
                        <li><strong>Submit Batch</strong> - We'll review within 24 hours</li>
                        <li><strong>Get Paid</strong> - Bank transfer or store credit</li>
                    </ol>
                    <p><em>💡 Tip: Better photos = faster approval!</em></p>
                `
            },
            'sell-what-we-buy': {
                title: 'What We Accept',
                content: `
                    <h3>✅ Items We Love</h3>
                    <p><strong>Brand New:</strong> Designer clothes & shoes with tags<br>
                    <strong>Pre-Owned:</strong> Excellent condition, minimal wear</p>
                    <p><strong>Brands:</strong> Nike, Adidas, North Face, Stone Island, Ralph Lauren, and more premium brands</p>
                    <h3>❌ Items We Don't Accept</h3>
                    <p>❌ Damaged or heavily worn items<br>
                    ❌ Non-designer/budget brands<br>
                    ❌ Items without proper documentation</p>
                `
            },

            // Admin helps
            'admin-quick-start': {
                title: 'Admin Quick Start',
                content: `
                    <h3>🎛️ Admin Dashboard Overview</h3>
                    <p><strong>Inventory:</strong> Manage products, upload images<br>
                    <strong>Analytics:</strong> Sales data and trends<br>
                    <strong>Overview:</strong> System health and stats</p>
                    <p><em>Use the Cloudflare Images API for all product uploads</em></p>
                `
            }
        },

        show(topicKey) {
            const topic = this.content[topicKey];
            if (!topic) {
                console.warn('Helper topic not found:', topicKey);
                return;
            }

            // Check "don't show again"
            const dontShow = Storage.get(`helper-hide-${topicKey}`);
            if (dontShow) return;

            const content = `
                <div class="helper-content">
                    <h2>${topic.title}</h2>
                    ${topic.content}
                    <div style="margin-top: 24px; display: flex; gap: 12px; align-items: center;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="helper-dont-show-${topicKey}">
                            <span>Don't show this again</span>
                        </label>
                    </div>
                </div>
            `;

            const modal = UI.showModal(content, 'helper-modal');
            
            // Handle "don't show again"
            modal.addEventListener('click', (e) => {
                if (e.target.closest('.sbs-modal-close') || e.target.classList.contains('sbs-modal-overlay')) {
                    const checkbox = modal.querySelector(`#helper-dont-show-${topicKey}`);
                    if (checkbox && checkbox.checked) {
                        Storage.set(`helper-hide-${topicKey}`, true);
                    }
                }
            });
        },

        init() {
            // Auto-attach to all help buttons
            document.addEventListener('click', (e) => {
                const helpBtn = e.target.closest('[data-help]');
                if (helpBtn) {
                    e.preventDefault();
                    const topic = helpBtn.dataset.help;
                    this.show(topic);
                }
            });
        }
    };

    // ============================================================================
    // 🛍️ CHECKOUT MODULE - Complete Checkout Flow
    // ============================================================================
    
    const Checkout = {
        async start() {
            const basket = Cart.get();
            
            if (basket.length === 0) {
                UI.showToast('Your basket is empty!', 'warning');
                return;
            }

            const content = this.buildCheckoutForm(basket);
            UI.showModal(content, 'checkout-modal');
            
            // Attach form handler
            document.getElementById('checkout-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.submit(e.target);
            });

            // Update total on delivery change
            document.querySelectorAll('input[name="delivery"]').forEach(radio => {
                radio.addEventListener('change', () => this.updateTotal());
            });

            this.updateTotal();
        },

        buildCheckoutForm(basket) {
            const itemsHtml = basket.map(item => `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333;">
                    <span>${item.brand} - ${item.size}</span>
                    <span>€${(item.price * (item.quantity || 1)).toFixed(2)}</span>
                </div>
            `).join('');

            return `
                <div style="max-width: 500px;">
                    <h2>Checkout</h2>
                    
                    <div style="margin-bottom: 24px;">
                        <h3>Your Items</h3>
                        ${itemsHtml}
                    </div>

                    <form id="checkout-form">
                        <div style="margin-bottom: 16px;">
                            <label>Full Name *</label>
                            <input type="text" name="name" required style="width: 100%; padding: 12px; background: #0a0a0a; border: 1px solid #333; color: white; border-radius: 6px;">
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label>Phone Number *</label>
                            <input type="tel" name="phone" required pattern="[0-9]{10,}" style="width: 100%; padding: 12px; background: #0a0a0a; border: 1px solid #333; color: white; border-radius: 6px;">
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label>Delivery Method *</label>
                            <div style="display: flex; gap: 16px; margin-top: 8px;">
                                <label style="flex: 1; padding: 16px; background: #0a0a0a; border: 2px solid #333; border-radius: 8px; cursor: pointer;">
                                    <input type="radio" name="delivery" value="collection" checked>
                                    <div><strong>Collection</strong></div>
                                    <div style="font-size: 14px; color: #888;">Free - Limerick</div>
                                </label>
                                <label style="flex: 1; padding: 16px; background: #0a0a0a; border: 2px solid #333; border-radius: 8px; cursor: pointer;">
                                    <input type="radio" name="delivery" value="delivery">
                                    <div><strong>Delivery</strong></div>
                                    <div style="font-size: 14px; color: #888;">+€5</div>
                                </label>
                            </div>
                        </div>

                        <div id="delivery-address" style="display: none;">
                            <div style="margin-bottom: 16px;">
                                <label>Address *</label>
                                <input type="text" name="address" style="width: 100%; padding: 12px; background: #0a0a0a; border: 1px solid #333; color: white; border-radius: 6px;">
                            </div>
                            <div style="margin-bottom: 16px;">
                                <label>City *</label>
                                <input type="text" name="city" style="width: 100%; padding: 12px; background: #0a0a0a; border: 1px solid #333; color: white; border-radius: 6px;">
                            </div>
                            <div style="margin-bottom: 16px;">
                                <label>Eircode</label>
                                <input type="text" name="eircode" style="width: 100%; padding: 12px; background: #0a0a0a; border: 1px solid #333; color: white; border-radius: 6px;">
                            </div>
                        </div>

                        <div style="margin-top: 24px; padding-top: 16px; border-top: 2px solid #333;">
                            <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold;">
                                <span>Total:</span>
                                <span id="checkout-total">€0.00</span>
                            </div>
                        </div>

                        <button type="submit" style="width: 100%; padding: 16px; background: white; color: black; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 24px;">
                            Confirm Order
                        </button>
                    </form>
                </div>
            `;
        },

        updateTotal() {
            const basket = Cart.get();
            const subtotal = Cart.getTotal();
            const deliveryMethod = document.querySelector('input[name="delivery"]:checked');
            const deliveryFee = deliveryMethod && deliveryMethod.value === 'delivery' ? 5 : 0;
            const total = subtotal + deliveryFee;

            const totalEl = document.getElementById('checkout-total');
            if (totalEl) {
                totalEl.textContent = `€${total.toFixed(2)}`;
            }

            // Show/hide address fields
            const addressDiv = document.getElementById('delivery-address');
            if (addressDiv) {
                addressDiv.style.display = deliveryFee > 0 ? 'block' : 'none';
                const addressInputs = addressDiv.querySelectorAll('input');
                addressInputs.forEach(input => {
                    input.required = deliveryFee > 0;
                });
            }
        },

        async submit(form) {
            const formData = new FormData(form);
            const basket = Cart.get();
            const deliveryFee = formData.get('delivery') === 'delivery' ? 5 : 0;

            const orderData = {
                items: basket.map(item => ({
                    id: item.id,
                    name: `${item.brand} - ${item.category}`,
                    size: item.size,
                    price: item.price,
                    quantity: item.quantity || 1
                })),
                customer: {
                    name: formData.get('name'),
                    phone: formData.get('phone')
                },
                delivery: {
                    method: formData.get('delivery'),
                    fee: deliveryFee,
                    address: deliveryFee > 0 ? {
                        address: formData.get('address'),
                        city: formData.get('city'),
                        eircode: formData.get('eircode')
                    } : null
                },
                total: Cart.getTotal() + deliveryFee
            };

            try {
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Processing...';

                const result = await API.post('/api/orders', orderData);

                if (result.success) {
                    Cart.clear();
                    document.querySelector('.sbs-modal').remove();
                    document.body.style.overflow = '';
                    
                    UI.showModal(`
                        <div style="text-align: center;">
                            <div style="font-size: 64px; margin-bottom: 16px;">✅</div>
                            <h2>Order Confirmed!</h2>
                            <p style="font-size: 18px; margin: 16px 0;">Order #${result.order.id}</p>
                            <p>We'll contact you shortly via ${formData.get('phone')}</p>
                            <button onclick="location.reload()" style="margin-top: 24px; padding: 12px 32px; background: white; color: black; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                                Continue Shopping
                            </button>
                        </div>
                    `, 'checkout-success');
                }
            } catch (error) {
                UI.showToast('Order failed. Please try again or contact us on WhatsApp.', 'error');
                form.querySelector('button[type="submit"]').disabled = false;
                form.querySelector('button[type="submit"]').textContent = 'Confirm Order';
            }
        }
    };

    // ============================================================================
    // 🚀 INITIALIZATION
    // ============================================================================
    
    const SBS = {
        Auth,
        Cart,
        API,
        UI,
        Helper,
        Checkout,
        Storage,
        CONFIG,

        init() {
            console.log('🎯 SBS Core System Initialized');
            
            // Update cart count on load
            Cart.updateCount();
            
            // Initialize helper system
            Helper.init();
            
            // Expose global checkout function
            window.checkout = () => Checkout.start();
            
            // Add helper button styles
            if (!document.getElementById('sbs-helper-btn-styles')) {
                const style = document.createElement('style');
                style.id = 'sbs-helper-btn-styles';
                style.textContent = `
                    .sbs-help-btn {
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background: white;
                        color: black;
                        border: none;
                        font-weight: bold;
                        font-size: 18px;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    }
                    .sbs-help-btn:hover {
                        background: #f0f0f0;
                        transform: scale(1.1);
                    }
                `;
                document.head.appendChild(style);
            }
        }
    };

    // Auto-initialize when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SBS.init());
    } else {
        SBS.init();
    }

    // Expose to window
    window.SBS = SBS;

})();
