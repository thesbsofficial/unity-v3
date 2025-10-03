// ✅ SBS 8UNITY Taxonomy Validator
// Run this in browser console to verify taxonomy consistency

const TAXONOMY = {
    categories: ['BN-CLOTHES', 'BN-SHOES', 'PO-CLOTHES', 'PO-SHOES'],
    
    sizes: {
        'BN-CLOTHES': ['XS', 'S', 'M', 'L', 'XL'],
        'PO-CLOTHES': [
            'XS', 'S', 'M', 'L', 'XL',
            'XS-TOP-S-BOTTOM', 'S-TOP-XS-BOTTOM',
            'S-TOP-M-BOTTOM', 'M-TOP-S-BOTTOM',
            'M-TOP-L-BOTTOM', 'L-TOP-M-BOTTOM',
            'L-TOP-XL-BOTTOM', 'XL-TOP-L-BOTTOM'
        ],
        'BN-SHOES': [
            'UK-6', 'UK-6-5', 'UK-7', 'UK-7-5', 'UK-8', 'UK-8-5',
            'UK-9', 'UK-9-5', 'UK-10', 'UK-10-5', 'UK-11', 'UK-11-5', 'UK-12'
        ],
        'PO-SHOES': [
            'UK-6', 'UK-6-5', 'UK-7', 'UK-7-5', 'UK-8', 'UK-8-5',
            'UK-9', 'UK-9-5', 'UK-10', 'UK-10-5', 'UK-11', 'UK-11-5', 'UK-12'
        ]
    }
};

console.log('🔍 SBS 8UNITY Taxonomy Validator\n');

// Test 1: Validate categories
console.log('✅ Test 1: Categories');
console.log('   Expected:', TAXONOMY.categories);
console.log('   Count:', TAXONOMY.categories.length);

// Test 2: Validate size counts
console.log('\n✅ Test 2: Size Counts');
Object.entries(TAXONOMY.sizes).forEach(([category, sizes]) => {
    console.log(`   ${category}: ${sizes.length} sizes`);
});

// Test 3: Check for invalid patterns
console.log('\n✅ Test 3: Pattern Validation');
const invalidPatterns = [
    'UK-6.5',    // OLD: decimal point
    'UK-7.5',    // OLD: decimal point
    'XXS',       // OLD: not in BN-CLOTHES
    'XXL',       // OLD: not in BN-CLOTHES
    'XXXL',      // OLD: not in BN-CLOTHES
];

let foundInvalid = false;
invalidPatterns.forEach(pattern => {
    const found = JSON.stringify(TAXONOMY.sizes).includes(pattern);
    if (found) {
        console.error(`   ❌ Found invalid pattern: ${pattern}`);
        foundInvalid = true;
    }
});

if (!foundInvalid) {
    console.log('   ✅ No invalid patterns found');
}

// Test 4: Validate mixed sizes (PO-CLOTHES only)
console.log('\n✅ Test 4: Mixed Size Validation');
const mixedSizes = TAXONOMY.sizes['PO-CLOTHES'].filter(s => s.includes('TOP'));
console.log(`   Found ${mixedSizes.length} mixed sizes in PO-CLOTHES`);
console.log('   Examples:', mixedSizes.slice(0, 3));

// Test 5: Validate half sizes format
console.log('\n✅ Test 5: Half Size Format');
const halfSizes = TAXONOMY.sizes['BN-SHOES'].filter(s => s.includes('-5'));
console.log(`   Found ${halfSizes.length} half sizes using -5 suffix`);
console.log('   Examples:', halfSizes.slice(0, 3));

// Test 6: Validate API (if available)
console.log('\n✅ Test 6: API Product Validation');
fetch('/api/products')
    .then(r => r.json())
    .then(data => {
        if (!data.success || !data.products) {
            console.error('   ❌ API returned error');
            return;
        }
        
        const products = data.products;
        console.log(`   Loaded ${products.length} products`);
        
        // Check categories
        const categories = [...new Set(products.map(p => p.category))];
        console.log('   Categories found:', categories);
        
        const invalidCategories = categories.filter(c => !TAXONOMY.categories.includes(c));
        if (invalidCategories.length > 0) {
            console.error('   ❌ Invalid categories:', invalidCategories);
        } else {
            console.log('   ✅ All categories valid');
        }
        
        // Check sizes
        let invalidSizeCount = 0;
        products.forEach(product => {
            const validSizes = TAXONOMY.sizes[product.category] || [];
            const productSizes = product.sizes || [];
            
            productSizes.forEach(size => {
                if (!validSizes.includes(size)) {
                    console.warn(`   ⚠️ Invalid size "${size}" in ${product.category} (ID: ${product.id})`);
                    invalidSizeCount++;
                }
            });
        });
        
        if (invalidSizeCount === 0) {
            console.log('   ✅ All product sizes valid');
        } else {
            console.error(`   ❌ Found ${invalidSizeCount} products with invalid sizes`);
        }
    })
    .catch(err => {
        console.error('   ❌ API test failed:', err.message);
    });

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Summary:');
console.log('   Categories: 4 (BN-CLOTHES, BN-SHOES, PO-CLOTHES, PO-SHOES)');
console.log('   Total sizes: ' + Object.values(TAXONOMY.sizes).flat().length);
console.log('   BN-CLOTHES: 5 sizes (XS-XL)');
console.log('   PO-CLOTHES: 13 sizes (5 standard + 8 mixed)');
console.log('   Shoes: 13 sizes each (UK-6 to UK-12 with half sizes)');
console.log('='.repeat(50));
