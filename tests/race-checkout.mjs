/**
 * 🏁 RACE CONDITION TEST
 * 
 * Tests that the checkout system correctly handles simultaneous purchases
 * when stock is limited.
 * 
 * Scenario: 
 * - Product has quantity_available = 1
 * - Two customers try to buy it simultaneously
 * - Expected: Only ONE checkout succeeds, the other gets "Insufficient stock"
 * 
 * HOW TO RUN:
 * 1. Set up a test product with quantity_available = 1
 * 2. Run: node tests/race-checkout.mjs
 * 3. Check results: Should see 1 success (200) and 1 failure (400/409)
 * 
 * ⚠️ PREREQUISITES:
 * - Deploy the CHECKOUT-TRANSACTION-TEMPLATE.js to your API
 * - Create a test product with ID in the PRODUCT_ID constant below
 * - Ensure the product has quantity_available = 1
 */

const API_URL = 'https://7342b227.unity-v3.pages.dev/api/checkout';
const PRODUCT_ID = 1; // ⚠️ UPDATE THIS to a real product ID
const USER_ID = 1; // Test user

// Helper to simulate a checkout request
async function attemptCheckout(customerName) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ product_id: PRODUCT_ID, quantity: 1 }],
        user_id: USER_ID
      })
    });

    const data = await response.json();
    const elapsed = Date.now() - startTime;

    return {
      customer: customerName,
      status: response.status,
      success: data.success,
      order_number: data.order_number,
      error: data.error,
      elapsed_ms: elapsed
    };
  } catch (error) {
    return {
      customer: customerName,
      status: 'ERROR',
      error: error.message
    };
  }
}

// Main test runner
async function runRaceTest() {
  console.log('🏁 Starting Race Condition Test...\n');
  console.log(`Testing Product ID: ${PRODUCT_ID}`);
  console.log(`API Endpoint: ${API_URL}\n`);
  console.log('Scenario: Two customers try to buy the same product simultaneously\n');

  // Launch both checkouts at the same time
  const [result1, result2] = await Promise.all([
    attemptCheckout('Customer A'),
    attemptCheckout('Customer B')
  ]);

  // Display results
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Customer A: ${result1.status} (${result1.elapsed_ms}ms)`);
  console.log(`  Success: ${result1.success}`);
  if (result1.success) {
    console.log(`  Order: ${result1.order_number}`);
  } else {
    console.log(`  Error: ${result1.error}`);
  }

  console.log();

  console.log(`Customer B: ${result2.status} (${result2.elapsed_ms}ms)`);
  console.log(`  Success: ${result2.success}`);
  if (result2.success) {
    console.log(`  Order: ${result2.order_number}`);
  } else {
    console.log(`  Error: ${result2.error}`);
  }

  console.log();

  // Validate test outcome
  const successCount = [result1, result2].filter(r => r.success).length;
  const failCount = [result1, result2].filter(r => !r.success).length;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ TEST VALIDATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (successCount === 1 && failCount === 1) {
    console.log('✅ PASS: Exactly 1 checkout succeeded, 1 failed');
    console.log('✅ Race condition handled correctly!');
    console.log('✅ No overselling occurred');
    process.exit(0);
  } else if (successCount === 2) {
    console.log('❌ FAIL: Both checkouts succeeded!');
    console.log('❌ OVERSELLING DETECTED - race condition not handled');
    console.log('❌ This will cause inventory issues in production');
    process.exit(1);
  } else if (successCount === 0) {
    console.log('⚠️  WARNING: Both checkouts failed');
    console.log('⚠️  Check if product exists and has quantity_available > 0');
    console.log('⚠️  Or API endpoint might be unreachable');
    process.exit(1);
  }
}

// Run the test
runRaceTest().catch(error => {
  console.error('Test crashed:', error);
  process.exit(1);
});
