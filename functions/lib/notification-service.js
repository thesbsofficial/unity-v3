/**
 * Notification Service for SBS Unity
 * Handles customer notifications via email/SMS
 */

class NotificationService {
    constructor(env) {
        this.env = env;
        this.resendApiKey = env.RESEND_API_KEY;
        this.siteUrl = env.SITE_URL || 'https://thesbsofficial.com';
    }

    /**
     * Send order status update notification
     */
    async sendOrderStatusUpdate(order, newStatus) {
        if (!this.resendApiKey) {
            console.warn('📧 Email notifications disabled - RESEND_API_KEY not configured');
            return { success: false, reason: 'email_not_configured' };
        }

        try {
            const statusMessages = {
                'pending': 'We\'ve received your order and it\'s being processed.',
                'confirmed': 'Your order has been confirmed and is being prepared.',
                'processing': 'Your order is currently being processed.',
                'shipped': 'Great news! Your order has been shipped.',
                'delivered': 'Your order has been delivered. Thank you for shopping with SBS!',
                'cancelled': 'Your order has been cancelled. If you have questions, please contact us.',
                'ready': 'Your order is ready for collection/delivery!'
            };

            const subject = `Order Update: ${order.order_number} - ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`;
            const message = statusMessages[newStatus] || `Your order status has been updated to: ${newStatus}`;

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">SBS</h1>
                        <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Sneaker & Clothing Store</p>
                    </div>
                    
                    <div style="padding: 30px; background: white;">
                        <h2 style="color: #333; margin-top: 0;">Order Update</h2>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; font-weight: bold; color: #667eea;">Order #${order.order_number}</p>
                            <p style="margin: 5px 0 0 0; color: #666;">Status: <strong>${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</strong></p>
                        </div>
                        
                        <p style="color: #333; line-height: 1.6;">${message}</p>
                        
                        ${newStatus === 'shipped' ? `
                            <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0; color: #2d5016;"><strong>📦 Shipping Information</strong></p>
                                <p style="margin: 5px 0 0 0; color: #2d5016;">Your order is on its way! You should receive it within 1-3 business days.</p>
                            </div>
                        ` : ''}
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${this.siteUrl}/dashboard.html" 
                               style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                View Order Details
                            </a>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        
                        <p style="color: #666; font-size: 14px; margin: 0;">
                            Questions? Reply to this email or contact us at <a href="mailto:support@thesbsofficial.com" style="color: #667eea;">support@thesbsofficial.com</a>
                        </p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
                        <p style="margin: 0;">SBS - Sneaker & Clothing Store</p>
                        <p style="margin: 5px 0 0 0;">Dublin, Ireland</p>
                    </div>
                </div>
            `;

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.resendApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'SBS Store <orders@thesbsofficial.com>',
                    to: [order.user_email || order.email],
                    subject: subject,
                    html: emailHtml
                })
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('📧 Email send failed:', error);
                return { success: false, reason: 'email_send_failed', error };
            }

            console.log(`📧 Order notification sent to ${order.user_email || order.email}: ${newStatus}`);
            return { success: true, method: 'email' };

        } catch (error) {
            console.error('📧 Notification error:', error);
            return { success: false, reason: 'notification_error', error: error.message };
        }
    }

    /**
     * Send order confirmation email
     */
    async sendOrderConfirmation(order, orderItems) {
        if (!this.resendApiKey) {
            console.warn('📧 Email notifications disabled - RESEND_API_KEY not configured');
            return { success: false, reason: 'email_not_configured' };
        }

        try {
            const itemsHtml = orderItems.map(item => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        <div style="font-weight: bold;">${item.name}</div>
                        <div style="color: #666; font-size: 14px;">Size: ${item.size}</div>
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                        ${item.quantity}
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                        €${item.price}
                    </td>
                </tr>
            `).join('');

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmed! 🎉</h1>
                        <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Thank you for shopping with SBS</p>
                    </div>
                    
                    <div style="padding: 30px; background: white;">
                        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                            <h2 style="margin: 0 0 10px 0; color: #2d5016;">Order #${order.order_number}</h2>
                            <p style="margin: 0; color: #2d5016;">Your order has been confirmed and will be processed shortly.</p>
                        </div>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <thead>
                                <tr style="background: #f8f9fa;">
                                    <th style="padding: 15px 10px; text-align: left; border-bottom: 2px solid #667eea;">Item</th>
                                    <th style="padding: 15px 10px; text-align: center; border-bottom: 2px solid #667eea;">Qty</th>
                                    <th style="padding: 15px 10px; text-align: right; border-bottom: 2px solid #667eea;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                                <tr style="background: #f8f9fa; font-weight: bold;">
                                    <td style="padding: 15px 10px;" colspan="2">Total</td>
                                    <td style="padding: 15px 10px; text-align: right;">€${order.total_amount || 'TBD'}</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #856404;"><strong>📋 What's Next?</strong></p>
                            <p style="margin: 5px 0 0 0; color: #856404;">We'll prepare your order and send you updates. Typical processing time is 1-2 business days.</p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${this.siteUrl}/dashboard.html" 
                               style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                                Track Order
                            </a>
                            <a href="${this.siteUrl}/shop.html" 
                               style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Continue Shopping
                            </a>
                        </div>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
                        <p style="margin: 0;">Questions? Contact us at <a href="mailto:support@thesbsofficial.com" style="color: #667eea;">support@thesbsofficial.com</a></p>
                        <p style="margin: 5px 0 0 0;">SBS - Dublin, Ireland</p>
                    </div>
                </div>
            `;

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.resendApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'SBS Store <orders@thesbsofficial.com>',
                    to: [order.user_email || order.email],
                    subject: `Order Confirmation - ${order.order_number}`,
                    html: emailHtml
                })
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('📧 Order confirmation email failed:', error);
                return { success: false, reason: 'email_send_failed', error };
            }

            console.log(`📧 Order confirmation sent to ${order.user_email || order.email}`);
            return { success: true, method: 'email' };

        } catch (error) {
            console.error('📧 Order confirmation error:', error);
            return { success: false, reason: 'notification_error', error: error.message };
        }
    }
}

export default NotificationService;