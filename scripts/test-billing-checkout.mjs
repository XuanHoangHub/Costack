import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

// Exercise the actual route handlers with isolated provider/database boundaries.
// No payment requests or database writes leave this process.
function checkoutRoute({ rows = [], providerStatus = 'PENDING', cancelStatus = 'CANCELLED', authenticated = true } = {}) {
  let cancellations = 0;
  let databaseCalls = 0;
  class BillingHttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const admin = { from() {
    databaseCalls++;
    const result = rows.shift() || { data: null, error: null };
    const chain = new Proxy({}, { get: (_, key) => key === 'then' ? (resolve) => resolve(result) : () => chain });
    return chain;
  } };
  const modules = {
    '@payos/node': { APIError: class extends Error {} },
    '@/lib/billing/plans': { isSelfServeBillingPlan: plan => ['starter', 'pro', 'business'].includes(plan), isBillingPlan: () => true, BILLING_PLAN_RANK: { free: 0, starter: 1, pro: 2, business: 3 } },
    '@/lib/billing/server': { BillingHttpError, getBillingAdmin: () => admin,
      requireBillingUser: async () => { if (!authenticated) throw new BillingHttpError(401, 'Authentication required'); return { user: { id: 'test-user' } }; },
      billingErrorResponse: error => Response.json({ error: error.message }, { status: error.status || 500 }),
    },
    '@/lib/billing/payos': { getPayOSPaymentLink: async () => ({ status: providerStatus }), cancelPayOSPaymentLink: async () => { cancellations++; return { status: cancelStatus }; } },
  };
  const source = ts.transpileModule(readFileSync(new URL('../src/app/api/billing/checkout/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: id => { assert.ok(modules[id], `Unexpected import ${id}`); return modules[id]; }, Response, Date, console });
  return { handlers: exports, counts: () => ({ cancellations, databaseCalls }) };
}
const request = (method, body) => new Request('http://localhost/api/billing/checkout', { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

test('unauthenticated checkout never reaches the database', async () => {
  const route = checkoutRoute({ authenticated: false });
  assert.equal((await route.handlers.POST(request('POST', { plan: 'pro', cycle: 'yearly' }))).status, 401);
  assert.equal(route.counts().databaseCalls, 0);
});
test('invalid billing cycle is rejected instead of silently charging yearly', async () => {
  const route = checkoutRoute();
  assert.equal((await route.handlers.POST(request('POST', { plan: 'pro', cycle: 'invalid' }))).status, 400);
  assert.equal(route.counts().databaseCalls, 0);
});
test('invalid order code is rejected before lookup', async () => {
  const route = checkoutRoute();
  assert.equal((await route.handlers.DELETE(request('DELETE', { orderCode: -1 }))).status, 400);
  assert.equal(route.counts().databaseCalls, 0);
});
test('an order outside the authenticated user scope returns 404', async () => {
  const route = checkoutRoute();
  assert.equal((await route.handlers.DELETE(request('DELETE', { orderCode: 123 }))).status, 404);
});
test('payment completed before cancellation is reported as paid', async () => {
  const route = checkoutRoute({ rows: [{ data: { status: 'pending' } }], providerStatus: 'PAID' });
  assert.equal((await (await route.handlers.DELETE(request('DELETE', { orderCode: 123 }))).json()).status, 'paid');
  assert.equal(route.counts().cancellations, 0);
});
test('payment won during cancellation: do not overwrite it as cancelled', async () => {
  const route = checkoutRoute({ rows: [{ data: { status: 'pending' } }], cancelStatus: 'PAID' });
  assert.equal((await (await route.handlers.DELETE(request('DELETE', { orderCode: 123 }))).json()).status, 'paid');
  assert.equal(route.counts().databaseCalls, 1);
});
test('unconfirmed provider cancellation is a conflict', async () => {
  const route = checkoutRoute({ rows: [{ data: { status: 'pending' } }], cancelStatus: 'PROCESSING' });
  assert.equal((await route.handlers.DELETE(request('DELETE', { orderCode: 123 }))).status, 409);
  assert.equal(route.counts().databaseCalls, 1);
});
test('webhook wins database race: return latest paid state', async () => {
  const route = checkoutRoute({ rows: [{ data: { status: 'pending' } }, { data: null }, { data: { status: 'paid' } }] });
  assert.equal((await (await route.handlers.DELETE(request('DELETE', { orderCode: 123 }))).json()).status, 'paid');
});
test('confirmed cancellation returns cancelled', async () => {
  const route = checkoutRoute({ rows: [{ data: { status: 'pending' } }, { data: { status: 'cancelled' } }] });
  assert.equal((await (await route.handlers.DELETE(request('DELETE', { orderCode: 123 }))).json()).status, 'cancelled');
});
