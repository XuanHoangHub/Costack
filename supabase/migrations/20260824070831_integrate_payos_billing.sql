alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_provider_check;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_provider_check
  check (provider in ('stripe', 'payos')) not valid;

alter table public.billing_subscriptions
  validate constraint billing_subscriptions_provider_check;

create table if not exists public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'payos' check (provider = 'payos'),
  order_code bigint not null unique check (order_code > 0),
  plan text not null check (plan in ('starter', 'pro', 'business')),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  amount bigint not null check (amount > 0),
  currency text not null default 'VND' check (currency = 'VND'),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'expired', 'failed')),
  description text not null,
  return_url text not null,
  payment_link_id text unique,
  checkout_url text,
  payment_reference text unique,
  expires_at timestamptz not null,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_orders_user_created_idx
  on public.billing_orders (user_id, created_at desc);

create index if not exists billing_orders_pending_user_idx
  on public.billing_orders (user_id, plan, billing_cycle, expires_at desc)
  where status = 'pending';

alter table public.billing_orders enable row level security;

alter table public.billing_orders
  add column if not exists return_url text;

revoke all on table public.billing_orders from anon, authenticated;
grant select on table public.billing_orders to authenticated;
grant select, insert, update on table public.billing_orders to service_role;

drop policy if exists "Users can view own billing orders" on public.billing_orders;
create policy "Users can view own billing orders"
  on public.billing_orders for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace view public.current_user_entitlement
with (security_invoker = true)
as
select
  user_id,
  provider,
  plan,
  status,
  billing_cycle,
  cancel_at_period_end,
  current_period_end,
  trial_end,
  case
    when status in ('active', 'trialing')
      and coalesce(current_period_end, 'infinity'::timestamptz) > now() then true
    when status = 'past_due'
      and coalesce(current_period_end, now()) > now() - interval '7 days' then true
    else false
  end as is_pro
from public.billing_subscriptions
where user_id = (select auth.uid())
order by case when status in ('active', 'trialing') then 0 else 1 end,
  current_period_end desc nulls last
limit 1;

grant select on public.current_user_entitlement to authenticated;

create or replace function public.apply_payos_payment(
  p_order_code bigint,
  p_amount bigint,
  p_payment_link_id text,
  p_reference text,
  p_transaction_at text,
  p_event_id text,
  p_signature text
)
returns table (
  processed boolean,
  entitlement_user_id uuid,
  entitlement_plan text,
  period_end timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.billing_orders%rowtype;
  v_subscription public.billing_subscriptions%rowtype;
  v_period_start timestamptz;
  v_period_base timestamptz;
  v_period_end timestamptz;
  v_inserted_event text;
begin
  select *
  into v_order
  from public.billing_orders
  where provider = 'payos' and order_code = p_order_code
  for update;

  if not found then
    raise exception 'PAYOS_ORDER_NOT_FOUND';
  end if;

  if v_order.amount <> p_amount
    or v_order.currency <> 'VND'
    or (v_order.payment_link_id is not null and v_order.payment_link_id <> p_payment_link_id) then
    raise exception 'PAYOS_ORDER_MISMATCH';
  end if;

  if v_order.status = 'paid' then
    return query select false, v_order.user_id, v_order.plan, v_order.paid_at;
    return;
  end if;

  if v_order.status <> 'pending' then
    raise exception 'PAYOS_ORDER_NOT_PAYABLE';
  end if;

  if exists (
    select 1
    from public.billing_subscriptions
    where user_id = v_order.user_id
      and provider <> 'payos'
      and status in ('trialing', 'active', 'past_due', 'unpaid', 'paused', 'incomplete')
  ) then
    raise exception 'PAYOS_PROVIDER_CONFLICT';
  end if;

  insert into public.billing_webhook_events (
    provider,
    event_id,
    event_type,
    payload_version
  ) values (
    'payos',
    p_event_id,
    'payment.paid',
    'v2'
  )
  on conflict (provider, event_id) do nothing
  returning event_id into v_inserted_event;

  if v_inserted_event is null then
    return query select false, v_order.user_id, v_order.plan, v_order.paid_at;
    return;
  end if;

  select *
  into v_subscription
  from public.billing_subscriptions
  where provider_subscription_id = 'payos:' || v_order.user_id::text
  for update;

  v_period_base := greatest(now(), coalesce(v_subscription.current_period_end, now()));
  v_period_start := case
    when v_subscription.current_period_end > now()
      then coalesce(v_subscription.current_period_start, now())
    else now()
  end;
  v_period_end := case v_order.billing_cycle
    when 'yearly' then v_period_base + interval '1 year'
    else v_period_base + interval '1 month'
  end;

  insert into public.billing_subscriptions (
    user_id,
    provider,
    provider_customer_id,
    provider_subscription_id,
    provider_price_id,
    plan,
    billing_cycle,
    status,
    cancel_at_period_end,
    current_period_start,
    current_period_end,
    canceled_at,
    metadata,
    updated_at
  ) values (
    v_order.user_id,
    'payos',
    v_order.user_id::text,
    'payos:' || v_order.user_id::text,
    v_order.plan || ':' || v_order.billing_cycle || ':' || v_order.amount::text,
    v_order.plan,
    v_order.billing_cycle,
    'active',
    true,
    v_period_start,
    v_period_end,
    null,
    jsonb_build_object('last_order_code', v_order.order_code),
    now()
  )
  on conflict (provider_subscription_id) do update set
    provider_price_id = excluded.provider_price_id,
    plan = excluded.plan,
    billing_cycle = excluded.billing_cycle,
    status = 'active',
    cancel_at_period_end = true,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    canceled_at = null,
    metadata = public.billing_subscriptions.metadata || excluded.metadata,
    updated_at = now();

  update public.billing_orders
  set status = 'paid',
      payment_link_id = coalesce(payment_link_id, p_payment_link_id),
      payment_reference = p_reference,
      paid_at = now(),
      metadata = metadata || jsonb_strip_nulls(jsonb_build_object(
        'transaction_at', p_transaction_at,
        'signature', p_signature
      )),
      updated_at = now()
  where id = v_order.id;

  update public.members
  set is_premium = true
  where user_id = v_order.user_id;

  return query select true, v_order.user_id, v_order.plan, v_period_end;
end;
$$;

revoke all on function public.apply_payos_payment(bigint, bigint, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_payos_payment(bigint, bigint, text, text, text, text, text)
  to service_role;

create or replace function private.enforce_free_space_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = 'off'
as $$
declare
  actor uuid := (select auth.uid());
  has_pro boolean := false;
  current_space_count integer := 0;
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') or actor is null then
    return new;
  end if;

  select exists (
    select 1
    from public.billing_subscriptions bs
    where bs.user_id = actor
      and (
        (bs.status in ('active', 'trialing')
          and coalesce(bs.current_period_end, 'infinity'::timestamptz) > now())
        or (bs.status = 'past_due'
          and coalesce(bs.current_period_end, now()) > now() - interval '7 days')
      )
  ) into has_pro;

  if has_pro then return new; end if;

  select count(*)
  into current_space_count
  from public.spaces s
  where s.workspace_id = new.workspace_id;

  if current_space_count >= 5 then
    raise exception using
      errcode = 'P0001',
      message = 'FREE_SPACE_LIMIT_REACHED',
      hint = 'Upgrade to a paid Apexa plan to create more than 5 spaces.';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_free_space_limit() from public, anon, authenticated, service_role;
