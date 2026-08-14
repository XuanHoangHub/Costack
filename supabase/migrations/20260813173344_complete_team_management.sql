create schema if not exists private;

create table if not exists public.departments (
  id text primary key,
  name text not null,
  description text not null default '',
  parent_id text,
  manager_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.departments add column if not exists name text;
alter table public.departments add column if not exists description text not null default '';
alter table public.departments add column if not exists parent_id text;
alter table public.departments add column if not exists manager_id text;
alter table public.departments add column if not exists created_at timestamptz not null default now();
alter table public.departments add column if not exists updated_at timestamptz not null default now();

insert into public.departments (id, name, description, parent_id)
values
  ('d-hq', 'Executive Headquarters', 'Điều hành và định hướng toàn tổ chức.', null),
  ('d-eng', 'Engineering & Technology', 'Kỹ thuật, nền tảng và vận hành sản phẩm.', 'd-hq'),
  ('d-design', 'Design & Product Experience', 'Sản phẩm, nghiên cứu và trải nghiệm người dùng.', 'd-hq'),
  ('d-growth', 'Marketing & Sales Growth', 'Marketing, bán hàng và tăng trưởng.', 'd-hq')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  parent_id = excluded.parent_id,
  updated_at = now();

alter table public.departments enable row level security;

drop policy if exists departments_authenticated_read on public.departments;
create policy departments_authenticated_read
on public.departments for select to authenticated
using ((select auth.uid()) is not null);

grant select on table public.departments to authenticated;
revoke all on table public.departments from anon;
grant usage on schema private to authenticated;
revoke all on schema private from anon;

create or replace function private.can_view_team_workspace(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = target_workspace_id
        and wm.user_id = (select auth.uid())
        and wm.status = 'active'
    )
    or exists (
      select 1
      from public.workspaces w
      where w.id = target_workspace_id
        and w.user_id::text = (select auth.uid())::text
    )
  );
$$;

create or replace function private.can_manage_team_workspace(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = target_workspace_id
        and wm.user_id = (select auth.uid())
        and wm.status = 'active'
        and wm.role in ('owner', 'admin')
    )
    or exists (
      select 1
      from public.workspaces w
      where w.id = target_workspace_id
        and w.user_id::text = (select auth.uid())::text
    )
  );
$$;

revoke all on function private.can_view_team_workspace(text) from public, anon;
revoke all on function private.can_manage_team_workspace(text) from public, anon;
grant execute on function private.can_view_team_workspace(text) to authenticated;
grant execute on function private.can_manage_team_workspace(text) to authenticated;

create unique index if not exists team_members_one_lead_per_team
on public.team_members (team_id) where role = 'lead';

create or replace function public.upsert_workspace_team(
  p_team_id text,
  p_workspace_id text,
  p_name text,
  p_description text default '',
  p_icon text default '👥',
  p_department_id text default null,
  p_leader_id text default null
)
returns public.teams
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  normalized_name text := btrim(coalesce(p_name, ''));
  saved_team public.teams%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not private.can_manage_team_workspace(p_workspace_id) then
    raise exception 'Only workspace owners and admins can manage Teams';
  end if;
  if p_team_id is null or btrim(p_team_id) = '' then
    raise exception 'Team id is required';
  end if;
  if length(normalized_name) < 2 or length(normalized_name) > 80 then
    raise exception 'Team name must contain between 2 and 80 characters';
  end if;
  if length(coalesce(p_description, '')) > 240 then
    raise exception 'Team description is too long';
  end if;
  if p_department_id is not null and not exists (
    select 1 from public.departments d where d.id = p_department_id
  ) then
    raise exception 'Department not found';
  end if;
  if p_leader_id is not null and not exists (
    select 1 from public.members m
    where m.id = p_leader_id
      and p_workspace_id = any(coalesce(m.workspace_ids, '{}'::text[]))
  ) then
    raise exception 'Team lead must be an active workspace member';
  end if;

  insert into public.teams (
    id, workspace_id, name, description, icon, department_id,
    leader_id, user_id, created_at, updated_at
  )
  values (
    p_team_id, p_workspace_id, normalized_name, btrim(coalesce(p_description, '')),
    coalesce(nullif(btrim(p_icon), ''), '👥'), p_department_id, p_leader_id,
    auth.uid(), now(), now()
  )
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    department_id = excluded.department_id,
    leader_id = excluded.leader_id,
    updated_at = now()
  where public.teams.workspace_id = p_workspace_id
    and private.can_manage_team_workspace(public.teams.workspace_id)
  returning * into saved_team;

  if saved_team.id is null then
    raise exception 'Team not found or belongs to another workspace';
  end if;

  update public.team_members
  set role = 'member'
  where team_id = saved_team.id and role = 'lead' and member_id is distinct from p_leader_id;

  if p_leader_id is not null then
    insert into public.team_members (team_id, member_id, role, added_by)
    values (saved_team.id, p_leader_id, 'lead', auth.uid())
    on conflict (team_id, member_id) where member_id is not null
    do update set role = 'lead', added_by = auth.uid();
  end if;

  return saved_team;
end;
$$;

create or replace function public.set_workspace_team_member(
  p_team_id text,
  p_member_id text,
  p_action text default 'add'
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_team public.teams%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  select * into target_team from public.teams where id = p_team_id for update;
  if target_team.id is null or not private.can_manage_team_workspace(target_team.workspace_id) then
    raise exception 'Team not found or permission denied';
  end if;
  if p_action not in ('add', 'remove') then
    raise exception 'Invalid Team member action';
  end if;

  if p_action = 'add' then
    if not exists (
      select 1
      from public.members m
      where m.id = p_member_id
        and target_team.workspace_id = any(coalesce(m.workspace_ids, '{}'::text[]))
    ) then
      raise exception 'Member must belong to the Team workspace';
    end if;
    insert into public.team_members (team_id, member_id, role, added_by)
    values (target_team.id, p_member_id, case when target_team.leader_id = p_member_id then 'lead' else 'member' end, auth.uid())
    on conflict (team_id, member_id) where member_id is not null do nothing;
  else
    delete from public.team_members where team_id = target_team.id and member_id = p_member_id;
    if target_team.leader_id = p_member_id then
      update public.teams set leader_id = null, updated_at = now() where id = target_team.id;
    end if;
  end if;
end;
$$;

create or replace function public.delete_workspace_team(p_team_id text)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_workspace_id text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  select workspace_id into target_workspace_id from public.teams where id = p_team_id for update;
  if target_workspace_id is null or not private.can_manage_team_workspace(target_workspace_id) then
    raise exception 'Team not found or permission denied';
  end if;
  delete from public.team_members where team_id = p_team_id;
  delete from public.teams where id = p_team_id;
end;
$$;

create or replace function public.update_workspace_member_profile(
  p_workspace_id text,
  p_member_id text,
  p_name text,
  p_phone text default null,
  p_department text default null,
  p_bio text default null,
  p_role text default 'member'
)
returns public.members
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_member public.members%rowtype;
  current_workspace_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not private.can_manage_team_workspace(p_workspace_id) then
    raise exception 'Only workspace owners and admins can update directory profiles';
  end if;
  if p_role not in ('admin', 'member', 'guest') then
    raise exception 'Invalid workspace role';
  end if;
  if length(btrim(coalesce(p_name, ''))) < 2 or length(btrim(p_name)) > 120 then
    raise exception 'Member name must contain between 2 and 120 characters';
  end if;
  if length(coalesce(p_phone, '')) > 40 or length(coalesce(p_bio, '')) > 1000 then
    raise exception 'Member profile field is too long';
  end if;

  select * into target_member
  from public.members m
  where m.id = p_member_id
    and (
      p_workspace_id = any(coalesce(m.workspace_ids, '{}'::text[]))
      or exists (
        select 1 from public.workspace_memberships wm
        where wm.workspace_id = p_workspace_id
          and wm.user_id = m.user_id
          and wm.status = 'active'
      )
    )
  for update;

  if target_member.id is null then
    raise exception 'Workspace member not found';
  end if;

  select wm.role into current_workspace_role
  from public.workspace_memberships wm
  where wm.workspace_id = p_workspace_id
    and wm.user_id = target_member.user_id
    and wm.status = 'active';

  if current_workspace_role = 'owner' then
    raise exception 'The workspace owner profile cannot be changed by another administrator';
  end if;

  update public.members
  set name = btrim(p_name),
      phone = nullif(btrim(coalesce(p_phone, '')), ''),
      department = nullif(btrim(coalesce(p_department, '')), ''),
      bio = nullif(btrim(coalesce(p_bio, '')), '')
  where id = target_member.id
  returning * into target_member;

  if target_member.user_id is not null then
    update public.workspace_memberships
    set role = p_role,
        updated_at = now()
    where workspace_id = p_workspace_id
      and user_id = target_member.user_id
      and role <> 'owner';
  end if;

  return target_member;
end;
$$;

revoke all on function public.upsert_workspace_team(text, text, text, text, text, text, text) from public, anon;
revoke all on function public.set_workspace_team_member(text, text, text) from public, anon;
revoke all on function public.delete_workspace_team(text) from public, anon;
revoke all on function public.update_workspace_member_profile(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.upsert_workspace_team(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.set_workspace_team_member(text, text, text) to authenticated;
grant execute on function public.delete_workspace_team(text) to authenticated;
grant execute on function public.update_workspace_member_profile(text, text, text, text, text, text, text) to authenticated;
