#!/usr/bin/env node
// 🎯 Taxonomy Sync Script
// Automatically syncs taxonomy from source to worker file
// Run: node scripts/sync-taxonomy.js

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read taxonomy source
const taxonomyPath = join(rootDir, 'public', 'js', 'taxonomy.js');
const taxonomyContent = readFileSync(taxonomyPath, 'utf8');

// Extract SIZES object
const sizesMatch = taxonomyContent.match(/export const SIZES = (\{[\s\S]*?\n\});/);
if (!sizesMatch) {
    console.error('❌ Could not find SIZES in taxonomy.js');
    process.exit(1);
}

const sizesObject = sizesMatch[1];

// Read worker file
const workerPath = join(rootDir, 'workers', 'sbs-products-api.js');
let workerContent = readFileSync(workerPath, 'utf8');

// Replace TAXONOMY_SIZES in worker
const workerReplacement = `// 🎯 TAXONOMY SIZES - SYNCED FROM /public/js/taxonomy.js
// Last synced: ${new Date().toISOString()}
// DO NOT EDIT - Run 'node scripts/sync-taxonomy.js' to update
const TAXONOMY_SIZES = ${sizesObject};`;

workerContent = workerContent.replace(
    /\/\/ 🎯 TAXONOMY SIZES[\s\S]*?const TAXONOMY_SIZES = \{[\s\S]*?\};/,
    workerReplacement
);

// Write updated worker
writeFileSync(workerPath, workerContent, 'utf8');

console.log('✅ Taxonomy synced successfully!');
console.log('   Source: /public/js/taxonomy.js');
console.log('   Target: /workers/sbs-products-api.js');
console.log('\n📦 Files updated:');
console.log('   - workers/sbs-products-api.js');
console.log('\n🚀 Next steps:');
console.log('   1. Test upload form');
console.log('   2. Deploy: npx wrangler pages deploy public');
