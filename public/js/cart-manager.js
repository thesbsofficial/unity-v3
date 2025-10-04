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
        cart.push({
            ...item,
            timestamp: Date.now()
        });
        return this.setItems(cart);
    },

    // Remove item by index
    removeItem(index) {
        const cart = this.getItems();
        cart.splice(index, 1);
        return this.setItems(cart);
    },

    // Clear entire cart
    clear() {
        localStorage.removeItem(this.storageKey);
        this.updateAllCounters();
    },

    // Get cart count
    getCount() {
        return this.getItems().length;
    },

    // Update all cart counters on page
    updateAllCounters() {
        const count = this.getCount();

        // Try all possible counter IDs
        const counterIds = ['cart-count', 'basket-count', 'nav-cart-count', 'mobile-cart-count'];

        counterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = count;

                // Show/hide badge based on count
                if (count > 0) {
                    element.style.display = 'block';
                    element.classList.add('has-items');
                } else {
                    element.style.display = 'none';
                    element.classList.remove('has-items');
                }
            }
        });

        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('cart-updated', {
            detail: { count, items: this.getItems() }
        }));
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
