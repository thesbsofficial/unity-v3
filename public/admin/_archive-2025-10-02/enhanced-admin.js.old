// Enhanced SBS v3 Customer Management
class CustomerManager {
    constructor() {
        this.customers = [];
        this.leads = [];
        this.orders = [];
        this.isAuthenticated = false;
        this.sessionToken = null;
        this.currentTab = 'dashboard';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuthentication();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshAll();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.showAddCustomerModal();
                        break;
                    case '1':
                        e.preventDefault();
                        this.showTab('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showTab('customers');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showTab('leads');
                        break;
                    case '4':
                        e.preventDefault();
                        this.showTab('orders');
                        break;
                }
            }
        });

        // Form enhancements
        this.setupFormValidation();
        this.setupRealTimeSearch();
    }

    setupFormValidation() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => this.clearFieldError(input));
            });
        });
    }

    setupRealTimeSearch() {
        const searchInput = document.getElementById('customerSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filterCustomers(e.target.value);
                }, 300);
            });
        }
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldType = field.type;
        const fieldName = field.name;
        let isValid = true;
        let errorMessage = '';

        // Clear previous errors
        this.clearFieldError(field);

        // Required field validation
        if (field.required && !value) {
            isValid = false;
            errorMessage = `${fieldName.replace('_', ' ')} is required`;
        }

        // Email validation
        if (fieldType === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }

        // Phone validation
        if (fieldName === 'phone' && value) {
            const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            }
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    showFieldError(field, message) {
        field.classList.add('error');
        let errorEl = field.parentNode.querySelector('.field-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            field.parentNode.appendChild(errorEl);
        }
        errorEl.textContent = message;
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorEl = field.parentNode.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
    }

    async checkAuthentication() {
        this.sessionToken = localStorage.getItem('admin_session');
        if (this.sessionToken) {
            try {
                const tokenData = JSON.parse(atob(this.sessionToken.split(':')[1] || '{}'));
                const tokenAge = Date.now() - tokenData;

                if (tokenAge < 24 * 60 * 60 * 1000) { // 24 hours
                    this.isAuthenticated = true;
                    await this.loadDashboard();
                    this.showWelcomeMessage();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Token validation error:', error);
                this.logout();
            }
        } else {
            this.showLoginPrompt();
        }
    }

    showWelcomeMessage() {
        this.showNotification('🎉 Welcome to SBS v3 Admin Dashboard!', 'success');
    }

    showLoginPrompt() {
        const password = prompt('🔐 SBS v3 Admin Access\n\nEnter your admin password:');

        if (password) {
            this.authenticateAdmin(password);
        } else {
            this.showAccessDenied();
        }
    }

    showAccessDenied() {
        document.body.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: var(--primary-gradient);
                color: white;
                text-align: center;
                font-family: var(--font-family-primary);
            ">
                <div style="
                    background: var(--bg-card);
                    padding: var(--spacing-xxl);
                    border-radius: var(--radius-xl);
                    box-shadow: var(--shadow-xl);
                ">
                    <div style="font-size: 4rem; margin-bottom: var(--spacing-lg);">🔒</div>
                    <h2 style="margin-bottom: var(--spacing-md); color: var(--text-primary);">Access Denied</h2>
                    <p style="margin-bottom: var(--spacing-lg); color: var(--text-secondary);">Admin authentication required</p>
                    <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
                </div>
            </div>
        `;
    }

    async authenticateAdmin(password) {
        try {
            this.showLoadingOverlay('Authenticating...');

            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const result = await response.json();

            if (result.success) {
                this.isAuthenticated = true;
                this.sessionToken = result.sessionToken;
                localStorage.setItem('admin_session', this.sessionToken);
                await this.loadDashboard();
                this.showNotification('✅ Authentication successful!', 'success');
            } else {
                this.showNotification('❌ Invalid password. Access denied.', 'error');
                setTimeout(() => this.showLoginPrompt(), 2000);
            }
        } catch (error) {
            this.showNotification('❌ Authentication failed: ' + error.message, 'error');
            setTimeout(() => this.showLoginPrompt(), 2000);
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async loadDashboard() {
        await Promise.all([
            this.loadDashboardStats(),
            this.loadCustomers(),
            this.loadLeads(),
            this.loadRecentOrders()
        ]);
    }

    async loadDashboardStats() {
        try {
            const response = await fetch('/api/customers/dashboard');
            const data = await response.json();

            if (data.success) {
                this.updateStatsDisplay(data.stats);
                this.animateCounters();
            }
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
            this.showNotification('Failed to load dashboard stats', 'error');
        }
    }

    updateStatsDisplay(stats) {
        const elements = {
            'totalCustomers': stats.total_customers || 0,
            'activeLeads': stats.active_leads || 0,
            'pendingOrders': stats.pending_orders || 0,
            'todaySales': `$${parseFloat(stats.today_sales || 0).toFixed(2)}`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        counters.forEach(counter => {
            const target = parseInt(counter.textContent.replace(/\D/g, ''));
            const duration = 2000; // 2 seconds
            const step = target / (duration / 16); // 60fps
            let current = 0;

            const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                    counter.textContent = counter.textContent.includes('$') ?
                        `$${target.toFixed(2)}` : target.toString();
                    clearInterval(timer);
                } else {
                    counter.textContent = counter.textContent.includes('$') ?
                        `$${current.toFixed(2)}` : Math.floor(current).toString();
                }
            }, 16);
        });
    }

    showLoadingOverlay(message = 'Loading...') {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: var(--bg-overlay);
                backdrop-filter: blur(5px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: var(--z-modal);
                color: white;
                font-size: var(--font-size-lg);
            `;
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div style="text-align: center;">
                <div class="loading-spinner" style="margin: 0 auto var(--spacing-md) auto;"></div>
                <div>${message}</div>
            </div>
        `;
        overlay.style.display = 'flex';
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: var(--spacing-lg);
            right: var(--spacing-lg);
            background: var(--bg-card);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: var(--radius-lg);
            padding: var(--spacing-md) var(--spacing-lg);
            box-shadow: var(--shadow-lg);
            z-index: var(--z-tooltip);
            max-width: 400px;
            animation: slideInRight 0.3s ease forwards;
        `;

        const colors = {
            success: 'var(--success-color)',
            error: 'var(--error-color)',
            warning: 'var(--warning-color)',
            info: 'var(--info-color)'
        };

        notification.style.borderLeft = `4px solid ${colors[type] || colors.info}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    async refreshAll() {
        this.showLoadingOverlay('Refreshing data...');
        await this.loadDashboard();
        this.hideLoadingOverlay();
        this.showNotification('✅ Data refreshed successfully!', 'success');
    }

    startAutoRefresh() {
        // Auto-refresh every 5 minutes
        setInterval(() => {
            if (this.isAuthenticated) {
                this.loadDashboardStats();
            }
        }, 5 * 60 * 1000);
    }

    logout() {
        localStorage.removeItem('admin_session');
        this.sessionToken = null;
        this.isAuthenticated = false;
        location.reload();
    }

    showTab(tabName) {
        // Update URL without refresh
        history.pushState({}, '', `#${tabName}`);

        // Hide all tabs
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        const tabElement = document.getElementById(tabName);
        const buttonElement = document.querySelector(`[onclick*="${tabName}"]`);

        if (tabElement) {
            tabElement.classList.add('active');
            tabElement.style.animation = 'slideInUp 0.5s ease forwards';
        }
        if (buttonElement) {
            buttonElement.classList.add('active');
        }

        this.currentTab = tabName;

        // Load tab-specific data
        switch (tabName) {
            case 'customers':
                this.loadCustomers();
                break;
            case 'leads':
                this.loadLeads();
                break;
            case 'orders':
                this.loadRecentOrders();
                break;
        }
    }

    // Data loading methods
    async loadCustomers() {
        try {
            this.showElementLoading('customersLoading');
            this.hideElement('customersContent');

            const response = await fetch('/api/customers');
            if (!response.ok) throw new Error('Failed to load customers');

            const data = await response.json();
            this.renderCustomersTable(data.customers || []);

            this.hideElement('customersLoading');
            this.showElement('customersContent');
        } catch (error) {
            this.hideElement('customersLoading');
            this.showNotification('❌ Failed to load customers', 'error');
        }
    }

    renderCustomersTable(customers) {
        const tbody = document.querySelector('#customersTable tbody');
        if (!tbody) return;

        if (customers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div class="empty-icon">👥</div>
                        <h3>No customers found</h3>
                        <p>Add your first customer to get started</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td>${customer.id}</td>
                <td>${customer.first_name} ${customer.last_name || ''}</td>
                <td>${customer.email}</td>
                <td>${customer.phone || '-'}</td>
                <td>${customer.total_orders || 0}</td>
                <td>$${customer.lifetime_value || 0}</td>
                <td><span class="status-badge status-${customer.status || 'active'}">${customer.status || 'active'}</span></td>
                <td>
                    <button class="action-btn view" onclick="customerManager.viewCustomer(${customer.id})" title="View Details">👁️</button>
                    <button class="action-btn edit" onclick="customerManager.editCustomer(${customer.id})" title="Edit">✏️</button>
                    <button class="action-btn delete" onclick="customerManager.deleteCustomer(${customer.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    async loadLeads() {
        try {
            this.showElementLoading('leadsLoading');
            this.hideElement('leadsContent');

            const response = await fetch('/api/customers/leads');
            if (!response.ok) throw new Error('Failed to load leads');

            const data = await response.json();
            this.renderLeadsTable(data.leads || []);

            this.hideElement('leadsLoading');
            this.showElement('leadsContent');
        } catch (error) {
            this.hideElement('leadsLoading');
            this.showNotification('❌ Failed to load leads', 'error');
        }
    }

    renderLeadsTable(leads) {
        const tbody = document.querySelector('#leadsTable tbody');
        if (!tbody) return;

        if (leads.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div class="empty-icon">🎯</div>
                        <h3>No leads found</h3>
                        <p>Add your first lead to start building your pipeline</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = leads.map(lead => `
            <tr>
                <td>${lead.id}</td>
                <td>${lead.first_name} ${lead.last_name || ''}</td>
                <td>${lead.email}</td>
                <td>${lead.phone || '-'}</td>
                <td>${lead.source || '-'}</td>
                <td><span class="status-badge status-${lead.status || 'new'}">${lead.status || 'new'}</span></td>
                <td>${new Date(lead.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn view" onclick="customerManager.viewLead(${lead.id})" title="View Details">👁️</button>
                    <button class="action-btn edit" onclick="customerManager.convertLead(${lead.id})" title="Convert to Customer">🔄</button>
                    <button class="action-btn delete" onclick="customerManager.deleteLead(${lead.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    // Customer actions
    async addCustomer(formData) {
        try {
            this.showLoadingOverlay('Creating customer...');

            const response = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to create customer');

            const result = await response.json();
            this.showNotification('✅ Customer created successfully!', 'success');
            this.refreshAll();

            return result;
        } catch (error) {
            this.showNotification('❌ Failed to create customer: ' + error.message, 'error');
            throw error;
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async addLead(formData) {
        try {
            this.showLoadingOverlay('Creating lead...');

            const response = await fetch('/api/customers/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to create lead');

            const result = await response.json();
            this.showNotification('✅ Lead created successfully!', 'success');
            this.loadLeads(); // Refresh leads table

            return result;
        } catch (error) {
            this.showNotification('❌ Failed to create lead: ' + error.message, 'error');
            throw error;
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async viewCustomer(id) {
        this.showNotification(`👁️ Viewing customer ${id} - Feature coming soon!`, 'info');
    }

    async editCustomer(id) {
        this.showNotification(`✏️ Editing customer ${id} - Feature coming soon!`, 'info');
    }

    async deleteCustomer(id) {
        if (!confirm('⚠️ Are you sure you want to delete this customer?\n\nThis action cannot be undone.')) {
            return;
        }

        try {
            this.showLoadingOverlay('Deleting customer...');

            const response = await fetch(`/api/customers/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete customer');

            this.showNotification('✅ Customer deleted successfully!', 'success');
            this.refreshAll();
        } catch (error) {
            this.showNotification('❌ Failed to delete customer: ' + error.message, 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async viewLead(id) {
        this.showNotification(`👁️ Viewing lead ${id} - Feature coming soon!`, 'info');
    }

    async convertLead(id) {
        if (!confirm('🔄 Convert this lead to a customer?\n\nThis will move them from leads to the customers list.')) {
            return;
        }

        try {
            this.showLoadingOverlay('Converting lead...');

            const response = await fetch(`/api/customers/leads/${id}/convert`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to convert lead');

            this.showNotification('✅ Lead converted to customer!', 'success');
            this.refreshAll();
        } catch (error) {
            this.showNotification('❌ Failed to convert lead: ' + error.message, 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async deleteLead(id) {
        if (!confirm('⚠️ Are you sure you want to delete this lead?\n\nThis action cannot be undone.')) {
            return;
        }

        try {
            this.showLoadingOverlay('Deleting lead...');

            const response = await fetch(`/api/customers/leads/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete lead');

            this.showNotification('✅ Lead deleted successfully!', 'success');
            this.loadLeads();
        } catch (error) {
            this.showNotification('❌ Failed to delete lead: ' + error.message, 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }

    // Utility methods
    showElement(id) {
        const element = document.getElementById(id);
        if (element) element.style.display = 'block';
    }

    hideElement(id) {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    }

    showElementLoading(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'block';
            element.innerHTML = '<div class="loading">Loading...</div>';
        }
    }

    loadRecentOrders() {
        // Placeholder for order loading
        this.showNotification('📦 Order management coming soon!', 'info');
    }
}

// Enhanced animations CSS
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .field-error {
        color: var(--error-color);
        font-size: var(--font-size-xs);
        margin-top: var(--spacing-xs);
    }
    
    input.error, textarea.error, select.error {
        border-color: var(--error-color) !important;
        box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1) !important;
    }
`;
document.head.appendChild(animationStyles);

// Initialize the enhanced customer manager
let customerManager;
document.addEventListener('DOMContentLoaded', () => {
    customerManager = new CustomerManager();
});

// Export for global access
window.CustomerManager = CustomerManager;