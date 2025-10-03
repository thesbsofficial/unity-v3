// 🎯 SBS 8UNITY TAXONOMY — SINGLE SOURCE OF TRUTH
// Last Updated: October 2, 2025
// ⚠️ EDIT THIS FILE ONLY — All systems pull from here

/**
 * CATEGORIES (4 total - NO exceptions)
 */
export const CATEGORIES = [
    'BN-CLOTHES',  // Brand New Clothes
    'BN-SHOES',    // Brand New Shoes
    'PO-CLOTHES',  // Pre-Owned Clothes
    'PO-SHOES'     // Pre-Owned Shoes
];

/**
 * SIZES BY CATEGORY
 */
export const SIZES = {
    'BN-CLOTHES': [
        'XS', 'S', 'M', 'L', 'XL'
    ],
    
    'PO-CLOTHES': [
        // Standard sizes
        'XS', 'S', 'M', 'L', 'XL',
        // Mixed top/bottom (±1 size difference only)
        'XS-TOP-S-BOTTOM',
        'S-TOP-XS-BOTTOM',
        'S-TOP-M-BOTTOM',
        'M-TOP-S-BOTTOM',
        'M-TOP-L-BOTTOM',
        'L-TOP-M-BOTTOM',
        'L-TOP-XL-BOTTOM',
        'XL-TOP-L-BOTTOM'
    ],
    
    'BN-SHOES': [
        'UK-6', 'UK-6-5',
        'UK-7', 'UK-7-5',
        'UK-8', 'UK-8-5',
        'UK-9', 'UK-9-5',
        'UK-10', 'UK-10-5',
        'UK-11', 'UK-11-5',
        'UK-12'
    ],
    
    'PO-SHOES': [
        'UK-6', 'UK-6-5',
        'UK-7', 'UK-7-5',
        'UK-8', 'UK-8-5',
        'UK-9', 'UK-9-5',
        'UK-10', 'UK-10-5',
        'UK-11', 'UK-11-5',
        'UK-12'
    ]
};

/**
 * SIZE LABELS (Human-readable for dropdowns)
 */
export const SIZE_LABELS = {
    'BN-CLOTHES': [
        { value: 'XS', label: 'XS' },
        { value: 'S', label: 'S' },
        { value: 'M', label: 'M' },
        { value: 'L', label: 'L' },
        { value: 'XL', label: 'XL' }
    ],
    
    'PO-CLOTHES': [
        // Standard
        { value: 'XS', label: 'XS' },
        { value: 'S', label: 'S' },
        { value: 'M', label: 'M' },
        { value: 'L', label: 'L' },
        { value: 'XL', label: 'XL' },
        // Mixed
        { value: 'XS-TOP-S-BOTTOM', label: 'XS Top / S Bottom' },
        { value: 'S-TOP-XS-BOTTOM', label: 'S Top / XS Bottom' },
        { value: 'S-TOP-M-BOTTOM', label: 'S Top / M Bottom' },
        { value: 'M-TOP-S-BOTTOM', label: 'M Top / S Bottom' },
        { value: 'M-TOP-L-BOTTOM', label: 'M Top / L Bottom' },
        { value: 'L-TOP-M-BOTTOM', label: 'L Top / M Bottom' },
        { value: 'L-TOP-XL-BOTTOM', label: 'L Top / XL Bottom' },
        { value: 'XL-TOP-L-BOTTOM', label: 'XL Top / L Bottom' }
    ],
    
    'BN-SHOES': [
        { value: 'UK-6', label: 'UK 6' },
        { value: 'UK-6-5', label: 'UK 6.5' },
        { value: 'UK-7', label: 'UK 7' },
        { value: 'UK-7-5', label: 'UK 7.5' },
        { value: 'UK-8', label: 'UK 8' },
        { value: 'UK-8-5', label: 'UK 8.5' },
        { value: 'UK-9', label: 'UK 9' },
        { value: 'UK-9-5', label: 'UK 9.5' },
        { value: 'UK-10', label: 'UK 10' },
        { value: 'UK-10-5', label: 'UK 10.5' },
        { value: 'UK-11', label: 'UK 11' },
        { value: 'UK-11-5', label: 'UK 11.5' },
        { value: 'UK-12', label: 'UK 12' }
    ],
    
    'PO-SHOES': [
        { value: 'UK-6', label: 'UK 6' },
        { value: 'UK-6-5', label: 'UK 6.5' },
        { value: 'UK-7', label: 'UK 7' },
        { value: 'UK-7-5', label: 'UK 7.5' },
        { value: 'UK-8', label: 'UK 8' },
        { value: 'UK-8-5', label: 'UK 8.5' },
        { value: 'UK-9', label: 'UK 9' },
        { value: 'UK-9-5', label: 'UK 9.5' },
        { value: 'UK-10', label: 'UK 10' },
        { value: 'UK-10-5', label: 'UK 10.5' },
        { value: 'UK-11', label: 'UK 11' },
        { value: 'UK-11-5', label: 'UK 11.5' },
        { value: 'UK-12', label: 'UK 12' }
    ]
};

/**
 * CATEGORY LABELS (Human-readable)
 */
export const CATEGORY_LABELS = {
    'BN-CLOTHES': 'Brand New • Clothes',
    'BN-SHOES': 'Brand New • Shoes',
    'PO-CLOTHES': 'Pre-Owned • Clothes',
    'PO-SHOES': 'Pre-Owned • Shoes'
};

/**
 * VALIDATION FUNCTIONS
 */
export function isValidCategory(category) {
    return CATEGORIES.includes(category);
}

export function isValidSize(category, size) {
    const validSizes = SIZES[category];
    return validSizes && validSizes.includes(size);
}

export function getSizesForCategory(category) {
    return SIZES[category] || [];
}

export function getSizeLabelsForCategory(category) {
    return SIZE_LABELS[category] || [];
}

export function getCategoryLabel(category) {
    return CATEGORY_LABELS[category] || category;
}

/**
 * HELPER: Check if category is shoes
 */
export function isShoeCategory(category) {
    return category === 'BN-SHOES' || category === 'PO-SHOES';
}

/**
 * HELPER: Check if category is clothes
 */
export function isClothesCategory(category) {
    return category === 'BN-CLOTHES' || category === 'PO-CLOTHES';
}

/**
 * METADATA
 */
export const TAXONOMY_VERSION = '1.0.0';
export const LAST_UPDATED = '2025-10-02';

// Export everything as default object too
export default {
    CATEGORIES,
    SIZES,
    SIZE_LABELS,
    CATEGORY_LABELS,
    isValidCategory,
    isValidSize,
    getSizesForCategory,
    getSizeLabelsForCategory,
    getCategoryLabel,
    isShoeCategory,
    isClothesCategory,
    TAXONOMY_VERSION,
    LAST_UPDATED
};
