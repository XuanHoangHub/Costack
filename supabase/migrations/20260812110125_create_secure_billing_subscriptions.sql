create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_customer_id text not null unique,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_customer_id text not null,
  provider_subscription_id text not null unique,
  provider_price_id text,
  plan text not null default 'pro' check (plan in ('pro', 'enterprise')),
  billing_cycle text check (billing_cycle in ('monthly', 'yearly')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'unpaid', 'paused', 'canceled', 'incomplete', 'incomplete_expired')),
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  canceled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_customer_idx
  on public.billing_subscriptions (provider_customer_id);
create index if not exists billing_subscriptions_user_status_idx
  on public.billing_subscriptions (user_id, status, current_period_end desc);
create unique index if not exists billing_subscriptions_one_live_per_user_idx
  on public.billing_subscriptions (user_id)
  where status in ('trialing', 'active', 'past_due', 'unpaid', 'paused', 'incomplete');

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;

create policy "Users can view own billing customer"
  on public.billing_customers for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can view own subscriptions"
  on public.billing_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.billing_customers from anon, authenticated;
revoke insert, update, delete on public.billing_subscriptions from anon, authenticated;

create or replace view public.current_user_entitlement
with (security_invoker = true)
as
select
  user_id,
  plan,
  status,
  billing_cycle,
  cancel_at_period_end,
  current_period_end,
  trial_end,
  case
    when status in ('active', 'trialing') then true
    when status = 'past_due' and coalesce(current_period_end, now()) > now() - interval '7 days' then true
    else false
  end as is_pro
from public.billing_subscriptions
where user_id = (select auth.uid())
order by case when status in ('active', 'trialing') then 0 else 1 end,
  current_period_end desc nulls last
limit 1;

grant select on public.current_user_entitlement to authenticated;

create or replace function private.prevent_client_premium_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    if tg_op = 'INSERT' and coalesce(new.is_premium, false) then
      raise exception 'Premium access is managed by the billing service';
    end if;
    if tg_op = 'UPDATE' and new.is_premium is distinct from old.is_premium then
      raise exception 'Premium access is managed by the billing service';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_member_premium_state on public.members;
create trigger protect_member_premium_state
before insert or update of is_premium on public.members
for each row execute function private.prevent_client_premium_changes();
