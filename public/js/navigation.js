// 🚀 BULLETPROOF NAVIGATION SYSTEM FOR CLOUDFLARE PAGES
// Industry-standard navigation with clean URLs and fallback protection

class Navigation {
    constructor() {
        this.isNavigating = false;
        this.init();
    }
    
    init() {
        console.log('🚀 Initializing bulletproof navigation...');
        
        // Fix all navigation links on page load
        this.fixNavigationLinks();
        
        // Handle browser back/forward
        window.addEventListener('popstate', () => this.handleNavigation());
        
        // Setup mobile menu
        this.setupMobileMenu();
        
        // Add loading styles
        this.addLoadingStyles();
        
        console.log('✅ Navigation system initialized');
    }
    
    fixNavigationLinks() {
        // Get all links
        const links = document.querySelectorAll('a[href]');
        console.log(`🔗 Processing ${links.length} navigation links...`);
        
        links.forEach((link, index) => {
            const href = link.getAttribute('href');
            
            // Skip external links and anchors
            if (href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
                return;
            }
            
            // Remove .html extension for clean URLs
            if (href.endsWith('.html')) {
                const cleanUrl = href.replace('.html', '');
                link.setAttribute('href', cleanUrl);
                console.log(`🧹 Cleaned URL: ${href} → ${cleanUrl}`);
            }
            
            // Handle navigation clicks
            link.addEventListener('click', (e) => {
                const currentHref = link.getAttribute('href');
                
                // Only handle internal navigation
                if (!currentHref.startsWith('http') && !currentHref.startsWith('//') && !currentHref.startsWith('#')) {
                    e.preventDefault();
                    this.navigateTo(currentHref);
                }
            });
        });
        
        console.log('✅ Navigation links processed');
    }
    
    navigateTo(path) {
        if (this.isNavigating) {
            console.log('⏳ Navigation in progress, skipping...');
            return;
        }
        
        // Clean the path
        const cleanPath = path.replace('.html', '');
        
        console.log(`🧭 Navigating to: ${cleanPath}`);
        
        // Update URL without page reload
        window.history.pushState({}, '', cleanPath);
        
        // Load the content
        this.loadPage(cleanPath);
    }
    
    async loadPage(path) {
        if (this.isNavigating) return;
        
        this.isNavigating = true;
        
        try {
            // Show loading state
            this.showLoading();
            
            // Determine actual file path
            const filePath = path === '/' ? '/index.html' : `${path}.html`;
            
            console.log(`📡 Fetching: ${filePath}`);
            
            // Fetch the page content with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(filePath, {
                signal: controller.signal,
                method: 'GET',
                cache: 'no-cache'
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            
            // Parse and update content
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Update page title
            document.title = doc.title;
            
            // Update meta tags
            this.updateMetaTags(doc);
            
            // Update page content
            document.body.innerHTML = doc.body.innerHTML;
            
            // Reinitialize navigation for new content
            this.fixNavigationLinks();
            
            // Reinitialize any page-specific scripts
            this.reinitializePageScripts();
            
            // Hide loading
            this.hideLoading();
            
            console.log(`✅ Successfully loaded: ${path}`);
            
        } catch (error) {
            console.error('❌ Navigation error:', error);
            
            // Hide loading on error
            this.hideLoading();
            
            // Fallback to traditional navigation
            console.log('🔄 Falling back to traditional navigation...');
            window.location.href = path;
            
        } finally {
            this.isNavigating = false;
        }
    }
    
    updateMetaTags(doc) {
        // Update meta description
        const metaDesc = doc.querySelector('meta[name="description"]');
        const currentMetaDesc = document.querySelector('meta[name="description"]');
        
        if (metaDesc && currentMetaDesc) {
            currentMetaDesc.setAttribute('content', metaDesc.getAttribute('content'));
        }
        
        // Update other meta tags as needed
        const metaTags = doc.querySelectorAll('meta');
        metaTags.forEach(meta => {
            const name = meta.getAttribute('name') || meta.getAttribute('property');
            if (name && name.startsWith('og:')) {
                const existing = document.querySelector(`meta[property="${name}"]`);
                if (existing) {
                    existing.setAttribute('content', meta.getAttribute('content'));
                }
            }
        });
    }
    
    reinitializePageScripts() {
        // Reinitialize common page functionality
        try {
            // Cart functionality
            if (typeof updateCartCount === 'function') updateCartCount();
            if (typeof updateCartDisplay === 'function') updateCartDisplay();
            
            // Auth status
            if (typeof checkAuthStatus === 'function') checkAuthStatus();
            
            // Header scroll
            if (typeof setupHeaderScroll === 'function') setupHeaderScroll();
            
            // Mobile nav
            if (typeof setupMobileNavLinks === 'function') setupMobileNavLinks();
            
            console.log('✅ Page scripts reinitialized');
            
        } catch (error) {
            console.warn('⚠️ Some page scripts failed to reinitialize:', error);
        }
    }
    
    setupMobileMenu() {
        // Handle mobile menu toggle
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const mobileMenu = document.querySelector('.mobile-menu');
        const overlay = document.querySelector('.mobile-menu-overlay');
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                const isActive = menuToggle.getAttribute('aria-expanded') === 'true';
                
                menuToggle.setAttribute('aria-expanded', !isActive);
                
                if (mobileMenu) {
                    mobileMenu.classList.toggle('active');
                }
                
                if (overlay) {
                    overlay.classList.toggle('active');
                }
                
                // Prevent body scroll when menu is open
                document.body.style.overflow = isActive ? 'auto' : 'hidden';
            });
        }
        
        // Close menu when clicking overlay
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMobileMenu();
            }
        });
        
        console.log('📱 Mobile menu setup complete');
    }
    
    closeMobileMenu() {
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const mobileMenu = document.querySelector('.mobile-menu');
        const overlay = document.querySelector('.mobile-menu-overlay');
        
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
        if (mobileMenu) mobileMenu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        
        document.body.style.overflow = 'auto';
    }
    
    addLoadingStyles() {
        // Add CSS for loading indicator
        const style = document.createElement('style');
        style.textContent = `
            .page-loader {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            
            .page-loader.active {
                opacity: 1;
                visibility: visible;
            }
            
            .spinner {
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255, 215, 0, 0.3);
                border-top: 4px solid #FFD700;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .page-loader-text {
                color: #FFD700;
                margin-top: 20px;
                font-size: 1.1rem;
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    }
    
    showLoading() {
        // Remove existing loader
        this.hideLoading();
        
        // Add loading indicator
        const loader = document.createElement('div');
        loader.className = 'page-loader';
        loader.innerHTML = `
            <div>
                <div class="spinner"></div>
                <div class="page-loader-text">Loading...</div>
            </div>
        `;
        document.body.appendChild(loader);
        
        // Show with animation
        setTimeout(() => loader.classList.add('active'), 50);
    }
    
    hideLoading() {
        const loader = document.querySelector('.page-loader');
        if (loader) {
            loader.classList.remove('active');
            setTimeout(() => loader.remove(), 300);
        }
    }
    
    handleNavigation() {
        // Handle browser back/forward buttons
        console.log('⬅️ Browser navigation detected');
        this.loadPage(window.location.pathname);
    }
}

// 🎯 FALLBACK NAVIGATION SYSTEM
// If the main Navigation class fails, this ensures links still work

function fallbackNavigation() {
    console.log('🔄 Initializing fallback navigation...');
    
    // Simply ensure all internal links work normally
    const links = document.querySelectorAll('a[href]');
    
    links.forEach(link => {
        const href = link.getAttribute('href');
        
        // Skip external links
        if (href && !href.startsWith('http') && !href.startsWith('//')) {
            // Remove .html extension for clean URLs
            if (href.endsWith('.html')) {
                const cleanUrl = href.replace('.html', '');
                link.setAttribute('href', cleanUrl);
            }
        }
    });
    
    console.log('✅ Fallback navigation ready');
}

// 🚀 INITIALIZE NAVIGATION SYSTEM
(function initNavigation() {
    try {
        // Try to initialize the advanced navigation system
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                try {
                    new Navigation();
                } catch (error) {
                    console.error('❌ Advanced navigation failed:', error);
                    fallbackNavigation();
                }
            });
        } else {
            new Navigation();
        }
        
    } catch (error) {
        console.error('❌ Navigation initialization failed:', error);
        
        // Use fallback navigation
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fallbackNavigation);
        } else {
            fallbackNavigation();
        }
    }
})();

console.log('🚀 Bulletproof navigation system loaded!');