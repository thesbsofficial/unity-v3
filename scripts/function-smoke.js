#!/usr/bin/env node
const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)));

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';

const tests = [
  { name: 'API health', method: 'GET', path: '/api/health' },
  { name: 'Analytics overview', method: 'GET', path: '/api/analytics-v2?view=overview&period=week' },
  { name: 'Analytics products', method: 'GET', path: '/api/analytics-v2?view=products&period=month' },
  { name: 'Products (CF images fallback)', method: 'GET', path: '/api/products' },
  { name: 'Smart products (D1 first)', method: 'GET', path: '/api/products-smart' },
  { name: 'Eircode identity proxy', method: 'GET', path: '/api/eircode-proxy?action=identity' }
];

const colors = {
  green: '\u001b[32m',
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  reset: '\u001b[0m'
};

(async () => {
  const results = [];
  for (const test of tests) {
    const url = `${BASE_URL}${test.path}`;
    const init = { method: test.method, headers: { 'Content-Type': 'application/json' } };
    if (test.body) {
      init.body = JSON.stringify(test.body);
    }

    const start = Date.now();
    try {
      const response = await fetch(url, init);
      const elapsed = Date.now() - start;
      const contentType = response.headers.get('content-type') || '';
      let payload; 
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        payload = await response.text();
      }
      const statusLine = `${response.status} ${response.statusText}`;
      const hasError = response.status >= 400;
      const color = hasError ? colors.red : colors.green;
      results.push({
        name: test.name,
        url,
        status: statusLine,
        durationMs: elapsed,
        hasError,
        payload: typeof payload === 'string' ? payload.slice(0, 200) : payload
      });
      console.log(`${color}${test.name} => ${statusLine} (${elapsed}ms)${colors.reset}`);
      if (hasError) {
        console.log(JSON.stringify(payload, null, 2));
      }
    } catch (error) {
      const elapsed = Date.now() - start;
      console.log(`${colors.red}${test.name} => ERROR (${elapsed}ms)${colors.reset}`);
      console.log(error.stack || error.message);
      results.push({
        name: test.name,
        url,
        status: 'NETWORK_ERROR',
        durationMs: elapsed,
        hasError: true,
        payload: error.message
      });
    }
  }

  const failCount = results.filter(r => r.hasError).length;
  const passCount = results.length - failCount;
  console.log('\nSummary');
  console.log('-------');
  console.log(`Pass: ${passCount}`);
  console.log(`Fail: ${failCount}`);
  if (failCount > 0) {
    console.log('\nFailures:');
    for (const r of results.filter(r => r.hasError)) {
      console.log(`- ${r.name} (${r.url}) -> ${r.status}`);
    }
  }
})();
