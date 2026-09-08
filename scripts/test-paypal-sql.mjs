// Isolated PostgreSQL verification. Install the test-only engine with:
// npm install --prefix node_modules/.cache/paypal-db-test --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.8
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '../node_modules/.cache/paypal-db-test/node_modules/@electric-sql/pglite/dist/index.js';

const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    grant usage on schema auth to authenticated, service_role;
    create table public.members (user_id uuid references auth.users(id), is_premium boolean default false);
  `);
  const base = readFileSync(new URL('../supabase/migrations/20260812110125_create_secure_billing_subscriptions.sql', import.meta.url), 'utf8');
  await db.exec(base.slice(0, base.indexOf('create or replace function private.prevent_client_premium_changes')));
  await db.exec(`alter table public.billing_subscriptions drop constraint billing_subscriptions_plan_check;
    alter table public.billing_subscriptions add constraint billing_subscriptions_plan_check check (plan in ('starter','pro','business','enterprise'));
    grant select, insert, update on public.billing_subscriptions, public.members to service_role;`);
  await db.exec(readFileSync(new URL('../supabase/migrations/20260908023628_add_paypal_checkout.sql', import.meta.url), 'utf8'));
  const owner = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  const first = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const second = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await db.query('insert into auth.users values ($1), ($2)', [owner, other]);
  await db.query('insert into public.members(user_id) values ($1), ($2)', [owner, other]);
  await db.exec('set role service_role');
  const insert = (id, providerId) => db.query(`insert into public.paypal_orders
    (id,user_id,request_key,plan,billing_cycle,amount,merchant_email,provider_order_id)
    values ($1::uuid,$2,$1::text,'pro','monthly',2900,'hoang.benjamin.creative@gmail.com',$3)`, [id, owner, providerId]);
  await insert(first, 'ORDER11111111');
  const apply = (id, providerId, capture, amount = 2900) => db.query(`select * from public.apply_paypal_payment($1,$2,$3,$4,'USD','hoang.benjamin.creative@gmail.com')`, [id, providerId, capture, amount]);
  await assert.rejects(apply(first, 'ORDER11111111', 'CAPTURE1', 1), /PAYPAL_ORDER_MISMATCH/);
  assert.equal((await db.query('select count(*)::int as n from public.billing_subscriptions')).rows[0].n, 0);
  const paid = (await apply(first, 'ORDER11111111', 'CAPTURE1')).rows[0];
  assert.equal(paid.processed, true);
  const duplicate = (await apply(first, 'ORDER11111111', 'CAPTURE1')).rows[0];
  assert.equal(duplicate.processed, false);
  assert.equal(String(duplicate.period_end), String(paid.period_end));
  await assert.rejects(apply(first, 'ORDER11111111', 'DIFFERENT_CAPTURE'), /PAYPAL_CAPTURE_MISMATCH/);
  await insert(second, 'ORDER22222222');
  await assert.rejects(apply(second, 'ORDER22222222', 'CAPTURE1'), /duplicate key/);
  assert.equal((await db.query('select status from public.paypal_orders where id=$1', [second])).rows[0].status, 'pending');
  const renewed = (await apply(second, 'ORDER22222222', 'CAPTURE2')).rows[0];
  assert.ok(new Date(renewed.period_end) > new Date(paid.period_end));
  const subscription = (await db.query('select * from public.billing_subscriptions where user_id=$1', [owner])).rows[0];
  assert.equal(subscription.provider, 'paypal');
  assert.equal(subscription.plan, 'pro');
  assert.equal(subscription.cancel_at_period_end, true);
  assert.equal((await db.query('select is_premium from public.members where user_id=$1', [owner])).rows[0].is_premium, true);
  assert.equal((await db.query('select is_premium from public.members where user_id=$1', [other])).rows[0].is_premium, false);
  await db.exec('reset role; set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [other]);
  assert.equal((await db.query('select * from public.paypal_orders')).rows.length, 0);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
  assert.equal((await db.query('select * from public.paypal_orders')).rows.length, 2);
  await assert.rejects(apply(first, 'ORDER11111111', 'CAPTURE1'), /permission denied/);
  await assert.rejects(db.query("update public.paypal_orders set status='paid'"), /permission denied/);
  await db.exec('reset role');
  const audit = (await db.query(`select
    (select relrowsecurity from pg_class where oid='public.paypal_orders'::regclass) as rls,
    has_function_privilege('anon','public.apply_paypal_payment(uuid,text,text,bigint,text,text)','EXECUTE') as anon_execute,
    (select prosecdef from pg_proc where oid='public.apply_paypal_payment(uuid,text,text,bigint,text,text)'::regprocedure) as security_definer`)).rows[0];
  assert.deepEqual(audit, { rls: true, anon_execute: false, security_definer: false });
  console.log('PayPal SQL passed: migration, activation, renewal, duplicate callbacks, capture replay, rollback, RLS, role grants.');
} catch (error) {
  console.error(error.message, error.detail || '', error.where || '');
  process.exitCode = 1;
} finally { await db.close(); }
