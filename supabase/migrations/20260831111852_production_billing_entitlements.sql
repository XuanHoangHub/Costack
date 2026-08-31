begin;

create table if not exists public.billing_usage_monthly (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  ai_requests integer not null default 0 check (ai_requests >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

alter table public.billing_usage_monthly enable row level security;
revoke all on table public.billing_usage_monthly from anon, authenticated;
grant select on table public.billing_usage_monthly to authenticated;
grant select, insert, update on table public.billing_usage_monthly to service_role;

drop policy if exists "Users can view own billing usage" on public.billing_usage_monthly;
create policy "Users can view own billing usage"
  on public.billing_usage_monthly for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function private.billing_plan_for_user(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
set row_security = 'off'
as $$
  select coalesce((
    select bs.plan
    from public.billing_subscriptions bs
    where bs.user_id = target_user_id
      and (
        (bs.status in ('active', 'trialing')
          and coalesce(bs.current_period_end, 'infinity'::timestamptz) > now())
        or (bs.status = 'past_due'
          and coalesce(bs.current_period_end, now()) > now() - interval '7 days')
      )
    order by bs.current_period_end desc nulls last
    limit 1
  ), 'free');
$$;

revoke all on function private.billing_plan_for_user(uuid) from public, anon, authenticated, service_role;

create or replace function public.consume_ai_billing_usage(
  p_user_id uuid,
  p_units integer default 1
)
returns table (
  allowed boolean,
  plan text,
  used integer,
  quota integer
)
language plpgsql
security definer
set search_path = ''
set row_security = 'off'
as $$
declare
  v_plan text;
  v_quota integer;
  v_used integer;
  v_period date := date_trunc('month', now() at time zone 'UTC')::date;
begin
  if p_user_id is null or p_units < 1 or p_units > 100 then
    raise exception 'INVALID_AI_USAGE_REQUEST';
  end if;

  v_plan := private.billing_plan_for_user(p_user_id);
  v_quota := case v_plan
    when 'starter' then 150
    when 'pro' then 2000
    when 'business' then 10000
    when 'enterprise' then 100000
    else 0
  end;

  if v_quota = 0 then
    return query select false, v_plan, 0, v_quota;
    return;
  end if;

  insert into public.billing_usage_monthly (user_id, period_start, ai_requests, updated_at)
  values (p_user_id, v_period, p_units, now())
  on conflict (user_id, period_start) do update
    set ai_requests = public.billing_usage_monthly.ai_requests + excluded.ai_requests,
        updated_at = now()
    where public.billing_usage_monthly.ai_requests + excluded.ai_requests <= v_quota
  returning ai_requests into v_used;

  if v_used is null then
    select bum.ai_requests into v_used
    from public.billing_usage_monthly bum
    where bum.user_id = p_user_id and bum.period_start = v_period;
    return query select false, v_plan, coalesce(v_used, 0), v_quota;
    return;
  end if;

  return query select true, v_plan, v_used, v_quota;
end;
$$;

revoke all on function public.consume_ai_billing_usage(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_billing_usage(uuid, integer) to service_role;

create or replace function private.enforce_workspace_invitation_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = 'off'
as $$
declare
  v_owner_id uuid;
  v_plan text;
  v_limit integer;
  v_active integer;
  v_pending integer;
begin
  if new.status <> 'pending' then return new; end if;

  select u.id into v_owner_id
  from public.workspaces w
  join auth.users u on u.id::text = w.user_id::text
  where w.id = new.workspace_id;
  if v_owner_id is null then return new; end if;

  v_plan := private.billing_plan_for_user(v_owner_id);
  v_limit := case v_plan
    when 'starter' then 10
    when 'pro' then 50
    when 'business' then 250
    when 'enterprise' then null
    else 1
  end;
  if v_limit is null then return new; end if;

  select count(*) into v_active
  from public.workspace_memberships wm
  where wm.workspace_id = new.workspace_id and wm.status = 'active';

  select count(*) into v_pending
  from public.workspace_invitations wi
  where wi.workspace_id = new.workspace_id
    and wi.status = 'pending'
    and (new.id is null or wi.id <> new.id);

  if v_active + v_pending >= v_limit then
    raise exception using
      errcode = 'P0001',
      message = 'BILLING_SEAT_LIMIT_REACHED',
      hint = format('The %s plan supports up to %s workspace members including pending invitations.', v_plan, v_limit);
  end if;
  return new;
end;
$$;

create or replace function private.enforce_workspace_membership_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = 'off'
as $$
declare
  v_owner_id uuid;
  v_plan text;
  v_limit integer;
  v_active integer;
begin
  if new.status <> 'active' then return new; end if;

  select u.id into v_owner_id
  from public.workspaces w
  join auth.users u on u.id::text = w.user_id::text
  where w.id = new.workspace_id;
  if v_owner_id is null then return new; end if;

  v_plan := private.billing_plan_for_user(v_owner_id);
  v_limit := case v_plan
    when 'starter' then 10
    when 'pro' then 50
    when 'business' then 250
    when 'enterprise' then null
    else 1
  end;
  if v_limit is null then return new; end if;

  select count(*) into v_active
  from public.workspace_memberships wm
  where wm.workspace_id = new.workspace_id
    and wm.status = 'active'
    and wm.user_id is distinct from new.user_id;

  if v_active >= v_limit then
    raise exception using
      errcode = 'P0001',
      message = 'BILLING_SEAT_LIMIT_REACHED',
      hint = format('The %s plan supports up to %s active workspace members.', v_plan, v_limit);
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_workspace_invitation_seat_limit() from public, anon, authenticated, service_role;
revoke all on function private.enforce_workspace_membership_seat_limit() from public, anon, authenticated, service_role;

drop trigger if exists enforce_workspace_invitation_seat_limit on public.workspace_invitations;
create trigger enforce_workspace_invitation_seat_limit
before insert or update of status on public.workspace_invitations
for each row execute function private.enforce_workspace_invitation_seat_limit();

drop trigger if exists enforce_workspace_membership_seat_limit on public.workspace_memberships;
create trigger enforce_workspace_membership_seat_limit
before insert or update of status on public.workspace_memberships
for each row execute function private.enforce_workspace_membership_seat_limit();

commit;
