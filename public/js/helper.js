/**
 * 🆘 SBS HELPER SYSTEM
 * Context-aware help tooltips for every page
 * 
 * Usage:
 * 1. Include this script: <script src="/js/helper.js"></script>
 * 2. Add helper button: <button class="sbs-help-btn" data-help="topic-id">?</button>
 * 3. Define helper content in helperContent object below
 */

const helperContent = {
    // ===== SHOP PAGE =====
    'shop-how-to-buy': {
        title: '📦 How to Buy',
        content: `
            <div style="background: rgba(255, 215, 0, 0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid rgba(255, 215, 0, 0.3);">
                <h4 style="color: #ffd700; margin: 0 0 0.5rem 0;">🛒 Option 1: On-Site Checkout (Recommended)</h4>
                <ol class="help-list" style="margin: 0;">
                    <li><strong>Browse</strong> - Find items you love</li>
                    <li><strong>Add to Basket</strong> - Click "Add to Basket" button</li>
                    <li><strong>Checkout</strong> - Enter delivery details</li>
                    <li><strong>Reserve Items</strong> - We hold items for 24 hours</li>
                    <li><strong>Payment on Delivery</strong> - Pay when you receive (Cash, Card, Bank Transfer, or Crypto)</li>
                </ol>
            </div>
            
            <div style="background: rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
                <h4 style="color: #fff; margin: 0 0 0.5rem 0;">📱 Option 2: DM Method</h4>
                <ol class="help-list" style="margin: 0;">
                    <li><strong>Screenshot</strong> - Take a pic of items you want</li>
                    <li><strong>DM Us</strong> - Send via WhatsApp or Instagram</li>
                    <li><strong>Confirm</strong> - We check availability</li>
                    <li><strong>Arrange Delivery</strong> - We coordinate pickup/delivery</li>
                </ol>
            </div>
            
            <p class="help-note" style="margin-top: 1rem;">💡 Both methods work great! On-site checkout is faster and reserves items instantly.</p>
        `
    },
    'shop-size-guide': {
        title: '📏 Size Guide',
        content: `
            <h4>Shoe Sizes (UK)</h4>
            <p>We use UK sizing: UK 6, UK 7, UK 8, UK 9, UK 10, etc.</p>
            <p><strong>Half sizes:</strong> UK 6.5, UK 7.5, UK 8.5, etc.</p>
            
            <h4 style="margin-top: 1rem;">Clothing Sizes</h4>
            <p><strong>Standard:</strong> XS, S, M, L, XL, XXL</p>
            <p><strong>Mixed sizes:</strong> Some items have separate top/bottom sizing</p>
            
            <p class="help-note">💡 All measurements are in product descriptions</p>
        `
    },
    'shop-condition': {
        title: '✨ Condition Labels',
        content: `
            <div class="condition-badge" style="background: rgba(34, 197, 94, 0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <strong style="color: #22c55e;">BN = Brand New</strong>
                <p style="margin-top: 0.5rem; color: #999;">Unworn, with original tags, box, and packaging. Perfect condition.</p>
            </div>
            
            <div class="condition-badge" style="background: rgba(251, 191, 36, 0.1); padding: 1rem; border-radius: 8px;">
                <strong style="color: #fbbf24;">PO = Pre-Owned</strong>
                <p style="margin-top: 0.5rem; color: #999;">Gently used, excellent condition. Any defects clearly noted in description.</p>
            </div>
            
            <p class="help-note" style="margin-top: 1rem;">💡 Photos show actual item condition</p>
        `
    },
    'shop-contact': {
        title: '💬 Contact Us',
        content: `
            <h4>WhatsApp (Fastest)</h4>
            <p><a href="https://wa.me/353871234567" target="_blank" style="color: #22c55e;">+353 87 123 4567</a></p>
            
            <h4 style="margin-top: 1rem;">Instagram</h4>
            <p><a href="https://instagram.com/sbs.dublin" target="_blank" style="color: #d4af37;">@sbs.dublin</a></p>
            
            <h4 style="margin-top: 1rem;">Email</h4>
            <p><a href="mailto:hello@sbsdublin.com" style="color: #3b82f6;">hello@sbsdublin.com</a></p>
            
            <p class="help-note" style="margin-top: 1rem;">💡 We typically respond within 1-2 hours</p>
        `
    },

    // ===== SELL PAGE =====
    'sell-how-to-sell': {
        title: '💰 How to Sell',
        content: `
            <ol class="help-list">
                <li><strong>Fill the Form</strong> - Tell us about your item(s)</li>
                <li><strong>Add Photos</strong> - Optional but helps us make faster offers</li>
                <li><strong>Submit</strong> - We receive your submission instantly</li>
                <li><strong>We Review</strong> - Our team checks items within 24-48 hours</li>
                <li><strong>Get Offer</strong> - We contact you with our offer via WhatsApp/Instagram</li>
                <li><strong>Accept & Get Paid</strong> - Collection + instant payment</li>
            </ol>
            <p class="help-note">💡 Same-day payment for accepted items</p>
        `
    },
    'sell-what-we-buy': {
        title: '✅ What We Buy',
        content: `
            <h4>Categories We Accept</h4>
            <ul class="help-list">
                <li><strong>Streetwear</strong> - Hoodies, jackets, jeans, t-shirts</li>
                <li><strong>Shoes</strong> - Sneakers, trainers, boots</li>
                <li><strong>Tech</strong> - Headphones, speakers, accessories</li>
                <li><strong>Jewellery</strong> - Chains, rings, watches</li>
            </ul>
            
            <h4 style="margin-top: 1rem;">Condition</h4>
            <p>✅ Brand new with tags</p>
            <p>✅ Pre-owned in excellent condition</p>
            <p>❌ Heavily worn or damaged items</p>
            
            <p class="help-note">💡 Popular brands get higher offers</p>
        `
    },
    'sell-pricing-tips': {
        title: '💵 Pricing Tips',
        content: `
            <h4>Setting Your Price</h4>
            <p><strong>Be Realistic:</strong> We base offers on market value and condition</p>
            <p><strong>Brand New Items:</strong> 50-70% of retail price</p>
            <p><strong>Pre-Owned Items:</strong> 30-50% of retail price</p>
            
            <h4 style="margin-top: 1rem;">Factors We Consider</h4>
            <ul class="help-list">
                <li>Brand popularity and demand</li>
                <li>Current market trends</li>
                <li>Condition and completeness</li>
                <li>Season and timing</li>
            </ul>
            
            <p class="help-note">💡 Don't worry - we'll make fair offers regardless of your asking price</p>
        `
    },
    'sell-photo-tips': {
        title: '📸 Photo Tips',
        content: `
            <h4>Good Photos = Faster Offers</h4>
            <ul class="help-list">
                <li><strong>Good lighting</strong> - Natural light works best</li>
                <li><strong>Clear focus</strong> - Show details and any defects</li>
                <li><strong>Multiple angles</strong> - Front, back, tags, sole (shoes)</li>
                <li><strong>Include packaging</strong> - Box, tags, receipts if available</li>
            </ul>
            
            <p class="help-note">💡 Photos are optional - we can still make offers without them</p>
        `
    },
    'sell-payment': {
        title: '💳 Payment Info',
        content: `
            <h4>Payment Methods</h4>
            <p>💵 <strong>Cash</strong> - Instant payment on collection</p>
            <p>🏦 <strong>Bank Transfer</strong> - Same-day transfer</p>
            <p>💸 <strong>Revolut</strong> - Instant payment</p>
            
            <h4 style="margin-top: 1rem;">Timeline</h4>
            <p><strong>Review:</strong> 24-48 hours</p>
            <p><strong>Payment:</strong> Same day as collection</p>
            
            <p class="help-note">💡 No waiting periods - you get paid immediately</p>
        `
    },

    // ===== ADMIN PAGES =====
    'admin-quick-start': {
        title: '🚀 Quick Start Guide',
        content: `
            <h4>Welcome to Admin Dashboard</h4>
            <ol class="help-list">
                <li><strong>Inventory</strong> - Upload and manage products</li>
                <li><strong>Analytics</strong> - Track sales and trends</li>
                <li><strong>Orders</strong> - Process customer orders</li>
                <li><strong>Requests</strong> - Review sell submissions</li>
            </ol>
            
            <p class="help-note">💡 Start by uploading products in the Inventory section</p>
        `
    },
    'admin-inventory': {
        title: '📦 Inventory Upload',
        content: `
            <h4>Smart Uploader</h4>
            <p>Our uploader automatically names files using our taxonomy system:</p>
            <code style="display: block; background: rgba(255,255,255,0.1); padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0;">
                CATEGORY_BRAND_CONDITION_SIZE.jpg
            </code>
            
            <h4 style="margin-top: 1rem;">Quick Steps</h4>
            <ol class="help-list">
                <li>Select category and details</li>
                <li>Upload photos (drag & drop or click)</li>
                <li>System auto-generates filenames</li>
                <li>Products appear in shop instantly</li>
            </ol>
        `
    },
    'admin-analytics': {
        title: '📊 Analytics Dashboard',
        content: `
            <h4>Understanding Metrics</h4>
            <p><strong>Hot Products:</strong> High view counts, trending now</p>
            <p><strong>Fast Movers:</strong> Items that sell quickly</p>
            <p><strong>Slow Movers:</strong> Items needing attention</p>
            
            <h4 style="margin-top: 1rem;">Time Periods</h4>
            <p>View data by: Today, Week, Month, All Time</p>
            
            <p class="help-note">💡 Use insights to optimize inventory</p>
        `
    },

    // ===== CUSTOMER DASHBOARD =====
    'dashboard-orders': {
        title: '📦 My Orders',
        content: `
            <h4>Order Status</h4>
            <p><strong>Pending:</strong> Order received, preparing</p>
            <p><strong>Ready:</strong> Ready for collection/delivery</p>
            <p><strong>Completed:</strong> Order fulfilled</p>
            
            <h4 style="margin-top: 1rem;">Questions?</h4>
            <p>Contact us via WhatsApp for order updates</p>
        `
    },
    'dashboard-submissions': {
        title: '💰 My Sell Submissions',
        content: `
            <h4>Submission Status</h4>
            <p><strong>Pending:</strong> We're reviewing your items</p>
            <p><strong>Reviewing:</strong> Team is making an offer</p>
            <p><strong>Offer Made:</strong> Check your WhatsApp/Instagram</p>
            <p><strong>Accepted:</strong> Awaiting collection</p>
            
            <p class="help-note">💡 We typically review within 24-48 hours</p>
        `
    }
};

// Helper System Class
class HelperSystem {
    constructor() {
        this.modalId = 'sbs-helper-modal';
        this.init();
    }

    init() {
        // Create modal if it doesn't exist
        if (!document.getElementById(this.modalId)) {
            this.createModal();
        }

        // Add event listeners to all helper buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sbs-help-btn')) {
                const btn = e.target.closest('.sbs-help-btn');
                const topicId = btn.dataset.help;
                if (topicId) {
                    this.show(topicId);
                }
            }
        });

        // Close on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.id === this.modalId) {
                this.close();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.className = 'sbs-helper-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(4px);
            z-index: 10000;
            padding: 20px;
            overflow-y: auto;
            animation: fadeIn 0.2s ease;
        `;

        modal.innerHTML = `
            <div class="sbs-helper-content" style="
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 12px;
                max-width: 500px;
                margin: 40px auto;
                padding: 0;
                position: relative;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slideUp 0.3s ease;
            ">
                <button class="sbs-helper-close" onclick="window.sbsHelper.close()" style="
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: #fff;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    font-size: 20px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    z-index: 1;
                ">×</button>
                
                <div class="sbs-helper-header" style="
                    padding: 24px 24px 16px;
                    border-bottom: 1px solid #333;
                ">
                    <h3 class="sbs-helper-title" style="
                        margin: 0;
                        font-size: 20px;
                        font-weight: 600;
                        color: #fff;
                    "></h3>
                </div>
                
                <div class="sbs-helper-body" style="
                    padding: 24px;
                    color: #ccc;
                    line-height: 1.6;
                "></div>
                
                <div class="sbs-helper-footer" style="
                    padding: 16px 24px;
                    border-top: 1px solid #333;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: #999; cursor: pointer;">
                        <input type="checkbox" class="sbs-helper-dont-show" style="cursor: pointer;">
                        Don't show this again
                    </label>
                    <button onclick="window.sbsHelper.close()" style="
                        background: #d4af37;
                        color: #000;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 6px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">Got it!</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .sbs-helper-modal h4 {
                margin: 1rem 0 0.5rem;
                color: #d4af37;
                font-size: 16px;
            }
            
            .sbs-helper-modal h4:first-child {
                margin-top: 0;
            }
            
            .sbs-helper-modal .help-list {
                margin: 0.5rem 0;
                padding-left: 1.5rem;
            }
            
            .sbs-helper-modal .help-list li {
                margin: 0.5rem 0;
            }
            
            .sbs-helper-modal .help-note {
                margin-top: 1rem;
                padding: 12px;
                background: rgba(212, 175, 55, 0.1);
                border-left: 3px solid #d4af37;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .sbs-helper-modal a {
                color: #d4af37;
                text-decoration: none;
            }
            
            .sbs-helper-modal a:hover {
                text-decoration: underline;
            }
            
            .sbs-helper-close:hover {
                background: rgba(255, 255, 255, 0.2) !important;
            }
            
            .sbs-helper-footer button:hover {
                background: #ffd700 !important;
                transform: translateY(-1px);
            }
        `;
        document.head.appendChild(style);
    }

    show(topicId) {
        // Check if user has dismissed this helper
        if (localStorage.getItem(`sbs-helper-dismissed-${topicId}`) === 'true') {
            return;
        }

        const content = helperContent[topicId];
        if (!content) {
            console.warn(`Helper topic '${topicId}' not found`);
            return;
        }

        const modal = document.getElementById(this.modalId);
        const title = modal.querySelector('.sbs-helper-title');
        const body = modal.querySelector('.sbs-helper-body');
        const checkbox = modal.querySelector('.sbs-helper-dont-show');

        title.textContent = content.title;
        body.innerHTML = content.content;
        checkbox.checked = false;
        checkbox.dataset.topicId = topicId;

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    close() {
        const modal = document.getElementById(this.modalId);
        const checkbox = modal.querySelector('.sbs-helper-dont-show');
        const topicId = checkbox.dataset.topicId;

        if (checkbox.checked && topicId) {
            localStorage.setItem(`sbs-helper-dismissed-${topicId}`, 'true');
        }

        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sbsHelper = new HelperSystem();
    });
} else {
    window.sbsHelper = new HelperSystem();
}
