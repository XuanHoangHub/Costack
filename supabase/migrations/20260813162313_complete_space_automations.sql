create schema if not exists private;

create table if not exists public.automation_rules (
  id text primary key,
  workspace_id text not null,
  space_id text,
  list_id text,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null default '',
  trigger_type text not null check (trigger_type in ('task_completed', 'task_urgent')),
  action_type text not null default 'log_activity' check (action_type = 'log_activity'),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  trigger_count integer not null default 0 check (trigger_count >= 0),
  last_triggered_at timestamptz,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists automation_rules_scope_idx
  on public.automation_rules (workspace_id, space_id, list_id, enabled);
create index if not exists automation_rules_owner_idx
  on public.automation_rules (user_id, created_at desc);

alter table public.automation_rules enable row level security;

do $$
declare policy_row record;
begin
  for policy_row in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'automation_rules'
  loop
    execute format('drop policy if exists %I on public.automation_rules', policy_row.policyname);
  end loop;
end $$;

create policy automation_rules_select_workspace
on public.automation_rules for select to authenticated
using (private.can_view_team_workspace(workspace_id));

create policy automation_rules_insert_member
on public.automation_rules for insert to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_view_team_workspace(workspace_id)
);

create policy automation_rules_update_owner_or_admin
on public.automation_rules for update to authenticated
using (
  user_id = (select auth.uid())
  or private.can_manage_team_workspace(workspace_id)
)
with check (
  user_id = (select auth.uid())
  or private.can_manage_team_workspace(workspace_id)
);

create policy automation_rules_delete_owner_or_admin
on public.automation_rules for delete to authenticated
using (
  user_id = (select auth.uid())
  or private.can_manage_team_workspace(workspace_id)
);

grant select, insert, update, delete on table public.automation_rules to authenticated;
revoke all on table public.automation_rules from anon;

create or replace function public.record_task_automation_trigger(
  p_workspace_id text,
  p_space_id text,
  p_list_id text,
  p_trigger_type text
)
returns table (rule_id text, rule_name text, trigger_count integer)
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if auth.uid() is null or not private.can_view_team_workspace(p_workspace_id) then
    raise exception 'Permission denied';
  end if;

  if p_trigger_type not in ('task_completed', 'task_urgent') then
    raise exception 'Unsupported automation trigger';
  end if;

  return query
  update public.automation_rules r
  set trigger_count = r.trigger_count + 1,
      last_triggered_at = now(),
      updated_at = now()
  where r.workspace_id = p_workspace_id
    and r.trigger_type = p_trigger_type
    and r.enabled
    and (r.space_id is null or r.space_id = p_space_id)
    and (r.list_id is null or r.list_id = p_list_id)
  returning r.id, r.name, r.trigger_count;
end;
$$;

revoke all on function public.record_task_automation_trigger(text, text, text, text) from public, anon;
grant execute on function public.record_task_automation_trigger(text, text, text, text) to authenticated;
