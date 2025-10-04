// Analytics Dashboard JavaScript
// Handles data fetching, chart rendering, and sync operations

// Check authentication
const session = sessionStorage.getItem('sbs_admin_session') || localStorage.getItem('sbs_admin_session');
if (!session) {
    window.location.href = '/admin/login.html';
}

// Initialize Lucide icons
lucide.createIcons();

// State
let currentPeriod = '24h';
let charts = {};
let analyticsData = null;

// DOM Elements
const syncButton = document.getElementById('syncButton');
const syncButtonText = document.getElementById('syncButtonText');
const logoutButton = document.getElementById('logoutButton');
const periodButtons = document.querySelectorAll('.period-btn');

// Event Listeners
syncButton.addEventListener('click', syncAnalytics);
logoutButton.addEventListener('click', logout);

periodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        currentPeriod = btn.dataset.period;
        updatePeriodButtons();
        loadAnalytics();
    });
});

// Initialize
loadAnalytics();

// Functions

async function loadAnalytics() {
    try {
        const response = await fetch(`/api/admin/analytics?period=${currentPeriod}`, {
            headers: {
                'Authorization': `Bearer ${session}`
            }
        });

        const data = await response.json();

        if (data.success) {
            analyticsData = data;
            renderOverview(data.overview, data.today);
            renderCharts(data);
            renderTopProducts(data.top_products);
            renderTopSearches(data.top_searches);
            updateLastSync(data.last_sync);
        } else {
            showError('Failed to load analytics');
        }
    } catch (error) {
        console.error('Analytics load error:', error);
        showError('Failed to load analytics');
    }
}

function renderOverview(overview, today) {
    // Unique Visitors
    document.getElementById('uniqueVisitors').textContent = formatNumber(overview.total_visitors);
    document.getElementById('visitorGrowth').textContent = formatGrowth(overview.visitor_growth);

    // Revenue
    document.getElementById('totalRevenue').textContent = formatNumber(overview.total_revenue);
    document.getElementById('revenueGrowth').textContent = formatGrowth(overview.revenue_growth);

    // Orders
    document.getElementById('totalOrders').textContent = formatNumber(overview.total_orders);

    // Conversion Rate
    document.getElementById('conversionRate').textContent = formatNumber(overview.avg_conversion_rate);
}

function renderCharts(data) {
    // Revenue Trend Chart
    if (charts.revenue) {
        charts.revenue.destroy();
    }

    const revenueTrend = data.daily_trend.reverse();
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');

    charts.revenue = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: revenueTrend.map(d => formatDate(d.date)),
            datasets: [{
                label: 'Revenue (£)',
                data: revenueTrend.map(d => parseFloat(d.revenue || 0)),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '£' + value
                    }
                }
            }
        }
    });

    // Conversion Funnel Chart
    if (charts.funnel) {
        charts.funnel.destroy();
    }

    const totalData = data.daily_trend.reduce((acc, day) => {
        acc.visitors += day.unique_visitors || 0;
        acc.views += day.products_viewed || 0;
        acc.cartAdds += day.cart_adds || 0;
        acc.checkouts += day.checkouts_initiated || 0;
        acc.purchases += day.orders_completed || 0;
        return acc;
    }, { visitors: 0, views: 0, cartAdds: 0, checkouts: 0, purchases: 0 });

    const funnelCtx = document.getElementById('funnelChart').getContext('2d');

    charts.funnel = new Chart(funnelCtx, {
        type: 'bar',
        data: {
            labels: ['Visitors', 'Product Views', 'Cart Adds', 'Checkouts', 'Purchases'],
            datasets: [{
                label: 'Count',
                data: [
                    totalData.visitors,
                    totalData.views,
                    totalData.cartAdds,
                    totalData.checkouts,
                    totalData.purchases
                ],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function renderTopProducts(products) {
    const table = document.getElementById('topProductsTable');

    if (!products || products.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2 text-gray-400"></i>
                    <p>No product data yet</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    table.innerHTML = products.map(product => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${product.product_name || 'Unknown Product'}</div>
                <div class="text-sm text-gray-500">${product.brand || ''}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${product.category || '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatNumber(product.total_views)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatNumber(product.total_cart_adds)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatNumber(product.total_purchases)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                £${formatNumber(product.total_revenue)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatNumber(product.avg_conversion_rate)}%
            </td>
        </tr>
    `).join('');
}

function renderTopSearches(searches) {
    const table = document.getElementById('topSearchesTable');

    if (!searches || searches.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-12 text-center text-gray-500">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2 text-gray-400"></i>
                    <p>No search data yet</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    table.innerHTML = searches.map(search => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <i data-lucide="search" class="w-4 h-4 mr-2 text-gray-400"></i>
                    <span class="text-sm font-medium text-gray-900">${search.search_term}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatNumber(search.total_searches)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatNumber(search.avg_results)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatNumber(search.avg_ctr)}%
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

async function syncAnalytics() {
    // Disable button
    syncButton.disabled = true;
    syncButtonText.textContent = 'Syncing...';

    const icon = syncButton.querySelector('i');
    icon.classList.add('animate-spin');

    try {
        const response = await fetch('/api/analytics/sync', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(`Synced successfully! Processed ${data.summary.products_synced} products.`);
            // Reload analytics
            await loadAnalytics();
        } else {
            showError('Sync failed: ' + data.error);
        }
    } catch (error) {
        console.error('Sync error:', error);
        showError('Sync failed');
    } finally {
        // Re-enable button
        syncButton.disabled = false;
        syncButtonText.textContent = 'Sync Now';
        icon.classList.remove('animate-spin');
    }
}

function updatePeriodButtons() {
    periodButtons.forEach(btn => {
        if (btn.dataset.period === currentPeriod) {
            btn.classList.remove('bg-white', 'text-gray-700', 'border');
            btn.classList.add('bg-blue-600', 'text-white');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-white', 'text-gray-700', 'border');
        }
    });
}

function updateLastSync(syncTime) {
    if (!syncTime) {
        document.getElementById('lastSync').textContent = 'Never';
        return;
    }

    const date = new Date(syncTime);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffMinutes < 1) {
        document.getElementById('lastSync').textContent = 'Just now';
    } else if (diffMinutes < 60) {
        document.getElementById('lastSync').textContent = `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
        document.getElementById('lastSync').textContent = `${Math.floor(diffMinutes / 60)}h ago`;
    } else {
        document.getElementById('lastSync').textContent = date.toLocaleDateString();
    }
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

function formatGrowth(growth) {
    if (!growth || growth == 0) return '-';
    const arrow = growth > 0 ? '↑' : '↓';
    const color = growth > 0 ? 'text-green-600' : 'text-red-600';
    return `${arrow} ${Math.abs(growth)}%`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function logout() {
    sessionStorage.removeItem('sbs_admin_session');
    localStorage.removeItem('sbs_admin_session');
    window.location.href = '/admin/login.html';
}

function showSuccess(message) {
    if (window.adminToast) {
        window.adminToast.success(message, { description: 'Analytics data refreshed.' });
    } else {
        alert(message);
    }
}

function showError(message) {
    if (window.adminToast) {
        window.adminToast.error(message, { description: 'Analytics fetch failed. Please retry.' });
    } else {
        alert(message);
    }
}
