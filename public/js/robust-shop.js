// 🛍️ SBS SHOP - CLEAN & READY FOR NEW API
class RobustShopUI {
    constructor() {
        console.log('🚀 SBS Shop: Initializing clean version...');
        this.products = [];
        this.cart = JSON.parse(localStorage.getItem('sbs-cart') || '[]');
        this.apiReady = false;

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        console.log('🔧 Initializing SBS Shop...');

        this.showLoading();

        try {
            await this.loadProducts();
            this.renderProducts();
            this.setupEventListeners();
            console.log('✅ Shop initialized successfully');
        } catch (error) {
            console.error('Shop initialization failed:', error);
            this.showComingSoon();
        }
    }

    showLoading() {
        const container = document.getElementById('products-grid');
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: rgba(255, 215, 0, 0.05); border-radius: 12px; border: 2px dashed #ffd700;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔄</div>
                    <h3 style="color: #ffd700; margin-bottom: 10px;">Loading SBS Products</h3>
                    <p style="color: #ccc;">Connecting to our latest drops...</p>
                </div>
            `;
        }
    }

    showComingSoon() {
        const container = document.getElementById('products-grid');
        if (container) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px; background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-radius: 16px; border: 1px solid #333;">
                    <div style="font-size: 64px; margin-bottom: 30px; filter: drop-shadow(0 0 10px #ffd700);">👑</div>
                    <h2 style="color: #ffd700; margin-bottom: 15px; font-size: 28px;">SBS Shop Coming Soon</h2>
                    <p style="color: #ccc; font-size: 18px; margin-bottom: 10px;">We're crafting something extraordinary</p>
                    <p style="color: #999; font-size: 16px; margin-bottom: 30px;">Your story. Your style. Coming soon.</p>
                    <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                        <div style="background: rgba(255, 215, 0, 0.1); padding: 12px 20px; border-radius: 25px; border: 1px solid #ffd700;">
                            <span style="color: #ffd700; font-size: 14px;">🔥 Exclusive Drops</span>
                        </div>
                        <div style="background: rgba(255, 215, 0, 0.1); padding: 12px 20px; border-radius: 25px; border: 1px solid #ffd700;">
                            <span style="color: #ffd700; font-size: 14px;">✨ Premium Quality</span>
                        </div>
                        <div style="background: rgba(255, 215, 0, 0.1); padding: 12px 20px; border-radius: 25px; border: 1px solid #ffd700;">
                            <span style="color: #ffd700; font-size: 14px;">🎯 Limited Edition</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    async loadProducts() {
        console.log('📦 Attempting to load products...');

        try {
            // This will be updated with new Worker API URL
            const response = await fetch('/api/products');

            if (response.ok) {
                const data = await response.json();
                this.products = data.products || [];
                this.apiReady = true;
                console.log(`✅ Loaded ${this.products.length} products from API`);
            } else {
                throw new Error(`API returned ${response.status}`);
            }
        } catch (error) {
            console.log('ℹ️ API not ready yet, showing coming soon page');
            this.products = [];
            this.apiReady = false;
        }
    }

    renderProducts() {
        const container = document.getElementById('products-grid');

        if (!container) {
            console.error('❌ Products grid container not found');
            return;
        }

        if (this.products.length === 0) {
            this.showComingSoon();
            return;
        }

        container.innerHTML = this.products.map(product => this.createProductCard(product)).join('');
        console.log(`✅ Rendered ${this.products.length} products`);

        // Populate size filter after products are rendered
        this.populateSizeFilter();
    }

    createProductCard(product) {
        return `
            <div class="product-card" data-category="${product.category}" data-id="${product.id}" onclick="shop.addToCart('${product.id}')" style="
                cursor: pointer !important;
                border-radius: 8px !important;
                overflow: visible !important;
                transition: transform 0.2s ease !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
                display: block !important;
                background: #000 !important;
                margin: 0 !important;
                width: 100% !important;
            ">
                <div class="image-container" style="
                    position: relative !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border-radius: 8px 8px 0 0 !important;
                    overflow: hidden !important;
                ">
                    <img src="${product.image}" 
                         alt="${product.name}" 
                         onload="console.log('✅ Image loaded:', this.src)"
                         onerror="console.error('❌ Image failed:', this.src)"
                         style="
                            width: 100% !important;
                            height: auto !important;
                            display: block !important;
                            visibility: visible !important;
                            opacity: 1 !important;
                            margin: 0 !important;
                            padding: 0 !important;
                         ">
                </div>
                
                <div class="card-content" style="
                    padding: 10px 12px 12px 12px !important;
                    background: #000 !important;
                    border-radius: 0 0 8px 8px !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: flex-start !important;
                    gap: 8px !important;
                    flex-wrap: wrap !important;
                    min-height: 40px !important;
                    box-sizing: border-box !important;
                ">
                    <div class="condition-pill" style="
                        background: ${product.condition === 'Brand New' ? '#ffd700' : '#333'} !important;
                        color: ${product.condition === 'Brand New' ? '#000' : '#ffd700'} !important;
                        padding: 5px 10px !important;
                        border-radius: 16px !important;
                        font-size: 10px !important;
                        font-weight: 700 !important;
                        letter-spacing: 0.3px !important;
                        text-transform: uppercase !important;
                        white-space: nowrap !important;
                        flex-shrink: 0 !important;
                        line-height: 1.2 !important;
                    ">
                        ${product.condition === 'Brand New' ? 'NEW' : 'PRE-OWNED'}
                    </div>
                    
                    <div class="size-pill" style="
                        background: #ffd700 !important;
                        color: #000 !important;
                        padding: 5px 10px !important;
                        border-radius: 16px !important;
                        font-size: 10px !important;
                        font-weight: 700 !important;
                        letter-spacing: 0.3px !important;
                        text-transform: uppercase !important;
                        white-space: nowrap !important;
                        flex-shrink: 0 !important;
                        line-height: 1.2 !important;
                    ">
                        SIZE ${product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'OS'}
                    </div>
                </div>
            </div>
        `;
    }

    formatCategoryName(category) {
        const categoryMap = {
            'BN-CLOTHES': 'New • Clothes',
            'BN-SHOES': 'New • Shoes',
            'PO-CLOTHES': 'Pre-Owned • Clothes',
            'PO-SHOES': 'Pre-Owned • Shoes',
            'Streetwear': 'Streetwear'
        };
        return categoryMap[category] || category;
    }

    formatCategoryNameShort(category) {
        const shortCategoryMap = {
            'BN-CLOTHES': 'CLOTHES',
            'BN-SHOES': 'SHOES',
            'PO-CLOTHES': 'CLOTHES',
            'PO-SHOES': 'SHOES',
            'Streetwear': 'STREET'
        };
        return shortCategoryMap[category] || category;
    }

    getCategoryName(category) {
        const categoryNames = {
            'BN-CLOTHES': 'CLOTHES',
            'BN-SHOES': 'SHOES',
            'PO-CLOTHES': 'CLOTHES',
            'PO-SHOES': 'SHOES',
            'Streetwear': 'CLOTHES'
        };
        return categoryNames[category] || 'CLOTHES';
    }

    setupEventListeners() {
        console.log('🎧 Setting up event listeners...');

        // Search functionality
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterProducts(e.target.value);
            });
        }

        // Category filter buttons
        document.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                // Remove active class from all buttons
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');

                const category = e.target.dataset.category;
                this.filterByCategory(category);
            });
        });

        // Size filter dropdown
        const sizeDropdown = document.getElementById('size-dropdown');
        if (sizeDropdown) {
            sizeDropdown.addEventListener('change', (e) => {
                this.filterBySize(e.target.value);
            });
        }

        // Update cart display
        this.updateCartUI();
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            this.cart.push({ ...product, addedAt: Date.now() });
            localStorage.setItem('sbs-cart', JSON.stringify(this.cart));
            this.updateCartUI();
            this.showAddToCartFeedback(product.name);
            console.log(`🛒 Added ${product.name} to cart`);
        }
    }

    showAddToCartFeedback(productName) {
        // Simple notification
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #ffd700; color: #000; padding: 15px 20px; border-radius: 8px; font-weight: bold; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                ✅ Added "${productName}" to basket!
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    updateCartUI() {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = this.cart.length;
            cartCount.style.display = this.cart.length > 0 ? 'block' : 'none';
        }
    }

    filterProducts(searchTerm) {
        if (!this.apiReady) return;

        const filtered = this.products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        this.renderFilteredProducts(filtered);
    }

    filterByCategory(category) {
        if (!this.apiReady) return;

        if (category === 'all') {
            this.renderProducts();
            return;
        }

        const filtered = this.products.filter(product =>
            product.category && product.category === category
        );

        this.renderFilteredProducts(filtered);
    }

    filterBySize(size) {
        if (!this.apiReady) return;

        if (size === 'all') {
            this.renderProducts();
            return;
        }

        const filtered = this.products.filter(product =>
            product.sizes && product.sizes.includes(size)
        );

        this.renderFilteredProducts(filtered);
    }

    populateSizeFilter() {
        const sizeDropdown = document.getElementById('size-dropdown');
        if (!sizeDropdown || !this.products.length) return;

        // Get all unique sizes
        const allSizes = new Set();
        this.products.forEach(product => {
            if (product.sizes) {
                product.sizes.forEach(size => allSizes.add(size));
            }
        });

        // Clear existing options (except "All Sizes")
        sizeDropdown.innerHTML = '<option value="all">All Sizes</option>';

        // Add size options
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        sizeOrder.forEach(size => {
            if (allSizes.has(size)) {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = size;
                sizeDropdown.appendChild(option);
            }
        });
    }

    renderFilteredProducts(products) {
        const container = document.getElementById('products-grid');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ccc;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
                    <h3>No products found</h3>
                    <p>Try a different search or category</p>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map(product => this.createProductCard(product)).join('');
    }
}

// Initialize the shop
let shop;
document.addEventListener('DOMContentLoaded', () => {
    shop = new RobustShopUI();
});

// Also create global reference for onclick handlers
if (typeof window !== 'undefined') {
    window.shop = shop;
}