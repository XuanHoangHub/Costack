create table if not exists public.goals (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  description text not null default '',
  owner_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  period text not null default 'quarterly'
    check (period in ('weekly', 'monthly', 'quarterly', 'annual', 'custom')),
  status text not null default 'on_track'
    check (status in ('on_track', 'at_risk', 'off_track', 'completed', 'archived')),
  start_date date not null default current_date,
  due_date date not null default (current_date + 90),
  color text not null default '#6366f1'
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_date_range_check check (due_date >= start_date)
);

create table if not exists public.goal_key_results (
  id text primary key,
  goal_id text not null references public.goals(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  owner_id uuid references auth.users(id) on delete set null,
  start_value numeric not null default 0,
  target_value numeric not null default 100,
  current_value numeric not null default 0,
  unit text not null default '%'
    check (char_length(unit) between 1 and 20),
  linked_task_ids text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_key_results_target_check check (target_value <> start_value)
);

create index if not exists goals_workspace_status_due_idx
  on public.goals (workspace_id, status, due_date);

create index if not exists goals_workspace_owner_idx
  on public.goals (workspace_id, owner_id)
  where owner_id is not null;

create index if not exists goal_key_results_goal_order_idx
  on public.goal_key_results (goal_id, sort_order, created_at);

alter table public.goals enable row level security;
alter table public.goal_key_results enable row level security;

revoke all on table public.goals from anon, authenticated;
revoke all on table public.goal_key_results from anon, authenticated;
grant select, insert, update, delete on table public.goals to authenticated;
grant select, insert, update, delete on table public.goal_key_results to authenticated;

create policy "Workspace members can view goals"
on public.goals for select
to authenticated
using (private.is_workspace_member(workspace_id));

create policy "Workspace editors can create goals"
on public.goals for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and private.can_edit_workspace(workspace_id)
);

create policy "Workspace editors can update goals"
on public.goals for update
to authenticated
using (private.can_edit_workspace(workspace_id))
with check (private.can_edit_workspace(workspace_id));

create policy "Goal creators and admins can delete goals"
on public.goals for delete
to authenticated
using (
  private.can_edit_workspace(workspace_id)
  and (
    created_by = (select auth.uid())
    or private.is_workspace_admin(workspace_id)
  )
);

create policy "Workspace members can view goal key results"
on public.goal_key_results for select
to authenticated
using (
  exists (
    select 1
    from public.goals goal_record
    where goal_record.id = goal_id
      and private.is_workspace_member(goal_record.workspace_id)
  )
);

create policy "Workspace editors can create goal key results"
on public.goal_key_results for insert
to authenticated
with check (
  exists (
    select 1
    from public.goals goal_record
    where goal_record.id = goal_id
      and private.can_edit_workspace(goal_record.workspace_id)
  )
);

create policy "Workspace editors can update goal key results"
on public.goal_key_results for update
to authenticated
using (
  exists (
    select 1
    from public.goals goal_record
    where goal_record.id = goal_id
      and private.can_edit_workspace(goal_record.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.goals goal_record
    where goal_record.id = goal_id
      and private.can_edit_workspace(goal_record.workspace_id)
  )
);

create policy "Workspace editors can delete goal key results"
on public.goal_key_results for delete
to authenticated
using (
  exists (
    select 1
    from public.goals goal_record
    where goal_record.id = goal_id
      and private.can_edit_workspace(goal_record.workspace_id)
  )
);
