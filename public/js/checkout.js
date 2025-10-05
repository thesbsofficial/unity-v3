/**
 * 🛒 SBS CHECKOUT SYSTEM
 * Complete order flow for shop.html
 */

// Checkout function - called when user clicks "Proceed to Checkout"
function checkout() {
    const basket = JSON.parse(localStorage.getItem('sbs-basket')) || [];

    if (basket.length === 0) {
        // Use showToast if available, otherwise alert
        if (typeof showToast === 'function') {
            showToast('Your basket is empty!');
        } else {
            alert('Your basket is empty!');
        }
        return;
    }

    // Show checkout modal
    showCheckoutModal(basket);
}

// Create and show checkout modal
function showCheckoutModal(items) {
    // Remove existing modal if any
    const existing = document.getElementById('checkout-modal');
    if (existing) existing.remove();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'checkout-modal';
    modal.className = 'checkout-modal';
    modal.innerHTML = `
        <div class="checkout-overlay" onclick="if(event.target === this) closeCheckout()">
            <div class="checkout-content">
                <button class="checkout-close" onclick="closeCheckout()" aria-label="Close">×</button>
                
                <h2 class="checkout-title">🛒 Checkout</h2>
                
                <!-- Items Summary -->
                <div class="checkout-items">
                    <h3>Your Items (${items.length})</h3>
                    <div class="checkout-items-list">
                        ${items.map(item => `
                            <div class="checkout-item">
                                <img src="${item.imageUrl}" alt="${item.category}" loading="lazy">
                                <div class="checkout-item-details">
                                    <strong>${item.category}</strong>
                                    <p>Size: ${item.size}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Checkout Form -->
                <form id="checkout-form" onsubmit="submitOrder(event)">
                    <h3>Delivery Details</h3>
                    
                    <div class="form-group">
                        <input type="text" name="name" placeholder="Full Name *" required class="checkout-input">
                    </div>
                    
                    <div class="form-group">
                        <input type="tel" name="phone" placeholder="Phone Number *" required class="checkout-input" pattern="[0-9+\\s()-]{10,}">
                    </div>
                    
                    <div class="form-group">
                        <input type="text" name="address" placeholder="Street Address *" required class="checkout-input">
                    </div>
                    
                    <div class="form-group">
                        <input type="text" name="city" placeholder="City *" required class="checkout-input">
                    </div>
                    
                    <div class="form-group">
                        <input type="text" name="eircode" placeholder="Eircode (optional)" class="checkout-input">
                    </div>
                    
                    <h3>Delivery Method</h3>
                    
                    <div class="delivery-options">
                        <label class="delivery-option">
                            <input type="radio" name="delivery" value="collection" checked onchange="updateCheckoutTotal()">
                            <div class="delivery-option-content">
                                <strong>🏪 Collection</strong>
                                <p>Pick up from our location</p>
                                <span class="delivery-price">Free</span>
                            </div>
                        </label>
                        
                        <label class="delivery-option">
                            <input type="radio" name="delivery" value="delivery" onchange="updateCheckoutTotal()">
                            <div class="delivery-option-content">
                                <strong>🚚 Delivery</strong>
                                <p>We'll deliver to your address</p>
                                <span class="delivery-price">+€5</span>
                            </div>
                        </label>
                    </div>
                    
                    <div class="checkout-total">
                        <span>Total:</span>
                        <strong id="checkout-total-amount">€0</strong>
                    </div>
                    
                    <button type="submit" class="btn-checkout" id="checkout-submit-btn">
                        Confirm Order
                    </button>
                    
                    <p class="checkout-note">💬 We'll contact you on WhatsApp to arrange collection/delivery</p>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Initial total calculation
    updateCheckoutTotal();

    // Focus first input
    setTimeout(() => {
        const firstInput = modal.querySelector('input[name="name"]');
        if (firstInput) firstInput.focus();
    }, 100);
}

// Update checkout total based on delivery method
function updateCheckoutTotal() {
    const deliveryRadio = document.querySelector('input[name="delivery"]:checked');
    if (!deliveryRadio) return;

    const deliveryFee = deliveryRadio.value === 'delivery' ? 5 : 0;
    // BUG #8 FIX: Include cart items total, not just delivery fee
    const cartTotal = window.SBSCart ? window.SBSCart.getTotal() : 0;
    const grandTotal = cartTotal + deliveryFee;
    
    const totalElement = document.getElementById('checkout-total-amount');
    if (totalElement) {
        totalElement.textContent = `£${grandTotal.toFixed(2)}`;
    }
}

// Submit order to API
async function submitOrder(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = document.getElementById('checkout-submit-btn');
    const basket = JSON.parse(localStorage.getItem('sbs-basket')) || [];

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
        const formData = new FormData(form);
        const deliveryMethod = formData.get('delivery');
        const totalAmount = deliveryMethod === 'delivery' ? 5 : 0;

        // Prepare order data
        const orderData = {
            items: basket.map(item => ({
                product_id: item.id,
                category: item.category,
                size: item.size,
                image_url: item.imageUrl
            })),
            customer_name: formData.get('name'),
            customer_phone: formData.get('phone'),
            delivery_address: formData.get('address'),
            delivery_city: formData.get('city'),
            delivery_eircode: formData.get('eircode') || null,
            delivery_method: deliveryMethod,
            total_amount: totalAmount
        };

        // Submit to API
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (data.success && data.order) {
            // Clear basket
            localStorage.removeItem('sbs-basket');

            // Show success message
            showOrderConfirmation(data.order);

            // Close checkout modal
            closeCheckout();

            // Update cart count
            if (typeof updateCartCount === 'function') {
                updateCartCount();
            }

            // Reload page after delay
            setTimeout(() => {
                location.reload();
            }, 3000);
        } else {
            throw new Error(data.error || 'Order submission failed');
        }
    } catch (error) {
        console.error('Checkout error:', error);

        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Order';

        // Show error
        alert('Order submission failed. Please try again or contact us via WhatsApp:\n\n+353 87 123 4567');
    }
}

// Show order confirmation
function showOrderConfirmation(order) {
    const modal = document.createElement('div');
    modal.className = 'checkout-modal';
    modal.innerHTML = `
        <div class="checkout-overlay">
            <div class="checkout-content checkout-success">
                <div class="success-icon">✅</div>
                <h2>Order Confirmed!</h2>
                <div class="order-details">
                    <p><strong>Order Number:</strong></p>
                    <p class="order-number">${order.order_number}</p>
                    
                    <div class="success-message">
                        <p>🎉 Thank you for your order!</p>
                        <p>💬 We'll contact you on WhatsApp soon to arrange ${order.delivery_method === 'delivery' ? 'delivery' : 'collection'}.</p>
                    </div>
                </div>
                <button onclick="this.closest('.checkout-modal').remove(); location.reload()" class="btn-checkout">
                    Continue Shopping
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Close checkout modal
function closeCheckout() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// Add keyboard support
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const checkoutModal = document.getElementById('checkout-modal');
        if (checkoutModal) {
            closeCheckout();
        }
    }
});

// Expose to global scope
window.checkout = checkout;
window.closeCheckout = closeCheckout;
window.submitOrder = submitOrder;
window.updateCheckoutTotal = updateCheckoutTotal;
