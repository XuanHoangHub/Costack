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

create or replace function private.enforce_free_space_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
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
        bs.status in ('active', 'trialing')
        or (bs.status = 'past_due' and coalesce(bs.current_period_end, now()) > now() - interval '7 days')
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
      hint = 'Upgrade to Apexa Pro to create more than 5 spaces in this workspace.';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_free_space_limit() from public, anon, authenticated;

drop trigger if exists enforce_free_space_limit on public.spaces;
create trigger enforce_free_space_limit
before insert on public.spaces
for each row execute function private.enforce_free_space_limit();
