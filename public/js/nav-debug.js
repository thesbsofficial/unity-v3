// 🔍 NAVIGATION DIAGNOSTIC SCRIPT

console.log('🔍 DIAGNOSING NAVIGATION ISSUES...');

// Test 1: Check if all navigation links exist
const navLinks = document.querySelectorAll('a[href]');
console.log(`Found ${navLinks.length} navigation links:`);

navLinks.forEach((link, index) => {
    console.log(`${index + 1}. ${link.href} (text: "${link.textContent.trim()}")`);
    
    // Add click listener to debug
    link.addEventListener('click', (e) => {
        console.log(`🖱️ Clicked: ${link.href}`);
        
        // Check if link is being prevented
        if (e.defaultPrevented) {
            console.log('❌ Link navigation was prevented!');
        } else {
            console.log('✅ Link should navigate normally');
        }
    });
});

// Test 2: Check for JavaScript errors
window.addEventListener('error', (e) => {
    console.error('🚨 JavaScript Error:', e.error);
});

// Test 3: Test navigation manually
function testNavigation() {
    console.log('🧪 Testing navigation manually...');
    
    const testUrls = [
        '/',
        '/login.html',
        '/sell.html',
        '/shop.html'
    ];
    
    testUrls.forEach(url => {
        fetch(url)
            .then(response => {
                if (response.ok) {
                    console.log(`✅ ${url} - OK (${response.status})`);
                } else {
                    console.log(`❌ ${url} - Error (${response.status})`);
                }
            })
            .catch(error => {
                console.log(`❌ ${url} - Failed:`, error);
            });
    });
}

// Test 4: Check if any event listeners are blocking
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        console.log('🖱️ Link clicked, checking for interference...');
        
        // Check if something is preventing default
        setTimeout(() => {
            if (e.defaultPrevented) {
                console.log('❌ Something prevented the link from working!');
                console.log('Event details:', {
                    target: e.target,
                    href: e.target.href,
                    prevented: e.defaultPrevented
                });
            }
        }, 10);
    }
}, true);

// Run tests
setTimeout(testNavigation, 1000);

console.log('🔍 Navigation diagnostic script loaded. Check console for results.');