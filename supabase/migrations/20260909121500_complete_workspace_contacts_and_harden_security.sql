-- Migration: 20260909121500_complete_workspace_contacts_and_harden_security.sql
-- Description: Creates workspace_contacts baseline, persists add_workspace_member_manual, and hardens RPC execution permissions.

-- 1. Create workspace_contacts table
create table if not exists public.workspace_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  name text not null,
  email text,
  phone text,
  company text,
  job_title text,
  category text not null default 'client',
  status text not null default 'active',
  avatar_url text,
  notes text,
  address text,
  tags text[] default '{}'::text[],
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspace_contacts enable row level security;

create index if not exists idx_workspace_contacts_workspace on public.workspace_contacts(workspace_id);
create index if not exists idx_workspace_contacts_email on public.workspace_contacts(workspace_id, email);

-- RLS Policies for workspace_contacts
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workspace_contacts' and policyname = 'Workspace members can view contacts') then
    create policy "Workspace members can view contacts"
      on public.workspace_contacts for select
      to authenticated
      using (private.is_workspace_member(workspace_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workspace_contacts' and policyname = 'Workspace members can insert contacts') then
    create policy "Workspace members can insert contacts"
      on public.workspace_contacts for insert
      to authenticated
      with check (private.is_workspace_member(workspace_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workspace_contacts' and policyname = 'Workspace members can update contacts') then
    create policy "Workspace members can update contacts"
      on public.workspace_contacts for update
      to authenticated
      using (private.is_workspace_member(workspace_id))
      with check (private.is_workspace_member(workspace_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workspace_contacts' and policyname = 'Workspace admins can delete contacts') then
    create policy "Workspace admins can delete contacts"
      on public.workspace_contacts for delete
      to authenticated
      using (private.is_workspace_admin(workspace_id));
  end if;
end $$;

-- 2. Add add_workspace_member_manual function
create or replace function public.add_workspace_member_manual(
  p_workspace_id text,
  p_email text,
  p_name text,
  p_role text default 'member'::text,
  p_department text default null::text,
  p_phone text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
set row_security to 'off'
as $function$
declare
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  clean_name text := nullif(btrim(coalesce(p_name, '')), '');
  target_user_id uuid;
  result_membership public.workspace_memberships%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not private.is_workspace_admin(p_workspace_id) then
    raise exception 'Only workspace owners and admins can add members directly';
  end if;

  if p_role not in ('admin', 'member', 'guest') then
    raise exception 'Invalid workspace role: %', p_role;
  end if;

  if length(normalized_email) > 320 or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email address: %', normalized_email;
  end if;

  if clean_name is null then
    clean_name := split_part(normalized_email, '@', 1);
  end if;

  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = normalized_email
  order by u.created_at asc
  limit 1;

  if target_user_id is null then
    select m.user_id into target_user_id
    from public.members m
    where lower(m.email) = normalized_email
    order by m.created_at asc
    limit 1;
  end if;

  if target_user_id is null then
    target_user_id := gen_random_uuid();
  end if;

  insert into public.members (
    id,
    name,
    email,
    role,
    user_id,
    department,
    phone,
    workspace_ids,
    status
  )
  values (
    'user-' || target_user_id::text,
    clean_name,
    normalized_email,
    p_role,
    target_user_id,
    coalesce(p_department, 'd-eng'),
    p_phone,
    array[p_workspace_id],
    'offline'
  )
  on conflict (id) do update set
    name = coalesce(excluded.name, public.members.name),
    workspace_ids = array_append(
      coalesce(public.members.workspace_ids, '{}'::text[]),
      p_workspace_id
    )
    where not (p_workspace_id = any(coalesce(public.members.workspace_ids, '{}'::text[])));

  update public.members m
  set workspace_ids = array_append(coalesce(m.workspace_ids, '{}'::text[]), p_workspace_id)
  where m.user_id = target_user_id
    and not (p_workspace_id = any(coalesce(m.workspace_ids, '{}'::text[])));

  insert into public.workspace_memberships (
    workspace_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at,
    updated_at
  )
  values (
    p_workspace_id,
    target_user_id,
    p_role,
    'active',
    auth.uid(),
    now(),
    now()
  )
  on conflict (workspace_id, user_id) do update set
    role = case
      when public.workspace_memberships.role = 'owner' then 'owner'
      else excluded.role
    end,
    status = 'active',
    updated_at = now()
  returning * into result_membership;

  update public.workspace_invitations
  set status = 'accepted'
  where workspace_id = p_workspace_id
    and lower(email) = normalized_email
    and status = 'pending';

  return jsonb_build_object(
    'user_id', target_user_id,
    'workspace_id', p_workspace_id,
    'name', clean_name,
    'email', normalized_email,
    'role', result_membership.role,
    'status', result_membership.status
  );
end;
$function$;

-- 3. Security Hardening: Revoke anon execute & set search_path
revoke execute on function public.add_workspace_member_manual(text, text, text, text, text, text) from public, anon;
grant execute on function public.add_workspace_member_manual(text, text, text, text, text, text) to authenticated;

revoke execute on function public.delete_workspace_team(text) from public, anon;
grant execute on function public.delete_workspace_team(text) to authenticated;

revoke execute on function public.upsert_workspace_team(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.upsert_workspace_team(text, text, text, text, text, text, text) to authenticated;

revoke execute on function public.set_workspace_team_member(text, text, text) from public, anon;
grant execute on function public.set_workspace_team_member(text, text, text) to authenticated;

revoke execute on function public.handle_auth_user_sync() from public, anon;

alter function private.auto_add_workspace_owner() set search_path = '';
alter function public.upsert_workspace_team(text, text, text, text, text, text, text) set search_path = '';
alter function public.delete_workspace_team(text) set search_path = '';
alter function public.set_workspace_team_member(text, text, text) set search_path = '';
