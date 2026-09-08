-- PayPal totals are stored in USD cents, separate from PayOS VND orders.
alter table public.billing_subscriptions drop constraint billing_subscriptions_provider_check;
alter table public.billing_subscriptions add constraint billing_subscriptions_provider_check
  check (provider in ('stripe', 'payos', 'paypal'));

create table public.paypal_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_key text not null unique,
  plan text not null check (plan in ('starter', 'pro', 'business')),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  amount bigint not null check (amount > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  merchant_email text not null,
  provider_order_id text unique,
  capture_id text unique,
  checkout_url text,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now()
);
create index paypal_orders_user_created_idx on public.paypal_orders (user_id, created_at desc);
alter table public.paypal_orders enable row level security;
revoke all on public.paypal_orders from public, anon, authenticated;
grant select on public.paypal_orders to authenticated;
grant select, insert, update on public.paypal_orders to service_role;
create policy "Users can view own PayPal orders" on public.paypal_orders
  for select to authenticated using ((select auth.uid()) = user_id);

create function public.apply_paypal_payment(
  p_order_id uuid, p_provider_order_id text, p_capture_id text,
  p_amount bigint, p_currency text, p_merchant_email text
) returns table (processed boolean, period_end timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.paypal_orders%rowtype;
  v_subscription public.billing_subscriptions%rowtype;
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  select * into v_order from public.paypal_orders where id = p_order_id for update;
  if not found then raise exception 'PAYPAL_ORDER_NOT_FOUND'; end if;
  if p_provider_order_id is null or p_capture_id is null or length(p_capture_id) = 0
    or v_order.provider_order_id is distinct from p_provider_order_id
    or v_order.amount is distinct from p_amount or v_order.currency is distinct from p_currency
    or lower(v_order.merchant_email) is distinct from lower(p_merchant_email) then
    raise exception 'PAYPAL_ORDER_MISMATCH';
  end if;
  if v_order.status = 'paid' then
    if v_order.capture_id is distinct from p_capture_id then raise exception 'PAYPAL_CAPTURE_MISMATCH'; end if;
    return query select false, v_order.period_end;
    return;
  end if;
  -- Serialize purchases by an account even before a subscription row exists.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_order.user_id::text, 0));
  update public.billing_subscriptions set status = 'canceled', updated_at = now()
    where user_id = v_order.user_id and provider in ('paypal', 'payos')
      and current_period_end <= now() and status in ('active', 'trialing');
  if exists (select 1 from public.billing_subscriptions
    where user_id = v_order.user_id and status in ('trialing', 'active', 'past_due', 'unpaid', 'paused', 'incomplete')
      and (provider <> 'paypal' or plan <> v_order.plan)) then
    raise exception 'PAYPAL_PROVIDER_OR_PLAN_CONFLICT';
  end if;
  select * into v_subscription from public.billing_subscriptions
    where provider_subscription_id = 'paypal:' || v_order.user_id::text for update;
  v_period_start := case when v_subscription.current_period_end > now()
    then coalesce(v_subscription.current_period_start, now()) else now() end;
  v_period_end := greatest(now(), coalesce(v_subscription.current_period_end, now()))
    + case v_order.billing_cycle when 'yearly' then interval '1 year' else interval '1 month' end;
  insert into public.billing_subscriptions (
    user_id, provider, provider_customer_id, provider_subscription_id, provider_price_id,
    plan, billing_cycle, status, cancel_at_period_end, current_period_start, current_period_end, metadata
  ) values (
    v_order.user_id, 'paypal', v_order.user_id::text, 'paypal:' || v_order.user_id::text,
    v_order.plan || ':' || v_order.billing_cycle || ':' || v_order.amount::text,
    v_order.plan, v_order.billing_cycle, 'active', true, v_period_start, v_period_end,
    jsonb_build_object('last_paypal_order_id', v_order.id, 'capture_id', p_capture_id)
  ) on conflict (provider_subscription_id) do update set
    plan = excluded.plan, billing_cycle = excluded.billing_cycle, status = 'active',
    provider_price_id = excluded.provider_price_id, cancel_at_period_end = true,
    current_period_start = excluded.current_period_start, current_period_end = excluded.current_period_end,
    canceled_at = null, metadata = excluded.metadata, updated_at = now();
  update public.paypal_orders set status = 'paid', capture_id = p_capture_id,
    paid_at = now(), period_end = v_period_end where id = v_order.id;
  update public.members set is_premium = true where user_id = v_order.user_id;
  return query select true, v_period_end;
end;
$$;
revoke all on function public.apply_paypal_payment(uuid, text, text, bigint, text, text) from public, anon, authenticated;
grant execute on function public.apply_paypal_payment(uuid, text, text, bigint, text, text) to service_role;
