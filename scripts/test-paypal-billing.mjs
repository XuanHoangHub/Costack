import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const nativeRequire = createRequire(import.meta.url);
function load(file, mocks = {}, globals = {}, cache = new Map()) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const source = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const require = id => {
    if (id === 'server-only') return {};
    if (id in mocks) return mocks[id];
    if (id.startsWith('node:')) return nativeRequire(id);
    const path = id.startsWith('@/') ? `src/${id.slice(2)}.ts` : `${file.slice(0, file.lastIndexOf('/'))}/${id.replace(/^\.\//, '')}.ts`;
    return load(path, mocks, globals, cache);
  };
  vm.runInNewContext(source, { exports, require, Response, Request, URL, Date, Buffer, AbortSignal, TextEncoder, console,
    process: { env: {} }, fetch: () => { throw new Error('Unexpected network request'); }, ...globals });
  return exports;
}
class BillingHttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const server = {
  BillingHttpError,
  billingErrorResponse: error => Response.json({ error: error.message }, { status: error.status || 500 }),
};
const local = { id: '11111111-1111-4111-8111-111111111111', user_id: 'owner', plan: 'pro', billing_cycle: 'monthly',
  amount: 2900, currency: 'USD', merchant_email: 'hoang.benjamin.creative@gmail.com', provider_order_id: 'ORDER123456789', status: 'pending' };
function order(status = 'COMPLETED', captureStatus = 'COMPLETED') {
  return { id: local.provider_order_id, intent: 'CAPTURE', status, purchase_units: [{
    custom_id: local.id, invoice_id: local.id, payee: { email_address: local.merchant_email }, amount: { value: '29.00', currency_code: 'USD' },
    payments: { captures: [{ id: 'CAPTURE123', status: captureStatus, amount: { value: '29.00', currency_code: 'USD' } }] },
  }] };
}
const library = () => load('src/lib/billing/paypal.ts', { './server': server });

test('USD amounts reject malformed, zero, negative and sub-cent prices', () => {
  const { usdToCents } = load('src/lib/billing/paypal-prices.ts');
  for (const bad of [null, 29, '', '0', '-1', '1.001', '1e3', '1,000', 'NaN', 'Infinity']) assert.equal(usdToCents(bad), null);
  assert.equal(usdToCents('29.00'), 2900);
  assert.equal(usdToCents('0.01'), 1);
});
test('email alone never enables automated PayPal', () => assert.equal(library().isPayPalConfigured(), false));
test('all six default prices are positive and annual prices equal ten months', () => {
  for (const plan of ['starter', 'pro', 'business']) {
    const api = library();
    assert.ok(api.getPayPalPrice(plan, 'monthly') > 0);
    assert.equal(api.getPayPalPrice(plan, 'yearly'), api.getPayPalPrice(plan, 'monthly') * 10);
  }
});
test('only a completed, matching capture is accepted', () => {
  const { verifiedCapture } = library();
  assert.equal(verifiedCapture(order(), local).id, 'CAPTURE123');
  assert.equal(verifiedCapture(order('APPROVED'), local), null);
  assert.equal(verifiedCapture(order('COMPLETED', 'PENDING'), local), null);
});
test('reject wrong merchant, order, currency, amount, invoice and partial captures', () => {
  const { verifiedCapture } = library();
  const changes = [
    o => { o.id = 'ATTACKER123'; },
    o => { o.purchase_units[0].payee.email_address = 'attacker@example.com'; },
    o => { o.purchase_units[0].custom_id = 'someone-else'; },
    o => { o.purchase_units[0].invoice_id = 'another-invoice'; },
    o => { o.purchase_units[0].amount.currency_code = 'VND'; },
    o => { o.purchase_units[0].amount.value = '0.01'; },
    o => { o.purchase_units[0].payments.captures[0].amount.value = '0.01'; },
  ];
  for (const change of changes) { const value = order(); change(value); assert.throws(() => verifiedCapture(value, local), BillingHttpError); }
});

function reconcileHarness(responses) {
  const writes = [];
  const paths = [];
  const api = load('src/lib/billing/paypal.ts', { './server': { ...server, getBillingAdmin: () => ({ rpc: async (name, args) => {
    writes.push({ name, args }); return { data: [{ period_end: '2027-01-01T00:00:00Z' }] };
  } }) } }, {
    process: { env: { PAYPAL_CLIENT_ID: 'test', PAYPAL_CLIENT_SECRET: 'test', PAYPAL_WEBHOOK_ID: 'test', PAYPAL_ENVIRONMENT: 'sandbox' } },
    fetch: async (url, init) => {
      if (url.endsWith('/token')) return Response.json({ access_token: 'test-access-token' });
      paths.push({ url, init });
      const result = responses.shift();
      if (result instanceof Error) throw result;
      assert.ok(result, 'Unexpected PayPal call');
      return Response.json(result);
    },
  });
  return { api, writes, paths };
}
test('pending captures never activate a plan', async () => {
  const h = reconcileHarness([order('COMPLETED', 'PENDING')]);
  assert.equal((await h.api.reconcilePayPalOrder(local, local.provider_order_id)).status, 'pending');
  assert.equal(h.writes.length, 0);
});
test('capture timeout recovers through authoritative GET with stable idempotency key', async () => {
  const h = reconcileHarness([order('APPROVED'), new Error('timeout'), order(), order()]);
  assert.equal((await h.api.reconcilePayPalOrder(local, local.provider_order_id)).status, 'paid');
  assert.equal(h.writes.length, 1);
  assert.equal(h.paths[1].init.headers['PayPal-Request-Id'], `capture-${local.id}`);
});
test('forged merchant is rejected before capturing any money', async () => {
  const value = order('APPROVED'); value.purchase_units[0].payee.email_address = 'attacker@example.com';
  const h = reconcileHarness([value]);
  await assert.rejects(h.api.reconcilePayPalOrder(local, local.provider_order_id));
  assert.equal(h.paths.length, 1);
  assert.equal(h.writes.length, 0);
});
test('unauthenticated checkout fails before any database or PayPal call', async () => {
  const route = load('src/app/api/billing/paypal-checkout/route.ts', {
    '@/lib/billing/server': { ...server, requireBillingUser: async () => { throw new BillingHttpError(401, 'Authentication required'); } },
    '@/lib/billing/paypal': {},
  });
  for (const method of ['POST', 'PUT']) assert.equal((await route[method](new Request('https://apexa.test', { method, body: '{}' }))).status, 401);
});
test('capture endpoint scopes lookup to owner and ignores client provider/amount overrides', async () => {
  const filters = [];
  let captured;
  const query = { select: () => query, eq: (key, value) => { filters.push([key, value]); return query; }, maybeSingle: async () => ({ data: local }) };
  const route = load('src/app/api/billing/paypal-checkout/route.ts', {
    '@/lib/billing/server': { ...server, requireBillingUser: async () => ({ user: { id: 'owner' } }), getBillingAdmin: () => ({ from: () => query }) },
    '@/lib/billing/paypal': { reconcilePayPalOrder: async (record, id) => { captured = [record, id]; return { status: 'pending' }; } },
  });
  const response = await route.PUT(new Request('https://apexa.test', { method: 'PUT', body: JSON.stringify({ orderId: local.id, providerOrderId: 'ATTACKER', amount: 1 }) }));
  assert.equal(response.status, 200);
  assert.ok(filters.some(([key, value]) => key === 'user_id' && value === 'owner'));
  assert.equal(captured[1], local.provider_order_id);
  assert.equal(captured[0].amount, 2900);
});
test('invalid webhook signature cannot touch orders or entitlements', async () => {
  const route = load('src/app/api/billing/paypal-webhook/route.ts', {
    '@/lib/billing/server': server,
    '@/lib/billing/paypal': { isPayPalConfigured: () => true, verifyPayPalWebhook: async () => false },
  });
  const response = await route.POST(new Request('https://apexa.test', { method: 'POST', body: JSON.stringify({ id: 'EVENT123', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAPTURE123' } }) }));
  assert.equal(response.status, 400);
});

test('create checkout ignores client prices and recipient, persists server price before redirect', async () => {
  let inserted;
  let providerBody;
  let saved;
  const db = { from(table) {
    const chain = new Proxy({}, { get: (_, key) => {
      if (key === 'upsert') return async value => { inserted = value; return {}; };
      if (key === 'single') return async () => ({ data: { ...local, checkout_url: null } });
      if (key === 'update') return value => { saved = value; return chain; };
      if (key === 'then') return resolve => resolve({ data: table === 'billing_subscriptions' ? [] : null });
      return () => chain;
    } });
    return chain;
  } };
  const route = load('src/app/api/billing/paypal-checkout/route.ts', {
    '@/lib/billing/server': { ...server, requireBillingUser: async () => ({ user: { id: 'owner' } }), getBillingAdmin: () => db, getAppOrigin: () => 'https://apexa.test' },
    '@/lib/billing/paypal': {
      isPayPalConfigured: () => true, getPayPalPrice: () => 2900, getPayPalMerchantEmail: () => local.merchant_email,
      paypalRequest: async (_path, _method, body) => { providerBody = body; return { id: local.provider_order_id, links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123456789' }] }; },
    },
  }, { process: { env: { PAYPAL_ENVIRONMENT: 'sandbox' } } });
  const response = await route.POST(new Request('https://apexa.test', { method: 'POST', body: JSON.stringify({
    plan: 'pro', cycle: 'monthly', amount: 1, userId: 'attacker', merchantEmail: 'attacker@example.com', returnPath: 'https://attacker.test',
  }) }));
  assert.equal(response.status, 200);
  assert.equal(inserted.amount, 2900);
  assert.equal(inserted.user_id, 'owner');
  assert.equal(inserted.merchant_email, local.merchant_email);
  assert.equal(providerBody.purchase_units[0].amount.value, '29.00');
  assert.ok(providerBody.payment_source.paypal.experience_context.return_url.startsWith('https://apexa.test/billing/paypal/return?'));
  assert.equal(saved.provider_order_id, local.provider_order_id);
});

test('invalid plan/cycle is rejected before any database access', async () => {
  const route = load('src/app/api/billing/paypal-checkout/route.ts', {
    '@/lib/billing/server': { ...server, requireBillingUser: async () => ({ user: { id: 'owner' } }) },
    '@/lib/billing/paypal': {},
  });
  for (const body of [{ plan: 'free', cycle: 'monthly' }, { plan: 'pro', cycle: 'weekly' }, null]) {
    assert.equal((await route.POST(new Request('https://apexa.test', { method: 'POST', body: JSON.stringify(body) }))).status, 400);
  }
});
