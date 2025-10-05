/**
 * 🛒 SBS CART MANAGEMENT
 * Centralized basket/cart functionality
 * Ensures consistency across all pages
 */

const SBSCart = {
    // Storage key (unified across all pages)
    storageKey: 'sbs-basket',

    // Get cart items
    getItems() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        } catch (e) {
            console.error('Error reading cart:', e);
            return [];
        }
    },

    // Set cart items
    setItems(items) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(items));
            this.updateAllCounters();
            return true;
        } catch (e) {
            console.error('Error saving cart:', e);
            return false;
        }
    },

    // Add item to cart
    addItem(item) {
        const cart = this.getItems();
        const enrichedItem = {
            ...item,
            timestamp: Date.now()
        };

        cart.push(enrichedItem);
        const success = this.setItems(cart);

        if (success) {
            window.dispatchEvent(new CustomEvent('cart-item-added', {
                detail: { item: enrichedItem, count: cart.length }
            }));
        }

        return success;
    },

    // Remove item by index
    removeItem(index) {
        const cart = this.getItems();
        if (index < 0 || index >= cart.length) return false;

        const [removedItem] = cart.splice(index, 1);
        const success = this.setItems(cart);

        if (success) {
            window.dispatchEvent(new CustomEvent('cart-item-removed', {
                detail: { item: removedItem, count: cart.length }
            }));
        }

        return success;
    },

    // Clear entire cart
    clear() {
        localStorage.removeItem(this.storageKey);
        this.updateAllCounters();
        window.dispatchEvent(new CustomEvent('cart-cleared'));
    },

    // Get cart count
    getCount() {
        return this.getItems().length;
    },

    formatCartCount(count) {
        if (count > 99) {
            return '99+';
        }
        if (count > 9) {
            return '9+';
        }
        return String(count);
    },

    // Update all cart counters on page
    updateAllCounters() {
        const count = this.getCount();
        const displayValue = this.formatCartCount(count);

        const counterIds = ['cart-count', 'basket-count', 'nav-cart-count', 'mobile-cart-count'];

        counterIds.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                return;
            }

            element.textContent = displayValue;
            element.dataset.count = String(count);

            if (count > 0) {
                element.style.visibility = 'visible';
                element.style.opacity = '1';
                element.classList.add('has-items');
            } else {
                element.style.visibility = 'hidden';
                element.style.opacity = '0';
                element.classList.remove('has-items');
            }
        });

        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('cart-updated', {
            detail: { count, items: this.getItems() }
        }));
    },

    // BUG #9 FIX: Calculate cart total
    getTotal() {
        const items = this.getItems();
        return items.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            return sum + price;
        }, 0);
    },

    // BUG #9 FIX: Calculate total with delivery fee
    getTotalWithDelivery(deliveryFee = 0) {
        return this.getTotal() + parseFloat(deliveryFee);
    },

    // BUG #9 FIX: Format price for display
    formatPrice(amount) {
        const num = parseFloat(amount) || 0;
        return `£${num.toFixed(2)}`;
    },

    // Initialize cart system
    init() {
        // Update counters on page load
        this.updateAllCounters();

        // Update when localStorage changes in another tab
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey) {
                this.updateAllCounters();
            }
        });

        console.log('✅ SBS Cart System initialized');
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SBSCart.init());
} else {
    SBSCart.init();
}

// Make globally available
window.SBSCart = SBSCart;
