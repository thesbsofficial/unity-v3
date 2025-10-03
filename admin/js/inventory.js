// Inventory Management JavaScript
// Handles product CRUD operations for admin dashboard

// Check authentication (separate from customer sessions)
const session = sessionStorage.getItem('sbs_admin_session') || localStorage.getItem('sbs_admin_session');
if (!session) {
    window.location.href = '/admin/login.html';
}

// Initialize Lucide icons
lucide.createIcons();

// State
let products = [];
let filteredProducts = [];
let currentProduct = null;

// DOM Elements
const productsContainer = document.getElementById('productsContainer');
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const addProductButton = document.getElementById('addProductButton');
const closeModal = document.getElementById('closeModal');
const cancelButton = document.getElementById('cancelButton');
const logoutButton = document.getElementById('logoutButton');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const sortFilter = document.getElementById('sortFilter');
const imageUploadArea = document.getElementById('imageUploadArea');
const productImage = document.getElementById('productImage');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');

// Event Listeners
addProductButton.addEventListener('click', () => openModal());
closeModal.addEventListener('click', () => closeProductModal());
cancelButton.addEventListener('click', () => closeProductModal());
productForm.addEventListener('submit', handleSubmit);
logoutButton.addEventListener('click', logout);
searchInput.addEventListener('input', filterProducts);
categoryFilter.addEventListener('change', filterProducts);
sortFilter.addEventListener('change', filterProducts);
imageUploadArea.addEventListener('click', () => productImage.click());
productImage.addEventListener('change', handleImageUpload);

// Close modal on outside click
productModal.addEventListener('click', (e) => {
    if (e.target === productModal) {
        closeProductModal();
    }
});

// Load products on page load
loadProducts();

// Functions

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();

        if (data.success) {
            products = data.products || [];
            filteredProducts = [...products];
            renderProducts();
            updateStats();
        } else {
            showError('Failed to load products');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Failed to load products');
    }
}

function renderProducts() {
    if (filteredProducts.length === 0) {
        productsContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i data-lucide="inbox" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i>
                <p class="text-gray-600 text-lg">No products found</p>
                <button onclick="openModal()" class="mt-4 text-blue-600 hover:text-blue-700 font-medium">
                    Add your first product
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    productsContainer.innerHTML = filteredProducts.map(product => `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <!-- Product Image -->
            <div class="aspect-square bg-gray-100 overflow-hidden">
                ${product.image_url ? 
                    `<img src="${product.image_url}" alt="${product.name}" class="w-full h-full object-cover">` :
                    `<div class="w-full h-full flex items-center justify-center">
                        <i data-lucide="image" class="w-16 h-16 text-gray-300"></i>
                    </div>`
                }
            </div>

            <!-- Product Details -->
            <div class="p-4">
                <!-- Brand & Stock Badge -->
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium text-gray-500 uppercase">${product.brand || 'Unknown'}</span>
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${getStockBadgeClass(product.stock_quantity || 0)}">
                        ${product.stock_quantity || 0} in stock
                    </span>
                </div>

                <!-- Product Name -->
                <h3 class="font-semibold text-gray-900 mb-2 line-clamp-2">${product.name}</h3>

                <!-- Size & Condition -->
                <div class="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    ${product.size ? `<span class="flex items-center"><i data-lucide="ruler" class="w-4 h-4 mr-1"></i>${product.size}</span>` : ''}
                    ${product.condition ? `<span class="capitalize">${product.condition.replace('-', ' ')}</span>` : ''}
                </div>

                <!-- Price -->
                <div class="flex items-center justify-between mb-4">
                    <span class="text-2xl font-bold text-gray-900">£${parseFloat(product.price || 0).toFixed(2)}</span>
                    <span class="text-sm text-gray-500">${product.category || 'Uncategorized'}</span>
                </div>

                <!-- Actions -->
                <div class="flex space-x-2">
                    <button 
                        onclick="editProduct(${product.id})"
                        class="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                        <i data-lucide="edit" class="w-4 h-4 mr-2"></i>
                        Edit
                    </button>
                    <button 
                        onclick="deleteProduct(${product.id}, '${product.name}')"
                        class="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

function getStockBadgeClass(quantity) {
    if (quantity === 0) return 'bg-red-100 text-red-700';
    if (quantity < 3) return 'bg-orange-100 text-orange-700';
    return 'bg-green-100 text-green-700';
}

function filterProducts() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    const sortBy = sortFilter.value;

    // Filter
    filteredProducts = products.filter(product => {
        const matchesSearch = !searchTerm || 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.brand && product.brand.toLowerCase().includes(searchTerm)) ||
            (product.description && product.description.toLowerCase().includes(searchTerm));

        const matchesCategory = !category || product.category === category;

        return matchesSearch && matchesCategory;
    });

    // Sort
    filteredProducts.sort((a, b) => {
        switch (sortBy) {
            case 'newest':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'oldest':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'price-low':
                return parseFloat(a.price) - parseFloat(b.price);
            case 'price-high':
                return parseFloat(b.price) - parseFloat(a.price);
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });

    renderProducts();
    updateStats();
}

function updateStats() {
    const total = products.length;
    const inStock = products.filter(p => p.stock_quantity > 3).length;
    const lowStock = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 3).length;
    const outOfStock = products.filter(p => p.stock_quantity === 0).length;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('inStockCount').textContent = inStock;
    document.getElementById('lowStockCount').textContent = lowStock;
    document.getElementById('outOfStockCount').textContent = outOfStock;
}

function openModal(product = null) {
    currentProduct = product;
    
    if (product) {
        // Edit mode
        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('submitButtonText').textContent = 'Update Product';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productBrand').value = product.brand || '';
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productPrice').value = parseFloat(product.price || 0).toFixed(2);
        document.getElementById('productSize').value = product.size || '';
        document.getElementById('productCondition').value = product.condition || '';
        document.getElementById('productStock').value = product.stock_quantity || 0;
        document.getElementById('productDescription').value = product.description || '';

        if (product.image_url) {
            previewImage.src = product.image_url;
            imagePreview.classList.remove('hidden');
        }
    } else {
        // Add mode
        document.getElementById('modalTitle').textContent = 'Add Product';
        document.getElementById('submitButtonText').textContent = 'Add Product';
        productForm.reset();
        imagePreview.classList.add('hidden');
    }

    productModal.classList.remove('hidden');
    lucide.createIcons();
}

function closeProductModal() {
    productModal.classList.add('hidden');
    productForm.reset();
    imagePreview.classList.add('hidden');
    currentProduct = null;
}

async function handleSubmit(e) {
    e.preventDefault();

    const submitButton = e.target.querySelector('button[type="submit"]');
    const submitButtonText = document.getElementById('submitButtonText');
    const submitSpinner = document.getElementById('submitSpinner');

    // Show loading state
    submitButton.disabled = true;
    submitButtonText.classList.add('hidden');
    submitSpinner.classList.remove('hidden');
    lucide.createIcons();

    try {
        const formData = new FormData();
        formData.append('name', document.getElementById('productName').value);
        formData.append('brand', document.getElementById('productBrand').value);
        formData.append('category', document.getElementById('productCategory').value);
        formData.append('price', document.getElementById('productPrice').value);
        formData.append('size', document.getElementById('productSize').value);
        formData.append('condition', document.getElementById('productCondition').value);
        formData.append('stock_quantity', document.getElementById('productStock').value);
        formData.append('description', document.getElementById('productDescription').value);

        // Add image if selected
        if (productImage.files[0]) {
            formData.append('image', productImage.files[0]);
        }

        const productId = document.getElementById('productId').value;
        const url = productId ? `/api/admin/products/${productId}` : '/api/admin/products';
        const method = productId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${session}`
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(productId ? 'Product updated successfully' : 'Product added successfully');
            closeProductModal();
            loadProducts();
        } else {
            showError(data.error || 'Failed to save product');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showError('Failed to save product');
    } finally {
        // Reset button state
        submitButton.disabled = false;
        submitButtonText.classList.remove('hidden');
        submitSpinner.classList.add('hidden');
    }
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImage.src = event.target.result;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

window.editProduct = async function(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        openModal(product);
    }
};

window.deleteProduct = async function(productId, productName) {
    if (!confirm(`Are you sure you want to delete "${productName}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Product deleted successfully');
            loadProducts();
        } else {
            showError(data.error || 'Failed to delete product');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showError('Failed to delete product');
    }
};

function logout() {
    // Only clear ADMIN session, not customer session
    sessionStorage.removeItem('sbs_admin_session');
    localStorage.removeItem('sbs_admin_session');
    window.location.href = '/admin/login.html';
}

function showSuccess(message) {
    // TODO: Implement toast notification
    alert(message);
}

function showError(message) {
    // TODO: Implement toast notification
    alert(message);
}
