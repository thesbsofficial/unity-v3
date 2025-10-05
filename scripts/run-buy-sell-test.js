import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { setGlobalDispatcher, Agent } from 'undici';

setGlobalDispatcher(new Agent({ headersTimeout: 60000, bodyTimeout: 60000 }));

const BASE_URL = 'http://localhost:8788';
const IS_WINDOWS = process.platform === 'win32';
const SERVER_ARGS = ['wrangler', 'pages', 'dev', 'public', '--local', '--port', '8788'];
const SUMBOT_KEY = process.env.SUMBOT_KEY;
const ADMIN_KEY = process.env.ADMIN_KEY;

if (!SUMBOT_KEY) {
  throw new Error('SUMBOT_KEY environment variable is required to run this test.');
}

if (!ADMIN_KEY) {
  throw new Error('ADMIN_KEY environment variable is required to run this test.');
}

const BUY_ORDER_ITEMS = [
  {
    product_id: 101,
    product_name: 'SBS Tee',
    product_brand: 'SBS',
    product_category: 'PO-CLOTHES',
    product_size: 'L',
    price: 45,
    quantity: 1,
    image_url: 'https://dummyimage.com/400x400/000/fff&text=SBS+Tee'
  },
  {
    product_id: 102,
    product_name: 'SBS Hoodie',
    product_brand: 'SBS',
    product_category: 'PO-CLOTHES',
    product_size: 'M',
    price: 65,
    quantity: 1,
    image_url: 'https://dummyimage.com/400x400/111/eee&text=SBS+Hoodie'
  }
];

function parseSetCookies(res) {
  if (typeof res.headers.getSetCookie === 'function') {
    return res.headers.getSetCookie();
  }
  const raw = res.headers.get('set-cookie');
  return raw ? [raw] : [];
}

function storeCookies(res, jar) {
  const cookies = parseSetCookies(res);
  if (!cookies || cookies.length === 0) return;
  for (const cookie of cookies) {
    const [pair] = cookie.split(';');
    const [name, value] = pair.split('=');
    if (name && value) {
      jar.set(name.trim(), value.trim());
    }
  }
}

function cookieHeader(jar) {
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

async function fetchJson(path, { method = 'GET', headers = {}, body, jar } = {}) {
  const init = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (!init.headers['Content-Type']) {
      init.headers['Content-Type'] = 'application/json';
    }
  }
  if (jar && jar.size > 0) {
    init.headers.Cookie = cookieHeader(jar);
  }

  const res = await fetch(`${BASE_URL}${path}`, init);
  if (jar) storeCookies(res, jar);

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    data = null;
  }

  return { res, data, text };
}

async function startServer() {
  const command = IS_WINDOWS ? process.env.ComSpec || 'cmd.exe' : 'npx';
  const args = IS_WINDOWS ? ['/c', 'npx', ...SERVER_ARGS] : SERVER_ARGS;

  const server = spawn(command, args, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  let resolved = false;

  await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      const msg = chunk.toString();
      process.stdout.write(`[wrangler] ${msg}`);
      if (!resolved && msg.includes('Ready on')) {
        resolved = true;
        resolve();
      }
    };

    const onError = (err) => {
      if (!resolved) {
        reject(err);
      }
    };

    const onExit = (code) => {
      if (!resolved) {
        reject(new Error(`wrangler exited early with code ${code}`));
      }
    };

    server.stdout.on('data', onData);
    server.stderr.on('data', onData);
    server.on('error', onError);
    server.on('exit', onExit);
  });

  return server;
}

async function stopServer(server) {
  if (!server) return;
  server.kill('SIGINT');
  try {
    await once(server, 'exit');
  } catch (err) {
    console.warn('wrangler process termination warning:', err.message);
  }
}

async function main() {
  const summary = { steps: [] };
  let server;

  try {
    console.log('▶️ Starting local dev server...');
  server = await startServer();
  await delay(1000);

    const userJar = new Map();
    const adminJar = new Map();
    let userCsrf = null;
    let adminCsrf = null;
    let userSessionToken = null;
    let adminSessionToken = null;

    console.log('🔐 Logging in as sumbot...');
    const login = await fetchJson('/api/users/login', {
      method: 'POST',
  body: { social_handle: 'sumbot', password: SUMBOT_KEY },
      jar: userJar
    });

    if (login.res.status !== 200 || !login.data?.success) {
      throw new Error(`Login failed (${login.res.status}): ${login.text}`);
    }

    userCsrf = login.data.csrf_token;
    userSessionToken = userJar.get('sbs_session');
    summary.steps.push({ name: 'login', status: 'ok', detail: { csrf: !!userCsrf, sessionToken: !!userSessionToken } });

    console.log('🛒 Creating buy order...');
    const orderPayload = {
      items: BUY_ORDER_ITEMS,
      customer_name: 'Sumbot QA',
      customer_email: 'sumbot@example.com',
      customer_phone: '+353870000123',
      delivery_address: '1 Automation Way',
      delivery_city: 'Dublin',
      delivery_eircode: 'D01 TEST',
      delivery_method: 'delivery',
      subtotal: BUY_ORDER_ITEMS.reduce((sum, item) => sum + item.price * item.quantity, 0),
      delivery_fee: 5,
      total: BUY_ORDER_ITEMS.reduce((sum, item) => sum + item.price * item.quantity, 0) + 5
    };

    const orderRes = await fetchJson('/api/orders', {
      method: 'POST',
      headers: { 'X-CSRF-Token': userCsrf },
      body: orderPayload,
      jar: userJar
    });

    if (orderRes.res.status !== 201 || !orderRes.data?.order) {
      throw new Error(`Order creation failed (${orderRes.res.status}): ${orderRes.text}`);
    }

    const order = orderRes.data.order;
    summary.steps.push({ name: 'buy-order', status: 'created', detail: { order_number: order.order_number, total: order.total } });

    console.log('📮 Submitting sell form...');
    const sellPayload = {
      items: [
        {
          category: 'Sneakers',
          brand: 'Nike',
          condition: 'excellent',
          size: 'UK 9',
          description: 'Jordan 1 Retro'
        },
        {
          category: 'Clothing',
          brand: 'Supreme',
          condition: 'good',
          size: 'L',
          description: 'Supreme Box Logo Tee with minor wear'
        }
      ],
      contact_phone: '+353870000123',
      contact_channel: 'whatsapp',
      contact_handle: '@sumbot',
      contact_email: 'sumbot@example.com',
      address: '1 Automation Way',
      city: 'Dublin',
      eircode: 'D01 TEST',
      notes: 'Automated sell submission test'
    };

    const sellRes = await fetchJson('/api/sell-submissions', {
      method: 'POST',
      body: sellPayload,
      jar: userJar
    });

    if (sellRes.res.status !== 201 || !sellRes.data?.success) {
      throw new Error(`Sell submission failed (${sellRes.res.status}): ${sellRes.text}`);
    }

    const submissionId = sellRes.data.submission_id;
    summary.steps.push({ name: 'sell-submission', status: 'created', detail: { submission_id: submissionId, batch_id: sellRes.data.batch_id } });

    console.log('🛡️ Logging in as admin...');
    const adminLogin = await fetchJson('/api/users/login', {
      method: 'POST',
  body: { social_handle: 'admin', password: ADMIN_KEY },
      jar: adminJar
    });

    if (adminLogin.res.status !== 200 || !adminLogin.data?.success) {
      throw new Error(`Admin login failed (${adminLogin.res.status}): ${adminLogin.text}`);
    }

    adminCsrf = adminLogin.data.csrf_token;
    adminSessionToken = adminJar.get('sbs_session');
    summary.steps.push({ name: 'admin-login', status: 'ok', detail: { csrf: !!adminCsrf, sessionToken: !!adminSessionToken } });

    console.log('✅ Approving order as admin...');
    const orderUpdate = await fetchJson('/api/admin/orders', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminSessionToken}` },
      body: { order_number: order.order_number, status: 'confirmed', admin_notes: 'Automated confirmation (buy flow test)' },
      jar: adminJar
    });

    if (orderUpdate.res.status !== 200 || !orderUpdate.data?.success) {
      throw new Error(`Order update failed (${orderUpdate.res.status}): ${orderUpdate.text}`);
    }

    summary.steps.push({ name: 'admin-order-update', status: 'confirmed', detail: { order_number: order.order_number, status: orderUpdate.data.order?.status } });

    console.log('✅ Approving sell submission as admin...');
    const sellUpdate = await fetchJson(`/api/admin/sell-requests/${submissionId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminSessionToken}` },
      body: { status: 'approved', admin_notes: 'Automated approval (sell flow test)' },
      jar: adminJar
    });

    if (sellUpdate.res.status !== 200 || !sellUpdate.data?.success) {
      throw new Error(`Sell submission update failed (${sellUpdate.res.status}): ${sellUpdate.text}`);
    }

    summary.steps.push({ name: 'admin-sell-update', status: 'approved', detail: { submission_id: submissionId, status: sellUpdate.data.submission?.status } });

    console.log('📦 Fetching customer orders for verification...');
    const ordersList = await fetchJson('/api/users/me/orders', {
      method: 'GET',
      headers: { 'X-CSRF-Token': userCsrf },
      jar: userJar
    });

    if (ordersList.res.status !== 200 || !ordersList.data?.orders) {
      throw new Error(`Customer orders fetch failed (${ordersList.res.status}): ${ordersList.text}`);
    }

    const customerOrder = ordersList.data.orders.find((o) => o.order_number === order.order_number);
    summary.steps.push({
      name: 'customer-orders-verify',
      status: customerOrder?.status || 'missing',
      detail: customerOrder || null
    });

    console.log('📄 Fetching sell submissions for user verification...');
    const sellList = await fetchJson('/api/sell-submissions', {
      method: 'GET',
      headers: { 'X-CSRF-Token': userCsrf },
      jar: userJar
    });

    if (sellList.res.status !== 200 || !sellList.data?.submissions) {
      throw new Error(`Customer sell submissions fetch failed (${sellList.res.status}): ${sellList.text}`);
    }

    const customerSubmission = sellList.data.submissions.find((s) => s.id === submissionId);
    summary.steps.push({
      name: 'customer-sell-verify',
      status: customerSubmission?.status || 'missing',
      detail: customerSubmission || null
    });

    console.log('\n🎉 End-to-end test completed successfully.');
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    console.log('⏹️ Stopping dev server...');
    await stopServer(server);
  }
}

main().catch((err) => {
  console.error('Fatal error running buy/sell test:', err);
  process.exit(1);
});
