// 🛍️ SBS SHOP - CLEAN REBUILD FOR NEW API
class SimpleShopUI {
    constructor() {
        this.products = [];
        this.init();
    }

    async init() {
        console.log('🚀 SBS Shop: Initializing...');
        
        // Show loading state
        this.showLoading();
        
        try {
            // Try to load from new API
            await this.loadProducts();
        } catch (error) {
            console.error('Failed to load products:', error);
            this.showError();
        }
    }

    async loadProducts() {
        // This will be updated with your new Worker API URL
        const response = await fetch('/api/products');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        this.products = data.products || [];
        this.renderProducts();
    }

    showLoading() {
        const container = document.getElementById('products-grid');
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <div style="color: #ffd700; font-size: 18px; margin-bottom: 10px;">🔄</div>
                    <div style="color: #fff;">Loading products...</div>
                </div>
            `;
        }
    }

    showError() {
        const container = document.getElementById('products-grid');
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: #1a1a1a; border-radius: 8px;">
                    <div style="color: #ff4444; font-size: 24px; margin-bottom: 15px;">⚠️</div>
                    <h3 style="color: #fff; margin-bottom: 10px;">Unable to load products</h3>
                    <p style="color: #ccc; margin-bottom: 20px;">Preparing new API connection...</p>
                    <button onclick="window.location.reload()" 
                            style="background: #ffd700; color: #000; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                        Refresh Page
                    </button>
                </div>
            `;
        }
    }

    renderProducts() {
        const container = document.getElementById('products-grid');
        if (!container || this.products.length === 0) {
            this.showError();
            return;
        }

        container.innerHTML = this.products.map(product => `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" loading="lazy" 
                         onerror="this.src='/SBS (Your Story).png';">
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">€${product.price}</p>
                    <p class="product-category">${product.category}</p>
                    <button class="add-to-cart-btn" onclick="shopUI.addToCart('${product.id}')">
                        Add to Basket
                    </button>
                </div>
            </div>
        `).join('');

        console.log(`✅ Rendered ${this.products.length} products`);
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            console.log('Added to cart:', product.name);
            // Cart functionality will be added later
            alert(`Added "${product.name}" to cart!`);
        }
    }
}

// Initialize the shop
let shopUI;
document.addEventListener('DOMContentLoaded', () => {
    shopUI = new SimpleShopUI();
    console.log('✅ SBS Shop ready for new API');
});