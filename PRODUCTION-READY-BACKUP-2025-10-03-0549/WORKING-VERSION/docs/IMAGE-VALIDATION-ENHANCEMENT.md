# Enhanced Load Items Function with Image Validation
# Add this to detect deleted Cloudflare images

```javascript
async function loadItems() {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = '🔄 Loading items from local database...';
    logMessage('Fetching items from /api/items...');

    try {
        const response = await fetch(`${API_CONFIG.proxyUrl}/items`);

        if (!response.ok) {
            throw new Error(`Failed to fetch items: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
            // Enhanced: Validate images and mark missing ones
            const validatedItems = await Promise.allSettled(
                result.data.map(async (item) => {
                    const imageUrl = `https://imagedelivery.net/${API_CONFIG.accountHash}/${item.cloudflareId}/w=1080,h=1920`;
                    
                    try {
                        // Quick HEAD request to check if image exists
                        const imageCheck = await fetch(imageUrl, { method: 'HEAD' });
                        
                        return {
                            ...item,
                            image: imageUrl,
                            imageStatus: imageCheck.ok ? 'available' : 'missing',
                            imageError: imageCheck.ok ? null : `HTTP ${imageCheck.status}`
                        };
                    } catch (error) {
                        // Network error or image doesn't exist
                        return {
                            ...item,
                            image: imageUrl,
                            imageStatus: 'missing',
                            imageError: error.message
                        };
                    }
                })
            );
            
            inventory = validatedItems
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
            
            // Count missing images
            const missingCount = inventory.filter(item => item.imageStatus === 'missing').length;
            
            // Sort by creation date, newest first
            inventory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            statusDiv.textContent = `✅ Loaded ${inventory.length} items.`;
            if (missingCount > 0) {
                statusDiv.textContent += ` ⚠️ ${missingCount} images missing from Cloudflare.`;
                logMessage(`Warning: ${missingCount} items have missing Cloudflare images`, 'warning');
            }
            
            logMessage(`Loaded ${inventory.length} items successfully.`);
            displayInventory();
        } else {
            throw new Error('Invalid data format received from items API.');
        }

    } catch (error) {
        console.error('Error loading items:', error);
        statusDiv.textContent = `❌ Error: ${error.message}`;
        logError('Failed to load items from database', error);
        if (error.message.includes('Failed to fetch')) {
            statusDiv.textContent += ' - Is the API server running?';
        }
    }
}

// Enhanced: Display function to handle missing images
function displayInventory() {
    const container = document.getElementById('inventory-container');
    
    if (inventory.length === 0) {
        container.innerHTML = '<div class="no-items">📦 No images loaded yet. Start API proxy and click "🔄 Load All Items" to see your inventory.</div>';
        return;
    }

    container.innerHTML = inventory.map(item => {
        const missingImageClass = item.imageStatus === 'missing' ? 'missing-image' : '';
        const missingImageBadge = item.imageStatus === 'missing' 
            ? '<div class="missing-badge">❌ Image Missing</div>' 
            : '';
            
        return `
            <div class="inventory-item ${missingImageClass}" data-tags="${item.tags ? item.tags.join(' ') : ''}">
                ${missingImageBadge}
                <div class="image-container">
                    ${item.imageStatus === 'missing' 
                        ? '<div class="broken-image">🚫<br>Image Deleted<br>from Cloudflare</div>'
                        : `<img src="${item.image}" alt="${item.name}" loading="lazy">`
                    }
                </div>
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-details">
                        <span class="category">${item.category}</span>
                        <span class="size">${item.size}</span>
                    </div>
                    <div class="item-tags">
                        ${item.tags ? item.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                    </div>
                    <div class="item-meta">
                        ID: ${item.id} | CF: ${item.cloudflareId}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
```

# Additional CSS for missing images:
```css
.missing-image {
    border: 2px dashed #ff6b6b;
    opacity: 0.7;
}

.missing-badge {
    background: #ff6b6b;
    color: white;
    padding: 4px 8px;
    font-size: 12px;
    border-radius: 4px;
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
}

.broken-image {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    background: #f5f5f5;
    color: #666;
    font-size: 14px;
    text-align: center;
    border: 2px dashed #ccc;
}
```